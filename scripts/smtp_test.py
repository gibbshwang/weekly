"""Stage 6: smtp_test — send a test mail to verify SMTP credentials work."""
import smtplib
from email.message import EmailMessage


def send_test_mail(
    host: str,
    port: int,
    use_tls: bool,
    user: str,
    password: str,
    to: str,
    team_name: str,
) -> None:
    """Send a one-line confirmation mail to verify SMTP connectivity."""
    msg = EmailMessage()
    msg["From"] = user
    msg["To"] = to
    msg["Subject"] = f"[/weekly] {team_name} SMTP 테스트"
    msg.set_content(
        f"이 메일은 /weekly init이 발송한 SMTP 연결 테스트 메일입니다.\n"
        f"팀: {team_name}\n"
        f"발신: {user}\n"
        f"수신: {to}\n"
        f"이 메일이 도착했다면 SMTP 설정이 올바릅니다."
    )
    with smtplib.SMTP(host, port) as smtp:
        if use_tls:
            smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(msg)
