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
