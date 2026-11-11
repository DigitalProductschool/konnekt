from collections.abc import Callable
from datetime import date, datetime, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import (
    FormConnection,
    FormConnectionBranch,
    FormConnectionRevision,
    FormConnectionRuleSet,
)
from app.routers.form_connections import CONFIG_FAILED as CONFIG_FAILED_TEXT
from app.services.dcql import config_hash
from app.services.eudiplo import NOT_CONFIGURED_MESSAGE as NOT_CONFIGURED_MESSAGE_TEXT
from app.services.form_connections import state_of
from tests.api.test_form_connection_drafts import create_draft
from tests.fake_eudiplo import FAKE_TRUST_LIST_ID, FakeEudiplo

# The messages as answered without a German header (spec 009)
CONFIG_FAILED = CONFIG_FAILED_TEXT.en
NOT_CONFIGURED_MESSAGE = NOT_CONFIGURED_MESSAGE_TEXT.en

BASE_URL = 'https://middleware.test'
SIGN_IN_REQUIRED = {'error': 'Unauthorized', 'message': 'Sign in to continue'}
NOT_FOUND = {'error': 'Not found', 'message': 'Form connection not found'}

# quickstart.md V1
NEW_FORM_CONNECTION: dict[str, Any] = {
    'name': 'Führerscheinantrag Test',
    'description': 'FS-20417',
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


def _field(key: str, label: str, kind: str, **details: Any) -> dict[str, Any]:
    """A field as the API returns it: a text field unless `details` say more."""
    return {
        'key': key,
        'label': label,
        'kind': kind,
        'option_set': None,
        'date_of_birth': False,
        'parts': None,
        'multiple_values': False,
    } | details


# The driving licence's classes held, and each class's issue and expiry date
LICENCE_CLASS_PARTS = [
    {
        'key': 'classes',
        'label': 'Licence classes',
        'kind': 'enum',
        'option_set': 'licence_classes',
        'per_licence_class': False,
        'multiple_values': True,
    },
    {
        'key': 'issue_date',
        'label': 'Issue date',
        'kind': 'date',
        'option_set': None,
        'per_licence_class': True,
        'multiple_values': False,
    },
    {
        'key': 'expiry_date',
        'label': 'Expiry date',
        'kind': 'date',
        'option_set': None,
        'per_licence_class': True,
        'multiple_values': False,
    },
]

PID_VIEW = {
    'document_type': 'pid',
    'label': 'Personal ID',
    'fields': [
        _field('family_name', 'Family name', 'text'),
        _field('given_name', 'Given name', 'text'),
        _field('birthdate', 'Date of birth', 'date', date_of_birth=True),
        _field('address_locality', 'City or town', 'text'),
    ],
}
MDL_VIEW = {
    'document_type': 'mdl',
    'label': 'Driving licence',
    'fields': [
        _field('expiry_date', 'Expiry date', 'date'),
        _field('document_number', 'Licence number', 'text'),
        _field(
            'driving_privileges',
            'Licence classes',
            'parts',
            parts=LICENCE_CLASS_PARTS,
        ),
    ],
}


def _create(client: TestClient, **changes: Any) -> dict[str, Any]:
    response = client.post('/api/form-connections', json=NEW_FORM_CONNECTION | changes)
    assert response.status_code == 201, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def _count(
    model: type[FormConnection]
    | type[FormConnectionRevision]
    | type[FormConnectionRuleSet],
) -> int:
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


# The catalog and the value sets


def test_the_catalog_returns_each_fields_kind_and_parts(
    signed_in_client: TestClient,
) -> None:
    response = signed_in_client.get('/api/document-types')

    assert response.status_code == 200
    fields = {
        (document_type['key'], field['key']): field
        for document_type in response.json()['data']
        for field in document_type['fields']
    }
    assert fields['pid', 'family_name'] == _field('family_name', 'Family name', 'text')
    assert fields['pid', 'birthdate'] == _field(
        'birthdate', 'Date of birth', 'date', date_of_birth=True
    )
    assert fields['pid', 'nationalities'] == _field(
        'nationalities',
        'Nationality',
        'enum',
        option_set='countries',
        multiple_values=True,
    )
    assert fields['pid', 'place_of_birth'] == _field(
        'place_of_birth',
        'Place of birth',
        'parts',
        parts=[
            {
                'key': 'country',
                'label': 'Country',
                'kind': 'enum',
                'option_set': 'countries',
                'per_licence_class': False,
                'multiple_values': False,
            },
            {
                'key': 'region',
                'label': 'Region',
                'kind': 'text',
                'option_set': None,
                'per_licence_class': False,
                'multiple_values': False,
            },
            {
                'key': 'locality',
                'label': 'City or town',
                'kind': 'text',
                'option_set': None,
                'per_licence_class': False,
                'multiple_values': False,
            },
        ],
    )
    assert fields['pid', 'picture'] == _field('picture', 'Photo', 'image')
    assert fields['mdl', 'height'] == _field('height', 'Height (cm)', 'number')
    assert fields['mdl', 'sex'] == _field('sex', 'Sex', 'enum', option_set='sex')
    assert fields['mdl', 'driving_privileges'] == _field(
        'driving_privileges', 'Licence classes', 'parts', parts=LICENCE_CLASS_PARTS
    )
    # Every field and part says whether a document can give several values for it:
    # only the Personal ID's nationalities and the driving licence's classes can
    several = [key for key, field in fields.items() if field['multiple_values']] + [
        (*key, part['key'])
        for key, field in fields.items()
        for part in field['parts'] or []
        if part['multiple_values']
    ]
    assert several == [
        ('pid', 'nationalities'),
        ('mdl', 'driving_privileges', 'classes'),
    ]
    assert all(isinstance(field['multiple_values'], bool) for field in fields.values())
    assert all(
        isinstance(part['multiple_values'], bool)
        for field in fields.values()
        for part in field['parts'] or []
    )


def test_the_value_sets_are_returned(signed_in_client: TestClient) -> None:
    response = signed_in_client.get('/api/option-sets')

    assert response.status_code == 200
    option_sets = {
        option_set['key']: option_set['options']
        for option_set in response.json()['data']
    }
    assert list(option_sets) == [
        'countries',
        'sex',
        'licence_classes',
        'eye_colours',
        'hair_colours',
    ]
    assert len(option_sets['countries']) == 249
    assert {'value': 'DE', 'label': 'Germany', 'description': None} in (
        option_sets['countries']
    )
    # Sex codes are numbers, as the credentials hold them
    assert option_sets['sex'][:3] == [
        {'value': 0, 'label': 'Not known', 'description': None},
        {'value': 1, 'label': 'Male', 'description': None},
        {'value': 2, 'label': 'Female', 'description': None},
    ]
    assert {'value': 'B', 'label': 'B', 'description': 'Cars up to 3.5 t'} in (
        option_sets['licence_classes']
    )
    assert {'value': 'hazel', 'label': 'Hazel', 'description': None} in (
        option_sets['eye_colours']
    )


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
    pull_url = f'{trigger_url}/{{reference}}'
    assert data == {
        'id': form_connection_id,
        'name': 'Führerscheinantrag Test',
        'description': 'FS-20417',
        'is_active': True,
        # Fields in catalog order: expiry_date comes before document_number
        'documents': [PID_VIEW, MDL_VIEW],
        'trigger_url': trigger_url,
        'pull_url': pull_url,
        'branches': [
            {
                'id': data['branches'][0]['id'],
                'name': 'Standard',
                'description': None,
                'origin': 'main',
                'operator': 'and',
                'operator_mark': None,
                'items': [],
                'is_main': True,
                'pull_url': pull_url,
            }
        ],
        'status': 'published',
        'rule_set_version': 1,
        'next_rule_number': 1,
        'next_group_number': 1,
        'created_at': data['created_at'],
        'updated_at': data['updated_at'],
        'state': 'live',
        'published_at': data['published_at'],
        'activated_at': data['activated_at'],
        'deactivated_at': None,
        'start_date': None,
        # The activity's entries are test_activity.py's
        'last_activity': data['last_activity'],
    }
    assert data['created_at'].endswith('Z')
    assert data['published_at'].endswith('Z')


def test_a_form_connection_created_without_rules_has_a_main_branch_without_rules(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    data = _create(signed_in_client)

    [branch] = data['branches']
    assert (branch['name'], branch['is_main'], branch['items']) == (
        'Standard',
        True,
        [],
    )
    # The main branch keeps spec 001's pull URL
    assert branch['pull_url'] == data['pull_url']
    assert data['rule_set_version'] == 1
    assert (data['next_rule_number'], data['next_group_number']) == (1, 1)
    with SessionLocal() as db:
        form_connection = db.get(FormConnection, data['id'])
        assert form_connection is not None
        assert form_connection.current_rule_set == 1
        rows = db.scalars(
            select(FormConnectionBranch).where(
                FormConnectionBranch.form_connection_id == data['id']
            )
        ).all()
        assert [(row.id, row.is_main, row.deleted_at) for row in rows] == [
            (branch['id'], True, None)
        ]
        rule_set = db.scalars(
            select(FormConnectionRuleSet).where(
                FormConnectionRuleSet.form_connection_id == data['id']
            )
        ).one()
        assert rule_set.version == 1
        # The snapshot leaves out what the API derives
        assert rule_set.branches == [
            {
                key: value
                for key, value in branch.items()
                if key not in ('is_main', 'pull_url')
            }
        ]

    reopened = signed_in_client.get(f'/api/form-connections/{data["id"]}')
    assert reopened.json()['data']['branches'] == data['branches']


def test_each_form_connection_has_a_main_branch_of_its_own(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    first = _create(signed_in_client)['branches'][0]['id']
    second = _create(signed_in_client)['branches'][0]['id']

    assert first != second


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


def test_documents_are_answered_in_the_order_sent(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """Spec 010, FR-045: the team's order; the revision keeps catalog order.

    test_document_order.py pins the revision and the configuration.
    """
    data = _create(
        signed_in_client,
        documents=list(reversed(NEW_FORM_CONNECTION['documents'])),
    )

    assert data['documents'] == [MDL_VIEW, PID_VIEW]


def test_texts_are_trimmed(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    data = _create(
        signed_in_client,
        name='  Führerscheinantrag Test ',
        description=' FS-20417\n',
    )

    assert data['name'] == 'Führerscheinantrag Test'
    assert data['description'] == 'FS-20417'


# Spec 006, US1-AS1 and the edge case "Only spaces": the description is optional
@pytest.mark.parametrize(
    'description',
    [
        pytest.param(None, id='absent'),
        pytest.param('', id='empty'),
        pytest.param('   ', id='only spaces'),
    ],
)
def test_creating_without_a_description_stores_an_empty_one(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    description: str | None,
) -> None:
    payload = {
        key: value for key, value in NEW_FORM_CONNECTION.items() if key != 'description'
    }
    if description is not None:
        payload['description'] = description

    response = signed_in_client.post('/api/form-connections', json=payload)

    assert response.status_code == 201, response.json()
    data = response.json()['data']
    assert data['description'] == ''
    assert data['status'] == 'published'
    reopened = signed_in_client.get(f'/api/form-connections/{data["id"]}')
    assert reopened.json()['data']['description'] == ''


def test_a_description_of_500_characters_is_accepted(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    data = _create(signed_in_client, description='x' * 500)

    assert data['description'] == 'x' * 500


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
        ({'name': ''}, 'Enter a name for the connection.'),
        ({'name': '   '}, 'Enter a name for the connection.'),
        ({'name': 'x' * 201}, 'The name can have at most 200 characters.'),
        (
            {'description': 'x' * 501},
            'The description can have at most 500 characters.',
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
        json={'name': '', 'description': '', 'documents': []},
    )

    assert response.status_code == 400
    assert response.json()['message'] == 'Enter a name for the connection.'


def test_the_description_is_checked_after_the_name(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = signed_in_client.post(
        '/api/form-connections',
        json=NEW_FORM_CONNECTION | {'name': 'x' * 201, 'description': 'x' * 501},
    )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': 'The name can have at most 200 characters.',
    }
    assert _count(FormConnection) == 0


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
    second = _create(signed_in_client, name='Second')
    deleted = _create(signed_in_client, name='Deleted')
    _delete(deleted['id'])

    response = signed_in_client.get('/api/form-connections')

    assert response.status_code == 200
    assert response.json()['data'] == [
        {
            'id': second['id'],
            'name': 'Second',
            'description': 'FS-20417',
            'is_active': True,
            'status': 'published',
            'updated_at': second['updated_at'],
            'state': 'live',
            'published_at': second['published_at'],
            'deactivated_at': None,
            'start_date': None,
            'step': None,
        },
        {
            'id': first['id'],
            'name': 'First',
            'description': 'FS-20417',
            'is_active': True,
            'status': 'published',
            'updated_at': first['updated_at'],
            'state': 'live',
            'published_at': first['published_at'],
            'deactivated_at': None,
            'start_date': None,
            'step': None,
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


# The state and the status dates (spec 010, research R1, R3, data-model 1.2, 1.4)

ACTIVATED_AT = datetime(2026, 10, 1, 8, 30, tzinfo=timezone.utc)
DEACTIVATED_AT = datetime(2026, 10, 20, 14, 5, tzinfo=timezone.utc)


def _set_columns(form_connection_id: str, **values: Any) -> None:
    """Write a row's columns directly, as the transitions of later tasks will."""
    with SessionLocal() as db:
        db.execute(
            update(FormConnection)
            .where(FormConnection.id == form_connection_id)
            .values(**values)
        )
        db.commit()


def _stored(form_connection_id: str) -> FormConnection:
    with SessionLocal() as db:
        form_connection = db.get(FormConnection, form_connection_id)
    assert form_connection is not None
    return form_connection


def test_state_of_derives_the_four_states(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(signed_in_client)
    live_id = _create(signed_in_client, name='Live')['id']
    deactivated_id = _create(signed_in_client, name='Deactivated')['id']
    _set_columns(deactivated_id, is_active=False)
    scheduled_id = _create(signed_in_client, name='Scheduled')['id']
    # Nothing writes a start date through the API yet: set up the row directly
    _set_columns(scheduled_id, is_active=False, start_date=date(2026, 12, 1))

    assert state_of(_stored(draft_id)) == 'draft'
    assert state_of(_stored(live_id)) == 'live'
    assert state_of(_stored(deactivated_id)) == 'deactivated'
    assert state_of(_stored(scheduled_id)) == 'scheduled'


def _three_connections(client: TestClient) -> tuple[str, str, str]:
    """A draft in the documents step, a live and a deactivated connection."""
    draft_id = create_draft(client, name='Draft', step='documents')
    live_id = _create(client, name='Live')['id']
    # Deactivated before, then active again: deactivated_at is kept but not answered
    _set_columns(live_id, activated_at=ACTIVATED_AT, deactivated_at=DEACTIVATED_AT)
    deactivated_id = _create(client, name='Deactivated')['id']
    _set_columns(
        deactivated_id,
        is_active=False,
        activated_at=ACTIVATED_AT,
        deactivated_at=DEACTIVATED_AT,
    )
    return draft_id, live_id, deactivated_id


def _published_at_of(form_connection_id: str) -> str:
    published_at = _stored(form_connection_id).published_at
    assert published_at is not None
    return published_at.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def _expected_summary_fields(
    draft_id: str, live_id: str, deactivated_id: str
) -> dict[str, dict[str, Any]]:
    return {
        draft_id: {
            'status': 'draft',
            'state': 'draft',
            'published_at': None,
            'deactivated_at': None,
            'start_date': None,
            'step': 'documents',
        },
        live_id: {
            'status': 'published',
            'state': 'live',
            'published_at': _published_at_of(live_id),
            'deactivated_at': None,
            'start_date': None,
            'step': None,
        },
        deactivated_id: {
            'status': 'published',
            'state': 'deactivated',
            'published_at': _published_at_of(deactivated_id),
            'deactivated_at': '2026-10-20T14:05:00Z',
            'start_date': None,
            'step': None,
        },
    }


def _summary_fields(item: dict[str, Any]) -> dict[str, Any]:
    keys = ('status', 'state', 'published_at', 'deactivated_at', 'start_date', 'step')
    return {key: item[key] for key in keys}


def test_the_list_answers_the_state_and_the_dates(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    ids = _three_connections(signed_in_client)

    response = signed_in_client.get('/api/form-connections')

    assert response.status_code == 200
    assert {
        item['id']: _summary_fields(item) for item in response.json()['data']
    } == _expected_summary_fields(*ids)


def test_the_search_answers_the_state_and_the_dates(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    ids = _three_connections(signed_in_client)

    response = signed_in_client.get('/api/form-connections/search')

    assert response.status_code == 200
    assert {
        item['id']: _summary_fields(item) for item in response.json()['data']['items']
    } == _expected_summary_fields(*ids)


def test_the_detail_answers_the_state_and_the_dates(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id, live_id, deactivated_id = _three_connections(signed_in_client)

    draft = signed_in_client.get(f'/api/form-connections/{draft_id}').json()['data']
    live = signed_in_client.get(f'/api/form-connections/{live_id}').json()['data']
    deactivated = signed_in_client.get(
        f'/api/form-connections/{deactivated_id}'
    ).json()['data']

    assert draft['status'] == draft['state'] == 'draft'
    assert 'published_at' not in draft
    assert {
        key: live[key]
        for key in (
            'state',
            'published_at',
            'activated_at',
            'deactivated_at',
            'start_date',
        )
    } == {
        'state': 'live',
        'published_at': _published_at_of(live_id),
        'activated_at': '2026-10-01T08:30:00Z',
        'deactivated_at': None,
        'start_date': None,
    }
    assert {
        key: deactivated[key]
        for key in (
            'state',
            'published_at',
            'activated_at',
            'deactivated_at',
            'start_date',
        )
    } == {
        'state': 'deactivated',
        'published_at': _published_at_of(deactivated_id),
        'activated_at': '2026-10-01T08:30:00Z',
        'deactivated_at': '2026-10-20T14:05:00Z',
        'start_date': None,
    }


def test_a_scheduled_connection_answers_its_start_date_as_written(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    scheduled_id = _create(signed_in_client)['id']
    _set_columns(scheduled_id, is_active=False, start_date=date(2026, 12, 1))

    detail = signed_in_client.get(f'/api/form-connections/{scheduled_id}').json()[
        'data'
    ]
    [item] = signed_in_client.get('/api/form-connections').json()['data']

    assert detail['state'] == item['state'] == 'scheduled'
    assert detail['start_date'] == item['start_date'] == '2026-12-01'
    assert detail['deactivated_at'] is item['deactivated_at'] is None


# Updating


def test_renaming_changes_only_what_is_sent_and_creates_no_revision(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)
    calls_before = len(fake_eudiplo.calls)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        json={'name': ' Renamed ', 'description': 'FS-1'},
    )

    assert response.status_code == 200
    assert response.json()['message'] == 'Form connection updated'
    data = response.json()['data']
    assert data['name'] == 'Renamed'
    assert data['description'] == 'FS-1'
    assert data['documents'] == created['documents']
    assert data['trigger_url'] == created['trigger_url']
    assert data['pull_url'] == created['pull_url']
    # No new revision, and EUDIPLO isn't called
    assert len(_revisions(created['id'])) == 1
    assert len(fake_eudiplo.calls) == calls_before

    # Spec 006, US1-AS3 and FR-010: clearing the description is the same
    calls = list(fake_eudiplo.calls)
    rule_sets = _count(FormConnectionRuleSet)

    cleared = signed_in_client.put(
        f'/api/form-connections/{created["id"]}', json={'description': None}
    )

    assert cleared.status_code == 200, cleared.json()
    data = cleared.json()['data']
    assert data['name'] == 'Renamed'
    assert data['description'] == ''
    assert data['documents'] == created['documents']
    assert data['trigger_url'] == created['trigger_url']
    assert data['pull_url'] == created['pull_url']
    assert data['branches'] == created['branches']
    assert data['rule_set_version'] == created['rule_set_version']
    assert len(_revisions(created['id'])) == 1
    assert _count(FormConnectionRuleSet) == rule_sets
    assert fake_eudiplo.calls == calls


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
        ({'name': ''}, 'Enter a name for the connection.'),
        ({'name': None}, 'Enter a name for the connection.'),
        (
            {'description': 'x' * 501},
            'The description can have at most 500 characters.',
        ),
        (
            {'name': 'x' * 201, 'description': 'x' * 501},
            'The name can have at most 200 characters.',
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


# Spec 006, FR-002: null, '' and spaces clear the description
@pytest.mark.parametrize(
    'description', [None, '', '  '], ids=['null', 'empty', 'spaces']
)
def test_updating_clears_the_description(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    description: str | None,
) -> None:
    created = _create(signed_in_client)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}', json={'description': description}
    )

    assert response.status_code == 200, response.json()
    assert response.json()['data']['description'] == ''
    reopened = signed_in_client.get(f'/api/form-connections/{created["id"]}')
    assert reopened.json()['data']['description'] == ''


def test_an_update_without_the_description_leaves_it_unchanged(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}', json={'name': 'Renamed'}
    )

    assert response.status_code == 200, response.json()
    assert response.json()['data']['description'] == 'FS-20417'


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
        ('GET', '/api/document-types'),
        ('GET', '/api/option-sets'),
        ('GET', '/api/form-connections'),
        ('POST', '/api/form-connections'),
        ('GET', '/api/form-connections/some-id'),
        ('PUT', '/api/form-connections/some-id'),
        ('POST', '/api/form-connections/some-id/deactivate'),
        ('POST', '/api/form-connections/some-id/activate'),
        ('DELETE', '/api/form-connections/some-id'),
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
    [
        ('POST', '/api/form-connections'),
        ('PUT', '/api/form-connections/some-id'),
        ('POST', '/api/form-connections/some-id/deactivate'),
        ('POST', '/api/form-connections/some-id/activate'),
        ('DELETE', '/api/form-connections/some-id'),
    ],
)
def test_state_changes_need_a_json_body(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, method: str, path: str
) -> None:
    response = signed_in_client.request(
        method, path, content='name=x', headers={'Content-Type': 'text/plain'}
    )

    assert response.status_code == 415
    assert response.json()['error'] == 'Unsupported media type'
