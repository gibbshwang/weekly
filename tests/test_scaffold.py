from pathlib import Path
from scripts.scaffold import scaffold_project


BUNDLE_ROOT = Path(__file__).resolve().parent.parent


def test_scaffold_creates_expected_files(tmp_path: Path):
    target = tmp_path / "weekly_test"
    scaffold_project(
        target=target,
        team_slug="testteam",
        team_name="테스트팀",
        bundle_root=BUNDLE_ROOT,
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
    assert (pkg / "prepare.py").exists()  # Phase 2 module
    assert (pkg / "storage" / "__init__.py").exists()
    assert (pkg / "storage" / "base.py").exists()
    assert (pkg / "storage" / "local.py").exists()
    # _llm.py is copied from scripts/lib/llm_call.py
    assert (pkg / "_llm.py").exists()
    # xlsx_template.py is copied from scripts/xlsx_template.py — runtime imports
    # depend on it (prepare/assigner/compiler all use weekly_runtime.xlsx_template).
    assert (pkg / "xlsx_template.py").exists()
    # Phase 2 templates + prompts
    assert (pkg / "templates" / "template_dashboard_v2.html.j2").exists()
    assert (pkg / "prompts" / "compile_system_v2.txt").exists()


def test_scaffold_runtime_can_import_xlsx_template_without_scripts(tmp_path: Path):
    """Regression: standalone runtime must not fall back to scripts.xlsx_template.

    The runtime modules try `weekly_runtime.xlsx_template` first and fall back
    to `scripts.xlsx_template` for harness tests. The fallback should NEVER
    execute in a real scaffolded project — there's no scripts/ folder there.
    Verify the file is present so the primary import succeeds.
    """
    target = tmp_path / "weekly_test"
    scaffold_project(
        target=target, team_slug="x", team_name="x",
        bundle_root=BUNDLE_ROOT, install_pkg=False,
    )
    xlsx_path = target / "weekly_runtime" / "xlsx_template.py"
    assert xlsx_path.exists(), "xlsx_template.py missing — runtime ImportError"
    text = xlsx_path.read_text(encoding="utf-8")
    # Sanity: it's the right module (Phase 2 generators present)
    assert "PART_SHEET_HEADERS" in text
    assert "generate_part_xlsx" in text
    assert "generate_directives_xlsx" in text


def test_scaffold_renders_team_vars(tmp_path: Path):
    target = tmp_path / "weekly_test"
    scaffold_project(
        target=target,
        team_slug="testteam",
        team_name="테스트팀",
        bundle_root=BUNDLE_ROOT,
        install_pkg=False,
    )
    pyproject = (target / "pyproject.toml").read_text(encoding="utf-8")
    assert "weekly-runtime-testteam" in pyproject
    assert "테스트팀" in pyproject


def test_scaffold_llm_module_uses_subprocess(tmp_path: Path):
    """The copied _llm.py uses subprocess (codex/gemini CLI), not openai SDK."""
    target = tmp_path / "weekly_test"
    scaffold_project(
        target=target, team_slug="x", team_name="x",
        bundle_root=BUNDLE_ROOT, install_pkg=False,
    )
    llm_text = (target / "weekly_runtime" / "_llm.py").read_text(encoding="utf-8")
    assert "subprocess" in llm_text
    assert "from anthropic" not in llm_text
    assert "from openai" not in llm_text
    assert "from google.generativeai" not in llm_text


def test_scaffold_copies_phase1_files(tmp_path: Path):
    """All runtime modules + assign_system prompt are copied."""
    target = tmp_path / "weekly_test"
    scaffold_project(
        target=target, team_slug="x", team_name="x",
        bundle_root=BUNDLE_ROOT, install_pkg=False,
    )
    pkg = target / "weekly_runtime"
    assert (pkg / "assigner.py").exists()
    assert (pkg / "status.py").exists()
    assert (pkg / "scheduler.py").exists()
    assert (pkg / "audit.py").exists()
    assert (pkg / "storage" / "smb.py").exists()
    assert (pkg / "prompts" / "assign_system.txt").exists()
