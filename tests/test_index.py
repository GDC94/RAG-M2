from collections.abc import Callable
from uuid import uuid4

import chromadb
import pytest

from rag.errors import IndexEmptyError, IndexModelMismatchError
from rag.index import ChunkIndex
from rag.models import Chunk


def test_open_creates_collection_with_cosine_space_and_embedding_model(
    chroma_client: chromadb.ClientAPI,
) -> None:
    name = f"idx-{uuid4().hex}"

    ChunkIndex.open(chroma_client, name, "text-embedding-3-small")

    metadata = chroma_client.get_collection(name).metadata
    assert metadata is not None
    assert metadata["hnsw:space"] == "cosine"
    assert metadata["embedding_model"] == "text-embedding-3-small"


def test_upsert_is_idempotent_on_repeated_calls(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    name = f"idx-{uuid4().hex}"
    index = ChunkIndex.open(chroma_client, name, "text-embedding-3-small")
    chunks = [make_chunk(i) for i in range(3)]
    vectors = [[0.1, 0.2, 0.3, 0.4] for _ in chunks]

    index.upsert(chunks, vectors)
    assert index.count() == 3

    index.upsert(chunks, vectors)
    assert index.count() == 3


def test_search_returns_best_match_first_with_valid_scores(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    name = f"idx-{uuid4().hex}"
    index = ChunkIndex.open(chroma_client, name, "text-embedding-3-small")
    chunk_a = make_chunk(0, text="Chunk A")
    chunk_b = make_chunk(1, text="Chunk B")
    chunk_c = make_chunk(2, text="Chunk C")
    index.upsert(
        [chunk_a, chunk_b, chunk_c],
        [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]],
    )

    results = index.search([0.9, 0.1, 0, 0], top_k=3, threshold=0.0)

    assert results[0].chunk == chunk_a
    for retrieved in results:
        assert 0.0 <= retrieved.score <= 1.0


def test_search_filters_by_threshold_and_limits_by_top_k(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    name = f"idx-{uuid4().hex}"
    index = ChunkIndex.open(chroma_client, name, "text-embedding-3-small")
    chunk_a = make_chunk(0, text="Chunk A")
    chunk_b = make_chunk(1, text="Chunk B")
    chunk_c = make_chunk(2, text="Chunk C")
    index.upsert(
        [chunk_a, chunk_b, chunk_c],
        [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]],
    )

    filtered = index.search([0.9, 0.1, 0, 0], top_k=3, threshold=0.5)
    assert len(filtered) == 1
    assert filtered[0].chunk == chunk_a

    limited = index.search([0.9, 0.1, 0, 0], top_k=1, threshold=0.0)
    assert len(limited) == 1


def test_open_with_different_model_raises_model_mismatch(
    chroma_client: chromadb.ClientAPI,
) -> None:
    name = f"idx-{uuid4().hex}"
    ChunkIndex.open(chroma_client, name, "text-embedding-3-small")

    with pytest.raises(IndexModelMismatchError) as exc_info:
        ChunkIndex.open(chroma_client, name, "other-model")

    message = str(exc_info.value)
    assert "text-embedding-3-small" in message
    assert "other-model" in message


def test_search_on_empty_index_raises_index_empty(
    chroma_client: chromadb.ClientAPI,
) -> None:
    name = f"idx-{uuid4().hex}"
    index = ChunkIndex.open(chroma_client, name, "text-embedding-3-small")

    with pytest.raises(IndexEmptyError):
        index.search([1, 0, 0, 0], top_k=3, threshold=0.0)
