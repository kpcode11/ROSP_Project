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
    def _resolved_data_dir(self) -> pathlib.Path:
        if self.DATA_DIR.is_absolute():
            return self.DATA_DIR
        return (ROOT_DIR / self.DATA_DIR).resolve()

    @property
    def repos_dir(self) -> pathlib.Path:
        p = self._resolved_data_dir / "repos"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def graphs_dir(self) -> pathlib.Path:
        p = self._resolved_data_dir / "graphs"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def qdrant_dir(self) -> pathlib.Path:
        p = self._resolved_data_dir / "qdrant"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def db_path(self) -> pathlib.Path:
        base = self._resolved_data_dir
        base.mkdir(parents=True, exist_ok=True)
        return base / "codeintel.db"


settings = Settings()

