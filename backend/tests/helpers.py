"""Form connections, triggered requests and shared documents for the request tests."""

import copy
from datetime import datetime, timezone
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.db import SessionLocal
from app.models import DocumentRequest, FormConnection
from tests.fake_eudiplo import FakeEudiplo

# quickstart.md V1: four fields of the ID and three of the driving licence
FORM_CONNECTION: dict[str, Any] = {
    'name': 'Führerscheinantrag Test',
    'servicebw_form': 'FS-20417',
    'documents': [
        {
            'document_type': 'pid',
            'fields': ['family_name', 'given_name', 'birthdate', 'address_locality'],
        },
        {
            'document_type': 'mdl',
            'fields': ['expiry_date', 'document_number', 'driving_privileges'],
        },
    ],
}

# What the wallet shares for FORM_CONNECTION, as EUDIPLO hands it out: the SD-JWT VC
# keeps its nesting and technical claims, and the mdoc's namespaces are merged.
# Both hold more than was asked for. The mdoc's driving_privileges shows a fixed
# EUDIPLO: up to 9.1.0, EUDIPLO empties each entry to {} (test_documents.py)
SHARED_CREDENTIALS: list[dict[str, Any]] = [
    {
        'id': 'pid',
        'values': [
            {
                'iss': 'https://pid-issuer.test',
                'vct': 'urn:eudi:pid:de:1',
                'iat': 1791500000,
                'exp': 1823036000,
                'family_name': 'Mustermann',
                'given_name': 'Erika',
                'birthdate': '1984-01-26',
                'nationalities': ['DE'],
                'address': {
                    'street_address': 'Heidestraße 17',
                    'postal_code': '70173',
                    'locality': 'Stuttgart',
                },
            }
        ],
    },
    {
        'id': 'mdl',
        'values': [
            {
                'family_name': 'Mustermann',
                'given_name': 'Erika',
                'document_number': 'B072RRE2I55',
                'expiry_date': '2034-03-01',
                'driving_privileges': [
                    {'vehicle_category_code': 'B', 'issue_date': '2019-03-01'}
                ],
                'portrait': {'type': 'Buffer', 'data': [255, 216, 255, 224]},
            }
        ],
    },
]

# The documents a pull delivers for SHARED_CREDENTIALS (contracts/integration-api.md)
DELIVERED_DOCUMENTS: list[dict[str, Any]] = [
    {
        'document_type': 'pid',
        'label': 'Personal ID',
        'fields': [
            {'key': 'family_name', 'label': 'Family name', 'value': 'Mustermann'},
            {'key': 'given_name', 'label': 'Given name', 'value': 'Erika'},
            {'key': 'birthdate', 'label': 'Date of birth', 'value': '1984-01-26'},
            {'key': 'address_locality', 'label': 'City or town', 'value': 'Stuttgart'},
        ],
    },
    {
        'document_type': 'mdl',
        'label': 'Driving licence',
        'fields': [
            {'key': 'expiry_date', 'label': 'Expiry date', 'value': '2034-03-01'},
            {
                'key': 'document_number',
                'label': 'Licence number',
                'value': 'B072RRE2I55',
            },
            {
                'key': 'driving_privileges',
                'label': 'Licence classes',
                'value': [{'vehicle_category_code': 'B', 'issue_date': '2019-03-01'}],
            },
        ],
    },
]


# Rules payloads (specs/002-connection-rules/contracts/management-api.md)


def target(
    document_type: str,
    field: str,
    part: str | None = None,
    licence_class: str | None = None,
) -> dict[str, Any]:
    """What a rule checks."""
    return {
        'document_type': document_type,
        'field': field,
        'part': part,
        'licence_class': licence_class,
    }


def rule(
    number: int,
    rule_target: dict[str, Any] | None,
    condition: dict[str, Any] | None,
    message: str,
    *,
    name: str | None = None,
) -> dict[str, Any]:
    """A rule `rule-{number}`, named "Rule NN" unless `name` says otherwise."""
    return {
        'type': 'rule',
        'id': f'rule-{number}',
        'name': f'Rule {number:02d}' if name is None else name,
        'mark': None,
        'target': rule_target,
        'condition': condition,
        'message': message,
    }


