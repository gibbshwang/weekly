from pathlib import Path
from scripts.lib.template_render import render_string, render_file


def test_render_string_substitutes_vars():
    """Test render_string substitutes {{name}} placeholders."""
    tmpl = "Hello {{ name }}!"
    out = render_string(tmpl, {"name": "World"})
    assert out == "Hello World!"


def test_render_string_handles_multiple_vars():
    """Test render_string with multiple placeholders."""
    tmpl = "{{ greeting }} {{ name }}!"
    out = render_string(tmpl, {"greeting": "Hello", "name": "World"})
    assert out == "Hello World!"


def test_render_string_whitespace_agnostic():
    """Test render_string handles variable spacing."""
    tmpl = "{{name}}"
    out = render_string(tmpl, {"name": "test"})
    assert out == "test"


def test_render_string_raises_on_missing_var():
    """Test render_string raises KeyError for missing variables."""
    tmpl = "Hello {{ name }}!"
    try:
        render_string(tmpl, {})
        assert False, "Expected KeyError"
    except KeyError as e:
        assert "name" in str(e)


def test_render_file_creates_file(tmp_path: Path):
    """Test render_file creates output file with rendered content."""
    src = tmp_path / "greeting.txt.tmpl"
    src.write_text("Hello {{ name }}!")
    dst = tmp_path / "output" / "greeting.txt"

    render_file(src, dst, {"name": "World"})

    assert dst.exists()
    assert dst.read_text() == "Hello World!"


def test_render_file_creates_parent_dirs(tmp_path: Path):
    """Test render_file creates nested parent directories."""
    src = tmp_path / "template.txt.tmpl"
    src.write_text("Content: {{ value }}")
    dst = tmp_path / "deeply" / "nested" / "output" / "file.txt"

    render_file(src, dst, {"value": "test"})

    assert dst.parent.exists()
    assert dst.read_text() == "Content: test"
