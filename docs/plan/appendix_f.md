## Appendix F — Agent Orchestration Scripts (`AGENTS.md`, `status.py`, `split_plan.py`, `tasks.py`)

### F.1 `AGENTS.md` (Place in Repository Root)

```markdown
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
4. **Fixed Local Stack (Windows 11):**
   - Ollama models: `mxbai-embed-large:latest` (1024 dims) and `qwen2.5:7b-instruct`.
   - Storage: `NetworkX` JSON (`./data/graphs`), embedded `QdrantClient(path="./data/qdrant")`, SQLite (`./data/codeintel.db`). Zero mandatory Docker containers.
   - Always normalize file paths to forward slashes (`path.as_posix()`) across all graph node IDs and database records.
```

### F.2 `scripts/status.py`

```python
import re
import subprocess
import pathlib

def sh(*args):
    r = subprocess.run(args, capture_output=True, text=True)
    return (r.stdout or r.stderr).strip()

root = pathlib.Path(__file__).resolve().parents[1]
progress_file = root / "PROGRESS.md"
rows = []
if progress_file.exists():
    for line in progress_file.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\|\s*(P\d+-\d+)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(TODO|IN_PROGRESS|BLOCKED|DONE|SKIPPED)\s*\|", line)
        if m:
            rows.append(dict(id=m[1], phase=int(m[2]), text=m[3].strip(), status=m[4]))

print("branch:", sh("git", "branch", "--show-current"), "| last:", sh("git", "log", "-1", "--oneline"))
counts = {}
for r in rows:
    counts[r["status"]] = counts.get(r["status"], 0) + 1
print("tasks:", counts)
open_rows = [r for r in rows if r["status"] not in ("DONE", "SKIPPED")]
print("current phase:", open_rows[0]["phase"] if open_rows else "all done")
for r in rows:
    if r["status"] in ("IN_PROGRESS", "BLOCKED"):
        print(f"[{r['status']}] {r['id']} {r['text']}")
nxt = next((r for r in rows if r["status"] == "TODO"), None)
if nxt:
    print("next TODO:", nxt["id"], nxt["text"])
print("\n--- HANDOFF.md (first 40 lines) ---")
h = root / "HANDOFF.md"
print("\n".join(h.read_text(encoding="utf-8").splitlines()[:40]) if h.exists() else "(missing)")
print("\n--- git status ---")
print("\n".join(sh("git", "status", "--short").splitlines()[:20]) or "(clean)")
print("\n--- recent commits ---")
print(sh("git", "log", "-5", "--oneline"))
```

### F.3 `scripts/split_plan.py`

```python
import re
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
master = root / "docs" / "MASTER_PLAN.md"
out = root / "docs" / "plan"
out.mkdir(parents=True, exist_ok=True)

text = master.read_text(encoding="utf-8")
sections = re.split(r"(?m)^(?=## )", text)
index = []

for i, sec in enumerate(sections):
    first = sec.split("\n", 1)[0]
    m_phase = re.match(r"## Phase (\d+)", first)
    m_app = re.match(r"## Appendix ([A-F])", first)
    m_num = re.match(r"## (\d+)\.", first)
    if m_phase:
        name = f"phase_{m_phase.group(1)}.md"
    elif m_app:
        name = f"appendix_{m_app.group(1).lower()}.md"
    elif m_num:
        name = f"section_{m_num.group(1)}.md"
    elif i == 0:
        name = "header.md"
    else:
        name = f"misc_{i}.md"
    (out / name).write_text(sec, encoding="utf-8")
    index.append(f"- `{name}`: {first.strip('# ').strip()}")

(out / "INDEX.md").write_text("# Split Plan Index\n\n" + "\n".join(index) + "\n", encoding="utf-8")
print(f"Split MASTER_PLAN.md into {len(index)} files under {out}")
```

### F.4 `scripts/tasks.py`

```python
import sys
import subprocess
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
VENV_PY = BACKEND / ".venv" / "Scripts" / "python.exe"
PY = str(VENV_PY if VENV_PY.exists() else sys.executable)

def run(cmd, cwd=ROOT):
    print(f"==> Running: {' '.join(map(str, cmd))} (in {cwd.name})")
    res = subprocess.run(cmd, cwd=cwd)
    if res.returncode != 0:
        sys.exit(res.returncode)

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        run([sys.executable, str(ROOT / "scripts" / "status.py")])
    elif cmd == "test-fast":
        run([PY, "-m", "pytest", "tests", "-q", "-x", "--maxfail=3"], cwd=BACKEND)
    elif cmd == "test":
        run([PY, "-m", "pytest", "tests", "-v"], cwd=BACKEND)
    elif cmd == "lint":
        run([PY, "-m", "ruff", "check", "app", "tests"], cwd=BACKEND)
    elif cmd == "analyze-sample":
        run([PY, "-m", "app.cli", "analyze", str(ROOT / "data" / "sample_ecommerce")], cwd=BACKEND)
    elif cmd == "serve":
        run([PY, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"], cwd=BACKEND)
    elif cmd == "benchmark":
        run([PY, str(ROOT / "scripts" / "benchmark.py")], cwd=ROOT)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

---
*End of `docs/MASTER_PLAN.md`.*