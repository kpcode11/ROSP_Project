import pathlib
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = pathlib.Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    EMBEDDING_MODEL: str = "mxbai-embed-large:latest"
    EMBEDDING_DIM: int = 1024
    LLM_MODEL: str = "qwen2.5:7b-instruct"
    DATA_DIR: pathlib.Path = ROOT_DIR / "data"
    MAX_FILES: int = 300
    MAX_FILE_SIZE_KB: int = 500
    USE_MOCK_AI: bool = False

    @property
    def repos_dir(self) -> pathlib.Path:
        p = self.DATA_DIR / "repos"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def graphs_dir(self) -> pathlib.Path:
        p = self.DATA_DIR / "graphs"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def qdrant_dir(self) -> pathlib.Path:
        p = self.DATA_DIR / "qdrant"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def db_path(self) -> pathlib.Path:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        return self.DATA_DIR / "codeintel.db"


settings = Settings()

