from typing import Literal

from pydantic import BaseModel, Field, model_validator

AnswerStatus = Literal["answered", "not_in_manual", "client_policy"]


class Chunk(BaseModel):
    chunk_id: str = Field(min_length=1)
    doc_id: str = Field(min_length=1)
    version: str
    section_title: str
    chunk_index: int = Field(ge=0)
    char_start: int = Field(ge=0)
    char_end: int
    token_count: int = Field(gt=0)
    text: str = Field(min_length=1)

    @model_validator(mode="after")
    def _check_char_range(self) -> "Chunk":
        if self.char_end <= self.char_start:
            raise ValueError("char_end must be greater than char_start")
        return self


class RetrievedChunk(BaseModel):
    chunk: Chunk
    score: float = Field(ge=0, le=1)


class Answer(BaseModel):
    status: AnswerStatus
    text: str
    sources: list[str] = []


class IndexReport(BaseModel):
    doc_id: str
    version: str
    chunks_indexed: int = Field(ge=0)
    total_tokens: int = Field(ge=0)
    elapsed_seconds: float = Field(ge=0)
