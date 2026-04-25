import pytest
import subprocess
from unittest.mock import patch, MagicMock
from scripts.lib.llm_call import LLMClient


def test_default_provider_is_codex():
    """LLMClient() with no args defaults to codex."""
    # Bypass the codex binary lookup so this test runs even without codex installed.
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"):
        client = LLMClient()
    assert client.provider == "codex"


def test_explicit_anthropic_requires_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
        LLMClient(provider="anthropic")


def test_explicit_gemini_requires_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ValueError, match="GEMINI_API_KEY"):
        LLMClient(provider="gemini")


def test_codex_call_invokes_subprocess():
    """codex provider shells out to `codex exec`."""
    fake_result = MagicMock(returncode=0, stdout="model response", stderr="")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"):
        client = LLMClient(provider="codex")
    with patch("subprocess.run", return_value=fake_result) as run:
        response = client.call(system="You are a helper.", user="What is 2+2?")
    assert response == "model response"
    assert run.called
    args, kwargs = run.call_args
    cmd = args[0]
    assert cmd[0] == "codex"
    assert cmd[1] == "exec"
    # The combined prompt must include both system and user content
    full_cmd_str = " ".join(cmd)
    assert "You are a helper" in full_cmd_str or any("You are a helper" in c for c in cmd)
    assert "What is 2+2?" in full_cmd_str or any("What is 2+2?" in c for c in cmd)


def test_codex_call_raises_on_failure():
    """Non-zero exit code from codex raises RuntimeError with stderr."""
    fake_result = MagicMock(returncode=1, stdout="", stderr="auth failed")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"):
        client = LLMClient(provider="codex")
    with patch("subprocess.run", return_value=fake_result):
        with pytest.raises(RuntimeError, match="auth failed"):
            client.call(system="x", user="y")


def test_anthropic_call_uses_sdk(monkeypatch):
    """anthropic provider calls anthropic.messages.create."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key")
    client = LLMClient(provider="anthropic")
    fake_anthropic = MagicMock()
    fake_msg = MagicMock()
    fake_msg.content = [MagicMock(text="anthropic response", type="text")]
    fake_anthropic.return_value.messages.create.return_value = fake_msg
    with patch("anthropic.Anthropic", fake_anthropic):
        response = client.call(system="sys", user="usr")
    assert response == "anthropic response"


def test_gemini_call_uses_sdk(monkeypatch):
    """gemini provider calls google.generativeai."""
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    client = LLMClient(provider="gemini")
    fake_resp = MagicMock(text="gemini response")
    with patch("google.generativeai.GenerativeModel") as mock_model_cls:
        mock_model_cls.return_value.generate_content.return_value = fake_resp
        with patch("google.generativeai.configure"):
            response = client.call(system="sys", user="usr")
    assert response == "gemini response"
