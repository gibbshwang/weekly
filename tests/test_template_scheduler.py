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
            command=r"C:\weekly\기획팀\venv\Scripts\wreport.exe assign 기획팀",
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
            command="wreport compile x",
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
            command="/home/u/weekly/기획팀/venv/bin/wreport assign 기획팀",
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
                command="wreport assign x", working_dir="/x",
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
                command="wreport assign x", working_dir=bad_dir,
            )


@pytest.mark.parametrize("bad_command", [
    "wreport assign x\nrm -rf /",       # newline inside command
    "wreport \" assign \" x",           # injected quotes
    "wreport assign x\x00",             # NUL
])
def test_install_rejects_dangerous_command(tmp_path: Path, monkeypatch, bad_command):
    monkeypatch.setattr(sys, "platform", "linux")
    s = _load_sched(tmp_path)
    with patch.object(s, "subprocess") as fake_subproc:
        fake_subproc.run = MagicMock(return_value=MagicMock(returncode=0, stdout="", stderr=""))
        with pytest.raises(ValueError):
            s.install_task(
                name="weekly-x-assign", cron="0 * * * *",
                command=bad_command, working_dir="/x",
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
                command="wreport assign x", working_dir="/x",
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
            command="wreport assign x",
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
                command="wreport assign x", working_dir="/x",
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
            command="/x/venv/bin/wreport assign 기획팀",
            working_dir="/x",
        )
