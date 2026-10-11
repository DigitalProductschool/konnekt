from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import FormConnection, FormConnectionRevision
from app.routers.form_connections import CONFIG_FAILED
from app.services.dcql import config_hash
from app.services.eudiplo import NOT_CONFIGURED_MESSAGE
from tests.fake_eudiplo import FAKE_TRUST_LIST_ID, FakeEudiplo

BASE_URL = 'https://middleware.test'
SIGN_IN_REQUIRED = {'error': 'Unauthorized', 'message': 'Sign in to continue'}
NOT_FOUND = {'error': 'Not found', 'message': 'Form connection not found'}

# quickstart.md V1
NEW_FORM_CONNECTION: dict[str, Any] = {
    'name': 'Führerscheinantrag Test',
    'servicebw_form': 'FS-20417',
    'documents': [
        {
            'document_type': 'pid',
            'fields': ['family_name', 'given_name', 'birthdate', 'address_locality'],
        },
        {
            'document_type': 'mdl',
            'fields': ['document_number', 'driving_privileges', 'expiry_date'],
        },
    ],
}

PID_VIEW = {
    'document_type': 'pid',
    'label': 'Personal ID',
    'fields': [
        {'key': 'family_name', 'label': 'Family name'},
        {'key': 'given_name', 'label': 'Given name'},
        {'key': 'birthdate', 'label': 'Date of birth'},
        {'key': 'address_locality', 'label': 'City or town'},
    ],
}
MDL_VIEW = {
    'document_type': 'mdl',
    'label': 'Driving licence',
    'fields': [
        {'key': 'expiry_date', 'label': 'Expiry date'},
        {'key': 'document_number', 'label': 'Licence number'},
        {'key': 'driving_privileges', 'label': 'Licence classes'},
    ],
}


def _create(client: TestClient, **changes: Any) -> dict[str, Any]:
    response = client.post('/api/form-connections', json=NEW_FORM_CONNECTION | changes)
    assert response.status_code == 201, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def _count(model: type[FormConnection] | type[FormConnectionRevision]) -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(model)) or 0


def _revisions(form_connection_id: str) -> list[FormConnectionRevision]:
    with SessionLocal() as db:
        return list(
            db.scalars(
                select(FormConnectionRevision).where(
                    FormConnectionRevision.form_connection_id == form_connection_id
                )
            )
        )


def _delete(form_connection_id: str) -> None:
    with SessionLocal() as db:
        db.execute(
            update(FormConnection)
            .where(FormConnection.id == form_connection_id)
            .values(deleted_at=datetime.now(tz=timezone.utc))
        )
        db.commit()


# Creating


