"""Phase 1 cli.py.tmpl extensions: assign + status + schedule subcommands."""
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


def test_cli_exposes_assign_command():
    text = _cli_text()
    assert '@cli.command("assign")' in text
    assert "def assign_cmd" in text


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


def test_cli_imports_phase1_modules():
    text = _cli_text()
    assert "from .assigner import" in text
    assert "from .status import" in text
    assert "from .scheduler import" in text
    assert "from .audit import" in text


def test_cli_assign_calls_log_event():
    text = _cli_text()
    # log_event must be called from assign_cmd context
    assert "log_event" in text


def test_cli_assign_invokes_run_assign():
    text = _cli_text()
    assert "run_assign(" in text


def test_cli_assign_loads_smtp_password_for_mail():
    text = _cli_text()
    # Mail send happens after run_assign — must read smtp_password
    assert text.count("smtp_password") >= 2  # compile_cmd + assign_cmd


def test_cli_schedule_install_calls_install_task():
    text = _cli_text()
    assert "install_task(" in text
    assert "uninstall_task(" in text
    assert "list_tasks(" in text


def test_cli_phase0_compile_still_works():
    """Regression: Phase 0 compile_cmd must still exist."""
    text = _cli_text()
    assert '@cli.command("compile")' in text
    assert "def compile_cmd" in text
