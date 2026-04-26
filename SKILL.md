---
name: weekly
description: Weekly Report Automation Harness — end-to-end automation for team weekly status reports (team lead instructions → assign distributes → part lead xlsx updates → AI compile → HTML dashboard → email). Use when the user wants a self-healing, scheduled Python project that runs on a corporate shared folder with SMTP notification. Generates an independent project folder with Click CLI + OS keyring auth + Codex CLI subprocess for AI calls (sanctioned channel only) and Gemini CLI subprocess fallback.
---

# /weekly — Weekly Report Automation Harness

팀 단위 주간업무보고 자동화 스킬. 한 번의 `/weekly init <팀>` 실행으로 팀별 standalone Python 프로젝트가 생기고, prepare/assign/compile 3종 cron으로 자동 동작한다.

팀 → 그룹 → 파트 3-level 구조를 지원하며, 지시사항은 task-centric xlsx로 분배·취합된다.

본 스킬은 CLI-agnostic — Claude Code, Codex CLI, Gemini CLI 어느 환경에서도 동일하게 동작한다.

## AI 채널 제약 (사용자 결정 2026-04-25)

PRD §1.2의 "사전 승인 AI CLI 채널만" 제약을 충실히 따른다:
- **AI가 사용되는 모든 호출은 Codex CLI 또는 Gemini CLI subprocess로 처리** (`codex exec` / `gemini` — prompt는 argv 아닌 stdin으로 전달, PII 노출 방지)
- 외부 AI API(anthropic/openai/google-generativeai SDK 등) 사용 금지 — 보안정책상 차단됨
- 비-AI 작업(SMTP 발송, Jinja2 HTML 렌더링, openpyxl xlsx 처리)은 일반 Python 라이브러리 사용

## 자율 모드 (Autonomous Mode)

스킬은 9-stage 파이프라인 동안 파일/subprocess를 수회 만진다. 각 CLI의 권한 우회 모드가 활성화되어 있어야 한다:

- **Claude Code**: `CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=1` 또는 `--dangerously-skip-permissions` 플래그
- **Codex CLI**: `--full-auto` 또는 sandbox 환경에서 `CODEX_MANAGED_BY_NPM=1`
- **Gemini CLI**: `--yolo` 또는 `--approval-mode=yolo`

`scripts/lib/platform_detect.py`가 현재 호스트를 식별하고, 권한 모드 미설정 시 안내 메시지를 출력한다.

## 9-Stage Init Pipeline (`/weekly init <팀>`)

각 stage는 별도 스크립트로, 순차 실행. 실패 시 그 stage에서 멈추고 사용자에게 보고.

| Stage | 스크립트 | 역할 |
|-------|---------|------|
| 0 | scripts/precheck.py | Python 3.10+, 디스크 공간, 팀 디렉토리 충돌 검사 |
| 1 | scripts/scope.py | 팀명/그룹/파트/메일/SMTP/AI provider 인터랙티브 입력 |
| 2 | scripts/scaffold.py | `~/weekly/<팀>/` 생성 + venv + 패키지 install + templates 복사 |
| 3 | scripts/config_setup.py | `config.yaml` 작성 |
| 4 | scripts/xlsx_template.py | `_지시사항.xlsx`를 storage root에 생성 (양식 + dropdown) |
| 5 | scripts/keyring_setup.py | SMTP password를 OS keyring에 저장 (AI는 Codex/Gemini CLI subprocess라 별도 키 불요) |
| 6 | scripts/smtp_test.py | 팀장에게 테스트 메일 발송 + 도착 확인 |
| 7 | scripts/schedule_install.py | cron 등록 — prepare(월요일) + assign(시간별) + compile(주간) Task Scheduler 등록 |
| 8 | scripts/handoff.py | README.md 생성 + 운영 가이드 출력 |

## Runtime Commands (post-scaffold, via `wreport`)

| Command | When | Action |
|---------|------|--------|
| `wreport prepare <팀>` | weekly cron (월 06:00) | 새 주차 파트 xlsx 생성 + carry-forward 미완료 업무 + 지난 주 archive (idempotent) |
| `wreport assign <팀>` | hourly cron | 지시사항 xlsx 변경 감지 → 파트별 xlsx 분배 → 영향 파트장 메일 |
| `wreport compile <팀>` | weekly cron | 파트 xlsx 취합 → dashboard.html → 메일 (to=팀장, cc=그룹장+파트장) |
| `wreport status <팀>` | manual | 작성 진척 표시 |
| `wreport schedule install <팀>` | once after init | OS 스케줄러 등록 (prepare/assign/compile 3종) |
| `wreport schedule uninstall <팀>` | when retiring | 스케줄러 해제 |
| `wreport schedule status <팀>` | manual | 등록된 작업 확인 |

## Post-Scaffold Operations

스킬이 scaffold를 끝내면 사용자는 호스트 CLI를 떠나 venv에서 `wreport` 직접 실행 가능:

```
cd ~/weekly/<팀>
venv/Scripts/wreport compile <팀> --week=2026-W18    # Windows
venv/bin/wreport     compile <팀> --week=2026-W18    # Unix
```

`wreport schedule install <팀>` 등록 후에는 cron이 prepare/assign/compile을 자동 실행한다.

## /design-consultation Wave (별도)

Phase 0 첫 wave에서 별도로 `/design-consultation`을 호출해 대시보드 디자인 시스템을 도출하고, 결과물을 `templates/template_dashboard.html.j2`에 commit 한다. init 파이프라인은 이미 채워진 템플릿을 scaffold만 한다.

## Files in This Bundle

- `SKILL.md` — 본 문서
- `scripts/` — 9-stage 파이프라인 스크립트 (Phase 0: 0,1,2,3,4,5,6,8 — Phase 1: 7)
  - `scripts/schedule_install.py` — Stage 7: OS 스케줄러 등록 (prepare/assign/compile cron)
- `scripts/lib/` — /udd에서 재사용한 헬퍼 (platform_detect, llm_call, template_render, telegram)
- `templates/` — 생성 프로젝트의 src/ + 양식 파일들
  - `templates/src/prepare.py.tmpl` — 새 주차 파트 xlsx 생성 + carry-forward + archive (idempotent)
  - `templates/src/assigner.py.tmpl` — distribution engine (xlsx 변경 → 파트별 분배)
  - `templates/src/compiler.py.tmpl` — task-centric xlsx 취합 → dashboard 데이터 모델
  - `templates/src/dashboard.py.tmpl` — 그룹별 task-centric HTML 렌더러
  - `templates/src/status.py.tmpl` — progress introspection (작성 진척도 표시)
  - `templates/src/scheduler.py.tmpl` — schtasks/cron registration (prepare/assign/compile 3종)
  - `templates/src/audit.py.tmpl` — JSON Lines event logger
  - `templates/src/storage/smb.py.tmpl` — SMB backend
  - `templates/src/prompts/assign_system.txt.tmpl` — distribution AI prompt
  - `templates/src/prompts/compile_system_v2.txt.tmpl` — task-centric compile AI prompt
- `tests/` — pytest 단위/통합 테스트
- `fixtures/` — 테스트용 샘플 xlsx
