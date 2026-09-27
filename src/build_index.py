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
from rag.pipeline import build_index


def main(argv: list[str], environ: Mapping[str, str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the Alba manual index")
    parser.add_argument("manual", nargs="?", default="data/faq_document.txt")
    parser.add_argument("--doc-id", default="alba-manual")
    args = parser.parse_args(argv)
    manual_path: str = str(args.manual)
    doc_id: str = str(args.doc_id)

    if environ is None:
        load_dotenv()
        environ = os.environ

    try:
        settings = load_settings(environ)
        client = create_client(settings)
        chroma = chromadb.PersistentClient(path=settings.db_path)
        index = ChunkIndex.open(chroma, settings.collection_name, settings.embedding_model)
        text = Path(manual_path).read_text(encoding="utf-8")
        report = build_index(text, doc_id, settings, client, index)
    except RagError as exc:
        print(json.dumps(exc.to_json(), ensure_ascii=False), file=sys.stdout)
        return 1
    except OSError as exc:
        print(
            json.dumps({"error": {"code": "io_error", "message": str(exc)}}, ensure_ascii=False),
            file=sys.stdout,
        )
        return 1

    print(report.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
