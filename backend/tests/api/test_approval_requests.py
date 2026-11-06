"""Approval requests for drafts (spec 007, user story 3, SC-004).

contracts/management-api.md "Approval requests", data-model.md section 5, research
R7 and R12: an agent with "Read and edit drafts" asks to publish or delete a draft
and gets the approval page's link; nothing happens until the team member it acts
for approves, in their browser session, the request as it was made: a draft that
changed, was published or deleted since, an expired request, an agent whose access
ended, and another team member get nothing done. An approved publish runs the
editor's publish, and a failure of EUDIPLO keeps the request waiting for another
attempt. The level table of every endpoint is in test_agent_principal.py.
"""

import logging
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select, update

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import (
    AgentAuthorization,
    ApprovalRequest,
    FormConnection,
    UserAccount,
)
from app.routers.form_connections import CONFIG_FAILED
from app.schemas import AccessLevel, AgentAccessKind
from app.services import approvals, drafts, worker
from app.services.eudiplo import NOT_CONFIGURED_MESSAGE
from app.services.evaluation import GERMANY
from tests.api.test_form_connection_drafts import editor_publish_body, published_shape
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, create_user
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    bearer_client,
    create_agent_authorization,
    create_form_connection,
    main_branch,
    now,
    trigger,
    variant,
)

BASE = '/api/approval-requests'
CONNECTIONS = '/api/form-connections'

NOT_FOUND = {'error': 'Not found', 'message': 'Approval request not found'}
CONNECTION_NOT_FOUND = {'error': 'Not found', 'message': 'Form connection not found'}
NOT_YOURS = {
    'error': 'not_yours',
    'message': 'This request was made for another team member.',
}
BROWSER_ONLY = {
    'error': 'browser_only',
    'message': 'This action is done in the Connection Portal.',
}
NEEDS_DRAFTS = {
    'error': 'insufficient_access',
    'message': "Changing drafts needs the access level 'Read and edit drafts'.",
    'needs_access_level': 'drafts',
}
PUBLISHED_ALREADY = {
    'error': 'not_allowed',
    'message': 'This connection is published already.',
}

# The approval page's reasons (contracts/ui-screens.md S3 "Outcome states")
CANCELLED_TEXTS = {
    'draft_changed': (
        'The draft has changed since the agent asked. Nothing has changed; the '
        'agent has to ask again.'
    ),
    'draft_published': 'The draft has been published since the agent asked.',
    'draft_deleted': 'The draft has been deleted since the agent asked.',
    'access_changed': (
        "The agent's access has changed, so this request was cancelled."
    ),
    'revoked': "The agent's access was revoked, so this request was cancelled.",
    'access_ended': "The agent's access has ended, so this request was cancelled.",
}

# A draft that publishing accepts: two documents, Standard and a variant
COMPLETE_DRAFT: dict[str, Any] = {
    'name': 'Führerscheinantrag Entwurf',
    'description': 'FS-20417',
    'documents': FORM_CONNECTION['documents'],
    'rules': {
        'branches': [
            main_branch([AGE_RULE, CLASS_RULE]),
            variant([AGE_RULE, CLASS_RULE]),
        ],
        'numbering_base': {'rule': 1, 'group': 1},
    },
    'step': 'test',
}

REQUEST_KEYS = {
    'id',
    'action',
    'form_connection_id',
    'connection_name',
    'requested_by',
    'status',
    'outcome',
    'cancel_reason',
    'link',
    'expires_at',
    'created_at',
    'decided_at',
    'failed_at',
    'error_id',
    'mine',
}


# Helpers


def _user_id(username: str = TEST_USERNAME) -> str:
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == username)
        )
    assert user_id is not None
    return user_id


def _signed_in(username: str) -> TestClient:
    """A new account `username`, signed in with a client of its own."""
    create_user(username)
    client = TestClient(app)
    response = client.post(
        '/api/auth/login', json={'username': username, 'password': TEST_PASSWORD}
    )
    assert response.status_code == 200
    return client


