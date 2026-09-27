from typing import Any

from pydantic import BaseModel

from rag.client import provider_call
from rag.config import Settings
from rag.errors import ConfigError, ProviderError
from rag.generation import build_user_message
from rag.models import Answer, RetrievedChunk, Verdict, VerdictLabel

VERIFIER_PROMPT = """Sos el verificador de respuestas del equipo de soporte. Recibís una
pregunta, las fuentes que se usaron (marcadas con [Fuente: título]), la
respuesta generada y su status.

Devolvé un label:
- "supported": cada afirmación de la respuesta está respaldada por las
  fuentes y el status es consistente con ellas.
- "unsupported": la respuesta incluye una afirmación, cifra, plazo o ruta
  de pantalla que no está en las fuentes.
- "incomplete": las fuentes contienen algo importante para la pregunta que
  la respuesta omite.
- "wrong_status": el status es inconsistente con la respuesta o las
  fuentes (por ejemplo, respondió pero el texto dice que el manual no lo
  cubre, o una regla de un cliente-tenant se respondió con el cupo del
  empleador en lugar de client_policy).

Devolvé también una razón breve, en una sola línea."""


class VerifierOutput(BaseModel):
    label: VerdictLabel
    reason: str


def verify(
    client: Any,
    settings: Settings,
    question: str,
    retrieved: list[RetrievedChunk],
    answer: Answer,
) -> Verdict:
    """Ask the judge model to verify a generated answer against its sources."""
    if settings.judge_model is None:
        raise ConfigError(
            "RAG_JUDGE_MODEL is required when RAG_VERIFY_ANSWER is true"
        )

    user_message = (
        f"{build_user_message(question, retrieved)}\n\n"
        f"Respuesta a verificar (status={answer.status}):\n{answer.text}"
    )

    with provider_call():
        response = client.chat.completions.parse(
            model=settings.judge_model,
            temperature=0,
            max_completion_tokens=settings.openai_max_output_tokens,
            messages=[
                {"role": "system", "content": VERIFIER_PROMPT},
                {"role": "user", "content": user_message},
            ],
            response_format=VerifierOutput,
        )
    parsed: VerifierOutput | None = response.choices[0].message.parsed
    if parsed is None:
        raise ProviderError("The judge model returned no structured verdict")

    return Verdict(label=parsed.label, reason=parsed.reason)
