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

