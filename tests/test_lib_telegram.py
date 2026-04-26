import logging
from unittest.mock import patch, MagicMock

import pytest
import requests

from scripts.lib import telegram


def test_module_imports_cleanly():
    """Smoke test: module loads without error."""
    assert telegram is not None


def test_exposes_send_message_or_equivalent():
    """The module exposes a public callable for sending notifications.

    Accepts any of: send_message, send, notify, send_telegram_message.
    """
    candidates = ["send_message", "send", "notify", "send_telegram_message"]
    found = [name for name in candidates if hasattr(telegram, name) and callable(getattr(telegram, name))]
    assert found, f"No public sender found. Module exports: {dir(telegram)}"


# --- Token redaction tests (FIX-05) ---

_FAKE_TOKEN = "1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"


@pytest.fixture
def fake_token(monkeypatch):
    monkeypatch.setattr(telegram, "get_token", lambda: _FAKE_TOKEN)
    return _FAKE_TOKEN


def _http_error_with_url_in_message(token: str) -> requests.HTTPError:
    """Build an HTTPError whose str() includes the bot token URL,
    matching the real requests behavior on raise_for_status()."""
    response = MagicMock(spec=requests.Response)
    response.status_code = 404
    response.text = "Not Found"
    err = requests.HTTPError(
        f"404 Client Error: Not Found for url: https://api.telegram.org/bot{token}/sendMessage",
        response=response,
    )
    return err


def test_send_redacts_token_on_http_error(fake_token, caplog):
    """When the HTTP call fails, the bot token must NOT appear in any log record."""
    caplog.set_level(logging.DEBUG, logger=telegram.log.name)

    response = MagicMock()
    response.raise_for_status.side_effect = _http_error_with_url_in_message(fake_token)
    with patch.object(telegram.requests, "post", return_value=response):
        ok = telegram.send("123", "hello")

    assert ok is False
    combined = "\n".join(rec.getMessage() for rec in caplog.records)
    assert fake_token not in combined, (
        f"Bot token leaked into log output:\n{combined}"
    )


def test_send_redacts_token_on_connection_error(fake_token, caplog):
    """When requests raises a generic ConnectionError, str(e) sometimes contains the URL.
    The send() helper must redact before logging."""
    caplog.set_level(logging.DEBUG, logger=telegram.log.name)

    err = requests.ConnectionError(
        f"HTTPSConnectionPool(host='api.telegram.org', port=443): "
        f"failed for url /bot{fake_token}/sendMessage"
    )
    with patch.object(telegram.requests, "post", side_effect=err):
        ok = telegram.send("123", "hello")

    assert ok is False
    combined = "\n".join(rec.getMessage() for rec in caplog.records)
    assert fake_token not in combined, (
        f"Bot token leaked into log output:\n{combined}"
    )


def test_send_document_redacts_token_on_error(fake_token, tmp_path, caplog):
    """sendDocument failures must also redact the token in logs."""
    caplog.set_level(logging.DEBUG, logger=telegram.log.name)

    attachment = tmp_path / "report.html"
    attachment.write_text("<p>hi</p>", encoding="utf-8")

    ok_response = MagicMock()
    ok_response.raise_for_status.return_value = None
    fail_response = MagicMock()
    fail_response.raise_for_status.side_effect = _http_error_with_url_in_message(fake_token)

    # First call (sendMessage) succeeds, second (sendDocument) fails.
    with patch.object(telegram.requests, "post", side_effect=[ok_response, fail_response]):
        ok = telegram.send("123", "hello", files=[attachment])

    # send() returns True even if document failed (sendMessage succeeded), but log must be clean
    combined = "\n".join(rec.getMessage() for rec in caplog.records)
    assert fake_token not in combined, (
        f"Bot token leaked into log output:\n{combined}"
    )
    assert ok is True
