from collections.abc import Mapping

from pydantic import BaseModel, Field, SecretStr, ValidationError

from rag.errors import ConfigError

_TRUE_VALUES = {"true", "1", "yes"}
_FALSE_VALUES = {"false", "0", "no"}


class Settings(BaseModel):
    openai_api_key: SecretStr
    embedding_model: str = "text-embedding-3-small"
    openai_model: str = "gpt-4o-mini"
    openai_timeout: float = Field(default=30.0, gt=0)
    openai_max_retries: int = Field(default=2, ge=0)
    openai_max_output_tokens: int = Field(default=800, gt=0)
    top_k: int = Field(default=3, gt=0)
    similarity_threshold: float = Field(default=0.42, ge=0, le=1)
    db_path: str = "./data/chromadb"
    collection_name: str = "alba-manual"
    max_chunk_tokens: int = Field(default=800, gt=0)
    chunk_overlap_ratio: float = Field(default=0.15, ge=0, lt=1)
    max_question_chars: int = Field(default=1000, gt=0)
    judge_model: str | None = None
    verify_answer: bool = False
    debug: bool = False


def _get(environ: Mapping[str, str], name: str) -> str | None:
    value = environ.get(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _parse_bool(name: str, raw: str) -> bool:
    lowered = raw.strip().lower()
    if lowered in _TRUE_VALUES:
        return True
    if lowered in _FALSE_VALUES:
        return False
    raise ConfigError(f"Invalid boolean value for {name}: {raw!r}")


def _parse_number(kind: str, converter, name: str, raw: str):
    try:
        return converter(raw)
    except ValueError as exc:
        raise ConfigError(f"Invalid {kind} value for {name}: {raw!r}") from exc


_STRING_FIELDS = {
    "EMBEDDING_MODEL": "embedding_model",
    "OPENAI_MODEL": "openai_model",
    "RAG_DB_PATH": "db_path",
    "RAG_COLLECTION_NAME": "collection_name",
    "RAG_JUDGE_MODEL": "judge_model",
}
_FLOAT_FIELDS = {
    "OPENAI_TIMEOUT": "openai_timeout",
    "RAG_SIMILARITY_THRESHOLD": "similarity_threshold",
    "RAG_CHUNK_OVERLAP_RATIO": "chunk_overlap_ratio",
}
_INT_FIELDS = {
    "OPENAI_MAX_RETRIES": "openai_max_retries",
    "OPENAI_MAX_OUTPUT_TOKENS": "openai_max_output_tokens",
    "RAG_TOP_K": "top_k",
    "RAG_MAX_CHUNK_TOKENS": "max_chunk_tokens",
    "RAG_MAX_QUESTION_CHARS": "max_question_chars",
}
_BOOL_FIELDS = {
    "RAG_VERIFY_ANSWER": "verify_answer",
    "RAG_DEBUG": "debug",
}


def load_settings(environ: Mapping[str, str]) -> Settings:
    api_key = _get(environ, "OPENAI_API_KEY")
    if api_key is None:
        raise ConfigError("Missing required environment variable: OPENAI_API_KEY")

    kwargs: dict = {"openai_api_key": api_key}

    for env_name, field_name in _STRING_FIELDS.items():
        raw = _get(environ, env_name)
        if raw is not None:
            kwargs[field_name] = raw

    for env_name, field_name in _FLOAT_FIELDS.items():
        raw = _get(environ, env_name)
        if raw is not None:
            kwargs[field_name] = _parse_number("numeric", float, env_name, raw)

    for env_name, field_name in _INT_FIELDS.items():
        raw = _get(environ, env_name)
        if raw is not None:
            kwargs[field_name] = _parse_number("integer", int, env_name, raw)

    for env_name, field_name in _BOOL_FIELDS.items():
        raw = _get(environ, env_name)
        if raw is not None:
            kwargs[field_name] = _parse_bool(env_name, raw)

    try:
        return Settings(**kwargs)
    except ValidationError as exc:
        offending = ", ".join(sorted({str(error["loc"][0]) for error in exc.errors()}))
        raise ConfigError(f"Invalid configuration for: {offending}") from exc
