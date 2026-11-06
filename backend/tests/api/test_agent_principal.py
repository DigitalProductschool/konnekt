"""The bearer principal and who may call what (spec 007).

First the level table of contracts/management-api.md "Who may call what": every
management endpoint × {no credentials, cookie, read, drafts, manage} → the status
it answers. US1, US3 and US7 add their endpoints to ENDPOINTS. Then the bearer's
own rules (contracts/oauth.md "Bearer access", data-model.md section 4.1): the
tokens that are refused, `last_used_at`, the level read at every call, and that a
bearer is judged alone, never together with a cookie.
"""

import base64
import hashlib
import logging
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Literal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, event, func, select, update

from app.db import SessionLocal, engine
from app.models import AgentAuthorization, AgentToken, FormConnection, LoginSession
from app.schemas import AccessLevel
from app.services.auth import (
    ACCESS_LEVELS,
    insufficient_access,
    level_allows,
)
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, create_user
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    FORM_CONNECTION,
    bearer_client,
    create_agent_authorization,
    create_form_connection,
    main_branch,
    now,
)

BASE = '/api/form-connections'
SIGN_IN_REQUIRED = {'error': 'Unauthorized', 'message': 'Sign in to continue'}
BROWSER_ONLY = {
    'error': 'browser_only',
    'message': 'This action is done in the Connection Portal.',
}
NEEDS_DRAFTS = {
    'error': 'insufficient_access',
    'message': "Changing drafts needs the access level 'Read and edit drafts'.",
    'needs_access_level': 'drafts',
}
NEEDS_MANAGE = {
    'error': 'insufficient_access',
    'message': (
        'Deactivating, reactivating and deleting published connections needs the '
        "access level 'Read, edit drafts and manage live connections'."
    ),
    'needs_access_level': 'manage',
}

# A minimal draft: a name and Standard without rules, in the first step
DRAFT: dict[str, Any] = {
    'name': 'Führerscheinantrag Entwurf',
    'description': '',
    'documents': [],
    'rules': {
        'branches': [main_branch([])],
        'numbering_base': {'rule': 1, 'group': 1},
    },
    'step': 'connection',
}


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _sign_in(client: TestClient) -> str:
    """Create TEST_USERNAME, sign the client in and return the account's id."""
    user_id = create_user()
    response = client.post(
        '/api/auth/login',
        json={'username': TEST_USERNAME, 'password': TEST_PASSWORD},
    )
    assert response.status_code == 200
    return user_id


def _update_authorization(authorization_id: str, **values: Any) -> None:
    with SessionLocal() as db:
        db.execute(
            update(AgentAuthorization)
            .where(AgentAuthorization.id == authorization_id)
            .values(**values)
        )
        db.commit()


def _update_tokens(authorization_id: str, **values: Any) -> None:
    with SessionLocal() as db:
        db.execute(
            update(AgentToken)
            .where(AgentToken.authorization_id == authorization_id)
            .values(**values)
        )
        db.commit()


def _last_used_at(authorization_id: str) -> datetime | None:
    with SessionLocal() as db:
        authorization = db.get(AgentAuthorization, authorization_id)
        assert authorization is not None
        return authorization.last_used_at


def _stored_state() -> list[tuple[Any, ...]]:
    """What a refused call must leave as it was: the connections and sign-ins."""
    with SessionLocal() as db:
        connections = db.execute(
            select(
                FormConnection.id,
                FormConnection.name,
                FormConnection.draft_version,
                FormConnection.published_at,
                FormConnection.current_revision,
                FormConnection.current_rule_set,
                FormConnection.is_active,
                FormConnection.deleted_at,
            ).order_by(FormConnection.id)
        ).all()
        sign_ins = db.scalar(select(func.count()).select_from(LoginSession))
    return [tuple(row) for row in connections] + [('sign-ins', sign_ins)]


# The level table


def _nothing(_client: TestClient) -> str | None:
    return None


def _draft(client: TestClient) -> str | None:
    response = client.post(f'{BASE}/drafts', json=DRAFT)
    assert response.status_code == 201, response.json()
    draft_id: str = response.json()['data']['id']
    return draft_id


