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

