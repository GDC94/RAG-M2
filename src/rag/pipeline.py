import time
from typing import Any

from rag.config import Settings
from rag.embeddings import embed_texts
from rag.errors import IndexEmptyError, InvalidQuestionError
from rag.generation import NOT_IN_MANUAL_TEXT, generate
from rag.index import ChunkIndex
from rag.ingestion import split_manual
from rag.models import Answer, IndexReport, QueryResponse, RelatedChunk, Verdict
from rag.verification import verify


def build_index(
    text: str,
    doc_id: str,
    settings: Settings,
    client: Any,
    index: ChunkIndex,
) -> IndexReport:
    """Split a manual into chunks, embed them in one call, and upsert them."""
    start = time.perf_counter()

    chunks = split_manual(
        text,
        doc_id,
        max_tokens=settings.max_chunk_tokens,
        overlap_ratio=settings.chunk_overlap_ratio,
    )
    vectors = embed_texts(client, settings.embedding_model, [chunk.text for chunk in chunks])
    index.upsert(chunks, vectors)

    elapsed_seconds = time.perf_counter() - start

    return IndexReport(
        doc_id=doc_id,
        version=chunks[0].version,
        chunks_indexed=len(chunks),
        total_tokens=sum(chunk.token_count for chunk in chunks),
        elapsed_seconds=elapsed_seconds,
    )


def answer_question(
    question: str, settings: Settings, client: Any, index: ChunkIndex
) -> QueryResponse:
    """Validate, embed, retrieve, and generate a grounded answer for a question."""
    cleaned = question.strip()
    if not cleaned:
        raise InvalidQuestionError("The question is empty")
    if len(cleaned) > settings.max_question_chars:
        raise InvalidQuestionError(
            f"The question exceeds {settings.max_question_chars} characters"
        )
    if index.count() == 0:
        raise IndexEmptyError("The index is empty; run build_index first")

    vector = embed_texts(client, settings.embedding_model, [cleaned])[0]
    retrieved = index.search(vector, settings.top_k, settings.similarity_threshold)
    answer = generate(client, settings, cleaned, retrieved)

    verdict: Verdict | None = None
    if settings.verify_answer and retrieved:
        verdict = verify(client, settings, cleaned, retrieved, answer)
        if verdict.label in ("unsupported", "wrong_status"):
            answer = Answer(status="not_in_manual", text=NOT_IN_MANUAL_TEXT, sources=[])

    chunks_related = [
        RelatedChunk(
            chunk_id=item.chunk.chunk_id,
            doc_id=item.chunk.doc_id,
            version=item.chunk.version,
            section_title=item.chunk.section_title,
            score=item.score,
            text=item.chunk.text,
        )
        for item in retrieved
    ]

    return QueryResponse(
        user_question=cleaned,
        system_answer=answer.text,
        chunks_related=chunks_related,
        status=answer.status,
        verification=verdict,
    )
