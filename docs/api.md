# CodeIntel REST API Reference

Base URL: `http://localhost:8000/api`
Interactive Swagger UI: `http://localhost:8000/docs`

## Endpoints Summary

| Method | Path | Description | Response Model |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | System status, Ollama reachability, and active local models (`mxbai-embed-large:latest`, `qwen2.5:7b-instruct`). | `dict` |
| `POST` | `/api/repositories` | Clones/scans a repository, parses AST via Tree-sitter, builds the `NetworkX` Knowledge Graph, and indexes semantic chunks in embedded Qdrant. | `RepositorySummary` |
| `GET` | `/api/repositories` | Lists all indexed repositories stored in SQLite. | `list[RepositorySummary]` |
| `GET` | `/api/repositories/{repo_id}` | Returns overview metrics, language distribution, PageRank central modules, architectural summary, and file list. | `RepositoryDetail` |
| `GET` | `/api/repositories/{repo_id}/files/content` | Returns source code, extracted AST symbols, imports, and calls for `?path=<relative_posix_path>`. | `FileContentResponse` |
| `GET` | `/api/repositories/{repo_id}/graph` | Returns nodes and edges formatted for `@xyflow/react`. Supports `?node_type=`, `?directory=`, `?search=`, `?focus_node_id=`, and `?hops=`. | `ReactFlowGraphResponse` |
| `GET` | `/api/repositories/{repo_id}/search` | Hybrid semantic vector (`mxbai-embed-large:latest`) + symbol search across the repository (`?q=<query>&limit=8`). | `list[SearchResultItem]` |
| `POST` | `/api/repositories/{repo_id}/ask` | Grounded Hybrid GraphRAG Q&A (`{"question": "...", "top_k": 6}`) returning markdown explanation, execution flow steps, and verified `file_path:Lstart-Lend` citations. | `AssistantResponse` |
| `POST` | `/api/repositories/{repo_id}/impact-analysis` | Computes deterministic Blast-Radius Change Impact Report (`{"target_id": "..."}`) with heuristic risk score (`0-100`), affected API endpoints, related test suites, and subgraph. | `ImpactReport` |
