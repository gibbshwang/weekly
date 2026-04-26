import pytest
from scripts.scope import collect_scope, ScopeAnswers, PartLeadAnswer


def test_collect_scope_basic_no_ai_key(monkeypatch):
    """Verifies that scope no longer asks for AI api key (codex/gemini CLI uses own auth)."""
    inputs = iter([
        "기획팀",                    # 1. dept name
        "전략기획,사업개발,운영",    # 2. parts (comma-separated)
        "홍길동",                    # 3. group lead name
        "lead@example.com",          # 4. group lead email
        "김파트,이파트,박파트",      # 5. part lead names
        "p1@example.com,p2@example.com,p3@example.com",  # 6. part lead emails
        "local",                     # 7. storage type
        "C:/weekly-test",            # 8. storage root
        "smtp.gmail.com",            # 9. smtp host
        "587",                       # 10. smtp port
        "y",                         # 11. use_tls
        "op@example.com",            # 12. smtp user
        "op-password",               # 13. smtp password
        "codex",                     # 14. ai provider (codex or gemini)
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    answers = collect_scope()
    assert answers.dept_name == "기획팀"
    assert answers.parts == ["전략기획", "사업개발", "운영"]
    assert len(answers.part_leads) == 3
    assert answers.part_leads[0].part == "전략기획"
    assert answers.part_leads[0].email == "p1@example.com"
    assert answers.smtp_user == "op@example.com"
    assert answers.smtp_password == "op-password"
    assert answers.ai_provider == "codex"
    # Critical: no ai_api_key field — codex/gemini CLI handles auth itself
    assert not hasattr(answers, "ai_api_key") or answers.ai_api_key in (None, "")


def test_collect_scope_invalid_provider_rejected(monkeypatch):
    """Provider must be codex or gemini (anthropic forbidden by security policy)."""
    inputs = iter([
        "x", "a", "x", "x@x.com", "x", "x@x.com",
        "local", "/tmp", "smtp", "587", "y", "x@x.com", "p",
        "anthropic",  # invalid
        "codex",      # retry
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    answers = collect_scope()
    assert answers.ai_provider == "codex"


def test_collect_scope_part_count_mismatch_raises(monkeypatch):
    inputs = iter([
        "기획팀", "전략기획,사업개발",  # 2 parts
        "홍길동", "lead@e.com",
        "김파트",  # only 1 name, but 2 parts
        "p1@e.com,p2@e.com",  # 2 emails
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    import pytest
    with pytest.raises(ValueError, match="파트장 이름/이메일"):
        collect_scope()


# --- Phase 2: 3-level org wizard (Wave A.2) ---


def test_collect_team_scope_single_group(monkeypatch):
    """Phase 2 wizard collects Team → Group → Part with leads at each level."""
    from scripts.scope import collect_team_scope, TeamScopeAnswers, GroupScopeAnswer, PartScopeAnswer

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
        # --- end groups ---
        "local",                     # 11. storage type
        "C:/weekly-test",            # 12. storage root
        "smtp.gmail.com",            # 13. smtp host
        "587",                       # 14. smtp port
        "y",                         # 15. use_tls
        "op@x.com",                  # 16. smtp user
        "op-password",               # 17. smtp password
        "codex",                     # 18. ai provider
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
    assert answers.ai_provider == "codex"


def test_collect_team_scope_two_groups(monkeypatch):
    from scripts.scope import collect_team_scope

    inputs = iter([
        "기획팀", "팀장", "tl@x.com",
        "2",
        # group 1
        "g1", "g1_lead", "g1l@x.com",
        "p1a,p1b", "n1a,n1b", "e1a@x.com,e1b@x.com",
        # group 2
        "g2", "g2_lead", "g2l@x.com",
        "p2a", "n2a", "e2a@x.com",
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


def test_collect_team_scope_part_count_mismatch_raises(monkeypatch):
    """Within a group, parts vs lead-names vs lead-emails counts must match."""
    from scripts.scope import collect_team_scope
    import pytest

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
    """A team with zero groups makes no sense — reject up front."""
    from scripts.scope import collect_team_scope
    import pytest

    inputs = iter([
        "기획팀", "팀장", "tl@x.com",
        "0",   # invalid — must be ≥ 1
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    with pytest.raises(ValueError, match="그룹"):
        collect_team_scope()
