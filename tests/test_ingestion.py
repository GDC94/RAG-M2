from pathlib import Path

import pytest
import tiktoken

from rag.errors import IngestionError
from rag.ingestion import split_manual


SIMPLE_MANUAL = (
    "Manual interno de soporte de Alba People\n"
    "Versión 4.2 — vigente desde el 1 de marzo de 2026\n"
    "\n"
    "Este es el parrafo de preambulo con informacion introductoria.\n"
    "\n"
    "## 1. Primera seccion\n"
    "Contenido de la primera seccion.\n"
    "\n"
    "## 2. Segunda seccion\n"
    "Contenido de la segunda seccion.\n"
)


def test_split_manual_yields_one_chunk_per_preamble_and_section():
    chunks = split_manual(SIMPLE_MANUAL, "doc-1")

    assert [c.chunk_index for c in chunks] == [0, 1, 2]
    assert all(c.doc_id == "doc-1" for c in chunks)


def test_split_manual_sets_section_titles_from_headers():
    chunks = split_manual(SIMPLE_MANUAL, "doc-1")

    assert chunks[0].section_title == "Manual interno de soporte de Alba People"
    assert chunks[1].section_title == "1. Primera seccion"
    assert chunks[2].section_title == "2. Segunda seccion"
    assert "## 1. Primera seccion" in chunks[1].text
    assert "## 2. Segunda seccion" in chunks[2].text


def test_split_manual_offsets_are_exact_and_contiguous():
    chunks = split_manual(SIMPLE_MANUAL, "doc-1")

    for c in chunks:
        assert SIMPLE_MANUAL[c.char_start : c.char_end] == c.text

    for a, b in zip(chunks, chunks[1:]):
        assert a.char_end == b.char_start

    assert chunks[0].char_start == 0
    assert chunks[-1].char_end == len(SIMPLE_MANUAL)


def test_split_manual_token_count_matches_tiktoken_encoding():
    encoder = tiktoken.encoding_for_model("text-embedding-3-small")
    chunks = split_manual(SIMPLE_MANUAL, "doc-1")

    for c in chunks:
        assert c.token_count == len(encoder.encode(c.text))


def test_split_manual_extracts_version_from_second_line():
    chunks = split_manual(SIMPLE_MANUAL, "doc-1")

    assert all(c.version == "4.2" for c in chunks)


def test_split_manual_raises_ingestion_error_when_no_version_line():
    manual_without_version = (
        "Manual interno de soporte de Alba People\n"
        "Esta linea no tiene version\n"
        "\n"
        "## 1. Primera seccion\n"
        "Contenido.\n"
    )

    with pytest.raises(IngestionError) as exc_info:
        split_manual(manual_without_version, "doc-1")

    assert exc_info.value.code == "ingestion_error"


def test_split_manual_chunk_id_follows_doc_id_and_index_format():
    chunks = split_manual(SIMPLE_MANUAL, "doc-1")

    assert [c.chunk_id for c in chunks] == ["doc-1::0", "doc-1::1", "doc-1::2"]


OVERSIZED_MANUAL = (
    "Manual interno de soporte de Alba People\n"
    "Versión 4.2 — vigente desde el 1 de marzo de 2026\n"
    "\n"
    "Preambulo corto.\n"
    "\n"
    "## 1. Seccion larga\n"
    + "\n\n".join(
        f"Parrafo numero {i} con suficiente texto para consumir varios tokens "
        f"de manera que la seccion completa supere el limite configurado de prueba."
        for i in range(1, 9)
    )
    + "\n"
)


def test_split_manual_splits_oversized_section_into_multiple_pieces_with_overlap():
    max_tokens = 40
    overlap_ratio = 0.15
    chunks = split_manual(OVERSIZED_MANUAL, "doc-1", max_tokens=max_tokens, overlap_ratio=overlap_ratio)

    section_chunks = [c for c in chunks if c.section_title == "1. Seccion larga"]

    assert len(section_chunks) > 1
    assert all(c.section_title == "1. Seccion larga" for c in section_chunks)
    assert all(chunk.token_count <= max_tokens for chunk in section_chunks)

    first, second = section_chunks[0], section_chunks[1]
    assert second.text.startswith("## 1. Seccion larga\n\n")

    encoder = tiktoken.encoding_for_model("text-embedding-3-small")
    first_body = OVERSIZED_MANUAL[first.char_start : first.char_end]
    overlap_token_count = round(max_tokens * overlap_ratio)
    expected_overlap = encoder.decode(encoder.encode(first_body)[-overlap_token_count:])
    second_body = OVERSIZED_MANUAL[second.char_start : second.char_end]

    assert second.text == "## 1. Seccion larga\n\n" + expected_overlap + second_body

    for a, b in zip(section_chunks, section_chunks[1:]):
        assert a.char_end == b.char_start


def test_split_manual_on_real_corpus_produces_expected_chunk_count_and_metadata():
    faq_path = Path(__file__).resolve().parent.parent / "data" / "faq_document.txt"
    text = faq_path.read_text(encoding="utf-8")

    chunks = split_manual(text, "alba-manual")

    assert len(chunks) == 39
    assert len({c.section_title for c in chunks}) == 39
    assert chunks[0].section_title == "Manual interno de soporte de Alba People"
    assert max(c.token_count for c in chunks) == 498
    assert all(c.version == "4.2" for c in chunks)
