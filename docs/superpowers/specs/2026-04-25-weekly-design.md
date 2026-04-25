# Weekly Report Automation Harness (`/weekly`) — Design Spec

**Date:** 2026-04-25
**Author:** gibbs hwang
**Status:** Design approved (brainstorming complete), awaiting implementation plan
**Skill directory (target):** `~/.claude/skills/weekly/`
**Slash commands:** `/weekly` (Claude Code) · `activate_skill weekly` (Gemini CLI) · `skill weekly` (Codex CLI)
**Source PRD:** `.planning/WRAH-PLANNING-HANDOFF.md` ("주간업무보고 자동화 하네스 — WRAH v1.0 / 2026.04")

---

## TL;DR

부서의 주간업무보고 흐름(그룹장 지시 → 파트장 작성 → 취합 → 보고)을 *취합자 없이* 자동 운영하는 부서 표준 하네스 스킬. `/weekly init <부서>` 한 번 실행으로 부서별 standalone Python 프로젝트가 생기고, 그 프로젝트는:

1. 그룹장이 공유폴더의 `_지시사항.xlsx`에 평일 수시로 row를 추가하면 매시 정시 cron이 변경을 감지해 파트별로 분배(`<파트>.md`에 append)하고 SMTP로 파트장에게 알린다.
2. 매주 정해진 시점(config로 부서별 설정, spec에선 기본값 미확정)에 모든 `<파트>.md`를 AI 취합/요약/진척률 분석 → 단일 HTML 대시보드 생성 → 그룹장(to) + 파트장(cc)에게 메일 발송한다.
3. 모든 파일은 부서 공유폴더(또는 dogfood 모드의 로컬 폴더)에 남는다. 외부 클라우드/SaaS 사용 0.

스킬 자체는 CLI-agnostic(`/udd` 패턴 그대로). 생성된 wreport CLI는 `~/weekly/<부서>/` 안의 venv에서 cron이 호출한다.

---

## 1. Problem & Motivation

부서의 주간보고는 다음 다섯 가지 비효율을 가진다 (PRD §1):

1. **취합자 부담 집중** — 1명이 주 2-3시간 들여 워드 정리, 휴가 시 보고서 미게재
2. **버전관리 혼선** — `보고서_v3_최종(이번엔진짜).docx` 류
3. **지시 추적 불가** — 그룹장이 어떤 지시를 언제 내렸는지 검색 불가, 미이행 파트 식별 어려움
4. **포맷 비통일** — 파트별 양식이 달라 임원 보고용 재가공 필요
5. **가시성 부재** — 진척률/지연/리스크가 그룹장에게 즉시 보이지 않음

기존 솔루션의 한계 (PRD §1.3):
- Notion/ClickUp: 외부 SaaS, 사내 데이터 반출 정책 위배
- Google Workspace + Gemini: Workspace 미보유
- ChatGPT Enterprise 단독: 부서마다 재설정 필요
- 부서별 1회성 스크립트: 부서마다 재개발 필요

`/weekly`는 *코드 1벌 + config N벌* 모델로 위 다섯을 동시에 해결한다. 사내 인프라(공유폴더, SMTP) + 사전 승인 AI CLI(ChatGPT Enterprise / Gemini Enterprise)에만 의존한다.

---

## 2. Key Decisions

브레인스토밍 세션(2026-04-25)에서 확정된 12개 핵심 결정:

