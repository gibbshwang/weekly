"""cli.py.tmpl structure tests — Phase 2 commands + dispatch."""
from pathlib import Path
from scripts.lib.template_render import render_string


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _cli_text() -> str:
    return render_string(
        (PROJECT_ROOT / "templates/src/cli.py.tmpl").read_text(encoding="utf-8"), {}
    )


def test_cli_compiles():
    text = _cli_text()
    compile(text, "cli.py", "exec")


# --- Subcommands present ---


def test_cli_exposes_init_command():
    text = _cli_text()
    assert '@cli.command("init")' in text
    assert "def init_cmd" in text


def test_cli_exposes_prepare_command():
    text = _cli_text()
    assert '@cli.command("prepare")' in text
    assert "def prepare_cmd" in text


def test_cli_exposes_assign_command():
    text = _cli_text()
    assert '@cli.command("assign")' in text
    assert "def assign_cmd" in text


def test_cli_exposes_compile_command():
    text = _cli_text()
    assert '@cli.command("compile")' in text
    assert "def compile_cmd" in text


def test_cli_exposes_status_command():
    text = _cli_text()
    assert '@cli.command("status")' in text
    assert "def status_cmd" in text


def test_cli_exposes_schedule_subgroup():
    text = _cli_text()
    assert '@cli.group("schedule")' in text or "schedule_group" in text
    assert "schedule_install_cmd" in text or '@schedule_group.command("install")' in text
    assert "schedule_uninstall_cmd" in text or '@schedule_group.command("uninstall")' in text
    assert "schedule_status_cmd" in text or '@schedule_group.command("status")' in text


# --- Module imports ---


def test_cli_imports_runtime_modules():
    text = _cli_text()
    for line in (
        "from .config import",
        "from .compiler import",
        "from .dashboard import",
        "from .assigner import",
        "from .status import",
        "from .scheduler import",
        "from .audit import",
        "from .excel import",
        "from .prepare import",
        "from .mailer import",
    ):
        assert line in text, f"missing import: {line}"


def test_cli_imports_phase2_helpers():
    """Phase 2 canonical names must be in scope."""
    text = _cli_text()
    assert "render_dashboard" in text
    assert "run_compile" in text
    assert "collect_parts" in text
    assert "run_assign" in text
    assert "read_instructions" in text
    assert "prepare_new_week" in text


# --- Behavior assertions on the rendered template text ---


def test_cli_assign_calls_log_event():
    text = _cli_text()
    assert "log_event" in text


def test_cli_assign_invokes_run_assign():
    text = _cli_text()
    assert "run_assign(" in text


def test_cli_uses_team_throughout():
    """All commands operate on cfg.team (no legacy cfg.department references)."""
    text = _cli_text()
    assert "cfg.team" in text
    # Legacy attributes must NOT appear anywhere in the CLI body
    assert "cfg.department" not in text
    assert "cfg.group_lead" not in text
    assert "cfg.part_leads" not in text


def test_cli_compile_uses_team_aware_email_recipients():
    """Per agreed B1: cc list = group leads + part leads (deduplicated)."""
    text = _cli_text()
    assert "all_part_lead_emails" in text
    assert "all_group_lead_emails" in text
    assert "cfg.team.lead.email" in text


def test_cli_schedule_install_three_crons():
    text = _cli_text()
    idx = text.find("def schedule_install_cmd")
    body = text[idx:idx + 4000]
    assert "prepare_cron" in body
    assert "prepare" in body and "assign" in body and "compile" in body


def test_cli_prepare_supports_week_and_prev_week_overrides():
    text = _cli_text()
    assert "--week" in text
    assert "--prev-week" in text


def test_cli_prepare_invokes_prepare_new_week():
    text = _cli_text()
    assert "prepare_new_week(" in text


def test_cli_schedule_install_calls_install_task():
    text = _cli_text()
    assert "install_task(" in text
    assert "uninstall_task(" in text
    assert "list_tasks(" in text


def test_cli_assign_loads_smtp_password_for_mail():
    """Mail send happens after run_assign — must read smtp_password.
    Both compile + assign now use it."""
    text = _cli_text()
    assert text.count("smtp_password") >= 2


def test_schedule_config_has_prepare_cron_default():
    config_path = PROJECT_ROOT / "templates/src/config.py.tmpl"
    text = config_path.read_text(encoding="utf-8")
    assert "prepare_cron" in text
    assert 'prepare_cron: str' in text or 'prepare_cron:' in text
