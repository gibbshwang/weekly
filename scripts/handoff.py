"""Stage 8: handoff — generate README.md + print final summary."""
from pathlib import Path

from jinja2 import Template


def generate_readme(target: Path, bundle_root: Path, team_name: str, project_path: str, storage_root: str) -> None:
    """Render README.md from template into the target project directory."""
    tmpl_path = Path(bundle_root) / "templates" / "README.md.tmpl"
    rendered = Template(tmpl_path.read_text(encoding="utf-8")).render(
        team_name=team_name,
        project_path=project_path,
        storage_root=storage_root,
    )
    (Path(target) / "README.md").write_text(rendered, encoding="utf-8")


def print_summary(target: Path, team_name: str, storage_root: str) -> str:
    """Return a human-readable next-steps summary string."""
    return (
        f"\n=== /weekly init {team_name} 완료 ===\n\n"
        f"프로젝트: {target}\n"
        f"공유폴더: {storage_root}/{team_name}/\n"
        f"엑셀 양식: {storage_root}/{team_name}/_지시사항.xlsx\n\n"
        f"다음 단계:\n"
        f"  1. cd {target} && venv/Scripts/wreport prepare {team_name} --prev-week ''\n"
        f"     → 첫 주차의 파트별 xlsx 생성 (carry-forward 없음)\n"
        f"  2. {storage_root}/{team_name}/_지시사항.xlsx 에 row 몇 개 입력 (담당그룹 + 담당파트)\n"
        f"  3. venv/Scripts/wreport assign {team_name}\n"
        f"     → 파트별 xlsx 이번주 시트에 W{{week}}-NNN 업무ID로 자동 분배\n"
        f"  4. 파트장이 자기 xlsx의 이번주 시트에 상태/처리결과/이슈 작성\n"
        f"  5. venv/Scripts/wreport compile {team_name}\n"
        f"     → 대시보드 생성 + 팀장 메일 (cc: 그룹장 + 파트장)\n"
        f"  6. venv/Scripts/wreport schedule install {team_name}\n"
        f"     → prepare/assign/compile 자동 cron 등록\n"
    )
