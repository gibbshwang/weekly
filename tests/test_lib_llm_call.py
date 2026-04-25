import pytest
from unittest.mock import patch, MagicMock
from scripts.lib.llm_call import LLMClient


def test_default_provider_is_codex():
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"):
        client = LLMClient()
    assert client.provider == "codex"


def test_explicit_gemini():
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/gemini"):
        client = LLMClient(provider="gemini")
    assert client.provider == "gemini"


def test_unknown_provider_raises():
    with pytest.raises(ValueError, match="Unknown provider"):
        LLMClient(provider="anthropic")  # no longer supported


def test_codex_binary_missing_raises():
    with patch("scripts.lib.llm_call.shutil.which", return_value=None):
        with pytest.raises(ValueError, match="codex CLI not found"):
            LLMClient(provider="codex")


def test_gemini_binary_missing_raises():
    with patch("scripts.lib.llm_call.shutil.which", return_value=None):
        with pytest.raises(ValueError, match="gemini CLI not found"):
            LLMClient(provider="gemini")


def test_codex_call_invokes_subprocess():
    fake_result = MagicMock(returncode=0, stdout="model response", stderr="")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"), \
         patch("scripts.lib.llm_call.subprocess.run", return_value=fake_result) as run:
        client = LLMClient(provider="codex")
        response = client.call(system="You are a helper.", user="What is 2+2?")
    assert response == "model response"
    cmd = run.call_args[0][0]
    assert cmd[0] == "codex"
    assert cmd[1] == "exec"
    full = " ".join(cmd)
    assert "You are a helper" in full
    assert "What is 2+2?" in full


def test_gemini_call_invokes_subprocess():
    fake_result = MagicMock(returncode=0, stdout="gemini response", stderr="")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/gemini"), \
         patch("scripts.lib.llm_call.subprocess.run", return_value=fake_result) as run:
        client = LLMClient(provider="gemini")
        response = client.call(system="sys", user="usr")
    assert response == "gemini response"
    cmd = run.call_args[0][0]
    assert cmd[0] == "gemini"


def test_codex_call_raises_on_failure():
    fake_result = MagicMock(returncode=1, stdout="", stderr="auth failed")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"), \
         patch("scripts.lib.llm_call.subprocess.run", return_value=fake_result):
        client = LLMClient(provider="codex")
        with pytest.raises(RuntimeError, match="auth failed"):
            client.call(system="x", user="y")


def test_gemini_call_raises_on_failure():
    fake_result = MagicMock(returncode=2, stdout="", stderr="quota exceeded")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/gemini"), \
         patch("scripts.lib.llm_call.subprocess.run", return_value=fake_result):
        client = LLMClient(provider="gemini")
        with pytest.raises(RuntimeError, match="quota exceeded"):
            client.call(system="x", user="y")
