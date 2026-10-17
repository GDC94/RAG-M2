import threading

import pytest

from rag.cache import ResponseCache, normalize_question
from rag.models import QueryResponse


class FakeClock:
    def __init__(self, start: float = 1000.0) -> None:
        self.t = start

    def __call__(self) -> float:
        return self.t

    def advance(self, seconds: float) -> None:
        self.t += seconds


def _response(question: str = "q", answer: str = "a") -> QueryResponse:
    return QueryResponse(
        user_question=question,
        system_answer=answer,
        chunks_related=[],
        status="answered",
        timings={"total": 1.5},
    )


@pytest.mark.parametrize(
    "raw",
    [
        "¿Cómo solicito vacaciones?",
        "como solicito  vacaciones",
        "  COMO\tsolicito\nvacaciones ?? ",
        "¡¿Cómo solicito vacaciones!?.",
        "Cómo solicito vacaciones",
    ],
)
def test_normalize_question_maps_equivalent_phrasings_to_one_key(raw):
    assert normalize_question(raw) == "como solicito vacaciones"


def test_normalize_question_keeps_distinct_questions_distinct():
    assert normalize_question("vacaciones de verano") != normalize_question("vacaciones de invierno")


def test_get_returns_none_on_miss():
    cache = ResponseCache(now=FakeClock())

    assert cache.get("hola") is None


def test_hit_returns_the_stored_response_flagged_as_cached_with_original_timings():
    cache = ResponseCache(now=FakeClock())
    cache.put("¿Cómo solicito vacaciones?", _response("¿Cómo solicito vacaciones?"))

    hit = cache.get("como solicito  vacaciones")

    assert hit is not None
    assert hit.cached is True
    assert hit.system_answer == "a"
    assert hit.timings == {"total": 1.5}


def test_stored_response_is_not_mutated_by_a_hit():
    cache = ResponseCache(now=FakeClock())
    original = _response()
    cache.put("q", original)

    cache.get("q")

    assert original.cached is False


def test_entries_expire_after_the_ttl():
    clock = FakeClock()
    cache = ResponseCache(ttl_seconds=100, now=clock)
    cache.put("q", _response())

    clock.advance(99)
    assert cache.get("q") is not None
    clock.advance(2)
    assert cache.get("q") is None
    assert len(cache) == 0


def test_ttl_is_measured_from_the_write_not_the_last_read():
    clock = FakeClock()
    cache = ResponseCache(ttl_seconds=100, now=clock)
    cache.put("q", _response())

    clock.advance(60)
    cache.get("q")
    clock.advance(60)

    assert cache.get("q") is None


def test_least_recently_used_entry_is_evicted_when_full():
    cache = ResponseCache(max_size=2, now=FakeClock())
    cache.put("a", _response())
    cache.put("b", _response())
    cache.get("a")  # "b" is now the least recently used
    cache.put("c", _response())

    assert cache.get("b") is None
    assert cache.get("a") is not None
    assert cache.get("c") is not None
    assert len(cache) == 2


def test_put_overwrites_an_existing_key_without_growing():
    cache = ResponseCache(max_size=2, now=FakeClock())
    cache.put("a", _response(answer="old"))
    cache.put("a", _response(answer="new"))

    assert len(cache) == 1
    assert cache.get("a").system_answer == "new"


def test_size_zero_disables_the_cache():
    cache = ResponseCache(max_size=0, now=FakeClock())
    cache.put("a", _response())

    assert cache.get("a") is None
    assert len(cache) == 0


def test_concurrent_puts_and_gets_respect_the_size_bound():
    cache = ResponseCache(max_size=10, now=FakeClock())

    def worker(offset: int) -> None:
        for i in range(200):
            cache.put(f"q{offset}-{i}", _response())
            cache.get(f"q{offset}-{i - 1}")

    threads = [threading.Thread(target=worker, args=(n,)) for n in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(cache) <= 10
