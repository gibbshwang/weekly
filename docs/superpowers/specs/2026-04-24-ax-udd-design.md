# AX Universal Data Downloader (`/udd`) — Design Spec

**Date:** 2026-04-24
**Author:** gibbs hwang
**Status:** Design approved, awaiting implementation plan
**Skill directory (target):** `~/.claude/skills/udd/`
**Slash commands:** `/udd` (Claude Code) · `activate_skill udd` (Gemini CLI) · `skill udd` (Codex CLI)

---

## TL;DR

End-to-end harness skill that generates a **self-healing, scheduled Python project** for automating recurring downloads from a corporate intranet system. A single invocation of `/udd` walks the user through nine stages — from environment check to cron installation — and leaves behind an independent project folder that keeps working after the site's UI changes, thanks to an LLM-agnostic AI healing loop plus a static selector fallback chain. The skill itself is CLI-agnostic: the same `SKILL.md` file runs under Claude Code, Gemini CLI, or Codex CLI.

---

## 1. Problem & Motivation

회사 사내시스템(ERP/CRM/통계포털/HR/회계 등)에서 반복적으로 엑셀/CSV 파일을 다운로드하는 작업은 대다수 회사원의 일상이다. 매번 손으로 로그인→메뉴이동→조건입력→다운로드 클릭을 반복하는 건 반복 노동이며, 이 과정을 자동화하려 해도 다음 벽을 만난다:

1. **인증이 다양하다** — ID/PW, OTP, SSO, 공인인증서, 캡차가 섞여 있어 완전 자동화가 거의 불가능
2. **사이트 UI가 바뀐다** — 한 달에 한 번씩 리뉴얼되거나 A/B 테스트로 셀렉터가 달라짐
3. **비밀번호 저장이 위험하다** — `.env` 평문은 사내 보안 감사 불통
4. **크로스플랫폼 스케줄링이 귀찮다** — Windows/Mac/Linux에서 스케줄러가 다름
5. **코드를 짜려면 프로그래머가 필요하다** — 실제 도메인 지식자(업무 담당자)는 코딩 못 함

이 스킬은 위 다섯 가지를 한 번에 해결하는 **프로젝트 제너레이터** 역할을 한다. 사용자는 스킬을 한 번만 실행하면, 매일 자동으로 돌아가면서 UI 변경에도 스스로 적응하는 독립 Python 프로젝트가 생긴다.

---

## 2. Key Decisions

8가지 핵심 결정은 설계 질의응답 과정에서 확정되었다:

| # | 주제 | 결정 | 이유 |
|---|------|------|------|
| D1 | 산출물 형태 | **프로젝트 제너레이터** (스킬 1회 = 독립 폴더 1개) | 시스템별 격리, 한 곳 버그가 다른 곳 영향 없음 |
| D2 | 언어/런타임 | **Python + Playwright** | 데이터 후처리(pandas/openpyxl) 강점, playwright codegen UX 최상 |
| D3 | 인증 전략 | **하이브리드** — 기본 세션 리플레이, 선택적 자동 ID/PW | 사내 2FA/SSO 대응 + 단순 사이트는 완전 자동 가능 |
| D4 | UI 변경 대응 | **정적 셀렉터 페일오버 + AI Healing 조합** (3-provider 추상화) | 99%는 무료로 해결, 1%만 AI 호출 |
| D5 | 최초 경로 캡처 | **Codegen 녹화 + AI 정리·파라미터화** | 녹화는 정확, AI가 유지보수 좋게 분리·변수화 |
| D6 | 완성 판정 | **데이터 유효성(C) + 사용자 최종 승인(D)** — 자율주행 최대 5회 재시도 | "완벽"을 기계적으로만 판정 금지, 사람 도장 필수 |
| D7 | 스케줄링 | **크로스플랫폼 OS 스케줄러** 자동 감지 (schtasks/launchd/cron) | 사내 시스템은 로컬 PC 실행 전제 (VPN 필요) |
| D8 | 자격 증명 | **OS Keyring** (Credential Manager/Keychain/Secret Service) | 크로스플랫폼 단일 API + 보안 감사 통과 |

### 추가 제약

- **3-CLI 호환**: Claude Code, Gemini CLI, Codex CLI에서 동일 스킬 파일 동작. CC 전용 슬래시커맨드(`/tdd`, `/brainstorm`) 호출 금지, CC 전용 툴(`AskUserQuestion`) 사용 금지.
- **자율주행 모드**: 스킬은 Stage 6 검증 루프에서 파일/subprocess를 수회 만진다. 각 CLI의 "권한 프롬프트 우회" 모드를 공통화해야 함 (D9).
- **LLM-agnostic healing**: `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` 중 설정된 것을 자동 선택. SDK는 동적 import.

| D9 | CLI 권한 모드 | 각 CLI의 권한 우회 플래그를 스킬이 감지·안내 | Claude: `--dangerously-skip-permissions`, Gemini: `--yolo`, Codex: `--full-auto` |

---

## 3. Principles

1. **격리 우선** — 시스템 하나 = 폴더 하나. 설정/세션/로그/다운로드가 다른 프로젝트와 섞이지 않는다.
2. **AI는 최후의 수단** — 99% 케이스는 정적 셀렉터로 해결. AI healing은 정적 레이어가 실패했을 때만 발동.
3. **사용자 개입은 최소·최적 지점에서만** — 최초 로그인, 최초 녹화, 최종 승인. 나머지는 자율주행.
4. **이식성은 기능 동등 수준까지** — 3 CLI 환경에서 같은 스킬 파일이 동작. 생성된 프로젝트는 AI 없이도 운영 가능 (healing만 비활성화).
5. **감사 가능성(Auditability)** — 모든 healing 이벤트, AI가 제안한 수정, 스케줄 변경이 JSON lines 로그에 남는다.
6. **보안 우선 기본값** — 평문 `.env` 대신 OS 키체인. storage.json은 파일 권한 600. 백업 export는 크레덴셜 제외.

