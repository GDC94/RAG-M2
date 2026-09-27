import json
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from rag.embeddings import embed_texts
from rag.index import ChunkIndex
from rag.models import CaseResult, GoldSet, NegativeResult, RecallReport, SweepRow


def load_gold_set(path: Path) -> GoldSet:
    """Load and validate a gold set JSON file into a `GoldSet`.

    Raises `ValueError` with a clear message when the file content does not
    match the expected schema.
    """
    raw = json.loads(path.read_text(encoding="utf-8"))
    try:
        return GoldSet.model_validate(raw)
    except ValidationError as exc:
        raise ValueError(f"Malformed gold set at {path}: {exc}") from exc


def embed_questions(
    client: Any, model: str, gold: GoldSet
) -> tuple[list[list[float]], list[list[float]]]:
    """Embed every gold-set question in a single provider call.

    Positives and negatives are concatenated into one `embed_texts` call to
    avoid a second round trip, then split back apart by their original
    counts, preserving order on both sides.
    """
    positive_questions = [positive.question for positive in gold.positives]
    negative_questions = [negative.question for negative in gold.negatives]

    vectors = embed_texts(client, model, positive_questions + negative_questions)

    split_at = len(positive_questions)
    return vectors[:split_at], vectors[split_at:]


def evaluate_recall(
    gold: GoldSet,
    positive_vectors: list[list[float]],
    negative_vectors: list[list[float]],
    index: ChunkIndex,
    top_k: int,
    threshold: float,
) -> RecallReport:
    """Measure retrieval recall over the gold set's positives and negatives.

    No LLM call happens here: this only exercises embedding vectors already
    computed by the caller against the vector index.
    """
    cases: list[CaseResult] = []
    hits = 0
    for positive, vector in zip(gold.positives, positive_vectors):
        retrieved = index.search(vector, top_k, threshold)
        retrieved_sections = [item.chunk.section_title for item in retrieved]
        scores = [item.score for item in retrieved]

        hit_rank: int | None = None
        for rank, section in enumerate(retrieved_sections, start=1):
            if section in positive.expected_sections:
                hit_rank = rank
                break
        hit = hit_rank is not None
        if hit:
            hits += 1

        cases.append(
            CaseResult(
                id=positive.id,
                question=positive.question,
                expected_sections=positive.expected_sections,
                retrieved_sections=retrieved_sections,
                scores=scores,
                hit=hit,
                hit_rank=hit_rank,
            )
        )

    total = len(gold.positives)
    recall = hits / total if total else 0.0

    negatives: list[NegativeResult] = []
    negatives_gated = 0
    for negative, vector in zip(gold.negatives, negative_vectors):
        retrieved = index.search(vector, top_k, 0.0)
        top_score = max((item.score for item in retrieved), default=0.0)
        gated = top_score < threshold
        if gated:
            negatives_gated += 1

        negatives.append(
            NegativeResult(
                id=negative.id,
                question=negative.question,
                expected_status=negative.expected_status,
                top_score=top_score,
                gated=gated,
            )
        )

    return RecallReport(
        top_k=top_k,
        threshold=threshold,
        total=total,
        hits=hits,
        recall=recall,
        negatives_total=len(gold.negatives),
        negatives_gated=negatives_gated,
        cases=cases,
        negatives=negatives,
    )


def sweep(
    gold: GoldSet,
    positive_vectors: list[list[float]],
    negative_vectors: list[list[float]],
    index: ChunkIndex,
    top_ks: list[int],
    thresholds: list[float],
) -> list[SweepRow]:
    """Evaluate recall over every (top_k, threshold) combination.

    Reuses the already-computed vectors across combinations; at gold-set
    scale (34 questions) simplicity is preferred over speed.
    """
    rows: list[SweepRow] = []
    for top_k in top_ks:
        for threshold in thresholds:
            report = evaluate_recall(
                gold, positive_vectors, negative_vectors, index, top_k, threshold
            )
            rows.append(
                SweepRow(
                    top_k=top_k,
                    threshold=threshold,
                    recall=report.recall,
                    negatives_gated=report.negatives_gated,
                )
            )
    return rows
