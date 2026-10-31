## 3. Development Environment and Tooling (Windows 11)

### 3.1 Hardware & OS Profile
- **OS:** Windows 11 Home 64-bit (`PowerShell` default shell).
- **CPU:** Intel Core i7-14650HX.
- **RAM:** 16.0 GB (keep backend memory footprint $< 3$ GB).
- **GPU:** NVIDIA GeForce RTX 4060 Laptop GPU (8 GB VRAM) — dedicated to running Ollama inference.
- **Local Ollama Instance:** Running at `http://localhost:11434`.
  - Embeddings: `mxbai-embed-large:latest` (`1024` dimensions).
  - LLM: `qwen2.5:7b-instruct`.

### 3.2 Windows PowerShell Conventions
- Always use `pathlib.Path` in Python and convert paths to POSIX (`path.as_posix()`) when storing relative file IDs in the graph or database (e.g., `backend/services/userService.js`, never `backend\services\userService.js`) so graph node IDs are OS-independent.
- Activate Python virtual environment in PowerShell via:
  ```powershell
  .\backend\.venv\Scripts\Activate.ps1
  ```
- Run all automation through `python scripts/tasks.py <command>` rather than `Makefile`.

### 3.3 Core Dependencies

**Backend (`backend/pyproject.toml`):**
- `fastapi>=0.115.0`, `uvicorn[standard]>=0.32.0`, `pydantic>=2.9.0`, `pydantic-settings>=2.6.0`
- `tree-sitter>=0.23.0`, `tree-sitter-python>=0.23.0`, `tree-sitter-javascript>=0.23.0`, `tree-sitter-typescript>=0.23.0`, `tree-sitter-java>=0.23.0`
- `networkx>=3.4.0`
- `qdrant-client>=1.12.0`
- `sqlalchemy>=2.0.35`
- `httpx>=0.27.2`
- `gitpython>=3.1.43`
- `pytest>=8.3.0`, `pytest-asyncio>=0.24.0`, `ruff>=0.7.0`

**Frontend (`frontend/package.json`):**
- `next` (`15.x` or `14.2.x`), `react`, `react-dom`, `typescript`
- `@xyflow/react` (`^12.3.0`), `dagre` (`^0.8.5`), `@types/dagre`
- `lucide-react`, `clsx`, `tailwind-merge`, `tailwindcss`

---