---

## 4. Skill Metadata

```yaml
---
name: udd
description: AX Universal Data Downloader — end-to-end automation for recurring downloads from corporate systems (login, navigation, filters, export). Use when the user wants a self-healing, scheduled Python project that downloads files from an intranet/ERP/admin site on a cron. Generates an independent project folder with Playwright + OS keyring auth + LLM-agnostic AI healing.
author: gibbs hwang
version: 0.1.0
---
```

**디렉토리 레이아웃 (스킬 번들):**
```
~/.claude/skills/udd/
├── SKILL.md                       # 스킬 본문 (Markdown, 단일 파일)
├── templates/                     # 생성 프로젝트의 파일 템플릿
│   ├── src/
│   │   ├── run.py.tmpl
│   │   ├── auth.py.tmpl
│   │   ├── navigate.py.tmpl
│   │   ├── download.py.tmpl
│   │   ├── validators.py.tmpl
│   │   ├── healer.py.tmpl
│   │   ├── llm_client.py.tmpl
│   │   ├── notify.py.tmpl
│   │   └── cli.py.tmpl
│   ├── tests/
│   │   ├── test_validators.py.tmpl
│   │   ├── test_selectors.py.tmpl
│   │   └── test_healer_mock.py.tmpl
│   ├── pyproject.toml.tmpl
│   ├── requirements.txt.tmpl
│   ├── .gitignore.tmpl
│   └── README.md.tmpl
├── scripts/                       # 스킬이 Bash로 호출하는 헬퍼
│   ├── precheck.sh                # Stage 0
│   ├── scaffold.sh                # Stage 2 (mkdir + venv + pip install)
│   ├── validate_loop.py           # Stage 6 자율주행 루프 (AI 호출 내장)
│   └── schedule_install.py        # Stage 8 크로스플랫폼 스케줄러
├── bin/
│   └── udd-global                 # 다중 프로젝트 관리 CLI
└── tests/                         # 스킬 자체 테스트
    ├── test_precheck.sh
    ├── test_config_render.py
    ├── test_cron_convert.py
    └── test_llm_fallback.py
```

---

## 5. Pipeline: 9 Stages

스킬 한 번의 실행은 **9단계의 순차 파이프라인**이다.

```
Stage 0: PRECHECK         환경 진단 (Python, Playwright, AI keys)
    ↓
Stage 1: SCOPE             프로젝트 정보 수집 (자연어 5개 질문)
    ↓
Stage 2: SCAFFOLD          폴더 + venv + 의존성 설치 + 템플릿 파일 쓰기
    ↓
Stage 3: AUTH              브라우저 띄워서 로그인 → storage.json 저장
    ↓
Stage 4: RECORD            playwright codegen으로 다운로드 경로 녹화
    ↓
Stage 5: REFACTOR          AI가 raw recording → selectors.yaml + navigate.py 분리·변수화
    ↓
Stage 6: VALIDATE          자율주행 검증 루프 (최대 5회, AI 수정 포함)
    ↓
Stage 7: APPROVE           사용자에게 샘플 제시 → YES/NO 도장
    ↓
Stage 8: SCHEDULE          OS 스케줄러 등록 (schtasks/launchctl/crontab)
    ↓
Stage 9: HANDOFF           README 최종화 + 완료 메시지 + 다음 실행 예정
```

### 5.1 Stage별 상세 프로토콜

#### Stage 0 — PRECHECK

**목적:** 필수 의존성과 AI 키 상태를 사전 확인하고, 부족한 것이 있으면 해결 방법을 제시.

**동작:**
```bash
python --version                                         # ≥ 3.10 요구
pip --version
python -c "import playwright" 2>&1                       # 없으면 설치 제안
ls "$HOME/.cache/ms-playwright" 2>&1                     # 브라우저 설치 여부
env | grep -E "ANTHROPIC_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY"
```

**CLI 자율주행 모드 감지:**
- 환경변수 체크 (`CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS`, `GEMINI_YOLO`, `CODEX_APPROVAL_MODE=never`)
- 모드 아닌 경우 — 사용자에게 CLI별 진입 방법 안내 (표 참조)

**탈락 시 동작:**
- Python 없음 → 사용자에게 설치 안내, 스킬 중단
- Playwright 없음 → `pip install playwright && python -m playwright install chromium` 실행 제안
- AI 키 없음 → "healing 비활성화로 진행?" 물어봄 (Yes면 continue, No면 키 설정 후 재시작)

#### Stage 1 — SCOPE

**자연어 질문 순차 (한 번에 하나):**

| Q | 질문 | 예시 답 | 저장 위치 |
|---|------|---------|----------|
| 1 | 시스템 이름 (영문 슬러그, 소문자, 하이픈) | `erp-sales` | 폴더명, keyring 서비스명 |
| 2 | 로그인 URL | `https://erp.company.com/login` | `config.project.url` |
| 3 | 한 줄 설명 | `ERP 월매출 엑셀 다운로드` | `config.project.description`, README |
| 4 | 실행 주기 (cron 또는 자연어) | `매일 09:00` → `0 9 * * *` | `config.schedule.cron` |
| 5 | 예상 컬럼 (모르면 스킵) | `날짜, 매출, 건수` | `config.validation.expected_columns` |

`config.yaml` 초안 작성 → 사용자에게 보여주고 "수정할 거 있어요?" 확인.

#### Stage 2 — SCAFFOLD

**실행 (체이닝으로 프롬프트 최소화):**
```bash
PROJECT_DIR="$HOME/ax-downloads/$PROJECT_NAME"
mkdir -p "$PROJECT_DIR"/{src,tests,recordings,auth,downloads,logs} && \
  cd "$PROJECT_DIR" && \
  python -m venv .venv && \
  .venv/bin/pip install -U pip && \
  .venv/bin/pip install -r requirements.txt && \
  .venv/bin/python -m playwright install chromium && \
  git init && git add -A && git commit -m "scaffold ax-udd project"
```

