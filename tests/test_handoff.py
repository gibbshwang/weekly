from pathlib import Path
from scripts.handoff import generate_readme, print_summary


def test_generate_readme(tmp_path: Path):
    target = tmp_path / "project"
    target.mkdir()
    bundle_root = Path(__file__).resolve().parent.parent
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
    assert "Codex CLI" in readme or "codex" in readme.lower()


def test_print_summary_returns_actionable_text(tmp_path: Path):
    target = tmp_path / "project"
    text = print_summary(target=target, dept_name="기획팀", storage_root="C:/weekly-test")
    # Must mention next-step commands
    assert "wreport compile" in text
    assert "기획팀" in text
    assert "_지시사항.xlsx" in text
    assert "<파트>.md" in text or "파트.md" in text
