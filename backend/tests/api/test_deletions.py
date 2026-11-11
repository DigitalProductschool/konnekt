"""Deleting, taking a deletion back, and making it final (spec 010, T040 to T042).

Research R5, data-model 3, contracts/management-api.md "Deleting, bulk deleting and
restoring", "Changed behaviour of existing endpoints" and "The worker"; FR-030,
FR-033 to FR-036, FR-067, FR-068, SC-005; R15 V1, V4, V10.

Deleting (T040): `DELETE …/{id}` and `DELETE …/{id}/draft` answer the deletion,
`Deletion { id, restorable_until }`, with a fresh id and the deleting account; the
row stays, marked with `deleted_at`, `deletion_id` and `deleted_by_id`, keeps its
`updated_at` (R15 V1) and records `deleted`. A connection of each status is gone at
once from the list, the search, the details, the activity and an agent's reads. A
deletion that an approved approval request runs has no id (FR-067).

Restoring (T041): `POST …/deletions/{deletion_id}/restore` brings every row of the
deletion back exactly as it was, every stored column and every row that refers to
it, read without naming a column, or none; only for the deleting account, within
DELETION_UNDO_SECONDS, never for an agent; `409 not_restorable` changes nothing.

Making it final (T042): the worker's configuration cleanup waits for the restore
time and checks it again under the row lock a restore takes, so that a restore at
the last second keeps the configuration; `finish_deletions` then deletes the
activity and a draft's row. The worker's steps are called directly, with its
clock moved (`worker._now`, `deletions._now`).

Elsewhere: what serviceBW's URLs answer for a deleted draft and a deleted published
connection (FR-075) in test_connect.py; the cancellation stored on the waiting
approval requests, an approved deletion and a restore that keeps them cancelled in
test_approval_requests.py; a draft's publish in flight that meets the marked row
(R15 V9), or the row deleted and restored, in test_form_connection_drafts.py.
"""

import logging
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response
from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import (
    ConnectionActivity,
    FormConnection,
    FormConnectionRevision,
    UserAccount,
)
from app.schemas import AccessLevel, Deletion, FormConnectionSummary, to_iso_utc
from app.services import (
    deletions,
    drafts,
    form_connections,
    start_dates,
    worker,
)
from app.services.activity import Actor
from tests.api.test_form_connection_drafts import (
    JOIN_TIMEOUT,
    create_draft,
    draft_rules,
    run_in_threads,
)
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, create_user
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    bearer_client,
    branch_pull_url,
    create_agent_authorization,
    create_form_connection,
    main_branch,
    now,
    pull_url,
    requests_url,
    rules_input,
    stored_request,
    trigger,
    update_form_connection,
    variant,
)

BASE = '/api/form-connections'
NOT_FOUND = {'error': 'Not found', 'message': 'Form connection not found'}
NOT_RESTORABLE = {
    'error': 'not_restorable',
    'message': 'This can no longer be restored.',
}
BROWSER_ONLY = {'error': 'browser_only', 'message': 'This action is done in Konnekt.'}
UNAVAILABLE = {
    'error': 'unavailable',
    'message': 'This form connection is deactivated or deleted',
}

State = Literal['draft', 'scheduled', 'live', 'deactivated']
STATES: list[State] = ['draft', 'scheduled', 'live', 'deactivated']
MESSAGES: dict[State, str] = {
    'draft': 'Draft deleted',
    'scheduled': 'Form connection deleted',
    'live': 'Form connection deleted',
    'deactivated': 'Form connection deleted',
}
# Long before the tests run: a deletion that moved `updated_at` would show
LONG_AGO = datetime(2026, 1, 2, 3, 4, 5, 678901, tzinfo=timezone.utc)


def _create(client: TestClient, state: State, name: str) -> str:
    """A connection in `state`, called `name`, made through the API; its id."""
    if state == 'draft':
        return create_draft(client, name=name)
    start_date = None
    if state == 'scheduled':
        start_date = (start_dates.today_in_germany() + timedelta(days=30)).isoformat()
    form_connection_id = create_form_connection(
        client, name=name, start_date=start_date
    )
    if state == 'deactivated':
        response = client.post(f'{BASE}/{form_connection_id}/deactivate', json={})
        assert response.status_code == 200, response.json()
    return form_connection_id


def _delete_url(state: State, form_connection_id: str) -> str:
    """A draft is deleted through `…/draft`, a published connection without."""
    suffix = '/draft' if state == 'draft' else ''
    return f'{BASE}/{form_connection_id}{suffix}'


def _delete(client: TestClient, state: State, form_connection_id: str) -> Any:
    """Delete the connection through the API; the answer's `data`."""
    response = client.request('DELETE', _delete_url(state, form_connection_id), json={})
    assert response.status_code == 200, response.json()
    assert response.json()['message'] == MESSAGES[state]
    return response.json()['data']


def _row(form_connection_id: str) -> FormConnection:
    with SessionLocal() as db:
        row = db.get(FormConnection, form_connection_id)
    assert row is not None
    return row


def _user_id() -> str:
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
    assert user_id is not None
    return user_id


def _newest_entry(form_connection_id: str) -> tuple[str, str | None, str | None, bool]:
    """The connection's newest activity entry: its kind and person."""
    with SessionLocal() as db:
        entry = db.scalars(
            select(ConnectionActivity)
            .where(ConnectionActivity.form_connection_id == form_connection_id)
            .order_by(
                ConnectionActivity.occurred_at.desc(),
                ConnectionActivity.position.desc(),
            )
            .limit(1)
        ).one()
    return entry.kind, entry.actor_name, entry.agent_name, entry.approved


