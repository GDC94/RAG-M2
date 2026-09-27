import re

import tiktoken

from rag.errors import IngestionError
from rag.models import Chunk

_SECTION_HEADER_RE = re.compile(r"^## .*$", re.MULTILINE)
_VERSION_LINE_RE = re.compile(r"^Versión\s+(\S+)")
_encoder = None


def _get_encoder():
    global _encoder
    if _encoder is None:
        _encoder = tiktoken.encoding_for_model("text-embedding-3-small")
    return _encoder


def _count_tokens(text: str) -> int:
    return len(_get_encoder().encode(text))


def _make_chunk(
    *,
    doc_id: str,
    version: str,
    section_title: str,
    chunk_index: int,
    char_start: int,
    char_end: int,
    text: str,
) -> Chunk:
    return Chunk(
        chunk_id=f"{doc_id}::{chunk_index}",
        doc_id=doc_id,
        version=version,
        section_title=section_title,
        chunk_index=chunk_index,
        char_start=char_start,
        char_end=char_end,
        token_count=_count_tokens(text),
        text=text,
    )


def _split_paragraphs(body: str) -> list[tuple[str, int, int]]:
    """Split body into paragraph chunks (text with trailing blank-line
    separator attached), as (text, local_start, local_end) tuples that
    partition body exactly, with no gaps or overlaps.
    """
    parts = re.split(r"(\n{2,})", body)
    paragraphs = []
    pos = 0
    for i in range(0, len(parts), 2):
        para = parts[i]
        sep = parts[i + 1] if i + 1 < len(parts) else ""
        chunk_text = para + sep
        start = pos
        end = pos + len(chunk_text)
        if chunk_text:
            paragraphs.append((chunk_text, start, end))
        pos = end
    return paragraphs


def _group_into_pieces(
    paragraphs: list[tuple[str, int, int]], max_tokens: int
) -> list[tuple[int, int]]:
    """Group consecutive paragraphs into pieces of local (start, end)
    offsets such that each piece stays <= max_tokens where possible; a
    single paragraph larger than max_tokens becomes its own piece.
    """
    pieces: list[tuple[int, int]] = []
    if not paragraphs:
        return pieces

    current_text, current_start, current_end = paragraphs[0]

    for para_text, p_start, p_end in paragraphs[1:]:
        candidate_text = current_text + para_text
        if _count_tokens(candidate_text) <= max_tokens:
            current_end, current_text = p_end, candidate_text
        else:
            pieces.append((current_start, current_end))
            current_text, current_start, current_end = para_text, p_start, p_end

    pieces.append((current_start, current_end))
    return pieces


def split_manual(
    text: str,
    doc_id: str,
    *,
    max_tokens: int = 800,
    overlap_ratio: float = 0.15,
) -> list[Chunk]:
    lines = text.split("\n", 2)
    title = lines[0]
    second_line = lines[1] if len(lines) > 1 else ""

    version_match = _VERSION_LINE_RE.match(second_line)
    if version_match is None:
        raise IngestionError(
            f"No version line found on line 2, got: {second_line!r}"
        )
    version = version_match.group(1)

    header_matches = list(_SECTION_HEADER_RE.finditer(text))

    chunks: list[Chunk] = []
    chunk_index = 0

    preamble_end = header_matches[0].start() if header_matches else len(text)
    preamble_text = text[0:preamble_end]
    chunks.append(
        _make_chunk(
            doc_id=doc_id,
            version=version,
            section_title=title.strip(),
            chunk_index=chunk_index,
            char_start=0,
            char_end=preamble_end,
            text=preamble_text,
        )
    )
    chunk_index += 1

    for i, match in enumerate(header_matches):
        start = match.start()
        end = header_matches[i + 1].start() if i + 1 < len(header_matches) else len(text)
        section_text = text[start:end]
        header_line = match.group(0)
        section_title = header_line[len("## "):].strip()
        section_token_count = _count_tokens(section_text)

        if section_token_count <= max_tokens:
            chunks.append(
                _make_chunk(
                    doc_id=doc_id,
                    version=version,
                    section_title=section_title,
                    chunk_index=chunk_index,
                    char_start=start,
                    char_end=end,
                    text=section_text,
                )
            )
            chunk_index += 1
            continue

        for piece in _split_oversized_section(
            text,
            header_line=header_line,
            body_start=match.end(),
            section_end=end,
            max_tokens=max_tokens,
            overlap_ratio=overlap_ratio,
        ):
            piece_char_start, piece_char_end, piece_text = piece
            chunks.append(
                _make_chunk(
                    doc_id=doc_id,
                    version=version,
                    section_title=section_title,
                    chunk_index=chunk_index,
                    char_start=piece_char_start,
                    char_end=piece_char_end,
                    text=piece_text,
                )
            )
            chunk_index += 1

    return chunks


def _split_oversized_section(
    text: str,
    *,
    header_line: str,
    body_start: int,
    section_end: int,
    max_tokens: int,
    overlap_ratio: float,
) -> list[tuple[int, int, str]]:
    """Cut a section body into pieces at paragraph boundaries.

    Returns (char_start, char_end, piece_text) tuples. Offsets cover each
    piece's own body span in the source; piece_text repeats the header line
    and, from the second piece on, the tail of the previous piece as overlap.
    """
    body_full = text[body_start:section_end]
    lead_match = re.match(r"\n+", body_full)
    lead_len = lead_match.end() if lead_match else 0
    body_start_abs = body_start + lead_len
    body = body_full[lead_len:]

    paragraphs = _split_paragraphs(body)
    pieces = _group_into_pieces(paragraphs, max_tokens)

    overlap_token_count = round(max_tokens * overlap_ratio)
    encoder = _get_encoder()
    prev_piece_body: str | None = None
    result: list[tuple[int, int, str]] = []

    for piece_start_local, piece_end_local in pieces:
        piece_char_start = body_start_abs + piece_start_local
        piece_char_end = body_start_abs + piece_end_local
        piece_body_text = text[piece_char_start:piece_char_end]

        if prev_piece_body is None or overlap_token_count <= 0:
            overlap_text = ""
        else:
            overlap_tokens = encoder.encode(prev_piece_body)[-overlap_token_count:]
            overlap_text = encoder.decode(overlap_tokens)

        piece_text = header_line + "\n\n" + overlap_text + piece_body_text
        result.append((piece_char_start, piece_char_end, piece_text))
        prev_piece_body = piece_body_text

    return result