def _agent(
    user_id: str,
    level: AccessLevel = 'drafts',
    kind: AgentAccessKind = 'oauth',
    **names: str,
) -> tuple[str, TestClient]:
    """An agent of the account, calling with its bearer only: (its id, client).

    An agent connection of 'Claude Code' unless `kind` and `names` say otherwise.
    """
    authorization_id, token = create_agent_authorization(
        user_id, level, kind=kind, **({'client_name': 'Claude Code'} | names)
    )
    return authorization_id, bearer_client(TestClient(app), token)


def _draft(client: TestClient, **changes: Any) -> str:
    """Store COMPLETE_DRAFT with `changes` through the API and return its id."""
    response = client.post(f'{CONNECTIONS}/drafts', json=COMPLETE_DRAFT | changes)
    assert response.status_code == 201, response.json()
    draft_id: str = response.json()['data']['id']
    return draft_id


def _connection(client: TestClient, form_connection_id: str) -> Any:
    response = client.get(f'{CONNECTIONS}/{form_connection_id}')
    assert response.status_code == 200, response.json()
    return response.json()['data']


def _ask(
    agent: TestClient, form_connection_id: str, action: str = 'publish'
) -> dict[str, Any]:
    """The agent asks for `action`; returns the request it is answered."""
    response = agent.post(
        BASE, json={'form_connection_id': form_connection_id, 'action': action}
    )
    assert response.status_code == 201, response.json()
    assert response.json()['message'] == 'Approval requested'
    data: dict[str, Any] = response.json()['data']
    return data


def _preview(client: TestClient, request_id: str) -> Any:
    response = client.get(f'{BASE}/{request_id}')
    assert response.status_code == 200, response.json()
    return response.json()['data']


def _approve(client: TestClient, request_id: str) -> Any:
    return client.post(f'{BASE}/{request_id}/approve', json={})


def _decline(client: TestClient, request_id: str) -> Any:
    return client.post(f'{BASE}/{request_id}/decline', json={})


def _stored(request_id: str) -> ApprovalRequest | None:
    with SessionLocal() as db:
        return db.get(ApprovalRequest, request_id)


def _update(request_id: str, **values: Any) -> None:
    with SessionLocal() as db:
        db.execute(
            update(ApprovalRequest)
            .where(ApprovalRequest.id == request_id)
            .values(**values)
        )
        db.commit()


def _count() -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(ApprovalRequest)) or 0


def _publish_in_the_editor(client: TestClient, draft_id: str) -> Any:
    draft = _connection(client, draft_id)
    response = client.post(
        f'{CONNECTIONS}/{draft_id}/publish',
        json=editor_publish_body(draft, COMPLETE_DRAFT['documents']),
    )
    assert response.status_code == 200, response.json()
    return response.json()['data']


def _expired_text(request_id: str) -> str:
    request = _stored(request_id)
    assert request is not None
    expired_at = request.expires_at.astimezone(GERMANY)
    return (
        f'This request expired at {expired_at:%H:%M}. Nothing has changed. The '
        'agent can ask again.'
    )


# Creating a request


def test_a_request_answers_its_link_and_publishes_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    user_id = _user_id()
    draft_id = _draft(signed_in_client)
    draft = _connection(signed_in_client, draft_id)
    authorization_id, agent = _agent(user_id)
    before = now()

    request = _ask(agent, draft_id)

    after = now()
    assert request.keys() == REQUEST_KEYS
    assert request['action'] == 'publish'
    assert request['form_connection_id'] == draft_id
    assert request['connection_name'] == COMPLETE_DRAFT['name']
    assert request['requested_by'] == 'Claude Code'
    assert request['status'] == request['outcome'] == 'waiting'
    assert request['cancel_reason'] is None
    assert request['link'] == f'{settings.portal_url}/approvals/{request["id"]}'
    expires_at = datetime.fromisoformat(request['expires_at'])
    assert before + timedelta(minutes=10) <= expires_at
    assert expires_at <= after + timedelta(minutes=10)
    assert request['decided_at'] is None
    assert request['failed_at'] is None
    assert request['error_id'] is None
    assert request['mine'] is True
    # Nothing is published
    assert _connection(signed_in_client, draft_id) == draft
    assert fake_eudiplo.calls == []
    stored = _stored(request['id'])
    assert stored is not None
    assert stored.draft_version == draft['version']
    assert stored.authorization_id == authorization_id
    assert stored.user_account_id == user_id
    assert stored.was_active is None


