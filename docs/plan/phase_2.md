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

