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

