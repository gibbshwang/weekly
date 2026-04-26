"""Stage 4: xlsx_template — generate `_지시사항.xlsx` with headers + dropdowns."""
from pathlib import Path
from typing import List

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation


HEADERS = ["일자", "지시내용", "담당파트", "우선순위", "마감", "비고"]
PRIORITIES = ["높음", "보통", "낮음"]


def generate_xlsx(out_path: Path, dept_name: str, parts: List[str]) -> None:
    """Create the standard `_지시사항.xlsx` with headers + dropdowns + styling."""
    wb = Workbook()
    ws = wb.active
    ws.title = f"{dept_name} 지시사항"
    ws.append(HEADERS)

    # 담당파트 dropdown — sourced from a hidden `_refs` sheet rather than an
    # inline `"a,b,c"` literal. The literal form breaks on commas/quotes in
    # part names and could be parsed by Excel as a formula if a part starts
    # with `=+@-`. Real cell sources are unambiguous and immune to both.
    refs = wb.create_sheet("_refs")
    refs.sheet_state = "hidden"
    for i, part in enumerate(parts, start=1):
        refs.cell(row=i, column=1, value=part)
    parts_range = f"_refs!$A$1:$A${max(len(parts), 1)}"
    dv_part = DataValidation(type="list", formula1=parts_range, allow_blank=True)
    dv_part.add("C2:C1000")
    ws.add_data_validation(dv_part)

    # 우선순위 dropdown (column D) — fixed, controlled set; inline literal is fine
    pri_formula = '"' + ",".join(PRIORITIES) + '"'
    dv_pri = DataValidation(type="list", formula1=pri_formula, allow_blank=True)
    dv_pri.add("D2:D1000")
    ws.add_data_validation(dv_pri)

    # Column widths
    widths = {"A": 12, "B": 50, "C": 14, "D": 10, "E": 12, "F": 30}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    # Header style: bold + warm gray fill (#F5F3F0)
    header_font = Font(bold=True)
    header_fill = PatternFill("solid", fgColor="F5F3F0")
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)
