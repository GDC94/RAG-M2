import asyncio
import json
import threading
import uuid
from collections.abc import Callable
from pathlib import Path
from types import SimpleNamespace

import chromadb
import httpx
import openai
import pytest
from fastapi.testclient import TestClient

import api
from api import create_app
from rag.config import load_settings
from rag.errors import RequestCancelledError
from rag.generation import GroundedAnswer
from rag.index import ChunkIndex
from rag.models import Chunk
import rag.pipeline as pipeline_module
from tests.conftest import FakeChatClient, FakeEmbeddingsClient, FakeRagClient, RaisingClient


def _parse_ndjson(text: str) -> list[dict]:
    return [json.loads(line) for line in text.strip().splitlines() if line]


def _index_with_vacation_chunk(
    chroma_client: chromadb.ClientAPI,
    make_chunk_fn: Callable[..., Chunk],
    embedding_model: str,
) -> ChunkIndex:
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, embedding_model)
    chunk = make_chunk_fn(19).model_copy(
        update={"section_title": "19. Cómo solicitar vacaciones"}
    )
    index.upsert([chunk], [[1.0, 0.0, 0.0, 0.0]])
    return index


def test_health_returns_ok(chroma_client: chromadb.ClientAPI) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    app = create_app(settings, FakeEmbeddingsClient(), index)

    with TestClient(app) as test_client:
        response = test_client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_query_answered_happy_path_returns_full_response_shape(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test", "RAG_VERIFY_ANSWER": "false"}
    )
    index = _index_with_vacation_chunk(chroma_client, make_chunk, settings.embedding_model)
    embeddings_client = FakeEmbeddingsClient(fixed_vector=[0.9, 0.1, 0.0, 0.0])
    chat_client = FakeChatClient(
        GroundedAnswer(
            status="answered",
            text="Desde Ausencias > Nueva solicitud.",
            sources=["19. Cómo solicitar vacaciones"],
        )
    )
    client = FakeRagClient(embeddings_client, chat_client)
    app = create_app(settings, client, index)

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/query", json={"question": "¿Cómo solicito vacaciones?"}
        )

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "user_question",
        "system_answer",
        "chunks_related",
        "status",
        "sources",
        "verification",
        "timings",
        "cached",
    }
    assert body["user_question"] == "¿Cómo solicito vacaciones?"
    assert body["system_answer"] == "Desde Ausencias > Nueva solicitud."
    assert body["status"] == "answered"
    assert body["sources"] == ["19. Cómo solicitar vacaciones"]
    assert body["chunks_related"][0]["section_title"] == "19. Cómo solicitar vacaciones"
    assert body["verification"] is None
    assert body["timings"] is not None
    for key in ("embed", "search", "generate", "total"):
        assert key in body["timings"]


def test_query_stream_happy_path_returns_stage_events_then_result(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test", "RAG_VERIFY_ANSWER": "false"}
    )
    index = _index_with_vacation_chunk(chroma_client, make_chunk, settings.embedding_model)
    embeddings_client = FakeEmbeddingsClient(fixed_vector=[0.9, 0.1, 0.0, 0.0])
    chat_client = FakeChatClient(
        GroundedAnswer(
            status="answered",
            text="Desde Ausencias > Nueva solicitud.",
            sources=["19. Cómo solicitar vacaciones"],
        )
    )
    client = FakeRagClient(embeddings_client, chat_client)
    app = create_app(settings, client, index)

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/query/stream", json={"question": "¿Cómo solicito vacaciones?"}
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/x-ndjson"
    lines = _parse_ndjson(response.text)
    assert lines[:-1] == [
        {"type": "stage", "stage": "embed", "phase": "start"},
        {"type": "stage", "stage": "embed", "phase": "end"},
        {"type": "stage", "stage": "search", "phase": "start"},
        {"type": "stage", "stage": "search", "phase": "end"},
        {"type": "stage", "stage": "generate", "phase": "start"},
        {"type": "stage", "stage": "generate", "phase": "end"},
    ]
    final = lines[-1]
    assert final["type"] == "result"
    assert final["data"]["user_question"] == "¿Cómo solicito vacaciones?"
    assert final["data"]["system_answer"] == "Desde Ausencias > Nueva solicitud."
    assert final["data"]["status"] == "answered"
    assert set(final["data"].keys()) == {
        "user_question",
        "system_answer",
        "chunks_related",
        "status",
        "sources",
        "verification",
        "timings",
        "cached",
    }