def test_a_personal_access_tokens_request_carries_its_name(
    signed_in_client: TestClient,
) -> None:
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id(), kind='token', name='CI agent')

    request = _ask(agent, draft_id, 'delete_draft')

    assert request['requested_by'] == 'CI agent'
    assert request['action'] == 'delete_draft'


def test_a_read_only_agent_cant_ask(signed_in_client: TestClient) -> None:
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id(), 'read')

    for action in ('publish', 'delete_draft'):
        response = agent.post(
            BASE, json={'form_connection_id': draft_id, 'action': action}
        )

        assert response.status_code == 403
        assert response.json() == NEEDS_DRAFTS
    assert _count() == 0


def test_a_browser_session_cant_ask(signed_in_client: TestClient) -> None:
    draft_id = _draft(signed_in_client)

    response = signed_in_client.post(
        BASE, json={'form_connection_id': draft_id, 'action': 'publish'}
    )

    assert response.status_code == 403
    assert response.json() == BROWSER_ONLY
    assert _count() == 0


def test_an_unknown_connection_or_request_is_not_found(
    signed_in_client: TestClient,
) -> None:
    _, agent = _agent(_user_id())
    unknown = '00000000-0000-4000-8000-000000000000'

    created = agent.post(
        BASE, json={'form_connection_id': unknown, 'action': 'publish'}
    )

    assert created.status_code == 404
    assert created.json() == CONNECTION_NOT_FOUND
    assert _count() == 0
    for client in (signed_in_client, agent):
        response = client.get(f'{BASE}/{unknown}')
        assert response.status_code == 404
        assert response.json() == NOT_FOUND
    for call in (_approve, _decline):
        response = call(signed_in_client, unknown)
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


@pytest.mark.parametrize('action', ['publish', 'delete_draft'])
def test_a_published_connection_cant_be_asked_for(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, action: str
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    _, agent = _agent(_user_id())

    response = agent.post(
        BASE, json={'form_connection_id': form_connection_id, 'action': action}
    )

    assert response.status_code == 409
    assert response.json() == PUBLISHED_ALREADY
    assert _count() == 0


def test_a_draft_that_publishing_refuses_is_refused_at_once(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """US3-AS2: publishing's message, word for word, and no request."""
    draft_id = _draft(
        signed_in_client,
        documents=[],
        rules=COMPLETE_DRAFT['rules'] | {'branches': [main_branch([])]},
    )
    draft = _connection(signed_in_client, draft_id)
    _, agent = _agent(_user_id())

    response = agent.post(
        BASE, json={'form_connection_id': draft_id, 'action': 'publish'}
    )

    published = signed_in_client.post(
        f'{CONNECTIONS}/{draft_id}/publish', json=editor_publish_body(draft, [])
    )
    assert response.status_code == published.status_code == 400
    assert response.json() == published.json()
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Add at least one document.',
    }
    assert _count() == 0
    # Deleting it needs no check of its content
    assert _ask(agent, draft_id, 'delete_draft')['status'] == 'waiting'


def test_a_newer_request_replaces_the_waiting_one(
    signed_in_client: TestClient,
) -> None:
    user_id = _user_id()
    draft_id = _draft(signed_in_client)
    _, agent = _agent(user_id)
    _, other_agent = _agent(user_id, kind='token', name='CI agent')
    first = _ask(agent, draft_id)
    deleting = _ask(agent, draft_id, 'delete_draft')

    second = _ask(other_agent, draft_id)

    replaced = _preview(signed_in_client, first['id'])['request']
    assert replaced['status'] == replaced['outcome'] == 'replaced'
    assert replaced['decided_at'] is not None
    assert _preview(signed_in_client, second['id'])['request']['status'] == 'waiting'
    # Another action on the same draft stays
    assert _preview(signed_in_client, deleting['id'])['request']['status'] == 'waiting'
    response = _approve(signed_in_client, first['id'])
    assert response.status_code == 409
    assert response.json() == {
        'error': 'approval_replaced',
        'message': 'The agent made a newer request for this action.',
    }


# Reading a request


def test_the_page_reads_the_request_with_the_draft(
    signed_in_client: TestClient,
) -> None:
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)

    preview = _preview(signed_in_client, request['id'])

    assert preview.keys() == {'request', 'draft', 'connection', 'urls'}
    assert preview['request'] == request
    assert preview['draft'] == _connection(signed_in_client, draft_id)
    assert preview['connection'] is None
    assert preview['urls'] is None
    # The agent reads its own request too
    assert _preview(agent, request['id']) == preview


