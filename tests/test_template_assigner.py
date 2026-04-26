"""Tests for the Phase 2 assigner.py.tmpl — xlsx-based assign with 업무ID."""
import importlib.util
import json
from dataclasses import dataclass
from pathlib import Path
from typing import List
from unittest.mock import MagicMock

from openpyxl import load_workbook

from scripts.lib.template_render import render_string
from scripts.xlsx_template import generate_part_xlsx, PART_SHEET_HEADERS


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROMPT_PATH = PROJECT_ROOT / "templates/src/prompts/assign_system.txt.tmpl"


def _load_assigner(tmp_path: Path):
    text = render_string(
        (PROJECT_ROOT / "templates/src/assigner.py.tmpl").read_text(encoding="utf-8"), {}
    )
    out = tmp_path / "assigner.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("assigner_mod", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _state_path(tmp_path: Path) -> Path:
    return tmp_path / "_assignments_state.json"


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


def _team():
    return _StubTeam(
        name="기획팀",
        groups=[
            _StubGroup("사업그룹", [_StubPart("전략기획"), _StubPart("사업개발")]),
            _StubGroup("운영그룹", [_StubPart("운영관리")]),
        ],
    )


def _create_week_workbooks(week_dir: Path, team) -> None:
    week_dir.mkdir(parents=True, exist_ok=True)
    for g, p in team.iter_parts():
        generate_part_xlsx(
            out_path=week_dir / f"{p.name}.xlsx",
            team_name=team.name, group_name=g.name,
            part_name=p.name, week="2026-W18",
        )


# --- diff_rows + state plumbing (shared with the legacy form, retained) ---


