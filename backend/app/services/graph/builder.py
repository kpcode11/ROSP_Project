import json
import pathlib
import networkx as nx
from app.config import settings
from app.schemas.graph import GraphNode, KnowledgeGraphData
from app.services.graph.resolver import CrossFileResolver
from app.services.parser.extractors import FileExtractionResult


def _compute_pagerank_safe(graph: nx.DiGraph, alpha: float = 0.85, max_iter: int = 100) -> dict[str, float]:
    n = graph.number_of_nodes()
    if n == 0:
        return {}
    try:
        return nx.pagerank(graph, alpha=alpha, max_iter=max_iter)
    except Exception:
        # Pure-Python power iteration fallback when scipy is not installed
        nodes = list(graph.nodes())
        rank = {u: 1.0 / n for u in nodes}
        for _ in range(max_iter):
            next_rank = {u: (1.0 - alpha) / n for u in nodes}
            dangling_sum = sum(rank[u] for u in nodes if graph.out_degree(u) == 0)
            for u in nodes:
                next_rank[u] += alpha * dangling_sum / n
                out_deg = graph.out_degree(u)
                if out_deg > 0:
                    share = alpha * rank[u] / out_deg
                    for v in graph.successors(u):
                        next_rank[v] += share
            diff = sum(abs(next_rank[u] - rank[u]) for u in nodes)
            rank = next_rank
            if diff < 1e-6:
                break
        return rank


class KnowledgeGraphBuilder:
    def build_from_extractions(
        self, repo_id: str, extractions: dict[str, FileExtractionResult]
    ) -> tuple[nx.DiGraph, KnowledgeGraphData]:
        resolver = CrossFileResolver(extractions)
        nodes, edges = resolver.resolve_all()

        graph = nx.DiGraph(repo_id=repo_id)

        for node in nodes:
            graph.add_node(node.id, **node.model_dump())

        for edge in edges:
            graph.add_edge(
                edge.source,
                edge.target,
                relation=edge.relation,
                confidence=edge.confidence,
                line=edge.line,
            )

        # Compute centrality and degree metrics on functional dependency subgraph (excluding DECLARES)
        dep_edges = [
            (u, v)
            for u, v, d in graph.edges(data=True)
            if d.get("relation") != "DECLARES"
        ]
        dep_subgraph = nx.DiGraph()
        dep_subgraph.add_nodes_from(graph.nodes())
        dep_subgraph.add_edges_from(dep_edges)
        # Reverse edges for PageRank so heavily called/imported targets rank highest
        rev_dep_graph = dep_subgraph.reverse()
        pageranks = _compute_pagerank_safe(rev_dep_graph)

        updated_nodes: list[GraphNode] = []
        for node in nodes:
            in_deg = dep_subgraph.in_degree(node.id)
            out_deg = dep_subgraph.out_degree(node.id)
            pr = round(float(pageranks.get(node.id, 0.0)), 6)
            node.metrics.in_degree = in_deg
            node.metrics.out_degree = out_deg
            node.metrics.pagerank = pr
            graph.nodes[node.id]["metrics"] = node.metrics.model_dump()
            updated_nodes.append(node)

        kg_data = KnowledgeGraphData(repo_id=repo_id, nodes=updated_nodes, edges=edges)
        return graph, kg_data

    def save_graph(self, repo_id: str, kg_data: KnowledgeGraphData, path: pathlib.Path | None = None) -> pathlib.Path:
        out_path = path or (settings.graphs_dir / f"{repo_id}_graph.json")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps(kg_data.model_dump(), indent=2),
            encoding="utf-8",
        )
        return out_path

    def load_graph(self, repo_id: str, path: pathlib.Path | None = None) -> tuple[nx.DiGraph, KnowledgeGraphData]:
        in_path = path or (settings.graphs_dir / f"{repo_id}_graph.json")
        if not in_path.exists():
            raise FileNotFoundError(f"Saved graph not found at {in_path}")
        raw = json.loads(in_path.read_text(encoding="utf-8"))
        kg_data = KnowledgeGraphData.model_validate(raw)
        graph = nx.DiGraph(repo_id=kg_data.repo_id)
        for node in kg_data.nodes:
            graph.add_node(node.id, **node.model_dump())
        for edge in kg_data.edges:
            graph.add_edge(
                edge.source,
                edge.target,
                relation=edge.relation,
                confidence=edge.confidence,
                line=edge.line,
            )
        return graph, kg_data
