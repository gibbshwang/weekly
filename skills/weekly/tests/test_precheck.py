import pytest
from pathlib import Path
from scripts.precheck import precheck, PrecheckError


def test_precheck_passes_with_python_310():
    """Should pass on the actual interpreter (>= 3.10)."""
    precheck(target_dir=None)


def test_precheck_existing_target_with_files_raises(tmp_path: Path):
    target = tmp_path / "weekly_test"
    target.mkdir()
    (target / "config.yaml").touch()
    with pytest.raises(PrecheckError, match="already exists"):
        precheck(target_dir=target)


def test_precheck_empty_existing_target_ok(tmp_path: Path):
    """Empty dir is fine — caller may have created it."""
    target = tmp_path / "weekly_test"
    target.mkdir()
    precheck(target_dir=target)


def test_precheck_nonexistent_target_ok(tmp_path: Path):
    target = tmp_path / "does_not_exist_yet"
    precheck(target_dir=target)