| # | 주제 | 결정 | 이유 |
|---|------|------|------|
| D1 | dogfood 시나리오 | **시뮬레이션 dogfood (B)** — 본인 PC 1대로 운영자+그룹장+파트장 1인 다역, 본인 Gmail SMTP | 사내 SMB ACL/Outlook COM/Enterprise 키 의존 없이 Phase 0 검증 가능. /udd처럼 라이브 검증된 시스템으로 만들 수 있음 |
| D2 | AI Adapter 범위 | **3-provider 그대로 (B)** — anthropic + Codex CLI + Gemini CLI | /udd 코드 재사용. 사내 배포 시 config 토글로 anthropic 비활성화 가능. AI 정책 변경 리스크에 강건 |
| D3 | 결과물 구조 | **1부서 = 1프로젝트 (A)** — `~/weekly/<부서>/` 각각 venv + cron | /udd 패턴 그대로. 다른 그룹장이 다른 PC에서 운영하는 시나리오에 유리 |
| D4 | 슬래시 커맨드 이름 | **`/weekly`** | 짧고 의미 명확. 사용자 명시 채택 (PRD `wrah` 약자 대신) |
| D5 | 분배 모델 | **엑셀 + 시간 cron 폴링 + 자동 메일** — `_지시사항.xlsx` mtime/hash 변경 감지, 매시 정시 분배 | 그룹장이 평일 수시로 지시 추가하는 현실 반영. watchdog 의존성 제거 (1시간 디바운스 자연스러움) |
| D6 | 엑셀 컬럼 정책 | **자유형식 + 컬럼 둘 다 허용 (C)** — 컬럼 [일자\|지시내용\|담당파트\|우선순위\|마감\|비고]. 담당파트 비어있으면 AI 추정 | 그룹장 학습 곡선 zero. AI는 fallback이지 필수가 아니므로 비용 ↓. **/weekly init이 표준 양식 .xlsx를 생성한다** |
| D7 | 변경 감지 + 처리 상태 | **엑셀 read-only + sidecar JSON (A)** — `_assignments_state.json`에 row hash 저장, 엑셀은 cron이 절대 쓰지 않음 | /udd의 sidecar 패턴 안정성 입증. 그룹장 편집 충돌 zero. 진척은 `_dashboard.html`이 담당 |
| D8 | 마스킹 정책 | **정책적 가드레일만 (C)** — regex 마스킹 안 함, 시스템 프롬프트로 "PII 추출/저장 금지" + Enterprise 학습 비활용 정책 의존 | 사용자 결정으로 PRD 5.보안의 마스킹 명시 override. 부서별 특수 패턴 추가 필요 시 Phase 2에서 재검토 |
| D9 | Phase 분할 | **PRD 분할 그대로 (A)** — Phase 0 (1주, manual compile만) + Phase 1 (2-3주, assign/auto compile) | /udd의 점진 검증 패턴. Phase 0 끝에 "수동 보고서 1번 생성" milestone으로 사용자 신뢰 build |
| D10 | 대시보드 디자인 | **/design-consultation으로 풀 디자인 (B)** — Phase 0 첫 wave에서 디자인 시스템 도출 | 다부서 환경에서 일관성 ↑. Jinja2 템플릿 + 인라인 CSS로 구현 (CDN 미사용 PRD §6 충족) |
| D11 | compile 메일 대상 | **그룹장 to + 파트장 cc (B)** | 파트장도 자기 파트가 어떻게 종합됐는지 봐야 다음주 작성 품질 ↑. cc는 SMTP 1번 발송으로 끝 |
| D12 | AI provider default | **Codex CLI default (C)** + anthropic/gemini fallback | ChatGPT Enterprise 정책 부합. /udd PR #13에서 동작 검증됨. dogfood 시 OpenAI 키 발급 (사용자 선택) |

### 부수 결정
- **cron 시간 미확정**: assign(매시) / compile(주 1회) 구체 시간은 spec에서 확정 안 함. config.yaml에서 부서별 설정. 기본값은 init 시 사용자에게 입력 받음.
- **storage 추상화**: `storage.type: local` (dogfood) / `smb` (production) 토글로 동일 코드가 두 환경 모두 지원.
- **키 저장**: SMTP password / API keys = OS keyring (`/udd` 패턴 그대로 재사용).

---

## 3. Principles

