"""The trigger URL and the pull URL (contracts/integration-api.md).

These are quickstart V2 and V3, with a fake EUDIPLO in place of the wallet.
"""

import base64
import json
import logging
import threading
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.main import RedactReferencesFilter
from app.models import DocumentRequest, FormConnectionRevision
from app.routers.connect import PULL_FAILED, TRIGGER_FAILED
from app.schemas import PullResponse
from app.services import document_requests, worker
from app.services.eudiplo import NOT_CONFIGURED_MESSAGE
from app.services.qr import png_data_uri
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    DELIVERED_DOCUMENTS,
    create_form_connection,
    fail_in_wallet,
    now,
    pull_url,
    requests_url,
    share,
    stored_request,
    trigger,
    update_form_connection,
    update_request,
)

FORM_CONNECTION_NOT_FOUND = {
    'error': 'Not found',
    'message': 'Form connection not found',
}
REQUEST_NOT_FOUND = {'error': 'Not found', 'message': 'Request not found'}
UNAVAILABLE = {
    'error': 'unavailable',
    'message': 'This form connection is deactivated or deleted',
}
UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'


def _count_requests() -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(DocumentRequest)) or 0


def _pull(client: TestClient, form_connection_id: str, reference: str) -> Any:
    response = client.get(pull_url(form_connection_id, reference))
    assert response.status_code == 200, response.json()
    return response.json()['data']


def _completed(
    client: TestClient, fake: FakeEudiplo, form_connection_id: str
) -> dict[str, Any]:
    """A triggered request that the citizen shared, as the worker has seen it."""
    started = trigger(client, form_connection_id)
    share(fake, started['reference'])
    worker.sync_sessions()
    assert stored_request(started['reference']).status == 'completed'
    return started


# Trigger URL


