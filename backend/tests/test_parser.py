import pathlib
from app.services.parser.chunker import build_chunks_for_file
from app.services.parser.extractors import extract_file_entities
from app.services.repository.manager import RepositoryManager


def test_extract_python_entities():
    code = '''"""Sample Python module."""
from analytics.scorer import compute_velocity_score

class FraudEngine(BaseModel):
    """Detects suspicious orders."""
    def check_order(self, order_id: str, amount: float) -> bool:
        """Evaluates a single order."""
        score = compute_velocity_score(3, amount)
        return score > 0.8
'''
    res = extract_file_entities("analytics/engine.py", code, "python")
    assert len(res.imports) == 1
    assert res.imports[0].module == "analytics.scorer"
    assert "compute_velocity_score" in res.imports[0].symbols

    assert len(res.classes) == 1
    assert res.classes[0].name == "FraudEngine"
    assert "Detects suspicious orders." in res.classes[0].docstring

    assert len(res.functions) == 1
    fn = res.functions[0]
    assert fn.name == "check_order"
    assert fn.qualified_name == "FraudEngine.check_order"
    assert fn.is_method is True
    assert fn.parameters == ["order_id", "amount"]

    assert any(c.callee == "compute_velocity_score" and c.caller == "FraudEngine.check_order" for c in res.calls)


def test_extract_javascript_routes_and_services(sample_repo_path: pathlib.Path):
    routes_code = (sample_repo_path / "backend/routes/userRoutes.js").read_text(encoding="utf-8")
    res_routes = extract_file_entities("backend/routes/userRoutes.js", routes_code, "javascript")
    ep_names = {ep.name for ep in res_routes.api_endpoints}
    assert "POST /login" in ep_names
    assert "GET /profile" in ep_names

    svc_code = (sample_repo_path / "backend/services/userService.js").read_text(encoding="utf-8")
    res_svc = extract_file_entities("backend/services/userService.js", svc_code, "javascript")
    fn_names = {f.name for f in res_svc.functions}
    assert "authenticate" in fn_names
    assert "getUserProfile" in fn_names
    assert any(c.callee == "User.findOne" and c.caller == "authenticate" for c in res_svc.calls)

    chunks = build_chunks_for_file("sample_ecommerce", res_svc, svc_code)
    assert len(chunks) >= 2
    auth_chunk = next(c for c in chunks if c.name == "authenticate")
    assert auth_chunk.node_id == "backend/services/userService.js::authenticate"
    assert "User.findOne" in auth_chunk.context_header


def test_extract_typescript_and_java_snippets():
    ts_code = """import { Request, Response } from 'express';

export const checkHealth = (req: Request, res: Response) => {
  return res.json({ ok: true });
};
"""
    res_ts = extract_file_entities("src/health.ts", ts_code, "typescript")
    assert len(res_ts.imports) == 1
    assert any(f.name == "checkHealth" for f in res_ts.functions)

    java_code = """package com.example.order;
import org.springframework.web.bind.annotation.PostMapping;

public class OrderController {
    @PostMapping("/api/orders")
    public Response createOrder(OrderRequest req) {
        return orderService.saveOrder(req);
    }
}
"""
    res_java = extract_file_entities("src/OrderController.java", java_code, "java")
    assert len(res_java.classes) == 1
    assert res_java.classes[0].name == "OrderController"
    assert len(res_java.functions) == 1
    assert res_java.functions[0].qualified_name == "OrderController.createOrder"
    assert any(ep.name == "POST /api/orders" for ep in res_java.api_endpoints)
    assert any(c.callee == "orderService.saveOrder" for c in res_java.calls)


def test_parse_entire_sample_ecommerce_repo(sample_repo_path: pathlib.Path):
    mgr = RepositoryManager()
    inv = mgr.scan_repository(str(sample_repo_path), name="sample_ecommerce")

    all_endpoints = []
    all_models = []
    all_functions = []

    for f in inv.files:
        text = (sample_repo_path / f.path).read_text(encoding="utf-8")
        ext = extract_file_entities(f.path, text, f.language)
        all_endpoints.extend(ext.api_endpoints)
        all_models.extend(c for c in ext.classes if c.is_model)
        all_functions.extend(ext.functions)

    ep_names = {ep.name for ep in all_endpoints}
    assert {"POST /login", "GET /profile", "POST /checkout", "POST /refund"}.issubset(ep_names)
    model_names = {m.name for m in all_models}
    assert {"User", "Order"}.issubset(model_names)
    assert len(all_functions) >= 15
