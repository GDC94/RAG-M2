import json
from pathlib import Path

import pytest

import build_index


def test_main_fails_fast_on_missing_config(capsys: pytest.CaptureFixture[str]) -> None:
    chromadb_dir = Path("data/chromadb")
    existed_before = chromadb_dir.exists()

    exit_code = build_index.main([], environ={})

    assert exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["error"]["code"] == "config_error"
    assert isinstance(payload["error"]["message"], str)
    if not existed_before:
        assert not chromadb_dir.exists()


def test_main_returns_io_error_for_a_missing_manual_file(
    capsys: pytest.CaptureFixture[str], tmp_path: Path
) -> None:
    environ = {"OPENAI_API_KEY": "sk-test", "RAG_DB_PATH": str(tmp_path / "db")}
    missing_manual = str(tmp_path / "missing.txt")

    exit_code = build_index.main([missing_manual], environ=environ)

    assert exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["error"]["code"] == "io_error"
