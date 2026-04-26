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


def test_cli_prepare_prev_week_is_relative_to_target_week():
    """Regression: when --week is specified (e.g. preparing a future week
    in advance, or backfilling a past week), prev_week default must derive
    from the *target* week, not from today's calendar.

    Old code used `_previous_iso_week()` (today - 7d) regardless of --week,
    which produced wildly wrong carry-forward sources for any week other
    than the current one."""
    text = _cli_text()
    # The fix: a week-aware helper exists and is used in prepare_cmd
    assert "_previous_iso_week_for(" in text, (
        "expected a `_previous_iso_week_for(week)` helper that parses the "
        "target week and returns Mon-of-target − 7d"
    )
    # The bug shape: today-relative default in prepare_cmd
    # (kept available as `_previous_iso_week` for the assign default tomorrow,
    # but prepare must NOT call it as the prev-week default)
    assert "prev_week = _previous_iso_week()" not in text, (
        "prepare_cmd must use _previous_iso_week_for(week), not the today-relative form"
    )


def test_cli_previous_iso_week_for_parses_target_week():
    """Helper computes Mon of target ISO week, subtracts 7d, returns year-week."""
    import importlib.util
    from pathlib import Path
    from scripts.lib.template_render import render_string
    template_path = Path(__file__).resolve().parent.parent / "templates" / "src" / "cli.py.tmpl"
    text = render_string(template_path.read_text(encoding="utf-8"), {})
    # Strip click decorators by exec-ing the module under a stub click —
    # easier: just exec the helper definitions only via importlib trick
    # Simplest: regex-extract the helper and exec it.
    import re
    m = re.search(
        r"def _previous_iso_week_for\(.*?\n(?:.*\n)*?    return [^\n]+\n",
        text,
    )
    assert m, "helper definition not found"
    # Exec the helper in a sandbox namespace
    ns = {}
    exec("from datetime import date, timedelta\n" + m.group(0), ns)
    f = ns["_previous_iso_week_for"]
    assert f("2026-W18") == "2026-W17"
    # Year-boundary case: W01 of 2026 → W53 of 2025? Need to check ISO
    # 2026-W01 starts 2025-12-29 (Mon). −7d = 2025-12-22 (Mon) = 2025-W52.
    assert f("2026-W01") == "2025-W52"


def test_cli_assign_catches_filenotfound_for_clean_cli_message():
    """assign_cmd must catch FileNotFoundError from run_assign and emit a
    clean CLI error (click.exceptions.Exit) rather than letting the
    traceback bubble up — improves cron-log readability and tells the
    operator what to do."""
    text = _cli_text()
    import re as _re
    m = _re.search(r"def assign_cmd\(.*?\n(?=\n@|\Z)", text, _re.DOTALL)
    assert m, "assign_cmd block not found"
    body = m.group(0)
    assert "except FileNotFoundError" in body, (
        "assign_cmd must catch FileNotFoundError from run_assign"
    )
    assert "click.exceptions.Exit" in body or "click.Abort" in body or "ctx.exit" in body, (
        "assign_cmd must exit cleanly via click rather than raising a Python traceback"
    )


def test_cli_assign_uses_lazy_llm_so_path_check_is_deferred():
    """assign cron runs hourly. If every queued instruction has 담당파트
    pre-filled (or there are no new rows at all), AI is not actually needed.
    The eager `get_llm_client(...)` call would still fail with 'codex CLI
    not found in PATH' if the binary is missing, breaking that tick.

    Fix: wrap construction in a lazy proxy so the PATH check only happens
    on the first real call inside resolve_target_part. compile_cmd is
    intentionally exempt — compile always uses AI."""
    import re as _re
    text = _cli_text()
    # Lazy proxy must be present (defined or imported)
    assert "_LazyLLM" in text or "lazy_llm" in text or "LazyLLM" in text, (
        "expected a lazy-LLM wrapper class so binary validation defers "
        "to first .call() inside resolve_target_part"
    )
    # Scope the eager-pattern check to assign_cmd only.
    m = _re.search(r"def assign_cmd\(.*?\n(?=\n@|\Z)", text, _re.DOTALL)
    assert m, "assign_cmd block not found"
    assign_body = m.group(0)
    assert "llm = get_llm_client(" not in assign_body, (
        "assign_cmd must not eagerly construct LLMClient; wrap in lazy proxy"
    )


def test_cli_assign_state_path_is_team_root_not_week_dir():
    """Regression: assign state must live at team root, not inside week_dir.
    Otherwise every new week starts with empty state and re-assigns every
    long-lived row in 지시사항.xlsx (CRITICAL — produces duplicate rows in
    next week's 지난주 carry-forward + 이번주 re-assignment)."""
    text = _cli_text()
    # The fix: state at team root (storage_root / "_assignments_state.json")
    assert 'storage_root / "_assignments_state.json"' in text, (
        "assign state must be at team root for cross-week deduplication"
    )
    # The bug shape: state at week_dir
    assert 'week_dir / "_assignments_state.json"' not in text, (
        "assign state must NOT be inside week_dir — that path causes "
        "cross-week re-assignment of long-lived directives"
    )


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