def test_query_stream_uses_the_shared_frontend_timing_contract(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk], monkeypatch
) -> None:
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test", "RAG_VERIFY_ANSWER": "false"}
    )
    index = _index_with_vacation_chunk(chroma_client, make_chunk, settings.embedding_model)
    client = FakeRagClient(
        FakeEmbeddingsClient(fixed_vector=[0.9, 0.1, 0.0, 0.0]),
        FakeChatClient(
            GroundedAnswer(
                status="answered",
                text="Desde Ausencias > Nueva solicitud.",
                sources=["19. Cómo solicitar vacaciones"],
            )
        ),
    )
    clock = iter([0.0, 0.0, 0.042, 0.042, 0.151, 0.151, 0.563, 0.563])
    monkeypatch.setattr(pipeline_module, "time", SimpleNamespace(perf_counter=lambda: next(clock)))
    contract_path = (
        Path(__file__).parents[1]
        / "web/src/features/ask/__fixtures__/query-response.answered.json"
    )
    frontend_contract = json.loads(contract_path.read_text())
    app = create_app(settings, client, index)

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/query/stream", json={"question": "¿Cómo solicito vacaciones?"}
        )

    final = _parse_ndjson(response.text)[-1]
    assert final["data"]["timings"] == pytest.approx(frontend_contract["timings"])
    assert final["data"]["cached"] == frontend_contract["cached"]


def test_stream_closure_cancels_the_worker_before_the_next_stage(monkeypatch) -> None:
    cancellation_seen = threading.Event()
    worker_finished = threading.Event()

    def fake_answer_question(
        question, settings, client, index, on_stage=None, is_cancelled=None
    ) -> None:
        assert on_stage is not None
        assert is_cancelled is not None
        on_stage("embed", "start")
        try:
            while not is_cancelled():
                cancellation_seen.wait(0.01)
            cancellation_seen.set()
            raise RequestCancelledError("The request was cancelled")
        finally:
            worker_finished.set()

    monkeypatch.setattr(api, "answer_question", fake_answer_question)

    class DisconnectingRequest:
        disconnected = False

        async def is_disconnected(self) -> bool:
            return self.disconnected

    request = DisconnectingRequest()

    async def consume_until_disconnect() -> None:
        events = api._stream_query_events(
            "question", settings=None, client=None, index=None, request=request
        )
        assert json.loads(await anext(events)) == {
            "type": "stage",
            "stage": "embed",
            "phase": "start",
        }
        request.disconnected = True
        with pytest.raises(StopAsyncIteration):
            await anext(events)

    asyncio.run(consume_until_disconnect())

    assert cancellation_seen.wait(1)
    assert worker_finished.wait(1)


def test_query_stream_returns_503_when_all_worker_slots_are_busy(
    chroma_client: chromadb.ClientAPI,
) -> None:
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test", "RAG_MAX_CONCURRENT_STREAMS": "1"}
    )
    index = ChunkIndex.open(chroma_client, str(uuid.uuid4()), settings.embedding_model)
    app = create_app(settings, FakeEmbeddingsClient(), index)
    assert app.state.stream_limiter.acquire(blocking=False)

    try:
        with TestClient(app) as test_client:
            response = test_client.post("/api/query/stream", json={"question": "hola"})
    finally:
        app.state.stream_limiter.release()

    assert response.status_code == 503
    assert response.json() == {
        "error": {"code": "stream_busy", "message": "Too many active requests"}
    }


