"""Test the config.py template by rendering + executing it.

The template has no Jinja vars (config.py is dept-agnostic), so we just
verify it compiles and load_config works on a sample yaml.
"""
import importlib.util
from pathlib import Path
import yaml
from scripts.lib.template_render import render_string


def _load_config_module(tmp_path: Path):
    # Resolve relative to the test directory
    test_dir = Path(__file__).parent
    tmpl_path = test_dir.parent / "templates" / "src" / "config.py.tmpl"
    tmpl_text = tmpl_path.read_text(encoding="utf-8")
    rendered = render_string(tmpl_text, {})
    out = tmp_path / "config.py"
    out.write_text(rendered, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("cfg_module", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_config_compiles_and_exposes_classes(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    assert hasattr(mod, "WeeklyConfig")
    assert hasattr(mod, "load_config")
    assert callable(mod.load_config)


def test_load_config_parses_minimal_yaml(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = tmp_path / "config.yaml"
    yaml_path.write_text(yaml.safe_dump({
        "department": {"name": "기획팀", "parts": ["전략기획", "사업개발"]},
        "group_lead": {"name": "홍길동", "email": "lead@example.com"},
        "part_leads": [
            {"part": "전략기획", "name": "김파트", "email": "p1@example.com"},
            {"part": "사업개발", "name": "이파트", "email": "p2@example.com"},
        ],
        "storage": {"type": "local", "root": str(tmp_path / "store")},
        "schedule": {"assign_cron": "0 * * * *", "compile_cron": "0 17 * * 5", "timezone": "Asia/Seoul"},
        "smtp": {"host": "smtp.gmail.com", "port": 587, "use_tls": True, "user": "op@example.com"},
        "ai": {"provider": "codex"},
        "prompts": {"override_dir": None},
    }, allow_unicode=True), encoding="utf-8")
    cfg = mod.load_config(yaml_path)
    assert cfg.department.name == "기획팀"
    assert cfg.department.parts == ["전략기획", "사업개발"]
    assert len(cfg.part_leads) == 2
    assert cfg.smtp.host == "smtp.gmail.com"
    assert cfg.ai.provider == "codex"


def test_load_config_rejects_invalid_provider(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = tmp_path / "config.yaml"
    yaml_path.write_text(yaml.safe_dump({
        "department": {"name": "x", "parts": ["a"]},
        "group_lead": {"name": "x", "email": "x@x.com"},
        "part_leads": [{"part": "a", "name": "x", "email": "x@x.com"}],
        "storage": {"type": "local", "root": "/tmp"},
        "schedule": {"assign_cron": "0 * * * *", "compile_cron": "0 17 * * 5"},
        "smtp": {"host": "x", "port": 587, "user": "x@x.com"},
        "ai": {"provider": "anthropic"},  # forbidden
        "prompts": {"override_dir": None},
    }, allow_unicode=True), encoding="utf-8")
    import pytest
    with pytest.raises(Exception):  # pydantic ValidationError
        mod.load_config(yaml_path)


# --- Department / part name validators (FIX-07) ---

import pytest


def _build_minimal_yaml(tmp_path: Path, dept_name: str, parts: list[str]) -> Path:
    yaml_path = tmp_path / "config.yaml"
    yaml_path.write_text(yaml.safe_dump({
        "department": {"name": dept_name, "parts": parts},
        "group_lead": {"name": "x", "email": "x@x.com"},
        "part_leads": [{"part": parts[0], "name": "x", "email": "x@x.com"}],
        "storage": {"type": "local", "root": str(tmp_path / "store")},
        "schedule": {"assign_cron": "0 * * * *", "compile_cron": "0 17 * * 5"},
        "smtp": {"host": "x", "port": 587, "user": "x@x.com"},
        "ai": {"provider": "codex"},
        "prompts": {"override_dir": None},
    }, allow_unicode=True), encoding="utf-8")
    return yaml_path


@pytest.mark.parametrize("bad_name", [
    "../etc",
    "..\\windows",
    "foo/bar",
    "foo\\bar",
    "foo\x00null",
    "foo\nbar",
    "",                  # empty
    "a" * 41,            # too long
    "foo bar",           # space — could break path/cron interpolation
])
def test_dept_name_rejects_dangerous_input(tmp_path: Path, bad_name: str):
    """dept_name flows into filesystem paths and cron commands; restrict charset."""
    mod = _load_config_module(tmp_path)
    yaml_path = _build_minimal_yaml(tmp_path, dept_name=bad_name, parts=["전략기획"])
    with pytest.raises(Exception):
        mod.load_config(yaml_path)


@pytest.mark.parametrize("bad_part", [
    "../escape",
    "foo/bar",
    "=HYPERLINK(\"http://evil\",\"click\")",   # Excel formula injection
    "+SUM(1+1)",                                # Excel injection prefix
    "@cmd",                                     # Excel injection prefix
    "-sum",                                     # Excel injection prefix
    "foo,bar",                                  # breaks DataValidation list literal
    "foo\"bar",                                 # breaks DataValidation list literal
    "foo\nbar",                                 # control char
    "",                                         # empty
])
def test_part_name_rejects_dangerous_input(tmp_path: Path, bad_part: str):
    """part names flow into filesystem paths AND Excel DataValidation; restrict charset."""
    mod = _load_config_module(tmp_path)
    yaml_path = _build_minimal_yaml(tmp_path, dept_name="기획팀", parts=[bad_part])
    with pytest.raises(Exception):
        mod.load_config(yaml_path)


def test_validators_accept_korean_and_safe_chars(tmp_path: Path):
    """Sanity check: real-world Korean dept/part names still validate."""
    mod = _load_config_module(tmp_path)
    yaml_path = _build_minimal_yaml(
        tmp_path,
        dept_name="전략기획팀_2026",
        parts=["전략기획", "사업개발", "neo-team", "Quant_Research"],
    )
    cfg = mod.load_config(yaml_path)
    assert cfg.department.name == "전략기획팀_2026"
    assert "neo-team" in cfg.department.parts


# --- Phase 2: Team / Group / Part hierarchy (additive — coexists with Department) ---


def _build_team_yaml(tmp_path: Path, team_payload: dict, **base_overrides) -> Path:
    """Build a config.yaml exercising the new `team` block.

    The legacy `department` block is omitted; for the transition window the
    config schema accepts EITHER form.
    """
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


def test_team_config_loads_three_level_hierarchy(tmp_path: Path):
    """Team has groups; each group has its own lead and parts; each part has a lead."""
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


def test_team_rejects_dangerous_part_name(tmp_path: Path):
    mod = _load_config_module(tmp_path)
    yaml_path = _build_team_yaml(tmp_path, {
        "name": "기획팀",
        "lead": {"name": "x", "email": "x@x.com"},
        "groups": [{
            "name": "g1",
            "lead": {"name": "x", "email": "x@x.com"},
            "parts": [{"name": "=HYPERLINK(\"x\",\"y\")", "lead": {"name": "x", "email": "x@x.com"}}],
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


def test_team_helper_iter_parts_returns_all_parts(tmp_path: Path):
    """Team should expose a helper that flattens all (group, part) pairs for
    consumers that iterate every part regardless of group membership."""
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
    assert len(pairs) == 3
    group_names = [g.name for g, _ in pairs]
    part_names = [p.name for _, p in pairs]
    assert group_names == ["g1", "g1", "g2"]
    assert part_names == ["p1a", "p1b", "p2a"]


def test_team_helper_all_part_leads_collects_emails_across_groups(tmp_path: Path):
    """For mailer cc list — collect every part lead email across all groups."""
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


def test_legacy_department_form_still_loads(tmp_path: Path):
    """Transition guarantee: existing `department`-based configs continue to load
    until consumers migrate (Wave B/C)."""
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
    cfg = mod.load_config(yaml_path)
    assert cfg.department is not None
    assert cfg.department.name == "기획팀"
    assert cfg.team is None
