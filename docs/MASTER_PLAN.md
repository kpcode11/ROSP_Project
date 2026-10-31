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

## Table of Contents

- [0. Agent Operating Manual](#0-agent-operating-manual)
- [1. Project Summary and Fixed Decisions](#1-project-summary-and-fixed-decisions)
- [2. Complete Repository Architecture](#2-complete-repository-architecture)
- [3. Development Environment and Tooling (Windows 11)](#3-development-environment-and-tooling-windows-11)
- [4. Data, Schemas, and Interfaces](#4-data-schemas-and-interfaces)
- [5. Architecture and Technical Design](#5-architecture-and-technical-design)
- [6. Phase-Wise Implementation Roadmap](#6-phase-wise-implementation-roadmap)
  - [Phase 0 — Scaffolding, Handoff System & Environment Verification](#phase-0--scaffolding-handoff-system--environment-verification)
  - [Phase 1 — Repository Ingestion & Deterministic AST Parser](#phase-1--repository-ingestion--deterministic-ast-parser)
  - [Phase 2 — Cross-File Knowledge Graph & Blast-Radius Engine](#phase-2--cross-file-knowledge-graph--blast-radius-engine)
  - [Phase 3 — Local Vector Indexing & Hybrid GraphRAG Assistant](#phase-3--local-vector-indexing--hybrid-graphrag-assistant)
  - [Phase 4 — FastAPI Backend & REST Contract](#phase-4--fastapi-backend--rest-contract)
  - [Phase 5 — Next.js Visual Architecture Dashboard (`@xyflow/react`)](#phase-5--nextjs-visual-architecture-dashboard-xyflowreact)
  - [Phase 6 — Evaluation, Benchmarks, Demo Repo & Final Release](#phase-6--evaluation-benchmarks-demo-repo--final-release)
- [7. Testing and Quality Assurance](#7-testing-and-quality-assurance)
- [8. Evaluation and Benchmarking](#8-evaluation-and-benchmarking)
- [9. Deployment and Integration](#9-deployment-and-integration)
- [10. Final Documentation and Release](#10-final-documentation-and-release)
- [Appendices](#appendices)
  - [Appendix A — AST Extraction & Graph Relationship Specifications](#appendix-a--ast-extraction--graph-relationship-specifications)
  - [Appendix B — REST API Contract](#appendix-b--rest-api-contract)
  - [Appendix C — Configuration Files](#appendix-c--configuration-files)
  - [Appendix D — Grounded GraphRAG Prompt & Citation Protocol](#appendix-d--grounded-graphrag-prompt--citation-protocol)
  - [Appendix E — Templates (`PROGRESS.md`, `HANDOFF.md`, Resume Prompts)](#appendix-e--templates-progressmd-handoffmd-resume-prompts)
  - [Appendix F — Agent Orchestration Scripts (`AGENTS.md`, `status.py`, `split_plan.py`, `tasks.py`)](#appendix-f--agent-orchestration-scripts-agentsmd-statuspy-split_planpy-taskspy)

---

## 0. Agent Operating Manual

### 0.1 The Situation You Are Working In

- Multiple AI coding agents (Cursor, Antigravity, Claude Code, Copilot, Codex, Argon) will work on this repository **sequentially**. Any agent may be terminated mid-task due to token or rate limits.
- **The repository is the single source of truth.** Never rely on chat history. Every architectural choice, task state, file diff, and blocker must be recorded in `PROGRESS.md`, `HANDOFF.md`, `docs/decision_log.md`, and git commits.
- Do not assume the project is starting from scratch if files already exist. Always inspect the repository state first.

### 0.2 Session Initialization Protocol (Mandatory for Every Session)

1. Read `AGENTS.md` in the repository root.
2. Run `python scripts/status.py`. It outputs the current git branch, task counts, current phase, active `IN_PROGRESS` or `BLOCKED` tasks, the next `TODO` task, the top 40 lines of `HANDOFF.md`, `git status --short`, and recent commits.
3. Read `HANDOFF.md` completely.
4. Read **only** the current phase file (`docs/plan/phase_N.md`) and any specific appendix referenced by your current task.
5. Inspect the working tree:
   - If uncommitted changes exist, run `python scripts/tasks.py test-fast`.
   - Keep the changes if tests pass and they match the active task in `HANDOFF.md`; otherwise `git stash push -m "stashed-by-agent"` and note it in `HANDOFF.md`.
6. Execute the current `IN_PROGRESS` task, or transition the first eligible `TODO` task to `IN_PROGRESS` before writing code.

### 0.3 Task Execution Protocol

- Work on **strictly one task ID at a time** (e.g., `P1-03`).
- Target diff size per task: **50 to 250 lines of code** plus corresponding unit/integration tests.
- Valid task statuses in `PROGRESS.md`: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `SKIPPED`.
- **Before writing code:** Update `PROGRESS.md` to set the task status to `IN_PROGRESS` and update `HANDOFF.md` with the active task ID.
- **Upon completing a task:**
  1. Run verification tests (`python scripts/tasks.py test-fast`).
  2. Run linter (`python scripts/tasks.py lint`).
  3. Update `PROGRESS.md` status to `DONE` and record the commit hash.
  4. Rewrite `HANDOFF.md` pointing to the next task ID.
  5. Commit changes using format: `P1-03: implement tree-sitter JS/TS/Python symbol extractor (tests pass)`.
  6. Work-in-progress commits must use `wip(P1-03): partial symbol extractor` and leave status as `IN_PROGRESS`.

### 0.4 Token-Management and Low-Budget Protocol

1. **Never print large files or AST dumps to stdout.** Use `Select-Object -First 30` in PowerShell or write small Python inspection scripts capped at 80 lines of output.
2. **Never dump `graph.json` or vector embeddings into the terminal.** Print summary counts (`nodes_count`, `edges_count`, `sample_node`).
3. Run `pytest -q -x --maxfail=3` to minimize console noise.
4. When your context window reaches ~75% capacity or the IDE warns of token limits:
   - Stop starting new subtasks immediately.
   - Ensure all edited files are syntactically valid.
   - Run `python scripts/tasks.py test-fast`.
   - Rewrite `HANDOFF.md` with exact next steps.
   - Commit with `wip(<TASK_ID>): ...` and output the **After a Cut-Off Resume Prompt** from Appendix E.3.

### 0.5 Safe Handling of Cloned Repositories and Local Models

- **Never clone huge monorepos during testing.** Enforce a default `--max-files 300` and `--max-file-size-kb 500` limit in the repository analyzer so parsing finishes in $< 5$ seconds and never exhausts the laptop's 16 GB RAM.
- **Strictly ignore noisy directories:** Always skip `.git/`, `node_modules/`, `.next/`, `dist/`, `build/`, `venv/`, `.venv/`, `__pycache__/`, `coverage/`, `.idea/`, `.vscode/`, and binary/lock files (`*.lock`, `package-lock.json`, `*.png`, `*.jpg`, `*.pdf`, `*.onnx`, `*.db`).
- **Use exact installed Ollama models:**
  - Embedding model MUST default to `mxbai-embed-large:latest` (vector dimension = `1024`). Do NOT pull `nomic-embed-text` unless `mxbai-embed-large:latest` is missing.
  - Chat LLM MUST default to `qwen2.5:7b-instruct`.
  - Keep Ollama requests sequential with bounded context (max 6,000 tokens of retrieved code + graph context per query) so the 8 GB VRAM on the RTX 4060 never hits Out-Of-Memory (OOM).

### 0.6 Hard Engineering Rules

1. **Zero Hallucinated Citations:** The AI Assistant (`POST /api/repositories/{id}/ask`) must never invent file names, function names, or line numbers. Every claim must cite a real `file_path` and `line_start`-`line_end` extracted by Tree-sitter.
2. **Deterministic Static Analysis First:** Graph edges (`IMPORTS`, `CALLS`, `DECLARES`, `INHERITS`, `EXPOSES`) and Blast-Radius Risk Scores (`Low`, `Medium`, `High`) MUST be computed deterministically via `tree-sitter` and `NetworkX`—never guessed by an LLM.
3. **Zero Mandatory Docker Dependency:** Qdrant must run in local embedded disk mode (`QdrantClient(path="./data/qdrant")`), metadata in SQLite (`./data/codeintel.db`), and graphs in `./data/graphs/{repo_id}_graph.json`. Docker Compose is provided only as an optional production deployment profile in Phase 6.
4. **Human Checkpoints (`[HUMAN]`):** Only block for human intervention if Ollama is not running or a hardware constraint fails. Otherwise, execute autonomously using the fixed decisions in Section 1.

---

## 1. Project Summary and Fixed Decisions

### 1.1 Overview & Problem Statement

When developers join a team or inherit a repository with 100+ files, dozens of API routes, services, and database models, understanding how components interact takes days of manual reading. Traditional keyword search fails when searching by intent (e.g., searching for admin authorization when the code checks `!user.getRole().equals("ADMIN")`), and naive RAG chatbots treat files as flat text chunks—hallucinating dependencies and failing to predict what will break when a file is modified.

### 1.2 Proposed Solution

We are building a **100% local, open-source Codebase Intelligence Platform** (`CodeIntel`) that:
1. Clones or extracts any Git repository or local folder/ZIP into an isolated workspace.
2. Parses source files deterministically using **Tree-sitter** (`tree-sitter-python`, `tree-sitter-javascript`, `tree-sitter-typescript`, `tree-sitter-java`) into a **Code Knowledge Graph** (`NetworkX`) mapping `File`, `Class`, `Function`, `Method`, `API`, and `Model` nodes alongside `IMPORTS`, `CALLS`, `DECLARES`, `INHERITS`, and `EXPOSES` edges.
3. Indexes AST-bounded code chunks (preserving signatures, docstrings, and line numbers) into an embedded local **Qdrant** vector store using **Ollama (`mxbai-embed-large:latest`)**.
4. Answers complex architectural questions using **Hybrid GraphRAG** (combining Qdrant semantic top-$k$ chunks + 1-hop/2-hop `NetworkX` graph traversal) synthesized by **Ollama (`qwen2.5:7b-instruct`)** with strict source file and line-range citations.
5. Computes deterministic **Change Impact ("Blast Radius") Reports** before a developer modifies a file or function, identifying upstream callers, affected API routes, associated test files, and heuristic risk scores.
6. Renders a dark-mode **Next.js + Tailwind + `shadcn/ui` + `@xyflow/react` (v12)** developer dashboard with auto-layout (`dagre`) for visual architecture exploration.

### 1.3 Fixed Technical Decisions (Do Not Change Without Recording in `docs/decision_log.md`)

| Layer | Fixed Technology Decision | Rationale |
| :--- | :--- | :--- |
| **Backend Language & API** | Python 3.11+ & **FastAPI** + **Pydantic v2** | Native ecosystem for `tree-sitter`, `networkx`, `qdrant-client`, and async REST APIs. |
| **AST Parsing Engine** | **`tree-sitter` (v0.23+)** (`tree-sitter-python`, `tree-sitter-javascript`, `tree-sitter-typescript`, `tree-sitter-java`) | Incremental, error-tolerant deterministic AST extraction across the 4 target languages. |
| **Knowledge Graph Engine** | **`NetworkX` (`nx.DiGraph`)** + JSON persistence | Zero-config in-memory directed graph traversal, PageRank criticality, ancestor/descendant blast-radius queries, and instant serialization to `node_link_data`. |
| **Vector Database** | **`qdrant-client` (Local Disk Mode: `path="./data/qdrant"`)** | Runs 100% locally in-process without requiring Docker Desktop to be running during development. |
| **Metadata Storage** | **SQLite (`./data/codeintel.db`) via SQLAlchemy 2.0** | Stores repository inventory, indexing status, file hashes (for incremental indexing), and saved impact reports with zero external server overhead. |
| **Local Embedding Model** | **Ollama: `mxbai-embed-large:latest`** (`1024` dims) | Already installed on developer laptop (`468836162de7`, 669 MB). Fast, high-accuracy retrieval. |
| **Local Reasoning LLM** | **Ollama: `qwen2.5:7b-instruct`** | Already installed on developer laptop (`845dbda0ea48`, 4.7 GB). Fits comfortably inside RTX 4060 8 GB VRAM. |
| **Structured AI Output** | **`pydantic-ai` or structured JSON schema via `httpx` to Ollama `/api/chat`** | Enforces strict JSON responses containing `answer`, `citations[]`, and `execution_steps[]`. |
| **Frontend Framework** | **Next.js 15 (App Router) + TypeScript + Tailwind CSS + Lucide Icons** | Fast, modern dark-mode developer dashboard. |
| **Graph Visualization** | **`@xyflow/react` (React Flow v12) + `dagre`** | Renders interactive module/call dependency graphs with automatic hierarchical node positioning so nodes never overlap at `(0,0)`. |

### 1.4 Success Criteria

| Metric / Deliverable | Target |
| :--- | :--- |
| **Supported Languages** | Python (`.py`), JavaScript (`.js`, `.jsx`), TypeScript (`.ts`, `.tsx`), Java (`.java`) |
| **CLI Standalone Demo** | `python -m app.cli analyze ./data/sample_ecommerce` outputs file/function/class/import/call counts and writes `graph.json`, `analysis_report.json`, and `dependencies.json` |
| **Indexing Speed** | 100-file repository parsed into AST + Knowledge Graph in $< 5$ seconds; embedded in $< 25$ seconds on RTX 4060 |
| **Graph Query Latency** | Dependency traversal and Blast-Radius Impact Report generated in $< 100$ ms |
| **Grounded Q&A Accuracy** | 100% of file paths and line numbers cited in AI answers exist in the indexed repository (verified by automated citation validator) |
| **Frontend Dashboard** | All 5 tabs working end-to-end: `Overview`, `Code Explorer`, `Knowledge Graph`, `AI Assistant`, and `Impact Analysis` |

---

## 2. Complete Repository Architecture

```text
codebase-intelligence/
├── AGENTS.md                              # Canonical instructions for every AI agent (Appendix F.1)
├── HANDOFF.md                             # Active task handoff state (updated every task; Appendix E.2)
├── PROGRESS.md                            # Master task checklist with statuses & commit hashes (Appendix E.1)
├── README.md                              # Project documentation, quickstart, architecture, benchmarks
├── .gitignore                             # Ignores data/, logs/, venvs, node_modules/, .next/, *.db
├── .gitattributes                         # * text=auto eol=lf
├── .env.example                           # Environment variable template
├── .github/
│   ├── copilot-instructions.md            # Thin pointer to AGENTS.md
│   └── workflows/ci.yml                   # Automated lint & pytest/vitest workflow
├── .cursor/
│   └── rules/codeintel.mdc                # Thin pointer to AGENTS.md
├── docs/
│   ├── MASTER_PLAN.md                     # This complete specification
│   ├── plan/                              # Per-phase split files created by scripts/split_plan.py
│   ├── decision_log.md                    # Architectural decision record
│   ├── architecture.md                    # System diagrams & data flow
│   └── api.md                             # Exported REST API documentation
├── scripts/
│   ├── status.py                          # Session-start status printer (Appendix F.2)
│   ├── split_plan.py                      # Splits MASTER_PLAN.md into docs/plan/phase_N.md (Appendix F.3)
│   ├── tasks.py                           # Cross-platform task runner: setup, lint, test, test-fast, serve, demo (Appendix F.4)
│   ├── create_sample_repo.py              # Generates a realistic 14-file multi-language sample ecommerce repo for testing/demos
│   └── benchmark.py                       # Runs automated evaluation & saves results/benchmarks.json
├── data/                                  # Git-ignored runtime storage
│   ├── repos/                             # Cloned/extracted target repositories
│   ├── graphs/                            # Serialized NetworkX JSON graphs ({repo_id}_graph.json)
│   ├── qdrant/                            # Local embedded Qdrant vector storage
│   └── codeintel.db                       # SQLite database for repository metadata
├── results/                               # Committed benchmark & evaluation outputs
│   └── benchmarks.json                    # Indexing speed, graph stats, citation accuracy metrics
├── backend/
│   ├── pyproject.toml                     # Python package & dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                        # FastAPI app entrypoint & CORS config
│   │   ├── cli.py                         # CLI entrypoint (`python -m app.cli analyze <path>`)
│   │   ├── config.py                      # Pydantic Settings (Ollama URL, models, paths, limits)
│   │   ├── db.py                          # SQLAlchemy SQLite setup & Repository record model
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── repository.py              # Pydantic models for ingestion, stats, file tree
│   │   │   ├── graph.py                   # Pydantic models for nodes, edges, React Flow format
│   │   │   ├── assistant.py               # Pydantic models for Q&A request, grounded answer, citations
│   │   │   └── impact.py                  # Pydantic models for Change Impact Report & Risk Score
│   │   ├── services/
│   │   │   ├── repository/
│   │   │   │   ├── manager.py             # Git clone, local path / ZIP extraction, ignore rules, SHA-256 file hashing
│   │   │   │   └── language_detector.py   # Extension & framework detection (package.json, pyproject.toml, pom.xml)
│   │   │   ├── parser/
│   │   │   │   ├── tree_sitter_engine.py  # Tree-sitter parser initialization & AST walker
│   │   │   │   ├── extractors.py          # Language-specific extractors (JS/TS, Python, Java) for classes, functions, imports, calls, API routes
│   │   │   │   └── chunker.py             # AST-boundary semantic code chunker with signature & line numbers
│   │   │   ├── graph/
│   │   │   │   ├── builder.py             # Builds NetworkX DiGraph from extracted entities
│   │   │   │   ├── resolver.py            # Cross-file symbol table & import/call edge resolver
│   │   │   │   └── queries.py             # Graph traversal helpers (callers, callees, shortest path, PageRank, subgraphs)
│   │   │   ├── embeddings/
│   │   │   │   ├── ollama_client.py       # Async httpx wrapper for Ollama (`mxbai-embed-large:latest` & `qwen2.5:7b-instruct`)
│   │   │   │   └── vector_store.py        # Qdrant local client wrapper (upsert, semantic search, filter by repo_id)
│   │   │   ├── retrieval/
│   │   │   │   └── hybrid_rag.py          # Combines Qdrant semantic chunks + NetworkX 1-hop neighborhood + citation validator
│   │   │   └── impact/
│   │   │       └── analyzer.py            # Computes upstream blast radius, affected routes/tests, and deterministic risk score
│   │   └── api/
│   │       └── routes.py                  # All REST API endpoints (/api/repositories/*)
│   └── tests/
│       ├── conftest.py                    # Fixtures including synthetic multi-file mini-repo
│       ├── test_ingestion.py
│       ├── test_parser.py
│       ├── test_graph.py
│       ├── test_impact.py
│       ├── test_rag.py
│       └── test_api.py
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/
│       │   ├── layout.tsx                 # Dark developer theme shell
│       │   ├── page.tsx                   # Main workspace with repo selector & 5-tab navigation
│       │   └── globals.css
│       ├── lib/
│       │   ├── api.ts                     # Typed fetch client for FastAPI backend
│       │   └── layout-graph.ts            # Dagre auto-layout converter for @xyflow/react nodes/edges
│       ├── types/
│       │   └── index.ts                   # TypeScript interfaces matching backend Pydantic schemas
│       └── components/
│           ├── Navbar.tsx                 # Repo ingestion modal, status badge, active repo switcher
│           ├── OverviewTab.tsx            # Language breakdown, file stats, central PageRank modules, architectural summary
│           ├── CodeExplorerTab.tsx        # File tree browser, symbol list, source code viewer with line highlighting
│           ├── KnowledgeGraphTab.tsx      # Interactive @xyflow/react canvas, node inspector, filter by node/edge type
│           ├── AssistantTab.tsx           # Grounded GraphRAG chat with clickable file:line citations & execution flow cards
│           └── ImpactAnalysisTab.tsx      # Target file/function selector, Blast-Radius subgraph, Risk Score badge & test coverage report
└── docker-compose.yml                     # Optional containerized deployment profile
```

---

## 3. Development Environment and Tooling (Windows 11)

### 3.1 Hardware & OS Profile
- **OS:** Windows 11 Home 64-bit (`PowerShell` default shell).
- **CPU:** Intel Core i7-14650HX.
- **RAM:** 16.0 GB (keep backend memory footprint $< 3$ GB).
- **GPU:** NVIDIA GeForce RTX 4060 Laptop GPU (8 GB VRAM) — dedicated to running Ollama inference.
- **Local Ollama Instance:** Running at `http://localhost:11434`.
  - Embeddings: `mxbai-embed-large:latest` (`1024` dimensions).
  - LLM: `qwen2.5:7b-instruct`.

### 3.2 Windows PowerShell Conventions
- Always use `pathlib.Path` in Python and convert paths to POSIX (`path.as_posix()`) when storing relative file IDs in the graph or database (e.g., `backend/services/userService.js`, never `backend\services\userService.js`) so graph node IDs are OS-independent.
- Activate Python virtual environment in PowerShell via:
  ```powershell
  .\backend\.venv\Scripts\Activate.ps1
  ```
- Run all automation through `python scripts/tasks.py <command>` rather than `Makefile`.

### 3.3 Core Dependencies

**Backend (`backend/pyproject.toml`):**
- `fastapi>=0.115.0`, `uvicorn[standard]>=0.32.0`, `pydantic>=2.9.0`, `pydantic-settings>=2.6.0`
- `tree-sitter>=0.23.0`, `tree-sitter-python>=0.23.0`, `tree-sitter-javascript>=0.23.0`, `tree-sitter-typescript>=0.23.0`, `tree-sitter-java>=0.23.0`
- `networkx>=3.4.0`
- `qdrant-client>=1.12.0`
- `sqlalchemy>=2.0.35`
- `httpx>=0.27.2`
- `gitpython>=3.1.43`
- `pytest>=8.3.0`, `pytest-asyncio>=0.24.0`, `ruff>=0.7.0`

**Frontend (`frontend/package.json`):**
- `next` (`15.x` or `14.2.x`), `react`, `react-dom`, `typescript`
- `@xyflow/react` (`^12.3.0`), `dagre` (`^0.8.5`), `@types/dagre`
- `lucide-react`, `clsx`, `tailwind-merge`, `tailwindcss`

---

## 4. Data, Schemas, and Interfaces

### 4.1 Canonical Graph Node Schema (`GraphNode`)

Every entity extracted from a repository is stored as a node in `NetworkX` and serialized to JSON:

```json
{
  "id": "backend/services/userService.js::authenticate",
  "label": "authenticate",
  "type": "function",
  "file_path": "backend/services/userService.js",
  "language": "javascript",
  "line_start": 14,
  "line_end": 28,
  "signature": "async function authenticate(credentials)",
  "docstring": "Validates user credentials against User model.",
  "parameters": ["credentials"],
  "parent_id": "backend/services/userService.js",
  "metrics": {
    "loc": 15,
    "in_degree": 3,
    "out_degree": 2,
    "pagerank": 0.0412
  }
}
```
- **Allowed `type` values:** `file`, `class`, `function`, `method`, `api_endpoint`, `model`.

### 4.2 Canonical Graph Edge Schema (`GraphEdge`)

```json
{
  "source": "backend/controllers/userController.js::loginUser",
  "target": "backend/services/userService.js::authenticate",
  "relation": "CALLS",
  "confidence": 1.0,
  "line": 8
}
```
- **Allowed `relation` values:**
  - `DECLARES` (`file` $\rightarrow$ `class`/`function`/`api_endpoint`/`model`, or `class` $\rightarrow$ `method`)
  - `IMPORTS` (`file` $\rightarrow$ `file`)
  - `CALLS` (`function`/`method`/`api_endpoint` $\rightarrow$ `function`/`method`)
  - `INHERITS` (`class` $\rightarrow$ `class`)
  - `ROUTES_TO` (`api_endpoint` $\rightarrow$ `function`/`method`)
  - `QUERIES` (`function`/`method` $\rightarrow$ `model`)

### 4.3 Semantic Code Chunk Schema (Stored in Qdrant Payload)

Collection Name: `code_chunks` (Vector size: `1024`, Distance: `Cosine`).

```json
{
  "chunk_id": "uuid5(repo_id + node_id)",
  "repo_id": "ecommerce-sample",
  "node_id": "backend/services/userService.js::authenticate",
  "node_type": "function",
  "name": "authenticate",
  "file_path": "backend/services/userService.js",
  "language": "javascript",
  "line_start": 14,
  "line_end": 28,
  "signature": "async function authenticate(credentials)",
  "code": "async function authenticate(credentials) {\n  return await User.findOne({ email: credentials.email });\n}",
  "context_header": "File: backend/services/userService.js | Function: authenticate(credentials) | Calls: User.findOne"
}
```

### 4.4 Change Impact ("Blast Radius") Report Schema (`ImpactReport`)

```json
{
  "repo_id": "ecommerce-sample",
  "target_node_id": "backend/services/paymentService.js",
  "target_type": "file",
  "risk_level": "High",
  "risk_score": 78.5,
  "risk_factors": [
    "Directly imported or called by 4 components across 3 modules",
    "Affects 2 public API endpoints (POST /checkout, POST /refund)",
    "High centrality in dependency graph (top 10% PageRank)"
  ],
  "direct_dependents": [
    {"id": "backend/controllers/paymentController.js", "type": "file", "relation": "IMPORTS"},
    {"id": "backend/controllers/orderController.js", "type": "file", "relation": "IMPORTS"}
  ],
  "transitive_dependents": [
    {"id": "backend/routes/checkoutRoutes.js", "type": "file", "hop_distance": 2},
    {"id": "POST /checkout", "type": "api_endpoint", "hop_distance": 2}
  ],
  "affected_api_endpoints": ["POST /checkout", "POST /refund"],
  "related_tests": ["backend/tests/payment.test.js"],
  "subgraph": {
    "nodes": [],
    "edges": []
  }
}
```

---

## 5. Architecture and Technical Design

### 5.1 System Processing Pipeline

```mermaid
flowchart TD
    User([Developer / UI / CLI]) --> NextJS[Next.js 15 Dashboard\n@xyflow/react + Tailwind]
    NextJS <-->|REST JSON API| FastAPI[FastAPI Backend]
    
    subgraph Ingestion_and_AST [1. Deterministic Analysis Engine]
        FastAPI --> RepoMgr[Repository Manager\nGit Clone / Local / ZIP]
        RepoMgr --> LangDet[Language & File Filter]
        LangDet --> TS[Tree-sitter AST Parser\nPython / JS / TS / Java]
        TS --> Resolver[Cross-File Symbol & Call Resolver]
    end

    subgraph Storage_Layer [2. Local Embedded Storage]
        Resolver --> NX[NetworkX Knowledge Graph\ndata/graphs/{id}_graph.json]
        Resolver --> Chunker[AST Function Chunker]
        Chunker -->|mxbai-embed-large\n1024-dim via Ollama| Qdrant[(Qdrant Local Vector Store\ndata/qdrant/)]
        RepoMgr --> SQLite[(SQLite Metadata DB\ndata/codeintel.db)]
    end

    subgraph Intelligence_Layer [3. Query & Impact Engine]
        NX --> Impact[Blast-Radius & Heuristic Risk Calculator]
        Qdrant --> Hybrid[Hybrid GraphRAG Retriever]
        NX -->|1-Hop & 2-Hop Call/Import Neighbors| Hybrid
        Hybrid -->|Grounded Context + File:Line| LLM[Ollama Local LLM\nqwen2.5:7b-instruct]
        LLM --> CiteCheck[Deterministic Citation Verifier]
    end

    Impact --> FastAPI
    CiteCheck --> FastAPI
```

### 5.2 Deterministic Heuristic Risk Scoring Formula (Module 5)

To guarantee that impact risk scores are transparent and never arbitrary LLM guesses, `app/services/impact/analyzer.py` calculates `risk_score` $\in [0, 100]$ deterministically:
1. **Direct Dependents Score ($S_{\text{direct}}$, max 35 pts):** $\min(35, \text{count}(\text{in\_edges}) \times 7)$
2. **Transitive Blast Radius Score ($S_{\text{trans}}$, max 25 pts):** $\min(25, \text{count}(\text{nx.ancestors}(G, \text{node})) \times 2.5)$
3. **API Exposure Score ($S_{\text{api}}$, max 20 pts):** $\min(20, \text{count}(\text{affected\_api\_endpoints}) \times 10)$
4. **Test Coverage Penalty ($S_{\text{test}}$, max 20 pts):** $0$ if at least 1 test file (`*test*` or `*spec*`) depends on the target or its direct callers; $+20$ penalty if **zero** test files cover the blast radius.
5. **Total Risk Score:** $S = S_{\text{direct}} + S_{\text{trans}} + S_{\text{api}} + S_{\text{test}}$
   - `Low`: $S < 30$
   - `Medium`: $30 \le S < 60$
   - `High`: $S \ge 60$

---

## 6. Phase-Wise Implementation Roadmap

| Phase | Name | Objective | Can Agent Run Autonomously? |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Scaffolding, Handoff System & Environment Verification | Repo layout, `AGENTS.md`, `status.py`, `tasks.py`, verify Ollama models & sample repo generator | Yes |
| **Phase 1** | Repository Ingestion & Deterministic AST Parser | Clone/read repo, filter files, extract classes/functions/imports/calls/APIs with `tree-sitter` | Yes |
| **Phase 2** | Cross-File Knowledge Graph & Blast-Radius Engine | Build `NetworkX` graph, resolve cross-file imports/calls, compute impact reports & CLI analyzer | Yes |
| **Phase 3** | Local Vector Indexing & Hybrid GraphRAG Assistant | Embed AST chunks with `mxbai-embed-large`, index in local Qdrant, answer queries via `qwen2.5:7b-instruct` | Yes |
| **Phase 4** | FastAPI Backend & REST Contract | Expose all 9 REST endpoints, SQLite persistence, full API integration tests | Yes |
| **Phase 5** | Next.js Visual Architecture Dashboard | Dark-mode UI with `Overview`, `Code Explorer`, `Knowledge Graph` (`@xyflow/react`), `AI Assistant`, `Impact Analysis` | Yes |
| **Phase 6** | Evaluation, Benchmarks, Demo Repo & Final Release | Automated benchmark suite, citation verification test, README, architecture docs | Yes |

---

## Phase 0 — Scaffolding, Handoff System & Environment Verification

**Objective:** Initialize the repository structure, multi-agent handoff files, cross-platform task runner, Python virtual environment, and a realistic multi-language sample repository (`sample_ecommerce`) so every subsequent phase has a deterministic testbed.

### Tasks

- [ ] **P0-01** Create the directory tree defined in Section 2 (`backend/app/...`, `backend/tests/`, `scripts/`, `docs/`, `data/`, `results/`). Create `.gitignore`, `.gitattributes`, and `.env.example` (Appendix C.1).
- [ ] **P0-02** Create `AGENTS.md` (Appendix F.1), `PROGRESS.md` (Appendix E.1), `HANDOFF.md` (Appendix E.2), `docs/decision_log.md`, `.github/copilot-instructions.md`, and `.cursor/rules/codeintel.mdc`. Copy this blueprint to `docs/MASTER_PLAN.md` and implement + run `python scripts/split_plan.py` (Appendix F.3) to populate `docs/plan/`.
- [ ] **P0-03** Implement `scripts/status.py` (Appendix F.2) and `scripts/tasks.py` (Appendix F.4) supporting `setup`, `lint`, `test`, `test-fast`, `analyze-sample`, `serve`, `benchmark`, and `status`.
- [ ] **P0-04** Create `backend/pyproject.toml` with all dependencies from Section 3.3. Create the virtual environment `backend/.venv`, install dependencies, and verify `tree_sitter`, `networkx`, `qdrant_client`, `fastapi`, and `sqlalchemy` import cleanly.
- [ ] **P0-05** Implement `scripts/create_sample_repo.py` and run it to generate `data/sample_ecommerce/`—a realistic 14-file repository containing:
  - Express/JS backend routes (`backend/routes/userRoutes.js`, `backend/routes/checkoutRoutes.js`)
  - Controllers (`backend/controllers/userController.js`, `backend/controllers/paymentController.js`, `backend/controllers/orderController.js`)
  - Services (`backend/services/userService.js`, `backend/services/paymentService.js`, `backend/services/refundService.js`, `backend/middleware/authMiddleware.js`)
  - Models (`backend/models/User.js`, `backend/models/Order.js`)
  - Python analytics microservice (`analytics/fraud_detector.py`, `analytics/scorer.py`)
  - Tests (`backend/tests/payment.test.js`, `backend/tests/auth.test.js`)
  - `package.json` and `README.md`
  *(This guarantees all examples from the blueprint—such as `POST /login` $\rightarrow$ `loginUser()` $\rightarrow$ `authenticate()` $\rightarrow$ `User` and `paymentService.js` impact analysis—can be tested deterministically).*
- [ ] **P0-06** Verify local Ollama connectivity (`http://localhost:11434/api/tags`) via a diagnostic check in `scripts/tasks.py`, confirming `mxbai-embed-large:latest` and `qwen2.5:7b-instruct` are available, and record hardware/model specs in `docs/decision_log.md`.

### Acceptance Criteria (Phase 0)
- `python scripts/status.py` executes cleanly and displays the task table and `HANDOFF.md`.
- `docs/plan/` contains individual markdown files for every phase and appendix.
- `data/sample_ecommerce/` exists with 14+ interconnected JS and Python source files.
- `python scripts/tasks.py test-fast` runs `pytest` and exits with code `0`.

---

## Phase 1 — Repository Ingestion & Deterministic AST Parser

**Objective:** Build Module 1 (Repository Analyzer) and the Tree-sitter AST extraction engine capable of parsing JavaScript, TypeScript, Python, and Java files into structured entities (`File`, `Class`, `Function`, `Method`, `Import`, `Call`, `API`, `Model`).

### Tasks

- [ ] **P1-01** Implement `backend/app/config.py` using `pydantic-settings` (defaulting `OLLAMA_BASE_URL="http://localhost:11434"`, `EMBEDDING_MODEL="mxbai-embed-large:latest"`, `EMBEDDING_DIM=1024`, `LLM_MODEL="qwen2.5:7b-instruct"`, `MAX_FILES=300`) and `backend/app/schemas/repository.py` + `backend/app/schemas/graph.py`.
- [ ] **P1-02** Implement `backend/app/services/repository/language_detector.py` and `manager.py`:
  - Accept a local folder path, `.zip` upload, or GitHub HTTPS URL (`git.Repo.clone_from(..., depth=1)`).
  - Enforce ignored directories (`node_modules`, `.git`, `.next`, `dist`, `build`, `venv`, `.venv`, `__pycache__`, `coverage`).
  - Detect languages by extension (`.py`, `.js`, `.jsx`, `.ts`, `.tsx`, `.java`), detect frameworks from `package.json` / `pyproject.toml` / `requirements.txt` / `pom.xml`, compute SHA-256 hashes per file for incremental indexing, and return a `RepositoryInventory` object.
  - Add unit tests in `backend/tests/test_ingestion.py`.
- [ ] **P1-03** Implement `backend/app/services/parser/tree_sitter_engine.py` and `extractors.py`:
  - Initialize Tree-sitter parsers for Python, JavaScript, TypeScript, and Java.
  - Extract **Classes** (name, line range, base classes/interfaces, docstring/comments).
  - Extract **Functions & Methods** (name, parameters, line range, parent class if method, docstring/comments, body snippet).
  - Extract **Imports** (imported symbol names, module path/source string, line number).
  - Extract **Call Expressions** (caller function/method scope, called function/method/object name, line number).
  - Extract **API Endpoints** (detect Express `router.get/post/put/delete("/path", handler)`, FastAPI `@app.get/post("/path")`, and Spring `@GetMapping/@PostMapping` annotations, mapping HTTP verb + route path to handler function).
  - Extract **Database Models** (detect Mongoose/Sequelize/Prisma/SQLAlchemy/JPA model classes or schemas, e.g., `User`, `Order`).
- [ ] **P1-04** Implement `backend/app/services/parser/chunker.py`:
  - Convert extracted AST entities (`function`, `method`, `class`, `api_endpoint`) into semantic `CodeChunk` objects containing `context_header` (file path + parent class + signature + outgoing calls), source code lines, and exact `line_start` / `line_end`.
- [ ] **P1-05** Write comprehensive unit tests in `backend/tests/test_parser.py` verifying AST extraction on Python, JS/TS, and Java snippets, plus full parsing of `data/sample_ecommerce/`.

### Acceptance Criteria (Phase 1)
- `pytest backend/tests/test_ingestion.py backend/tests/test_parser.py -q` passes 100%.
- Parsing `data/sample_ecommerce/` accurately discovers all files, routes (`POST /login`, `POST /checkout`), controllers, services, models (`User`, `Order`), and Python functions with exact line numbers.

---

## Phase 2 — Cross-File Knowledge Graph & Blast-Radius Engine

**Objective:** Build Module 2 (Code Knowledge Graph), Module 5 (Dependency & Impact Analysis), and the standalone CLI analyzer (`python -m app.cli analyze <path>`) matching Section 10 of the project blueprint.

### Tasks

- [ ] **P2-01** Implement `backend/app/services/graph/resolver.py`:
  - Build a cross-file **Symbol Table** indexing every declared file, class, function, method, model, and API route across the repository.
  - Resolve relative and package import paths (e.g., `import { authenticate } from "../services/userService"` in `userController.js` resolves to `backend/services/userService.js::authenticate`).
  - Resolve call sites (`userService.authenticate(...)`, `User.findOne(...)`, `scorer.compute_risk(...)`) to their target node IDs with confidence scores (`1.0` for explicit import match, `0.7` for unique symbol name match).
- [ ] **P2-02** Implement `backend/app/services/graph/builder.py` and `queries.py`:
  - Construct a `networkx.DiGraph` with typed nodes (`file`, `class`, `function`, `method`, `api_endpoint`, `model`) and typed edges (`DECLARES`, `IMPORTS`, `CALLS`, `INHERITS`, `ROUTES_TO`, `QUERIES`).
  - Compute node centrality (`nx.pagerank`) and degree metrics (`in_degree`, `out_degree`) and attach them to node attributes.
  - Implement query helpers: `get_callers(node_id)`, `get_callees(node_id)`, `get_execution_path(source_id, target_id)`, `get_file_dependencies(file_path)`, and `export_react_flow_graph(filter_type=None)`.
  - Save and load graphs from `data/graphs/{repo_id}_graph.json`.
- [ ] **P2-03** Implement `backend/app/services/impact/analyzer.py` and `backend/app/schemas/impact.py`:
  - Given any `target_node_id` (file, class, or function), traverse reverse edges (`G.predecessors` and `nx.ancestors`) to identify all direct dependents, transitive dependents (with hop distances), affected API endpoints (`type == "api_endpoint"`), and related test files (`"test"` or `"spec"` in file path).
  - Calculate the deterministic `risk_score` (0–100) and `risk_level` (`Low`, `Medium`, `High`) using the exact formula in Section 5.2, plus human-readable `risk_factors`.
  - Return the affected subgraph (`nodes` and `edges`) for visual highlighting in the UI.
- [ ] **P2-04** Implement the CLI tool `backend/app/cli.py`:
  - Command: `python -m app.cli analyze <repo_path> --output-dir ./data/cli_out`
  - Prints the formatted console summary banner (`CODEBASE INTELLIGENCE ANALYZER`: Files discovered, Files parsed, Functions discovered, Classes discovered, Imports discovered, Call relationships, Knowledge graph Nodes & Edges) and writes `graph.json`, `analysis_report.json`, and `dependencies.json`.
- [ ] **P2-05** Add unit tests in `backend/tests/test_graph.py` and `backend/tests/test_impact.py` verifying:
  - The chain `POST /login` $\rightarrow$ `loginUser` $\rightarrow$ `authenticate` $\rightarrow$ `User` exists in the `sample_ecommerce` graph.
  - Modifying `backend/services/paymentService.js` flags `paymentController.js`, `orderController.js`, `checkoutRoutes.js`, `refundService.js`, identifies `payment.test.js`, and assigns `risk_level == "High"`.

### Acceptance Criteria (Phase 2)
- Running `python scripts/tasks.py analyze-sample` executes `python -m app.cli analyze ./data/sample_ecommerce` in $< 3$ seconds and outputs `graph.json`, `analysis_report.json`, and `dependencies.json`.
- All graph traversal and impact analysis tests in `pytest` pass.

---

## Phase 3 — Local Vector Indexing & Hybrid GraphRAG Assistant

**Objective:** Build Module 3 (Semantic Code Search) and Module 4 (AI Codebase Assistant) using local Qdrant + Ollama (`mxbai-embed-large:latest` and `qwen2.5:7b-instruct`) with strict citation verification.

### Tasks

- [ ] **P3-01** Implement `backend/app/services/embeddings/ollama_client.py`:
  - Async `httpx` client communicating with `http://localhost:11434`.
  - `embed_texts(texts: list[str]) -> list[list[float]]` calling `/api/embed` with `model="mxbai-embed-large:latest"`.
  - `generate_structured_answer(system_prompt: str, user_prompt: str, json_schema: dict) -> dict` calling `/api/chat` with `model="qwen2.5:7b-instruct"`, `format=json_schema`, and `options={"temperature": 0.1, "num_ctx": 8192}`.
  - Include automatic fallback/mock mode (`USE_MOCK_AI=true` in test fixtures) so unit tests run fast without waiting on GPU inference, plus a real integration test against local Ollama.
- [ ] **P3-02** Implement `backend/app/services/embeddings/vector_store.py`:
  - Initialize `QdrantClient(path="./data/qdrant")`.
  - Create collection `code_chunks` with `size=1024` (`Distance.COSINE`).
  - Implement `index_chunks(repo_id, chunks)` (skipping unchanged chunks via SHA-256 hash check) and `semantic_search(repo_id, query_vector, limit=6) -> list[dict]`.
- [ ] **P3-03** Implement `backend/app/services/retrieval/hybrid_rag.py` and `backend/app/schemas/assistant.py`:
  - Given a user question (e.g., *"How does user authentication work in this project?"*):
    1. Embed the question via `mxbai-embed-large:latest`.
    2. Retrieve top-6 semantic code chunks from Qdrant for `repo_id`.
    3. For each retrieved chunk's `node_id`, traverse the `NetworkX` knowledge graph (1-hop callers, 1-hop callees, connected API routes, and queried models) and fetch their metadata and code snippets.
    4. Construct the grounded prompt (Appendix D) containing numbered evidence items with exact `file_path`, `line_start`, `line_end`, and graph relationships.
    5. Query `qwen2.5:7b-instruct` to return a structured `AssistantResponse` (`answer_markdown`, `execution_steps[]`, `citations[]`, `related_nodes[]`).
    6. **Citation Sanitizer:** Verify every returned citation against the repository's `NetworkX` graph; strip or flag any citation whose `file_path` does not exist in the repository.
- [ ] **P3-04** Add unit and integration tests in `backend/tests/test_rag.py` testing both semantic code search (finding admin/auth checks without matching exact function names) and hybrid GraphRAG question answering with verified citations.

### Acceptance Criteria (Phase 3)
- Semantic search on `sample_ecommerce` for *"verify whether a user is allowed to access protected routes"* retrieves `authMiddleware.js` in the top 3 results.
- Hybrid RAG answer for *"How does user authentication work?"* includes verified citations to `userRoutes.js`, `userController.js`, `userService.js`, and `User.js`.

---

## Phase 4 — FastAPI Backend & REST Contract

**Objective:** Expose the analysis engine, knowledge graph, semantic search, AI assistant, and blast-radius impact analyzer via clean, documented FastAPI endpoints backed by SQLite metadata persistence.

### Tasks

- [ ] **P4-01** Implement `backend/app/db.py`:
  - SQLAlchemy 2.0 SQLite engine (`sqlite:///./data/codeintel.db`).
  - Table `repositories`: `id`, `name`, `source_type` (`local` | `git` | `zip`), `source_path`, `status` (`ready` | `indexing` | `failed`), `languages_json`, `stats_json`, `created_at`, `updated_at`.
- [ ] **P4-02** Implement `backend/app/api/routes.py` and `backend/app/main.py` (with CORS enabled for `http://localhost:3000`):
  - `GET /api/health` — System health, Ollama reachability, active models (`mxbai-embed-large:latest`, `qwen2.5:7b-instruct`).
  - `POST /api/repositories` — Ingest a repository (accepts `{ "source": "<url_or_local_path>", "name": "..." }` or auto-loads `sample_ecommerce`), runs AST + Graph + Vector indexing, and returns the `RepositorySummary`.
  - `GET /api/repositories` — List all indexed repositories.
  - `GET /api/repositories/{id}` — Detailed overview stats, language breakdown, top PageRank central modules, and file inventory.
  - `GET /api/repositories/{id}/files/content?path=...` — Returns raw source code and extracted symbols for a specific file (powers the Code Explorer tab).
  - `GET /api/repositories/{id}/graph` — Returns nodes and edges formatted for `@xyflow/react` (supports query filters: `node_type`, `directory`, `search`, `focus_node_id`, `hops`).
  - `GET /api/repositories/{id}/search?q=...` — Semantic + symbol search across the repository.
  - `POST /api/repositories/{id}/ask` — Hybrid GraphRAG AI Assistant endpoint returning grounded answer, execution flow steps, and file/line citations.
  - `POST /api/repositories/{id}/impact-analysis` — Accepts `{ "target_id": "..." }` and returns the full `ImpactReport` (affected files, routes, tests, risk score, and blast-radius subgraph).
- [ ] **P4-03** Auto-seed `sample_ecommerce` on backend startup if no repositories exist in SQLite so the dashboard has rich data immediately upon first launch.
- [ ] **P4-04** Write comprehensive API tests in `backend/tests/test_api.py` using FastAPI `TestClient` covering all 9 endpoints and export the OpenAPI spec summary to `docs/api.md`.

### Acceptance Criteria (Phase 4)
- `pytest backend/tests/test_api.py -q` passes 100%.
- Starting `uvicorn app.main:app` and calling `GET /api/health` and `GET /api/repositories` returns 200 OK with valid JSON.

---

## Phase 5 — Next.js Visual Architecture Dashboard (`@xyflow/react`)

**Objective:** Build Module 6 (Visual Architecture Explorer) as a sleek, dark-mode Next.js developer dashboard containing all 5 sections defined in the blueprint (`Overview`, `Code Explorer`, `Knowledge Graph`, `AI Assistant`, and `Impact Analysis`).

### Tasks

- [ ] **P5-01** Initialize `frontend/` with Next.js (TypeScript, Tailwind CSS, App Router) and install `@xyflow/react`, `dagre`, `@types/dagre`, `lucide-react`, `clsx`, and `tailwind-merge`. Configure dark slate/zinc theme (`bg-slate-950 text-slate-100`).
- [ ] **P5-02** Create `frontend/src/types/index.ts`, `frontend/src/lib/api.ts` (typed client talking to `http://localhost:8000/api`), and `frontend/src/lib/layout-graph.ts` (uses `dagre` to calculate clean `LR` and `TB` hierarchical `(x, y)` coordinates for `@xyflow/react` nodes so graphs never stack at `(0,0)`).
- [ ] **P5-03** Implement `Navbar.tsx`, `OverviewTab.tsx`, and `CodeExplorerTab.tsx`:
  - **Navbar:** Repository switcher dropdown, "+ Analyze Repository" modal (supports entering any local path, GitHub URL, or 1-click "Load Sample E-Commerce Repo"), and Ollama model status badge.
  - **Overview Tab:** Metric cards (Total Files, Functions, Classes, API Endpoints, Graph Edges), language distribution bar, Architectural Summary card, and Top Central Components table (sorted by PageRank with click-to-inspect).
  - **Code Explorer Tab:** Split-pane layout with filterable directory/file tree on the left, extracted file symbols (classes, functions, calls, imports) in the middle, and syntax-numbered source code viewer on the right (with line-range highlighting when navigated from a citation).
- [ ] **P5-04** Implement `KnowledgeGraphTab.tsx` using `@xyflow/react`:
  - Custom color-coded React Flow node cards by entity type (`file` = blue, `api_endpoint` = emerald, `function`/`method` = purple, `class` = amber, `model` = rose).
  - Controls for filtering by Node Type, Directory, or focusing on a 1-hop / 2-hop neighborhood around a selected node.
  - Interactive Side Inspector Panel: clicking any node highlights its incoming callers and outgoing callees, displays its signature/metrics, and offers a 1-click "Run Impact Analysis on This Node" button.
- [ ] **P5-05** Implement `AssistantTab.tsx` and `ImpactAnalysisTab.tsx`:
  - **AI Assistant Tab:** Chat interface with quick-prompt chips (*"Explain the complete authentication flow"*, *"Which files handle checkout and payment processing?"*, *"Where are tokens verified?"*), step-by-step Execution Flow visualizer, semantic search bar, and clickable source citation badges (`file_path:L14-L28`) that open the exact lines in the Code Explorer.
  - **Impact Analysis Tab:** Searchable selector for any file, class, or function; renders the **Change Impact Report** with Risk Level badge (`Low` / `Medium` / `High`), numerical Risk Score gauge (`0-100`), transparent risk reason bullets, lists of Direct Dependents, Affected API Routes, Related Test Files (`payment.test.js`), and an interactive `@xyflow/react` Blast-Radius Subgraph.
- [ ] **P5-06** Verify `npm run build` (or `npx tsc --noEmit`) in `frontend/` succeeds with zero TypeScript errors.

### Acceptance Criteria (Phase 5)
- `frontend` builds cleanly with zero TypeScript or ESLint errors.
- All 5 tabs render real data from the FastAPI backend with interactive React Flow graphs and clickable code citations.

---

## Phase 6 — Evaluation, Benchmarks, Demo Repo & Final Release

**Objective:** Run reproducible benchmarks (indexing speed, graph resolution accuracy, blast-radius recall, citation grounding rate), save metrics to `results/benchmarks.json`, and finalize documentation (`README.md`, `docs/architecture.md`).

### Tasks

- [ ] **P6-01** Implement `scripts/benchmark.py` (invoked via `python scripts/tasks.py benchmark`) that runs against `data/sample_ecommerce` and records real measured numbers into `results/benchmarks.json`:
  - AST parsing latency (ms) and files/sec.
  - Graph construction latency (ms), node count, edge count, and cross-file call resolution rate.
  - Impact analysis latency (ms) and verification that known ground-truth dependencies of `paymentService.js` and `userService.js` are 100% recalled.
  - Vector embedding latency (ms) with `mxbai-embed-large:latest` and Top-3 Recall on 5 benchmark intent queries.
  - End-to-end GraphRAG query latency (ms) with `qwen2.5:7b-instruct` and Citation Verification Rate (% of cited files/lines that exist in the repo).
- [ ] **P6-02** Create optional `docker-compose.yml` for containerized deployment and verify `python scripts/tasks.py demo` starts both FastAPI (`:8000`) and Next.js (`:3000`) cleanly on Windows.
- [ ] **P6-03** Write comprehensive `README.md` and `docs/architecture.md` containing system architecture diagrams, problem/solution overview, technology stack table, benchmark results from `results/benchmarks.json`, setup instructions, and step-by-step viva/demo script.

### Acceptance Criteria (Phase 6)
- `python scripts/tasks.py test` and `python scripts/tasks.py benchmark` pass and generate `results/benchmarks.json`.
- `README.md`, `docs/architecture.md`, `docs/api.md`, `PROGRESS.md`, and `HANDOFF.md` are complete and accurate.

---

## 7. Testing and Quality Assurance

- **Unit Tests (`backend/tests/test_ingestion.py`, `test_parser.py`, `test_graph.py`, `test_impact.py`):**
  - Verify ignored directories (`node_modules`, `.git`, `venv`) are never traversed.
  - Verify Tree-sitter accurately extracts functions, classes, methods, imports, calls, and API routes across Python, JS, TS, and Java.
  - Verify cross-file symbol resolution connects `POST /login` $\rightarrow$ `loginUser` $\rightarrow$ `authenticate` $\rightarrow$ `User`.
  - Verify heuristic impact risk score is deterministic and flags missing test coverage.
- **Integration & RAG Tests (`backend/tests/test_rag.py`, `test_api.py`):**
  - Verify Qdrant local storage indexes 1024-dim vectors and filters by `repo_id`.
  - Verify citation sanitizer strips any hallucinated file path before returning to the client.
  - Verify all 9 FastAPI endpoints return 200 OK and conform to Pydantic schemas.
- **Frontend Verification:**
  - `npx tsc --noEmit` in `frontend/` must pass with zero errors.

---

## 8. Evaluation and Benchmarking

All metrics reported in `README.md` must be generated by `scripts/benchmark.py` and saved in `results/benchmarks.json`:
1. **Throughput & Latency:** AST parse time per file (ms), Graph build time (ms), Blast-Radius traversal time (ms), Embedding time per chunk (ms), LLM synthesis time (s).
2. **Retrieval Quality:** Hit@3 on semantic intent queries where query keywords do not match function names.
3. **Citation Fidelity:** Percentage of citations in `AssistantResponse.citations` where `file_path` exists in the repository and `line_start <= line_end <= file_max_lines` (Target: **100%** via post-processing verifier).

---

## 9. Deployment and Integration

### 9.1 Local Native Execution (Recommended on Windows 11)
1. Ensure Ollama is running locally (`ollama serve`) with `mxbai-embed-large:latest` and `qwen2.5:7b-instruct`.
2. Setup everything: `python scripts/tasks.py setup`
3. Start backend + frontend: `python scripts/tasks.py demo`
   - Backend API & Swagger UI: `http://localhost:8000/docs`
   - Frontend Next.js Dashboard: `http://localhost:3000`

---

## 10. Final Documentation and Release

Final release checklist:
- [ ] All tasks `P0-01` through `P6-03` marked `DONE` in `PROGRESS.md`.
- [ ] `python scripts/tasks.py analyze-sample` produces `graph.json`, `analysis_report.json`, and `dependencies.json`.
- [ ] `python scripts/tasks.py test` passes 100% of backend tests.
- [ ] `results/benchmarks.json` contains real execution metrics from the laptop.
- [ ] `README.md` includes a 3-minute demonstration script for evaluators.

---

## Appendices

## Appendix A — AST Extraction & Graph Relationship Specifications

| Language | Function / Method AST Nodes | Class AST Nodes | Import AST Nodes | Call AST Nodes |
| :--- | :--- | :--- | :--- | :--- |
| **Python** | `function_definition` | `class_definition` | `import_statement`, `import_from_statement` | `call` |
| **JavaScript / TypeScript** | `function_declaration`, `method_definition`, `arrow_function` (assigned to `variable_declarator`) | `class_declaration` | `import_statement`, `call_expression` (`require`) | `call_expression` |
| **Java** | `method_declaration`, `constructor_declaration` | `class_declaration`, `interface_declaration` | `import_declaration` | `method_invocation` |

---

## Appendix B — REST API Contract

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns backend status, Ollama reachability, and configured models |
| `POST` | `/api/repositories` | Clones/analyzes a repo path or URL, builds graph + embeddings |
| `GET` | `/api/repositories` | Lists all analyzed repositories |
| `GET` | `/api/repositories/{id}` | Returns overview stats, language breakdown, central modules |
| `GET` | `/api/repositories/{id}/files/content` | Returns source code and symbols for `?path=<relative_path>` |
| `GET` | `/api/repositories/{id}/graph` | Returns nodes & edges for React Flow (`?node_type=&focus_node_id=&hops=`) |
| `GET` | `/api/repositories/{id}/search` | Semantic vector + symbol search (`?q=<query>&limit=8`) |
| `POST` | `/api/repositories/{id}/ask` | Hybrid GraphRAG Q&A (`{"question": "..."}`) with grounded citations |
| `POST` | `/api/repositories/{id}/impact-analysis` | Generates Blast-Radius Change Impact Report (`{"target_id": "..."}`) |

---

## Appendix C — Configuration Files

### C.1 `.env.example`

```ini
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=mxbai-embed-large:latest
EMBEDDING_DIM=1024
LLM_MODEL=qwen2.5:7b-instruct
DATA_DIR=./data
MAX_FILES=300
MAX_FILE_SIZE_KB=500
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## Appendix D — Grounded GraphRAG Prompt & Citation Protocol

System prompt enforced in `backend/app/services/retrieval/hybrid_rag.py`:

```text
You are a deterministic Codebase Intelligence Assistant.
You must answer the developer's question using ONLY the provided Retrieved Code Chunks and Knowledge Graph Relationships.

STRICT RULES:
1. Never invent file paths, function names, class names, or line numbers.
2. Every architectural claim MUST reference the exact `file_path` and `line_start`-`line_end` provided in the context.
3. Trace execution flows step-by-step following the `CALLS`, `ROUTES_TO`, `IMPORTS`, and `QUERIES` edges shown in the Graph Context.
4. Respond strictly in valid JSON matching the required schema:
   {
     "answer_markdown": "Detailed explanation with inline `file_path:Lstart-Lend` references...",
     "execution_steps": [
       {"step": 1, "component": "POST /login", "file_path": "backend/routes/userRoutes.js", "description": "Receives login credentials and routes to loginUser"}
     ],
     "citations": [
       {"file_path": "backend/routes/userRoutes.js", "symbol": "POST /login", "line_start": 5, "line_end": 8, "snippet": "router.post('/login', loginUser);"}
     ]
   }
```

---

## Appendix E — Templates (`PROGRESS.md`, `HANDOFF.md`, Resume Prompts)

### E.1 `PROGRESS.md`

```markdown
# Progress

**Current phase:** 0  |  **Branch:** main  |  **Last updated:** 2026-10-31  |  **Last agent/tool:** initialization

## Task table
| ID | Phase | Task (short) | Status | Commit | Notes |
|----|-------|--------------|--------|--------|-------|
| P0-01 | 0 | Repo directory tree and ignore files | TODO | | |
| P0-02 | 0 | AGENTS/HANDOFF/PROGRESS files and split_plan.py | TODO | | |
| P0-03 | 0 | Implement status.py and tasks.py runner | TODO | | |
| P0-04 | 0 | Backend pyproject.toml and venv installation | TODO | | |
| P0-05 | 0 | Generate sample_ecommerce multi-language test repo | TODO | | |
| P0-06 | 0 | Verify local Ollama models and log environment | TODO | | |
| P1-01 | 1 | Config settings and Pydantic schemas | TODO | | |
| P1-02 | 1 | Repository ingestion manager and language detector | TODO | | |
| P1-03 | 1 | Tree-sitter multi-language AST extractor | TODO | | |
| P1-04 | 1 | AST-boundary semantic code chunker | TODO | | |
| P1-05 | 1 | Phase 1 unit tests for ingestion and AST parsing | TODO | | |
| P2-01 | 2 | Cross-file symbol table and import/call resolver | TODO | | |
| P2-02 | 2 | NetworkX knowledge graph builder and query helpers | TODO | | |
| P2-03 | 2 | Deterministic Blast-Radius impact analyzer | TODO | | |
| P2-04 | 2 | CLI analyzer tool (`python -m app.cli analyze`) | TODO | | |
| P2-05 | 2 | Phase 2 unit tests for graph and impact analysis | TODO | | |
| P3-01 | 3 | Async Ollama client (`mxbai-embed-large` + `qwen2.5:7b-instruct`) | TODO | | |
| P3-02 | 3 | Embedded local Qdrant vector store service | TODO | | |
| P3-03 | 3 | Hybrid GraphRAG retriever and citation verifier | TODO | | |
| P3-04 | 3 | Phase 3 unit and integration tests for RAG | TODO | | |
| P4-01 | 4 | SQLite SQLAlchemy repository metadata database | TODO | | |
| P4-02 | 4 | FastAPI REST endpoints (`/api/repositories/*`) | TODO | | |
| P4-03 | 4 | Startup auto-seeding of sample_ecommerce repo | TODO | | |
| P4-04 | 4 | FastAPI endpoint integration tests and docs/api.md | TODO | | |
| P5-01 | 5 | Initialize Next.js frontend with Tailwind and React Flow | TODO | | |
| P5-02 | 5 | Frontend API client and Dagre graph auto-layout | TODO | | |
| P5-03 | 5 | Navbar, OverviewTab, and CodeExplorerTab | TODO | | |
| P5-04 | 5 | Interactive KnowledgeGraphTab (`@xyflow/react`) | TODO | | |
| P5-05 | 5 | AssistantTab and ImpactAnalysisTab UI | TODO | | |
| P5-06 | 5 | Frontend TypeScript and build verification | TODO | | |
| P6-01 | 6 | Automated benchmark script and results/benchmarks.json | TODO | | |
| P6-02 | 6 | Optional docker-compose.yml and demo task script | TODO | | |
| P6-03 | 6 | Final README.md, architecture docs, and release check | TODO | | |
```

### E.2 `HANDOFF.md`

```markdown
# Handoff

**Updated:** 2026-10-31  |  **By:** Master Plan Initializer  |  **Branch:** main  |  **Last commit:** none

## Current task
- ID: P0-01 — Create repo directory tree and ignore files
- State: not started

## Done in this task so far
- Master plan created at `docs/MASTER_PLAN.md`.

## Exact next step
- Create the repository folders, `.gitignore`, `.gitattributes`, `.env.example`, and then proceed to P0-02 (`AGENTS.md`, `PROGRESS.md`, `scripts/split_plan.py`).

## Files touched
- `docs/MASTER_PLAN.md`

## Commands to run first
    python scripts/status.py

## Known problems / gotchas
- Use `mxbai-embed-large:latest` (1024 dims) and `qwen2.5:7b-instruct` in Ollama. Do not require Docker.
```

### E.3 Resume Prompts (Copy-Paste into Your AI Coding Agent)

1. **First Session Kickoff Prompt:**
   > "Read `docs/MASTER_PLAN.md`. Begin at Phase 0 (`P0-01` through `P0-06`) to initialize the repository structure, `AGENTS.md`, `PROGRESS.md`, `HANDOFF.md`, `scripts/split_plan.py`, `scripts/status.py`, `scripts/tasks.py`, and the sample repository. Follow all rules in Section 0: work on one task ID at a time, run tests after each task, update `PROGRESS.md` and `HANDOFF.md`, and commit after each completed task."
2. **Standard Resume / Next Agent Prompt:**
   > "Read `AGENTS.md` in the repository root. Run `python scripts/status.py`, read `HANDOFF.md`, and read only the current phase file in `docs/plan/phase_N.md`. Continue from the current `IN_PROGRESS` or next `TODO` task one task ID at a time, updating `PROGRESS.md` and `HANDOFF.md` at every task boundary."
3. **After a Mid-Task Token Cut-Off:**
   > "The previous agent session ran out of tokens. Read `AGENTS.md`, run `python scripts/status.py`, read `HANDOFF.md`, inspect `git status` and `git diff --stat`, run `python scripts/tasks.py test-fast`, and finish the active task before moving to the next ID."

---

## Appendix F — Agent Orchestration Scripts (`AGENTS.md`, `status.py`, `split_plan.py`, `tasks.py`)

### F.1 `AGENTS.md` (Place in Repository Root)

```markdown
# AGENTS.md — Canonical Operating Rules for All AI Coding Agents

1. **Repository is Memory:** Multiple AI agents work on this repo sequentially. Never rely on chat context. Everything must be recorded in `PROGRESS.md`, `HANDOFF.md`, `docs/decision_log.md`, and git commits.
2. **Mandatory Session Start:**
   - Run `python scripts/status.py`
   - Read `HANDOFF.md`
   - Read ONLY `docs/plan/phase_N.md` for the active phase (do not read the entire `docs/MASTER_PLAN.md` once split).
3. **One Task at a Time:**
   - Mark the task `IN_PROGRESS` in `PROGRESS.md` and `HANDOFF.md` before coding.
   - Run `python scripts/tasks.py test-fast` after implementing.
   - Mark `DONE` in `PROGRESS.md`, rewrite `HANDOFF.md` for the next task, and commit with `<TASK_ID>: <summary>`.
4. **Fixed Local Stack (Windows 11):**
   - Ollama models: `mxbai-embed-large:latest` (1024 dims) and `qwen2.5:7b-instruct`.
   - Storage: `NetworkX` JSON (`./data/graphs`), embedded `QdrantClient(path="./data/qdrant")`, SQLite (`./data/codeintel.db`). Zero mandatory Docker containers.
   - Always normalize file paths to forward slashes (`path.as_posix()`) across all graph node IDs and database records.
```

### F.2 `scripts/status.py`

```python
import re
import subprocess
import pathlib

def sh(*args):
    r = subprocess.run(args, capture_output=True, text=True)
    return (r.stdout or r.stderr).strip()

root = pathlib.Path(__file__).resolve().parents[1]
progress_file = root / "PROGRESS.md"
rows = []
if progress_file.exists():
    for line in progress_file.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\|\s*(P\d+-\d+)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(TODO|IN_PROGRESS|BLOCKED|DONE|SKIPPED)\s*\|", line)
        if m:
            rows.append(dict(id=m[1], phase=int(m[2]), text=m[3].strip(), status=m[4]))

print("branch:", sh("git", "branch", "--show-current"), "| last:", sh("git", "log", "-1", "--oneline"))
counts = {}
for r in rows:
    counts[r["status"]] = counts.get(r["status"], 0) + 1
print("tasks:", counts)
open_rows = [r for r in rows if r["status"] not in ("DONE", "SKIPPED")]
print("current phase:", open_rows[0]["phase"] if open_rows else "all done")
for r in rows:
    if r["status"] in ("IN_PROGRESS", "BLOCKED"):
        print(f"[{r['status']}] {r['id']} {r['text']}")
nxt = next((r for r in rows if r["status"] == "TODO"), None)
if nxt:
    print("next TODO:", nxt["id"], nxt["text"])
print("\n--- HANDOFF.md (first 40 lines) ---")
h = root / "HANDOFF.md"
print("\n".join(h.read_text(encoding="utf-8").splitlines()[:40]) if h.exists() else "(missing)")
print("\n--- git status ---")
print("\n".join(sh("git", "status", "--short").splitlines()[:20]) or "(clean)")
print("\n--- recent commits ---")
print(sh("git", "log", "-5", "--oneline"))
```

### F.3 `scripts/split_plan.py`

```python
import re
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
master = root / "docs" / "MASTER_PLAN.md"
out = root / "docs" / "plan"
out.mkdir(parents=True, exist_ok=True)

text = master.read_text(encoding="utf-8")
sections = re.split(r"(?m)^(?=## )", text)
index = []

for i, sec in enumerate(sections):
    first = sec.split("\n", 1)[0]
    m_phase = re.match(r"## Phase (\d+)", first)
    m_app = re.match(r"## Appendix ([A-F])", first)
    m_num = re.match(r"## (\d+)\.", first)
    if m_phase:
        name = f"phase_{m_phase.group(1)}.md"
    elif m_app:
        name = f"appendix_{m_app.group(1).lower()}.md"
    elif m_num:
        name = f"section_{m_num.group(1)}.md"
    elif i == 0:
        name = "header.md"
    else:
        name = f"misc_{i}.md"
    (out / name).write_text(sec, encoding="utf-8")
    index.append(f"- `{name}`: {first.strip('# ').strip()}")

(out / "INDEX.md").write_text("# Split Plan Index\n\n" + "\n".join(index) + "\n", encoding="utf-8")
print(f"Split MASTER_PLAN.md into {len(index)} files under {out}")
```

### F.4 `scripts/tasks.py`

```python
import sys
import subprocess
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
VENV_PY = BACKEND / ".venv" / "Scripts" / "python.exe"
PY = str(VENV_PY if VENV_PY.exists() else sys.executable)

def run(cmd, cwd=ROOT):
    print(f"==> Running: {' '.join(map(str, cmd))} (in {cwd.name})")
    res = subprocess.run(cmd, cwd=cwd)
    if res.returncode != 0:
        sys.exit(res.returncode)

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        run([sys.executable, str(ROOT / "scripts" / "status.py")])
    elif cmd == "test-fast":
        run([PY, "-m", "pytest", "tests", "-q", "-x", "--maxfail=3"], cwd=BACKEND)
    elif cmd == "test":
        run([PY, "-m", "pytest", "tests", "-v"], cwd=BACKEND)
    elif cmd == "lint":
        run([PY, "-m", "ruff", "check", "app", "tests"], cwd=BACKEND)
    elif cmd == "analyze-sample":
        run([PY, "-m", "app.cli", "analyze", str(ROOT / "data" / "sample_ecommerce")], cwd=BACKEND)
    elif cmd == "serve":
        run([PY, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"], cwd=BACKEND)
    elif cmd == "benchmark":
        run([PY, str(ROOT / "scripts" / "benchmark.py")], cwd=ROOT)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

---
*End of `docs/MASTER_PLAN.md`.*