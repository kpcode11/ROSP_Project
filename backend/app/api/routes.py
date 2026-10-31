from datetime import datetime, timezone
import json
import pathlib
from typing import Any
import networkx as nx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.config import settings
from app.db import RepositoryRecord, get_session
from app.schemas.assistant import AskQuestionRequest, AssistantResponse, SearchResultItem
from app.schemas.graph import ReactFlowGraphResponse
from app.schemas.impact import ImpactReport
from app.schemas.repository import (
    CentralModuleItem,
    FileContentResponse,
    FileRecord,
    RepositoryCreateRequest,
    RepositoryDetail,
    RepositoryStats,
    RepositorySummary,
)
from app.services.embeddings.ollama_client import OllamaClient
from app.services.embeddings.vector_store import LocalVectorStore
from app.services.graph.builder import KnowledgeGraphBuilder
from app.services.graph.queries import export_react_flow_graph
from app.services.impact.analyzer import ImpactAnalyzer
from app.services.parser.chunker import CodeChunk, build_chunks_for_file
from app.services.parser.extractors import FileExtractionResult, extract_file_entities
from app.services.repository.manager import RepositoryManager
from app.services.retrieval.hybrid_rag import HybridGraphRAG

router = APIRouter(prefix="/api", tags=["Codebase Intelligence API"])

# In-memory cache of loaded NetworkX graphs for sub-10ms query latency
_GRAPH_CACHE: dict[str, nx.DiGraph] = {}


class ImpactRequest(BaseModel):
    target_id: str


def _get_or_load_graph(repo_id: str) -> nx.DiGraph:
    if repo_id in _GRAPH_CACHE:
        return _GRAPH_CACHE[repo_id]
    builder = KnowledgeGraphBuilder()
    try:
        graph, _ = builder.load_graph(repo_id)
        _GRAPH_CACHE[repo_id] = graph
        return graph
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Knowledge graph for '{repo_id}' not found.") from exc


