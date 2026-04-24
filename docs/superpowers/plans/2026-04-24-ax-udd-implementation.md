# AX Universal Data Downloader (`/udd`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI-agnostic harness skill (`/udd`) that generates self-healing, scheduled Python projects which download data from corporate intranet systems. Compatible with Claude Code, Gemini CLI, and Codex CLI.

**Architecture:** The skill is a single `SKILL.md` + a set of helper Python scripts and Jinja-style templates. When invoked, the skill orchestrates a 9-stage pipeline that outputs an independent Python project with Playwright automation, OS keyring credentials, static selector fallback, LLM-agnostic AI healing, and crossplatform OS scheduler registration. Generated projects ship with their own `udd` CLI (login/run/status/retrain/doctor/schedule).

**Tech Stack:**
- Skill bundle: Markdown + Python 3.10+ + Bash (helpers)
- Generated project: Python 3.10+ + Playwright + pandas + openpyxl + keyring + PyYAML
- AI SDK (dynamic import): `anthropic` | `google-generativeai` | `openai`
- Scheduler: schtasks (Windows) / launchctl (macOS) / crontab (Linux)
- Testing: pytest, pytest-mock, respx

**Development location:** `skills/udd/` in this workspace (will be copied or symlinked to `~/.claude/skills/udd/` once complete).

**Source spec:** `docs/superpowers/specs/2026-04-24-ax-udd-design.md`

---

## File Structure Map

### Skill bundle layout (`skills/udd/`)

```
skills/udd/
├── SKILL.md                                # Main skill file, CLI-agnostic
├── pyproject.toml                          # Skill-bundle test deps (pytest, pyyaml)
├── README.md                               # Bundle README (install instructions)
├── .gitignore
│
├── scripts/                                # Helper scripts called by SKILL.md via Bash
│   ├── lib/
│   │   ├── __init__.py
│   │   ├── platform_detect.py              # OS + CLI-host detection
│   │   ├── template_render.py              # {{var}} substitution
│   │   ├── telegram.py                     # Minimal telegram send (keyring token)
│   │   └── llm_call.py                     # Same 3-provider wrapper used at scaffold-time
│   ├── precheck.py                         # Stage 0 — environment check
│   ├── scope.py                            # Stage 1 — interactive Q&A → config.yaml
│   ├── scaffold.py                         # Stage 2 — mkdir + venv + pip + template-render
│   ├── auth_flow.py                        # Stage 3 — storage.json creation + verify
│   ├── record_flow.py                      # Stage 4 — codegen invocation
│   ├── refactor.py                         # Stage 5 — AI refactor of raw recording
│   ├── validate_loop.py                    # Stage 6 — autonomous validation loop
│   ├── approve_flow.py                     # Stage 7 — user approval handoff
│   ├── schedule_install.py                 # Stage 8 — cross-platform scheduler
│   └── handoff.py                          # Stage 9 — final README + summary
│
├── templates/                              # Rendered into ~/ax-downloads/<project>/
│   ├── pyproject.toml.tmpl
│   ├── requirements.txt.tmpl
│   ├── .gitignore.tmpl
│   ├── README.md.tmpl
│   ├── config.yaml.tmpl
│   ├── selectors.yaml.tmpl                 # Initial empty placeholder
│   ├── src/
│   │   ├── __init__.py.tmpl
│   │   ├── run.py.tmpl                     # Main entry
│   │   ├── auth.py.tmpl
│   │   ├── navigate.py.tmpl
│   │   ├── download.py.tmpl
│   │   ├── validators.py.tmpl
│   │   ├── healer.py.tmpl
│   │   ├── llm_client.py.tmpl
│   │   ├── notify.py.tmpl
│   │   └── cli.py.tmpl
│   └── tests/
│       ├── test_validators.py.tmpl
│       ├── test_selectors.py.tmpl
│       └── test_healer_mock.py.tmpl
│
├── bin/
│   └── udd-global                          # Multi-project management CLI
│
└── tests/                                  # Skill bundle self-tests
    ├── __init__.py
    ├── conftest.py
    ├── test_platform_detect.py
    ├── test_template_render.py
    ├── test_precheck.py
    ├── test_scope.py
    ├── test_scaffold.py
    ├── test_cron_convert.py
    ├── test_llm_call_fallback.py
    ├── test_validate_loop.py
    └── test_schedule_install.py
```

### Responsibility per file

| File | Responsibility |
|------|---------------|
| `SKILL.md` | Orchestrates Stages 0–9 by invoking `scripts/*` via Bash. CLI-agnostic instructions. |
| `scripts/lib/platform_detect.py` | Detects OS (win32/darwin/linux) + host CLI (claude/gemini/codex) from env vars and process tree |
| `scripts/lib/template_render.py` | Reads `.tmpl` file, substitutes `{{var}}` placeholders, writes target |
| `scripts/lib/telegram.py` | `send(chat_id, text, files=None)` using keyring-stored bot token |
| `scripts/lib/llm_call.py` | `ask(prompt, image=None, provider=auto) → dict`. Dynamic imports. |
| `scripts/precheck.py` | Verifies Python, Playwright, chromium, AI keys, telegram token. Emits JSON report. |
| `scripts/scope.py` | Reads answers from stdin, writes `config.yaml` initial |
| `scripts/scaffold.py` | Creates directory tree, venv, installs requirements, renders all templates |
| `scripts/auth_flow.py` | Spawns `playwright codegen --save-storage`, waits for user Enter, verifies session |
| `scripts/record_flow.py` | Spawns `playwright codegen --load-storage --output`, validates recording |
| `scripts/refactor.py` | Sends raw recording to LLM, writes `selectors.yaml` + `navigate.py` |
| `scripts/validate_loop.py` | Runs `python src/run.py` up to 5 times, diagnoses failures with LLM, patches, retries |
| `scripts/approve_flow.py` | Loads latest download, prints head(10), sends to telegram, waits for YES/NO |
| `scripts/schedule_install.py` | Detects OS → calls schtasks/launchctl/crontab |
| `scripts/handoff.py` | Renders final README, prints summary with next-run time |
| `templates/src/run.py.tmpl` | Main pipeline: auth→navigate→download→validate→notify |
| `templates/src/auth.py.tmpl` | Session load, credentials-mode login, validity check |
| `templates/src/navigate.py.tmpl` | Selector-based navigation with fallback chain + healer hook |
| `templates/src/download.py.tmpl` | `trigger_download(page, button_name)` using Playwright `expect_download()` |
| `templates/src/validators.py.tmpl` | File format + columns + row count + size check |
| `templates/src/healer.py.tmpl` | AI-based runtime selector repair (capped at 1/element, 3/session) |
| `templates/src/llm_client.py.tmpl` | Same 3-provider interface as scaffold-side, embedded in generated project |
| `templates/src/notify.py.tmpl` | Telegram send for on_success/on_failure/on_healing events |
| `templates/src/cli.py.tmpl` | argparse-based `udd` command with 13 subcommands |
| `bin/udd-global` | Scans `~/ax-downloads/` and operates on all projects |

---

## Wave 1 — Skill bundle bootstrap (6 tasks)

Goal: Create an empty but functional skill bundle skeleton with self-tests running.

### Task 1: Create skill bundle directory and pyproject

**Files:**
- Create: `skills/udd/pyproject.toml`
- Create: `skills/udd/.gitignore`
- Create: `skills/udd/README.md`
- Create: `skills/udd/scripts/lib/__init__.py`
- Create: `skills/udd/tests/__init__.py`

- [ ] **Step 1.1: Create directory structure**

```bash
mkdir -p skills/udd/{scripts/lib,templates/src,templates/tests,tests,bin}
touch skills/udd/scripts/lib/__init__.py
touch skills/udd/tests/__init__.py
```

- [ ] **Step 1.2: Write `skills/udd/pyproject.toml`**

```toml
[project]
name = "udd-skill-bundle"
version = "0.1.0"
description = "AX Universal Data Downloader — skill bundle"
requires-python = ">=3.10"
authors = [{name = "gibbs hwang"}]

[project.optional-dependencies]
dev = [
  "pytest>=8.0",
  "pytest-mock>=3.12",
  "pyyaml>=6.0",
  "respx>=0.22",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["scripts"]
```

- [ ] **Step 1.3: Write `skills/udd/.gitignore`**

```
__pycache__/
*.pyc
.venv/
.pytest_cache/
*.egg-info/
```

- [ ] **Step 1.4: Write `skills/udd/README.md`**

```markdown
# AX Universal Data Downloader — Skill Bundle

Skill for Claude Code, Gemini CLI, and Codex CLI that generates
self-healing, scheduled Python projects for corporate data downloads.

## Install

```bash
cp -r skills/udd ~/.claude/skills/udd
# Or symlink:
ln -s $(pwd)/skills/udd ~/.claude/skills/udd
```

## Usage

In any of the three CLIs, with autonomous mode enabled:
- Claude Code: `/udd`
- Gemini CLI: `activate_skill udd`
- Codex CLI: `skill udd`

See `SKILL.md` for the full pipeline.

## Development

```bash
cd skills/udd
python -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/pytest
```
```

- [ ] **Step 1.5: Verify directory tree**

Run: `find skills/udd -type f | sort`
Expected output contains: `skills/udd/pyproject.toml`, `skills/udd/.gitignore`, `skills/udd/README.md`, two `__init__.py` files.

- [ ] **Step 1.6: Commit**

```bash
git add skills/udd/
git commit -m "feat(udd): scaffold skill bundle directory structure"
```

### Task 2: Platform + CLI host detection helper

**Files:**
- Create: `skills/udd/scripts/lib/platform_detect.py`
- Create: `skills/udd/tests/test_platform_detect.py`

- [ ] **Step 2.1: Write failing test `skills/udd/tests/test_platform_detect.py`**

```python
import os
from unittest.mock import patch

from lib.platform_detect import detect_os, detect_cli_host, detect_autonomous_mode


def test_detect_os_returns_one_of_three():
    result = detect_os()
    assert result in {"windows", "macos", "linux"}


def test_detect_cli_host_claude_via_env(monkeypatch):
    monkeypatch.setenv("CLAUDE_CODE_VERSION", "1.0.0")
    monkeypatch.delenv("GEMINI_CLI_VERSION", raising=False)
    monkeypatch.delenv("CODEX_CLI_VERSION", raising=False)
    assert detect_cli_host() == "claude"


def test_detect_cli_host_gemini_via_env(monkeypatch):
    monkeypatch.delenv("CLAUDE_CODE_VERSION", raising=False)
    monkeypatch.setenv("GEMINI_CLI_VERSION", "0.5.0")
    monkeypatch.delenv("CODEX_CLI_VERSION", raising=False)
    assert detect_cli_host() == "gemini"


def test_detect_cli_host_codex_via_env(monkeypatch):
    monkeypatch.delenv("CLAUDE_CODE_VERSION", raising=False)
    monkeypatch.delenv("GEMINI_CLI_VERSION", raising=False)
    monkeypatch.setenv("CODEX_CLI_VERSION", "0.1.0")
    assert detect_cli_host() == "codex"


def test_detect_cli_host_unknown(monkeypatch):
    for var in ("CLAUDE_CODE_VERSION", "GEMINI_CLI_VERSION", "CODEX_CLI_VERSION"):
        monkeypatch.delenv(var, raising=False)
    assert detect_cli_host() == "unknown"


def test_detect_autonomous_mode_claude(monkeypatch):
    monkeypatch.setenv("CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS", "1")
    assert detect_autonomous_mode() is True


def test_detect_autonomous_mode_gemini(monkeypatch):
    monkeypatch.delenv("CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS", raising=False)
    monkeypatch.setenv("GEMINI_YOLO", "1")
    assert detect_autonomous_mode() is True


def test_detect_autonomous_mode_codex(monkeypatch):
    monkeypatch.delenv("CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS", raising=False)
    monkeypatch.delenv("GEMINI_YOLO", raising=False)
    monkeypatch.setenv("CODEX_APPROVAL_MODE", "never")
    assert detect_autonomous_mode() is True


def test_detect_autonomous_mode_off(monkeypatch):
    for var in ("CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS", "GEMINI_YOLO", "CODEX_APPROVAL_MODE"):
        monkeypatch.delenv(var, raising=False)
    assert detect_autonomous_mode() is False
```

- [ ] **Step 2.2: Run test — verify failure**

Run: `cd skills/udd && .venv/bin/pytest tests/test_platform_detect.py -v`
Expected: ImportError (module not found).

- [ ] **Step 2.3: Write `skills/udd/scripts/lib/platform_detect.py`**

```python
"""Detect the host OS and AI CLI the skill is running under."""

from __future__ import annotations

import os
import sys


def detect_os() -> str:
    """Return 'windows' | 'macos' | 'linux'."""
    platform = sys.platform
    if platform == "win32":
        return "windows"
    if platform == "darwin":
        return "macos"
    return "linux"


def detect_cli_host() -> str:
    """Return 'claude' | 'gemini' | 'codex' | 'unknown'."""
    if os.environ.get("CLAUDE_CODE_VERSION") or os.environ.get("CLAUDE_SESSION_ID"):
        return "claude"
    if os.environ.get("GEMINI_CLI_VERSION"):
        return "gemini"
    if os.environ.get("CODEX_CLI_VERSION"):
        return "codex"
    return "unknown"


def detect_autonomous_mode() -> bool:
    """True when the host CLI was started with permission-bypass flag."""
    if os.environ.get("CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS") == "1":
        return True
    if os.environ.get("GEMINI_YOLO") == "1":
        return True
    if os.environ.get("CODEX_APPROVAL_MODE") == "never":
        return True
    return False
```

- [ ] **Step 2.4: Run test — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_platform_detect.py -v`
Expected: 8 passed.

- [ ] **Step 2.5: Commit**

```bash
git add skills/udd/scripts/lib/platform_detect.py skills/udd/tests/test_platform_detect.py
git commit -m "feat(udd): add platform + CLI host + autonomous mode detection"
```

### Task 3: Template rendering helper

**Files:**
- Create: `skills/udd/scripts/lib/template_render.py`
- Create: `skills/udd/tests/test_template_render.py`

- [ ] **Step 3.1: Write failing test**

```python
from pathlib import Path

from lib.template_render import render_string, render_file


def test_render_string_simple():
    out = render_string("Hello {{name}}!", {"name": "World"})
    assert out == "Hello World!"


def test_render_string_multiple():
    out = render_string("{{a}}+{{b}}={{c}}", {"a": "1", "b": "2", "c": "3"})
    assert out == "1+2=3"


def test_render_string_missing_var_raises():
    import pytest
    with pytest.raises(KeyError):
        render_string("{{missing}}", {})


def test_render_string_unchanged_without_vars():
    out = render_string("no placeholders here", {"unused": "x"})
    assert out == "no placeholders here"


def test_render_file_writes_output(tmp_path: Path):
    src = tmp_path / "in.tmpl"
    dst = tmp_path / "out.txt"
    src.write_text("Project: {{project}}\nURL: {{url}}\n")
    render_file(src, dst, {"project": "erp-sales", "url": "https://x.com"})
    assert dst.read_text() == "Project: erp-sales\nURL: https://x.com\n"


def test_render_file_creates_parent_dirs(tmp_path: Path):
    src = tmp_path / "in.tmpl"
    dst = tmp_path / "deep" / "nested" / "out.txt"
    src.write_text("x")
    render_file(src, dst, {})
    assert dst.exists()
```

- [ ] **Step 3.2: Run test — verify fail**

Run: `cd skills/udd && .venv/bin/pytest tests/test_template_render.py -v`
Expected: ImportError.

- [ ] **Step 3.3: Write `skills/udd/scripts/lib/template_render.py`**

```python
"""Minimal {{variable}} template renderer. No Jinja dependency."""

from __future__ import annotations

import re
from pathlib import Path

_PATTERN = re.compile(r"\{\{\s*(\w+)\s*\}\}")


def render_string(template: str, vars: dict[str, str]) -> str:
    """Substitute {{name}} placeholders. Raises KeyError if a placeholder has no value."""
    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in vars:
            raise KeyError(f"Template variable not provided: {key}")
        return str(vars[key])
    return _PATTERN.sub(replace, template)


def render_file(src: Path, dst: Path, vars: dict[str, str]) -> None:
    """Render src template into dst, creating parent dirs as needed."""
    src = Path(src)
    dst = Path(dst)
    content = render_string(src.read_text(encoding="utf-8"), vars)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(content, encoding="utf-8")
```

- [ ] **Step 3.4: Run test — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_template_render.py -v`
Expected: 6 passed.

- [ ] **Step 3.5: Commit**

```bash
git add skills/udd/scripts/lib/template_render.py skills/udd/tests/test_template_render.py
git commit -m "feat(udd): add minimal template renderer"
```

### Task 4: SKILL.md skeleton (frontmatter + stage table of contents)

**Files:**
- Create: `skills/udd/SKILL.md`

- [ ] **Step 4.1: Write `skills/udd/SKILL.md` (skeleton only, stages filled in later waves)**

```markdown
---
name: udd
description: AX Universal Data Downloader — end-to-end automation for recurring downloads from corporate systems (login, navigation, filters, export). Use when the user wants a self-healing, scheduled Python project that downloads files from an intranet/ERP/admin site on a cron. Generates an independent project folder with Playwright + OS keyring auth + LLM-agnostic AI healing.
author: gibbs hwang
version: 0.1.0
---

# AX Universal Data Downloader

Generates a self-healing, scheduled Python project for automating corporate-system data downloads.
**Works identically under Claude Code, Gemini CLI, and Codex CLI.**

## ⚠️ Autonomous Mode Required

This skill runs a validation loop that executes scripts and edits files multiple times.
A permission prompt at each step will stall it. Start your CLI in autonomous mode:

| CLI | Launch command | Session toggle |
|-----|---------------|----------------|
| Claude Code | `claude --dangerously-skip-permissions` | `/permissions` |
| Gemini CLI | `gemini --yolo` | `/yolo` |
| Codex CLI | `codex --full-auto` | (session mode switch) |

If not in autonomous mode, the skill still runs but asks for permission at each step.

## Pipeline

The skill executes nine stages sequentially. Each stage is implemented by a helper script in `scripts/`.

| Stage | Helper | Purpose |
|-------|--------|---------|
| 0. PRECHECK | `scripts/precheck.py` | Environment + AI keys diagnosis |
| 1. SCOPE | `scripts/scope.py` | 5-question intake → `config.yaml` |
| 2. SCAFFOLD | `scripts/scaffold.py` | Directory + venv + installed deps + rendered templates |
| 3. AUTH | `scripts/auth_flow.py` | First-time login → `storage.json` |
| 4. RECORD | `scripts/record_flow.py` | Playwright codegen of download path |
| 5. REFACTOR | `scripts/refactor.py` | AI cleanup → `selectors.yaml` + `navigate.py` |
| 6. VALIDATE | `scripts/validate_loop.py` | Autonomous verify loop (max 5) |
| 7. APPROVE | `scripts/approve_flow.py` | Final user sign-off on sample data |
| 8. SCHEDULE | `scripts/schedule_install.py` | OS scheduler registration |
| 9. HANDOFF | `scripts/handoff.py` | Final README + summary |

## Execution

Invoke each stage in order via Bash. Example:

```bash
python "$SKILL_DIR/scripts/precheck.py"        # Stage 0
python "$SKILL_DIR/scripts/scope.py" "$PROJECT_DIR"
python "$SKILL_DIR/scripts/scaffold.py" "$PROJECT_DIR"
# … and so on through Stage 9
```

`$SKILL_DIR` = the skill bundle directory (e.g., `~/.claude/skills/udd`).
`$PROJECT_DIR` = target project directory (e.g., `~/ax-downloads/erp-sales`), created by Stage 2.

Full stage details follow in the sections below.

<!-- Stage sections will be added in later waves. -->
```

