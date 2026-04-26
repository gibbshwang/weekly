"""Minimal Telegram send helper. Token read from OS keyring."""

from __future__ import annotations

import logging
import re
from pathlib import Path

import keyring
import requests


log = logging.getLogger("udd.telegram")

KEYRING_SERVICE = "udd-telegram"
KEYRING_KEY = "bot_token"
API_BASE = "https://api.telegram.org"

# Scrubs `/bot<token>/` segments out of error messages. requests' HTTPError
# stringifies as "... for url: https://api.telegram.org/bot<TOKEN>/sendMessage",
# so logging the bare exception leaks the bot token. _redact() strips it.
_TOKEN_RE = re.compile(r"/bot[0-9A-Za-z_:-]+/")


def _redact(message: str) -> str:
    return _TOKEN_RE.sub("/bot***/", message)


def get_token() -> str | None:
    return keyring.get_password(KEYRING_SERVICE, KEYRING_KEY)


def send(chat_id: str, text: str, files: list[Path] | None = None) -> bool:
    token = get_token()
    if not token:
        log.warning("Telegram bot_token not in keyring (%s/%s)", KEYRING_SERVICE, KEYRING_KEY)
        return False

    url = f"{API_BASE}/bot{token}/sendMessage"
    try:
        r = requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}, timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        log.error("Telegram send failed: %s", _redact(str(e)))
        return False

    for path in files or []:
        if not path.exists():
            continue
        doc_url = f"{API_BASE}/bot{token}/sendDocument"
        try:
            with path.open("rb") as f:
                r = requests.post(doc_url, data={"chat_id": chat_id},
                                  files={"document": (path.name, f)}, timeout=30)
            r.raise_for_status()
        except requests.RequestException as e:
            log.error("Telegram sendDocument failed: %s", _redact(str(e)))

    return True
