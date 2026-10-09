from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update

from app.config import settings
from app.db import SessionLocal
from app.models import LoginSession
from app.services.worker import delete_expired_login_sessions
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, create_user

INVALID_CREDENTIALS = {
    'error': 'Unauthorized',
    'message': 'Invalid username or password',
}
SIGN_IN_REQUIRED = {'error': 'Unauthorized', 'message': 'Sign in to continue'}


def _session_count() -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(LoginSession)) or 0


def _cookie_attributes(set_cookie: str) -> set[str]:
    """The attributes of a Set-Cookie header, lowercased, without the value."""
    return {part.strip().lower() for part in set_cookie.split(';')[1:]}


def test_sign_in_sets_the_session_cookie(client: TestClient) -> None:
    create_user()

    response = client.post(
        '/api/auth/login',
        json={'username': TEST_USERNAME, 'password': TEST_PASSWORD},
    )

    assert response.status_code == 200
    assert response.json()['data'] == {'username': TEST_USERNAME}
    set_cookie = response.headers['set-cookie']
    assert set_cookie.startswith('session=')
    attributes = _cookie_attributes(set_cookie)
    assert {'httponly', 'samesite=strict', 'path=/api', 'max-age=28800'} <= attributes
    # APP_ENV is development in the tests, where the cookie must work over http
    assert 'secure' not in attributes
    assert _session_count() == 1


def test_sign_in_cookie_is_secure_outside_development(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    create_user()
    monkeypatch.setattr(settings, 'app_env', 'production')

    response = client.post(
        '/api/auth/login',
        json={'username': TEST_USERNAME, 'password': TEST_PASSWORD},
    )

    assert response.status_code == 200
    assert 'secure' in _cookie_attributes(response.headers['set-cookie'])


def test_sign_in_ignores_the_case_of_the_username(client: TestClient) -> None:
    create_user()

    response = client.post(
        '/api/auth/login', json={'username': ' Alice ', 'password': TEST_PASSWORD}
    )

    assert response.status_code == 200
    assert response.json()['data'] == {'username': TEST_USERNAME}


@pytest.mark.parametrize(
    'credentials',
    [
        {'username': 'bob', 'password': TEST_PASSWORD},
        {'username': TEST_USERNAME, 'password': 'not the password'},
    ],
    ids=['wrong username', 'wrong password'],
)
def test_wrong_username_and_wrong_password_get_the_same_answer(
    client: TestClient, credentials: dict[str, str]
) -> None:
    create_user()

    response = client.post('/api/auth/login', json=credentials)

    assert response.status_code == 401
    assert response.json() == INVALID_CREDENTIALS
    assert 'set-cookie' not in response.headers
    assert _session_count() == 0


def test_me_without_a_session(client: TestClient) -> None:
    response = client.get('/api/auth/me')

    assert response.status_code == 401
    assert response.json() == SIGN_IN_REQUIRED


def test_me_with_a_session(signed_in_client: TestClient) -> None:
    response = signed_in_client.get('/api/auth/me')

    assert response.status_code == 200
    assert response.json()['data'] == {'username': TEST_USERNAME}


def test_sign_out_deletes_the_session(signed_in_client: TestClient) -> None:
    token = signed_in_client.cookies['session']

    response = signed_in_client.post('/api/auth/logout', json={})

    assert response.status_code == 200
    assert response.json() == {'data': None, 'message': 'Signed out'}
    attributes = _cookie_attributes(response.headers['set-cookie'])
    assert {'max-age=0', 'path=/api'} <= attributes
    assert _session_count() == 0
    assert 'session' not in signed_in_client.cookies
    # The old token no longer works, even if a browser kept it
    response = signed_in_client.get(
        '/api/auth/me', headers={'cookie': f'session={token}'}
    )
    assert response.status_code == 401


def test_sign_out_without_a_session(client: TestClient) -> None:
    response = client.post('/api/auth/logout', json={})

    assert response.status_code == 401
    assert response.json() == SIGN_IN_REQUIRED


def test_an_expired_session_is_rejected(signed_in_client: TestClient) -> None:
    with SessionLocal() as db:
        db.execute(
            update(LoginSession).values(
                expires_at=datetime.now(tz=timezone.utc) - timedelta(seconds=1)
            )
        )
        db.commit()

    response = signed_in_client.get('/api/auth/me')

    assert response.status_code == 401
    assert response.json() == SIGN_IN_REQUIRED


@pytest.mark.parametrize(
    ('path', 'content_type'),
    [
        ('/api/auth/login', 'application/x-www-form-urlencoded'),
        ('/api/auth/login', 'text/plain'),
        ('/api/auth/logout', None),
    ],
)
def test_a_post_without_json_gets_415(
    signed_in_client: TestClient, path: str, content_type: str | None
) -> None:
    headers = {'content-type': content_type} if content_type else {}
    body = f'username={TEST_USERNAME}&password=x' if content_type else None

    response = signed_in_client.post(path, content=body, headers=headers)

    assert response.status_code == 415
    assert response.json() == {
        'error': 'Unsupported media type',
        'message': 'Send the request body as JSON.',
    }


def test_json_with_a_charset_is_accepted(client: TestClient) -> None:
    create_user()

    response = client.post(
        '/api/auth/login',
        content=f'{{"username": "{TEST_USERNAME}", "password": "{TEST_PASSWORD}"}}',
        headers={'content-type': 'application/json; charset=utf-8'},
    )

    assert response.status_code == 200


def test_worker_deletes_expired_sign_ins(signed_in_client: TestClient) -> None:
    bob_id = create_user('bob')
    signed_in_client.post(
        '/api/auth/login', json={'username': 'bob', 'password': TEST_PASSWORD}
    )
    with SessionLocal() as db:
        db.execute(
            update(LoginSession)
            .where(LoginSession.user_account_id != bob_id)
            .values(expires_at=datetime.now(tz=timezone.utc) - timedelta(minutes=1))
        )
        db.commit()

    delete_expired_login_sessions()

    with SessionLocal() as db:
        remaining = db.scalars(select(LoginSession.user_account_id)).all()
    assert remaining == [bob_id]