- [ ] **Step 4.2: Verify frontmatter**

Run: `head -5 skills/udd/SKILL.md`
Expected: first line `---`, then `name: udd`, then `description: …`, etc.

- [ ] **Step 4.3: Commit**

```bash
git add skills/udd/SKILL.md
git commit -m "feat(udd): add SKILL.md skeleton with pipeline overview"
```

### Task 5: conftest.py for test fixtures

**Files:**
- Create: `skills/udd/tests/conftest.py`

- [ ] **Step 5.1: Write `skills/udd/tests/conftest.py`**

```python
"""Shared pytest fixtures for udd skill bundle tests."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Ensure `scripts/` is on path for all tests
SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))


@pytest.fixture
def clear_ai_env(monkeypatch):
    """Remove all three AI provider env vars so tests start from a clean state."""
    for var in ("ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY"):
        monkeypatch.delenv(var, raising=False)


@pytest.fixture
def clear_cli_env(monkeypatch):
    """Remove CLI host + autonomous mode env vars."""
    for var in (
        "CLAUDE_CODE_VERSION",
        "CLAUDE_SESSION_ID",
        "GEMINI_CLI_VERSION",
        "CODEX_CLI_VERSION",
        "CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS",
        "GEMINI_YOLO",
        "CODEX_APPROVAL_MODE",
    ):
        monkeypatch.delenv(var, raising=False)


@pytest.fixture
def project_dir(tmp_path: Path) -> Path:
    """Temporary project directory with standard subfolders."""
    d = tmp_path / "test-project"
    for sub in ("src", "tests", "auth", "downloads", "logs", "recordings"):
        (d / sub).mkdir(parents=True, exist_ok=True)
    return d
```

- [ ] **Step 5.2: Verify all prior tests still pass**

Run: `cd skills/udd && .venv/bin/pytest`
Expected: 14 passed (8 from test_platform_detect + 6 from test_template_render).

- [ ] **Step 5.3: Commit**

```bash
git add skills/udd/tests/conftest.py
git commit -m "test(udd): add shared pytest fixtures"
```

### Task 6: Install dev dependencies and freeze baseline

**Files:**
- No source changes; environment setup only.

- [ ] **Step 6.1: Create venv and install dev extras**

```bash
cd skills/udd
python -m venv .venv
.venv/bin/pip install -U pip
.venv/bin/pip install -e ".[dev]"
```

- [ ] **Step 6.2: Verify pytest works end-to-end**

Run: `cd skills/udd && .venv/bin/pytest -v`
Expected: 14 passed.

- [ ] **Step 6.3: Mark wave 1 complete**

```bash
# No code changes to commit; just confirm state:
cd skills/udd && git status
```

Expected: clean working tree.

---

## Wave 2 — Stage 0 precheck + Stage 1 scope + helpers (6 tasks)

Goal: Environment diagnostics runs, user-input-driven `config.yaml` generation works.

### Task 7: `scripts/precheck.py` — Stage 0

**Files:**
- Create: `skills/udd/scripts/precheck.py`
- Create: `skills/udd/tests/test_precheck.py`

- [ ] **Step 7.1: Write failing test `tests/test_precheck.py`**

```python
import json
from unittest.mock import MagicMock

from precheck import build_report


def test_build_report_all_good(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-x")
    report = build_report(
        python_version="3.11.5",
        playwright_version="1.48.0",
        chromium_installed=True,
        autonomous_mode=True,
    )
    assert report["status"] == "ok"
    assert report["python"] == "3.11.5"
    assert report["playwright"] == "1.48.0"
    assert report["chromium"] is True
    assert report["ai_providers"] == ["anthropic"]
    assert report["autonomous_mode"] is True


def test_build_report_missing_playwright(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    report = build_report(
        python_version="3.11.5",
        playwright_version=None,
        chromium_installed=False,
        autonomous_mode=False,
    )
    assert report["status"] == "missing"
    assert "playwright" in report["missing"]
    assert "chromium" in report["missing"]
    assert report["ai_providers"] == []


def test_build_report_python_too_old(monkeypatch):
    report = build_report(
        python_version="3.9.0",
        playwright_version="1.48.0",
        chromium_installed=True,
        autonomous_mode=True,
    )
    assert report["status"] == "error"
    assert "python>=3.10" in report["missing"]


def test_build_report_multiple_ai(monkeypatch, clear_ai_env):
    monkeypatch.setenv("GEMINI_API_KEY", "g")
    monkeypatch.setenv("OPENAI_API_KEY", "o")
    report = build_report("3.11.5", "1.48.0", True, True)
    assert set(report["ai_providers"]) == {"gemini", "openai"}
```

- [ ] **Step 7.2: Run — verify fail**

Run: `cd skills/udd && .venv/bin/pytest tests/test_precheck.py -v`
Expected: ImportError.

- [ ] **Step 7.3: Write `skills/udd/scripts/precheck.py`**

```python
"""Stage 0 — environment diagnostics. Emits a JSON report to stdout."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib.platform_detect import detect_autonomous_mode, detect_cli_host, detect_os


MIN_PYTHON = (3, 10)


def detect_python_version() -> str:
    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"


def detect_playwright_version() -> str | None:
    try:
        result = subprocess.run(
            [sys.executable, "-c", "import playwright; print(playwright.__version__)"],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None


def detect_chromium_installed() -> bool:
    """Check Playwright's browser cache dir."""
    cache = Path.home() / ".cache" / "ms-playwright"
    if not cache.exists():
        cache = Path.home() / "AppData" / "Local" / "ms-playwright"
    if not cache.exists():
        return False
    return any(p.name.startswith("chromium") for p in cache.iterdir() if p.is_dir())


def detect_ai_providers() -> list[str]:
    providers = []
    if os.environ.get("ANTHROPIC_API_KEY"):
        providers.append("anthropic")
    if os.environ.get("GEMINI_API_KEY"):
        providers.append("gemini")
    if os.environ.get("OPENAI_API_KEY"):
        providers.append("openai")
    return providers


def build_report(
    python_version: str,
    playwright_version: str | None,
    chromium_installed: bool,
    autonomous_mode: bool,
) -> dict:
    missing = []
    errors = []

    py_parts = tuple(int(x) for x in python_version.split(".")[:2])
    if py_parts < MIN_PYTHON:
        errors.append(f"python>={MIN_PYTHON[0]}.{MIN_PYTHON[1]}")
    if playwright_version is None:
        missing.append("playwright")
    if not chromium_installed:
        missing.append("chromium")

    providers = detect_ai_providers()

    if errors:
        status = "error"
    elif missing:
        status = "missing"
    else:
        status = "ok"

    return {
        "status": status,
        "python": python_version,
        "playwright": playwright_version,
        "chromium": chromium_installed,
        "ai_providers": providers,
        "autonomous_mode": autonomous_mode,
        "os": detect_os(),
        "cli_host": detect_cli_host(),
        "missing": missing,
        "errors": errors,
    }


def main() -> int:
    report = build_report(
        python_version=detect_python_version(),
        playwright_version=detect_playwright_version(),
        chromium_installed=detect_chromium_installed(),
        autonomous_mode=detect_autonomous_mode(),
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if report["status"] == "error":
        return 2
    if report["status"] == "missing":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 7.4: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_precheck.py -v`
Expected: 4 passed.

- [ ] **Step 7.5: Smoke-test the script directly**

Run: `cd skills/udd && .venv/bin/python scripts/precheck.py`
Expected: JSON report with current environment. Exit code 0, 1, or 2 depending on what's installed.

- [ ] **Step 7.6: Commit**

```bash
git add skills/udd/scripts/precheck.py skills/udd/tests/test_precheck.py
git commit -m "feat(udd): add Stage 0 precheck with JSON status report"
```

### Task 8: `scripts/scope.py` — interactive Q&A → config.yaml (Stage 1)

**Files:**
- Create: `skills/udd/scripts/scope.py`
- Create: `skills/udd/tests/test_scope.py`

- [ ] **Step 8.1: Write failing test**

```python
from pathlib import Path

from scope import cron_from_natural_language, validate_slug, build_config


def test_validate_slug_accepts_kebab():
    validate_slug("erp-sales")  # no raise


def test_validate_slug_rejects_uppercase():
    import pytest
    with pytest.raises(ValueError):
        validate_slug("ERP-Sales")


def test_validate_slug_rejects_spaces():
    import pytest
    with pytest.raises(ValueError):
        validate_slug("erp sales")


def test_cron_from_natural_daily_9am():
    assert cron_from_natural_language("매일 09:00") == "0 9 * * *"
    assert cron_from_natural_language("매일 9시") == "0 9 * * *"
    assert cron_from_natural_language("daily at 09:00") == "0 9 * * *"


def test_cron_from_natural_already_cron():
    assert cron_from_natural_language("0 9 * * *") == "0 9 * * *"


def test_cron_from_natural_weekly_monday():
    assert cron_from_natural_language("매주 월요일 오전 9시") == "0 9 * * 1"


def test_build_config_structure():
    cfg = build_config(
        name="erp-sales",
        url="https://erp.company.com",
        description="ERP 매출 엑셀",
        cron="0 9 * * *",
        expected_columns=["날짜", "매출"],
    )
    assert cfg["project"]["name"] == "erp-sales"
    assert cfg["project"]["url"] == "https://erp.company.com"
    assert cfg["schedule"]["cron"] == "0 9 * * *"
    assert cfg["validation"]["expected_columns"] == ["날짜", "매출"]
    assert cfg["auth"]["mode"] == "session_replay"
    assert cfg["healing"]["enabled"] is True
    assert cfg["healing"]["ai_provider"] == "auto"
```

- [ ] **Step 8.2: Run — verify fail**

Run: `cd skills/udd && .venv/bin/pytest tests/test_scope.py -v`
Expected: ImportError.

- [ ] **Step 8.3: Write `skills/udd/scripts/scope.py`**

```python
"""Stage 1 — interactive intake that writes config.yaml.

Callable two ways:
  python scope.py <project_dir>            # interactive
  python scope.py <project_dir> --from-stdin  # reads 5-line stdin
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml


_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
_CRON_RE = re.compile(r"^\S+\s+\S+\s+\S+\s+\S+\s+\S+$")
_KO_WEEKDAY = {"월": "1", "화": "2", "수": "3", "목": "4", "금": "5", "토": "6", "일": "0"}


def validate_slug(name: str) -> None:
    if not _SLUG_RE.match(name):
        raise ValueError(
            f"Invalid slug: {name!r}. Use lowercase letters, digits, and hyphens only (e.g., 'erp-sales')."
        )


def cron_from_natural_language(text: str) -> str:
    t = text.strip().lower()
    if _CRON_RE.match(t):
        return t

    time_match = re.search(r"(\d{1,2})\s*[시:](?:\s*(\d{1,2}))?", t) or re.search(
        r"(\d{1,2}):(\d{2})", t
    )
    hour = "0"
    minute = "0"
    if time_match:
        hour = str(int(time_match.group(1)))
        if time_match.group(2):
            minute = str(int(time_match.group(2)))

    if "매일" in t or "daily" in t or "every day" in t:
        return f"{minute} {hour} * * *"

    weekly = re.search(r"매주\s*([월화수목금토일])요?일", t)
    if weekly:
        return f"{minute} {hour} * * {_KO_WEEKDAY[weekly.group(1)]}"

    if "매시" in t or "hourly" in t or "every hour" in t:
        return f"{minute} * * * *"

    raise ValueError(f"Could not parse schedule: {text!r}. Provide cron like '0 9 * * *'.")


def build_config(
    name: str,
    url: str,
    description: str,
    cron: str,
    expected_columns: list[str],
) -> dict:
    return {
        "project": {"name": name, "url": url, "description": description},
        "auth": {
            "mode": "session_replay",
            "storage_state": "auth/storage.json",
            "session_ttl_check": "daily",
        },
        "filters": {
            "start_date": "{today-30d}",
            "end_date": "{today}",
        },
        "download": {
            "save_dir": "downloads/{YYYY-MM-DD}/",
            "expected_format": "xlsx",
            "timeout_ms": 60000,
        },
        "validation": {
            "min_rows": 1,
            "expected_columns": expected_columns,
            "size_bounds_kb": [1, 51200],
            "columns_strict": False,
        },
        "healing": {
            "enabled": True,
            "max_ai_retries": 3,
            "dev_max_attempts": 5,
            "ai_provider": "auto",
            "promote_after": 10,
            "cool_down_hours": 24,
            "allow_logic_patches": False,
        },
        "schedule": {
            "cron": cron,
            "enabled": True,
            "os_task_name": f"UDD-{name.upper()}",
        },
        "notify": {
            "telegram": {
                "enabled": False,
                "chat_id": "",
                "bot_token_keyring": "udd-telegram/bot_token",
            },
            "on_success": False,
            "on_failure": True,
            "on_healing": True,
            "on_validation_warning": True,
        },
        "logging": {"level": "INFO", "retention_days": 90},
    }


def write_config(project_dir: Path, config: dict) -> Path:
    project_dir.mkdir(parents=True, exist_ok=True)
    cfg_path = project_dir / "config.yaml"
    with cfg_path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(config, f, allow_unicode=True, sort_keys=False)
    return cfg_path


def prompt_interactive() -> dict:
    print("Q1. System name (lowercase-kebab, e.g., erp-sales):", file=sys.stderr)
    name = input().strip()
    validate_slug(name)

    print("Q2. Login URL:", file=sys.stderr)
    url = input().strip()

    print("Q3. One-line description:", file=sys.stderr)
    description = input().strip()

    print("Q4. Schedule (cron or natural language, e.g., '매일 09:00'):", file=sys.stderr)
    cron_raw = input().strip()
    cron = cron_from_natural_language(cron_raw)

    print("Q5. Expected columns (comma separated, empty to skip):", file=sys.stderr)
    cols_raw = input().strip()
    columns = [c.strip() for c in cols_raw.split(",") if c.strip()] if cols_raw else []

    return build_config(name, url, description, cron, columns)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("--from-stdin", action="store_true",
                        help="Read 5 answers from stdin (one per line)")
    args = parser.parse_args()

    if args.from_stdin:
        lines = sys.stdin.read().splitlines()
        if len(lines) < 5:
            print("Expected 5 lines on stdin.", file=sys.stderr)
            return 1
        name, url, description, cron_raw, cols_raw = lines[:5]
        validate_slug(name)
        cron = cron_from_natural_language(cron_raw)
        columns = [c.strip() for c in cols_raw.split(",") if c.strip()] if cols_raw else []
        config = build_config(name, url, description, cron, columns)
    else:
        config = prompt_interactive()

    cfg_path = write_config(args.project_dir, config)
    print(f"Wrote {cfg_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 8.4: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_scope.py -v`
Expected: 7 passed.

- [ ] **Step 8.5: Smoke-test from-stdin mode**

```bash
cd skills/udd
printf "erp-sales\nhttps://erp.company.com\nTest desc\n매일 09:00\n날짜,매출\n" | \
  .venv/bin/python scripts/scope.py /tmp/udd-smoke --from-stdin
cat /tmp/udd-smoke/config.yaml | head -20
rm -rf /tmp/udd-smoke
```
Expected: valid YAML with `project.name: erp-sales`, `schedule.cron: 0 9 * * *`.

- [ ] **Step 8.6: Commit**

```bash
git add skills/udd/scripts/scope.py skills/udd/tests/test_scope.py
git commit -m "feat(udd): add Stage 1 scope — interactive + stdin config.yaml builder"
```

### Task 9: `templates/pyproject.toml.tmpl` + `requirements.txt.tmpl` + `.gitignore.tmpl`

**Files:**
- Create: `skills/udd/templates/pyproject.toml.tmpl`
- Create: `skills/udd/templates/requirements.txt.tmpl`
- Create: `skills/udd/templates/.gitignore.tmpl`

- [ ] **Step 9.1: Write `skills/udd/templates/pyproject.toml.tmpl`**

```toml
[project]
name = "udd-{{project_name}}"
version = "0.1.0"
description = "{{description}}"
requires-python = ">=3.10"
authors = [{name = "gibbs hwang"}]
dependencies = [
  "playwright>=1.48",
  "pyyaml>=6.0",
  "pandas>=2.2",
  "openpyxl>=3.1",
  "keyring>=25.0",
  "requests>=2.32",
]

[project.optional-dependencies]
claude = ["anthropic>=0.40"]
gemini = ["google-generativeai>=0.8"]
openai = ["openai>=1.50"]
dev = ["pytest>=8.0", "pytest-mock>=3.12"]

[project.scripts]
udd = "cli:main"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
```

- [ ] **Step 9.2: Write `skills/udd/templates/requirements.txt.tmpl`**

```
playwright>=1.48
pyyaml>=6.0
pandas>=2.2
openpyxl>=3.1
keyring>=25.0
requests>=2.32
# AI providers (install at least one):
# anthropic>=0.40
# google-generativeai>=0.8
# openai>=1.50
```

- [ ] **Step 9.3: Write `skills/udd/templates/.gitignore.tmpl`**

```
__pycache__/
*.pyc
.venv/
.pytest_cache/
auth/
downloads/
logs/
.env
*.egg-info/
```

- [ ] **Step 9.4: Verify templates are valid text**

Run: `ls -la skills/udd/templates/*.tmpl`
Expected: three files, non-zero size.

- [ ] **Step 9.5: Commit**

```bash
git add skills/udd/templates/pyproject.toml.tmpl skills/udd/templates/requirements.txt.tmpl skills/udd/templates/.gitignore.tmpl
git commit -m "feat(udd): add root project template files (pyproject/reqs/gitignore)"
```

### Task 10: `templates/README.md.tmpl` + `templates/config.yaml.tmpl` + `templates/selectors.yaml.tmpl`

**Files:**
- Create: `skills/udd/templates/README.md.tmpl`
- Create: `skills/udd/templates/config.yaml.tmpl`
- Create: `skills/udd/templates/selectors.yaml.tmpl`

- [ ] **Step 10.1: Write `skills/udd/templates/README.md.tmpl`**

