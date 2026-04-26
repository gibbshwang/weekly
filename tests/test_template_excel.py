"""Tests for the Phase 2 excel reader (7-col 지시사항.xlsx)."""
import importlib.util
from pathlib import Path

from openpyxl import Workbook

from scripts.lib.template_render import render_string

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_excel(tmp_path: Path):
    template_path = PROJECT_ROOT / "templates/src/excel.py.tmpl"
    text = render_string(template_path.read_text(encoding="utf-8"), {})
    out = tmp_path / "excel_mod.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("excel_mod", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _seed_xlsx(path: Path) -> None:
    """Build a minimal 6-col xlsx with three rows for the reader to consume."""
    wb = Workbook()
    ws = wb.active
    ws.append(["일자", "지시내용", "담당파트", "우선순위", "마감", "비고"])
    ws.append(["2026-04-22", "시장 조사", "전략기획", "높음", "2026-04-30", "경쟁사 가격"])
    ws.append(["2026-04-23", "고객 미팅", "사업개발", "보통", "2026-04-26", ""])
    ws.append(["2026-04-24", "분석 의뢰", "", "보통", "2026-04-30", ""])
    wb.save(path)


def test_read_rows_returns_dicts(tmp_path: Path):
    excel = _load_excel(tmp_path)
    xlsx = tmp_path / "_지시사항.xlsx"
    _seed_xlsx(xlsx)
    rows = excel.read_instructions(xlsx)
    assert len(rows) == 3
    assert rows[0] == {
        "일자": "2026-04-22",
        "지시내용": "시장 조사",
        "담당파트": "전략기획",
        "우선순위": "높음",
        "마감": "2026-04-30",
        "비고": "경쟁사 가격",
    }


def test_row_hash_stable(tmp_path: Path):
    excel = _load_excel(tmp_path)
    xlsx = tmp_path / "_지시사항.xlsx"
    _seed_xlsx(xlsx)
    rows = excel.read_instructions(xlsx)
    h1 = excel.row_hash(rows[0])
    assert h1 == excel.row_hash(rows[0])
    assert h1 != excel.row_hash(rows[1])
    assert h1.startswith("sha256:")


def test_empty_담당파트_preserved(tmp_path: Path):
    """담당파트 is the only assignment hint; preserve blank rows for LLM fallback."""
    excel = _load_excel(tmp_path)
    xlsx = tmp_path / "_지시사항.xlsx"
    _seed_xlsx(xlsx)
    rows = excel.read_instructions(xlsx)
    assert rows[2]["담당파트"] == ""
