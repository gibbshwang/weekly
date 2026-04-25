import importlib.util
from pathlib import Path
from scripts.lib.template_render import render_string

# Get the project root (parent of skills/weekly)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


def _load_dashboard(tmp_path: Path):
    template_path = PROJECT_ROOT / "skills/weekly/templates/src/dashboard.py.tmpl"
    text = render_string(
        template_path.read_text(encoding="utf-8"), {}
    )
    out = tmp_path / "dashboard.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("dashboard", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_render_dashboard_includes_summary(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "이번 주 핵심 성과 요약입니다.",
        "파트별_핵심": {
            "전략기획": {"주요_성과": ["a"], "주요_이슈": ["b"], "차주_계획": [], "리스크": []}
        },
        "진척률": {"전략기획": 80},
        "미작성_파트": [],
        "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result,
        dept_name="기획팀",
        week="2026-W18",
        template_path=PROJECT_ROOT / "skills/weekly/templates/template_dashboard.html.j2",
    )
    assert "기획팀 주간보고 — 2026-W18" in html
    assert "이번 주 핵심 성과 요약입니다." in html
    assert "80%" in html
    assert "<title>" in html


def test_render_marks_missing_parts(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "...",
        "파트별_핵심": {},
        "진척률": {},
        "미작성_파트": ["사업개발"],
        "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "skills/weekly/templates/template_dashboard.html.j2",
    )
    assert "사업개발" in html
    assert "미작성 파트" in html


def test_render_includes_warnings(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "x",
        "파트별_핵심": {},
        "진척률": {},
        "미작성_파트": [],
        "주의사항": ["민감정보 가능성 발견 — 확인 요망"],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "skills/weekly/templates/template_dashboard.html.j2",
    )
    assert "민감정보 가능성 발견" in html
    assert "주의사항" in html