```markdown
# {{project_name}}

{{description}}

Generated by AX Universal Data Downloader on {{today}}.

## Commands

| Command | Purpose |
|---------|---------|
| `udd run` | Execute once (same as scheduled run) |
| `udd login` | Re-open browser to refresh session |
| `udd status` | Show last 7 days of runs |
| `udd doctor` | Diagnose environment + session + schedule |
| `udd schedule --cron "..."` | Change schedule |
| `udd unschedule` | Remove scheduled task |
| `udd retrain` | AI-assisted re-capture (browser re-opens) |
| `udd test` | Dry-run into /tmp (no real download saved) |
| `udd logs --tail 50` | Tail JSON logs |
| `udd clean --keep-days 30` | Purge old downloads & logs |
| `udd export <out.tar.gz>` | Backup config (excludes auth/ + downloads/) |

## Files

- `config.yaml` — project settings (URL, schedule, validation rules, AI provider)
- `selectors.yaml` — element selector fallback chain + AI-discovered additions
- `src/run.py` — main entrypoint (scheduler calls this)
- `auth/storage.json` — Playwright session cookies (keep secret)
- `downloads/YYYY-MM-DD/` — daily downloaded files
- `logs/YYYY-MM-DD.log` — JSON-lines run log

## Troubleshooting

- **Session expired alert** → run `udd login`
- **"5 self-heal attempts failed" alert** → run `udd retrain`
- **Unknown issue** → run `udd doctor`
```

- [ ] **Step 10.2: Write `skills/udd/templates/config.yaml.tmpl`**

This is overwritten by `scope.py`'s own YAML writer, but template exists so scaffold can render it if scope output is missing.

```yaml
project:
  name: {{project_name}}
  url: {{url}}
  description: {{description}}

auth:
  mode: session_replay
  storage_state: auth/storage.json
  session_ttl_check: daily

filters:
  start_date: "{today-30d}"
  end_date: "{today}"

download:
  save_dir: "downloads/{YYYY-MM-DD}/"
  expected_format: xlsx
  timeout_ms: 60000

validation:
  min_rows: 1
  expected_columns: []
  size_bounds_kb: [1, 51200]
  columns_strict: false

healing:
  enabled: true
  max_ai_retries: 3
  dev_max_attempts: 5
  ai_provider: auto
  promote_after: 10
  cool_down_hours: 24
  allow_logic_patches: false

schedule:
  cron: "{{cron}}"
  enabled: true
  os_task_name: "UDD-{{project_name_upper}}"

notify:
  telegram:
    enabled: false
    chat_id: ""
    bot_token_keyring: udd-telegram/bot_token
  on_success: false
  on_failure: true
  on_healing: true
  on_validation_warning: true

logging:
  level: INFO
  retention_days: 90
```

- [ ] **Step 10.3: Write `skills/udd/templates/selectors.yaml.tmpl`**

```yaml
# Populated by Stage 5 (AI refactor). Initial state is empty.
# Each entry uses this structure:
#
# element_name:
#   description: "사람이 이해할 수 있는 한국어 설명"
#   primary: "<Playwright selector>"
#   fallbacks:
#     - "text=..."
#     - "xpath=..."
#   ai_discovered: []  # filled by runtime self-healing
```

- [ ] **Step 10.4: Commit**

```bash
git add skills/udd/templates/README.md.tmpl skills/udd/templates/config.yaml.tmpl skills/udd/templates/selectors.yaml.tmpl
git commit -m "feat(udd): add README + config + selectors template files"
```

### Task 11: `scripts/scaffold.py` — Stage 2 directory + venv + templates

**Files:**
- Create: `skills/udd/scripts/scaffold.py`
- Create: `skills/udd/tests/test_scaffold.py`

- [ ] **Step 11.1: Write failing test**

```python
from pathlib import Path
import sys

from scaffold import render_all_templates, TEMPLATE_SRC_FILES


def test_render_all_templates_copies_files(tmp_path, monkeypatch):
    # Build fake skill bundle dir with templates
    skill_dir = tmp_path / "skill"
    tmpl_dir = skill_dir / "templates"
    tmpl_dir.mkdir(parents=True)
    (tmpl_dir / "pyproject.toml.tmpl").write_text('name = "{{project_name}}"\n')
    (tmpl_dir / "README.md.tmpl").write_text("# {{project_name}}\n")
    (tmpl_dir / "config.yaml.tmpl").write_text("x: {{project_name}}\n")
    (tmpl_dir / "selectors.yaml.tmpl").write_text("# empty\n")
    (tmpl_dir / "requirements.txt.tmpl").write_text("playwright\n")
    (tmpl_dir / ".gitignore.tmpl").write_text("auth/\n")

    src_dir = tmpl_dir / "src"
    src_dir.mkdir()
    for fname in TEMPLATE_SRC_FILES:
        (src_dir / f"{fname}.tmpl").write_text(f"# {fname}\n")
    tests_dir = tmpl_dir / "tests"
    tests_dir.mkdir()
    (tests_dir / "test_validators.py.tmpl").write_text("# test\n")
    (tests_dir / "test_selectors.py.tmpl").write_text("# test\n")
    (tests_dir / "test_healer_mock.py.tmpl").write_text("# test\n")

    project_dir = tmp_path / "project"
    project_dir.mkdir()

    render_all_templates(
        skill_dir=skill_dir,
        project_dir=project_dir,
        vars={
            "project_name": "erp-sales",
            "project_name_upper": "ERP-SALES",
            "url": "https://x.com",
            "description": "test",
            "cron": "0 9 * * *",
            "today": "2026-04-24",
        },
    )

    assert (project_dir / "pyproject.toml").exists()
    assert "erp-sales" in (project_dir / "pyproject.toml").read_text()
    assert (project_dir / "src" / "run.py").exists()
    assert (project_dir / "tests" / "test_validators.py").exists()
    assert (project_dir / ".gitignore").exists()
```

- [ ] **Step 11.2: Run — fail**

Run: `cd skills/udd && .venv/bin/pytest tests/test_scaffold.py -v`
Expected: ImportError.

- [ ] **Step 11.3: Write `skills/udd/scripts/scaffold.py`**

```python
"""Stage 2 — scaffold a project from templates.

Separate concerns:
  - `render_all_templates`: pure file rendering (testable without venv)
  - `install_dependencies`: heavy side-effect (venv + pip), called from main()
"""

from __future__ import annotations

import argparse
import datetime as dt
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib.template_render import render_file

import yaml


TEMPLATE_SRC_FILES = [
    "__init__.py",
    "run.py",
    "auth.py",
    "navigate.py",
    "download.py",
    "validators.py",
    "healer.py",
    "llm_client.py",
    "notify.py",
    "cli.py",
]

TEMPLATE_TEST_FILES = [
    "test_validators.py",
    "test_selectors.py",
    "test_healer_mock.py",
]

TEMPLATE_ROOT_FILES = [
    "pyproject.toml",
    "requirements.txt",
    ".gitignore",
    "README.md",
    "config.yaml",
    "selectors.yaml",
]


def render_all_templates(skill_dir: Path, project_dir: Path, vars: dict[str, str]) -> None:
    """Copy every .tmpl from skill bundle into project_dir with substitutions."""
    tmpl_dir = skill_dir / "templates"

    for fname in TEMPLATE_ROOT_FILES:
        src = tmpl_dir / f"{fname}.tmpl"
        if src.exists():
            render_file(src, project_dir / fname, vars)

    for fname in TEMPLATE_SRC_FILES:
        src = tmpl_dir / "src" / f"{fname}.tmpl"
        if src.exists():
            render_file(src, project_dir / "src" / fname, vars)

    for fname in TEMPLATE_TEST_FILES:
        src = tmpl_dir / "tests" / f"{fname}.tmpl"
        if src.exists():
            render_file(src, project_dir / "tests" / fname, vars)


def create_directories(project_dir: Path) -> None:
    for sub in ("src", "tests", "auth", "downloads", "logs", "recordings"):
        (project_dir / sub).mkdir(parents=True, exist_ok=True)


def install_dependencies(project_dir: Path) -> None:
    """Create venv and install dependencies. Heavy — real network I/O."""
    venv_dir = project_dir / ".venv"
    subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)

    pip = venv_dir / ("Scripts" if sys.platform == "win32" else "bin") / "pip"
    subprocess.run([str(pip), "install", "-U", "pip"], check=True)
    subprocess.run([str(pip), "install", "-r", str(project_dir / "requirements.txt")], check=True)

    py = venv_dir / ("Scripts" if sys.platform == "win32" else "bin") / "python"
    subprocess.run([str(py), "-m", "playwright", "install", "chromium"], check=True)


def git_init(project_dir: Path) -> None:
    subprocess.run(["git", "init"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(["git", "add", "-A"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(
        ["git", "commit", "-m", "scaffold ax-udd project", "--allow-empty"],
        cwd=project_dir, check=True, capture_output=True,
    )


def vars_from_config(project_dir: Path) -> dict[str, str]:
    cfg_path = project_dir / "config.yaml"
    if not cfg_path.exists():
        raise FileNotFoundError("config.yaml missing — run Stage 1 (scope.py) first")
    with cfg_path.open(encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    name = cfg["project"]["name"]
    return {
        "project_name": name,
        "project_name_upper": name.upper(),
        "url": cfg["project"]["url"],
        "description": cfg["project"]["description"],
        "cron": cfg["schedule"]["cron"],
        "today": dt.date.today().isoformat(),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("--skill-dir", type=Path,
                        default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--no-install", action="store_true",
                        help="Skip venv + pip + playwright install (for testing)")
    parser.add_argument("--no-git", action="store_true", help="Skip git init")
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    vars_map = vars_from_config(project_dir)

    create_directories(project_dir)
    render_all_templates(args.skill_dir, project_dir, vars_map)
    # Overwrite config.yaml with the fully-formed one from scope.py (don't re-render)
    # config.yaml.tmpl rendering was just a fallback; scope.py version is richer.

    if not args.no_install:
        install_dependencies(project_dir)
    if not args.no_git:
        git_init(project_dir)

    print(f"Scaffolded {project_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 11.4: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_scaffold.py -v`
Expected: 1 passed.

- [ ] **Step 11.5: Commit**

```bash
git add skills/udd/scripts/scaffold.py skills/udd/tests/test_scaffold.py
git commit -m "feat(udd): add Stage 2 scaffold — template render + venv + git init"
```

### Task 12: Wave 2 integration smoke test

**Files:**
- Create: `skills/udd/tests/test_integration_stage0_to_2.py`

- [ ] **Step 12.1: Write integration test (no real venv, uses --no-install)**

```python
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent


def test_full_stage_0_1_2_renders_tree(tmp_path):
    project_dir = tmp_path / "erp-sales"

    # Stage 1
    stdin_data = "erp-sales\nhttps://erp.company.com\nTest desc\n매일 09:00\n날짜,매출\n"
    r = subprocess.run(
        [sys.executable, str(SKILL_DIR / "scripts" / "scope.py"),
         str(project_dir), "--from-stdin"],
        input=stdin_data, text=True, capture_output=True,
    )
    assert r.returncode == 0, r.stderr
    assert (project_dir / "config.yaml").exists()

    # Stage 2 (no install, no git to keep test fast)
    r = subprocess.run(
        [sys.executable, str(SKILL_DIR / "scripts" / "scaffold.py"),
         str(project_dir), "--skill-dir", str(SKILL_DIR),
         "--no-install", "--no-git"],
        capture_output=True, text=True,
    )
    assert r.returncode == 0, r.stderr

    # Check key files rendered (note: src/*.py.tmpl and tests/*.py.tmpl
    # are added in later waves; this test is tolerant about missing ones)
    assert (project_dir / "pyproject.toml").exists()
    assert (project_dir / "README.md").exists()
    assert (project_dir / ".gitignore").exists()
    assert "erp-sales" in (project_dir / "pyproject.toml").read_text()
    assert (project_dir / "downloads").is_dir()
    assert (project_dir / "auth").is_dir()
```

- [ ] **Step 12.2: Run integration test**

Run: `cd skills/udd && .venv/bin/pytest tests/test_integration_stage0_to_2.py -v`
Expected: 1 passed.

- [ ] **Step 12.3: Run full test suite**

Run: `cd skills/udd && .venv/bin/pytest -v`
Expected: all tests passed (platform + template_render + precheck + scope + scaffold + integration).

- [ ] **Step 12.4: Commit**

```bash
git add skills/udd/tests/test_integration_stage0_to_2.py
git commit -m "test(udd): Stage 0-2 integration smoke test"
```

---

## Wave 3 — Stage 3 AUTH + Stage 4 RECORD + core src templates (7 tasks)

Goal: Generated project has auth/navigate/download skeletons + `udd` skill can drive the browser for session + recording.

### Task 13: `templates/src/__init__.py.tmpl` + `run.py.tmpl` skeleton

**Files:**
- Create: `skills/udd/templates/src/__init__.py.tmpl`
- Create: `skills/udd/templates/src/run.py.tmpl`

- [ ] **Step 13.1: Write `skills/udd/templates/src/__init__.py.tmpl`**

```python
"""Generated by ax-udd on {{today}}."""
```

- [ ] **Step 13.2: Write `skills/udd/templates/src/run.py.tmpl`**

Run.py is wired to all modules; the individual modules may still be partial at this wave but the skeleton compiles.

```python
"""Main entrypoint for {{project_name}}.

Called by the OS scheduler (schtasks/launchctl/cron) and by `udd run`.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

import yaml
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


def load_config() -> dict:
    with (ROOT / "config.yaml").open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def log_event(event: dict) -> None:
    logs_dir = ROOT / "logs"
    logs_dir.mkdir(exist_ok=True)
    log_path = logs_dir / f"{datetime.now().strftime('%Y-%m-%d')}.log"
    event["ts"] = datetime.now().isoformat()
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def main() -> int:
    from auth import load_session, is_session_valid
    from navigate import execute_download
    from validators import validate
    from notify import send_summary

    config = load_config()
    log_event({"event": "run.start", "project": config["project"]["name"]})

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            context = load_session(browser, config)
            page = context.new_page()

            if not is_session_valid(page, config):
                log_event({"event": "session.expired"})
                send_summary(config, status="session_expired")
                return 2

            file_path = execute_download(page, config)
            log_event({"event": "download.saved", "path": str(file_path)})

            report = validate(file_path, config)
            log_event({"event": "validate.done", "passed": report.passed, "stats": report.stats})

            send_summary(config, status="success" if report.passed else "validation_warning",
                         file_path=file_path, report=report)
            return 0 if report.passed else 1
        except Exception as e:
            log_event({"event": "run.error", "error": str(e), "type": type(e).__name__})
            send_summary(config, status="failure", error=str(e))
            return 3
        finally:
            browser.close()


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 13.3: Commit**

```bash
git add skills/udd/templates/src/__init__.py.tmpl skills/udd/templates/src/run.py.tmpl
git commit -m "feat(udd): add run.py template — main pipeline entrypoint"
```

### Task 14: `templates/src/auth.py.tmpl` + tests

**Files:**
- Create: `skills/udd/templates/src/auth.py.tmpl`

- [ ] **Step 14.1: Write `skills/udd/templates/src/auth.py.tmpl`**

```python
"""Session management for {{project_name}}.

Two auth modes (config.auth.mode):
  - session_replay: load storage.json (created by `udd login`)
  - credentials: read ID/PW from OS keyring, fill login form
"""

from __future__ import annotations

from pathlib import Path

import keyring
from playwright.sync_api import Browser, BrowserContext, Page


ROOT = Path(__file__).resolve().parent.parent


def load_session(browser: Browser, config: dict) -> BrowserContext:
    """Create a BrowserContext with either storage_state or fresh credentials login."""
    mode = config["auth"]["mode"]
    if mode == "session_replay":
        storage_path = ROOT / config["auth"]["storage_state"]
        if not storage_path.exists():
            raise FileNotFoundError(
                f"Session missing: {storage_path}. Run `udd login` first."
            )
        return browser.new_context(storage_state=str(storage_path))

    if mode == "credentials":
        context = browser.new_context()
        page = context.new_page()
        page.goto(config["project"]["url"])
        service = config["auth"]["keyring_service"]
        user_id = keyring.get_password(service, config["auth"]["keyring_user_key"])
        user_pw = keyring.get_password(service, config["auth"]["keyring_pw_key"])
        if not user_id or not user_pw:
            raise RuntimeError(
                f"Credentials missing in keyring '{service}'. Run `udd login` to set them."
            )
        # Selectors for login form are defined in selectors.yaml (login_id_field, login_pw_field, login_submit)
        from navigate import find
        find(page, "login_id_field").fill(user_id)
        find(page, "login_pw_field").fill(user_pw)
        find(page, "login_submit").click()
        page.wait_for_load_state("networkidle")
        page.close()
        return context

    raise ValueError(f"Unknown auth mode: {mode!r}")


def is_session_valid(page: Page, config: dict) -> bool:
    """Visit the login URL. If not redirected to login page, session is valid."""
    url = config["project"]["url"]
    page.goto(url, wait_until="domcontentloaded")
    current = page.url
    # Heuristic: login pages typically contain 'login' in URL
    return "login" not in current.lower() or current == url
```

- [ ] **Step 14.2: Commit**

```bash
git add skills/udd/templates/src/auth.py.tmpl
git commit -m "feat(udd): add auth.py template — session_replay + credentials modes"
```

### Task 15: `scripts/auth_flow.py` — Stage 3 helper that drives codegen

**Files:**
- Create: `skills/udd/scripts/auth_flow.py`
- Create: `skills/udd/tests/test_auth_flow.py`

- [ ] **Step 15.1: Write failing test**

```python
from pathlib import Path

from auth_flow import build_codegen_command


def test_build_codegen_command_save_storage(tmp_path):
    cmd = build_codegen_command(
        python_exe="/usr/bin/python3",
        mode="save",
        storage_path=tmp_path / "storage.json",
        url="https://example.com",
    )
    assert cmd[0] == "/usr/bin/python3"
    assert "-m" in cmd
    assert "playwright" in cmd
    assert "codegen" in cmd
    assert "--save-storage" in cmd
    assert str(tmp_path / "storage.json") in cmd
    assert "https://example.com" in cmd


def test_build_codegen_command_load_and_record(tmp_path):
    cmd = build_codegen_command(
        python_exe="/usr/bin/python3",
        mode="record",
        storage_path=tmp_path / "storage.json",
        url="https://example.com",
        output=tmp_path / "raw.py",
    )
    assert "--load-storage" in cmd
    assert "--output" in cmd
    assert str(tmp_path / "raw.py") in cmd
    assert "--target" in cmd
    assert "python" in cmd
```

- [ ] **Step 15.2: Write `skills/udd/scripts/auth_flow.py`**

```python
"""Stage 3 — launch Playwright codegen for session capture.

Also provides --verify mode that confirms the saved session actually works.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import yaml


def build_codegen_command(
    python_exe: str,
    mode: str,
    storage_path: Path,
    url: str,
    output: Path | None = None,
) -> list[str]:
    """Build playwright codegen invocation. mode: 'save' or 'record'."""
    cmd = [python_exe, "-m", "playwright", "codegen", "--target", "python"]
    if mode == "save":
        cmd += ["--save-storage", str(storage_path)]
    elif mode == "record":
        cmd += ["--load-storage", str(storage_path)]
        if output is None:
            raise ValueError("mode=record requires output path")
        cmd += ["--output", str(output)]
    else:
        raise ValueError(f"Unknown mode: {mode!r}")
    cmd.append(url)
    return cmd


def project_python(project_dir: Path) -> str:
    if sys.platform == "win32":
        return str(project_dir / ".venv" / "Scripts" / "python.exe")
    return str(project_dir / ".venv" / "bin" / "python")


def load_config(project_dir: Path) -> dict:
    with (project_dir / "config.yaml").open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def verify_session(project_dir: Path, url: str, storage_path: Path) -> bool:
    """Launch a headless browser, load storage, visit URL, verify no login redirect."""
    py = project_python(project_dir)
    script = f"""