def ingest_repository_pipeline(source: str, name: str | None = None) -> RepositorySummary:
    mgr = RepositoryManager()
    try:
        inventory = mgr.scan_repository(source, name=name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    root_path = pathlib.Path(inventory.root_path)
    extractions: dict[str, FileExtractionResult] = {}
    all_chunks: list[CodeChunk] = []

    fn_count = 0
    cls_count = 0
    model_count = 0
    ep_count = 0
    imp_count = 0
    call_count = 0

    for file_rec in inventory.files:
        full_file = root_path / file_rec.path
        source_code = full_file.read_text(encoding="utf-8", errors="replace")
        ext = extract_file_entities(file_rec.path, source_code, file_rec.language)
        extractions[file_rec.path] = ext
        all_chunks.extend(build_chunks_for_file(inventory.repo_id, ext, source_code))

        fn_count += len(ext.functions)
        cls_count += len(ext.classes)
        model_count += sum(1 for c in ext.classes if c.is_model)
        ep_count += len(ext.api_endpoints)
        imp_count += len(ext.imports)
        call_count += len(ext.calls)

    builder = KnowledgeGraphBuilder()
    graph, kg_data = builder.build_from_extractions(inventory.repo_id, extractions)
    builder.save_graph(inventory.repo_id, kg_data)
    _GRAPH_CACHE[inventory.repo_id] = graph

    store = LocalVectorStore()
    store.index_chunks(inventory.repo_id, all_chunks)

    stats = RepositoryStats(
        files_discovered=len(inventory.files),
        files_parsed=len(extractions),
        functions_discovered=fn_count,
        classes_discovered=cls_count,
        api_endpoints_discovered=ep_count,
        models_discovered=model_count,
        imports_discovered=imp_count,
        call_relationships=call_count,
        nodes_count=len(kg_data.nodes),
        edges_count=len(kg_data.edges),
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    with get_session() as session:
        existing = session.get(RepositoryRecord, inventory.repo_id)
        files_serialized = [f.model_dump() for f in inventory.files]
        if existing:
            existing.name = inventory.name
            existing.source_type = inventory.source_type
            existing.source_path = inventory.root_path
            existing.status = "ready"
            existing.languages_json = json.dumps(inventory.languages)
            existing.frameworks_json = json.dumps(inventory.frameworks)
            existing.stats_json = json.dumps(stats.model_dump())
            existing.files_json = json.dumps(files_serialized)
            existing.updated_at = now_iso
            created_at = existing.created_at
        else:
            rec = RepositoryRecord(
                id=inventory.repo_id,
                name=inventory.name,
                source_type=inventory.source_type,
                source_path=inventory.root_path,
                status="ready",
                languages_json=json.dumps(inventory.languages),
                frameworks_json=json.dumps(inventory.frameworks),
                stats_json=json.dumps(stats.model_dump()),
                files_json=json.dumps(files_serialized),
                created_at=now_iso,
                updated_at=now_iso,
            )
            session.add(rec)
            created_at = now_iso
        session.commit()

    return RepositorySummary(
        id=inventory.repo_id,
        name=inventory.name,
        source_type=inventory.source_type,
        source_path=inventory.root_path,
        status="ready",
        languages=inventory.languages,
        frameworks=inventory.frameworks,
        stats=stats,
        created_at=created_at,
        updated_at=now_iso,
    )


@router.get("/health")
def get_health() -> dict[str, Any]:
    ollama = OllamaClient()
    ollama_status = ollama.check_health()
    return {
        "status": "ok",
        "service": "codeintel-backend",
        "ollama": ollama_status,
        "embedding_model": settings.EMBEDDING_MODEL,
        "embedding_dim": settings.EMBEDDING_DIM,
        "llm_model": settings.LLM_MODEL,
    }


@router.post("/repositories", response_model=RepositorySummary)
def create_or_analyze_repository(req: RepositoryCreateRequest) -> RepositorySummary:
    return ingest_repository_pipeline(req.source, name=req.name)


@router.get("/repositories", response_model=list[RepositorySummary])
def list_repositories() -> list[RepositorySummary]:
    with get_session() as session:
        records = session.query(RepositoryRecord).order_by(RepositoryRecord.updated_at.desc()).all()
        results: list[RepositorySummary] = []
        for r in records:
            d = r.to_dict()
            results.append(
                RepositorySummary(
                    id=d["id"],
                    name=d["name"],
                    source_type=d["source_type"],
                    source_path=d["source_path"],
                    status=d["status"],
                    languages=d["languages"],
                    frameworks=d["frameworks"],
                    stats=RepositoryStats.model_validate(d["stats"]),
                    created_at=d["created_at"],
                    updated_at=d["updated_at"],
                )
            )
        return results


@router.get("/repositories/{repo_id}", response_model=RepositoryDetail)
def get_repository_detail(repo_id: str) -> RepositoryDetail:
    with get_session() as session:
        rec = session.get(RepositoryRecord, repo_id)
        if not rec:
            raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found.")
        d = rec.to_dict()

    graph = _get_or_load_graph(repo_id)
    central_candidates: list[CentralModuleItem] = []
    for nid, ndata in graph.nodes(data=True):
        metrics = ndata.get("metrics", {})
        central_candidates.append(
            CentralModuleItem(
                id=nid,
                label=ndata.get("label", nid),
                type=ndata.get("type", "file"),
                file_path=ndata.get("file_path", ""),
                pagerank=float(metrics.get("pagerank", 0.0)),
                in_degree=int(metrics.get("in_degree", 0)),
                out_degree=int(metrics.get("out_degree", 0)),
            )
        )
    central_sorted = sorted(
        central_candidates,
        key=lambda c: (c.pagerank, c.in_degree),
        reverse=True,
    )[:12]

    langs_str = ", ".join(f"{k} ({v} files)" for k, v in d["languages"].items())
    fws_str = ", ".join(d["frameworks"]) if d["frameworks"] else "Standard Library"
    stats_obj = RepositoryStats.model_validate(d["stats"])
    arch_summary = (
        f"{d['name']} is a multi-module codebase containing {stats_obj.files_parsed} source files "
        f"({langs_str}) built with {fws_str}. Static AST analysis extracted {stats_obj.functions_discovered} "
        f"functions/methods, {stats_obj.classes_discovered} classes ({stats_obj.models_discovered} database models), "
        f"and {stats_obj.api_endpoints_discovered} API endpoints connected by {stats_obj.edges_count} dependency edges."
    )

    return RepositoryDetail(
        id=d["id"],
        name=d["name"],
        source_type=d["source_type"],
        source_path=d["source_path"],
        status=d["status"],
        languages=d["languages"],
        frameworks=d["frameworks"],
        stats=stats_obj,
        created_at=d["created_at"],
        updated_at=d["updated_at"],
        central_modules=central_sorted,
        files=[FileRecord.model_validate(f) for f in d["files"]],
        architectural_summary=arch_summary,
    )


@router.get("/repositories/{repo_id}/files/content", response_model=FileContentResponse)
def get_file_content(
    repo_id: str,
    path: str = Query(..., description="Relative POSIX path to file inside the repository"),
) -> FileContentResponse:
    with get_session() as session:
        rec = session.get(RepositoryRecord, repo_id)
        if not rec:
            raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found.")
        d = rec.to_dict()

    norm_path = path.strip().replace("\\", "/")
    file_meta = next((f for f in d["files"] if f["path"] == norm_path), None)
    if not file_meta:
        raise HTTPException(status_code=404, detail=f"File '{norm_path}' not found in repository '{repo_id}'.")

    full_path = pathlib.Path(d["source_path"]) / norm_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail=f"Source file missing on disk: {norm_path}")

    source_code = full_path.read_text(encoding="utf-8", errors="replace")
    ext = extract_file_entities(norm_path, source_code, file_meta["language"])

    symbols: list[dict[str, Any]] = []
    for ep in ext.api_endpoints:
        symbols.append(
            {
                "id": ep.name,
                "name": ep.name,
                "type": "api_endpoint",
                "line_start": ep.line_start,
                "line_end": ep.line_end,
                "signature": ep.code,
                "docstring": f"Handlers: {', '.join(ep.handlers)}",
            }
        )
    for cls in ext.classes:
        symbols.append(
            {
                "id": f"{norm_path}::{cls.name}",
                "name": cls.name,
                "type": "model" if cls.is_model else "class",
                "line_start": cls.line_start,
                "line_end": cls.line_end,
                "signature": cls.signature,
                "docstring": cls.docstring,
            }
        )
    for fn in ext.functions:
        symbols.append(
            {
                "id": f"{norm_path}::{fn.qualified_name}",
                "name": fn.qualified_name,
                "type": "method" if fn.is_method else "function",
                "line_start": fn.line_start,
                "line_end": fn.line_end,
                "signature": fn.signature,
                "docstring": fn.docstring,
            }
        )

    return FileContentResponse(
        repo_id=repo_id,
        file_path=norm_path,
        language=file_meta["language"],
        line_count=ext.line_count,
        content=source_code,
        symbols=symbols,
        imports=[
            {"module": imp.module, "symbols": imp.symbols, "line": imp.line}
            for imp in ext.imports
        ],
        calls=[
            {"caller": c.caller, "callee": c.callee, "line": c.line}
            for c in ext.calls
        ],
    )


@router.get("/repositories/{repo_id}/graph", response_model=ReactFlowGraphResponse)
def get_repository_graph(
    repo_id: str,
    node_type: str | None = Query(default=None),
    directory: str | None = Query(default=None),
    search: str | None = Query(default=None),
    focus_node_id: str | None = Query(default=None),
    hops: int = Query(default=2, ge=1, le=5),
    include_declares: bool = Query(default=False),
) -> ReactFlowGraphResponse:
    graph = _get_or_load_graph(repo_id)
    return export_react_flow_graph(
        graph=graph,
        node_type=node_type,
        directory=directory,
        search=search,
        focus_node_id=focus_node_id,
        hops=hops,
        include_declares=include_declares,
    )


@router.get("/repositories/{repo_id}/search", response_model=list[SearchResultItem])
def search_repository(
    repo_id: str,
    q: str = Query(..., min_length=1, description="Semantic or symbol search query"),
    limit: int = Query(default=8, ge=1, le=25),
) -> list[SearchResultItem]:
    _get_or_load_graph(repo_id)
    store = LocalVectorStore()
    results = store.semantic_search(repo_id=repo_id, query=q, limit=limit)

    # Boost exact symbol/filename matches if present
    q_lower = q.strip().lower()
    for item in results:
        if q_lower in item.name.lower() or q_lower in item.file_path.lower():
            item.score = round(min(1.0, item.score + 0.15), 4)
    return sorted(results, key=lambda r: r.score, reverse=True)


@router.post("/repositories/{repo_id}/ask", response_model=AssistantResponse)
def ask_repository_assistant(
    repo_id: str,
    req: AskQuestionRequest,
) -> AssistantResponse:
    graph = _get_or_load_graph(repo_id)
    store = LocalVectorStore()
    rag = HybridGraphRAG(vector_store=store)
    return rag.answer_question(
        repo_id=repo_id,
        graph=graph,
        question=req.question,
        top_k=req.top_k,
    )


@router.post("/repositories/{repo_id}/impact-analysis", response_model=ImpactReport)
def analyze_change_impact(
    repo_id: str,
    req: ImpactRequest,
) -> ImpactReport:
    graph = _get_or_load_graph(repo_id)
    analyzer = ImpactAnalyzer()
    try:
        return analyzer.analyze(graph, req.target_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
