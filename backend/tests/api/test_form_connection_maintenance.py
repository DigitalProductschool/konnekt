"""Maintaining form connections: editing, deactivating, deleting (quickstart V5).

Also the worker's upkeep that comes with it: cancelling requests, deleting unused
EUDIPLO configurations, and the re-sync after a start (research R2, R7).
"""

import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Any

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import FormConnection, FormConnectionRevision
from app.routers.form_connections import CONFIG_FAILED
from app.schemas import FormConnectionUpdate, RequestedDocument
from app.services import form_connections, worker
from app.services.dcql import config_hash
from app.services.eudiplo import NOT_CONFIGURED_MESSAGE
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    DELIVERED_DOCUMENTS,
    FORM_CONNECTION,
    create_form_connection,
    fail_in_wallet,
    now,
    pull_url,
    requests_url,
    share,
    stored_request,
    trigger,
    update_form_connection,
)

NOT_FOUND = {'error': 'Not found', 'message': 'Form connection not found'}
UNAVAILABLE = {
    'error': 'unavailable',
    'message': 'This form connection is deactivated or deleted',
}

# quickstart.md V5: the ID with Nationality added, and the driving licence as before
EDITED_DOCUMENTS: list[dict[str, Any]] = [
    {
        'document_type': 'pid',
        'fields': [
            'family_name',
            'given_name',
            'birthdate',
            'nationalities',
            'address_locality',
        ],
    },
    FORM_CONNECTION['documents'][1],
]


def _url(form_connection_id: str, action: str = '') -> str:
    return f'/api/form-connections/{form_connection_id}{action}'


def _edit(client: TestClient, form_connection_id: str, **changes: Any) -> Any:
    return client.put(_url(form_connection_id), json=changes)


def _deactivate(client: TestClient, form_connection_id: str) -> Any:
    return client.post(_url(form_connection_id, '/deactivate'), json={})


def _activate(client: TestClient, form_connection_id: str) -> Any:
    return client.post(_url(form_connection_id, '/activate'), json={})


def _delete(client: TestClient, form_connection_id: str) -> Any:
    return client.request('DELETE', _url(form_connection_id), json={})


def _revisions(form_connection_id: str) -> list[FormConnectionRevision]:
    with SessionLocal() as db:
        return list(
            db.scalars(
                select(FormConnectionRevision)
                .where(FormConnectionRevision.form_connection_id == form_connection_id)
                .order_by(FormConnectionRevision.revision)
            )
        )


def _revision(form_connection_id: str, number: int) -> FormConnectionRevision:
    return next(r for r in _revisions(form_connection_id) if r.revision == number)


def _current_revision(form_connection_id: str) -> int:
    with SessionLocal() as db:
        form_connection = db.get(FormConnection, form_connection_id)
        assert form_connection is not None
        assert form_connection.current_revision is not None
        return form_connection.current_revision


def _config_id(form_connection_id: str, number: int) -> str:
    return f'fc-{form_connection_id}-r{number}'


def _fields(config: dict[str, Any], document_type: str) -> list[list[str]]:
    query = next(
        query
        for query in config['dcql_query']['credentials']
        if query['id'] == document_type
    )
    return [claim['path'] for claim in query['claims']]


def _session_request_id(fake: FakeEudiplo, reference: str) -> str:
    """The configuration a request's EUDIPLO session was started with."""
    return fake.sessions[stored_request(reference).eudiplo_session_id].request_id


def _shared(client: TestClient, fake: FakeEudiplo, form_connection_id: str) -> str:
    """A request whose documents the citizen shared, not yet delivered."""
    reference = trigger(client, form_connection_id)['reference']
    share(fake, reference)
    worker.sync_sessions()
    assert stored_request(reference).status == 'completed'
    return reference


# Editing the documents (FR-005)


