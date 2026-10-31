import atexit
import pathlib
from typing import Any
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)
from app.config import settings
from app.schemas.assistant import SearchResultItem
from app.services.embeddings.ollama_client import OllamaClient
from app.services.parser.chunker import CodeChunk

COLLECTION_NAME = "code_chunks"
_CLIENT_CACHE: dict[str, QdrantClient] = {}


def _close_cached_clients() -> None:
    for client in list(_CLIENT_CACHE.values()):
        try:
            client.close()
        except Exception:
            pass
    _CLIENT_CACHE.clear()


atexit.register(_close_cached_clients)


def get_qdrant_client(storage_path: pathlib.Path | None = None) -> QdrantClient:
    target = (storage_path or settings.qdrant_dir).resolve()
    target.mkdir(parents=True, exist_ok=True)
    key = str(target)
    if key not in _CLIENT_CACHE:
        try:
            _CLIENT_CACHE[key] = QdrantClient(path=key)
        except RuntimeError:
            # Fallback to in-memory store when another process (e.g. live uvicorn server) holds .lock
            _CLIENT_CACHE[key] = QdrantClient(":memory:")
    return _CLIENT_CACHE[key]


class LocalVectorStore:
    def __init__(
        self,
        storage_path: pathlib.Path | None = None,
        ollama_client: OllamaClient | None = None,
    ) -> None:
        self.client = get_qdrant_client(storage_path)
        self.ollama = ollama_client or OllamaClient()
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        collections = [c.name for c in self.client.get_collections().collections]
        if COLLECTION_NAME not in collections:
            self.client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=settings.EMBEDDING_DIM,
                    distance=Distance.COSINE,
                ),
            )

    def _get_existing_hashes(self, repo_id: str) -> dict[str, str]:
        hashes: dict[str, str] = {}
        try:
            records, _ = self.client.scroll(
                collection_name=COLLECTION_NAME,
                scroll_filter=Filter(
                    must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
                ),
                limit=2000,
                with_payload=True,
                with_vectors=False,
            )
            for rec in records:
                payload = rec.payload or {}
                cid = str(rec.id)
                sha = payload.get("sha256", "")
                if cid and sha:
                    hashes[cid] = sha
        except Exception:
            pass
        return hashes

    def index_chunks(self, repo_id: str, chunks: list[CodeChunk]) -> int:
        if not chunks:
            return 0
        existing_hashes = self._get_existing_hashes(repo_id)
        to_embed: list[CodeChunk] = [
            c for c in chunks if existing_hashes.get(c.chunk_id) != c.sha256
        ]
        if not to_embed:
            return 0

        texts = [c.embedding_text for c in to_embed]
        vectors = self.ollama.embed_texts(texts)

        points: list[PointStruct] = []
        for chunk, vec in zip(to_embed, vectors):
            points.append(
                PointStruct(
                    id=chunk.chunk_id,
                    vector=vec,
                    payload=chunk.model_dump(),
                )
            )

        self.client.upsert(collection_name=COLLECTION_NAME, points=points)
        return len(points)

    def semantic_search(
        self,
        repo_id: str,
        query: str,
        limit: int = 6,
    ) -> list[SearchResultItem]:
        query_vecs = self.ollama.embed_texts([query])
        if not query_vecs:
            return []
        return self.semantic_search_by_vector(repo_id, query_vecs[0], limit=limit)

    def semantic_search_by_vector(
        self,
        repo_id: str,
        query_vector: list[float],
        limit: int = 6,
    ) -> list[SearchResultItem]:
        q_filter = Filter(
            must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
        )
        res = self.client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            query_filter=q_filter,
            limit=limit,
            with_payload=True,
        )
        items: list[SearchResultItem] = []
        for pt in res.points:
            payload: dict[str, Any] = pt.payload or {}
            items.append(
                SearchResultItem(
                    chunk_id=str(pt.id),
                    node_id=payload.get("node_id", ""),
                    node_type=payload.get("node_type", "function"),
                    name=payload.get("name", ""),
                    file_path=payload.get("file_path", ""),
                    language=payload.get("language", ""),
                    line_start=int(payload.get("line_start", 1)),
                    line_end=int(payload.get("line_end", 1)),
                    signature=payload.get("signature", ""),
                    docstring=payload.get("docstring", ""),
                    code=payload.get("code", ""),
                    context_header=payload.get("context_header", ""),
                    score=round(float(pt.score), 4),
                )
            )
        return items
