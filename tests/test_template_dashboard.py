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


# --- Phase 2 (Wave D): dashboard v2 — 지난주/이번주 task-centric ---


V2_TMPL_PATH = PROJECT_ROOT / "templates/template_dashboard_v2.html.j2"


def _v2_result():
    """Sample v2 schema output that exercises every section."""
    return {
        "팀_종합_요약": "이번 주 사업그룹은 제안 진행 중, 운영그룹은 안정.",
        "지난주": {
            "요약": "지난주 미결 2건 중 1건 완료, 1건 진행중.",
            "항목": [
                {
                    "그룹": "사업그룹", "파트": "전략기획", "업무ID": "W17-003",
                    "업무": "고객사 A 제안서 가격 비교표 추가",
                    "상태": "진행중",
                    "이번주_처리결과": ["가격 비교표 초안 작성 완료"],
                    "이슈": ["법무 문구 검토 지연"],
                    "리스크_지원요청": ["법무 리뷰 일정 조율 필요"],
                    "다음액션": ["4/30까지 임원 보고용 초안 반영"],
                    "마감": "2026-04-30", "우선순위": "높음",
                },
            ],
        },
        "이번주": {
            "요약": "신규 1건 진행 중.",
            "항목": [
                {
                    "그룹": "사업그룹", "파트": "사업개발", "업무ID": "W18-001",
                    "업무": "신규 고객사 B 제안 준비",
                    "상태": "진행중",
                    "이번주_처리결과": ["요구사항 정리"],
                    "이슈": ["가격 정책 확정 전"],
                    "리스크_지원요청": ["가격 가이드 필요"],
                    "다음액션": ["다음 주 제안서 초안 완성"],
                    "마감": "2026-05-03", "우선순위": "높음",
                },
            ],
        },
        "그룹별_요약": {
            "사업그룹": {"상태": "주의", "요약": "주요 제안 진행 중, 가격/법무 의사결정 대기."},
            "운영그룹": {"상태": "정상", "요약": "정기 업무 안정 진행."},
        },
        "그룹장_확인필요": [
            {"그룹": "사업그룹", "파트": "전략기획", "업무ID": "W17-003",
             "내용": "법무 리뷰 일정 조율 필요", "희망기한": "2026-04-29"},
        ],
        "미작성_파트": ["운영관리"],
        "주의사항": [],
    }


def test_render_dashboard_v2_includes_team_and_week(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard_v2(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "기획팀" in html
    assert "2026-W18" in html
    assert "이번 주 사업그룹은 제안 진행 중" in html


def test_render_dashboard_v2_renders_지난주_and_이번주_items(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard_v2(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    # Section headings
    assert "지난주 미결 처리현황" in html or "지난주" in html
    assert "이번주 신규/진행 현황" in html or "이번주" in html
    # Each item's task ID + content
    assert "W17-003" in html
    assert "고객사 A 제안서 가격 비교표 추가" in html
    assert "가격 비교표 초안 작성 완료" in html
    assert "W18-001" in html
    assert "신규 고객사 B 제안 준비" in html


def test_render_dashboard_v2_groups_items_by_group(tmp_path: Path):
    """Each item should appear under its group label so the team lead can
    scan group-by-group."""
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard_v2(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "사업그룹" in html
    # Group summary state badge ("주의"/"정상") should appear
    assert "주의" in html or "정상" in html


def test_render_dashboard_v2_renders_그룹장_확인필요_section(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard_v2(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    # Section heading present
    assert "그룹장 확인 필요" in html or "그룹장_확인필요" in html
    assert "법무 리뷰 일정 조율 필요" in html
    assert "2026-04-29" in html  # 희망기한


def test_render_dashboard_v2_marks_missing_parts(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard_v2(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "운영관리" in html
    assert "미작성" in html


def test_render_dashboard_v2_xss_protection_on_summary(tmp_path: Path):
    """V2 dashboard must inherit FIX-01 autoescape — script tags in any field
    must render as escaped text, not live HTML."""
    dashboard = _load_dashboard(tmp_path)
    payload = "<script>alert('xss')</script>"
    result = {
        "팀_종합_요약": payload,
        "지난주": {"요약": payload, "항목": []},
        "이번주": {"요약": payload, "항목": []},
        "그룹별_요약": {},
        "그룹장_확인필요": [],
        "미작성_파트": [],
        "주의사항": [payload],
    }
    html = dashboard.render_dashboard_v2(
        result=result, team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "<script>alert" not in html
    assert "&lt;script&gt;" in html


def test_render_dashboard_v2_xss_protection_on_item_fields(tmp_path: Path):
    """Item fields (업무, 처리결과, 이슈 etc.) come from LLM output and are
    fully untrusted. Every render path must escape them."""
    dashboard = _load_dashboard(tmp_path)
    payload = "<img src=x onerror=alert(1)>"
    result = {
        "팀_종합_요약": "x",
        "지난주": {"요약": "", "항목": [
            {"그룹": "g", "파트": "p", "업무ID": "X", "업무": payload,
             "상태": "진행중", "이번주_처리결과": [payload],
             "이슈": [payload], "리스크_지원요청": [],
             "다음액션": [], "마감": "", "우선순위": ""},
        ]},
        "이번주": {"요약": "", "항목": []},
        "그룹별_요약": {}, "그룹장_확인필요": [],
        "미작성_파트": [], "주의사항": [],
    }
    html = dashboard.render_dashboard_v2(
        result=result, team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert payload not in html
    assert "&lt;img" in html


def test_render_dashboard_v2_no_external_resources(tmp_path: Path):
    """Same email-safe constraint as v1: no CDN imports."""
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard_v2(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    import re
    for tag in re.findall(r'<(?:link|script|img)[^>]+>', html):
        if "src=" in tag or "href=" in tag:
            assert not re.search(r'(?:src|href)="(?:https?://|//cdn)', tag), (
                f"External resource: {tag}"
            )


def test_render_dashboard_v2_uses_warm_gray_and_deep_teal(tmp_path: Path):
    """CLAUDE.md design tokens preserved across schema migration."""
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard_v2(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "#F5F3F0" in html  # warm gray
    assert "#1B6B5A" in html  # deep teal
    assert "purple" not in html.lower()
