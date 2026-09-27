import time
from typing import Any

from rag.config import Settings
from rag.embeddings import embed_texts
from rag.index import ChunkIndex
from rag.ingestion import split_manual
from rag.models import IndexReport


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
