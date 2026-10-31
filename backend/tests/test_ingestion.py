import pathlib
from app.services.repository.manager import RepositoryManager


def test_scan_sample_ecommerce(sample_repo_path: pathlib.Path):
    mgr = RepositoryManager()
    inv = mgr.scan_repository(str(sample_repo_path), name="sample_ecommerce")

    assert inv.repo_id == "sample_ecommerce"
    assert len(inv.files) == 15
    assert inv.languages.get("javascript") == 13
    assert inv.languages.get("python") == 2
    assert "Express.js" in inv.frameworks
    assert "Mongoose" in inv.frameworks
    assert "Jest" in inv.frameworks

    paths = {f.path for f in inv.files}
    assert "backend/routes/userRoutes.js" in paths
    assert "backend/services/paymentService.js" in paths
    assert "analytics/fraud_detector.py" in paths
    for f in inv.files:
        assert "\\" not in f.path
        assert len(f.sha256) == 64


def test_ignored_directories_are_skipped(tmp_path: pathlib.Path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("def hello():\n    return 1\n", encoding="utf-8")
    (tmp_path / "node_modules" / "pkg").mkdir(parents=True)
    (tmp_path / "node_modules" / "pkg" / "index.js").write_text("console.log(1);", encoding="utf-8")
    (tmp_path / ".venv" / "lib").mkdir(parents=True)
    (tmp_path / ".venv" / "lib" / "site.py").write_text("x = 1", encoding="utf-8")

    mgr = RepositoryManager()
    inv = mgr.scan_repository(str(tmp_path), name="temp_repo")
    assert len(inv.files) == 1
    assert inv.files[0].path == "src/main.py"
