"""The user page's endpoints and the agents' principal (spec 007, SC-005).

contracts/management-api.md "Agent access" and "Agent principal", research R6 and
R7: an account sees and changes its own agent connections and tokens only; a new
level applies from the agent's next call; lowering and revoking cancel the waiting
approval requests the agent may no longer make; a personal access token's secret
is answered once; deleting the account ends every agent's access (FR-005).
"""

from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.cli import delete_user
from app.db import SessionLocal
from app.main import app
from app.models import (
    AgentAuthorization,
    AgentToken,
    ApprovalRequest,
    FormConnection,
    UserAccount,
)
from app.schemas import AccessLevel
from app.services import approvals
from app.services.auth import ACCESS_LEVELS
from app.services.oauth import token_hash
from tests.conftest import TEST_USERNAME, create_user
from tests.helpers import bearer_client, create_agent_authorization, main_branch, now

BASE = '/api/agent-access'
DRAFTS = '/api/form-connections/drafts'
NOT_FOUND = {'error': 'Not found', 'message': 'Agent access not found'}
TOO_MANY_DAYS = {
    'error': 'Validation error',
    'message': 'A token can be valid for at most 90 days.',
}
BAD_NAME = {
    'error': 'Validation error',
    'message': 'Give the token a name of 1 to 100 characters.',
}
SIGN_IN_REQUIRED = {'error': 'Unauthorized', 'message': 'Sign in to continue'}

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


def _user_id(username: str = TEST_USERNAME) -> str:
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == username)
        )
    assert user_id is not None
    return user_id


def _agent(token: str) -> TestClient:
    """A client that calls as the agent: the bearer only, no cookie."""
    return bearer_client(TestClient(app), token)


def _set_level(client: TestClient, authorization_id: str, level: AccessLevel) -> None:
    response = client.put(f'{BASE}/{authorization_id}', json={'access_level': level})
    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Access level changed'
    assert response.json()['data']['access_level'] == level


def _create_token(client: TestClient, **changes: Any) -> Any:
    body = {'name': 'CI agent', 'access_level': 'read', 'expires_in_days': 30}
    return client.post(f'{BASE}/tokens', json=body | changes)


def _draft_row() -> str:
    """A draft stored directly, for approval requests to name."""
    with SessionLocal() as db:
        draft = FormConnection(
            name='Entwurf', description='', draft={}, draft_version=1
        )
        db.add(draft)
        db.commit()
        return draft.id


def _waiting_request(authorization_id: str, action: str, **values: Any) -> str:
    """An approval request inserted directly: waiting for ten minutes, or `values`."""
    with SessionLocal() as db:
        authorization = db.get(AgentAuthorization, authorization_id)
        assert authorization is not None
        request = ApprovalRequest(
            **{
                'form_connection_id': _draft_row(),
                'action': action,
                'authorization_id': authorization_id,
                'user_account_id': authorization.user_account_id,
                'draft_version': 1,
                'status': 'waiting',
                'expires_at': now() + timedelta(minutes=10),
            }
            | values
        )
        db.add(request)
        db.commit()
        return request.id


def _request_state(request_id: str) -> tuple[str, str | None, datetime | None] | None:
    with SessionLocal() as db:
        request = db.get(ApprovalRequest, request_id)
        if request is None:
            return None
        return request.status, request.cancel_reason, request.decided_at


def _tokens_of(authorization_id: str) -> list[AgentToken]:
    with SessionLocal() as db:
        return list(
            db.scalars(
                select(AgentToken).where(
                    AgentToken.authorization_id == authorization_id
                )
            )
        )


# The list


def test_the_list_shows_the_accounts_own_rows_with_the_levels(
    signed_in_client: TestClient,
) -> None:
    user_id = _user_id()
    other_id = create_user('bob')
    token_id, _ = create_agent_authorization(user_id, 'read', name='Laptop')
    oauth_id, _ = create_agent_authorization(
        user_id, 'drafts', kind='oauth', client_name='Claude Code'
    )
    create_agent_authorization(other_id, 'manage', name='Bob')
    create_agent_authorization(other_id, 'manage', kind='oauth')

    response = signed_in_client.get(BASE)

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert data.keys() == {'items', 'levels'}
    assert data['levels'] == [info.model_dump() for info in ACCESS_LEVELS]
    # Newest first
    assert [item['id'] for item in data['items']] == [oauth_id, token_id]
    oauth_item, token_item = data['items']
    assert oauth_item['kind'] == 'oauth'
    assert oauth_item['client_name'] == 'Claude Code'
    assert oauth_item['name'] is None
    assert oauth_item['access_level'] == 'drafts'
    assert oauth_item['expires_at'] is None
    assert oauth_item['last_used_at'] is None
    assert token_item['kind'] == 'token'
    assert token_item['client_name'] is None
    assert token_item['name'] == 'Laptop'
    assert token_item['access_level'] == 'read'
    assert token_item['expires_at'] is not None
    assert token_item['created_at'].endswith('Z')


