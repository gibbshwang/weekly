"""Test the keyring_helper.py template using a fake in-memory keyring backend."""
import importlib.util
from pathlib import Path
import keyring
import pytest
from scripts.lib.template_render import render_string


class _FakeBackend(keyring.backend.KeyringBackend):
    priority = 1

    def __init__(self):
        self._store = {}

    def set_password(self, service, username, password):
        self._store[(service, username)] = password

    def get_password(self, service, username):
        return self._store.get((service, username))

    def delete_password(self, service, username):
        if (service, username) in self._store:
            del self._store[(service, username)]


def _import_helper(tmp_path: Path):
    # Resolve template path relative to the test file's location
    test_dir = Path(__file__).parent
    template_path = test_dir.parent / "templates" / "src" / "keyring_helper.py.tmpl"
    text = render_string(template_path.read_text(encoding="utf-8"), {})
    out = tmp_path / "kh.py"
    out.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("kh", out)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_set_and_get(tmp_path: Path):
    keyring.set_keyring(_FakeBackend())
    kh = _import_helper(tmp_path)
    kh.set_secret("weekly-기획팀", "smtp_password", "sekrit")
    assert kh.get_secret("weekly-기획팀", "smtp_password") == "sekrit"


def test_get_missing_raises(tmp_path: Path):
    keyring.set_keyring(_FakeBackend())
    kh = _import_helper(tmp_path)
    with pytest.raises(KeyError):
        kh.get_secret("weekly-기획팀", "nonexistent")


def test_delete_secret(tmp_path: Path):
    keyring.set_keyring(_FakeBackend())
    kh = _import_helper(tmp_path)
    kh.set_secret("weekly-기획팀", "smtp_password", "x")
    kh.delete_secret("weekly-기획팀", "smtp_password")
    with pytest.raises(KeyError):
        kh.get_secret("weekly-기획팀", "smtp_password")


def test_delete_secret_idempotent(tmp_path: Path):
    keyring.set_keyring(_FakeBackend())
    kh = _import_helper(tmp_path)
    # Should not raise even if missing
    kh.delete_secret("weekly-기획팀", "nonexistent")
