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
