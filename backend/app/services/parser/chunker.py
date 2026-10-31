import hashlib
import uuid
from pydantic import BaseModel, Field
from app.services.parser.extractors import FileExtractionResult


class CodeChunk(BaseModel):
    chunk_id: str
    repo_id: str
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
    sha256: str = ""
    calls: list[str] = Field(default_factory=list)

    @property
    def embedding_text(self) -> str:
        parts = [self.context_header]
        if self.docstring:
            parts.append(f"Documentation: {self.docstring}")
        parts.append(self.code)
        return "\n".join(parts)


def _deterministic_uuid(repo_id: str, node_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_OID, f"{repo_id}::{node_id}"))


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_chunks_for_file(
    repo_id: str,
    extraction: FileExtractionResult,
    raw_source: str | None = None,
) -> list[CodeChunk]:
    chunks: list[CodeChunk] = []
    fp = extraction.file_path
    lang = extraction.language

    # Map caller -> list of called symbols
    caller_calls: dict[str, list[str]] = {}
    for call in extraction.calls:
        caller_calls.setdefault(call.caller, [])
        if call.callee not in caller_calls[call.caller]:
            caller_calls[call.caller].append(call.callee)

    # 1. Functions and Methods
    for fn in extraction.functions:
        node_id = f"{fp}::{fn.qualified_name}"
        ntype = "method" if fn.is_method else "function"
        outgoing = caller_calls.get(fn.qualified_name, [])
        calls_str = ", ".join(outgoing[:8]) if outgoing else "none"
        header = (
            f"File: {fp} | {ntype.capitalize()}: {fn.qualified_name}({', '.join(fn.parameters)}) "
            f"| Signature: {fn.signature} | Calls: {calls_str}"
        )
        chunks.append(
            CodeChunk(
                chunk_id=_deterministic_uuid(repo_id, node_id),
                repo_id=repo_id,
                node_id=node_id,
                node_type=ntype,
                name=fn.qualified_name,
                file_path=fp,
                language=lang,
                line_start=fn.line_start,
                line_end=fn.line_end,
                signature=fn.signature,
                docstring=fn.docstring,
                code=fn.code,
                context_header=header,
                sha256=_sha256_text(f"{header}\n{fn.docstring}\n{fn.code}"),
                calls=outgoing,
            )
        )

    # 2. Classes & Models
    for cls in extraction.classes:
        node_id = f"{fp}::{cls.name}"
        ntype = "model" if cls.is_model else "class"
        bases_str = f" extends {', '.join(cls.bases)}" if cls.bases else ""
        header = f"File: {fp} | {ntype.capitalize()}: {cls.name}{bases_str} | Signature: {cls.signature}"
        chunks.append(
            CodeChunk(
                chunk_id=_deterministic_uuid(repo_id, node_id),
                repo_id=repo_id,
                node_id=node_id,
                node_type=ntype,
                name=cls.name,
                file_path=fp,
                language=lang,
                line_start=cls.line_start,
                line_end=cls.line_end,
                signature=cls.signature,
                docstring=cls.docstring,
                code=cls.code,
                context_header=header,
                sha256=_sha256_text(f"{header}\n{cls.docstring}\n{cls.code}"),
                calls=[],
            )
        )

    # 3. API Endpoints
    for ep in extraction.api_endpoints:
        node_id = ep.name
        handlers_str = ", ".join(ep.handlers)
        header = f"File: {fp} | API Endpoint: {ep.name} | Handlers: {handlers_str}"
        chunks.append(
            CodeChunk(
                chunk_id=_deterministic_uuid(repo_id, f"{fp}::{ep.name}"),
                repo_id=repo_id,
                node_id=node_id,
                node_type="api_endpoint",
                name=ep.name,
                file_path=fp,
                language=lang,
                line_start=ep.line_start,
                line_end=ep.line_end,
                signature=ep.name,
                docstring=f"HTTP {ep.http_method} route {ep.route_path} handled by {handlers_str}",
                code=ep.code,
                context_header=header,
                sha256=_sha256_text(f"{header}\n{ep.code}"),
                calls=ep.handlers,
            )
        )

    # 4. Fallback file-level chunk if no symbols were extracted
    if not chunks and raw_source:
        node_id = fp
        header = f"File: {fp} | Language: {lang}"
        snippet = "\n".join(raw_source.splitlines()[:80])
        chunks.append(
            CodeChunk(
                chunk_id=_deterministic_uuid(repo_id, node_id),
                repo_id=repo_id,
                node_id=node_id,
                node_type="file",
                name=fp.split("/")[-1],
                file_path=fp,
                language=lang,
                line_start=1,
                line_end=extraction.line_count,
                signature=fp,
                docstring="",
                code=snippet,
                context_header=header,
                sha256=_sha256_text(snippet),
                calls=[],
            )
        )

    return chunks
