from pathlib import Path
from openpyxl import load_workbook
from scripts.xlsx_template import generate_xlsx


def test_generate_xlsx_has_headers(tmp_path: Path):
    out = tmp_path / "_지시사항.xlsx"
    generate_xlsx(out_path=out, dept_name="기획팀", parts=["전략기획", "사업개발"])
    assert out.exists()
    wb = load_workbook(out)
    ws = wb.active
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    assert headers == ["일자", "지시내용", "담당파트", "우선순위", "마감", "비고"]


def test_generate_xlsx_has_part_dropdown(tmp_path: Path):
    out = tmp_path / "_지시사항.xlsx"
    generate_xlsx(out_path=out, dept_name="기획팀", parts=["전략기획", "사업개발"])
    wb = load_workbook(out)
    ws = wb.active
    # FIX-02: parts now live in the hidden _refs sheet; the DV references that
    # range. The "all parts present" property is now an assertion on _refs cells.
    refs = wb["_refs"]
    cell_values = {refs.cell(row=i, column=1).value for i in range(1, 3)}
    assert {"전략기획", "사업개발"}.issubset(cell_values)
    formulas = [dv.formula1 for dv in ws.data_validations.dataValidation]
    assert any("_refs" in (f or "") for f in formulas)


def test_generate_xlsx_has_priority_dropdown(tmp_path: Path):
    out = tmp_path / "_지시사항.xlsx"
    generate_xlsx(out_path=out, dept_name="기획팀", parts=["전략기획"])
    wb = load_workbook(out)
    ws = wb.active
    dvs = ws.data_validations.dataValidation
    formulas = [dv.formula1 for dv in dvs]
    assert any("높음" in f and "보통" in f and "낮음" in f for f in formulas)


def test_generate_xlsx_creates_parent_dir(tmp_path: Path):
    out = tmp_path / "공유폴더" / "기획팀" / "_지시사항.xlsx"
    generate_xlsx(out_path=out, dept_name="기획팀", parts=["전략기획"])
    assert out.exists()


# --- DataValidation hardening (FIX-02) ---


def test_parts_use_hidden_sheet_not_inline_literal(tmp_path: Path):
    """Parts dropdown must reference a hidden sheet, not inline `"a,b,c"`.

    Inline literal sources break on commas/quotes in part names, and
    Excel treats values starting with `=+@-` as formulas if the dropdown
    source is interpreted as a literal list. Sourcing from real cells
    sidesteps both classes of issue.
    """
    out = tmp_path / "_지시사항.xlsx"
    generate_xlsx(out_path=out, dept_name="기획팀", parts=["전략기획", "사업개발"])
    wb = load_workbook(out)
    ws = wb.active
    dv_for_part_col = next(
        dv for dv in ws.data_validations.dataValidation
        if any("C2" in r.coord for r in dv.sqref.ranges)
    )
    formula = dv_for_part_col.formula1 or ""
    assert "_refs" in formula, (
        f"Parts dropdown should reference _refs sheet, got: {formula!r}"
    )
    # Values must NOT be inlined as a literal CSV-in-quotes
    assert "전략기획" not in formula
    assert "사업개발" not in formula


def test_refs_sheet_contains_parts_and_is_hidden(tmp_path: Path):
    """The _refs sheet must hold part names as cell values and be hidden."""
    out = tmp_path / "_지시사항.xlsx"
    generate_xlsx(out_path=out, dept_name="기획팀", parts=["전략기획", "사업개발", "neo-team"])
    wb = load_workbook(out)
    assert "_refs" in wb.sheetnames, f"Expected hidden _refs sheet, got: {wb.sheetnames}"
    refs = wb["_refs"]
    assert refs.sheet_state == "hidden", (
        f"_refs sheet must be hidden, state={refs.sheet_state!r}"
    )
    cell_values = [refs.cell(row=i, column=1).value for i in range(1, 4)]
    assert cell_values == ["전략기획", "사업개발", "neo-team"]
