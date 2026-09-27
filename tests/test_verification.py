import pytest

from rag.config import load_settings
from rag.errors import ConfigError, ProviderError
from rag.models import Answer, RetrievedChunk, Verdict
from rag.verification import VERIFIER_PROMPT, VerifierOutput, verify
from tests.conftest import FakeChatClient, make_chunk


def _retrieved(make_chunk_fn) -> list[RetrievedChunk]:
    chunk = make_chunk_fn(19).model_copy(
        update={"section_title": "19. Cómo solicitar vacaciones"}
    )
    return [RetrievedChunk(chunk=chunk, score=0.9)]


def test_verify_returns_supported_verdict_and_calls_judge_model(
    make_chunk,
) -> None:
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test", "RAG_JUDGE_MODEL": "judge-model"}
    )
    retrieved = _retrieved(make_chunk)
    answer = Answer(status="answered", text="Desde Ausencias.", sources=[])
    chat_client = FakeChatClient(VerifierOutput(label="supported", reason="ok"))

    verdict = verify(chat_client, settings, "q", retrieved, answer)

    assert verdict == Verdict(label="supported", reason="ok")
    assert len(chat_client.calls) == 1
    call = chat_client.calls[0]
    assert call["model"] == "judge-model"
    assert call["response_format"] is VerifierOutput
    assert call["messages"][0]["content"] == VERIFIER_PROMPT
    user_message = call["messages"][1]["content"]
    assert "[Fuente: 19. Cómo solicitar vacaciones]" in user_message
    assert "Desde Ausencias." in user_message
    assert "status=answered" in user_message


def test_verify_without_judge_model_raises_config_error_and_makes_no_call(
    make_chunk,
) -> None:
    settings = load_settings({"OPENAI_API_KEY": "sk-test"}).model_copy(
        update={"judge_model": None}
    )
    retrieved = _retrieved(make_chunk)
    answer = Answer(status="answered", text="Desde Ausencias.", sources=[])
    chat_client = FakeChatClient(VerifierOutput(label="supported", reason="ok"))

    with pytest.raises(ConfigError):
        verify(chat_client, settings, "q", retrieved, answer)

    assert chat_client.calls == []


def test_verify_raises_provider_error_when_model_returns_no_parsed_output(
    make_chunk,
) -> None:
    settings = load_settings(
        {"OPENAI_API_KEY": "sk-test", "RAG_JUDGE_MODEL": "judge-model"}
    )
    retrieved = _retrieved(make_chunk)
    answer = Answer(status="answered", text="Desde Ausencias.", sources=[])
    chat_client = FakeChatClient(None)

    with pytest.raises(ProviderError):
        verify(chat_client, settings, "q", retrieved, answer)