def _published(client: TestClient) -> str | None:
    return create_form_connection(client)


def _deactivated(client: TestClient) -> str | None:
    form_connection_id = create_form_connection(client)
    response = client.post(f'{BASE}/{form_connection_id}/deactivate', json={})
    assert response.status_code == 200, response.json()
    return form_connection_id


@dataclass(frozen=True)
class Outcome:
    """What a call answers: its endpoint's success status, or a refusal."""

    status: int | None = None
    body: dict[str, Any] | None = None


SUCCESS = Outcome()
NO_SIGN_IN = Outcome(401, SIGN_IN_REQUIRED)
TOO_LOW = Outcome(403, NEEDS_DRAFTS)
IN_THE_PORTAL = Outcome(403, BROWSER_ONLY)

# The rows of contracts/management-api.md "Who may call what", in the order of
# CALLERS: no credentials, browser session, agent read, drafts, manage
EVERY_LEVEL = (NO_SIGN_IN, SUCCESS, SUCCESS, SUCCESS, SUCCESS)
FROM_DRAFTS = (NO_SIGN_IN, SUCCESS, TOO_LOW, SUCCESS, SUCCESS)
BROWSER_SESSION = (NO_SIGN_IN, SUCCESS, IN_THE_PORTAL, IN_THE_PORTAL, IN_THE_PORTAL)

Caller = Literal['none', 'cookie', 'read', 'drafts', 'manage']
CALLERS: tuple[Caller, ...] = ('none', 'cookie', 'read', 'drafts', 'manage')
BEARER_LEVELS: dict[Caller, AccessLevel] = {
    'read': 'read',
    'drafts': 'drafts',
    'manage': 'manage',
}


@dataclass(frozen=True)
class Endpoint:
    """A management endpoint and who may call it.

    `{id}` in the path is the connection that `setup` creates through the signed-in
    client; `success` is the status a permitted call answers.
    """

    method: str
    path: str
    access: tuple[Outcome, Outcome, Outcome, Outcome, Outcome]
    setup: Callable[[TestClient], str | None] = _nothing
    body: dict[str, Any] | None = None
    success: int = 200

    def __str__(self) -> str:
        return f'{self.method} {self.path}'

    def url(self, form_connection_id: str | None) -> str:
        return self.path.replace('{id}', form_connection_id or '')


ENDPOINTS = [
    Endpoint('GET', BASE, EVERY_LEVEL),
    Endpoint('GET', f'{BASE}/{{id}}', EVERY_LEVEL, setup=_published),
    Endpoint('GET', '/api/document-types', EVERY_LEVEL),
    Endpoint('GET', '/api/option-sets', EVERY_LEVEL),
    Endpoint('POST', f'{BASE}/drafts', FROM_DRAFTS, body=DRAFT, success=201),
    Endpoint(
        'PUT',
        f'{BASE}/{{id}}/draft',
        FROM_DRAFTS,
        setup=_draft,
        body=DRAFT | {'version': 1},
    ),
    Endpoint('POST', BASE, BROWSER_SESSION, body=FORM_CONNECTION, success=201),
    Endpoint(
        'PUT',
        f'{BASE}/{{id}}',
        BROWSER_SESSION,
        setup=_published,
        body={'name': 'Renamed'},
    ),
    Endpoint(
        'POST',
        f'{BASE}/{{id}}/publish',
        BROWSER_SESSION,
        setup=_draft,
        body=FORM_CONNECTION | {'version': 1},
    ),
    Endpoint('DELETE', f'{BASE}/{{id}}/draft', BROWSER_SESSION, setup=_draft, body={}),
    Endpoint(
        'POST',
        f'{BASE}/{{id}}/deactivate',
        BROWSER_SESSION,
        setup=_published,
        body={},
    ),
    Endpoint(
        'POST',
        f'{BASE}/{{id}}/activate',
        BROWSER_SESSION,
        setup=_deactivated,
        body={},
    ),
    Endpoint('DELETE', f'{BASE}/{{id}}', BROWSER_SESSION, setup=_published, body={}),
    Endpoint('GET', '/api/auth/me', BROWSER_SESSION),
    Endpoint('POST', '/api/auth/logout', BROWSER_SESSION, body={}),
]


