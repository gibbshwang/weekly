# /weekly Phase 0 Implementation Plan — Manual Compile Dogfood

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working `/weekly` skill bundle that scaffolds a per-department Python project capable of running `wreport compile <dept> --week=YYYY-Www` to generate an HTML dashboard and SMTP-mail it to the group lead (cc: part leads). Validated by user dogfood on their own PC with a fake "기획팀" department.

**Architecture:** CLI-agnostic skill bundle at `~/.claude/skills/weekly/` (running under Claude Code/Codex/Gemini). Skill scripts run a 9-stage init pipeline that creates `~/weekly/<dept>/` with venv + Python package + `_지시사항.xlsx` + per-week folder. The generated `wreport` CLI binary is what cron will invoke (Phase 1) but Phase 0 only needs `init` + `compile`. Heavy reuse of `/udd` skill bundle libs (platform_detect, llm_call, template_render).

**Tech Stack:** Python 3.10+, Click 8.x, Pydantic v2, Jinja2 3.x, openpyxl 3.x, anthropic ≥0.88, openai ≥1.x, google-generativeai ≥0.8, smtplib (stdlib), keyring 25.x, pytest 8.x.

**Source spec:** `docs/superpowers/specs/2026-04-25-weekly-design.md`

**Out of this plan:** Phase 1 (assign cron, scheduler, status, SMB storage, audit log) — separate plan after Phase 0 dogfood validation.

---

## File Structure

Working tree (worktree `feat/weekly-impl`):

```
skills/weekly/                              ← skill bundle (deploys to ~/.claude/skills/weekly/)
  SKILL.md                                  ← CLI-agnostic prose, 9-stage pipeline
  pyproject.toml                            ← skill bundle deps (anthropic, openai, gemini, openpyxl, keyring, ...)
  scripts/                                  ← orchestration scripts the skill invokes
    __init__.py
    precheck.py                             ← Stage 0
    scope.py                                ← Stage 1 (interactive Q&A)
    scaffold.py                             ← Stage 2 (create dirs, venv, install)
    config_setup.py                         ← Stage 3 (write config.yaml)
    xlsx_template.py                        ← Stage 4 (generate _지시사항.xlsx)
    keyring_setup.py                        ← Stage 5 (store passwords)
    smtp_test.py                            ← Stage 6 (send test mail)
    handoff.py                              ← Stage 8 (README + summary)
    lib/
      __init__.py
      platform_detect.py                    ← copied from /udd
      llm_call.py                           ← copied from /udd, default provider = codex
      template_render.py                    ← copied from /udd
      telegram.py                           ← copied from /udd (optional notifier)
  templates/
    .gitignore.tmpl
    README.md.tmpl
    config.yaml.tmpl
    pyproject.toml.tmpl                     ← project's own (not skill bundle's)
    requirements.txt.tmpl
    template_part.md.j2                     ← per-part .md skeleton
    template_dashboard.html.j2              ← minimal placeholder (replaced by design-consultation later)
    src/                                    ← Python package: weekly_runtime
      __init__.py.tmpl
      cli.py.tmpl                           ← Click entry: init (delegates) + compile
      config.py.tmpl                        ← Pydantic config models
      keyring_helper.py.tmpl
      llm_client.py.tmpl                    ← consume scripts/lib/llm_call.py via copy
      excel.py.tmpl                         ← openpyxl reader
      compiler.py.tmpl                      ← collect .md + AI compile call
      dashboard.py.tmpl                     ← Jinja2 render + Chart.js inline
      mailer.py.tmpl                        ← smtplib + cc
      storage/
        __init__.py.tmpl
        base.py.tmpl                        ← Storage protocol
        local.py.tmpl                       ← LocalStorage (Path-based)
      prompts/
        compile_system.txt.tmpl             ← compile-stage system prompt
  tests/                                    ← skill bundle tests
    __init__.py
    test_precheck.py
    test_scope.py
    test_scaffold.py
    test_config_setup.py
    test_xlsx_template.py
    test_keyring_setup.py
    test_smtp_test.py
    test_handoff.py
    test_template_excel_reader.py
    test_template_compiler.py
    test_template_dashboard.py
    test_template_mailer.py
    test_template_cli.py
    test_template_storage_local.py
    test_e2e_init_to_compile.py
  fixtures/                                 ← test fixtures (sample xlsx, sample .md)
    sample_지시사항.xlsx
    sample_part_전략기획.md
    sample_part_사업개발.md
```

Project structure that `/weekly init` *generates* at `~/weekly/<dept>/`:

```
~/weekly/<dept>/
  venv/
  weekly_runtime/                           ← installed Python package (from templates/src/)
    cli.py
    config.py
    keyring_helper.py
    llm_client.py
    excel.py
    compiler.py
    dashboard.py
    mailer.py
    storage/{base.py, local.py}
    prompts/compile_system.txt
  state/                                    ← runtime cache (Phase 1 will use, Phase 0 empty)
  pyproject.toml
  requirements.txt
  README.md
  .gitignore
  config.yaml                               ← Stage 3 written

C:/weekly-test/<dept>/                      ← LocalStorage root (dogfood mode)
  _지시사항.xlsx                            ← Stage 4 written
  YYYY-Www/                                 ← created lazily by compile
    <파트>.md                                ← user fills manually in Phase 0
    _dashboard.html                         ← compile output
  logs/
```

---

## Wave 0: Worktree + Skill Bundle Scaffold

### Task 0.1: Create worktree

**Files:** N/A (git operation)

- [ ] **Step 1: Create worktree**

```bash
git worktree add .worktrees/weekly-impl -b feat/weekly-impl
cd .worktrees/weekly-impl
```

Expected: New worktree at `.worktrees/weekly-impl/`, branch `feat/weekly-impl` created from current HEAD (master).

- [ ] **Step 2: Verify worktree**

```bash
git worktree list
```

Expected: Three worktrees listed: workspace, udd-impl, weekly-impl.

- [ ] **Step 3: Commit empty placeholder**

```bash
cd .worktrees/weekly-impl
mkdir -p skills/weekly
git add skills/
git commit --allow-empty -m "chore: initialize weekly-impl worktree"
```

### Task 0.2: Skill bundle directory scaffold

**Files:**
- Create: `skills/weekly/.gitignore`
- Create: `skills/weekly/pyproject.toml`
- Create: `skills/weekly/scripts/__init__.py`
- Create: `skills/weekly/scripts/lib/__init__.py`
- Create: `skills/weekly/templates/`
- Create: `skills/weekly/tests/__init__.py`
- Create: `skills/weekly/fixtures/`

- [ ] **Step 1: Create directories**

```bash
mkdir -p skills/weekly/{scripts/lib,templates/src/{storage,prompts},tests,fixtures}
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
__pycache__/
*.pyc
.pytest_cache/
.venv/
*.egg-info/
```

- [ ] **Step 3: Write `pyproject.toml`**

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "weekly-skill-bundle"
version = "0.1.0"
description = "Weekly Report Automation Harness skill bundle"
requires-python = ">=3.10"
dependencies = [
  "anthropic>=0.88",
  "openai>=1.0",
  "google-generativeai>=0.8",
  "openpyxl>=3.1",
  "Jinja2>=3.1",
  "PyYAML>=6.0",
  "pydantic>=2.6",
  "click>=8.1",
  "keyring>=25.0",
]

[project.optional-dependencies]
test = ["pytest>=8.0", "pytest-mock>=3.12"]

