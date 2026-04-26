"""Stage 7: schedule_install — register OS-scheduled tasks at init time.

Calls into the *project's* scheduler helper (after scaffold has put it in
place) to install the three cron jobs for this team:
  - prepare  (Monday morning)
  - assign   (every hour)
  - compile  (Friday)

Skipped during scaffold dry-run (install_pkg=False) since the project venv
isn't built yet — Wave 8 dogfood handles the live install.
"""
import re
import sys
from pathlib import Path
from typing import Any

# team_name flows directly into the cron command string and the schtasks /TR
# value below. Hostile values (`foo" & calc.exe`, `../etc`, embedded newlines)
# would land in those shell-bearing surfaces. The downstream scheduler also
# validates, but catching it here gives a clearer error and prevents the
# first install_task call from succeeding while the second fails with a
# confusing message.
_TEAM_SLUG_RE = re.compile(r"^[가-힣A-Za-z0-9_][가-힣A-Za-z0-9_-]{0,39}$")


def _validate_team_name(name: str) -> str:
    if not isinstance(name, str) or not _TEAM_SLUG_RE.fullmatch(name):
        raise ValueError(
            f"team_name must be 1-40 chars of Korean / A-Z / 0-9 / _ / - "
            f"(no spaces, no path separators, no shell metacharacters). "
            f"Got: {name!r}"
        )
    return name


def register_cron_tasks(project_root: Path,
                        answers: Any,
                        prepare_cron: str = "0 6 * * 1",
                        assign_cron: str = "0 * * * *",
                        compile_cron: str = "0 17 * * 5") -> None:
    """Install prepare + assign + compile scheduled tasks for this team.

    `answers` must expose `.team_name` (matches TeamScopeAnswers contract).
    """
    team_name = _validate_team_name(answers.team_name)

    project_root = Path(project_root)
    sys.path.insert(0, str(project_root))
    try:
        # Drop any stale imports so the project's scheduler resolves freshly
        for k in list(sys.modules):
            if k.startswith("weekly_runtime"):
                del sys.modules[k]
        from weekly_runtime.scheduler import install_task
    finally:
        if str(project_root) in sys.path:
            sys.path.remove(str(project_root))

    if sys.platform == "win32":
        wreport = project_root / "venv" / "Scripts" / "wreport.exe"
    else:
        wreport = project_root / "venv" / "bin" / "wreport"

    install_task(
        name=f"weekly-{team_name}-prepare",
        cron=prepare_cron,
        command=f'"{wreport}" prepare {team_name}',
        working_dir=str(project_root),
    )
    install_task(
        name=f"weekly-{team_name}-assign",
        cron=assign_cron,
        command=f'"{wreport}" assign {team_name}',
        working_dir=str(project_root),
    )
    install_task(
        name=f"weekly-{team_name}-compile",
        cron=compile_cron,
        command=f'"{wreport}" compile {team_name}',
        working_dir=str(project_root),
    )
