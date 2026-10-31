# Architectural Decision Log

## ADR-001: Fixed Local Stack (Zero Mandatory Docker)
- **Date:** 2026-10-31
- **Decision:** Use `tree-sitter` (v0.23+) for deterministic AST parsing across Python, JavaScript, TypeScript, and Java; `NetworkX` (`nx.DiGraph`) serialized to JSON for the Code Knowledge Graph; embedded local `qdrant-client` (`path="./data/qdrant"`) for semantic code embeddings; SQLite (`./data/codeintel.db`) via SQLAlchemy 2.0 for repository metadata; and local Ollama models (`mxbai-embed-large:latest` at 1024 dims and `qwen2.5:7b-instruct`).
- **Rationale:** Guarantees 100% local execution on a Windows 11 developer laptop (Intel Core i7-14650HX, 16 GB RAM, RTX 4060 8 GB VRAM) without requiring Docker Desktop or external paid API keys.

## ADR-002: Deterministic Static Analysis & Citation Verification
- **Date:** 2026-10-31
- **Decision:** All graph relationships (`DECLARES`, `IMPORTS`, `CALLS`, `INHERITS`, `ROUTES_TO`, `QUERIES`) and Change Impact ("Blast Radius") risk scores (`0-100`) are computed deterministically from AST and graph topology. Every citation returned by the Hybrid GraphRAG assistant is validated against the repository's indexed file/line inventory before returning to the user.
- **Rationale:** Prevents hallucinated dependencies, arbitrary risk scores, and non-existent file citations.