[tool.setuptools.packages.find]
where = ["."]
include = ["scripts*", "tests*"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

- [ ] **Step 4: Write `__init__.py` files**

```python
# skills/weekly/scripts/__init__.py
"""Skill bundle orchestration scripts."""
```

```python
# skills/weekly/scripts/lib/__init__.py
"""Shared helpers reused from /udd."""
```

```python
# skills/weekly/tests/__init__.py
```

- [ ] **Step 5: Verify directory tree**

```bash
find skills/weekly -type d | sort
```

Expected: 7 directories listed (skills/weekly + scripts + scripts/lib + templates + templates/src + templates/src/storage + templates/src/prompts + tests + fixtures).

- [ ] **Step 6: Install + smoke test**

```bash
cd skills/weekly
python -m venv .venv
.venv/Scripts/python -m pip install -e ".[test]"
.venv/Scripts/python -m pytest -q
```

Expected: pytest finds 0 tests, exits 0 ("no tests ran in 0.0s").

- [ ] **Step 7: Commit**

```bash
git add skills/weekly/
git commit -m "feat(weekly): scaffold skill bundle directory + pyproject"
```

---

## Wave 1: Reuse /udd Helper Libraries

Heavy reuse of /udd's verified helpers. Copy + minor adapt + commit each separately for clean history.

### Task 1.1: Copy `platform_detect.py`

**Files:**
- Create: `skills/weekly/scripts/lib/platform_detect.py`
- Create: `skills/weekly/tests/test_lib_platform_detect.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_lib_platform_detect.py
from scripts.lib.platform_detect import detect_cli_host

def test_detect_claude_when_env_set(monkeypatch):
    monkeypatch.setenv("CLAUDECODE", "1")
    monkeypatch.delenv("CODEX_THREAD_ID", raising=False)
    monkeypatch.delenv("GEMINI_SESSION_ID", raising=False)
    assert detect_cli_host() == "claude"

def test_detect_codex_when_env_set(monkeypatch):
    monkeypatch.delenv("CLAUDECODE", raising=False)
    monkeypatch.setenv("CODEX_THREAD_ID", "abc")
    monkeypatch.delenv("GEMINI_SESSION_ID", raising=False)
    assert detect_cli_host() == "codex"

def test_detect_gemini_when_env_set(monkeypatch):
    monkeypatch.delenv("CLAUDECODE", raising=False)
    monkeypatch.delenv("CODEX_THREAD_ID", raising=False)
    monkeypatch.setenv("GEMINI_SESSION_ID", "xyz")
    assert detect_cli_host() == "gemini"

def test_detect_unknown_when_none(monkeypatch):
    monkeypatch.delenv("CLAUDECODE", raising=False)
    monkeypatch.delenv("CODEX_THREAD_ID", raising=False)
    monkeypatch.delenv("GEMINI_SESSION_ID", raising=False)
    assert detect_cli_host() == "unknown"
```

- [ ] **Step 2: Run test (expect fail)**

Run: `cd skills/weekly && .venv/Scripts/python -m pytest tests/test_lib_platform_detect.py -v`
Expected: ImportError or 4 FAILED.

- [ ] **Step 3: Copy + adapt from /udd**

```bash
cp ../../.worktrees/udd-impl/skills/udd/scripts/lib/platform_detect.py skills/weekly/scripts/lib/platform_detect.py
```

Verify the file exposes `detect_cli_host() -> str` returning `"claude" | "codex" | "gemini" | "unknown"`. If signature differs, adjust the test or wrapper accordingly.

- [ ] **Step 4: Run test (expect pass)**

Run: `cd skills/weekly && .venv/Scripts/python -m pytest tests/test_lib_platform_detect.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/lib/platform_detect.py skills/weekly/tests/test_lib_platform_detect.py
git commit -m "feat(weekly): copy platform_detect from /udd + tests"
```

### Task 1.2: Copy `template_render.py`

**Files:**
- Create: `skills/weekly/scripts/lib/template_render.py`
- Create: `skills/weekly/tests/test_lib_template_render.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_lib_template_render.py
from pathlib import Path
from scripts.lib.template_render import render_template

def test_render_substitutes_jinja_vars(tmp_path: Path):
    tmpl = tmp_path / "greeting.txt.tmpl"
    tmpl.write_text("Hello {{ name }}!")
    out = render_template(tmpl, {"name": "World"})
    assert out == "Hello World!"

def test_render_handles_loops(tmp_path: Path):
    tmpl = tmp_path / "list.txt.tmpl"
    tmpl.write_text("{% for x in items %}{{ x }} {% endfor %}")
    out = render_template(tmpl, {"items": ["a", "b", "c"]})
    assert out.strip() == "a b c"
```

- [ ] **Step 2: Run test (expect fail)**

Run: `cd skills/weekly && .venv/Scripts/python -m pytest tests/test_lib_template_render.py -v`
Expected: ImportError.

- [ ] **Step 3: Copy from /udd**

```bash
cp ../../.worktrees/udd-impl/skills/udd/scripts/lib/template_render.py skills/weekly/scripts/lib/template_render.py
```

Verify `render_template(path: Path, ctx: dict) -> str` signature. Adapt test if needed.

- [ ] **Step 4: Run test (expect pass)**

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/lib/template_render.py skills/weekly/tests/test_lib_template_render.py
git commit -m "feat(weekly): copy template_render from /udd + tests"
```

### Task 1.3: Copy `llm_call.py` (3-provider, default codex)

**Files:**
- Create: `skills/weekly/scripts/lib/llm_call.py`
- Create: `skills/weekly/tests/test_lib_llm_call.py`

- [ ] **Step 1: Write failing test (3-provider selection)**

```python
# skills/weekly/tests/test_lib_llm_call.py
import pytest
from unittest.mock import MagicMock, patch
from scripts.lib.llm_call import LLMClient

def test_default_provider_is_codex(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "fake-key")
    client = LLMClient()
    assert client.provider == "codex"

def test_explicit_anthropic(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key")
    client = LLMClient(provider="anthropic")
    assert client.provider == "anthropic"

def test_explicit_gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    client = LLMClient(provider="gemini")
    assert client.provider == "gemini"

def test_missing_key_raises(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ValueError, match="No API key"):
        LLMClient()

def test_call_dispatches_to_codex(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "fake")
    client = LLMClient(provider="codex")
    with patch.object(client, "_call_codex", return_value="ok") as m:
        result = client.call("system", "user")
    m.assert_called_once_with("system", "user")
    assert result == "ok"
```

- [ ] **Step 2: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 3: Copy from /udd + check default**

```bash
cp ../../.worktrees/udd-impl/skills/udd/scripts/lib/llm_call.py skills/weekly/scripts/lib/llm_call.py
```

Open the file. Find the provider auto-select logic. **Edit so the priority order is: codex (OPENAI_API_KEY) > anthropic (ANTHROPIC_API_KEY) > gemini (GEMINI_API_KEY).** Decision D12 = Codex CLI default. /udd's default may be anthropic — adjust accordingly. Show the diff:

```python
# Adjust the auto-select function so codex wins when OPENAI_API_KEY is present.
def _autoselect_provider() -> str:
    if os.getenv("OPENAI_API_KEY"):
        return "codex"
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.getenv("GEMINI_API_KEY"):
        return "gemini"
    raise ValueError("No API key in environment (OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY)")
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/lib/llm_call.py skills/weekly/tests/test_lib_llm_call.py
git commit -m "feat(weekly): copy llm_call from /udd, set codex as default provider (D12)"
```

### Task 1.4: Copy `telegram.py` (optional notifier)

**Files:**
- Create: `skills/weekly/scripts/lib/telegram.py`
- Create: `skills/weekly/tests/test_lib_telegram.py`

- [ ] **Step 1: Write failing test (smoke only)**

```python
# skills/weekly/tests/test_lib_telegram.py
from scripts.lib.telegram import send_message

def test_send_message_callable():
    assert callable(send_message)
```

- [ ] **Step 2: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 3: Copy from /udd**

```bash
cp ../../.worktrees/udd-impl/skills/udd/scripts/lib/telegram.py skills/weekly/scripts/lib/telegram.py
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/lib/telegram.py skills/weekly/tests/test_lib_telegram.py
git commit -m "feat(weekly): copy telegram notifier helper from /udd"
```

---

## Wave 2: SKILL.md Prose

### Task 2.1: Write SKILL.md

**Files:**
- Create: `skills/weekly/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

The skill prose. Modeled on /udd's SKILL.md structure but with weekly-specific 9-stage pipeline. The skill should be CLI-agnostic (Claude Code, Codex CLI, Gemini CLI all run the same prose).

```markdown
---
name: weekly
description: Weekly Report Automation Harness — end-to-end automation for departmental weekly status reports (group lead instructions → part lead .md updates → AI compile → HTML dashboard → email). Use when the user wants a self-healing, scheduled Python project that runs on a corporate shared folder with SMTP notification. Generates an independent project folder with Click CLI + OS keyring auth + 3-provider LLM adapter (Codex/Gemini/anthropic).
author: gibbs hwang
version: 0.1.0
---

# /weekly — Weekly Report Automation Harness

부서의 주간업무보고 자동화 스킬. 한 번의 `/weekly init <부서>` 실행으로 부서별 standalone Python 프로젝트가 생기고, 그 프로젝트가 cron으로 자동 동작한다 (Phase 1).

본 스킬은 CLI-agnostic — Claude Code, Codex CLI, Gemini CLI 어느 환경에서도 동일하게 동작한다.

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

## /design-consultation Wave

Phase 0 첫 wave에서 별도로 `/design-consultation`을 호출해 대시보드 디자인 시스템을 도출하고, 결과물을 `templates/template_dashboard.html.j2`에 commit 한다. init 파이프라인은 이미 채워진 템플릿을 scaffold만 한다.

## Files in This Bundle

- `SKILL.md` — 본 문서
- `scripts/` — 9-stage 파이프라인 스크립트
- `scripts/lib/` — /udd에서 재사용한 헬퍼 (platform_detect, llm_call, template_render, telegram)
- `templates/` — 생성 프로젝트의 src/ + 양식 파일들
- `tests/` — pytest 단위/통합 테스트
- `fixtures/` — 테스트용 샘플 xlsx + .md
```

- [ ] **Step 2: Verify file**

```bash
wc -l skills/weekly/SKILL.md
```

Expected: ~80 lines.

- [ ] **Step 3: Commit**

```bash
git add skills/weekly/SKILL.md
git commit -m "feat(weekly): write SKILL.md prose (9-stage pipeline)"
```

---

## Wave 3: Project Templates — Foundation

The `weekly_runtime` Python package that gets installed into the generated project's venv.

### Task 3.1: Project pyproject + requirements templates

**Files:**
- Create: `skills/weekly/templates/pyproject.toml.tmpl`
- Create: `skills/weekly/templates/requirements.txt.tmpl`
- Create: `skills/weekly/templates/.gitignore.tmpl`

- [ ] **Step 1: Write `pyproject.toml.tmpl`**

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "weekly-runtime-{{ dept_slug }}"
version = "0.1.0"
description = "Generated /weekly project for {{ dept_name }}"
requires-python = ">=3.10"
dependencies = [
  "click>=8.1",
  "pydantic>=2.6",
  "PyYAML>=6.0",
  "openpyxl>=3.1",
  "Jinja2>=3.1",
  "anthropic>=0.88",
  "openai>=1.0",
  "google-generativeai>=0.8",
  "keyring>=25.0",
]

[project.scripts]
wreport = "weekly_runtime.cli:cli"

[tool.setuptools.packages.find]
where = ["."]
include = ["weekly_runtime*"]
```

- [ ] **Step 2: Write `requirements.txt.tmpl`**

```
click>=8.1
pydantic>=2.6
PyYAML>=6.0
openpyxl>=3.1
Jinja2>=3.1
anthropic>=0.88
openai>=1.0
google-generativeai>=0.8
keyring>=25.0
```

- [ ] **Step 3: Write `.gitignore.tmpl`**

```gitignore
__pycache__/
*.pyc
.venv/
*.egg-info/
state/
```

- [ ] **Step 4: Commit**

```bash
git add skills/weekly/templates/{pyproject.toml.tmpl,requirements.txt.tmpl,.gitignore.tmpl}
git commit -m "feat(weekly): project pyproject + requirements templates"
```

### Task 3.2: Project config models (Pydantic)

**Files:**
- Create: `skills/weekly/templates/src/config.py.tmpl`
- Create: `skills/weekly/tests/test_template_config.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_template_config.py
import yaml
from pathlib import Path
from scripts.lib.template_render import render_template

# This test renders the template, exec's the result, and validates it.

def test_config_template_renders_and_validates(tmp_path: Path):
    out = render_template(
        Path("skills/weekly/templates/src/config.py.tmpl"), {}
    )
    # Should be valid Python (syntax check)
    compile(out, "config.py", "exec")
    # Should expose `WeeklyConfig` and `load_config`
    assert "class WeeklyConfig" in out
    assert "def load_config" in out

def test_config_loads_minimal_yaml(tmp_path: Path):
    # Render the template, write to file, import, load yaml
    out = render_template(
        Path("skills/weekly/templates/src/config.py.tmpl"), {}
    )
    cfg_module_path = tmp_path / "config.py"
    cfg_module_path.write_text(out)
    cfg_yaml = tmp_path / "config.yaml"
    cfg_yaml.write_text(yaml.safe_dump({
        "department": {"name": "기획팀", "parts": ["전략기획", "사업개발"]},
        "group_lead": {"name": "홍길동", "email": "lead@example.com"},
        "part_leads": [
            {"part": "전략기획", "name": "김파트", "email": "p1@example.com"},
            {"part": "사업개발", "name": "이파트", "email": "p2@example.com"},
        ],
        "storage": {"type": "local", "root": str(tmp_path / "store")},
        "schedule": {"assign_cron": "0 * * * *", "compile_cron": "0 17 * * 5", "timezone": "Asia/Seoul"},
        "smtp": {"host": "smtp.gmail.com", "port": 587, "use_tls": True, "user": "op@example.com"},
        "ai": {"provider": "codex", "model_assign": "gpt-5", "model_compile": "gpt-5"},
        "prompts": {"override_dir": None},
    }))
    import importlib.util
    spec = importlib.util.spec_from_file_location("cfg", cfg_module_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    cfg = mod.load_config(cfg_yaml)
    assert cfg.department.name == "기획팀"
    assert cfg.ai.provider == "codex"
    assert len(cfg.part_leads) == 2
```

- [ ] **Step 2: Run test (expect fail)**

Expected: FileNotFoundError or attribute error.

- [ ] **Step 3: Write `config.py.tmpl`**

```python
"""Pydantic config models for weekly_runtime.

Loaded from `config.yaml` at the project root (the directory `wreport` is invoked from).
"""
from pathlib import Path
from typing import List, Literal, Optional
import yaml
from pydantic import BaseModel, EmailStr, Field


class Department(BaseModel):
    name: str
    parts: List[str]


class Person(BaseModel):
    name: str
    email: str  # plain str, not EmailStr — allow non-RFC compliant test addresses


class PartLead(BaseModel):
    part: str
    name: str
    email: str


class StorageConfig(BaseModel):
    type: Literal["local", "smb"]
    root: str  # path string (Windows or Unix), or UNC


class ScheduleConfig(BaseModel):
    assign_cron: str
    compile_cron: str
    timezone: str = "Asia/Seoul"


class SMTPConfig(BaseModel):
    host: str
    port: int
    use_tls: bool = True
    user: str
    # password loaded from OS keyring (not in yaml)


class AIConfig(BaseModel):
    provider: Literal["codex", "anthropic", "gemini"] = "codex"
    model_assign: str = "gpt-5"
    model_compile: str = "gpt-5"


class PromptsConfig(BaseModel):
    override_dir: Optional[str] = None


class WeeklyConfig(BaseModel):
    department: Department
    group_lead: Person
    part_leads: List[PartLead]
    storage: StorageConfig
    schedule: ScheduleConfig
    smtp: SMTPConfig
    ai: AIConfig
    prompts: PromptsConfig = Field(default_factory=PromptsConfig)


def load_config(path: Path) -> WeeklyConfig:
    """Load and validate config.yaml."""
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    return WeeklyConfig.model_validate(data)
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/templates/src/config.py.tmpl skills/weekly/tests/test_template_config.py
git commit -m "feat(weekly): pydantic config models template"
```

### Task 3.3: Storage abstraction + LocalStorage

**Files:**
- Create: `skills/weekly/templates/src/storage/__init__.py.tmpl`
- Create: `skills/weekly/templates/src/storage/base.py.tmpl`
- Create: `skills/weekly/templates/src/storage/local.py.tmpl`
- Create: `skills/weekly/tests/test_template_storage_local.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_template_storage_local.py
import tempfile
import importlib.util
from pathlib import Path
from scripts.lib.template_render import render_template


def _import_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_local_storage_read_write(tmp_path: Path):
    base_out = render_template(Path("skills/weekly/templates/src/storage/base.py.tmpl"), {})
    local_out = render_template(Path("skills/weekly/templates/src/storage/local.py.tmpl"), {})
    base_path = tmp_path / "base.py"
    base_path.write_text(base_out)
    local_path = tmp_path / "local.py"
    local_path.write_text(local_out.replace("from .base import", "from base import"))
    base_mod = _import_module("base", base_path)
    local_mod = _import_module("local", local_path)
    storage = local_mod.LocalStorage(root=tmp_path / "store")
    storage.write_text(Path("foo.md"), "hello")
    assert storage.read_text(Path("foo.md")) == "hello"
    assert storage.exists(Path("foo.md"))
    assert not storage.exists(Path("bar.md"))


def test_local_storage_list_dir(tmp_path: Path):
    local_out = render_template(Path("skills/weekly/templates/src/storage/local.py.tmpl"), {})
    base_out = render_template(Path("skills/weekly/templates/src/storage/base.py.tmpl"), {})
    base_path = tmp_path / "base.py"; base_path.write_text(base_out)
    local_path = tmp_path / "local.py"; local_path.write_text(local_out.replace("from .base import", "from base import"))
    _import_module("base", base_path)
    local_mod = _import_module("local", local_path)
    storage = local_mod.LocalStorage(root=tmp_path / "store")
    storage.write_text(Path("subdir/a.md"), "A")
    storage.write_text(Path("subdir/b.md"), "B")
    files = sorted(storage.list_dir(Path("subdir")))
    assert [str(f) for f in files] == ["a.md", "b.md"]
```

- [ ] **Step 2: Run test (expect fail)**

Expected: FileNotFoundError on template paths.

- [ ] **Step 3: Write `storage/__init__.py.tmpl`**

```python
"""Storage abstraction for weekly_runtime.

Phase 0 ships LocalStorage only. Phase 1 adds SMBStorage.
"""
from .base import Storage
from .local import LocalStorage

__all__ = ["Storage", "LocalStorage"]
```

- [ ] **Step 4: Write `storage/base.py.tmpl`**

```python
"""Storage protocol — read/write/list/exists for parts of a department's shared folder."""
from pathlib import Path
from typing import Iterable, Protocol


class Storage(Protocol):
    """Storage backend for a single department's data root.

    All paths passed in/out are *relative* to the department root
    (e.g. `_지시사항.xlsx` or `2026-W17/전략기획.md`).
    """

    def read_text(self, relpath: Path) -> str: ...
    def read_bytes(self, relpath: Path) -> bytes: ...
    def write_text(self, relpath: Path, content: str) -> None: ...
    def write_bytes(self, relpath: Path, content: bytes) -> None: ...
    def exists(self, relpath: Path) -> bool: ...
    def list_dir(self, relpath: Path) -> Iterable[Path]: ...
    def mtime(self, relpath: Path) -> float: ...
```

- [ ] **Step 5: Write `storage/local.py.tmpl`**

```python
"""LocalStorage — Path-based backend for dogfood / single-PC setups."""
from pathlib import Path
from typing import Iterable, Union

from .base import Storage


class LocalStorage:
    """Storage backed by a local directory.

    `root` is the department's data directory (e.g. `C:/weekly-test/기획팀`).
    All paths passed to methods are relative to `root`.
    """

    def __init__(self, root: Union[str, Path]) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _abs(self, relpath: Path) -> Path:
        return self.root / Path(relpath)

    def read_text(self, relpath: Path) -> str:
        return self._abs(relpath).read_text(encoding="utf-8")

    def read_bytes(self, relpath: Path) -> bytes:
        return self._abs(relpath).read_bytes()

    def write_text(self, relpath: Path, content: str) -> None:
        p = self._abs(relpath)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")

    def write_bytes(self, relpath: Path, content: bytes) -> None:
        p = self._abs(relpath)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(content)

    def exists(self, relpath: Path) -> bool:
        return self._abs(relpath).exists()

    def list_dir(self, relpath: Path) -> Iterable[Path]:
        d = self._abs(relpath)
        if not d.is_dir():
            return []
        # Return relative names (just the filename), not absolute paths
        return [Path(p.name) for p in sorted(d.iterdir())]

    def mtime(self, relpath: Path) -> float:
        return self._abs(relpath).stat().st_mtime
```

- [ ] **Step 6: Run test (expect pass)**

Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add skills/weekly/templates/src/storage/ skills/weekly/tests/test_template_storage_local.py
git commit -m "feat(weekly): storage abstraction + LocalStorage backend"
```

### Task 3.4: Keyring helper

**Files:**
- Create: `skills/weekly/templates/src/keyring_helper.py.tmpl`
- Create: `skills/weekly/tests/test_template_keyring_helper.py`

- [ ] **Step 1: Write failing test (using keyring's in-memory backend)**

```python
# skills/weekly/tests/test_template_keyring_helper.py
import importlib.util
from pathlib import Path
from scripts.lib.template_render import render_template
import keyring


class _FakeBackend(keyring.backend.KeyringBackend):
    priority = 1
    def __init__(self): self._store = {}
    def set_password(self, service, username, password):
        self._store[(service, username)] = password
    def get_password(self, service, username):
        return self._store.get((service, username))
    def delete_password(self, service, username):
        del self._store[(service, username)]


def _import_helper(tmp_path: Path):
    out = render_template(Path("skills/weekly/templates/src/keyring_helper.py.tmpl"), {})
    p = tmp_path / "kh.py"; p.write_text(out)
    spec = importlib.util.spec_from_file_location("kh", p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def test_set_and_get(tmp_path: Path):
    keyring.set_keyring(_FakeBackend())
    kh = _import_helper(tmp_path)
    kh.set_secret("weekly-기획팀", "smtp_password", "sekrit")
    assert kh.get_secret("weekly-기획팀", "smtp_password") == "sekrit"


def test_get_missing_raises(tmp_path: Path):
    keyring.set_keyring(_FakeBackend())
    kh = _import_helper(tmp_path)
    import pytest
    with pytest.raises(KeyError):
        kh.get_secret("weekly-기획팀", "nonexistent")
```

- [ ] **Step 2: Run test (expect fail)**

Expected: FileNotFoundError on template.

- [ ] **Step 3: Write `keyring_helper.py.tmpl`**

```python
"""OS keyring wrapper — store SMTP password and AI API key per department.

Service name convention: `weekly-<dept_slug>`.
Usernames: `smtp_password`, `ai_api_key`.
"""
import keyring


def set_secret(service: str, username: str, value: str) -> None:
    """Store a secret in the OS keyring."""
    keyring.set_password(service, username, value)


def get_secret(service: str, username: str) -> str:
    """Retrieve a secret. Raises KeyError if missing."""
    val = keyring.get_password(service, username)
    if val is None:
        raise KeyError(f"Secret {service}/{username} not found in keyring")
    return val


def delete_secret(service: str, username: str) -> None:
    """Remove a secret. No error if missing."""
    try:
        keyring.delete_password(service, username)
    except keyring.errors.PasswordDeleteError:
        pass
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/templates/src/keyring_helper.py.tmpl skills/weekly/tests/test_template_keyring_helper.py
git commit -m "feat(weekly): keyring helper for SMTP password + AI keys"
```

### Task 3.5: LLM client (project side, mirrors lib/llm_call.py)

The project's `llm_client.py` is a simple wrapper that imports from a *local copy* of `llm_call.py`. During scaffold, the skill copies `scripts/lib/llm_call.py` into the project's `weekly_runtime/_llm.py` so the project can run without the skill bundle.

**Files:**
- Create: `skills/weekly/templates/src/llm_client.py.tmpl`
- Create: `skills/weekly/tests/test_template_llm_client.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_template_llm_client.py
import importlib.util
from pathlib import Path
from scripts.lib.template_render import render_template


def test_llm_client_renders_and_compiles(tmp_path: Path):
    out = render_template(Path("skills/weekly/templates/src/llm_client.py.tmpl"), {})
    compile(out, "llm_client.py", "exec")
    assert "class LLMClient" in out or "def get_llm_client" in out
```

- [ ] **Step 2: Run test (expect fail)**

Expected: FileNotFoundError.

- [ ] **Step 3: Write `llm_client.py.tmpl`**

```python
"""LLM client for weekly_runtime — thin wrapper over the bundled llm_call helper.

During scaffold the skill copies `scripts/lib/llm_call.py` to
`weekly_runtime/_llm.py`. This module re-exports `LLMClient` from there.
"""
from ._llm import LLMClient


def get_llm_client(provider: str = "codex") -> LLMClient:
    return LLMClient(provider=provider)


__all__ = ["LLMClient", "get_llm_client"]
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/templates/src/llm_client.py.tmpl skills/weekly/tests/test_template_llm_client.py
git commit -m "feat(weekly): llm_client thin wrapper template"
```

---

## Wave 4: Excel + Compile Path

### Task 4.1: Excel reader

**Files:**
- Create: `skills/weekly/templates/src/excel.py.tmpl`
- Create: `skills/weekly/tests/test_template_excel.py`
- Create: `skills/weekly/fixtures/sample_지시사항.xlsx` (binary, generated below)

- [ ] **Step 1: Generate sample xlsx fixture**

```python
# Run once to create the fixture. Save this as a one-off script.
from openpyxl import Workbook
from pathlib import Path

wb = Workbook()
ws = wb.active
ws.title = "지시사항"
ws.append(["일자", "지시내용", "담당파트", "우선순위", "마감", "비고"])
ws.append(["2026-04-22", "시장 조사", "전략기획", "높음", "2026-04-30", "경쟁사 가격"])
ws.append(["2026-04-23", "고객사 미팅 준비", "사업개발", "보통", "2026-04-26", ""])
ws.append(["2026-04-24", "전사 회의 자료 정리", "", "높음", "2026-04-25", "담당파트 미지정"])
fpath = Path("skills/weekly/fixtures/sample_지시사항.xlsx")
fpath.parent.mkdir(parents=True, exist_ok=True)
wb.save(fpath)
print(f"Wrote {fpath}")
```

Run the snippet (e.g. via `python -c`) once. Commit the fixture file.

- [ ] **Step 2: Write failing test**

```python
# skills/weekly/tests/test_template_excel.py
import importlib.util
from pathlib import Path
from scripts.lib.template_render import render_template


def _import_excel(tmp_path: Path):
    out = render_template(Path("skills/weekly/templates/src/excel.py.tmpl"), {})
    p = tmp_path / "excel.py"; p.write_text(out)
    spec = importlib.util.spec_from_file_location("excel_mod", p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def test_read_rows_returns_dicts(tmp_path: Path):
    excel = _import_excel(tmp_path)
    rows = excel.read_instructions(Path("skills/weekly/fixtures/sample_지시사항.xlsx"))
    assert len(rows) == 3
    assert rows[0] == {
        "일자": "2026-04-22",
        "지시내용": "시장 조사",
        "담당파트": "전략기획",
        "우선순위": "높음",
        "마감": "2026-04-30",
        "비고": "경쟁사 가격",
    }


def test_row_hash_stable(tmp_path: Path):
    excel = _import_excel(tmp_path)
    rows = excel.read_instructions(Path("skills/weekly/fixtures/sample_지시사항.xlsx"))
    h1 = excel.row_hash(rows[0])
    h2 = excel.row_hash(rows[0])
    assert h1 == h2
    assert h1 != excel.row_hash(rows[1])


def test_empty_담당파트_preserved(tmp_path: Path):
    excel = _import_excel(tmp_path)
    rows = excel.read_instructions(Path("skills/weekly/fixtures/sample_지시사항.xlsx"))
    assert rows[2]["담당파트"] == ""
```

- [ ] **Step 3: Run test (expect fail)**

Expected: FileNotFoundError on template.

- [ ] **Step 4: Write `excel.py.tmpl`**

```python
"""Excel reader for `_지시사항.xlsx`.

Reads all data rows (skipping header) into list of dicts keyed by column name.
Computes stable hash per row for change detection (Phase 1 sidecar JSON).
"""
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List

from openpyxl import load_workbook

EXPECTED_HEADERS = ["일자", "지시내용", "담당파트", "우선순위", "마감", "비고"]


def read_instructions(xlsx_path: Path) -> List[Dict[str, Any]]:
    """Read the active sheet, return list of dicts (one per data row).

    The active sheet must have headers matching EXPECTED_HEADERS in row 1.
    Empty cells become "".
    """
    wb = load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active
    header = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    if [h for h in header if h] != EXPECTED_HEADERS:
        raise ValueError(f"Unexpected headers: {header} (expected {EXPECTED_HEADERS})")
    rows: List[Dict[str, Any]] = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if all(v is None or v == "" for v in row):
            continue
        record = {header[i]: ("" if v is None else str(v)) for i, v in enumerate(row[: len(header)])}
        rows.append(record)
    wb.close()
    return rows


def row_hash(row: Dict[str, Any]) -> str:
    """Stable SHA256 hash of a row dict for change detection."""
    canonical = json.dumps(row, sort_keys=True, ensure_ascii=False)
    return "sha256:" + hashlib.sha256(canonical.encode("utf-8")).hexdigest()
```

- [ ] **Step 5: Run test (expect pass)**

Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add skills/weekly/templates/src/excel.py.tmpl skills/weekly/tests/test_template_excel.py skills/weekly/fixtures/sample_지시사항.xlsx
git commit -m "feat(weekly): excel reader + row hash + sample fixture"
```

### Task 4.2: Compile-stage system prompt template

**Files:**
- Create: `skills/weekly/templates/src/prompts/compile_system.txt.tmpl`

- [ ] **Step 1: Write the prompt**

```
당신은 부서 주간업무보고를 취합하는 AI 어시스턴트입니다.

부서명: {{ dept_name }}
파트 목록: {{ parts | join(", ") }}
주차: {{ week }}

다음 입력을 받습니다:
- 각 파트의 .md 파일 내용 (성과/이슈/차주계획 섹션)
- 일부 파트는 미작성일 수 있음

다음을 JSON 형식으로 출력하세요:
{
  "부서_종합_요약": "이번 주 부서 전체 핵심 성과/이슈를 4-6문장으로",
  "파트별_핵심": {
    "<파트명>": {
      "주요_성과": ["..."],
      "주요_이슈": ["..."],
      "차주_계획": ["..."],
      "리스크": ["..."]
    }
  },
  "진척률": {
    "<파트명>": <0-100 정수>
  },
  "미작성_파트": ["..."],
  "주의사항": ["..."]
}

엄격한 규칙:
1. 입력에 없는 정보를 만들어내지 마시오 (사실 변조 금지).
2. 출력에 PII(주민번호, 연락처, 카드번호 등)를 포함하지 마시오.
3. 입력에서 PII를 발견하면 별도 주의사항으로 표시하시오. 출력에 그대로 옮기지 마시오.
4. JSON 외 다른 형식 금지. 마크다운 코드블록 금지.
```

- [ ] **Step 2: Commit**

```bash
git add skills/weekly/templates/src/prompts/compile_system.txt.tmpl
git commit -m "feat(weekly): compile-stage system prompt with PII guardrails"
```

### Task 4.3: Compiler

**Files:**
- Create: `skills/weekly/templates/src/compiler.py.tmpl`
- Create: `skills/weekly/tests/test_template_compiler.py`
- Create: `skills/weekly/fixtures/sample_part_전략기획.md`
- Create: `skills/weekly/fixtures/sample_part_사업개발.md`

- [ ] **Step 1: Write fixture .md files**

```markdown
<!-- skills/weekly/fixtures/sample_part_전략기획.md -->
# 전략기획 — 2026-W17

## 그룹장 지시
### [추가됨 2026-04-22 09:00] 시장 조사
- 우선순위: 높음

## 성과
- 경쟁사 가격표 1차 수집 완료
- 시장 점유율 분석 초안 작성

## 이슈
- 데이터 출처 검증 시간 부족

## 차주 계획
- 검증 마무리 + 임원 보고 자료 작성
```

```markdown
<!-- skills/weekly/fixtures/sample_part_사업개발.md -->
# 사업개발 — 2026-W17

## 그룹장 지시
### [추가됨 2026-04-23 14:00] 고객사 미팅 준비
- 우선순위: 보통

## 성과
- 고객사 A 미팅 자료 초안

## 이슈

## 차주 계획
- 미팅 진행 + follow-up
```

- [ ] **Step 2: Write failing test**

```python
# skills/weekly/tests/test_template_compiler.py
import importlib.util
import json
from pathlib import Path
from unittest.mock import MagicMock
from scripts.lib.template_render import render_template


def _import(tmp_path: Path, tmpl_path: Path, deps: dict[str, Path] = None):
    out = render_template(tmpl_path, {})
    p = tmp_path / tmpl_path.with_suffix("").name
    p.write_text(out)
    spec = importlib.util.spec_from_file_location(p.stem, p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def test_collect_parts_reads_fixture_md(tmp_path: Path):
    compiler = _import(tmp_path, Path("skills/weekly/templates/src/compiler.py.tmpl"))
    md_dir = Path("skills/weekly/fixtures")
    # The compiler is called with a list of (part_name, content) tuples
    contents = compiler.collect_parts(md_dir, ["전략기획", "사업개발"], pattern="sample_part_{part}.md")
    assert len(contents) == 2
    assert contents[0][0] == "전략기획"
    assert "경쟁사 가격표" in contents[0][1]


def test_compile_calls_llm_with_prompt(tmp_path: Path):
    compiler = _import(tmp_path, Path("skills/weekly/templates/src/compiler.py.tmpl"))
    fake_llm = MagicMock()
    fake_llm.call.return_value = json.dumps({
        "부서_종합_요약": "테스트 요약",
        "파트별_핵심": {"전략기획": {"주요_성과": ["a"], "주요_이슈": [], "차주_계획": [], "리스크": []}},
        "진척률": {"전략기획": 80},
        "미작성_파트": [],
        "주의사항": [],
    })
    parts_data = [("전략기획", "성과: a")]
    result = compiler.run_compile(
        llm=fake_llm,
        dept_name="기획팀",
        parts=["전략기획"],
        week="2026-W17",
        parts_data=parts_data,
        prompt_template_path=Path("skills/weekly/templates/src/prompts/compile_system.txt.tmpl"),
    )
    assert result["부서_종합_요약"] == "테스트 요약"
    assert result["진척률"]["전략기획"] == 80
    fake_llm.call.assert_called_once()
    sys_prompt, user_prompt = fake_llm.call.call_args[0]
    assert "기획팀" in sys_prompt
    assert "2026-W17" in sys_prompt
    assert "성과: a" in user_prompt
```

- [ ] **Step 3: Run test (expect fail)**

Expected: FileNotFoundError.

- [ ] **Step 4: Write `compiler.py.tmpl`**

```python
"""Compile stage — read all part .md files, call LLM, return structured result."""
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

from jinja2 import Template


def collect_parts(
    md_dir: Path,
    parts: List[str],
    pattern: str = "{part}.md",
) -> List[Tuple[str, str]]:
    """Read each part's .md from `md_dir`. Returns list of (part_name, content).

    Missing files become ("", part_name) — caller decides how to mark missing.
    """
    out: List[Tuple[str, str]] = []
    for part in parts:
        path = md_dir / pattern.format(part=part)
        if path.exists():
            out.append((part, path.read_text(encoding="utf-8")))
        else:
            out.append((part, ""))
    return out


def run_compile(
    llm,
    dept_name: str,
    parts: List[str],
    week: str,
    parts_data: List[Tuple[str, str]],
    prompt_template_path: Path,
) -> Dict[str, Any]:
    """Run a compile pass. Returns parsed JSON dict from the LLM."""
    sys_prompt = Template(prompt_template_path.read_text(encoding="utf-8")).render(
        dept_name=dept_name, parts=parts, week=week
    )
    # Build user prompt: enumerate parts and their content
    user_lines = [f"## 부서 = {dept_name}, 주차 = {week}"]
    for part_name, content in parts_data:
        user_lines.append(f"\n--- 파트: {part_name} ---")
        if content.strip():
            user_lines.append(content)
        else:
            user_lines.append("(미작성)")
    user_prompt = "\n".join(user_lines)
    raw = llm.call(sys_prompt, user_prompt)
    # LLM returns JSON string per system prompt contract
    return json.loads(raw)
```

- [ ] **Step 5: Run test (expect pass)**

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add skills/weekly/templates/src/compiler.py.tmpl skills/weekly/tests/test_template_compiler.py skills/weekly/fixtures/sample_part_*.md
git commit -m "feat(weekly): compiler — collect .md + LLM call + JSON parse"
```

### Task 4.4: Dashboard renderer

**Files:**
- Create: `skills/weekly/templates/template_dashboard.html.j2`
- Create: `skills/weekly/templates/src/dashboard.py.tmpl`
- Create: `skills/weekly/tests/test_template_dashboard.py`

- [ ] **Step 1: Write minimal placeholder dashboard template**

The full design comes from `/design-consultation` (separate wave). Phase 0 ships a minimal placeholder so compile path can be validated.

```jinja
{# skills/weekly/templates/template_dashboard.html.j2 — minimal Phase 0 placeholder #}
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>{{ dept_name }} 주간보고 — {{ week }}</title>
<style>
  body { font-family: "Pretendard", sans-serif; max-width: 920px; margin: 2em auto; padding: 0 1em; color: #333; }
  h1 { color: #1B6B5A; border-bottom: 2px solid #1B6B5A; padding-bottom: 0.4em; }
  h2 { color: #1B6B5A; margin-top: 2em; }
  .summary { background: #F5F3F0; padding: 1em; border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 1em; }
  th, td { border: 1px solid #ddd; padding: 0.6em; text-align: left; vertical-align: top; }
  th { background: #F5F3F0; }
  .missing { color: #c00; font-weight: bold; }
  .progress-bar { background: #eee; height: 14px; border-radius: 7px; overflow: hidden; }
  .progress-fill { background: #1B6B5A; height: 100%; }
  .footnote { color: #888; font-size: 0.85em; margin-top: 3em; }
</style>
</head>
<body>
<h1>{{ dept_name }} 주간보고 — {{ week }}</h1>

<div class="summary">
  <strong>종합 요약</strong><br>
  {{ result.부서_종합_요약 | replace('\n', '<br>') | safe }}
</div>

{% if result.미작성_파트 %}
<p class="missing">
  미작성 파트: {{ result.미작성_파트 | join(", ") }}
</p>
{% endif %}

<h2>파트별 진척률</h2>
<table>
<thead><tr><th>파트</th><th>진척률</th><th>비주얼</th></tr></thead>
<tbody>
{% for part, pct in result.진척률.items() %}
  <tr>
    <td>{{ part }}</td>
    <td>{{ pct }}%</td>
    <td><div class="progress-bar"><div class="progress-fill" style="width: {{ pct }}%"></div></div></td>
  </tr>
{% endfor %}
</tbody>
</table>

<h2>파트별 핵심</h2>
{% for part, info in result.파트별_핵심.items() %}
<h3>{{ part }}</h3>
<table>
<tr><th>주요 성과</th><td><ul>{% for x in info.주요_성과 %}<li>{{ x }}</li>{% endfor %}</ul></td></tr>
<tr><th>주요 이슈</th><td><ul>{% for x in info.주요_이슈 %}<li>{{ x }}</li>{% endfor %}</ul></td></tr>
<tr><th>차주 계획</th><td><ul>{% for x in info.차주_계획 %}<li>{{ x }}</li>{% endfor %}</ul></td></tr>
<tr><th>리스크</th><td><ul>{% for x in info.리스크 %}<li>{{ x }}</li>{% endfor %}</ul></td></tr>
</table>
{% endfor %}

{% if result.주의사항 %}
<h2>주의사항</h2>
<ul>
{% for x in result.주의사항 %}
  <li>{{ x }}</li>
{% endfor %}
</ul>
{% endif %}

<p class="footnote">
  생성: {{ generated_at }} · /weekly v{{ weekly_version }} · placeholder design (TODO: replace with /design-consultation output)
</p>
</body>
</html>
```

- [ ] **Step 2: Write failing test**

```python
# skills/weekly/tests/test_template_dashboard.py
import importlib.util
from pathlib import Path
from scripts.lib.template_render import render_template


def _import_dashboard(tmp_path: Path):
    out = render_template(Path("skills/weekly/templates/src/dashboard.py.tmpl"), {})
    p = tmp_path / "dashboard.py"; p.write_text(out)
    spec = importlib.util.spec_from_file_location("dashboard", p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def test_render_dashboard_includes_summary(tmp_path: Path):
    dashboard = _import_dashboard(tmp_path)
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
        template_path=Path("skills/weekly/templates/template_dashboard.html.j2"),
    )
    assert "기획팀 주간보고 — 2026-W18" in html
    assert "이번 주 핵심 성과 요약입니다." in html
    assert "80%" in html


def test_render_marks_missing_parts(tmp_path: Path):
    dashboard = _import_dashboard(tmp_path)
    result = {
        "부서_종합_요약": "...",
        "파트별_핵심": {},
        "진척률": {},
        "미작성_파트": ["사업개발"],
        "주의사항": [],
    }
    html = dashboard.render_dashboard(
        result=result, dept_name="기획팀", week="2026-W18",
        template_path=Path("skills/weekly/templates/template_dashboard.html.j2"),
    )
    assert "사업개발" in html
    assert "미작성 파트" in html
```

- [ ] **Step 3: Run test (expect fail)**

Expected: FileNotFoundError on dashboard.py template.

- [ ] **Step 4: Write `dashboard.py.tmpl`**

```python
"""Dashboard renderer — Jinja2 + (Phase 0) inline CSS, no Chart.js yet.

Phase 0 ships a minimal placeholder template. Phase 1 wave will replace it
with the /design-consultation output.
"""
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from jinja2 import Template


def render_dashboard(
    result: Dict[str, Any],
    dept_name: str,
    week: str,
    template_path: Path,
    weekly_version: str = "0.1.0",
) -> str:
    """Render the dashboard HTML from a compile result dict."""
    tmpl = Template(template_path.read_text(encoding="utf-8"))
    return tmpl.render(
        result=result,
        dept_name=dept_name,
        week=week,
        generated_at=datetime.now().isoformat(timespec="seconds"),
        weekly_version=weekly_version,
    )
```

- [ ] **Step 5: Run test (expect pass)**

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add skills/weekly/templates/template_dashboard.html.j2 skills/weekly/templates/src/dashboard.py.tmpl skills/weekly/tests/test_template_dashboard.py
git commit -m "feat(weekly): dashboard renderer + placeholder template"
```

### Task 4.5: Mailer

**Files:**
- Create: `skills/weekly/templates/src/mailer.py.tmpl`
- Create: `skills/weekly/tests/test_template_mailer.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_template_mailer.py
import importlib.util
from pathlib import Path
from unittest.mock import MagicMock, patch
from scripts.lib.template_render import render_template


def _import(tmp_path: Path):
    out = render_template(Path("skills/weekly/templates/src/mailer.py.tmpl"), {})
    p = tmp_path / "mailer.py"; p.write_text(out)
    spec = importlib.util.spec_from_file_location("mailer", p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def test_send_with_to_cc_and_attachment(tmp_path: Path):
    mailer = _import(tmp_path)
    attach_path = tmp_path / "_dashboard.html"
    attach_path.write_text("<html>OK</html>", encoding="utf-8")
    smtp_inst = MagicMock()
    with patch("smtplib.SMTP") as smtp_cls:
        smtp_cls.return_value.__enter__.return_value = smtp_inst
        mailer.send_compile_mail(
            host="smtp.gmail.com", port=587, use_tls=True,
            user="op@example.com", password="pwd",
            sender="op@example.com",
            to=["lead@example.com"],
            cc=["p1@example.com", "p2@example.com"],
            subject="기획팀 주간보고 2026-W18",
            body_text="이번 주 보고 첨부합니다.",
            attachment_path=attach_path,
            attachment_name="_dashboard.html",
        )
    smtp_cls.assert_called_with("smtp.gmail.com", 587)
    smtp_inst.starttls.assert_called_once()
    smtp_inst.login.assert_called_once_with("op@example.com", "pwd")
    # Verify recipients = to + cc
    args, kwargs = smtp_inst.send_message.call_args
    msg = args[0]
    assert msg["To"] == "lead@example.com"
    assert msg["Cc"] == "p1@example.com, p2@example.com"
    assert msg["Subject"] == "기획팀 주간보고 2026-W18"
    # Attachment present
    payloads = list(msg.iter_attachments())
    assert len(payloads) == 1
    assert payloads[0].get_filename() == "_dashboard.html"
```

- [ ] **Step 2: Run test (expect fail)**

Expected: FileNotFoundError.

- [ ] **Step 3: Write `mailer.py.tmpl`**

```python
"""SMTP mailer — send compile-stage emails with cc + HTML attachment."""
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import List, Optional


def send_compile_mail(
    host: str,
    port: int,
    use_tls: bool,
    user: str,
    password: str,
    sender: str,
    to: List[str],
    cc: List[str],
    subject: str,
    body_text: str,
    attachment_path: Optional[Path] = None,
    attachment_name: Optional[str] = None,
) -> None:
    """Send a compile email. to = group lead, cc = part leads.

    Attaches `attachment_path` as `attachment_name` (default: file's basename).
    """
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = ", ".join(to)
    if cc:
        msg["Cc"] = ", ".join(cc)
    msg["Subject"] = subject
    msg.set_content(body_text)

    if attachment_path is not None:
        data = Path(attachment_path).read_bytes()
        name = attachment_name or Path(attachment_path).name
        msg.add_attachment(data, maintype="application", subtype="octet-stream", filename=name)

    recipients = list(to) + list(cc)
    with smtplib.SMTP(host, port) as smtp:
        if use_tls:
            smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(msg, from_addr=sender, to_addrs=recipients)
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/templates/src/mailer.py.tmpl skills/weekly/tests/test_template_mailer.py
git commit -m "feat(weekly): SMTP mailer with cc + attachment"
```

### Task 4.6: CLI entry (Phase 0: init + compile)

**Files:**
- Create: `skills/weekly/templates/src/__init__.py.tmpl`
- Create: `skills/weekly/templates/src/cli.py.tmpl`
- Create: `skills/weekly/tests/test_template_cli.py`

- [ ] **Step 1: Write `__init__.py.tmpl`**

```python
"""weekly_runtime — generated department project package."""
__version__ = "0.1.0"
```

- [ ] **Step 2: Write failing test**

```python
# skills/weekly/tests/test_template_cli.py
import importlib.util
from pathlib import Path
from unittest.mock import MagicMock, patch
from click.testing import CliRunner
from scripts.lib.template_render import render_template


def _import_cli(tmp_path: Path):
    # Minimal subset: just verify the cli module compiles and exposes commands.
    out = render_template(Path("skills/weekly/templates/src/cli.py.tmpl"), {})
    p = tmp_path / "cli.py"; p.write_text(out)
    spec = importlib.util.spec_from_file_location("cli", p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def test_cli_exposes_compile_command(tmp_path: Path):
    out = render_template(Path("skills/weekly/templates/src/cli.py.tmpl"), {})
    # syntactic check
    compile(out, "cli.py", "exec")
    assert "@cli.command" in out
    assert '"compile"' in out or "def compile" in out
    assert '"init"' in out or "def init" in out
```

- [ ] **Step 3: Run test (expect fail)**

Expected: FileNotFoundError.

- [ ] **Step 4: Write `cli.py.tmpl`**

```python
"""wreport — Click CLI for the generated weekly_runtime project.

Phase 0 commands: init (delegates to skill bundle re-run), compile.
Phase 1 will add: assign, status.
"""
import json
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import click

from .config import load_config
from .keyring_helper import get_secret
from .storage import LocalStorage
from .compiler import collect_parts, run_compile
from .dashboard import render_dashboard
from .mailer import send_compile_mail
from .llm_client import get_llm_client


@click.group()
def cli() -> None:
    """wreport — Weekly Report Automation Harness runtime CLI."""


@cli.command("init")
@click.argument("dept", type=str)
def init_cmd(dept: str) -> None:
    """Re-run the /weekly init pipeline.

    Phase 0 stub: prints a message instructing the user to invoke `/weekly init <dept>` via their CLI host (Claude Code/Codex/Gemini). The actual scaffold is in the skill bundle, not this binary.
    """
    click.echo(
        f"To initialize a new department, invoke `/weekly init {dept}` in your CLI host (Claude Code/Codex/Gemini).\n"
        "This binary (`wreport`) is for post-scaffold operations only.\n"
        "If you want to *re-scaffold* this department, ask the host CLI to re-run /weekly init."
    )


@cli.command("compile")
@click.argument("dept", type=str)
@click.option("--week", "week_str", type=str, default=None,
              help="ISO week, e.g. 2026-W18. Defaults to current week.")
@click.option("--config", "config_path", type=click.Path(path_type=Path), default=None,
              help="Path to config.yaml. Defaults to ./config.yaml from the project root.")
@click.option("--dry-run", is_flag=True, default=False,
              help="Generate dashboard but skip mail send.")
def compile_cmd(dept: str, week_str: Optional[str], config_path: Optional[Path], dry_run: bool) -> None:
    """Compile this week's reports → dashboard → email."""
    cfg_path = config_path or Path.cwd() / "config.yaml"
    cfg = load_config(cfg_path)
    if cfg.department.name != dept:
        click.echo(f"WARN: dept arg '{dept}' != config.department.name '{cfg.department.name}'", err=True)

    week = week_str or _current_iso_week()
    click.echo(f"Compiling {cfg.department.name} {week}...")

    storage = LocalStorage(root=Path(cfg.storage.root) / cfg.department.name)
    md_dir = Path(cfg.storage.root) / cfg.department.name / week

    parts_data = collect_parts(md_dir, cfg.department.parts)

    api_key = get_secret(f"weekly-{cfg.department.name}", "ai_api_key")
    import os
    if cfg.ai.provider == "codex":
        os.environ["OPENAI_API_KEY"] = api_key
    elif cfg.ai.provider == "anthropic":
        os.environ["ANTHROPIC_API_KEY"] = api_key
    elif cfg.ai.provider == "gemini":
        os.environ["GEMINI_API_KEY"] = api_key

    llm = get_llm_client(provider=cfg.ai.provider)

    # Resolve prompt template path: project ships it at weekly_runtime/prompts/
    prompt_path = Path(__file__).parent / "prompts" / "compile_system.txt"
    result = run_compile(
        llm=llm,
        dept_name=cfg.department.name,
        parts=cfg.department.parts,
        week=week,
        parts_data=parts_data,
        prompt_template_path=prompt_path,
    )

    # Resolve dashboard template path
    dashboard_tmpl = Path(__file__).parent / "templates" / "template_dashboard.html.j2"
    if not dashboard_tmpl.exists():
        # Fallback: look in project root
        dashboard_tmpl = Path.cwd() / "templates" / "template_dashboard.html.j2"
    html = render_dashboard(
        result=result,
        dept_name=cfg.department.name,
        week=week,
        template_path=dashboard_tmpl,
    )

    out_path = md_dir / "_dashboard.html"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    click.echo(f"Dashboard: {out_path}")

    if dry_run:
        click.echo("Dry run — skipping mail.")
        return

    smtp_password = get_secret(f"weekly-{cfg.department.name}", "smtp_password")
    cc = [pl.email for pl in cfg.part_leads]
    send_compile_mail(
        host=cfg.smtp.host,
        port=cfg.smtp.port,
        use_tls=cfg.smtp.use_tls,
        user=cfg.smtp.user,
        password=smtp_password,
        sender=cfg.smtp.user,
        to=[cfg.group_lead.email],
        cc=cc,
        subject=f"{cfg.department.name} 주간보고 {week}",
        body_text=(f"{cfg.department.name} {week} 보고 첨부합니다.\n\n"
                   f"종합 요약:\n{result.get('부서_종합_요약', '')}\n\n"
                   f"전체 내용은 첨부 _dashboard.html을 확인해주세요.\n\n"
                   f"미작성 파트: {', '.join(result.get('미작성_파트', [])) or '없음'}\n"),
        attachment_path=out_path,
        attachment_name="_dashboard.html",
    )
    click.echo("Mail sent.")


def _current_iso_week() -> str:
    iso_year, iso_week, _ = date.today().isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


if __name__ == "__main__":
    cli()
```

- [ ] **Step 5: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add skills/weekly/templates/src/__init__.py.tmpl skills/weekly/templates/src/cli.py.tmpl skills/weekly/tests/test_template_cli.py
git commit -m "feat(weekly): cli — init stub + compile end-to-end"
```

---

## Wave 5: Skill Bundle Scripts (Init Pipeline)

### Task 5.1: precheck

**Files:**
- Create: `skills/weekly/scripts/precheck.py`
- Create: `skills/weekly/tests/test_precheck.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_precheck.py
from scripts.precheck import precheck, PrecheckError


def test_precheck_python_version_ok(monkeypatch):
    # Should pass on the actual Python (>= 3.10)
    precheck(target_dir=None)


def test_precheck_existing_target_raises(monkeypatch, tmp_path):
    target = tmp_path / "weekly_test"
    target.mkdir()
    (target / "config.yaml").touch()
    import pytest
    with pytest.raises(PrecheckError, match="already exists"):
        precheck(target_dir=target)
```

- [ ] **Step 2: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 3: Write `precheck.py`**

```python
"""Stage 0: precheck — Python version, disk space, target dir conflict."""
import shutil
import sys
from pathlib import Path
from typing import Optional


class PrecheckError(RuntimeError):
    pass


def precheck(target_dir: Optional[Path], min_disk_gb: float = 0.1) -> None:
    """Verify environment is ready for /weekly init."""
    if sys.version_info < (3, 10):
        raise PrecheckError(f"Python 3.10+ required, found {sys.version}")

    if target_dir is not None and Path(target_dir).exists() and any(Path(target_dir).iterdir()):
        raise PrecheckError(
            f"Target directory {target_dir} already exists and is not empty. "
            "To re-init, remove it first or use a different department name."
        )

    home = Path.home()
    disk_free_gb = shutil.disk_usage(home).free / (1024 ** 3)
    if disk_free_gb < min_disk_gb:
        raise PrecheckError(f"Need at least {min_disk_gb} GB free, only {disk_free_gb:.2f} GB.")
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/precheck.py skills/weekly/tests/test_precheck.py
git commit -m "feat(weekly): stage 0 precheck — python/disk/dir conflict"
```

### Task 5.2: scope (interactive Q&A)

**Files:**
- Create: `skills/weekly/scripts/scope.py`
- Create: `skills/weekly/tests/test_scope.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_scope.py
from io import StringIO
from scripts.scope import collect_scope, ScopeAnswers


def test_collect_scope_basic(monkeypatch):
    inputs = iter([
        "기획팀",                    # dept name
        "전략기획,사업개발,운영",    # parts (comma-separated)
        "홍길동",                    # group lead name
        "lead@example.com",          # group lead email
        "김파트,이파트,박파트",      # part lead names
        "p1@example.com,p2@example.com,p3@example.com",  # part lead emails
        "local",                     # storage type
        "C:/weekly-test",            # storage root
        "smtp.gmail.com",            # smtp host
        "587",                       # smtp port
        "y",                         # use_tls
        "op@example.com",            # smtp user
        "op-password",               # smtp password
        "codex",                     # ai provider
        "fake-openai-key",           # ai api key
    ])
    monkeypatch.setattr("builtins.input", lambda prompt="": next(inputs))
    answers = collect_scope()
    assert answers.dept_name == "기획팀"
    assert answers.parts == ["전략기획", "사업개발", "운영"]
    assert len(answers.part_leads) == 3
    assert answers.smtp_user == "op@example.com"
    assert answers.ai_provider == "codex"
    assert answers.smtp_password == "op-password"
    assert answers.ai_api_key == "fake-openai-key"
```

- [ ] **Step 2: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 3: Write `scope.py`**

```python
"""Stage 1: scope — interactive Q&A to collect department metadata."""
from dataclasses import dataclass, field
from typing import List


@dataclass
class PartLeadAnswer:
    part: str
    name: str
    email: str


@dataclass
class ScopeAnswers:
    dept_name: str
    parts: List[str]
    group_lead_name: str
    group_lead_email: str
    part_leads: List[PartLeadAnswer] = field(default_factory=list)
    storage_type: str = "local"
    storage_root: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_use_tls: bool = True
    smtp_user: str = ""
    smtp_password: str = ""
    ai_provider: str = "codex"
    ai_api_key: str = ""


def _prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    val = input(f"{label}{suffix}: ").strip()
    return val if val else default


def collect_scope() -> ScopeAnswers:
    """Walk the user through the 15-ish required inputs."""
    dept = _prompt("부서명")
    parts_raw = _prompt("파트 목록 (쉼표 구분)")
    parts = [p.strip() for p in parts_raw.split(",") if p.strip()]

    gl_name = _prompt("그룹장 이름")
    gl_email = _prompt("그룹장 이메일")

    pl_names_raw = _prompt(f"파트장 이름 (쉼표 구분, {len(parts)}개)")
    pl_emails_raw = _prompt(f"파트장 이메일 (쉼표 구분, {len(parts)}개)")
    pl_names = [n.strip() for n in pl_names_raw.split(",")]
    pl_emails = [e.strip() for e in pl_emails_raw.split(",")]
    if not (len(pl_names) == len(pl_emails) == len(parts)):
        raise ValueError("파트장 이름/이메일 수가 파트 수와 일치하지 않습니다.")
    part_leads = [
        PartLeadAnswer(part=parts[i], name=pl_names[i], email=pl_emails[i])
        for i in range(len(parts))
    ]

    st_type = _prompt("Storage type", "local")
    st_root = _prompt("Storage root", "C:/weekly-test")

    smtp_host = _prompt("SMTP host", "smtp.gmail.com")
    smtp_port = int(_prompt("SMTP port", "587"))
    smtp_tls_raw = _prompt("Use TLS? (y/n)", "y")
    smtp_use_tls = smtp_tls_raw.lower().startswith("y")
    smtp_user = _prompt("SMTP user (이메일)")
    smtp_password = _prompt("SMTP password (앱 비밀번호)")

    ai_provider = _prompt("AI provider (codex/anthropic/gemini)", "codex")
    ai_api_key = _prompt(f"AI API key for {ai_provider}")

    return ScopeAnswers(
        dept_name=dept,
        parts=parts,
        group_lead_name=gl_name,
        group_lead_email=gl_email,
        part_leads=part_leads,
        storage_type=st_type,
        storage_root=st_root,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_use_tls=smtp_use_tls,
        smtp_user=smtp_user,
        smtp_password=smtp_password,
        ai_provider=ai_provider,
        ai_api_key=ai_api_key,
    )
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/scope.py skills/weekly/tests/test_scope.py
git commit -m "feat(weekly): stage 1 scope — interactive Q&A"
```

### Task 5.3: scaffold (create dirs + venv + install)

**Files:**
- Create: `skills/weekly/scripts/scaffold.py`
- Create: `skills/weekly/tests/test_scaffold.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_scaffold.py
from pathlib import Path
from scripts.scaffold import scaffold_project


def test_scaffold_creates_expected_files(tmp_path: Path):
    target = tmp_path / "weekly_test"
    bundle_root = Path("skills/weekly")
    scaffold_project(target=target, dept_slug="test", dept_name="테스트팀", bundle_root=bundle_root, install_pkg=False)
    assert (target / "weekly_runtime" / "cli.py").exists()
    assert (target / "weekly_runtime" / "config.py").exists()
    assert (target / "weekly_runtime" / "storage" / "local.py").exists()
    assert (target / "weekly_runtime" / "_llm.py").exists()  # copied from scripts/lib/llm_call.py
    assert (target / "weekly_runtime" / "templates" / "template_dashboard.html.j2").exists()
    assert (target / "weekly_runtime" / "prompts" / "compile_system.txt").exists()
    assert (target / "pyproject.toml").exists()
    assert (target / ".gitignore").exists()
    assert (target / "README.md").exists()
```

- [ ] **Step 2: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 3: Write `scaffold.py`**

```python
"""Stage 2: scaffold — create ~/weekly/<dept>/ + venv + install package + copy templates."""
import shutil
import subprocess
import sys
from pathlib import Path

from scripts.lib.template_render import render_template


def scaffold_project(
    target: Path,
    dept_slug: str,
    dept_name: str,
    bundle_root: Path,
    install_pkg: bool = True,
) -> None:
    """Create the project tree at `target` from skill bundle templates."""
    target.mkdir(parents=True, exist_ok=True)

    # 1. Render top-level files
    for tmpl_name, out_name in [
        ("pyproject.toml.tmpl", "pyproject.toml"),
        ("requirements.txt.tmpl", "requirements.txt"),
        (".gitignore.tmpl", ".gitignore"),
    ]:
        tmpl = bundle_root / "templates" / tmpl_name
        rendered = render_template(tmpl, {"dept_slug": dept_slug, "dept_name": dept_name})
        (target / out_name).write_text(rendered, encoding="utf-8")

    # 2. Build weekly_runtime package
    pkg = target / "weekly_runtime"
    pkg.mkdir(parents=True, exist_ok=True)
    src_root = bundle_root / "templates" / "src"
    for src_tmpl in src_root.rglob("*.tmpl"):
        rel = src_tmpl.relative_to(src_root)
        out_path = pkg / rel.with_suffix("")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        rendered = render_template(src_tmpl, {"dept_slug": dept_slug, "dept_name": dept_name})
        out_path.write_text(rendered, encoding="utf-8")

    # 3. Copy lib/llm_call.py → weekly_runtime/_llm.py (so project doesn't depend on skill bundle)
    llm_src = bundle_root / "scripts" / "lib" / "llm_call.py"
    (pkg / "_llm.py").write_text(llm_src.read_text(encoding="utf-8"), encoding="utf-8")

    # 4. Copy dashboard + part templates into the package (so resolution at runtime works)
    pkg_templates = pkg / "templates"
    pkg_templates.mkdir(parents=True, exist_ok=True)
    shutil.copy(bundle_root / "templates" / "template_dashboard.html.j2", pkg_templates / "template_dashboard.html.j2")
    if (bundle_root / "templates" / "template_part.md.j2").exists():
        shutil.copy(bundle_root / "templates" / "template_part.md.j2", pkg_templates / "template_part.md.j2")

    # 5. Render prompt template (compile_system) into the package
    pkg_prompts = pkg / "prompts"
    pkg_prompts.mkdir(parents=True, exist_ok=True)
    prompt_tmpl = bundle_root / "templates" / "src" / "prompts" / "compile_system.txt.tmpl"
    if prompt_tmpl.exists():
        # NOTE: at scaffold time we render with empty ctx; final render happens at compile time.
        # Just copy the .tmpl literal so compiler.py can render with real ctx.
        (pkg_prompts / "compile_system.txt").write_text(
            prompt_tmpl.read_text(encoding="utf-8"), encoding="utf-8"
        )

    # 6. README
    readme_tmpl = bundle_root / "templates" / "README.md.tmpl"
    if readme_tmpl.exists():
        rendered = render_template(readme_tmpl, {"dept_slug": dept_slug, "dept_name": dept_name})
        (target / "README.md").write_text(rendered, encoding="utf-8")
    else:
        (target / "README.md").write_text(f"# weekly_runtime — {dept_name}\n\nGenerated by /weekly init.\n", encoding="utf-8")

    # 7. Create venv + install
    if install_pkg:
        subprocess.run([sys.executable, "-m", "venv", str(target / "venv")], check=True)
        venv_python = target / "venv" / ("Scripts" if sys.platform == "win32" else "bin") / "python"
        subprocess.run([str(venv_python), "-m", "pip", "install", "-e", str(target)], check=True)
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/scaffold.py skills/weekly/tests/test_scaffold.py
git commit -m "feat(weekly): stage 2 scaffold — render templates + copy llm + (opt) venv install"
```

### Task 5.4: config_setup

**Files:**
- Create: `skills/weekly/scripts/config_setup.py`
- Create: `skills/weekly/templates/config.yaml.tmpl`
- Create: `skills/weekly/tests/test_config_setup.py`

- [ ] **Step 1: Write `config.yaml.tmpl`**

```yaml
department:
  name: "{{ dept_name }}"
  parts:
{% for p in parts %}    - "{{ p }}"
{% endfor %}
group_lead:
  name: "{{ group_lead_name }}"
  email: "{{ group_lead_email }}"
part_leads:
{% for pl in part_leads %}  - part: "{{ pl.part }}"
    name: "{{ pl.name }}"
    email: "{{ pl.email }}"
{% endfor %}
storage:
  type: "{{ storage_type }}"
  root: "{{ storage_root }}"
schedule:
  assign_cron: "{{ assign_cron | default('0 * * * *') }}"
  compile_cron: "{{ compile_cron | default('0 17 * * 5') }}"
  timezone: "{{ timezone | default('Asia/Seoul') }}"
smtp:
  host: "{{ smtp_host }}"
  port: {{ smtp_port }}
  use_tls: {{ smtp_use_tls | lower }}
  user: "{{ smtp_user }}"
ai:
  provider: "{{ ai_provider }}"
  model_assign: "{{ model_assign | default('gpt-5') }}"
  model_compile: "{{ model_compile | default('gpt-5') }}"
prompts:
  override_dir: null
```

- [ ] **Step 2: Write failing test**

```python
# skills/weekly/tests/test_config_setup.py
from pathlib import Path
import yaml
from scripts.config_setup import write_config
from scripts.scope import ScopeAnswers, PartLeadAnswer


def test_write_config_produces_valid_yaml(tmp_path: Path):
    answers = ScopeAnswers(
        dept_name="기획팀",
        parts=["전략기획", "사업개발"],
        group_lead_name="홍길동",
        group_lead_email="lead@example.com",
        part_leads=[
            PartLeadAnswer(part="전략기획", name="김파트", email="p1@example.com"),
            PartLeadAnswer(part="사업개발", name="이파트", email="p2@example.com"),
        ],
        storage_type="local",
        storage_root=str(tmp_path / "store"),
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        smtp_use_tls=True,
        smtp_user="op@example.com",
        smtp_password="...",
        ai_provider="codex",
        ai_api_key="...",
    )
    target = tmp_path / "project"
    target.mkdir()
    bundle_root = Path("skills/weekly")
    write_config(answers, target=target, bundle_root=bundle_root)
    cfg_path = target / "config.yaml"
    data = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))
    assert data["department"]["name"] == "기획팀"
    assert data["department"]["parts"] == ["전략기획", "사업개발"]
    assert len(data["part_leads"]) == 2
    assert data["smtp"]["host"] == "smtp.gmail.com"
    assert "password" not in data["smtp"]  # password stays in keyring
```

- [ ] **Step 3: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 4: Write `config_setup.py`**

```python
"""Stage 3: config_setup — write config.yaml from scope answers."""
from pathlib import Path

from scripts.lib.template_render import render_template
from scripts.scope import ScopeAnswers


def write_config(answers: ScopeAnswers, target: Path, bundle_root: Path) -> None:
    """Write config.yaml at `target/config.yaml` from scope answers."""
    tmpl = bundle_root / "templates" / "config.yaml.tmpl"
    ctx = {
        "dept_name": answers.dept_name,
        "parts": answers.parts,
        "group_lead_name": answers.group_lead_name,
        "group_lead_email": answers.group_lead_email,
        "part_leads": [
            {"part": pl.part, "name": pl.name, "email": pl.email}
            for pl in answers.part_leads
        ],
        "storage_type": answers.storage_type,
        "storage_root": answers.storage_root,
        "smtp_host": answers.smtp_host,
        "smtp_port": answers.smtp_port,
        "smtp_use_tls": "true" if answers.smtp_use_tls else "false",
        "smtp_user": answers.smtp_user,
        "ai_provider": answers.ai_provider,
    }
    rendered = render_template(tmpl, ctx)
    (target / "config.yaml").write_text(rendered, encoding="utf-8")
```

- [ ] **Step 5: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add skills/weekly/scripts/config_setup.py skills/weekly/templates/config.yaml.tmpl skills/weekly/tests/test_config_setup.py
git commit -m "feat(weekly): stage 3 config_setup — write config.yaml"
```

### Task 5.5: xlsx_template — generate `_지시사항.xlsx`

**Files:**
- Create: `skills/weekly/scripts/xlsx_template.py`
- Create: `skills/weekly/tests/test_xlsx_template.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_xlsx_template.py
from pathlib import Path
from openpyxl import load_workbook
from scripts.xlsx_template import generate_xlsx


def test_generate_xlsx_has_headers(tmp_path: Path):
    out = tmp_path / "_지시사항.xlsx"
    generate_xlsx(out_path=out, dept_name="기획팀", parts=["전략기획", "사업개발"])
    assert out.exists()
    wb = load_workbook(out, read_only=False)
    ws = wb.active
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    assert headers == ["일자", "지시내용", "담당파트", "우선순위", "마감", "비고"]


def test_generate_xlsx_has_part_dropdown(tmp_path: Path):
    out = tmp_path / "_지시사항.xlsx"
    generate_xlsx(out_path=out, dept_name="기획팀", parts=["전략기획", "사업개발"])
    wb = load_workbook(out)
    ws = wb.active
    # openpyxl exposes data validations on the worksheet
    dvs = ws.data_validations.dataValidation
    formulas = [dv.formula1 for dv in dvs]
    # At least one DV references our parts (formula contains them)
    assert any("전략기획" in f and "사업개발" in f for f in formulas)
```

- [ ] **Step 2: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 3: Write `xlsx_template.py`**

```python
"""Stage 4: xlsx_template — generate `_지시사항.xlsx` with headers + dropdowns."""
from pathlib import Path
from typing import List

from openpyxl import Workbook
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation


HEADERS = ["일자", "지시내용", "담당파트", "우선순위", "마감", "비고"]
PRIORITIES = ["높음", "보통", "낮음"]


def generate_xlsx(out_path: Path, dept_name: str, parts: List[str]) -> None:
    """Create the standard `_지시사항.xlsx` with headers + dropdowns."""
    wb = Workbook()
    ws = wb.active
    ws.title = f"{dept_name} 지시사항"
    ws.append(HEADERS)

    # 담당파트 dropdown (column C, rows 2-1000)
    parts_formula = '"' + ",".join(parts) + '"'
    dv_part = DataValidation(type="list", formula1=parts_formula, allow_blank=True)
    dv_part.add(f"C2:C1000")
    ws.add_data_validation(dv_part)

    # 우선순위 dropdown (column D)
    pri_formula = '"' + ",".join(PRIORITIES) + '"'
    dv_pri = DataValidation(type="list", formula1=pri_formula, allow_blank=True)
    dv_pri.add(f"D2:D1000")
    ws.add_data_validation(dv_pri)

    # Column widths
    widths = {"A": 12, "B": 50, "C": 14, "D": 10, "E": 12, "F": 30}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    # Header style: bold + fill
    from openpyxl.styles import Font, PatternFill
    header_font = Font(bold=True)
    header_fill = PatternFill("solid", fgColor="F5F3F0")
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill

    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/xlsx_template.py skills/weekly/tests/test_xlsx_template.py
git commit -m "feat(weekly): stage 4 xlsx_template — instructions.xlsx with dropdowns"
```

### Task 5.6: keyring_setup

**Files:**
- Create: `skills/weekly/scripts/keyring_setup.py`
- Create: `skills/weekly/tests/test_keyring_setup.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_keyring_setup.py
import keyring
from scripts.keyring_setup import save_secrets
from scripts.scope import ScopeAnswers, PartLeadAnswer


class _FakeBackend(keyring.backend.KeyringBackend):
    priority = 1
    def __init__(self): self._store = {}
    def set_password(self, service, username, password): self._store[(service, username)] = password
    def get_password(self, service, username): return self._store.get((service, username))
    def delete_password(self, service, username): del self._store[(service, username)]


def test_save_secrets_stores_smtp_and_ai():
    backend = _FakeBackend()
    keyring.set_keyring(backend)
    answers = ScopeAnswers(
        dept_name="기획팀", parts=["전략기획"],
        group_lead_name="x", group_lead_email="x@e.com",
        part_leads=[PartLeadAnswer(part="전략기획", name="x", email="x@e.com")],
        storage_type="local", storage_root="/tmp",
        smtp_host="smtp.example.com", smtp_port=587, smtp_use_tls=True,
        smtp_user="op@e.com", smtp_password="my-smtp-pwd",
        ai_provider="codex", ai_api_key="my-ai-key",
    )
    save_secrets(answers)
    assert keyring.get_password("weekly-기획팀", "smtp_password") == "my-smtp-pwd"
    assert keyring.get_password("weekly-기획팀", "ai_api_key") == "my-ai-key"
```

- [ ] **Step 2: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 3: Write `keyring_setup.py`**

```python
"""Stage 5: keyring_setup — store SMTP password + AI API key."""
import keyring

from scripts.scope import ScopeAnswers


def save_secrets(answers: ScopeAnswers) -> None:
    """Store SMTP password + AI API key in OS keyring under `weekly-<dept>`."""
    service = f"weekly-{answers.dept_name}"
    keyring.set_password(service, "smtp_password", answers.smtp_password)
    keyring.set_password(service, "ai_api_key", answers.ai_api_key)
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/keyring_setup.py skills/weekly/tests/test_keyring_setup.py
git commit -m "feat(weekly): stage 5 keyring_setup — store SMTP + AI secrets"
```

### Task 5.7: smtp_test — send test mail

**Files:**
- Create: `skills/weekly/scripts/smtp_test.py`
- Create: `skills/weekly/tests/test_smtp_test.py`

- [ ] **Step 1: Write failing test**

```python
# skills/weekly/tests/test_smtp_test.py
from unittest.mock import patch, MagicMock
from scripts.smtp_test import send_test_mail


def test_send_test_mail_calls_smtp():
    smtp_inst = MagicMock()
    with patch("smtplib.SMTP") as smtp_cls:
        smtp_cls.return_value.__enter__.return_value = smtp_inst
        send_test_mail(
            host="smtp.gmail.com", port=587, use_tls=True,
            user="op@example.com", password="pwd",
            to="lead@example.com", dept_name="기획팀",
        )
    smtp_cls.assert_called_with("smtp.gmail.com", 587)
    smtp_inst.starttls.assert_called_once()
    smtp_inst.login.assert_called_once_with("op@example.com", "pwd")
    smtp_inst.send_message.assert_called_once()
```

- [ ] **Step 2: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 3: Write `smtp_test.py`**

```python
"""Stage 6: smtp_test — send a test mail to the group lead."""
import smtplib
from email.message import EmailMessage


def send_test_mail(
    host: str,
    port: int,
    use_tls: bool,
    user: str,
    password: str,
    to: str,
    dept_name: str,
) -> None:
    """Send a one-line confirmation mail to verify SMTP works."""
    msg = EmailMessage()
    msg["From"] = user
    msg["To"] = to
    msg["Subject"] = f"[/weekly] {dept_name} SMTP 테스트"
    msg.set_content(
        f"이 메일은 /weekly init이 발송한 SMTP 연결 테스트 메일입니다.\n"
        f"부서: {dept_name}\n"
        f"발신: {user}\n"
        f"수신: {to}\n"
        f"이 메일이 도착했다면 SMTP 설정이 올바릅니다."
    )
    with smtplib.SMTP(host, port) as smtp:
        if use_tls:
            smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(msg)
```

- [ ] **Step 4: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add skills/weekly/scripts/smtp_test.py skills/weekly/tests/test_smtp_test.py
git commit -m "feat(weekly): stage 6 smtp_test — verify SMTP credentials"
```

### Task 5.8: handoff — README + summary

**Files:**
- Create: `skills/weekly/scripts/handoff.py`
- Create: `skills/weekly/templates/README.md.tmpl`
- Create: `skills/weekly/tests/test_handoff.py`

- [ ] **Step 1: Write `README.md.tmpl`**

```markdown
# {{ dept_name }} 주간보고 자동화

이 프로젝트는 `/weekly init {{ dept_name }}`이 생성한 standalone 주간보고 자동화 워크스페이스입니다.

## 주요 명령

활성화 (Windows):
```
cd {{ project_path }}
.venv\Scripts\activate
```

수동 컴파일 (Phase 0):
```
wreport compile {{ dept_name }} --week=2026-W18
```

이번 주 컴파일:
```
wreport compile {{ dept_name }}
```

Dry run (메일 안 보내고 dashboard만):
```
wreport compile {{ dept_name }} --dry-run
```

## 폴더 구조

- `weekly_runtime/` — Python 패키지 (변경 금지, 스킬이 생성)
- `config.yaml` — 부서 메타 (수동 편집 가능)
- `venv/` — 가상환경
- 데이터 위치: `{{ storage_root }}/{{ dept_name }}/`
  - `_지시사항.xlsx` — 그룹장이 평일 수시로 편집
  - `YYYY-Www/<파트>.md` — 파트장이 작성
  - `YYYY-Www/_dashboard.html` — compile 결과

## 트러블슈팅

- SMTP 인증 오류 → keyring 비밀번호 갱신: `python -c "import keyring; keyring.set_password('weekly-{{ dept_name }}', 'smtp_password', 'NEW')"`
- AI API 한도 → config.yaml의 `ai.provider`를 다른 값으로 변경 + 새 키를 keyring에 저장
- 컴파일 결과가 부정확 → `_지시사항.xlsx`와 `<파트>.md`의 표현을 더 명확히

## Phase 1 (예정)

- assign cron (매시 정시): `_지시사항.xlsx` 변경 자동 분배
- compile cron (config 시점): 자동 컴파일
- status 명령: 작성 진척 확인
```

- [ ] **Step 2: Write failing test**

```python
# skills/weekly/tests/test_handoff.py
from pathlib import Path
from scripts.handoff import generate_readme


def test_generate_readme(tmp_path: Path):
    target = tmp_path / "project"; target.mkdir()
    bundle_root = Path("skills/weekly")
    generate_readme(
        target=target,
        bundle_root=bundle_root,
        dept_name="기획팀",
        project_path=str(target),
        storage_root="C:/weekly-test",
    )
    readme = (target / "README.md").read_text(encoding="utf-8")
    assert "기획팀 주간보고 자동화" in readme
    assert "wreport compile 기획팀" in readme
```

- [ ] **Step 3: Run test (expect fail)**

Expected: ImportError.

- [ ] **Step 4: Write `handoff.py`**

```python
"""Stage 8: handoff — generate README.md + final summary."""
from pathlib import Path

from scripts.lib.template_render import render_template


def generate_readme(target: Path, bundle_root: Path, dept_name: str, project_path: str, storage_root: str) -> None:
    """Render README.md from template."""
    tmpl = bundle_root / "templates" / "README.md.tmpl"
    rendered = render_template(tmpl, {
        "dept_name": dept_name,
        "project_path": project_path,
        "storage_root": storage_root,
    })
    (target / "README.md").write_text(rendered, encoding="utf-8")


def print_summary(target: Path, dept_name: str, storage_root: str) -> str:
    """Return a human-readable summary string."""
    return (
        f"\n=== /weekly init {dept_name} 완료 ===\n\n"
        f"프로젝트: {target}\n"
        f"공유폴더: {storage_root}/{dept_name}/\n"
        f"엑셀 양식: {storage_root}/{dept_name}/_지시사항.xlsx\n\n"
        f"다음 단계:\n"
        f"  1. {storage_root}/{dept_name}/_지시사항.xlsx 에 row 몇 개 입력\n"
        f"  2. {storage_root}/{dept_name}/2026-Wxx/<파트>.md 파일에 성과/이슈/차주계획 작성\n"
        f"  3. cd {target} && .venv/Scripts/wreport compile {dept_name} --week=2026-Wxx\n"
        f"  4. 그룹장 메일에서 _dashboard.html 첨부 메일 확인\n\n"
        f"Phase 1 (cron 자동화)은 별도 플랜으로 진행됩니다.\n"
    )
```

- [ ] **Step 5: Run test (expect pass)**

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add skills/weekly/scripts/handoff.py skills/weekly/templates/README.md.tmpl skills/weekly/tests/test_handoff.py
git commit -m "feat(weekly): stage 8 handoff — README + summary"
```

---

## Wave 6: End-to-End Integration Test

### Task 6.1: e2e — init pipeline through compile (no live SMTP/AI)

**Files:**
- Create: `skills/weekly/tests/test_e2e_init_to_compile.py`

- [ ] **Step 1: Write the integration test**

```python
# skills/weekly/tests/test_e2e_init_to_compile.py
"""
End-to-end: programmatically run all stages with mocked LLM + mocked SMTP,
and verify a dashboard HTML lands at the expected path.
"""
import json
import os
import shutil
from pathlib import Path
from unittest.mock import MagicMock, patch
import keyring
import pytest

from scripts.precheck import precheck
from scripts.scope import ScopeAnswers, PartLeadAnswer
from scripts.scaffold import scaffold_project
from scripts.config_setup import write_config
from scripts.xlsx_template import generate_xlsx
from scripts.keyring_setup import save_secrets


class _FakeBackend(keyring.backend.KeyringBackend):
    priority = 1
    def __init__(self): self._store = {}
    def set_password(self, s, u, p): self._store[(s, u)] = p
    def get_password(self, s, u): return self._store.get((s, u))
    def delete_password(self, s, u): del self._store[(s, u)]


@pytest.fixture
def fake_keyring():
    keyring.set_keyring(_FakeBackend())
    yield


def test_init_to_compile_e2e(tmp_path: Path, fake_keyring, monkeypatch):
    bundle_root = Path("skills/weekly").resolve()
    project_root = tmp_path / "weekly_test_project"
    storage_root = tmp_path / "weekly-test-data"

    answers = ScopeAnswers(
        dept_name="테스트팀",
        parts=["전략기획", "사업개발"],
        group_lead_name="홍길동",
        group_lead_email="lead@example.com",
        part_leads=[
            PartLeadAnswer(part="전략기획", name="김파트", email="p1@example.com"),
            PartLeadAnswer(part="사업개발", name="이파트", email="p2@example.com"),
        ],
        storage_type="local",
        storage_root=str(storage_root),
        smtp_host="smtp.example.com", smtp_port=587, smtp_use_tls=True,
        smtp_user="op@example.com", smtp_password="pwd",
        ai_provider="codex", ai_api_key="fake-openai-key",
    )

    # Stage 0: precheck
    precheck(target_dir=project_root)

    # Stage 2: scaffold (skip venv install in tests)
    scaffold_project(
        target=project_root, dept_slug="테스트팀_slug",
        dept_name="테스트팀", bundle_root=bundle_root, install_pkg=False,
    )

    # Stage 3: config
    write_config(answers, target=project_root, bundle_root=bundle_root)

    # Stage 4: xlsx
    dept_data_root = storage_root / "테스트팀"
    generate_xlsx(out_path=dept_data_root / "_지시사항.xlsx", dept_name="테스트팀", parts=answers.parts)

    # Stage 5: keyring
    save_secrets(answers)

    # Set OPENAI_API_KEY so llm_client can load (we'll mock its actual call)
    monkeypatch.setenv("OPENAI_API_KEY", "fake-openai-key")

    # Now simulate `wreport compile` directly by importing the rendered files
    # Manually populate <파트>.md fixtures
    week = "2026-W18"
    week_dir = dept_data_root / week
    week_dir.mkdir(parents=True, exist_ok=True)
    (week_dir / "전략기획.md").write_text("# 전략기획\n\n## 성과\n- 시장조사 완료\n", encoding="utf-8")
    (week_dir / "사업개발.md").write_text("# 사업개발\n\n## 성과\n- 미팅 1건\n", encoding="utf-8")

    # Import compile_cmd from the rendered package
    import importlib.util
    pkg_init = project_root / "weekly_runtime" / "__init__.py"
    cli_path = project_root / "weekly_runtime" / "cli.py"

    # Patch LLMClient.call + smtplib.SMTP across the test
    fake_compile_result = {
        "부서_종합_요약": "이번 주 전반적으로 정상 진행",
        "파트별_핵심": {
            "전략기획": {"주요_성과": ["시장조사"], "주요_이슈": [], "차주_계획": [], "리스크": []},
            "사업개발": {"주요_성과": ["미팅"], "주요_이슈": [], "차주_계획": [], "리스크": []},
        },
        "진척률": {"전략기획": 80, "사업개발": 60},
        "미작성_파트": [],
        "주의사항": [],
    }

    with patch("smtplib.SMTP") as smtp_cls:
        smtp_inst = MagicMock()
        smtp_cls.return_value.__enter__.return_value = smtp_inst

        # Set up sys.path so `from .config import ...` works on the rendered file
        import sys
        sys.path.insert(0, str(project_root))
        try:
            # Patch LLMClient.call before importing cli
            with patch("weekly_runtime._llm.LLMClient.call", return_value=json.dumps(fake_compile_result)):
                from click.testing import CliRunner
                # Re-import to apply the patch
                import importlib
                if "weekly_runtime.cli" in sys.modules:
                    del sys.modules["weekly_runtime.cli"]
                from weekly_runtime.cli import cli as wreport_cli
                runner = CliRunner()
                result = runner.invoke(
                    wreport_cli,
                    ["compile", "테스트팀", "--week", week, "--config", str(project_root / "config.yaml")],
                )
        finally:
            sys.path.remove(str(project_root))

    assert result.exit_code == 0, result.output
    dashboard_path = week_dir / "_dashboard.html"
    assert dashboard_path.exists()
    html = dashboard_path.read_text(encoding="utf-8")
    assert "테스트팀 주간보고 — 2026-W18" in html
    assert "이번 주 전반적으로 정상 진행" in html
    # SMTP send was called
    assert smtp_inst.send_message.called
```

- [ ] **Step 2: Run test (expect pass)**

```bash
cd skills/weekly && .venv/Scripts/python -m pytest tests/test_e2e_init_to_compile.py -v
```

Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add skills/weekly/tests/test_e2e_init_to_compile.py
git commit -m "test(weekly): e2e init→compile with mocked LLM + SMTP"
```

---

## Wave 7: Skill Bundle Smoke Test

### Task 7.1: All-tests run

- [ ] **Step 1: Run full suite**

```bash
cd skills/weekly && .venv/Scripts/python -m pytest -v
```

Expected: All tests passing. Approximate count: ~25-30 tests across:
- test_lib_platform_detect (4)
- test_lib_template_render (2)
- test_lib_llm_call (5)
- test_lib_telegram (1)
- test_template_config (2)
- test_template_storage_local (2)
- test_template_keyring_helper (2)
- test_template_llm_client (1)
- test_template_excel (3)
- test_template_compiler (2)
- test_template_dashboard (2)
- test_template_mailer (1)
- test_template_cli (1)
- test_precheck (2)
- test_scope (1)
- test_scaffold (1)
- test_config_setup (1)
- test_xlsx_template (2)
- test_keyring_setup (1)
- test_smtp_test (1)
- test_handoff (1)
- test_e2e_init_to_compile (1)

Total target: 36 tests.

- [ ] **Step 2: If any fails, fix in-place + commit per fix.**

### Task 7.2: Tag intermediate milestone

- [ ] **Step 1: Tag**

```bash
git tag weekly-phase0-skill-bundle-complete
```

---

## Wave 8: Dogfood Validation (Manual)

This wave is *manual* — user runs the commands on their actual PC. Tests above already cover the code paths; this validates the skill *as installed* and the live SMTP + LLM.

### Task 8.1: Install skill bundle

- [ ] **Step 1: Copy bundle to ~/.claude/skills/**

```bash
cp -r skills/weekly ~/.claude/skills/weekly
```

(macOS / Linux paths are similar; Windows: `~/.claude/skills/` resolves to `%USERPROFILE%\.claude\skills\`.)

- [ ] **Step 2: Verify discovery**

In Claude Code, run `/help` and verify `/weekly` appears in the slash command list.

### Task 8.2: Dry-run init pipeline (without /weekly slash, just the script driver)

Until we wire the SKILL.md prose to actually orchestrate the 9 stages (this plan only scaffolds the bundle), use the bundle's scripts directly:

- [ ] **Step 1: Write a one-shot driver**

```python
# /tmp/run_init.py (or any throwaway script)
import sys
from pathlib import Path
sys.path.insert(0, "C:/Users/<you>/.claude/skills/weekly")

from scripts.precheck import precheck
from scripts.scope import collect_scope
from scripts.scaffold import scaffold_project
from scripts.config_setup import write_config
from scripts.xlsx_template import generate_xlsx
from scripts.keyring_setup import save_secrets
from scripts.smtp_test import send_test_mail
from scripts.handoff import generate_readme, print_summary

bundle_root = Path("C:/Users/<you>/.claude/skills/weekly")
home = Path.home()

target = home / "weekly" / "기획팀"
precheck(target_dir=target)
answers = collect_scope()  # interactive prompt
scaffold_project(target=target, dept_slug="기획팀", dept_name=answers.dept_name,
                 bundle_root=bundle_root, install_pkg=True)
write_config(answers, target=target, bundle_root=bundle_root)
generate_xlsx(
    out_path=Path(answers.storage_root) / answers.dept_name / "_지시사항.xlsx",
    dept_name=answers.dept_name, parts=answers.parts,
)
save_secrets(answers)
send_test_mail(
    host=answers.smtp_host, port=answers.smtp_port, use_tls=answers.smtp_use_tls,
    user=answers.smtp_user, password=answers.smtp_password,
    to=answers.group_lead_email, dept_name=answers.dept_name,
)
generate_readme(
    target=target, bundle_root=bundle_root,
    dept_name=answers.dept_name, project_path=str(target),
    storage_root=answers.storage_root,
)
print(print_summary(target, answers.dept_name, answers.storage_root))
```

Run it. Walk through the prompts.

- [ ] **Step 2: Verify**

- [ ] `~/weekly/기획팀/` exists with `weekly_runtime/`, `venv/`, `config.yaml`, `README.md`
- [ ] `<storage_root>/기획팀/_지시사항.xlsx` exists with headers + dropdowns (open in Excel)
- [ ] OS keyring contains `weekly-기획팀` entries (`smtp_password`, `ai_api_key`)
- [ ] Test email arrives at the group lead's mailbox

### Task 8.3: Manual compile

- [ ] **Step 1: Fill xlsx + part .md**

Open `<storage_root>/기획팀/_지시사항.xlsx`. Add 3-5 rows. Some with 담당파트 filled, some empty (to test AI inference fallback).

Create `<storage_root>/기획팀/2026-W18/전략기획.md`, `사업개발.md`, etc. with 1-2 lines each in 성과/이슈/차주계획 sections.

- [ ] **Step 2: Run compile**

```bash
cd ~/weekly/기획팀
.venv/Scripts/wreport compile 기획팀 --week=2026-W18
```

Expected output:
- `Compiling 기획팀 2026-W18...`
- `Dashboard: <storage_root>/기획팀/2026-W18/_dashboard.html`
- `Mail sent.`

- [ ] **Step 3: Verify dashboard**

Open the HTML in a browser. Should show:
- Header with dept name + week
- 종합 요약 box
- 진척률 table per part
- 파트별 핵심 details

- [ ] **Step 4: Verify email**

Check group lead mailbox + each part lead's mailbox (cc). All should have the same email + `_dashboard.html` attached.

### Task 8.4: Bug-fix loop

If anything fails:
1. Identify the failure (network/AI/SMTP/template)
2. Reproduce in a unit test
3. Fix the code in `templates/src/...` or `scripts/...`
4. Re-run `pytest`
5. Re-deploy bundle to `~/.claude/skills/weekly` (or symlink during dev)
6. Re-run compile
7. Commit fix with `fix(weekly): ...`

### Task 8.5: Tag dogfood-complete

- [ ] **Step 1: Tag + push**

```bash
git tag weekly-phase0-dogfood-complete
git push origin feat/weekly-impl --tags
```

- [ ] **Step 2: PR (optional)**

```bash
gh pr create --base master --head feat/weekly-impl \
  --title "feat: /weekly Phase 0 (manual compile dogfood)" \
  --body "Phase 0 of /weekly: standalone Python project scaffold + manual compile + SMTP mail. Validated via dogfood on user's PC. Phase 1 (cron automation) is a separate plan."
```

---

## Spec Coverage Checklist

Map each spec section to a task that implements it.

| Spec section | Task(s) |
|--------------|---------|
| §4 Skill Metadata | Task 2.1 (SKILL.md frontmatter) |
| §4.1 /weekly vs wreport naming | Task 4.6 cli.py (init stub message), Task 5.8 README.md |
| §5.1 Deployment Model | Task 5.3 scaffold + Task 5.4 config + Task 5.5 xlsx |
| §5.2 Storage Abstraction | Task 3.3 LocalStorage |
| §5.3 Components (Phase 0 subset) | Tasks 3.2, 3.3, 3.4, 3.5, 4.1, 4.3, 4.4, 4.5, 4.6 |
| §5.4 Skill Bundle Layout | Tasks 0.2, 1.1-1.4 (lib reuse) |
| §6.1 init pipeline (Phase 0 subset, no cron) | Tasks 5.1-5.8 |
| §6.3 compile workflow | Tasks 4.3, 4.4, 4.5, 4.6 |
| §7.1 config.yaml | Task 3.2 + Task 5.4 |
| §7.3 part .md format | Task 8.3 (manual) — template_part.md.j2 deferred since Phase 0 doesn't auto-generate part .md |
| §8 Error Handling (Phase 0 subset) | Task 4.6 cli.py (catch + display), Task 8.4 (validation loop) |
| §9 Security & PII | Task 4.2 compile_system.txt prompt + Task 3.4 keyring |
| §10 Dogfood Plan | Wave 8 (Tasks 8.1-8.5) |

**Out of this plan (Phase 1):**
- assigner.py, scheduler.py, status command
- audit.jsonl active use
- SMB storage backend
- /design-consultation full dashboard

These are tracked for the next plan.

---

## Self-Review Notes

After writing this plan, fresh-eye check:

1. **Placeholder scan:** Searched for `TODO`, `TBD`, `FIXME` — none present in steps. (Two intentional `TODO` references in dashboard placeholder template are *content*, not plan placeholders, and acknowledged as a known design-consultation handoff.)

2. **Type/name consistency:**
   - `LocalStorage(root=...)` consistent across Tasks 3.3, 4.6, 8.2.
   - `ScopeAnswers` field names consistent across Tasks 5.2, 5.4, 5.6, 6.1.
   - `WeeklyConfig` fields consistent in Tasks 3.2, 4.6.
   - `LLMClient.call(system, user)` signature consistent across Tasks 1.3, 4.3, 6.1.
   - `wreport compile <dept> --week=<...>` invocation consistent across Tasks 4.6, 5.8 README, 8.3.

3. **Spec gaps:**
   - `template_part.md.j2` mentioned in spec §5.4 not implemented in Phase 0 — noted in coverage table (deferred to Phase 1 since Phase 0 has user manually creating .md files).
   - `weekly/audit.py` mentioned in spec §5.3 — noted as Phase 1.
   - `weekly/scheduler.py` — noted as Phase 1.
   - `weekly/assigner.py` — noted as Phase 1.

4. **Test coverage:** Each new module has at least one TDD test before implementation. Total ~36 tests at completion.

5. **Frequent commits:** Each task ends with a commit. Tasks are 2-5 minutes per step (one action per step).

---

**End of Phase 0 Plan.**
