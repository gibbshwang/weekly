import importlib.util
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
from scripts.lib.template_render import render_string


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_sched(tmp_path: Path):
    text = render_string(
        (PROJECT_ROOT / "templates/src/scheduler.py.tmpl").read_text(encoding="utf-8"), {}
    )
    out = tmp_path / "scheduler.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("sched", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_install_windows_invokes_schtasks(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "win32")
    s = _load_sched(tmp_path)
    fake_run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = fake_run
        s.install_task(
            name="weekly-기획팀-assign",
            cron="0 * * * *",
            argv=[r"C:\weekly\기획팀\venv\Scripts\wreport.exe", "assign", "기획팀"],
            working_dir=r"C:\weekly\기획팀",
        )
    cmd = fake_run.call_args[0][0]
    assert cmd[0] == "schtasks"
    assert "/Create" in cmd
    full_cmd_str = " ".join(cmd)
    assert "weekly-기획팀-assign" in full_cmd_str
    assert "/SC" in full_cmd_str
    assert "HOURLY" in full_cmd_str


def test_install_windows_translates_weekly_cron(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "win32")
    s = _load_sched(tmp_path)
    fake_run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = fake_run
        s.install_task(
            name="weekly-x-compile",
            cron="0 17 * * 5",  # Friday 17:00
            argv=["wreport", "compile", "x"],
            working_dir="/x",
        )
    cmd = fake_run.call_args[0][0]
    full_cmd_str = " ".join(cmd)
    assert "WEEKLY" in full_cmd_str
    assert "FRI" in full_cmd_str
    assert "17:00" in full_cmd_str


