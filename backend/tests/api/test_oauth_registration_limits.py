"""Bounded dynamic client registration (spec 012, research R6, finding 5).

Every field of a registration body has a bound, and a body beyond one is refused
with RFC 7591's `invalid_client_metadata`; the registrations of the agents the
team uses still work; and at most OAUTH_MAX_UNUSED_REGISTRATIONS registrations that
nothing uses are kept: a new one removes the oldest unused ones, never one that an
agent connection or an authorization code uses, and parallel registrations take
turns so that they never pass the cap together. nginx's body and rate limits for
/api/oauth/ are checked on its container, not here.
"""

import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from typing import Any
from urllib.parse import quote

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from httpx2 import Response
from sqlalchemy import delete, func, select, text

from app.config import settings
from app.db import SessionLocal
from app.models import AgentAuthorization, OauthClient, OauthCode, UserAccount
from app.schemas import (
    CLIENT_NAME_INPUT_MAX_LENGTH,
    REDIRECT_URI_MAX_LENGTH,
    REDIRECT_URIS_MAX,
    REGISTRATION_VALUE_MAX_LENGTH,
    REGISTRATION_VALUES_MAX,
    AuthorizeRequest,
    RegisterRequest,
)
from app.services import oauth
from tests.conftest import create_user
from tests.helpers import now

# RFC 7636, appendix B
CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
REDIRECT_URI = 'http://127.0.0.1/callback'
CAP = 3

# Registrations shaped as the agents' clients send them (their exact bodies change
# between versions): one loopback redirect URI, a web callback, an app's own
# scheme, and VS Code's six URIs with a third grant type and fields Konnekt
# doesn't read
CLIENT_REGISTRATIONS: dict[str, dict[str, Any]] = {
    'Claude Code': {
        'client_name': 'Claude Code (konnekt)',
        'redirect_uris': ['http://localhost:53682/callback'],
        'grant_types': ['authorization_code', 'refresh_token'],
        'response_types': ['code'],
        'token_endpoint_auth_method': 'none',
    },
    'Claude': {
        'client_name': 'Claude',
        'redirect_uris': ['https://claude.ai/api/mcp/auth_callback'],
        'grant_types': ['authorization_code', 'refresh_token'],
        'response_types': ['code'],
        'token_endpoint_auth_method': 'none',
    },
    'VS Code': {
        'client_name': 'Visual Studio Code',
        'client_uri': 'https://code.visualstudio.com',
        'grant_types': [
            'authorization_code',
            'refresh_token',
            'urn:ietf:params:oauth:grant-type:device_code',
        ],
        'response_types': ['code'],
        'redirect_uris': [
            'https://insiders.vscode.dev/redirect',
            'https://vscode.dev/redirect',
            'http://localhost/',
            'http://127.0.0.1/',
            'http://localhost:33418/',
            'http://127.0.0.1:33418/',
        ],
        'scope': 'read drafts manage',
        'token_endpoint_auth_method': 'none',
        'application_type': 'native',
    },
    'MCP Inspector': {
        'client_name': 'MCP Inspector',
        'client_uri': 'https://github.com/modelcontextprotocol/inspector',
        'redirect_uris': [
            'http://localhost:6274/oauth/callback',
            'http://localhost:6274/oauth/callback/debug',
        ],
        'grant_types': ['authorization_code', 'refresh_token'],
        'response_types': ['code'],
        'token_endpoint_auth_method': 'none',
        'scope': 'read',
    },
    'Cursor': {
        'client_name': 'Cursor',
        'redirect_uris': [
            'cursor://anysphere.cursor-retrieval/oauth/user-konnekt/callback'
        ],
        'grant_types': ['authorization_code', 'refresh_token'],
        'response_types': ['code'],
        'token_endpoint_auth_method': 'none',
    },
}


# Helpers


def _register(client: TestClient, **changes: Any) -> Response:
    body: dict[str, Any] = {
        'client_name': 'Claude Code',
        'redirect_uris': [REDIRECT_URI],
        'token_endpoint_auth_method': 'none',
        'grant_types': ['authorization_code', 'refresh_token'],
        'response_types': ['code'],
    }
    return client.post('/api/oauth/register', json=body | changes)


def _registered(client: TestClient, **changes: Any) -> str:
    """Register and return the new client's row id."""
    response = _register(client, **changes)
    assert response.status_code == 201, response.json()
    with SessionLocal() as db:
        row_id = db.scalar(
            select(OauthClient.id).where(
                OauthClient.client_id == response.json()['client_id']
            )
        )
    assert row_id is not None
    return row_id


def _refused(response: Response, field: str) -> None:
    assert response.status_code == 400, response.json()
    assert response.json() == {
        'error': 'invalid_client_metadata',
        'error_description': oauth.REGISTRATION_FIELD_RULES[field],
    }


