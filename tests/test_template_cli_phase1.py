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


# --- Phase 2 (Wave A.5): wreport prepare subcommand ---


def test_cli_exposes_prepare_command():
    text = _cli_text()
    assert '@cli.command("prepare")' in text
    assert "def prepare_cmd" in text


def test_cli_prepare_imports_prepare_module():
    text = _cli_text()
    assert "from .prepare import" in text
    assert "prepare_new_week" in text


def test_cli_prepare_takes_team_argument():
    """`wreport prepare <팀명>` matches the agreed CLI shape (E1 — 팀 단위)."""
    text = _cli_text()
    # Locate the prepare_cmd block
    assert '@cli.command("prepare")' in text
    # Argument named team (or similar) — the click decorator uses click.argument
    # for the positional. We assert the command body references the team config.
    assert "cfg.team" in text


def test_cli_prepare_supports_week_and_prev_week_overrides():
    """For manual triggers / testing: --week and --prev-week options."""
    text = _cli_text()
    assert "--week" in text  # already in compile/assign
    assert "--prev-week" in text


def test_cli_prepare_invokes_prepare_new_week():
    text = _cli_text()
    assert "prepare_new_week(" in text


def test_cli_prepare_fails_clearly_when_team_missing():
    """Phase 2 prepare requires cfg.team (Phase 2 form). Legacy `department`-
    only configs must produce a clear error rather than crash."""
    text = _cli_text()
    # The prepare_cmd should check cfg.team and exit with a useful message
    # (rather than letting an AttributeError bubble out as a stack trace).
    # We sanity-check that the message mentions `team` somewhere in the file.
    assert "cfg.team is None" in text or "cfg.team:" in text or "if not cfg.team" in text