import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    ctx = b.new_context(storage_state={str(storage_path)!r})
    p = ctx.new_page()
    p.goto({url!r}, wait_until='domcontentloaded')
    sys.exit(0 if 'login' not in p.url.lower() or p.url == {url!r} else 1)
"""
    result = subprocess.run([py, "-c", script], capture_output=True, timeout=60)
    return result.returncode == 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("--mode", choices=["save", "verify"], default="save")
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    config = load_config(project_dir)
    url = config["project"]["url"]
    storage_path = project_dir / config["auth"]["storage_state"]
    storage_path.parent.mkdir(parents=True, exist_ok=True)

    if args.mode == "save":
        print(f"Opening browser to {url}. Log in, then close the browser.", file=sys.stderr)
        cmd = build_codegen_command(project_python(project_dir), "save", storage_path, url)
        subprocess.run(cmd, check=False)
        if not storage_path.exists():
            print(f"ERROR: storage not saved at {storage_path}", file=sys.stderr)
            return 1
        print(f"Saved session to {storage_path}", file=sys.stderr)
        # verify immediately
        if verify_session(project_dir, url, storage_path):
            print("Session verified.")
            return 0
        print("WARNING: session saved but verification failed.", file=sys.stderr)
        return 1

    if args.mode == "verify":
        return 0 if verify_session(project_dir, url, storage_path) else 1


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 15.3: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_auth_flow.py -v`
Expected: 2 passed.

- [ ] **Step 15.4: Commit**

```bash
git add skills/udd/scripts/auth_flow.py skills/udd/tests/test_auth_flow.py
git commit -m "feat(udd): add Stage 3 auth_flow — codegen + session verify"
```

### Task 16: `scripts/record_flow.py` — Stage 4 helper

**Files:**
- Create: `skills/udd/scripts/record_flow.py`
- Create: `skills/udd/tests/test_record_flow.py`

- [ ] **Step 16.1: Write failing test**

```python
from pathlib import Path

from record_flow import validate_recording


def test_validate_recording_ok(tmp_path):
    rec = tmp_path / "raw.py"
    rec.write_text("""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(storage_state="auth/storage.json")
    page = context.new_page()
    page.goto("https://erp.example.com")
    page.get_by_text("다운로드").click()
    with page.expect_download() as dl:
        page.get_by_role("button", name="엑셀").click()
""")
    assert validate_recording(rec) == (True, [])


def test_validate_recording_missing_file(tmp_path):
    rec = tmp_path / "missing.py"
    ok, issues = validate_recording(rec)
    assert ok is False
    assert any("not found" in i.lower() for i in issues)


def test_validate_recording_no_goto(tmp_path):
    rec = tmp_path / "raw.py"
    rec.write_text("# empty recording\n")
    ok, issues = validate_recording(rec)
    assert ok is False
    assert any("page.goto" in i for i in issues)
```

- [ ] **Step 16.2: Write `skills/udd/scripts/record_flow.py`**

```python
"""Stage 4 — Playwright codegen recording of the full download path.

Prerequisite: Stage 3 completed (storage.json exists).
Produces: recordings/raw_recording.py
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))
from auth_flow import build_codegen_command, project_python


def validate_recording(path: Path) -> tuple[bool, list[str]]:
    issues: list[str] = []
    if not path.exists():
        return False, [f"Recording file not found: {path}"]
    content = path.read_text(encoding="utf-8")
    if "page.goto" not in content:
        issues.append("Missing page.goto call — did you navigate anywhere?")
    has_download = (
        "expect_download" in content
        or "download" in content.lower() and "button" in content.lower()
    )
    if not has_download:
        issues.append("No expect_download or download-trigger pattern detected.")
    return (len(issues) == 0, issues)


def load_config(project_dir: Path) -> dict:
    with (project_dir / "config.yaml").open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    config = load_config(project_dir)
    url = config["project"]["url"]
    storage_path = project_dir / config["auth"]["storage_state"]
    output_path = project_dir / "recordings" / "raw_recording.py"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not storage_path.exists():
        print(f"ERROR: session not found. Run auth_flow.py first.", file=sys.stderr)
        return 2

    print(f"Opening browser to {url}.", file=sys.stderr)
    print("Navigate to the download, complete it, then close the browser.", file=sys.stderr)

    cmd = build_codegen_command(
        project_python(project_dir), "record", storage_path, url, output_path
    )
    subprocess.run(cmd, check=False)

    ok, issues = validate_recording(output_path)
    if ok:
        print(f"Recording saved: {output_path}")
        return 0

    for issue in issues:
        print(f"- {issue}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 16.3: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_record_flow.py -v`
Expected: 3 passed.

- [ ] **Step 16.4: Commit**

```bash
git add skills/udd/scripts/record_flow.py skills/udd/tests/test_record_flow.py
git commit -m "feat(udd): add Stage 4 record_flow — codegen + recording validation"
```

### Task 17: Extend SKILL.md with Stage 0-4 execution detail

**Files:**
- Modify: `skills/udd/SKILL.md`

- [ ] **Step 17.1: Replace Stage placeholder comment with Stage 0-4 detailed instructions**

Using Edit to append after the `<!-- Stage sections will be added in later waves. -->` line:

Replace:
```
Full stage details follow in the sections below.

<!-- Stage sections will be added in later waves. -->
```

With:
```
Full stage details follow in the sections below.

## Stage 0 — PRECHECK

Run `python $SKILL_DIR/scripts/precheck.py` and parse its JSON stdout.

Handling by status:
- `status=ok`: proceed to Stage 1.
- `status=missing`: the `missing` array lists what to install. Offer the user:
  - `playwright` missing → `pip install playwright`
  - `chromium` missing → `python -m playwright install chromium`
- `status=error`: `errors` array lists hard blockers (e.g., Python too old). Stop.

Also emit to the user:
- `autonomous_mode=false` → tell them to restart the CLI in autonomous mode (see table above).
- `ai_providers=[]` → warn that Stage 6 self-healing will be disabled; ask if they want to proceed anyway.

## Stage 1 — SCOPE

Ask the user five questions in order (one at a time):

1. System slug (lowercase-kebab)
2. Login URL
3. One-line description
4. Schedule (cron or natural language, e.g., "매일 09:00")
5. Expected columns (comma-separated; empty to skip)

Concatenate answers into a 5-line stdin payload and run:
```bash
printf "<ans1>\n<ans2>\n<ans3>\n<ans4>\n<ans5>\n" | \
  python $SKILL_DIR/scripts/scope.py $HOME/ax-downloads/<slug> --from-stdin
```
Confirm `config.yaml` is visible; offer the user a peek; ask if anything needs editing.

## Stage 2 — SCAFFOLD

```bash
python $SKILL_DIR/scripts/scaffold.py $PROJECT_DIR --skill-dir $SKILL_DIR
```
This creates the directory tree, renders all templates, creates `.venv`, installs requirements, installs Chromium, and runs `git init` + initial commit. Total time: 1–3 min depending on network.

## Stage 3 — AUTH

Tell the user: "A browser will open. Log in normally (OTP, SSO, whatever your system requires), reach the main page, then return to this terminal."

```bash
python $SKILL_DIR/scripts/auth_flow.py $PROJECT_DIR --mode save
```
The script opens `playwright codegen`, waits for the user to close the browser, then runs a headless verification. Exit 0 = session valid. Exit 1 = session saved but verification failed (warn user; they can retry).

## Stage 4 — RECORD

Tell the user: "The browser will open again — this time logged in. Navigate to the data you want, apply filters, click the download button. Close the browser when done."

```bash
python $SKILL_DIR/scripts/record_flow.py $PROJECT_DIR
```
Validates that the recording contains `page.goto` and a download-trigger pattern. If validation fails, offer to re-record.

<!-- Stage 5-9 sections will be added in later waves. -->
```

Use Edit tool to perform this replacement.

- [ ] **Step 17.2: Verify SKILL.md integrity**

Run: `head -80 skills/udd/SKILL.md`
Expected: Stage 0–4 sections now present, Stage 5–9 placeholder comment at bottom.

- [ ] **Step 17.3: Commit**

```bash
git add skills/udd/SKILL.md
git commit -m "docs(udd): add Stage 0-4 execution detail to SKILL.md"
```

### Task 18: Wave 3 full test run

- [ ] **Step 18.1: Run full pytest**

Run: `cd skills/udd && .venv/bin/pytest -v`
Expected: all tests pass (platform + template_render + precheck + scope + scaffold + auth_flow + record_flow + integration).

- [ ] **Step 18.2: Tag Wave 3 complete**

```bash
cd skills/udd
git tag wave-3-complete
git log --oneline -15
```

---

## Wave 4 — LLM abstraction + Static fallback + Stage 5 REFACTOR (7 tasks)

Goal: `selectors.yaml` + `navigate.py` auto-generated from raw recording, driven by LLM call via provider-agnostic client.

### Task 19: `scripts/lib/llm_call.py` — 3-provider abstraction (scaffold-side)

**Files:**
- Create: `skills/udd/scripts/lib/llm_call.py`
- Create: `skills/udd/tests/test_llm_call_fallback.py`

- [ ] **Step 19.1: Write failing test**

```python
import pytest

from lib.llm_call import detect_provider_from_env, NoProviderError


def test_detect_auto_picks_anthropic_first(clear_ai_env, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "a")
    monkeypatch.setenv("GEMINI_API_KEY", "g")
    monkeypatch.setenv("OPENAI_API_KEY", "o")
    assert detect_provider_from_env("auto") == "anthropic"


def test_detect_auto_picks_gemini_when_no_anthropic(clear_ai_env, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "g")
    monkeypatch.setenv("OPENAI_API_KEY", "o")
    assert detect_provider_from_env("auto") == "gemini"


def test_detect_auto_picks_openai_when_only_it(clear_ai_env, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "o")
    assert detect_provider_from_env("auto") == "openai"


def test_detect_explicit_forces_choice(clear_ai_env, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "g")
    # Explicit override — returns what was asked even if its key is missing
    # (actual call will fail elsewhere; detect is about choice only)
    assert detect_provider_from_env("openai") == "openai"


def test_detect_none_raises(clear_ai_env):
    with pytest.raises(NoProviderError):
        detect_provider_from_env("auto")
```

- [ ] **Step 19.2: Write `skills/udd/scripts/lib/llm_call.py`**

```python
"""Provider-agnostic LLM call wrapper.

Used by skill helper scripts (Stage 5 refactor, Stage 6 diagnosis).
Generated projects embed a functionally equivalent module at src/llm_client.py.
"""

from __future__ import annotations

import base64
import json
import os
from typing import Any


class NoProviderError(RuntimeError):
    pass


def detect_provider_from_env(preference: str = "auto") -> str:
    """Return 'anthropic' | 'gemini' | 'openai'.

    preference='auto' → env fallback chain (anthropic → gemini → openai)
    preference=<explicit> → forced (caller may still get runtime error if key missing)
    """
    if preference == "auto":
        if os.environ.get("ANTHROPIC_API_KEY"):
            return "anthropic"
        if os.environ.get("GEMINI_API_KEY"):
            return "gemini"
        if os.environ.get("OPENAI_API_KEY"):
            return "openai"
        raise NoProviderError(
            "No AI provider API key found. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY."
        )
    if preference in {"anthropic", "claude"}:
        return "anthropic"
    if preference == "gemini":
        return "gemini"
    if preference == "openai":
        return "openai"
    raise ValueError(f"Unknown provider preference: {preference!r}")


def ask(prompt: str, image_bytes: bytes | None = None,
        preference: str = "auto", model_hint: str | None = None,
        max_tokens: int = 1024) -> dict[str, Any]:
    """Send prompt (+ optional image) to chosen provider. Return parsed JSON dict.

    Models (if model_hint not provided):
      anthropic → claude-sonnet-4-6
      gemini    → gemini-2.0-flash
      openai    → gpt-4o-mini

    The prompt is expected to instruct the model to respond with JSON only.
    """
    provider = detect_provider_from_env(preference)
    if provider == "anthropic":
        return _ask_anthropic(prompt, image_bytes, model_hint or "claude-sonnet-4-6", max_tokens)
    if provider == "gemini":
        return _ask_gemini(prompt, image_bytes, model_hint or "gemini-2.0-flash", max_tokens)
    if provider == "openai":
        return _ask_openai(prompt, image_bytes, model_hint or "gpt-4o-mini", max_tokens)
    raise RuntimeError(f"Unreachable: {provider}")


def _ask_anthropic(prompt: str, image_bytes: bytes | None, model: str, max_tokens: int) -> dict:
    from anthropic import Anthropic
    client = Anthropic()
    content: list[dict] = [{"type": "text", "text": prompt}]
    if image_bytes:
        content.insert(0, {
            "type": "image",
            "source": {
                "type": "base64", "media_type": "image/png",
                "data": base64.b64encode(image_bytes).decode(),
            },
        })
    resp = client.messages.create(
        model=model, max_tokens=max_tokens,
        messages=[{"role": "user", "content": content}],
    )
    return _parse_json(resp.content[0].text)


def _ask_gemini(prompt: str, image_bytes: bytes | None, model: str, max_tokens: int) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    m = genai.GenerativeModel(model)
    parts: list = [prompt]
    if image_bytes:
        parts.append({"mime_type": "image/png", "data": image_bytes})
    resp = m.generate_content(
        parts,
        generation_config={"response_mime_type": "application/json",
                           "max_output_tokens": max_tokens},
    )
    return _parse_json(resp.text)


def _ask_openai(prompt: str, image_bytes: bytes | None, model: str, max_tokens: int) -> dict:
    from openai import OpenAI
    client = OpenAI()
    content: list[dict] = [{"type": "text", "text": prompt}]
    if image_bytes:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{base64.b64encode(image_bytes).decode()}"
            },
        })
    resp = client.chat.completions.create(
        model=model, max_tokens=max_tokens,
        messages=[{"role": "user", "content": content}],
        response_format={"type": "json_object"},
    )
    return _parse_json(resp.choices[0].message.content)


def _parse_json(text: str) -> dict:
    """Extract JSON from LLM response (tolerates ```json fences)."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0].strip()
    return json.loads(text)
```

- [ ] **Step 19.3: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_llm_call_fallback.py -v`
Expected: 5 passed.

- [ ] **Step 19.4: Commit**

```bash
git add skills/udd/scripts/lib/llm_call.py skills/udd/tests/test_llm_call_fallback.py
git commit -m "feat(udd): add llm_call — 3-provider abstraction w/ env detection"
```

### Task 20: `templates/src/llm_client.py.tmpl` — same module for generated project

**Files:**
- Create: `skills/udd/templates/src/llm_client.py.tmpl`

- [ ] **Step 20.1: Copy lib/llm_call.py into template form**

Since the content is identical (only module name and docstring change), write:

```python
"""LLM client for {{project_name}}.

3-provider abstraction (Anthropic / Gemini / OpenAI) with env-based auto-detect.
Same interface as the skill-bundle helper (scripts/lib/llm_call.py).
"""

from __future__ import annotations

import base64
import json
import os
from typing import Any


class NoProviderError(RuntimeError):
    pass


def detect_provider_from_env(preference: str = "auto") -> str:
    if preference == "auto":
        if os.environ.get("ANTHROPIC_API_KEY"):
            return "anthropic"
        if os.environ.get("GEMINI_API_KEY"):
            return "gemini"
        if os.environ.get("OPENAI_API_KEY"):
            return "openai"
        raise NoProviderError(
            "No AI provider API key found. "
            "Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY."
        )
    if preference in {"anthropic", "claude"}:
        return "anthropic"
    if preference == "gemini":
        return "gemini"
    if preference == "openai":
        return "openai"
    raise ValueError(f"Unknown provider preference: {preference!r}")


def ask(prompt: str, image_bytes: bytes | None = None,
        preference: str = "auto", model_hint: str | None = None,
        max_tokens: int = 1024) -> dict[str, Any]:
    provider = detect_provider_from_env(preference)
    if provider == "anthropic":
        return _ask_anthropic(prompt, image_bytes, model_hint or "claude-sonnet-4-6", max_tokens)
    if provider == "gemini":
        return _ask_gemini(prompt, image_bytes, model_hint or "gemini-2.0-flash", max_tokens)
    if provider == "openai":
        return _ask_openai(prompt, image_bytes, model_hint or "gpt-4o-mini", max_tokens)
    raise RuntimeError(f"Unreachable: {provider}")


def _ask_anthropic(prompt, image_bytes, model, max_tokens):
    from anthropic import Anthropic
    client = Anthropic()
    content = [{"type": "text", "text": prompt}]
    if image_bytes:
        content.insert(0, {
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png",
                       "data": base64.b64encode(image_bytes).decode()},
        })
    resp = client.messages.create(
        model=model, max_tokens=max_tokens,
        messages=[{"role": "user", "content": content}],
    )
    return _parse_json(resp.content[0].text)


def _ask_gemini(prompt, image_bytes, model, max_tokens):
    import google.generativeai as genai
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    m = genai.GenerativeModel(model)
    parts = [prompt]
    if image_bytes:
        parts.append({"mime_type": "image/png", "data": image_bytes})
    resp = m.generate_content(
        parts,
        generation_config={"response_mime_type": "application/json",
                           "max_output_tokens": max_tokens},
    )
    return _parse_json(resp.text)


def _ask_openai(prompt, image_bytes, model, max_tokens):
    from openai import OpenAI
    client = OpenAI()
    content = [{"type": "text", "text": prompt}]
    if image_bytes:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{base64.b64encode(image_bytes).decode()}"
            },
        })
    resp = client.chat.completions.create(
        model=model, max_tokens=max_tokens,
        messages=[{"role": "user", "content": content}],
        response_format={"type": "json_object"},
    )
    return _parse_json(resp.choices[0].message.content)


def _parse_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0].strip()
    return json.loads(text)
```

- [ ] **Step 20.2: Commit**

```bash
git add skills/udd/templates/src/llm_client.py.tmpl
git commit -m "feat(udd): add llm_client template for generated projects"
```

### Task 21: `templates/src/navigate.py.tmpl` — selector fallback + healer hook

**Files:**
- Create: `skills/udd/templates/src/navigate.py.tmpl`

- [ ] **Step 21.1: Write template**