def _uri(length: int, number: int = 0) -> str:
    """An https:// redirect URI of exactly `length` characters."""
    start = f'https://agent.example/{number}/'
    return start + 'a' * (length - len(start))


def _insert_client(
    age: timedelta,
    kind: str = 'dcr',
    name: str = 'Agent',
    redirect_uri: str = REDIRECT_URI,
) -> str:
    """A client registered `age` ago; its row id."""
    with SessionLocal() as db:
        client = OauthClient(
            client_id=(
                oauth.new_dcr_client_id()
                if kind == 'dcr'
                else f'https://{oauth.new_secret()[:10]}.example/meta.json'
            ),
            kind=kind,
            client_name=name,
            redirect_uris=[redirect_uri],
            created_at=now() - age,
        )
        db.add(client)
        db.commit()
        return client.id


def _unused_clients(count: int, oldest: timedelta = timedelta(minutes=30)) -> list[str]:
    """`count` unused registrations, oldest first, a minute apart."""
    return [
        _insert_client(oldest - timedelta(minutes=number)) for number in range(count)
    ]


def _mcp_url() -> str:
    assert settings.mcp_url is not None
    return settings.mcp_url


def _code(client_row_id: str, user_id: str) -> OauthCode:
    return OauthCode(
        code_hash=oauth.token_hash(oauth.new_secret()),
        client_id=client_row_id,
        user_account_id=user_id,
        redirect_uri=REDIRECT_URI,
        code_challenge=CHALLENGE,
        access_level='read',
        resource=_mcp_url(),
        expires_at=now() + timedelta(minutes=5),
    )


def _ids() -> set[str]:
    with SessionLocal() as db:
        return set(db.scalars(select(OauthClient.id)).all())


def _count() -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(OauthClient)) or 0


def _register_in_session() -> str:
    """Register through the service in a session of its own; the client_id."""
    with SessionLocal() as db:
        return oauth.register_client(
            db,
            RegisterRequest(client_name='Agent', redirect_uris=[REDIRECT_URI]),
        ).client_id


def _wait_until(condition: Callable[[], bool], seconds: float = 10.0) -> None:
    deadline = time.monotonic() + seconds
    while not condition():
        assert time.monotonic() < deadline, 'timed out'
        time.sleep(0.02)


def _someone_waits_for_a_lock() -> bool:
    with SessionLocal() as db:
        waiting = db.scalar(
            text(
                'SELECT count(*) FROM pg_stat_activity '
                "WHERE datname = current_database() AND wait_event_type = 'Lock'"
            )
        )
    return bool(waiting)


@pytest.fixture
def cap(monkeypatch: pytest.MonkeyPatch) -> int:
    """A cap of CAP unused registrations."""
    monkeypatch.setattr(settings, 'oauth_max_unused_registrations', CAP)
    return CAP


# The registration's bounds


@pytest.mark.parametrize('name', CLIENT_REGISTRATIONS)
def test_the_agents_clients_register(client: TestClient, name: str) -> None:
    registration = CLIENT_REGISTRATIONS[name]

    response = client.post('/api/oauth/register', json=registration)

    assert response.status_code == 201, response.json()
    body = response.json()
    assert body['client_name'] == registration['client_name']
    assert body['redirect_uris'] == registration['redirect_uris']
    with SessionLocal() as db:
        stored = db.scalars(select(OauthClient)).one()
    assert stored.client_name == registration['client_name']
    assert stored.redirect_uris == registration['redirect_uris']


def test_a_registration_at_every_bound_registers(client: TestClient) -> None:
    redirect_uris = [
        _uri(REDIRECT_URI_MAX_LENGTH, number) for number in range(REDIRECT_URIS_MAX)
    ]
    values = ['v' * REGISTRATION_VALUE_MAX_LENGTH] * REGISTRATION_VALUES_MAX

    response = _register(
        client,
        client_name='n' * CLIENT_NAME_INPUT_MAX_LENGTH,
        redirect_uris=redirect_uris,
        grant_types=values,
        response_types=values,
    )

    assert response.status_code == 201, response.json()
    # A long name is still cut to 200 characters, as before the bound
    assert response.json()['client_name'] == 'n' * oauth.CLIENT_NAME_MAX_LENGTH
    assert response.json()['redirect_uris'] == redirect_uris


