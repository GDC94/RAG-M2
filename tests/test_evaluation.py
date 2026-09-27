import json
from collections.abc import Callable
from pathlib import Path
from uuid import uuid4

import chromadb
import pytest

from rag.config import load_settings
from rag.errors import ConfigError
from rag.evaluation import (
    JUDGE_PROMPT,
    JudgeOutput,
    evaluate_recall,
    judge,
    judge_gold_set,
    load_gold_set,
    sweep,
)
from rag.generation import GroundedAnswer
from rag.index import ChunkIndex
from rag.models import Chunk, GoldNegative, GoldPositive, GoldSet, QueryResponse, RelatedChunk
from tests.conftest import (
    FakeChatClient,
    FakeEmbeddingsClient,
    FakeRagClient,
    FakeSequenceChatClient,
)


def test_load_gold_set_returns_gold_set_with_positives_and_negatives(
    tmp_path: Path,
) -> None:
    payload = {
        "positives": [
            {
                "id": "p01",
                "category": "policy",
                "question": "¿Cuántos días de vacaciones tengo por año?",
                "expected_sections": ["19. Cómo solicitar vacaciones"],
            }
        ],
        "negatives": [
            {
                "id": "n01",
                "category": "out_of_domain",
                "question": "¿Cómo hago una tarta de manzana?",
                "expected_status": "not_in_manual",
            }
        ],
    }
    gold_path = tmp_path / "gold.json"
    gold_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    gold = load_gold_set(gold_path)

    assert len(gold.positives) == 1
    assert len(gold.negatives) == 1
    assert gold.positives[0].id == "p01"
    assert gold.negatives[0].id == "n01"


def test_load_gold_set_raises_value_error_when_expected_sections_missing(
    tmp_path: Path,
) -> None:
    payload = {
        "positives": [
            {
                "id": "p01",
                "category": "policy",
                "question": "¿Cuántos días de vacaciones tengo por año?",
            }
        ],
        "negatives": [],
    }
    gold_path = tmp_path / "gold.json"
    gold_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    with pytest.raises(ValueError, match="expected_sections"):
        load_gold_set(gold_path)


