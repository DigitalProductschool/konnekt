import getpass
from collections.abc import Callable

import pytest
from sqlalchemy import select

from app.cli import main
from app.db import SessionLocal
from app.models import LoginSession, UserAccount
from app.services.auth import authenticate, create_login_session
from tests.conftest import TEST_PASSWORD, create_user

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
