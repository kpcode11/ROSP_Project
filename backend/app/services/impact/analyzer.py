from collections import deque
import networkx as nx
from app.schemas.graph import ReactFlowEdge, ReactFlowNode
from app.schemas.impact import (
    DirectDependentItem,
    ImpactReport,
    ImpactSubgraph,
    TransitiveDependentItem,
)
from app.services.graph.queries import resolve_node_identifier


def _is_test_path(file_path: str) -> bool:
    fp = file_path.lower()
    return "test" in fp or "spec" in fp


class ImpactAnalyzer:
    """Computes deterministic upstream blast radius and risk scores for any file, class, or function."""

    def analyze(self, graph: nx.DiGraph, target_identifier: str) -> ImpactReport:
        repo_id = graph.graph.get("repo_id", "default")
        resolved_target = resolve_node_identifier(graph, target_identifier)
        if not resolved_target:
            raise KeyError(f"Target node '{target_identifier}' not found in knowledge graph.")

        target_data = graph.nodes[resolved_target]
        target_type = target_data.get("type", "file")
        target_label = target_data.get("label", resolved_target)

        # Seed set: the target node itself plus any symbols it directly DECLARES (if file or class)
        seed_nodes: set[str] = {resolved_target}
        for succ in graph.successors(resolved_target):
            if (graph.get_edge_data(resolved_target, succ) or {}).get("relation") == "DECLARES":
                seed_nodes.add(succ)
                # Also include methods declared by a class inside the file
                for sub_succ in graph.successors(succ):
                    if (graph.get_edge_data(succ, sub_succ) or {}).get("relation") == "DECLARES":
                        seed_nodes.add(sub_succ)

        # Build reverse dependency adjacency (excluding DECLARES edges, except that when a function/method
        # is impacted, its enclosing file and any API endpoint declared in that file or routing to it are linked)
        hop_map: dict[str, int] = {}
        first_hop_relation: dict[str, str] = {}
        queue: deque[tuple[str, int]] = deque()

        for s in seed_nodes:
            hop_map[s] = 0
            queue.append((s, 0))

        while queue:
            curr, dist = queue.popleft()
            # 1. Incoming functional edges (IMPORTS, CALLS, ROUTES_TO, QUERIES, INHERITS)
            for pred in graph.predecessors(curr):
                edata = graph.get_edge_data(pred, curr) or {}
                rel = edata.get("relation", "")
                if rel == "DECLARES":
                    continue
                next_dist = dist + 1
                if pred not in hop_map:
                    hop_map[pred] = next_dist
                    if next_dist == 1:
                        first_hop_relation[pred] = rel
                    queue.append((pred, next_dist))
                    # Also propagate to the enclosing file of `pred` at the same hop distance
                    pred_fp = graph.nodes[pred].get("file_path")
                    if pred_fp and pred_fp in graph and pred_fp not in hop_map:
                        hop_map[pred_fp] = next_dist
                        if next_dist == 1:
                            first_hop_relation[pred_fp] = "IMPORTS" if target_type == "file" else rel
                        queue.append((pred_fp, next_dist))

        direct_items: list[DirectDependentItem] = []
        transitive_items: list[TransitiveDependentItem] = []
        affected_apis: set[str] = set()
        related_tests: set[str] = set()

        for nid, dist in sorted(hop_map.items(), key=lambda x: (x[1], x[0])):
            if dist == 0 or nid in seed_nodes:
                continue
            ndata = graph.nodes[nid]
            ntype = ndata.get("type", "unknown")
            nlabel = ndata.get("label", nid)
            nfp = ndata.get("file_path", "")

            if ntype == "api_endpoint":
                affected_apis.add(nid)
            if nfp and _is_test_path(nfp):
                related_tests.add(nfp)

            if dist == 1:
                rel = first_hop_relation.get(nid, "CALLS")
                direct_items.append(
                    DirectDependentItem(
                        id=nid,
                        label=nlabel,
                        type=ntype,
                        file_path=nfp,
                        relation=rel,
                    )
                )
            else:
                transitive_items.append(
                    TransitiveDependentItem(
                        id=nid,
                        label=nlabel,
                        type=ntype,
                        file_path=nfp,
                        hop_distance=dist,
                    )
                )

        # Deterministic Heuristic Risk Scoring Formula (Section 5.2)
        s_direct = min(35.0, float(len(direct_items) * 7.0))
        total_ancestors = len(direct_items) + len(transitive_items)
        s_trans = min(25.0, float(total_ancestors * 2.5))
        s_api = min(20.0, float(len(affected_apis) * 10.0))
        s_test = 0.0 if len(related_tests) > 0 else 20.0

        total_score = round(min(100.0, s_direct + s_trans + s_api + s_test), 1)
        if total_score >= 60.0:
            risk_level = "High"
        elif total_score >= 30.0:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        risk_factors: list[str] = []
        distinct_files = {
            item.file_path for item in direct_items if item.file_path
        } | {
            item.file_path for item in transitive_items if item.file_path
        }
        if direct_items:
            risk_factors.append(
                f"Directly imported or called by {len(direct_items)} components across {max(1, len(distinct_files))} files"
            )
        if affected_apis:
            api_list_str = ", ".join(sorted(affected_apis))
            risk_factors.append(
                f"Affects {len(affected_apis)} public API endpoints ({api_list_str})"
            )
        if related_tests:
            risk_factors.append(
                f"Covered by {len(related_tests)} automated test suite(s): {', '.join(sorted(related_tests))}"
            )
        else:
            risk_factors.append(
                "Zero test files detected in upstream blast radius (+20 risk penalty)"
            )

        pagerank_val = target_data.get("metrics", {}).get("pagerank", 0.0)
        if pagerank_val >= 0.03:
            risk_factors.append(
                f"High centrality in dependency graph (PageRank={pagerank_val:.4f})"
            )

        # Build blast-radius subgraph for React Flow
        subgraph_node_ids = {resolved_target} | {
            d.id for d in direct_items
        } | {
            t.id for t in transitive_items
        }
        rf_nodes: list[ReactFlowNode] = []
        for idx, nid in enumerate(sorted(subgraph_node_ids)):
            ndata = dict(graph.nodes[nid])
            ndata["is_target"] = nid == resolved_target
            ndata["hop_distance"] = hop_map.get(nid, 0)
            rf_nodes.append(
                ReactFlowNode(
                    id=nid,
                    type="codeNode",
                    position={"x": float((idx % 4) * 260), "y": float((idx // 4) * 140)},
                    data=ndata,
                )
            )

        rf_edges: list[ReactFlowEdge] = []
        seen_rf_edges: set[tuple[str, str, str]] = set()
        for u, v, edata in graph.edges(data=True):
            rel = edata.get("relation", "CALLS")
            # Map edges directed into seed children onto resolved_target so the visual subgraph connects cleanly
            u_mapped = resolved_target if (u in seed_nodes and u not in subgraph_node_ids) else u
            v_mapped = resolved_target if (v in seed_nodes and v not in subgraph_node_ids) else v
            if u_mapped in subgraph_node_ids and v_mapped in subgraph_node_ids and u_mapped != v_mapped:
                if rel == "DECLARES" and graph.nodes[v].get("type") != "api_endpoint":
                    continue
                key = (u_mapped, v_mapped, rel)
                if key not in seen_rf_edges:
                    seen_rf_edges.add(key)
                    rf_edges.append(
                        ReactFlowEdge(
                            id=f"impact-{u_mapped}-{rel}-{v_mapped}",
                            source=u_mapped,
                            target=v_mapped,
                            label=rel,
                            animated=True,
                            data={"relation": rel},
                        )
                    )

        return ImpactReport(
            repo_id=repo_id,
            target_node_id=resolved_target,
            target_label=target_label,
            target_type=target_type,
            risk_level=risk_level,  # type: ignore[arg-type]
            risk_score=total_score,
            score_breakdown={
                "direct_dependents_score": s_direct,
                "transitive_blast_radius_score": s_trans,
                "api_exposure_score": s_api,
                "test_coverage_penalty": s_test,
            },
            risk_factors=risk_factors,
            direct_dependents=direct_items,
            transitive_dependents=transitive_items,
            affected_api_endpoints=sorted(affected_apis),
            related_tests=sorted(related_tests),
            subgraph=ImpactSubgraph(nodes=rf_nodes, edges=rf_edges),
        )
