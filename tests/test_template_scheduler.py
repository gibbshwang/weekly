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
