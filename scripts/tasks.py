import json
import pathlib
import subprocess
import sys
import urllib.request
import urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV_PY = BACKEND / ".venv" / "Scripts" / "python.exe"
PY = str(VENV_PY if VENV_PY.exists() else sys.executable)


def run(cmd, cwd=ROOT):
    print(f"==> Running: {' '.join(map(str, cmd))} (in {cwd.name})")
    res = subprocess.run(cmd, cwd=cwd)
    if res.returncode != 0:
        sys.exit(res.returncode)


def check_ollama():
    url = "http://localhost:11434/api/tags"
    print(f"==> Checking Ollama at {url} ...")
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("name", "") for m in data.get("models", [])]
            print(f"    Available Ollama models: {models}")
            required = ["mxbai-embed-large:latest", "qwen2.5:7b-instruct"]
            missing = [r for r in required if r not in models]
            if missing:
                print(f"    WARNING: Missing expected models: {missing}")
            else:
                print("    SUCCESS: Both mxbai-embed-large:latest and qwen2.5:7b-instruct are verified!")
            return True, models
    except Exception as exc:
        print(f"    WARNING: Could not connect to Ollama at {url}: {exc}")
        return False, []


def setup():
    if not VENV_PY.exists():
        run([sys.executable, "-m", "venv", str(BACKEND / ".venv")], cwd=ROOT)
    py_bin = str(VENV_PY if VENV_PY.exists() else sys.executable)
    run([py_bin, "-m", "pip", "install", "--upgrade", "pip"], cwd=BACKEND)
    run([py_bin, "-m", "pip", "install", "-e", ".[dev]"], cwd=BACKEND)
    sample_script = ROOT / "scripts" / "create_sample_repo.py"
    if sample_script.exists():
        run([py_bin, str(sample_script)], cwd=ROOT)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        run([sys.executable, str(ROOT / "scripts" / "status.py")])
    elif cmd == "setup":
        setup()
    elif cmd == "check-ollama":
        check_ollama()
    elif cmd == "test-fast":
        run([PY, "-m", "pytest", "tests", "-q", "-x", "--maxfail=3"], cwd=BACKEND)
    elif cmd == "test":
        run([PY, "-m", "pytest", "tests", "-v"], cwd=BACKEND)
    elif cmd == "lint":
        run([PY, "-m", "ruff", "check", "app", "tests"], cwd=BACKEND)
    elif cmd == "analyze-sample":
        run(
            [
                PY,
                "-m",
                "app.cli",
                "analyze",
                str(ROOT / "data" / "sample_ecommerce"),
            ],
            cwd=BACKEND,
        )
    elif cmd == "serve":
        run(
            [PY, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
            cwd=BACKEND,
        )
    elif cmd == "benchmark":
        run([PY, str(ROOT / "scripts" / "benchmark.py")], cwd=ROOT)
    elif cmd == "demo":
        print("Starting CodeIntel Backend (:8000) and Frontend (:3000)...")
        backend_proc = subprocess.Popen(
            [PY, "-m", "uvicorn", "app.main:app", "--port", "8000"],
            cwd=BACKEND,
        )
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=FRONTEND,
        )
        try:
            backend_proc.wait()
            frontend_proc.wait()
        except KeyboardInterrupt:
            backend_proc.terminate()
            frontend_proc.terminate()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
