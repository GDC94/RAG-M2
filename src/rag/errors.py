class RagError(Exception):
    code: str = "rag_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message

    def to_json(self) -> dict:
        return {"error": {"code": self.code, "message": self.message}}

    def __str__(self) -> str:
        return self.message


class ConfigError(RagError):
    code = "config_error"


class InvalidQuestionError(RagError):
    code = "invalid_question"


class RequestCancelledError(RagError):
    code = "request_cancelled"


class ProviderError(RagError):
    code = "provider_error"


class ProviderTimeoutError(RagError):
    code = "provider_timeout"


class IndexEmptyError(RagError):
    code = "index_empty"


class IndexModelMismatchError(RagError):
    code = "index_model_mismatch"


class IngestionError(RagError):
    code = "ingestion_error"
