## Appendix B — REST API Contract

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns backend status, Ollama reachability, and configured models |
| `POST` | `/api/repositories` | Clones/analyzes a repo path or URL, builds graph + embeddings |
| `GET` | `/api/repositories` | Lists all analyzed repositories |
| `GET` | `/api/repositories/{id}` | Returns overview stats, language breakdown, central modules |
| `GET` | `/api/repositories/{id}/files/content` | Returns source code and symbols for `?path=<relative_path>` |
| `GET` | `/api/repositories/{id}/graph` | Returns nodes & edges for React Flow (`?node_type=&focus_node_id=&hops=`) |
| `GET` | `/api/repositories/{id}/search` | Semantic vector + symbol search (`?q=<query>&limit=8`) |
| `POST` | `/api/repositories/{id}/ask` | Hybrid GraphRAG Q&A (`{"question": "..."}`) with grounded citations |
| `POST` | `/api/repositories/{id}/impact-analysis` | Generates Blast-Radius Change Impact Report (`{"target_id": "..."}`) |

---

