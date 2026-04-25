"""E2E: init project, write xlsx with rows, run wreport assign,
verify .md updated + state saved + mail sent + audit log appended."""
from __future__ import annotations

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


BUNDLE_ROOT = Path(__file__).resolve().parent.parent


class _FakeBackend(keyring.backend.KeyringBackend):
    priority = 1
    def __init__(self): self._store = {}
    def set_password(self, s, u, p): self._store[(s, u)] = p
    def get_password(self, s, u): return self._store.get((s, u))
    def delete_password(self, s, u): self._store.pop((s, u), None)


@pytest.fixture
def fake_keyring():
    keyring.set_keyring(_FakeBackend())
    yield


def _bootstrap(tmp_path: Path):
    project_root = tmp_path / "project"
    storage_root = tmp_path / "data"
    answers = ScopeAnswers(
        dept_name="테스트팀", parts=["전략기획", "사업개발"],
        group_lead_name="홍", group_lead_email="lead@e.com",
        part_leads=[
            PartLeadAnswer(part="전략기획", name="김", email="p1@e.com"),
            PartLeadAnswer(part="사업개발", name="이", email="p2@e.com"),
        ],
        storage_type="local", storage_root=str(storage_root),
        smtp_host="smtp", smtp_port=587, smtp_use_tls=True,
        smtp_user="op@e.com", smtp_password="pwd",
        ai_provider="codex",
    )
    precheck(target_dir=project_root)
    scaffold_project(target=project_root, dept_slug="테스트팀_slug",
                     dept_name="테스트팀", bundle_root=BUNDLE_ROOT, install_pkg=False)
    write_config(answers, target=project_root, bundle_root=BUNDLE_ROOT)
    dept_data = storage_root / "테스트팀"
    return project_root, storage_root, dept_data, answers


def _write_xlsx_with_rows(dept_data: Path):
    from openpyxl import Workbook
    xlsx = dept_data / "_지시사항.xlsx"
    xlsx.parent.mkdir(parents=True, exist_ok=True)
    wb = Workbook()
    ws = wb.active
    ws.append(["일자", "지시내용", "담당파트", "우선순위", "마감", "비고"])
    ws.append(["2026-04-22", "시장 조사", "전략기획", "높음", "2026-04-30", ""])  # column-assigned
    ws.append(["2026-04-23", "고객사 미팅", "", "보통", "2026-04-26", ""])         # ai-inferred
    wb.save(xlsx)


def test_assign_e2e(tmp_path, fake_keyring):
    project_root, storage_root, dept_data, answers = _bootstrap(tmp_path)
    save_secrets(answers)
    _write_xlsx_with_rows(dept_data)

    # Clear any cached weekly_runtime imports from prior tests
    for k in list(sys.modules):
        if k.startswith("weekly_runtime"):
            del sys.modules[k]

    sys.path.insert(0, str(project_root))
    try:
        # Import the rendered project's _llm to patch its subprocess + shutil
        import weekly_runtime._llm as _llm_mod

        with patch.object(_llm_mod, "shutil") as fake_shutil, \
             patch.object(_llm_mod, "subprocess") as fake_subproc, \
             patch("smtplib.SMTP") as smtp_cls:
            fake_shutil.which.return_value = "/fake/codex"
            # Codex CLI returns inference for the empty 담당파트 row
            fake_subproc.run.return_value = MagicMock(
                returncode=0,
                stdout=json.dumps(
                    {"추정_담당파트": "사업개발", "확신도": 0.9, "근거": "고객사 키워드"},
                    ensure_ascii=False,
                ),
                stderr="",
            )
            smtp_inst = MagicMock()
            smtp_cls.return_value.__enter__.return_value = smtp_inst

            from click.testing import CliRunner
            from weekly_runtime.cli import cli
            runner = CliRunner()
            result = runner.invoke(
                cli,
                ["assign", "테스트팀",
                 "--config", str(project_root / "config.yaml"),
                 "--week", "2026-W18"],
            )
    finally:
        if str(project_root) in sys.path:
            sys.path.remove(str(project_root))

    assert result.exit_code == 0, f"CLI failed:\n{result.output}\n{result.exception}"

    week_dir = dept_data / "2026-W18"
    assert (week_dir / "전략기획.md").exists()
    assert (week_dir / "사업개발.md").exists()

    # Sidecar state
    state_path = week_dir / "_assignments_state.json"
    assert state_path.exists()
    state = json.loads(state_path.read_text(encoding="utf-8"))
    assert len(state["rows"]) == 2
    methods = {r["method"] for r in state["rows"]}
    assert methods == {"column", "ai_inferred"}

    # Mail send was called (one batch to affected leads)
    assert smtp_inst.send_message.called

    # Audit log
    audit_log = (dept_data / "logs" / "audit.jsonl")
    assert audit_log.exists(), f"audit log not found at {audit_log}"
    audit_text = audit_log.read_text(encoding="utf-8")
    assert "\"event\": \"assign\"" in audit_text or '"event":"assign"' in audit_text
