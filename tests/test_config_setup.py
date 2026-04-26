"""Tests for config_setup — writes config.yaml from team scope answers."""
from pathlib import Path

import yaml

from scripts.config_setup import write_config
from scripts.scope import (
    TeamScopeAnswers,
    GroupScopeAnswer,
    PartScopeAnswer,
)


BUNDLE_ROOT = Path(__file__).resolve().parent.parent


def _make_answers(tmp_path: Path) -> TeamScopeAnswers:
    return TeamScopeAnswers(
        team_name="기획팀",
        team_lead_name="홍길동",
        team_lead_email="lead@example.com",
        groups=[
            GroupScopeAnswer(
                name="사업그룹",
                lead_name="그룹장 이",
                lead_email="biz_lead@example.com",
                parts=[
                    PartScopeAnswer(name="전략기획", lead_name="김파트", lead_email="p1@example.com"),
                    PartScopeAnswer(name="사업개발", lead_name="이파트", lead_email="p2@example.com"),
                ],
            ),
        ],
        storage_type="local",
        storage_root=str(tmp_path / "store"),
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        smtp_use_tls=True,
        smtp_user="op@example.com",
        smtp_password="...",
        ai_provider="codex",
    )


def test_write_config_produces_valid_yaml(tmp_path: Path):
    target = tmp_path / "project"
    target.mkdir()
    write_config(_make_answers(tmp_path), target=target, bundle_root=BUNDLE_ROOT)

    data = yaml.safe_load((target / "config.yaml").read_text(encoding="utf-8"))
    assert data["team"]["name"] == "기획팀"
    assert data["team"]["lead"]["email"] == "lead@example.com"
    assert len(data["team"]["groups"]) == 1
    g = data["team"]["groups"][0]
    assert g["name"] == "사업그룹"
    assert g["lead"]["email"] == "biz_lead@example.com"
    assert [p["name"] for p in g["parts"]] == ["전략기획", "사업개발"]
    assert g["parts"][0]["lead"]["email"] == "p1@example.com"
    assert data["smtp"]["host"] == "smtp.gmail.com"
    assert "password" not in data["smtp"]
    assert data["ai"]["provider"] == "codex"


def test_write_config_yaml_loads_with_pydantic(tmp_path: Path):
    """Verify the generated yaml validates against the project's WeeklyConfig schema."""
    import importlib.util
    from scripts.lib.template_render import render_string

    target = tmp_path / "project"
    target.mkdir()
    answers = _make_answers(tmp_path)
    answers.ai_provider = "gemini"
    write_config(answers, target=target, bundle_root=BUNDLE_ROOT)

    cfg_tmpl_text = (BUNDLE_ROOT / "templates/src/config.py.tmpl").read_text(encoding="utf-8")
    cfg_py = render_string(cfg_tmpl_text, {})
    cfg_path = tmp_path / "config_module.py"
    cfg_path.write_text(cfg_py, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("cfg_mod", cfg_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    cfg = mod.load_config(target / "config.yaml")
    assert cfg.team.name == "기획팀"
    assert cfg.ai.provider == "gemini"
    # 그룹 / 파트 hierarchy round-trips
    assert len(cfg.team.groups) == 1
    assert cfg.team.groups[0].name == "사업그룹"
    assert [p.name for p in cfg.team.groups[0].parts] == ["전략기획", "사업개발"]


# --- Part role round-trip (Todo 1: role 마스터, end-to-end yaml integration) ---


def test_write_config_persists_part_role_when_set(tmp_path: Path):
    """When the wizard captured a role, it must round-trip into config.yaml
    so the runtime assigner can read it back."""
    answers = _make_answers(tmp_path)
    answers.groups[0].parts[0].role = "중장기 전략, 시장 분석"
    answers.groups[0].parts[1].role = "고객사 미팅, 신규 사업 발굴"

    target = tmp_path / "project"
    target.mkdir()
    write_config(answers, target=target, bundle_root=BUNDLE_ROOT)

    data = yaml.safe_load((target / "config.yaml").read_text(encoding="utf-8"))
    parts = data["team"]["groups"][0]["parts"]
    assert parts[0]["role"] == "중장기 전략, 시장 분석"
    assert parts[1]["role"] == "고객사 미팅, 신규 사업 발굴"


def test_write_config_omits_role_key_when_none(tmp_path: Path):
    """A None role must NOT emit a `role: null` key — keep yaml clean for
    operators who skipped role and reduce diff noise on hand-edits."""
    answers = _make_answers(tmp_path)
    # Both roles default to None from _make_answers
    assert answers.groups[0].parts[0].role is None

    target = tmp_path / "project"
    target.mkdir()
    write_config(answers, target=target, bundle_root=BUNDLE_ROOT)

    yaml_text = (target / "config.yaml").read_text(encoding="utf-8")
    assert "role:" not in yaml_text, (
        f"role key should not appear when all roles are None; got:\n{yaml_text}"
    )


def test_write_config_role_yaml_loads_with_pydantic(tmp_path: Path):
    """End-to-end: wizard answer → yaml → Pydantic Part.role attribute."""
    import importlib.util
    from scripts.lib.template_render import render_string

    answers = _make_answers(tmp_path)
    answers.groups[0].parts[0].role = "결제, Toss, 환불"

    target = tmp_path / "project"
    target.mkdir()
    write_config(answers, target=target, bundle_root=BUNDLE_ROOT)

    cfg_tmpl_text = (BUNDLE_ROOT / "templates/src/config.py.tmpl").read_text(encoding="utf-8")
    cfg_py = render_string(cfg_tmpl_text, {})
    cfg_path = tmp_path / "config_module.py"
    cfg_path.write_text(cfg_py, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("cfg_mod_role", cfg_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    cfg = mod.load_config(target / "config.yaml")
    assert cfg.team.groups[0].parts[0].role == "결제, Toss, 환불"
    assert cfg.team.groups[0].parts[1].role is None