def test_only_the_requests_account_and_agent_read_it(
    signed_in_client: TestClient,
) -> None:
    user_id = _user_id()
    draft_id = _draft(signed_in_client)
    _, agent = _agent(user_id)
    request = _ask(agent, draft_id)
    bob = _signed_in('bob')
    _, another_agent = _agent(user_id, kind='token', name='CI agent')
    _, bobs_agent = _agent(_user_id('bob'))

    response = bob.get(f'{BASE}/{request["id"]}')
    assert response.status_code == 403
    assert response.json() == NOT_YOURS
    for other in (another_agent, bobs_agent):
        response = other.get(f'{BASE}/{request["id"]}')
        assert response.status_code == 404
        assert response.json() == NOT_FOUND


@pytest.mark.parametrize('call', [_approve, _decline], ids=['approve', 'decline'])
def test_another_team_member_cant_approve_or_decline(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    call: Callable[[TestClient, str], Any],
) -> None:
    """US3-AS6, FR-025."""
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)
    draft = _connection(signed_in_client, draft_id)

    response = call(_signed_in('bob'), request['id'])

    assert response.status_code == 403
    assert response.json() == NOT_YOURS
    assert _preview(signed_in_client, request['id'])['request'] == request
    assert _connection(signed_in_client, draft_id) == draft
    assert fake_eudiplo.calls == []


# Staleness (FR-024): the request applies to the draft as it was asked for


def _save(client: TestClient, draft_id: str) -> None:
    response = client.put(
        f'{CONNECTIONS}/{draft_id}/draft',
        json=COMPLETE_DRAFT | {'name': 'Geändert', 'version': 1},
    )
    assert response.status_code == 200, response.json()


def _delete(client: TestClient, draft_id: str) -> None:
    response = client.request('DELETE', f'{CONNECTIONS}/{draft_id}/draft', json={})
    assert response.status_code == 200, response.json()


@pytest.mark.parametrize(
    ('change', 'reason'),
    [
        pytest.param(_save, 'draft_changed', id='saved'),
        pytest.param(_publish_in_the_editor, 'draft_published', id='published'),
        pytest.param(_delete, 'draft_deleted', id='deleted'),
    ],
)
def test_a_draft_that_moved_on_cancels_the_request(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    change: Callable[[TestClient, str], Any],
    reason: str,
) -> None:
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)
    change(signed_in_client, draft_id)
    calls = len(fake_eudiplo.calls)

    preview = _preview(signed_in_client, request['id'])

    assert preview['request']['status'] == preview['request']['outcome'] == 'cancelled'
    assert preview['request']['cancel_reason'] == reason
    assert preview['urls'] is None
    if reason == 'draft_changed':
        assert preview['draft'] == _connection(signed_in_client, draft_id)
    else:
        assert preview['draft'] is None
    assert _preview(agent, request['id'])['request']['cancel_reason'] == reason
    for call in (_approve, _decline):
        response = call(signed_in_client, request['id'])
        assert response.status_code == 409
        assert response.json() == {
            'error': 'approval_cancelled',
            'message': CANCELLED_TEXTS[reason],
        }
    # Nothing is done, and the stored status stays waiting
    assert len(fake_eudiplo.calls) == calls
    stored = _stored(request['id'])
    assert stored is not None
    assert stored.status == 'waiting'


