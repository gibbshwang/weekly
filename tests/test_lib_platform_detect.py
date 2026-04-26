from scripts.lib.platform_detect import detect_cli_host


HOST_ENV_KEYS = (
    "CLAUDECODE",
    "CLAUDE_CODE_VERSION",
    "CLAUDE_SESSION_ID",
    "CODEX_THREAD_ID",
    "CODEX_MANAGED_BY_NPM",
    "CODEX_CLI_VERSION",
    "GEMINI_SESSION_ID",
    "GEMINI_PROJECT_DIR",
    "GEMINI_CLI",
    "GEMINI_CLI_VERSION",
)


def clear_host_env(monkeypatch):
    for key in HOST_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


def test_detect_claude_when_env_set(monkeypatch):
    clear_host_env(monkeypatch)
    monkeypatch.setenv("CLAUDECODE", "1")
    assert detect_cli_host() == "claude"

def test_detect_codex_when_env_set(monkeypatch):
    clear_host_env(monkeypatch)
    monkeypatch.setenv("CODEX_THREAD_ID", "abc")
    assert detect_cli_host() == "codex"

def test_detect_gemini_when_env_set(monkeypatch):
    clear_host_env(monkeypatch)
    monkeypatch.setenv("GEMINI_SESSION_ID", "xyz")
    assert detect_cli_host() == "gemini"

def test_detect_unknown_when_none(monkeypatch):
    clear_host_env(monkeypatch)
    assert detect_cli_host() == "unknown"
