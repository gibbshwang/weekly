from scripts.lib.platform_detect import detect_cli_host

def test_detect_claude_when_env_set(monkeypatch):
    monkeypatch.setenv("CLAUDECODE", "1")
    monkeypatch.delenv("CODEX_THREAD_ID", raising=False)
    monkeypatch.delenv("GEMINI_SESSION_ID", raising=False)
    assert detect_cli_host() == "claude"

def test_detect_codex_when_env_set(monkeypatch):
    monkeypatch.delenv("CLAUDECODE", raising=False)
    monkeypatch.setenv("CODEX_THREAD_ID", "abc")
    monkeypatch.delenv("GEMINI_SESSION_ID", raising=False)
    assert detect_cli_host() == "codex"

def test_detect_gemini_when_env_set(monkeypatch):
    monkeypatch.delenv("CLAUDECODE", raising=False)
    monkeypatch.delenv("CODEX_THREAD_ID", raising=False)
    monkeypatch.setenv("GEMINI_SESSION_ID", "xyz")
    assert detect_cli_host() == "gemini"

def test_detect_unknown_when_none(monkeypatch):
    monkeypatch.delenv("CLAUDECODE", raising=False)
    monkeypatch.delenv("CODEX_THREAD_ID", raising=False)
    monkeypatch.delenv("GEMINI_SESSION_ID", raising=False)
    assert detect_cli_host() == "unknown"
