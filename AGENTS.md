# AGENTS.md — Canonical Operating Rules for All AI Coding Agents

1. **Repository is Memory:** Multiple AI agents work on this repo sequentially. Never rely on chat context. Everything must be recorded in `PROGRESS.md`, `HANDOFF.md`, `docs/decision_log.md`, and git commits.
2. **Mandatory Session Start:**
   - Run `python scripts/status.py`
   - Read `HANDOFF.md`
   - Read ONLY `docs/plan/phase_N.md` for the active phase (do not read the entire `docs/MASTER_PLAN.md` once split).
3. **One Task at a Time:**
   - Mark the task `IN_PROGRESS` in `PROGRESS.md` and `HANDOFF.md` before coding.
   - Run `python scripts/tasks.py test-fast` after implementing.
   - Mark `DONE` in `PROGRESS.md`, rewrite `HANDOFF.md` for the next task, and commit with `<TASK_ID>: <summary>`.
   - Do not include `Co-authored-by` trailers in git commits.
4. **Fixed Local Stack (Windows 11):**
   - Ollama models: `mxbai-embed-large:latest` (1024 dims) and `qwen2.5:7b-instruct`.
   - Storage: `NetworkX` JSON (`./data/graphs`), embedded `QdrantClient(path="./data/qdrant")`, SQLite (`./data/codeintel.db`). Zero mandatory Docker containers.
   - Always normalize file paths to forward slashes (`path.as_posix()`) across all graph node IDs and database records.

