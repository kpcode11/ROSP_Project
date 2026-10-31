import time
from typing import Any
import networkx as nx
from app.schemas.assistant import (
    AssistantResponse,
    CitationItem,
    ExecutionStep,
    SearchResultItem,
)
from app.services.embeddings.ollama_client import OllamaClient
from app.services.embeddings.vector_store import LocalVectorStore
from app.services.graph.queries import get_callees, get_callers

SYSTEM_PROMPT = """You are a deterministic Codebase Intelligence Assistant.
You must answer the developer's question using ONLY the provided Retrieved Code Chunks and Knowledge Graph Relationships.

STRICT RULES:
1. Never invent file paths, function names, class names, or line numbers.
2. Every architectural claim MUST reference the exact `file_path` and `line_start`-`line_end` provided in the context.
3. Trace execution flows step-by-step following the `CALLS`, `ROUTES_TO`, `IMPORTS`, and `QUERIES` edges shown in the Graph Context.
4. Respond strictly in valid JSON matching the required schema:
   {
     "answer_markdown": "Detailed explanation with inline `file_path:Lstart-Lend` references...",
     "execution_steps": [
       {"step": 1, "component": "POST /login", "file_path": "backend/routes/userRoutes.js", "description": "Receives login credentials and routes to loginUser"}
     ],
     "citations": [
       {"file_path": "backend/routes/userRoutes.js", "symbol": "POST /login", "line_start": 5, "line_end": 8, "snippet": "router.post('/login', loginUser);"}
     ]
   }
"""

RESPONSE_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "answer_markdown": {"type": "string"},
        "execution_steps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "step": {"type": "integer"},
                    "component": {"type": "string"},
                    "file_path": {"type": "string"},
                    "description": {"type": "string"},
                },
                "required": ["step", "component", "file_path", "description"],
            },
        },
        "citations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                    "symbol": {"type": "string"},
                    "line_start": {"type": "integer"},
                    "line_end": {"type": "integer"},
                    "snippet": {"type": "string"},
                },
                "required": ["file_path", "symbol", "line_start", "line_end", "snippet"],
            },
        },
    },
    "required": ["answer_markdown", "execution_steps", "citations"],
}


def sanitize_citations(
    raw_citations: list[dict[str, Any]],
    graph: nx.DiGraph,
) -> list[CitationItem]:
    """Deterministically verifies every citation against indexed repository files and line bounds."""
    valid_files: dict[str, int] = {}
    for nid, data in graph.nodes(data=True):
        fp = data.get("file_path")
        if fp:
            end_line = int(data.get("line_end", 1))
            valid_files[fp] = max(valid_files.get(fp, 1), end_line)

    verified: list[CitationItem] = []
    seen: set[tuple[str, int, int]] = set()

    for c in raw_citations:
        fp = str(c.get("file_path", "")).strip().replace("\\", "/")
        if fp not in valid_files:
            continue
        max_lines = valid_files[fp]
        lstart = max(1, min(int(c.get("line_start", 1)), max_lines))
        lend = max(lstart, min(int(c.get("line_end", lstart)), max_lines))
        key = (fp, lstart, lend)
        if key in seen:
            continue
        seen.add(key)
        verified.append(
            CitationItem(
                file_path=fp,
                symbol=str(c.get("symbol", fp.split("/")[-1])),
                line_start=lstart,
                line_end=lend,
                snippet=str(c.get("snippet", ""))[:200],
            )
        )
    return verified


