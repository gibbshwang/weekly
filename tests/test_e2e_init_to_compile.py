"""End-to-end: init pipeline -> compile, with mocked LLM (codex CLI) + SMTP."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import keyring
import pytest

from scripts.precheck import precheck
from scripts.scope import ScopeAnswers, PartLeadAnswer
from scripts.scaffold import scaffold_project
from scripts.config_setup import write_config
from scripts.xlsx_template import generate_xlsx
from scripts.keyring_setup import save_secrets
from scripts.handoff import generate_readme


BUNDLE_ROOT = Path(__file__).resolve().parent.parent


class _FakeBackend(keyring.backend.KeyringBackend):
    priority = 1

    def __init__(self):
        self._store = {}

    def set_password(self, service, username, password):
        self._store[(service, username)] = password

    def get_password(self, service, username):
        return self._store.get((service, username))

    def delete_password(self, service, username):
        if (service, username) in self._store:
            del self._store[(service, username)]


@pytest.fixture
def fake_keyring():
    keyring.set_keyring(_FakeBackend())
    yield


def _make_answers(storage_root: Path) -> ScopeAnswers:
    return ScopeAnswers(
        dept_name="테스트팀",
        parts=["전략기획", "사업개발"],
        group_lead_name="홍길동",
        group_lead_email="lead@example.com",
        part_leads=[
            PartLeadAnswer(part="전략기획", name="김파트", email="p1@example.com"),
            PartLeadAnswer(part="사업개발", name="이파트", email="p2@example.com"),
        ],
        storage_type="local",
        storage_root=str(storage_root),
        smtp_host="smtp.example.com",
        smtp_port=587,
        smtp_use_tls=True,
        smtp_user="op@example.com",
        smtp_password="pwd",
        ai_provider="codex",
    )


def test_init_to_compile_e2e(tmp_path: Path, fake_keyring, monkeypatch):
    project_root = tmp_path / "weekly_test_project"
    storage_root = tmp_path / "weekly-test-data"
    answers = _make_answers(storage_root)

    # ----- Init pipeline -----
    # Stage 0
    precheck(target_dir=project_root)

    # Stage 2 (scaffold without venv)
    scaffold_project(
        target=project_root,
        dept_slug="테스트팀_slug",
        dept_name="테스트팀",
        bundle_root=BUNDLE_ROOT,
        install_pkg=False,
    )

    # Stage 3 (config.yaml)
    write_config(answers, target=project_root, bundle_root=BUNDLE_ROOT)

    # Stage 4 (xlsx)
    dept_data_root = storage_root / "테스트팀"
    generate_xlsx(
        out_path=dept_data_root / "_지시사항.xlsx",
        dept_name="테스트팀",
        parts=answers.parts,
    )

    # Stage 5 (keyring smtp_password)
    save_secrets(answers)

    # Stage 8 (README)
    generate_readme(
        target=project_root, bundle_root=BUNDLE_ROOT,
        dept_name="테스트팀", project_path=str(project_root),
        storage_root=str(storage_root),
    )

    # Verify init artifacts
    assert (project_root / "config.yaml").exists()
    assert (project_root / "weekly_runtime" / "cli.py").exists()
    assert (project_root / "weekly_runtime" / "_llm.py").exists()
    assert (project_root / "weekly_runtime" / "templates" / "template_dashboard.html.j2").exists()
    assert (project_root / "weekly_runtime" / "prompts" / "compile_system.txt").exists()
    assert (dept_data_root / "_지시사항.xlsx").exists()
    assert keyring.get_password("weekly-테스트팀", "smtp_password") == "pwd"
    assert (project_root / "README.md").exists()

    # ----- Populate week-N data -----
    week = "2026-W18"
    week_dir = dept_data_root / week
    week_dir.mkdir(parents=True, exist_ok=True)
    (week_dir / "전략기획.md").write_text(
        "# 전략기획\n\n## 성과\n- 시장조사 완료\n", encoding="utf-8"
    )
    (week_dir / "사업개발.md").write_text(
        "# 사업개발\n\n## 성과\n- 미팅 1건\n", encoding="utf-8"
    )

    # ----- Compile via rendered project's CLI -----
    fake_compile_result = {
        "부서_종합_요약": "이번 주 정상 진행",
        "파트별_핵심": {
            "전략기획": {"주요_성과": ["시장조사"], "주요_이슈": [], "차주_계획": [], "리스크": []},
            "사업개발": {"주요_성과": ["미팅"], "주요_이슈": [], "차주_계획": [], "리스크": []},
        },
        "진척률": {"전략기획": 80, "사업개발": 60},
        "미작성_파트": [],
        "주의사항": [],
    }

    # Codex CLI subprocess returns the JSON string. We patch:
    # - subprocess.run on the project's _llm module (LLMClient) -> fake codex output
    # - shutil.which on _llm to bypass binary check
    # - smtplib.SMTP for mail send

    sys.path.insert(0, str(project_root))
    try:
        # Drop any cached weekly_runtime modules so the rendered package is freshly imported
        for k in list(sys.modules):
            if k == "weekly_runtime" or k.startswith("weekly_runtime."):
                del sys.modules[k]

        # Import the project's _llm so we can patch the names it actually binds
        import weekly_runtime._llm as _llm_mod

        with patch.object(_llm_mod, "shutil") as fake_shutil, \
             patch.object(_llm_mod, "subprocess") as fake_subproc, \
             patch("smtplib.SMTP") as smtp_cls:
            fake_shutil.which.return_value = "/fake/codex"
            fake_subproc.run.return_value = MagicMock(
                returncode=0,
                stdout=json.dumps(fake_compile_result, ensure_ascii=False),
                stderr="",
            )
            smtp_inst = MagicMock()
            smtp_cls.return_value.__enter__.return_value = smtp_inst

            from click.testing import CliRunner
            from weekly_runtime.cli import cli as wreport_cli

            runner = CliRunner()
            result = runner.invoke(
                wreport_cli,
                ["compile", "테스트팀", "--week", week, "--config", str(project_root / "config.yaml")],
            )
    finally:
        sys.path.remove(str(project_root))

    assert result.exit_code == 0, f"CLI failed:\n{result.output}\n{result.exception}"
    dashboard_path = week_dir / "_dashboard.html"
    assert dashboard_path.exists(), f"Dashboard not written. Output:\n{result.output}"
    html = dashboard_path.read_text(encoding="utf-8")
    assert "테스트팀 주간보고 — 2026-W18" in html
    assert "이번 주 정상 진행" in html
    # SMTP send was called
    assert smtp_inst.send_message.called
