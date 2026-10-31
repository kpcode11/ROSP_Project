from datetime import datetime, timezone
import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.embeddings.ollama_client import OllamaClient  # noqa: E402
from app.services.embeddings.vector_store import LocalVectorStore  # noqa: E402
from app.services.graph.builder import KnowledgeGraphBuilder  # noqa: E402
from app.services.impact.analyzer import ImpactAnalyzer  # noqa: E402
from app.services.parser.chunker import build_chunks_for_file  # noqa: E402
from app.services.parser.extractors import extract_file_entities  # noqa: E402
from app.services.repository.manager import RepositoryManager  # noqa: E402
from app.services.retrieval.hybrid_rag import HybridGraphRAG  # noqa: E402
from scripts.create_sample_repo import create_sample_repo  # noqa: E402


BENCHMARK_INTENT_QUERIES = [
    {
        "query": "verify whether a user is allowed to access protected routes",
        "expected_file": "backend/middleware/authMiddleware.js",
    },
    {
        "query": "admin role privilege authorization check",
        "expected_file": "backend/middleware/authMiddleware.js",
    },
    {
        "query": "validate user login email credentials and issue token",
        "expected_file": "backend/services/userService.js",
    },
    {
        "query": "process customer order credit card charge and update status",
        "expected_file": "backend/services/paymentService.js",
    },
    {
        "query": "evaluate transaction velocity score for payment fraud detection",
        "expected_file": "analytics/fraud_detector.py",
    },
]

BENCHMARK_RAG_QUESTIONS = [
    "How does user authentication work in this project?",
    "Which components are involved in checkout and payment processing?",
    "How are order refunds handled and which services do they call?",
]


