"""Tests for the Phase 2 compiler.py.tmpl — xlsx-based collect + new schema."""
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
PROMPT_PATH = PROJECT_ROOT / "templates/src/prompts/compile_system_v2.txt.tmpl"


def _load_compiler(tmp_path: Path):
    template_path = PROJECT_ROOT / "templates/src/compiler.py.tmpl"
    text = render_string(template_path.read_text(encoding="utf-8"), {})
    out = tmp_path / "compiler.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("compiler_mod", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


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


def _seed_part_xlsx(week_dir: Path, team, part_name: str,
                    이번주_rows: List[dict], 지난주_rows: List[dict] | None = None) -> Path:
    week_dir.mkdir(parents=True, exist_ok=True)
    g = next(g for g, p in team.iter_parts() if p.name == part_name)
    out = week_dir / f"{part_name}.xlsx"
    generate_part_xlsx(out_path=out, team_name=team.name, group_name=g.name,
                       part_name=part_name, week="2026-W18")
    wb = load_workbook(out)
    for sheet, rows in (("이번주", 이번주_rows), ("지난주", 지난주_rows or [])):
        ws = wb[sheet]
        for r in rows:
            ws.append([r.get(h, "") for h in PART_SHEET_HEADERS])
    wb.save(out)
    return out


# --- collect_parts ---


