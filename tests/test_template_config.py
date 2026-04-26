"""Tests for the Phase 2 config.py.tmpl — Team → Group → Part hierarchy."""
import importlib.util
from pathlib import Path

import pytest
import yaml

from scripts.lib.template_render import render_string


def _load_config_module(tmp_path: Path):
    test_dir = Path(__file__).parent
    tmpl_path = test_dir.parent / "templates" / "src" / "config.py.tmpl"
    rendered = render_string(tmpl_path.read_text(encoding="utf-8"), {})
    out = tmp_path / "config.py"
    out.write_text(rendered, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("cfg_module", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _build_team_yaml(tmp_path: Path, team_payload: dict, **base_overrides) -> Path:
    payload = {
        "team": team_payload,
        "storage": {"type": "local", "root": str(tmp_path / "store")},
        "schedule": {"assign_cron": "0 * * * *", "compile_cron": "0 17 * * 5"},
        "smtp": {"host": "smtp.gmail.com", "port": 587, "user": "op@example.com"},
        "ai": {"provider": "codex"},
        "prompts": {"override_dir": None},
    }
    payload.update(base_overrides)
    yaml_path = tmp_path / "config.yaml"
    yaml_path.write_text(yaml.safe_dump(payload, allow_unicode=True), encoding="utf-8")
    return yaml_path


# --- Smoke tests ---


def test_config_compiles_and_exposes_classes(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    assert hasattr(mod, "WeeklyConfig")
    assert hasattr(mod, "Team")
    assert hasattr(mod, "Group")
    assert hasattr(mod, "Part")
    assert hasattr(mod, "load_config")
    assert callable(mod.load_config)


def test_load_config_rejects_invalid_provider(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [{
            "name": "g1",
            "lead": {"name": "x", "email": "x@x.com"},
            "parts": [{"name": "p1", "lead": {"name": "x", "email": "x@x.com"}}],
        }],
    }, ai={"provider": "anthropic"})  # forbidden
    with pytest.raises(Exception):
        mod.load_config(yaml_path)


# --- Team / Group / Part hierarchy ---


def test_team_config_loads_three_level_hierarchy(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "팀장 김", "email": "team_lead@example.com"},
        "groups": [
            {
                "name": "사업그룹",
                "lead": {"name": "그룹장 이", "email": "biz_group_lead@example.com"},
                "parts": [
                    {"name": "전략기획", "lead": {"name": "전략장", "email": "strat@example.com"}},
                    {"name": "사업개발", "lead": {"name": "개발장", "email": "biz@example.com"}},
                ],
            },
            {
                "name": "운영그룹",
                "lead": {"name": "그룹장 박", "email": "ops_group_lead@example.com"},
                "parts": [
                    {"name": "운영관리", "lead": {"name": "운영장", "email": "ops@example.com"}},
                ],
            },
        ],
    })
    cfg = mod.load_config(yaml_path)
    assert cfg.team.name == "기획팀"
    assert cfg.team.lead.email == "team_lead@example.com"
    assert len(cfg.team.groups) == 2
    biz, ops = cfg.team.groups
    assert biz.name == "사업그룹"
    assert biz.lead.email == "biz_group_lead@example.com"
    assert [p.name for p in biz.parts] == ["전략기획", "사업개발"]
    assert biz.parts[0].lead.email == "strat@example.com"
    assert ops.parts[0].name == "운영관리"


def test_team_rejects_dangerous_team_name(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "../etc",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [{
            "name": "g1",
            "lead": {"name": "x", "email": "x@x.com"},
            "parts": [{"name": "p1", "lead": {"name": "x", "email": "x@x.com"}}],
        }],
    })
    with pytest.raises(Exception):
        mod.load_config(yaml_path)


def test_team_rejects_dangerous_group_name(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [{
            "name": "../escape",
            "lead": {"name": "x", "email": "x@x.com"},
            "parts": [{"name": "p1", "lead": {"name": "x", "email": "x@x.com"}}],
        }],
    })
    with pytest.raises(Exception):
        mod.load_config(yaml_path)


@pytest.mark.parametrize("bad_part", [
    "../escape",
    "foo/bar",
    "=HYPERLINK(\"x\",\"y\")",
    "+SUM(1+1)",
    "@cmd",
    "-sum",
    "foo,bar",
    "foo\"bar",
    "foo\nbar",
    "",
])
def test_team_rejects_dangerous_part_name(tmp_path: Path, bad_part: str):
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [{
            "name": "g1",
            "lead": {"name": "x", "email": "x@x.com"},
            "parts": [{"name": bad_part, "lead": {"name": "x", "email": "x@x.com"}}],
        }],
    })
    with pytest.raises(Exception):
        mod.load_config(yaml_path)


def test_team_rejects_empty_groups(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [],
    })
    with pytest.raises(Exception):
        mod.load_config(yaml_path)


def test_team_rejects_duplicate_part_names_across_groups(tmp_path: Path):
    """Part names are used as filesystem paths and as 업무ID part suffix —
    they must be unique within a team to avoid xlsx collisions."""
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [
            {
                "name": "g1",
                "lead": {"name": "x", "email": "x@x.com"},
                "parts": [{"name": "공통파트", "lead": {"name": "x", "email": "x@x.com"}}],
            },
            {
                "name": "g2",
                "lead": {"name": "x", "email": "x@x.com"},
                "parts": [{"name": "공통파트", "lead": {"name": "x", "email": "x@x.com"}}],
            },
        ],
    })
    with pytest.raises(Exception):
        mod.load_config(yaml_path)


