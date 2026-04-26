import importlib.util
import json
from pathlib import Path
from unittest.mock import MagicMock
from scripts.lib.template_render import render_string

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_compiler(tmp_path: Path):
    template_path = PROJECT_ROOT / "templates/src/compiler.py.tmpl"
    text = render_string(
        template_path.read_text(encoding="utf-8"), {}
    )
    out = tmp_path / "compiler.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("compiler_mod", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_collect_parts_reads_fixture_md(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    md_dir = PROJECT_ROOT / "fixtures"
    contents = compiler.collect_parts(md_dir, ["전략기획", "사업개발"], pattern="sample_part_{part}.md")
    assert len(contents) == 2
    assert contents[0][0] == "전략기획"
    assert "경쟁사 가격표" in contents[0][1]
    assert contents[1][0] == "사업개발"
    assert "고객사 A" in contents[1][1]


def test_collect_parts_marks_missing_as_empty(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    md_dir = tmp_path / "no_files"
    md_dir.mkdir()
    contents = compiler.collect_parts(md_dir, ["없는파트"], pattern="{part}.md")
    assert contents == [("없는파트", "")]


def test_run_compile_calls_llm_with_rendered_prompt(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "부서_종합_요약": "테스트 요약",
        "파트별_핵심": {"전략기획": {"주요_성과": ["a"], "주요_이슈": [], "차주_계획": [], "리스크": []}},
        "진척률": {"전략기획": 80},
        "미작성_파트": [],
        "주의사항": [],
    }, ensure_ascii=False)
    parts_data = [("전략기획", "성과: a")]
    result = compiler.run_compile(
        llm=fake_llm,
        dept_name="기획팀",
        parts=["전략기획"],
        week="2026-W17",
        parts_data=parts_data,
        prompt_template_path=PROJECT_ROOT / "templates/src/prompts/compile_system.txt.tmpl",
    )
    assert result["부서_종합_요약"] == "테스트 요약"
    assert result["진척률"]["전략기획"] == 80
    fake_llm.call.assert_called_once()
    sys_prompt = fake_llm.call.call_args[0][0]
    user_prompt = fake_llm.call.call_args[0][1]
    assert "기획팀" in sys_prompt
    assert "2026-W17" in sys_prompt
    assert "전략기획" in sys_prompt
    assert "성과: a" in user_prompt


def test_run_compile_handles_codex_json_with_text_wrapping(tmp_path: Path):
    """Codex CLI may wrap JSON in markdown code fences; compiler should tolerate it."""
    compiler = _load_compiler(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = '```json\n{"부서_종합_요약":"x","파트별_핵심":{},"진척률":{},"미작성_파트":[],"주의사항":[]}\n```'
    result = compiler.run_compile(
        llm=fake_llm,
        dept_name="기획팀",
        parts=[],
        week="2026-W17",
        parts_data=[],
        prompt_template_path=PROJECT_ROOT / "templates/src/prompts/compile_system.txt.tmpl",
    )
    assert result["부서_종합_요약"] == "x"


# --- Phase 2 (Wave C): compiler v2 — xlsx-based + new schema ---

from dataclasses import dataclass
from typing import List
from openpyxl import load_workbook
from scripts.xlsx_template import generate_part_xlsx, PART_SHEET_HEADERS

PROMPT_V2_PATH = PROJECT_ROOT / "templates/src/prompts/compile_system_v2.txt.tmpl"


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
    """Build a populated part workbook for compile-v2 tests."""
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


def test_collect_parts_v2_reads_both_sheets_per_part(tmp_path: Path):
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

    parts_data = compiler.collect_parts_v2(week_dir, team)
    # All three parts should appear (even the missing one with empty rows)
    assert set(parts_data.keys()) == {"전략기획", "사업개발", "운영관리"}
    p1 = parts_data["전략기획"]
    assert p1["group"] == "사업그룹"
    assert p1["미작성"] is False
    assert len(p1["이번주"]) == 1
    assert p1["이번주"][0]["업무ID"] == "W18-001"
    assert p1["이번주"][0]["상태"] == "진행중"
    assert len(p1["지난주"]) == 1
    assert p1["지난주"][0]["업무ID"] == "W17-009"


def test_collect_parts_v2_marks_missing_workbook(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    week_dir.mkdir()
    # Don't seed any xlsx — every part should be flagged as missing
    parts_data = compiler.collect_parts_v2(week_dir, team)
    for p_name, p_data in parts_data.items():
        assert p_data["미작성"] is True
        assert p_data["이번주"] == []
        assert p_data["지난주"] == []


def test_collect_parts_v2_marks_empty_workbook_as_미작성(tmp_path: Path):
    """A part workbook that exists but has zero data rows in 이번주 + 지난주
    counts as 미작성 — the part lead never opened it."""
    compiler = _load_compiler(tmp_path)
    team = _team()
    week_dir = tmp_path / "2026-W18"
    _seed_part_xlsx(week_dir, team, "전략기획", 이번주_rows=[])
    parts_data = compiler.collect_parts_v2(week_dir, team)
    assert parts_data["전략기획"]["미작성"] is True


def test_run_compile_v2_calls_llm_with_team_context(tmp_path: Path):
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
    result = compiler.run_compile_v2(
        llm=fake_llm, team=team, week="2026-W18",
        parts_data=parts_data, prompt_template_path=PROMPT_V2_PATH,
    )
    assert result["팀_종합_요약"] == "이번 주 전반적으로 양호"
    fake_llm.call.assert_called_once()
    sys_prompt, user_prompt = fake_llm.call.call_args[0]
    # System prompt must mention the team and group structure
    assert "기획팀" in sys_prompt
    assert "사업그룹" in sys_prompt or "그룹" in sys_prompt
    assert "2026-W18" in sys_prompt
    # User prompt must include each (group, part) heading and the W18-001 ID
    assert "전략기획" in user_prompt
    assert "W18-001" in user_prompt
    # 사업개발 should be marked 미작성 in the user payload
    assert "사업개발" in user_prompt and "미작성" in user_prompt


def test_run_compile_v2_tolerates_code_fence_in_llm_output(tmp_path: Path):
    compiler = _load_compiler(tmp_path)
    fake_llm = MagicMock()
    fake_llm.call.return_value = (
        '```json\n'
        '{"팀_종합_요약":"x","지난주":{"요약":"","항목":[]},'
        '"이번주":{"요약":"","항목":[]},"그룹별_요약":{},'
        '"그룹장_확인필요":[],"미작성_파트":[],"주의사항":[]}\n'
        '```'
    )
    result = compiler.run_compile_v2(
        llm=fake_llm, team=_team(), week="2026-W18",
        parts_data={}, prompt_template_path=PROMPT_V2_PATH,
    )
    assert result["팀_종합_요약"] == "x"


def test_compile_system_v2_template_renders():
    """Sanity: the new prompt template renders with team context without error."""
    from jinja2 import Template
    template_text = PROMPT_V2_PATH.read_text(encoding="utf-8")
    out = Template(template_text).render(
        team_name="기획팀",
        groups=[
            {"name": "사업그룹", "parts": ["전략기획", "사업개발"]},
            {"name": "운영그룹", "parts": ["운영관리"]},
        ],
        week="2026-W18",
    )
    assert "기획팀" in out
    assert "사업그룹" in out
    assert "전략기획" in out
    assert "2026-W18" in out
    # Schema spec must mention the new top-level keys
    for key in ("팀_종합_요약", "지난주", "이번주", "그룹별_요약", "그룹장_확인필요"):
        assert key in out