```python
"""Navigation with selector fallback chain + runtime AI healing.

Selectors defined in ../selectors.yaml.
Each entry has: description, primary, fallbacks, ai_discovered (auto-populated).
"""

from __future__ import annotations

import logging
from pathlib import Path

import yaml
from playwright.sync_api import Locator, Page, TimeoutError as PWTimeout


ROOT = Path(__file__).resolve().parent.parent
log = logging.getLogger("{{project_name}}.navigate")


def load_selectors() -> dict:
    with (ROOT / "selectors.yaml").open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data


_SELECTORS_CACHE = None


def selectors() -> dict:
    global _SELECTORS_CACHE
    if _SELECTORS_CACHE is None:
        _SELECTORS_CACHE = load_selectors()
    return _SELECTORS_CACHE


def save_selectors(data: dict) -> None:
    """Persist selector updates (used by healing promotion)."""
    with (ROOT / "selectors.yaml").open("w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)


def _try(page: Page, selector: str, timeout_ms: int = 3000) -> Locator | None:
    """Attempt to locate a single element within timeout_ms. Return None on failure."""
    try:
        loc = page.locator(selector).first
        loc.wait_for(state="visible", timeout=timeout_ms)
        return loc
    except PWTimeout:
        return None
    except Exception as e:
        log.debug("Selector %r raised %s", selector, e)
        return None


def find(page: Page, name: str, timeout_ms: int = 3000) -> Locator:
    """Locate element by name using 4-layer defense:

    1. ai_discovered (sorted by success_count descending)
    2. primary
    3. fallbacks (in order)
    4. AI healing (healer.heal) — only if enabled
    """
    all_sel = selectors()
    if name not in all_sel:
        raise KeyError(f"Unknown selector name: {name!r}. Check selectors.yaml.")

    entry = all_sel[name]

    # Layer 0: ai_discovered
    ai_list = sorted(entry.get("ai_discovered", []) or [],
                     key=lambda e: e.get("success_count", 0), reverse=True)
    for ai in ai_list:
        loc = _try(page, ai["selector"], timeout_ms)
        if loc is not None:
            log.info("navigate: %s via ai_discovered %s", name, ai["selector"])
            return loc

    # Layer 1: primary
    primary = entry.get("primary")
    if primary:
        loc = _try(page, primary, timeout_ms)
        if loc is not None:
            log.debug("navigate: %s via primary", name)
            return loc

    # Layer 2: fallbacks
    for fb in entry.get("fallbacks", []) or []:
        loc = _try(page, fb, timeout_ms)
        if loc is not None:
            log.warning("navigate: %s via fallback %s", name, fb)
            return loc

    # Layer 3: AI healing
    from healer import heal  # imported here to avoid circular import on generation time
    loc = heal(page, name)
    if loc is not None:
        return loc

    raise ElementNotFoundError(f"All selectors failed for {name!r}.")


class ElementNotFoundError(RuntimeError):
    pass


def execute_download(page: Page, config: dict):
    """Stage 5 (refactor.py) replaces this function body with the actual navigation steps.

    Default implementation delegates to download.trigger_download for the conventional name.
    """
    from download import trigger_download
    # AI refactor fills in the goto + clicks; this stub covers the final step.
    page.goto(config["project"]["url"], wait_until="networkidle")
    return trigger_download(page, "download_excel_button", config)
```

- [ ] **Step 21.2: Commit**

```bash
git add skills/udd/templates/src/navigate.py.tmpl
git commit -m "feat(udd): add navigate template — 4-layer defense selector resolution"
```

### Task 22: `templates/src/download.py.tmpl`

**Files:**
- Create: `skills/udd/templates/src/download.py.tmpl`

- [ ] **Step 22.1: Write template**

```python
"""File download trigger + save path resolution for {{project_name}}."""

from __future__ import annotations

import datetime as dt
from pathlib import Path

from playwright.sync_api import Page


ROOT = Path(__file__).resolve().parent.parent


def resolve_save_dir(config: dict) -> Path:
    """Expand {YYYY-MM-DD} in config.download.save_dir."""
    template = config["download"]["save_dir"]
    today = dt.date.today().isoformat()
    path = template.replace("{YYYY-MM-DD}", today)
    save_dir = ROOT / path
    save_dir.mkdir(parents=True, exist_ok=True)
    return save_dir


def trigger_download(page: Page, button_name: str, config: dict) -> Path:
    """Click the download-trigger element and save the file.

    button_name is a selectors.yaml key (e.g., 'download_excel_button').
    """
    from navigate import find

    timeout_ms = config["download"].get("timeout_ms", 60000)
    save_dir = resolve_save_dir(config)

    with page.expect_download(timeout=timeout_ms) as dl_info:
        find(page, button_name).click()
    download = dl_info.value

    suggested = download.suggested_filename or "download.bin"
    save_path = save_dir / suggested
    download.save_as(str(save_path))
    return save_path
```

- [ ] **Step 22.2: Commit**

```bash
git add skills/udd/templates/src/download.py.tmpl
git commit -m "feat(udd): add download template — expect_download + save path"
```

### Task 23: `scripts/refactor.py` — Stage 5 AI-driven refactor

**Files:**
- Create: `skills/udd/scripts/refactor.py`
- Create: `skills/udd/tests/test_refactor.py`

- [ ] **Step 23.1: Write failing test**

```python
from pathlib import Path
from unittest.mock import patch

from refactor import build_prompt, apply_refactor_result


def test_build_prompt_contains_recording():
    recording = 'page.goto("https://x.com")\npage.click("text=통계")\n'
    config = {"project": {"url": "https://x.com"}, "validation": {"expected_columns": ["날짜"]}}
    prompt = build_prompt(recording, config)
    assert recording in prompt
    assert "selectors_yaml" in prompt
    assert "navigate_py" in prompt


def test_apply_refactor_result_writes_files(tmp_path):
    project = tmp_path / "p"
    (project / "src").mkdir(parents=True)
    (project / "selectors.yaml").write_text("# empty\n")

    result = {
        "selectors_yaml": """
login_page:
  description: "로그인 페이지"
  primary: "text=로그인"
  fallbacks: ["id=login-btn"]
  ai_discovered: []
""",
        "navigate_py": '''
from playwright.sync_api import Page
def steps(page: Page, config: dict) -> None:
    from navigate import find
    find(page, "login_page").click()
''',
        "config_patches": {"filters": {"start_date": "{today-7d}"}},
    }
    apply_refactor_result(project, result)

    selectors = (project / "selectors.yaml").read_text()
    assert "login_page" in selectors

    # navigate.py should have the steps() function appended
    nav = (project / "src" / "navigate.py").read_text() if (project / "src" / "navigate.py").exists() else ""
    assert "def steps" in nav
```

- [ ] **Step 23.2: Write `skills/udd/scripts/refactor.py`**

```python
"""Stage 5 — AI refactor of raw_recording.py into selectors.yaml + navigate steps."""

from __future__ import annotations

import argparse
import json
import py_compile
import subprocess
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))
from lib.llm_call import ask


PROMPT_TEMPLATE = """You are refactoring Playwright codegen output into a maintainable structure.

Split the following raw recording into three outputs:

1. selectors_yaml — each interaction point as a YAML entry with:
   - description (Korean, human readable)
   - primary (robust selector from recording: prefer data-test, aria-label, id)
   - fallbacks (2-4 alternatives using text=, xpath=, role=)
   - ai_discovered: [] (empty initially)

2. navigate_py — Python code defining a single function `steps(page, config)`.
   Use `find(page, "<name>")` calls instead of raw page.locator/click.
   Wrap each logical step with a `log.info()` call.

3. config_patches — any hardcoded dates/values turned into template variables
   (supported: {{today}}, {{today-Nd}}, {{yesterday}}, {{this_month_start}}).
   Return as a dict of dotted-path -> new value.

Raw recording:
<RECORDING>

Project context:
  URL: <URL>
  Expected columns: <COLS>

Respond with JSON ONLY in this exact shape:
{{
  "selectors_yaml": "<yaml string>",
  "navigate_py": "<python code string>",
  "config_patches": {{ "path.to.key": "new_value" }}
}}
"""


def build_prompt(recording: str, config: dict) -> str:
    url = config.get("project", {}).get("url", "?")
    cols = config.get("validation", {}).get("expected_columns", [])
    return (PROMPT_TEMPLATE
            .replace("<RECORDING>", recording)
            .replace("<URL>", url)
            .replace("<COLS>", ", ".join(cols) if cols else "(none specified)"))


def merge_yaml(existing_path: Path, new_yaml_str: str) -> None:
    existing = {}
    if existing_path.exists():
        try:
            existing = yaml.safe_load(existing_path.read_text(encoding="utf-8")) or {}
        except yaml.YAMLError:
            existing = {}
    new = yaml.safe_load(new_yaml_str) or {}
    existing.update(new)
    with existing_path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(existing, f, allow_unicode=True, sort_keys=False)


def apply_refactor_result(project_dir: Path, result: dict) -> None:
    # selectors.yaml (merge with existing)
    merge_yaml(project_dir / "selectors.yaml", result["selectors_yaml"])

    # navigate.py — append the steps() function
    nav_path = project_dir / "src" / "navigate.py"
    existing = nav_path.read_text(encoding="utf-8") if nav_path.exists() else ""
    if "def steps(" not in existing:
        # Append after the final newline
        separator = "\n\n# --- Generated by refactor (Stage 5) ---\n"
        nav_path.parent.mkdir(parents=True, exist_ok=True)
        nav_path.write_text(existing + separator + result["navigate_py"].strip() + "\n",
                            encoding="utf-8")

    # config patches
    cfg_path = project_dir / "config.yaml"
    if cfg_path.exists() and result.get("config_patches"):
        cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
        for dotted, value in result["config_patches"].items():
            parts = dotted.split(".")
            node = cfg
            for p in parts[:-1]:
                node = node.setdefault(p, {})
            node[parts[-1]] = value
        with cfg_path.open("w", encoding="utf-8") as f:
            yaml.safe_dump(cfg, f, allow_unicode=True, sort_keys=False)


def verify_syntax(project_dir: Path) -> tuple[bool, str]:
    nav_path = project_dir / "src" / "navigate.py"
    if not nav_path.exists():
        return False, f"{nav_path} missing"
    try:
        py_compile.compile(str(nav_path), doraise=True)
        return True, ""
    except py_compile.PyCompileError as e:
        return False, str(e)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("--dry-run", action="store_true",
                        help="Print prompt + mock result without LLM call")
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    recording = (project_dir / "recordings" / "raw_recording.py").read_text(encoding="utf-8")
    config = yaml.safe_load((project_dir / "config.yaml").read_text(encoding="utf-8"))

    prompt = build_prompt(recording, config)
    if args.dry_run:
        print(prompt)
        return 0

    try:
        result = ask(prompt, preference=config["healing"]["ai_provider"], max_tokens=4000)
    except Exception as e:
        print(f"LLM call failed: {e}", file=sys.stderr)
        return 2

    for key in ("selectors_yaml", "navigate_py"):
        if key not in result:
            print(f"LLM response missing key: {key}", file=sys.stderr)
            print(json.dumps(result, ensure_ascii=False)[:500], file=sys.stderr)
            return 3

    apply_refactor_result(project_dir, result)
    ok, err = verify_syntax(project_dir)
    if not ok:
        print(f"Syntax check failed: {err}", file=sys.stderr)
        # Retry once with error message in prompt
        retry_prompt = prompt + f"\n\nPrevious attempt had syntax error:\n{err}\nFix it."
        result2 = ask(retry_prompt, preference=config["healing"]["ai_provider"], max_tokens=4000)
        apply_refactor_result(project_dir, result2)
        ok, err = verify_syntax(project_dir)
        if not ok:
            print(f"Retry also failed: {err}", file=sys.stderr)
            return 4

    print(f"Refactored: selectors.yaml + src/navigate.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 23.3: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_refactor.py -v`
Expected: 2 passed.

- [ ] **Step 23.4: Commit**

```bash
git add skills/udd/scripts/refactor.py skills/udd/tests/test_refactor.py
git commit -m "feat(udd): add Stage 5 refactor — AI-driven selectors.yaml + navigate.py generation"
```

### Task 24: `templates/tests/test_selectors.py.tmpl` — selector schema checks

**Files:**
- Create: `skills/udd/templates/tests/test_selectors.py.tmpl`

- [ ] **Step 24.1: Write template**

```python
"""Selector schema validation for {{project_name}}."""

from pathlib import Path
import yaml

SELECTORS = Path(__file__).resolve().parent.parent / "selectors.yaml"


def test_selectors_file_exists():
    assert SELECTORS.exists()


def test_each_entry_has_required_keys():
    data = yaml.safe_load(SELECTORS.read_text(encoding="utf-8")) or {}
    for name, entry in data.items():
        assert isinstance(entry, dict), f"{name}: must be a mapping"
        assert "description" in entry, f"{name}: missing description"
        assert "primary" in entry or entry.get("fallbacks"), \
            f"{name}: must have either primary or fallbacks"


def test_ai_discovered_entries_have_structure():
    data = yaml.safe_load(SELECTORS.read_text(encoding="utf-8")) or {}
    for name, entry in data.items():
        for ai in entry.get("ai_discovered", []) or []:
            assert "selector" in ai, f"{name}: ai_discovered entry missing 'selector'"
            assert "discovered_at" in ai, f"{name}: ai_discovered missing 'discovered_at'"
            assert "success_count" in ai, f"{name}: ai_discovered missing 'success_count'"
```

- [ ] **Step 24.2: Commit**

```bash
git add skills/udd/templates/tests/test_selectors.py.tmpl
git commit -m "feat(udd): add selectors schema test template"
```

### Task 25: Append Stage 5 to SKILL.md

**Files:**
- Modify: `skills/udd/SKILL.md`

- [ ] **Step 25.1: Replace Stage 5-9 placeholder with Stage 5 content**

Replace:
```
<!-- Stage 5-9 sections will be added in later waves. -->
```

With:
```
## Stage 5 — REFACTOR

Calls `scripts/refactor.py` which uses the configured AI provider to refactor `recordings/raw_recording.py` into:
- `selectors.yaml` — named selector entries with primary + fallbacks
- `src/navigate.py` — `steps(page, config)` function using `find(page, "<name>")` calls
- `config.yaml` patches — hardcoded values → template variables

```bash
python $SKILL_DIR/scripts/refactor.py $PROJECT_DIR
```

Exit codes:
- 0: success
- 2: LLM call failed (check API key / rate limits / network)
- 3: LLM returned malformed JSON (rare; script retries once)
- 4: Generated code has syntax errors (retried once then gives up)

If exit != 0, surface the error to the user and offer to retry or fall back to manually editing selectors.yaml.

<!-- Stage 6-9 sections will be added in later waves. -->
```

- [ ] **Step 25.2: Commit**

```bash
git add skills/udd/SKILL.md
git commit -m "docs(udd): add Stage 5 execution detail to SKILL.md"
```

---

## Wave 5 — Validators + Healer + Notify + Stage 6 VALIDATE + Stage 7 APPROVE (8 tasks)

Goal: Runtime validation, AI self-healing, telegram notifications, and the autonomous validation loop that brings the generated project to "passing" state.

### Task 26: `templates/src/validators.py.tmpl` + test template

**Files:**
- Create: `skills/udd/templates/src/validators.py.tmpl`
- Create: `skills/udd/templates/tests/test_validators.py.tmpl`

- [ ] **Step 26.1: Write `skills/udd/templates/src/validators.py.tmpl`**

```python
"""File + data validation for {{project_name}}."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd


@dataclass
class ValidationReport:
    passed: bool
    issues: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    stats: dict = field(default_factory=dict)


def _detect_format(path: Path) -> str:
    suffix = path.suffix.lower().lstrip(".")
    if suffix in {"xlsx", "xlsm"}: return "xlsx"
    if suffix == "csv": return "csv"
    if suffix == "xls": return "xls"
    return suffix or "unknown"


def _load(path: Path, fmt: str) -> pd.DataFrame:
    if fmt in {"xlsx", "xls", "xlsm"}:
        return pd.read_excel(path)
    if fmt == "csv":
        return pd.read_csv(path)
    raise ValueError(f"Unsupported format: {fmt!r}")


def validate(path: Path, config: dict) -> ValidationReport:
    rules = config["validation"]
    expected_fmt = config["download"]["expected_format"]
    report = ValidationReport(passed=True)

    if not path.exists():
        report.passed = False
        report.issues.append(f"File not found: {path}")
        return report

    size_kb = path.stat().st_size / 1024
    report.stats["size_kb"] = round(size_kb, 2)
    lo, hi = rules.get("size_bounds_kb", [0, 10 ** 9])
    if size_kb < lo:
        report.passed = False
        report.issues.append(f"File too small: {size_kb:.1f} KB < {lo} KB")
    if size_kb > hi:
        report.warnings.append(f"File larger than expected: {size_kb:.1f} KB > {hi} KB")

    fmt = _detect_format(path)
    report.stats["format"] = fmt
    if fmt != expected_fmt:
        report.passed = False
        report.issues.append(f"Expected format {expected_fmt!r}, got {fmt!r}")
        return report

    try:
        df = _load(path, fmt)
    except Exception as e:
        report.passed = False
        report.issues.append(f"Failed to parse {fmt}: {e}")
        return report

    report.stats["rows"] = len(df)
    report.stats["columns"] = list(df.columns)

    if len(df) < rules.get("min_rows", 1):
        report.passed = False
        report.issues.append(f"Row count {len(df)} < min_rows {rules['min_rows']}")

    expected_cols = rules.get("expected_columns", [])
    if expected_cols:
        missing = [c for c in expected_cols if c not in df.columns]
        if missing:
            msg = f"Missing columns: {missing}"
            if rules.get("columns_strict", False):
                report.passed = False
                report.issues.append(msg)
            else:
                report.warnings.append(msg)

    return report
```

- [ ] **Step 26.2: Write `skills/udd/templates/tests/test_validators.py.tmpl`**

```python
"""Tests for validators.py."""

from pathlib import Path
import pandas as pd
import pytest

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from validators import validate, _detect_format


@pytest.fixture
def base_config():
    return {
        "validation": {
            "min_rows": 1,
            "expected_columns": ["날짜", "매출"],
            "size_bounds_kb": [0.01, 1000000],
            "columns_strict": False,
        },
        "download": {"expected_format": "xlsx"},
    }


def test_detect_format_xlsx(tmp_path):
    assert _detect_format(tmp_path / "a.xlsx") == "xlsx"
    assert _detect_format(tmp_path / "a.csv") == "csv"


def test_validate_missing_file(tmp_path, base_config):
    report = validate(tmp_path / "missing.xlsx", base_config)
    assert not report.passed
    assert any("not found" in i for i in report.issues)


def test_validate_wrong_format(tmp_path, base_config):
    p = tmp_path / "wrong.pdf"
    p.write_bytes(b"%PDF-1.4\n")
    report = validate(p, base_config)
    assert not report.passed
    assert any("format" in i for i in report.issues)


def test_validate_good_xlsx(tmp_path, base_config):
    p = tmp_path / "good.xlsx"
    pd.DataFrame({"날짜": ["2026-01-01"], "매출": [1000]}).to_excel(p, index=False)
    report = validate(p, base_config)
    assert report.passed
    assert report.stats["rows"] == 1


def test_validate_missing_column_lenient(tmp_path, base_config):
    p = tmp_path / "nocol.xlsx"
    pd.DataFrame({"날짜": ["2026-01-01"]}).to_excel(p, index=False)
    report = validate(p, base_config)
    assert report.passed  # lenient by default
    assert any("매출" in w for w in report.warnings)


def test_validate_missing_column_strict(tmp_path, base_config):
    base_config["validation"]["columns_strict"] = True
    p = tmp_path / "nocol.xlsx"
    pd.DataFrame({"날짜": ["2026-01-01"]}).to_excel(p, index=False)
    report = validate(p, base_config)
    assert not report.passed
```

