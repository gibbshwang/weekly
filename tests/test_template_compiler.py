import importlib.util
import json
from pathlib import Path
from unittest.mock import MagicMock
from scripts.lib.template_render import render_string

# Get the project root (parent of skills/weekly)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


def _load_compiler(tmp_path: Path):
    template_path = PROJECT_ROOT / "skills/weekly/templates/src/compiler.py.tmpl"
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
    md_dir = PROJECT_ROOT / "skills/weekly/fixtures"
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
        prompt_template_path=PROJECT_ROOT / "skills/weekly/templates/src/prompts/compile_system.txt.tmpl",
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
        prompt_template_path=PROJECT_ROOT / "skills/weekly/templates/src/prompts/compile_system.txt.tmpl",
    )
    assert result["부서_종합_요약"] == "x"
