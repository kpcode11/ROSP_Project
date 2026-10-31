from typing import Any, Literal
from pydantic import BaseModel, Field


class FileRecord(BaseModel):
    path: str = Field(..., description="POSIX relative file path inside the repository")
    language: str = Field(..., description="Detected language (python, javascript, typescript, java)")
    size_bytes: int
    sha256: str
    line_count: int


class RepositoryInventory(BaseModel):
    repo_id: str
    name: str
    root_path: str
    source_type: Literal["local", "git", "zip"] = "local"
    source_location: str
    files: list[FileRecord] = Field(default_factory=list)
    languages: dict[str, int] = Field(default_factory=dict)
    frameworks: list[str] = Field(default_factory=list)
    skipped_files_count: int = 0


class RepositoryCreateRequest(BaseModel):
    source: str = Field(
        default="sample_ecommerce",
        description="Local folder path, GitHub URL, or 'sample_ecommerce'",
    )
    name: str | None = None


class RepositoryStats(BaseModel):
    files_discovered: int = 0
    files_parsed: int = 0
    functions_discovered: int = 0
    classes_discovered: int = 0
    api_endpoints_discovered: int = 0
    models_discovered: int = 0
    imports_discovered: int = 0
    call_relationships: int = 0
    nodes_count: int = 0
    edges_count: int = 0


class RepositorySummary(BaseModel):
    id: str
    name: str
    source_type: str
    source_path: str
    status: str
    languages: dict[str, int] = Field(default_factory=dict)
    frameworks: list[str] = Field(default_factory=list)
    stats: RepositoryStats = Field(default_factory=RepositoryStats)
    created_at: str | None = None
    updated_at: str | None = None


class CentralModuleItem(BaseModel):
    id: str
    label: str
    type: str
    file_path: str
    pagerank: float
    in_degree: int
    out_degree: int


class RepositoryDetail(RepositorySummary):
    central_modules: list[CentralModuleItem] = Field(default_factory=list)
    files: list[FileRecord] = Field(default_factory=list)
    architectural_summary: str = ""


class FileContentResponse(BaseModel):
    repo_id: str
    file_path: str
    language: str
    line_count: int
    content: str
    symbols: list[dict[str, Any]] = Field(default_factory=list)
    imports: list[dict[str, Any]] = Field(default_factory=list)
    calls: list[dict[str, Any]] = Field(default_factory=list)