def test_editing_the_documents_creates_revision_2_with_the_same_urls(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    before = signed_in_client.get(_url(form_connection_id)).json()['data']

    response = _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)

    assert response.status_code == 200
    assert response.json()['message'] == 'Form connection updated'
    data = response.json()['data']
    assert [field['key'] for field in data['documents'][0]['fields']] == [
        'family_name',
        'given_name',
        'birthdate',
        'nationalities',
        'address_locality',
    ]
    assert data['trigger_url'] == before['trigger_url']
    assert data['pull_url'] == before['pull_url']
    assert data['name'] == before['name']
    assert _current_revision(form_connection_id) == 2
    revision = _revision(form_connection_id, 2)
    config = fake_eudiplo.configs[_config_id(form_connection_id, 2)]
    assert revision.eudiplo_config_id == _config_id(form_connection_id, 2)
    assert revision.documents == EDITED_DOCUMENTS
    assert revision.lifetime_seconds == settings.request_lifetime_seconds
    assert revision.config_hash == config_hash(config)
    assert ['nationalities'] in _fields(config, 'pid')
    # Revision 1 and its configuration stay for the requests that use them
    assert _config_id(form_connection_id, 1) in fake_eudiplo.configs
    assert signed_in_client.get(_url(form_connection_id)).json()['data'] == data


def test_a_request_in_progress_keeps_its_revision(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    old = trigger(signed_in_client, form_connection_id)['reference']

    _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)
    new = trigger(signed_in_client, form_connection_id)['reference']
    share(fake_eudiplo, old)
    worker.sync_sessions()
    pulled = signed_in_client.get(pull_url(form_connection_id, old)).json()['data']

    assert stored_request(old).revision_id == _revision(form_connection_id, 1).id
    assert stored_request(new).revision_id == _revision(form_connection_id, 2).id
    assert _session_request_id(fake_eudiplo, old) == _config_id(form_connection_id, 1)
    assert _session_request_id(fake_eudiplo, new) == _config_id(form_connection_id, 2)
    # The old field set, without Nationality
    assert pulled['documents'] == DELIVERED_DOCUMENTS


