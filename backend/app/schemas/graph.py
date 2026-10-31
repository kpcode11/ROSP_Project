from typing import Any, Literal
from pydantic import BaseModel, Field

NodeType = Literal["file", "class", "function", "method", "api_endpoint", "model"]
EdgeRelation = Literal["DECLARES", "IMPORTS", "CALLS", "INHERITS", "ROUTES_TO", "QUERIES"]


class NodeMetrics(BaseModel):
    loc: int = 0
    in_degree: int = 0
    out_degree: int = 0
    pagerank: float = 0.0


class GraphNode(BaseModel):
    id: str
    label: str
    type: NodeType
    file_path: str
    language: str
    line_start: int = 1
    line_end: int = 1
    signature: str = ""
    docstring: str = ""
    parameters: list[str] = Field(default_factory=list)
    parent_id: str | None = None
    metrics: NodeMetrics = Field(default_factory=NodeMetrics)
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: EdgeRelation
    confidence: float = 1.0
    line: int = 1


class KnowledgeGraphData(BaseModel):
    repo_id: str
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class ReactFlowNode(BaseModel):
    id: str
    type: str = "codeNode"
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    data: dict[str, Any]


class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    type: str = "smoothstep"
    animated: bool = False
    data: dict[str, Any] = Field(default_factory=dict)


class ReactFlowGraphResponse(BaseModel):
    repo_id: str
    nodes: list[ReactFlowNode] = Field(default_factory=list)
    edges: list[ReactFlowEdge] = Field(default_factory=list)
    total_nodes: int = 0
    total_edges: int = 0
