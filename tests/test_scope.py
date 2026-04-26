"""Tests for the Phase 2 3-level org wizard."""
import pytest

from scripts.scope import (
    collect_team_scope,
    TeamScopeAnswers,
    GroupScopeAnswer,
    PartScopeAnswer,
)


def test_collect_team_scope_single_group(monkeypatch):
    inputs = iter([
        "기획팀",                    # 1. team name
        "팀장 김",                   # 2. team lead name
        "team_lead@x.com",           # 3. team lead email
        "1",                         # 4. group count
        # --- group 1 ---
        "사업그룹",                  # 5. group name
        "그룹장 이",                 # 6. group lead name
        "biz_lead@x.com",            # 7. group lead email
        "전략기획,사업개발",         # 8. parts (csv)
        "전략장,개발장",             # 9. part lead names
        "strat@x.com,biz@x.com",     # 10. part lead emails
        "",                          # 11. role for 전략기획 (skipped)
        "",                          # 12. role for 사업개발 (skipped)
        # --- end groups ---
        "local",                     # 13. storage type
        "C:/weekly-test",            # 14. storage root
        "smtp.gmail.com",            # 15. smtp host
        "587",                       # 16. smtp port
        "y",                         # 17. use_tls
        "op@x.com",                  # 18. smtp user
        "op-password",               # 19. smtp password
        "codex",                     # 20. ai provider
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    answers = collect_team_scope()

    assert isinstance(answers, TeamScopeAnswers)
    assert answers.team_name == "기획팀"
    assert answers.team_lead_name == "팀장 김"
    assert answers.team_lead_email == "team_lead@x.com"
    assert len(answers.groups) == 1
    g = answers.groups[0]
    assert isinstance(g, GroupScopeAnswer)
    assert g.name == "사업그룹"
    assert g.lead_email == "biz_lead@x.com"
    assert [p.name for p in g.parts] == ["전략기획", "사업개발"]
    assert isinstance(g.parts[0], PartScopeAnswer)
    assert g.parts[0].lead_email == "strat@x.com"
    assert answers.smtp_user == "op@x.com"
    assert answers.smtp_password == "op-password"
    assert answers.ai_provider == "codex"
    assert not hasattr(answers, "ai_api_key") or answers.ai_api_key in (None, "")


def test_collect_team_scope_two_groups(monkeypatch):
    inputs = iter([
        "기획팀", "팀장", "tl@x.com",
        "2",
        # group 1 (2 parts → 2 role prompts)
        "g1", "g1_lead", "g1l@x.com",
        "p1a,p1b", "n1a,n1b", "e1a@x.com,e1b@x.com",
        "", "",
        # group 2 (1 part → 1 role prompt)
        "g2", "g2_lead", "g2l@x.com",
        "p2a", "n2a", "e2a@x.com",
        "",
        # rest
        "local", "/x", "smtp", "587", "y", "u@x.com", "pw", "codex",
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    answers = collect_team_scope()

    assert len(answers.groups) == 2
    assert answers.groups[0].name == "g1"
    assert [p.name for p in answers.groups[0].parts] == ["p1a", "p1b"]
    assert answers.groups[1].name == "g2"
    assert answers.groups[1].parts[0].lead_email == "e2a@x.com"


def test_collect_team_scope_invalid_provider_rejected(monkeypatch):
    """Provider must be codex or gemini (anthropic forbidden by security policy)."""
    inputs = iter([
        "기획팀", "팀장", "tl@x.com",
        "1",
        "g1", "g1l", "g1l@x.com",
        "p1", "n1", "e1@x.com",
        "",  # role for p1 (skipped)
        "local", "/x", "smtp", "587", "y", "u@x.com", "pw",
        "anthropic",  # invalid
        "codex",      # retry
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    answers = collect_team_scope()
    assert answers.ai_provider == "codex"


def test_collect_team_scope_part_count_mismatch_raises(monkeypatch):
    inputs = iter([
        "기획팀", "팀장", "tl@x.com",
        "1",
        "g1", "g1_lead", "g1l@x.com",
        "p1,p2",            # 2 parts
        "only_one_name",    # only 1 lead name
        "e1@x.com,e2@x.com",
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    with pytest.raises(ValueError, match="파트장 이름/이메일"):
        collect_team_scope()


def test_collect_team_scope_zero_groups_raises(monkeypatch):
    inputs = iter([
        "기획팀", "팀장", "tl@x.com",
        "0",   # invalid — must be ≥ 1
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    with pytest.raises(ValueError, match="그룹"):
        collect_team_scope()


# --- Part role wizard (Todo 1: role 마스터, optional per-part) ---


def test_collect_team_scope_collects_part_roles(monkeypatch):
    """Wizard asks one role question per part (after the lead csv batch)
    and propagates the answer onto each PartScopeAnswer."""
    inputs = iter([
        "기획팀", "팀장", "tl@x.com",
        "1",
        # group 1 with 2 parts
        "사업그룹", "g_lead", "gl@x.com",
        "전략기획,사업개발",
        "전략장,개발장",
        "strat@x.com,biz@x.com",
        # NEW: per-part role inputs — must be queried after the lead csvs
        "중장기 전략, 시장 분석, 경쟁사 조사",
        "고객사 미팅, 신규 사업 발굴",
        # rest
        "local", "/x", "smtp", "587", "y", "u@x.com", "pw", "codex",
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    answers = collect_team_scope()
    parts = answers.groups[0].parts
    assert parts[0].role == "중장기 전략, 시장 분석, 경쟁사 조사"
    assert parts[1].role == "고객사 미팅, 신규 사업 발굴"


def test_collect_team_scope_skipped_role_normalizes_to_none(monkeypatch):
    """Pressing Enter to skip role yields role=None on the PartScopeAnswer."""
    inputs = iter([
        "기획팀", "팀장", "tl@x.com",
        "1",
        "g1", "g1_lead", "g1l@x.com",
        "p1",
        "n1",
        "e1@x.com",
        "",  # NEW: empty role for p1 → None
        "local", "/x", "smtp", "587", "y", "u@x.com", "pw", "codex",
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    answers = collect_team_scope()
    assert answers.groups[0].parts[0].role is None


def test_collect_team_scope_role_strips_whitespace(monkeypatch):
    """Trailing/leading whitespace from interactive input is stripped to
    match the config.py.tmpl Pydantic normalizer behavior."""
    inputs = iter([
        "기획팀", "팀장", "tl@x.com",
        "1",
        "g1", "g1_lead", "g1l@x.com",
        "p1",
        "n1",
        "e1@x.com",
        "  결제, 환불, 정기결제  ",  # NEW: role with surrounding ws
        "local", "/x", "smtp", "587", "y", "u@x.com", "pw", "codex",
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    answers = collect_team_scope()
    assert answers.groups[0].parts[0].role == "결제, 환불, 정기결제"