**템플릿 렌더링:**
- `templates/` 아래 `.tmpl` 파일을 읽어 `{{변수}}` 치환
- 치환 변수: `{{project_name}}`, `{{url}}`, `{{description}}`, `{{cron}}`, `{{today}}`, `{{keyring_service}}`, `{{expected_columns}}`
- 모든 파일을 **단일 메시지로 병렬 Write** → 자율주행 프롬프트 최소화

#### Stage 3 — AUTH

**1차 — 세션 리플레이 모드 (기본):**
```bash
.venv/bin/python -m playwright codegen \
  --target python \
  --save-storage="auth/storage.json" \
  "$URL"
```
- 사용자 안내: "브라우저가 뜨면 평소처럼 로그인하세요. 메인 화면까지 들어가서 **브라우저를 닫지 말고** 터미널로 돌아와 Enter 누르세요."
- Enter 수신 후 `auth/storage.json` 존재+크기 검증
- **세션 검증**: 새 헤드리스 브라우저 → storage 로드 → URL 재방문 → 로그인 상태 유지 확인

**2차 — 완전 자동 ID/PW 모드 (옵션):**
사용자가 선택한 경우:
```python
import keyring, getpass
keyring.set_password(f"udd-{project}", "user_id", input("ID: "))
keyring.set_password(f"udd-{project}", "user_pw", getpass.getpass("PW: "))
```
- `config.auth.mode = "credentials"` 로 저장
- `auth.py`의 로그인 로직이 keyring 조회 → 페이지 폼에 입력 → 제출

#### Stage 4 — RECORD

```bash
.venv/bin/python -m playwright codegen \
  --target python \
  --load-storage="auth/storage.json" \
  --output="recordings/raw_recording.py" \
  "$URL"
```
- 사용자 안내: "메뉴 따라가서 원하는 데이터 다운로드까지 진행하세요. 완료되면 브라우저 닫아주세요."
- 종료 후 `recordings/raw_recording.py` 검증:
  - 파일 생성 여부
  - `page.goto` 존재
  - `expect_download` 또는 다운로드 트리거 패턴 존재
- 검증 실패 시 재녹화 안내

#### Stage 5 — REFACTOR

**AI 프롬프트 (llm_client 추상화 사용):**

```
System: You are refactoring Playwright codegen output into a maintainable structure.

User: Split the following raw recording into three outputs:

1. selectors.yaml — each interaction point as a named entry:
   - name (snake_case, descriptive)
   - description (한국어, 사람 읽기 가능)
   - primary (원본에서 가져온 가장 robust한 셀렉터)
   - fallbacks (2~4개, text=, xpath=, aria-label 등 다양한 방식)

2. src/navigate.py — use find(page, "name") calls instead of page.click(...) directly.
   Wrap each logical step with log statements.

3. config.yaml patches — identify hardcoded dates/values and propose
   template variables ({today-30d}, {today}, {this_month_start} 등)

Recording:
<recordings/raw_recording.py 내용>

Config context (expected columns, URL, schedule):
<config.yaml 내용>

Respond as JSON only with fields:
  selectors_yaml, navigate_py, config_patches.
```

**검증:**
- JSON 파싱 실패 → 피드백과 함께 1회 재요청
- 생성된 `navigate.py` 에 `python -m py_compile` 실행 → 문법 실패 시 재요청
- 모든 `find(page, "...")` 이름이 `selectors.yaml`에 존재하는지 크로스체크

#### Stage 6 — VALIDATE (자율주행 루프)

**실행 단위:** 스킬이 Bash로 `~/.claude/skills/udd/scripts/validate_loop.py`를 1회 호출. 이 스크립트가 내부에서 최대 5회 루프를 돌리고 결과를 JSON으로 stdout에 출력.

**루프 로직 (validate_loop.py 의사 코드):**

```python
for attempt in range(1, 6):
    result = run_script(PROJECT_DIR, strict=False, timeout=180)

    if result.success:
        if strict_mode:
            runs = [run_script(PROJECT_DIR) for _ in range(3)]
            if all(r.success for r in runs):
                return {"status": "success", "attempt": attempt}
            # else: fall through to healing
        else:
            return {"status": "success", "attempt": attempt}

    # 진단
    diagnosis = llm.diagnose({
        "error_trace": result.error,
        "last_url": result.last_url,
        "screenshot": result.screenshot,
        "dom_snapshot": result.dom,
        "validation_report": result.validation,
    })

    if diagnosis.type == "selector":
        add_to_ai_discovered(diagnosis.element, diagnosis.new_selector)
    elif diagnosis.type == "timing":
        patch_navigate_py(diagnosis.step, wait_ms=diagnosis.wait_ms)
    elif diagnosis.type == "validation":
        patch_config_yaml(diagnosis.field, diagnosis.new_value)
    elif diagnosis.type == "logic":
        # 위험: run.py 수정
        if auto_approve_logic_patches:
            apply_patch(diagnosis.patch)
        else:
            request_user_approval(diagnosis.patch)

# 5회 실패
return {
    "status": "escalate",
    "error_log": all_attempts_summary,
    "last_screenshot": path,
    "suggested_steps": diagnosis.manual_fix
}
```

**LLM 호출 제약:**
- AI healing은 run.py 수정 타입일 때 `--approve-logic-patches` 플래그 없으면 사용자 승인 요청
- 동일 프롬프트 연속 호출 방지 (변경 없이 재시도하면 exit)

#### Stage 7 — APPROVE

```python
import pandas as pd
df = pd.read_excel(latest_download)
sample = df.head(10).to_string()
print(f"✅ 다운로드 파일: {latest_download}")
print(f"📊 Shape: {df.shape}")
print(f"📋 Columns: {list(df.columns)}")
print(sample)
```

**텔레그램 알림:**
- 텍스트 메시지: 파일 경로 + Shape + 컬럼 + head(10)
- 파일 첨부: 실제 xlsx/csv

