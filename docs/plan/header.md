# AI Agent Master Plan — Codebase Intelligence Platform (Graphify-Core)

**Project:** Local-First Codebase Intelligence Platform (AST Knowledge Graph + Semantic Code Search + Grounded GraphRAG + Blast-Radius Impact Analyzer)
**Audience:** AI coding agents (Cursor, Antigravity, Claude Code, GitHub Copilot, OpenAI Codex, or Gemini Argon), used **one at a time and in turns** because each session may hit context or token limits at any moment.
**Developer Machine:** Windows 11 laptop (`C:\Users\KESHAV`), Intel Core i7-14650HX, 16 GB RAM, NVIDIA GeForce RTX 4060 Laptop GPU (8 GB VRAM).
**Pre-installed Local AI Models (Verified via `ollama list`):**
- Embedding Model: `mxbai-embed-large:latest` (669 MB, 1024 dimensions)
- Chat / Reasoning LLM: `qwen2.5:7b-instruct` (4.7 GB)
**Timeline & Scope Decision:** High-velocity 2-to-4-day build using **recent open-source libraries** (`tree-sitter` v0.23+, `ast-grep-py`, `networkx`, `qdrant-client` local disk mode, `pydantic-ai`, `fastapi`, `nextjs`, `@xyflow/react` v12). Zero mandatory Docker containers or external paid APIs.

> **Place this file in the repository at `docs/MASTER_PLAN.md`.** Every agent session starts by reading `AGENTS.md` (Appendix F.1), running `python scripts/status.py`, reading `HANDOFF.md`, and reading **only** the phase file (`docs/plan/phase_N.md`) it needs. Never load this entire file into context during routine task execution.

---

