from collections.abc import Iterator
from contextlib import contextmanager

import openai
from openai import OpenAI

from rag.config import Settings
from rag.errors import ProviderError, ProviderTimeoutError


@contextmanager
def provider_call() -> Iterator[None]:
    """Translate OpenAI SDK exceptions raised inside the block into our typed errors.

    `APITimeoutError` is checked before `APIConnectionError` because the former
    subclasses the latter in the OpenAI SDK.
    """
    try:
        yield
    except openai.APITimeoutError as exc:
        raise ProviderTimeoutError("OpenAI request timed out") from exc
    except openai.RateLimitError as exc:
        raise ProviderError("OpenAI rate limit exceeded") from exc
    except openai.AuthenticationError as exc:
        raise ProviderError("OpenAI authentication failed") from exc
    except openai.APIConnectionError as exc:
        raise ProviderError("Could not connect to OpenAI") from exc
    except openai.APIError as exc:
        raise ProviderError(f"OpenAI error: {exc}") from exc


def create_client(settings: Settings) -> OpenAI:
    """Build the OpenAI client from settings.

    This is the only place in the project that instantiates the SDK; every
    other module receives the client as a parameter so tests can pass a fake.
    """
    return OpenAI(
        api_key=settings.openai_api_key.get_secret_value(),
        timeout=settings.openai_timeout,
        max_retries=settings.openai_max_retries,
    )
