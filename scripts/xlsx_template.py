"""Stage 4: xlsx_template — generate Phase 2 workbooks.

Two generators:
- generate_directives_xlsx(team) — 6-column `_지시사항.xlsx` (일자/지시내용/
  담당파트/우선순위/마감/비고). 담당그룹은 시스템이 담당파트 → team
  membership으로 역산하므로 지시자 입력에서 제외. 담당파트 dropdown은
  hidden _refs 시트가 소스.
- generate_part_xlsx(team_name, group_name, part_name, week) — per-part
  workbook with 지난주 / 이번주 / 지난주_완료 sheets, 11 columns each, plus
  a hidden _refs sheet for state / source / priority dropdowns. 지난주_완료
  is hidden — completed-row archive, not a lead-editable surface.

The pre-Phase-2 single-part-list generator was removed in the Wave E cleanup.
"""
from pathlib import Path
from typing import List

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation


PRIORITIES = ["높음", "보통", "낮음"]

# Per direct-instructor UX agreement: keep 지시사항 minimal.
# 담당그룹은 시스템이 담당파트로부터 역산 (config validator가 part name unique 보장).
DIRECTIVES_HEADERS = [
    "일자", "지시내용", "담당파트", "우선순위", "마감", "비고",
]

PART_SHEET_HEADERS = [
    "업무ID", "출처", "업무_지시내용", "상태",
    "이번주_처리결과", "이슈_장애", "리스크_지원요청",
    "다음액션_차주계획", "마감", "우선순위", "비고",
]

# Six-state lifecycle. Anything outside this set should not appear in part
# workbooks; carry-forward / compile downstream depend on these literal
# values to decide what to show, archive, or warn about.
PART_STATES = ["미착수", "진행중", "완료", "지연", "보류", "취소"]

# Where the row originated from. 지시사항 means it was assigned by the
# instructions sheet; 이월 means carry-forward from a prior week.
PART_SOURCES = ["지시사항", "파트작성", "회의", "고객요청", "이월", "기타"]


def _inline_list(values: List[str]) -> str:
    """Build an Excel inline DataValidation list literal (`"a,b,c"`).

    Safe ONLY for hard-coded controlled sets (PART_STATES, PRIORITIES,
    PART_SOURCES). For user-controlled values use a hidden _refs sheet.
    """
    return '"' + ",".join(values) + '"'


# Excel interprets a cell starting with `=`, `+`, `-`, `@` as a formula at
# open time (CSV injection / formula injection). Tab/CR/LF leads can also
# trigger unintended evaluation in some apps. Prefix `'` neutralizes — the
# apostrophe is consumed by Excel and the cell renders as the literal text.
_DANGEROUS_LEADING_CHARS = ("=", "+", "-", "@", "\t", "\r", "\n")


def safe_excel_text(value) -> str:
    """Sanitize a free-text value for an Excel cell.

    Apply at every write surface where content originated from operator
    free-text input (지시내용, 비고, lead-input columns). Idempotent — values
    already prefixed with `'` will get a second prefix (acceptable: still
    renders correctly, just slightly redundant). Pass dropdown-controlled
    or system-generated values (업무ID, 출처, 상태, 우선순위) through
    unchanged — they cannot start with the dangerous chars.
    """
    s = "" if value is None else str(value)
    if s.startswith(_DANGEROUS_LEADING_CHARS):
        return "'" + s
    return s


