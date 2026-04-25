"""Tests for schedule_install.py — Stage 7 cron task registration."""
import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
from scripts.schedule_install import register_cron_tasks
from scripts.scope import ScopeAnswers, PartLeadAnswer


def _answers(tmp_path):
    return ScopeAnswers(
        dept_name="기획팀",
        parts=["전략기획"],
        group_lead_name="x", group_lead_email="x@e.com",
        part_leads=[PartLeadAnswer(part="전략기획", name="x", email="x@e.com")],
        storage_type="local", storage_root=str(tmp_path),
        smtp_host="smtp", smtp_port=587, smtp_use_tls=True,
        smtp_user="x@x.com", smtp_password="x",
        ai_provider="codex",
    )


def _setup_fake_runtime(project_root: Path):
    """Create a minimal weekly_runtime/scheduler.py inside project_root that
    just records install_task calls to a JSON file (so we can verify register_cron_tasks
    invokes it with the right args without touching the real schtasks/cron)."""
    pkg = project_root / "weekly_runtime"
    pkg.mkdir(parents=True, exist_ok=True)
    (pkg / "__init__.py").write_text("", encoding="utf-8")
    calls_log = project_root / "scheduler_calls.json"
    (pkg / "scheduler.py").write_text(
        f"import json\n"
        f"from pathlib import Path\n"
        f"_calls_file = Path(r'{calls_log}')\n"
        f"def install_task(name, cron, command, working_dir):\n"
        f"    calls = json.loads(_calls_file.read_text(encoding='utf-8')) if _calls_file.exists() else []\n"
        f"    calls.append({{'name': name, 'cron': cron, 'command': command, 'working_dir': working_dir}})\n"
        f"    _calls_file.write_text(json.dumps(calls, indent=2), encoding='utf-8')\n",
        encoding="utf-8",
    )


def test_register_cron_tasks_installs_two(tmp_path, monkeypatch):
    project_root = tmp_path / "project"
    project_root.mkdir()
    _setup_fake_runtime(project_root)

    register_cron_tasks(
        project_root=project_root,
        answers=_answers(tmp_path),
        assign_cron="0 * * * *",
        compile_cron="0 17 * * 5",
    )

    # Read the calls from the JSON file that the fake scheduler wrote
    calls_file = project_root / "scheduler_calls.json"
    assert calls_file.exists(), "scheduler_calls.json not created"
    calls = json.loads(calls_file.read_text(encoding="utf-8"))

    assert len(calls) == 2
    names = {c["name"] for c in calls}
    assert "weekly-기획팀-assign" in names
    assert "weekly-기획팀-compile" in names
    crons = {c["name"]: c["cron"] for c in calls}
    assert crons["weekly-기획팀-assign"] == "0 * * * *"
    assert crons["weekly-기획팀-compile"] == "0 17 * * 5"


def test_register_cron_tasks_uses_platform_appropriate_wreport(tmp_path, monkeypatch):
    project_root = tmp_path / "project"
    project_root.mkdir()
    _setup_fake_runtime(project_root)

    monkeypatch.setattr(sys, "platform", "win32")

    register_cron_tasks(project_root=project_root, answers=_answers(tmp_path))

    # Read the calls from the JSON file
    calls_file = project_root / "scheduler_calls.json"
    assert calls_file.exists(), "scheduler_calls.json not created"
    calls = json.loads(calls_file.read_text(encoding="utf-8"))

    # Windows: wreport.exe in venv/Scripts/
    for c in calls:
        assert "venv" in c["command"]
        assert "wreport" in c["command"]
        assert ".exe" in c["command"]