def test_query_stream_empty_question_returns_single_error_event_no_stage_events(
    chroma_client: chromadb.ClientAPI,
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    embeddings_client = FakeEmbeddingsClient()
    app = create_app(settings, embeddings_client, index)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query/stream", json={"question": "   "})

    assert response.status_code == 200
    lines = _parse_ndjson(response.text)
    assert lines == [
        {
            "type": "error",
            "error": {"code": "invalid_question", "message": "The question is empty"},
        }
    ]
    assert embeddings_client.calls == 0


def test_query_stream_empty_index_returns_error_event(
    chroma_client: chromadb.ClientAPI,
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    app = create_app(settings, FakeEmbeddingsClient(), index)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query/stream", json={"question": "hola"})

    assert response.status_code == 200
    lines = _parse_ndjson(response.text)
    assert len(lines) == 1
    assert lines[0]["type"] == "error"
    assert lines[0]["error"]["code"] == "index_empty"


def test_query_stream_provider_error_returns_stage_events_then_error(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    index = _index_with_vacation_chunk(chroma_client, make_chunk, settings.embedding_model)
    embeddings_client = FakeEmbeddingsClient(fixed_vector=[0.9, 0.1, 0.0, 0.0])
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    response_obj = httpx.Response(429, request=request)
    chat_client = RaisingClient(
        openai.RateLimitError("rate limited", response=response_obj, body=None)
    )
    client = FakeRagClient(embeddings_client, chat_client)
    app = create_app(settings, client, index)

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/query/stream", json={"question": "¿Cómo solicito vacaciones?"}
        )

    assert response.status_code == 200
    lines = _parse_ndjson(response.text)
    assert lines[:-1] == [
        {"type": "stage", "stage": "embed", "phase": "start"},
        {"type": "stage", "stage": "embed", "phase": "end"},
        {"type": "stage", "stage": "search", "phase": "start"},
        {"type": "stage", "stage": "search", "phase": "end"},
        {"type": "stage", "stage": "generate", "phase": "start"},
    ]
    assert lines[-1]["type"] == "error"
    assert lines[-1]["error"]["code"] == "provider_error"


def test_query_stream_malformed_body_returns_422_invalid_request(
    chroma_client: chromadb.ClientAPI,
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    app = create_app(settings, FakeEmbeddingsClient(), index)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query/stream", json={})

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "invalid_request"


def test_query_empty_question_returns_422_invalid_question_without_calling_client(
    chroma_client: chromadb.ClientAPI,
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    embeddings_client = FakeEmbeddingsClient()
    app = create_app(settings, embeddings_client, index)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query", json={"question": "   "})

    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "invalid_question", "message": "The question is empty"}
    }
    assert embeddings_client.calls == 0


def test_query_too_long_question_returns_422_invalid_question_without_calling_client(
    chroma_client: chromadb.ClientAPI,
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    embeddings_client = FakeEmbeddingsClient()
    app = create_app(settings, embeddings_client, index)
    too_long = "a" * (settings.max_question_chars + 1)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query", json={"question": too_long})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_question"
    assert embeddings_client.calls == 0


def test_query_empty_index_returns_503_index_empty(
    chroma_client: chromadb.ClientAPI,
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    app = create_app(settings, FakeEmbeddingsClient(), index)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query", json={"question": "hola"})

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "index_empty"


def test_query_provider_error_returns_502(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    index = _index_with_vacation_chunk(chroma_client, make_chunk, settings.embedding_model)
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    response_obj = httpx.Response(429, request=request)
    client = RaisingClient(
        openai.RateLimitError("rate limited", response=response_obj, body=None)
    )
    app = create_app(settings, client, index)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query", json={"question": "hola"})

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "provider_error"


def test_query_provider_timeout_returns_504(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    index = _index_with_vacation_chunk(chroma_client, make_chunk, settings.embedding_model)
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    client = RaisingClient(openai.APITimeoutError(request=request))
    app = create_app(settings, client, index)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query", json={"question": "hola"})

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "provider_timeout"


def test_query_missing_question_field_returns_422_invalid_request(
    chroma_client: chromadb.ClientAPI,
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    app = create_app(settings, FakeEmbeddingsClient(), index)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query", json={})

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "invalid_request"
    assert isinstance(body["error"]["message"], str)
    assert body["error"]["message"]


def test_query_non_string_question_returns_422_invalid_request(
    chroma_client: chromadb.ClientAPI,
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    app = create_app(settings, FakeEmbeddingsClient(), index)

    with TestClient(app) as test_client:
        response = test_client.post("/api/query", json={"question": 123})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def _cors_app(chroma_client: chromadb.ClientAPI, origins: str | None):
    environ = {"OPENAI_API_KEY": "sk-test"}
    if origins is not None:
        environ["RAG_CORS_ORIGINS"] = origins
    settings = load_settings(environ)
    index = ChunkIndex.open(chroma_client, str(uuid.uuid4()), settings.embedding_model)
    return create_app(settings, FakeEmbeddingsClient(), index)


def _preflight(app, origin: str) -> httpx.Response:
    with TestClient(app) as test_client:
        return test_client.options(
            "/api/query/stream",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )


def test_cors_preflight_from_allowed_origin_is_accepted(chroma_client: chromadb.ClientAPI) -> None:
    app = _cors_app(chroma_client, "https://rag-m2.vercel.app")

    response = _preflight(app, "https://rag-m2.vercel.app")

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://rag-m2.vercel.app"
    assert "access-control-allow-credentials" not in response.headers


def test_cors_preflight_from_disallowed_origin_gets_no_allow_origin(
    chroma_client: chromadb.ClientAPI,
) -> None:
    app = _cors_app(chroma_client, "https://rag-m2.vercel.app")

    response = _preflight(app, "https://evil.example")

    assert "access-control-allow-origin" not in response.headers


def test_no_cors_headers_when_no_origins_configured(chroma_client: chromadb.ClientAPI) -> None:
    app = _cors_app(chroma_client, None)

    response = _preflight(app, "https://rag-m2.vercel.app")

    assert "access-control-allow-origin" not in response.headers


# --- abuse protection: per-IP rate limiting and the exact-match response cache ---


class _FakeClock:
    def __init__(self) -> None:
        self.t = 1000.0

    def __call__(self) -> float:
        return self.t

    def advance(self, seconds: float) -> None:
        self.t += seconds


class _FlakyChatClient(FakeChatClient):
    """Raises a provider error on the first call, then answers normally."""

    def __init__(self, parsed, exc: BaseException) -> None:
        super().__init__(parsed)
        self._exc = exc

    def parse(self, **kwargs):
        if not self.calls:
            self.calls.append(kwargs)
            raise self._exc
        return super().parse(**kwargs)


VACATION_QUESTION = "¿Cómo solicito vacaciones?"
VACATION_VARIANT = "como solicito  vacaciones"


def _protected_app(
    chroma_client: chromadb.ClientAPI,
    make_chunk: Callable[..., Chunk],
    env: dict[str, str] | None = None,
    chat_client: FakeChatClient | None = None,
):
    from rag.cache import ResponseCache
    from rag.rate_limit import RateLimiter

    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test", "RAG_VERIFY_ANSWER": "false", **(env or {})}
    )
    index = _index_with_vacation_chunk(chroma_client, make_chunk, settings.embedding_model)
    embeddings = FakeEmbeddingsClient(fixed_vector=[0.9, 0.1, 0.0, 0.0])
    chat = chat_client or FakeChatClient(
        GroundedAnswer(
            status="answered",
            text="Desde Ausencias > Nueva solicitud.",
            sources=["19. Cómo solicitar vacaciones"],
        )
    )
    clock = _FakeClock()
    app = create_app(
        settings,
        FakeRagClient(embeddings, chat),
        index,
        rate_limiter=RateLimiter(
            settings.rate_limit_per_minute,
            settings.rate_limit_per_day,
            settings.rate_limit_global_per_day,
            now=clock,
        ),
        response_cache=ResponseCache(
            settings.cache_size, settings.cache_ttl_seconds, now=clock
        ),
    )
    return app, embeddings, chat, clock


def _ask(test_client, question=VACATION_QUESTION, path="/api/query", ip=None):
    headers = {"Fly-Client-IP": ip} if ip else {}
    return test_client.post(path, json={"question": question}, headers=headers)


@pytest.mark.parametrize("path", ["/api/query", "/api/query/stream"])
def test_returns_429_with_retry_after_once_the_per_minute_limit_is_hit(
    chroma_client, make_chunk, path
) -> None:
    app, embeddings, _, _ = _protected_app(
        chroma_client, make_chunk, {"RAG_RATE_LIMIT_PER_MINUTE": "1", "RAG_CACHE_SIZE": "0"}
    )

    with TestClient(app) as test_client:
        assert _ask(test_client, path=path).status_code == 200
        denied = _ask(test_client, path=path)

    assert denied.status_code == 429
    assert denied.headers["retry-after"] == "60"
    assert denied.headers["content-type"] == "application/json"
    error = denied.json()["error"]
    assert error["code"] == "rate_limited"
    assert error["retry_after_seconds"] == 60
    assert error["limit"] == "per_minute"
    assert "1 minuto" in error["message"]
    assert embeddings.calls == 1


def test_rate_limit_window_rolls_over_and_retry_after_counts_down(
    chroma_client, make_chunk
) -> None:
    app, _, _, clock = _protected_app(
        chroma_client, make_chunk, {"RAG_RATE_LIMIT_PER_MINUTE": "1", "RAG_CACHE_SIZE": "0"}
    )

    with TestClient(app) as test_client:
        _ask(test_client)
        clock.advance(45)
        assert _ask(test_client).headers["retry-after"] == "15"
        clock.advance(15)
        assert _ask(test_client).status_code == 200


def test_fly_client_ip_header_isolates_clients(chroma_client, make_chunk) -> None:
    app, _, _, _ = _protected_app(
        chroma_client, make_chunk, {"RAG_RATE_LIMIT_PER_MINUTE": "1", "RAG_CACHE_SIZE": "0"}
    )

    with TestClient(app) as test_client:
        assert _ask(test_client, ip="203.0.113.1").status_code == 200
        assert _ask(test_client, ip="203.0.113.1").status_code == 429
        assert _ask(test_client, ip="203.0.113.2").status_code == 200


def test_without_fly_header_the_socket_peer_is_the_client_key(chroma_client, make_chunk) -> None:
    app, _, _, _ = _protected_app(
        chroma_client, make_chunk, {"RAG_RATE_LIMIT_PER_MINUTE": "1", "RAG_CACHE_SIZE": "0"}
    )

    with TestClient(app) as test_client:
        assert _ask(test_client).status_code == 200
        assert _ask(test_client).status_code == 429


def test_global_daily_limit_applies_across_clients(chroma_client, make_chunk) -> None:
    app, _, _, _ = _protected_app(
        chroma_client,
        make_chunk,
        {"RAG_RATE_LIMIT_GLOBAL_PER_DAY": "1", "RAG_CACHE_SIZE": "0"},
    )

    with TestClient(app) as test_client:
        assert _ask(test_client, ip="203.0.113.1").status_code == 200
        denied = _ask(test_client, ip="203.0.113.2")

    assert denied.status_code == 429
    assert denied.json()["error"]["limit"] == "global_per_day"


def test_cache_hit_skips_the_pipeline_and_does_not_consume_quota(
    chroma_client, make_chunk
) -> None:
    app, embeddings, chat, _ = _protected_app(
        chroma_client, make_chunk, {"RAG_RATE_LIMIT_PER_MINUTE": "1"}
    )

    with TestClient(app) as test_client:
        first = _ask(test_client)
        hit = _ask(test_client, question=VACATION_VARIANT)
        again = _ask(test_client, question="¡" + VACATION_QUESTION)
        other = _ask(test_client, question="otra pregunta distinta")

    assert first.status_code == 200
    assert first.json()["cached"] is False
    assert hit.status_code == 200
    assert hit.json()["cached"] is True
    assert hit.json()["system_answer"] == first.json()["system_answer"]
    assert hit.json()["timings"] == first.json()["timings"]
    assert hit.json()["user_question"] == VACATION_VARIANT
    assert again.json()["cached"] is True
    assert embeddings.calls == 1
    assert len(chat.calls) == 1
    # Hits were free: the only quota used was the first miss, so a new miss is denied.
    assert other.status_code == 429


def test_cache_hit_is_served_even_when_the_client_is_rate_limited(
    chroma_client, make_chunk
) -> None:
    app, _, _, _ = _protected_app(chroma_client, make_chunk, {"RAG_RATE_LIMIT_PER_MINUTE": "1"})

    with TestClient(app) as test_client:
        _ask(test_client)
        assert _ask(test_client, question="otra").status_code == 429
        assert _ask(test_client, question=VACATION_VARIANT).status_code == 200


def test_invalid_questions_are_rejected_before_cache_and_rate_limit(
    chroma_client, make_chunk
) -> None:
    app, _, _, _ = _protected_app(
        chroma_client, make_chunk, {"RAG_RATE_LIMIT_PER_MINUTE": "1", "RAG_MAX_QUESTION_CHARS": "40"}
    )

    with TestClient(app) as test_client:
        _ask(test_client, question="como solicito vacaciones")
        too_long = _ask(test_client, question="como" + " " * 100 + "solicito vacaciones")
        empty = _ask(test_client, question="   ")
        other = _ask(test_client, question="otra pregunta")

    assert too_long.status_code == 422
    assert too_long.json()["error"]["code"] == "invalid_question"
    assert empty.status_code == 422
    assert other.status_code == 429  # the invalid ones consumed nothing, the first did


def test_provider_errors_are_not_cached_nor_do_they_poison_later_requests(
    chroma_client, make_chunk
) -> None:
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    chat = _FlakyChatClient(
        GroundedAnswer(
            status="answered",
            text="Desde Ausencias > Nueva solicitud.",
            sources=["19. Cómo solicitar vacaciones"],
        ),
        openai.RateLimitError("rate limited", response=httpx.Response(429, request=request), body=None),
    )
    app, _, _, _ = _protected_app(chroma_client, make_chunk, chat_client=chat)

    with TestClient(app) as test_client:
        failed = _ask(test_client)
        retried = _ask(test_client)
        hit = _ask(test_client)

    assert failed.status_code == 502
    assert retried.status_code == 200
    assert retried.json()["cached"] is False
    assert hit.json()["cached"] is True


def test_stream_provider_error_is_not_cached(chroma_client, make_chunk) -> None:
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    chat = _FlakyChatClient(
        GroundedAnswer(status="answered", text="ok", sources=["19. Cómo solicitar vacaciones"]),
        openai.RateLimitError("rate limited", response=httpx.Response(429, request=request), body=None),
    )
    app, _, _, _ = _protected_app(chroma_client, make_chunk, chat_client=chat)

    with TestClient(app) as test_client:
        failed = _parse_ndjson(_ask(test_client, path="/api/query/stream").text)
        retried = _parse_ndjson(_ask(test_client, path="/api/query/stream").text)

    assert failed[-1]["type"] == "error"
    assert retried[-1]["type"] == "result"
    assert retried[-1]["data"]["cached"] is False


def test_cancelled_stream_is_not_cached(chroma_client, make_chunk, monkeypatch) -> None:
    app, _, _, _ = _protected_app(chroma_client, make_chunk)

    def cancelled(*args, **kwargs):
        raise RequestCancelledError("The request was cancelled")

    monkeypatch.setattr(api, "answer_question", cancelled)

    with TestClient(app) as test_client:
        _ask(test_client, path="/api/query/stream")

    assert len(app.state.response_cache) == 0


def test_stream_cache_hit_replays_stage_events_then_a_cached_result(
    chroma_client, make_chunk
) -> None:
    app, embeddings, _, _ = _protected_app(chroma_client, make_chunk)

    with TestClient(app) as test_client:
        miss = _parse_ndjson(_ask(test_client, path="/api/query/stream").text)
        hit_response = _ask(test_client, question=VACATION_VARIANT, path="/api/query/stream")

    hit = _parse_ndjson(hit_response.text)
    assert hit_response.headers["content-type"] == "application/x-ndjson"
    assert hit[:-1] == miss[:-1]
    assert hit[-1]["type"] == "result"
    assert hit[-1]["data"]["cached"] is True
    assert hit[-1]["data"]["timings"] == miss[-1]["data"]["timings"]
    assert embeddings.calls == 1


def test_stream_cache_hit_includes_the_verify_stage_only_when_it_ran(
    chroma_client, make_chunk
) -> None:
    from rag.models import QueryResponse

    app, _, _, _ = _protected_app(chroma_client, make_chunk)
    app.state.response_cache.put(
        "con verificador",
        QueryResponse(
            user_question="con verificador",
            system_answer="a",
            chunks_related=[],
            status="answered",
            timings={"embed": 0.1, "search": 0.1, "generate": 0.1, "verify": 0.1, "total": 0.4},
        ),
    )

    with TestClient(app) as test_client:
        lines = _parse_ndjson(_ask(test_client, "con verificador", "/api/query/stream").text)

    stages = [(e["stage"], e["phase"]) for e in lines if e["type"] == "stage"]
    assert stages[-2:] == [("verify", "start"), ("verify", "end")]
    assert len(stages) == 8


def test_cache_can_be_disabled_with_size_zero(chroma_client, make_chunk) -> None:
    app, embeddings, _, _ = _protected_app(chroma_client, make_chunk, {"RAG_CACHE_SIZE": "0"})

    with TestClient(app) as test_client:
        _ask(test_client)
        second = _ask(test_client)

    assert second.json()["cached"] is False
    assert embeddings.calls == 2


def test_create_app_builds_limiter_and_cache_from_settings(chroma_client) -> None:
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test", "RAG_RATE_LIMIT_PER_MINUTE": "1", "RAG_CACHE_SIZE": "0"}
    )
    index = ChunkIndex.open(chroma_client, str(uuid.uuid4()), settings.embedding_model)
    app = create_app(settings, FakeEmbeddingsClient(), index)

    assert app.state.rate_limiter is not None
    assert app.state.response_cache is not None


def test_429_exposes_retry_after_to_cross_origin_browsers(chroma_client, make_chunk) -> None:
    app, _, _, _ = _protected_app(
        chroma_client,
        make_chunk,
        {"RAG_RATE_LIMIT_PER_MINUTE": "1", "RAG_CACHE_SIZE": "0", "RAG_CORS_ORIGINS": "https://rag-m2.vercel.app"},
    )

    with TestClient(app) as test_client:
        headers = {"Origin": "https://rag-m2.vercel.app"}
        test_client.post("/api/query", json={"question": "a"}, headers=headers)
        denied = test_client.post("/api/query", json={"question": "b"}, headers=headers)

    assert denied.status_code == 429
    assert "retry-after" in denied.headers["access-control-expose-headers"].lower()


def test_429_body_matches_the_shared_frontend_rate_limit_contract(
    chroma_client, make_chunk
) -> None:
    contract_path = (
        Path(__file__).parents[1] / "web/src/features/ask/__fixtures__/error.rate-limited.json"
    )
    frontend_contract = json.loads(contract_path.read_text())
    app, _, _, _ = _protected_app(
        chroma_client, make_chunk, {"RAG_RATE_LIMIT_PER_MINUTE": "1", "RAG_CACHE_SIZE": "0"}
    )

    with TestClient(app) as test_client:
        _ask(test_client)
        denied = _ask(test_client)

    assert denied.json() == frontend_contract
