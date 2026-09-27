import json
from pathlib import Path

import pytest

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