def test_the_list_shows_the_last_use(signed_in_client: TestClient) -> None:
    _, token = create_agent_authorization(_user_id(), 'read')
    assert signed_in_client.get(BASE).json()['data']['items'][0]['last_used_at'] is None

    assert _agent(token).get('/api/form-connections').status_code == 200

    [item] = signed_in_client.get(BASE).json()['data']['items']
    assert item['last_used_at'] is not None


# Changing the level


def test_a_new_level_applies_from_the_next_call(
    signed_in_client: TestClient,
) -> None:
    authorization_id, token = create_agent_authorization(_user_id(), 'read')
    agent = _agent(token)
    refused = agent.post(DRAFTS, json=DRAFT)
    assert refused.status_code == 403
    assert refused.json()['error'] == 'insufficient_access'

    _set_level(signed_in_client, authorization_id, 'drafts')
    assert agent.post(DRAFTS, json=DRAFT).status_code == 201

    _set_level(signed_in_client, authorization_id, 'read')
    refused = agent.post(DRAFTS, json=DRAFT)
    assert refused.status_code == 403
    assert refused.json()['error'] == 'insufficient_access'


def test_the_answer_is_the_changed_item(signed_in_client: TestClient) -> None:
    authorization_id, _ = create_agent_authorization(
        _user_id(), 'read', kind='oauth', client_name='Cursor'
    )

    response = signed_in_client.put(
        f'{BASE}/{authorization_id}', json={'access_level': 'manage'}
    )

    assert response.status_code == 200, response.json()
    item = response.json()['data']
    assert item['id'] == authorization_id
    assert item['access_level'] == 'manage'
    assert item['client_name'] == 'Cursor'
    assert item['name'] is None


def test_lowering_cancels_what_the_new_level_doesnt_allow(
    signed_in_client: TestClient,
) -> None:
    user_id = _user_id()
    authorization_id, _ = create_agent_authorization(user_id, 'manage')
    other_id, _ = create_agent_authorization(user_id, 'manage')
    deactivate = _waiting_request(authorization_id, 'deactivate', was_active=True)
    publish = _waiting_request(authorization_id, 'publish')
    others = _waiting_request(other_id, 'delete', was_active=True)
    expired = _waiting_request(
        authorization_id, 'reactivate', expires_at=now() - timedelta(seconds=1)
    )
    done = _waiting_request(authorization_id, 'delete', status='done')

    before = now()
    _set_level(signed_in_client, authorization_id, 'drafts')

    state = _request_state(deactivate)
    assert state is not None
    assert state[:2] == ('cancelled', 'access_changed')
    assert state[2] is not None and before <= state[2] <= now()
    assert _request_state(publish) == ('waiting', None, None)
    # Another agent's, an expired and a decided request stay as they were
    assert _request_state(others) == ('waiting', None, None)
    assert _request_state(expired) == ('waiting', None, None)
    assert _request_state(done) == ('done', None, None)

    _set_level(signed_in_client, authorization_id, 'read')

    state = _request_state(publish)
    assert state is not None
    assert state[:2] == ('cancelled', 'access_changed')
    assert _request_state(others) == ('waiting', None, None)


def test_raising_cancels_nothing(signed_in_client: TestClient) -> None:
    authorization_id, _ = create_agent_authorization(_user_id(), 'drafts')
    publish = _waiting_request(authorization_id, 'publish')

    _set_level(signed_in_client, authorization_id, 'manage')
    _set_level(signed_in_client, authorization_id, 'drafts')

    assert _request_state(publish) == ('waiting', None, None)


