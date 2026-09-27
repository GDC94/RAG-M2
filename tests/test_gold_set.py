from pathlib import Path

from rag.evaluation import load_gold_set
from rag.ingestion import split_manual

GOLD_SET_PATH = Path("data/gold_set.json")
MANUAL_PATH = Path("data/faq_document.txt")


def test_gold_set_matches_manual_sections_and_has_expected_shape() -> None:
    gold = load_gold_set(GOLD_SET_PATH)

    assert len(gold.positives) == 26
    assert len(gold.negatives) == 8

    manual_text = MANUAL_PATH.read_text(encoding="utf-8")
    chunks = split_manual(manual_text, "alba-manual")
    section_titles = {chunk.section_title for chunk in chunks}

    for positive in gold.positives:
        for section in positive.expected_sections:
            assert section in section_titles

    for negative in gold.negatives:
        assert negative.expected_status in ("not_in_manual", "client_policy")

    all_ids = [positive.id for positive in gold.positives] + [
        negative.id for negative in gold.negatives
    ]
    assert len(all_ids) == len(set(all_ids))