class HybridGraphRAG:
    def __init__(
        self,
        vector_store: LocalVectorStore,
        ollama_client: OllamaClient | None = None,
    ) -> None:
        self.vector_store = vector_store
        self.ollama = ollama_client or vector_store.ollama

    def answer_question(
        self,
        repo_id: str,
        graph: nx.DiGraph,
        question: str,
        top_k: int = 6,
    ) -> AssistantResponse:
        t0 = time.perf_counter()

        # 1. Semantic retrieval from Qdrant
        sem_hits: list[SearchResultItem] = self.vector_store.semantic_search(
            repo_id=repo_id,
            query=question,
            limit=top_k,
        )

        # 2. Expand 1-hop graph neighborhood (callers, callees, routes, queried models)
        evidence_nodes: dict[str, dict[str, Any]] = {}
        graph_edges_text: list[str] = []

        for hit in sem_hits:
            evidence_nodes[hit.node_id] = {
                "node_id": hit.node_id,
                "file_path": hit.file_path,
                "line_start": hit.line_start,
                "line_end": hit.line_end,
                "type": hit.node_type,
                "signature": hit.signature,
                "code": hit.code,
            }
            for caller in get_callers(graph, hit.node_id):
                cid = caller["id"]
                graph_edges_text.append(f"{cid} --[{caller['relation']}]--> {hit.node_id}")
                if cid in graph and cid not in evidence_nodes:
                    ndata = graph.nodes[cid]
                    evidence_nodes[cid] = {
                        "node_id": cid,
                        "file_path": ndata.get("file_path", ""),
                        "line_start": ndata.get("line_start", 1),
                        "line_end": ndata.get("line_end", 1),
                        "type": ndata.get("type", "function"),
                        "signature": ndata.get("signature", cid),
                        "code": ndata.get("signature", cid),
                    }
            for callee in get_callees(graph, hit.node_id):
                tid = callee["id"]
                graph_edges_text.append(f"{hit.node_id} --[{callee['relation']}]--> {tid}")
                if tid in graph and tid not in evidence_nodes:
                    ndata = graph.nodes[tid]
                    evidence_nodes[tid] = {
                        "node_id": tid,
                        "file_path": ndata.get("file_path", ""),
                        "line_start": ndata.get("line_start", 1),
                        "line_end": ndata.get("line_end", 1),
                        "type": ndata.get("type", "function"),
                        "signature": ndata.get("signature", tid),
                        "code": ndata.get("signature", tid),
                    }

        # 3. Construct bounded grounded prompt
        evidence_blocks: list[str] = []
        for idx, (nid, ev) in enumerate(list(evidence_nodes.items())[:12], start=1):
            evidence_blocks.append(
                f"[E{idx}] Node: {nid} | File: {ev['file_path']} | Lines: {ev['line_start']}-{ev['line_end']} "
                f"| Type: {ev['type']} | Signature: {ev['signature']}\nCode:\n{ev['code']}"
            )

        unique_edges = list(dict.fromkeys(graph_edges_text))[:25]
        user_prompt = (
            f"Developer Question: {question}\n\n"
            f"=== RETRIEVED CODE EVIDENCE ===\n"
            + "\n\n".join(evidence_blocks)
            + "\n\n=== GRAPH RELATIONSHIPS ===\n"
            + ("\n".join(unique_edges) if unique_edges else "None")
        )

        # 4. Query LLM (or deterministic grounded synthesizer)
        raw_result, model_used = self.ollama.generate_structured_answer(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            json_schema=RESPONSE_JSON_SCHEMA,
        )

        # 5. Sanitize citations against repository graph
        verified_citations = sanitize_citations(
            raw_result.get("citations", []),
            graph,
        )
        if not verified_citations and sem_hits:
            fallback_raw = [
                {
                    "file_path": h.file_path,
                    "symbol": h.name,
                    "line_start": h.line_start,
                    "line_end": h.line_end,
                    "snippet": h.signature,
                }
                for h in sem_hits[:4]
            ]
            verified_citations = sanitize_citations(fallback_raw, graph)

        valid_file_set = {
            data.get("file_path")
            for _, data in graph.nodes(data=True)
            if data.get("file_path")
        }
        steps: list[ExecutionStep] = []
        for idx, st in enumerate(raw_result.get("execution_steps", []), start=1):
            fp = str(st.get("file_path", "")).strip().replace("\\", "/")
            if fp in valid_file_set:
                steps.append(
                    ExecutionStep(
                        step=idx,
                        component=str(st.get("component", "")),
                        file_path=fp,
                        description=str(st.get("description", "")),
                    )
                )

        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)

        return AssistantResponse(
            question=question,
            answer_markdown=str(raw_result.get("answer_markdown", "")),
            execution_steps=steps,
            citations=verified_citations,
            related_nodes=list(evidence_nodes.keys())[:10],
            model_used=model_used,
            retrieval_latency_ms=elapsed_ms,
        )
