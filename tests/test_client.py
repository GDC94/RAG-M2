from rag.client import create_client
from rag.config import load_settings


def test_create_client_applies_timeout_retries_and_key_from_settings():
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test-123", "OPENAI_TIMEOUT": "12", "OPENAI_MAX_RETRIES": "5"}
    )

    client = create_client(settings)

    assert client.timeout == 12
    assert client.max_retries == 5
    assert client.api_key == "sk-test-123"