1. **공유폴더가 진실의 원천** — 모든 데이터(config, 엑셀, .md, 대시보드, 로그)는 부서 공유폴더에 있다. `~/weekly/<부서>/`는 코드+venv+state cache만.
2. **운영자 PC 1대만 cron 실행** — 부서원에게 /weekly를 배포하지 않는다. 부서원은 본인 PC에서 SMB 마운트해서 .md를 직접 편집한다.
3. **엑셀은 read-only (cron 관점)** — 그룹장이 자유롭게 편집할 수 있어야 하므로 cron은 절대 엑셀에 쓰지 않는다. 처리 상태는 sidecar JSON으로.
4. **AI는 분배의 fallback** — 담당파트 컬럼이 채워져 있으면 결정적 분배. AI는 채워지지 않은 row의 추정과 compile 단계의 취합/요약만 담당.
5. **dogfood = 시뮬레이션** — Phase 0+1은 본인 PC에서 1인 다역으로 라이브 검증. 사내 인프라 의존 없음. Pilot/전사 단계는 Phase 3 이후.
6. **감사 가능성 (Phase 2)** — `logs/audit.jsonl`에 모든 분배/compile/메일/AI 호출이 JSON lines로 기록 (PRD F-10).

---

## 4. Skill Metadata

```yaml
---
name: weekly
description: Weekly Report Automation Harness — end-to-end automation for departmental weekly status reports (group lead instructions → part lead .md updates → AI compile → HTML dashboard → email). Use when the user wants a self-healing, scheduled Python project that runs on a corporate shared folder with SMTP notification. Generates an independent project folder with Click CLI + OS keyring auth + 3-provider LLM adapter (Codex/Gemini/anthropic).
author: gibbs hwang
version: 0.1.0
---
```

### 4.1 Naming: 슬래시 커맨드 vs 생성된 바이너리

이 시스템에는 *두 단계*의 CLI가 있다 — 혼동 방지:

| 이름 | 어디에 | 언제 호출 | 호출자 |
|------|--------|-----------|--------|
| `/weekly` (slash command) | CLI host (Claude Code/Codex/Gemini) | 스킬 1회 invoke (init/scaffold) | 사람 |
| `wreport` (Python CLI binary) | `~/weekly/<부서>/venv/Scripts/wreport.exe` | scaffold 후 항시 (assign/compile/status/init 재실행) | 사람 + cron |

- `/weekly init <부서>` (CLI host에서 슬래시 명령) — 스킬이 9-stage 파이프라인을 돌려 부서 프로젝트를 scaffold. 끝에 cron 등록까지.
- 그 이후 모든 운영은 `wreport <명령>`으로 (cron이 자동, 사용자가 manual). Claude/Codex/Gemini host 없이 venv만으로 동작.
- PRD §4 "CLI: wreport init/assign/status/compile" 명시와 일치.

본 spec의 §6 워크플로우 헤더는 `/weekly <명령>`으로 표기하지만, *post-scaffold* 단계에서는 동일 동작을 `wreport <명령>`으로 부른다.

---

## 5. Architecture

### 5.1 Deployment Model

```
[운영자 PC 1대]
  ~/weekly/<부서>/         (스킬이 scaffold)
    venv/
    weekly/                (Python 패키지: cli, config, storage, llm, excel, ...)
    state/                 (로컬 cache, 마지막 cron 실행 정보)
    pyproject.toml
  ↓ cron (Windows Task Scheduler 또는 cron)
  ↓ schtasks /Create /TN "weekly-<부서>-assign" /SC HOURLY ...
  ↓ schtasks /Create /TN "weekly-<부서>-compile" /SC WEEKLY ...

[공유폴더 (\\사내공유\주간업무\<부서>\) 또는 dogfood (C:\weekly-test\<부서>\)]
  config.yaml                    (부서 메타: SMTP, 그룹장/파트장 메일, 파트 목록, schedule)
  _지시사항.xlsx                 (그룹장 작성, init 시 양식 자동 생성)
  YYYY-Www\
    <파트>.md                    (파트장 작성)
    _assignments_state.json     (sidecar 처리 상태)
    _dashboard.html             (compile 결과)
  logs\
    audit.jsonl

[부서원 PC들]
  /weekly 미설치
  본인 탐색기에서 \\사내공유\주간업무\<부서>\YYYY-Www\<파트>.md 열어서 편집
```

