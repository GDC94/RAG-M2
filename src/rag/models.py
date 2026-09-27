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


class RelatedChunk(BaseModel):
    chunk_id: str
    doc_id: str
    version: str
    section_title: str
    score: float = Field(ge=0, le=1)
    text: str


VerdictLabel = Literal["supported", "unsupported", "incomplete", "wrong_status"]


class Verdict(BaseModel):
    label: VerdictLabel
    reason: str


class QueryResponse(BaseModel):
    user_question: str
    system_answer: str
    chunks_related: list[RelatedChunk]
    status: AnswerStatus
    verification: Verdict | None = None


class GoldPositive(BaseModel):
    id: str
    category: str
    question: str = Field(min_length=1)
    expected_sections: list[str] = Field(min_length=1)


class GoldNegative(BaseModel):
    id: str
    category: str
    question: str = Field(min_length=1)
    expected_status: AnswerStatus


class GoldSet(BaseModel):
    positives: list[GoldPositive]
    negatives: list[GoldNegative]


class CaseResult(BaseModel):
    id: str
    question: str
    expected_sections: list[str]
    retrieved_sections: list[str]
    scores: list[float]
    hit: bool
    hit_rank: int | None


class NegativeResult(BaseModel):
    id: str
    question: str
    expected_status: AnswerStatus
    top_score: float
    gated: bool


class RecallReport(BaseModel):
    top_k: int
    threshold: float
    total: int
    hits: int
    recall: float
    negatives_total: int
    negatives_gated: int
    cases: list[CaseResult]
    negatives: list[NegativeResult]


class SweepRow(BaseModel):
    top_k: int
    threshold: float
    recall: float
    negatives_gated: int


class Evaluation(BaseModel):
    score: int = Field(ge=0, le=10)
    justification: str


class JudgedCase(BaseModel):
    id: str
    category: str
    question: str
    status: AnswerStatus
    expected_status: AnswerStatus | None
    status_ok: bool | None
    score: int
    justification: str
    sections: list[str]
    elapsed_seconds: float
    estimated_input_tokens: int
    estimated_output_tokens: int


class JudgeReport(BaseModel):
    judge_model: str
    answer_model: str
    verify_answer: bool
    total: int
    mean_score: float
    mean_score_positives: float
    mean_score_negatives: float
    negatives_total: int
    negatives_status_ok: int
    cases: list[JudgedCase]
    total_elapsed_seconds: float
    estimated_input_tokens: int
    estimated_output_tokens: int
