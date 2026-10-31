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