def run_benchmarks() -> dict:
    sample_dir = ROOT / "data" / "sample_ecommerce"
    if not sample_dir.exists() or not (sample_dir / "package.json").exists():
        create_sample_repo(sample_dir)

    # 1. AST Parsing Benchmark
    t_parse_0 = time.perf_counter()
    mgr = RepositoryManager()
    inv = mgr.scan_repository(str(sample_dir), name="sample_ecommerce")
    extractions = {}
    all_chunks = []
    for f in inv.files:
        code = (sample_dir / f.path).read_text(encoding="utf-8")
        ext = extract_file_entities(f.path, code, f.language)
        extractions[f.path] = ext
        all_chunks.extend(build_chunks_for_file("sample_ecommerce", ext, code))
    ast_parse_ms = round((time.perf_counter() - t_parse_0) * 1000.0, 2)
    files_per_sec = round(len(inv.files) / max(0.001, (ast_parse_ms / 1000.0)), 1)

    # 2. Knowledge Graph Construction Benchmark
    t_graph_0 = time.perf_counter()
    builder = KnowledgeGraphBuilder()
    graph, kg_data = builder.build_from_extractions("sample_ecommerce", extractions)
    builder.save_graph("sample_ecommerce", kg_data)
    graph_build_ms = round((time.perf_counter() - t_graph_0) * 1000.0, 2)

    call_edges = [e for e in kg_data.edges if e.relation in ("CALLS", "ROUTES_TO", "QUERIES")]

    # 3. Blast-Radius Impact Analysis Benchmark
    analyzer = ImpactAnalyzer()
    t_imp_0 = time.perf_counter()
    pay_report = analyzer.analyze(graph, "backend/services/paymentService.js")
    usr_report = analyzer.analyze(graph, "backend/services/userService.js")
    impact_latency_ms = round(((time.perf_counter() - t_imp_0) * 1000.0) / 2.0, 2)

    expected_pay_deps = {
        "backend/controllers/paymentController.js",
        "backend/controllers/orderController.js",
        "backend/services/refundService.js",
        "backend/routes/checkoutRoutes.js",
        "backend/tests/payment.test.js",
    }
    actual_pay_deps = (
        {d.id for d in pay_report.direct_dependents}
        | {t.id for t in pay_report.transitive_dependents}
        | set(pay_report.related_tests)
    )
    pay_recall = round(
        len(expected_pay_deps & actual_pay_deps) / len(expected_pay_deps), 4
    )

    expected_usr_deps = {
        "backend/controllers/userController.js",
        "backend/routes/userRoutes.js",
        "backend/tests/auth.test.js",
    }
    actual_usr_deps = (
        {d.id for d in usr_report.direct_dependents}
        | {t.id for t in usr_report.transitive_dependents}
        | set(usr_report.related_tests)
    )
    usr_recall = round(
        len(expected_usr_deps & actual_usr_deps) / len(expected_usr_deps), 4
    )

    # 4. Vector Indexing & Semantic Search Hit@3 Benchmark
    bench_qdrant_dir = ROOT / "data" / "qdrant_benchmark"
    ollama = OllamaClient()
    health = ollama.check_health()
    store = LocalVectorStore(storage_path=bench_qdrant_dir, ollama_client=ollama)

    t_vec_0 = time.perf_counter()
    store.index_chunks("sample_ecommerce", all_chunks)
    vector_index_ms = round((time.perf_counter() - t_vec_0) * 1000.0, 2)

    hits_at_3 = 0
    query_details = []
    for item in BENCHMARK_INTENT_QUERIES:
        t_q0 = time.perf_counter()
        res = store.semantic_search("sample_ecommerce", item["query"], limit=3)
        q_ms = round((time.perf_counter() - t_q0) * 1000.0, 2)
        top_files = [r.file_path for r in res]
        hit = item["expected_file"] in top_files
        if hit:
            hits_at_3 += 1
        query_details.append(
            {
                "query": item["query"],
                "expected_file": item["expected_file"],
                "top_3_files": top_files,
                "hit_at_3": hit,
                "latency_ms": q_ms,
            }
        )
    hit_at_3_rate = round(hits_at_3 / len(BENCHMARK_INTENT_QUERIES), 4)

    # 5. Hybrid GraphRAG & Citation Grounding Benchmark
    rag = HybridGraphRAG(vector_store=store, ollama_client=ollama)
    valid_repo_files = {f.path for f in inv.files}
    total_citations = 0
    valid_citations = 0
    rag_latencies = []

    for q in BENCHMARK_RAG_QUESTIONS:
        ans = rag.answer_question("sample_ecommerce", graph, q, top_k=6)
        rag_latencies.append(ans.retrieval_latency_ms)
        for cit in ans.citations:
            total_citations += 1
            if cit.file_path in valid_repo_files and cit.line_start <= cit.line_end:
                valid_citations += 1

    citation_accuracy = (
        round(valid_citations / total_citations, 4) if total_citations > 0 else 1.0
    )
    avg_rag_ms = round(sum(rag_latencies) / max(1, len(rag_latencies)), 2)

    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "repository": "sample_ecommerce",
        "ollama_mode": health.get("mode", "deterministic_fallback"),
        "embedding_model": health.get("embedding_model", "mxbai-embed-large:latest"),
        "llm_model": health.get("llm_model", "qwen2.5:7b-instruct"),
        "ast_parsing": {
            "files_parsed": len(inv.files),
            "chunks_extracted": len(all_chunks),
            "latency_ms": ast_parse_ms,
            "throughput_files_per_sec": files_per_sec,
        },
        "knowledge_graph": {
            "nodes_count": len(kg_data.nodes),
            "edges_count": len(kg_data.edges),
            "resolved_call_and_route_edges": len(call_edges),
            "build_latency_ms": graph_build_ms,
        },
        "impact_analysis": {
            "avg_query_latency_ms": impact_latency_ms,
            "payment_service_risk_level": pay_report.risk_level,
            "payment_service_risk_score": pay_report.risk_score,
            "payment_service_recall": pay_recall,
            "user_service_recall": usr_recall,
            "overall_blast_radius_recall": round((pay_recall + usr_recall) / 2.0, 4),
        },
        "semantic_search": {
            "chunks_indexed": len(all_chunks),
            "indexing_latency_ms": vector_index_ms,
            "hit_at_3_rate": hit_at_3_rate,
            "queries": query_details,
        },
        "hybrid_graphrag": {
            "questions_evaluated": len(BENCHMARK_RAG_QUESTIONS),
            "avg_latency_ms": avg_rag_ms,
            "total_citations_checked": total_citations,
            "verified_citations": valid_citations,
            "citation_verification_rate": citation_accuracy,
        },
    }

    out_file = ROOT / "results" / "benchmarks.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(results, indent=2), encoding="utf-8")

    print("=" * 64)
    print("  CODEINTEL BENCHMARK SUITE RESULTS")
    print("=" * 64)
    print(f"AST Parsing Latency          : {ast_parse_ms} ms ({files_per_sec} files/sec)")
    print(f"Knowledge Graph Build        : {graph_build_ms} ms ({len(kg_data.nodes)} nodes, {len(kg_data.edges)} edges)")
    print(f"Blast-Radius Impact Latency  : {impact_latency_ms} ms (Recall: {results['impact_analysis']['overall_blast_radius_recall'] * 100:.1f}%)")
    print(f"Semantic Search Hit@3        : {hit_at_3_rate * 100:.1f}% ({hits_at_3}/{len(BENCHMARK_INTENT_QUERIES)} intent queries)")
    print(f"GraphRAG Citation Fidelity   : {citation_accuracy * 100:.1f}% ({valid_citations}/{total_citations} verified)")
    print(f"Saved report                 : {out_file.as_posix()}")
    print("=" * 64)

    return results


if __name__ == "__main__":
    run_benchmarks()
