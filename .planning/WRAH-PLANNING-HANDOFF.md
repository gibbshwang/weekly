# WRAH (Weekly Report Automation Harness) — 새 스킬 기획 핸드오프

**Status:** PRD 수령, 초안 계획만 작성. 다음 세션에서 brainstorm + 정식 plan 필요.
**Trigger:** 사용자 텔레그램 메시지 1800 (2026-04-25 07:21) — `주간업무보고_자동화_하네스_PRD-1.docx` 첨부
**Source PRD 파일:** `C:\Users\hhc20\.claude\channels\telegram\inbox\1777101691455-AgADzRsAAlgOYFc.docx`
**전문 백업:** 본 문서 끝의 [PRD 전문] 섹션

## PRD 핵심 요약

**제품명:** WRAH (Weekly Report Automation Harness)
**한 줄:** 사내 공유폴더 + Enterprise AI CLI를 결합해 상급자 지시 → 대시보드 보고까지 취합자 없이 자동 운영하는 부서 표준 주간보고 시스템.

### 핵심 제약
1. **데이터 위치**: 사내 공유폴더(SMB/NFS) only. 외부 클라우드 금지.
2. **AI 한정**: ChatGPT Enterprise + Gemini Enterprise CLI만 (사전 승인). 외부 SaaS 금지.
3. **불가 환경**: Google Workspace / M365 / Notion / ClickUp / Slack 등 외부 협업툴 전부.
4. **데이터 주권**: 한국 내 처리 + Enterprise 학습 비활용 충족.

### 핵심 사용자 / 흐름
| 시점 | 주체 | 동작 |
|------|------|------|
| 월 오전 | 그룹장 | `_instructions.md`에 업무 지시 작성 |
| 자동 | WRAH `assign` | AI가 파트별로 분배 → `<파트>.md` 생성 → SMTP로 파트장 통보 |
| 주중 | 파트장 | 자기 `.md` 업데이트 (성과/이슈/차주계획) |
| 금 17:00 | WRAH `compile` | 취합 → HTML 대시보드 → 그룹장 메일 + 공유폴더 보관 |

### 폴더 구조
```
\\사내공유\주간업무\<부서>\
  config.yaml
  _instructions.md
  YYYY-Www\
    _assignments.json
    <파트>.md
    _dashboard.html
  logs\
```

### CLI 명령
- `wreport init <부서>` — 신규 부서 1회 셋업 (config + 폴더 + SMTP 테스트)
- `wreport assign` — `_instructions.md` 변경 감지 시 자동/수동
- `wreport status` — 작성 진행 현황 + 미작성 리마인드
- `wreport compile` — 마감시각 자동 또는 수동 (취합 + 대시보드 + 메일)

### F-요구사항 우선순위
- **P0:** F-01(분배), F-02(파트장 메일), F-04(취합/요약), F-05(대시보드), F-06(그룹장 메일), F-08(부서별 config)
- **P1:** F-03(현황+리마인드), F-07(아카이빙), F-09(프롬프트 라이브러리), F-10(감사로그)

### 기술 스택 (PRD 제시)
- Python 3.10+ Click CLI
- YAML + Pydantic config
- AI Adapter (Gemini CLI + Codex CLI 양쪽 지원, 어댑터 패턴)
- SMB/NFS storage
- smtplib / Outlook COM 메일
- Task Scheduler / cron
- Jinja2 + Chart.js (CDN 미사용, 인라인) — 단일 HTML 대시보드

### 도입 로드맵 (PRD 4단계)
- Phase 0 (1주): PoC, 본인 그룹에서 수동 compile만
- Phase 1 (2-3주): MVP — assign + compile 자동화 + 메일
- Phase 2 (4-6주): 하네스화 — config 분리 + 프롬프트 라이브러리 + 다부서 구조
- Phase 3 (7-10주): Pilot — 3~5 부서 적용 + 피드백
- Phase 4 (11주~): 전사 확산

## /udd 경험에서 가져올 패턴 (재사용 가능)

이번 세션 dogfooding으로 검증된 패턴들 — WRAH 설계에 그대로 활용:

