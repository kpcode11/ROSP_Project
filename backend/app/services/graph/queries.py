from typing import Any
import networkx as nx
from app.schemas.graph import ReactFlowEdge, ReactFlowGraphResponse, ReactFlowNode


def resolve_node_identifier(graph: nx.DiGraph, identifier: str) -> str | None:
    """Resolves either an exact node ID (e.g. 'backend/services/userService.js::authenticate')
    or a short label/suffix (e.g. 'authenticate', 'loginUser', 'User', 'POST /login').
    """
    if identifier in graph:
        return identifier
    for node_id, data in graph.nodes(data=True):
        if data.get("label") == identifier or node_id.endswith(f"::{identifier}"):
            return node_id
    return None


def get_callers(graph: nx.DiGraph, node_id: str) -> list[dict[str, Any]]:
    resolved = resolve_node_identifier(graph, node_id)
    if not resolved:
        return []
    callers = []
    for pred in graph.predecessors(resolved):
        edge_data = graph.get_edge_data(pred, resolved) or {}
        rel = edge_data.get("relation", "")
        if rel in ("CALLS", "ROUTES_TO", "QUERIES", "IMPORTS"):
            node_data = graph.nodes[pred]
            callers.append(
                {
                    "id": pred,
                    "label": node_data.get("label", pred),
                    "type": node_data.get("type", "unknown"),
                    "file_path": node_data.get("file_path", ""),
                    "relation": rel,
                    "line": edge_data.get("line", 1),
                }
            )
    return callers


def get_callees(graph: nx.DiGraph, node_id: str) -> list[dict[str, Any]]:
    resolved = resolve_node_identifier(graph, node_id)
    if not resolved:
        return []
    callees = []
    for succ in graph.successors(resolved):
        edge_data = graph.get_edge_data(resolved, succ) or {}
        rel = edge_data.get("relation", "")
        if rel in ("CALLS", "ROUTES_TO", "QUERIES", "IMPORTS"):
            node_data = graph.nodes[succ]
            callees.append(
                {
                    "id": succ,
                    "label": node_data.get("label", succ),
                    "type": node_data.get("type", "unknown"),
                    "file_path": node_data.get("file_path", ""),
                    "relation": rel,
                    "line": edge_data.get("line", 1),
                }
            )
    return callees


def get_execution_path(graph: nx.DiGraph, source_id: str, target_id: str) -> list[str]:
    src = resolve_node_identifier(graph, source_id)
    dst = resolve_node_identifier(graph, target_id)
    if not src or not dst:
        return []
    # Build call/route/query flow subgraph
    flow_edges = [
        (u, v)
        for u, v, d in graph.edges(data=True)
        if d.get("relation") in ("ROUTES_TO", "CALLS", "QUERIES", "IMPORTS")
    ]
    flow_graph = nx.DiGraph(flow_edges)
    try:
        return list(nx.shortest_path(flow_graph, src, dst))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return []


def get_file_dependencies(graph: nx.DiGraph, file_path: str | None = None) -> dict[str, dict[str, list[str]]]:
    """Returns file-level imports and imported_by relationships."""
    deps: dict[str, dict[str, list[str]]] = {}
    file_nodes = [
        n for n, d in graph.nodes(data=True) if d.get("type") == "file"
    ]
    for fp in file_nodes:
        if file_path and fp != file_path:
            continue
        imports = [
            succ
            for succ in graph.successors(fp)
            if (graph.get_edge_data(fp, succ) or {}).get("relation") == "IMPORTS"
        ]
        imported_by = [
            pred
            for pred in graph.predecessors(fp)
            if (graph.get_edge_data(pred, fp) or {}).get("relation") == "IMPORTS"
        ]
        deps[fp] = {
            "imports": sorted(imports),
            "imported_by": sorted(imported_by),
        }
    return deps


def export_react_flow_graph(
    graph: nx.DiGraph,
    node_type: str | None = None,
    directory: str | None = None,
    search: str | None = None,
    focus_node_id: str | None = None,
    hops: int = 2,
    include_declares: bool = False,
) -> ReactFlowGraphResponse:
    repo_id = graph.graph.get("repo_id", "default")
    selected_ids: set[str] = set()

    if focus_node_id:
        resolved_focus = resolve_node_identifier(graph, focus_node_id)
        if resolved_focus:
            undirected = graph.to_undirected()
            ego = nx.ego_graph(undirected, resolved_focus, radius=hops)
            selected_ids = set(ego.nodes())

    if not selected_ids:
        for nid, data in graph.nodes(data=True):
            if node_type and node_type != "all" and data.get("type") != node_type:
                continue
            if directory and not data.get("file_path", "").startswith(directory):
                continue
            if search:
                q = search.lower()
                if q not in nid.lower() and q not in data.get("label", "").lower():
                    continue
            selected_ids.add(nid)

    rf_nodes: list[ReactFlowNode] = []
    # Deterministic grid fallback layout (frontend refines with Dagre)
    for idx, nid in enumerate(sorted(selected_ids)):
        data = dict(graph.nodes[nid])
        col = idx % 5
        row = idx // 5
        rf_nodes.append(
            ReactFlowNode(
                id=nid,
                type="codeNode",
                position={"x": float(col * 280), "y": float(row * 140)},
                data=data,
            )
        )

    rf_edges: list[ReactFlowEdge] = []
    for u, v, edata in graph.edges(data=True):
        if u not in selected_ids or v not in selected_ids:
            continue
        rel = edata.get("relation", "CALLS")
        if not include_declares and rel == "DECLARES" and not focus_node_id:
            # Keep DECLARES for API endpoints or when explicitly requested
            if graph.nodes[v].get("type") != "api_endpoint":
                continue
        rf_edges.append(
            ReactFlowEdge(
                id=f"{u}--{rel}-->{v}",
                source=u,
                target=v,
                label=rel,
                animated=rel in ("ROUTES_TO", "CALLS", "QUERIES"),
                data={"relation": rel, "confidence": edata.get("confidence", 1.0), "line": edata.get("line", 1)},
            )
        )

    return ReactFlowGraphResponse(
        repo_id=repo_id,
        nodes=rf_nodes,
        edges=rf_edges,
        total_nodes=graph.number_of_nodes(),
        total_edges=graph.number_of_edges(),
    )

