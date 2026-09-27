"""Shared fixtures and test doubles."""

from collections.abc import Callable
from types import SimpleNamespace
from typing import Any

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

    def __init__(self, fixed_vector: list[float] | None = None) -> None:
        self.calls: int = 0
        self.last_model: str | None = None
        self.last_input: list[str] | None = None
        self.embeddings = self
        self._fixed_vector = fixed_vector

    def create(self, *, model: str, input: list[str]) -> SimpleNamespace:
        self.calls += 1
        self.last_model = model
        self.last_input = input
        data = [
            SimpleNamespace(
                embedding=self._fixed_vector if self._fixed_vector is not None else _vector_for(text),
                index=index,
            )
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


class FakeChatClient:
    """Duck-typed double of the OpenAI client's `chat.completions.parse`."""

    def __init__(self, parsed: Any) -> None:
        self.calls: list[dict[str, Any]] = []
        self._parsed = parsed
        self.chat = self
        self.completions = self

    def parse(self, **kwargs: Any) -> SimpleNamespace:
        self.calls.append(kwargs)
        message = SimpleNamespace(parsed=self._parsed, refusal=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


class FakeSequenceChatClient:
    """Duck-typed double of `chat.completions.parse` returning items in order.

    Each call records its kwargs in `self.calls` and pops the next parsed
    item from `parsed_items`, so a single fake can stand in for a sequence
    of provider calls (e.g. generation followed by verification).
    """

    def __init__(self, parsed_items: list[Any]) -> None:
        self.calls: list[dict[str, Any]] = []
        self._parsed_items = list(parsed_items)
        self.chat = self
        self.completions = self

    def parse(self, **kwargs: Any) -> SimpleNamespace:
        self.calls.append(kwargs)
        if not self._parsed_items:
            raise AssertionError("no more fake responses")
        parsed = self._parsed_items.pop(0)
        message = SimpleNamespace(parsed=parsed, refusal=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


class FakeRagClient:
    """Duck-typed double exposing both `.embeddings` and `.chat`, so a single
    object can serve as the client for both `embed_texts` and `generate`."""

    def __init__(
        self, embeddings_client: FakeEmbeddingsClient, chat_client: FakeChatClient
    ) -> None:
        self.embeddings = embeddings_client.embeddings
        self.chat = chat_client.chat


class RaisingClient:
    """Duck-typed double whose provider calls always raise a given exception."""

    def __init__(self, exc: BaseException) -> None:
        self._exc = exc
        self.embeddings = self
        self.chat = self
        self.completions = self

    def create(self, **kwargs: Any) -> SimpleNamespace:
        raise self._exc

    def parse(self, **kwargs: Any) -> SimpleNamespace:
        raise self._exc
