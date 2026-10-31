import os
import socket
from app.api.routes import (
    ImpactRequest,
    analyze_change_impact,
    ask_repository_assistant,
    create_or_analyze_repository,
    get_file_content,
    get_health,
    get_repository_detail,
    get_repository_graph,
    list_repositories,
    search_repository,
)
from app.main import app, ensure_sample_repo_seeded
from app.schemas.assistant import AskQuestionRequest
from app.schemas.repository import RepositoryCreateRequest

os.environ["USE_MOCK_AI"] = "true"


def _loopback_sockets_available() -> bool:
    try:
        s1, s2 = socket.socketpair()
        s1.close()
        s2.close()
        return True
    except Exception:
        return False


def test_full_rest_api_contract():
    # Ensure startup seed runs
    ensure_sample_repo_seeded()

    # Verify all 9 routes are registered on the FastAPI app OpenAPI spec
    registered_paths = set(app.openapi().get("paths", {}).keys())
    expected_paths = {
        "/api/health",
        "/api/repositories",
        "/api/repositories/{repo_id}",
        "/api/repositories/{repo_id}/files/content",
        "/api/repositories/{repo_id}/graph",
        "/api/repositories/{repo_id}/search",
        "/api/repositories/{repo_id}/ask",
        "/api/repositories/{repo_id}/impact-analysis",
    }
    assert expected_paths.issubset(registered_paths)

    # 1. GET /api/health
    hdata = get_health()
    assert hdata["status"] == "ok"
    assert hdata["embedding_model"] == "mxbai-embed-large:latest"
    assert hdata["llm_model"] == "qwen2.5:7b-instruct"

    # 2. GET /api/repositories (auto-seeded sample_ecommerce)
    repos = list_repositories()
    assert len(repos) >= 1
    assert any(r.id == "sample_ecommerce" for r in repos)

    # 3. POST /api/repositories
    created = create_or_analyze_repository(
        RepositoryCreateRequest(source="sample_ecommerce", name="sample_ecommerce")
    )
    assert created.id == "sample_ecommerce"
    assert created.stats.files_parsed == 15

    # 4. GET /api/repositories/{id}
    detail = get_repository_detail("sample_ecommerce")
    assert detail.id == "sample_ecommerce"
    assert len(detail.central_modules) > 0
    assert len(detail.files) == 15
    assert detail.architectural_summary != ""

    # 5. GET /api/repositories/{id}/files/content
    fdata = get_file_content("sample_ecommerce", path="backend/services/userService.js")
    assert fdata.language == "javascript"
    assert any(s["name"] == "authenticate" for s in fdata.symbols)

    # 6. GET /api/repositories/{id}/graph
    gdata = get_repository_graph(
        "sample_ecommerce",
        node_type=None,
        directory=None,
        search=None,
        focus_node_id=None,
        hops=2,
        include_declares=False,
    )
    assert len(gdata.nodes) >= 30
    assert len(gdata.edges) >= 20

    # 7. GET /api/repositories/{id}/search
    sdata = search_repository(
        "sample_ecommerce",
        q="verify whether a user is allowed to access protected routes",
        limit=5,
    )
    assert len(sdata) >= 1
    assert any("authMiddleware.js" in item.file_path for item in sdata)

    # 8. POST /api/repositories/{id}/ask
    adata = ask_repository_assistant(
        "sample_ecommerce",
        AskQuestionRequest(question="How does user authentication work?", top_k=6),
    )
    assert adata.answer_markdown != ""
    assert len(adata.citations) >= 3

    # 9. POST /api/repositories/{id}/impact-analysis
    idata = analyze_change_impact(
        "sample_ecommerce",
        ImpactRequest(target_id="backend/services/paymentService.js"),
    )
    assert idata.risk_level == "High"
    assert "POST /checkout" in idata.affected_api_endpoints
    assert "backend/tests/payment.test.js" in idata.related_tests