1. **9-stage 파이프라인 모델** — `precheck → scope → scaffold → auth → record → refactor → validate → approve → schedule → handoff`. WRAH도 부서별 셋업이 비슷한 흐름.
2. **`config.yaml` per-부서** + **templates 디렉토리** — `/udd`의 핵심 구조 그대로.
3. **Multi-CLI 호환** — `platform_detect.py` 그대로 가져다 쓰면 Claude/Codex/Gemini 모두 지원.
4. **AI 호출 추상화** — `lib/llm_call.py` (anthropic/gemini/openai 3-provider) 패턴 재사용 가능.
5. **Telegram 알림 어댑터** — `lib/telegram.py` + `notify.py.tmpl` 그대로 (단, WRAH는 SMTP 메일이 1순위, 텔레그램은 옵션).
6. **Jinja2 템플릿 렌더링** — `template_render.py` 그대로.
7. **Self-healing AI selector** — 이번 케이스는 selector가 아니라 "분배 결과 검증" 같은 도메인. 패턴은 같음.

**잠재 분기:**
- /udd가 *Playwright 기반 외부 사이트 자동화* 라면 WRAH는 *파일 시스템 + AI 텍스트 처리*. Browser 부분은 빠짐.
- 대신 *SMTP 메일 발송* + *Outlook COM 자동화* + *Windows Task Scheduler* 부분이 새로 들어옴.

## 다음 세션에서 결정해야 할 것 (Open Questions)

1. **/wrah 이름** — `/udd`처럼 짧은 슬래시 커맨드로 만들 건가? 아니면 `wreport` 별도 CLI 바이너리?
2. **AI Adapter 범위** — PRD는 ChatGPT Enterprise + Gemini Enterprise만 명시. /udd의 anthropic 채널은 빼야 하나?
3. **HTML 대시보드 디자인** — 인라인 Chart.js 사용. 디자인 리서치 필요? (`/design-consultation` 활용 가능).
4. **파트장 메일 프로토콜** — SMTP 단방향만? 아니면 답장 → 자동 파일 업데이트 같은 reply-to-action 흐름?
5. **민감정보 마스킹** — config의 마스킹 규칙(주민번호/단가 등)을 정규식으로? AI에게 redact 요청? 둘 다?
6. **스킬 vs 스탠드얼론 CLI** — `/udd`처럼 Claude Code/Codex/Gemini 안에서 invoke되는 스킬 형태 + `wreport` 명령은 생성된 프로젝트의 venv에서 운영자가 실행. 이 모델 OK?
7. **로드맵의 Phase 0 (PoC)** — "본인 그룹"이 누구의 그룹? 사용자가 PoC 그룹장 본인인가? config 1개 만들어서 본인 부서 데이터로 시뮬레이션 가능?
8. **Pilot 부서 선정** — Phase 3 시작 전 결정 필요.

## 다음 세션에서 즉시 시작할 절차

1. 이 핸드오프 파일 읽기 (`.planning/WRAH-PLANNING-HANDOFF.md`)
2. `/brainstorm` 또는 `superpowers:brainstorming` 스킬로 위 Open Questions 답변 받기
3. 답변 기반으로 `/gsd-new-project` 또는 `/gsd-plan-phase`로 정식 PLAN.md 작성
4. /udd 경험 살려 wave-based 분해 (Phase 1 MVP가 적당한 첫 milestone)

## 권장 다음 스텝 (compact)

```
새 세션 시작 → 이 파일 읽기 → /brainstorm "WRAH 새 스킬, PRD는 .planning/WRAH-PLANNING-HANDOFF.md 참고" → 정식 plan
```

---

## [PRD 전문 백업]

원본 docx에서 추출한 텍스트 (6371자):

