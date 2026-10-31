# CodeIntel — Local-First Codebase Intelligence Platform

**CodeIntel** is a 100% local, open-source **Codebase Intelligence Platform** combining deterministic **Tree-sitter AST static analysis**, a **Cross-File Code Knowledge Graph (`NetworkX`)**, **Embedded Qdrant Semantic Code Search (`1024-dim`)**, **Grounded Hybrid GraphRAG**, and a **Deterministic Change Impact ("Blast Radius") Analyzer** with an interactive **Next.js + `@xyflow/react`** visual architecture dashboard.

---

## Key Capabilities

1. **Multi-Language Deterministic AST Parsing (`tree-sitter` v0.23+):**
   - Extracts classes, functions, methods, parameters, docstrings, imports, call expressions, HTTP API endpoints (Express, FastAPI, Spring Boot), and database models across **Python**, **JavaScript**, **TypeScript**, and **Java**.
2. **Cross-File Code Knowledge Graph (`NetworkX`):**
   - Builds a directed graph connecting `file`, `class`, `function`, `method`, `api_endpoint`, and `model` nodes via `DECLARES`, `IMPORTS`, `CALLS`, `INHERITS`, `ROUTES_TO`, and `QUERIES` edges, ranked by dependency PageRank.
3. **Semantic Code Search (`qdrant-client` Local Mode + `mxbai-embed-large:latest`):**
   - Indexes AST-bounded semantic code chunks with rich context headers (`File | Signature | Outgoing Calls`) into an embedded on-disk Qdrant collection (`1024` dimensions, Cosine distance) with SHA-256 incremental skip checks.
4. **Grounded Hybrid GraphRAG Assistant (`qwen2.5:7b-instruct`):**
   - Combines top-$k$ Qdrant semantic chunks with 1-hop `NetworkX` graph neighbors (callers, callees, routes, models) and enforces a deterministic **Citation Sanitizer** so 100% of cited `file_path:Lstart-Lend` references are verified to exist.
5. **Deterministic Blast-Radius & Change Impact Simulator:**
   - Computes direct & transitive upstream dependents, affected public API routes, covering test suites, and an explainable `0–100` heuristic risk score (`Low` / `Medium` / `High`).
6. **5-Tab Visual Developer Dashboard (`Next.js` + `Tailwind` + `@xyflow/react` + `dagre`):**
   - **Overview**, **Code Explorer**, **Knowledge Graph**, **AI Assistant**, and **Impact Analysis**.

---

## Verified Benchmark Results (`results/benchmarks.json`)

Measured on the 15-file multi-language `sample_ecommerce` repository (Express.js + Mongoose + Jest + Python Fraud Analytics microservice):

| Benchmark Metric | Measured Value | Target |
| :--- | :--- | :--- |
| **AST Parsing Latency** | **14.73 ms** (`1018.3 files/sec`) | $< 5,000$ ms |
| **Knowledge Graph Build Latency** | **4.46 ms** (`47 nodes`, `87 edges`) | $< 500$ ms |
| **Blast-Radius Impact Query Latency** | **0.18 ms** (`100.0%` ground-truth recall) | $< 100$ ms |
| **Semantic Search Hit@3** | **100.0%** (`5 / 5` natural-language intent queries) | $\ge 80\%$ |
| **GraphRAG Citation Verification Rate** | **100.0%** (`18 / 18` citations verified) | $100\%$ |

---

## Quickstart (Windows 11 PowerShell / Cross-Platform)

### 1. Setup Environment & Sample Repository
```powershell
python scripts/tasks.py setup
```

### 2. Run Standalone CLI Codebase Analyzer
```powershell
python scripts/tasks.py analyze-sample
```
Writes `data/cli_out/graph.json`, `data/cli_out/analysis_report.json`, and `data/cli_out/dependencies.json`.

### 3. Run Tests, Linter & Benchmarks
```powershell
python scripts/tasks.py test
python scripts/tasks.py lint
python scripts/tasks.py benchmark
```

### 4. Launch Full Stack (FastAPI `:8000` + Next.js `:3000`)
```powershell
python scripts/tasks.py demo
```
- **Frontend Visual Dashboard:** `http://localhost:3000`
- **Backend REST API & Swagger Docs:** `http://localhost:8000/docs`

---

## 3-Minute Evaluator Demo Script

1. **CLI Static Analysis (`30s`):** Run `python scripts/tasks.py analyze-sample` to display discovered files, functions, classes, API endpoints, call edges, and sub-second execution time.
2. **Overview & Centrality (`30s`):** Open `http://localhost:3000` (`Overview` tab) to inspect language distribution, detected frameworks (`Express.js`, `Mongoose`, `Jest`, `Python Microservice`), and top PageRank components (`Order`, `User`, `paymentService.js`).
3. **Interactive Knowledge Graph (`45s`):** Switch to `Knowledge Graph`, filter by `api_endpoint` or focus a 2-hop neighborhood around `POST /login` to visualize `POST /login` $\rightarrow$ `loginUser` $\rightarrow$ `authenticate` $\rightarrow$ `User`.
4. **Grounded Hybrid GraphRAG (`45s`):** Open `AI Assistant`, click *"How does user authentication work in this project?"*, inspect the step-by-step execution trace, and click any verified citation badge (`userService.js:L6-L17`) to jump directly to the highlighted lines in `Code Explorer`.
5. **Blast-Radius Impact Simulator (`30s`):** Open `Impact Analysis` for `backend/services/paymentService.js` to view its **High Risk** score, affected public routes (`POST /checkout`, `POST /refund`), regression test suite (`backend/tests/payment.test.js`), and interactive blast-radius subgraph.
