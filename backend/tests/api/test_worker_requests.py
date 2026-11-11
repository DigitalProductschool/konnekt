"""The worker's steps for document requests (research R6 to R8, quickstart V6)."""

import uuid
from collections.abc import Callable
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.config import settings
from app.db import SessionLocal
from app.models import DocumentRequest
from app.services import form_connections, worker
from tests.fake_eudiplo import FakeEudiplo, FakeSession
from tests.helpers import (
    DELIVERED_DOCUMENTS,
    FORM_CONNECTION,
    create_form_connection,
    fail_in_wallet,
    main_branch,
    now,
    pull_url,
    share,
    stored_request,
    trigger,
    update_request,
)


def _triggered(client: TestClient, count: int = 1) -> list[str]:
    """References of requests triggered on one new form connection."""
    form_connection_id = create_form_connection(client)
    return [trigger(client, form_connection_id)['reference'] for _ in range(count)]


def _session_id(reference: str) -> str:
    return stored_request(reference).eudiplo_session_id


def _list_calls(fake: FakeEudiplo) -> list[datetime]:
    """The updatedFrom of each list call so far."""
    return [
        datetime.fromisoformat(call.request.url.params['updatedFrom'])
        for call in fake.calls
        if call.name == 'list_sessions'
    ]


def _millis(value: datetime) -> datetime:
    # The client sends times in milliseconds, cut off rather than rounded
    utc = value.astimezone(timezone.utc)
    return utc.replace(microsecond=utc.microsecond // 1000 * 1000)


def _unknown_session(updated_at: datetime, status: str = 'completed') -> FakeSession:
    # A session of another environment in the shared tenant
    return FakeSession(
        id=str(uuid.uuid4()),
        request_id='fc-elsewhere-r1',
        reference=str(uuid.uuid4()),
        status=status,  # type: ignore[arg-type]
        updated_at=updated_at,
    )


# Sync (research R6)


def test_the_sync_applies_each_answer_to_its_request(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    shared, declined, rejected, waiting = _triggered(signed_in_client, 4)
    shared_at = share(fake_eudiplo, shared, consumed_at=now() - timedelta(seconds=3))
    fail_in_wallet(fake_eudiplo, declined, 'access_denied')
    fail_in_wallet(fake_eudiplo, rejected, 'trust_chain_not_trusted')
    fake_eudiplo.set_session(_session_id(waiting), 'fetched')

    worker.sync_sessions()

    request = stored_request(shared)
    assert request.status == 'completed'
    # EUDIPLO's consumedAt, which has milliseconds
    assert request.completed_at == _millis(shared_at)
    assert request.failure_code is None
    # Completed requests end with the delivery or deletion of their documents
    assert request.ended_at is None
    request = stored_request(declined)
    assert (request.status, request.failure_code) == ('declined', 'access_denied')
    assert request.ended_at == request.status_changed_at
    request = stored_request(rejected)
    assert (request.status, request.failure_code) == (
        'verification_failed',
        'trust_chain_not_trusted',
    )
    assert stored_request(waiting).status == 'pending'
    # The list carried the outcomes, so no session was read on its own
    assert 'get_session' not in fake_eudiplo.call_names()


def test_the_sync_ignores_sessions_it_doesnt_know(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    stranger = _unknown_session(now())
    fake_eudiplo.sessions[stranger.id] = stranger

    worker.sync_sessions()

    assert stored_request(reference).status == 'pending'
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(DocumentRequest)) == 1


def test_the_sync_changes_no_request_that_isnt_pending(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    update_request(reference, status='expired', ended_at=now())
    share(fake_eudiplo, reference)

    worker.sync_sessions()

    request = stored_request(reference)
    assert request.status == 'expired'
    assert request.completed_at is None


def test_without_a_pending_request_the_sync_calls_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    update_request(reference, status='declined', ended_at=now())

    worker.sync_sessions()

    assert 'list_sessions' not in fake_eudiplo.call_names()


def test_the_cursor_follows_the_latest_update_less_five_seconds(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    created_at = stored_request(reference).created_at
    session_id = _session_id(reference)
    fake_eudiplo.set_session(
        session_id, 'active', updated_at=created_at + timedelta(seconds=1)
    )

    # After a start, the sync begins at the oldest pending request
    worker.sync_sessions()
    worker.sync_sessions()
    fake_eudiplo.set_session(
        session_id, 'fetched', updated_at=created_at + timedelta(seconds=60)
    )
    worker.sync_sessions()
    worker.sync_sessions()

    assert _list_calls(fake_eudiplo) == [
        _millis(created_at - timedelta(seconds=5)),
        _millis(created_at - timedelta(seconds=4)),
        _millis(created_at - timedelta(seconds=4)),
        _millis(created_at + timedelta(seconds=55)),
    ]


def test_the_sync_starts_no_earlier_than_the_oldest_pending_request(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    (reference,) = _triggered(signed_in_client)
    created_at = stored_request(reference).created_at
    # A cursor from long before: older updates can't concern a pending request
    monkeypatch.setattr(worker, '_sync_cursor', created_at - timedelta(hours=1))

    worker.sync_sessions()

    assert _list_calls(fake_eudiplo) == [_millis(created_at - timedelta(seconds=5))]


def test_the_sync_reads_every_page(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    start = _millis(stored_request(reference).created_at)
    strangers = [
        _unknown_session(start + timedelta(milliseconds=index)) for index in range(150)
    ]
    for stranger in strangers:
        fake_eudiplo.sessions[stranger.id] = stranger
    share(fake_eudiplo, reference)
    # Shared after every other update, so it is on the second page
    fake_eudiplo.sessions[_session_id(reference)].updated_at = start + timedelta(
        milliseconds=200
    )

    worker.sync_sessions()

    assert stored_request(reference).status == 'completed'
    # The second page starts at the last update of the first
    assert _list_calls(fake_eudiplo) == [
        _millis(start - timedelta(seconds=5)),
        strangers[99].updated_at,
    ]


def test_a_page_that_shares_one_update_is_followed_by_the_next_page(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    at_once = _millis(stored_request(reference).created_at)
    for _ in range(120):
        stranger = _unknown_session(at_once)
        fake_eudiplo.sessions[stranger.id] = stranger
    share(fake_eudiplo, reference)

    worker.sync_sessions()

    assert stored_request(reference).status == 'completed'
    pages = [
        call.request.url.params['page']
        for call in fake_eudiplo.calls
        if call.name == 'list_sessions'
    ]
    assert pages == ['1', '1', '2']


def test_the_sync_reads_a_session_whose_outcome_the_list_leaves_out(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    shared, declined = _triggered(signed_in_client, 2)
    shared_at = share(fake_eudiplo, shared)
    fail_in_wallet(fake_eudiplo, declined, 'access_denied')
    fake_eudiplo.list_without_outcome = True

    worker.sync_sessions()

    request = stored_request(shared)
    assert request.status == 'completed'
    assert request.completed_at == _millis(shared_at)
    request = stored_request(declined)
    assert (request.status, request.failure_code) == ('declined', 'access_denied')
    assert fake_eudiplo.call_names().count('get_session') == 2


# Expiry: the last check (research R7, step 2)


def _expire(reference: str) -> None:
    update_request(reference, expires_at=now() - timedelta(seconds=1))


def test_the_last_check_runs_as_soon_as_a_request_expires(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    expired, running = _triggered(signed_in_client, 2)
    _expire(expired)

    worker.expire_requests()

    request = stored_request(expired)
    assert request.status == 'expired'
    assert request.ended_at is not None
    assert stored_request(running).status == 'pending'
    # Only the expired request's session was read
    (call,) = [call for call in fake_eudiplo.calls if call.name == 'get_session']
    assert call.request.url.path.endswith(_session_id(expired))


@pytest.mark.parametrize(
    ('failure_code', 'status'),
    [
        (None, 'completed'),
        ('access_denied', 'declined'),
        ('x5c_missing', 'verification_failed'),
    ],
)
def test_an_answer_found_by_the_last_check_counts(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    failure_code: str | None,
    status: str,
) -> None:
    (reference,) = _triggered(signed_in_client)
    if status == 'completed':
        share(fake_eudiplo, reference)
    else:
        fail_in_wallet(fake_eudiplo, reference, failure_code)
    _expire(reference)

    worker.expire_requests()

    request = stored_request(reference)
    assert request.status == status
    assert request.failure_code == failure_code
    # The worker drops the documents: only a pull delivers them
    assert request.documents_delivered_at is None


def test_a_session_gone_at_the_last_check_expires_the_request(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    fake_eudiplo.sessions.clear()
    _expire(reference)

    worker.expire_requests()

    request = stored_request(reference)
    assert request.status == 'expired'
    assert request.eudiplo_session_deleted_at is not None


def test_a_failed_last_check_is_tried_again(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    _expire(reference)
    fake_eudiplo.fail('get_session', 500)

    worker.expire_requests()
    assert stored_request(reference).status == 'pending'
    worker.expire_requests()

    assert stored_request(reference).status == 'expired'


# Deleting EUDIPLO sessions (research R8)


def _session_gone(fake: FakeEudiplo, reference: str) -> bool:
    request = stored_request(reference)
    gone = request.eudiplo_session_id not in fake.sessions
    assert gone == (request.eudiplo_session_deleted_at is not None)
    return gone


def _delivered(client: TestClient, fake: FakeEudiplo) -> str:
    """A request whose documents a pull has delivered."""
    form_connection_id = create_form_connection(client)
    reference = trigger(client, form_connection_id)['reference']
    share(fake, reference)
    worker.sync_sessions()
    response = client.get(pull_url(form_connection_id, reference))
    assert response.json()['data']['documents'] == DELIVERED_DOCUMENTS
    return reference


def test_a_session_is_deleted_when_the_repeat_window_ends(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    window_over = _delivered(signed_in_client, fake_eudiplo)
    in_window = _delivered(signed_in_client, fake_eudiplo)
    window = timedelta(seconds=settings.pull_repeat_window_seconds)
    update_request(window_over, documents_delivered_at=now() - window)
    update_request(
        in_window, documents_delivered_at=now() - window + timedelta(seconds=5)
    )
    ended_at = stored_request(window_over).ended_at

    worker.delete_eudiplo_sessions()

    assert _session_gone(fake_eudiplo, window_over)
    # It ended with the delivery, not with the deletion
    assert stored_request(window_over).ended_at == ended_at
    assert not _session_gone(fake_eudiplo, in_window)


@pytest.mark.parametrize(
    'status', ['declined', 'verification_failed', 'expired', 'unavailable']
)
def test_a_session_is_deleted_at_once_after_any_other_final_status(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, status: str
) -> None:
    (reference,) = _triggered(signed_in_client)
    ended_at = now()
    update_request(reference, status=status, ended_at=ended_at)

    worker.delete_eudiplo_sessions()

    assert _session_gone(fake_eudiplo, reference)
    assert stored_request(reference).ended_at == ended_at


def test_documents_never_collected_are_deleted_30_minutes_less_a_minute_after_sharing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    due, not_yet = _triggered(signed_in_client, 2)
    for reference in (due, not_yet):
        share(fake_eudiplo, reference)
    worker.sync_sessions()
    limit = timedelta(seconds=settings.document_retention_seconds - 60)
    update_request(due, completed_at=now() - limit)
    update_request(not_yet, completed_at=now() - limit + timedelta(seconds=30))

    worker.delete_eudiplo_sessions()

    assert _session_gone(fake_eudiplo, due)
    request = stored_request(due)
    # Its documents are deleted, undelivered: the request has ended
    assert request.status == 'completed'
    assert request.ended_at == request.eudiplo_session_deleted_at
    assert not _session_gone(fake_eudiplo, not_yet)
    assert stored_request(not_yet).ended_at is None


def test_the_deletion_time_ends_a_repeat_window_early(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    reference = _delivered(signed_in_client, fake_eudiplo)
    update_request(reference, completed_at=now() - timedelta(minutes=29))

    worker.delete_eudiplo_sessions()

    assert _session_gone(fake_eudiplo, reference)


def test_pending_requests_keep_their_session(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    _expire(reference)

    worker.delete_eudiplo_sessions()

    assert not _session_gone(fake_eudiplo, reference)


def test_a_session_eudiplo_no_longer_has_counts_as_deleted(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    update_request(reference, status='declined', ended_at=now())
    fake_eudiplo.sessions.clear()

    worker.delete_eudiplo_sessions()

    assert fake_eudiplo.call_names()[-1] == 'delete_session'
    assert stored_request(reference).eudiplo_session_deleted_at is not None


def test_a_failed_deletion_is_tried_again_in_the_next_cycle(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    (reference,) = _triggered(signed_in_client)
    update_request(reference, status='expired', ended_at=now())
    fake_eudiplo.fail('delete_session', 503)

    worker.delete_eudiplo_sessions()
    assert not _session_gone(fake_eudiplo, reference)
    worker.delete_eudiplo_sessions()

    assert _session_gone(fake_eudiplo, reference)


# Deleting request records (FR-021)


def test_request_records_are_deleted_after_the_retention_period(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    old, recent, open_ = (
        trigger(signed_in_client, form_connection_id)['reference'] for _ in range(3)
    )
    retention = timedelta(seconds=settings.request_record_retention_seconds)
    update_request(old, status='expired', ended_at=now() - retention)
    update_request(
        recent, status='expired', ended_at=now() - retention + timedelta(minutes=1)
    )

    worker.delete_old_request_records()

    with SessionLocal() as db:
        references = set(db.scalars(select(DocumentRequest.reference)))
    assert references == {recent, open_}
    # A pull with its reference answers like one with an unknown reference
    response = signed_in_client.get(pull_url(form_connection_id, old))
    assert response.status_code == 404
    assert response.json() == {'error': 'Not found', 'message': 'Request not found'}


# Drafts (spec 005, research R8)


def _create_draft(client: TestClient) -> str:
    """Save a new draft through the management API and return its id."""
    rules = {'branches': [main_branch([])], 'numbering_base': {'rule': 1, 'group': 1}}
    response = client.post(
        '/api/form-connections/drafts',
        json=FORM_CONNECTION | {'rules': rules, 'step': 'connection'},
    )
    assert response.status_code == 201, response.json()
    draft_id: str = response.json()['data']['id']
    return draft_id


def test_the_re_sync_leaves_drafts_out(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    published_id = create_form_connection(signed_in_client)
    draft_id = _create_draft(signed_in_client)
    dispatched: list[str] = []
    dispatch = worker.dispatch

    def recording_dispatch(key: str, call: Callable[[], None]) -> bool:
        dispatched.append(key)
        return dispatch(key, call)

    monkeypatch.setattr(worker, 'dispatch', recording_dispatch)

    worker.resync_configs()

    assert dispatched == [f'resync:{published_id}']
    assert f'resync:{draft_id}' not in dispatched
    # The draft doesn't keep the step from ending
    worker.resync_configs()
    assert dispatched == [f'resync:{published_id}']
    assert worker._resync_done


def test_re_syncing_a_draft_does_nothing(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    draft_id = _create_draft(signed_in_client)
    # Changed settings would renew a published connection's configuration
    monkeypatch.setattr(settings, 'eudiplo_trust_list_id', 'production-issuers')

    with SessionLocal() as db:
        assert form_connections.resync_config(db, draft_id) is False

    assert fake_eudiplo.calls == []


# One whole cycle


def test_the_steps_run_in_the_order_of_research_r7() -> None:
    assert worker.STEPS == (
        # The scheduled starts first (spec 010, R2; tests/api/test_scheduling.py)
        worker.activate_scheduled_connections,
        worker.sync_sessions,
        worker.expire_requests,
        worker.cancel_requests,
        worker.delete_eudiplo_sessions,
        worker.resync_configs,
        worker.delete_unused_configs,
        worker.delete_expired_login_sessions,
        worker.delete_old_request_records,
        # Agents' access (spec 007; tests/api/test_oauth.py)
        worker.delete_expired_oauth_codes,
        worker.delete_expired_agent_tokens,
        worker.delete_idle_agent_connections,
        worker.delete_expired_personal_tokens,
        worker.delete_unused_oauth_clients,
        # Approval requests (spec 007; tests/api/test_approval_requests.py)
        worker.delete_old_approval_requests,
    )


def test_a_request_from_trigger_to_deleted_documents(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    reference = trigger(signed_in_client, form_connection_id)['reference']
    url = pull_url(form_connection_id, reference)

    worker.run_steps()
    assert signed_in_client.get(url).json()['data']['status'] == 'pending'
    share(fake_eudiplo, reference)
    worker.run_steps()
    first = signed_in_client.get(url).json()['data']
    worker.run_steps()
    repeat = signed_in_client.get(url).json()['data']
    update_request(reference, documents_delivered_at=now() - timedelta(minutes=2))
    worker.run_steps()
    after = signed_in_client.get(url).json()['data']

    assert first['documents'] == repeat['documents'] == DELIVERED_DOCUMENTS
    # The evaluation goes with the documents (spec 002, FR-017)
    assert after == {**first, 'documents': None, 'evaluation': None}
    assert _session_gone(fake_eudiplo, reference)


@pytest.mark.parametrize(
    ('failure_code', 'status'),
    [('access_denied', 'declined'), ('signature_invalid', 'verification_failed')],
)
def test_a_wallet_error_reaches_the_pull_within_one_sync(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    failure_code: str,
    status: str,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    reference = trigger(signed_in_client, form_connection_id)['reference']
    url = pull_url(form_connection_id, reference)
    # Triggered two minutes ago, and the wallet fetched the request at once
    created_at = now() - timedelta(minutes=2)
    update_request(reference, created_at=created_at)
    fetched_at = created_at + timedelta(seconds=1)
    fake_eudiplo.set_session(_session_id(reference), 'fetched', updated_at=fetched_at)
    worker.sync_sessions()
    # Meanwhile, later updates in the shared tenant moved the cursor past the fetch
    stranger = _unknown_session(now() - timedelta(seconds=30))
    fake_eudiplo.sessions[stranger.id] = stranger
    worker.sync_sessions()
    assert signed_in_client.get(url).json()['data']['status'] == 'pending'

    # The wallet's error response: EUDIPLO fails the session, and updatedAt moves on
    fail_in_wallet(fake_eudiplo, reference, failure_code)
    worker.sync_sessions()
    data = signed_in_client.get(url).json()['data']

    assert (data['status'], data['documents']) == (status, None)
    assert stored_request(reference).failure_code == failure_code
    # The sync found the session only through its new updatedAt
    assert _list_calls(fake_eudiplo)[-1] > fetched_at
    # The list carried the outcome, and the pull only read the stored status
    assert 'get_session' not in fake_eudiplo.call_names()
