from pathlib import Path
from scripts.scaffold import scaffold_project

# This test file lives at skills/weekly/tests/test_scaffold.py; the bundle root
# is its grandparent. Computing it this way keeps tests CWD-independent.
BUNDLE_ROOT = Path(__file__).resolve().parent.parent


def test_scaffold_creates_expected_files(tmp_path: Path):
    target = tmp_path / "weekly_test"
    bundle_root = BUNDLE_ROOT
    scaffold_project(
        target=target,
        dept_slug="testdept",
        dept_name="테스트팀",
        bundle_root=bundle_root,
        install_pkg=False,
    )
    # Top-level files
    assert (target / "pyproject.toml").exists()
    assert (target / "requirements.txt").exists()
    assert (target / ".gitignore").exists()
    # Package files
    pkg = target / "weekly_runtime"
    assert (pkg / "__init__.py").exists()
    assert (pkg / "cli.py").exists()
    assert (pkg / "config.py").exists()
    assert (pkg / "keyring_helper.py").exists()
    assert (pkg / "llm_client.py").exists()
    assert (pkg / "excel.py").exists()
    assert (pkg / "compiler.py").exists()
    assert (pkg / "dashboard.py").exists()
    assert (pkg / "mailer.py").exists()
    assert (pkg / "storage" / "__init__.py").exists()
    assert (pkg / "storage" / "base.py").exists()
    assert (pkg / "storage" / "local.py").exists()
    # _llm.py is copied from scripts/lib/llm_call.py
    assert (pkg / "_llm.py").exists()
    # Templates + prompts shipped with the project
    assert (pkg / "templates" / "template_dashboard.html.j2").exists()
    assert (pkg / "prompts" / "compile_system.txt").exists()


def test_scaffold_renders_dept_vars(tmp_path: Path):
    target = tmp_path / "weekly_test"
    bundle_root = BUNDLE_ROOT
    scaffold_project(
        target=target,
        dept_slug="testdept",
        dept_name="테스트팀",
        bundle_root=bundle_root,
        install_pkg=False,
    )
    pyproject = (target / "pyproject.toml").read_text(encoding="utf-8")
    assert "weekly-runtime-testdept" in pyproject
    assert "테스트팀" in pyproject


def test_scaffold_llm_module_uses_subprocess(tmp_path: Path):
    """Verify the copied _llm.py uses subprocess (codex/gemini CLI), not openai SDK."""
    target = tmp_path / "weekly_test"
    bundle_root = BUNDLE_ROOT
    scaffold_project(
        target=target, dept_slug="x", dept_name="x",
        bundle_root=bundle_root, install_pkg=False,
    )
    llm_text = (target / "weekly_runtime" / "_llm.py").read_text(encoding="utf-8")
    assert "subprocess" in llm_text
    assert "from anthropic" not in llm_text
    assert "from openai" not in llm_text
    assert "from google.generativeai" not in llm_text
