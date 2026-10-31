import argparse
import json
import pathlib
import sys
import time
from app.services.graph.builder import KnowledgeGraphBuilder
from app.services.graph.queries import get_file_dependencies
from app.services.parser.extractors import FileExtractionResult, extract_file_entities
from app.services.repository.manager import RepositoryManager


def run_cli_analyze(repo_path: str, output_dir: pathlib.Path) -> dict:
    t0 = time.perf_counter()
    mgr = RepositoryManager()
    inventory = mgr.scan_repository(repo_path)
    root_path = pathlib.Path(inventory.root_path)

    extractions: dict[str, FileExtractionResult] = {}
    functions_count = 0
    classes_count = 0
    models_count = 0
    endpoints_count = 0
    imports_count = 0
    calls_count = 0

    for file_rec in inventory.files:
        full_file = root_path / file_rec.path
        source_code = full_file.read_text(encoding="utf-8", errors="replace")
        ext = extract_file_entities(file_rec.path, source_code, file_rec.language)
        extractions[file_rec.path] = ext
        functions_count += len(ext.functions)
        classes_count += len(ext.classes)
        models_count += sum(1 for c in ext.classes if c.is_model)
        endpoints_count += len(ext.api_endpoints)
        imports_count += len(ext.imports)
        calls_count += len(ext.calls)

    builder = KnowledgeGraphBuilder()
    graph, kg_data = builder.build_from_extractions(inventory.repo_id, extractions)
    builder.save_graph(inventory.repo_id, kg_data)

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    output_dir.mkdir(parents=True, exist_ok=True)
    graph_out = output_dir / "graph.json"
    report_out = output_dir / "analysis_report.json"
    deps_out = output_dir / "dependencies.json"

    graph_out.write_text(json.dumps(kg_data.model_dump(), indent=2), encoding="utf-8")

    file_deps = get_file_dependencies(graph)
    deps_out.write_text(json.dumps(file_deps, indent=2), encoding="utf-8")

    top_nodes = sorted(
        kg_data.nodes,
        key=lambda n: n.metrics.pagerank,
        reverse=True,
    )[:10]

    report = {
        "repo_id": inventory.repo_id,
        "name": inventory.name,
        "root_path": inventory.root_path,
        "elapsed_ms": elapsed_ms,
        "languages": inventory.languages,
        "frameworks": inventory.frameworks,
        "stats": {
            "files_discovered": len(inventory.files),
            "files_parsed": len(extractions),
            "functions_discovered": functions_count,
            "classes_discovered": classes_count,
            "models_discovered": models_count,
            "api_endpoints_discovered": endpoints_count,
            "imports_discovered": imports_count,
            "call_relationships": calls_count,
            "nodes_count": len(kg_data.nodes),
            "edges_count": len(kg_data.edges),
        },
        "top_central_nodes": [
            {
                "id": n.id,
                "label": n.label,
                "type": n.type,
                "file_path": n.file_path,
                "pagerank": n.metrics.pagerank,
            }
            for n in top_nodes
        ],
    }
    report_out.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("=" * 60)
    print("  CODEBASE INTELLIGENCE ANALYZER")
    print("=" * 60)
    print(f"Repository        : {inventory.name} ({inventory.repo_id})")
    print(f"Languages         : {inventory.languages}")
    print(f"Frameworks        : {', '.join(inventory.frameworks) or 'None'}")
    print("-" * 60)
    print(f"Files discovered  : {len(inventory.files)}")
    print(f"Files parsed      : {len(extractions)}")
    print(f"Functions/Methods : {functions_count}")
    print(f"Classes & Models  : {classes_count} ({models_count} models)")
    print(f"API Endpoints     : {endpoints_count}")
    print(f"Imports discovered: {imports_count}")
    print(f"Call relationships: {calls_count}")
    print(f"Knowledge Graph   : {len(kg_data.nodes)} nodes, {len(kg_data.edges)} edges")
    print(f"Analysis Latency  : {elapsed_ms} ms")
    print("-" * 60)
    print(f"Written artifacts : {graph_out.as_posix()}, {report_out.as_posix()}, {deps_out.as_posix()}")
    print("=" * 60)

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Codebase Intelligence Platform CLI")
    subparsers = parser.add_subparsers(dest="command")

    analyze_parser = subparsers.add_parser("analyze", help="Analyze a repository into an AST Knowledge Graph")
    analyze_parser.add_argument("repo_path", help="Local path or URL to repository")
    analyze_parser.add_argument(
        "--output-dir",
        default="./data/cli_out",
        help="Directory to write graph.json, analysis_report.json, and dependencies.json",
    )

    args = parser.parse_args()
    if args.command == "analyze":
        run_cli_analyze(args.repo_path, pathlib.Path(args.output_dir))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
