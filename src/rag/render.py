"""Presentation-only rendering helpers for the query CLI (no business logic)."""

from typing import Any

from rich.console import Console
from rich.markup import escape
from rich.panel import Panel
from rich.table import Table

from rag.models import QueryResponse

STATUS_STYLES: dict[str, str] = {
    "answered": "green",
    "client_policy": "yellow",
    "not_in_manual": "red",
}

VERDICT_STYLES: dict[str, str] = {
    "supported": "green",
    "incomplete": "yellow",
    "unsupported": "red",
    "wrong_status": "red",
}


def render_response(response: QueryResponse, console: Console) -> None:
    status_style = STATUS_STYLES.get(response.status, "white")
    # User-provided text is escaped so square brackets are never read as markup.
    lines = [
        escape(response.user_question),
        f"Estado: [{status_style}]{response.status}[/{status_style}]",
    ]
    if response.verification is not None:
        verdict_style = VERDICT_STYLES.get(response.verification.label, "white")
        lines.append(
            f"Verificación: [{verdict_style}]{response.verification.label}"
            f"[/{verdict_style}] — {escape(response.verification.reason)}"
        )
    question_panel = Panel("\n".join(lines), title="Pregunta")
    console.print(question_panel)

    answer_panel = Panel(escape(response.system_answer), title="Respuesta")
    console.print(answer_panel)

    if not response.chunks_related:
        console.print("[dim]Sin fuentes sobre el umbral[/dim]")
        return

    table = Table(title="Fuentes")
    table.add_column("Sección")
    table.add_column("Score")
    table.add_column("Fragmento")
    for chunk in response.chunks_related:
        fragment = chunk.text[:160]
        if len(chunk.text) > 160:
            fragment = fragment + "…"
        table.add_row(escape(chunk.section_title), f"{chunk.score:.2f}", escape(fragment))
    console.print(table)


def render_error(error: dict[str, Any], console: Console) -> None:
    payload = error["error"]
    console.print(
        Panel(escape(f"{payload['code']}: {payload['message']}"), title="Error", style="red")
    )