def test_triggering_starts_a_request(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    before = now()

    response = signed_in_client.post(requests_url(form_connection_id))

    assert response.status_code == 201
    body = response.json()
    assert body['message'] == 'Document request started'
    data = body['data']
    assert set(data) == {
        'reference',
        'status',
        'wallet_link',
        'qr_code_link',
        'qr_code',
        'expires_at',
    }
    assert data['status'] == 'pending'
    assert len(data['reference']) == 43

    (session,) = fake_eudiplo.sessions.values()
    assert data['wallet_link'].startswith('openid4vp://')
    assert 'no-redirect' not in data['wallet_link']
    assert data['qr_code_link'].endswith('%2Fno-redirect')
    assert session.id in data['qr_code_link']
    # The QR code encodes the cross-device link, as a PNG data URI
    assert data['qr_code'] == png_data_uri(data['qr_code_link'])
    prefix = 'data:image/png;base64,'
    assert data['qr_code'].startswith(prefix)
    assert base64.b64decode(data['qr_code'][len(prefix) :]).startswith(b'\x89PNG')

    # Trigger time + 10 minutes, in whole seconds and UTC
    expires_at = datetime.fromisoformat(data['expires_at'])
    assert data['expires_at'].endswith('Z')
    assert expires_at.microsecond == 0
    expected = before + timedelta(seconds=600)
    assert (
        expected - timedelta(seconds=1) <= expires_at <= expected + timedelta(seconds=5)
    )


def test_the_request_is_stored_with_its_eudiplo_session(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)

    data = trigger(signed_in_client, form_connection_id)

    request = stored_request(data['reference'])
    (session,) = fake_eudiplo.sessions.values()
    with SessionLocal() as db:
        revision = db.scalars(
            select(FormConnectionRevision).where(
                FormConnectionRevision.form_connection_id == form_connection_id
            )
        ).one()
    assert request.form_connection_id == form_connection_id
    assert request.revision_id == revision.id
    assert request.status == 'pending'
    assert request.eudiplo_session_id == session.id
    assert request.expires_at == datetime.fromisoformat(data['expires_at'])
    assert request.ended_at is None
    # EUDIPLO knows the request by its internal id, never by the reference
    offer = json.loads(fake_eudiplo.calls[-1].request.content)
    assert offer == {
        'response_type': 'uri',
        'requestId': f'fc-{form_connection_id}-r1',
        'reference': request.id,
    }
    assert session.reference == request.id != data['reference']


def test_every_trigger_starts_an_independent_request(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)

    first = trigger(signed_in_client, form_connection_id)
    second = trigger(signed_in_client, form_connection_id)

    assert first['reference'] != second['reference']
    assert first['qr_code_link'] != second['qr_code_link']
    assert len(fake_eudiplo.sessions) == 2
    assert _count_requests() == 2


def test_the_trigger_takes_no_body_and_ignores_one(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    bodies: list[dict[str, Any]] = [{}, {'json': {}}, {'content': b'form=1'}]

    for body in bodies:
        response = signed_in_client.post(requests_url(form_connection_id), **body)
        assert response.status_code == 201, body


def test_the_connection_urls_need_no_sign_in(
    signed_in_client: TestClient, client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    signed_in_client.post('/api/auth/logout')

    started = trigger(client, form_connection_id)

    assert (
        _pull(client, form_connection_id, started['reference'])['status'] == 'pending'
    )


def test_an_unknown_form_connection_is_not_found(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = signed_in_client.post(requests_url(UNKNOWN_ID))

    assert response.status_code == 404
    assert response.json() == FORM_CONNECTION_NOT_FOUND
    assert fake_eudiplo.calls == []


@pytest.mark.parametrize(
    'change', [{'is_active': False}, {'deleted_at': datetime(2026, 10, 8, 9, 0)}]
)
def test_a_deactivated_or_deleted_form_connection_starts_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, change: dict[str, Any]
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    update_form_connection(form_connection_id, **change)
    calls = len(fake_eudiplo.calls)

    response = signed_in_client.post(requests_url(form_connection_id))

    assert response.status_code == 409
    assert response.json() == UNAVAILABLE
    assert len(fake_eudiplo.calls) == calls
    assert _count_requests() == 0


def test_the_form_connection_is_checked_before_the_settings(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    update_form_connection(form_connection_id, is_active=False)
    monkeypatch.setattr(settings, 'eudiplo_url', '')

    assert signed_in_client.post(requests_url(UNKNOWN_ID)).status_code == 404
    assert signed_in_client.post(requests_url(form_connection_id)).status_code == 409


@pytest.mark.parametrize(
    ('setting', 'name'),
    [
        ('eudiplo_url', 'EUDIPLO_URL'),
        ('eudiplo_client_id', 'EUDIPLO_CLIENT_ID'),
        ('eudiplo_client_secret', 'EUDIPLO_CLIENT_SECRET'),
    ],
)
def test_triggering_answers_503_while_a_eudiplo_setting_is_empty(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    error_log: Callable[[str], str],
    setting: str,
    name: str,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    calls = len(fake_eudiplo.calls)
    monkeypatch.setattr(settings, setting, '')

    response = signed_in_client.post(requests_url(form_connection_id))

    assert response.status_code == 503
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Not configured',
        'message': NOT_CONFIGURED_MESSAGE,
        'error_id': error_id,
    }
    assert f'{name} is not set' in error_log(error_id)
    assert len(fake_eudiplo.calls) == calls
    assert _count_requests() == 0


@pytest.mark.parametrize(
    ('status_code', 'error_name'),
    [
        (400, 'EudiploUnavailable'),
        (403, 'EudiploUnavailable'),
        # No active access key chain in the tenant
        (404, 'EudiploNotFound'),
        (500, 'EudiploUnavailable'),
    ],
)
def test_triggering_answers_502_and_stores_nothing_when_eudiplo_fails(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    error_log: Callable[[str], str],
    status_code: int,
    error_name: str,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    fake_eudiplo.fail('create_offer', status_code)

    response = signed_in_client.post(requests_url(form_connection_id))

    assert response.status_code == 502
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Upstream error',
        'message': TRIGGER_FAILED,
        'error_id': error_id,
    }
    assert error_name in error_log(error_id)
    assert _count_requests() == 0


def test_a_missing_configuration_is_created_again_once(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    config_id = f'fc-{form_connection_id}-r1'
    # Removed from the shared tenant by hand
    config = fake_eudiplo.configs.pop(config_id)
    calls = len(fake_eudiplo.calls)

    started = trigger(signed_in_client, form_connection_id)

    assert fake_eudiplo.call_names()[calls:] == [
        'create_offer',
        'create_config',
        'create_offer',
    ]
    # The same configuration as before, from the stored revision
    assert fake_eudiplo.configs[config_id] == config
    assert stored_request(started['reference']).status == 'pending'


def test_a_configuration_that_cant_be_created_again_answers_502(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    fake_eudiplo.fail('create_offer', 409, times=2)
    calls = len(fake_eudiplo.calls)

    response = signed_in_client.post(requests_url(form_connection_id))

    assert response.status_code == 502
    assert response.json()['message'] == TRIGGER_FAILED
    assert fake_eudiplo.call_names()[calls:] == [
        'create_offer',
        'create_config',
        'create_offer',
    ]
    assert _count_requests() == 0


def test_an_offer_without_a_cross_device_link_answers_502(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    error_log: Callable[[str], str],
) -> None:
    # research R19, decided by the user: no QR code from the same-device link
    form_connection_id = create_form_connection(signed_in_client)
    fake_eudiplo.omit_cross_device_uri = True

    response = signed_in_client.post(requests_url(form_connection_id))

    assert response.status_code == 502
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Upstream error',
        'message': TRIGGER_FAILED,
        'error_id': error_id,
    }
    assert 'EudiploUnavailable' in error_log(error_id)
    # The new session is deleted again, and nothing is stored
    assert fake_eudiplo.call_names()[-2:] == ['create_offer', 'delete_session']
    assert fake_eudiplo.sessions == {}
    assert _count_requests() == 0


def test_the_session_is_deleted_again_when_saving_the_request_fails(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)

    def fail_commit(_db: Session) -> None:
        raise OperationalError('COMMIT', {}, Exception('connection lost'))

    monkeypatch.setattr(Session, 'commit', fail_commit)

    with pytest.raises(OperationalError):
        signed_in_client.post(requests_url(form_connection_id))

    assert fake_eudiplo.call_names()[-2:] == ['create_offer', 'delete_session']
    assert fake_eudiplo.sessions == {}
    monkeypatch.undo()
    assert _count_requests() == 0


# Pull URL


def test_a_pending_request_has_no_documents(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = trigger(signed_in_client, form_connection_id)

    response = signed_in_client.get(pull_url(form_connection_id, started['reference']))

    assert response.status_code == 200
    assert response.json() == {
        'data': {
            'reference': started['reference'],
            'status': 'pending',
            'expires_at': started['expires_at'],
            'documents': None,
        },
        'message': None,
    }


def test_the_first_pull_after_sharing_delivers_exactly_the_configured_fields(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    before = now()

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data == {
        'reference': started['reference'],
        'status': 'completed',
        'expires_at': started['expires_at'],
        'documents': DELIVERED_DOCUMENTS,
    }
    request = stored_request(started['reference'])
    assert request.documents_delivered_at is not None
    assert request.documents_delivered_at >= before
    # Delivered, so the request has ended
    assert request.ended_at == request.documents_delivered_at
    # Deleting the EUDIPLO session is left to the worker
    assert request.eudiplo_session_deleted_at is None
    assert 'delete_session' not in fake_eudiplo.call_names()


def test_pulls_within_the_repeat_window_get_the_same_documents(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    first = _pull(signed_in_client, form_connection_id, started['reference'])
    # Nearly a whole window after the first delivery
    delivered_at = now() - timedelta(seconds=settings.pull_repeat_window_seconds - 2)
    update_request(started['reference'], documents_delivered_at=delivered_at)

    again = _pull(signed_in_client, form_connection_id, started['reference'])

    assert again == first
    assert again['documents'] == DELIVERED_DOCUMENTS
    # A repeat is no new delivery: the window still counts from the first one
    assert stored_request(started['reference']).documents_delivered_at == delivered_at


def test_after_the_repeat_window_the_documents_are_gone(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    _pull(signed_in_client, form_connection_id, started['reference'])
    update_request(
        started['reference'], documents_delivered_at=now() - timedelta(seconds=61)
    )
    calls = len(fake_eudiplo.calls)

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data['status'] == 'completed'
    assert data['documents'] is None
    # Nothing was read from EUDIPLO
    assert len(fake_eudiplo.calls) == calls


def test_documents_never_pulled_are_gone_at_the_deletion_time(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    # 30 minutes after sharing, less the minute that keeps the deletion in time
    update_request(
        started['reference'],
        completed_at=now()
        - timedelta(seconds=settings.document_retention_seconds - 60 + 1),
    )

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data['status'] == 'completed'
    assert data['documents'] is None
    assert stored_request(started['reference']).documents_delivered_at is None


def test_the_deletion_time_also_ends_the_repeat_window(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    _pull(signed_in_client, form_connection_id, started['reference'])
    update_request(started['reference'], completed_at=now() - timedelta(minutes=29))

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data['documents'] is None


def test_documents_deleted_in_eudiplo_are_gone(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    fake_eudiplo.sessions.clear()

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data['status'] == 'completed'
    assert data['documents'] is None
    request = stored_request(started['reference'])
    assert request.documents_delivered_at is None
    assert request.eudiplo_session_deleted_at is not None
    # Completed, and its documents deleted: the request has ended
    assert request.ended_at == request.eudiplo_session_deleted_at
    assert _pull(signed_in_client, form_connection_id, started['reference']) == data


@pytest.mark.parametrize('status_code', [500, 503, 401])
def test_a_eudiplo_failure_answers_502_and_consumes_nothing(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    error_log: Callable[[str], str],
    status_code: int,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    # A 401 is retried with a new token once, so it has to come twice
    fake_eudiplo.fail('get_session', status_code, times=2 if status_code == 401 else 1)

    response = signed_in_client.get(pull_url(form_connection_id, started['reference']))

    assert response.status_code == 502
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Upstream error',
        'message': PULL_FAILED,
        'error_id': error_id,
    }
    assert 'EudiploUnavailable' in error_log(error_id)
    request = stored_request(started['reference'])
    assert request.documents_delivered_at is None
    assert request.ended_at is None
    # The next pull still receives the documents
    data = _pull(signed_in_client, form_connection_id, started['reference'])
    assert data['documents'] == DELIVERED_DOCUMENTS


def test_a_pull_that_needs_eudiplo_answers_503_while_a_setting_is_empty(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    error_log: Callable[[str], str],
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    waiting = trigger(signed_in_client, form_connection_id)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    monkeypatch.setattr(settings, 'eudiplo_client_secret', '')

    response = signed_in_client.get(pull_url(form_connection_id, started['reference']))

    assert response.status_code == 503
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Not configured',
        'message': NOT_CONFIGURED_MESSAGE,
        'error_id': error_id,
    }
    assert 'EUDIPLO_CLIENT_SECRET is not set' in error_log(error_id)
    assert stored_request(started['reference']).documents_delivered_at is None
    # A pull that needs no EUDIPLO call still answers
    assert _pull(signed_in_client, form_connection_id, waiting['reference'])[
        'status'
    ] == ('pending')


def test_a_session_without_documents_hands_out_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = trigger(signed_in_client, form_connection_id)
    share(fake_eudiplo, started['reference'], credentials=[])
    worker.sync_sessions()

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data['status'] == 'completed'
    assert data['documents'] is None
    # Nothing was delivered, so a later pull can still try
    assert stored_request(started['reference']).documents_delivered_at is None


# The last check before expiry


def _expire(reference: str) -> None:
    update_request(reference, expires_at=now() - timedelta(seconds=1))


def test_an_answer_given_before_the_expiry_still_counts(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = trigger(signed_in_client, form_connection_id)
    shared_at = share(fake_eudiplo, started['reference'])
    _expire(started['reference'])

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    # The last check found the answer, and the same pull delivers the documents
    assert data['status'] == 'completed'
    assert data['documents'] == DELIVERED_DOCUMENTS
    assert fake_eudiplo.call_names().count('get_session') == 1
    request = stored_request(started['reference'])
    assert request.completed_at is not None
    assert abs(request.completed_at - shared_at) < timedelta(milliseconds=1)
    assert request.documents_delivered_at is not None


@pytest.mark.parametrize(
    ('failure_code', 'status'),
    [
        ('access_denied', 'declined'),
        ('signature_invalid', 'verification_failed'),
        (None, 'verification_failed'),
    ],
)
def test_a_failure_before_the_expiry_is_reported_as_such(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    failure_code: str | None,
    status: str,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = trigger(signed_in_client, form_connection_id)
    fail_in_wallet(fake_eudiplo, started['reference'], failure_code)
    _expire(started['reference'])

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data['status'] == status
    assert data['documents'] is None
    request = stored_request(started['reference'])
    assert request.failure_code == failure_code
    assert request.ended_at is not None


@pytest.mark.parametrize('session_status', ['active', 'fetched', 'expired', None])
def test_a_request_without_an_answer_expires(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    session_status: str | None,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = trigger(signed_in_client, form_connection_id)
    session_id = stored_request(started['reference']).eudiplo_session_id
    if session_status is None:
        # EUDIPLO no longer has the session
        del fake_eudiplo.sessions[session_id]
    else:
        fake_eudiplo.sessions[session_id].status = session_status  # type: ignore[assignment]
    _expire(started['reference'])

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data['status'] == 'expired'
    assert data['documents'] is None
    request = stored_request(started['reference'])
    assert request.ended_at is not None
    assert (request.eudiplo_session_deleted_at is not None) == (session_status is None)


def test_before_the_expiry_a_pull_doesnt_ask_eudiplo(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = trigger(signed_in_client, form_connection_id)
    # The worker applies the answer; until it has, the request is pending
    fail_in_wallet(fake_eudiplo, started['reference'], 'access_denied')
    calls = len(fake_eudiplo.calls)

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data['status'] == 'pending'
    assert len(fake_eudiplo.calls) == calls


def test_a_failed_last_check_answers_502_and_changes_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = trigger(signed_in_client, form_connection_id)
    _expire(started['reference'])
    fake_eudiplo.fail('get_session', 500)

    response = signed_in_client.get(pull_url(form_connection_id, started['reference']))

    assert response.status_code == 502
    assert response.json()['message'] == PULL_FAILED
    assert stored_request(started['reference']).status == 'pending'
    assert _pull(signed_in_client, form_connection_id, started['reference'])[
        'status'
    ] == ('expired')


# Two pulls at the same moment


def _pull_in_thread(
    form_connection_id: str, reference: str, results: list[PullResponse]
) -> None:
    with SessionLocal() as db:
        results.append(document_requests.pull(db, form_connection_id, reference))


def test_two_pulls_at_the_same_moment_both_get_the_documents(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    # Both pulls read the documents from EUDIPLO before either one counts them
    both_reading = threading.Barrier(2, timeout=10)
    get_session = fake_eudiplo._get_session

    def get_session_together(request: httpx2.Request) -> httpx2.Response:
        both_reading.wait()
        return get_session(request)

    monkeypatch.setattr(fake_eudiplo, '_get_session', get_session_together)
    results: list[PullResponse] = []
    threads = [
        threading.Thread(
            target=_pull_in_thread,
            args=(form_connection_id, started['reference'], results),
        )
        for _ in range(2)
    ]

    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=20)

    assert len(results) == 2
    for result in results:
        assert result.status == 'completed'
        assert result.documents is not None
        assert [document.model_dump() for document in result.documents] == (
            DELIVERED_DOCUMENTS
        )
    assert stored_request(started['reference']).documents_delivered_at is not None


def test_a_pull_that_meets_the_deletion_of_its_documents_gets_none(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    get_session = fake_eudiplo._get_session

    def get_session_then_delete(request: httpx2.Request) -> httpx2.Response:
        response = get_session(request)
        # The worker deletes the session while the pull extracts the documents
        update_request(started['reference'], eudiplo_session_deleted_at=now())
        return response

    monkeypatch.setattr(fake_eudiplo, '_get_session', get_session_then_delete)

    data = _pull(signed_in_client, form_connection_id, started['reference'])

    assert data['documents'] is None
    assert stored_request(started['reference']).documents_delivered_at is None


# Order of the checks


def test_an_unknown_form_connection_or_reference_is_not_found(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = trigger(signed_in_client, form_connection_id)

    for url in (
        pull_url(UNKNOWN_ID, started['reference']),
        pull_url(form_connection_id, 'made-up-reference'),
    ):
        response = signed_in_client.get(url)
        assert response.status_code == 404, url
        assert response.json() == REQUEST_NOT_FOUND


def test_a_reference_of_another_form_connection_is_not_found(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    first = create_form_connection(signed_in_client)
    second = create_form_connection(signed_in_client, name='Another form')
    started = _completed(signed_in_client, fake_eudiplo, first)

    response = signed_in_client.get(pull_url(second, started['reference']))

    assert response.status_code == 404
    assert response.json() == REQUEST_NOT_FOUND
    # Nothing was handed out
    assert stored_request(started['reference']).documents_delivered_at is None


@pytest.mark.parametrize(
    'change', [{'is_active': False}, {'deleted_at': datetime(2026, 10, 8, 9, 0)}]
)
def test_a_deactivated_or_deleted_form_connection_answers_unavailable(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, change: dict[str, Any]
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    # Whatever status the request reached, documents ready included (FR-006)
    started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
    update_form_connection(form_connection_id, **change)

    for reference in (started['reference'], 'made-up-reference'):
        response = signed_in_client.get(pull_url(form_connection_id, reference))
        assert response.status_code == 409
        assert response.json() == UNAVAILABLE
    assert stored_request(started['reference']).documents_delivered_at is None


def test_a_reactivated_form_connection_answers_again(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    started = trigger(signed_in_client, form_connection_id)
    update_form_connection(form_connection_id, is_active=False)
    update_form_connection(form_connection_id, is_active=True)

    assert _pull(signed_in_client, form_connection_id, started['reference'])[
        'status'
    ] == ('pending')
    trigger(signed_in_client, form_connection_id)


# References stay out of the logs (FR-019, research R13)


def test_no_reference_and_no_document_value_reaches_the_log(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    caplog: pytest.LogCaptureFixture,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)

    with caplog.at_level(logging.DEBUG):
        started = _completed(signed_in_client, fake_eudiplo, form_connection_id)
        _pull(signed_in_client, form_connection_id, started['reference'])
        fake_eudiplo.fail('get_session', 500)
        signed_in_client.get(pull_url(form_connection_id, started['reference']))
        _pull(signed_in_client, form_connection_id, started['reference'])
        worker.run_steps()

    # The test client's own request lines, as serviceBW's, don't count
    text = '\n'.join(
        message
        for message in (record.getMessage() for record in caplog.records)
        if 'http://testserver/' not in message
    )
    assert 'Document request' in text
    assert started['reference'] not in text
    for value in ('Mustermann', 'Stuttgart', 'B072RRE2I55', '1984-01-26'):
        assert value not in text


def _access_record(path: str) -> logging.LogRecord:
    # How uvicorn logs a request
    return logging.LogRecord(
        'uvicorn.access',
        logging.INFO,
        'h11_impl.py',
        1,
        '%s - "%s %s HTTP/%s" %d',
        ('10.0.0.5:51234', 'GET', path, '1.1', 200),
        None,
    )


@pytest.mark.parametrize(
    ('path', 'logged'),
    [
        (
            '/api/connect/fc-1/requests/q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp4o2YwKxR1aE',
            '/api/connect/fc-1/requests/<reference>',
        ),
        (
            '/api/connect/fc-1/requests/q3Vh1x0d6vTt0m2T?probe=1',
            '/api/connect/fc-1/requests/<reference>?probe=1',
        ),
        (
            '/api/connect//requests/q3Vh1x0d6vTt0m2T',
            '/api/connect//requests/<reference>',
        ),
        ('/API/Connect/fc-1/Requests/q3Vh1x0d6vTt0m2T', None),
        ('/api/connect/fc-1/requests', '/api/connect/fc-1/requests'),
        ('/api/form-connections/fc-1', '/api/form-connections/fc-1'),
    ],
)
def test_the_access_log_shows_no_reference(path: str, logged: str | None) -> None:
    record = _access_record(path)

    assert RedactReferencesFilter().filter(record) is True

    message = record.getMessage()
    assert 'q3Vh1x0d6vTt0m2T' not in message
    if logged is not None:
        assert message == f'10.0.0.5:51234 - "GET {logged} HTTP/1.1" 200'
