import importlib.util
from pathlib import Path
from scripts.lib.template_render import render_string

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_dashboard(tmp_path: Path):
    template_path = PROJECT_ROOT / "templates/src/dashboard.py.tmpl"
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
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
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
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
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
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    assert "민감정보 가능성 발견" in html
    assert "주의사항" in html


def test_dashboard_has_pretendard_font_stack(tmp_path: Path):
    """Per CLAUDE.md typography constraint."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "x", "파트별_핵심": {}, "진척률": {},
        "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    # System font stack with Pretendard primary + Korean fallback
    assert "Pretendard" in html
    assert "Apple SD Gothic Neo" in html or "Malgun Gothic" in html


def test_dashboard_uses_design_palette(tmp_path: Path):
    """Warm gray bg + deep teal accent (CLAUDE.md design tokens)."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "x", "파트별_핵심": {}, "진척률": {},
        "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    assert "#F5F3F0" in html  # warm gray
    assert "#1B6B5A" in html  # deep teal
    # No purple
    assert "purple" not in html.lower()
    assert "#7C3AED" not in html
    assert "#A855F7" not in html


def test_dashboard_has_print_styles(tmp_path: Path):
    """Print-friendly per design constraint."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "x", "파트별_핵심": {}, "진척률": {},
        "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    assert "@media print" in html


def test_dashboard_uses_semantic_html(tmp_path: Path):
    """Semantic HTML5 for accessibility."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "x",
        "파트별_핵심": {"전략기획": {"주요_성과": [], "주요_이슈": [], "차주_계획": [], "리스크": []}},
        "진척률": {"전략기획": 50},
        "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    assert "<header" in html or "<main" in html
    # Progress bar should have ARIA label or role
    assert 'role="progressbar"' in html or "aria-" in html


def test_dashboard_no_external_resources(tmp_path: Path):
    """PRD §6: 'CDN 미사용', email-safe — no external links/CDN/scripts."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "x", "파트별_핵심": {}, "진척률": {},
        "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    # No CDN imports
    import re
    for tag in re.findall(r'<(?:link|script|img)[^>]+>', html):
        # Allow inline style/script with no src/href, allow data: URLs
        if "src=" in tag or "href=" in tag:
            # Must be relative/anchor only, not http/https/cdn
            assert not re.search(r'(?:src|href)="(?:https?://|//cdn)', tag), f"External resource: {tag}"


# --- XSS hardening (FIX-01) ---

_XSS_PAYLOAD = "<script>alert(1)</script>"
_XSS_ESCAPED = "&lt;script&gt;alert(1)&lt;/script&gt;"


def test_xss_in_summary_is_escaped(tmp_path: Path):
    """LLM-produced summary content must be HTML-escaped, not rendered as live HTML."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": f"안녕하세요 {_XSS_PAYLOAD} 끝.",
        "파트별_핵심": {}, "진척률": {}, "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    assert _XSS_PAYLOAD not in html, "Raw <script> tag leaked through into output"
    assert _XSS_ESCAPED in html, "Summary should be HTML-escaped"


def test_xss_in_dept_name_is_escaped(tmp_path: Path):
    """Even though FIX-07 validates dept_name, the renderer must escape defensively."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "x", "파트별_핵심": {}, "진척률": {},
        "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name=_XSS_PAYLOAD, week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    assert _XSS_PAYLOAD not in html


def test_xss_in_part_name_is_escaped(tmp_path: Path):
    """Part name keys in 파트별_핵심 / 진척률 dicts must be escaped."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "x",
        "파트별_핵심": {
            _XSS_PAYLOAD: {"주요_성과": [], "주요_이슈": [], "차주_계획": [], "리스크": []}
        },
        "진척률": {_XSS_PAYLOAD: 50},
        "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    assert _XSS_PAYLOAD not in html


def test_xss_in_warnings_list_is_escaped(tmp_path: Path):
    """주의사항 list items come from LLM output and must be escaped."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "x", "파트별_핵심": {}, "진척률": {},
        "미작성_파트": [],
        "주의사항": [_XSS_PAYLOAD],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    assert _XSS_PAYLOAD not in html


def test_summary_newlines_become_br_after_escape(tmp_path: Path):
    """Summary should still convert real \\n to <br>, but only AFTER escaping
    other characters — so attacker-controlled content can't synthesize new tags."""
    dashboard = _load_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "첫 줄\n둘째 줄\n<b>세째 줄 with HTML</b>",
        "파트별_핵심": {}, "진척률": {}, "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=PROJECT_ROOT / "templates/template_dashboard.html.j2",
    )
    # Real newlines become <br>
    assert "첫 줄<br>둘째 줄<br>" in html
    # But the <b> tag is escaped, not rendered
    assert "<b>세째 줄 with HTML</b>" not in html
    assert "&lt;b&gt;세째 줄 with HTML&lt;/b&gt;" in html