def test_an_expired_request_does_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)
    _update(request['id'], expires_at=now() - timedelta(seconds=1))

    preview = _preview(signed_in_client, request['id'])

    assert preview['request']['status'] == preview['request']['outcome'] == 'expired'
    assert preview['request']['cancel_reason'] is None
    for call in (_approve, _decline):
        response = call(signed_in_client, request['id'])
        assert response.status_code == 409
        assert response.json() == {
            'error': 'approval_expired',
            'message': _expired_text(request['id']),
        }
    assert _connection(signed_in_client, draft_id)['status'] == 'draft'
    assert fake_eudiplo.calls == []


def test_a_request_whose_access_ended_does_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The worker's sweep deletes the authorization row without cancel_for."""
    draft_id = _draft(signed_in_client)
    authorization_id, agent = _agent(_user_id())
    request = _ask(agent, draft_id)
    with SessionLocal() as db:
        db.execute(
            delete(AgentAuthorization).where(AgentAuthorization.id == authorization_id)
        )
        db.commit()

    preview = _preview(signed_in_client, request['id'])

    assert preview['request']['status'] == 'cancelled'
    assert preview['request']['cancel_reason'] == 'access_ended'
    assert preview['request']['requested_by'] == 'Claude Code'
    response = _approve(signed_in_client, request['id'])
    assert response.status_code == 409
    assert response.json() == {
        'error': 'approval_cancelled',
        'message': CANCELLED_TEXTS['access_ended'],
    }
    stored = _stored(request['id'])
    assert stored is not None
    assert (stored.status, stored.authorization_id) == ('waiting', None)
    assert _connection(signed_in_client, draft_id)['status'] == 'draft'
    assert fake_eudiplo.calls == []


