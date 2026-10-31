from typing import Any, Literal
from pydantic import BaseModel, Field
from app.schemas.graph import ReactFlowEdge, ReactFlowNode


class DirectDependentItem(BaseModel):
    id: str
    label: str = ""
    type: str
    file_path: str = ""
    relation: str


class TransitiveDependentItem(BaseModel):
    id: str
    label: str = ""
    type: str
    file_path: str = ""
    hop_distance: int


class ImpactSubgraph(BaseModel):
    nodes: list[ReactFlowNode] = Field(default_factory=list)
    edges: list[ReactFlowEdge] = Field(default_factory=list)


class ImpactReport(BaseModel):
    repo_id: str
    target_node_id: str
    target_label: str = ""
    target_type: str
    risk_level: Literal["Low", "Medium", "High"]
    risk_score: float
    score_breakdown: dict[str, float] = Field(default_factory=dict)
    risk_factors: list[str] = Field(default_factory=list)
    direct_dependents: list[DirectDependentItem] = Field(default_factory=list)
    transitive_dependents: list[TransitiveDependentItem] = Field(default_factory=list)
    affected_api_endpoints: list[str] = Field(default_factory=list)
    related_tests: list[str] = Field(default_factory=list)
    subgraph: ImpactSubgraph = Field(default_factory=ImpactSubgraph)
    metadata: dict[str, Any] = Field(default_factory=dict)