def test_diff_rows_detects_new(tmp_path: Path):
    a = _load_assigner(tmp_path)
    rows = [
        {"일자": "2026-04-22", "지시내용": "x", "담당그룹": "사업그룹", "담당파트": "전략기획",
         "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
    ]
    new_rows, modified_rows = a.diff_rows(rows, _state_path(tmp_path))
    assert new_rows == [0]
    assert modified_rows == []


def test_diff_rows_no_change_when_state_matches(tmp_path: Path):
    a = _load_assigner(tmp_path)
    sp = _state_path(tmp_path)
    rows = [
        {"일자": "2026-04-22", "지시내용": "x", "담당그룹": "사업그룹", "담당파트": "전략기획",
         "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
    ]
    a.update_state(sp, rows, [(0, "전략기획", "column")])
    assert a.diff_rows(rows, sp) == ([], [])


def test_diff_rows_detects_modified(tmp_path: Path):
    a = _load_assigner(tmp_path)
    sp = _state_path(tmp_path)
    rows_v1 = [
        {"일자": "2026-04-22", "지시내용": "원본", "담당그룹": "사업그룹", "담당파트": "전략기획",
         "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
    ]
    a.update_state(sp, rows_v1, [(0, "전략기획", "column")])
    rows_v2 = [{**rows_v1[0], "지시내용": "수정됨"}]
    new_rows, modified_rows = a.diff_rows(rows_v2, sp)
    assert new_rows == []
    assert modified_rows == [0]


# --- generate_task_id + next_seq_for_week ---


def test_generate_task_id_w_format(tmp_path: Path):
    a = _load_assigner(tmp_path)
    assert a.generate_task_id("2026-W18", 3) == "W18-003"
    assert a.generate_task_id("2026-W01", 1) == "W01-001"
    assert a.generate_task_id("2026-W52", 999) == "W52-999"


def test_next_seq_for_week_starts_at_one_when_empty(tmp_path: Path):
    a = _load_assigner(tmp_path)
    week_dir = tmp_path / "2026-W18"
    _create_week_workbooks(week_dir, _team())
    assert a.next_seq_for_week(week_dir, _team(), week="2026-W18") == 1


def test_next_seq_for_week_continues_from_max(tmp_path: Path):
    a = _load_assigner(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _create_week_workbooks(week_dir, team)
    wb1 = load_workbook(week_dir / "전략기획.xlsx")
    wb1["이번주"].append(["W18-005"] + ["" for _ in PART_SHEET_HEADERS[1:]])
    wb1.save(week_dir / "전략기획.xlsx")
    wb2 = load_workbook(week_dir / "운영관리.xlsx")
    wb2["이번주"].append(["W18-007"] + ["" for _ in PART_SHEET_HEADERS[1:]])
    wb2.save(week_dir / "운영관리.xlsx")
    assert a.next_seq_for_week(week_dir, team, week="2026-W18") == 8


def test_next_seq_for_week_ignores_other_week_ids(tmp_path: Path):
    a = _load_assigner(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _create_week_workbooks(week_dir, team)
    wb = load_workbook(week_dir / "전략기획.xlsx")
    wb["지난주"].append(["W17-099"] + ["" for _ in PART_SHEET_HEADERS[1:]])
    wb.save(week_dir / "전략기획.xlsx")
    assert a.next_seq_for_week(week_dir, team, week="2026-W18") == 1


# --- resolve_target_part (group-aware) ---


def test_resolve_target_part_uses_column_when_filled(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    team = _team()
    row = {"일자": "x", "지시내용": "x", "담당그룹": "사업그룹",
           "담당파트": "전략기획", "우선순위": "보통", "마감": "x", "비고": ""}
    group, part, method = a.resolve_target_part(
        row, team=team, llm=fake_llm,
        prompt_template_path=PROMPT_PATH,
    )
    assert part.name == "전략기획"
    assert group.name == "사업그룹"
    assert method == "column"
    fake_llm.call.assert_not_called()


def test_resolve_target_part_calls_llm_when_part_empty(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "추정_담당파트": "사업개발", "확신도": 0.8, "근거": "고객사 미팅"
    }, ensure_ascii=False)
    team = _team()
    row = {"일자": "x", "지시내용": "고객사 미팅", "담당그룹": "",
           "담당파트": "", "우선순위": "x", "마감": "x", "비고": ""}
    group, part, method = a.resolve_target_part(
        row, team=team, llm=fake_llm,
        prompt_template_path=PROMPT_PATH,
    )
    assert part.name == "사업개발"
    assert group.name == "사업그룹"
    assert method == "ai_inferred"


def test_resolve_target_part_falls_back_when_llm_returns_invalid(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "추정_담당파트": "무효한파트", "확신도": 0.3, "근거": "x"
    }, ensure_ascii=False)
    team = _team()
    row = {"일자": "x", "지시내용": "x", "담당그룹": "",
           "담당파트": "", "우선순위": "x", "마감": "x", "비고": ""}
    group, part, method = a.resolve_target_part(
        row, team=team, llm=fake_llm, prompt_template_path=PROMPT_PATH,
    )
    # Falls back to first (group, part) of team
    assert part.name == "전략기획"
    assert group.name == "사업그룹"
    assert method == "ai_inferred"


def test_resolve_target_part_handles_codex_code_fence(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = '```json\n{"추정_담당파트":"전략기획","확신도":0.7,"근거":"전략 키워드"}\n```'
    row = {"일자": "x", "지시내용": "전략 수립", "담당그룹": "",
           "담당파트": "", "우선순위": "x", "마감": "x", "비고": ""}
    group, part, method = a.resolve_target_part(
        row, team=_team(), llm=fake_llm, prompt_template_path=PROMPT_PATH,
    )
    assert part.name == "전략기획"


# --- append_to_part_xlsx ---


def test_append_to_part_xlsx_writes_to_이번주_with_source_지시사항(tmp_path: Path):
    a = _load_assigner(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _create_week_workbooks(week_dir, team)
    a.append_to_part_xlsx(
        part_xlsx_path=week_dir / "전략기획.xlsx",
        task_id="W18-001",
        row={"일자": "2026-04-27", "지시내용": "신규 분석",
             "우선순위": "높음", "마감": "2026-04-30", "비고": "임원 보고용"},
        source="지시사항",
    )
    wb = load_workbook(week_dir / "전략기획.xlsx")
    rows = list(wb["이번주"].iter_rows(min_row=2, values_only=True))
    assert len(rows) == 1
    by_header = dict(zip(PART_SHEET_HEADERS, rows[0]))
    assert by_header["업무ID"] == "W18-001"
    assert by_header["출처"] == "지시사항"
    assert by_header["업무_지시내용"] == "신규 분석"
    assert by_header["마감"] == "2026-04-30"
    assert by_header["우선순위"] == "높음"
    assert by_header["비고"] == "임원 보고용"


# --- run_assign end-to-end ---


def test_run_assign_appends_to_correct_parts_with_task_ids(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _create_week_workbooks(week_dir, team)

    rows = [
        {"일자": "2026-04-27", "지시내용": "전략 task", "담당그룹": "사업그룹",
         "담당파트": "전략기획", "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
        {"일자": "2026-04-27", "지시내용": "운영 task", "담당그룹": "운영그룹",
         "담당파트": "운영관리", "우선순위": "보통", "마감": "2026-05-01", "비고": ""},
    ]
    affected = a.run_assign(
        rows=rows, team=team, week="2026-W18",
        state_path=tmp_path / "_state.json",
        part_xlsx_dir=week_dir,
        llm=fake_llm,
        prompt_template_path=PROMPT_PATH,
    )
    assert sorted(affected.keys()) == ["운영관리", "전략기획"]
    all_ids = affected["전략기획"] + affected["운영관리"]
    assert "W18-001" in all_ids
    assert "W18-002" in all_ids

    rows1 = list(load_workbook(week_dir / "전략기획.xlsx")["이번주"].iter_rows(min_row=2, values_only=True))
    assert len(rows1) == 1
    assert "전략 task" in rows1[0]
    rows2 = list(load_workbook(week_dir / "운영관리.xlsx")["이번주"].iter_rows(min_row=2, values_only=True))
    assert len(rows2) == 1
    assert "운영 task" in rows2[0]


def test_run_assign_idempotent_on_second_call(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _create_week_workbooks(week_dir, team)
    state_path = tmp_path / "_state.json"

    rows = [
        {"일자": "x", "지시내용": "task A", "담당그룹": "사업그룹",
         "담당파트": "전략기획", "우선순위": "높음", "마감": "x", "비고": ""},
    ]
    a.run_assign(rows=rows, team=team, week="2026-W18",
                 state_path=state_path, part_xlsx_dir=week_dir,
                 llm=fake_llm, prompt_template_path=PROMPT_PATH)
    affected2 = a.run_assign(rows=rows, team=team, week="2026-W18",
                             state_path=state_path, part_xlsx_dir=week_dir,
                             llm=fake_llm, prompt_template_path=PROMPT_PATH)
    assert affected2 == {}
    rows_sheet = list(load_workbook(week_dir / "전략기획.xlsx")["이번주"].iter_rows(min_row=2, values_only=True))
    assert len(rows_sheet) == 1
