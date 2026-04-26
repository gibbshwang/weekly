"""Tests for the Phase 2 task-centric dashboard renderer + template."""
import importlib.util
from pathlib import Path

from scripts.lib.template_render import render_string

PROJECT_ROOT = Path(__file__).resolve().parent.parent
V2_TMPL_PATH = PROJECT_ROOT / "templates/template_dashboard_v2.html.j2"


def _load_dashboard(tmp_path: Path):
    template_path = PROJECT_ROOT / "templates/src/dashboard.py.tmpl"
    text = render_string(template_path.read_text(encoding="utf-8"), {})
    out = tmp_path / "dashboard.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("dashboard", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


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


# --- Top-level rendering ---


def test_render_includes_team_and_week(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "기획팀" in html
    assert "2026-W18" in html
    assert "이번 주 사업그룹은 제안 진행 중" in html


def test_renders_지난주_and_이번주_items(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "지난주 미결 처리현황" in html or "지난주" in html
    assert "이번주 신규/진행 현황" in html or "이번주" in html
    assert "W17-003" in html
    assert "고객사 A 제안서 가격 비교표 추가" in html
    assert "가격 비교표 초안 작성 완료" in html
    assert "W18-001" in html
    assert "신규 고객사 B 제안 준비" in html


def test_groups_items_by_group(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "사업그룹" in html
    assert "주의" in html or "정상" in html  # group-state badge


def test_renders_그룹장_확인필요_section(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "그룹장 확인 필요" in html or "그룹장_확인필요" in html
    assert "법무 리뷰 일정 조율 필요" in html
    assert "2026-04-29" in html


def test_marks_missing_parts(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "운영관리" in html
    assert "미작성" in html


def test_includes_warnings(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    result = _v2_result()
    result["주의사항"] = ["민감정보 가능성 발견 — 확인 요망"]
    html = dashboard.render_dashboard(
        result=result, team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "민감정보 가능성 발견" in html
    assert "주의사항" in html


# --- Design constraints ---


def test_dashboard_has_pretendard_font_stack(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "Pretendard" in html
    assert "Apple SD Gothic Neo" in html or "Malgun Gothic" in html


def test_dashboard_uses_design_palette(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "#F5F3F0" in html  # warm gray
    assert "#1B6B5A" in html  # deep teal
    assert "purple" not in html.lower()
    assert "#7C3AED" not in html
    assert "#A855F7" not in html


def test_dashboard_has_print_styles(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "@media print" in html


def test_dashboard_uses_semantic_html(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "<header" in html and "<main" in html
    assert "<section" in html


def test_dashboard_no_external_resources(tmp_path: Path):
    """PRD: no CDN imports, email-safe."""
    import re
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    for tag in re.findall(r'<(?:link|script|img)[^>]+>', html):
        if "src=" in tag or "href=" in tag:
            assert not re.search(r'(?:src|href)="(?:https?://|//cdn)', tag), (
                f"External resource: {tag}"
            )


# --- XSS hardening (FIX-01 inheritance) ---


_XSS_PAYLOAD = "<script>alert('xss')</script>"
_XSS_ESCAPED = "&lt;script&gt;alert"


def test_xss_in_summary_is_escaped(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    result = _v2_result()
    result["팀_종합_요약"] = f"안녕하세요 {_XSS_PAYLOAD} 끝."
    html = dashboard.render_dashboard(
        result=result, team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert _XSS_PAYLOAD not in html
    assert _XSS_ESCAPED in html


def test_xss_in_team_name_is_escaped(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    html = dashboard.render_dashboard(
        result=_v2_result(), team_name=_XSS_PAYLOAD, week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert _XSS_PAYLOAD not in html


def test_xss_in_item_fields_is_escaped(tmp_path: Path):
    """Task fields (업무, 이번주_처리결과, 이슈, ...) come from LLM and must be escaped."""
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
    html = dashboard.render_dashboard(
        result=result, team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert payload not in html
    assert "&lt;img" in html


def test_xss_in_warnings_list_is_escaped(tmp_path: Path):
    dashboard = _load_dashboard(tmp_path)
    result = _v2_result()
    result["주의사항"] = [_XSS_PAYLOAD]
    html = dashboard.render_dashboard(
        result=result, team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert _XSS_PAYLOAD not in html


def test_summary_newlines_become_br_after_escape(tmp_path: Path):
    """Real \\n becomes <br>, but only AFTER escaping — synthesized tags stay escaped."""
    dashboard = _load_dashboard(tmp_path)
    result = _v2_result()
    result["팀_종합_요약"] = "첫 줄\n둘째 줄\n<b>셋째 줄 with HTML</b>"
    html = dashboard.render_dashboard(
        result=result, team_name="기획팀", week="2026-W18",
        template_path=V2_TMPL_PATH,
    )
    assert "첫 줄<br>둘째 줄<br>" in html
    assert "<b>셋째 줄 with HTML</b>" not in html
    assert "&lt;b&gt;" in html