def _call_as(client: TestClient, user_id: str, caller: Caller) -> None:
    """Make the signed-in client call as `caller`: a bearer has no cookie."""
    if caller != 'cookie':
        client.cookies.clear()
    level = BEARER_LEVELS.get(caller)
    if level is not None:
        bearer_client(client, create_agent_authorization(user_id, level)[1])


@pytest.mark.parametrize('caller', CALLERS)
@pytest.mark.parametrize('endpoint', ENDPOINTS, ids=str)
def test_who_may_call_what(
    client: TestClient,
    fake_eudiplo: FakeEudiplo,
    endpoint: Endpoint,
    caller: Caller,
) -> None:
    user_id = _sign_in(client)
    form_connection_id = endpoint.setup(client)
    _call_as(client, user_id, caller)
    before = _stored_state()

    response = client.request(
        endpoint.method, endpoint.url(form_connection_id), json=endpoint.body
    )

    outcome = endpoint.access[CALLERS.index(caller)]
    if outcome is SUCCESS:
        assert response.status_code == endpoint.success, response.json()
    else:
        assert response.status_code == outcome.status
        assert response.json() == outcome.body
        # Refused before any work
        assert _stored_state() == before


def test_an_agent_connections_access_token_is_a_bearer_too(
    client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    user_id = create_user()
    _, token = create_agent_authorization(user_id, 'drafts', kind='oauth')
    bearer_client(client, token)

    created = client.post(f'{BASE}/drafts', json=DRAFT)
    assert created.status_code == 201, created.json()
    draft_id = created.json()['data']['id']
    assert client.get(f'{BASE}/{draft_id}').status_code == 200
    published = client.post(
        f'{BASE}/{draft_id}/publish', json=FORM_CONNECTION | {'version': 1}
    )
    assert published.status_code == 403
    assert published.json() == BROWSER_ONLY


# Tokens that aren't current


def _unknown(user_id: str) -> str:
    create_agent_authorization(user_id, 'manage')
    return f'cp_pat_{"x" * 43}'


def _expired_access_token(user_id: str) -> str:
    authorization_id, token = create_agent_authorization(
        user_id, 'manage', kind='oauth'
    )
    _update_tokens(authorization_id, expires_at=now() - timedelta(seconds=1))
    return token


def _expired_personal_token(user_id: str) -> str:
    authorization_id, token = create_agent_authorization(user_id, 'manage')
    _update_tokens(authorization_id, expires_at=now() - timedelta(seconds=1))
    return token


def _refresh_token(user_id: str) -> str:
    """A current refresh token of a connection whose access token works."""
    authorization_id, _ = create_agent_authorization(user_id, 'manage', kind='oauth')
    token = f'cp_rt_{"r" * 43}'
    with SessionLocal() as db:
        db.add(
            AgentToken(
                authorization_id=authorization_id,
                kind='refresh',
                token_hash=_hash(token),
                expires_at=now() + timedelta(days=30),
            )
        )
        db.commit()
    return token


def _past_its_authorizations_expiry(user_id: str) -> str:
    """A personal access token whose own row is still ahead of its expiry."""
    authorization_id, token = create_agent_authorization(user_id, 'manage')
    _update_authorization(authorization_id, expires_at=now() - timedelta(seconds=1))
    return token


def _personal_without_expiry(user_id: str) -> str:
    authorization_id, token = create_agent_authorization(user_id, 'manage')
    _update_authorization(authorization_id, expires_at=None)
    return token


def _revoked(user_id: str) -> str:
    authorization_id, token = create_agent_authorization(
        user_id, 'manage', kind='oauth'
    )
    with SessionLocal() as db:
        db.execute(
            delete(AgentAuthorization).where(AgentAuthorization.id == authorization_id)
        )
        db.commit()
    return token


def _unknown_level(user_id: str) -> str:
    authorization_id, token = create_agent_authorization(user_id, 'manage')
    _update_authorization(authorization_id, access_level='admin')
    return token


def _no_token(user_id: str) -> str:
    create_agent_authorization(user_id, 'manage')
    return ''


@pytest.mark.parametrize('with_cookie', [False, True], ids=['alone', 'beside a cookie'])
@pytest.mark.parametrize(
    'token_of',
    [
        _unknown,
        _expired_access_token,
        _expired_personal_token,
        _refresh_token,
        _past_its_authorizations_expiry,
        _personal_without_expiry,
        _revoked,
        _unknown_level,
        _no_token,
    ],
)
def test_a_bearer_that_isnt_current_answers_401(
    client: TestClient,
    token_of: Callable[[str], str],
    with_cookie: bool,
) -> None:
    user_id = _sign_in(client)
    token = token_of(user_id)
    if not with_cookie:
        client.cookies.clear()
    bearer_client(client, token)
    before = _stored_state()

    for method, path, body in [
        ('GET', BASE, None),
        ('POST', f'{BASE}/drafts', DRAFT),
        ('GET', '/api/auth/me', None),
    ]:
        response = client.request(method, path, json=body)

        assert response.status_code == 401, path
        assert response.json() == SIGN_IN_REQUIRED
    assert _stored_state() == before
    with SessionLocal() as db:
        last_uses = db.scalars(select(AgentAuthorization.last_used_at)).all()
    assert all(last_use is None for last_use in last_uses)


# The bearer's rules


@contextmanager
def _agent_authorization_updates() -> Iterator[list[str]]:
    """Collect the UPDATE statements on agent_authorizations sent meanwhile."""
    statements: list[str] = []

    def collect(
        _connection: Any,
        _cursor: Any,
        statement: str,
        _parameters: Any,
        _context: Any,
        _executemany: bool,
    ) -> None:
        if statement.lstrip().upper().startswith('UPDATE AGENT_AUTHORIZATIONS'):
            statements.append(statement)

    event.listen(engine, 'before_cursor_execute', collect)
    try:
        yield statements
    finally:
        event.remove(engine, 'before_cursor_execute', collect)


def test_last_used_at_is_written_at_most_once_a_minute(client: TestClient) -> None:
    user_id = create_user()
    authorization_id, token = create_agent_authorization(user_id, 'drafts')
    bearer_client(client, token)
    assert _last_used_at(authorization_id) is None

    called_at = now()
    with _agent_authorization_updates() as updates:
        created = client.post(f'{BASE}/drafts', json=DRAFT)

    # The request's own work is saved beside the one UPDATE
    assert created.status_code == 201, created.json()
    first_use = _last_used_at(authorization_id)
    assert first_use is not None
    assert called_at <= first_use <= now()
    assert len(updates) == 1

    with _agent_authorization_updates() as updates:
        listed = client.get(BASE)

    assert [item['id'] for item in listed.json()['data']] == [
        created.json()['data']['id']
    ]
    assert _last_used_at(authorization_id) == first_use
    assert updates == []

    # Once the last use is more than a minute ago, the next call writes it again
    earlier = now() - timedelta(minutes=1, seconds=1)
    _update_authorization(authorization_id, last_used_at=earlier)
    with _agent_authorization_updates() as updates:
        assert client.get(BASE).status_code == 200

    last_use = _last_used_at(authorization_id)
    assert last_use is not None
    assert last_use > earlier + timedelta(minutes=1)
    assert len(updates) == 1


def test_the_level_is_read_at_every_call(
    client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    user_id = create_user()
    authorization_id, token = create_agent_authorization(user_id, 'read')
    bearer_client(client, token)

    refused = client.post(f'{BASE}/drafts', json=DRAFT)
    assert refused.status_code == 403
    assert refused.json() == NEEDS_DRAFTS

    _update_authorization(authorization_id, access_level='drafts')
    created = client.post(f'{BASE}/drafts', json=DRAFT)
    assert created.status_code == 201, created.json()
    draft_id = created.json()['data']['id']

    _update_authorization(authorization_id, access_level='read')
    saved = client.put(f'{BASE}/{draft_id}/draft', json=DRAFT | {'version': 1})
    assert saved.status_code == 403
    assert saved.json() == NEEDS_DRAFTS

    # No level reaches what is done in the Connection Portal
    _update_authorization(authorization_id, access_level='manage')
    deleted = client.request('DELETE', f'{BASE}/{draft_id}/draft', json={})
    assert deleted.status_code == 403
    assert deleted.json() == BROWSER_ONLY


def test_a_bearer_beside_a_cookie_is_judged_alone(
    client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The cookie would allow everything; the agent's level decides."""
    user_id = _sign_in(client)
    form_connection_id = create_form_connection(client)
    _, read_token = create_agent_authorization(user_id, 'read')
    _, manage_token = create_agent_authorization(user_id, 'manage', kind='oauth')
    before = _stored_state()

    bearer_client(client, read_token)
    response = client.post(f'{BASE}/drafts', json=DRAFT)
    assert response.status_code == 403
    assert response.json() == NEEDS_DRAFTS

    bearer_client(client, manage_token)
    for method, path in [
        ('POST', f'{BASE}/{form_connection_id}/deactivate'),
        ('DELETE', f'{BASE}/{form_connection_id}'),
        ('POST', '/api/auth/logout'),
    ]:
        response = client.request(method, path, json={})
        assert response.status_code == 403, path
        assert response.json() == BROWSER_ONLY
    response = client.get('/api/auth/me')
    assert response.status_code == 403
    assert response.json() == BROWSER_ONLY
    assert _stored_state() == before

    # Without the bearer, the cookie session works as before
    del client.headers['Authorization']
    assert client.get('/api/auth/me').status_code == 200


def test_the_bearer_scheme_ignores_letter_case(client: TestClient) -> None:
    user_id = create_user()
    _, token = create_agent_authorization(user_id, 'read')

    response = client.get(BASE, headers={'Authorization': f'bearer  {token} '})

    assert response.status_code == 200


def test_another_authorization_scheme_leaves_the_cookie_to_decide(
    client: TestClient,
) -> None:
    """A proxy's basic authentication doesn't sign the team member out."""
    _sign_in(client)
    credentials = base64.b64encode(b'preview:secret').decode()
    client.headers['Authorization'] = f'Basic {credentials}'

    assert client.get('/api/auth/me').status_code == 200
    client.cookies.clear()
    response = client.get(BASE)
    assert response.status_code == 401
    assert response.json() == SIGN_IN_REQUIRED


def test_tokens_are_never_logged(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    user_id = create_user()
    _, token = create_agent_authorization(user_id, 'read')
    unknown = f'cp_at_{"u" * 43}'

    bearer_client(client, token)
    assert client.get(BASE).status_code == 200
    assert client.post(f'{BASE}/drafts', json=DRAFT).status_code == 403
    assert client.get('/api/auth/me').status_code == 403
    caplog.clear()
    bearer_client(client, unknown)
    assert client.get(BASE).status_code == 401

    # A refused bearer leaves nothing in the app's log
    assert [
        record.getMessage()
        for record in caplog.records
        if record.name == 'app' or record.name.startswith('app.')
    ] == []
    for secret in (token, _hash(token), unknown, _hash(unknown)):
        assert secret not in caplog.text


# The levels


def test_the_levels_in_order() -> None:
    assert [(info.level, info.name) for info in ACCESS_LEVELS] == [
        ('read', 'Read only'),
        ('drafts', 'Read and edit drafts'),
        ('manage', 'Read, edit drafts and manage live connections'),
    ]
    assert ACCESS_LEVELS[0].allows == (
        'Find and read connections, variants and rules, run the rule checks and '
        'test fictitious applicants. Nothing changes.'
    )


@pytest.mark.parametrize(
    ('have', 'need', 'allowed'),
    [
        ('read', 'read', True),
        ('read', 'drafts', False),
        ('read', 'manage', False),
        ('drafts', 'read', True),
        ('drafts', 'drafts', True),
        ('drafts', 'manage', False),
        ('manage', 'read', True),
        ('manage', 'drafts', True),
        ('manage', 'manage', True),
        ('admin', 'read', False),
        ('', 'read', False),
    ],
)
def test_level_allows(have: str, need: AccessLevel, allowed: bool) -> None:
    assert level_allows(have, need) is allowed


def test_the_manage_refusal_names_its_level() -> None:
    refusal = insufficient_access('manage')

    assert refusal.status_code == 403
    assert refusal.detail == NEEDS_MANAGE
