import os
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

import chromadb
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from rag.client import create_client
from rag.config import Settings, load_settings
from rag.errors import RagError
from rag.index import ChunkIndex
from rag.models import QueryResponse
from rag.pipeline import answer_question


class QueryRequest(BaseModel):
    question: str


_ERROR_STATUS_BY_CODE: dict[str, int] = {
    "invalid_question": 422,
    "index_empty": 503,
    "config_error": 500,
    "index_model_mismatch": 500,
    "provider_error": 502,
    "provider_timeout": 504,
}
_DEFAULT_ERROR_STATUS = 500


def _validation_message(exc: RequestValidationError) -> str:
    """Render a short, human-readable message from pydantic's error list."""
    errors = exc.errors()
    if not errors:
        return "Invalid request body"
    parts = []
    for error in errors:
        loc = ".".join(str(part) for part in error["loc"] if part != "body")
        parts.append(f"{loc}: {error['msg']}" if loc else error["msg"])
    return "; ".join(parts)


def create_app(
    settings: Settings | None = None,
    client: Any = None,
    index: ChunkIndex | None = None,
    lifespan: Any = None,
) -> FastAPI:
    """Build the FastAPI app wiring `/api/query` to `answer_question`.

    Explicit `settings`/`client`/`index` are stored on `app.state` immediately,
    which is how tests build an app with fakes and no network calls. The
    module-level `app` instead passes `lifespan`, which builds the real deps
    lazily on startup so importing this module never touches the environment.
    """
    app = FastAPI(lifespan=lifespan)
    app.state.settings = settings
    app.state.client = client
    app.state.index = index

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/query", response_model=QueryResponse)
    def query(payload: QueryRequest, request: Request) -> QueryResponse:
        return answer_question(
            payload.question,
            request.app.state.settings,
            request.app.state.client,
            request.app.state.index,
        )

    @app.exception_handler(RagError)
    def handle_rag_error(request: Request, exc: RagError) -> JSONResponse:
        status_code = _ERROR_STATUS_BY_CODE.get(exc.code, _DEFAULT_ERROR_STATUS)
        return JSONResponse(exc.to_json(), status_code=status_code)

    @app.exception_handler(RequestValidationError)
    def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        payload = {"error": {"code": "invalid_request", "message": _validation_message(exc)}}
        return JSONResponse(payload, status_code=422)

    return app


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    load_dotenv()
    settings = load_settings(os.environ)
    client = create_client(settings)
    chroma = chromadb.PersistentClient(path=settings.db_path)
    index = ChunkIndex.open(chroma, settings.collection_name, settings.embedding_model)
    app.state.settings = settings
    app.state.client = client
    app.state.index = index
    yield


app = create_app(lifespan=_lifespan)
