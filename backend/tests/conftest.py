import pathlib
import sys
import pytest

BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


@pytest.fixture(scope="session")
def sample_repo_path() -> pathlib.Path:
    from scripts.create_sample_repo import create_sample_repo

    target = REPO_ROOT / "data" / "sample_ecommerce"
    if not target.exists() or not (target / "package.json").exists():
        create_sample_repo(target)
    return target
