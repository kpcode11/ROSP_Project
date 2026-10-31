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