def test_collect_parts_reads_both_sheets_per_part(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _seed_part_xlsx(
        week_dir, team, "전략기획",
        이번주_rows=[
            {"업무ID": "W18-001", "출처": "지시사항", "업무_지시내용": "신규 task",
             "상태": "진행중", "이번주_처리결과": "draft", "마감": "2026-04-30",
             "우선순위": "높음"},
        ],
        지난주_rows=[
            {"업무ID": "W17-009", "출처": "이월", "업무_지시내용": "이전 task",
             "상태": "지연", "이슈_장애": "법무 검토", "마감": "2026-04-25",
             "우선순위": "보통"},
        ],
    )

    parts_data = compiler.collect_parts(week_dir, team)
    assert set(parts_data.keys()) == {"전략기획", "사업개발", "운영관리"}
    p1 = parts_data["전략기획"]
    assert p1["group"] == "사업그룹"
    assert p1["미작성"] is False
    assert len(p1["이번주"]) == 1
    assert p1["이번주"][0]["업무ID"] == "W18-001"
    assert p1["이번주"][0]["상태"] == "진행중"
    assert len(p1["지난주"]) == 1
    assert p1["지난주"][0]["업무ID"] == "W17-009"


def test_collect_parts_marks_missing_workbook(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    week_dir.mkdir()
    parts_data = compiler.collect_parts(week_dir, team)
    for p_name, p_data in parts_data.items():
        assert p_data["미작성"] is True
        assert p_data["이번주"] == []
        assert p_data["지난주"] == []


def test_collect_parts_marks_empty_workbook_as_미작성(tmp_path: Path):
    """A part workbook that exists but has zero data rows in 이번주 + 지난주
    counts as 미작성 — the part lead never opened it."""
    compiler = _load_compiler(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _seed_part_xlsx(week_dir, team, "전략기획", 이번주_rows=[])
    parts_data = compiler.collect_parts(week_dir, team)
    assert parts_data["전략기획"]["미작성"] is True


def test_collect_parts_비고_alone_does_not_count_as_written(tmp_path: Path):
    """Regression: assigner copies 비고 from _지시사항.xlsx into the part
    workbook automatically. A row with ONLY auto-populated columns (업무ID,
    출처, 업무_지시내용, 마감, 우선순위, 비고) and nothing in part-lead
    columns must still be classified as 미작성. Otherwise instructors who
    add 비고 to their directive flip the part to 'written' before the lead
    has touched anything."""
    compiler = _load_compiler(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _seed_part_xlsx(
        week_dir, team, "전략기획",
        이번주_rows=[
            {
                "업무ID": "W18-001", "출처": "지시사항",
                "업무_지시내용": "auto-assigned task",
                "상태": "", "이번주_처리결과": "",
                "이슈_장애": "", "리스크_지원요청": "",
                "다음액션_차주계획": "",
                "마감": "2026-04-30", "우선순위": "높음",
                "비고": "임원 보고용",   # instructor's note auto-copied
            },
        ],
    )
    parts_data = compiler.collect_parts(week_dir, team)
    assert parts_data["전략기획"]["미작성"] is True, (
        "비고-alone row was misclassified as 'written'"
    )


# --- run_compile ---


def test_run_compile_calls_llm_with_team_context(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "팀_종합_요약": "이번 주 전반적으로 양호",
        "지난주": {"요약": "미결 1건 처리", "항목": []},
        "이번주": {"요약": "신규 1건 진행", "항목": []},
        "그룹별_요약": {},
        "그룹장_확인필요": [],
        "미작성_파트": [],
        "주의사항": [],
    }, ensure_ascii=False)
    team = _team()
    parts_data = {
        "전략기획": {
            "group": "사업그룹", "미작성": False,
            "이번주": [{"업무ID": "W18-001", "업무_지시내용": "x", "상태": "진행중"}],
            "지난주": [],
        },
        "사업개발": {"group": "사업그룹", "미작성": True, "이번주": [], "지난주": []},
        "운영관리": {"group": "운영그룹", "미작성": False,
                  "이번주": [], "지난주": []},
    }
    result = compiler.run_compile(
        llm=fake_llm, team=team, week="2026-W18",
        parts_data=parts_data, prompt_template_path=PROMPT_PATH,
    )
    assert result["팀_종합_요약"] == "이번 주 전반적으로 양호"
    fake_llm.call.assert_called_once()
    sys_prompt, user_prompt = fake_llm.call.call_args[0]
    assert "기획팀" in sys_prompt
    assert "사업그룹" in sys_prompt or "그룹" in sys_prompt
    assert "2026-W18" in sys_prompt
    assert "전략기획" in user_prompt
    assert "W18-001" in user_prompt
    assert "사업개발" in user_prompt and "미작성" in user_prompt


def test_run_compile_tolerates_code_fence_in_llm_output(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = (
        '```json\n'
        '{"팀_종합_요약":"x","지난주":{"요약":"","항목":[]},'
        '"이번주":{"요약":"","항목":[]},"그룹별_요약":{},'
        '"그룹장_확인필요":[],"미작성_파트":[],"주의사항":[]}\n'
        '```'
    )
    result = compiler.run_compile(
        llm=fake_llm, team=_team(), week="2026-W18",
        parts_data={}, prompt_template_path=PROMPT_PATH,
    )
    assert result["팀_종합_요약"] == "x"


def test_compile_system_template_renders():
    """Sanity: the prompt template renders with team context without error."""
    from jinja2 import Template
    template_text = PROMPT_PATH.read_text(encoding="utf-8")
    out = Template(template_text).render(
        team_name="기획팀",
        groups=[
            {"name": "사업그룹", "parts": ["전략기획", "사업개발"]},
            {"name": "운영그룹", "parts": ["운영관리"]},
        ],
        week="2026-W18",
        this_week_start="2026-04-27", this_week_end="2026-05-03",
        next_week_start="2026-05-04", next_week_end="2026-05-10",
    )
    assert "기획팀" in out
    assert "사업그룹" in out
    assert "전략기획" in out
    assert "2026-W18" in out
    for key in ("팀_종합_요약", "지난주", "이번주", "그룹별_요약", "그룹장_확인필요"):
        assert key in out


# --- week date range injection (Todo 3: deterministic 그룹장_확인필요 dates) ---


def test_week_date_ranges_helper_normal_week(tmp_path: Path):
    """`_week_date_ranges('2026-W18')` must yield the Mon–Sun range for the
    given ISO week and the following week. Hand-checked with isocalendar:
    W18 of 2026 = 2026-04-27 (Mon) … 2026-05-03 (Sun)."""
    compiler = _load_compiler(tmp_path)
    ranges = compiler._week_date_ranges("2026-W18")
    assert ranges["this_week_start"] == "2026-04-27"
    assert ranges["this_week_end"] == "2026-05-03"
    assert ranges["next_week_start"] == "2026-05-04"
    assert ranges["next_week_end"] == "2026-05-10"


def test_week_date_ranges_handles_year_boundary(tmp_path: Path):
    """Last ISO week of a year — next week falls into the new ISO year.
    2026-W53 spans 2026-12-28 … 2027-01-03, then W01 of 2027 follows."""
    compiler = _load_compiler(tmp_path)
    ranges = compiler._week_date_ranges("2026-W53")
    assert ranges["this_week_start"] == "2026-12-28"
    assert ranges["this_week_end"] == "2027-01-03"
    assert ranges["next_week_start"] == "2027-01-04"
    assert ranges["next_week_end"] == "2027-01-10"


def test_week_date_ranges_rejects_malformed_input(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    import pytest
    with pytest.raises(ValueError):
        compiler._week_date_ranges("nonsense")


def test_run_compile_normalizes_missing_keys(tmp_path: Path):
    """LLMs sometimes drop keys. The compile result must always have every
    top-level key with a sensible default so dashboard render can't KeyError."""
    compiler = _load_compiler(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({"팀_종합_요약": "요약만"}, ensure_ascii=False)
    result = compiler.run_compile(
        llm=fake_llm, team=_team(), week="2026-W18",
        parts_data={}, prompt_template_path=PROMPT_PATH,
    )
    assert result["팀_종합_요약"] == "요약만"
    # Every other key present with empty default
    assert result["지난주"] == {"요약": "", "항목": []}
    assert result["이번주"] == {"요약": "", "항목": []}
    assert result["그룹별_요약"] == {}
    assert result["그룹장_확인필요"] == []
    assert result["미작성_파트"] == []
    assert result["주의사항"] == []


def test_run_compile_coerces_wrong_types_to_defaults(tmp_path: Path):
    """If LLM returns a string where a list was specified, normalize to []."""
    compiler = _load_compiler(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "팀_종합_요약": "ok",
        "지난주": "이건 dict 아니라 str",       # wrong type
        "이번주": {"요약": 42, "항목": "list 아님"},  # wrong inner types
        "그룹별_요약": [],                      # wrong: list instead of dict
        "그룹장_확인필요": "단일 문자열",        # wrong: str instead of list
        "미작성_파트": None,
        "주의사항": "string",
    }, ensure_ascii=False)
    result = compiler.run_compile(
        llm=fake_llm, team=_team(), week="2026-W18",
        parts_data={}, prompt_template_path=PROMPT_PATH,
    )
    assert result["지난주"] == {"요약": "", "항목": []}
    assert result["이번주"] == {"요약": "", "항목": []}
    assert result["그룹별_요약"] == {}
    assert result["그룹장_확인필요"] == []
    assert result["미작성_파트"] == []
    assert result["주의사항"] == []


def test_run_compile_injects_date_ranges_into_prompt(tmp_path: Path):
    """Compile must compute this/next week date ranges in Python and pass
    them to the prompt template so the LLM stops guessing the calendar.
    Required for Todo 3: 그룹장_확인필요 deterministic 마감일 비교."""
    compiler = _load_compiler(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "팀_종합_요약": "x", "지난주": {"요약": "", "항목": []},
        "이번주": {"요약": "", "항목": []}, "그룹별_요약": {},
        "그룹장_확인필요": [], "미작성_파트": [], "주의사항": [],
    }, ensure_ascii=False)
    compiler.run_compile(
        llm=fake_llm, team=_team(), week="2026-W18",
        parts_data={}, prompt_template_path=PROMPT_PATH,
    )
    sys_prompt = fake_llm.call.call_args[0][0]
    assert "2026-04-27" in sys_prompt
    assert "2026-05-03" in sys_prompt
    assert "2026-05-04" in sys_prompt
    assert "2026-05-10" in sys_prompt