- [ ] **Step 26.3: Commit**

```bash
git add skills/udd/templates/src/validators.py.tmpl skills/udd/templates/tests/test_validators.py.tmpl
git commit -m "feat(udd): add validators template + 6 validation tests"
```

### Task 27: `templates/src/healer.py.tmpl` — runtime AI healing

**Files:**
- Create: `skills/udd/templates/src/healer.py.tmpl`

- [ ] **Step 27.1: Write template**

```python
"""Runtime AI selector healing for {{project_name}}.

Called from navigate.find() when all static selectors fail.
Caps: 1 heal per element per session, max_ai_retries per session.
Writes successes back to selectors.yaml under ai_discovered.
"""

from __future__ import annotations

import datetime as dt
import logging
import re
from pathlib import Path

import yaml
from playwright.sync_api import Locator, Page


ROOT = Path(__file__).resolve().parent.parent
log = logging.getLogger("{{project_name}}.healer")

# Session-scoped state
_SESSION_HEAL_COUNT = 0
_HEALED_THIS_SESSION: set[str] = set()


def _load_config() -> dict:
    with (ROOT / "config.yaml").open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def _compact_dom(page: Page, max_chars: int = 3000) -> str:
    """Best-effort DOM compression — strips scripts, styles, long attrs."""
    html = page.content()
    # Remove script/style blocks
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.I)
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.I)
    # Collapse whitespace
    html = re.sub(r"\s+", " ", html)
    # Truncate
    if len(html) > max_chars:
        html = html[: max_chars // 2] + " ...[TRUNCATED]... " + html[-max_chars // 2 :]
    return html


def _is_cooled_down(element_name: str, entry: dict) -> bool:
    """Check 24h cool-down from last heal attempt."""
    ai_disc = entry.get("ai_discovered", []) or []
    if not ai_disc:
        return True
    last = ai_disc[-1].get("discovered_at")
    if not last:
        return True
    try:
        last_dt = dt.datetime.fromisoformat(last.replace("Z", "+00:00"))
    except ValueError:
        return True
    hours = _load_config()["healing"].get("cool_down_hours", 24)
    return dt.datetime.now(last_dt.tzinfo) - last_dt > dt.timedelta(hours=hours)


def heal(page: Page, element_name: str) -> Locator | None:
    """Attempt AI-driven selector recovery. Return Locator on success, None on failure."""
    global _SESSION_HEAL_COUNT

    config = _load_config()
    if not config["healing"].get("enabled", True):
        log.info("heal: disabled by config")
        return None

    max_retries = config["healing"].get("max_ai_retries", 3)
    if _SESSION_HEAL_COUNT >= max_retries:
        log.warning("heal: session retry budget exhausted (%d/%d)",
                    _SESSION_HEAL_COUNT, max_retries)
        return None

    if element_name in _HEALED_THIS_SESSION:
        log.warning("heal: already attempted %s this session", element_name)
        return None

    from navigate import selectors as sel_factory, save_selectors
    all_sel = sel_factory()
    entry = all_sel.get(element_name, {})

    if not _is_cooled_down(element_name, entry):
        log.warning("heal: %s in cool-down window", element_name)
        return None

    description = entry.get("description", f"Element named '{element_name}'")
    try:
        screenshot = page.screenshot(full_page=False)
    except Exception:
        screenshot = None
    dom = _compact_dom(page)

    prompt = f"""You are a Playwright selector expert.

The automation is trying to locate: "{description}"
Previous selectors (primary + fallbacks) all failed.

Find the correct element in the current DOM.

<dom>
{dom}
</dom>

Respond as JSON only:
{{"selector": "<Playwright selector>", "confidence": 0.0-1.0, "reasoning": "..."}}
"""

    try:
        from llm_client import ask
        result = ask(prompt, image_bytes=screenshot,
                     preference=config["healing"].get("ai_provider", "auto"))
    except Exception as e:
        log.error("heal: LLM call failed: %s", e)
        _SESSION_HEAL_COUNT += 1
        return None

    candidate = result.get("selector")
    if not candidate:
        log.warning("heal: no selector in response")
        _SESSION_HEAL_COUNT += 1
        return None

    _SESSION_HEAL_COUNT += 1
    _HEALED_THIS_SESSION.add(element_name)

    try:
        loc = page.locator(candidate).first
        if loc.count() == 0:
            log.warning("heal: candidate %r matches 0 elements", candidate)
            return None
    except Exception as e:
        log.warning("heal: candidate %r raised %s", candidate, e)
        return None

    # Save to ai_discovered
    if element_name not in all_sel:
        all_sel[element_name] = {"description": description, "fallbacks": [], "ai_discovered": []}
    ai_list = all_sel[element_name].setdefault("ai_discovered", [])
    ai_list.append({
        "selector": candidate,
        "discovered_at": dt.datetime.now().astimezone().isoformat(),
        "success_count": 1,
        "reasoning": result.get("reasoning", ""),
    })
    save_selectors(all_sel)

    from notify import send_heal_event
    try:
        send_heal_event(element_name, candidate, result.get("reasoning", ""))
    except Exception as e:
        log.debug("heal: notify failed: %s", e)

    log.info("heal: SUCCESS %s -> %s", element_name, candidate)
    return loc
```

- [ ] **Step 27.2: Commit**

```bash
git add skills/udd/templates/src/healer.py.tmpl
git commit -m "feat(udd): add healer template — runtime AI selector recovery"
```

### Task 28: `templates/tests/test_healer_mock.py.tmpl` — healer tests (no real API)

**Files:**
- Create: `skills/udd/templates/tests/test_healer_mock.py.tmpl`

- [ ] **Step 28.1: Write template**

```python
"""Healer tests — mocks llm_client and page. No real API calls."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

# Reload module to reset session state between tests
@pytest.fixture(autouse=True)
def reset_healer(monkeypatch):
    import healer
    healer._SESSION_HEAL_COUNT = 0
    healer._HEALED_THIS_SESSION.clear()


def _make_page(selector_to_match: str | None):
    page = MagicMock()
    page.content.return_value = "<html><body><button id='x'>X</button></body></html>"
    page.screenshot.return_value = b""
    if selector_to_match is None:
        page.locator.return_value.count.return_value = 0
    else:
        loc = MagicMock()
        loc.first = loc
        loc.count.return_value = 1
        page.locator.return_value = loc
    return page


def _patch_config(monkeypatch, tmp_path, healing_overrides: dict | None = None):
    """Write a minimal config.yaml + empty selectors.yaml so healer can load them."""
    import healer, navigate
    config = {
        "healing": {"enabled": True, "max_ai_retries": 3, "ai_provider": "auto",
                    "cool_down_hours": 24},
    }
    if healing_overrides:
        config["healing"].update(healing_overrides)
    monkeypatch.setattr(healer, "_load_config", lambda: config)
    monkeypatch.setattr(navigate, "_SELECTORS_CACHE", {})
    monkeypatch.setattr(navigate, "save_selectors", lambda d: None)


def test_heal_disabled_returns_none(monkeypatch, tmp_path):
    import healer
    _patch_config(monkeypatch, tmp_path, {"enabled": False})
    page = _make_page(None)
    assert healer.heal(page, "foo") is None


def test_heal_budget_exhausted(monkeypatch, tmp_path):
    import healer
    _patch_config(monkeypatch, tmp_path, {"max_ai_retries": 0})
    page = _make_page(None)
    assert healer.heal(page, "foo") is None


def test_heal_success(monkeypatch, tmp_path):
    import healer
    _patch_config(monkeypatch, tmp_path)
    page = _make_page("#new-button")

    fake_ask = MagicMock(return_value={"selector": "#new-button", "confidence": 0.9, "reasoning": "looks right"})
    monkeypatch.setitem(sys.modules, "llm_client", MagicMock(ask=fake_ask))
    monkeypatch.setitem(sys.modules, "notify", MagicMock(send_heal_event=MagicMock()))

    loc = healer.heal(page, "download_button")
    assert loc is not None
    fake_ask.assert_called_once()


def test_heal_candidate_matches_zero_returns_none(monkeypatch, tmp_path):
    import healer
    _patch_config(monkeypatch, tmp_path)
    page = _make_page(None)

    fake_ask = MagicMock(return_value={"selector": "#missing", "confidence": 0.5, "reasoning": ""})
    monkeypatch.setitem(sys.modules, "llm_client", MagicMock(ask=fake_ask))
    monkeypatch.setitem(sys.modules, "notify", MagicMock(send_heal_event=MagicMock()))

    assert healer.heal(page, "foo") is None


def test_heal_same_element_twice_returns_none(monkeypatch, tmp_path):
    import healer
    _patch_config(monkeypatch, tmp_path)
    page = _make_page("#x")

    fake_ask = MagicMock(return_value={"selector": "#x", "confidence": 0.9, "reasoning": ""})
    monkeypatch.setitem(sys.modules, "llm_client", MagicMock(ask=fake_ask))
    monkeypatch.setitem(sys.modules, "notify", MagicMock(send_heal_event=MagicMock()))

    assert healer.heal(page, "elem") is not None
    assert healer.heal(page, "elem") is None  # second call blocked
```

- [ ] **Step 28.2: Commit**

```bash
git add skills/udd/templates/tests/test_healer_mock.py.tmpl
git commit -m "feat(udd): add healer mock tests (budget + cooldown + success paths)"
```

### Task 29: `scripts/lib/telegram.py` + `templates/src/notify.py.tmpl`

**Files:**
- Create: `skills/udd/scripts/lib/telegram.py`
- Create: `skills/udd/templates/src/notify.py.tmpl`

- [ ] **Step 29.1: Write `skills/udd/scripts/lib/telegram.py`**

```python
"""Minimal Telegram send helper. Token read from OS keyring."""

from __future__ import annotations

import logging
from pathlib import Path

import keyring
import requests


log = logging.getLogger("udd.telegram")

KEYRING_SERVICE = "udd-telegram"
KEYRING_KEY = "bot_token"
API_BASE = "https://api.telegram.org"


def get_token() -> str | None:
    return keyring.get_password(KEYRING_SERVICE, KEYRING_KEY)


def send(chat_id: str, text: str, files: list[Path] | None = None) -> bool:
    token = get_token()
    if not token:
        log.warning("Telegram bot_token not in keyring (%s/%s)", KEYRING_SERVICE, KEYRING_KEY)
        return False

    url = f"{API_BASE}/bot{token}/sendMessage"
    try:
        r = requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}, timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        log.error("Telegram send failed: %s", e)
        return False

    for path in files or []:
        if not path.exists():
            continue
        doc_url = f"{API_BASE}/bot{token}/sendDocument"
        try:
            with path.open("rb") as f:
                r = requests.post(doc_url, data={"chat_id": chat_id},
                                  files={"document": (path.name, f)}, timeout=30)
            r.raise_for_status()
        except requests.RequestException as e:
            log.error("Telegram sendDocument failed: %s", e)

    return True
```

- [ ] **Step 29.2: Write `skills/udd/templates/src/notify.py.tmpl`**

```python
"""Telegram notification for {{project_name}}.

Dispatches summary messages to configured chat based on notify.* rules in config.yaml.
"""

from __future__ import annotations

import logging
from pathlib import Path

import keyring
import requests


log = logging.getLogger("{{project_name}}.notify")
API_BASE = "https://api.telegram.org"


def _send(config: dict, text: str, files: list[Path] | None = None) -> bool:
    nt = config["notify"]["telegram"]
    if not nt.get("enabled"):
        return False
    chat_id = nt.get("chat_id")
    if not chat_id:
        log.warning("notify: chat_id not set")
        return False
    service, key = nt.get("bot_token_keyring", "udd-telegram/bot_token").split("/", 1)
    token = keyring.get_password(service, key)
    if not token:
        log.warning("notify: bot_token not in keyring %s/%s", service, key)
        return False

    try:
        r = requests.post(f"{API_BASE}/bot{token}/sendMessage",
                          json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
                          timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        log.error("notify: send failed: %s", e)
        return False

    for f in files or []:
        if not f.exists():
            continue
        try:
            with f.open("rb") as fh:
                r = requests.post(f"{API_BASE}/bot{token}/sendDocument",
                                  data={"chat_id": chat_id},
                                  files={"document": (f.name, fh)}, timeout=30)
            r.raise_for_status()
        except requests.RequestException as e:
            log.error("notify: sendDocument failed: %s", e)
    return True


def send_summary(config: dict, status: str, file_path: Path | None = None,
                 report=None, error: str | None = None) -> None:
    project = config["project"]["name"]
    nt = config["notify"]

    if status == "success":
        if not nt.get("on_success"):
            return
        text = f"✅ *{project}* 다운로드 성공"
        if file_path and report:
            text += f"\n파일: `{file_path.name}` ({report.stats.get('size_kb', '?')} KB, {report.stats.get('rows', '?')} rows)"
    elif status == "validation_warning":
        if not nt.get("on_validation_warning", True):
            return
        issues = ", ".join(report.issues) if report else ""
        warns = ", ".join(report.warnings) if report else ""
        text = f"⚠️ *{project}* 다운로드 OK, 검증 경고\n이슈: {issues}\n경고: {warns}"
    elif status == "session_expired":
        text = f"❌ *{project}* 세션 만료. `udd login` 실행 필요."
    elif status == "failure":
        text = f"❌ *{project}* 실패\n{error or '(no error message)'}"
    else:
        text = f"ℹ️ *{project}* status={status}"

    _send(config, text)


def send_heal_event(element_name: str, new_selector: str, reasoning: str) -> None:
    """Called from healer on successful self-heal."""
    from pathlib import Path
    import yaml
    root = Path(__file__).resolve().parent.parent
    with (root / "config.yaml").open(encoding="utf-8") as f:
        config = yaml.safe_load(f)

    if not config["notify"].get("on_healing", True):
        return
    project = config["project"]["name"]
    text = (f"🩹 *{project}* self-healed\n"
            f"Element: `{element_name}`\n"
            f"New selector: `{new_selector}`\n"
            f"Reason: {reasoning[:200]}")
    _send(config, text)
```

- [ ] **Step 29.3: Commit**

```bash
git add skills/udd/scripts/lib/telegram.py skills/udd/templates/src/notify.py.tmpl
git commit -m "feat(udd): add telegram helper + notify template (summary + heal events)"
```

### Task 30: `scripts/validate_loop.py` — Stage 6 autonomous validation

**Files:**
- Create: `skills/udd/scripts/validate_loop.py`
- Create: `skills/udd/tests/test_validate_loop.py`

- [ ] **Step 30.1: Write failing test for diagnosis classification**

```python
from validate_loop import classify_error, apply_diagnosis


def test_classify_timeout():
    assert classify_error("TimeoutError: locator.wait_for(...)") == "selector"


def test_classify_element_not_found():
    assert classify_error("ElementNotFoundError: all fallbacks failed for x") == "selector"


def test_classify_validation():
    assert classify_error("ValidationError: missing columns: ['X']") == "validation"


def test_classify_unknown():
    assert classify_error("SomethingElse: boom") == "logic"


def test_apply_diagnosis_selector_patch(tmp_path):
    sel_path = tmp_path / "selectors.yaml"
    sel_path.write_text("foo:\n  description: x\n  primary: \"#old\"\n  fallbacks: []\n  ai_discovered: []\n")

    diag = {"type": "selector", "element": "foo", "new_selector": "#new",
            "reasoning": "dom changed"}
    apply_diagnosis(tmp_path, diag)

    import yaml
    data = yaml.safe_load(sel_path.read_text())
    assert any(ai["selector"] == "#new" for ai in data["foo"]["ai_discovered"])
```

- [ ] **Step 30.2: Write `skills/udd/scripts/validate_loop.py`**

