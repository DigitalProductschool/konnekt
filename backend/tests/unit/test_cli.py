import builtins
import getpass
import secrets
import uuid
from collections.abc import Callable
from datetime import timedelta

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.cli import CONNECTION_MODELS, main
from app.config import settings
from app.db import SessionLocal
from app.models import (
    ApprovalRequest,
    DocumentRequest,
    FormConnectionRuleSet,
    LoginSession,
    UserAccount,
)
from app.services.auth import authenticate, create_login_session
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, create_user
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    create_agent_authorization,
    create_form_connection,
    now,
    share,
    stored_request,
    trigger,
    update_request,
)

NEW_PASSWORD = 'another long passphrase'


@pytest.fixture
def type_passwords(monkeypatch: pytest.MonkeyPatch) -> Callable[..., None]:
    """Answer the password prompts with the given values, in order."""

    def answer(*passwords: str) -> None:
        answers = iter(passwords)
        monkeypatch.setattr(getpass, 'getpass', lambda prompt='': next(answers))

    return answer


def _usernames() -> list[str]:
    with SessionLocal() as db:
        return list(db.scalars(select(UserAccount.username)).all())


def test_create_user(
    type_passwords: Callable[..., None], capsys: pytest.CaptureFixture[str]
) -> None:
    type_passwords(NEW_PASSWORD, NEW_PASSWORD)

    assert main(['create-user', 'Laura.Weber']) == 0

    assert _usernames() == ['laura.weber']
    with SessionLocal() as db:
        assert authenticate(db, 'laura.weber', NEW_PASSWORD) is not None
    output = capsys.readouterr()
    assert "Created user 'laura.weber'." in output.out
    assert NEW_PASSWORD not in output.out + output.err


def test_create_user_refuses_a_short_password(
    type_passwords: Callable[..., None], capsys: pytest.CaptureFixture[str]
) -> None:
    type_passwords('11 chars ok', '11 chars ok')

    assert main(['create-user', 'alice']) == 1

    assert _usernames() == []
    assert 'at least 12 characters' in capsys.readouterr().err


@pytest.mark.parametrize('username', ['al', 'alice@example.org', 'a' * 101, 'ali ce'])
def test_create_user_refuses_an_invalid_username(
    username: str,
    type_passwords: Callable[..., None],
    capsys: pytest.CaptureFixture[str],
) -> None:
    type_passwords(NEW_PASSWORD, NEW_PASSWORD)

    assert main(['create-user', username]) == 1

    assert _usernames() == []
    assert 'A username has 3 to 100 characters' in capsys.readouterr().err


def test_create_user_refuses_different_passwords(
    type_passwords: Callable[..., None],
) -> None:
    type_passwords(NEW_PASSWORD, NEW_PASSWORD + '!')

    assert main(['create-user', 'alice']) == 1

    assert _usernames() == []


def test_create_user_refuses_an_existing_username(
    type_passwords: Callable[..., None],
) -> None:
    create_user('alice')
    type_passwords(NEW_PASSWORD, NEW_PASSWORD)

    assert main(['create-user', 'alice']) == 1


def test_set_password_ends_the_sign_in_sessions(
    type_passwords: Callable[..., None],
) -> None:
    user_id = create_user('alice')
    other_id = create_user('bob')
    with SessionLocal() as db:
        for account_id in (user_id, user_id, other_id):
            account = db.get(UserAccount, account_id)
            assert account is not None
            create_login_session(db, account)
    type_passwords(NEW_PASSWORD, NEW_PASSWORD)

    assert main(['set-password', 'alice']) == 0

    with SessionLocal() as db:
        owners = db.scalars(select(LoginSession.user_account_id)).all()
        assert owners == [other_id]
        assert authenticate(db, 'alice', NEW_PASSWORD) is not None
        assert authenticate(db, 'alice', TEST_PASSWORD) is None


def test_set_password_of_an_unknown_user(
    type_passwords: Callable[..., None], capsys: pytest.CaptureFixture[str]
) -> None:
    type_passwords(NEW_PASSWORD, NEW_PASSWORD)

    assert main(['set-password', 'nobody']) == 1

    assert "There is no user 'nobody'." in capsys.readouterr().err