def test_revoking_the_agent_cancels_its_request(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    user_id = _user_id()
    draft_id = _draft(signed_in_client)
    authorization_id, agent = _agent(user_id)
    request = _ask(agent, draft_id)
    deleting = _ask(agent, draft_id, 'delete_draft')

    response = signed_in_client.request(
        'DELETE', f'/api/agent-access/{authorization_id}', json={}
    )
    assert response.status_code == 200, response.json()

    for request_id in (request['id'], deleting['id']):
        read = _preview(signed_in_client, request_id)['request']
        assert read['status'] == read['outcome'] == 'cancelled'
        assert read['cancel_reason'] == 'revoked'
        assert read['requested_by'] == 'Claude Code'
        assert read['decided_at'] is not None
        response = _approve(signed_in_client, request_id)
        assert response.status_code == 409
        assert response.json() == {
            'error': 'approval_cancelled',
            'message': CANCELLED_TEXTS['revoked'],
        }
    # The account's new agent can't read the old agent's requests
    _, new_agent = _agent(user_id)
    response = new_agent.get(f'{BASE}/{request["id"]}')
    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    assert _connection(signed_in_client, draft_id)['status'] == 'draft'
    assert fake_eudiplo.calls == []


def test_lowering_the_agents_access_cancels_its_requests(
    signed_in_client: TestClient,
) -> None:
    user_id = _user_id()
    draft_id = _draft(signed_in_client)
    authorization_id, agent = _agent(user_id, 'manage')
    request = _ask(agent, draft_id)
    deleting = _ask(agent, draft_id, 'delete_draft')

    # To 'drafts': the draft actions still apply
    response = signed_in_client.put(
        f'/api/agent-access/{authorization_id}', json={'access_level': 'drafts'}
    )
    assert response.status_code == 200, response.json()
    assert _preview(signed_in_client, request['id'])['request']['status'] == 'waiting'

    response = signed_in_client.put(
        f'/api/agent-access/{authorization_id}', json={'access_level': 'read'}
    )
    assert response.status_code == 200, response.json()

    for request_id in (request['id'], deleting['id']):
        read = _preview(signed_in_client, request_id)['request']
        assert (read['status'], read['cancel_reason']) == (
            'cancelled',
            'access_changed',
        )
        response = _decline(signed_in_client, request_id)
        assert response.status_code == 409
        assert response.json() == {
            'error': 'approval_cancelled',
            'message': CANCELLED_TEXTS['access_changed'],
        }
    # The agent still reads its requests
    assert _preview(agent, request['id'])['request']['cancel_reason'] == (
        'access_changed'
    )


# Approving and declining


def test_approving_publishes_the_draft_as_the_editor_does(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """US3-AS4: the same draft published by the editor and by approval."""
    draft_id = _draft(signed_in_client)
    twin_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)
    draft = _connection(signed_in_client, draft_id)
    before = now()

    response = _approve(signed_in_client, request['id'])

    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Published'
    preview = response.json()['data']
    assert preview['request']['status'] == preview['request']['outcome'] == 'done'
    decided_at = datetime.fromisoformat(preview['request']['decided_at'])
    assert before <= decided_at <= now()
    assert preview['request']['connection_name'] == COMPLETE_DRAFT['name']
    assert preview['draft'] is None
    assert preview['connection'] is None
    connection = _connection(signed_in_client, draft_id)
    assert connection['status'] == 'published'
    assert published_shape(connection) == published_shape(
        _publish_in_the_editor(signed_in_client, twin_id)
    )
    # The variants keep the draft's ids (FR-029)
    assert [branch['id'] for branch in connection['branches']] == [
        branch['id'] for branch in draft['branches']
    ]
    assert preview['urls'] == {
        'trigger_url': connection['trigger_url'],
        'variants': [
            {'id': branch['id'], 'name': branch['name'], 'pull_url': branch['pull_url']}
            for branch in connection['branches']
        ],
    }
    assert trigger(signed_in_client, draft_id)['status'] == 'pending'
    # The page and the agent read the outcome with the URLs
    assert _preview(signed_in_client, request['id']) == preview
    read = _preview(agent, request['id'])
    assert read['request']['outcome'] == 'done'
    assert read['urls'] == preview['urls']


def test_approving_a_deletion_deletes_the_draft(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """US3-AS8: the draft is deleted as spec 005, FR-010 says."""
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    publishing = _ask(agent, draft_id)
    request = _ask(agent, draft_id, 'delete_draft')

    response = _approve(signed_in_client, request['id'])

    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Draft deleted'
    preview = response.json()['data']
    assert preview['request']['status'] == preview['request']['outcome'] == 'done'
    assert preview['request']['connection_name'] == COMPLETE_DRAFT['name']
    assert preview['draft'] is None
    assert preview['urls'] is None
    response = signed_in_client.get(f'{CONNECTIONS}/{draft_id}')
    assert response.status_code == 404
    assert fake_eudiplo.calls == []
    # Both requests outlive the draft
    assert _preview(agent, request['id'])['request']['outcome'] == 'done'
    read = _preview(signed_in_client, publishing['id'])['request']
    assert (read['status'], read['cancel_reason']) == ('cancelled', 'draft_deleted')


def test_declining_changes_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """US3-AS7: the agent learns that it was declined; the draft is unchanged."""
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)
    draft = _connection(signed_in_client, draft_id)

    response = _decline(signed_in_client, request['id'])

    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Declined'
    preview = response.json()['data']
    assert preview['request']['status'] == preview['request']['outcome'] == 'declined'
    assert preview['request']['decided_at'] is not None
    assert preview['draft'] == draft
    assert _connection(signed_in_client, draft_id) == draft
    assert _preview(agent, request['id'])['request']['outcome'] == 'declined'
    assert fake_eudiplo.calls == []


def _approved(client: TestClient, request_id: str) -> None:
    assert _approve(client, request_id).status_code == 200


def _declined(client: TestClient, request_id: str) -> None:
    assert _decline(client, request_id).status_code == 200


def _expired(_client: TestClient, request_id: str) -> None:
    _update(request_id, expires_at=now() - timedelta(seconds=1))


@pytest.mark.parametrize(
    ('end', 'status', 'message'),
    [
        pytest.param(_approved, 'done', 'Published.', id='done'),
        pytest.param(_expired, 'expired', None, id='expired'),
        pytest.param(
            _declined,
            'declined',
            'You declined this request. Nothing has changed.',
            id='declined',
        ),
    ],
)
@pytest.mark.parametrize('call', [_approve, _decline], ids=['approve', 'decline'])
def test_a_request_that_ended_does_nothing_and_says_why(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    end: Callable[[TestClient, str], None],
    status: str,
    message: str | None,
    call: Callable[[TestClient, str], Any],
) -> None:
    """US3-AS6: approving or declining again, or too late."""
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)
    end(signed_in_client, request['id'])
    stored = _stored(request['id'])
    connection = signed_in_client.get(f'{CONNECTIONS}/{draft_id}').json()
    calls = len(fake_eudiplo.calls)

    response = call(signed_in_client, request['id'])

    assert response.status_code == 409
    assert response.json() == {
        'error': f'approval_{status}',
        'message': message or _expired_text(request['id']),
    }
    after = _stored(request['id'])
    assert after is not None and stored is not None
    assert (after.status, after.decided_at) == (stored.status, stored.decided_at)
    assert signed_in_client.get(f'{CONNECTIONS}/{draft_id}').json() == connection
    assert len(fake_eudiplo.calls) == calls