def _search_ids(client: TestClient, **params: Any) -> list[str]:
    response = client.get(f'{BASE}/search', params=params)
    assert response.status_code == 200, response.json()
    return [item['id'] for item in response.json()['data']['items']]


@pytest.mark.parametrize('state', STATES)
def test_deleting_answers_a_restorable_deletion_and_marks_the_row(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, state: State
) -> None:
    """A fresh id and the deleting account; restorable for DELETION_UNDO_SECONDS."""
    form_connection_id = _create(signed_in_client, state, 'T040 deleted')
    before = _row(form_connection_id)
    calls = len(fake_eudiplo.calls)
    started = now()

    deletion = _delete(signed_in_client, state, form_connection_id)

    assert deletion.keys() == {'id', 'restorable_until'}
    assert str(uuid.UUID(deletion['id'])) == deletion['id']
    row = _row(form_connection_id)
    assert row.deleted_at is not None
    assert started <= row.deleted_at <= now()
    assert (row.deletion_id, row.deleted_by_id) == (deletion['id'], _user_id())
    assert deletion['restorable_until'] == to_iso_utc(
        row.deleted_at + timedelta(seconds=settings.deletion_undo_seconds)
    )
    assert settings.deletion_undo_seconds == 300
    # Nothing else changes: the status, the dates and the content stay
    for column in FormConnection.__table__.columns.keys():
        if column not in ('deleted_at', 'deletion_id', 'deleted_by_id'):
            assert getattr(row, column) == getattr(before, column), column
    assert _newest_entry(form_connection_id) == ('deleted', TEST_USERNAME, None, False)
    # No EUDIPLO call
    assert len(fake_eudiplo.calls) == calls


