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


# --- Timeout / output-size hardening (FIX-08) ---

import subprocess


def test_timeout_expired_raises_runtimeerror():
    """A hung Codex/Gemini CLI must surface as RuntimeError, not bubble TimeoutExpired."""
    err = subprocess.TimeoutExpired(cmd=["codex"], timeout=180)
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"), \
         patch("scripts.lib.llm_call.subprocess.run", side_effect=err):
        client = LLMClient(provider="codex")
        with pytest.raises(RuntimeError, match="timed out|timeout"):
            client.call(system="x", user="y")


def test_oversized_stdout_raises_runtimeerror():
    """Runaway CLI stdout > MAX_STDOUT must raise instead of returning the blob."""
    from scripts.lib.llm_call import MAX_STDOUT
    huge = "A" * (MAX_STDOUT + 1)
    fake_result = MagicMock(returncode=0, stdout=huge, stderr="")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"), \
         patch("scripts.lib.llm_call.subprocess.run", return_value=fake_result):
        client = LLMClient(provider="codex")
        with pytest.raises(RuntimeError, match="exceeded|too large"):
            client.call(system="x", user="y")


def test_stdout_at_limit_passes():
    """stdout exactly at MAX_STDOUT size is still accepted."""
    from scripts.lib.llm_call import MAX_STDOUT
    at_limit = "B" * MAX_STDOUT
    fake_result = MagicMock(returncode=0, stdout=at_limit, stderr="")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"), \
         patch("scripts.lib.llm_call.subprocess.run", return_value=fake_result):
        client = LLMClient(provider="codex")
        result = client.call(system="x", user="y")
    # .strip() only removes whitespace, body should remain intact
    assert len(result) == MAX_STDOUT
