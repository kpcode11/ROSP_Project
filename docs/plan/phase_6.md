## Phase 6 — Evaluation, Benchmarks, Demo Repo & Final Release

**Objective:** Run reproducible benchmarks (indexing speed, graph resolution accuracy, blast-radius recall, citation grounding rate), save metrics to `results/benchmarks.json`, and finalize documentation (`README.md`, `docs/architecture.md`).

### Tasks

- [ ] **P6-01** Implement `scripts/benchmark.py` (invoked via `python scripts/tasks.py benchmark`) that runs against `data/sample_ecommerce` and records real measured numbers into `results/benchmarks.json`:
  - AST parsing latency (ms) and files/sec.
  - Graph construction latency (ms), node count, edge count, and cross-file call resolution rate.
  - Impact analysis latency (ms) and verification that known ground-truth dependencies of `paymentService.js` and `userService.js` are 100% recalled.
  - Vector embedding latency (ms) with `mxbai-embed-large:latest` and Top-3 Recall on 5 benchmark intent queries.
  - End-to-end GraphRAG query latency (ms) with `qwen2.5:7b-instruct` and Citation Verification Rate (% of cited files/lines that exist in the repo).
- [ ] **P6-02** Create optional `docker-compose.yml` for containerized deployment and verify `python scripts/tasks.py demo` starts both FastAPI (`:8000`) and Next.js (`:3000`) cleanly on Windows.
- [ ] **P6-03** Write comprehensive `README.md` and `docs/architecture.md` containing system architecture diagrams, problem/solution overview, technology stack table, benchmark results from `results/benchmarks.json`, setup instructions, and step-by-step viva/demo script.

### Acceptance Criteria (Phase 6)
- `python scripts/tasks.py test` and `python scripts/tasks.py benchmark` pass and generate `results/benchmarks.json`.
- `README.md`, `docs/architecture.md`, `docs/api.md`, `PROGRESS.md`, and `HANDOFF.md` are complete and accurate.

---

