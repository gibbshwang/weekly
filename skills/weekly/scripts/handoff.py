"""Stage 8: handoff — generate README.md + print final summary."""
from pathlib import Path

from jinja2 import Template


def generate_readme(target: Path, bundle_root: Path, dept_name: str, project_path: str, storage_root: str) -> None:
    """Render README.md from template into the target project directory."""
    tmpl_path = Path(bundle_root) / "templates" / "README.md.tmpl"
    rendered = Template(tmpl_path.read_text(encoding="utf-8")).render(
        dept_name=dept_name,
        project_path=project_path,
        storage_root=storage_root,
    )
    (Path(target) / "README.md").write_text(rendered, encoding="utf-8")


def print_summary(target: Path, dept_name: str, storage_root: str) -> str:
    """Return a human-readable next-steps summary string."""
    return (
        f"\n=== /weekly init {dept_name} 완료 ===\n\n"
        f"프로젝트: {target}\n"
        f"공유폴더: {storage_root}/{dept_name}/\n"
        f"엑셀 양식: {storage_root}/{dept_name}/_지시사항.xlsx\n\n"
        f"다음 단계:\n"
        f"  1. {storage_root}/{dept_name}/_지시사항.xlsx 에 row 몇 개 입력\n"
        f"  2. {storage_root}/{dept_name}/2026-Wxx/<파트>.md 파일에 성과/이슈/차주계획 작성\n"
        f"  3. cd {target} && venv/Scripts/wreport compile {dept_name} --week=2026-Wxx\n"
        f"  4. 그룹장 메일에서 _dashboard.html 첨부 메일 확인\n\n"
        f"Phase 1 (cron 자동화)은 별도 플랜으로 진행됩니다.\n"
    )