@pytest.mark.parametrize('failure', ['unavailable', 'not configured'])
def test_a_failed_publish_keeps_the_request_waiting_for_another_try(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    error_log: Callable[[str], str],
    failure: str,
) -> None:
    """US3-AS9, FR-027: the error id on the page, then "Try again"."""
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)
    draft = _connection(signed_in_client, draft_id)
    trust_list_id = settings.eudiplo_trust_list_id
    if failure == 'unavailable':
        fake_eudiplo.fail('create_config', 503)
    else:
        monkeypatch.setattr(settings, 'eudiplo_trust_list_id', '')

    response = _approve(signed_in_client, request['id'])

    error_id = response.json()['error_id']
    if failure == 'unavailable':
        assert response.status_code == 502
        assert response.json() == {
            'error': 'Upstream error',
            'message': CONFIG_FAILED,
            'error_id': error_id,
        }
        assert 'EudiploUnavailable' in error_log(error_id)
    else:
        assert response.status_code == 503
        assert response.json() == {
            'error': 'Not configured',
            'message': NOT_CONFIGURED_MESSAGE,
            'error_id': error_id,
        }
        assert 'EUDIPLO_TRUST_LIST_ID' in error_log(error_id)
    assert 'EUDIPLO' not in response.text
    stored = _stored(request['id'])
    assert stored is not None
    assert stored.status == 'waiting'
    assert stored.failed_at is not None
    assert stored.error_id == error_id
    for reader in (signed_in_client, agent):
        read = _preview(reader, request['id'])['request']
        assert (read['status'], read['outcome']) == ('waiting', 'failed')
        assert read['error_id'] == error_id
        assert read['failed_at'] is not None
    # The draft stays a draft
    assert _connection(signed_in_client, draft_id) == draft

    monkeypatch.setattr(settings, 'eudiplo_trust_list_id', trust_list_id)
    response = _approve(signed_in_client, request['id'])

    assert response.status_code == 200, response.json()
    assert response.json()['data']['request']['outcome'] == 'done'
    assert _connection(signed_in_client, draft_id)['status'] == 'published'


def test_a_draft_saved_while_the_approval_runs_isnt_published(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A save between the check and the publish: only the version asked for
    may go live, and the race is answered as the page's reason."""
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)
    publish_stored_draft = drafts.publish_stored_draft

    def saved_meanwhile(db: Any, form_connection_id: str, version: int) -> Any:
        with SessionLocal() as other:
            other.execute(
                update(FormConnection)
                .where(FormConnection.id == form_connection_id)
                .values(name='Geändert', draft_version=FormConnection.draft_version + 1)
            )
            other.commit()
        return publish_stored_draft(db, form_connection_id, version)

    monkeypatch.setattr(drafts, 'publish_stored_draft', saved_meanwhile)

    response = _approve(signed_in_client, request['id'])

    assert response.status_code == 409
    assert response.json() == {
        'error': 'approval_cancelled',
        'message': CANCELLED_TEXTS['draft_changed'],
    }
    connection = _connection(signed_in_client, draft_id)
    assert (connection['status'], connection['name']) == ('draft', 'Geändert')
    assert fake_eudiplo.configs == {}
    read = _preview(signed_in_client, request['id'])['request']
    assert (read['status'], read['cancel_reason']) == ('cancelled', 'draft_changed')