def group(
    number: int,
    items: list[dict[str, Any]],
    *,
    operator: str = 'and',
    name: str | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    """A group or sub-group `group-{number}`, named "Group NN" unless `name` says
    otherwise."""
    return {
        'type': 'group',
        'id': f'group-{number}',
        'name': f'Group {number:02d}' if name is None else name,
        'mark': None,
        'operator': operator,
        'message': message,
        'items': items,
    }


def main_branch(
    items: list[dict[str, Any]],
    *,
    branch_id: str | None = None,
    name: str = 'Standard',
    operator: str = 'and',
) -> dict[str, Any]:
    """The main branch; `branch_id` is None for a form connection being created."""
    return {
        'id': branch_id,
        'name': name,
        'description': None,
        'origin': 'main',
        'operator': operator,
        'operator_mark': None,
        'items': items,
    }


def rules_input(
    branches: list[dict[str, Any]],
    *,
    rule_base: int = 1,
    group_base: int = 1,
    base_version: int | None = None,
) -> dict[str, Any]:
    """The `rules` of a create or edit request."""
    return {
        'branches': branches,
        'numbering_base': {'rule': rule_base, 'group': group_base},
        'base_version': base_version,
        'replace': False,
    }


# User story 1's three rules, which FORM_CONNECTION's documents allow
AGE_RULE = rule(
    1,
    target('pid', 'birthdate'),
    {'operator': 'at_least_years_ago', 'years': 21},
    'You must be at least 21 years old.',
)
CLASS_RULE = rule(
    2,
    target('mdl', 'driving_privileges', 'classes'),
    {'operator': 'includes_one_of', 'values': ['B']},
    'You must hold a class B licence.',
)
HELD_RULE = rule(
    3,
    target('mdl', 'driving_privileges', 'issue_date', 'B'),
    {'operator': 'at_least_years_ago', 'years': 2},
    'You must have held class B for at least 2 years.',
)
US1_RULES = rules_input([main_branch([AGE_RULE, CLASS_RULE, HELD_RULE])])

# User story 2: lives in Stuttgart AND (at least 21 OR (at least 19 AND has held
# class B for at least 3 years)), with a group and a sub-group
STUTTGART_RULE = rule(
    1,
    target('pid', 'address_locality'),
    {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': False},
    'You must live in Stuttgart.',
)
AGE_21_RULE = rule(
    2,
    target('pid', 'birthdate'),
    {'operator': 'at_least_years_ago', 'years': 21},
    'You must be at least 21 years old.',
)
AGE_19_RULE = rule(
    3,
    target('pid', 'birthdate'),
    {'operator': 'at_least_years_ago', 'years': 19},
    'You must be at least 19 years old.',
)
HELD_3_YEARS_RULE = rule(
    4,
    target('mdl', 'driving_privileges', 'issue_date', 'B'),
    {'operator': 'at_least_years_ago', 'years': 3},
    'You must have held class B for at least 3 years.',
)


def us2_items(
    group_message: str | None = None, sub_group_message: str | None = None
) -> list[dict[str, Any]]:
    """User story 2's rules, with the group's and sub-group's own messages."""
    sub_group = group(
        2,
        [AGE_19_RULE, HELD_3_YEARS_RULE],
        name='Sub-group 02',
        message=sub_group_message,
    )
    return [
        STUTTGART_RULE,
        group(1, [AGE_21_RULE, sub_group], operator='or', message=group_message),
    ]


US2_RULES = rules_input([main_branch(us2_items())])


def now() -> datetime:
    return datetime.now(tz=timezone.utc)


def create_form_connection(client: TestClient, **changes: Any) -> str:
    """Create a form connection through the management API and return its id.

    The client must be signed in.
    """
    response = client.post('/api/form-connections', json=FORM_CONNECTION | changes)
    assert response.status_code == 201, response.json()
    form_connection_id: str = response.json()['data']['id']
    return form_connection_id


def update_form_connection(form_connection_id: str, **values: Any) -> None:
    """Change a form connection directly in the database."""
    with SessionLocal() as db:
        db.execute(
            update(FormConnection)
            .where(FormConnection.id == form_connection_id)
            .values(**values)
        )
        db.commit()


def requests_url(form_connection_id: str) -> str:
    return f'/api/connect/{form_connection_id}/requests'


def pull_url(form_connection_id: str, reference: str) -> str:
    return f'/api/connect/{form_connection_id}/requests/{reference}'


def trigger(client: TestClient, form_connection_id: str) -> dict[str, Any]:
    """Call the trigger URL and return the started request."""
    response = client.post(requests_url(form_connection_id))
    assert response.status_code == 201, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def stored_request(reference: str) -> DocumentRequest:
    """The request's row as it is stored now."""
    with SessionLocal() as db:
        return db.scalars(
            select(DocumentRequest).where(DocumentRequest.reference == reference)
        ).one()


def update_request(reference: str, **values: Any) -> None:
    """Change a request directly in the database, for example to let time pass."""
    with SessionLocal() as db:
        db.execute(
            update(DocumentRequest)
            .where(DocumentRequest.reference == reference)
            .values(**values)
        )
        db.commit()


def share(
    fake: FakeEudiplo,
    reference: str,
    *,
    consumed_at: datetime | None = None,
    credentials: list[dict[str, Any]] | None = None,
) -> datetime:
    """The citizen shares the documents in the wallet; returns when.

    EUDIPLO completes the request's session, which then holds the documents.
    """
    shared_at = consumed_at or now()
    fake.set_session(
        stored_request(reference).eudiplo_session_id,
        'completed',
        consumed_at=shared_at,
        credentials=copy.deepcopy(
            SHARED_CREDENTIALS if credentials is None else credentials
        ),
    )
    return shared_at


def fail_in_wallet(fake: FakeEudiplo, reference: str, failure_code: str | None) -> None:
    """The wallet answers with an error, or EUDIPLO rejects the documents."""
    fake.set_session(
        stored_request(reference).eudiplo_session_id,
        'failed',
        failure_code=failure_code,
        error_reason='Missing required claims' if failure_code is None else None,
    )
