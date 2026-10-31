# Handoff

**Updated:** 2026-10-31  |  **By:** Antigravity  |  **Branch:** main  |  **Last commit:** 816a0fa

## Current task
- ID: P0-04 - Backend pyproject.toml and venv installation
- State: IN_PROGRESS

## Done in this task so far
- Implemented `scripts/status.py` and `scripts/tasks.py`.

## Exact next step
- Create `backend/pyproject.toml`, create virtual environment `backend/.venv`, install dependencies, and verify imports.

## Files touched
- `scripts/status.py`, `scripts/tasks.py`

## Commands to run first
    python scripts/status.py

## Known problems / gotchas
- Use `mxbai-embed-large:latest` (1024 dims) and `qwen2.5:7b-instruct` in Ollama. Do not require Docker.
