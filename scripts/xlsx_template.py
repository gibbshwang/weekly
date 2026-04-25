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

    # 담당파트 dropdown (column C, rows 2-1000)
    parts_formula = '"' + ",".join(parts) + '"'
    dv_part = DataValidation(type="list", formula1=parts_formula, allow_blank=True)
    dv_part.add("C2:C1000")
    ws.add_data_validation(dv_part)

    # 우선순위 dropdown (column D)
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
