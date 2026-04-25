"""Test cli.py.tmpl renders to valid Python and exposes init + compile commands."""
from pathlib import Path
from scripts.lib.template_render import render_string

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
CLI_TMPL = PROJECT_ROOT / "skills/weekly/templates/src/cli.py.tmpl"


def test_cli_template_renders_and_compiles():
    text = render_string(CLI_TMPL.read_text(encoding="utf-8"), {})
    # Syntactic check
    compile(text, "cli.py", "exec")


def test_cli_exposes_init_and_compile_commands():
    text = render_string(CLI_TMPL.read_text(encoding="utf-8"), {})
    # Both subcommands must be present
    assert '@cli.command("init")' in text or 'def init' in text
    assert '@cli.command("compile")' in text or 'def compile' in text


def test_cli_does_not_set_ai_api_key_env():
    """Per security policy update: no AI api keys, just CLI binaries."""
    text = render_string(CLI_TMPL.read_text(encoding="utf-8"), {})
    # The CLI must NOT set these env vars (CLI binaries use their own auth)
    assert "OPENAI_API_KEY" not in text
    assert "ANTHROPIC_API_KEY" not in text
    assert "GEMINI_API_KEY" not in text
    # ai_api_key keyring username should not appear
    assert "ai_api_key" not in text


def test_cli_loads_smtp_password_from_keyring():
    text = render_string(CLI_TMPL.read_text(encoding="utf-8"), {})
    # smtp_password must be loaded from keyring
    assert "smtp_password" in text
    assert "get_secret" in text or "keyring" in text