def test_a_draft_saved_while_its_deletion_is_approved_isnt_deleted(
    signed_in_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Only the version the team member saw is deleted (FR-024)."""
    draft_id = _draft(signed_in_client)
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id, 'delete_draft')
    delete_draft = drafts.delete_draft

    def saved_meanwhile(db: Any, form_connection_id: str, version: int) -> None:
        with SessionLocal() as other:
            other.execute(
                update(FormConnection)
                .where(FormConnection.id == form_connection_id)
                .values(draft_version=FormConnection.draft_version + 1)
            )
            other.commit()
        delete_draft(db, form_connection_id, version)

    monkeypatch.setattr(drafts, 'delete_draft', saved_meanwhile)

    response = _approve(signed_in_client, request['id'])

    assert response.status_code == 409
    assert response.json() == {
        'error': 'approval_cancelled',
        'message': CANCELLED_TEXTS['draft_changed'],
    }
    assert _connection(signed_in_client, draft_id)['version'] == 2


def test_only_ids_are_logged(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG)
    draft_id = _draft(signed_in_client)
    _, token = create_agent_authorization(
        _user_id(), 'drafts', kind='oauth', client_name='Claude Code'
    )
    agent = bearer_client(TestClient(app), token)
    request = _ask(agent, draft_id)
    declined = _ask(agent, draft_id, 'delete_draft')

    assert _decline(signed_in_client, declined['id']).status_code == 200
    assert _approve(signed_in_client, request['id']).status_code == 200

    messages = [
        record.getMessage()
        for record in caplog.records
        if record.name == approvals.__name__
    ]
    assert messages == [
        f'Approval request {request["id"]} created',
        f'Approval request {declined["id"]} created',
        f'Approval request {declined["id"]} declined',
        f'Approval request {request["id"]} approved',
    ]
    for secret in (token, COMPLETE_DRAFT['name'], 'Claude Code'):
        assert secret not in caplog.text


# The worker (research R12)


def _insert(draft_id: str, authorization_id: str, **values: Any) -> str:
    """A request stored directly: waiting for ten minutes, or `values`."""
    with SessionLocal() as db:
        request = ApprovalRequest(
            **{
                'form_connection_id': draft_id,
                'action': 'publish',
                'authorization_id': authorization_id,
                'requested_by': 'Claude Code',
                'user_account_id': _user_id(),
                'draft_version': 1,
                'status': 'waiting',
                'expires_at': now() + timedelta(minutes=10),
            }
            | values
        )
        db.add(request)
        db.commit()
        return request.id


def test_the_worker_deletes_requests_that_ended_a_day_ago(
    signed_in_client: TestClient,
) -> None:
    draft_id = _draft(signed_in_client)
    authorization_id, _ = _agent(_user_id())
    day_ago = now() - timedelta(days=1, minutes=1)
    ended = [
        _insert(draft_id, authorization_id, status='declined', decided_at=day_ago),
        _insert(draft_id, authorization_id, status='done', decided_at=day_ago),
        _insert(draft_id, authorization_id, expires_at=day_ago),
        # Read as cancelled by computation, it goes with its expiry
        _insert(draft_id, authorization_id, draft_version=7, expires_at=day_ago),
    ]
    kept = [
        _insert(draft_id, authorization_id),
        _insert(draft_id, authorization_id, status='declined', decided_at=now()),
        _insert(draft_id, authorization_id, expires_at=now() - timedelta(hours=23)),
        _insert(draft_id, authorization_id, draft_version=7),
    ]

    worker.delete_old_approval_requests()

    assert [_stored(request_id) for request_id in ended] == [None] * len(ended)
    assert all(_stored(request_id) is not None for request_id in kept)
    response = signed_in_client.get(f'{BASE}/{ended[0]}')
    assert response.status_code == 404
    assert response.json() == NOT_FOUND


def test_the_worker_step_is_registered() -> None:
    assert worker.STEPS[-1] is worker.delete_old_approval_requests
