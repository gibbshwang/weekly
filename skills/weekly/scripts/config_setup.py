"""Stage 3: config_setup — write config.yaml from scope answers.

Uses Jinja2 (not the simpler template_render) because config.yaml.tmpl
contains {% for %} loops that template_render doesn't support.
"""
from pathlib import Path

from jinja2 import Template

from scripts.scope import ScopeAnswers


def write_config(answers: ScopeAnswers, target: Path, bundle_root: Path) -> None:
    """Write config.yaml at `target/config.yaml` from scope answers."""
    tmpl_path = Path(bundle_root) / "templates" / "config.yaml.tmpl"
    tmpl = Template(tmpl_path.read_text(encoding="utf-8"))
    ctx = {
        "dept_name": answers.dept_name,
        "parts": answers.parts,
        "group_lead_name": answers.group_lead_name,
        "group_lead_email": answers.group_lead_email,
        "part_leads": [
            {"part": pl.part, "name": pl.name, "email": pl.email}
            for pl in answers.part_leads
        ],
        "storage_type": answers.storage_type,
        "storage_root": answers.storage_root,
        "smtp_host": answers.smtp_host,
        "smtp_port": answers.smtp_port,
        "smtp_use_tls": "true" if answers.smtp_use_tls else "false",
        "smtp_user": answers.smtp_user,
        "ai_provider": answers.ai_provider,
    }
    rendered = tmpl.render(**ctx)
    (target / "config.yaml").write_text(rendered, encoding="utf-8")