**사용자 응답 대기:**
- `YES` → Stage 8
- `NO, <이유>` → Stage 6 재진입, 이유를 diagnosis 프롬프트에 포함

#### Stage 8 — SCHEDULE

`~/.claude/skills/udd/scripts/schedule_install.py`가 OS 감지 후 해당 스케줄러 호출:

**Windows:**
```python
subprocess.run([
    "schtasks", "/Create", "/TN", f"UDD-{project.upper()}",
    "/TR", f'"{python_exe}" "{project_dir}/src/run.py"',
    "/SC", convert_cron_to_schtasks_schedule(cron),  # DAILY/WEEKLY/MINUTE etc
    "/ST", extract_start_time(cron),
    "/F"
], check=True)
```

**macOS:**
```python
plist_path = f"~/Library/LaunchAgents/com.udd.{project}.plist"
write_plist(plist_path, {
    "Label": f"com.udd.{project}",
    "ProgramArguments": [python_exe, f"{project_dir}/src/run.py"],
    "StartCalendarInterval": parse_cron_to_plist(cron),
})
subprocess.run(["launchctl", "load", plist_path], check=True)
```

**Linux:**
```python
current = subprocess.check_output(["crontab", "-l"]).decode()
# UDD 라인 제거 (재등록 대비)
lines = [l for l in current.split("\n") if f"UDD-{project}" not in l]
lines.append(f"{cron} {python_exe} {project_dir}/src/run.py  # UDD-{project}")
subprocess.run(["crontab", "-"], input="\n".join(lines).encode(), check=True)
```

**검증:**
- 등록 직후 re-query (schtasks /Query, launchctl list, crontab -l)
- 실패 시 rollback

#### Stage 9 — HANDOFF

최종 출력:

```
✅ AX Universal Data Downloader 생성 완료

📁 프로젝트: ~/ax-downloads/erp-sales
⏰ 다음 실행: 2026-04-25 09:00 (매일)
📊 예상 파일: ~/ax-downloads/erp-sales/downloads/YYYY-MM-DD/*.xlsx
🔔 알림: 텔레그램 (실패 + 자가회복 시)
🩹 Self-healing: 활성 (provider: anthropic)

운영 명령:
  udd status               # 최근 실행 결과
  udd doctor               # 환경 진단
  udd login                # 세션 재로그인 (만료 시)
  udd retrain              # UI 변경 시 재학습
  udd run                  # 즉시 1회 실행
  udd unschedule           # 스케줄 제거

처음 실행 시 텔레그램으로 결과 보고가 옵니다.
```

---

## 6. Generated Project Structure

```
~/ax-downloads/<project-name>/
│
├── config.yaml                  # 프로젝트 설정 (두뇌)
├── selectors.yaml               # 셀렉터 계층 + AI-discovered 누적
├── pyproject.toml               # [project.scripts] udd = src.cli:main
├── requirements.txt             # 의존성
├── .gitignore                   # auth/, downloads/, logs/, .venv/
├── README.md                    # 사용법 + 운영 매뉴얼
│
├── src/
│   ├── run.py                   # 메인 엔트리 (스케줄러 호출 대상)
│   ├── auth.py                  # 세션 관리, keyring 접근
│   ├── navigate.py              # selectors.yaml 기반 탐색
│   ├── download.py              # 파일 다운로드 트리거
│   ├── validators.py            # pandas 파싱 + 검증
│   ├── healer.py                # AI Self-healing
│   ├── llm_client.py            # 3-provider 추상화
│   ├── notify.py                # 텔레그램 알림
│   └── cli.py                   # udd CLI 엔트리
│
├── recordings/
│   └── raw_recording.py         # codegen 원본 (재학습 참고)
│
├── auth/                        # gitignore
│   └── storage.json             # Playwright storageState
│
├── downloads/YYYY-MM-DD/         # gitignore
├── logs/YYYY-MM-DD.log           # gitignore, JSON lines
│
└── tests/
    ├── test_validators.py
    ├── test_selectors.py
    └── test_healer_mock.py
```

### 6.1 `config.yaml` 스키마

```yaml
project:
  name: erp-sales
  url: https://erp.company.com/login
  description: ERP 월매출 엑셀 다운로드

auth:
  mode: session_replay           # or: credentials
  storage_state: auth/storage.json
  session_ttl_check: daily       # 세션 유효성 테스트 주기
  # credentials 모드일 때:
  # keyring_service: udd-erp-sales
  # keyring_user_key: user_id
  # keyring_pw_key: user_pw

filters:
  # 템플릿 변수 ({today}, {today-Nd}, {this_month_start}, {yesterday})
  start_date: "{today-30d}"
  end_date: "{today}"

download:
  save_dir: downloads/{YYYY-MM-DD}/
  expected_format: xlsx          # or: csv, pdf (검증 로직 분기)
  timeout_ms: 60000

validation:
  min_rows: 1
  expected_columns: ["날짜", "매출", "건수"]
  size_bounds_kb: [10, 51200]
  columns_strict: false          # false: 부분집합 OK, true: 정확히 일치 요구

healing:
  enabled: true
  max_ai_retries: 3              # 한 번의 run.py 실행에서 허용되는 AI healing 호출 상한
  dev_max_attempts: 5            # Stage 6 자율주행 루프의 최대 attempt 수 (개발 전용)
  ai_provider: auto              # auto | claude | gemini | openai
  promote_after: 10              # AI-discovered 셀렉터를 primary로 승격하는 연속 성공 횟수
  cool_down_hours: 24            # 같은 요소 연속 healing 방지
  allow_logic_patches: false     # true 시에도 Stage 6에서 사용자 승인 필요. runtime은 무조건 무시

schedule:
  cron: "0 9 * * *"              # 표준 cron, OS별 변환됨
  enabled: true
  os_task_name: "UDD-ERP-SALES"  # schtasks/launchd의 식별자

notify:
  telegram:
    enabled: true
    chat_id: "216072370"
    bot_token_keyring: "udd-telegram/bot_token"
  on_success: false
  on_failure: true
  on_healing: true
  on_validation_warning: true    # 다운로드 OK이나 컬럼/행 이상치

logging:
  level: INFO
  retention_days: 90             # logs/ 90일 보관
```

