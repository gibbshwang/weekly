"""Stage 5: keyring_setup — store SMTP password in OS keyring.

Per security policy (2026-04-25): AI calls go through Codex/Gemini CLI subprocess,
which use their own auth. No AI API key is stored.
"""
import keyring

from scripts.scope import ScopeAnswers


def save_secrets(answers: ScopeAnswers) -> None:
    """Store SMTP password in OS keyring under `weekly-<dept>`/smtp_password.

    AI api keys are intentionally NOT stored — Codex CLI and Gemini CLI handle
    their own credentials.
    """
    service = f"weekly-{answers.dept_name}"
    keyring.set_password(service, "smtp_password", answers.smtp_password)