### 5.2 Storage Abstraction

`weekly/storage/` 패키지가 두 백엔드를 추상화:

| 백엔드 | 용도 | 식별자 (config.yaml `storage.type`) |
|--------|------|------------------------------------|
| LocalStorage | dogfood, 단일 PC 시뮬레이션 | `local` (root: `C:/weekly-test`) |
| SMBStorage | production, 사내 공유폴더 | `smb` (unc: `\\\\사내공유\\주간업무`) |

같은 코드(`storage.read_excel(...)`, `storage.write_md(...)`)가 두 환경에서 동작. dogfood → production 전환은 `config.yaml` 1줄 변경.

NFS는 v1.0 out of scope (필요 시 Phase 2에서 추가).

### 5.3 Components (Python package: `weekly`)

| 모듈 | 역할 |
|------|------|
| `weekly/cli.py` | Click 엔트리. 4개 명령: `init`, `assign`, `compile`, `status` |
| `weekly/config.py` | YAML + Pydantic. 부서 config 로드/검증 |
| `weekly/storage/base.py` | Storage 인터페이스 (read/write/list/exists) |
| `weekly/storage/local.py` | LocalStorage (Path 기반) |
| `weekly/storage/smb.py` | SMBStorage (`pysmb` 또는 OS-mounted UNC path 직접 접근) |
| `weekly/llm.py` | 3-provider 어댑터 (Codex CLI default, anthropic/gemini fallback). /udd `lib/llm_call.py` 재사용 |
| `weekly/excel.py` | `openpyxl` 기반: 표준 양식 생성, row 읽기, hash 계산 |
| `weekly/assigner.py` | 분배 로직. 담당파트 컬럼 결정적 분배 + AI fallback |
| `weekly/compiler.py` | 취합/요약/진척률 분석. AI 호출 + 결과 normalize |
| `weekly/dashboard.py` | Jinja2 템플릿 렌더링. Chart.js 인라인 |
| `weekly/mailer.py` | smtplib (Outlook COM은 Phase 2). 첨부 + cc 지원 |
| `weekly/scheduler.py` | Windows Task Scheduler / cron 등록 (`/udd` 패턴) |
| `weekly/keyring_helper.py` | OS keyring wrapping (`/udd` 패턴 재사용) |
| `weekly/audit.py` | `logs/audit.jsonl` JSON lines append (Phase 2부터 본격 사용) |
| `weekly/templates/` | `template_지시사항.xlsx` + `template_dashboard.html.j2` + `template_part.md.j2` |
| `weekly/prompts/` | 시스템 프롬프트 (분배용, 취합용). 부서별 오버라이드 디렉토리 (PRD F-09) |

### 5.4 Skill Bundle Layout (`~/.claude/skills/weekly/`)

`/udd` 패턴 그대로:

```
~/.claude/skills/weekly/
  SKILL.md                        (CLI-agnostic 스킬 본문, 9-stage 파이프라인 안내)
  pyproject.toml                  (skill bundle deps: anthropic, openai, google-generativeai, openpyxl, ...)
  templates/                      (scaffold 시 ~/weekly/<부서>/에 복사할 파일들)
    cli.py.tmpl
    config.py.tmpl
    storage/                      (local.py.tmpl, smb.py.tmpl, base.py.tmpl)
    llm.py.tmpl
    excel.py.tmpl
    assigner.py.tmpl
    compiler.py.tmpl
    dashboard.py.tmpl
    mailer.py.tmpl
    scheduler.py.tmpl
    templates/
      template_지시사항.xlsx
      template_dashboard.html.j2
      template_part.md.j2
    pyproject.toml.tmpl
  lib/                            (스킬 자체에서 쓰는 헬퍼)
    platform_detect.py            (Claude/Codex/Gemini 식별, /udd PR #4/#13/#14 그대로)
    autonomous_mode.py            (CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS / CODEX_THREAD_ID / GEMINI 환경변수 검증)
    template_render.py            (Jinja2 템플릿 렌더, /udd 그대로)
```

---

## 6. Workflows