def test_delete_user_removes_the_account_and_its_sessions() -> None:
    user_id = create_user('alice')
    with SessionLocal() as db:
        account = db.get(UserAccount, user_id)
        assert account is not None
        create_login_session(db, account)

    assert main(['delete-user', 'alice']) == 0

    assert _usernames() == []
    with SessionLocal() as db:
        assert db.scalars(select(LoginSession)).first() is None


def _row_counts() -> dict[str, int]:
    with SessionLocal() as db:
        return {
            model.__tablename__: db.scalar(select(func.count()).select_from(model)) or 0
            for model in CONNECTION_MODELS
        }


def _add_connection_rows(client: TestClient) -> str:
    """A form connection with a document request and an agent's approval request
    for it; returns the document request's reference."""
    form_connection_id = create_form_connection(client)
    reference: str = trigger(client, form_connection_id)['reference']
    with SessionLocal() as db:
        user_account_id = db.scalars(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        ).one()
    authorization_id, _ = create_agent_authorization(user_account_id, 'manage')
    with SessionLocal() as db:
        db.add(
            ApprovalRequest(
                form_connection_id=form_connection_id,
                action='deactivate',
                authorization_id=authorization_id,
                requested_by='test',
                user_account_id=user_account_id,
                was_active=True,
                status='waiting',
                expires_at=now() + timedelta(minutes=10),
            )
        )
        db.commit()
    return reference


def _session_of(reference: str) -> str:
    return stored_request(reference).eudiplo_session_id


def _on_session_deletion(
    fake: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    after: Callable[[], None],
) -> None:
    """Call `after` each time the fake has deleted a session."""
    delete_session = fake._delete_session

    def delete_then(request: httpx2.Request) -> httpx2.Response:
        response = delete_session(request)
        after()
        return response

    monkeypatch.setattr(fake, '_delete_session', delete_then)


