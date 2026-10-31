import json
import pathlib

EXTENSION_TO_LANGUAGE: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".java": "java",
}

IGNORED_DIRS: set[str] = {
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "venv",
    ".venv",
    "__pycache__",
    "coverage",
    ".idea",
    ".vscode",
    ".pytest_cache",
    ".ruff_cache",
    "target",
    "out",
}

IGNORED_EXTENSIONS: set[str] = {
    ".lock",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".pdf",
    ".onnx",
    ".db",
    ".sqlite",
    ".sqlite3",
    ".zip",
    ".tar",
    ".gz",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".mp3",
    ".pyc",
    ".class",
    ".jar",
    ".exe",
    ".dll",
    ".so",
}

IGNORED_FILENAMES: set[str] = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "Cargo.lock",
}


def detect_language(file_path: pathlib.Path) -> str | None:
    ext = file_path.suffix.lower()
    return EXTENSION_TO_LANGUAGE.get(ext)


def is_ignored_path(rel_parts: tuple[str, ...], file_name: str, suffix: str) -> bool:
    for part in rel_parts:
        if part in IGNORED_DIRS or part.startswith(".venv"):
            return True
    if file_name in IGNORED_FILENAMES:
        return True
    if suffix.lower() in IGNORED_EXTENSIONS:
        return True
    if file_name.endswith(".min.js") or file_name.endswith(".bundle.js"):
        return True
    return False


def detect_frameworks(repo_root: pathlib.Path) -> list[str]:
    frameworks: set[str] = set()

    pkg_json = repo_root / "package.json"
    if pkg_json.exists():
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8", errors="ignore"))
            deps = {
                **data.get("dependencies", {}),
                **data.get("devDependencies", {}),
            }
            if "express" in deps:
                frameworks.add("Express.js")
            if "next" in deps:
                frameworks.add("Next.js")
            if "react" in deps:
                frameworks.add("React")
            if "@nestjs/core" in deps:
                frameworks.add("NestJS")
            if "mongoose" in deps:
                frameworks.add("Mongoose")
            if "prisma" in deps or "@prisma/client" in deps:
                frameworks.add("Prisma")
            if "jest" in deps:
                frameworks.add("Jest")
        except Exception:
            pass

    pyproject = repo_root / "pyproject.toml"
    if pyproject.exists():
        text = pyproject.read_text(encoding="utf-8", errors="ignore").lower()
        if "fastapi" in text:
            frameworks.add("FastAPI")
        if "django" in text:
            frameworks.add("Django")
        if "flask" in text:
            frameworks.add("Flask")
        if "sqlalchemy" in text:
            frameworks.add("SQLAlchemy")
        if "pytest" in text:
            frameworks.add("Pytest")

    req_txt = repo_root / "requirements.txt"
    if req_txt.exists():
        text = req_txt.read_text(encoding="utf-8", errors="ignore").lower()
        if "fastapi" in text:
            frameworks.add("FastAPI")
        if "django" in text:
            frameworks.add("Django")
        if "flask" in text:
            frameworks.add("Flask")
        if "sqlalchemy" in text:
            frameworks.add("SQLAlchemy")

    pom_xml = repo_root / "pom.xml"
    if pom_xml.exists():
        text = pom_xml.read_text(encoding="utf-8", errors="ignore").lower()
        if "spring-boot" in text or "springframework" in text:
            frameworks.add("Spring Boot")

    return sorted(frameworks)

