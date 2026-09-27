import pytest
from pydantic import ValidationError

from rag.models import Answer, Chunk, RetrievedChunk


def _valid_chunk_kwargs(**overrides):
    kwargs = {
        "chunk_id": "chunk-1",
        "doc_id": "doc-1",
        "version": "1.0",
        "section_title": "Intro",
        "chunk_index": 0,
        "char_start": 0,
        "char_end": 10,
        "token_count": 5,
        "text": "hello",
    }
    kwargs.update(overrides)
    return kwargs


@pytest.mark.parametrize(
    "overrides",
    [
        {"text": ""},
        {"char_start": 10, "char_end": 10},
        {"token_count": 0},
    ],
)
def test_chunk_rejects_invalid_values(overrides):
    with pytest.raises(ValidationError):
        Chunk(**_valid_chunk_kwargs(**overrides))


def test_answer_rejects_status_outside_allowed_values():
    with pytest.raises(ValidationError):
        Answer(status="unknown_status", text="hello", sources=[])


@pytest.mark.parametrize("score", [-0.1, 1.1])
def test_retrieved_chunk_rejects_score_outside_unit_range(score):
    with pytest.raises(ValidationError):
        RetrievedChunk(chunk=Chunk(**_valid_chunk_kwargs()), score=score)