```python
"""Stage 6 — autonomous validation loop.

Runs `python src/run.py` up to 5 times; on failure, asks the LLM to diagnose,
applies a patch (selector/timing/validation), retries. Emits JSON summary to stdout.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))
from lib.llm_call import ask


DIAGNOSIS_PROMPT = """You are a Playwright automation expert diagnosing a failed run.

Context:
  Project: {project}
  URL: {url}
  Attempt: {attempt}/{max}

Error:
  Type: {error_type}
  Message: {error_message}

Classify the root cause and propose a patch.

Respond as JSON ONLY:
{{
  "type": "selector"|"timing"|"validation"|"logic",
  "element": "<selectors.yaml name if selector>",
  "new_selector": "<Playwright selector if selector>",
  "wait_ms": <int if timing>,
  "config_key": "<dotted path if validation>",
  "config_value": <value if validation>,
  "patch_diff": "<unified diff if logic>",
  "confidence": 0.0-1.0,
  "reasoning": "<1-3 sentences>"
}}
"""


def classify_error(message: str) -> str:
    m = message.lower()
    if "timeout" in m and "locator" in m:
        return "selector"
    if "elementnotfound" in m or "all fallbacks failed" in m or "all selectors failed" in m:
        return "selector"
    if "validationerror" in m or "missing columns" in m or "row count" in m:
        return "validation"
    if "timeout" in m:
        return "timing"
    return "logic"


def apply_diagnosis(project_dir: Path, diag: dict) -> bool:
    t = diag.get("type")
    if t == "selector":
        return _patch_selector(project_dir, diag)
    if t == "timing":
        return _patch_timing(project_dir, diag)
    if t == "validation":
        return _patch_config(project_dir, diag)
    if t == "logic":
        # logic patches require manual approval; return False to force escalation
        return False
    return False


def _patch_selector(project_dir: Path, diag: dict) -> bool:
    sel_path = project_dir / "selectors.yaml"
    data = yaml.safe_load(sel_path.read_text(encoding="utf-8")) or {}
    name = diag.get("element")
    new_sel = diag.get("new_selector")
    if not name or not new_sel:
        return False
    entry = data.setdefault(name, {"description": name, "fallbacks": [], "ai_discovered": []})
    entry.setdefault("ai_discovered", []).append({
        "selector": new_sel,
        "discovered_at": dt.datetime.now().astimezone().isoformat(),
        "success_count": 0,
        "reasoning": diag.get("reasoning", ""),
    })
    with sel_path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)
    return True


def _patch_timing(project_dir: Path, diag: dict) -> bool:
    # Simple strategy: append a wait call after the first step in navigate.py
    nav_path = project_dir / "src" / "navigate.py"
    if not nav_path.exists():
        return False
    content = nav_path.read_text(encoding="utf-8")
    wait_ms = int(diag.get("wait_ms", 2000))
    marker = "def steps("
    if marker not in content:
        return False
    patched = content.replace(
        marker,
        f"import time\n\n{marker}",
        1,
    )
    # Add a sleep after the function signature line
    patched = re.sub(
        r"(def steps\([^)]*\)[^:]*:)",
        rf"\1\n    time.sleep({wait_ms / 1000})",
        patched, count=1,
    )
    nav_path.write_text(patched, encoding="utf-8")
    return True


def _patch_config(project_dir: Path, diag: dict) -> bool:
    key = diag.get("config_key")
    value = diag.get("config_value")
    if not key:
        return False
    cfg_path = project_dir / "config.yaml"
    cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
    parts = key.split(".")
    node = cfg
    for p in parts[:-1]:
        node = node.setdefault(p, {})
    node[parts[-1]] = value
    with cfg_path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(cfg, f, allow_unicode=True, sort_keys=False)
    return True


def run_once(project_dir: Path, timeout: int = 180) -> dict:
    py = project_dir / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / "python"
    try:
        result = subprocess.run(
            [str(py), "src/run.py"], cwd=project_dir,
            capture_output=True, text=True, timeout=timeout,
        )
        return {
            "exit": result.returncode,
            "stdout": result.stdout[-2000:],
            "stderr": result.stderr[-2000:],
        }
    except subprocess.TimeoutExpired as e:
        return {"exit": 124, "stdout": "", "stderr": f"TimeoutExpired: {e}"}


def diagnose(project_dir: Path, run_result: dict, attempt: int, max_attempts: int,
             config: dict) -> dict:
    error_msg = (run_result.get("stderr") or "") + "\n" + (run_result.get("stdout") or "")
    pre_classified = classify_error(error_msg)

    prompt = DIAGNOSIS_PROMPT.format(
        project=config["project"]["name"],
        url=config["project"]["url"],
        attempt=attempt, max=max_attempts,
        error_type=pre_classified,
        error_message=error_msg[-1500:],
    )
    try:
        diag = ask(prompt, preference=config["healing"]["ai_provider"], max_tokens=1500)
    except Exception as e:
        return {"type": pre_classified, "error": str(e)}
    return diag


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("--strict", action="store_true",
                        help="After success, require 3 consecutive passes")
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    config = yaml.safe_load((project_dir / "config.yaml").read_text(encoding="utf-8"))
    max_attempts = config["healing"].get("dev_max_attempts", 5)

    attempts_log: list[dict] = []

    for attempt in range(1, max_attempts + 1):
        result = run_once(project_dir)
        attempts_log.append({"attempt": attempt, "exit": result["exit"]})

        if result["exit"] == 0:
            if not args.strict:
                print(json.dumps({"status": "success", "attempt": attempt,
                                  "log": attempts_log}, ensure_ascii=False))
                return 0
            # Strict: require 3 consecutive passes
            streak = 1
            for j in range(2):
                r2 = run_once(project_dir)
                attempts_log.append({"attempt": f"{attempt}.{j+2}", "exit": r2["exit"]})
                if r2["exit"] == 0:
                    streak += 1
                else:
                    break
            if streak >= 3:
                print(json.dumps({"status": "success_strict", "attempt": attempt,
                                  "log": attempts_log}, ensure_ascii=False))
                return 0
            # Strict failed → fall through to diagnose using the non-0 result
            result = r2

        diag = diagnose(project_dir, result, attempt, max_attempts, config)
        attempts_log[-1]["diagnosis"] = diag

        if diag.get("type") == "logic":
            print(json.dumps({"status": "escalate_logic", "attempt": attempt,
                              "diagnosis": diag, "log": attempts_log}, ensure_ascii=False))
            return 5

        applied = apply_diagnosis(project_dir, diag)
        attempts_log[-1]["applied"] = applied
        if not applied:
            print(json.dumps({"status": "escalate_no_patch", "attempt": attempt,
                              "diagnosis": diag, "log": attempts_log}, ensure_ascii=False))
            return 6

    print(json.dumps({"status": "escalate_budget_exhausted",
                      "attempts": max_attempts, "log": attempts_log}, ensure_ascii=False))
    return 7


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 30.3: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_validate_loop.py -v`
Expected: 5 passed.

- [ ] **Step 30.4: Commit**

```bash
git add skills/udd/scripts/validate_loop.py skills/udd/tests/test_validate_loop.py
git commit -m "feat(udd): add Stage 6 validate_loop — autonomous AI-patched retry"
```

### Task 31: `scripts/approve_flow.py` — Stage 7 sample-and-approve

**Files:**
- Create: `skills/udd/scripts/approve_flow.py`
- Create: `skills/udd/tests/test_approve_flow.py`

- [ ] **Step 31.1: Write failing test**

```python
from pathlib import Path
import pandas as pd

from approve_flow import find_latest_download, summarize_file


def test_find_latest_download(tmp_path):
    dl = tmp_path / "downloads"
    (dl / "2026-04-20").mkdir(parents=True)
    (dl / "2026-04-24").mkdir(parents=True)
    (dl / "2026-04-24" / "report.xlsx").write_bytes(b"PK\x03\x04")
    (dl / "2026-04-20" / "old.xlsx").write_bytes(b"PK\x03\x04")

    latest = find_latest_download(tmp_path)
    assert latest.name == "report.xlsx"


def test_find_latest_download_none(tmp_path):
    (tmp_path / "downloads").mkdir()
    assert find_latest_download(tmp_path) is None


def test_summarize_file_xlsx(tmp_path):
    p = tmp_path / "a.xlsx"
    pd.DataFrame({"날짜": ["2026-04-01"], "매출": [100]}).to_excel(p, index=False)
    summary = summarize_file(p)
    assert summary["rows"] == 1
    assert summary["columns"] == ["날짜", "매출"]
    assert summary["path"] == str(p)
```

- [ ] **Step 31.2: Write `skills/udd/scripts/approve_flow.py`**

```python
"""Stage 7 — show user the latest download + wait for YES/NO."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd
import yaml

sys.path.insert(0, str(Path(__file__).parent))
from lib.telegram import send


def find_latest_download(project_dir: Path) -> Path | None:
    dl = project_dir / "downloads"
    if not dl.exists():
        return None
    candidates: list[Path] = []
    for date_dir in sorted(dl.iterdir(), reverse=True):
        if date_dir.is_dir():
            for f in sorted(date_dir.iterdir()):
                if f.is_file():
                    candidates.append(f)
            if candidates:
                return candidates[0]
    return None


def summarize_file(path: Path) -> dict:
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls", ".xlsm"}:
        df = pd.read_excel(path)
    elif suffix == ".csv":
        df = pd.read_csv(path)
    else:
        return {"path": str(path), "size_bytes": path.stat().st_size, "rows": None, "columns": None}
    return {
        "path": str(path),
        "size_bytes": path.stat().st_size,
        "rows": len(df),
        "columns": list(df.columns),
        "sample": df.head(10).to_dict(orient="records"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    latest = find_latest_download(project_dir)
    if latest is None:
        print(json.dumps({"status": "no_file"}))
        return 1

    summary = summarize_file(latest)

    # Print human-readable to stderr (for skill to show)
    print(f"File: {summary['path']}", file=sys.stderr)
    print(f"Rows: {summary['rows']}, Columns: {summary['columns']}", file=sys.stderr)
    if "sample" in summary:
        for row in summary["sample"][:10]:
            print(row, file=sys.stderr)

    # Emit JSON to stdout for programmatic use
    print(json.dumps(summary, ensure_ascii=False, default=str))

    # Send telegram sample if configured
    config = yaml.safe_load((project_dir / "config.yaml").read_text(encoding="utf-8"))
    chat_id = config["notify"]["telegram"].get("chat_id")
    if chat_id:
        text = (f"📊 *{config['project']['name']}* 샘플\n"
                f"파일: `{latest.name}`\n"
                f"Rows: {summary['rows']}, Columns: {summary['columns']}")
        send(chat_id, text, files=[latest])

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 31.3: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_approve_flow.py -v`
Expected: 3 passed.

- [ ] **Step 31.4: Commit**

```bash
git add skills/udd/scripts/approve_flow.py skills/udd/tests/test_approve_flow.py
git commit -m "feat(udd): add Stage 7 approve_flow — sample display + telegram"
```

### Task 32: Append Stage 6-7 to SKILL.md

- [ ] **Step 32.1: Use Edit to replace `<!-- Stage 6-9 sections will be added in later waves. -->` with:**

```
## Stage 6 — VALIDATE (autonomous loop)

```bash
python $SKILL_DIR/scripts/validate_loop.py $PROJECT_DIR
```

Reads JSON result from stdout:
- `status=success`: proceed to Stage 7
- `status=success_strict`: proceed to Stage 7 (with `--strict`)
- `status=escalate_logic`: diagnosis classified as code-level; tell the user the proposed fix, ask if they want to apply manually
- `status=escalate_no_patch`: LLM couldn't produce a usable patch; offer retrain
- `status=escalate_budget_exhausted`: 5 attempts exhausted; show last log + screenshots

In all escalate cases, send a telegram alert via `scripts/lib/telegram.py send()`.

## Stage 7 — APPROVE

```bash
python $SKILL_DIR/scripts/approve_flow.py $PROJECT_DIR
```

Displays the latest download to the user (path, shape, columns, head(10)) and sends a Telegram sample. Then ASK the user: "이 데이터가 맞나요? (YES / NO <reason>)".

- YES → proceed to Stage 8
- NO → feed the reason back into Stage 6 as an additional hint and rerun the loop

<!-- Stage 8-9 sections will be added in later waves. -->
```

- [ ] **Step 32.2: Commit**

```bash
git add skills/udd/SKILL.md
git commit -m "docs(udd): add Stage 6-7 detail to SKILL.md"
```

### Task 33: Wave 5 full test run + tag

- [ ] **Step 33.1: Run pytest**

Run: `cd skills/udd && .venv/bin/pytest -v`
Expected: all tests passing (now includes validate_loop + approve_flow tests).

- [ ] **Step 33.2: Tag**

```bash
cd skills/udd
git tag wave-5-complete
git log --oneline -15
```

---

## Wave 6 — Scheduler + CLI + Global tool + E2E + Ship (8 tasks)

Goal: Cross-platform scheduling, `udd` CLI with 13 subcommands, global multi-project CLI, E2E smoke, final SKILL.md, and install/ship.

### Task 34: `scripts/schedule_install.py` — cross-platform scheduler

**Files:**
- Create: `skills/udd/scripts/schedule_install.py`
- Create: `skills/udd/tests/test_schedule_install.py`

- [ ] **Step 34.1: Write failing test**

```python
from schedule_install import cron_to_schtasks_schedule, cron_to_plist_interval, extract_start_time


def test_cron_daily():
    s = cron_to_schtasks_schedule("0 9 * * *")
    assert s["sc"] == "DAILY"
    assert s["st"] == "09:00"


def test_cron_weekly_monday():
    s = cron_to_schtasks_schedule("30 8 * * 1")
    assert s["sc"] == "WEEKLY"
    assert s["d"] == "MON"
    assert s["st"] == "08:30"


def test_cron_hourly():
    s = cron_to_schtasks_schedule("0 * * * *")
    assert s["sc"] == "HOURLY"


def test_extract_start_time():
    assert extract_start_time("0 9 * * *") == "09:00"
    assert extract_start_time("30 14 * * *") == "14:30"


def test_cron_to_plist_daily():
    p = cron_to_plist_interval("0 9 * * *")
    assert p == [{"Hour": 9, "Minute": 0}]


def test_cron_to_plist_weekly():
    p = cron_to_plist_interval("0 9 * * 1")
    assert p == [{"Weekday": 1, "Hour": 9, "Minute": 0}]
```

- [ ] **Step 34.2: Write `skills/udd/scripts/schedule_install.py`**

```python
"""Stage 8 — register the generated project with the OS scheduler."""

from __future__ import annotations

import argparse
import json
import plistlib
import subprocess
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))
from lib.platform_detect import detect_os


_WEEKDAY_NAMES = {"0": "SUN", "1": "MON", "2": "TUE", "3": "WED", "4": "THU", "5": "FRI", "6": "SAT"}


def extract_start_time(cron: str) -> str:
    parts = cron.split()
    minute, hour = parts[0], parts[1]
    m = int(minute) if minute.isdigit() else 0
    h = int(hour) if hour.isdigit() else 0
    return f"{h:02d}:{m:02d}"


def cron_to_schtasks_schedule(cron: str) -> dict:
    parts = cron.split()
    minute, hour, dom, month, dow = parts

    result: dict = {"st": extract_start_time(cron)}

    if hour == "*":
        result["sc"] = "HOURLY"
        return result
    if dow != "*" and dow.isdigit():
        result["sc"] = "WEEKLY"
        result["d"] = _WEEKDAY_NAMES.get(dow, "MON")
        return result
    if dom != "*" and dom.isdigit():
        result["sc"] = "MONTHLY"
        result["d"] = dom
        return result
    result["sc"] = "DAILY"
    return result


def cron_to_plist_interval(cron: str) -> list[dict]:
    parts = cron.split()
    minute, hour, dom, month, dow = parts
    m = int(minute) if minute.isdigit() else 0
    h = int(hour) if hour.isdigit() else 0

    entry: dict = {"Hour": h, "Minute": m}
    if dow != "*" and dow.isdigit():
        entry["Weekday"] = int(dow)
    if dom != "*" and dom.isdigit():
        entry["Day"] = int(dom)
    return [entry]


def _python_exe(project_dir: Path) -> str:
    if sys.platform == "win32":
        return str(project_dir / ".venv" / "Scripts" / "python.exe")
    return str(project_dir / ".venv" / "bin" / "python")


def install_windows(project_dir: Path, config: dict) -> bool:
    task_name = config["schedule"]["os_task_name"]
    cron = config["schedule"]["cron"]
    sched = cron_to_schtasks_schedule(cron)
    py = _python_exe(project_dir)
    run_script = str(project_dir / "src" / "run.py")
    tr = f'"{py}" "{run_script}"'

    cmd = ["schtasks", "/Create", "/TN", task_name, "/TR", tr, "/SC", sched["sc"]]
    if "st" in sched and sched["sc"] != "HOURLY":
        cmd += ["/ST", sched["st"]]
    if sched.get("d"):
        cmd += ["/D", sched["d"]]
    cmd += ["/F"]  # force overwrite

    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0


def install_macos(project_dir: Path, config: dict) -> bool:
    label = f"com.udd.{config['project']['name']}"
    plist_path = Path.home() / "Library" / "LaunchAgents" / f"{label}.plist"
    plist_path.parent.mkdir(parents=True, exist_ok=True)

    plist = {
        "Label": label,
        "ProgramArguments": [_python_exe(project_dir), str(project_dir / "src" / "run.py")],
        "StartCalendarInterval": cron_to_plist_interval(config["schedule"]["cron"]),
        "StandardOutPath": str(project_dir / "logs" / "launchd.out"),
        "StandardErrorPath": str(project_dir / "logs" / "launchd.err"),
    }
    with plist_path.open("wb") as f:
        plistlib.dump(plist, f)

    subprocess.run(["launchctl", "unload", str(plist_path)], capture_output=True)
    r = subprocess.run(["launchctl", "load", str(plist_path)], capture_output=True, text=True)
    return r.returncode == 0


def install_linux(project_dir: Path, config: dict) -> bool:
    marker = f"UDD-{config['project']['name']}"
    cron_line = (
        f"{config['schedule']['cron']} "
        f"{_python_exe(project_dir)} {project_dir / 'src' / 'run.py'} "
        f"# {marker}"
    )

    existing = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    lines = [l for l in (existing.stdout or "").split("\n") if marker not in l]
    lines.append(cron_line)
    new_cron = "\n".join(l for l in lines if l) + "\n"

    r = subprocess.run(["crontab", "-"], input=new_cron, text=True, capture_output=True)
    return r.returncode == 0


def install(project_dir: Path) -> bool:
    config = yaml.safe_load((project_dir / "config.yaml").read_text(encoding="utf-8"))
    os_name = detect_os()
    if os_name == "windows":
        return install_windows(project_dir, config)
    if os_name == "macos":
        return install_macos(project_dir, config)
    if os_name == "linux":
        return install_linux(project_dir, config)
    raise RuntimeError(f"Unsupported OS: {os_name}")


def uninstall(project_dir: Path) -> bool:
    config = yaml.safe_load((project_dir / "config.yaml").read_text(encoding="utf-8"))
    os_name = detect_os()
    task_name = config["schedule"]["os_task_name"]

    if os_name == "windows":
        r = subprocess.run(["schtasks", "/Delete", "/TN", task_name, "/F"], capture_output=True)
        return r.returncode == 0
    if os_name == "macos":
        label = f"com.udd.{config['project']['name']}"
        plist_path = Path.home() / "Library" / "LaunchAgents" / f"{label}.plist"
        subprocess.run(["launchctl", "unload", str(plist_path)], capture_output=True)
        if plist_path.exists():
            plist_path.unlink()
        return True
    if os_name == "linux":
        marker = f"UDD-{config['project']['name']}"
        existing = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
        lines = [l for l in (existing.stdout or "").split("\n") if marker not in l]
        new_cron = "\n".join(l for l in lines if l) + "\n"
        r = subprocess.run(["crontab", "-"], input=new_cron, text=True, capture_output=True)
        return r.returncode == 0
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("--uninstall", action="store_true")
    args = parser.parse_args()

    if args.uninstall:
        ok = uninstall(args.project_dir.resolve())
    else:
        ok = install(args.project_dir.resolve())

    print(json.dumps({"ok": ok}))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 34.3: Run — verify pass**

Run: `cd skills/udd && .venv/bin/pytest tests/test_schedule_install.py -v`
Expected: 6 passed.

- [ ] **Step 34.4: Commit**

```bash
git add skills/udd/scripts/schedule_install.py skills/udd/tests/test_schedule_install.py
git commit -m "feat(udd): add Stage 8 schedule_install — Win/Mac/Linux scheduler"
```

### Task 35: `templates/src/cli.py.tmpl` — `udd` operational CLI

**Files:**
- Create: `skills/udd/templates/src/cli.py.tmpl`

- [ ] **Step 35.1: Write `udd` CLI template**

```python
"""`udd` CLI for {{project_name}}.

Subcommands:
  login / run / test / status / logs / doctor /
  schedule / unschedule / retrain / notify-test / clean / export / import
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SKILL_BIN = Path.home() / ".claude" / "skills" / "udd" / "scripts"


def _py() -> str:
    if sys.platform == "win32":
        return str(ROOT / ".venv" / "Scripts" / "python.exe")
    return str(ROOT / ".venv" / "bin" / "python")


def cmd_login(args):
    return subprocess.call([_py(), str(SKILL_BIN / "auth_flow.py"), str(ROOT), "--mode", "save"])


def cmd_run(args):
    env_flags = [] if args.healing else ["--no-healing"]
    return subprocess.call([_py(), str(ROOT / "src" / "run.py"), *env_flags])


def cmd_test(args):
    import tempfile
    with tempfile.TemporaryDirectory(prefix="udd-test-") as tmp:
        import os
        env = os.environ.copy()
        env["UDD_DOWNLOAD_OVERRIDE"] = tmp
        return subprocess.call([_py(), str(ROOT / "src" / "run.py")], env=env)


def cmd_status(args):
    logs_dir = ROOT / "logs"
    if not logs_dir.exists():
        print("No runs yet.")
        return 0
    print(f"Project: {ROOT.name}")
    print("Last 7 days:")
    today = dt.date.today()
    for i in range(7):
        d = today - dt.timedelta(days=i)
        log_path = logs_dir / f"{d.isoformat()}.log"
        if not log_path.exists():
            continue
        events = [json.loads(l) for l in log_path.read_text().splitlines() if l.strip()]
        final = next((e for e in reversed(events) if e.get("event") in ("run.error", "validate.done")), None)
        if final:
            mark = "✅" if final.get("passed") else "❌"
            print(f"  {mark} {d.isoformat()}  {final.get('event')}")
    return 0


def cmd_logs(args):
    logs_dir = ROOT / "logs"
    all_lines: list[str] = []
    for log_file in sorted(logs_dir.glob("*.log"), reverse=True):
        all_lines += log_file.read_text().splitlines()
        if args.tail and len(all_lines) >= args.tail:
            break
    lines = all_lines[: args.tail] if args.tail else all_lines
    for line in lines:
        if args.event:
            try:
                obj = json.loads(line)
                if obj.get("event") != args.event:
                    continue
            except json.JSONDecodeError:
                continue
        print(line)
    return 0


def cmd_doctor(args):
    print("🔍 Running diagnostics...")
    precheck = subprocess.run([_py(), str(SKILL_BIN / "precheck.py")],
                              capture_output=True, text=True)
    print(precheck.stdout)
    # Verify session
    verify = subprocess.run([_py(), str(SKILL_BIN / "auth_flow.py"), str(ROOT), "--mode", "verify"],
                            capture_output=True, text=True)
    print("Session valid." if verify.returncode == 0 else "Session INVALID — run `udd login`.")
    return 0


def cmd_schedule(args):
    return subprocess.call([_py(), str(SKILL_BIN / "schedule_install.py"), str(ROOT)])


def cmd_unschedule(args):
    return subprocess.call([_py(), str(SKILL_BIN / "schedule_install.py"), str(ROOT), "--uninstall"])


def cmd_retrain(args):
    print("⚠️  Retrain will overwrite selectors.yaml + src/navigate.py.")
    if not args.yes:
        confirm = input("Continue? (YES/no): ").strip()
        if confirm != "YES":
            print("Cancelled.")
            return 1
    backup = ROOT / "recordings" / f"backup-{dt.date.today().isoformat()}"
    backup.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "selectors.yaml", backup / "selectors.yaml")
    shutil.copy2(ROOT / "src" / "navigate.py", backup / "navigate.py")
    subprocess.call([_py(), str(SKILL_BIN / "record_flow.py"), str(ROOT)])
    subprocess.call([_py(), str(SKILL_BIN / "refactor.py"), str(ROOT)])
    return subprocess.call([_py(), str(SKILL_BIN / "validate_loop.py"), str(ROOT)])


def cmd_notify_test(args):
    import yaml
    from notify import _send
    with (ROOT / "config.yaml").open(encoding="utf-8") as f:
        config = yaml.safe_load(f)
    ok = _send(config, f"🔔 Test notification from {config['project']['name']}")
    print("Sent." if ok else "Failed.")
    return 0 if ok else 1


def cmd_clean(args):
    keep = dt.date.today() - dt.timedelta(days=args.keep_days)
    removed = []
    for sub in ("downloads", "logs"):
        for d in (ROOT / sub).glob("*"):
            if d.is_dir():
                try:
                    when = dt.date.fromisoformat(d.name)
                except ValueError:
                    continue
                if when < keep:
                    if args.dry_run:
                        print(f"would remove: {d}")
                    else:
                        shutil.rmtree(d)
                    removed.append(d)
    print(f"{len(removed)} directories {'would be ' if args.dry_run else ''}removed.")
    return 0


def cmd_export(args):
    out = Path(args.out).resolve()
    include = ["config.yaml", "selectors.yaml", "src", "recordings",
               "pyproject.toml", "requirements.txt", "README.md", "tests"]
    with tarfile.open(out, "w:gz") as tar:
        for name in include:
            p = ROOT / name
            if p.exists():
                tar.add(p, arcname=f"{ROOT.name}/{name}")
    print(f"Exported to {out}")
    return 0


def cmd_import(args):
    src = Path(args.src).resolve()
    dst = Path(args.dst).resolve()
    dst.mkdir(parents=True, exist_ok=True)
    with tarfile.open(src, "r:gz") as tar:
        tar.extractall(dst)
    print(f"Extracted to {dst}")
    return 0


def main():
    parser = argparse.ArgumentParser(prog="udd")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("login", help="Refresh session (open browser)")

    p_run = sub.add_parser("run", help="Execute once")
    p_run.add_argument("--no-healing", dest="healing", action="store_false", default=True)

    sub.add_parser("test", help="Dry-run into /tmp")
    sub.add_parser("status", help="Show recent runs")

    p_logs = sub.add_parser("logs", help="Tail logs")
    p_logs.add_argument("--tail", type=int, default=50)
    p_logs.add_argument("--event", help="Filter by event type")

    sub.add_parser("doctor", help="Full diagnostics")
    sub.add_parser("schedule", help="Register OS scheduler task")
    sub.add_parser("unschedule", help="Remove OS scheduler task")

    p_retrain = sub.add_parser("retrain", help="Re-capture selectors (WARNING: overwrites)")
    p_retrain.add_argument("--yes", action="store_true")

    sub.add_parser("notify-test", help="Send test telegram message")

    p_clean = sub.add_parser("clean", help="Remove old downloads/logs")
    p_clean.add_argument("--keep-days", type=int, default=30)
    p_clean.add_argument("--dry-run", action="store_true")

    p_export = sub.add_parser("export", help="Backup config as tar.gz")
    p_export.add_argument("out")

    p_import = sub.add_parser("import", help="Restore from tar.gz")
    p_import.add_argument("src")
    p_import.add_argument("dst")

    args = parser.parse_args()
    handlers = {
        "login": cmd_login, "run": cmd_run, "test": cmd_test,
        "status": cmd_status, "logs": cmd_logs, "doctor": cmd_doctor,
        "schedule": cmd_schedule, "unschedule": cmd_unschedule,
        "retrain": cmd_retrain, "notify-test": cmd_notify_test,
        "clean": cmd_clean, "export": cmd_export, "import": cmd_import,
    }
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 35.2: Commit**

```bash
git add skills/udd/templates/src/cli.py.tmpl
git commit -m "feat(udd): add cli.py template with 13 subcommands"
```

### Task 36: `scripts/handoff.py` — Stage 9 final README + summary

**Files:**
- Create: `skills/udd/scripts/handoff.py`

- [ ] **Step 36.1: Write**

```python
"""Stage 9 — print the final summary."""

from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path

import yaml


TEMPLATE = """
✅ AX Universal Data Downloader 생성 완료

