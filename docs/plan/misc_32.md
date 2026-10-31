## Known problems / gotchas
- Use `mxbai-embed-large:latest` (1024 dims) and `qwen2.5:7b-instruct` in Ollama. Do not require Docker.
```

### E.3 Resume Prompts (Copy-Paste into Your AI Coding Agent)

1. **First Session Kickoff Prompt:**
   > "Read `docs/MASTER_PLAN.md`. Begin at Phase 0 (`P0-01` through `P0-06`) to initialize the repository structure, `AGENTS.md`, `PROGRESS.md`, `HANDOFF.md`, `scripts/split_plan.py`, `scripts/status.py`, `scripts/tasks.py`, and the sample repository. Follow all rules in Section 0: work on one task ID at a time, run tests after each task, update `PROGRESS.md` and `HANDOFF.md`, and commit after each completed task."
2. **Standard Resume / Next Agent Prompt:**
   > "Read `AGENTS.md` in the repository root. Run `python scripts/status.py`, read `HANDOFF.md`, and read only the current phase file in `docs/plan/phase_N.md`. Continue from the current `IN_PROGRESS` or next `TODO` task one task ID at a time, updating `PROGRESS.md` and `HANDOFF.md` at every task boundary."
3. **After a Mid-Task Token Cut-Off:**
   > "The previous agent session ran out of tokens. Read `AGENTS.md`, run `python scripts/status.py`, read `HANDOFF.md`, inspect `git status` and `git diff --stat`, run `python scripts/tasks.py test-fast`, and finish the active task before moving to the next ID."

---

