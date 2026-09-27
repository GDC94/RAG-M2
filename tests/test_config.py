import pytest

from rag.config import load_settings
from rag.errors import ConfigError


def test_load_settings_applies_defaults_when_optional_vars_missing():
    settings = load_settings({"OPENAI_API_KEY": "sk-test-123"})

    assert settings.embedding_model == "text-embedding-3-small"
    assert settings.openai_model == "gpt-4o-mini"
    assert settings.openai_timeout == 30.0
    assert settings.openai_max_retries == 2
    assert settings.openai_max_output_tokens == 800
    assert settings.top_k == 4
    assert settings.similarity_threshold == 0.3
    assert settings.db_path == "./data/chromadb"
    assert settings.collection_name == "alba-manual"
    assert settings.max_chunk_tokens == 800
    assert settings.chunk_overlap_ratio == 0.15
    assert settings.max_question_chars == 1000
    assert settings.judge_model is None
    assert settings.verify_answer is False
    assert settings.debug is False


def test_missing_api_key_raises_config_error():
    with pytest.raises(ConfigError) as exc_info:
        load_settings({})

    assert exc_info.value.code == "config_error"


def test_api_key_is_hidden_in_repr_and_str_but_retrievable():
    secret = "sk-super-secret-value"
    settings = load_settings({"OPENAI_API_KEY": secret})

    assert secret not in repr(settings)
    assert secret not in str(settings)
    assert settings.openai_api_key.get_secret_value() == secret


@pytest.mark.parametrize(
    "env_var,value",
    [
        ("RAG_TOP_K", "0"),
        ("RAG_SIMILARITY_THRESHOLD", "1.5"),
        ("OPENAI_TIMEOUT", "-1"),
    ],
)
def test_invalid_values_raise_config_error(env_var, value):
    with pytest.raises(ConfigError):
        load_settings({"OPENAI_API_KEY": "sk-test-123", env_var: value})


def test_empty_string_variable_counts_as_unset():
    settings = load_settings(
        {
            "OPENAI_API_KEY": "sk-test-123",
            "RAG_TOP_K": "",
            "RAG_JUDGE_MODEL": "",
        }
    )

    assert settings.top_k == 4
    assert settings.judge_model is None
