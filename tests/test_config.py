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
    assert settings.top_k == 3
    assert settings.similarity_threshold == 0.42
    assert settings.db_path == "./data/chromadb"
    assert settings.collection_name == "alba-manual"
    assert settings.max_chunk_tokens == 800
    assert settings.chunk_overlap_ratio == 0.15
    assert settings.max_question_chars == 1000
    assert settings.judge_model == "gpt-4.1-mini"
    assert settings.verify_answer is True
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

    assert settings.top_k == 3
    assert settings.judge_model == "gpt-4.1-mini"


def test_cors_origins_defaults_to_empty_list():
    settings = load_settings({"OPENAI_API_KEY": "sk-test-123"})

    assert settings.cors_origins == []


def test_cors_origins_are_split_trimmed_and_empty_items_dropped():
    settings = load_settings(
        {
            "OPENAI_API_KEY": "sk-test-123",
            "RAG_CORS_ORIGINS": " https://a.example , ,https://b.example,",
        }
    )

    assert settings.cors_origins == ["https://a.example", "https://b.example"]


def test_abuse_protection_defaults():
    settings = load_settings({"OPENAI_API_KEY": "sk-test-123"})

    assert settings.rate_limit_per_minute == 5
    assert settings.rate_limit_per_day == 20
    assert settings.rate_limit_global_per_day == 300
    assert settings.cache_size == 200
    assert settings.cache_ttl_seconds == 86400


def test_abuse_protection_env_vars_override_defaults():
    settings = load_settings(
        {
            "OPENAI_API_KEY": "sk-test-123",
            "RAG_RATE_LIMIT_PER_MINUTE": "2",
            "RAG_RATE_LIMIT_PER_DAY": "7",
            "RAG_RATE_LIMIT_GLOBAL_PER_DAY": "100",
            "RAG_CACHE_SIZE": "10",
            "RAG_CACHE_TTL_SECONDS": "60",
        }
    )

    assert settings.rate_limit_per_minute == 2
    assert settings.rate_limit_per_day == 7
    assert settings.rate_limit_global_per_day == 100
    assert settings.cache_size == 10
    assert settings.cache_ttl_seconds == 60


def test_abuse_protection_zero_disables_and_negative_is_rejected():
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test-123", "RAG_RATE_LIMIT_PER_MINUTE": "0", "RAG_CACHE_SIZE": "0"}
    )
    assert settings.rate_limit_per_minute == 0
    assert settings.cache_size == 0

    with pytest.raises(ConfigError):
        load_settings({"OPENAI_API_KEY": "sk-test-123", "RAG_RATE_LIMIT_PER_DAY": "-1"})
