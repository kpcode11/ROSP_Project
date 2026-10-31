from datetime import datetime, timezone
import json
from typing import Any
from sqlalchemy import String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from app.config import settings


class Base(DeclarativeBase):
    pass


class RepositoryRecord(Base):
    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), default="local")
    source_path: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="ready")
    languages_json: Mapped[str] = mapped_column(Text, default="{}")
    frameworks_json: Mapped[str] = mapped_column(Text, default="[]")
    stats_json: Mapped[str] = mapped_column(Text, default="{}")
    files_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[str] = mapped_column(
        String(64),
        default=lambda: datetime.now(timezone.utc).isoformat(),
    )
    updated_at: Mapped[str] = mapped_column(
        String(64),
        default=lambda: datetime.now(timezone.utc).isoformat(),
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "source_type": self.source_type,
            "source_path": self.source_path,
            "status": self.status,
            "languages": json.loads(self.languages_json or "{}"),
            "frameworks": json.loads(self.frameworks_json or "[]"),
            "stats": json.loads(self.stats_json or "{}"),
            "files": json.loads(self.files_json or "[]"),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        db_url = f"sqlite:///{settings.db_path.as_posix()}"
        _engine = create_engine(db_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=_engine)
    return _engine


def get_session() -> Session:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal()
