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
