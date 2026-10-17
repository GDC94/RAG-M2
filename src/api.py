import asyncio
import json
import os
import queue
import sys
import threading
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

import chromadb
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel

from rag.cache import ResponseCache
from rag.client import create_client
from rag.config import Settings, load_settings, parse_csv
from rag.errors import InvalidQuestionError, RagError, RateLimitedError, RequestCancelledError
from rag.index import ChunkIndex
from rag.models import QueryResponse
from rag.pipeline import answer_question, validate_question
from rag.rate_limit import RateLimiter


class QueryRequest(BaseModel):
    question: str


_ERROR_STATUS_BY_CODE: dict[str, int] = {
    "invalid_question": 422,
    "index_empty": 503,
    "config_error": 500,
    "index_model_mismatch": 500,
    "provider_error": 502,
    "provider_timeout": 504,
    "rate_limited": 429,
}
_DEFAULT_ERROR_STATUS = 500


_STAGES_WITHOUT_TIMINGS = ("embed", "search", "generate")
_ALL_STAGES = (*_STAGES_WITHOUT_TIMINGS, "verify")

_LIMIT_SUBJECT = {
    "per_minute": "Hiciste demasiadas consultas en poco tiempo.",
    "per_day": "Alcanzaste el límite de consultas de hoy.",
    "global_per_day": "El demo alcanzó su límite diario de consultas.",
}


def _rate_limited_error(limit: str, retry_after_seconds: int) -> RateLimitedError:
    message = f"{_LIMIT_SUBJECT[limit]} Volvé a intentar en {_human_wait(retry_after_seconds)}."
    return RateLimitedError(message, retry_after_seconds, limit)


