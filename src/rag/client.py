from openai import OpenAI

from rag.config import Settings


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
