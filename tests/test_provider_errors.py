from collections.abc import Callable

import httpx
import openai
import pytest

from rag.config import load_settings
from rag.embeddings import embed_texts
from rag.errors import ProviderError, ProviderTimeoutError
from rag.generation import generate
from rag.models import Chunk, RetrievedChunk

from tests.conftest import RaisingClient


def test_embed_texts_translates_timeout_into_provider_timeout_error() -> None:
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    client = RaisingClient(openai.APITimeoutError(request=request))

    with pytest.raises(ProviderTimeoutError) as excinfo:
        embed_texts(client, "text-embedding-3-small", ["a"])

    assert excinfo.value.code == "provider_timeout"


def test_embed_texts_translates_rate_limit_into_provider_error() -> None:
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    response = httpx.Response(429, request=request)
    client = RaisingClient(openai.RateLimitError("rate limited", response=response, body=None))

    with pytest.raises(ProviderError) as excinfo:
        embed_texts(client, "text-embedding-3-small", ["a"])

    assert "rate limit" in str(excinfo.value)


def test_embed_texts_translates_authentication_error_without_leaking_sdk_details() -> None:
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    response = httpx.Response(401, request=request)
    client = RaisingClient(openai.AuthenticationError("bad key", response=response, body=None))

    with pytest.raises(ProviderError) as excinfo:
        embed_texts(client, "text-embedding-3-small", ["a"])

    assert "authentication" in str(excinfo.value)
    assert "bad key" not in str(excinfo.value)


def test_generate_translates_connection_error_into_provider_error(
    make_chunk: Callable[..., Chunk],
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"})
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    client = RaisingClient(openai.APIConnectionError(request=request))
    retrieved = [RetrievedChunk(chunk=make_chunk(19), score=0.7)]

    with pytest.raises(ProviderError) as excinfo:
        generate(client, settings, "question", retrieved)

    assert "connect" in str(excinfo.value)