def _human_wait(seconds: int) -> str:
    if seconds < 60:
        value, unit = seconds, "segundo"
    elif seconds < 3600:
        value, unit = -(-seconds // 60), "minuto"
    else:
        value, unit = -(-seconds // 3600), "hora"
    return f"{value} {unit}" if value == 1 else f"{value} {unit}s"


def _client_key(request: Request) -> str:
    """Identify the caller for rate limiting.

    `Fly-Client-IP` is set by Fly's proxy, which overwrites any client-supplied
    value, so it is only trustworthy when the app runs behind Fly. Anywhere else
    a client could spoof it to dodge the limit; fall back to the socket peer.
    """
    forwarded = request.headers.get("fly-client-ip", "").strip()
    if forwarded:
        return forwarded
    return request.client.host if request.client else "unknown"


def _enforce_rate_limit(request: Request) -> None:
    limiter: RateLimiter | None = request.app.state.rate_limiter
    if limiter is None:
        return
    decision = limiter.check(_client_key(request))
    if not decision.allowed and decision.limit is not None:
        raise _rate_limited_error(decision.limit, decision.retry_after_seconds)


def _cache_lookup(request: Request, question: str) -> QueryResponse | None:
    cache: ResponseCache | None = request.app.state.response_cache
    if cache is None:
        return None
    hit = cache.get(question)
    if hit is None:
        return None
    # Show the wording this client typed, not the first asker's.
    return hit.model_copy(update={"user_question": question})


def _cached_stream_events(response: QueryResponse) -> Iterator[str]:
    """Replay the stage events a real run would emit, then the cached result."""
    timings = response.timings
    stages = _STAGES_WITHOUT_TIMINGS if timings is None else tuple(s for s in _ALL_STAGES if s in timings)
    for stage in stages:
        for phase in ("start", "end"):
            yield json.dumps({"type": "stage", "stage": stage, "phase": phase}) + "\n"
    event = {"type": "result", "data": response.model_dump(mode="json")}
    yield json.dumps(event, ensure_ascii=False) + "\n"


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


async def _stream_query_events(
    question: str,
    settings: Settings,
    client: Any,
    index: ChunkIndex,
    request: Request,
    limiter: threading.BoundedSemaphore | None = None,
    cache: ResponseCache | None = None,
) -> AsyncIterator[str]:
    """Run `answer_question` in a worker thread, yielding one ndjson line per event.

    Stage events are pushed to a queue as they happen so the generator can
    yield them as soon as they arrive; the final line is always exactly one
    "result" or "error" event, after which the generator stops.
    """
    events: queue.Queue[dict[str, Any]] = queue.Queue()
    cancellation = threading.Event()

    def on_stage(stage: str, phase: str) -> None:
        events.put({"type": "stage", "stage": stage, "phase": phase})

    def run() -> None:
        try:
            response = answer_question(
                question,
                settings,
                client,
                index,
                on_stage=on_stage,
                is_cancelled=cancellation.is_set,
            )
            if cache is not None:
                cache.put(question, response)
            events.put({"type": "result", "data": response.model_dump(mode="json")})
        except RequestCancelledError:
            if not cancellation.is_set():
                events.put(
                    {
                        "type": "error",
                        "error": {"code": "request_cancelled", "message": "Request cancelled"},
                    }
                )
        except RagError as exc:
            events.put({"type": "error", "error": exc.to_json()["error"]})
        except Exception:
            events.put(
                {
                    "type": "error",
                    "error": {"code": "internal_error", "message": "Unexpected server error"},
                }
            )
        finally:
            if limiter is not None:
                limiter.release()

    thread = threading.Thread(target=run, daemon=True)
    thread.start()

    try:
        while True:
            try:
                event = events.get_nowait()
            except queue.Empty:
                if await request.is_disconnected():
                    cancellation.set()
                    return
                await asyncio.sleep(0.01)
                continue
            yield json.dumps(event, ensure_ascii=False) + "\n"
            if event["type"] in ("result", "error"):
                break
    finally:
        cancellation.set()


def _ndjson_response(lines: Iterator[str] | AsyncIterator[str]) -> StreamingResponse:
    return StreamingResponse(
        lines,
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _install_protections(app: FastAPI, settings: Settings) -> None:
    """Build the limiter and cache from settings, keeping any injected ones."""
    if app.state.rate_limiter is None:
        app.state.rate_limiter = RateLimiter(
            settings.rate_limit_per_minute,
            settings.rate_limit_per_day,
            settings.rate_limit_global_per_day,
        )
    if app.state.response_cache is None:
        app.state.response_cache = ResponseCache(settings.cache_size, settings.cache_ttl_seconds)


def create_app(
    settings: Settings | None = None,
    client: Any = None,
    index: ChunkIndex | None = None,
    lifespan: Any = None,
    cors_origins: list[str] | None = None,
    rate_limiter: RateLimiter | None = None,
    response_cache: ResponseCache | None = None,
) -> FastAPI:
    """Build the FastAPI app wiring `/api/query` to `answer_question`.

    Explicit `settings`/`client`/`index` are stored on `app.state` immediately,
    which is how tests build an app with fakes and no network calls. The
    module-level `app` instead passes `lifespan`, which builds the real deps
    lazily on startup so importing this module never touches the environment.

    CORS middleware can only be added before the app starts, so the module-level
    `app` (whose settings load in the lifespan) passes `cors_origins` explicitly;
    otherwise they come from `settings`. No origins means no CORS middleware.

    The per-IP `rate_limiter` and exact-match `response_cache` are injectable
    (tests pass ones with a fake clock); when omitted they are built from
    `settings`. Both are in-process state, which is correct for the single-machine
    deployment. Per request the order is: validate, cache lookup (a hit is free
    and skips the limiter), rate limit, pipeline, store in cache.
    """
    app = FastAPI(lifespan=lifespan)
    if cors_origins is None and settings is not None:
        cors_origins = settings.cors_origins
    if cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_methods=["GET", "POST"],
            allow_headers=["content-type"],
            expose_headers=["Retry-After"],
        )
    app.state.settings = settings
    app.state.client = client
    app.state.index = index
    app.state.stream_limiter = (
        threading.BoundedSemaphore(settings.max_concurrent_streams) if settings is not None else None
    )
    app.state.rate_limiter = rate_limiter
    app.state.response_cache = response_cache
    if settings is not None:
        _install_protections(app, settings)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/query", response_model=QueryResponse)
    def query(payload: QueryRequest, request: Request) -> QueryResponse:
        question = validate_question(payload.question, request.app.state.settings)
        hit = _cache_lookup(request, question)
        if hit is not None:
            return hit
        _enforce_rate_limit(request)
        response = answer_question(
            question,
            request.app.state.settings,
            request.app.state.client,
            request.app.state.index,
        )
        if request.app.state.response_cache is not None:
            request.app.state.response_cache.put(question, response)
        return response

    @app.post("/api/query/stream")
    def query_stream(payload: QueryRequest, request: Request) -> Response:
        settings = request.app.state.settings
        try:
            question: str | None = validate_question(payload.question, settings)
        except InvalidQuestionError:
            # Free to answer (no provider call): let the stream emit the error event.
            question = None

        if question is not None:
            hit = _cache_lookup(request, question)
            if hit is not None:
                return _ndjson_response(_cached_stream_events(hit))

        limiter = request.app.state.stream_limiter
        if limiter is None or not limiter.acquire(blocking=False):
            return JSONResponse(
                {"error": {"code": "stream_busy", "message": "Too many active requests"}},
                status_code=503,
            )
        if question is not None:
            try:
                _enforce_rate_limit(request)
            except RateLimitedError:
                limiter.release()
                raise
        return _ndjson_response(
            _stream_query_events(
                payload.question,
                settings,
                request.app.state.client,
                request.app.state.index,
                request,
                limiter,
                request.app.state.response_cache,
            )
        )

    @app.exception_handler(RagError)
    def handle_rag_error(request: Request, exc: RagError) -> JSONResponse:
        status_code = _ERROR_STATUS_BY_CODE.get(exc.code, _DEFAULT_ERROR_STATUS)
        headers = (
            {"Retry-After": str(exc.retry_after_seconds)}
            if isinstance(exc, RateLimitedError)
            else None
        )
        return JSONResponse(exc.to_json(), status_code=status_code, headers=headers)

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
    app.state.stream_limiter = threading.BoundedSemaphore(settings.max_concurrent_streams)
    _install_protections(app, settings)
    yield


app = create_app(lifespan=_lifespan, cors_origins=parse_csv(os.environ.get("RAG_CORS_ORIGINS", "")))