def generate_directives_xlsx(out_path: Path, team) -> None:
    """Phase 2 _지시사항.xlsx — 6 columns, 담당파트 dropdown only.

    `team` is duck-typed: must expose `.name` and `iter_parts()` yielding
    (group, part) pairs (matches the Pydantic Team model in
    templates/src/config.py.tmpl).

    Direct-instructor UX: 담당그룹은 묻지 않는다 (지시자가 알아야 할 정보가 아님).
    배정 시 시스템이 담당파트 → team.iter_parts()로 그룹을 역산. 파트명은 team
    전체에서 unique하도록 config validator가 강제.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = f"{team.name} 지시사항"
    ws.append(DIRECTIVES_HEADERS)

    # Hidden _refs sheet: column A = flattened part names (담당파트 dropdown)
    refs = wb.create_sheet("_refs")
    refs.sheet_state = "hidden"
    part_names = [p.name for _, p in team.iter_parts()]
    for i, pname in enumerate(part_names, start=1):
        refs.cell(row=i, column=1, value=pname)
    parts_range = f"_refs!$A$1:$A${max(len(part_names), 1)}"

    # 담당파트 dropdown (column C)
    dv_part = DataValidation(type="list", formula1=parts_range, allow_blank=True)
    dv_part.add("C2:C1000")
    ws.add_data_validation(dv_part)

    # 우선순위 dropdown (column D) — fixed inline literal
    dv_pri = DataValidation(type="list", formula1=_inline_list(PRIORITIES), allow_blank=True)
    dv_pri.add("D2:D1000")
    ws.add_data_validation(dv_pri)

    # Column widths: 일자/지시내용/담당파트/우선순위/마감/비고
    widths = {"A": 12, "B": 50, "C": 14, "D": 10, "E": 12, "F": 30}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    header_font = Font(bold=True)
    header_fill = PatternFill("solid", fgColor="F5F3F0")
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)


def _populate_part_sheet(ws, headers: List[str]) -> None:
    """Write headers + apply dropdowns + styling to one of the active sheets."""
    ws.append(headers)
    # 출처 (B), 상태 (D), 우선순위 (J) — the only columns with controlled lists.
    # Source values are short and stable so an inline literal is safe; same for
    # state and priority. Width covers rows 2-1000 = 999 entry rows per sheet.
    dv_source = DataValidation(type="list", formula1=_inline_list(PART_SOURCES), allow_blank=True)
    dv_source.add("B2:B1000")
    ws.add_data_validation(dv_source)

    dv_state = DataValidation(type="list", formula1=_inline_list(PART_STATES), allow_blank=True)
    dv_state.add("D2:D1000")
    ws.add_data_validation(dv_state)

    dv_pri = DataValidation(type="list", formula1=_inline_list(PRIORITIES), allow_blank=True)
    dv_pri.add("J2:J1000")
    ws.add_data_validation(dv_pri)

    widths = {
        "A": 12,   # 업무ID
        "B": 12,   # 출처
        "C": 36,   # 업무_지시내용
        "D": 10,   # 상태
        "E": 30,   # 이번주_처리결과
        "F": 25,   # 이슈_장애
        "G": 25,   # 리스크_지원요청
        "H": 25,   # 다음액션_차주계획
        "I": 12,   # 마감
        "J": 10,   # 우선순위
        "K": 25,   # 비고
    }
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    header_font = Font(bold=True)
    header_fill = PatternFill("solid", fgColor="F5F3F0")
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill


def generate_part_xlsx(
    out_path: Path,
    team_name: str,
    group_name: str,
    part_name: str,
    week: str,
) -> None:
    """Phase 2 per-part workbook for one weekly cycle.

    Layout:
      - 이번주          (active on open) — new + carried-in items for this week
      - 지난주          — items the prepare stage carried forward (state ≠ 완료/취소)
      - 지난주_완료     — archived items the prepare stage moved out of "지난주"
      - _refs (hidden)  — currently empty; reserved for future per-part dropdowns
    """
    wb = Workbook()
    # Workbook() always seeds one sheet — repurpose it as 이번주 (the on-open view).
    this_week = wb.active
    this_week.title = "이번주"
    _populate_part_sheet(this_week, PART_SHEET_HEADERS)

    last_week = wb.create_sheet("지난주")
    _populate_part_sheet(last_week, PART_SHEET_HEADERS)

    # 지난주_완료 is an archive sheet maintained by `prepare`. Hide it from
    # part leads so they only see the two sheets they're expected to work in
    # (지난주 + 이번주). Compiler/prepare can still read/write it freely.
    last_done = wb.create_sheet("지난주_완료")
    _populate_part_sheet(last_done, PART_SHEET_HEADERS)
    last_done.sheet_state = "hidden"

    refs = wb.create_sheet("_refs")
    refs.sheet_state = "hidden"
    # Stash metadata in _refs for downstream debugging / audit; not user-visible.
    refs.cell(row=1, column=1, value="team");       refs.cell(row=1, column=2, value=team_name)
    refs.cell(row=2, column=1, value="group");      refs.cell(row=2, column=2, value=group_name)
    refs.cell(row=3, column=1, value="part");       refs.cell(row=3, column=2, value=part_name)
    refs.cell(row=4, column=1, value="week");       refs.cell(row=4, column=2, value=week)

    # Make sure the "this week" sheet is active when the file opens.
    wb.active = wb.sheetnames.index("이번주")

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)
