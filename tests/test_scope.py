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
