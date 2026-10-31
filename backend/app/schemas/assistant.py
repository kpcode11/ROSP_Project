from pydantic import BaseModel, Field


class SearchResultItem(BaseModel):
    chunk_id: str
    node_id: str
    node_type: str
    name: str
    file_path: str
    language: str
    line_start: int
    line_end: int
    signature: str
    docstring: str = ""
    code: str
    context_header: str
    score: float


class ExecutionStep(BaseModel):
    step: int
    component: str
    file_path: str
    description: str


class CitationItem(BaseModel):
    file_path: str
    symbol: str
    line_start: int
    line_end: int
    snippet: str


class AskQuestionRequest(BaseModel):
    question: str = Field(..., min_length=2)
    top_k: int = Field(default=6, ge=1, le=15)


class AssistantResponse(BaseModel):
    question: str
    answer_markdown: str
    execution_steps: list[ExecutionStep] = Field(default_factory=list)
    citations: list[CitationItem] = Field(default_factory=list)
    related_nodes: list[str] = Field(default_factory=list)
    model_used: str = "qwen2.5:7b-instruct"
    retrieval_latency_ms: float = 0.0

