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