def test_clear_connections_keeps_the_accounts(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _add_connection_rows(signed_in_client)
    _add_connection_rows(signed_in_client)
    assert all(_row_counts().values())

    assert main(['clear-connections', '--yes']) == 0

    assert not any(_row_counts().values())
    assert _usernames() == [TEST_USERNAME]
    with SessionLocal() as db:
        assert db.scalars(select(LoginSession)).first() is not None
    assert (
        'Deleted 2 form connection(s) and 2 EUDIPLO session(s)'
        in capsys.readouterr().out
    )


def test_clear_connections_deletes_the_branches_and_rule_sets(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    reference = _add_connection_rows(signed_in_client)
    # A request names the rule set it started with, so it must go first
    with SessionLocal() as db:
        rule_set_id = db.scalars(select(FormConnectionRuleSet.id)).one()
    update_request(reference, rule_set_id=rule_set_id)
    counts = _row_counts()
    assert counts['form_connection_branches'] == 1
    assert counts['form_connection_rule_sets'] == 1

    assert main(['clear-connections', '--yes']) == 0

    assert not any(_row_counts().values())


def test_clear_connections_deletes_the_eudiplo_sessions_first(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    shared = _add_connection_rows(signed_in_client)
    share(fake_eudiplo, shared)
    pending = _add_connection_rows(signed_in_client)
    # The worker deleted this one's session; the fake keeps it to show it isn't asked
    gone = _add_connection_rows(signed_in_client)
    update_request(gone, eudiplo_session_deleted_at=now())
    row_counts_at_deletion: list[dict[str, int]] = []
    _on_session_deletion(
        fake_eudiplo,
        monkeypatch,
        lambda: row_counts_at_deletion.append(_row_counts()),
    )
    full = _row_counts()
    sessions = {ref: _session_of(ref) for ref in (shared, pending, gone)}

    assert main(['clear-connections', '--yes']) == 0

    assert row_counts_at_deletion == [full, full]
    assert set(fake_eudiplo.sessions) == {sessions[gone]}
    assert not any(_row_counts().values())


def test_clear_connections_accepts_a_session_eudiplo_no_longer_has(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    # EUDIPLO's session TTL ended, for example
    del fake_eudiplo.sessions[_session_of(_add_connection_rows(signed_in_client))]
    _add_connection_rows(signed_in_client)

    assert main(['clear-connections', '--yes']) == 0

    assert fake_eudiplo.call_names().count('delete_session') == 2
    assert fake_eudiplo.sessions == {}
    assert not any(_row_counts().values())


def test_clear_connections_keeps_every_row_when_a_session_deletion_fails(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    references = [_add_connection_rows(signed_in_client) for _ in range(2)]

    def fail_the_next_deletion() -> None:
        # Of the two, the first deletion succeeds and the second answers 503
        if fake_eudiplo.sessions:
            fake_eudiplo.fail('delete_session', 503)

    _on_session_deletion(fake_eudiplo, monkeypatch, fail_the_next_deletion)
    full = _row_counts()

    assert main(['clear-connections', '--yes']) == 1

    assert _row_counts() == full
    assert len(fake_eudiplo.sessions) == 1
    deleted = [stored_request(r).eudiplo_session_deleted_at for r in references]
    assert deleted[0] is not None and deleted[1] is None
    output = capsys.readouterr()
    assert 'nothing was deleted. 1 EUDIPLO session(s) are left' in output.err
    for reference in references:
        assert reference not in output.out + output.err

    # A second run deletes only the session left
    calls_before = len(fake_eudiplo.calls)
    assert main(['clear-connections', '--yes']) == 0

    assert fake_eudiplo.call_names()[calls_before:].count('delete_session') == 1
    assert fake_eudiplo.sessions == {}
    assert not any(_row_counts().values())


def test_clear_connections_without_eudiplo_deletes_nothing(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _add_connection_rows(signed_in_client)
    full = _row_counts()
    monkeypatch.setattr(settings, 'eudiplo_url', '')

    assert main(['clear-connections', '--yes']) == 1

    assert _row_counts() == full
    assert len(fake_eudiplo.sessions) == 1
    error = capsys.readouterr().err
    assert "EUDIPLO isn't configured (EUDIPLO_URL is not set)" in error
    assert '1 EUDIPLO session(s) are left' in error


def test_clear_connections_without_sessions_needs_no_eudiplo(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    create_form_connection(signed_in_client)
    monkeypatch.setattr(settings, 'eudiplo_url', '')

    assert main(['clear-connections', '--yes']) == 0

    assert not any(_row_counts().values())
    assert 'delete_session' not in fake_eudiplo.call_names()


def test_clear_connections_deletes_nothing_when_a_request_starts_meanwhile(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    existing = stored_request(_add_connection_rows(signed_in_client))

    def start_request() -> None:
        # serviceBW calls the trigger URL while the sessions are being deleted
        with SessionLocal() as db:
            db.add(
                DocumentRequest(
                    reference=secrets.token_urlsafe(32),
                    form_connection_id=existing.form_connection_id,
                    revision_id=existing.revision_id,
                    status='pending',
                    status_changed_at=now(),
                    expires_at=now() + timedelta(minutes=15),
                    eudiplo_session_id=str(uuid.uuid4()),
                )
            )
            db.commit()

    _on_session_deletion(fake_eudiplo, monkeypatch, start_request)

    assert main(['clear-connections', '--yes']) == 1

    assert all(_row_counts().values())
    assert (
        '1 document request(s) started meanwhile, so nothing was deleted'
        in capsys.readouterr().err
    )


def test_clear_connections_asks_first(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _add_connection_rows(signed_in_client)
    monkeypatch.setattr(builtins, 'input', lambda prompt='': 'yes')

    assert main(['clear-connections']) == 0

    assert not any(_row_counts().values())


def test_clear_connections_without_confirmation_deletes_nothing(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _add_connection_rows(signed_in_client)
    monkeypatch.setattr(builtins, 'input', lambda prompt='': 'no')

    assert main(['clear-connections']) == 1

    assert all(_row_counts().values())
    with SessionLocal() as db:
        assert db.scalars(select(DocumentRequest)).first() is not None
    assert 'Nothing deleted.' in capsys.readouterr().err


def test_clear_connections_without_connections(
    capsys: pytest.CaptureFixture[str],
) -> None:
    assert main(['clear-connections', '--yes']) == 0

    assert 'There are no form connections to delete.' in capsys.readouterr().out
