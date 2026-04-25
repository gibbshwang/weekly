"""Test the status.py template — per-part progress introspection.

Used by `wreport status` (Phase 1 task 6.1).
"""
import importlib.util
from datetime import datetime
from pathlib import Path
from scripts.lib.template_render import render_string


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_status(tmp_path: Path):
    """Render the template and load as a module."""
    tmpl_path = PROJECT_ROOT / "templates" / "src" / "status.py.tmpl"
    tmpl_text = tmpl_path.read_text(encoding="utf-8")
    rendered = render_string(tmpl_text, {})
    out = tmp_path / "status.py"
    out.write_text(rendered, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("status_mod", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_compute_status_marks_missing(tmp_path: Path):
    """Missing files get status='missing'."""
    s = _load_status(tmp_path)
    md_dir = tmp_path / "week"
    md_dir.mkdir()
    (md_dir / "전략기획.md").write_text("# 전략기획\n\n성과: a\n", encoding="utf-8")
    statuses = s.compute_status(md_dir, parts=["전략기획", "사업개발"])
    a = next(x for x in statuses if x["part"] == "전략기획")
    b = next(x for x in statuses if x["part"] == "사업개발")
    assert a["status"] == "written"
    assert b["status"] == "missing"
    assert b["mtime"] is None


def test_compute_status_marks_empty_file(tmp_path: Path):
    """Empty files get status='empty'."""
    s = _load_status(tmp_path)
    md_dir = tmp_path / "week"
    md_dir.mkdir()
    (md_dir / "전략기획.md").write_text("", encoding="utf-8")
    statuses = s.compute_status(md_dir, parts=["전략기획"])
    assert statuses[0]["status"] == "empty"


def test_compute_status_includes_line_count_and_mtime(tmp_path: Path):
    """Written files include line count and mtime."""
    s = _load_status(tmp_path)
    md_dir = tmp_path / "week"
    md_dir.mkdir()
    (md_dir / "전략기획.md").write_text("a\nb\nc\n", encoding="utf-8")
    statuses = s.compute_status(md_dir, parts=["전략기획"])
    assert statuses[0]["lines"] == 3
    assert statuses[0]["mtime"] is not None


def test_format_status_report_has_all_parts(tmp_path: Path):
    """Report includes all parts with markers."""
    s = _load_status(tmp_path)
    statuses = [
        {"part": "전략기획", "status": "written", "lines": 12, "mtime": "2026-04-25T10:00:00"},
        {"part": "사업개발", "status": "missing", "lines": 0, "mtime": None},
    ]
    text = s.format_status_report(statuses, week="2026-W18", dept_name="기획팀")
    assert "기획팀" in text
    assert "2026-W18" in text
    assert "전략기획" in text
    assert "사업개발" in text
    assert "✓" in text  # written marker
    assert "✗" in text  # missing marker
    assert "미작성" in text


def test_format_status_report_includes_empty_marker(tmp_path: Path):
    """Report includes empty marker (○) for empty files."""
    s = _load_status(tmp_path)
    statuses = [
        {"part": "전략기획", "status": "empty", "lines": 0, "mtime": "2026-04-25T10:00:00"},
    ]
    text = s.format_status_report(statuses, week="2026-W18", dept_name="기획팀")
    assert "○" in text  # empty marker
    assert "비어있음" in text
