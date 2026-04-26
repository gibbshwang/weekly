import importlib.util
from pathlib import Path
from scripts.lib.template_render import render_string

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_excel(tmp_path: Path):
    template_path = PROJECT_ROOT / "templates/src/excel.py.tmpl"
    text = render_string(
        template_path.read_text(encoding="utf-8"), {}
    )
    out = tmp_path / "excel_mod.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("excel_mod", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


FIXTURE = Path(__file__).parent.parent / "fixtures/sample_지시사항.xlsx"


def test_read_rows_returns_dicts(tmp_path: Path):
    excel = _load_excel(tmp_path)
    rows = excel.read_instructions(FIXTURE)
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
    rows = excel.read_instructions(FIXTURE)
    h1 = excel.row_hash(rows[0])
    h2 = excel.row_hash(rows[0])
    assert h1 == h2
    assert h1 != excel.row_hash(rows[1])
    # Stable hash format
    assert h1.startswith("sha256:")


def test_empty_담당파트_preserved(tmp_path: Path):
    excel = _load_excel(tmp_path)
    rows = excel.read_instructions(FIXTURE)
    assert rows[2]["담당파트"] == ""
