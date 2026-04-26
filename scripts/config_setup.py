"""Stage 3: config_setup — write config.yaml from scope answers.

Uses Jinja2 (not the simpler template_render) because config.yaml.tmpl
contains {% for %} loops that template_render doesn't support.
"""
from pathlib import Path

from jinja2 import Template

from scripts.scope import TeamScopeAnswers


def write_config(answers: TeamScopeAnswers, target: Path, bundle_root: Path) -> None:
    """Write config.yaml at `target/config.yaml` from team scope answers."""
    tmpl_path = Path(bundle_root) / "templates" / "config.yaml.tmpl"
    tmpl = Template(tmpl_path.read_text(encoding="utf-8"))
    ctx = {
        "team_name": answers.team_name,
        "team_lead_name": answers.team_lead_name,
        "team_lead_email": answers.team_lead_email,
        "groups": [
            {
                "name": g.name,
                "lead_name": g.lead_name,
                "lead_email": g.lead_email,
                "parts": [
                    {
                        "name": p.name,
                        "lead_name": p.lead_name,
                        "lead_email": p.lead_email,
                        # `role` may be None — template emits the key only when truthy
                        "role": p.role,
                    }
                    for p in g.parts
                ],
            }
            for g in answers.groups
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