### 6.1 `/weekly init <부서>` — 부서 1회 셋업

9-stage 파이프라인 (`/udd` 모델, stage 번호 0-8):

| Stage | 동작 |
|-------|------|
| 0. precheck | Python 3.10+, 디스크 공간, 부서 디렉토리 충돌 검사 |
| 1. scope | 사용자에게 부서명, 파트 목록, 그룹장 메일, 파트장 메일들, SMTP 정보, schedule(분배 주기, compile 시점), AI provider 선택을 입력 받기 |
| 2. scaffold | `~/weekly/<부서>/` 생성 + venv + 패키지 install + templates 복사 |
| 3. config | `config.yaml` 생성 (입력값 + 기본값) |
| 4. xlsx 양식 생성 | `_지시사항.xlsx`를 공유폴더에 복사. 컬럼 헤더 + 부서별 파트 dropdown + 우선순위 dropdown 자동 세팅 |
| 5. 키 저장 | SMTP password + AI API key를 OS keyring에 저장 (`/udd keyring_helper.py` 재사용) |
| 6. SMTP 테스트 | 그룹장 본인에게 테스트 메일 발송, 도착 확인 받기 |
| 7. cron 등록 | (Phase 1) `weekly-<부서>-assign` 매시 정시 + `weekly-<부서>-compile` 주 1회 (config 시점). Phase 0에선 manual만 |
| 8. handoff | `~/weekly/<부서>/README.md` 생성 (운영 지침, 명령어 cheatsheet, 트러블슈팅) |

**대시보드 디자인 단계는 init 파이프라인 외부**: Phase 0 첫 wave에서 `/design-consultation`을 별도 호출 → 결과물(`template_dashboard.html.j2`)을 스킬 번들에 commit. init은 이미 채워진 템플릿을 scaffold만 한다.

### 6.2 `/weekly assign` (Phase 1) — 매시 분배

```
1. config.yaml + storage 초기화
2. _지시사항.xlsx mtime + hash 비교 (이전 실행 대비)
   - 변경 없음 → exit 0 (메일 발송 0)
   - 엑셀 lock (그룹장 편집 중) → "lock detected, skip" 로그 + exit 0
3. 변경 있음:
   a. openpyxl로 모든 row 읽기
   b. row 단위 hash 계산
   c. _assignments_state.json 비교 → 새/수정 row 식별
   d. 각 row:
      - 담당파트 컬럼 채워짐 → 결정적 분배
      - 비어있음 → llm.assign(row_text, parts_list) 호출 (Codex CLI default)
   e. 파트별 묶어서 `<파트>.md` 끝에 [추가됨 timestamp] 마커로 append
   f. _assignments_state.json 갱신
4. 영향받은 파트장에게만 SMTP 메일 (1번에 통합 — "이번 시간 추가 지시 N건")
5. logs/audit.jsonl에 분배/메일 이벤트 기록
```

### 6.3 `/weekly compile <부서> [--week=YYYY-Www]` — 취합/대시보드/메일

```
1. config.yaml + storage 초기화
2. --week 미지정 시 현재 주차 자동 계산 (ISO week)
3. 해당 주차 폴더의 모든 <파트>.md 읽기
   - 미작성 파트 식별 (빈 파일 또는 파일 없음)
4. AI 취합 호출 (`llm.compile(parts_data)`):
   - 시스템 프롬프트: "PII 추출/저장 금지" + "사실 변조 금지"
   - 출력: 부서 종합 요약 + 파트별 핵심 + 진척률 + 미작성 표시 + 리스크
5. dashboard.render(compile_result) → _dashboard.html (Jinja2 + Chart.js 인라인)
6. mailer.send():
   - to: 그룹장
   - cc: 모든 파트장 (config.yaml의 메일 리스트)
   - 첨부: _dashboard.html
   - 본문: 짧은 요약 + "전체는 첨부 또는 공유폴더에서"
7. logs/audit.jsonl 기록
```

### 6.4 `/weekly status <부서>` (Phase 1 옵션) — 작성 진척

