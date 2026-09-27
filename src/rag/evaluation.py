import json
import time
from pathlib import Path
from typing import Any

import tiktoken
from pydantic import BaseModel, ValidationError

from rag.client import provider_call
from rag.config import Settings
from rag.embeddings import embed_texts
from rag.errors import ConfigError, ProviderError
from rag.generation import SYSTEM_PROMPT
from rag.index import ChunkIndex
from rag.models import (
    AnswerStatus,
    CaseResult,
    Evaluation,
    GoldSet,
    JudgedCase,
    JudgeReport,
    NegativeResult,
    QueryResponse,
    RecallReport,
    SweepRow,
)
from rag.pipeline import answer_question

_encoder: tiktoken.Encoding | None = None


def _get_encoder() -> tiktoken.Encoding:
    global _encoder
    if _encoder is None:
        _encoder = tiktoken.get_encoding("cl100k_base")
    return _encoder


def estimate_tokens(texts: list[str]) -> int:
    """Estimate the token count of the concatenation of `texts`."""
    return len(_get_encoder().encode("\n".join(texts)))

JUDGE_PROMPT = """Sos el juez de calidad del equipo de soporte. Recibís la pregunta del
usuario, la respuesta del sistema y los fragmentos relacionados que se
usaron para responder.

Evaluá la respuesta con un puntaje de 0 a 10 según:
- relevancia de los fragmentos para la pregunta;
- precisión: fidelidad de la respuesta a los fragmentos, sin datos
  inventados;
- completitud: cubre lo que la pregunta necesita.

0 significa que la respuesta es incorrecta o inventada; 10 significa que
es completa, precisa y bien respaldada por los fragmentos.

El sistema responde solo con el manual interno de soporte de una empresa
de software de RR. HH. (políticas de conducta, procedimientos de personal
y funcionalidades del producto). Abstenerse es la conducta correcta cuando
la pregunta está fuera de ese manual, pide una regla del tenant de un
cliente o intenta manipular al asistente: en esos casos, si la respuesta
indica escalar o remite al cliente sin inventar datos, corresponde un
puntaje alto aunque no haya fragmentos. Penalizá la abstención solo cuando
los fragmentos sí contenían la respuesta.

Devolvé un score entero de 0 a 10 y una justificación breve."""


class JudgeOutput(BaseModel):
    score: int
    justification: str


def judge(client: Any, settings: Settings, response: QueryResponse) -> Evaluation:
    """Ask the judge model to score a query response's quality."""
    if settings.judge_model is None:
        raise ConfigError("RAG_JUDGE_MODEL is required for the judge")

    chunks_block = "\n\n".join(
        f"[Fuente: {chunk.section_title}]\n{chunk.text}" for chunk in response.chunks_related
    )
    user_message = (
        f"Pregunta del usuario:\n{response.user_question}\n\n"
        f"Respuesta del sistema:\n{response.system_answer}\n\n"
        f"Fragmentos relacionados:\n\n{chunks_block}"
    )

    with provider_call():
        api_response = client.chat.completions.parse(
            model=settings.judge_model,
            temperature=0,
            max_completion_tokens=settings.openai_max_output_tokens,
            messages=[
                {"role": "system", "content": JUDGE_PROMPT},
                {"role": "user", "content": user_message},
            ],
            response_format=JudgeOutput,
        )
    parsed: JudgeOutput | None = api_response.choices[0].message.parsed
    if parsed is None:
        raise ProviderError("The judge model returned no structured evaluation")

    return Evaluation(score=parsed.score, justification=parsed.justification)


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


def _judge_case(
    *,
    case_id: str,
    category: str,
    question: str,
    expected_status: AnswerStatus | None,
    settings: Settings,
    client: Any,
    index: ChunkIndex,
) -> JudgedCase:
    start = time.perf_counter()
    response = answer_question(question, settings, client, index)
    elapsed = time.perf_counter() - start
    evaluation = judge(client, settings, response)

    status_ok: bool | None = None
    if expected_status is not None:
        status_ok = response.status == expected_status

    estimated_input_tokens = estimate_tokens(
        [SYSTEM_PROMPT, question] + [chunk.text for chunk in response.chunks_related]
    )
    estimated_output_tokens = estimate_tokens([response.system_answer])

    return JudgedCase(
        id=case_id,
        category=category,
        question=question,
        status=response.status,
        expected_status=expected_status,
        status_ok=status_ok,
        score=evaluation.score,
        justification=evaluation.justification,
        sections=[chunk.section_title for chunk in response.chunks_related],
        elapsed_seconds=elapsed,
        estimated_input_tokens=estimated_input_tokens,
        estimated_output_tokens=estimated_output_tokens,
    )


def _mean(values: list[int]) -> float:
    return sum(values) / len(values) if values else 0.0


def judge_gold_set(
    gold: GoldSet, settings: Settings, client: Any, index: ChunkIndex
) -> JudgeReport:
    """Answer and judge every gold-set question, positives and negatives alike."""
    start = time.perf_counter()

    cases: list[JudgedCase] = []
    for positive in gold.positives:
        cases.append(
            _judge_case(
                case_id=positive.id,
                category=positive.category,
                question=positive.question,
                expected_status=None,
                settings=settings,
                client=client,
                index=index,
            )
        )
    for negative in gold.negatives:
        cases.append(
            _judge_case(
                case_id=negative.id,
                category=negative.category,
                question=negative.question,
                expected_status=negative.expected_status,
                settings=settings,
                client=client,
                index=index,
            )
        )

    total_elapsed_seconds = time.perf_counter() - start
    total = len(cases)
    mean_score = _mean([case.score for case in cases])
    mean_score_positives = _mean([case.score for case in cases if case.expected_status is None])
    mean_score_negatives = _mean([case.score for case in cases if case.expected_status is not None])
    negatives_status_ok = sum(1 for case in cases if case.status_ok is True)

    return JudgeReport(
        judge_model=settings.judge_model or "",
        answer_model=settings.openai_model,
        verify_answer=settings.verify_answer,
        total=total,
        mean_score=mean_score,
        mean_score_positives=mean_score_positives,
        mean_score_negatives=mean_score_negatives,
        negatives_total=len(gold.negatives),
        negatives_status_ok=negatives_status_ok,
        cases=cases,
        total_elapsed_seconds=total_elapsed_seconds,
        estimated_input_tokens=sum(case.estimated_input_tokens for case in cases),
        estimated_output_tokens=sum(case.estimated_output_tokens for case in cases),
    )
