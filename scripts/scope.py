"""Stage 1: scope — interactive Q&A to collect team metadata.

Per security policy, AI calls go through Codex CLI / Gemini CLI subprocess.
We only ask the user to choose codex or gemini as provider; the CLI's own
auth (OAuth / Enterprise managed creds) handles API access. No API keys
are collected or stored.

Phase 2: 3-level org wizard (Team → Group → Part). The legacy single-level
collect_scope was removed in the Wave E cleanup.
"""
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class PartScopeAnswer:
    name: str
    lead_name: str
    lead_email: str
    # Optional free-text role description ("로그인, OAuth, 토큰 관리").
    # Set by the wizard via per-part prompt; persisted to config.yaml so
    # the assigner LLM can do role-based reasoning. None when skipped.
    role: Optional[str] = None


@dataclass
class GroupScopeAnswer:
    name: str
    lead_name: str
    lead_email: str
    parts: List[PartScopeAnswer] = field(default_factory=list)


@dataclass
class TeamScopeAnswers:
    team_name: str
    team_lead_name: str
    team_lead_email: str
    groups: List[GroupScopeAnswer] = field(default_factory=list)
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


def _collect_group(group_index: int) -> GroupScopeAnswer:
    """One iteration of the per-group sub-wizard. Extracted so the failure
    mode (mismatched part-name/lead-email counts) can raise with a clear
    "그룹 N에서…" prefix."""
    g_name = _prompt(f"  그룹 {group_index} — 이름")
    g_lead_name = _prompt(f"  그룹 {group_index} — 그룹장 이름")
    g_lead_email = _prompt(f"  그룹 {group_index} — 그룹장 이메일")
    parts_raw = _prompt(f"  그룹 {group_index} — 파트 목록 (쉼표 구분)")
    parts = [p.strip() for p in parts_raw.split(",") if p.strip()]
    pl_names_raw = _prompt(f"  그룹 {group_index} — 파트장 이름 (쉼표 구분, {len(parts)}개)")
    pl_emails_raw = _prompt(f"  그룹 {group_index} — 파트장 이메일 (쉼표 구분, {len(parts)}개)")
    pl_names = [n.strip() for n in pl_names_raw.split(",")]
    pl_emails = [e.strip() for e in pl_emails_raw.split(",")]
    if not (len(pl_names) == len(pl_emails) == len(parts)):
        raise ValueError(
            f"그룹 {group_index} ({g_name!r})의 파트장 이름/이메일 수가 파트 수와 일치하지 않습니다."
        )
    # Per-part role prompt — asked individually (not csv) because role text
    # naturally contains commas (e.g. "로그인, OAuth, 토큰 관리"). Empty input
    # means "no role description" → role=None → assign falls back to keyword.
    parts_struct = []
    for i in range(len(parts)):
        role_raw = _prompt(
            f"  그룹 {group_index} — {parts[i]} 역할 (선택, Enter로 스킵)"
        )
        role = role_raw.strip() or None
        parts_struct.append(PartScopeAnswer(
            name=parts[i], lead_name=pl_names[i], lead_email=pl_emails[i],
            role=role,
        ))
    return GroupScopeAnswer(
        name=g_name, lead_name=g_lead_name, lead_email=g_lead_email, parts=parts_struct,
    )


def collect_team_scope() -> TeamScopeAnswers:
    """Phase 2 wizard: collects Team → Group → Part with a lead at each level."""
    team = _prompt("팀명")
    tl_name = _prompt("팀장 이름")
    tl_email = _prompt("팀장 이메일")

    n_raw = _prompt("그룹 개수", "1")
    try:
        n = int(n_raw)
    except ValueError as e:
        raise ValueError(f"그룹 개수는 정수여야 합니다 (입력: {n_raw!r})") from e
    if n < 1:
        raise ValueError(f"팀에는 최소 1개의 그룹이 필요합니다 (입력: {n})")

    groups = [_collect_group(i + 1) for i in range(n)]

    st_type = _prompt("Storage type", "local")
    st_root = _prompt("Storage root", "C:/weekly-test")

    smtp_host = _prompt("SMTP host", "smtp.gmail.com")
    smtp_port = int(_prompt("SMTP port", "587"))
    smtp_tls_raw = _prompt("Use TLS? (y/n)", "y")
    smtp_use_tls = smtp_tls_raw.lower().startswith("y")
    smtp_user = _prompt("SMTP user (이메일)")
    smtp_password = _prompt("SMTP password (앱 비밀번호)")

    ai_provider = _prompt_provider()

    return TeamScopeAnswers(
        team_name=team,
        team_lead_name=tl_name,
        team_lead_email=tl_email,
        groups=groups,
        storage_type=st_type,
        storage_root=st_root,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_use_tls=smtp_use_tls,
        smtp_user=smtp_user,
        smtp_password=smtp_password,
        ai_provider=ai_provider,
    )
