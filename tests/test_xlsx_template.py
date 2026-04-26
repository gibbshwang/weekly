"""Tests for the Phase 2 xlsx generators.

generate_directives_xlsx — 7-column 지시사항.xlsx with 담당그룹 + 담당파트 dropdowns
generate_part_xlsx — 4-sheet per-part workbook (지난주 / 이번주 / 지난주_완료 / _refs)
"""
from dataclasses import dataclass
from pathlib import Path
from typing import List

import pytest
from openpyxl import load_workbook

from scripts.xlsx_template import generate_directives_xlsx, generate_part_xlsx


@dataclass
class _StubPart:
    name: str


@dataclass
class _StubGroup:
    name: str
    parts: List[_StubPart]


@dataclass
class _StubTeam:
    name: str
    groups: List[_StubGroup]

    def iter_parts(self):
        for g in self.groups:
            for p in g.parts:
                yield g, p


def _stub_team():
    return _StubTeam(
        name="기획팀",
        groups=[
            _StubGroup("사업그룹", [_StubPart("전략기획"), _StubPart("사업개발")]),
            _StubGroup("운영그룹", [_StubPart("운영관리")]),
        ],
    )


# --- generate_directives_xlsx (7-col) ---


def test_directives_xlsx_has_six_column_header(tmp_path: Path):
    """Direct-instructor UX: 6 columns only (담당그룹 omitted; system reverse-
    derives it from 담당파트 via team membership)."""
    out = tmp_path / "_지시사항.xlsx"
    generate_directives_xlsx(out_path=out, team=_stub_team())
    wb = load_workbook(out)
    ws = wb.active
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    assert headers == [
        "일자", "지시내용", "담당파트", "우선순위", "마감", "비고",
    ]


def test_directives_xlsx_part_dropdown_lists_all_parts_from_all_groups(tmp_path: Path):
    out = tmp_path / "_지시사항.xlsx"
    generate_directives_xlsx(out_path=out, team=_stub_team())
    wb = load_workbook(out)
    ws = wb.active
    # 담당파트 = column C (3rd)
    dv_part = next(
        dv for dv in ws.data_validations.dataValidation
        if any("C2" in r.coord for r in dv.sqref.ranges)
    )
    assert "_refs" in (dv_part.formula1 or "")
    refs = wb["_refs"]
    assert refs.sheet_state == "hidden"
    part_cells = [refs.cell(row=i, column=1).value for i in range(1, 4)]
    assert part_cells == ["전략기획", "사업개발", "운영관리"]


def test_directives_xlsx_priority_dropdown_unchanged(tmp_path: Path):
    out = tmp_path / "_지시사항.xlsx"
    generate_directives_xlsx(out_path=out, team=_stub_team())
    wb = load_workbook(out)
    ws = wb.active
    formulas = [dv.formula1 for dv in ws.data_validations.dataValidation]
    assert any("높음" in (f or "") and "낮음" in (f or "") for f in formulas)


def test_part_xlsx_지난주_완료_is_hidden(tmp_path: Path):
    """지난주_완료 is an archive sheet — hide it from the part lead so they
    only see 지난주 + 이번주 (the two sheets they're expected to fill)."""
    out = tmp_path / "전략기획.xlsx"
    generate_part_xlsx(out_path=out, team_name="기획팀", group_name="사업그룹",
                       part_name="전략기획", week="2026-W18")
    wb = load_workbook(out)
    assert wb["지난주_완료"].sheet_state == "hidden"
    # 지난주 and 이번주 stay visible
    assert wb["이번주"].sheet_state in ("visible", None)
    assert wb["지난주"].sheet_state in ("visible", None)


def test_directives_xlsx_creates_parent_dir(tmp_path: Path):
    out = tmp_path / "공유폴더" / "기획팀" / "_지시사항.xlsx"
    generate_directives_xlsx(out_path=out, team=_stub_team())
    assert out.exists()


# --- generate_part_xlsx (4 sheets) ---