@pytest.mark.parametrize(
    ('changes', 'field'),
    [
        (
            {
                'redirect_uris': [
                    f'http://127.0.0.1/{number}'
                    for number in range(REDIRECT_URIS_MAX + 1)
                ]
            },
            'redirect_uris',
        ),
        ({'redirect_uris': [_uri(REDIRECT_URI_MAX_LENGTH + 1)]}, 'redirect_uris'),
        (
            {'redirect_uris': [REDIRECT_URI, _uri(REDIRECT_URI_MAX_LENGTH + 1)]},
            'redirect_uris',
        ),
        ({'client_name': 'n' * (CLIENT_NAME_INPUT_MAX_LENGTH + 1)}, 'client_name'),
        (
            {'token_endpoint_auth_method': 'n' * (REGISTRATION_VALUE_MAX_LENGTH + 1)},
            'token_endpoint_auth_method',
        ),
        (
            {'grant_types': ['authorization_code'] * (REGISTRATION_VALUES_MAX + 1)},
            'grant_types',
        ),
        (
            {'grant_types': ['g' * (REGISTRATION_VALUE_MAX_LENGTH + 1)]},
            'grant_types',
        ),
        (
            {'response_types': ['code'] * (REGISTRATION_VALUES_MAX + 1)},
            'response_types',
        ),
        (
            {'response_types': ['r' * (REGISTRATION_VALUE_MAX_LENGTH + 1)]},
            'response_types',
        ),
    ],
)
def test_a_registration_beyond_a_bound_is_refused(
    client: TestClient, changes: dict[str, Any], field: str
) -> None:
    response = _register(client, **changes)

    _refused(response, field)
    assert _count() == 0


def test_the_descriptions_stay_english() -> None:
    # RFC bodies are English whatever the request's language (spec 009)
    descriptions = [*oauth.REGISTRATION_FIELD_RULES.values(), oauth.REGISTRATION_NEEDS]
    for description in descriptions:
        assert type(description) is str
        assert description.isascii(), description


def test_a_missing_field_is_described(client: TestClient) -> None:
    response = client.post(
        '/api/oauth/register', json={'redirect_uris': [REDIRECT_URI]}
    )

    _refused(response, 'client_name')


def test_unknown_fields_are_not_stored(client: TestClient) -> None:
    # nginx bounds the body of /api/oauth/ (frontend/nginx.conf); the backend
    # ignores what it doesn't know, so nothing of it is kept
    response = _register(
        client,
        logo_uri='https://agent.example/' + 'l' * 5000,
        software_statement='s' * 5000,
        contacts=['c' * 5000],
    )

    assert response.status_code == 201, response.json()
    assert 'logo_uri' not in response.json()
    with SessionLocal() as db:
        stored = db.scalars(select(OauthClient)).one()
    assert stored.client_name == 'Claude Code'
    assert stored.redirect_uris == [REDIRECT_URI]


# The cap on unused registrations


def test_below_the_cap_nothing_is_removed(client: TestClient, cap: int) -> None:
    unused = _unused_clients(cap - 1)

    new = _registered(client)

    assert _ids() == {*unused, new}


def test_a_registration_at_the_cap_removes_the_oldest_unused_one(
    client: TestClient, cap: int
) -> None:
    oldest, *others = _unused_clients(cap)

    new = _registered(client)

    assert _ids() == {*others, new}
    assert oldest not in _ids()


def test_used_registrations_are_never_removed(client: TestClient, cap: int) -> None:
    user_id = create_user()
    # Older than every unused one
    with_connection = _insert_client(timedelta(hours=3))
    with_code = _insert_client(timedelta(hours=2))
    metadata_document = _insert_client(timedelta(hours=4), kind='cimd')
    with SessionLocal() as db:
        db.add(
            AgentAuthorization(
                user_account_id=user_id,
                kind='oauth',
                client_id=with_connection,
                name='',
                access_level='read',
            )
        )
        db.add(_code(with_code, user_id))
        db.commit()
    oldest_unused, *unused = _unused_clients(cap)

    new = _registered(client)

    assert _ids() == {with_connection, with_code, metadata_document, *unused, new}
    assert oldest_unused not in _ids()