def test_evaluate_recall_reports_hit_and_miss_across_positives(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    name = f"idx-{uuid4().hex}"
    index = ChunkIndex.open(chroma_client, name, "text-embedding-3-small")
    chunk_19 = make_chunk(0, text="19 body").model_copy(
        update={"section_title": "19. Cómo solicitar vacaciones"}
    )
    chunk_20 = make_chunk(1, text="20 body").model_copy(
        update={"section_title": "20. Cómo cancelar una solicitud de ausencia pendiente"}
    )
    index.upsert([chunk_19, chunk_20], [[1, 0, 0, 0], [0, 1, 0, 0]])

    gold = GoldSet(
        positives=[
            GoldPositive(
                id="p01",
                category="procedure",
                question="¿Cómo pido vacaciones?",
                expected_sections=["19. Cómo solicitar vacaciones"],
            ),
            GoldPositive(
                id="p02",
                category="procedure",
                question="¿Cómo cancelo una ausencia?",
                expected_sections=["20. Cómo cancelar una solicitud de ausencia pendiente"],
            ),
        ],
        negatives=[],
    )
    positive_vectors = [[0.9, 0.1, 0, 0], [0.9, 0.1, 0, 0]]

    report = evaluate_recall(
        gold, positive_vectors, [], index, top_k=1, threshold=0.3
    )

    assert report.total == 2
    assert report.hits == 1
    assert report.recall == 0.5
    assert report.cases[0].hit_rank == 1
    assert report.cases[1].hit is False


def test_evaluate_recall_gates_negatives_below_threshold(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    name = f"idx-{uuid4().hex}"
    index = ChunkIndex.open(chroma_client, name, "text-embedding-3-small")
    chunk_19 = make_chunk(0, text="19 body").model_copy(
        update={"section_title": "19. Cómo solicitar vacaciones"}
    )
    chunk_20 = make_chunk(1, text="20 body").model_copy(
        update={"section_title": "20. Cómo cancelar una solicitud de ausencia pendiente"}
    )
    index.upsert([chunk_19, chunk_20], [[1, 0, 0, 0], [0, 1, 0, 0]])

    gold = GoldSet(
        positives=[],
        negatives=[
            GoldNegative(
                id="n01",
                category="out_of_domain",
                question="¿Cómo hago una tarta?",
                expected_status="not_in_manual",
            ),
            GoldNegative(
                id="n02",
                category="client_policy",
                question="¿Cuántos días de duelo tiene el cliente Acme?",
                expected_status="client_policy",
            ),
        ],
    )
    negative_vectors = [[0, 0, 0, 1], [0.9, 0.1, 0, 0]]

    report = evaluate_recall(gold, [], negative_vectors, index, top_k=1, threshold=0.3)

    assert report.negatives[0].top_score == 0.0
    assert report.negatives[0].gated is True
    assert report.negatives[1].gated is False


def test_sweep_returns_a_row_per_top_k_and_threshold_pair(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    name = f"idx-{uuid4().hex}"
    index = ChunkIndex.open(chroma_client, name, "text-embedding-3-small")
    chunk_19 = make_chunk(0, text="19 body").model_copy(
        update={"section_title": "19. Cómo solicitar vacaciones"}
    )
    chunk_20 = make_chunk(1, text="20 body").model_copy(
        update={"section_title": "20. Cómo cancelar una solicitud de ausencia pendiente"}
    )
    index.upsert([chunk_19, chunk_20], [[1, 0, 0, 0], [0, 1, 0, 0]])

    gold = GoldSet(
        positives=[
            GoldPositive(
                id="p01",
                category="procedure",
                question="¿Cómo pido vacaciones?",
                expected_sections=["19. Cómo solicitar vacaciones"],
            ),
            GoldPositive(
                id="p02",
                category="procedure",
                question="¿Cómo cancelo una ausencia?",
                expected_sections=["20. Cómo cancelar una solicitud de ausencia pendiente"],
            ),
        ],
        negatives=[
            GoldNegative(
                id="n01",
                category="out_of_domain",
                question="¿Cómo hago una tarta?",
                expected_status="not_in_manual",
            )
        ],
    )
    # The second positive's query is deliberately closer to chunk 19 than to
    # chunk 20 (0.8 vs. 0.6 cosine), so it misses at top_k=1 (only chunk 19
    # is returned) but hits at top_k=2 once chunk 20 also clears the 0.3
    # threshold, which is what drives recall from 0.5 to 1.0 in the sweep.
    positive_vectors = [[1, 0, 0, 0], [0.8, 0.6, 0, 0]]
    negative_vectors = [[0, 0, 0, 1]]

    rows = sweep(gold, positive_vectors, negative_vectors, index, [1, 2], [0.3, 0.95])

    assert len(rows) == 4
    matching = [row for row in rows if row.top_k == 2 and row.threshold == 0.3]
    assert len(matching) == 1
    assert matching[0].recall == 1.0


def test_judge_returns_evaluation_and_calls_judge_model() -> None:
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test", "RAG_JUDGE_MODEL": "judge-model"}
    )
    response = QueryResponse(
        user_question="¿Cómo solicito vacaciones?",
        system_answer="Desde Ausencias > Nueva solicitud.",
        chunks_related=[
            RelatedChunk(
                chunk_id="alba-manual::19",
                doc_id="alba-manual",
                version="4.2",
                section_title="19. Cómo solicitar vacaciones",
                score=0.9,
                text="Ingresá a Ausencias y creá una nueva solicitud.",
            )
        ],
        status="answered",
    )
    chat_client = FakeChatClient(JudgeOutput(score=8, justification="bien"))

    evaluation = judge(chat_client, settings, response)

    assert evaluation.score == 8
    assert evaluation.justification == "bien"
    assert len(chat_client.calls) == 1
    call = chat_client.calls[0]
    assert call["model"] == "judge-model"
    assert call["messages"][0]["content"] == JUDGE_PROMPT
    user_message = call["messages"][1]["content"]
    assert "¿Cómo solicito vacaciones?" in user_message
    assert "Desde Ausencias > Nueva solicitud." in user_message
    assert "19. Cómo solicitar vacaciones" in user_message


def test_judge_without_judge_model_raises_config_error() -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"}).model_copy(
        update={"judge_model": None}
    )
    response = QueryResponse(
        user_question="q",
        system_answer="a",
        chunks_related=[],
        status="not_in_manual",
    )
    chat_client = FakeChatClient(JudgeOutput(score=0, justification="n/a"))

    with pytest.raises(ConfigError):
        judge(chat_client, settings, response)

    assert chat_client.calls == []


def test_judge_gold_set_scores_positives_and_negatives(
    chroma_client: chromadb.ClientAPI, make_chunk: Callable[..., Chunk]
) -> None:
    settings = load_settings(
        {
            "OPENAI_API_KEY": "sk-test",
            "RAG_JUDGE_MODEL": "judge-model",
            "RAG_VERIFY_ANSWER": "false",
        }
    )
    collection_name = f"idx-{uuid4().hex}"
    index = ChunkIndex.open(chroma_client, collection_name, settings.embedding_model)
    chunk = make_chunk(19).model_copy(
        update={"section_title": "19. Cómo solicitar vacaciones"}
    )
    index.upsert([chunk], [[1.0, 0.0, 0.0, 0.0]])

    gold = GoldSet(
        positives=[
            GoldPositive(
                id="p01",
                category="procedure",
                question="¿Cómo pido vacaciones?",
                expected_sections=["19. Cómo solicitar vacaciones"],
            )
        ],
        negatives=[
            GoldNegative(
                id="n01",
                category="out_of_domain",
                question="¿Cómo hago una tarta?",
                expected_status="not_in_manual",
            )
        ],
    )

    embeddings_client = FakeEmbeddingsClient(fixed_vector=[0.9, 0.1, 0.0, 0.0])
    chat_client = FakeSequenceChatClient(
        [
            GroundedAnswer(
                status="answered",
                text="Desde Ausencias > Nueva solicitud.",
                sources=["19. Cómo solicitar vacaciones"],
            ),
            JudgeOutput(score=9, justification="bien"),
            GroundedAnswer(status="not_in_manual", text="x", sources=[]),
            JudgeOutput(score=10, justification="perfecto"),
        ]
    )
    client = FakeRagClient(embeddings_client, chat_client)

    report = judge_gold_set(gold, settings, client, index)

    assert report.total == 2
    assert report.mean_score == 9.5
    assert report.mean_score_positives == 9.0
    assert report.mean_score_negatives == 10.0
    assert report.negatives_status_ok == 1
    assert report.cases[0].status_ok is None
    assert report.cases[1].status_ok is True
    assert report.estimated_input_tokens > 0