def test_part_xlsx_has_four_sheets(tmp_path: Path):
    out = tmp_path / "전략기획.xlsx"
    generate_part_xlsx(out_path=out, team_name="기획팀", group_name="사업그룹", part_name="전략기획", week="2026-W18")
    wb = load_workbook(out)
    for name in ("지난주", "이번주", "지난주_완료", "_refs"):
        assert name in wb.sheetnames, f"missing sheet {name}; got {wb.sheetnames}"
    assert wb["_refs"].sheet_state == "hidden"


def test_part_xlsx_each_active_sheet_has_eleven_columns(tmp_path: Path):
    out = tmp_path / "전략기획.xlsx"
    generate_part_xlsx(out_path=out, team_name="기획팀", group_name="사업그룹", part_name="전략기획", week="2026-W18")
    wb = load_workbook(out)
    expected_headers = [
        "업무ID", "출처", "업무_지시내용", "상태",
        "이번주_처리결과", "이슈_장애", "리스크_지원요청",
        "다음액션_차주계획", "마감", "우선순위", "비고",
    ]
    for sheet_name in ("지난주", "이번주", "지난주_완료"):
        ws = wb[sheet_name]
        headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
        assert headers == expected_headers, f"{sheet_name} headers mismatch: {headers}"


def test_part_xlsx_has_state_dropdown_on_active_sheets(tmp_path: Path):
    out = tmp_path / "전략기획.xlsx"
    generate_part_xlsx(out_path=out, team_name="기획팀", group_name="사업그룹", part_name="전략기획", week="2026-W18")
    wb = load_workbook(out)
    expected_states = {"미착수", "진행중", "완료", "지연", "보류", "취소"}
    for sheet_name in ("지난주", "이번주"):
        ws = wb[sheet_name]
        dv_state = next(
            dv for dv in ws.data_validations.dataValidation
            if any("D2" in r.coord for r in dv.sqref.ranges)
        )
        formula = dv_state.formula1 or ""
        for state in expected_states:
            assert state in formula, f"{sheet_name} 상태 dropdown missing {state}: {formula}"


def test_part_xlsx_has_source_dropdown(tmp_path: Path):
    out = tmp_path / "전략기획.xlsx"
    generate_part_xlsx(out_path=out, team_name="기획팀", group_name="사업그룹", part_name="전략기획", week="2026-W18")
    wb = load_workbook(out)
    ws = wb["이번주"]
    dv_src = next(
        dv for dv in ws.data_validations.dataValidation
        if any("B2" in r.coord for r in dv.sqref.ranges)
    )
    formula = dv_src.formula1 or ""
    for src in ("지시사항", "파트작성", "회의", "고객요청", "이월", "기타"):
        assert src in formula, f"출처 dropdown missing {src}: {formula}"


def test_part_xlsx_priority_dropdown(tmp_path: Path):
    out = tmp_path / "전략기획.xlsx"
    generate_part_xlsx(out_path=out, team_name="기획팀", group_name="사업그룹", part_name="전략기획", week="2026-W18")
    wb = load_workbook(out)
    ws = wb["이번주"]
    formulas = [dv.formula1 for dv in ws.data_validations.dataValidation]
    assert any("높음" in (f or "") and "낮음" in (f or "") for f in formulas)


def test_part_xlsx_creates_parent_dir(tmp_path: Path):
    out = tmp_path / "공유폴더" / "기획팀" / "2026-W18" / "전략기획.xlsx"
    generate_part_xlsx(out_path=out, team_name="기획팀", group_name="사업그룹", part_name="전략기획", week="2026-W18")
    assert out.exists()


def test_part_xlsx_active_sheet_is_이번주(tmp_path: Path):
    out = tmp_path / "전략기획.xlsx"
    generate_part_xlsx(out_path=out, team_name="기획팀", group_name="사업그룹", part_name="전략기획", week="2026-W18")
    wb = load_workbook(out)
    assert wb.active.title == "이번주"
