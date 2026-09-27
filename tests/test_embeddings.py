from rag.embeddings import embed_texts

from tests.conftest import FakeEmbeddingsClient


def test_embed_texts_returns_vectors_in_input_order(
    fake_embeddings_client: FakeEmbeddingsClient,
) -> None:
    vectors = embed_texts(fake_embeddings_client, "text-embedding-3-small", ["a", "b"])

    assert len(vectors) == 2
    assert vectors[0] != vectors[1]
    assert fake_embeddings_client.calls == 1
    assert fake_embeddings_client.last_model == "text-embedding-3-small"
    assert fake_embeddings_client.last_input == ["a", "b"]


def test_embed_texts_with_empty_list_skips_the_client(
    fake_embeddings_client: FakeEmbeddingsClient,
) -> None:
    vectors = embed_texts(fake_embeddings_client, "text-embedding-3-small", [])

    assert vectors == []
    assert fake_embeddings_client.calls == 0
