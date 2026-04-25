from unittest.mock import patch, MagicMock
from scripts.smtp_test import send_test_mail


def test_send_test_mail_calls_smtp():
    smtp_inst = MagicMock()
    with patch("smtplib.SMTP") as smtp_cls:
        smtp_cls.return_value.__enter__.return_value = smtp_inst
        send_test_mail(
            host="smtp.gmail.com", port=587, use_tls=True,
            user="op@example.com", password="pwd",
            to="lead@example.com", dept_name="기획팀",
        )
    smtp_cls.assert_called_with("smtp.gmail.com", 587)
    smtp_inst.starttls.assert_called_once()
    smtp_inst.login.assert_called_once_with("op@example.com", "pwd")
    smtp_inst.send_message.assert_called_once()
    msg = smtp_inst.send_message.call_args[0][0]
    assert msg["Subject"].startswith("[/weekly]")
    assert "기획팀" in msg["Subject"]


def test_send_test_mail_no_tls():
    smtp_inst = MagicMock()
    with patch("smtplib.SMTP") as smtp_cls:
        smtp_cls.return_value.__enter__.return_value = smtp_inst
        send_test_mail(
            host="local.smtp", port=25, use_tls=False,
            user="op", password="pwd",
            to="lead@example.com", dept_name="x",
        )
    smtp_inst.starttls.assert_not_called()


def test_send_test_mail_includes_helpful_body():
    smtp_inst = MagicMock()
    with patch("smtplib.SMTP") as smtp_cls:
        smtp_cls.return_value.__enter__.return_value = smtp_inst
        send_test_mail(
            host="smtp.example.com", port=587, use_tls=True,
            user="op@e.com", password="x",
            to="lead@example.com", dept_name="기획팀",
        )
    msg = smtp_inst.send_message.call_args[0][0]
    body = msg.get_content()
    assert "기획팀" in body
    assert "op@e.com" in body
    assert "lead@example.com" in body