```
1. 현재 주차 폴더 확인
2. 각 파트별: 파일 존재 여부, mtime, 행 수, 마지막 [추가됨] 마커 시점
3. 미작성/마감 임박/지연 분류 출력
```

PRD F-03의 자동 리마인드는 v1.0 out of scope (Phase 2 이후).

---

## 7. Data Model

### 7.1 `config.yaml` (부서별)

```yaml
department:
  name: "기획팀"          # 부서 식별자 (한글 OK, 폴더명에 사용)
  parts:                  # 파트 목록 (분배 단위)
    - "전략기획"
    - "사업개발"
    - "운영"
group_lead:
  name: "홍길동"
  email: "leader@company.com"
part_leads:
  - part: "전략기획"
    name: "김파트"
    email: "p1@company.com"
  - part: "사업개발"
    name: "이파트"
    email: "p2@company.com"
storage:
  type: "local"           # "local" | "smb"
  root: "C:/weekly-test"  # local일 때 (또는 smb일 때 unc)
schedule:
  assign_cron: "0 * * * *"   # 매시 정시 (사용자 입력)
  compile_cron: "0 17 * * 5" # 매주 금 17:00 (사용자 입력)
  timezone: "Asia/Seoul"
smtp:
  host: "smtp.gmail.com"
  port: 587
  use_tls: true
  user: "operator@gmail.com"
  # password는 OS keyring 저장
ai:
  provider: "codex"       # "codex" | "anthropic" | "gemini"
  model_assign: "gpt-5"   # 분배용 (낮은 토큰)
  model_compile: "gpt-5"  # 취합용 (높은 토큰)
prompts:
  override_dir: null      # 부서별 prompts/ 디렉토리 경로 (PRD F-09, 옵션)
```

### 7.2 `_assignments_state.json` (sidecar, 주차별)

```json
{
  "xlsx_hash": "sha256:...",
  "xlsx_mtime": "2026-04-25T14:30:00+09:00",
  "rows": [
    {
      "row_index": 2,
      "row_hash": "sha256:...",
      "assigned_to": "전략기획",
      "assigned_at": "2026-04-25T14:00:00+09:00",
      "method": "column"   // "column" | "ai_inferred"
    }
  ]
}
```

### 7.3 `<파트>.md` (파트장 작성, append-only by cron)

```markdown
# 전략기획 — 2026-W17

## 그룹장 지시 (cron이 append, 파트장은 읽기 전용)

### [추가됨 2026-04-25 14:30] 시장 조사
- 출처: _지시사항.xlsx row 2
- 우선순위: 높음
- 마감: 2026-04-30
- 비고: 경쟁사 가격 조사 포함

### [추가됨 2026-04-26 09:00] ...

## 성과 (파트장 작성)

(여기에 파트장이 직접 작성)

## 이슈

(여기에 파트장이 직접 작성)

## 차주 계획

(여기에 파트장이 직접 작성)
```

### 7.4 `logs/audit.jsonl` (Phase 2부터)

각 줄은 1 이벤트:

```json
{"ts":"2026-04-25T14:00:00+09:00","event":"assign","rows":2,"parts_affected":["전략기획"],"ai_calls":1,"mail_sent":1}
{"ts":"2026-04-25T17:00:00+09:00","event":"compile","week":"2026-W17","parts_complete":3,"parts_missing":0,"ai_calls":1,"mail_sent":1}
```

---

## 8. Error Handling