def test_another_accounts_row_is_not_found(signed_in_client: TestClient) -> None:
    other_id = create_user('bob')
    authorization_id, token = create_agent_authorization(other_id, 'read')

    changed = signed_in_client.put(
        f'{BASE}/{authorization_id}', json={'access_level': 'manage'}
    )
    revoked = signed_in_client.request('DELETE', f'{BASE}/{authorization_id}', json={})
    unknown = signed_in_client.put(
        f'{BASE}/00000000-0000-4000-8000-000000000000', json={'access_level': 'read'}
    )

    for response in (changed, revoked, unknown):
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    with SessionLocal() as db:
        authorization = db.get(AgentAuthorization, authorization_id)
        assert authorization is not None
        assert authorization.access_level == 'read'
    assert _agent(token).get('/api/form-connections').status_code == 200


def test_an_unknown_level_is_refused(signed_in_client: TestClient) -> None:
    authorization_id, _ = create_agent_authorization(_user_id(), 'read')

    response = signed_in_client.put(
        f'{BASE}/{authorization_id}', json={'access_level': 'admin'}
    )

    assert response.status_code == 400
    assert response.json()['error'] == 'Validation error'


# Revoking


def test_revoking_ends_the_agents_access(
    signed_in_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_id = _user_id()
    authorization_id, token = create_agent_authorization(
        user_id, 'manage', kind='oauth'
    )
    other_id, other_token = create_agent_authorization(user_id, 'manage')
    deactivate = _waiting_request(authorization_id, 'deactivate', was_active=True)
    publish = _waiting_request(authorization_id, 'publish')
    others = _waiting_request(other_id, 'publish')
    agent = _agent(token)
    assert agent.get('/api/form-connections').status_code == 200

    # The requests are cancelled before the row goes, and their rows with it
    seen: list[tuple[str, str | None]] = []
    cancel_for: Callable[..., int] = approvals.cancel_for

    def spy(db: Any, cancelled_id: str, **options: Any) -> int:
        count = cancel_for(db, cancelled_id, **options)
        seen.extend(
            (request.status, request.cancel_reason)
            for request in db.scalars(
                select(ApprovalRequest)
                .where(ApprovalRequest.authorization_id == cancelled_id)
                .execution_options(populate_existing=True)
            )
        )
        return count

    monkeypatch.setattr(approvals, 'cancel_for', spy)

    response = signed_in_client.request('DELETE', f'{BASE}/{authorization_id}', json={})

    assert response.status_code == 200, response.json()
    assert response.json() == {'data': None, 'message': 'Access revoked'}
    assert seen == [('cancelled', 'revoked'), ('cancelled', 'revoked')]
    assert _request_state(deactivate) is None
    assert _request_state(publish) is None
    assert _tokens_of(authorization_id) == []
    response = agent.get('/api/form-connections')
    assert response.status_code == 401
    assert response.json() == SIGN_IN_REQUIRED
    # The account's other token is untouched
    assert _request_state(others) == ('waiting', None, None)
    assert _agent(other_token).get('/api/form-connections').status_code == 200
    assert [
        item['id'] for item in signed_in_client.get(BASE).json()['data']['items']
    ] == [other_id]


def test_cancel_for_revoked_cancels_every_waiting_request(
    signed_in_client: TestClient,
) -> None:
    authorization_id, _ = create_agent_authorization(_user_id(), 'manage')
    deactivate = _waiting_request(authorization_id, 'deactivate', was_active=True)
    publish = _waiting_request(authorization_id, 'publish')

    with SessionLocal() as db:
        assert approvals.cancel_for(db, authorization_id, reason='revoked') == 2
        db.commit()

    for request_id in (deactivate, publish):
        state = _request_state(request_id)
        assert state is not None
        assert state[:2] == ('cancelled', 'revoked')
        assert state[2] is not None


# Personal access tokens


def test_a_created_token_is_answered_once_and_works(
    signed_in_client: TestClient,
) -> None:
    before = now()
    response = _create_token(
        signed_in_client, name='  CI agent  ', access_level='drafts', expires_in_days=7
    )

    assert response.status_code == 201, response.json()
    body = response.json()
    assert body['message'] == 'Token created'
    token = body['data']['token']
    item = body['data']['item']
    assert token.startswith('cp_pat_')
    assert len(token) == len('cp_pat_') + 43
    assert item['kind'] == 'token'
    assert item['name'] == 'CI agent'
    assert item['client_name'] is None
    assert item['access_level'] == 'drafts'
    assert item['last_used_at'] is None
    expires_at = datetime.fromisoformat(item['expires_at'])
    assert before + timedelta(days=7) <= expires_at <= now() + timedelta(days=7)

    # Listed without its secret
    listed = signed_in_client.get(BASE)
    assert listed.json()['data']['items'] == [item]
    assert token not in listed.text
    [stored] = _tokens_of(item['id'])
    assert stored.kind == 'personal'
    assert stored.token_hash == token_hash(token)
    assert stored.expires_at == expires_at

    # A bearer at its level
    agent = _agent(token)
    assert agent.post(DRAFTS, json=DRAFT).status_code == 201
    me = agent.get('/api/agent/me')
    assert me.status_code == 200
    assert me.json()['data']['kind'] == 'token'


def test_a_level_change_keeps_the_tokens_secret_and_expiry(
    signed_in_client: TestClient,
) -> None:
    created = _create_token(signed_in_client, access_level='drafts').json()['data']
    authorization_id = created['item']['id']
    [before] = _tokens_of(authorization_id)

    _set_level(signed_in_client, authorization_id, 'read')

    [after] = _tokens_of(authorization_id)
    assert (after.id, after.token_hash, after.expires_at) == (
        before.id,
        before.token_hash,
        before.expires_at,
    )
    [item] = signed_in_client.get(BASE).json()['data']['items']
    assert item['expires_at'] == created['item']['expires_at']
    agent = _agent(created['token'])
    assert agent.get('/api/form-connections').status_code == 200
    assert agent.post(DRAFTS, json=DRAFT).status_code == 403


@pytest.mark.parametrize('days', [0, 91, -1])
def test_a_token_lasts_1_to_90_days(signed_in_client: TestClient, days: int) -> None:
    response = _create_token(signed_in_client, expires_in_days=days)

    assert response.status_code == 400
    assert response.json() == TOO_MANY_DAYS
    assert signed_in_client.get(BASE).json()['data']['items'] == []


@pytest.mark.parametrize('days', [1, 90])
def test_a_token_may_last_1_or_90_days(signed_in_client: TestClient, days: int) -> None:
    assert _create_token(signed_in_client, expires_in_days=days).status_code == 201


@pytest.mark.parametrize('name', ['', '   ', 'x' * 101])
def test_a_token_needs_a_name_of_1_to_100_characters(
    signed_in_client: TestClient, name: str
) -> None:
    response = _create_token(signed_in_client, name=name)

    assert response.status_code == 400
    assert response.json() == BAD_NAME
    assert signed_in_client.get(BASE).json()['data']['items'] == []


def test_a_name_of_100_characters_after_trimming_is_accepted(
    signed_in_client: TestClient,
) -> None:
    response = _create_token(signed_in_client, name=f' {"x" * 100} ')

    assert response.status_code == 201, response.json()
    assert response.json()['data']['item']['name'] == 'x' * 100


# The agent's principal


@pytest.mark.parametrize('kind', ['token', 'oauth'])
def test_agent_me_answers_the_account_and_the_level(
    client: TestClient, kind: str
) -> None:
    user_id = create_user()
    _, token = create_agent_authorization(
        user_id,
        'drafts',
        kind='oauth' if kind == 'oauth' else 'token',
        client_name='Claude Code',
    )

    response = _agent(token).get('/api/agent/me')

    assert response.status_code == 200, response.json()
    assert response.json()['data'] == {
        'username': TEST_USERNAME,
        'client_name': 'Claude Code' if kind == 'oauth' else None,
        'kind': kind,
        'access_level': 'drafts',
        'levels': [info.model_dump() for info in ACCESS_LEVELS],
    }


def test_agent_me_refuses_a_cookie(signed_in_client: TestClient) -> None:
    response = signed_in_client.get('/api/agent/me')

    assert response.status_code == 403
    assert response.json() == {
        'error': 'bearer_only',
        'message': 'This endpoint is for agents.',
    }


def test_deleting_the_account_ends_its_agents_access(
    signed_in_client: TestClient,
) -> None:
    user_id = _user_id()
    _, token = create_agent_authorization(user_id, 'manage')
    _, access_token = create_agent_authorization(user_id, 'manage', kind='oauth')
    for bearer in (token, access_token):
        assert _agent(bearer).get('/api/agent/me').status_code == 200

    with SessionLocal() as db:
        delete_user(db, TEST_USERNAME)

    for bearer in (token, access_token):
        response = _agent(bearer).get('/api/agent/me')
        assert response.status_code == 401
        assert response.json() == SIGN_IN_REQUIRED
    with SessionLocal() as db:
        assert db.scalars(select(AgentAuthorization)).all() == []
        assert db.scalars(select(AgentToken)).all() == []
