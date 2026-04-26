import importlib.util
import json
from pathlib import Path
from unittest.mock import MagicMock
from scripts.lib.template_render import render_string


PROJECT_ROOT = Path(__file__).resolve().parent.parent


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


def _make_state_path(tmp_path: Path) -> Path:
    return tmp_path / "_assignments_state.json"


PROMPT_PATH = PROJECT_ROOT / "templates/src/prompts/assign_system.txt.tmpl"


def test_diff_rows_detects_new(tmp_path: Path):
    a = _load_assigner(tmp_path)
    state_path = _make_state_path(tmp_path)
    rows = [
        {"일자": "2026-04-22", "지시내용": "x", "담당파트": "전략기획",
         "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
    ]
    new_rows, modified_rows = a.diff_rows(rows, state_path)
    assert new_rows == [0]
    assert modified_rows == []


def test_diff_rows_no_change_when_state_matches(tmp_path: Path):
    a = _load_assigner(tmp_path)
    state_path = _make_state_path(tmp_path)
    rows = [
        {"일자": "2026-04-22", "지시내용": "x", "담당파트": "전략기획",
         "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
    ]
    a.update_state(state_path, rows, [(0, "전략기획", "column")])
    new_rows, modified_rows = a.diff_rows(rows, state_path)
    assert new_rows == []
    assert modified_rows == []


def test_diff_rows_detects_modified(tmp_path: Path):
    a = _load_assigner(tmp_path)
    state_path = _make_state_path(tmp_path)
    rows_v1 = [
        {"일자": "2026-04-22", "지시내용": "원본", "담당파트": "전략기획",
         "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
    ]
    a.update_state(state_path, rows_v1, [(0, "전략기획", "column")])
    rows_v2 = [
        {"일자": "2026-04-22", "지시내용": "수정됨", "담당파트": "전략기획",
         "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
    ]
    new_rows, modified_rows = a.diff_rows(rows_v2, state_path)
    assert new_rows == []
    assert modified_rows == [0]


def test_resolve_target_part_uses_column_when_filled(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    row = {"일자": "x", "지시내용": "x", "담당파트": "전략기획",
           "우선순위": "보통", "마감": "x", "비고": ""}
    part, method = a.resolve_target_part(row, parts=["전략기획", "사업개발"], llm=fake_llm,
                                          dept_name="기획팀",
                                          prompt_template_path=PROMPT_PATH)
    assert part == "전략기획"
    assert method == "column"
    fake_llm.call.assert_not_called()


def test_resolve_target_part_calls_llm_when_empty(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "추정_담당파트": "사업개발", "확신도": 0.8,
        "근거": "고객사 미팅 키워드"
    }, ensure_ascii=False)
    row = {"일자": "x", "지시내용": "고객사 미팅", "담당파트": "",
           "우선순위": "보통", "마감": "x", "비고": ""}
    part, method = a.resolve_target_part(row, parts=["전략기획", "사업개발"], llm=fake_llm,
                                          dept_name="기획팀",
                                          prompt_template_path=PROMPT_PATH)
    assert part == "사업개발"
    assert method == "ai_inferred"
    fake_llm.call.assert_called_once()


def test_resolve_target_part_handles_codex_code_fence(tmp_path: Path):
    """LLM may wrap JSON in ```json fences despite the system prompt; the parser must tolerate."""
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = '```json\n{"추정_담당파트":"전략기획","확신도":0.7,"근거":"전략 키워드"}\n```'
    row = {"일자": "x", "지시내용": "전략 수립", "담당파트": "",
           "우선순위": "x", "마감": "x", "비고": ""}
    part, method = a.resolve_target_part(row, parts=["전략기획", "사업개발"], llm=fake_llm,
                                          dept_name="기획팀",
                                          prompt_template_path=PROMPT_PATH)
    assert part == "전략기획"


def test_resolve_target_part_falls_back_when_llm_returns_invalid_part(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "추정_담당파트": "무효한파트", "확신도": 0.3, "근거": "x"
    }, ensure_ascii=False)
    row = {"일자": "x", "지시내용": "x", "담당파트": "",
           "우선순위": "x", "마감": "x", "비고": ""}
    part, method = a.resolve_target_part(row, parts=["전략기획", "사업개발"], llm=fake_llm,
                                          dept_name="기획팀",
                                          prompt_template_path=PROMPT_PATH)
    assert part == "전략기획"  # falls back to parts[0]
    assert method == "ai_inferred"


def test_append_assignment_creates_new(tmp_path: Path):
    a = _load_assigner(tmp_path)
    md_dir = tmp_path / "week"
    a.append_assignment(md_dir, part="전략기획", row={"일자": "2026-04-22",
                                                  "지시내용": "시장 조사",
                                                  "우선순위": "높음",
                                                  "마감": "2026-04-30",
                                                  "비고": ""},
                        timestamp="2026-04-25 14:00")
    text = (md_dir / "전략기획.md").read_text(encoding="utf-8")
    assert "[추가됨 2026-04-25 14:00]" in text
    assert "시장 조사" in text


def test_append_assignment_appends_to_existing(tmp_path: Path):
    a = _load_assigner(tmp_path)
    md_dir = tmp_path / "week"
    md_dir.mkdir()
    (md_dir / "전략기획.md").write_text("# 전략기획\n\n## 성과\n- 기존\n", encoding="utf-8")
    a.append_assignment(md_dir, part="전략기획",
                        row={"일자": "x", "지시내용": "y", "우선순위": "보통",
                             "마감": "x", "비고": ""},
                        timestamp="2026-04-25 14:00")
    text = (md_dir / "전략기획.md").read_text(encoding="utf-8")
    assert "# 전략기획" in text
    assert "기존" in text
    assert "[추가됨 2026-04-25 14:00]" in text
    assert "y" in text


def test_run_assign_end_to_end(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    state_path = _make_state_path(tmp_path)
    md_dir = tmp_path / "week"
    rows = [
        {"일자": "2026-04-22", "지시내용": "시장 조사", "담당파트": "전략기획",
         "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
    ]
    affected = a.run_assign(
        rows=rows, parts=["전략기획", "사업개발"],
        state_path=state_path, md_dir=md_dir,
        llm=fake_llm, dept_name="기획팀",
        prompt_template_path=PROMPT_PATH,
        timestamp="2026-04-25 14:00",
    )
    assert "전략기획" in affected
    assert (md_dir / "전략기획.md").exists()
    state = json.loads(state_path.read_text(encoding="utf-8"))
    assert len(state["rows"]) == 1


def test_run_assign_skips_unchanged_rows_on_second_run(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    state_path = _make_state_path(tmp_path)
    md_dir = tmp_path / "week"
    rows = [
        {"일자": "2026-04-22", "지시내용": "x", "담당파트": "전략기획",
         "우선순위": "높음", "마감": "2026-04-30", "비고": ""},
    ]
    a.run_assign(rows=rows, parts=["전략기획"], state_path=state_path, md_dir=md_dir,
                 llm=fake_llm, dept_name="기획팀", prompt_template_path=PROMPT_PATH,
                 timestamp="t1")
    affected2 = a.run_assign(rows=rows, parts=["전략기획"], state_path=state_path, md_dir=md_dir,
                             llm=fake_llm, dept_name="기획팀", prompt_template_path=PROMPT_PATH,
                             timestamp="t2")
    # Second run produces no affected parts
    assert affected2 == {}


# --- Phase 2 (Wave B): assigner v2 — xlsx-based, 업무ID, group-aware ---

from dataclasses import dataclass
from typing import List
from openpyxl import load_workbook
from scripts.xlsx_template import generate_part_xlsx, PART_SHEET_HEADERS


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
    """seq must not collide with existing IDs across all part workbooks."""
    a = _load_assigner(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _create_week_workbooks(week_dir, team)
    # Plant W18-005 in 전략기획 and W18-007 in 운영관리
    wb1 = load_workbook(week_dir / "전략기획.xlsx")
    wb1["이번주"].append(["W18-005"] + ["" for _ in PART_SHEET_HEADERS[1:]])
    wb1.save(week_dir / "전략기획.xlsx")
    wb2 = load_workbook(week_dir / "운영관리.xlsx")
    wb2["이번주"].append(["W18-007"] + ["" for _ in PART_SHEET_HEADERS[1:]])
    wb2.save(week_dir / "운영관리.xlsx")
    assert a.next_seq_for_week(week_dir, team, week="2026-W18") == 8


def test_next_seq_for_week_ignores_other_week_ids(tmp_path: Path):
    """Carry-forward rows keep their original W17-NNN ID; those must NOT
    influence W18 numbering."""
    a = _load_assigner(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _create_week_workbooks(week_dir, team)
    wb = load_workbook(week_dir / "전략기획.xlsx")
    # Carried over from prev week — different prefix
    wb["지난주"].append(["W17-099"] + ["" for _ in PART_SHEET_HEADERS[1:]])
    wb.save(week_dir / "전략기획.xlsx")
    assert a.next_seq_for_week(week_dir, team, week="2026-W18") == 1


def test_resolve_target_part_v2_uses_column_when_filled(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    team = _team()
    row = {"일자": "x", "지시내용": "x", "담당그룹": "사업그룹",
           "담당파트": "전략기획", "우선순위": "보통", "마감": "x", "비고": ""}
    group, part, method = a.resolve_target_part_v2(
        row, team=team, llm=fake_llm,
        prompt_template_path=PROMPT_PATH,
    )
    assert part.name == "전략기획"
    assert group.name == "사업그룹"
    assert method == "column"
    fake_llm.call.assert_not_called()


def test_resolve_target_part_v2_calls_llm_when_part_empty(tmp_path: Path):
    a = _load_assigner(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "추정_담당파트": "사업개발", "확신도": 0.8, "근거": "고객사 미팅"
    }, ensure_ascii=False)
    team = _team()
    row = {"일자": "x", "지시내용": "고객사 미팅", "담당그룹": "",
           "담당파트": "", "우선순위": "x", "마감": "x", "비고": ""}
    group, part, method = a.resolve_target_part_v2(
        row, team=team, llm=fake_llm,
        prompt_template_path=PROMPT_PATH,
    )
    assert part.name == "사업개발"
    assert group.name == "사업그룹"   # derived from team membership
    assert method == "ai_inferred"


def test_append_to_part_xlsx_writes_to_이번주_sheet_with_source_지시사항(tmp_path: Path):
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


def test_run_assign_v2_appends_to_correct_parts_with_task_ids(tmp_path: Path):
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
    affected = a.run_assign_v2(
        rows=rows, team=team, week="2026-W18",
        state_path=tmp_path / "_state.json",
        part_xlsx_dir=week_dir,
        llm=fake_llm,
        prompt_template_path=PROMPT_PATH,
    )
    # Both parts touched, task IDs allocated W18-001 and W18-002
    assert sorted(affected.keys()) == ["운영관리", "전략기획"]
    assert "W18-001" in (affected["전략기획"] + affected["운영관리"])
    assert "W18-002" in (affected["전략기획"] + affected["운영관리"])

    # Each part xlsx received its row
    wb1 = load_workbook(week_dir / "전략기획.xlsx")
    rows1 = list(wb1["이번주"].iter_rows(min_row=2, values_only=True))
    assert len(rows1) == 1
    assert "전략 task" in rows1[0]

    wb2 = load_workbook(week_dir / "운영관리.xlsx")
    rows2 = list(wb2["이번주"].iter_rows(min_row=2, values_only=True))
    assert len(rows2) == 1
    assert "운영 task" in rows2[0]


def test_run_assign_v2_idempotent_on_second_call(tmp_path: Path):
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
    a.run_assign_v2(rows=rows, team=team, week="2026-W18",
                    state_path=state_path, part_xlsx_dir=week_dir,
                    llm=fake_llm, prompt_template_path=PROMPT_PATH)
    affected2 = a.run_assign_v2(rows=rows, team=team, week="2026-W18",
                                state_path=state_path, part_xlsx_dir=week_dir,
                                llm=fake_llm, prompt_template_path=PROMPT_PATH)
    assert affected2 == {}
    # Only one row in 이번주 — not duplicated
    wb = load_workbook(week_dir / "전략기획.xlsx")
    rows_sheet = list(wb["이번주"].iter_rows(min_row=2, values_only=True))
    assert len(rows_sheet) == 1


# --- Phase 2 (Wave B): excel.py read_instructions_v2 (7-col header) ---


def test_read_instructions_v2_accepts_7_col_header(tmp_path: Path):
    """V2 reader expects 일자/지시내용/담당그룹/담당파트/우선순위/마감/비고."""
    from scripts.lib.template_render import render_string as _rs
    excel_text = _rs(
        (PROJECT_ROOT / "templates/src/excel.py.tmpl").read_text(encoding="utf-8"), {}
    )
    out = tmp_path / "excel.py"
    out.write_text(excel_text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("excel_mod", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    from scripts.xlsx_template import generate_directives_xlsx
    out_xlsx = tmp_path / "_지시사항.xlsx"
    generate_directives_xlsx(out_path=out_xlsx, team=_team())
    # Add one data row using openpyxl
    wb = load_workbook(out_xlsx)
    ws = wb.active
    ws.append(["2026-04-27", "task", "사업그룹", "전략기획", "높음", "2026-04-30", ""])
    wb.save(out_xlsx)

    rows = mod.read_instructions_v2(out_xlsx)
    assert len(rows) == 1
    assert rows[0]["담당그룹"] == "사업그룹"
    assert rows[0]["담당파트"] == "전략기획"
    assert rows[0]["지시내용"] == "task"