def test_creating_returns_the_form_connection_with_its_urls(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = signed_in_client.post('/api/form-connections', json=NEW_FORM_CONNECTION)

    assert response.status_code == 201
    body = response.json()
    assert body['message'] == 'Form connection created'
    data = body['data']
    form_connection_id = data['id']
    trigger_url = f'{BASE_URL}/api/connect/{form_connection_id}/requests'
    assert data == {
        'id': form_connection_id,
        'name': 'Führerscheinantrag Test',
        'servicebw_form': 'FS-20417',
        'is_active': True,
        'mode': 'pull',
        'webhook_url': None,
        # Fields in catalog order: expiry_date comes before document_number
        'documents': [PID_VIEW, MDL_VIEW],
        'trigger_url': trigger_url,
        'pull_url': f'{trigger_url}/{{reference}}',
        'created_at': data['created_at'],
        'updated_at': data['updated_at'],
    }
    assert data['created_at'].endswith('Z')


def test_creating_stores_revision_1_with_its_eudiplo_configuration(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = _create(signed_in_client)['id']

    config_id = f'fc-{form_connection_id}-r1'
    (revision,) = _revisions(form_connection_id)
    assert revision.revision == 1
    assert revision.eudiplo_config_id == config_id
    assert revision.lifetime_seconds == settings.request_lifetime_seconds == 600
    assert revision.eudiplo_config_deleted_at is None
    assert revision.documents == [
        {
            'document_type': 'pid',
            'fields': ['family_name', 'given_name', 'birthdate', 'address_locality'],
        },
        {
            'document_type': 'mdl',
            'fields': ['expiry_date', 'document_number', 'driving_privileges'],
        },
    ]

    config = fake_eudiplo.configs[config_id]
    assert config['description'] == 'Führerscheinantrag Test'
    assert config['lifeTime'] == 600
    assert config['statusCheckMode'] == 'strict'
    assert [query['id'] for query in config['dcql_query']['credentials']] == [
        'pid',
        'mdl',
    ]
    trust_list = [{'trustListId': FAKE_TRUST_LIST_ID}]
    assert all(
        query['trusted_authorities'][0]['values'] == trust_list
        for query in config['dcql_query']['credentials']
    )
    assert revision.config_hash == config_hash(config)

    with SessionLocal() as db:
        form_connection = db.get(FormConnection, form_connection_id)
        assert form_connection is not None
        assert form_connection.current_revision == 1


def test_documents_are_stored_in_catalog_order(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    data = _create(
        signed_in_client,
        documents=list(reversed(NEW_FORM_CONNECTION['documents'])),
    )

    assert data['documents'] == [PID_VIEW, MDL_VIEW]


def test_texts_are_trimmed(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    data = _create(
        signed_in_client,
        name='  Führerscheinantrag Test ',
        servicebw_form=' FS-20417\n',
        webhook_url='  https://servicebw.example/hook ',
    )

    assert data['name'] == 'Führerscheinantrag Test'
    assert data['servicebw_form'] == 'FS-20417'
    assert data['webhook_url'] == 'https://servicebw.example/hook'


def test_creating_with_a_webhook_address_uses_webhook_mode(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    data = _create(signed_in_client, webhook_url='https://servicebw.example/hook')

    assert data['mode'] == 'webhook'
    assert data['webhook_url'] == 'https://servicebw.example/hook'


def test_a_blank_webhook_address_means_pull_mode(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    data = _create(signed_in_client, webhook_url='  ')

    assert data['mode'] == 'pull'
    assert data['webhook_url'] is None


PID = 'pid'
FAMILY_NAME = ['family_name']


@pytest.mark.parametrize(
    ('changes', 'message'),
    [
        ({'documents': []}, 'Add at least one document.'),
        (
            {'documents': [{'document_type': 'xyz', 'fields': FAMILY_NAME}]},
            "Unknown document type 'xyz'.",
        ),
        (
            {
                'documents': [
                    {'document_type': PID, 'fields': FAMILY_NAME},
                    {'document_type': PID, 'fields': ['given_name']},
                ]
            },
            "'Personal ID' is added more than once.",
        ),
        (
            {'documents': [{'document_type': PID, 'fields': []}]},
            "Select at least one field for 'Personal ID'.",
        ),
        (
            {
                'documents': [
                    {'document_type': PID, 'fields': FAMILY_NAME},
                    {'document_type': 'mdl', 'fields': []},
                ]
            },
            "Select at least one field for 'Driving licence'.",
        ),
        (
            {'documents': [{'document_type': PID, 'fields': ['abc']}]},
            "Unknown field 'abc' for 'Personal ID'.",
        ),
        (
            {'documents': [{'document_type': PID, 'fields': ['birth_date']}]},
            "Unknown field 'birth_date' for 'Personal ID'.",
        ),
        (
            {'documents': [{'document_type': PID, 'fields': FAMILY_NAME * 2}]},
            "'Family name' is selected more than once for 'Personal ID'.",
        ),
        ({'name': ''}, 'Enter a name.'),
        ({'name': '   '}, 'Enter a name.'),
        ({'name': 'x' * 201}, 'The name can have at most 200 characters.'),
        ({'servicebw_form': ''}, 'Enter the form ID.'),
        (
            {'servicebw_form': 'x' * 501},
            'The form ID can have at most 500 characters.',
        ),
        (
            {'webhook_url': 'http://servicebw.example/hook'},
            'The webhook address must be an https:// URL.',
        ),
        (
            {'webhook_url': 'servicebw.example/hook'},
            'The webhook address must be an https:// URL.',
        ),
        ({'webhook_url': 'https://'}, 'The webhook address must be an https:// URL.'),
        (
            {'webhook_url': 'https://servicebw example/hook'},
            'The webhook address must be an https:// URL.',
        ),
        (
            {'webhook_url': 'https://servicebw.example:port/hook'},
            'The webhook address must be an https:// URL.',
        ),
        (
            {'webhook_url': 'https://servicebw.example/' + 'x' * 2000},
            'The webhook address can have at most 2000 characters.',
        ),
    ],
)
def test_creating_refuses_invalid_input_with_a_message_that_names_the_problem(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    changes: dict[str, Any],
    message: str,
) -> None:
    response = signed_in_client.post(
        '/api/form-connections', json=NEW_FORM_CONNECTION | changes
    )

    assert response.status_code == 400
    assert response.json() == {'error': 'Validation error', 'message': message}
    assert fake_eudiplo.calls == []
    assert _count(FormConnection) == 0


def test_the_first_problem_in_form_order_is_reported(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = signed_in_client.post(
        '/api/form-connections',
        json={'name': '', 'servicebw_form': '', 'documents': []},
    )

    assert response.status_code == 400
    assert response.json()['message'] == 'Enter a name.'


def test_plain_http_webhook_addresses_need_allow_plain_http(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, 'allow_plain_http', True)

    data = _create(signed_in_client, webhook_url='http://servicebw.internal/hook')
    refused = signed_in_client.post(
        '/api/form-connections',
        json=NEW_FORM_CONNECTION | {'webhook_url': 'ftp://servicebw.internal/hook'},
    )

    assert data['webhook_url'] == 'http://servicebw.internal/hook'
    assert refused.status_code == 400
    assert refused.json()['message'] == (
        'The webhook address must be an https:// or http:// URL.'
    )


def test_a_payload_of_the_wrong_shape_is_refused(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = signed_in_client.post(
        '/api/form-connections', json={'name': 'Without documents'}
    )

    assert response.status_code == 400
    assert response.json()['error'] == 'Validation error'
    assert _count(FormConnection) == 0


@pytest.mark.parametrize(
    ('setting', 'name'),
    [
        ('eudiplo_url', 'EUDIPLO_URL'),
        ('eudiplo_client_secret', 'EUDIPLO_CLIENT_SECRET'),
        ('eudiplo_trust_list_id', 'EUDIPLO_TRUST_LIST_ID'),
    ],
)
def test_creating_answers_503_while_a_eudiplo_setting_is_empty(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    error_log: Callable[[str], str],
    setting: str,
    name: str,
) -> None:
    monkeypatch.setattr(settings, setting, '')

    response = signed_in_client.post('/api/form-connections', json=NEW_FORM_CONNECTION)

    assert response.status_code == 503
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Not configured',
        'message': NOT_CONFIGURED_MESSAGE,
        'error_id': error_id,
    }
    # Only the log names the setting, under the id that the answer carries
    assert 'EUDIPLO' not in response.text
    assert f'{name} is not set' in error_log(error_id)
    assert fake_eudiplo.calls == []
    assert _count(FormConnection) == 0


@pytest.mark.parametrize(
    ('status_code', 'error_name'),
    [
        (400, 'EudiploUnavailable'),
        # The client leaves 404 and 409 to its callers without logging them
        (404, 'EudiploNotFound'),
        (409, 'EudiploConflict'),
        (500, 'EudiploUnavailable'),
        (503, 'EudiploUnavailable'),
    ],
)
def test_creating_answers_502_and_saves_nothing_when_eudiplo_fails(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    error_log: Callable[[str], str],
    status_code: int,
    error_name: str,
) -> None:
    fake_eudiplo.fail('create_config', status_code)

    response = signed_in_client.post('/api/form-connections', json=NEW_FORM_CONNECTION)

    assert response.status_code == 502
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Upstream error',
        'message': CONFIG_FAILED,
        'error_id': error_id,
    }
    assert 'EUDIPLO' not in response.text
    # The log says what went wrong, but not what EUDIPLO answered
    line = error_log(error_id)
    assert error_name in line
    assert 'Forced failure' not in line
    assert _count(FormConnection) == 0
    assert _count(FormConnectionRevision) == 0


def test_the_configuration_is_deleted_again_when_saving_fails(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_commit(_db: Session) -> None:
        raise OperationalError('COMMIT', {}, Exception('connection lost'))

    monkeypatch.setattr(Session, 'commit', fail_commit)

    with pytest.raises(OperationalError):
        signed_in_client.post('/api/form-connections', json=NEW_FORM_CONNECTION)

    assert fake_eudiplo.call_names() == ['token', 'create_config', 'delete_config']
    assert fake_eudiplo.configs == {}
    assert _count(FormConnection) == 0


# Reading


def test_reopening_shows_the_same_urls(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)

    response = signed_in_client.get(f'/api/form-connections/{created["id"]}')

    assert response.status_code == 200
    assert response.json() == {'data': created, 'message': None}


def test_unknown_and_deleted_form_connections_are_not_found(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = _create(signed_in_client)['id']
    _delete(form_connection_id)

    deleted = signed_in_client.get(f'/api/form-connections/{form_connection_id}')
    unknown = signed_in_client.get('/api/form-connections/not-a-form-connection')

    assert deleted.status_code == unknown.status_code == 404
    assert deleted.json() == unknown.json() == NOT_FOUND


def test_the_list_hides_deleted_form_connections_and_shows_the_newest_first(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    first = _create(signed_in_client, name='First')
    second = _create(signed_in_client, name='Second', webhook_url='https://x.example')
    deleted = _create(signed_in_client, name='Deleted')
    _delete(deleted['id'])

    response = signed_in_client.get('/api/form-connections')

    assert response.status_code == 200
    assert response.json()['data'] == [
        {
            'id': second['id'],
            'name': 'Second',
            'servicebw_form': 'FS-20417',
            'is_active': True,
            'mode': 'webhook',
            'updated_at': second['updated_at'],
        },
        {
            'id': first['id'],
            'name': 'First',
            'servicebw_form': 'FS-20417',
            'is_active': True,
            'mode': 'pull',
            'updated_at': first['updated_at'],
        },
    ]


def test_the_list_orders_by_the_latest_change(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    first = _create(signed_in_client, name='First')
    second = _create(signed_in_client, name='Second')
    signed_in_client.put(
        f'/api/form-connections/{first["id"]}', json={'name': 'First, renamed'}
    )

    response = signed_in_client.get('/api/form-connections')

    assert [item['id'] for item in response.json()['data']] == [
        first['id'],
        second['id'],
    ]


def test_an_empty_list(signed_in_client: TestClient) -> None:
    response = signed_in_client.get('/api/form-connections')

    assert response.status_code == 200
    assert response.json() == {'data': [], 'message': None}


# Updating


def test_a_webhook_address_switches_to_webhook_mode_and_null_removes_it(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)
    path = f'/api/form-connections/{created["id"]}'
    calls_before = len(fake_eudiplo.calls)

    entered = signed_in_client.put(
        path, json={'webhook_url': 'https://servicebw.example/hook'}
    )
    removed = signed_in_client.put(path, json={'webhook_url': None})

    assert entered.status_code == removed.status_code == 200
    assert entered.json()['message'] == 'Form connection updated'
    assert entered.json()['data']['mode'] == 'webhook'
    assert entered.json()['data']['webhook_url'] == 'https://servicebw.example/hook'
    assert removed.json()['data']['mode'] == 'pull'
    assert removed.json()['data']['webhook_url'] is None
    for response in (entered, removed):
        assert response.json()['data']['trigger_url'] == created['trigger_url']
        assert response.json()['data']['pull_url'] == created['pull_url']
    # No new revision, and EUDIPLO isn't called
    assert len(_revisions(created['id'])) == 1
    assert len(fake_eudiplo.calls) == calls_before


def test_renaming_changes_only_what_is_sent_and_creates_no_revision(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, webhook_url='https://servicebw.example/hook')

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        json={'name': ' Renamed ', 'servicebw_form': 'FS-1'},
    )

    assert response.status_code == 200
    data = response.json()['data']
    assert data['name'] == 'Renamed'
    assert data['servicebw_form'] == 'FS-1'
    assert data['webhook_url'] == 'https://servicebw.example/hook'
    assert data['documents'] == created['documents']
    assert len(_revisions(created['id'])) == 1


def test_an_empty_update_changes_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)

    response = signed_in_client.put(f'/api/form-connections/{created["id"]}', json={})

    assert response.status_code == 200
    assert response.json()['data'] == created


@pytest.mark.parametrize(
    ('changes', 'message'),
    [
        ({'name': ''}, 'Enter a name.'),
        ({'name': None}, 'Enter a name.'),
        ({'servicebw_form': '  '}, 'Enter the form ID.'),
        (
            {'webhook_url': 'http://servicebw.example/hook'},
            'The webhook address must be an https:// URL.',
        ),
    ],
)
def test_updating_applies_the_same_validation(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    changes: dict[str, Any],
    message: str,
) -> None:
    created = _create(signed_in_client)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}', json=changes
    )

    assert response.status_code == 400
    assert response.json() == {'error': 'Validation error', 'message': message}
    unchanged = signed_in_client.get(f'/api/form-connections/{created["id"]}')
    assert unchanged.json()['data'] == created


def test_plain_http_webhook_addresses_can_be_saved_with_allow_plain_http(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created = _create(signed_in_client)
    monkeypatch.setattr(settings, 'allow_plain_http', True)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        json={'webhook_url': 'http://servicebw.internal/hook'},
    )

    assert response.status_code == 200
    assert response.json()['data']['mode'] == 'webhook'


def test_changing_the_documents_is_refused_for_now(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        json={'documents': [{'document_type': 'pid', 'fields': ['family_name']}]},
    )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Changing the documents is not supported yet.',
    }
    assert len(_revisions(created['id'])) == 1


def test_a_deactivated_form_connection_can_be_updated(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)
    with SessionLocal() as db:
        db.execute(
            update(FormConnection)
            .where(FormConnection.id == created['id'])
            .values(is_active=False)
        )
        db.commit()

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}', json={'name': 'Still editable'}
    )

    assert response.status_code == 200
    assert response.json()['data']['is_active'] is False
    assert response.json()['data']['name'] == 'Still editable'


def test_deleted_and_unknown_form_connections_cannot_be_updated(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)
    _delete(created['id'])

    deleted = signed_in_client.put(
        f'/api/form-connections/{created["id"]}', json={'name': 'Too late'}
    )
    unknown = signed_in_client.put(
        '/api/form-connections/not-a-form-connection', json={'name': 'Too late'}
    )

    assert deleted.status_code == unknown.status_code == 404
    assert deleted.json() == unknown.json() == NOT_FOUND


# Sign-in and CSRF


@pytest.mark.parametrize(
    ('method', 'path'),
    [
        ('GET', '/api/form-connections'),
        ('POST', '/api/form-connections'),
        ('GET', '/api/form-connections/some-id'),
        ('PUT', '/api/form-connections/some-id'),
    ],
)
def test_every_endpoint_needs_a_session(
    client: TestClient, fake_eudiplo: FakeEudiplo, method: str, path: str
) -> None:
    response = client.request(method, path, json=NEW_FORM_CONNECTION)

    assert response.status_code == 401
    assert response.json() == SIGN_IN_REQUIRED
    assert _count(FormConnection) == 0


@pytest.mark.parametrize(
    ('method', 'path'),
    [('POST', '/api/form-connections'), ('PUT', '/api/form-connections/some-id')],
)
def test_state_changes_need_a_json_body(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, method: str, path: str
) -> None:
    response = signed_in_client.request(
        method, path, content='name=x', headers={'Content-Type': 'text/plain'}
    )

    assert response.status_code == 415
    assert response.json()['error'] == 'Unsupported media type'
