import pathlib
from app.services.graph.builder import KnowledgeGraphBuilder
from app.services.graph.queries import (
    export_react_flow_graph,
    get_callees,
    get_callers,
    get_execution_path,
    get_file_dependencies,
)
from app.services.parser.extractors import extract_file_entities
from app.services.repository.manager import RepositoryManager


def _build_sample_graph(sample_repo_path: pathlib.Path):
    mgr = RepositoryManager()
    inv = mgr.scan_repository(str(sample_repo_path), name="sample_ecommerce")
    extractions = {}
    for f in inv.files:
        code = (sample_repo_path / f.path).read_text(encoding="utf-8")
        extractions[f.path] = extract_file_entities(f.path, code, f.language)
    builder = KnowledgeGraphBuilder()
    return builder.build_from_extractions("sample_ecommerce", extractions)


def test_login_execution_chain_in_graph(sample_repo_path: pathlib.Path):
    graph, kg_data = _build_sample_graph(sample_repo_path)

    assert len(kg_data.nodes) >= 35
    assert len(kg_data.edges) >= 40

    path = get_execution_path(graph, "POST /login", "User")
    assert path == [
        "POST /login",
        "backend/controllers/userController.js::loginUser",
        "backend/services/userService.js::authenticate",
        "backend/models/User.js::User",
    ]

    callers_of_auth = get_callers(graph, "authenticate")
    caller_ids = {c["id"] for c in callers_of_auth}
    assert "backend/controllers/userController.js::loginUser" in caller_ids

    callees_of_auth = get_callees(graph, "authenticate")
    callee_ids = {c["id"] for c in callees_of_auth}
    assert "backend/models/User.js::User" in callee_ids
    assert "backend/models/User.js::User.findOne" in callee_ids


def test_python_cross_file_resolution(sample_repo_path: pathlib.Path):
    graph, _ = _build_sample_graph(sample_repo_path)
    callees = get_callees(graph, "FraudDetector.evaluate_transaction")
    callee_ids = {c["id"] for c in callees}
    assert "analytics/scorer.py::compute_velocity_score" in callee_ids
    assert "analytics/scorer.py::normalize_score" in callee_ids


def test_file_dependencies_and_react_flow_export(sample_repo_path: pathlib.Path):
    graph, _ = _build_sample_graph(sample_repo_path)
    deps = get_file_dependencies(graph, "backend/services/paymentService.js")
    imported_by = set(deps["backend/services/paymentService.js"]["imported_by"])
    assert "backend/controllers/paymentController.js" in imported_by
    assert "backend/controllers/orderController.js" in imported_by
    assert "backend/services/refundService.js" in imported_by

    rf = export_react_flow_graph(graph, focus_node_id="POST /login", hops=2)
    assert len(rf.nodes) >= 3
    assert len(rf.edges) >= 2
