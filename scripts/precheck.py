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

    if target_dir is not None:
        p = Path(target_dir)
        if p.exists() and any(p.iterdir()):
            raise PrecheckError(
                f"Target directory {p} already exists and is not empty. "
                f"Remove it first or use a different department name."
            )

    home = Path.home()
    disk_free_gb = shutil.disk_usage(home).free / (1024 ** 3)
    if disk_free_gb < min_disk_gb:
        raise PrecheckError(f"Need at least {min_disk_gb} GB free, only {disk_free_gb:.2f} GB.")
