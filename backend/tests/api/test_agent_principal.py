"""The bearer principal and who may call what (spec 007).

First the level table of contracts/management-api.md "Who may call what": every
management endpoint × {no credentials, cookie, read, drafts, manage} → the status
it answers. US1, US3 and US7 add their endpoints to ENDPOINTS, and spec 010 the
start date's (`PUT …/start-date` and asking for `set_start_date`); US3's approval
requests are the bearer's own, so the request is made once the caller is known.
Then the bearer's own rules (contracts/oauth.md "Bearer access", data-model.md
section 4.1): the tokens that are refused, `last_used_at`, the level read at every
call, and that a bearer is judged alone, never together with a cookie.
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
from app.language import resolve_text
from app.models import (
    AgentAuthorization,
    AgentToken,
    ApprovalRequest,
    FormConnection,
    LoginSession,
    UserAccount,
)
from app.schemas import AccessLevel
from app.services import start_dates
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
    'message': 'This action is done in Konnekt.',
}
NEEDS_DRAFTS = {
    'error': 'insufficient_access',
    'message': "Changing drafts needs the access level 'Read and edit drafts'.",
    'needs_access_level': 'drafts',
}
BEARER_ONLY = {'error': 'bearer_only', 'message': 'This endpoint is for agents.'}
NEEDS_MANAGE = {
    'error': 'insufficient_access',
    'message': (
        'Deactivating, reactivating and deleting published connections needs the '
        "access level 'Read, edit drafts and manage live connections'."
    ),
    'needs_access_level': 'manage',
}

# A day after today in Germany, for the bodies that take a start date (spec 010)
START_DATE = (start_dates.today_in_germany() + timedelta(days=30)).isoformat()

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
    """What a refused call must leave as it was.

    The connections, the agents' access with its levels and tokens, and the
    sign-ins.
    """
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
        authorizations = db.execute(
            select(
                AgentAuthorization.id,
                AgentAuthorization.access_level,
                AgentAuthorization.expires_at,
            ).order_by(AgentAuthorization.id)
        ).all()
        tokens = db.scalar(select(func.count()).select_from(AgentToken))
        sign_ins = db.scalar(select(func.count()).select_from(LoginSession))
        approvals = db.execute(
            select(
                ApprovalRequest.id,
                ApprovalRequest.status,
                ApprovalRequest.decided_at,
                ApprovalRequest.failed_at,
            ).order_by(ApprovalRequest.id)
        ).all()
    return (
        [tuple(row) for row in connections]
        + [tuple(row) for row in authorizations]
        + [('tokens', tokens), ('sign-ins', sign_ins)]
        + [tuple(row) for row in approvals]
    )


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


def _agent_connection(_client: TestClient) -> str | None:
    """An agent connection of the signed-in account, for the user page's calls."""
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
    assert user_id is not None
    return create_agent_authorization(user_id, 'drafts', kind='oauth')[0]


def _publishable_draft(client: TestClient) -> str | None:
    """A draft that publishing accepts, for approval requests to name."""
    response = client.post(
        f'{BASE}/drafts',
        json=DRAFT | {'documents': FORM_CONNECTION['documents']},
    )
    assert response.status_code == 201, response.json()
    draft_id: str = response.json()['data']['id']
    return draft_id


def _approval_request(draft_id: str | None, authorization_id: str | None) -> str:
    """A waiting request to publish the draft, made by the bearer that calls.

    For the callers without a bearer, by another agent of the signed-in account.
    """
    assert draft_id is not None
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
    assert user_id is not None
    if authorization_id is None:
        authorization_id = create_agent_authorization(user_id, 'drafts')[0]
    with SessionLocal() as db:
        request = ApprovalRequest(
            form_connection_id=draft_id,
            action='publish',
            authorization_id=authorization_id,
            requested_by='test',
            user_account_id=user_id,
            draft_version=1,
            status='waiting',
            expires_at=now() + timedelta(minutes=10),
        )
        db.add(request)
        db.commit()
        return request.id