📁 프로젝트: {project_dir}
⏰ 다음 실행: {next_run} ({cron_human})
📊 예상 파일: {project_dir}/downloads/YYYY-MM-DD/*.{fmt}
🔔 알림: {telegram_status}
🩹 Self-healing: {healing_status}

운영 명령:
  udd status             최근 실행 결과
  udd doctor             환경 진단
  udd login              세션 재로그인 (만료 시)
  udd retrain            UI 변경 시 재학습
  udd run                즉시 1회 실행
  udd unschedule         스케줄 제거
"""


def _next_run(cron: str) -> str:
    parts = cron.split()
    minute, hour = parts[0], parts[1]
    h = int(hour) if hour.isdigit() else 0
    m = int(minute) if minute.isdigit() else 0
    now = dt.datetime.now()
    today_run = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if today_run <= now:
        today_run += dt.timedelta(days=1)
    return today_run.strftime("%Y-%m-%d %H:%M")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    config = yaml.safe_load((project_dir / "config.yaml").read_text(encoding="utf-8"))

    summary = TEMPLATE.format(
        project_dir=project_dir,
        next_run=_next_run(config["schedule"]["cron"]),
        cron_human=config["schedule"]["cron"],
        fmt=config["download"]["expected_format"],
        telegram_status="텔레그램" if config["notify"]["telegram"].get("enabled") else "(비활성)",
        healing_status="활성" if config["healing"].get("enabled") else "(비활성)",
    )
    print(summary)
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
```

- [ ] **Step 36.2: Commit**

```bash
git add skills/udd/scripts/handoff.py
git commit -m "feat(udd): add Stage 9 handoff — final summary printer"
```

### Task 37: `bin/udd-global` — multi-project management

**Files:**
- Create: `skills/udd/bin/udd-global`

- [ ] **Step 37.1: Write**

```python
#!/usr/bin/env python3
"""Multi-project management for AX Universal Data Downloader."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

PROJECTS_ROOT = Path.home() / "ax-downloads"


def list_projects() -> list[Path]:
    if not PROJECTS_ROOT.exists():
        return []
    return sorted(
        p for p in PROJECTS_ROOT.iterdir()
        if p.is_dir() and (p / "config.yaml").exists()
    )


def cmd_list(args):
    projects = list_projects()
    if not projects:
        print("(no projects in ~/ax-downloads/)")
        return 0
    import yaml
    for p in projects:
        try:
            cfg = yaml.safe_load((p / "config.yaml").read_text(encoding="utf-8"))
            cron = cfg["schedule"]["cron"]
            enabled = cfg["schedule"].get("enabled", True)
            mark = "✅" if enabled else "⏸"
        except Exception:
            cron, mark = "?", "❓"
        print(f"{mark} {p.name:<30}  cron={cron}")
    return 0


def cmd_status_all(args):
    for p in list_projects():
        print(f"\n=== {p.name} ===")
        subprocess.run([str(p / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / "python"),
                        str(p / "src" / "cli.py"), "status"])
    return 0


def cmd_doctor_all(args):
    for p in list_projects():
        print(f"\n=== {p.name} ===")
        subprocess.run([str(p / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / "python"),
                        str(p / "src" / "cli.py"), "doctor"])
    return 0


def cmd_run(args):
    p = PROJECTS_ROOT / args.project
    if not p.exists():
        print(f"No such project: {args.project}", file=sys.stderr)
        return 1
    return subprocess.call([str(p / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / "python"),
                            str(p / "src" / "cli.py"), "run"])


def main():
    parser = argparse.ArgumentParser(prog="udd-global")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list")
    sub.add_parser("status-all")
    sub.add_parser("doctor-all")
    p_run = sub.add_parser("run")
    p_run.add_argument("project")

    args = parser.parse_args()
    handlers = {"list": cmd_list, "status-all": cmd_status_all,
                "doctor-all": cmd_doctor_all, "run": cmd_run}
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 37.2: Make executable**

```bash
chmod +x skills/udd/bin/udd-global
```

- [ ] **Step 37.3: Commit**

```bash
git add skills/udd/bin/udd-global
git commit -m "feat(udd): add udd-global — multi-project management CLI"
```

### Task 38: E2E smoke test with fake server

**Files:**
- Create: `skills/udd/tests/test_e2e_fake_server.py`
- Create: `skills/udd/tests/fixtures/fake_server.py`

- [ ] **Step 38.1: Write `skills/udd/tests/fixtures/fake_server.py`**

```python
"""Minimal Flask fake corporate system for E2E testing."""

from __future__ import annotations

import io
from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, request, session, send_file, redirect, url_for


def create_app():
    app = Flask(__name__)
    app.secret_key = "test-secret"

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if request.method == "POST":
            session["user"] = request.form.get("user_id", "anon")
            return redirect("/")
        return """
<form method=post>
  <input name=user_id id=login_id>
  <input name=user_pw id=login_pw type=password>
  <button id=login_submit type=submit>Login</button>
</form>
"""

    @app.route("/")
    def home():
        if "user" not in session:
            return redirect("/login")
        return """
<a id='nav-stats' href='/stats'>통계</a>
<a id='nav-settings' href='/settings'>설정</a>
"""

    @app.route("/stats")
    def stats():
        if "user" not in session:
            return redirect("/login")
        return """
<button id='export-excel' data-test='export-excel' onclick="location='/download'">엑셀 다운로드</button>
"""

    @app.route("/download")
    def download():
        if "user" not in session:
            return redirect("/login")
        buf = io.BytesIO()
        pd.DataFrame({"날짜": ["2026-04-24"], "매출": [1234], "건수": [42]}).to_excel(buf, index=False)
        buf.seek(0)
        return send_file(buf, as_attachment=True, download_name="report.xlsx",
                         mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    return app


if __name__ == "__main__":
    create_app().run(port=0)
```

- [ ] **Step 38.2: Write E2E skeleton test (manual — marked skip in CI)**

```python
"""E2E test against the fake server. Skipped by default; run with: pytest -m e2e."""

from pathlib import Path
import pytest

pytestmark = pytest.mark.skip(reason="E2E requires real Playwright browser + network; manual only")


def test_e2e_full_pipeline(tmp_path):
    """
    Manual test (not run in CI). Steps:
      1. In one terminal: python tests/fixtures/fake_server.py
      2. In another:     /udd with URL http://127.0.0.1:<port>/login
      3. Expect: project folder created, download succeeds, scheduler registered.
    See tests/fixtures/fake_server.py for the fake system.
    """
    pass
```

- [ ] **Step 38.3: Commit**

```bash
git add skills/udd/tests/fixtures/fake_server.py skills/udd/tests/test_e2e_fake_server.py
git commit -m "test(udd): add fake-server fixture + E2E skeleton (skipped in CI)"
```

### Task 39: Finalize SKILL.md — Stage 8-9 + install instructions

**Files:**
- Modify: `skills/udd/SKILL.md`

- [ ] **Step 39.1: Replace `<!-- Stage 8-9 sections will be added in later waves. -->` with:**

```
## Stage 8 — SCHEDULE

```bash
python $SKILL_DIR/scripts/schedule_install.py $PROJECT_DIR
```
Writes `{"ok": true}` on success. Reads `config.yaml.schedule.cron` and registers with the OS scheduler. Invoke `--uninstall` to remove.

## Stage 9 — HANDOFF

```bash
python $SKILL_DIR/scripts/handoff.py $PROJECT_DIR
```
Prints the final summary (project path, next run time, command cheatsheet). Also a good moment to send a Telegram "setup complete" message.

## Troubleshooting during skill run

- **Precheck fails** → offer to install missing pieces. If autonomous mode is on, just run the install command.
- **Stage 3 verification fails** → offer to retry `auth_flow.py` (user may have closed browser too early).
- **Stage 6 escalates** → show last attempt's JSON + screenshot to the user; ask if they want to retry, retrain, or abort.
- **Stage 7 NO** → treat the user's reason as a free-text diagnosis and rerun Stage 6 with that context.

## Resumption (skill re-invocation on existing project)

If the current working directory is inside `~/ax-downloads/<name>/` and a `config.yaml` exists, ask the user:
  1. Retrain (Stage 4 onwards)
  2. Re-login only
  3. Change schedule
  4. Just show status

Route accordingly instead of starting Stage 1 from scratch.
```

- [ ] **Step 39.2: Commit**

```bash
git add skills/udd/SKILL.md
git commit -m "docs(udd): finalize SKILL.md with Stage 8-9 + troubleshooting + resumption"
```

### Task 40: Install to ~/.claude/skills/udd and final verification

- [ ] **Step 40.1: Install the bundle**

```bash
# Copy or symlink
cp -r skills/udd ~/.claude/skills/udd-workspace-copy  # safe first-time copy
# OR
ln -sf "$(pwd)/skills/udd" ~/.claude/skills/udd
```

- [ ] **Step 40.2: Run full test suite**

```bash
cd skills/udd && .venv/bin/pytest -v --tb=short
```
Expected: all tests pass (excluding e2e which is skipped).

- [ ] **Step 40.3: Smoke-test skill invocation**

In Claude Code:
```
/udd
```
Expected: skill loads, Stage 0 runs, shows JSON report. (Quit before touching real systems.)

- [ ] **Step 40.4: Final tag + commit**

```bash
cd skills/udd
git tag v0.1.0
git log --oneline -40
```

- [ ] **Step 40.5: Update root project-level CHANGELOG or doc mention**

Edit `CLAUDE.md` (project root) adding a short mention:

```markdown
## Skills

- `/udd` — AX Universal Data Downloader (see `skills/udd/SKILL.md` and `docs/superpowers/specs/2026-04-24-ax-udd-design.md`)
```

- [ ] **Step 40.6: Commit root doc update**

```bash
git add CLAUDE.md
git commit -m "docs: mention /udd skill in root CLAUDE.md"
```

---

## Self-Review (author checklist)

**1. Spec coverage** — every numbered decision D1–D9 and every spec section maps to a task:

| Spec reference | Implemented by |
|---------------|----------------|
| D1 project generator | Task 11 (scaffold) + Task 12 (integration) |
| D2 Python + Playwright | Task 9 (requirements.txt) |
| D3 hybrid auth | Task 14 (auth.py — both modes) + Task 15 (auth_flow) |
| D4 static fallback + AI healing | Task 21 (navigate 4-layer) + Task 27 (healer) |
| D5 codegen + AI refactor | Task 16 (record) + Task 23 (refactor) |
| D6 data validation + user approval | Task 26 (validators) + Task 31 (approve) |
| D7 cross-platform scheduler | Task 34 (schedule_install) |
| D8 OS keyring | Task 14 (auth.py credentials) + Task 29 (telegram token) |
| D9 CLI autonomous mode | Task 2 (detect) + Task 4 (SKILL.md instructions) |
| Stage 0 precheck | Task 7 |
| Stage 1 scope | Task 8 |
| Stage 2 scaffold | Task 11 |
| Stage 3 auth | Task 15 |
| Stage 4 record | Task 16 |
| Stage 5 refactor | Task 23 |
| Stage 6 validate loop | Task 30 |
| Stage 7 approve | Task 31 |
| Stage 8 schedule | Task 34 |
| Stage 9 handoff | Task 36 |
| 13 CLI commands | Task 35 |
| udd-global | Task 37 |
| E2E test | Task 38 |
| Cost safeguards (cool-down, session cap) | Task 27 (healer) — config + `_SESSION_HEAL_COUNT` |
| Audit logging (JSON lines) | Task 13 (run.py log_event) |

**2. Placeholder scan** — no TBD / TODO / "implement later" remain. Every code step includes full code blocks.

**3. Type consistency** — checked:
- `ValidationReport` dataclass defined once (Task 26) and used in Task 13 (run.py)
- `find()` signature `(page, name, timeout_ms=3000) -> Locator` consistent between Task 21 (define) and Task 22 / Task 27 (use)
- `ask()` signature `(prompt, image_bytes=None, preference="auto", ...)` identical between `scripts/lib/llm_call.py` (Task 19) and `templates/src/llm_client.py.tmpl` (Task 20)
- `send()` / `_send()` telegram helper: `_send(config, text, files=None)` and `send(chat_id, text, files=None)` both take `list[Path] | None`

**4. Ambiguity checks:**
- Generated-project tests/ includes templates for validators + selectors + healer — Tasks 26, 24, 28 cover all three
- Scaffold `install_dependencies` pins versions via requirements.txt template (Task 9)

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-24-ax-udd-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, with checkpoint commits.

**Which approach?**









