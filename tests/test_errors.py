import pytest

from rag.errors import (
    ConfigError,
    IndexEmptyError,
    IndexModelMismatchError,
    InvalidQuestionError,
    ProviderError,
    ProviderTimeoutError,
)


@pytest.mark.parametrize(
    "error_class,code",
    [
        (ConfigError, "config_error"),
        (InvalidQuestionError, "invalid_question"),
        (ProviderError, "provider_error"),
        (ProviderTimeoutError, "provider_timeout"),
        (IndexEmptyError, "index_empty"),
        (IndexModelMismatchError, "index_model_mismatch"),
    ],
)
def test_to_json_returns_error_code_and_message(error_class, code):
    error = error_class("something went wrong")

    assert error.to_json() == {"error": {"code": code, "message": "something went wrong"}}
