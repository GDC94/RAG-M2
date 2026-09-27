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
from rag.errors import RagError
from rag.index import ChunkIndex
from rag.pipeline import answer_question


def main(argv: list[str], environ: Mapping[str, str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Query the Alba manual index")
    parser.add_argument("question")
    args = parser.parse_args(argv)
    question: str = str(args.question)

    if environ is None:
        load_dotenv()
        environ = os.environ

    try:
        settings = load_settings(environ)
        client = create_client(settings)
        chroma = chromadb.PersistentClient(path=settings.db_path)
        index = ChunkIndex.open(chroma, settings.collection_name, settings.embedding_model)
        response = answer_question(question, settings, client, index)
    except RagError as exc:
        print(json.dumps(exc.to_json(), ensure_ascii=False), file=sys.stdout)
        return 1

    print(response.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
