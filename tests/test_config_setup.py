from pathlib import Path
import yaml
from scripts.config_setup import write_config
from scripts.scope import ScopeAnswers, PartLeadAnswer


def test_write_config_produces_valid_yaml(tmp_path: Path):
    answers = ScopeAnswers(
        dept_name="기획팀",
        parts=["전략기획", "사업개발"],
        group_lead_name="홍길동",
        group_lead_email="lead@example.com",
        part_leads=[
            PartLeadAnswer(part="전략기획", name="김파트", email="p1@example.com"),
            PartLeadAnswer(part="사업개발", name="이파트", email="p2@example.com"),
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
    target = tmp_path / "project"
    target.mkdir()
    bundle_root = Path(__file__).resolve().parent.parent
    write_config(answers, target=target, bundle_root=bundle_root)
    cfg_path = target / "config.yaml"
    data = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))
    assert data["department"]["name"] == "기획팀"
    assert data["department"]["parts"] == ["전략기획", "사업개발"]
    assert len(data["part_leads"]) == 2
    assert data["part_leads"][0]["email"] == "p1@example.com"
    assert data["smtp"]["host"] == "smtp.gmail.com"
    assert data["smtp"]["port"] == 587
    assert "password" not in data["smtp"]
    assert data["ai"]["provider"] == "codex"


def test_write_config_yaml_loads_with_pydantic(tmp_path: Path):
    """Verify the generated yaml validates against the project's WeeklyConfig schema."""
    import importlib.util
    from scripts.lib.template_render import render_string

    answers = ScopeAnswers(
        dept_name="기획팀",
        parts=["전략기획"],
        group_lead_name="x", group_lead_email="x@x.com",
        part_leads=[PartLeadAnswer(part="전략기획", name="x", email="x@x.com")],
        storage_type="local", storage_root=str(tmp_path),
        smtp_host="smtp", smtp_port=587, smtp_use_tls=True,
        smtp_user="x@x.com", smtp_password="x",
        ai_provider="gemini",
    )
    target = tmp_path / "project"; target.mkdir()
    bundle_root = Path(__file__).resolve().parent.parent
    write_config(answers, target=target, bundle_root=bundle_root)

    # Now render config.py.tmpl, exec it, load the yaml through it
    cfg_tmpl_text = (bundle_root / "templates/src/config.py.tmpl").read_text(encoding="utf-8")
    cfg_py = render_string(cfg_tmpl_text, {})
    cfg_path = tmp_path / "config_module.py"; cfg_path.write_text(cfg_py, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("cfg_mod", cfg_path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    cfg = mod.load_config(target / "config.yaml")
    assert cfg.department.name == "기획팀"
    assert cfg.ai.provider == "gemini"
