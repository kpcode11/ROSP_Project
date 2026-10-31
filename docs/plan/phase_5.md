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

