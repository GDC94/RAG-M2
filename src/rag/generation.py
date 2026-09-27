from typing import Any

from pydantic import BaseModel

from rag.config import Settings
from rag.errors import ProviderError
from rag.models import Answer, AnswerStatus, RetrievedChunk

SYSTEM_PROMPT = """Sos el asistente del equipo de soporte. Respondés preguntas usando
únicamente las fuentes que recibís en el mensaje. Cada fuente empieza
con [Fuente: <título de la sección>].

Reglas:
1. Usá solo lo que dicen las fuentes. Si la respuesta no está en ellas,
   no la completes con suposiciones.
2. Citá el título de la sección de cada fuente que uses.
3. No inventes cifras, plazos ni rutas de pantalla. Si un dato no está,
   decilo.
4. Los cupos, plazos y días que las fuentes atribuyen a la plantilla de
   la empresa como empleador no valen para el tenant de un cliente. Si la
   pregunta es sobre la política de un cliente, indicá que la define su
   Administración de Personas y dónde se carga.
5. Respondé en el idioma de la pregunta, de forma breve y concreta.

Devolvé:
- status: "answered" si respondiste con las fuentes;
  "client_policy" si la pregunta es sobre la regla de un cliente;
  "not_in_manual" si las fuentes no alcanzan para responder.
- text: la respuesta, o una frase que diga qué falta.
- sources: solo los títulos de las secciones que usaste."""

NOT_IN_MANUAL_TEXT = (
    "El manual no cubre esta consulta. Registrá la pregunta y escalá según la "
    "sección 38 (People, Legal o Producto según el caso)."
)
CLIENT_POLICY_TEXT = (
    "Esa regla la define la Administración de Personas del cliente en su propio "
    "tenant. El manual de Alba no fija ese valor para clientes; indicá dónde se "
    "carga y no inventes el cupo."
)


class GroundedAnswer(BaseModel):
    """Structured-output schema sent to the model for grounded generation."""

    status: AnswerStatus
    text: str
    sources: list[str] = []


def build_user_message(question: str, retrieved: list[RetrievedChunk]) -> str:
    """Build the user message: the question followed by the labeled sources."""
    blocks = "\n\n".join(
        f"[Fuente: {item.chunk.section_title}]\n{item.chunk.text}" for item in retrieved
    )
    return f"{question}\n\nFuentes:\n\n{blocks}"


def generate(
    client: Any,
    settings: Settings,
    question: str,
    retrieved: list[RetrievedChunk],
) -> Answer:
    """Generate a grounded answer, or abstain without calling the model."""
    if not retrieved:
        return Answer(status="not_in_manual", text=NOT_IN_MANUAL_TEXT, sources=[])

    response = client.chat.completions.parse(
        model=settings.openai_model,
        temperature=0,
        max_completion_tokens=settings.openai_max_output_tokens,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_message(question, retrieved)},
        ],
        response_format=GroundedAnswer,
    )
    parsed: GroundedAnswer | None = response.choices[0].message.parsed
    if parsed is None:
        raise ProviderError("The model returned no structured answer")

    known_titles = {item.chunk.section_title for item in retrieved}
    seen: set[str] = set()
    filtered_sources: list[str] = []
    for source in parsed.sources:
        if source in known_titles and source not in seen:
            seen.add(source)
            filtered_sources.append(source)

    if parsed.status == "not_in_manual":
        return Answer(status="not_in_manual", text=NOT_IN_MANUAL_TEXT, sources=[])
    if parsed.status == "client_policy":
        return Answer(status="client_policy", text=CLIENT_POLICY_TEXT, sources=filtered_sources)

    return Answer(status=parsed.status, text=parsed.text, sources=filtered_sources)
