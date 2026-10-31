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