def test_every_deletion_has_an_id_of_its_own(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    ids = {
        _delete(signed_in_client, state, _create(signed_in_client, state, state))['id']
        for state in STATES
    }

    assert len(ids) == len(STATES)


def test_the_restore_time_is_the_setting(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, 'deletion_undo_seconds', 20)
    form_connection_id = _create(signed_in_client, 'live', 'T040 twenty seconds')

    deletion = _delete(signed_in_client, 'live', form_connection_id)

    deleted_at = _row(form_connection_id).deleted_at
    assert deleted_at is not None
    assert deletion['restorable_until'] == to_iso_utc(
        deleted_at + timedelta(seconds=20)
    )


@pytest.mark.parametrize('state', STATES)
def test_deleting_keeps_updated_at(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, state: State
) -> None:
    """R15 V1: `flag_modified(row, 'updated_at')` keeps the column's value, so that
    a restored connection keeps its "Edited" date and its place in the list."""
    form_connection_id = _create(signed_in_client, state, 'T040 kept date')
    update_form_connection(form_connection_id, updated_at=LONG_AGO)

    _delete(signed_in_client, state, form_connection_id)

    row = _row(form_connection_id)
    assert row.deleted_at is not None
    assert row.updated_at == LONG_AGO


@pytest.mark.parametrize('state', STATES)
def test_a_deleted_connection_is_gone_from_every_read(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, state: State
) -> None:
    """FR-035: from the overview, the search, the details, the activity and the
    reads of an agent (the MCP server's), at once and for every status."""
    kept_id = _create(signed_in_client, state, 'T040 kept')
    form_connection_id = _create(signed_in_client, state, 'T040 gone')
    _, token = create_agent_authorization(_user_id(), 'read')
    agent = bearer_client(TestClient(app), token)
    for reader in (signed_in_client, agent):
        assert form_connection_id in _search_ids(reader, status=state)

    deletion = _delete(signed_in_client, state, form_connection_id)

    for reader in (signed_in_client, agent):
        listed = reader.get(BASE)
        assert listed.status_code == 200, listed.json()
        assert [item['id'] for item in listed.json()['data']] == [kept_id]
        assert _search_ids(reader) == [kept_id]
        assert _search_ids(reader, q='T040') == [kept_id]
        assert _search_ids(reader, q='gone') == []
        assert _search_ids(reader, status=state) == [kept_id]
        for path in (
            f'{BASE}/{form_connection_id}',
            f'{BASE}/{form_connection_id}/activity',
        ):
            response = reader.get(path)
            assert response.status_code == 404, path
            assert response.json() == NOT_FOUND
    # Deleting it again finds nothing, and the deletion stays as it was
    again = signed_in_client.request(
        'DELETE', _delete_url(state, form_connection_id), json={}
    )
    assert again.status_code == 404
    assert again.json() == NOT_FOUND
    row = _row(form_connection_id)
    assert row.deletion_id == deletion['id']
    # The row stays, as it was: a draft stays a draft
    assert (row.published_at is None) == (state == 'draft')


@pytest.mark.parametrize('state', STATES)
def test_a_deletion_an_approval_runs_cant_be_restored(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, state: State
) -> None:
    """FR-067: without a deletion id and an account, as an approved approval
    request runs the services, the deletion answers `id` null."""
    form_connection_id = _create(signed_in_client, state, 'T040 approved')
    approver = Actor(name=TEST_USERNAME, agent='Test agent', approved=True)

    with SessionLocal() as db:
        if state == 'draft':
            deletion = drafts.delete_draft(db, form_connection_id, 1, actor=approver)
        else:
            deletion = form_connections.delete_form_connection(
                db,
                form_connection_id,
                actor=approver,
                expected_active=state == 'live',
            )

    assert deletion == Deletion(id=None, restorable_until=None)
    row = _row(form_connection_id)
    assert row.deleted_at is not None
    assert (row.deletion_id, row.deleted_by_id) == (None, None)
    assert _newest_entry(form_connection_id) == (
        'deleted',
        TEST_USERNAME,
        'Test agent',
        True,
    )
    response = signed_in_client.get(f'{BASE}/{form_connection_id}')
    assert response.status_code == 404


# Restoring (T041; FR-034 to FR-036, FR-068, SC-005; R15 V4)

# Standard and a variant with two rules each: the variant's pull URL is a link
LIVE_RULES = rules_input(
    [main_branch([AGE_RULE, CLASS_RULE]), variant([AGE_RULE, CLASS_RULE])]
)


def _create_full(client: TestClient, state: State, name: str) -> str:
    """A connection in `state` with something in every part: a description, two
    documents, Standard and a variant with rules, and a draft's step."""
    if state == 'draft':
        return create_draft(
            client,
            name=name,
            description='T041 note',
            documents=FORM_CONNECTION['documents'],
            rules=draft_rules(
                [main_branch([AGE_RULE, CLASS_RULE]), variant([AGE_RULE, CLASS_RULE])]
            ),
            step='test',
        )
    start_date = None
    if state == 'scheduled':
        start_date = (start_dates.today_in_germany() + timedelta(days=30)).isoformat()
    form_connection_id = create_form_connection(
        client, name=name, rules=LIVE_RULES, start_date=start_date
    )
    if state == 'deactivated':
        response = client.post(f'{BASE}/{form_connection_id}/deactivate', json={})
        assert response.status_code == 200, response.json()
    return form_connection_id


def _restore_url(deletion_id: str) -> str:
    return f'{BASE}/deletions/{deletion_id}/restore'


def _restore(
    client: TestClient, deletion_id: str, headers: dict[str, str] | None = None
) -> Response:
    """Send "Undo": the restore of the deletion."""
    return client.post(_restore_url(deletion_id), json={}, headers=headers)


def _restored(client: TestClient, deletion_id: str) -> list[dict[str, Any]]:
    """Restore the deletion; the connections the answer brings back."""
    response = _restore(client, deletion_id)
    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Deletion restored'
    items: list[dict[str, Any]] = response.json()['data']['items']
    return items


def _stored(form_connection_id: str) -> dict[str, list[dict[str, Any]]]:
    """Everything stored about a connection, by table: its row, and the rows of
    every table with a `form_connection_id`. Read column by column without naming
    one, so that a column or a table added later is compared too."""
    stored: dict[str, list[dict[str, Any]]] = {}
    with SessionLocal() as db:
        for table in Base.metadata.sorted_tables:
            if table.name == FormConnection.__tablename__:
                column = table.c.id
            elif 'form_connection_id' in table.c:
                column = table.c.form_connection_id
            else:
                continue
            rows = db.execute(
                select(table).where(column == form_connection_id).order_by(table.c.id)
            ).mappings()
            stored[table.name] = [dict(row) for row in rows]
    return stored


def _read(client: TestClient, form_connection_id: str) -> dict[str, Any]:
    """The connection as `GET …/{id}` answers it."""
    response = client.get(f'{BASE}/{form_connection_id}')
    assert response.status_code == 200, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def _listed(client: TestClient, form_connection_id: str) -> dict[str, Any]:
    """The connection's row in the overview's list."""
    response = client.get(BASE)
    assert response.status_code == 200, response.json()
    items: list[dict[str, Any]] = response.json()['data']
    [item] = [item for item in items if item['id'] == form_connection_id]
    return item


def _activity(client: TestClient, form_connection_id: str) -> list[dict[str, Any]]:
    """The connection's activity as the details' card reads it, newest first."""
    response = client.get(f'{BASE}/{form_connection_id}/activity')
    assert response.status_code == 200, response.json()
    items: list[dict[str, Any]] = response.json()['data']['items']
    return items


def _signed_in(username: str) -> TestClient:
    """A new account `username`, signed in with a client of its own."""
    create_user(username)
    client = TestClient(app)
    response = client.post(
        '/api/auth/login', json={'username': username, 'password': TEST_PASSWORD}
    )
    assert response.status_code == 200
    return client


@pytest.mark.parametrize('state', STATES)
def test_a_restore_brings_the_connection_back_as_it_was(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, state: State
) -> None:
    """FR-034, SC-005: every stored column of the row and every row that refers to
    it are as before the deletion, `updated_at` too (R15 V1), so the connection
    keeps its place in the list; the activity has "Deleted" and "Restored" more.
    The requests the deletion cancelled stay cancelled (FR-035)."""
    form_connection_id = _create_full(signed_in_client, state, f'T041 {state}')
    if state == 'live':
        trigger(signed_in_client, form_connection_id)
    update_form_connection(form_connection_id, updated_at=LONG_AGO)
    stored = _stored(form_connection_id)
    read = _read(signed_in_client, form_connection_id)
    listed = _listed(signed_in_client, form_connection_id)
    activity = _activity(signed_in_client, form_connection_id)
    deletion = _delete(signed_in_client, state, form_connection_id)
    deleted = _stored(form_connection_id)
    calls = len(fake_eudiplo.calls)

    items = _restored(signed_in_client, deletion['id'])

    assert items == [listed]
    assert _listed(signed_in_client, form_connection_id) == listed
    restored = _stored(form_connection_id)
    assert (
        restored[FormConnection.__tablename__] == stored[FormConnection.__tablename__]
    )
    assert restored[FormConnection.__tablename__][0]['updated_at'] == LONG_AGO
    for table, rows in restored.items():
        if table == 'document_requests':
            # As the deletion left them: a pending request stays unavailable
            assert rows == deleted[table]
        elif table != 'connection_activity':
            assert rows == stored[table], table
    if state == 'live':
        assert [row['status'] for row in restored['document_requests']] == [
            'unavailable'
        ]
    # The activity as before, with the deletion and the restore on top
    entries = restored['connection_activity']
    assert all(row in entries for row in stored['connection_activity'])
    added = [row for row in entries if row not in stored['connection_activity']]
    assert sorted((row['kind'], row['actor_name']) for row in added) == [
        ('deleted', TEST_USERNAME),
        ('restored', TEST_USERNAME),
    ]
    assert [entry['kind'] for entry in _activity(signed_in_client, form_connection_id)][
        :2
    ] == ['restored', 'deleted']
    assert _activity(signed_in_client, form_connection_id)[2:] == activity
    # The details read as before, but for the closed card's line
    again = _read(signed_in_client, form_connection_id)
    assert again | {'last_activity': None} == read | {'last_activity': None}
    if state == 'deactivated':
        # While deactivated, the line shows the deactivation (data-model 2.5)
        assert again['last_activity'] == read['last_activity']
    else:
        assert again['last_activity']['kind'] == 'restored'
    # Nothing was set up again with EUDIPLO
    assert len(fake_eudiplo.calls) == calls


def test_a_restored_active_connection_works_again(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-034: the same links work again as its status says; the request that was
    in progress at the deletion stays unavailable (FR-035)."""
    form_connection_id = _create_full(signed_in_client, 'live', 'T041 links')
    pending = trigger(signed_in_client, form_connection_id)['reference']
    variant_id = _read(signed_in_client, form_connection_id)['branches'][1]['id']
    deletion = _delete(signed_in_client, 'live', form_connection_id)
    stopped = signed_in_client.post(requests_url(form_connection_id))
    assert (stopped.status_code, stopped.json()) == (409, UNAVAILABLE)

    _restored(signed_in_client, deletion['id'])

    started = trigger(signed_in_client, form_connection_id)['reference']
    for url in (
        pull_url(form_connection_id, started),
        branch_pull_url(form_connection_id, variant_id, started),
    ):
        pulled = signed_in_client.get(url)
        assert pulled.status_code == 200, pulled.json()
        assert pulled.json()['data']['status'] == 'pending'
    assert stored_request(pending).status == 'unavailable'
    old = signed_in_client.get(pull_url(form_connection_id, pending))
    assert old.status_code == 200, old.json()
    assert old.json()['data']['status'] == 'unavailable'


def test_a_second_restore_changes_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-036: a second "Undo" (a replayed request) answers 409 `not_restorable`,
    in the request's language, and leaves the restored connection as it is."""
    form_connection_id = _create_full(signed_in_client, 'live', 'T041 twice')
    deletion = _delete(signed_in_client, 'live', form_connection_id)
    _restored(signed_in_client, deletion['id'])
    restored = _stored(form_connection_id)

    again = _restore(signed_in_client, deletion['id'])
    german = _restore(signed_in_client, deletion['id'], {'Accept-Language': 'de'})

    assert (again.status_code, again.json()) == (409, NOT_RESTORABLE)
    assert (german.status_code, german.json()) == (
        409,
        {
            'error': 'not_restorable',
            'message': 'Das kann nicht mehr wiederhergestellt werden.',
        },
    )
    assert _stored(form_connection_id) == restored


def test_with_a_restore_time_of_0_nothing_can_be_restored(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """data-model 8: DELETION_UNDO_SECONDS 0 switches restoring off; the deletion's
    `restorable_until` is its own time."""
    monkeypatch.setattr(settings, 'deletion_undo_seconds', 0)
    form_connection_id = _create_full(signed_in_client, 'draft', 'T041 off')
    deletion = _delete(signed_in_client, 'draft', form_connection_id)
    deleted_at = _row(form_connection_id).deleted_at
    assert deleted_at is not None
    assert deletion['restorable_until'] == to_iso_utc(deleted_at)
    deleted = _stored(form_connection_id)

    response = _restore(signed_in_client, deletion['id'])

    assert (response.status_code, response.json()) == (409, NOT_RESTORABLE)
    assert _stored(form_connection_id) == deleted
    assert signed_in_client.get(f'{BASE}/{form_connection_id}').status_code == 404


def test_the_restore_time_ends_deletion_undo_seconds_after_the_deletion(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """FR-036 with DELETION_UNDO_SECONDS 1: at `restorable_until` the deletion is
    final and nothing changes; a microsecond before, it is restored. The clock is
    read under the row locks (`deletions._now`)."""
    monkeypatch.setattr(settings, 'deletion_undo_seconds', 1)
    form_connection_id = _create_full(signed_in_client, 'scheduled', 'T041 second')
    deletion = _delete(signed_in_client, 'scheduled', form_connection_id)
    deleted_at = _row(form_connection_id).deleted_at
    assert deleted_at is not None
    restorable_until = deleted_at + timedelta(seconds=1)
    assert deletion['restorable_until'] == to_iso_utc(restorable_until)
    deleted = _stored(form_connection_id)

    monkeypatch.setattr(deletions, '_now', lambda: restorable_until)
    late = _restore(signed_in_client, deletion['id'])

    assert (late.status_code, late.json()) == (409, NOT_RESTORABLE)
    assert _stored(form_connection_id) == deleted

    just_in_time = restorable_until - timedelta(microseconds=1)
    monkeypatch.setattr(deletions, '_now', lambda: just_in_time)

    assert [item['id'] for item in _restored(signed_in_client, deletion['id'])] == [
        form_connection_id
    ]
    assert _row(form_connection_id).deleted_at is None


def test_only_the_account_that_deleted_can_restore(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-036: another team member's "Undo" answers `not_restorable` and changes
    nothing; the one who deleted can still restore."""
    form_connection_id = _create_full(signed_in_client, 'live', 'T041 mine')
    deletion = _delete(signed_in_client, 'live', form_connection_id)
    deleted = _stored(form_connection_id)

    response = _restore(_signed_in('bob'), deletion['id'])

    assert (response.status_code, response.json()) == (409, NOT_RESTORABLE)
    assert _stored(form_connection_id) == deleted
    _restored(signed_in_client, deletion['id'])


@pytest.mark.parametrize('level', ['read', 'drafts', 'manage'])
def test_an_agent_cant_restore(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, level: AccessLevel
) -> None:
    """FR-068: no agent restores, not even one of the account that deleted, with
    the highest level: 403 `browser_only`, and nothing changes."""
    form_connection_id = _create_full(signed_in_client, 'draft', 'T041 agent')
    deletion = _delete(signed_in_client, 'draft', form_connection_id)
    deleted = _stored(form_connection_id)
    _, token = create_agent_authorization(_user_id(), level)
    agent = bearer_client(TestClient(app), token)

    response = _restore(agent, deletion['id'])

    assert (response.status_code, response.json()) == (403, BROWSER_ONLY)
    assert _stored(form_connection_id) == deleted
    _restored(signed_in_client, deletion['id'])


def test_restoring_needs_a_session_and_a_json_body(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The management API's rules: 401 without a session, 415 without JSON (the
    CSRF protection); neither restores."""
    form_connection_id = _create_full(signed_in_client, 'live', 'T041 rules')
    deletion = _delete(signed_in_client, 'live', form_connection_id)
    deleted = _stored(form_connection_id)

    anonymous = _restore(TestClient(app), deletion['id'])
    not_json = signed_in_client.post(
        _restore_url(deletion['id']),
        content='{}',
        headers={'Content-Type': 'text/plain'},
    )

    assert anonymous.status_code == 401
    assert not_json.status_code == 415
    assert _stored(form_connection_id) == deleted


def test_the_restore_route_is_not_taken_by_a_connections_route(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """R15 V4: `POST …/deletions/{id}/restore` is declared before
    `/{form_connection_id}`: an unknown deletion gets the restore's own answer,
    and the connections' routes answer as before."""
    unknown = _restore(signed_in_client, str(uuid.uuid4()))
    not_a_connection = signed_in_client.get(f'{BASE}/deletions')

    assert (unknown.status_code, unknown.json()) == (409, NOT_RESTORABLE)
    assert (not_a_connection.status_code, not_a_connection.json()) == (404, NOT_FOUND)


def _one_deletion(deletion_id: str, form_connection_ids: list[str]) -> None:
    """Mark the rows as deleted together, one deletion of several connections, as
    the bulk deletion does (spec 010, FR-041)."""
    with SessionLocal() as db:
        db.execute(
            update(FormConnection)
            .where(FormConnection.id.in_(form_connection_ids))
            # Kept, as a deletion keeps it: the column's `onupdate` would move it
            .values(deletion_id=deletion_id, updated_at=FormConnection.updated_at)
        )
        db.commit()


def test_a_deletion_of_several_connections_comes_back_whole(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """R5: one restore brings back every row of the deletion, answered in the
    overview's order, most recently updated first."""
    ids = [_create_full(signed_in_client, state, f'T041 {state}') for state in STATES]
    order = [item['id'] for item in signed_in_client.get(BASE).json()['data']]
    listed = {id_: _listed(signed_in_client, id_) for id_ in ids}
    deleted = [
        _delete(signed_in_client, state, id_)
        for state, id_ in zip(STATES, ids, strict=True)
    ]
    _one_deletion(deleted[0]['id'], ids)

    items = _restored(signed_in_client, deleted[0]['id'])

    assert [item['id'] for item in items] == order
    assert items == [listed[id_] for id_ in order]
    assert [item['id'] for item in signed_in_client.get(BASE).json()['data']] == order


@pytest.mark.parametrize('spoiler', ['past its restore time', "another account's"])
def test_a_deletion_of_several_connections_comes_back_whole_or_not_at_all(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, spoiler: str
) -> None:
    """R5: all rows or none; one row that can't be restored keeps every row of the
    deletion deleted."""
    ids = [
        _create_full(signed_in_client, 'draft', 'T041 draft'),
        _create_full(signed_in_client, 'live', 'T041 live'),
    ]
    deletion = _delete(signed_in_client, 'draft', ids[0])
    _delete(signed_in_client, 'live', ids[1])
    _one_deletion(deletion['id'], ids)
    if spoiler == 'past its restore time':
        update_form_connection(
            ids[1],
            deleted_at=now() - timedelta(seconds=settings.deletion_undo_seconds + 1),
        )
    else:
        update_form_connection(ids[1], deleted_by_id=create_user('bob'))
    deleted = [_stored(id_) for id_ in ids]

    response = _restore(signed_in_client, deletion['id'])

    assert (response.status_code, response.json()) == (409, NOT_RESTORABLE)
    assert [_stored(id_) for id_ in ids] == deleted


def test_a_restored_connection_whose_start_date_came_is_started_by_the_worker(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """§4.1 call 5: the deletion keeps `start_date`, the worker skips the deleted
    row on its day, and the restore leaves it scheduled and activates nothing; the
    worker's next cycle makes it active, as of its start."""
    form_connection_id = _create_full(signed_in_client, 'scheduled', 'T041 day')
    start_date = _row(form_connection_id).start_date
    assert start_date is not None
    deletion = _delete(signed_in_client, 'scheduled', form_connection_id)
    monkeypatch.setattr(start_dates, 'today_in_germany', lambda: start_date)
    worker.activate_scheduled_connections()
    assert _row(form_connection_id).start_date == start_date

    [item] = _restored(signed_in_client, deletion['id'])

    assert (item['state'], item['start_date']) == ('scheduled', start_date.isoformat())
    row = _row(form_connection_id)
    assert (row.is_active, row.start_date, row.activated_at) == (
        False,
        start_date,
        None,
    )

    worker.activate_scheduled_connections()

    row = _row(form_connection_id)
    assert (row.is_active, row.start_date, row.activated_at) == (
        True,
        None,
        start_dates.start_instant(start_date),
    )
    assert _newest_entry(form_connection_id) == ('became_active', None, None, False)


# Making a deletion final (T042; FR-030, FR-036, SC-005; R15 V10)


def _after_the_restore_time() -> datetime:
    """A moment just after the restore time of a deletion made now."""
    return now() + timedelta(seconds=settings.deletion_undo_seconds + 1)


def _move_clock(monkeypatch: pytest.MonkeyPatch, at: datetime) -> None:
    """Move the clocks of the restore and of the worker's steps that wait for it."""
    monkeypatch.setattr(worker, '_now', lambda: at)
    monkeypatch.setattr(deletions, '_now', lambda: at)


def _clean_up() -> None:
    """The worker's steps that a deletion concerns, called directly, in order."""
    worker.delete_eudiplo_sessions()
    worker.delete_unused_configs()
    worker.finish_deletions()


def _configs_of(fake_eudiplo: FakeEudiplo, form_connection_id: str) -> set[str]:
    """The connection's configurations that the fake EUDIPLO holds."""
    return {
        config_id
        for config_id in fake_eudiplo.configs
        if form_connection_id in config_id
    }


def _revision_id(form_connection_id: str, number: int) -> str:
    with SessionLocal() as db:
        revision_id = db.scalar(
            select(FormConnectionRevision.id).where(
                FormConnectionRevision.form_connection_id == form_connection_id,
                FormConnectionRevision.revision == number,
            )
        )
    assert revision_id is not None
    return revision_id


def _errors(caplog: pytest.LogCaptureFixture) -> list[str]:
    """The error lines: a call that the worker's pool runs is logged, not raised."""
    return [
        record.getMessage()
        for record in caplog.records
        if record.levelno >= logging.ERROR
    ]


@pytest.mark.parametrize('state', STATES)
def test_inside_the_restore_time_the_worker_keeps_everything(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    state: State,
) -> None:
    """R5: while the deletion can be restored, the worker deletes neither the
    configurations nor the activity nor a draft's row; a restored connection keeps
    them after the restore time too. The step's query itself waits: it selects
    none of the connection's configurations, before the check under the lock."""
    form_connection_id = _create_full(signed_in_client, state, f'T042 {state}')
    configs = _configs_of(fake_eudiplo, form_connection_id)
    assert (configs == set()) == (state == 'draft')
    deletion = _delete(signed_in_client, state, form_connection_id)
    deleted = _stored(form_connection_id)
    check = form_connections.delete_unused_config
    checked: list[str] = []

    def recorded_check(
        db: Session, revision_id: str, *, deleted_before: datetime
    ) -> None:
        checked.append(revision_id)
        check(db, revision_id, deleted_before=deleted_before)

    monkeypatch.setattr(form_connections, 'delete_unused_config', recorded_check)

    _clean_up()

    assert checked == []
    assert _stored(form_connection_id) == deleted
    assert _configs_of(fake_eudiplo, form_connection_id) == configs

    _restored(signed_in_client, deletion['id'])
    restored = _stored(form_connection_id)
    _move_clock(monkeypatch, _after_the_restore_time())
    _clean_up()

    assert checked == []
    assert _stored(form_connection_id) == restored
    assert _configs_of(fake_eudiplo, form_connection_id) == configs
    assert 'delete_config' not in fake_eudiplo.call_names()
    assert _errors(caplog) == []


@pytest.mark.parametrize('state', STATES)
def test_after_the_restore_time_the_deletion_is_final(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    state: State,
) -> None:
    """FR-030, SC-005: nothing restores it any more; its activity is gone, and a
    draft's row, as deleting removed it before this feature, with its URLs
    answering 404; a published connection's row stays without its
    configurations, and its URLs answer 409 `unavailable` for good. Another
    connection keeps everything. The step logs the two counts only."""
    caplog.set_level(logging.INFO, logger=deletions.__name__)
    kept_id = _create_full(signed_in_client, state, 'T042 kept')
    kept = _stored(kept_id)
    kept_configs = _configs_of(fake_eudiplo, kept_id)
    form_connection_id = _create_full(signed_in_client, state, 'T042 final')
    pending = None
    if state == 'live':
        pending = trigger(signed_in_client, form_connection_id)['reference']
    deletion = _delete(signed_in_client, state, form_connection_id)
    entries = len(_stored(form_connection_id)['connection_activity'])
    assert entries > 0
    _move_clock(monkeypatch, _after_the_restore_time())

    refused = _restore(signed_in_client, deletion['id'])
    _clean_up()

    assert (refused.status_code, refused.json()) == (409, NOT_RESTORABLE)
    stored = _stored(form_connection_id)
    assert stored['connection_activity'] == []
    triggered = signed_in_client.post(requests_url(form_connection_id))
    if state == 'draft':
        assert stored[FormConnection.__tablename__] == []
        assert stored['form_connection_revisions'] == []
        assert triggered.status_code == 404
    else:
        [row] = stored[FormConnection.__tablename__]
        assert row['deleted_at'] is not None
        assert row['deletion_id'] == deletion['id']
        assert _configs_of(fake_eudiplo, form_connection_id) == set()
        assert [
            revision['eudiplo_config_deleted_at'] is not None
            for revision in stored['form_connection_revisions']
        ] == [True]
        assert (triggered.status_code, triggered.json()) == (409, UNAVAILABLE)
    if pending is not None:
        pulled = signed_in_client.get(pull_url(form_connection_id, pending))
        assert (pulled.status_code, pulled.json()) == (409, UNAVAILABLE)
    assert _stored(kept_id) == kept
    assert _configs_of(fake_eudiplo, kept_id) == kept_configs
    [line] = [
        record
        for record in caplog.records
        if record.name == deletions.__name__ and record.msg.startswith('Finished')
    ]
    assert line.args == (entries, 1 if state == 'draft' else 0)
    assert _errors(caplog) == []


@pytest.mark.parametrize(
    'deleted_again', [False, True], ids=['restored', 'deleted again']
)
def test_a_restore_between_the_selection_and_the_check_keeps_the_configuration(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    deleted_again: bool,
) -> None:
    """R15 V10: by the step's clock the restore time has passed when it selects
    the configuration; a restore at the last second, by the restore's clock,
    commits before the step's check under the row lock. The check finds the
    connection restored, and EUDIPLO isn't called. Deleted again meanwhile, the
    connection's new deletion is inside its restore time at the check, so the
    configuration stays for its "Undo" too."""
    form_connection_id = _create_full(signed_in_client, 'live', 'T042 last second')
    configs = _configs_of(fake_eudiplo, form_connection_id)
    deletion = _delete(signed_in_client, 'live', form_connection_id)
    deleted_at = _row(form_connection_id).deleted_at
    assert deleted_at is not None
    # The worker's clock only, a microsecond past the deletion's restore time; the
    # restore's is the real one, inside it, and so is a deletion made meanwhile
    past = deleted_at + timedelta(
        seconds=settings.deletion_undo_seconds, microseconds=1
    )
    monkeypatch.setattr(worker, '_now', lambda: past)
    check = form_connections.delete_unused_config
    checked: list[str] = []
    again: list[dict[str, Any]] = []

    def restore_then_check(
        db: Session, revision_id: str, *, deleted_before: datetime
    ) -> None:
        if not checked:
            _restored(signed_in_client, deletion['id'])
            if deleted_again:
                again.append(_delete(signed_in_client, 'live', form_connection_id))
        checked.append(revision_id)
        check(db, revision_id, deleted_before=deleted_before)

    monkeypatch.setattr(form_connections, 'delete_unused_config', restore_then_check)

    worker.delete_unused_configs()

    # The step did select the configuration
    assert checked == [_revision_id(form_connection_id, 1)]
    assert 'delete_config' not in fake_eudiplo.call_names()
    assert _configs_of(fake_eudiplo, form_connection_id) == configs
    assert (
        _stored(form_connection_id)['form_connection_revisions'][0][
            'eudiplo_config_deleted_at'
        ]
        is None
    )
    assert _errors(caplog) == []
    if deleted_again:
        _restored(signed_in_client, again[0]['id'])
    trigger(signed_in_client, form_connection_id)


def _wait_for_a_lock_wait() -> None:
    """Return once a session of the test database waits for a lock."""
    deadline = time.monotonic() + JOIN_TIMEOUT
    while time.monotonic() < deadline:
        # A transaction of its own each time: a transaction reads the sessions'
        # activity once
        with engine.connect() as connection:
            waiting = connection.scalar(
                text(
                    'SELECT count(*) FROM pg_stat_activity '
                    'WHERE datname = current_database() '
                    "AND wait_event_type = 'Lock'"
                )
            )
        if waiting:
            return
        time.sleep(0.01)
    raise AssertionError('No session waited for a lock')


def test_a_restore_holding_the_row_lock_makes_the_check_wait_and_keeps_the_config(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """R15 V10 with the locks themselves: the restore holds the row lock, not yet
    committed, when the step selects the configuration, so the row still reads
    deleted and past its time by the step's clock. The step's check waits for the
    row lock and, once the restore commits, finds the connection restored; a
    check that didn't lock the row would read it deleted and delete the
    configuration."""
    form_connection_id = _create_full(signed_in_client, 'live', 'T042 locked')
    configs = _configs_of(fake_eudiplo, form_connection_id)
    deletion = _delete(signed_in_client, 'live', form_connection_id)
    user_id = _user_id()
    monkeypatch.setattr(worker, '_now', _after_the_restore_time)
    locked = threading.Event()
    go_on = threading.Event()
    clock = deletions._now

    def clock_once_locked() -> datetime:
        # The restore reads its clock once it holds the row locks
        locked.set()
        assert go_on.wait(JOIN_TIMEOUT)
        return clock()

    monkeypatch.setattr(deletions, '_now', clock_once_locked)
    check = form_connections.delete_unused_config
    checked: list[str] = []

    def recorded_check(
        db: Session, revision_id: str, *, deleted_before: datetime
    ) -> None:
        checked.append(revision_id)
        check(db, revision_id, deleted_before=deleted_before)

    monkeypatch.setattr(form_connections, 'delete_unused_config', recorded_check)

    def restore() -> list[FormConnectionSummary]:
        with SessionLocal() as db:
            return deletions.restore_deletion(
                db,
                deletion['id'],
                account_id=user_id,
                actor=Actor(name=TEST_USERNAME),
            )

    def clean_up() -> None:
        assert locked.wait(JOIN_TIMEOUT)
        worker.delete_unused_configs()

    def go_on_once_the_check_waits() -> None:
        try:
            assert locked.wait(JOIN_TIMEOUT)
            _wait_for_a_lock_wait()
        finally:
            go_on.set()

    restored, cleaned, waited = run_in_threads(
        restore, clean_up, go_on_once_the_check_waits
    )

    assert isinstance(restored, list)
    assert [item.id for item in restored] == [form_connection_id]
    assert (cleaned, waited) == (None, None)
    assert checked == [_revision_id(form_connection_id, 1)]
    assert 'delete_config' not in fake_eudiplo.call_names()
    assert _configs_of(fake_eudiplo, form_connection_id) == configs
    assert _errors(caplog) == []
    assert _row(form_connection_id).deleted_at is None
    trigger(signed_in_client, form_connection_id)


def test_finishing_skips_a_row_another_transaction_holds(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """`SKIP LOCKED`: the step doesn't wait for a row that another transaction
    holds, and a later cycle finishes it; the other rows are finished at once."""
    held_id = _create_full(signed_in_client, 'draft', 'T042 held')
    other_id = _create_full(signed_in_client, 'draft', 'T042 other')
    for form_connection_id in (held_id, other_id):
        _delete(signed_in_client, 'draft', form_connection_id)
    _move_clock(monkeypatch, _after_the_restore_time())

    with SessionLocal() as holder:
        holder.execute(
            select(FormConnection.id)
            .where(FormConnection.id == held_id)
            .with_for_update()
        )
        # In a thread: a step that waited for the lock would fail the test
        assert run_in_threads(worker.finish_deletions) == [None]
        assert _stored(other_id)[FormConnection.__tablename__] == []
        held = _stored(held_id)
        assert len(held[FormConnection.__tablename__]) == 1
        assert held['connection_activity'] != []

    worker.finish_deletions()

    held = _stored(held_id)
    assert held[FormConnection.__tablename__] == held['connection_activity'] == []


def test_finishing_takes_every_final_deletion_in_short_transactions(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Batches of FINISH_BATCH_SIZE rows, a commit each, until none is left, in
    one step. A deletion that an approval request ran, which has no id, is final
    after the same time. Logs the two counts only."""
    caplog.set_level(logging.INFO, logger=deletions.__name__)
    monkeypatch.setattr(deletions, 'FINISH_BATCH_SIZE', 2)
    draft_ids = [
        _create(signed_in_client, 'draft', f'T042 draft {n}') for n in range(3)
    ]
    live_ids = [_create(signed_in_client, 'live', f'T042 live {n}') for n in range(2)]
    approved_id = _create(signed_in_client, 'draft', 'T042 approved')
    kept_id = _create(signed_in_client, 'live', 'T042 kept')
    for form_connection_id in draft_ids:
        _delete(signed_in_client, 'draft', form_connection_id)
    for form_connection_id in live_ids:
        _delete(signed_in_client, 'live', form_connection_id)
    approver = Actor(name=TEST_USERNAME, agent='Test agent', approved=True)
    with SessionLocal() as db:
        drafts.delete_draft(db, approved_id, 1, actor=approver)
    removed_ids = [*draft_ids, approved_id]
    entries = sum(
        len(_stored(form_connection_id)['connection_activity'])
        for form_connection_id in [*removed_ids, *live_ids]
    )
    kept = _stored(kept_id)
    _move_clock(monkeypatch, _after_the_restore_time())
    commits: list[None] = []
    commit = Session.commit

    def counted_commit(self: Session) -> None:
        commits.append(None)
        commit(self)

    monkeypatch.setattr(Session, 'commit', counted_commit)

    worker.finish_deletions()

    # Six rows, two a transaction
    assert len(commits) == 3
    for form_connection_id in removed_ids:
        assert _stored(form_connection_id)[FormConnection.__tablename__] == []
    for form_connection_id in live_ids:
        stored = _stored(form_connection_id)
        assert len(stored[FormConnection.__tablename__]) == 1
        assert stored['connection_activity'] == []
    assert _stored(kept_id) == kept
    [line] = [record for record in caplog.records if record.name == deletions.__name__]
    assert line.getMessage() == (
        f'Finished deletions: {entries} activity entries and 4 drafts deleted'
    )
    assert line.args == (entries, 4)
