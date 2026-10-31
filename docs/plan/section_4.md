## 4. Data, Schemas, and Interfaces

### 4.1 Canonical Graph Node Schema (`GraphNode`)

Every entity extracted from a repository is stored as a node in `NetworkX` and serialized to JSON:

```json
{
  "id": "backend/services/userService.js::authenticate",
  "label": "authenticate",
  "type": "function",
  "file_path": "backend/services/userService.js",
  "language": "javascript",
  "line_start": 14,
  "line_end": 28,
  "signature": "async function authenticate(credentials)",
  "docstring": "Validates user credentials against User model.",
  "parameters": ["credentials"],
  "parent_id": "backend/services/userService.js",
  "metrics": {
    "loc": 15,
    "in_degree": 3,
    "out_degree": 2,
    "pagerank": 0.0412
  }
}
```
- **Allowed `type` values:** `file`, `class`, `function`, `method`, `api_endpoint`, `model`.

### 4.2 Canonical Graph Edge Schema (`GraphEdge`)

```json
{
  "source": "backend/controllers/userController.js::loginUser",
  "target": "backend/services/userService.js::authenticate",
  "relation": "CALLS",
  "confidence": 1.0,
  "line": 8
}
```
- **Allowed `relation` values:**
  - `DECLARES` (`file` $\rightarrow$ `class`/`function`/`api_endpoint`/`model`, or `class` $\rightarrow$ `method`)
  - `IMPORTS` (`file` $\rightarrow$ `file`)
  - `CALLS` (`function`/`method`/`api_endpoint` $\rightarrow$ `function`/`method`)
  - `INHERITS` (`class` $\rightarrow$ `class`)
  - `ROUTES_TO` (`api_endpoint` $\rightarrow$ `function`/`method`)
  - `QUERIES` (`function`/`method` $\rightarrow$ `model`)

### 4.3 Semantic Code Chunk Schema (Stored in Qdrant Payload)

Collection Name: `code_chunks` (Vector size: `1024`, Distance: `Cosine`).

```json
{
  "chunk_id": "uuid5(repo_id + node_id)",
  "repo_id": "ecommerce-sample",
  "node_id": "backend/services/userService.js::authenticate",
  "node_type": "function",
  "name": "authenticate",
  "file_path": "backend/services/userService.js",
  "language": "javascript",
  "line_start": 14,
  "line_end": 28,
  "signature": "async function authenticate(credentials)",
  "code": "async function authenticate(credentials) {\n  return await User.findOne({ email: credentials.email });\n}",
  "context_header": "File: backend/services/userService.js | Function: authenticate(credentials) | Calls: User.findOne"
}
```

### 4.4 Change Impact ("Blast Radius") Report Schema (`ImpactReport`)

```json
{
  "repo_id": "ecommerce-sample",
  "target_node_id": "backend/services/paymentService.js",
  "target_type": "file",
  "risk_level": "High",
  "risk_score": 78.5,
  "risk_factors": [
    "Directly imported or called by 4 components across 3 modules",
    "Affects 2 public API endpoints (POST /checkout, POST /refund)",
    "High centrality in dependency graph (top 10% PageRank)"
  ],
  "direct_dependents": [
    {"id": "backend/controllers/paymentController.js", "type": "file", "relation": "IMPORTS"},
    {"id": "backend/controllers/orderController.js", "type": "file", "relation": "IMPORTS"}
  ],
  "transitive_dependents": [
    {"id": "backend/routes/checkoutRoutes.js", "type": "file", "hop_distance": 2},
    {"id": "POST /checkout", "type": "api_endpoint", "hop_distance": 2}
  ],
  "affected_api_endpoints": ["POST /checkout", "POST /refund"],
  "related_tests": ["backend/tests/payment.test.js"],
  "subgraph": {
    "nodes": [],
    "edges": []
  }
}
```

---