```
주간업무보고 자동화 하네스
Weekly Report Automation Harness
배경 및 PRD (Product Requirements Document)
AX 전략과제
v1.0 | 2026.04

1. 배경
1.1 현재 업무 프로세스의 문제점:
- 팀장이 구두/메일로 지시 → 파트장이 워드 작성 → 취합자 1명이 수동 정리 → 임원 보고
- 핵심 비효율: 취합자 부담 집중(주 2-3시간), 버전관리 혼선, 지시 추적 불가, 포맷 비통일, 가시성 부재

1.2 환경 제약:
- 외부 클라우드 데이터 반출 금지
- 사용 가능: ChatGPT Enterprise, Gemini Enterprise (CLI 포함)
- 사용 불가: Google Workspace, M365, Notion/ClickUp 등 외부 SaaS
- 한국 내 데이터 처리 + Enterprise 학습 비활용

1.3 기존 솔루션 한계: Notion/ClickUp(외부), Workspace+Gemini(미보유), ChatGPT Enterprise 단독(부서마다 재설정), 부서별 1회성 스크립트(재개발 필요)

1.4 하네스 접근: 코드 1벌 + config N벌. AI 호출 표준 프롬프트 라이브러리. 사내 인프라(공유폴더, SMTP)에만 의존.

2. 제품 개요
2.1 제품명: 주간업무보고 자동화 하네스 (WRAH)
2.2 한 줄: 상급자 지시부터 대시보드 보고까지 취합자 없이 자동 운영
2.3 비전: 보고서를 '쓰는 일'이 아니라 '의사결정을 위한 데이터'로
2.4 사용자: 그룹장(지시자), 파트장(작성자), AX 운영자(관리자), 취합자(소멸)

3. 시스템 흐름
- 월요일 오전: 그룹장이 _instructions.md 작성
- 자동: WRAH가 파일 변경 감지 → AI가 파트별 분배 → 각 .md 생성
- 자동: 사내 SMTP로 파트장 메일 발송
- 주중: 파트장이 자기 .md 업데이트 (성과/이슈/차주계획)
- 금 17:00 자동: AI 취합·요약·진척률 → HTML 대시보드 생성
- 금 17:05 자동: 그룹장에게 대시보드 메일 + 공유폴더 보관

폴더: \\사내공유\주간업무\<부서>\config.yaml + _instructions.md + YYYY-Www/{_assignments.json, <파트>.md, _dashboard.html} + logs/

4. 기능 요구사항 (F-01 ~ F-10)
P0: F-01 지시 자동 분배, F-02 파트장 메일, F-04 자동 취합/요약, F-05 HTML 대시보드, F-06 그룹장 결과 메일, F-08 부서별 config
P1: F-03 작성 현황 추적+리마인드, F-07 주차별 아카이빙, F-09 프롬프트 라이브러리, F-10 실행 로그

CLI: wreport init <부서> | assign | status | compile

5. 비기능 요구사항
- 보안: 사내 공유폴더 only, 사전 승인 AI 채널, 마스킹 규칙(주민번호/단가), audit.jsonl 로그, 공유폴더 ACL
- 운영: Windows/Mac/Linux Python 3.10+, SMTP/Outlook COM, Task Scheduler/cron, watchdog
- 성능: compile 3분 이내(파트 10개), AI 재시도 3회, 메일 발송 실패 보관
- 확장: config.yaml 1부서당 1개, prompts/ 디렉토리 부서별 오버라이드

6. 기술 아키텍처
- CLI Core: Python 3.10+ Click
- Config Layer: YAML + Pydantic
- AI Adapter: Gemini CLI / Codex CLI 추상화 (장애 시 폴백)
- Storage: SMB/NFS
- Notification: smtplib / Outlook COM
- Scheduler: Task Scheduler / cron
- Renderer: Jinja2 + Chart.js 인라인 (CDN 미사용)

7. 도입 로드맵
- Phase 0 (1주): PoC, 본인 그룹 수동 compile
- Phase 1 (2-3주): MVP, assign+compile+메일
- Phase 2 (4-6주): 하네스화, config+프롬프트 라이브러리+다부서
- Phase 3 (7-10주): Pilot 3-5부서
- Phase 4 (11주~): 전사 AX 표준 등재

8. 성공 지표
- 정량: 취합시간 80% 단축, 보고 누락률 5% 이하, compile 3분 이내, 1년 10부서 이상
- ROI: 1그룹 연 650만원 절감, 10부서 6500만원 + FTE 0.6명

9. 리스크: AI 분배 품질 편차(프롬프트 표준화), 민감 데이터 노출(마스킹), 파트장 미작성(리마인드+가시화), SMTP 어려움(Outlook COM 우회), 양식 차이(자유 영역), AI 정책 변경(어댑터 종속성 최소화)

10. Out of Scope (v1.0): 월간/분기/연간 보고, KPI/OKR 연동, 외부 협력사·고객 보고서, 실시간 협업 편집, 모바일 전용 UI
```
