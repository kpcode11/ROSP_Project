import pathlib
from app.cli import run_cli_analyze
from app.services.impact.analyzer import ImpactAnalyzer
from tests.test_graph import _build_sample_graph


def test_payment_service_blast_radius_and_risk_score(sample_repo_path: pathlib.Path):
    graph, _ = _build_sample_graph(sample_repo_path)
    analyzer = ImpactAnalyzer()
    report = analyzer.analyze(graph, "backend/services/paymentService.js")

    assert report.target_node_id == "backend/services/paymentService.js"
    assert report.risk_level == "High"
    assert report.risk_score >= 60.0

    direct_ids = {d.id for d in report.direct_dependents}
    transitive_ids = {t.id for t in report.transitive_dependents}
    all_impacted_ids = direct_ids | transitive_ids

    assert "backend/controllers/paymentController.js" in all_impacted_ids
    assert "backend/controllers/orderController.js" in all_impacted_ids
    assert "backend/services/refundService.js" in all_impacted_ids
    assert "backend/routes/checkoutRoutes.js" in all_impacted_ids

    assert "POST /checkout" in report.affected_api_endpoints
    assert "POST /refund" in report.affected_api_endpoints
    assert "backend/tests/payment.test.js" in report.related_tests
    assert len(report.subgraph.nodes) >= 5


def test_missing_test_coverage_penalty(sample_repo_path: pathlib.Path):
    graph, _ = _build_sample_graph(sample_repo_path)
    analyzer = ImpactAnalyzer()
    report = analyzer.analyze(graph, "analytics/scorer.py::compute_velocity_score")

    assert report.related_tests == []
    assert report.score_breakdown["test_coverage_penalty"] == 20.0


def test_cli_analyze_outputs_json_artifacts(sample_repo_path: pathlib.Path, tmp_path: pathlib.Path):
    report = run_cli_analyze(str(sample_repo_path), tmp_path)
    assert report["stats"]["files_parsed"] == 15
    assert (tmp_path / "graph.json").exists()
    assert (tmp_path / "analysis_report.json").exists()
    assert (tmp_path / "dependencies.json").exists()

