import importlib.util
from pathlib import Path
from unittest.mock import MagicMock, patch
from scripts.lib.template_render import render_string

# Get the project root (parent of skills/weekly)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


def _load_mailer(tmp_path: Path):
    template_path = PROJECT_ROOT / "skills/weekly/templates/src/mailer.py.tmpl"
    text = render_string(
        template_path.read_text(encoding="utf-8"), {}
    )
    out = tmp_path / "mailer.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("mailer", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_send_with_to_cc_and_attachment(tmp_path: Path):
    mailer = _load_mailer(tmp_path)
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
    args, kwargs = smtp_inst.send_message.call_args
    msg = args[0]
    assert msg["To"] == "lead@example.com"
    assert msg["Cc"] == "p1@example.com, p2@example.com"
    assert msg["Subject"] == "기획팀 주간보고 2026-W18"
    payloads = list(msg.iter_attachments())
    assert len(payloads) == 1
    assert payloads[0].get_filename() == "_dashboard.html"


def test_send_without_attachment(tmp_path: Path):
    mailer = _load_mailer(tmp_path)
    smtp_inst = MagicMock()
    with patch("smtplib.SMTP") as smtp_cls:
        smtp_cls.return_value.__enter__.return_value = smtp_inst
        mailer.send_compile_mail(
            host="smtp.example.com", port=587, use_tls=True,
            user="op@example.com", password="pwd",
            sender="op@example.com",
            to=["lead@example.com"],
            cc=[],
            subject="test",
            body_text="hello",
        )
    args, kwargs = smtp_inst.send_message.call_args
    msg = args[0]
    assert "Cc" not in msg
    assert list(msg.iter_attachments()) == []


def test_send_no_tls(tmp_path: Path):
    mailer = _load_mailer(tmp_path)
    smtp_inst = MagicMock()
    with patch("smtplib.SMTP") as smtp_cls:
        smtp_cls.return_value.__enter__.return_value = smtp_inst
        mailer.send_compile_mail(
            host="local.smtp", port=25, use_tls=False,
            user="op", password="pwd",
            sender="op@example.com",
            to=["lead@example.com"], cc=[],
            subject="x", body_text="x",
        )
    smtp_inst.starttls.assert_not_called()