### 6.2 `selectors.yaml` 스키마

```yaml
menu_statistics:
  description: "좌측 메뉴의 '통계' 항목"
  primary: "#nav-stats"
  fallbacks:
    - "text=통계"
    - "xpath=//a[contains(text(),'통계')]"
    - "[data-menu=stats]"
  ai_discovered: []

download_excel_button:
  description: "엑셀 다운로드 트리거 버튼"
  primary: "button[data-test='export-excel']"
  fallbacks:
    - "text=엑셀 다운로드"
    - "[aria-label='Export to Excel']"
  ai_discovered:
    - selector: "#newExportBtn"
      discovered_at: "2026-05-03T09:02:11+09:00"
      success_count: 12
      reasoning: "primary #export-excel 사라짐, data-action=download 속성으로 찾음"
```

---

## 7. Module Responsibilities (Generated Project)

| 모듈 | 책임 | 주요 함수 | 의존 |
|------|------|----------|------|
| `run.py` | 파이프라인 오케스트레이션 | `main() → auth → navigate → download → validate → notify` | 전부 |
| `auth.py` | 세션 로드·검증, keyring 접근 | `load_session(page)`, `credentials_login(page)`, `is_session_valid()` | playwright, keyring |
| `navigate.py` | selectors.yaml 기반 이동 | `find(page, name) → Locator`, `execute_steps(page, steps)` | playwright, yaml |
| `download.py` | 파일 다운로드 트리거 | `trigger_download(page, button_name) → Path` | playwright |
| `validators.py` | 파일/데이터 검증 | `validate(path, config) → ValidationReport` | pandas, openpyxl |
| `healer.py` | AI 기반 셀렉터 추론 | `heal(page, element_name) → Locator \| None` | llm_client |
| `llm_client.py` | 3-provider 추상화 | `ask(prompt, image=None) → dict` | anthropic \| google-generativeai \| openai (dynamic) |
| `notify.py` | 텔레그램 봇 API | `send(chat_id, text, files=[])` | requests, keyring |
| `cli.py` | `udd` 서브커맨드 라우팅 | `main()`, `login()`, `run()`, `retrain()`, `schedule()`, `status()`, `doctor()`, ... | argparse |

### 7.1 핵심 함수 시그니처 (선별)

```python
# navigate.py
def find(page: Page, name: str) -> Locator:
    """
    1. selectors.yaml[name].ai_discovered 순차 시도 (success_count 내림차순)
    2. primary 시도
    3. fallbacks 순차 시도
    4. 전부 실패 → healer.heal(page, name) 호출
    5. 반환: 찾은 Locator. 모두 실패 시 ElementNotFoundError.
    """

# healer.py
def heal(page: Page, element_name: str) -> Locator | None:
    """
    1. selectors.yaml[element_name].description을 가져옴
    2. 현재 페이지 DOM을 3000자로 압축 + 스크린샷
    3. llm_client.ask() 호출
    4. 반환된 셀렉터를 page.locator()로 검증 (.count() == 1)
    5. 유효하면 ai_discovered에 추가 + 텔레그램 알림
    6. 반환: Locator (성공) 또는 None (실패)
    """

# validators.py
@dataclass
class ValidationReport:
    passed: bool
    issues: list[str]          # "row_count < 1", "missing_columns: ['매출']"
    warnings: list[str]        # 경고 수준
    stats: dict                # {rows: 30, columns: 3, size_kb: 12.4}

def validate(path: Path, config: dict) -> ValidationReport: ...

# llm_client.py
class LLMProvider(ABC):
    @abstractmethod
    def ask(self, prompt: str, image: bytes | None = None) -> dict: ...

def get_provider(config: dict) -> LLMProvider:
    """auto 모드: env 감지 폴백 체인. 명시 모드: 강제 지정."""
```

---

## 8. Self-Healing & Autonomous Validation

### 8.1 Defense in Depth 레이어

```
사용자 요청: "download_excel_button 클릭"
                  │
                  ▼
      ┌────────────────────────────┐
      │ Layer 0: AI-discovered    │
      │ (성공 카운트 내림차순)      │
      └────────┬───────────────────┘
               │ 전부 실패 ↓
      ┌────────────────────────────┐
      │ Layer 1: Primary selector  │
      └────────┬───────────────────┘
               │ 실패 ↓
      ┌────────────────────────────┐
      │ Layer 2: Fallbacks 순차     │
      │ (text=, xpath=, aria, ...)  │
      └────────┬───────────────────┘
               │ 전부 실패 ↓
      ┌────────────────────────────┐
      │ Layer 3: AI Healing        │
      │ (DOM + screenshot → LLM)   │
      └────────┬───────────────────┘
               │
               ├─ 성공 → ai_discovered 추가, 텔레그램 알림
               └─ 실패 → ElementNotFoundError → 텔레그램 에스컬레이션
```

### 8.2 AI-Discovered 승격 규칙

- `ai_discovered` 셀렉터가 **연속 10회(config.healing.promote_after) 성공**하면 `primary`로 자동 승격
- 승격 시 기존 `primary`는 `fallbacks` 맨 뒤로 이동
- 승격 이벤트는 로그+커밋 (`git commit -m "promote ai-discovered selector: <name>"`)

### 8.3 Healing Cool-down

- 같은 요소에 대한 healing은 24시간 내 재발동 금지 (무한 루프 + 비용 폭주 방지)
- 쿨다운 중 실패 시 정적 레이어까지만 시도 → 실패하면 바로 에스컬레이션

### 8.4 자율주행 검증 루프 (Stage 6 상세)

