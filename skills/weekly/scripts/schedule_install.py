"""Stage 7: schedule_install — register OS-scheduled tasks at init time.

Calls into the *project's* scheduler helper (after scaffold has put it in
place) to install the two cron jobs for this department.

Skipped during scaffold dry-run (install_pkg=False) since the project venv
isn't built yet — Wave 8 dogfood handles the live install.
"""
import sys
from pathlib import Path
from typing import Any


def register_cron_tasks(project_root: Path,
                        answers: Any,
                        assign_cron: str = "0 * * * *",
                        compile_cron: str = "0 17 * * 5") -> None:
    """Install assign + compile scheduled tasks for this department.

    `answers` must expose `.dept_name` (matches ScopeAnswers contract).
    """
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
        name=f"weekly-{answers.dept_name}-assign",
        cron=assign_cron,
        command=f'"{wreport}" assign {answers.dept_name}',
        working_dir=str(project_root),
    )
    install_task(
        name=f"weekly-{answers.dept_name}-compile",
        cron=compile_cron,
        command=f'"{wreport}" compile {answers.dept_name}',
        working_dir=str(project_root),
    )
