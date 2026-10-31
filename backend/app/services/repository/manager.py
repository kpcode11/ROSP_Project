import hashlib
import os
import pathlib
import re
import shutil
import zipfile

from app.config import ROOT_DIR, settings
from app.schemas.repository import FileRecord, RepositoryInventory
from app.services.repository.language_detector import (
    detect_frameworks,
    detect_language,
    is_ignored_path,
)


def slugify_repo_id(name: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9_-]+", "-", name.strip().lower()).strip("-")
    return clean or "repo"


class RepositoryManager:
    def __init__(
        self,
        max_files: int | None = None,
        max_file_size_kb: int | None = None,
    ):
        self.max_files = max_files or settings.MAX_FILES
        self.max_file_size_bytes = (max_file_size_kb or settings.MAX_FILE_SIZE_KB) * 1024

    def resolve_source(
        self, source: str, name: str | None = None
    ) -> tuple[str, str, pathlib.Path, str]:
        """Returns (repo_id, display_name, local_root_path, source_type)."""
        source_clean = source.strip()

        if source_clean in ("sample_ecommerce", "sample-ecommerce", "default"):
            sample_path = settings.DATA_DIR / "sample_ecommerce"
            if not sample_path.exists():
                sample_path = ROOT_DIR / "data" / "sample_ecommerce"
            repo_name = name or "sample_ecommerce"
            return "sample_ecommerce", repo_name, sample_path.resolve(), "local"

        if source_clean.startswith(("http://", "https://", "git@")):
            import git

            inferred_name = name or source_clean.rstrip("/").split("/")[-1].replace(".git", "")
            repo_id = slugify_repo_id(inferred_name)
            dest = settings.repos_dir / repo_id
            if dest.exists():
                shutil.rmtree(dest)
            git.Repo.clone_from(source_clean, str(dest), depth=1)
            return repo_id, inferred_name, dest.resolve(), "git"

        path_obj = pathlib.Path(source_clean)
        if not path_obj.is_absolute():
            candidate = (ROOT_DIR / path_obj).resolve()
            if candidate.exists():
                path_obj = candidate
            else:
                path_obj = path_obj.resolve()

        if not path_obj.exists():
            raise FileNotFoundError(f"Repository source path does not exist: {source_clean}")

        if path_obj.is_file() and path_obj.suffix.lower() == ".zip":
            inferred_name = name or path_obj.stem
            repo_id = slugify_repo_id(inferred_name)
            dest = settings.repos_dir / repo_id
            if dest.exists():
                shutil.rmtree(dest)
            dest.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(path_obj, "r") as zf:
                zf.extractall(dest)
            return repo_id, inferred_name, dest.resolve(), "zip"

        inferred_name = name or path_obj.name
        repo_id = slugify_repo_id(inferred_name)
        return repo_id, inferred_name, path_obj.resolve(), "local"

    def scan_repository(
        self, source: str, name: str | None = None
    ) -> RepositoryInventory:
        repo_id, repo_name, root_path, source_type = self.resolve_source(source, name)

        files: list[FileRecord] = []
        languages: dict[str, int] = {}
        skipped = 0

        for dirpath, dirnames, filenames in os.walk(root_path):
            rel_dir = pathlib.Path(dirpath).relative_to(root_path)
            # Prune ignored directories in-place so os.walk never descends into them
            dirnames[:] = sorted(
                d
                for d in dirnames
                if not is_ignored_path(rel_dir.parts + (d,), d, "")
            )

            for fname in sorted(filenames):
                if len(files) >= self.max_files:
                    skipped += 1
                    continue

                full_path = pathlib.Path(dirpath) / fname
                rel_path = full_path.relative_to(root_path)

                if is_ignored_path(rel_path.parts, fname, full_path.suffix):
                    skipped += 1
                    continue

                lang = detect_language(full_path)
                if not lang:
                    skipped += 1
                    continue

                try:
                    stat = full_path.stat()
                except OSError:
                    skipped += 1
                    continue

                if stat.st_size > self.max_file_size_bytes or stat.st_size == 0:
                    skipped += 1
                    continue

                try:
                    raw_bytes = full_path.read_bytes()
                    text_content = raw_bytes.decode("utf-8", errors="replace")
                except OSError:
                    skipped += 1
                    continue

                sha256_hash = hashlib.sha256(raw_bytes).hexdigest()
                line_count = len(text_content.splitlines()) or 1
                posix_rel = rel_path.as_posix()

                files.append(
                    FileRecord(
                        path=posix_rel,
                        language=lang,
                        size_bytes=stat.st_size,
                        sha256=sha256_hash,
                        line_count=line_count,
                    )
                )
                languages[lang] = languages.get(lang, 0) + 1

        frameworks = detect_frameworks(root_path)
        if "python" in languages and not any(
            f in frameworks for f in ("FastAPI", "Django", "Flask")
        ):
            frameworks.append("Python Microservice")

        return RepositoryInventory(
            repo_id=repo_id,
            name=repo_name,
            root_path=root_path.as_posix(),
            source_type=source_type,  # type: ignore[arg-type]
            source_location=source,
            files=files,
            languages=languages,
            frameworks=sorted(set(frameworks)),
            skipped_files_count=skipped,
        )

