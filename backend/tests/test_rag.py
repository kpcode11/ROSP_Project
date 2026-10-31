import pathlib
import pytest
from app.services.embeddings.ollama_client import OllamaClient
from app.services.embeddings.vector_store import LocalVectorStore
from app.services.graph.builder import KnowledgeGraphBuilder
from app.services.parser.chunker import build_chunks_for_file
from app.services.parser.extractors import extract_file_entities
from app.services.repository.manager import RepositoryManager
from app.services.retrieval.hybrid_rag import HybridGraphRAG, sanitize_citations


@pytest.fixture
def indexed_sample_env(sample_repo_path: pathlib.Path, tmp_path: pathlib.Path):
    mgr = RepositoryManager()
    inv = mgr.scan_repository(str(sample_repo_path), name="sample_ecommerce")
    extractions = {}
    all_chunks = []
    for f in inv.files:
        code = (sample_repo_path / f.path).read_text(encoding="utf-8")
        ext = extract_file_entities(f.path, code, f.language)
        extractions[f.path] = ext
        all_chunks.extend(build_chunks_for_file("sample_ecommerce", ext, code))

    builder = KnowledgeGraphBuilder()
    graph, _ = builder.build_from_extractions("sample_ecommerce", extractions)

    ollama = OllamaClient(use_mock=True)
    store = LocalVectorStore(storage_path=tmp_path / "qdrant_test", ollama_client=ollama)
    return graph, all_chunks, store, ollama


def test_semantic_search_finds_auth_middleware(indexed_sample_env):
    _, all_chunks, store, _ = indexed_sample_env
    count = store.index_chunks("sample_ecommerce", all_chunks)
    assert count == len(all_chunks)

    # Incremental re-indexing should skip unchanged chunks
    count_second = store.index_chunks("sample_ecommerce", all_chunks)
    assert count_second == 0

    results = store.semantic_search(
        "sample_ecommerce",
        "verify whether a user is allowed to access protected routes",
        limit=3,
    )
    assert len(results) == 3
    top_files = [r.file_path for r in results]
    assert "backend/middleware/authMiddleware.js" in top_files

    admin_results = store.semantic_search(
        "sample_ecommerce",
        "admin role privilege check",
        limit=3,
    )
    assert any(r.file_path == "backend/middleware/authMiddleware.js" for r in admin_results)


def test_hybrid_graphrag_authentication_question_and_citations(indexed_sample_env):
    graph, all_chunks, store, ollama = indexed_sample_env
    store.index_chunks("sample_ecommerce", all_chunks)

    rag = HybridGraphRAG(vector_store=store, ollama_client=ollama)
    resp = rag.answer_question(
        repo_id="sample_ecommerce",
        graph=graph,
        question="How does user authentication work?",
        top_k=6,
    )

    assert resp.answer_markdown
    cited_files = {c.file_path for c in resp.citations}
    assert "backend/routes/userRoutes.js" in cited_files
    assert "backend/controllers/userController.js" in cited_files
    assert "backend/services/userService.js" in cited_files
    assert "backend/models/User.js" in cited_files


def test_citation_sanitizer_strips_hallucinated_paths(indexed_sample_env):
    graph, _, _, _ = indexed_sample_env
    raw = [
        {
            "file_path": "backend/services/userService.js",
            "symbol": "authenticate",
            "line_start": 6,
            "line_end": 18,
            "snippet": "async function authenticate(credentials)",
        },
        {
            "file_path": "backend/fake/hallucinatedFile.js",
            "symbol": "magicLogin",
            "line_start": 1,
            "line_end": 50,
            "snippet": "function magicLogin() {}",
        },
    ]
    cleaned = sanitize_citations(raw, graph)
    assert len(cleaned) == 1
    assert cleaned[0].file_path == "backend/services/userService.js"
