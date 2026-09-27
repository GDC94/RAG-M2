from typing import Any

from rag.client import provider_call


def embed_texts(client: Any, model: str, texts: list[str]) -> list[list[float]]:
    """Embed a list of texts into vectors, preserving input order.

    Returns an empty list without calling the client when `texts` is empty.
    Otherwise calls the embeddings API exactly once and reorders the response
    by each item's `.index`, since providers are not guaranteed to return
    results in request order.
    """
    if not texts:
        return []

    with provider_call():
        response = client.embeddings.create(model=model, input=texts)
    ordered = sorted(response.data, key=lambda item: item.index)
    return [list(item.embedding) for item in ordered]
