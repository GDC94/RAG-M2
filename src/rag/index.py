import chromadb

from rag.errors import IndexEmptyError, IndexModelMismatchError
from rag.models import Chunk, RetrievedChunk


class ChunkIndex:
    def __init__(self, collection: chromadb.Collection) -> None:
        self._collection = collection

    @classmethod
    def open(cls, client: chromadb.ClientAPI, name: str, embedding_model: str) -> "ChunkIndex":
        """Open (or create) the named collection, pinned to cosine similarity.

        `get_or_create_collection` returns the existing collection with ITS
        own metadata when one already exists under `name`, which is what
        makes the embedding-model consistency check below possible.
        """
        collection = client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine", "embedding_model": embedding_model},
        )
        metadata = collection.metadata
        existing_model = metadata.get("embedding_model") if metadata is not None else None
        if existing_model is not None and existing_model != embedding_model:
            raise IndexModelMismatchError(
                f"Index was built with embedding model '{existing_model}', "
                f"but '{embedding_model}' was requested"
            )
        return cls(collection)

    def upsert(self, chunks: list[Chunk], vectors: list[list[float]]) -> None:
        if len(chunks) != len(vectors):
            raise ValueError(
                f"chunks and vectors must have the same length, "
                f"got {len(chunks)} and {len(vectors)}"
            )
        if not chunks:
            return

        self._collection.upsert(
            ids=[chunk.chunk_id for chunk in chunks],
            documents=[chunk.text for chunk in chunks],
            embeddings=vectors,
            metadatas=[
                {
                    "doc_id": chunk.doc_id,
                    "version": chunk.version,
                    "section_title": chunk.section_title,
                    "chunk_index": chunk.chunk_index,
                    "char_start": chunk.char_start,
                    "char_end": chunk.char_end,
                    "token_count": chunk.token_count,
                }
                for chunk in chunks
            ],
        )

    def count(self) -> int:
        return self._collection.count()

    def search(self, vector: list[float], top_k: int, threshold: float) -> list[RetrievedChunk]:
        total = self.count()
        if total == 0:
            raise IndexEmptyError("The index is empty; run build_index first")

        result = self._collection.query(
            query_embeddings=[vector],
            n_results=min(top_k, total),
            include=["documents", "metadatas", "distances"],
        )
        ids = result["ids"]
        documents = result["documents"]
        metadatas = result["metadatas"]
        distances = result["distances"]
        assert documents is not None
        assert metadatas is not None
        assert distances is not None

        retrieved: list[RetrievedChunk] = []
        for chunk_id, document, metadata, distance in zip(
            ids[0], documents[0], metadatas[0], distances[0]
        ):
            score = max(0.0, min(1.0, 1 - distance))
            if score < threshold:
                continue
            chunk = Chunk(
                chunk_id=chunk_id,
                doc_id=str(metadata["doc_id"]),
                version=str(metadata["version"]),
                section_title=str(metadata["section_title"]),
                chunk_index=int(metadata["chunk_index"]),
                char_start=int(metadata["char_start"]),
                char_end=int(metadata["char_end"]),
                token_count=int(metadata["token_count"]),
                text=document,
            )
            retrieved.append(RetrievedChunk(chunk=chunk, score=score))
        return retrieved
