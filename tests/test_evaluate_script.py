import json

import pytest

import evaluate


def test_main_recall_fails_fast_on_missing_config(
    capsys: pytest.CaptureFixture[str],
) -> None:
    exit_code = evaluate.main(["recall"], environ={})

    assert exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["error"]["code"] == "config_error"


def test_main_judge_fails_fast_on_empty_index(
    capsys: pytest.CaptureFixture[str], tmp_path
) -> None:
    exit_code = evaluate.main(
        ["judge"],
        environ={"OPENAI_API_KEY": "sk-test", "RAG_DB_PATH": str(tmp_path / "db")},
    )

    assert exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["error"]["code"] == "index_empty"
