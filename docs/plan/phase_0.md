## Phase 0 — Scaffolding, Handoff System & Environment Verification

**Objective:** Initialize the repository structure, multi-agent handoff files, cross-platform task runner, Python virtual environment, and a realistic multi-language sample repository (`sample_ecommerce`) so every subsequent phase has a deterministic testbed.

### Tasks

- [ ] **P0-01** Create the directory tree defined in Section 2 (`backend/app/...`, `backend/tests/`, `scripts/`, `docs/`, `data/`, `results/`). Create `.gitignore`, `.gitattributes`, and `.env.example` (Appendix C.1).
- [ ] **P0-02** Create `AGENTS.md` (Appendix F.1), `PROGRESS.md` (Appendix E.1), `HANDOFF.md` (Appendix E.2), `docs/decision_log.md`, `.github/copilot-instructions.md`, and `.cursor/rules/codeintel.mdc`. Copy this blueprint to `docs/MASTER_PLAN.md` and implement + run `python scripts/split_plan.py` (Appendix F.3) to populate `docs/plan/`.
- [ ] **P0-03** Implement `scripts/status.py` (Appendix F.2) and `scripts/tasks.py` (Appendix F.4) supporting `setup`, `lint`, `test`, `test-fast`, `analyze-sample`, `serve`, `benchmark`, and `status`.
- [ ] **P0-04** Create `backend/pyproject.toml` with all dependencies from Section 3.3. Create the virtual environment `backend/.venv`, install dependencies, and verify `tree_sitter`, `networkx`, `qdrant_client`, `fastapi`, and `sqlalchemy` import cleanly.
- [ ] **P0-05** Implement `scripts/create_sample_repo.py` and run it to generate `data/sample_ecommerce/`—a realistic 14-file repository containing:
  - Express/JS backend routes (`backend/routes/userRoutes.js`, `backend/routes/checkoutRoutes.js`)
  - Controllers (`backend/controllers/userController.js`, `backend/controllers/paymentController.js`, `backend/controllers/orderController.js`)
  - Services (`backend/services/userService.js`, `backend/services/paymentService.js`, `backend/services/refundService.js`, `backend/middleware/authMiddleware.js`)
  - Models (`backend/models/User.js`, `backend/models/Order.js`)
  - Python analytics microservice (`analytics/fraud_detector.py`, `analytics/scorer.py`)
  - Tests (`backend/tests/payment.test.js`, `backend/tests/auth.test.js`)
  - `package.json` and `README.md`
  *(This guarantees all examples from the blueprint—such as `POST /login` $\rightarrow$ `loginUser()` $\rightarrow$ `authenticate()` $\rightarrow$ `User` and `paymentService.js` impact analysis—can be tested deterministically).*
- [ ] **P0-06** Verify local Ollama connectivity (`http://localhost:11434/api/tags`) via a diagnostic check in `scripts/tasks.py`, confirming `mxbai-embed-large:latest` and `qwen2.5:7b-instruct` are available, and record hardware/model specs in `docs/decision_log.md`.

### Acceptance Criteria (Phase 0)
- `python scripts/status.py` executes cleanly and displays the task table and `HANDOFF.md`.
- `docs/plan/` contains individual markdown files for every phase and appendix.
- `data/sample_ecommerce/` exists with 14+ interconnected JS and Python source files.
- `python scripts/tasks.py test-fast` runs `pytest` and exits with code `0`.

---

