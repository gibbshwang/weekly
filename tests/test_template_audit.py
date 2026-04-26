import json
import importlib.util
from datetime import datetime, timezone
from pathlib import Path
from scripts.lib.template_render import render_string

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_audit(tmp_path: Path):
    template_path = PROJECT_ROOT / "templates/src/audit.py.tmpl"
    text = render_string(
        template_path.read_text(encoding="utf-8"), {}
    )
    out = tmp_path / "audit.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("audit_mod", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_log_event_appends_jsonline(tmp_path: Path):
    audit = _load_audit(tmp_path)
    log_path = tmp_path / "audit.jsonl"
    audit.log_event(log_path, "assign", rows=2, parts_affected=["전략기획"], ai_calls=1, mail_sent=1)
    audit.log_event(log_path, "compile", week="2026-W18", parts_complete=2, parts_missing=0)
    lines = log_path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    e1 = json.loads(lines[0])
    e2 = json.loads(lines[1])
    assert e1["event"] == "assign"
    assert e1["rows"] == 2
    assert e1["parts_affected"] == ["전략기획"]
    assert "ts" in e1
    assert e2["event"] == "compile"
    assert e2["week"] == "2026-W18"


def test_log_event_creates_parent_dir(tmp_path: Path):
    audit = _load_audit(tmp_path)
    log_path = tmp_path / "logs" / "audit.jsonl"
    audit.log_event(log_path, "test")
    assert log_path.exists()


def test_log_event_timestamp_iso8601(tmp_path: Path):
    audit = _load_audit(tmp_path)
    log_path = tmp_path / "audit.jsonl"
    audit.log_event(log_path, "x")
    line = log_path.read_text(encoding="utf-8").strip()
    rec = json.loads(line)
    parsed = datetime.fromisoformat(rec["ts"].replace("Z", "+00:00"))
    assert parsed.tzinfo is not None


def test_log_event_handles_korean(tmp_path: Path):
    audit = _load_audit(tmp_path)
    log_path = tmp_path / "audit.jsonl"
    audit.log_event(log_path, "assign", parts_affected=["전략기획", "사업개발"])
    line = log_path.read_text(encoding="utf-8").strip()
    rec = json.loads(line)
    assert "전략기획" in rec["parts_affected"]
