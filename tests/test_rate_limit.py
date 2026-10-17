import threading

import pytest

from rag.rate_limit import RateLimiter


class FakeClock:
    def __init__(self, start: float = 1000.0) -> None:
        self.t = start

    def __call__(self) -> float:
        return self.t

    def advance(self, seconds: float) -> None:
        self.t += seconds


def _limiter(clock: FakeClock, per_minute=5, per_day=20, global_per_day=300) -> RateLimiter:
    return RateLimiter(
        per_minute=per_minute, per_day=per_day, global_per_day=global_per_day, now=clock
    )


def test_allows_requests_up_to_the_per_minute_limit_then_denies():
    clock = FakeClock()
    limiter = _limiter(clock)

    assert all(limiter.check("1.1.1.1").allowed for _ in range(5))
    decision = limiter.check("1.1.1.1")

    assert decision.allowed is False
    assert decision.limit == "per_minute"
    assert decision.retry_after_seconds == 60


def test_retry_after_counts_down_and_is_at_least_one_second():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=1)
    limiter.check("a")

    clock.advance(59.2)
    decision = limiter.check("a")

    assert decision.allowed is False
    assert decision.retry_after_seconds == 1


def test_allows_again_once_the_window_rolls_over():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=1)
    limiter.check("a")

    clock.advance(60)

    assert limiter.check("a").allowed is True


def test_denied_requests_do_not_consume_quota():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=1, per_day=2)
    assert limiter.check("a").allowed
    for _ in range(10):
        assert limiter.check("a").allowed is False

    clock.advance(61)

    # The denied burst consumed nothing: one of the two daily slots is left.
    assert limiter.check("a").allowed is True
    clock.advance(61)
    decision = limiter.check("a")
    assert decision.allowed is False
    assert decision.limit == "per_day"


def test_per_day_limit_trips_with_retry_after_until_oldest_expires():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=0, per_day=2)
    limiter.check("a")
    clock.advance(100)
    limiter.check("a")

    decision = limiter.check("a")

    assert decision.allowed is False
    assert decision.limit == "per_day"
    assert decision.retry_after_seconds == 86400 - 100


def test_global_limit_applies_across_keys():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=0, per_day=0, global_per_day=2)
    assert limiter.check("a").allowed
    assert limiter.check("b").allowed

    decision = limiter.check("c")

    assert decision.allowed is False
    assert decision.limit == "global_per_day"


def test_keys_are_isolated():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=1)
    assert limiter.check("a").allowed
    assert limiter.check("a").allowed is False

    assert limiter.check("b").allowed is True


def test_denial_by_one_key_limit_does_not_consume_global_quota():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=1, per_day=0, global_per_day=2)
    limiter.check("a")
    limiter.check("a")  # denied by per_minute, must not count globally

    assert limiter.check("b").allowed is True


def test_reports_the_limit_with_the_longest_wait_when_several_trip():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=1, per_day=1)
    limiter.check("a")

    decision = limiter.check("a")

    assert decision.limit == "per_day"
    assert decision.retry_after_seconds == 86400


@pytest.mark.parametrize("disabled", ["per_minute", "per_day", "global_per_day"])
def test_zero_disables_a_limit(disabled):
    clock = FakeClock()
    limits = {"per_minute": 1, "per_day": 1, "global_per_day": 1}
    limits[disabled] = 0
    limiter = RateLimiter(**limits, now=clock)

    # The disabled limit never trips, whatever the volume.
    seen = {limiter.check("a").limit for _ in range(50)}

    assert disabled not in seen


def test_all_limits_disabled_always_allows():
    limiter = RateLimiter(per_minute=0, per_day=0, global_per_day=0, now=FakeClock())

    assert all(limiter.check("a").allowed for _ in range(1000))


def test_idle_keys_are_dropped_so_memory_stays_bounded():
    clock = FakeClock()
    limiter = _limiter(clock)
    for i in range(50):
        limiter.check(f"ip-{i}")
    assert limiter.tracked_keys == 50

    clock.advance(86400 + 1)
    limiter.check("fresh")

    assert limiter.tracked_keys == 1


def test_denied_unknown_key_is_not_tracked():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=5, per_day=0, global_per_day=1)
    limiter.check("a")

    assert limiter.check("b").allowed is False
    assert limiter.tracked_keys == 1


def test_per_key_history_stays_bounded_by_the_limit():
    clock = FakeClock()
    limiter = _limiter(clock, per_minute=5, per_day=20)
    for _ in range(1000):
        limiter.check("a")
        clock.advance(1)

    assert limiter.stored_timestamps <= 20 + 300


def test_check_is_thread_safe():
    limiter = RateLimiter(per_minute=0, per_day=0, global_per_day=50, now=FakeClock())
    results: list[bool] = []

    def worker() -> None:
        for _ in range(20):
            results.append(limiter.check("a").allowed)

    threads = [threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert results.count(True) == 50
