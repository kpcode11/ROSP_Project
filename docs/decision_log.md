# Architectural Decision Log

## ADR-001: Fixed Local Stack (Zero Mandatory Docker)
- **Date:** 2026-10-31
- **Decision:** Use `tree-sitter` (v0.23+) for deterministic AST parsing across Python, JavaScript, TypeScript, and Java; `NetworkX` (`nx.DiGraph`) serialized to JSON for the Code Knowledge Graph; embedded local `qdrant-client` (`path="./data/qdrant"`) for semantic code embeddings; SQLite (`./data/codeintel.db`) via SQLAlchemy 2.0 for repository metadata; and local Ollama models (`mxbai-embed-large:latest` at 1024 dims and `qwen2.5:7b-instruct`).
- **Rationale:** Guarantees 100% local execution on a Windows 11 developer laptop (Intel Core i7-14650HX, 16 GB RAM, RTX 4060 8 GB VRAM) without requiring Docker Desktop or external paid API keys.

## ADR-002: Deterministic Static Analysis & Citation Verification
- **Date:** 2026-10-31
- **Decision:** All graph relationships (`DECLARES`, `IMPORTS`, `CALLS`, `INHERITS`, `ROUTES_TO`, `QUERIES`) and Change Impact ("Blast Radius") risk scores (`0-100`) are computed deterministically from AST and graph topology. Every citation returned by the Hybrid GraphRAG assistant is validated against the repository's indexed file/line inventory before returning to the user.
- **Rationale:** Prevents hallucinated dependencies, arbitrary risk scores, and non-existent file citations.

## ADR-003: Verified Hardware & Local Model Environment
- **Date:** 2026-10-31
- **Environment:** Windows 11 64-bit, Intel Core i7-14650HX, 16 GB RAM, NVIDIA GeForce RTX 4060 Laptop GPU (8 GB VRAM), Python 3.14.7, Node.js v24.20.0.
- **Models:** `mxbai-embed-large:latest` (1024 dimensions) and `qwen2.5:7b-instruct` configured with deterministic fallback embeddings/synthesis when the Ollama daemon is offline during automated CI/local test runs.

## ADR-004: Supabase-Inspired Frontend Workspace
- **Date:** 2026-11-02
- **Decision:** Use the DESIGN.md white-canvas system for the dashboard shell: near-black ink, a calibrated grey border ladder, sparse emerald actions, square-ish controls, and dark product surfaces only where they improve hierarchy (such as architectural summaries and code).
- **Rationale:** The intelligence product is dense by nature, so a restrained visual system keeps tables, graphs, and code readable without competing accent colors or decorative gradients. Emerald is reserved for primary actions and health/ready states so important actions remain easy to scan.

## ADR-005: Persisted Frontend Theme Preference
- **Date:** 2026-11-02
- **Decision:** Provide an explicit light/dark toggle in the workspace header, persist the choice in `localStorage`, and use the operating-system preference only when no choice has been saved.
- **Rationale:** A code intelligence workspace is used for long sessions and across different lighting conditions. Keeping the preference local avoids introducing account state while making the entire shell and data views consistent when the user switches themes.

## ADR-006: Token-Driven Semantic UI Components
- **Date:** 2026-11-02
- **Decision:** Back Tailwind colour tokens (`canvas`, `ink`, `hairline`...) with CSS variables that switch under `.dark-theme`, and add semantic component classes in `globals.css` (`btn-primary`, `btn-tone`, `card`, `card-night`, `data-table`, `pill-soft`, `tone-*`). Accent tones (sky, violet, amber, tomato) are allowed for data visualisation, type indicators, and secondary row actions; emerald remains the single filled CTA with near-black text in both themes.
- **Rationale:** The legacy attribute-selector overrides flipped `text-neutral-900` to light grey in dark mode, making dark text on emerald unreadable. Semantic, theme-aware classes avoid those overrides and let pages be redesigned one at a time without regressions.
