"""Stage 1: scope — interactive Q&A to collect department metadata.

Per security policy, AI calls go through Codex CLI / Gemini CLI subprocess.
We only ask the user to choose codex or gemini as provider; the CLI's own
auth (OAuth / Enterprise managed creds) handles API access. No API keys
are collected or stored.
"""
from dataclasses import dataclass, field
from typing import List


@dataclass
class PartLeadAnswer:
    part: str
    name: str
    email: str


@dataclass
class ScopeAnswers:
    dept_name: str
    parts: List[str]
    group_lead_name: str
    group_lead_email: str
    part_leads: List[PartLeadAnswer] = field(default_factory=list)
    storage_type: str = "local"
    storage_root: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_use_tls: bool = True
    smtp_user: str = ""
    smtp_password: str = ""
    ai_provider: str = "codex"


def _prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    val = input(f"{label}{suffix}: ").strip()
    return val if val else default


def _prompt_provider() -> str:
    """Ask for AI provider, accepting only 'codex' or 'gemini'."""
    while True:
        v = _prompt("AI provider (codex/gemini)", "codex")
        if v in ("codex", "gemini"):
            return v
        # Retry on anything else (e.g. "anthropic" is forbidden)


def collect_scope() -> ScopeAnswers:
    """Walk the user through the required inputs (no AI api key)."""
    dept = _prompt("부서명")
    parts_raw = _prompt("파트 목록 (쉼표 구분)")
    parts = [p.strip() for p in parts_raw.split(",") if p.strip()]

    gl_name = _prompt("그룹장 이름")
    gl_email = _prompt("그룹장 이메일")

    pl_names_raw = _prompt(f"파트장 이름 (쉼표 구분, {len(parts)}개)")
    pl_emails_raw = _prompt(f"파트장 이메일 (쉼표 구분, {len(parts)}개)")
    pl_names = [n.strip() for n in pl_names_raw.split(",")]
    pl_emails = [e.strip() for e in pl_emails_raw.split(",")]
    if not (len(pl_names) == len(pl_emails) == len(parts)):
        raise ValueError("파트장 이름/이메일 수가 파트 수와 일치하지 않습니다.")
    part_leads = [
        PartLeadAnswer(part=parts[i], name=pl_names[i], email=pl_emails[i])
        for i in range(len(parts))
    ]

    st_type = _prompt("Storage type", "local")
    st_root = _prompt("Storage root", "C:/weekly-test")

    smtp_host = _prompt("SMTP host", "smtp.gmail.com")
    smtp_port = int(_prompt("SMTP port", "587"))
    smtp_tls_raw = _prompt("Use TLS? (y/n)", "y")
    smtp_use_tls = smtp_tls_raw.lower().startswith("y")
    smtp_user = _prompt("SMTP user (이메일)")
    smtp_password = _prompt("SMTP password (앱 비밀번호)")

    ai_provider = _prompt_provider()

    return ScopeAnswers(
        dept_name=dept,
        parts=parts,
        group_lead_name=gl_name,
        group_lead_email=gl_email,
        part_leads=part_leads,
        storage_type=st_type,
        storage_root=st_root,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_use_tls=smtp_use_tls,
        smtp_user=smtp_user,
        smtp_password=smtp_password,
        ai_provider=ai_provider,
    )