def test_team_helper_iter_parts(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [
            {
                "name": "g1",
                "lead": {"name": "x", "email": "x@x.com"},
                "parts": [
                    {"name": "p1a", "lead": {"name": "x", "email": "x@x.com"}},
                    {"name": "p1b", "lead": {"name": "x", "email": "x@x.com"}},
                ],
            },
            {
                "name": "g2",
                "lead": {"name": "x", "email": "x@x.com"},
                "parts": [
                    {"name": "p2a", "lead": {"name": "x", "email": "x@x.com"}},
                ],
            },
        ],
    })
    cfg = mod.load_config(yaml_path)
    pairs = list(cfg.team.iter_parts())
    assert [g.name for g, _ in pairs] == ["g1", "g1", "g2"]
    assert [p.name for _, p in pairs] == ["p1a", "p1b", "p2a"]


def test_team_helper_email_collectors(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "team@example.com"},
        "groups": [
            {
                "name": "g1",
                "lead": {"name": "g1l", "email": "g1l@example.com"},
                "parts": [
                    {"name": "p1a", "lead": {"name": "p1a", "email": "p1a@example.com"}},
                ],
            },
            {
                "name": "g2",
                "lead": {"name": "g2l", "email": "g2l@example.com"},
                "parts": [
                    {"name": "p2a", "lead": {"name": "p2a", "email": "p2a@example.com"}},
                    {"name": "p2b", "lead": {"name": "p2b", "email": "p2b@example.com"}},
                ],
            },
        ],
    })
    cfg = mod.load_config(yaml_path)
    assert cfg.team.all_part_lead_emails() == ["p1a@example.com", "p2a@example.com", "p2b@example.com"]
    assert cfg.team.all_group_lead_emails() == ["g1l@example.com", "g2l@example.com"]


def test_load_config_rejects_legacy_department_form(tmp_path: Path):
    """Legacy `department` block is no longer accepted (Phase 2 cleanup)."""
    mod = _load_config_module(tmp_path)
    yaml_path = tmp_path / "config.yaml"
    yaml_path.write_text(yaml.safe_dump({
        "department": {"name": "기획팀", "parts": ["전략기획"]},
        "group_lead": {"name": "lead", "email": "lead@example.com"},
        "part_leads": [{"part": "전략기획", "name": "p", "email": "p@example.com"}],
        "storage": {"type": "local", "root": str(tmp_path / "s")},
        "schedule": {"assign_cron": "0 * * * *", "compile_cron": "0 17 * * 5"},
        "smtp": {"host": "smtp", "port": 587, "user": "u@x.com"},
        "ai": {"provider": "codex"},
        "prompts": {"override_dir": None},
    }, allow_unicode=True), encoding="utf-8")
    with pytest.raises(Exception):
        mod.load_config(yaml_path)


# --- Part.role (Todo 1: role 마스터, optional field) ---


def test_part_role_defaults_to_none_when_omitted(tmp_path: Path):
    """Existing configs without `role` must continue to load (backward compat)."""
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [{
            "name": "g1",
            "lead": {"name": "x", "email": "x@x.com"},
            "parts": [{"name": "p1", "lead": {"name": "x", "email": "x@x.com"}}],
        }],
    })
    cfg = mod.load_config(yaml_path)
    assert cfg.team.groups[0].parts[0].role is None


def test_part_role_loads_when_provided(tmp_path: Path):
    """When `role` is set, it must be available on the loaded Part."""
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [{
            "name": "g1",
            "lead": {"name": "x", "email": "x@x.com"},
            "parts": [{
                "name": "p1",
                "lead": {"name": "x", "email": "x@x.com"},
                "role": "로그인, OAuth, 토큰 관리",
            }],
        }],
    })
    cfg = mod.load_config(yaml_path)
    assert cfg.team.groups[0].parts[0].role == "로그인, OAuth, 토큰 관리"


def test_part_role_strips_surrounding_whitespace(tmp_path: Path):
    """Wizard input and YAML hand-edits often have trailing whitespace.
    Normalize at the model boundary so downstream prompt assembly stays clean."""
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [{
            "name": "g1",
            "lead": {"name": "x", "email": "x@x.com"},
            "parts": [{
                "name": "p1",
                "lead": {"name": "x", "email": "x@x.com"},
                "role": "  결제, Toss, 환불  ",
            }],
        }],
    })
    cfg = mod.load_config(yaml_path)
    assert cfg.team.groups[0].parts[0].role == "결제, Toss, 환불"


def test_part_role_blank_string_normalizes_to_none(tmp_path: Path):
    """An empty/whitespace-only role behaves the same as omission so the
    wizard's 'press Enter to skip' produces consistent loaded state."""
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [{
            "name": "g1",
            "lead": {"name": "x", "email": "x@x.com"},
            "parts": [{
                "name": "p1",
                "lead": {"name": "x", "email": "x@x.com"},
                "role": "   ",
            }],
        }],
    })
    cfg = mod.load_config(yaml_path)
    assert cfg.team.groups[0].parts[0].role is None
