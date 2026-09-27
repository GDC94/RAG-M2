import io

from rich.console import Console

from rag.models import QueryResponse, RelatedChunk, Verdict
from rag.render import render_error, render_response


def _make_response(verification: Verdict | None = None) -> QueryResponse:
    return QueryResponse(
        user_question="Como configuro las vacaciones?",
        system_answer="Debes solicitarlas en el portal de RRHH.",
        status="answered",
        verification=verification,
        chunks_related=[
            RelatedChunk(
                chunk_id="alba-manual::1",
                doc_id="alba-manual",
                version="4.2",
                section_title="1. Vacaciones",
                score=0.87,
                text="Fragmento corto.",
            ),
            RelatedChunk(
                chunk_id="alba-manual::2",
                doc_id="alba-manual",
                version="4.2",
                section_title="2. Politica de ausencias",
                score=0.65,
                text=" ".join(f"palabra{i:04d}" for i in range(1, 30)),
            ),
        ],
    )


def test_render_response_contains_question_status_answer_and_sections() -> None:
    buffer = io.StringIO()
    console = Console(file=buffer, width=100, force_terminal=False, color_system=None)
    response = _make_response()

    render_response(response, console)

    output = buffer.getvalue()
    assert "Como configuro las vacaciones?" in output
    assert "Estado" in output
    assert "answered" in output
    assert "Debes solicitarlas en el portal de RRHH." in output
    assert "1. Vacaciones" in output
    assert "2. Politica de ausencias" in output


def test_render_response_truncates_long_chunk_text() -> None:
    buffer = io.StringIO()
    console = Console(file=buffer, width=100, force_terminal=False, color_system=None)
    response = _make_response()
    long_text = response.chunks_related[1].text

    render_response(response, console)

    output = buffer.getvalue()
    assert long_text[:40] in output
    assert long_text[-40:] not in output


def test_render_response_shows_verification_verdict_when_present() -> None:
    buffer = io.StringIO()
    console = Console(file=buffer, width=100, force_terminal=False, color_system=None)
    response = _make_response(
        verification=Verdict(label="unsupported", reason="cita inventada")
    )

    render_response(response, console)

    output = buffer.getvalue()
    assert "Verificación" in output
    assert "unsupported" in output
    assert "cita inventada" in output


def test_render_response_omits_verification_line_when_absent() -> None:
    buffer = io.StringIO()
    console = Console(file=buffer, width=100, force_terminal=False, color_system=None)
    response = _make_response(verification=None)

    render_response(response, console)

    output = buffer.getvalue()
    assert "Verificación" not in output


def test_render_error_contains_code_and_message() -> None:
    buffer = io.StringIO()
    console = Console(file=buffer, width=100, force_terminal=False, color_system=None)

    render_error({"error": {"code": "index_empty", "message": "The index is empty"}}, console)

    output = buffer.getvalue()
    assert "index_empty" in output
    assert "The index is empty" in output