```
입력: 방금 생성된 selectors.yaml + navigate.py + config.yaml
루프 파라미터: max_attempts=5, strict_mode=false (기본)

루프:
  attempt 1:
    run.py 실행 → 성공?
      ├─ Yes → Stage 7로
      └─ No → diagnosis: type=? (selector | timing | validation | logic)
              → patch 적용
              → attempt 2

  attempt 2~5: 동일

  attempt > 5:
    escalate {
      summary: 5회 시도 결과 요약,
      screenshots: 각 시도의 마지막 스크린샷,
      proposed_fix: AI의 최종 제안 (수동 적용 가이드),
      telegram: 사용자에게 알림
    }
```

### 8.5 diagnosis 프롬프트 템플릿

```
System: You are a Playwright automation expert diagnosing a failed run.

User: The script failed. Classify the root cause and suggest a specific patch.

Context:
  Project: {project_name}
  URL: {url}
  Attempt: {attempt}/5

Error:
  Type: {error_type}  (TimeoutError | LocatorError | AssertionError | Other)
  Message: {error_message}
  Traceback: {truncated_traceback}

State at failure:
  Last URL visited: {last_url}
  Last selector attempted: {last_selector_attempt}
  Screenshot attached.
  DOM snippet (compressed):
    {dom_compact}

Validation report (if applicable):
  {validation_report_json}

Previous attempts this session:
  {previous_diagnoses_summary}

Respond as JSON:
{
  "type": "selector" | "timing" | "validation" | "logic",
  "element": "<selectors.yaml name, if type=selector>",
  "new_selector": "<Playwright selector, if type=selector>",
  "confidence": 0.0-1.0,
  "patch_description": "<human-readable summary of fix>",
  "patch_target_file": "<file to modify>",
  "patch_diff": "<unified diff, if type=timing or logic>",
  "reasoning": "<1-3 sentences>"
}
```

---

## 9. CLI Portability & Autonomous Mode

### 9.1 3-CLI 자율주행 모드 매핑

| CLI | 기동 플래그 | 세션 내 토글 | 감지 환경변수 |
|-----|-----------|-------------|-------------|
| Claude Code | `claude --dangerously-skip-permissions` | `/permissions` | `CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=1` |
| Gemini CLI | `gemini --yolo` | `/yolo` | `GEMINI_YOLO=1` |
| Codex CLI | `codex --full-auto` 또는 `codex --ask-for-approval never --sandbox workspace-write` | (세션 내 모드 전환) | `CODEX_APPROVAL_MODE=never` |

### 9.2 이식성 규칙 (스킬 작성 시 금지사항)

스킬 본문(`SKILL.md`)에서 **쓰지 말 것**:
- `/tdd`, `/brainstorm`, `/investigate` 등 CC/Superpowers 전용 슬래시커맨드 호출
- `AskUserQuestion` 같은 CC 전용 툴
- `Skill` 툴 중첩 호출 (Gemini는 `activate_skill`, Codex는 다른 스키마)
- 플러그인·MCP 의존 (3 CLI 모두 공통으로 있는 것만 사용)

**허용된 툴/동작:**
- Bash / Shell 실행 (3 CLI 공통)
- Read / Write / Edit (공통)
- 자연어 질문 (일반 텍스트 출력 후 사용자 응답 대기)

### 9.3 프롬프트 횟수 최소화 전략

자율주행 모드가 아닐 때도 사용자 피로도 감소:

1. **파일 병렬 생성** — Stage 2에서 7~8개 파일을 단일 메시지의 병렬 Write 호출
2. **Bash 체이닝** — `mkdir && cd && venv && pip && playwright install && git init && commit`를 한 줄로
3. **Helper script 캡슐화** — Stage 6 자율주행 루프는 `validate_loop.py` 1회 Bash 호출로 처리 (스크립트 내부에서 5회 루프 + AI 호출)

---

## 10. Runtime Behavior (Scheduled Execution)

스케줄러가 `run.py`를 호출할 때의 동작 — 스킬 실행과 달리 빠르고 조용하게.

```
OS scheduler (schtasks/launchd/cron)
    │
    ▼
python src/run.py
    │
    ├── auth.load_session(page)
    │       ├── storage.json 로드
    │       ├── URL 재방문하여 로그인 상태 확인
    │       └── 만료 시: telegram_alert("세션 만료"), exit 2
    │
    ├── navigate.execute_steps(page, config.navigation.steps)
    │       ├── 각 스텝: find(page, name) → click/fill
    │       ├── 정적 레이어 성공 → continue
    │       └── 정적 레이어 실패 → healer.heal() 1회만
    │               ├── 성공 → ai_discovered 추가, continue
    │               └── 실패 → telegram_alert, exit 3
    │
    ├── download.trigger_download(page, button_name)
    │       ├── expect_download() 대기
    │       └── 파일 저장 → downloads/YYYY-MM-DD/
    │
    ├── validators.validate(file_path, config)
    │       ├── pass → continue
    │       └── warn → telegram_alert (파일은 보관)
    │
    └── notify.send(summary)
            ├── 성공 & on_success=true → "{project} OK"
            ├── healing 발동 & on_healing=true → "{project} 🩹 self-healed"
            └── 실패 → "{project} ❌ {reason}"
```

**런타임 healing 제약 (개발 단계와 다름):**
- 세션당 AI healing 발동은 **요소당 1회, 전체 세션 최대 3회**
- `config.healing.max_ai_retries` (runtime, 기본 3) = 하나의 run.py 실행에서 총 healing 상한
- 같은 요소에 대한 healing은 24시간 쿨다운 (Section 8.3) — 반복 실패 시 즉시 에스컬레이션
- **logic 타입 diagnosis는 런타임에 완전 비활성** — 셀렉터/timing/validation 패치만 허용
- logic 패치는 개발(Stage 6)에서도 항상 사용자 승인 필수 (override 불가)

---

## 11. Operational CLI (`udd` 명령)

