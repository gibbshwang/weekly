import keyring
from scripts.keyring_setup import save_secrets
from scripts.scope import ScopeAnswers, PartLeadAnswer


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


def _make_answers() -> ScopeAnswers:
    return ScopeAnswers(
        dept_name="기획팀",
        parts=["전략기획"],
        group_lead_name="x", group_lead_email="x@e.com",
        part_leads=[PartLeadAnswer(part="전략기획", name="x", email="x@e.com")],
        storage_type="local", storage_root="/tmp",
        smtp_host="smtp.example.com", smtp_port=587, smtp_use_tls=True,
        smtp_user="op@e.com", smtp_password="my-smtp-pwd",
        ai_provider="codex",
    )


def test_save_secrets_stores_smtp_password():
    backend = _FakeBackend()
    keyring.set_keyring(backend)
    save_secrets(_make_answers())
    assert keyring.get_password("weekly-기획팀", "smtp_password") == "my-smtp-pwd"


def test_save_secrets_does_not_store_ai_key():
    """Per security policy: no AI api key in keyring."""
    backend = _FakeBackend()
    keyring.set_keyring(backend)
    save_secrets(_make_answers())
    assert keyring.get_password("weekly-기획팀", "ai_api_key") is None


def test_save_secrets_uses_dept_name_in_service():
    backend = _FakeBackend()
    keyring.set_keyring(backend)
    answers = _make_answers()
    answers.dept_name = "전략팀"
    save_secrets(answers)
    assert keyring.get_password("weekly-전략팀", "smtp_password") == "my-smtp-pwd"
