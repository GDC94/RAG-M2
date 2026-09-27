"""Shared fixtures and test doubles."""

from collections.abc import Callable
from types import SimpleNamespace

import chromadb
import pytest

from rag.models import Chunk


def _vector_for(text: str) -> list[float]:
    """Derive a deterministic 4-dimensional vector from a text."""
    seed = sum(ord(char) for char in text)
    return [
        (seed % 7) / 7,
        (seed % 11) / 11,
        (seed % 13) / 13,
        (seed % 17) / 17,
    ]


class FakeEmbeddingsClient:
    """Duck-typed double of the OpenAI client, shaped like the SDK response."""

    def __init__(self) -> None:
        self.calls: int = 0
        self.last_model: str | None = None
        self.last_input: list[str] | None = None
        self.embeddings = self

    def create(self, *, model: str, input: list[str]) -> SimpleNamespace:
        self.calls += 1
        self.last_model = model
        self.last_input = input
        data = [
            SimpleNamespace(embedding=_vector_for(text), index=index)
            for index, text in enumerate(input)
        ]
        return SimpleNamespace(data=data)


@pytest.fixture
def fake_embeddings_client() -> FakeEmbeddingsClient:
    return FakeEmbeddingsClient()


@pytest.fixture
def make_chunk() -> Callable[..., Chunk]:
    def _make(i: int, text: str = "Sample text") -> Chunk:
        return Chunk(
            chunk_id=f"alba-manual::{i}",
            doc_id="alba-manual",
            version="4.2",
            section_title=f"{i}. Section {i}",
            chunk_index=i,
            char_start=i * 10,
            char_end=i * 10 + len(text),
            token_count=3,
            text=text,
        )

    return _make


@pytest.fixture
def chroma_client() -> chromadb.ClientAPI:
    return chromadb.EphemeralClient()
