---
name: weekly
description: Weekly Report Automation Harness — end-to-end automation for departmental weekly status reports (group lead instructions → part lead .md updates → AI compile → HTML dashboard → email). Use when the user wants a self-healing, scheduled Python project that runs on a corporate shared folder with SMTP notification. Generates an independent project folder with Click CLI + OS keyring auth + Codex CLI subprocess for AI calls (sanctioned channel only) and Gemini CLI subprocess fallback.
author: gibbs hwang
version: 0.1.0
---

# /weekly — Weekly Report Automation Harness

부서의 주간업무보고 자동화 스킬. 한 번의 `/weekly init <부서>` 실행으로 부서별 standalone Python 프로젝트가 생기고, 그 프로젝트가 cron으로 자동 동작한다 (Phase 1).

본 스킬은 CLI-agnostic — Claude Code, Codex CLI, Gemini CLI 어느 환경에서도 동일하게 동작한다.

## AI 채널 제약 (사용자 결정 2026-04-25)

PRD §1.2의 "사전 승인 AI CLI 채널만" 제약을 충실히 따른다:
- **AI가 사용되는 모든 호출은 Codex CLI 또는 Gemini CLI subprocess로 처리** (`codex exec` / `gemini -p`)
- 외부 AI API(anthropic/openai/google-generativeai SDK 등) 사용 금지 — 보안정책상 차단됨
- 비-AI 작업(SMTP 발송, Jinja2 HTML 렌더링, openpyxl xlsx 처리)은 일반 Python 라이브러리 사용

## 자율 모드 (Autonomous Mode)

스킬은 9-stage 파이프라인 동안 파일/subprocess를 수회 만진다. 각 CLI의 권한 우회 모드가 활성화되어 있어야 한다:

- **Claude Code**: `CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=1` 또는 `--dangerously-skip-permissions` 플래그
- **Codex CLI**: `--full-auto` 또는 sandbox 환경에서 `CODEX_MANAGED_BY_NPM=1`
- **Gemini CLI**: `--yolo` 또는 `--approval-mode=yolo`

`scripts/lib/platform_detect.py`가 현재 호스트를 식별하고, 권한 모드 미설정 시 안내 메시지를 출력한다.

## 9-Stage Init Pipeline (`/weekly init <부서>`)

각 stage는 별도 스크립트로, 순차 실행. 실패 시 그 stage에서 멈추고 사용자에게 보고.

| Stage | 스크립트 | 역할 |
|-------|---------|------|
| 0 | scripts/precheck.py | Python 3.10+, 디스크 공간, 부서 디렉토리 충돌 검사 |
| 1 | scripts/scope.py | 부서명/파트/메일/SMTP/AI provider 인터랙티브 입력 |
| 2 | scripts/scaffold.py | `~/weekly/<부서>/` 생성 + venv + 패키지 install + templates 복사 |
| 3 | scripts/config_setup.py | `config.yaml` 작성 |
| 4 | scripts/xlsx_template.py | `_지시사항.xlsx`를 storage root에 생성 (양식 + dropdown) |
| 5 | scripts/keyring_setup.py | SMTP password + AI API key를 OS keyring에 저장 |
| 6 | scripts/smtp_test.py | 그룹장에게 테스트 메일 발송 + 도착 확인 |
| 7 | (Phase 1) scripts/schedule_install.py | cron 등록 — Phase 0에선 skip |
| 8 | scripts/handoff.py | README.md 생성 + 운영 가이드 출력 |

## Post-Scaffold Operations

스킬이 scaffold를 끝내면 사용자는 호스트 CLI를 떠나 venv에서 `wreport` 직접 실행 가능:

```
cd ~/weekly/<부서>
.venv/Scripts/wreport compile <부서> --week=2026-W18
```

Phase 1에서는 cron이 위 명령을 자동 실행한다.

## /design-consultation Wave (별도)

Phase 0 첫 wave에서 별도로 `/design-consultation`을 호출해 대시보드 디자인 시스템을 도출하고, 결과물을 `templates/template_dashboard.html.j2`에 commit 한다. init 파이프라인은 이미 채워진 템플릿을 scaffold만 한다.

## Files in This Bundle

- `SKILL.md` — 본 문서
- `scripts/` — 9-stage 파이프라인 스크립트 (Phase 0: 0,1,2,3,4,5,6,8 — Phase 1: 7)
- `scripts/lib/` — /udd에서 재사용한 헬퍼 (platform_detect, llm_call, template_render, telegram)
- `templates/` — 생성 프로젝트의 src/ + 양식 파일들
- `tests/` — pytest 단위/통합 테스트
- `fixtures/` — 테스트용 샘플 xlsx + .md