def test_install_unix_writes_crontab(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    # First call: crontab -l (existing) returns empty
    # Second call: crontab - (write) succeeds
    call_count = {"n": 0}
    inputs_captured = []
    def run_side_effect(*args, **kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return MagicMock(returncode=0, stdout="", stderr="")
        if call_count["n"] == 2:
            inputs_captured.append(kwargs.get("input"))
            return MagicMock(returncode=0, stdout="", stderr="")
        return MagicMock(returncode=0)
    fake_run = MagicMock(side_effect=run_side_effect)
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = fake_run
        s.install_task(
            name="weekly-기획팀-assign",
            cron="0 * * * *",
            argv=["/home/u/weekly/기획팀/venv/bin/wreport", "assign", "기획팀"],
            working_dir="/home/u/weekly/기획팀",
        )
    written = inputs_captured[0]
    assert "weekly-managed: weekly-기획팀-assign" in written
    assert "0 * * * *" in written


def test_uninstall_windows_invokes_delete(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "win32")
    s = _load_sched(tmp_path)
    fake_run = MagicMock(return_value=MagicMock(returncode=0))
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = fake_run
        s.uninstall_task("weekly-기획팀-assign")
    cmd = fake_run.call_args[0][0]
    full_cmd_str = " ".join(cmd)
    assert "schtasks" in full_cmd_str
    assert "/Delete" in cmd
    assert "weekly-기획팀-assign" in full_cmd_str


def test_list_windows_returns_registered_tasks(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "win32")
    s = _load_sched(tmp_path)
    fake_run = MagicMock(return_value=MagicMock(
        returncode=0,
        stdout='"TaskName","Status"\n"\\weekly-기획팀-assign","Ready"\n"\\OtherTask","Ready"\n',
        stderr="",
    ))
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = fake_run
        registered = s.list_tasks(prefix="weekly-기획팀-")
    assert "weekly-기획팀-assign" in registered
    assert "OtherTask" not in registered


# --- Command-injection hardening (FIX-03 + FIX-04) ---

import pytest


@pytest.mark.parametrize("bad_cron", [
    "0 * * * * ; rm -rf /",     # shell injection via extra command
    "0\n* * * *",                # newline → new crontab line
    "0 * * * * `cat /etc/passwd`",  # backtick subshell
    "0 * * * * $(whoami)",       # $() subshell
    "0 * * * * \" 1",            # double quote
    "* * *",                     # too few fields
    "0 0 0 0 0 0 0",             # too many fields
    "",                          # empty
])
def test_install_rejects_dangerous_cron(tmp_path: Path, monkeypatch, bad_cron):
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
        with pytest.raises(ValueError):
            s.install_task(
                name="weekly-x-assign", cron=bad_cron,
                argv=["wreport", "assign", "x"], working_dir="/x",
            )


@pytest.mark.parametrize("bad_dir", [
    'C:\\foo" & calc.exe & echo "',   # quote escape into schtasks /TR string
    "/tmp\nMALICIOUS",                  # newline → new cron line
    "/tmp\x00null",                     # NUL byte
    "/tmp\rcarriage",                   # CR
    "/some%percent",                    # % is special in crontab
])
def test_install_rejects_dangerous_working_dir(tmp_path: Path, monkeypatch, bad_dir):
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
        with pytest.raises(ValueError):
            s.install_task(
                name="weekly-x-assign", cron="0 * * * *",
                argv=["wreport", "assign", "x"], working_dir=bad_dir,
            )


@pytest.mark.parametrize("bad_argv_element", [
    "assign\nrm -rf /",   # newline inside an arg → smuggle new crontab line
    "assign\x00inject",   # NUL byte
    "x\rcr",              # carriage return
    "use%special",        # `%` is special in crontab — splits cmd from stdin
])
def test_install_rejects_dangerous_argv_element(tmp_path: Path, monkeypatch, bad_argv_element):
    """The argv API still validates each element so platform-shell-bearing
    chars (CR/LF/NUL/%) cannot smuggle through. Note: `\"` is now permitted
    in argv elements because we quote each one internally."""
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
        with pytest.raises(ValueError):
            s.install_task(
                name="weekly-x-assign", cron="0 * * * *",
                argv=["wreport", bad_argv_element, "x"], working_dir="/x",
            )


def test_install_rejects_empty_argv(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock()
        with pytest.raises(ValueError):
            s.install_task(
                name="weekly-x-assign", cron="0 * * * *",
                argv=[], working_dir="/x",
            )


@pytest.mark.parametrize("bad_name", [
    "weekly-../etc-assign",
    "weekly-foo bar-assign",     # space
    "weekly-foo;rm-assign",      # semicolon
    "weekly-foo\nbar-assign",
    "",
])
def test_install_rejects_dangerous_task_name(tmp_path: Path, monkeypatch, bad_name):
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
        with pytest.raises(ValueError):
            s.install_task(
                name=bad_name, cron="0 * * * *",
                argv=["wreport", "assign", "x"], working_dir="/x",
            )


def test_install_unix_quotes_working_dir(tmp_path: Path, monkeypatch):
    """working_dir with spaces or shell-special characters must be safely quoted
    in the generated cron line so it expands to a single argument."""
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    inputs_captured = []
    call_count = {"n": 0}
    def run_side_effect(*args, **kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return MagicMock(returncode=0, stdout="", stderr="")
        inputs_captured.append(kwargs.get("input"))
        return MagicMock(returncode=0, stdout="", stderr="")
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(side_effect=run_side_effect)
        s.install_task(
            name="weekly-x-assign", cron="0 * * * *",
            argv=["wreport", "assign", "x"],
            working_dir="/home/u/weekly project/팀",   # legitimate space
        )
    written = inputs_captured[0]
    # shlex.quote wraps with single quotes when needed
    assert "'/home/u/weekly project/팀'" in written, (
        f"working_dir not shlex-quoted in cron line:\n{written}"
    )


def test_unix_write_crontab_failure_raises(tmp_path: Path, monkeypatch):
    """If `crontab -` exits non-zero, install_task must raise — silent failure
    leaves the user thinking their job was scheduled when it wasn't."""
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    call_count = {"n": 0}
    def run_side_effect(*args, **kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return MagicMock(returncode=0, stdout="", stderr="")
        # write attempt fails
        return MagicMock(returncode=1, stdout="", stderr="crontab: invalid")
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(side_effect=run_side_effect)
        with pytest.raises(RuntimeError, match="crontab.*failed|invalid"):
            s.install_task(
                name="weekly-x-assign", cron="0 * * * *",
                argv=["wreport", "assign", "x"], working_dir="/x",
            )


def test_install_korean_name_still_works(tmp_path: Path, monkeypatch):
    """Sanity: the existing `weekly-기획팀-assign` flow still works after validation."""
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    call_count = {"n": 0}
    def run_side_effect(*args, **kwargs):
        call_count["n"] += 1
        return MagicMock(returncode=0, stdout="", stderr="")
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(side_effect=run_side_effect)
        s.install_task(
            name="weekly-기획팀-assign", cron="0 * * * *",
            argv=["/x/venv/bin/wreport", "assign", "기획팀"],
            working_dir="/x",
        )


# --- argv API regression (Review fix: schedule install quote conflict) ---


def _capture_unix_run(state):
    """Helper: side_effect that records crontab-write input as state['written']."""
    def side_effect(*args, **kwargs):
        state["n"] = state.get("n", 0) + 1
        if state["n"] == 1:
            return MagicMock(returncode=0, stdout="", stderr="")
        state["written"] = kwargs.get("input")
        return MagicMock(returncode=0, stdout="", stderr="")
    return side_effect


def test_install_task_accepts_argv_list_unix(tmp_path: Path, monkeypatch):
    """install_task must accept argv: List[str] so callers don't have to
    embed quotes themselves. Regression for the bug where schedule_install
    passed `f'\"{wreport}\" prepare {team}'` only to be rejected by the
    forbidden-quote validator."""
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    state = {}
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(side_effect=_capture_unix_run(state))
        s.install_task(
            name="weekly-기획팀-prepare",
            cron="0 6 * * 1",
            argv=["/home/u/weekly/기획팀/venv/bin/wreport", "prepare", "기획팀"],
            working_dir="/home/u/weekly/기획팀",
        )
    written = state["written"]
    # All three argv tokens land in the cron line
    assert "/home/u/weekly/기획팀/venv/bin/wreport" in written
    assert "prepare" in written
    assert "기획팀" in written
    # working_dir still gets shlex-quoted
    assert "'/home/u/weekly/기획팀'" in written or "/home/u/weekly/기획팀" in written


def test_install_task_quotes_argv_with_spaces_unix(tmp_path: Path, monkeypatch):
    """argv elements containing spaces must be shlex-quoted in the cron
    line so cron's shell sees them as a single argument."""
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    state = {}
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(side_effect=_capture_unix_run(state))
        s.install_task(
            name="weekly-x-prepare",
            cron="0 6 * * 1",
            argv=["/path with spaces/wreport", "prepare", "팀 이름"],
            working_dir="/x",
        )
    written = state["written"]
    assert "'/path with spaces/wreport'" in written
    assert "'팀 이름'" in written


def test_install_task_argv_supports_paths_with_double_quote_unsafe_chars(tmp_path: Path, monkeypatch):
    """Even if a path contains characters the OLD command-string API rejected
    (e.g. spaces), argv API succeeds because each element is quoted internally."""
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    state = {}
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(side_effect=_capture_unix_run(state))
        # No exception — old API would have raised here
        s.install_task(
            name="weekly-x-assign",
            cron="0 * * * *",
            argv=["/usr/local/wreport with spaces", "assign", "x"],
            working_dir="/x",
        )


def test_install_task_argv_rejects_newline_in_element(tmp_path: Path, monkeypatch):
    """Validation still applies — newlines inside an argv element would
    smuggle a new crontab line."""
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    import pytest
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock()
        with pytest.raises(ValueError):
            s.install_task(
                name="weekly-x-assign", cron="0 * * * *",
                argv=["wreport", "assign\nrm -rf /", "x"],
                working_dir="/x",
            )


def test_install_task_argv_rejects_nul_in_element(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    import pytest
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock()
        with pytest.raises(ValueError):
            s.install_task(
                name="weekly-x-assign", cron="0 * * * *",
                argv=["wreport", "assign\x00inject", "x"],
                working_dir="/x",
            )


@pytest.mark.parametrize("cmd_meta", ["&", "|", "<", ">", "^"])
def test_install_task_argv_rejects_windows_cmd_meta_on_win32(tmp_path: Path, monkeypatch, cmd_meta):
    """Windows defense-in-depth: even though weekly's own validators keep
    team/group/part names slug-safe, a third-party caller of install_task
    could pass a value like 'x&calc.exe'. On Windows that becomes a
    cmd.exe metacharacter inside the /TR string. Reject before it reaches
    schtasks. (Unix platforms handle these via shlex.quote and don't need
    to reject — covered by test_install_task_quotes_argv_with_spaces_unix.)"""
    monkeypatch.setattr(sys, "platform", "win32")
    s = _load_sched(tmp_path)
    fake_run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = fake_run
        with pytest.raises(ValueError):
            s.install_task(
                name="weekly-x-assign", cron="0 * * * *",
                argv=[r"C:\path\wreport.exe", "assign", f"x{cmd_meta}calc"],
                working_dir=r"C:\x",
            )


def test_install_task_argv_allows_windows_cmd_meta_on_unix(tmp_path: Path, monkeypatch):
    """Unix shells handle &|<>^ via shlex.quote. The win32-specific reject
    must NOT fire on Unix platforms (or tests would over-restrict)."""
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    state = {}
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(side_effect=_capture_unix_run(state))
        # No exception — `&` survives via shlex.quote
        s.install_task(
            name="weekly-x-assign", cron="0 * * * *",
            argv=["wreport", "assign", "x&y"],
            working_dir="/x",
        )
    written = state["written"]
    assert "'x&y'" in written, f"shlex.quote should wrap with `'`: {written}"


def test_install_task_argv_windows_quotes_every_arg(tmp_path: Path, monkeypatch):
    """Defense-in-depth: on Windows, every argv element gets wrapped in
    `\"...\"` so a careless caller can't accidentally produce a cmd.exe
    parsing surprise even with a value the validator missed."""
    monkeypatch.setattr(sys, "platform", "win32")
    s = _load_sched(tmp_path)
    fake_run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = fake_run
        s.install_task(
            name="weekly-x-prepare",
            cron="0 6 * * 1",
            argv=[r"C:\path\wreport.exe", "prepare", "팀"],
            working_dir=r"C:\path",
        )
    cmd = fake_run.call_args[0][0]
    tr_value = cmd[cmd.index("/TR") + 1]
    # All three args quoted (path / sub-command / team name)
    assert r'"C:\path\wreport.exe"' in tr_value
    assert '"prepare"' in tr_value
    assert '"팀"' in tr_value


def test_install_task_argv_windows_quotes_path_with_spaces(tmp_path: Path, monkeypatch):
    """Windows /TR string must wrap path-with-spaces in double quotes so
    cmd.exe parses it as a single argument at trigger time."""
    monkeypatch.setattr(sys, "platform", "win32")
    s = _load_sched(tmp_path)
    fake_run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = fake_run
        s.install_task(
            name="weekly-기획팀-prepare",
            cron="0 6 * * 1",
            argv=[r"C:\Users\u\.venv\Scripts\wreport.exe", "prepare", "기획팀"],
            working_dir=r"C:\Users\u\weekly\기획팀",
        )
    cmd = fake_run.call_args[0][0]
    tr_idx = cmd.index("/TR") + 1
    tr_value = cmd[tr_idx]
    # Path is wrapped in double quotes (Windows convention)
    assert r'"C:\Users\u\.venv\Scripts\wreport.exe"' in tr_value
    assert r'"C:\Users\u\weekly\기획팀"' in tr_value
    assert "prepare" in tr_value
    assert "기획팀" in tr_value