생성 프로젝트 안에 완전한 운영 CLI를 내장. AI CLI 환경 없이도 운영 가능.

### 11.1 명령 전체 목록

| 명령 | 용도 | AI 필요? | 위험도 |
|------|------|---------|--------|
| `udd login` | 세션 재생성 | ❌ | 낮음 |
| `udd run` | 즉시 1회 실행 | 🟡 | 낮음 |
| `udd test` | 임시 폴더로 1회 실행 (실사용 안 침범) | 🟡 | 낮음 |
| `udd status` | 최근 실행 결과 요약 | ❌ | 읽기전용 |
| `udd logs [--tail N] [--since DATE] [--event TYPE]` | 로그 조회 | ❌ | 읽기전용 |
| `udd doctor` | 환경/세션/스케줄/알림 전체 진단 | ❌ | 읽기전용 |
| `udd schedule --cron "..."` / `--enable` / `--disable` | 스케줄 등록/변경 | ❌ | 중간 |
| `udd unschedule` | 스케줄 제거 | ❌ | 중간 |
| `udd retrain [--from <stage>]` | Stage 4~6 재실행 | ✅ | 높음 |
| `udd notify-test` | 텔레그램 연결 테스트 | ❌ | 낮음 |
| `udd clean [--keep-days N]` | 오래된 파일 정리 | ❌ | 중간 |
| `udd export <path.tar.gz>` | 설정 백업 (크레덴셜 제외) | ❌ | 낮음 |
| `udd import <path.tar.gz> <target-dir>` | 백업에서 복원 | ❌ | 중간 |

### 11.2 글로벌 CLI (`udd-global`)

여러 프로젝트 일괄 관리 — 스킬 번들의 `bin/`에 설치.

```bash
udd-global list              # 모든 프로젝트 + 다음 실행 시각
udd-global status-all        # 전체 status 한 번에
udd-global doctor-all        # 전체 진단
udd-global run <project>     # 특정 프로젝트 즉시 실행
udd-global create            # /udd 스킬 호출 대신 CLI에서 프로젝트 생성 (고급자용)
```

탐색 로직: `~/ax-downloads/` 아래 폴더 순회, `config.yaml` 있으면 UDD 프로젝트로 인식.

---

## 12. Security Considerations

### 12.1 Threat Model

| 위협 | 대응 |
|-----|------|
| `.env` 평문 비밀번호 유출 | OS Keyring 사용 (D8), `.env`는 설정값만 |
| storage.json 쿠키 탈취 | 파일 권한 600, `~/ax-downloads/<p>/auth/` 제한 |
| AI 프롬프트 인젝션 (DOM에 악성 스크립트) | DOM 압축 시 `<script>` 태그 제거, 프롬프트는 "셀렉터만 반환" 강제 |
| AI가 제안한 logic patch로 인한 코드 오염 | 런타임에서 비활성, 개발 단계에서도 사용자 승인 필수 |
| 다운로드 파일로 민감 데이터 유출 | 다운로드 폴더는 로컬, 클라우드 동기화 폴더(OneDrive/Dropbox) 제외 권고 |
| 로그 파일에 세션 토큰 기록 | 로그 작성 시 쿠키/토큰 마스킹 (정규식 필터) |
| 스케줄 작업이 악성 스크립트 실행 | 스케줄러 등록 시 절대경로 사용, PATH 의존 제거 |

### 12.2 Sandbox & Permissions

- Playwright 브라우저는 프로젝트 venv에 격리 (글로벌 Chrome과 분리)
- `run.py`는 최소 권한 — 다운로드 폴더 + venv + keyring만 접근
- 텔레그램 봇 토큰은 전역 keyring 서비스(`udd-telegram/bot_token`)에 저장 (프로젝트별 중복 금지)

### 12.3 Audit Trail

모든 변화 이벤트는 `logs/YYYY-MM-DD.log`에 JSON lines로 기록:
- `session.expired`, `session.renewed`
- `healing.fired`, `healing.succeeded`, `healing.failed`
- `selector.promoted` (ai_discovered → primary)
- `config.patched` (AI diagnosis 적용)
- `schedule.installed`, `schedule.removed`

---

## 13. Cost Model

### 13.1 AI API 비용 (healing 기준)

**개발 단계 (Stage 6 자율주행):**
- 프로젝트 생성당 평균 diagnosis 호출 2~3회 (녹화가 정확하면 1회, 사이트 복잡하면 5회)
- 호출당 평균 $0.03 (Claude Sonnet 4.6 기준, DOM 3KB + screenshot)
- **프로젝트 1개 생성 비용: ~$0.10**

**운영 단계 (매일 실행, 세션당 healing 최대 1회):**
- UI 안정 시 99% 호출 없음 → $0
- UI 변경 시 월 1~2회 healing → 월 $0.05
- 10개 프로젝트 운영 시 **월 ~$0.5**

### 13.2 Cost Safeguards

- `healing.max_ai_retries`로 호출 횟수 상한
- `healing.cool_down_hours=24`로 반복 호출 방지
- provider auto-fallback: Claude 실패 시 Gemini/OpenAI 재시도 가능 (config로 비활성 옵션)
- 예산 알림 (옵션): 월 AI 호출 비용 임계치 넘으면 텔레그램 경고

---

## 14. Testing Strategy

### 14.1 스킬 자체 테스트 (`~/.claude/skills/udd/tests/`)

| 테스트 | 대상 | 방법 |
|--------|------|------|
| `test_precheck.sh` | 환경 감지 | mock python/pip binary |
| `test_config_render.py` | 템플릿 변수 치환 (`{today-30d}` 등) | 날짜 고정 테스트 |
| `test_cron_convert.py` | OS별 스케줄 변환 | 표준 cron 입력 → 각 OS 스케줄러 구문 검증 |
| `test_llm_fallback.py` | AI provider 자동 감지 | env 변수 조합별 올바른 provider 선택 |

### 14.2 생성 프로젝트 기본 테스트 (`tests/`)