def test_the_same_documents_create_no_revision(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    calls_before = len(fake_eudiplo.calls)
    # The same selection, in another order
    documents = [
        {**document, 'fields': list(reversed(document['fields']))}
        for document in reversed(FORM_CONNECTION['documents'])
    ]

    response = _edit(signed_in_client, form_connection_id, documents=documents)

    assert response.status_code == 200
    assert len(_revisions(form_connection_id)) == 1
    assert len(fake_eudiplo.calls) == calls_before


def test_renaming_with_new_documents_names_the_new_configuration(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)

    response = _edit(
        signed_in_client,
        form_connection_id,
        name=' Renamed ',
        description='FS-1',
        documents=EDITED_DOCUMENTS,
    )

    assert response.status_code == 200
    assert response.json()['data']['name'] == 'Renamed'
    assert response.json()['data']['description'] == 'FS-1'
    config = fake_eudiplo.configs[_config_id(form_connection_id, 2)]
    assert config['description'] == 'Renamed'


@pytest.mark.parametrize(
    ('documents', 'message'),
    [
        ([], 'Add at least one document.'),
        (None, 'Add at least one document.'),
        ([{'document_type': 'xyz', 'fields': ['a']}], "Unknown document type 'xyz'."),
        (
            [{'document_type': 'pid', 'fields': []}],
            "Select at least one field for 'Personal ID'.",
        ),
        (
            [{'document_type': 'pid', 'fields': ['abc']}],
            "Unknown field 'abc' for 'Personal ID'.",
        ),
    ],
)
def test_editing_the_documents_applies_the_same_validation(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    documents: list[dict[str, Any]] | None,
    message: str,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)

    response = _edit(
        signed_in_client, form_connection_id, name='Changed', documents=documents
    )

    assert response.status_code == 400
    assert response.json() == {'error': 'Validation error', 'message': message}
    assert len(_revisions(form_connection_id)) == 1
    data = signed_in_client.get(_url(form_connection_id)).json()['data']
    assert data['name'] == FORM_CONNECTION['name']


def test_editing_answers_502_and_saves_nothing_when_eudiplo_fails(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    error_log: Callable[[str], str],
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    before = signed_in_client.get(_url(form_connection_id)).json()['data']
    fake_eudiplo.fail('create_config', 500)

    response = _edit(
        signed_in_client, form_connection_id, name='Changed', documents=EDITED_DOCUMENTS
    )

    assert response.status_code == 502
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Upstream error',
        'message': CONFIG_FAILED,
        'error_id': error_id,
    }
    assert 'EudiploUnavailable' in error_log(error_id)
    # Neither the reserved revision nor the new name is kept
    assert [revision.revision for revision in _revisions(form_connection_id)] == [1]
    assert signed_in_client.get(_url(form_connection_id)).json()['data'] == before


def test_editing_answers_503_while_the_trust_list_is_not_set(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    monkeypatch.setattr(settings, 'eudiplo_trust_list_id', '')

    response = _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)

    assert response.status_code == 503
    assert response.json()['message'] == NOT_CONFIGURED_MESSAGE
    assert len(_revisions(form_connection_id)) == 1


def test_the_new_configuration_is_deleted_again_when_saving_fails(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    commit = Session.commit

    def fail_last_commit(db: Session) -> None:
        # The commit that makes the revision current changes the form connection
        if any(isinstance(item, FormConnection) for item in db.dirty):
            raise OperationalError('COMMIT', {}, Exception('connection lost'))
        commit(db)

    monkeypatch.setattr(Session, 'commit', fail_last_commit)

    with pytest.raises(OperationalError):
        _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)

    assert fake_eudiplo.call_names()[-2:] == ['create_config', 'delete_config']
    assert _config_id(form_connection_id, 2) not in fake_eudiplo.configs
    assert _current_revision(form_connection_id) == 1


def test_concurrent_edits_get_distinct_revision_numbers(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    both_waiting = threading.Barrier(2, timeout=10)
    create_config = fake_eudiplo._create_config

    def create_config_together(request: httpx2.Request) -> httpx2.Response:
        # Both edits wait for EUDIPLO at the same time: no lock is held meanwhile
        both_waiting.wait()
        return create_config(request)

    monkeypatch.setattr(fake_eudiplo, '_create_config', create_config_together)
    edits = [
        [{'document_type': 'pid', 'fields': ['family_name']}],
        [{'document_type': 'mdl', 'fields': ['document_number']}],
    ]

    def edit(documents: list[dict[str, Any]]) -> None:
        update = FormConnectionUpdate(
            documents=[RequestedDocument.model_validate(d) for d in documents]
        )
        with SessionLocal() as db:
            form_connections.update_form_connection(db, form_connection_id, update)

    with ThreadPoolExecutor(max_workers=2) as pool:
        for result in [pool.submit(edit, documents) for documents in edits]:
            result.result()

    revisions = _revisions(form_connection_id)
    assert [revision.revision for revision in revisions] == [1, 2, 3]
    assert len({revision.eudiplo_config_id for revision in revisions}) == 3
    assert sorted(
        [revision.documents for revision in revisions[1:]], key=str
    ) == sorted(edits, key=str)
    # The later revision is current; each configuration holds its own documents
    assert _current_revision(form_connection_id) == 3
    for revision in revisions[1:]:
        config = fake_eudiplo.configs[revision.eudiplo_config_id]
        assert config_hash(config) == revision.config_hash


def test_a_deactivated_form_connection_can_get_new_documents(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    _deactivate(signed_in_client, form_connection_id)

    response = _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)

    assert response.status_code == 200
    assert response.json()['data']['is_active'] is False
    assert _current_revision(form_connection_id) == 2


def test_a_deleted_form_connection_gets_no_new_documents(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    _delete(signed_in_client, form_connection_id)

    response = _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)

    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    assert len(_revisions(form_connection_id)) == 1


# Deactivating and activating (FR-006)


def test_deactivating_stops_both_urls(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    reference = trigger(signed_in_client, form_connection_id)['reference']
    calls_before = len(fake_eudiplo.calls)

    response = _deactivate(signed_in_client, form_connection_id)

    assert response.status_code == 200
    assert response.json()['message'] == 'Form connection deactivated'
    assert response.json()['data']['is_active'] is False
    triggered = signed_in_client.post(requests_url(form_connection_id))
    pulled = signed_in_client.get(pull_url(form_connection_id, reference))
    assert triggered.status_code == pulled.status_code == 409
    assert triggered.json() == pulled.json() == UNAVAILABLE
    # EUDIPLO isn't called while deactivating, and not for the refused calls either
    assert len(fake_eudiplo.calls) == calls_before
    listed = signed_in_client.get('/api/form-connections').json()['data']
    assert [item['is_active'] for item in listed] == [False]


def test_deactivating_cancels_the_open_requests_at_once(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    pending = trigger(signed_in_client, form_connection_id)['reference']
    shared = _shared(signed_in_client, fake_eudiplo, form_connection_id)
    delivered = _shared(signed_in_client, fake_eudiplo, form_connection_id)
    signed_in_client.get(pull_url(form_connection_id, delivered))
    declined = trigger(signed_in_client, form_connection_id)['reference']
    fail_in_wallet(fake_eudiplo, declined, 'access_denied')
    worker.sync_sessions()

    _deactivate(signed_in_client, form_connection_id)
    # Reactivating right away revives none of them
    _activate(signed_in_client, form_connection_id)

    for reference in (pending, shared):
        request = stored_request(reference)
        assert request.status == 'unavailable'
        assert request.ended_at is not None
    assert stored_request(delivered).status == 'completed'
    assert stored_request(declined).status == 'declined'
    pulled = signed_in_client.get(pull_url(form_connection_id, shared))
    assert pulled.status_code == 200
    assert (pulled.json()['data']['status'], pulled.json()['data']['documents']) == (
        'unavailable',
        None,
    )
    # The worker then deletes the cancelled requests' EUDIPLO sessions
    worker.delete_eudiplo_sessions()
    for reference in (pending, shared):
        session_id = stored_request(reference).eudiplo_session_id
        assert session_id not in fake_eudiplo.sessions
        assert stored_request(reference).eudiplo_session_deleted_at is not None


def test_activating_restores_the_urls(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    before = signed_in_client.get(_url(form_connection_id)).json()['data']
    _deactivate(signed_in_client, form_connection_id)

    response = _activate(signed_in_client, form_connection_id)

    assert response.status_code == 200
    assert response.json()['message'] == 'Form connection activated'
    data = response.json()['data']
    assert data['is_active'] is True
    assert (data['trigger_url'], data['pull_url']) == (
        before['trigger_url'],
        before['pull_url'],
    )
    reference = trigger(signed_in_client, form_connection_id)['reference']
    pulled = signed_in_client.get(pull_url(form_connection_id, reference))
    assert pulled.json()['data']['status'] == 'pending'


def test_deactivating_and_activating_twice_change_nothing_more(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)

    first = _deactivate(signed_in_client, form_connection_id)
    second = _deactivate(signed_in_client, form_connection_id)
    _activate(signed_in_client, form_connection_id)
    again = _activate(signed_in_client, form_connection_id)

    assert first.json() == second.json()
    assert again.status_code == 200
    assert again.json()['data']['is_active'] is True


def test_the_cancel_step_catches_a_request_inserted_after_deactivating(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    other_id = create_form_connection(signed_in_client)
    other = trigger(signed_in_client, other_id)['reference']
    create_offer = fake_eudiplo._create_offer

    def deactivate_meanwhile(request: httpx2.Request) -> httpx2.Response:
        # The deactivation commits while the trigger waits for EUDIPLO
        update_form_connection(form_connection_id, is_active=False)
        return create_offer(request)

    monkeypatch.setattr(fake_eudiplo, '_create_offer', deactivate_meanwhile)
    late = trigger(signed_in_client, form_connection_id)['reference']
    assert stored_request(late).status == 'pending'

    worker.cancel_requests()

    assert stored_request(late).status == 'unavailable'
    # Requests of active form connections stay as they are
    assert stored_request(other).status == 'pending'


# Deleting (FR-006)


def test_deleting_stops_the_urls_for_good(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    pending = trigger(signed_in_client, form_connection_id)['reference']
    shared = _shared(signed_in_client, fake_eudiplo, form_connection_id)
    calls_before = len(fake_eudiplo.calls)

    response = _delete(signed_in_client, form_connection_id)

    assert response.status_code == 200
    assert response.json() == {'data': None, 'message': 'Form connection deleted'}
    assert len(fake_eudiplo.calls) == calls_before
    for reference in (pending, shared):
        assert stored_request(reference).status == 'unavailable'
    triggered = signed_in_client.post(requests_url(form_connection_id))
    pulled = signed_in_client.get(pull_url(form_connection_id, pending))
    assert triggered.status_code == pulled.status_code == 409
    assert triggered.json() == pulled.json() == UNAVAILABLE
    assert signed_in_client.get('/api/form-connections').json()['data'] == []


@pytest.mark.parametrize(
    'call',
    [
        lambda client, id_: client.get(_url(id_)),
        lambda client, id_: _edit(client, id_, name='Too late'),
        _deactivate,
        _activate,
        _delete,
    ],
)
def test_a_deleted_form_connection_is_not_found_in_the_management_api(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    call: Callable[[TestClient, str], Any],
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    _delete(signed_in_client, form_connection_id)

    deleted = call(signed_in_client, form_connection_id)
    unknown = call(signed_in_client, 'not-a-form-connection')

    assert deleted.status_code == unknown.status_code == 404
    assert deleted.json() == unknown.json() == NOT_FOUND


# Deleting unused configurations (research R7, step 7)


def test_a_replaced_configuration_goes_once_no_request_needs_it(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    reference = trigger(signed_in_client, form_connection_id)['reference']
    _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)
    old_config = _config_id(form_connection_id, 1)

    worker.delete_unused_configs()
    # The pending request still has its EUDIPLO session
    assert old_config in fake_eudiplo.configs

    fail_in_wallet(fake_eudiplo, reference, 'access_denied')
    worker.sync_sessions()
    worker.delete_eudiplo_sessions()
    worker.delete_unused_configs()

    assert old_config not in fake_eudiplo.configs
    assert _revision(form_connection_id, 1).eudiplo_config_deleted_at is not None
    # The current revision keeps its configuration
    assert _config_id(form_connection_id, 2) in fake_eudiplo.configs
    assert _revision(form_connection_id, 2).eudiplo_config_deleted_at is None


def test_a_deleted_form_connection_loses_its_configurations(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)
    trigger(signed_in_client, form_connection_id)
    _delete(signed_in_client, form_connection_id)

    # The cancelled request's session goes first, then the configurations
    worker.delete_unused_configs()
    assert _config_id(form_connection_id, 2) in fake_eudiplo.configs
    worker.delete_eudiplo_sessions()
    worker.delete_unused_configs()

    assert fake_eudiplo.configs == {}
    assert all(r.eudiplo_config_deleted_at for r in _revisions(form_connection_id))


def test_a_configuration_eudiplo_no_longer_has_counts_as_deleted(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)
    del fake_eudiplo.configs[_config_id(form_connection_id, 1)]

    worker.delete_unused_configs()

    assert _revision(form_connection_id, 1).eudiplo_config_deleted_at is not None


def test_a_failed_configuration_deletion_is_tried_again(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    _edit(signed_in_client, form_connection_id, documents=EDITED_DOCUMENTS)
    fake_eudiplo.fail('delete_config', 503)

    worker.delete_unused_configs()
    assert _revision(form_connection_id, 1).eudiplo_config_deleted_at is None
    worker.delete_unused_configs()

    assert _revision(form_connection_id, 1).eudiplo_config_deleted_at is not None
    assert _config_id(form_connection_id, 1) not in fake_eudiplo.configs


def test_a_revision_being_created_keeps_its_configuration(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    # Reserved by an edit that waits for EUDIPLO: not current yet
    with SessionLocal() as db:
        db.add(
            FormConnectionRevision(
                form_connection_id=form_connection_id,
                revision=2,
                documents=EDITED_DOCUMENTS,
                lifetime_seconds=600,
                config_hash='0' * 64,
                eudiplo_config_id=_config_id(form_connection_id, 2),
            )
        )
        db.commit()

    worker.delete_unused_configs()

    assert 'delete_config' not in fake_eudiplo.call_names()


# Re-sync after a start (research R2)


def test_the_re_sync_leaves_matching_configurations_alone(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    calls_before = len(fake_eudiplo.calls)

    worker.resync_configs()
    worker.resync_configs()

    assert len(_revisions(form_connection_id)) == 1
    assert len(fake_eudiplo.calls) == calls_before
    assert worker._resync_done


def test_the_re_sync_renews_configurations_for_a_new_trust_list(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    before = signed_in_client.get(_url(form_connection_id)).json()['data']
    reference = trigger(signed_in_client, form_connection_id)['reference']
    monkeypatch.setattr(settings, 'eudiplo_trust_list_id', 'production-issuers')

    worker.resync_configs()

    assert _current_revision(form_connection_id) == 2
    revision = _revision(form_connection_id, 2)
    config = fake_eudiplo.configs[revision.eudiplo_config_id]
    assert revision.documents == _revision(form_connection_id, 1).documents
    assert revision.config_hash == config_hash(config)
    authorities = {
        authority['values'][0]['trustListId']
        for query in config['dcql_query']['credentials']
        for authority in query['trusted_authorities']
    }
    assert authorities == {'production-issuers'}
    # The request in progress keeps its revision, and the URLs stay the same
    assert stored_request(reference).revision_id == _revision(form_connection_id, 1).id
    after = signed_in_client.get(_url(form_connection_id)).json()['data']
    assert (after['trigger_url'], after['documents']) == (
        before['trigger_url'],
        before['documents'],
    )


def test_the_re_sync_stores_a_new_request_lifetime(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    monkeypatch.setattr(settings, 'request_lifetime_seconds', 300)

    worker.resync_configs()
    started = now()
    expires_at = trigger(signed_in_client, form_connection_id)['expires_at']

    revision = _revision(form_connection_id, 2)
    assert revision.lifetime_seconds == 300
    assert fake_eudiplo.configs[revision.eudiplo_config_id]['lifeTime'] == 300
    expiry = datetime.fromisoformat(expires_at)
    assert started + timedelta(seconds=298) <= expiry <= now() + timedelta(seconds=300)


def test_the_re_sync_runs_once_after_a_start(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    worker.resync_configs()
    worker.resync_configs()
    monkeypatch.setattr(settings, 'eudiplo_trust_list_id', 'production-issuers')

    worker.resync_configs()

    assert len(_revisions(form_connection_id)) == 1


def test_a_failed_re_sync_is_tried_again(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    monkeypatch.setattr(settings, 'eudiplo_trust_list_id', 'production-issuers')
    fake_eudiplo.fail('create_config', 503)

    worker.resync_configs()
    assert [revision.revision for revision in _revisions(form_connection_id)] == [1]
    assert not worker._resync_done
    worker.resync_configs()
    worker.resync_configs()

    assert _current_revision(form_connection_id) == 2
    assert worker._resync_done


def test_the_re_sync_skips_deleted_form_connections(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    _delete(signed_in_client, form_connection_id)
    monkeypatch.setattr(settings, 'eudiplo_trust_list_id', 'production-issuers')

    worker.resync_configs()

    assert len(_revisions(form_connection_id)) == 1
    assert fake_eudiplo.call_names().count('create_config') == 1


def test_the_re_sync_gives_up_until_a_restart_while_not_configured(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    form_connection_id = create_form_connection(signed_in_client)
    monkeypatch.setattr(settings, 'eudiplo_trust_list_id', '')

    worker.resync_configs()
    worker.resync_configs()

    # Settings only change with a restart, which starts the re-sync again
    assert len(_revisions(form_connection_id)) == 1
    assert worker._resync_done
