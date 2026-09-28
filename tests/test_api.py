import json
import uuid
from collections.abc import Callable

import chromadb
import httpx
import openai
from fastapi.testclient import TestClient

from api import create_app
from rag.config import load_settings
from rag.generation import GroundedAnswer
from rag.index import ChunkIndex
from rag.models import Chunk
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