| 상황 | 정책 |
|------|------|
| AI 호출 실패 (네트워크, 쿼타) | 지수 백오프로 3회 재시도. 모두 실패 시 다음 cron 주기에서 재시도. 그룹장에게 운영 알림 메일 (Phase 2) |
| 엑셀 file lock (그룹장 편집 중) | "lock detected, skipping this tick" 로그 + exit 0. 다음 시간 cron에서 재시도. 사용자 액션 0 |
| SMTP 발송 실패 | 메일을 `~/weekly/<부서>/state/mail_outbox/`에 보관. 다음 cron에서 outbox 비우기 시도 |
| storage(SMB) 접근 실패 | "storage unreachable, skipping this tick" 로그 + exit 0. 5분 백오프 후 다음 시간에 재시도 |
| AI provider 키 미설정 | scaffold 단계에서 차단 (`/weekly init` 시 키 입력 받음). cron 단계에서 발견되면 즉시 fail + 그룹장 알림 |
| compile 시 미작성 파트 발견 | 누락 표시한 채로 dashboard 생성 + 메일 발송. compile 자체는 성공 |
| `<파트>.md` 파일 없음 | 빈 텍스트로 처리, 미작성으로 표시 |

---

## 9. Security & PII

- **외부 클라우드 0**: 모든 데이터(엑셀, .md, 대시보드, 로그)는 부서 공유폴더에만 존재. AI 호출만 Enterprise CLI를 통해 외부로 나감.
- **AI 학습 비활용**: ChatGPT Enterprise / Gemini Enterprise / Anthropic API의 학습 비활용 정책에 의존 (계약상).
- **마스킹 정책**: regex 마스킹은 v1.0에 포함 안 함 (D8). 시스템 프롬프트로 "PII 추출/저장 금지" + "출력에 PII 보존 금지" 가드레일만.
  - 부서 운영자는 엑셀에 주민번호/카드번호/단가 같은 명시적 sensitive 정보를 *애초에 적지 말 것*이 운영 가이드라인.
  - Phase 2에서 부서별 마스킹 패턴 config 옵션 재검토.
- **키 저장**: SMTP password / AI API key = OS keyring (Windows Credential Manager 등). 평문 .env 금지.
- **공유폴더 ACL**: 부서원만 접근 가능 (시스템 관리자 책임). /weekly는 ACL 관리 안 함.
- **audit.jsonl** (Phase 2): 모든 분배/compile/메일/AI 호출 로그. 파일 권한 600.

---

## 10. Dogfood Plan (Phase 0+1)

### Phase 0 (1주) 범위

목표: **본인 PC 1대에서 manual compile 1번 성공**.

- [ ] /weekly init "기획팀" (가짜 부서명) 실행
- [ ] config.yaml 채우기:
  - storage.type=local, root=C:/weekly-test
  - 그룹장=본인, 파트장 3명도 모두 본인 다른 alias gmail
  - SMTP=본인 Gmail (앱 비밀번호 발급)
  - AI provider=codex (사용자가 OpenAI 키 발급) 또는 anthropic (이미 보유)
- [ ] init이 생성한 `_지시사항.xlsx`에 row 3-5개 직접 입력
- [ ] 가짜 `<파트>.md` 3개 작성 (성과/이슈/차주계획 1-2줄씩)
- [ ] `wreport compile 기획팀 --week=2026-W18` manual 실행
- [ ] 본인 Gmail 받은편지함에서 _dashboard.html 첨부 메일 확인
- [ ] dashboard 시각적 검증

성공 기준:
- compile 1번 성공
- AI 취합 결과가 파트별 입력을 정확히 반영
- 메일 도착 + 첨부 파일 열림
- _dashboard.html이 공유폴더(로컬)에 보관됨

### Phase 1 (2-3주) 범위

목표: **assign cron + compile cron 자동 실행 검증**.

- [ ] _지시사항.xlsx에 row 추가 → 1시간 내 자동 분배 메일 도착
- [ ] _assignments_state.json 사이드카 정확히 갱신
- [ ] 엑셀 열어둔 채로 cron tick → skip 로그 (충돌 없음)
- [ ] 매주 지정 시점에 compile 자동 실행 → 본인 Gmail 메일 도착
- [ ] Windows Task Scheduler에 두 작업이 등록되어 있고 정상 실행 이력 있음
- [ ] 1주 사이클 (월~금) 시뮬레이션 후 프로세스 끝까지 동작 확인

성공 기준:
- 사용자 개입 없이 cron만으로 분배+compile+메일이 모두 동작
- 1주 사이클 동안 에러 없음
- 재시작 후에도 cron 등록 유지

