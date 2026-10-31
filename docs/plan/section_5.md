## 5. Architecture and Technical Design

### 5.1 System Processing Pipeline

```mermaid
flowchart TD
    User([Developer / UI / CLI]) --> NextJS[Next.js 15 Dashboard\n@xyflow/react + Tailwind]
    NextJS <-->|REST JSON API| FastAPI[FastAPI Backend]
    
    subgraph Ingestion_and_AST [1. Deterministic Analysis Engine]
        FastAPI --> RepoMgr[Repository Manager\nGit Clone / Local / ZIP]
        RepoMgr --> LangDet[Language & File Filter]
        LangDet --> TS[Tree-sitter AST Parser\nPython / JS / TS / Java]
        TS --> Resolver[Cross-File Symbol & Call Resolver]
    end

    subgraph Storage_Layer [2. Local Embedded Storage]
        Resolver --> NX[NetworkX Knowledge Graph\ndata/graphs/{id}_graph.json]
        Resolver --> Chunker[AST Function Chunker]
        Chunker -->|mxbai-embed-large\n1024-dim via Ollama| Qdrant[(Qdrant Local Vector Store\ndata/qdrant/)]
        RepoMgr --> SQLite[(SQLite Metadata DB\ndata/codeintel.db)]
    end

    subgraph Intelligence_Layer [3. Query & Impact Engine]
        NX --> Impact[Blast-Radius & Heuristic Risk Calculator]
        Qdrant --> Hybrid[Hybrid GraphRAG Retriever]
        NX -->|1-Hop & 2-Hop Call/Import Neighbors| Hybrid
        Hybrid -->|Grounded Context + File:Line| LLM[Ollama Local LLM\nqwen2.5:7b-instruct]
        LLM --> CiteCheck[Deterministic Citation Verifier]
    end

    Impact --> FastAPI
    CiteCheck --> FastAPI
```

### 5.2 Deterministic Heuristic Risk Scoring Formula (Module 5)

To guarantee that impact risk scores are transparent and never arbitrary LLM guesses, `app/services/impact/analyzer.py` calculates `risk_score` $\in [0, 100]$ deterministically:
1. **Direct Dependents Score ($S_{\text{direct}}$, max 35 pts):** $\min(35, \text{count}(\text{in\_edges}) \times 7)$
2. **Transitive Blast Radius Score ($S_{\text{trans}}$, max 25 pts):** $\min(25, \text{count}(\text{nx.ancestors}(G, \text{node})) \times 2.5)$
3. **API Exposure Score ($S_{\text{api}}$, max 20 pts):** $\min(20, \text{count}(\text{affected\_api\_endpoints}) \times 10)$
4. **Test Coverage Penalty ($S_{\text{test}}$, max 20 pts):** $0$ if at least 1 test file (`*test*` or `*spec*`) depends on the target or its direct callers; $+20$ penalty if **zero** test files cover the blast radius.
5. **Total Risk Score:** $S = S_{\text{direct}} + S_{\text{trans}} + S_{\text{api}} + S_{\text{test}}$
   - `Low`: $S < 30$
   - `Medium`: $30 \le S < 60$
   - `High`: $S \ge 60$

---

