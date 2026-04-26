"""Stage 2: scaffold — create ~/weekly/<team>/ + render templates + copy support files.

Walks the skill bundle's templates/ tree, renders .tmpl files with the simple
{{ var }} substitution from scripts.lib.template_render, and copies fixture
files (Jinja2 dashboard template, prompt templates, _llm.py) literally so
they can be rendered/used at runtime by the generated project.

Skips venv creation when install_pkg=False (used by tests).
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from scripts.lib.template_render import render_string


# Files in templates/src/prompts/ stay as raw text at runtime — the compiler
# Jinja2-renders them with actual ctx, so scaffold just copies them and
# strips the .tmpl suffix (compile_system_v2.txt.tmpl -> compile_system_v2.txt).
PROMPT_TMPL_DIR = "prompts"


def scaffold_project(
    target: Path,
    team_slug: str,
    team_name: str,
    bundle_root: Path,
    install_pkg: bool = True,
) -> None:
    """Materialize the weekly_runtime project under ``target``.

    Parameters
    ----------
    target : Path
        Destination directory (e.g. ``~/weekly/<team>``). Created if missing.
    team_slug : str
        ASCII slug used as the package distribution name suffix.
    team_name : str
        Human-readable Korean team name; used in pyproject description and
        the README.
    bundle_root : Path
        Path to the ``skills/weekly`` bundle (where templates/ + scripts/ live).
    install_pkg : bool
        If True, create a ``venv/`` inside ``target`` and ``pip install -e``.
    """
    target = Path(target)
    bundle_root = Path(bundle_root)
    target.mkdir(parents=True, exist_ok=True)

    ctx: dict[str, str] = {"team_slug": team_slug, "team_name": team_name}

    # 1. Render top-level templates: pyproject.toml, requirements.txt, .gitignore
    for name in ("pyproject.toml.tmpl", "requirements.txt.tmpl", ".gitignore.tmpl"):
        src = bundle_root / "templates" / name
        rendered = render_string(src.read_text(encoding="utf-8"), ctx)
        out_name = name[: -len(".tmpl")]
        (target / out_name).write_text(rendered, encoding="utf-8")

    # 2. Render package source templates: templates/src/**/*.tmpl -> weekly_runtime/**/*
    pkg = target / "weekly_runtime"
    pkg.mkdir(parents=True, exist_ok=True)
    src_root = bundle_root / "templates" / "src"
    for src_tmpl in src_root.rglob("*.tmpl"):
        rel = src_tmpl.relative_to(src_root)
        # Skip prompt templates here; handled separately below (renamed, not rendered).
        if PROMPT_TMPL_DIR in rel.parts:
            continue
        # Strip .tmpl suffix to get the runtime filename (e.g. cli.py.tmpl -> cli.py).
        out_rel = rel.with_suffix("")
        out_path = pkg / out_rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        rendered = render_string(src_tmpl.read_text(encoding="utf-8"), ctx)
        out_path.write_text(rendered, encoding="utf-8")

    # 3. Copy scripts/lib/llm_call.py -> weekly_runtime/_llm.py.
    # The runtime project must NOT depend on the skill bundle path, so we
    # vendor the subprocess-based LLM client.
    llm_src = bundle_root / "scripts" / "lib" / "llm_call.py"
    (pkg / "_llm.py").write_text(llm_src.read_text(encoding="utf-8"), encoding="utf-8")

    # 4. Copy template_dashboard_v2.html.j2 -> weekly_runtime/templates/.
    pkg_templates = pkg / "templates"
    pkg_templates.mkdir(parents=True, exist_ok=True)
    shutil.copy(
        bundle_root / "templates" / "template_dashboard_v2.html.j2",
        pkg_templates / "template_dashboard_v2.html.j2",
    )

    # 5. Copy prompt templates -> weekly_runtime/prompts/ (rename .tmpl -> .txt).
    # Compiler renders these with full Jinja2 at runtime.
    pkg_prompts = pkg / "prompts"
    pkg_prompts.mkdir(parents=True, exist_ok=True)
    src_prompts = bundle_root / "templates" / "src" / "prompts"
    if src_prompts.exists():
        for prompt_file in src_prompts.iterdir():
            if prompt_file.suffix != ".tmpl":
                continue
            stem = prompt_file.stem
            out_name = stem if stem.endswith(".txt") else f"{stem}.txt"
            shutil.copy(prompt_file, pkg_prompts / out_name)

    # 6. (Optional) create venv + editable install
    if install_pkg:
        subprocess.run(
            [sys.executable, "-m", "venv", str(target / "venv")], check=True
        )
        if sys.platform == "win32":
            venv_python = target / "venv" / "Scripts" / "python.exe"
        else:
            venv_python = target / "venv" / "bin" / "python"
        subprocess.run(
            [str(venv_python), "-m", "pip", "install", "-e", str(target)], check=True
        )
