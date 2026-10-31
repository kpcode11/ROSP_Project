from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import ingest_repository_pipeline, router
from app.config import ROOT_DIR, settings
from app.db import RepositoryRecord, get_session


def ensure_sample_repo_seeded() -> None:
    sample_dir = settings.DATA_DIR / "sample_ecommerce"
    if not sample_dir.exists() or not (sample_dir / "package.json").exists():
        import sys

        if str(ROOT_DIR) not in sys.path:
            sys.path.insert(0, str(ROOT_DIR))
        from scripts.create_sample_repo import create_sample_repo

        create_sample_repo(sample_dir)

    with get_session() as session:
        has_any = session.query(RepositoryRecord).first() is not None

    if not has_any or not (settings.graphs_dir / "sample_ecommerce_graph.json").exists():
        ingest_repository_pipeline(str(sample_dir), name="sample_ecommerce")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_sample_repo_seeded()
    yield


app = FastAPI(
    title="CodeIntel — Local-First Codebase Intelligence Platform",
    description="AST Knowledge Graph, Semantic Code Search, Grounded Hybrid GraphRAG & Change Impact Analyzer",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