def _status_request(
    form_connection_id: str | None, authorization_id: str | None
) -> str:
    """A waiting request to deactivate the live connection, made by the bearer
    that calls (user story 7).

    For the callers without a bearer, by another agent of the signed-in account.
    """
    assert form_connection_id is not None
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
    assert user_id is not None
    if authorization_id is None:
        authorization_id = create_agent_authorization(user_id, 'manage')[0]
    with SessionLocal() as db:
        request = ApprovalRequest(
            form_connection_id=form_connection_id,
            action='deactivate',
            authorization_id=authorization_id,
            requested_by='test',
            user_account_id=user_id,
            was_active=True,
            status='waiting',
            expires_at=now() + timedelta(minutes=10),
        )
        db.add(request)
        db.commit()
        return request.id


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
TOO_LOW_TO_MANAGE = Outcome(403, NEEDS_MANAGE)
IN_THE_PORTAL = Outcome(403, BROWSER_ONLY)
FOR_AGENTS = Outcome(403, BEARER_ONLY)

# The rows of contracts/management-api.md "Who may call what", in the order of
# CALLERS: no credentials, browser session, agent read, drafts, manage
EVERY_LEVEL = (NO_SIGN_IN, SUCCESS, SUCCESS, SUCCESS, SUCCESS)
FROM_DRAFTS = (NO_SIGN_IN, SUCCESS, TOO_LOW, SUCCESS, SUCCESS)
BROWSER_SESSION = (NO_SIGN_IN, SUCCESS, IN_THE_PORTAL, IN_THE_PORTAL, IN_THE_PORTAL)
AGENTS_ONLY = (NO_SIGN_IN, FOR_AGENTS, SUCCESS, SUCCESS, SUCCESS)
# Asking for approval: agents from 'drafts' on; a browser session answers
# browser_only (contracts/management-api.md)
AGENTS_FROM_DRAFTS = (NO_SIGN_IN, IN_THE_PORTAL, TOO_LOW, SUCCESS, SUCCESS)
# Asking to deactivate, reactivate or delete a published connection: 'manage' only
AGENTS_WITH_MANAGE = (
    NO_SIGN_IN,
    IN_THE_PORTAL,
    TOO_LOW_TO_MANAGE,
    TOO_LOW_TO_MANAGE,
    SUCCESS,
)

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

    `{id}` in the path, and a body value '{id}', is the row that `setup` creates
    for the signed-in client (a connection, or an agent connection on the user
    page); `then`, if given, runs once the caller is set up, with that row and the
    caller's authorization (None without a bearer), and its row replaces it (an
    approval request, which is the bearer's own). `success` is the status a
    permitted call answers. `label` tells rows of the same endpoint apart.
    """

    method: str
    path: str
    access: tuple[Outcome, Outcome, Outcome, Outcome, Outcome]
    setup: Callable[[TestClient], str | None] = _nothing
    body: dict[str, Any] | None = None
    success: int = 200
    then: Callable[[str | None, str | None], str] | None = None
    label: str = ''

    def __str__(self) -> str:
        endpoint = f'{self.method} {self.path}'
        return f'{endpoint} ({self.label})' if self.label else endpoint

    def url(self, row_id: str | None) -> str:
        return self.path.replace('{id}', row_id or '')

    def payload(self, row_id: str | None) -> dict[str, Any] | None:
        if self.body is None:
            return None
        return {
            key: row_id if value == '{id}' else value
            for key, value in self.body.items()
        }


ENDPOINTS = [
    Endpoint('GET', BASE, EVERY_LEVEL),
    Endpoint('GET', f'{BASE}/search', EVERY_LEVEL),
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
    Endpoint('GET', '/api/agent-access', BROWSER_SESSION),
    Endpoint(
        'PUT',
        '/api/agent-access/{id}',
        BROWSER_SESSION,
        setup=_agent_connection,
        body={'access_level': 'manage'},
    ),
    Endpoint(
        'DELETE',
        '/api/agent-access/{id}',
        BROWSER_SESSION,
        setup=_agent_connection,
        body={},
    ),
    Endpoint(
        'POST',
        '/api/agent-access/tokens',
        BROWSER_SESSION,
        body={'name': 'CI', 'access_level': 'read', 'expires_in_days': 30},
        success=201,
    ),
    Endpoint('GET', '/api/agent/me', AGENTS_ONLY),
    Endpoint(
        'POST',
        '/api/approval-requests',
        AGENTS_FROM_DRAFTS,
        setup=_publishable_draft,
        body={'form_connection_id': '{id}', 'action': 'publish'},
        success=201,
    ),
    Endpoint(
        'GET',
        '/api/approval-requests/{id}',
        EVERY_LEVEL,
        setup=_publishable_draft,
        then=_approval_request,
    ),
    Endpoint(
        'POST',
        '/api/approval-requests/{id}/approve',
        BROWSER_SESSION,
        setup=_publishable_draft,
        body={},
        then=_approval_request,
    ),
    Endpoint(
        'POST',
        '/api/approval-requests/{id}/decline',
        BROWSER_SESSION,
        setup=_publishable_draft,
        body={},
        then=_approval_request,
    ),
    # User story 7: deactivating, reactivating and deleting a published connection
    Endpoint(
        'POST',
        '/api/approval-requests',
        AGENTS_WITH_MANAGE,
        setup=_published,
        body={'form_connection_id': '{id}', 'action': 'deactivate'},
        success=201,
        label='deactivate',
    ),
    Endpoint(
        'POST',
        '/api/approval-requests',
        AGENTS_WITH_MANAGE,
        setup=_deactivated,
        body={'form_connection_id': '{id}', 'action': 'reactivate'},
        success=201,
        label='reactivate',
    ),
    Endpoint(
        'POST',
        '/api/approval-requests',
        AGENTS_WITH_MANAGE,
        setup=_published,
        body={'form_connection_id': '{id}', 'action': 'delete'},
        success=201,
        label='delete',
    ),
    # Spec 010: changing a start date is the browser's (contracts/management-api.md
    # "Who may call what"); agents ask for it with an approval request, 'manage'
    # only
    Endpoint(
        'PUT',
        f'{BASE}/{{id}}/start-date',
        BROWSER_SESSION,
        setup=_published,
        body={'start_date': START_DATE},
    ),
    Endpoint(
        'POST',
        '/api/approval-requests',
        AGENTS_WITH_MANAGE,
        setup=_published,
        body={
            'form_connection_id': '{id}',
            'action': 'set_start_date',
            'start_date': START_DATE,
        },
        success=201,
        label='set_start_date',
    ),
    Endpoint(
        'GET',
        '/api/approval-requests/{id}',
        EVERY_LEVEL,
        setup=_published,
        then=_status_request,
        label='deactivate',
    ),
    Endpoint(
        'POST',
        '/api/approval-requests/{id}/approve',
        BROWSER_SESSION,
        setup=_published,
        body={},
        then=_status_request,
        label='deactivate',
    ),
    Endpoint(
        'POST',
        '/api/approval-requests/{id}/decline',
        BROWSER_SESSION,
        setup=_published,
        body={},
        then=_status_request,
        label='deactivate',
    ),
]


def _call_as(client: TestClient, user_id: str, caller: Caller) -> str | None:
    """Make the signed-in client call as `caller`: a bearer has no cookie.

    Returns the bearer's authorization, None for the other callers.
    """
    if caller != 'cookie':
        client.cookies.clear()
    level = BEARER_LEVELS.get(caller)
    if level is None:
        return None
    authorization_id, token = create_agent_authorization(user_id, level)
    bearer_client(client, token)
    return authorization_id


@pytest.mark.parametrize('caller', CALLERS)
@pytest.mark.parametrize('endpoint', ENDPOINTS, ids=str)
def test_who_may_call_what(
    client: TestClient,
    fake_eudiplo: FakeEudiplo,
    endpoint: Endpoint,
    caller: Caller,
) -> None:
    user_id = _sign_in(client)
    row_id = endpoint.setup(client)
    authorization_id = _call_as(client, user_id, caller)
    if endpoint.then is not None:
        row_id = endpoint.then(row_id, authorization_id)
    before = _stored_state()

    response = client.request(
        endpoint.method, endpoint.url(row_id), json=endpoint.payload(row_id)
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
    """Collect the last-use writes on agent_authorizations sent meanwhile.

    An agent's new draft also updates the row (its draft limit's count), which
    isn't a last-use write.
    """
    statements: list[str] = []

    def collect(
        _connection: Any,
        _cursor: Any,
        statement: str,
        _parameters: Any,
        _context: Any,
        _executemany: bool,
    ) -> None:
        normalised = statement.lstrip().upper()
        if normalised.startswith('UPDATE AGENT_AUTHORIZATIONS') and (
            'LAST_USED_AT' in normalised
        ):
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

    # No level reaches what is done in Konnekt
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
        'test fictitious citizens. Nothing changes.'
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
    # The detail as `errors.py` answers it without a German header (spec 009)
    detail = refusal.detail
    assert isinstance(detail, dict)
    assert {**detail, 'message': resolve_text(detail['message'])} == NEEDS_MANAGE
