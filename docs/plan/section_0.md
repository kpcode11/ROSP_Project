## 0. Agent Operating Manual

### 0.1 The Situation You Are Working In

- Multiple AI coding agents (Cursor, Antigravity, Claude Code, Copilot, Codex, Argon) will work on this repository **sequentially**. Any agent may be terminated mid-task due to token or rate limits.
- **The repository is the single source of truth.** Never rely on chat history. Every architectural choice, task state, file diff, and blocker must be recorded in `PROGRESS.md`, `HANDOFF.md`, `docs/decision_log.md`, and git commits.
- Do not assume the project is starting from scratch if files already exist. Always inspect the repository state first.

### 0.2 Session Initialization Protocol (Mandatory for Every Session)

1. Read `AGENTS.md` in the repository root.
2. Run `python scripts/status.py`. It outputs the current git branch, task counts, current phase, active `IN_PROGRESS` or `BLOCKED` tasks, the next `TODO` task, the top 40 lines of `HANDOFF.md`, `git status --short`, and recent commits.
3. Read `HANDOFF.md` completely.
4. Read **only** the current phase file (`docs/plan/phase_N.md`) and any specific appendix referenced by your current task.
5. Inspect the working tree:
   - If uncommitted changes exist, run `python scripts/tasks.py test-fast`.
   - Keep the changes if tests pass and they match the active task in `HANDOFF.md`; otherwise `git stash push -m "stashed-by-agent"` and note it in `HANDOFF.md`.
6. Execute the current `IN_PROGRESS` task, or transition the first eligible `TODO` task to `IN_PROGRESS` before writing code.

### 0.3 Task Execution Protocol

- Work on **strictly one task ID at a time** (e.g., `P1-03`).
- Target diff size per task: **50 to 250 lines of code** plus corresponding unit/integration tests.
- Valid task statuses in `PROGRESS.md`: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `SKIPPED`.
- **Before writing code:** Update `PROGRESS.md` to set the task status to `IN_PROGRESS` and update `HANDOFF.md` with the active task ID.
- **Upon completing a task:**
  1. Run verification tests (`python scripts/tasks.py test-fast`).
  2. Run linter (`python scripts/tasks.py lint`).
  3. Update `PROGRESS.md` status to `DONE` and record the commit hash.
  4. Rewrite `HANDOFF.md` pointing to the next task ID.
  5. Commit changes using format: `P1-03: implement tree-sitter JS/TS/Python symbol extractor (tests pass)`.
  6. Work-in-progress commits must use `wip(P1-03): partial symbol extractor` and leave status as `IN_PROGRESS`.

### 0.4 Token-Management and Low-Budget Protocol

1. **Never print large files or AST dumps to stdout.** Use `Select-Object -First 30` in PowerShell or write small Python inspection scripts capped at 80 lines of output.
2. **Never dump `graph.json` or vector embeddings into the terminal.** Print summary counts (`nodes_count`, `edges_count`, `sample_node`).
3. Run `pytest -q -x --maxfail=3` to minimize console noise.
4. When your context window reaches ~75% capacity or the IDE warns of token limits:
   - Stop starting new subtasks immediately.
   - Ensure all edited files are syntactically valid.
   - Run `python scripts/tasks.py test-fast`.
   - Rewrite `HANDOFF.md` with exact next steps.
   - Commit with `wip(<TASK_ID>): ...` and output the **After a Cut-Off Resume Prompt** from Appendix E.3.

### 0.5 Safe Handling of Cloned Repositories and Local Models

- **Never clone huge monorepos during testing.** Enforce a default `--max-files 300` and `--max-file-size-kb 500` limit in the repository analyzer so parsing finishes in $< 5$ seconds and never exhausts the laptop's 16 GB RAM.
- **Strictly ignore noisy directories:** Always skip `.git/`, `node_modules/`, `.next/`, `dist/`, `build/`, `venv/`, `.venv/`, `__pycache__/`, `coverage/`, `.idea/`, `.vscode/`, and binary/lock files (`*.lock`, `package-lock.json`, `*.png`, `*.jpg`, `*.pdf`, `*.onnx`, `*.db`).
- **Use exact installed Ollama models:**
  - Embedding model MUST default to `mxbai-embed-large:latest` (vector dimension = `1024`). Do NOT pull `nomic-embed-text` unless `mxbai-embed-large:latest` is missing.
  - Chat LLM MUST default to `qwen2.5:7b-instruct`.
  - Keep Ollama requests sequential with bounded context (max 6,000 tokens of retrieved code + graph context per query) so the 8 GB VRAM on the RTX 4060 never hits Out-Of-Memory (OOM).

### 0.6 Hard Engineering Rules

1. **Zero Hallucinated Citations:** The AI Assistant (`POST /api/repositories/{id}/ask`) must never invent file names, function names, or line numbers. Every claim must cite a real `file_path` and `line_start`-`line_end` extracted by Tree-sitter.
2. **Deterministic Static Analysis First:** Graph edges (`IMPORTS`, `CALLS`, `DECLARES`, `INHERITS`, `EXPOSES`) and Blast-Radius Risk Scores (`Low`, `Medium`, `High`) MUST be computed deterministically via `tree-sitter` and `NetworkX`—never guessed by an LLM.
3. **Zero Mandatory Docker Dependency:** Qdrant must run in local embedded disk mode (`QdrantClient(path="./data/qdrant")`), metadata in SQLite (`./data/codeintel.db`), and graphs in `./data/graphs/{repo_id}_graph.json`. Docker Compose is provided only as an optional production deployment profile in Phase 6.
4. **Human Checkpoints (`[HUMAN]`):** Only block for human intervention if Ollama is not running or a hardware constraint fails. Otherwise, execute autonomously using the fixed decisions in Section 1.

---

