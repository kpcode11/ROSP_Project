## 9. Deployment and Integration

### 9.1 Local Native Execution (Recommended on Windows 11)
1. Ensure Ollama is running locally (`ollama serve`) with `mxbai-embed-large:latest` and `qwen2.5:7b-instruct`.
2. Setup everything: `python scripts/tasks.py setup`
3. Start backend + frontend: `python scripts/tasks.py demo`
   - Backend API & Swagger UI: `http://localhost:8000/docs`
   - Frontend Next.js Dashboard: `http://localhost:3000`

---

