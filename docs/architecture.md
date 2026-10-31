# CodeIntel System Architecture

## 1. End-to-End Processing Pipeline

```mermaid
flowchart TD
    User([Developer / Browser / CLI]) --> NextJS["Next.js Dashboard (@xyflow/react + Dagre)"]
    NextJS <-->|REST JSON Contract| FastAPI["FastAPI Backend (:8000)"]

    subgraph Static_AST_Engine ["1. Deterministic Static Analysis Engine"]
        FastAPI --> RepoMgr["Repository Manager (Git / Local / ZIP)"]
        RepoMgr --> Filter["Language & Ignore Filter"]
        Filter --> TS["Tree-sitter AST Engine (Python, JS, TS, Java)"]
        TS --> Resolver["Cross-File Symbol & Call Resolver"]
    end

    subgraph Embedded_Storage ["2. Zero-Docker Local Embedded Storage"]
        Resolver --> NX["NetworkX DiGraph (data/graphs/{id}_graph.json)"]
        Resolver --> Chunker["AST Semantic Chunker"]
        Chunker -->|"mxbai-embed-large:latest (1024-dim)"| Qdrant[("Embedded Qdrant (data/qdrant/)")]
        RepoMgr --> SQLite[("SQLite Metadata DB (data/codeintel.db)")]
    end

    subgraph Intelligence_Engine ["3. Grounded GraphRAG & Blast-Radius Engine"]
        NX --> Impact["Deterministic Blast-Radius & Risk Scorer"]
        Qdrant --> Hybrid["Hybrid GraphRAG Retriever"]
        NX -->|"1-Hop Callers, Callees, Routes & Models"| Hybrid
        Hybrid -->|"Grounded Evidence + Line Numbers"| LLM["Ollama qwen2.5:7b-instruct"]
        LLM --> Verifier["Deterministic Citation Sanitizer"]
    end

    Impact --> FastAPI
    Verifier --> FastAPI
```

## 2. Core Architectural Principles

1. **Deterministic Static Analysis First:**
   - Every node (`file`, `class`, `function`, `method`, `api_endpoint`, `model`) and directed edge (`DECLARES`, `IMPORTS`, `CALLS`, `INHERITS`, `ROUTES_TO`, `QUERIES`) is extracted deterministically via `tree-sitter` and resolved via `CrossFileResolver`.
   - Graph centrality is computed using `NetworkX` PageRank on the reversed functional dependency subgraph so foundational models and core services surface automatically.

2. **Explainable Heuristic Risk Formula:**
   - Given any target node $v$, `ImpactAnalyzer` traverses reverse functional edges to identify 1-hop direct dependents, $k$-hop transitive dependents, exposed API endpoints, and regression test files:
     $$S = S_{\text{direct}} (\le 35) + S_{\text{trans}} (\le 25) + S_{\text{api}} (\le 20) + S_{\text{test\_penalty}} (\le 20)$$
   - Risk levels: `Low` ($S < 30$), `Medium` ($30 \le S < 60$), `High` ($S \ge 60$).

3. **Zero-Hallucination Citation Sanitizer:**
   - Every citation emitted by the Hybrid GraphRAG assistant is cross-checked against the repository's indexed file inventory and line bounds before returning to the client.