---

## 11. Out of Scope (v1.0)

이 spec에서 결정/구현하지 않음:

- **답장 → 자동 .md 업데이트** (IMAP 양방향) — v1.0은 단방향 SMTP만. v1.5에서 옵션으로 검토.
- **자동 리마인드 메일** (PRD F-03) — Phase 2로 이연. /weekly status 명령은 Phase 1에 옵션 포함.
- **Outlook COM 자동화** (smtplib 대안) — Phase 2.
- **부서별 prompts 오버라이드** (PRD F-09) — config.yaml에 hook은 있지만 실제 사용은 Phase 2.
- **NFS storage 백엔드** — SMB만 v1.0. NFS는 필요 시 Phase 2.
- **다부서 단일 운영자 (1대 PC가 N부서 처리)** — v1.0은 1프로젝트 = 1부서. 다부서 환경은 Pilot 단계에서 N개 프로젝트 병렬.
- **부서별 마스킹 regex** (PRD §5.보안) — D8 결정으로 v1.0 미포함. Phase 2 재검토.
- **월간/분기/연간 보고** (PRD §10) — 주간만 v1.0.
- **KPI/OKR 연동, 외부 협력사 보고서, 모바일 UI** — v1.0 out.
- **audit.jsonl의 본격 활용** — Phase 1에선 stub로 기록만, Phase 2에서 view/감사 명령 추가.

---

## 12. Open Questions (구현 단계에서 결정)

이 spec은 다음을 의도적으로 미확정 상태로 둠:

1. **cron 시간 기본값** — `assign_cron`, `compile_cron`의 기본값. /weekly init 시 사용자에게 입력 받되, 권장값(매시 정시 / 매주 금 17:00) 제시. spec에 박지 않음 (사용자 결정).
2. **대시보드 디자인 시스템** — Phase 0 첫 wave에서 /design-consultation 호출 후 결정. spec에선 "Jinja2 + Chart.js 인라인" 골격만 명시.
3. **AI 모델 (Codex CLI 기준)** — `gpt-5` 가정이지만 init 시 실제 사용 가능한 모델로 토글 가능.
4. **xlsx 동시 편집 충돌** — Phase 1 dogfood에서 발견되면 "엑셀 read 시 임시 복사본 생성 후 read" 같은 추가 방어 검토.
5. **SMB lib** — `pysmb` 사용 vs OS-mounted UNC path 직접 접근. Phase 1 첫 SMB 환경 검증 시 결정.

---

## 13. References

- PRD 전문: `.planning/WRAH-PLANNING-HANDOFF.md` ("주간업무보고 자동화 하네스 v1.0 / 2026.04")
- /udd 디자인 (재사용 패턴 출처): `docs/superpowers/specs/2026-04-24-ax-udd-design.md`
- /udd 구현 (코드 재사용 출처): `.worktrees/udd-impl/` 워크트리 + master HEAD `84b2eba`
- 핸드오프: `.planning/SESSION-HANDOFF.md` (2026-04-25T18:43)

---

## 14. Decision Log Summary

브레인스토밍 세션 (2026-04-25 09:45-10:33 KST, 텔레그램 chat 216072370):

| 시점 | 결정 |
|------|------|
| 09:45 | 자동 복구 시작, /udd post-mortem + WRAH 핸드오프 확인 |
| ~10:00 | D1=B (시뮬레이션), D2=B (3-provider), D3=A (1부서=1프로젝트) |
| ~10:00 | 슬래시 커맨드 = /weekly (사용자 명시) |
| ~10:10 | D5=새 모델 (엑셀+시간cron), D6=C (자유+컬럼), D7=A (sidecar JSON) |
| ~10:13 | D8=C (마스킹 정책만) — PRD override |
| ~10:20 | D9=A (Phase 분할 PRD대로), D10=B (/design-consultation), D11=B (그룹장+파트장 cc) |
| ~10:29 | D12=C (Codex CLI default) |
| ~10:33 | 디자인 3섹션 모두 OK, spec 작성 진행 |
