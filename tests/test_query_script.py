import io
import json
from pathlib import Path

import pytest
from rich.console import Console

import query


def test_main_fails_fast_on_missing_config(capsys: pytest.CaptureFixture[str]) -> None:
    chromadb_dir = Path("data/chromadb")
    existed_before = chromadb_dir.exists()

    exit_code = query.main(["hola"], environ={})

    assert exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["error"]["code"] == "config_error"
    assert isinstance(payload["error"]["message"], str)
    if not existed_before:
        assert not chromadb_dir.exists()


def test_main_returns_invalid_question_for_blank_input(
    capsys: pytest.CaptureFixture[str], tmp_path: Path
) -> None:
    environ = {"OPENAI_API_KEY": "sk-test", "RAG_DB_PATH": str(tmp_path / "db")}

    exit_code = query.main(["   "], environ=environ)

    assert exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["error"]["code"] == "invalid_question"


def test_main_returns_index_empty_when_the_index_has_no_chunks(
    capsys: pytest.CaptureFixture[str], tmp_path: Path
) -> None:
    environ = {"OPENAI_API_KEY": "sk-test", "RAG_DB_PATH": str(tmp_path / "db")}

    exit_code = query.main(["hola"], environ=environ)

    assert exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["error"]["code"] == "index_empty"


def test_main_pretty_renders_error_and_prints_no_json(
    capsys: pytest.CaptureFixture[str], tmp_path: Path
) -> None:
    environ = {"OPENAI_API_KEY": "sk-test", "RAG_DB_PATH": str(tmp_path / "db")}
    buffer = io.StringIO()
    console = Console(file=buffer, width=100, force_terminal=False, color_system=None)

    exit_code = query.main(["hola", "--pretty"], environ=environ, console=console)

    assert exit_code == 1
    rendered = buffer.getvalue()
    assert "index_empty" in rendered
    captured = capsys.readouterr()
    assert captured.out == ""


def test_main_without_pretty_still_prints_error_json(
    capsys: pytest.CaptureFixture[str], tmp_path: Path
) -> None:
    environ = {"OPENAI_API_KEY": "sk-test", "RAG_DB_PATH": str(tmp_path / "db")}

    exit_code = query.main(["hola"], environ=environ)

    assert exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["error"]["code"] == "index_empty"


def test_main_with_debug_still_prints_clean_json_on_empty_index(
    capsys: pytest.CaptureFixture[str], tmp_path: Path
) -> None:
    environ = {
        "OPENAI_API_KEY": "sk-test",
        "RAG_DB_PATH": str(tmp_path / "db"),
        "RAG_DEBUG": "true",
        "RAG_VERIFY_ANSWER": "false",
    }

    exit_code = query.main(["hola"], environ=environ)

    assert exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["error"]["code"] == "index_empty"
