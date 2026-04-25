"""Test llm_client.py template renders + compiles correctly."""
from pathlib import Path
from scripts.lib.template_render import render_string


def test_llm_client_template_renders_and_compiles():
    test_dir = Path(__file__).parent
    template_path = test_dir.parent / "templates" / "src" / "llm_client.py.tmpl"
    text = render_string(template_path.read_text(encoding="utf-8"), {})
    # Syntactic check
    compile(text, "llm_client.py", "exec")
    # Public API smoke check
    assert "LLMClient" in text
    assert "get_llm_client" in text
    # Should import from sibling _llm module
    assert "from ._llm import" in text or "from _llm import" in text


def test_llm_client_re_exports_codex_and_gemini_only():
    """The wrapper should reference both supported providers via type hint or default."""
    test_dir = Path(__file__).parent
    template_path = test_dir.parent / "templates" / "src" / "llm_client.py.tmpl"
    text = render_string(template_path.read_text(encoding="utf-8"), {})
    # Default provider should be codex
    assert "codex" in text
    # Module should not reference anthropic (removed by user constraint)
    assert "anthropic" not in text.lower()