def test_a_lower_cap_removes_every_unused_registration_beyond_it(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    *older, newest = _unused_clients(5)
    monkeypatch.setattr(settings, 'oauth_max_unused_registrations', 2)

    new = _registered(client)

    assert _ids() == {newest, new}
    assert not set(older) & _ids()


def test_a_cap_of_one_keeps_the_new_registration(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, 'oauth_max_unused_registrations', 1)
    first = _registered(client)

    second = _registered(client)

    assert _ids() == {second}
    assert first not in _ids()


def test_a_removed_registration_is_an_unknown_client(
    signed_in_client: TestClient, cap: int
) -> None:
    response = _register(signed_in_client)
    removed = response.json()['client_id']
    for _ in range(cap):
        _registered(signed_in_client)

    consent = signed_in_client.post(
        '/api/oauth/authorize',
        json={
            'client_id': removed,
            'redirect_uri': REDIRECT_URI,
            'code_challenge': CHALLENGE,
            'code_challenge_method': 'S256',
            'state': 'state-1234',
            'scope': 'read',
            'resource': _mcp_url(),
            'decision': 'allow',
        },
    )
    shown = signed_in_client.get(f'/api/oauth/clients/{quote(removed, safe="")}')

    assert consent.status_code == 400
    assert consent.json() == {
        'error': 'invalid_request',
        'message': oauth.CLIENT_UNKNOWN.en,
    }
    assert shown.status_code == 404
    assert shown.json()['error'] == 'invalid_client'


def test_a_removal_logs_ids_only(
    client: TestClient, cap: int, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level('INFO')
    oldest = _insert_client(
        timedelta(hours=1),
        name='Oldest Agent Name',
        redirect_uri='https://oldest-agent.example/callback',
    )
    _unused_clients(cap - 1)

    new = _registered(
        client,
        client_name='Newest Agent Name',
        redirect_uris=['https://newest-agent.example/callback'],
    )

    messages = [record.getMessage() for record in caplog.records]
    assert f'OAuth client {new} registered' in messages
    assert f'Unused OAuth client {oldest} removed for a new registration' in messages
    for private in ('Agent Name', 'oldest-agent.example', 'newest-agent.example'):
        assert private not in caplog.text


# Parallel registrations and consents


def test_parallel_registrations_never_pass_the_cap(cap: int) -> None:
    """Eight registrations at once with the cap full: they take turns, so each one
    removes the oldest unused registration and the cap holds exactly."""
    old = set(_unused_clients(cap))
    parallel = 8
    barrier = threading.Barrier(parallel)

    def one_registration(_: int) -> str:
        barrier.wait()
        return _register_in_session()

    with ThreadPoolExecutor(max_workers=parallel) as pool:
        registered = set(pool.map(one_registration, range(parallel)))

    assert len(registered) == parallel
    with SessionLocal() as db:
        remaining = set(db.scalars(select(OauthClient.client_id)).all())
    assert len(remaining) == cap
    # The old ones went first, then the earlier of the new ones
    assert remaining <= registered
    assert not old & _ids()


def test_a_registration_skips_a_client_whose_consent_is_being_stored(
    cap: int,
) -> None:
    """A consent storing its code holds its client's row (the code's foreign key): a
    registration at the cap neither waits for it nor removes the client, which is
    used once the code is stored."""
    user_id = create_user()
    pending, *others = _unused_clients(cap)
    consent = SessionLocal()
    pool = ThreadPoolExecutor(max_workers=1)
    try:
        consent.add(_code(pending, user_id))
        consent.flush()
        registration = pool.submit(_register_in_session)
        try:
            client_id = registration.result(timeout=10)
        finally:
            consent.commit()
    finally:
        consent.close()
        pool.shutdown()

    with SessionLocal() as db:
        new = db.scalar(
            select(OauthClient.id).where(OauthClient.client_id == client_id)
        )
    assert _ids() == {pending, *others, new}


def test_a_consent_for_a_client_being_removed_answers_unknown_client() -> None:
    """A consent that reaches its client while a removal holds the row waits for it,
    and then answers 400 invalid_request "The client is unknown." instead of
    failing on the code's foreign key."""
    user_id = create_user()
    target = _insert_client(timedelta(hours=2))
    with SessionLocal() as db:
        client_id = db.scalars(
            select(OauthClient.client_id).where(OauthClient.id == target)
        ).one()
    request = AuthorizeRequest(
        client_id=client_id,
        redirect_uri=REDIRECT_URI,
        code_challenge=CHALLENGE,
        code_challenge_method='S256',
        state='state-1234',
        scope='read',
        resource=_mcp_url(),
        decision='allow',
    )

    def one_consent() -> int:
        with SessionLocal() as db:
            user = db.get(UserAccount, user_id)
            assert user is not None
            try:
                oauth.create_code(db, user, request)
            except HTTPException as error:
                assert error.detail == {
                    'error': 'invalid_request',
                    'message': oauth.CLIENT_UNKNOWN,
                }
                return error.status_code
            return 200

    removal = SessionLocal()
    pool = ThreadPoolExecutor(max_workers=1)
    try:
        removal.scalars(
            select(OauthClient.id).where(OauthClient.id == target).with_for_update()
        ).all()
        consent = pool.submit(one_consent)
        try:
            _wait_until(_someone_waits_for_a_lock)
            removal.execute(delete(OauthClient).where(OauthClient.id == target))
        finally:
            removal.commit()
        assert consent.result(timeout=10) == 400
    finally:
        removal.close()
        pool.shutdown()

    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(OauthCode)) == 0
