import argparse
import json
import os
import sys
from collections.abc import Mapping
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import chromadb
from dotenv import load_dotenv

from rag.client import create_client
from rag.config import load_settings
from rag.errors import ConfigError, RagError
from rag.evaluation import (
    embed_questions,
    evaluate_recall,
    judge_gold_set,
    load_gold_set,
    sweep,
)
from rag.index import ChunkIndex
from rag.models import GoldSet


class _GoldSetError(Exception):
    code = "gold_set_error"


def _parse_float_list(raw: str) -> list[float]:
    return [float(item) for item in raw.split(",")]


def _parse_int_list(raw: str) -> list[int]:
    return [int(item) for item in raw.split(",")]


def _load_gold_set_or_raise(path_str: str) -> GoldSet:
    try:
        return load_gold_set(Path(path_str))
    except (OSError, ValueError) as exc:
        raise _GoldSetError(str(exc)) from exc


def main(argv: list[str], environ: Mapping[str, str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Evaluate retrieval recall against the gold set"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    recall_parser = subparsers.add_parser("recall")
    recall_parser.add_argument("--gold", default="data/gold_set.json")
    recall_parser.add_argument("--out", default=None)

    sweep_parser = subparsers.add_parser("sweep")
    sweep_parser.add_argument("--gold", default="data/gold_set.json")
    sweep_parser.add_argument("--top-k", default="1,2,3,4,5,6")
    sweep_parser.add_argument(
        "--thresholds", default="0.30,0.35,0.40,0.45,0.50,0.55,0.60"
    )
    sweep_parser.add_argument("--out", default=None)

    judge_parser = subparsers.add_parser("judge")
    judge_parser.add_argument("--gold", default="data/gold_set.json")
    judge_parser.add_argument("--out", default=None)

    args = parser.parse_args(argv)
    command: str = str(args.command)
    gold_path: str = str(args.gold)
    out_path: str | None = args.out

    try:
        top_ks = _parse_int_list(str(args.top_k)) if command == "sweep" else []
        thresholds = _parse_float_list(str(args.thresholds)) if command == "sweep" else []
    except ValueError as exc:
        print(
            json.dumps({"error": {"code": "invalid_arguments", "message": str(exc)}}),
            file=sys.stdout,
        )
        return 1

    if environ is None:
        load_dotenv()
        environ = os.environ

    try:
        settings = load_settings(environ)
        if command == "judge" and settings.judge_model is None:
            raise ConfigError(
                "RAG_JUDGE_MODEL is required when RAG_VERIFY_ANSWER is true"
            )
        client = create_client(settings)
        chroma = chromadb.PersistentClient(path=settings.db_path)
        index = ChunkIndex.open(chroma, settings.collection_name, settings.embedding_model)
        gold = _load_gold_set_or_raise(gold_path)

        if command == "judge":
            judge_report = judge_gold_set(gold, settings, client, index)
            output = judge_report.model_dump_json(indent=2)
            print(output)
            if out_path:
                Path(out_path).write_text(output, encoding="utf-8")
        else:
            positive_vectors, negative_vectors = embed_questions(
                client, settings.embedding_model, gold
            )

            if command == "recall":
                report = evaluate_recall(
                    gold,
                    positive_vectors,
                    negative_vectors,
                    index,
                    settings.top_k,
                    settings.similarity_threshold,
                )
                output = report.model_dump_json(indent=2)
                print(output)
                if out_path:
                    Path(out_path).write_text(output, encoding="utf-8")
            else:
                rows = sweep(
                    gold, positive_vectors, negative_vectors, index, top_ks, thresholds
                )
                output = json.dumps([row.model_dump() for row in rows], indent=2)
                print(output)
                if out_path:
                    Path(out_path).write_text(output, encoding="utf-8")
    except RagError as exc:
        print(json.dumps(exc.to_json(), ensure_ascii=False), file=sys.stdout)
        return 1
    except _GoldSetError as exc:
        print(
            json.dumps(
                {"error": {"code": exc.code, "message": str(exc)}}, ensure_ascii=False
            ),
            file=sys.stdout,
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
