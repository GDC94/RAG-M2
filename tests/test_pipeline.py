import uuid

import chromadb

from rag.config import load_settings
from rag.index import ChunkIndex
from rag.pipeline import build_index
from tests.conftest import FakeEmbeddingsClient

_MANUAL_TEXT = (
    "Alba Manual\n"
    "Versión 4.2 — Guía de usuario\n"
    "\n"
    "## Sección Uno\n"
    "\n"
    "Contenido de la primera sección.\n"
    "\n"
    "## Sección Dos\n"
    "\n"
    "Contenido de la segunda sección.\n"
)


def test_build_index_returns_report_and_indexes_chunks(
    chroma_client: chromadb.ClientAPI, fake_embeddings_client: FakeEmbeddingsClient
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)

    report = build_index(_MANUAL_TEXT, "alba-manual", settings, fake_embeddings_client, index)

    assert report.chunks_indexed == 3
    assert report.version == "4.2"
    assert report.total_tokens > 0
    assert report.elapsed_seconds >= 0
    assert index.count() == 3


def test_build_index_embeds_all_chunks_in_a_single_call(
    chroma_client: chromadb.ClientAPI, fake_embeddings_client: FakeEmbeddingsClient
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)

    build_index(_MANUAL_TEXT, "alba-manual", settings, fake_embeddings_client, index)

    assert fake_embeddings_client.calls == 1
    assert fake_embeddings_client.last_input is not None
    assert len(fake_embeddings_client.last_input) == 3


def test_build_index_twice_is_idempotent(
    chroma_client: chromadb.ClientAPI, fake_embeddings_client: FakeEmbeddingsClient
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    collection_name = str(uuid.uuid4())
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)

    build_index(_MANUAL_TEXT, "alba-manual", settings, fake_embeddings_client, index)
    build_index(_MANUAL_TEXT, "alba-manual", settings, fake_embeddings_client, index)

    assert index.count() == 3
