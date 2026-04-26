"""Tests for schedule_install.py — registers prepare/assign/compile cron tasks."""
import json
import sys
from pathlib import Path

import pytest

from scripts.schedule_install import register_cron_tasks
from scripts.scope import TeamScopeAnswers, GroupScopeAnswer, PartScopeAnswer


def _answers(tmp_path):
    return TeamScopeAnswers(
        team_name="기획팀",
        team_lead_name="x", team_lead_email="x@e.com",
        groups=[GroupScopeAnswer(
            name="g1", lead_name="x", lead_email="x@e.com",
            parts=[PartScopeAnswer(name="p1", lead_name="x", lead_email="x@e.com")],
        )],
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
        f"def install_task(name, cron, argv, working_dir):\n"
        f"    calls = json.loads(_calls_file.read_text(encoding='utf-8')) if _calls_file.exists() else []\n"
        f"    calls.append({{'name': name, 'cron': cron, 'argv': list(argv), 'working_dir': working_dir}})\n"
        f"    _calls_file.write_text(json.dumps(calls, indent=2), encoding='utf-8')\n",
        encoding="utf-8",
    )


def test_register_cron_tasks_installs_three(tmp_path):
    project_root = tmp_path / "project"
    project_root.mkdir()
    _setup_fake_runtime(project_root)

    register_cron_tasks(
        project_root=project_root,
        answers=_answers(tmp_path),
        prepare_cron="0 6 * * 1",
        assign_cron="0 * * * *",
        compile_cron="0 17 * * 5",
    )

    calls = json.loads((project_root / "scheduler_calls.json").read_text(encoding="utf-8"))
    assert len(calls) == 3
    names = {c["name"] for c in calls}
    assert names == {
        "weekly-기획팀-prepare",
        "weekly-기획팀-assign",
        "weekly-기획팀-compile",
    }
    crons = {c["name"]: c["cron"] for c in calls}
    assert crons["weekly-기획팀-prepare"] == "0 6 * * 1"
    assert crons["weekly-기획팀-assign"] == "0 * * * *"
    assert crons["weekly-기획팀-compile"] == "0 17 * * 5"


def test_register_cron_tasks_uses_platform_appropriate_wreport(tmp_path, monkeypatch):
    project_root = tmp_path / "project"
    project_root.mkdir()
    _setup_fake_runtime(project_root)

    monkeypatch.setattr(sys, "platform", "win32")
    register_cron_tasks(project_root=project_root, answers=_answers(tmp_path))

    calls = json.loads((project_root / "scheduler_calls.json").read_text(encoding="utf-8"))
    for c in calls:
        # argv[0] is the wreport executable path
        assert "venv" in c["argv"][0]
        assert "wreport" in c["argv"][0]
        assert ".exe" in c["argv"][0]
        # No legacy embedded quotes — caller must NOT pre-quote anymore
        assert '"' not in c["argv"][0]


@pytest.mark.parametrize("bad_team", [
    'foo" & calc.exe & echo "',
    "../../etc",
    "name with space",
    "foo\nbar",
    "foo;rm -rf /",
])
def test_register_cron_rejects_dangerous_team_name(tmp_path, bad_team):
    """schedule_install must reject hostile team_name before letting it flow
    into the cron command line."""
    project_root = tmp_path / "project"
    project_root.mkdir()
    _setup_fake_runtime(project_root)

    answers = _answers(tmp_path)
    object.__setattr__(answers, "team_name", bad_team)

    with pytest.raises(ValueError):
        register_cron_tasks(project_root=project_root, answers=answers)

    calls_file = project_root / "scheduler_calls.json"
    if calls_file.exists():
        calls = json.loads(calls_file.read_text(encoding="utf-8"))
        assert calls == []
