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
    # Prompt now travels via stdin (FIX-06), not argv. Verify both system and
    # user content land in the input= kwarg the subprocess sees on stdin.
    stdin_payload = run.call_args.kwargs.get("input") or ""
    assert "You are a helper" in stdin_payload
    assert "What is 2+2?" in stdin_payload


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


# --- Prompt-not-in-argv hardening (FIX-06) ---

_SECRET_MARKER = "TOP-SECRET-PROMPT-CONTENT-12345"


def test_codex_prompt_not_in_argv():
    """Codex prompt content must reach the subprocess via stdin, never as argv.

    Argv is visible in `ps aux` / Windows `tasklist` to other users on the host
    and is captured by EDR / audit tooling, so any PII in the weekly report
    body would leak there. Pass via stdin instead.
    """
    fake_result = MagicMock(returncode=0, stdout="ok", stderr="")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"), \
         patch("scripts.lib.llm_call.subprocess.run", return_value=fake_result) as run:
        client = LLMClient(provider="codex")
        client.call(system=_SECRET_MARKER, user="hello")

    cmd = run.call_args[0][0]
    assert _SECRET_MARKER not in " ".join(cmd), (
        f"Secret prompt leaked into argv: {cmd!r}"
    )
    stdin_payload = run.call_args.kwargs.get("input")
    assert stdin_payload is not None, "subprocess.run was not given input= for stdin"
    assert _SECRET_MARKER in stdin_payload, (
        f"Prompt content not delivered via stdin: input={stdin_payload!r}"
    )


def test_gemini_prompt_not_in_argv():
    """Same security requirement as codex: prompt body must not appear in argv."""
    fake_result = MagicMock(returncode=0, stdout="ok", stderr="")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/gemini"), \
         patch("scripts.lib.llm_call.subprocess.run", return_value=fake_result) as run:
        client = LLMClient(provider="gemini")
        client.call(system=_SECRET_MARKER, user="hello")

    cmd = run.call_args[0][0]
    assert _SECRET_MARKER not in " ".join(cmd), (
        f"Secret prompt leaked into argv: {cmd!r}"
    )
    stdin_payload = run.call_args.kwargs.get("input")
    assert stdin_payload is not None, "subprocess.run was not given input= for stdin"
    assert _SECRET_MARKER in stdin_payload, (
        f"Prompt content not delivered via stdin: input={stdin_payload!r}"
    )


def test_codex_argv_still_includes_invocation_metadata():
    """Even with prompt on stdin, argv must still hold the invocation
    pieces (binary, subcommand, model flag) so the CLI knows what to run."""
    fake_result = MagicMock(returncode=0, stdout="ok", stderr="")
    with patch("scripts.lib.llm_call.shutil.which", return_value="/fake/codex"), \
         patch("scripts.lib.llm_call.subprocess.run", return_value=fake_result) as run:
        client = LLMClient(provider="codex", model="gpt-5")
        client.call(system="x", user="y")
    cmd = run.call_args[0][0]
    assert cmd[:2] == ["codex", "exec"]
    assert "--model" in cmd and "gpt-5" in cmd
