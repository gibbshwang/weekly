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