| 테스트 | 대상 | API 호출? |
|--------|------|----------|
| `test_validators.py` | mock xlsx/csv로 검증 로직 | ❌ |
| `test_selectors.py` | selectors.yaml 스키마 + ai_discovered 승격 | ❌ |
| `test_healer_mock.py` | LLM 응답 모킹, healer 결정 로직 | ❌ |
| `test_auth_keyring.py` | keyring set/get (별도 테스트 서비스명) | ❌ |

### 14.3 수동 통합 테스트 (CI 제외)

- 로컬 가짜 웹 시스템 (Flask 기반, 로그인 + 메뉴 + 다운로드 페이지)을 띄우고 Stage 0~9 전체 실행
- 가짜 시스템에서 셀렉터 id를 바꿔 healing 발동 확인
- 세션 만료 시뮬레이션 → telegram 알림 확인

---

## 15. Skill Invocation — First-Time UX

### 15.1 사용자가 `/udd` 처음 실행할 때

```
User: /udd

Skill:
  안녕하세요! AX Universal Data Downloader입니다.
  회사 사내 시스템에서 자동으로 데이터 다운로드 프로젝트를 만들어드립니다.

  시작하기 전에 자율주행 모드가 필요합니다.
  현재 CLI: Claude Code
  자율주행 모드: ✅ (CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=1)

  🔍 환경 체크 중...
  ✅ Python 3.11.5
  ✅ Playwright 1.48.0
  ✅ Chromium installed
  ✅ AI provider: ANTHROPIC_API_KEY

  Stage 1/9 — 프로젝트 정보 수집

  Q1. 시스템 이름을 영문 슬러그로 알려주세요 (예: erp-sales, crm-stats)
  >
```

### 15.2 기존 프로젝트에서 `/udd` 재호출

```
User: /udd  (in ~/ax-downloads/erp-sales/)

Skill:
  기존 UDD 프로젝트가 감지되었습니다.
  - 프로젝트: erp-sales
  - 마지막 실행: 2026-04-23 09:00 (success)
  - 셀렉터 설정: 8개 요소 (AI-discovered 2개 포함)

  어떤 작업을 하실래요?
  1) 재학습 (Stage 4부터 — 녹화 + AI 정리 + 검증)
  2) 세션 재로그인만
  3) 스케줄 변경
  4) 그냥 상태 확인

  > 1
```

---

## 16. Open Questions / Future Work

구현 시 결정할 것들 (이 스펙에서 확정 안 함):

1. **CLI 감지 메커니즘의 정확한 환경변수 이름** — Gemini CLI 및 Codex CLI의 실제 환경변수명 확인 필요 (현 스펙은 추정). 감지 실패 시 폴백은 프로세스 이름(`process.argv[0]`) 추측.
2. **세션 유효성 판정 기준의 구체적 알고리즘** — 현 스펙은 "URL 재방문 후 로그인 페이지 리다이렉트 여부"이나, SPA 사이트의 경우 쿠키 만료 시간 체크 + 특정 API 엔드포인트 호출 방식이 더 안정적일 수 있음.
3. **DOM 압축(compact_dom) 알고리즘** — 3000자 이내로 줄이되 셀렉터 추론에 필요한 구조(ID, class, role, text)는 유지. 구체적 규칙은 구현 시 실험 후 확정.
4. **`retrain` 실패 시 복구 메커니즘** — git이 초기화되지 않은 프로젝트의 폴백(파일 복사 기반 백업)
5. **페이지 간 네비게이션 중 SPA 라우팅 대기** — Playwright `waitForNavigation`, `waitForLoadState`, `waitForSelector` 중 어느 조합을 기본 템플릿에 주입할지
6. **Firefox/WebKit 지원** — 현재는 Chromium만. 사내 시스템이 IE/Edge 전용인 경우 대응 전략
7. **파일 다운로드가 아닌 화면 캡처 후 OCR** — 표만 있고 다운로드 버튼이 없는 시스템 (별도 skill로 분리 권장)
8. **다중 파일 다운로드** — 한 실행에 여러 파일(예: 지점별 엑셀 10개) 반복 다운로드 패턴. config 확장 필요
9. **외부 알림 채널 확장** — 이메일, Slack, Webhook 추가 (notify.py 플러그인 구조)
10. **로그인 폼의 캡차 대응** — credentials 모드에서 캡차 발생 시 자동으로 session_replay 모드로 폴백할지, 실패 처리할지

---

## 17. Glossary

| 용어 | 의미 |
|-----|------|
| **Stage** | 스킬 실행 파이프라인의 9단계 (Stage 0~9) |
| **Layer** | 셀렉터 탐색의 4층 (ai_discovered → primary → fallbacks → AI healing) |
| **Session Replay** | Playwright storageState.json 로드로 로그인 단계 건너뛰기 |
| **AI Healing** | 셀렉터 실패 시 LLM이 DOM + 스크린샷 보고 새 셀렉터 추천 |
| **Promotion** | ai_discovered 셀렉터가 연속 성공으로 primary로 자동 승격 |
| **Autonomous Loop** | Stage 6의 AI 진단→패치→재실행 반복 (최대 5회) |
| **Diagnosis Type** | AI가 실패 원인을 분류하는 4가지: selector / timing / validation / logic |
| **Escalation** | 자율주행 5회 실패 시 사용자에게 텔레그램 알림 및 수동 개입 요청 |

---

## 18. Implementation Plan (next step)

이 설계 승인 후:
1. `superpowers:writing-plans` 스킬로 **구현 플랜 문서** 작성
2. 플랜 문서를 `docs/superpowers/plans/2026-04-24-ax-udd-implementation.md`에 저장
3. 플랜을 웨이브/태스크로 분해 (Skill 번들 작성 웨이브, 템플릿 작성 웨이브, 헬퍼 스크립트 웨이브, 통합 테스트 웨이브)
4. 각 웨이브 순차 실행 (TDD 기반)

---

**End of design spec.**
