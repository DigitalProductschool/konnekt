"""Connection drafts through the management API (spec 005, research R14).

Part 1 (T016): the draft lifecycle. Creating, reading, listing, saving, numbering,
publishing and deleting drafts, the boundaries between draft and published
endpoints, and authentication. The publish parity table (T017), the
concurrency tests (T018) and the conflicts of two team members (T046) follow
below and reuse the helpers at the top. Last, spec 007's variant identifiers: the ids
a draft's variants keep from their first save through publishing, and the migration
that gives the stored drafts' branches theirs (research R10, data-model.md section
6.1, FR-029).
"""

import importlib.util
import json
import threading
import uuid
from collections.abc import Callable
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from httpx2 import Request, Response
from sqlalchemy import func, select, text
from sqlalchemy.orm import InstrumentedAttribute

from app.db import SessionLocal, engine
from app.language import resolve_text
from app.models import (
    FormConnection,
    FormConnectionBranch,
    FormConnectionRevision,
    FormConnectionRuleSet,
    UserAccount,
)
from app.routers.form_connections import CONFIG_FAILED as CONFIG_FAILED_TEXT
from app.schemas import DraftPublish, DraftUpdate
from app.schemas import FormConnection as FormConnectionView
from app.services import deletions, drafts, form_connections
from app.services.activity import Actor
from app.services.dcql import config_hash
from tests.conftest import TEST_USERNAME
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    branch_pull_url,
    create_form_connection,
    group,
    main_branch,
    rule,
    rules_input,
    target,
    trigger,
    us2_items,
    variant,
)


def _answered(detail: Any) -> dict[str, Any]:
    """A detail as `errors.py` answers it without a German header (spec 009)."""
    return {**detail, 'message': resolve_text(detail['message'])}


# The messages as answered without a German header (spec 009)
CONFIG_FAILED = CONFIG_FAILED_TEXT.en
DRAFT_CHANGED_DETAIL = _answered(form_connections.DRAFT_CHANGED_DETAIL)
DRAFT_PUBLISHED_DETAIL = _answered(form_connections.DRAFT_PUBLISHED_DETAIL)
NOT_PUBLISHED_DETAIL = _answered(form_connections.NOT_PUBLISHED_DETAIL)

BASE = '/api/form-connections'
BASE_URL = 'https://middleware.test'
SIGN_IN_REQUIRED = {'error': 'Unauthorized', 'message': 'Sign in to continue'}
NOT_FOUND = {'error': 'Not found', 'message': 'Form connection not found'}

# What a draft answers: no URLs, no rule set version and no is_active (FR-006)
DRAFT_KEYS = {
    'status',
    'state',
    'id',
    'name',
    'description',
    'documents',
    'branches',
    'next_rule_number',
    'next_group_number',
    'step',
    'version',
    'created_at',
    'updated_at',
    'last_activity',
}


# Helpers, shared with the parity (T017) and concurrency (T018) tests


def draft_rules(
    branches: list[dict[str, Any]], *, rule_base: int = 1, group_base: int = 1
) -> dict[str, Any]:
    """A draft's `rules` (DraftRules): its branches and the editor's numbering base."""
    return {
        'branches': branches,
        'numbering_base': {'rule': rule_base, 'group': group_base},
    }


def draft_body(**changes: Any) -> dict[str, Any]:
    """A minimal draft: a name, nothing else chosen yet, in the first step.

    `changes` replaces keys, and adds `version` or `replace` for a save.
    """
    body: dict[str, Any] = {
        'name': 'Führerscheinantrag Entwurf',
        'description': '',
        'documents': [],
        'rules': draft_rules([main_branch([])]),
        'step': 'connection',
    }
    return body | changes


def create_draft(client: TestClient, **changes: Any) -> str:
    """Create a draft through the API and return its id. The client is signed in."""
    response = client.post(f'{BASE}/drafts', json=draft_body(**changes))
    assert response.status_code == 201, response.json()
    draft_id: str = response.json()['data']['id']
    return draft_id


def get(client: TestClient, form_connection_id: str) -> dict[str, Any]:
    """A form connection or draft as `GET /api/form-connections/{id}` answers it."""
    response = client.get(f'{BASE}/{form_connection_id}')
    assert response.status_code == 200, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def save(client: TestClient, draft_id: str, version: int, **changes: Any) -> Response:
    """Save a draft over its `version` with `draft_body(**changes)`."""
    return client.put(
        f'{BASE}/{draft_id}/draft', json=draft_body(version=version, **changes)
    )


def publish_body(version: int, **changes: Any) -> dict[str, Any]:
    """A complete `DraftPublish`: helpers.FORM_CONNECTION plus the draft version."""
    return FORM_CONNECTION | {'version': version} | changes


def publish(
    client: TestClient, draft_id: str, version: int, **changes: Any
) -> Response:
    """Publish a draft with `publish_body(version, **changes)`."""
    return client.post(
        f'{BASE}/{draft_id}/publish', json=publish_body(version, **changes)
    )


def stored(form_connection_id: str) -> FormConnection | None:
    """The form connection's row as it is stored now."""
    with SessionLocal() as db:
        return db.get(FormConnection, form_connection_id)


def rows(form_connection_id: str) -> tuple[int, int, int]:
    """How many revisions, rule sets and branch rows the form connection has."""
    with SessionLocal() as db:

        def count(column: InstrumentedAttribute[str]) -> int:
            return (
                db.scalar(select(func.count()).where(column == form_connection_id)) or 0
            )

        return (
            count(FormConnectionRevision.form_connection_id),
            count(FormConnectionRuleSet.form_connection_id),
            count(FormConnectionBranch.form_connection_id),
        )


def draft_is_sql_null(form_connection_id: str) -> bool:
    """Whether the row's `draft` column is SQL NULL (not JSON null)."""
    with SessionLocal() as db:
        return (
            db.scalar(
                select(func.count())
                .select_from(FormConnection)
                .where(
                    FormConnection.id == form_connection_id,
                    FormConnection.draft.is_(None),
                )
            )
            == 1
        )


def is_uuid(value: object) -> bool:
    """Whether `value` is a UUID string in its canonical form."""
    return isinstance(value, str) and str(uuid.UUID(value)) == value


def assert_ids_assigned(
    answered: list[dict[str, Any]], sent: list[dict[str, Any]]
) -> None:
    """The branches answered are the ones sent, each with a UUID of its own: the
    one sent, or one the server assigned where it sent null (spec 007, R10)."""
    assert len(answered) == len(sent)
    ids = [branch['id'] for branch in answered]
    assert all(is_uuid(branch_id) for branch_id in ids)
    assert len(set(ids)) == len(ids)
    for answer, request in zip(answered, sent, strict=True):
        if request['id'] is not None:
            assert answer['id'] == request['id']
        assert answer | {'id': None} == request | {'id': None}


def item_ids(branch: dict[str, Any]) -> list[str]:
    """The identifiers of a branch's items, depth first."""
    ids: list[str] = []
    for item in branch['items']:
        ids.append(item['id'])
        if item['type'] == 'group':
            ids.extend(item_ids(item))
    return ids


# Create


def test_creating_a_draft_stores_version_1_without_eudiplo(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = signed_in_client.post(f'{BASE}/drafts', json=draft_body())

    assert response.status_code == 201
    assert response.json()['message'] == 'Draft saved'
    data = response.json()['data']
    assert set(data) == DRAFT_KEYS
    assert data['status'] == 'draft'
    assert data['version'] == 1
    assert data['step'] == 'connection'
    assert data['name'] == 'Führerscheinantrag Entwurf'
    assert data['description'] == ''
    assert data['documents'] == []
    assert data['next_rule_number'] == 1
    assert data['next_group_number'] == 1
    # FR-005, SC-002: nothing a request could use
    assert fake_eudiplo.calls == []
    assert rows(data['id']) == (0, 0, 0)
    row = stored(data['id'])
    assert row is not None
    assert row.published_at is None
    assert row.current_revision is None
    assert row.current_rule_set is None
    assert row.draft_version == 1


def test_creating_a_draft_keeps_its_content_and_step(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    branches = [main_branch([AGE_RULE]), variant([AGE_RULE])]

    response = signed_in_client.post(
        f'{BASE}/drafts',
        json=draft_body(
            description='FS-20417',
            documents=[{'document_type': 'pid', 'fields': ['birthdate']}],
            rules=draft_rules(branches),
            step='rules',
        ),
    )

    assert response.status_code == 201, response.json()
    data = response.json()['data']
    assert data['description'] == 'FS-20417'
    assert data['step'] == 'rules'
    assert [document['document_type'] for document in data['documents']] == ['pid']
    assert [field['key'] for field in data['documents'][0]['fields']] == ['birthdate']
    # Null ids sent, UUIDs answered (spec 007, research R10)
    assert_ids_assigned(data['branches'], branches)
    assert data['next_rule_number'] == 2
    assert fake_eudiplo.calls == []
    assert rows(data['id']) == (0, 0, 0)


def without_description(body: dict[str, Any]) -> dict[str, Any]:
    """`body` without its `description` key."""
    return {key: value for key, value in body.items() if key != 'description'}


def test_creating_a_draft_without_a_description_stores_an_empty_one(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """Spec 006, FR-002: the description is optional."""
    response = signed_in_client.post(
        f'{BASE}/drafts', json=without_description(draft_body())
    )

    assert response.status_code == 201, response.json()
    assert response.json()['data']['description'] == ''


def test_creating_a_draft_refuses_a_broken_structure(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = signed_in_client.post(f'{BASE}/drafts', json=draft_body(name='  '))

    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Enter a name for the connection.',
    }
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(FormConnection)) == 0


# Get and list


def test_getting_a_draft_answers_its_content(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = signed_in_client.post(
        f'{BASE}/drafts', json=draft_body(step='documents')
    ).json()['data']

    data = get(signed_in_client, created['id'])

    assert data == created
    assert set(data) == DRAFT_KEYS
    assert data['status'] == 'draft'


def test_getting_an_unknown_draft_answers_404(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = signed_in_client.get(f'{BASE}/{uuid.uuid4()}')

    assert response.status_code == 404
    assert response.json() == NOT_FOUND


def test_drafts_are_listed_with_published_connections_by_last_save(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(signed_in_client)
    published_id = create_form_connection(signed_in_client)
    other_draft_id = create_draft(signed_in_client, name='Zweiter Entwurf')
    # Saving the first draft makes it the most recently updated (FR-007)
    assert save(signed_in_client, draft_id, 1, name='Erster Entwurf').status_code == 200

    response = signed_in_client.get(BASE)

    assert response.status_code == 200
    summaries = response.json()['data']
    assert [(s['id'], s['status']) for s in summaries] == [
        (draft_id, 'draft'),
        (other_draft_id, 'draft'),
        (published_id, 'published'),
    ]
    assert summaries[0]['name'] == 'Erster Entwurf'
    assert summaries[0]['description'] == ''
    assert summaries[0]['updated_at'] == get(signed_in_client, draft_id)['updated_at']
    updated = [s['updated_at'] for s in summaries]
    assert updated == sorted(updated, reverse=True)


def test_a_team_with_only_a_draft_has_one_connection(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The first-connection screen counts the list (FR-011)."""
    draft_id = create_draft(signed_in_client)

    summaries = signed_in_client.get(BASE).json()['data']

    assert len(summaries) == 1
    assert summaries[0]['id'] == draft_id
    assert summaries[0]['status'] == 'draft'


# Save


def test_saving_a_draft_replaces_its_content_and_raises_its_version(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(signed_in_client)
    branches = [
        main_branch([AGE_RULE, CLASS_RULE]),
        variant([AGE_RULE, CLASS_RULE], name='Ambulance'),
    ]

    response = save(
        signed_in_client,
        draft_id,
        1,
        name='  Führerschein Klasse B  ',
        description='FS-20417',
        documents=FORM_CONNECTION['documents'],
        rules=draft_rules(branches),
        step='rules',
    )

    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Draft saved'
    data = response.json()['data']
    assert data['version'] == 2
    assert data['name'] == 'Führerschein Klasse B'
    assert data['description'] == 'FS-20417'
    assert [
        (document['document_type'], [field['key'] for field in document['fields']])
        for document in data['documents']
    ] == [
        ('pid', ['family_name', 'given_name', 'birthdate', 'address_locality']),
        ('mdl', ['expiry_date', 'document_number', 'driving_privileges']),
    ]
    assert_ids_assigned(data['branches'], branches)
    assert data['step'] == 'rules'
    assert get(signed_in_client, draft_id) == data
    assert fake_eudiplo.calls == []
    assert rows(draft_id) == (0, 0, 0)


def test_saving_a_draft_without_a_description_stores_an_empty_one(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """Spec 006, FR-002: a save without the field clears the description."""
    draft_id = create_draft(signed_in_client, description='FS-20417')

    response = signed_in_client.put(
        f'{BASE}/{draft_id}/draft', json=without_description(draft_body(version=1))
    )

    assert response.status_code == 200, response.json()
    assert response.json()['data']['description'] == ''
    assert get(signed_in_client, draft_id)['description'] == ''


INCOMPLETE_RULE = rule(1, None, None, '', name='')


# FR-004: incomplete content that publishing refuses, which a draft accepts
@pytest.mark.parametrize(
    'changes',
    [
        pytest.param({'description': ''}, id='no description'),
        pytest.param({'documents': []}, id='no documents'),
        pytest.param(
            {'documents': [{'document_type': 'pid', 'fields': []}]},
            id='a document without a field',
        ),
        pytest.param(
            {'rules': draft_rules([main_branch([AGE_RULE])])},
            id='a rule on data that is not requested',
        ),
        pytest.param(
            {
                'rules': draft_rules(
                    [main_branch([rule(1, target('pid', 'birthdate'), None, 'M.')])]
                )
            },
            id='a rule without a condition',
        ),
        pytest.param(
            {
                'rules': draft_rules(
                    [
                        main_branch(
                            [
                                rule(
                                    1,
                                    target('pid', 'birthdate'),
                                    {'operator': 'at_least_years_ago'},
                                    'M.',
                                )
                            ]
                        )
                    ]
                )
            },
            id='an incomplete condition',
        ),
        pytest.param(
            {
                'rules': draft_rules(
                    [
                        main_branch(
                            [
                                rule(
                                    1,
                                    target('pid', 'birthdate'),
                                    {'operator': 'at_least_years_ago', 'years': 21},
                                    '',
                                )
                            ]
                        )
                    ]
                )
            },
            id='a rule without a message',
        ),
        pytest.param(
            {'rules': draft_rules([main_branch([INCOMPLETE_RULE])])},
            id='a rule without name, data, condition and message',
        ),
        pytest.param(
            {'rules': draft_rules([main_branch([]), variant([], origin='empty')])},
            id='a variant without rules',
        ),
        pytest.param(
            {'rules': draft_rules([main_branch([]), variant([], name='')])},
            id='a variant without a name',
        ),
        pytest.param(
            {
                'rules': draft_rules(
                    [main_branch([]), variant([]), variant([], name='Ambulance')]
                )
            },
            id='two variants with one name',
        ),
        pytest.param(
            {
                'rules': draft_rules(
                    [
                        main_branch(
                            [
                                rule(1, None, None, '', name='Alter'),
                                rule(2, None, None, '', name='Alter'),
                            ]
                        )
                    ]
                )
            },
            id='two rules with one name',
        ),
        pytest.param(
            {
                'rules': draft_rules(
                    [
                        main_branch(
                            [
                                group(
                                    1,
                                    [
                                        rule(1, None, None, ''),
                                        rule(2, None, None, ''),
                                    ],
                                    name='',
                                )
                            ]
                        )
                    ]
                )
            },
            id='a group without a name',
        ),
    ],
)
def test_saving_accepts_incomplete_content(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, changes: dict[str, Any]
) -> None:
    draft_id = create_draft(signed_in_client)

    response = save(signed_in_client, draft_id, 1, **changes)

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert data['version'] == 2
    if 'rules' in changes:
        assert_ids_assigned(data['branches'], changes['rules']['branches'])
    assert fake_eudiplo.calls == []


# FR-003: malformed content, refused with its message (quickstart V4)
@pytest.mark.parametrize(
    ('changes', 'message'),
    [
        pytest.param(
            {'documents': [{'document_type': 'unknown', 'fields': []}]},
            "Unknown document type 'unknown'.",
            id='unknown document type',
        ),
        pytest.param(
            {'documents': [{'document_type': 'pid', 'fields': ['shoe_size']}]},
            "Unknown field 'shoe_size' for 'Personal ID'.",
            id='unknown field',
        ),
        pytest.param(
            {
                'documents': [
                    {'document_type': 'pid', 'fields': []},
                    {'document_type': 'pid', 'fields': []},
                ]
            },
            "'Personal ID' is added more than once.",
            id='a document twice',
        ),
        pytest.param(
            {
                'rules': draft_rules(
                    [main_branch([])]
                    + [variant([], name=f'Variante {n}') for n in range(20)]
                )
            },
            'A connection can have at most 20 variants.',
            id='21 variants',
        ),
        pytest.param(
            {
                'rules': draft_rules(
                    [main_branch([]), variant([], branch_id='variant-2')]
                )
            },
            'Unknown variant.',
            id='a variant whose id is no UUID',
        ),
        pytest.param(
            {
                'rules': draft_rules(
                    [main_branch([AGE_RULE | {'id': 'rule-x'}])],
                )
            },
            'The rules contain an invalid identifier. Reload the connection and '
            'try again.',
            id='an invalid rule identifier',
        ),
        pytest.param(
            {'name': 'x' * 201},
            'The name can have at most 200 characters.',
            id='a name of 201 characters',
        ),
        pytest.param({'name': ''}, 'Enter a name for the connection.', id='no name'),
        pytest.param(
            {'description': 'x' * 501},
            'The description can have at most 500 characters.',
            id='a description of 501 characters',
        ),
    ],
)
def test_saving_refuses_malformed_content_and_changes_nothing(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    changes: dict[str, Any],
    message: str,
) -> None:
    draft_id = create_draft(signed_in_client, step='documents')
    before = get(signed_in_client, draft_id)

    response = save(signed_in_client, draft_id, 1, **changes)

    assert response.status_code == 400
    assert response.json() == {'error': 'Validation error', 'message': message}
    assert get(signed_in_client, draft_id) == before


def test_saving_an_unknown_draft_answers_404(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = save(signed_in_client, str(uuid.uuid4()), 1)

    assert response.status_code == 404
    assert response.json() == NOT_FOUND


# Numbering (research R4)


def test_identifiers_below_the_base_keep_their_numbers(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(
        signed_in_client,
        rules=draft_rules(
            [main_branch([rule(1, None, None, ''), rule(2, None, None, '')])]
        ),
    )
    assert get(signed_in_client, draft_id)['next_rule_number'] == 3

    # The editor loaded counters (3, 1): rule-1 is loaded, rule-3 is new
    response = save(
        signed_in_client,
        draft_id,
        1,
        rules=draft_rules(
            [main_branch([rule(1, None, None, ''), rule(3, None, None, '')])],
            rule_base=3,
        ),
    )

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert item_ids(data['branches'][0]) == ['rule-1', 'rule-3']
    assert data['next_rule_number'] == 4
    assert data['next_group_number'] == 1


def test_new_identifiers_move_past_the_rows_counters(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """An editor numbering from an older base doesn't reuse a number (FR-003)."""
    draft_id = create_draft(
        signed_in_client,
        rules=draft_rules(
            [
                main_branch(
                    [group(1, [rule(1, None, None, ''), rule(2, None, None, '')])]
                )
            ]
        ),
    )
    created = get(signed_in_client, draft_id)
    assert (created['next_rule_number'], created['next_group_number']) == (3, 2)
    # Another save took rule-3 meanwhile: the counters are (4, 2)
    other = save(
        signed_in_client,
        draft_id,
        1,
        rules=draft_rules(
            [
                main_branch(
                    [
                        group(1, [rule(1, None, None, ''), rule(2, None, None, '')]),
                        rule(3, None, None, ''),
                    ]
                )
            ],
            rule_base=3,
            group_base=2,
        ),
    )
    assert other.status_code == 200, other.json()
    assert other.json()['data']['next_rule_number'] == 4

    # An editor that started from (3, 2) adds rule-3 and group-2 as new
    response = save(
        signed_in_client,
        draft_id,
        2,
        rules=draft_rules(
            [
                main_branch(
                    [
                        rule(1, None, None, ''),
                        group(2, [rule(3, None, None, ''), rule(2, None, None, '')]),
                    ]
                ),
                variant(
                    [
                        rule(1, None, None, ''),
                        group(2, [rule(3, None, None, ''), rule(2, None, None, '')]),
                    ]
                ),
            ],
            rule_base=3,
            group_base=2,
        ),
    )

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    # rule-3 is new and moves past rule-3, which the other save took; group-2 is
    # new but no other save took it. The same way in every variant
    for branch in data['branches']:
        assert item_ids(branch) == ['rule-1', 'group-2', 'rule-4', 'rule-2']
        # A default name follows its new number
        assert branch['items'][1]['items'][0]['name'] == 'Rule 04'
    assert data['next_rule_number'] == 5
    assert data['next_group_number'] == 3


def test_counters_never_go_down(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(
        signed_in_client,
        rules=draft_rules(
            [
                main_branch(
                    [group(1, [rule(1, None, None, ''), rule(2, None, None, '')])]
                )
            ]
        ),
    )
    created = get(signed_in_client, draft_id)
    assert (created['next_rule_number'], created['next_group_number']) == (3, 2)

    response = save(signed_in_client, draft_id, 1, rules=draft_rules([main_branch([])]))

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert data['branches'][0]['items'] == []
    assert (data['next_rule_number'], data['next_group_number']) == (3, 2)
    # A new rule after that takes the next number, not a number used before
    response = save(
        signed_in_client,
        draft_id,
        2,
        rules=draft_rules([main_branch([rule(1, None, None, '')])]),
    )
    assert response.status_code == 200, response.json()
    assert item_ids(response.json()['data']['branches'][0]) == ['rule-3']
    assert response.json()['data']['next_rule_number'] == 4


# Publish


def test_publishing_a_draft_answers_the_published_connection(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(
        signed_in_client,
        rules=draft_rules([main_branch([AGE_RULE, CLASS_RULE])]),
        step='rules',
    )
    # The draft has one variant more by the time it is published
    branches = [main_branch([AGE_RULE, CLASS_RULE]), variant([AGE_RULE, CLASS_RULE])]

    response = publish(
        signed_in_client,
        draft_id,
        1,
        rules=rules_input(branches, rule_base=3),
    )

    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Form connection published'
    data = response.json()['data']
    assert data['status'] == 'published'
    assert data['id'] == draft_id
    assert data['name'] == FORM_CONNECTION['name']
    assert data['description'] == FORM_CONNECTION['description']
    assert data['is_active'] is True
    assert data['trigger_url'] == f'{BASE_URL}/api/connect/{draft_id}/requests'
    assert data['rule_set_version'] == 1
    # One pull URL per variant, the main one's also as the connection's
    assert [branch['name'] for branch in data['branches']] == ['Standard', 'Ambulance']
    pull_urls = [branch['pull_url'] for branch in data['branches']]
    assert len(set(pull_urls)) == 2
    assert data['pull_url'] == pull_urls[0]
    assert all('{reference}' in url for url in pull_urls)
    # The draft's identifiers, from its counters
    assert item_ids(data['branches'][0]) == ['rule-1', 'rule-2']
    assert data['next_rule_number'] == 3
    assert get(signed_in_client, draft_id) == data

    row = stored(draft_id)
    assert row is not None
    assert row.published_at is not None
    assert row.draft_version is None
    assert row.current_revision == 1
    assert row.current_rule_set == 1
    assert draft_is_sql_null(draft_id)
    assert rows(draft_id) == (1, 1, 2)
    with SessionLocal() as db:
        revision = db.scalars(
            select(FormConnectionRevision).where(
                FormConnectionRevision.form_connection_id == draft_id
            )
        ).one()
    assert set(fake_eudiplo.configs) == {revision.eudiplo_config_id}
    assert config_hash(fake_eudiplo.configs[revision.eudiplo_config_id]) == (
        revision.config_hash
    )


def test_publishing_without_a_description_publishes_an_empty_one(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """Spec 006, US1-AS2: the description is optional when publishing too."""
    draft_id = create_draft(signed_in_client)

    response = signed_in_client.post(
        f'{BASE}/{draft_id}/publish', json=without_description(publish_body(1))
    )

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert data['status'] == 'published'
    assert data['description'] == ''
    assert trigger(signed_in_client, draft_id)['status'] == 'pending'


def test_publishing_without_rules_gives_the_main_variant(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(signed_in_client)

    response = publish(signed_in_client, draft_id, 1)

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert [branch['name'] for branch in data['branches']] == ['Standard']
    assert data['branches'][0]['items'] == []
    assert data['rule_set_version'] == 1
    assert rows(draft_id) == (1, 1, 1)


@pytest.mark.parametrize(
    ('changes', 'message'),
    [
        pytest.param(
            {'documents': []}, 'Add at least one document.', id='no documents'
        ),
        pytest.param(
            {
                'documents': [{'document_type': 'pid', 'fields': ['family_name']}],
                'rules': rules_input([main_branch([AGE_RULE])]),
            },
            'Rule 01 in Standard checks data that’s no longer requested.',
            id='a rule on data that is not requested',
        ),
    ],
)
def test_a_refused_publish_leaves_the_draft_unchanged(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    changes: dict[str, Any],
    message: str,
) -> None:
    """US1-AS7: the create path's 400, word for word, and nothing stored."""
    draft_id = create_draft(signed_in_client, step='test')
    before = get(signed_in_client, draft_id)
    created = signed_in_client.post(BASE, json=FORM_CONNECTION | changes)
    assert created.status_code == 400

    response = publish(signed_in_client, draft_id, 1, **changes)

    assert response.status_code == 400
    assert response.json() == created.json()
    assert response.json() == {'error': 'Validation error', 'message': message}
    assert get(signed_in_client, draft_id) == before
    assert rows(draft_id) == (0, 0, 0)
    assert fake_eudiplo.calls == []


def test_an_eudiplo_failure_keeps_the_draft_a_draft(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    error_log: Callable[[str], str],
) -> None:
    draft_id = create_draft(signed_in_client)
    before = get(signed_in_client, draft_id)
    fake_eudiplo.fail('create_config', 503)

    response = publish(
        signed_in_client,
        draft_id,
        1,
        rules=rules_input([main_branch([AGE_RULE]), variant([AGE_RULE])]),
    )

    assert response.status_code == 502
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Upstream error',
        'message': CONFIG_FAILED,
        'error_id': error_id,
    }
    assert 'EUDIPLO' not in response.text
    assert 'EudiploUnavailable' in error_log(error_id)
    assert get(signed_in_client, draft_id) == before
    assert rows(draft_id) == (0, 0, 0)
    assert fake_eudiplo.configs == {}
    row = stored(draft_id)
    assert row is not None
    assert row.published_at is None
    assert row.draft_version == 1

    # It can be published once EUDIPLO answers again
    assert publish(signed_in_client, draft_id, 1).status_code == 200


def test_publishing_an_unknown_draft_answers_404(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = publish(signed_in_client, str(uuid.uuid4()), 1)

    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    assert fake_eudiplo.calls == []


# Delete


def test_deleting_a_draft_marks_it_deleted_and_removes_it_from_every_read(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-010; spec 010, research R5: the row stays, marked deleted, until the
    restore time has passed, and the draft is gone for every read at once."""
    published_id = create_form_connection(signed_in_client)
    other_draft_id = create_draft(signed_in_client, name='Anderer Entwurf')
    draft_id = create_draft(signed_in_client)
    # A revision that a publish in flight reserved
    with SessionLocal() as db:
        db.add(
            FormConnectionRevision(
                form_connection_id=draft_id,
                revision=1,
                documents=FORM_CONNECTION['documents'],
                lifetime_seconds=600,
                config_hash='0' * 64,
                eudiplo_config_id=f'fc-{draft_id}-r1',
            )
        )
        db.commit()
    others = {
        form_connection_id: get(signed_in_client, form_connection_id)['updated_at']
        for form_connection_id in (published_id, other_draft_id)
    }
    calls = len(fake_eudiplo.calls)

    response = signed_in_client.request('DELETE', f'{BASE}/{draft_id}/draft', json={})

    assert response.status_code == 200
    assert response.json()['message'] == 'Draft deleted'
    deletion = response.json()['data']
    assert is_uuid(deletion['id'])
    row = stored(draft_id)
    assert row is not None
    assert (row.deleted_at is not None, row.deletion_id) == (True, deletion['id'])
    # Still a draft, with its content, for a restore
    assert (row.published_at, row.draft_version) == (None, 1)
    # The revision the publish in flight reserved is gone
    assert rows(draft_id) == (0, 0, 0)
    assert len(fake_eudiplo.calls) == calls
    response = signed_in_client.get(f'{BASE}/{draft_id}')
    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    # FR-010: no other connection changed
    for form_connection_id, updated_at in others.items():
        assert get(signed_in_client, form_connection_id)['updated_at'] == updated_at
    assert [s['id'] for s in signed_in_client.get(BASE).json()['data']] == [
        other_draft_id,
        published_id,
    ]


def test_deleting_an_unknown_draft_answers_404(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(signed_in_client)
    assert (
        signed_in_client.request(
            'DELETE', f'{BASE}/{draft_id}/draft', json={}
        ).status_code
        == 200
    )

    response = signed_in_client.request('DELETE', f'{BASE}/{draft_id}/draft', json={})

    assert response.status_code == 404
    assert response.json() == NOT_FOUND


# Boundaries between draft and published endpoints


@pytest.mark.parametrize(
    ('method', 'suffix', 'body'),
    [
        ('PUT', '', {'name': 'Umbenannt'}),
        ('POST', '/deactivate', {}),
        ('POST', '/activate', {}),
        ('DELETE', '', {}),
    ],
)
def test_published_endpoints_refuse_a_draft(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    method: str,
    suffix: str,
    body: dict[str, Any],
) -> None:
    draft_id = create_draft(signed_in_client)
    before = get(signed_in_client, draft_id)

    response = signed_in_client.request(method, f'{BASE}/{draft_id}{suffix}', json=body)

    assert response.status_code == 409
    assert response.json() == NOT_PUBLISHED_DETAIL
    assert get(signed_in_client, draft_id) == before
    assert fake_eudiplo.calls == []


@pytest.mark.parametrize(
    ('method', 'suffix', 'body'),
    [
        ('PUT', '/draft', draft_body(version=1)),
        ('PUT', '/draft', draft_body(version=1, replace=True)),
        ('POST', '/publish', publish_body(1)),
        ('POST', '/publish', publish_body(1, replace=True)),
        ('DELETE', '/draft', {}),
    ],
)
def test_draft_endpoints_refuse_a_published_connection(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    method: str,
    suffix: str,
    body: dict[str, Any],
) -> None:
    published_id = create_form_connection(signed_in_client)
    before = get(signed_in_client, published_id)
    calls = len(fake_eudiplo.calls)
    configs = dict(fake_eudiplo.configs)

    response = signed_in_client.request(
        method, f'{BASE}/{published_id}{suffix}', json=body
    )

    assert response.status_code == 409
    assert response.json() == DRAFT_PUBLISHED_DETAIL
    assert get(signed_in_client, published_id) == before
    assert len(fake_eudiplo.calls) == calls
    assert fake_eudiplo.configs == configs
    assert rows(published_id) == (1, 1, 1)


# Auth

NEW_ENDPOINTS = [
    ('POST', '/drafts', draft_body()),
    ('PUT', '/some-id/draft', draft_body(version=1)),
    ('POST', '/some-id/publish', publish_body(1)),
    ('DELETE', '/some-id/draft', {}),
]


@pytest.mark.parametrize(
    ('method', 'path', 'body'), [*NEW_ENDPOINTS, ('GET', '/some-id', None)]
)
def test_draft_endpoints_need_a_session(
    client: TestClient,
    fake_eudiplo: FakeEudiplo,
    method: str,
    path: str,
    body: dict[str, Any] | None,
) -> None:
    response = client.request(method, f'{BASE}{path}', json=body)

    assert response.status_code == 401
    assert response.json() == SIGN_IN_REQUIRED
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(FormConnection)) == 0


@pytest.mark.parametrize(('method', 'path', 'body'), NEW_ENDPOINTS)
def test_draft_changes_need_a_json_body(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    method: str,
    path: str,
    body: dict[str, Any],
) -> None:
    draft_id = create_draft(signed_in_client)
    before = get(signed_in_client, draft_id)

    response = signed_in_client.request(
        method,
        f'{BASE}{path.replace("some-id", draft_id)}',
        content='name=x',
        headers={'Content-Type': 'text/plain'},
    )

    assert response.status_code == 415
    assert response.json() == {
        'error': 'Unsupported media type',
        'message': 'Send the request body as JSON.',
    }
    assert get(signed_in_client, draft_id) == before
    assert [s['id'] for s in signed_in_client.get(BASE).json()['data']] == [draft_id]
    assert fake_eudiplo.calls == []


# Publish parity (T017; SC-003, FR-009): publishing a draft answers as creating does


def with_rule(**changes: Any) -> dict[str, Any]:
    """`rules` whose main variant holds AGE_RULE with `changes`."""
    return rules_input([main_branch([AGE_RULE | changes])])


PARITY_CASES = [
    pytest.param(
        {
            'rules': rules_input(
                [
                    main_branch(us2_items(group_message='You are too young.')),
                    variant(us2_items(group_message='You are too young.')),
                    variant(
                        [AGE_RULE, CLASS_RULE],
                        name='Taxi',
                        description='Für Taxiunternehmen',
                        origin='empty',
                        operator='or',
                    ),
                ]
            )
        },
        None,
        id='valid with rules and variants',
    ),
    pytest.param({}, None, id='valid without rules'),
    pytest.param({'name': ''}, 'Enter a name for the connection.', id='missing name'),
    # Spec 006, US1-AS2: a complete draft without a description is published
    pytest.param({'description': ''}, None, id='no description'),
    pytest.param(
        {'description': 'x' * 501},
        'The description can have at most 500 characters.',
        id='a description of 501 characters',
    ),
    pytest.param({'documents': []}, 'Add at least one document.', id='no documents'),
    pytest.param(
        {'documents': [{'document_type': 'pid', 'fields': []}]},
        "Select at least one field for 'Personal ID'.",
        id='a document without a field',
    ),
    pytest.param(
        {'documents': [{'document_type': 'pid', 'fields': ['abc']}]},
        "Unknown field 'abc' for 'Personal ID'.",
        id='an unknown field',
    ),
    pytest.param(
        {
            'rules': rules_input(
                [main_branch([AGE_RULE]), variant([AGE_RULE], name=' ')]
            )
        },
        'Enter a name for every variant.',
        id='a missing variant name',
    ),
    pytest.param(
        {'rules': with_rule(name=' ')},
        'Enter a name for every rule in Standard.',
        id='an unnamed rule',
    ),
    pytest.param(
        {'rules': with_rule(target=None)},
        'Rule 01 in Standard: choose the data to check.',
        id='a rule without data',
    ),
    pytest.param(
        {'rules': with_rule(target=target('pid', 'nationalities'))},
        'Rule 01 in Standard checks data that’s no longer requested.',
        id='data that is not requested',
    ),
    pytest.param(
        {'rules': with_rule(condition={'operator': 'at_least_years_ago'})},
        'Rule 01 in Standard: enter a number of years of at least 1.',
        id='an incomplete condition',
    ),
    pytest.param(
        {'rules': with_rule(message=' ')},
        'Rule 01 in Standard has no error message.',
        id='a missing message',
    ),
    pytest.param(
        {'rules': with_rule(id='rule-x')},
        'The rules contain an invalid identifier. Reload the connection and try again.',
        id='an invalid identifier',
    ),
]


def published_shape(data: dict[str, Any]) -> dict[str, Any]:
    """A published connection without its ids, the ids in its URLs and timestamps.

    Branch ids become their positions, in the URLs too. Its last activity is left
    out too: an entry has an id and a time of its own, and names who acted
    (spec 010; test_activity.py checks it).
    """
    placeholders = {data['id']: '<id>'} | {
        branch['id']: f'<branch {position}>'
        for position, branch in enumerate(data['branches'])
    }

    def without_ids(url: str) -> str:
        for real, placeholder in placeholders.items():
            url = url.replace(real, placeholder)
        return url

    return {
        key: value
        for key, value in data.items()
        if key
        not in {
            'id',
            'created_at',
            'updated_at',
            'published_at',
            'activated_at',
            'deactivated_at',
            'last_activity',
        }
    } | {
        'trigger_url': without_ids(data['trigger_url']),
        'pull_url': without_ids(data['pull_url']),
        'branches': [
            branch
            | {
                'id': placeholders[branch['id']],
                'pull_url': without_ids(branch['pull_url']),
            }
            for branch in data['branches']
        ],
    }


@pytest.mark.parametrize(('changes', 'message'), PARITY_CASES)
def test_publishing_a_draft_answers_as_creating_a_connection_does(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    changes: dict[str, Any],
    message: str | None,
) -> None:
    """The same `FormConnectionCreate` payload, created and published (SC-003)."""
    payload = FORM_CONNECTION | changes
    created = signed_in_client.post(BASE, json=payload)
    draft_id = create_draft(signed_in_client)

    published = signed_in_client.post(
        f'{BASE}/{draft_id}/publish', json=payload | {'version': 1}
    )

    if message is not None:
        assert created.status_code == published.status_code == 400
        assert published.json() == created.json()
        assert published.json() == {'error': 'Validation error', 'message': message}
        assert rows(draft_id) == (0, 0, 0)
        assert get(signed_in_client, draft_id)['status'] == 'draft'
        return

    # Creating answers 201 Created, publishing 200 on the existing row (contract)
    assert created.status_code == 201, created.json()
    assert published.status_code == 200, published.json()
    created_data = created.json()['data']
    published_data = published.json()['data']
    assert published_data['id'] == draft_id
    assert published_shape(published_data) == published_shape(created_data)
    assert published_data['rule_set_version'] == 1
    expected_branches = len(changes['rules']['branches']) if 'rules' in changes else 1
    assert len(published_data['branches']) == expected_branches
    for form_connection_id in (created_data['id'], draft_id):
        assert trigger(signed_in_client, form_connection_id)['status'] == 'pending'


# Concurrency (T018, research R14): the service functions, each with its own
# session, stepped through the fake EUDIPLO

# How long a test waits for a thread or a barrier before it fails
JOIN_TIMEOUT = 30.0


def run_in_threads(*calls: Callable[[], object]) -> list[object]:
    """Run each call in a thread of its own; return what each returned.

    An `HTTPException` counts as the call's answer and is returned; any other
    exception is raised again. A thread that hasn't ended after JOIN_TIMEOUT, such
    as one waiting for a lock that is never released, fails the test instead of
    hanging it.
    """
    outcomes: list[object] = [None] * len(calls)

    def run(index: int, call: Callable[[], object]) -> None:
        try:
            outcomes[index] = call()
        except Exception as error:  # handed to the test below
            outcomes[index] = error

    threads = [
        threading.Thread(target=run, args=(index, call), daemon=True)
        for index, call in enumerate(calls)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(JOIN_TIMEOUT)
        assert not thread.is_alive(), 'A thread did not end in time'
    for outcome in outcomes:
        if isinstance(outcome, Exception) and not isinstance(outcome, HTTPException):
            raise outcome
    return outcomes


def deleted_configs(fake_eudiplo: FakeEudiplo) -> list[str]:
    """The ids of the configurations the fake EUDIPLO was asked to delete."""
    return [
        call.request.url.path.rsplit('/', 1)[-1]
        for call in fake_eudiplo.calls
        if call.name == 'delete_config'
    ]


def test_two_publishes_of_one_draft_publish_it_once(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """R5, quickstart V12: the first to commit publishes, the other gets 409."""
    draft_id = create_draft(signed_in_client)
    both_waiting = threading.Barrier(2, timeout=JOIN_TIMEOUT)
    create_config = fake_eudiplo._create_config
    # Each configuration as it was created, by its id
    created_configs: dict[str, dict[str, Any]] = {}

    def create_config_together(request: Request) -> Response:
        # Both publishes wait for EUDIPLO at the same time: no lock is held meanwhile
        both_waiting.wait()
        body = json.loads(request.content)
        created_configs[body['id']] = body
        return create_config(request)

    monkeypatch.setattr(fake_eudiplo, '_create_config', create_config_together)
    data = DraftPublish.model_validate(
        publish_body(
            1, rules=rules_input([main_branch([AGE_RULE]), variant([AGE_RULE])])
        )
    )

    def publish_draft() -> FormConnectionView:
        with SessionLocal() as db:
            return drafts.publish_draft(
                db, draft_id, data, actor=Actor(name=TEST_USERNAME)
            )

    outcomes = run_in_threads(publish_draft, publish_draft)

    [winner] = [o for o in outcomes if isinstance(o, FormConnectionView)]
    [loser] = [o for o in outcomes if isinstance(o, HTTPException)]
    assert loser.status_code == 409
    assert _answered(loser.detail) == DRAFT_PUBLISHED_DETAIL
    assert (winner.id, winner.status, winner.rule_set_version) == (
        draft_id,
        'published',
        1,
    )
    # They reserved different revisions, so different configurations
    assert set(created_configs) == {f'fc-{draft_id}-r1', f'fc-{draft_id}-r2'}

    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(FormConnection)) == 1
        revision = db.scalars(
            select(FormConnectionRevision).where(
                FormConnectionRevision.form_connection_id == draft_id
            )
        ).one()
    row = stored(draft_id)
    assert row is not None
    assert row.published_at is not None
    assert row.draft_version is None
    assert row.current_revision == revision.revision
    assert row.current_rule_set == 1
    # One rule set and the branch rows of one publish
    assert rows(draft_id) == (1, 1, 2)

    # The winner's configuration is untouched, and only the loser's is deleted
    winner_config = revision.eudiplo_config_id
    [loser_config] = set(created_configs) - {winner_config}
    assert set(fake_eudiplo.configs) == {winner_config}
    assert fake_eudiplo.configs[winner_config] == created_configs[winner_config]
    assert config_hash(fake_eudiplo.configs[winner_config]) == revision.config_hash
    assert deleted_configs(fake_eudiplo) == [loser_config]

    # A trigger starts a request with the winner's configuration
    trigger(signed_in_client, draft_id)
    offer = json.loads(fake_eudiplo.calls[-1].request.content)
    assert offer['requestId'] == winner_config


def test_a_draft_deleted_during_its_publish_is_not_published(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """R7; spec 010, R15 V9: the publish finds the row marked deleted at its last
    lock, answers 404 and cleans up, as it did when the deletion removed the row:
    its configuration is deleted, and the revision it reserved is gone."""
    draft_id = create_draft(signed_in_client)
    create_config = fake_eudiplo._create_config
    created_configs: list[str] = []
    deletions: list[object] = []

    def delete_draft() -> None:
        with SessionLocal() as db:
            drafts.delete_draft(db, draft_id, actor=Actor(name=TEST_USERNAME))

    def create_config_then_delete(request: Request) -> Response:
        response = create_config(request)
        created_configs.append(json.loads(request.content)['id'])
        # Another team member deletes the draft while EUDIPLO answers. In a thread
        # of its own: a lock the publish held would fail the test, not hang it
        try:
            deletions.extend(run_in_threads(delete_draft))
        except Exception as error:  # checked after the publish
            deletions.append(error)
        return response

    monkeypatch.setattr(fake_eudiplo, '_create_config', create_config_then_delete)

    response = publish(
        signed_in_client,
        draft_id,
        1,
        rules=rules_input([main_branch([AGE_RULE]), variant([AGE_RULE])]),
    )

    assert deletions == [None]
    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    # The row stays marked deleted, still the draft it was; the revision the
    # publish reserved is gone
    row = stored(draft_id)
    assert row is not None
    assert row.deleted_at is not None
    assert (row.published_at, row.current_revision, row.draft_version) == (
        None,
        None,
        1,
    )
    assert rows(draft_id) == (0, 0, 0)
    # The configuration the publish created is deleted again
    assert created_configs == [f'fc-{draft_id}-r1']
    assert fake_eudiplo.configs == {}
    assert deleted_configs(fake_eudiplo) == created_configs
    assert signed_in_client.get(f'{BASE}/{draft_id}').status_code == 404


def _delete_and_restore(draft_id: str) -> None:
    """Delete the draft as the editor does and take the deletion back ("Undo")."""
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
        assert user_id is not None
        deletion = drafts.delete_draft(
            db,
            draft_id,
            actor=Actor(name=TEST_USERNAME),
            deletion_id=str(uuid.uuid4()),
            deleted_by_id=user_id,
        )
        assert deletion.id is not None
        deletions.restore_deletion(
            db, deletion.id, account_id=user_id, actor=Actor(name=TEST_USERNAME)
        )


def test_a_draft_deleted_and_restored_during_its_publish_is_not_published(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Spec 010, R5 (T040's hazard): the deletion removed the revision the publish
    reserved, and the restore brought the row back before the publish's last lock,
    where every other check passes. The publish answers 404 as for a deleted row
    and deletes its configuration; the restored draft is the draft it was, with no
    revision, and publishes normally afterwards. Without the check the row would be
    published with `current_revision` 1 and no revision 1."""
    draft_id = create_draft(signed_in_client)
    create_config = fake_eudiplo._create_config
    created_configs: list[str] = []
    interleaved: list[object] = []

    def create_config_then_delete_and_restore(request: Request) -> Response:
        response = create_config(request)
        created_configs.append(json.loads(request.content)['id'])
        if len(created_configs) == 1:
            # While EUDIPLO answers, the draft is deleted and "Undo" restores it.
            # In a thread of its own: a lock the publish held would fail the
            # test, not hang it
            interleaved.extend(run_in_threads(lambda: _delete_and_restore(draft_id)))
        return response

    monkeypatch.setattr(
        fake_eudiplo, '_create_config', create_config_then_delete_and_restore
    )

    response = publish(signed_in_client, draft_id, 1)

    assert interleaved == [None]
    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    row = stored(draft_id)
    assert row is not None
    assert (row.deleted_at, row.deletion_id, row.deleted_by_id) == (None, None, None)
    assert (row.published_at, row.current_revision, row.draft_version) == (
        None,
        None,
        1,
    )
    assert rows(draft_id) == (0, 0, 0)
    # The configuration the publish created is deleted again
    assert created_configs == [f'fc-{draft_id}-r1']
    assert fake_eudiplo.configs == {}
    assert deleted_configs(fake_eudiplo) == created_configs
    assert get(signed_in_client, draft_id)['status'] == 'draft'

    # The restored draft publishes as any draft, with revision 1
    published = publish(signed_in_client, draft_id, 1)

    assert published.status_code == 200, published.json()
    assert rows(draft_id) == (1, 1, 1)
    assert set(fake_eudiplo.configs) == {f'fc-{draft_id}-r1'}
    trigger(signed_in_client, draft_id)


def test_a_publish_after_the_restore_keeps_the_configuration_both_created(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Spec 010, R5: after the deletion and the restore, a second publish reserves
    revision 1 again, the number the first one lost, and creates the configuration
    of the same id. The first publish then answers 404 and leaves that
    configuration to the second, which published the draft with it."""
    draft_id = create_draft(signed_in_client)
    create_config = fake_eudiplo._create_config
    created_configs: list[str] = []
    interleaved: list[object] = []
    data = DraftPublish.model_validate(publish_body(1))

    def second_publish() -> FormConnectionView:
        with SessionLocal() as db:
            return drafts.publish_draft(
                db, draft_id, data, actor=Actor(name=TEST_USERNAME)
            )

    def create_config_then_publish_again(request: Request) -> Response:
        response = create_config(request)
        created_configs.append(json.loads(request.content)['id'])
        if len(created_configs) == 1:
            # While EUDIPLO answers the first publish: delete, "Undo", and a
            # second publish that goes through
            interleaved.extend(run_in_threads(lambda: _delete_and_restore(draft_id)))
            interleaved.extend(run_in_threads(second_publish))
        return response

    monkeypatch.setattr(
        fake_eudiplo, '_create_config', create_config_then_publish_again
    )

    response = publish(signed_in_client, draft_id, 1)

    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    restored, second = interleaved
    assert restored is None
    assert isinstance(second, FormConnectionView)
    assert (second.id, second.state) == (draft_id, 'live')
    # Both created the same configuration; the second one's stays
    assert created_configs == [f'fc-{draft_id}-r1'] * 2
    assert deleted_configs(fake_eudiplo) == []
    row = stored(draft_id)
    assert row is not None
    assert (row.published_at is not None, row.current_revision) == (True, 1)
    assert rows(draft_id) == (1, 1, 1)
    assert set(fake_eudiplo.configs) == {f'fc-{draft_id}-r1'}
    trigger(signed_in_client, draft_id)


# Conflicts of two team members (T046, research R6, SC-006)


def their_save(client: TestClient, draft_id: str) -> dict[str, Any]:
    """The first team member saves version 1; return the draft as they stored it."""
    response = save(
        client,
        draft_id,
        1,
        name='Führerschein (their name)',
        description='FS-1',
        step='documents',
    )
    assert response.status_code == 200, response.json()
    data: dict[str, Any] = response.json()['data']
    assert data['version'] == 2
    return data


# The second team member's version of the whole draft: other documents, a rule
# that raises the counters, and another step
OUR_DRAFT: dict[str, Any] = {
    'name': 'Führerschein (our name)',
    'description': 'FS-2',
    'documents': FORM_CONNECTION['documents'],
    'rules': draft_rules([main_branch([AGE_RULE, CLASS_RULE])]),
    'step': 'rules',
}


def test_saving_an_outdated_version_answers_draft_changed(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """US3-AS1: refused before anything is stored."""
    draft_id = create_draft(signed_in_client)
    theirs = their_save(signed_in_client, draft_id)

    response = save(signed_in_client, draft_id, 1, **OUR_DRAFT)

    assert response.status_code == 409
    assert response.json() == DRAFT_CHANGED_DETAIL
    assert response.json()['message'] == (
        'This draft has been modified since you opened it.'
    )
    # Content, version and counters as the first team member saved them
    assert get(signed_in_client, draft_id) == theirs
    assert fake_eudiplo.calls == []


def test_an_outdated_save_meets_the_conflict_before_the_structure_check(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """A stale editor meets the conflict, not a refusal its staleness causes."""
    draft_id = create_draft(signed_in_client)
    theirs = their_save(signed_in_client, draft_id)

    response = save(signed_in_client, draft_id, 1, name='  ')

    assert response.status_code == 409
    assert response.json() == DRAFT_CHANGED_DETAIL
    assert get(signed_in_client, draft_id) == theirs


def test_replacing_their_changes_stores_the_whole_draft(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """US3-AS3: the whole draft is stored, and their next old save is refused."""
    draft_id = create_draft(signed_in_client)
    their_save(signed_in_client, draft_id)

    response = save(signed_in_client, draft_id, 1, replace=True, **OUR_DRAFT)

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert data['version'] == 3
    assert data['name'] == OUR_DRAFT['name']
    assert data['description'] == OUR_DRAFT['description']
    assert [document['document_type'] for document in data['documents']] == [
        'pid',
        'mdl',
    ]
    assert_ids_assigned(data['branches'], OUR_DRAFT['rules']['branches'])
    assert data['step'] == 'rules'
    assert data['next_rule_number'] == 3
    assert get(signed_in_client, draft_id) == data

    # The first team member's next save of their version 2 meets the same 409
    again = save(signed_in_client, draft_id, 2, name='Führerschein (their name)')

    assert again.status_code == 409
    assert again.json() == DRAFT_CHANGED_DETAIL
    assert get(signed_in_client, draft_id) == data
    assert fake_eudiplo.calls == []


@pytest.mark.parametrize(
    'changes',
    [
        pytest.param({}, id='complete'),
        # Also refused by the create path's checks, but the conflict comes first
        pytest.param({'documents': []}, id='incomplete'),
        pytest.param({'name': '  '}, id='no name'),
    ],
)
def test_publishing_an_outdated_version_answers_draft_changed(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    changes: dict[str, Any],
) -> None:
    """US3-AS1: refused before the content is checked, and nothing is stored."""
    draft_id = create_draft(signed_in_client)
    theirs = their_save(signed_in_client, draft_id)

    response = publish(signed_in_client, draft_id, 1, **changes)

    assert response.status_code == 409
    assert response.json() == DRAFT_CHANGED_DETAIL
    assert get(signed_in_client, draft_id) == theirs
    assert rows(draft_id) == (0, 0, 0)
    assert fake_eudiplo.calls == []


def test_publishing_with_replace_publishes_over_their_save(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """US3-AS3: "Replace their changes" while publishing publishes."""
    draft_id = create_draft(signed_in_client)
    their_save(signed_in_client, draft_id)

    response = publish(
        signed_in_client,
        draft_id,
        1,
        replace=True,
        rules=rules_input([main_branch([AGE_RULE])]),
    )

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert data['status'] == 'published'
    assert data['name'] == FORM_CONNECTION['name']
    assert data['description'] == FORM_CONNECTION['description']
    row = stored(draft_id)
    assert row is not None
    assert row.published_at is not None
    assert row.draft_version is None
    assert draft_is_sql_null(draft_id)
    assert rows(draft_id) == (1, 1, 1)
    assert len(fake_eudiplo.configs) == 1


@pytest.mark.parametrize(
    ('method', 'suffix', 'body'),
    [
        pytest.param('PUT', '/draft', draft_body(version=1), id='save'),
        pytest.param(
            'PUT', '/draft', draft_body(version=1, replace=True), id='save replace'
        ),
        pytest.param('POST', '/publish', publish_body(1), id='publish'),
        pytest.param(
            'POST', '/publish', publish_body(1, replace=True), id='publish replace'
        ),
    ],
)
def test_a_draft_published_since_answers_draft_published(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    method: str,
    suffix: str,
    body: dict[str, Any],
) -> None:
    """US3-AS4, FR-023: also with replace, and the published connection stays."""
    draft_id = create_draft(signed_in_client)
    assert publish(signed_in_client, draft_id, 1).status_code == 200
    before = get(signed_in_client, draft_id)
    calls = len(fake_eudiplo.calls)
    configs = dict(fake_eudiplo.configs)

    response = signed_in_client.request(method, f'{BASE}/{draft_id}{suffix}', json=body)

    assert response.status_code == 409
    assert response.json() == DRAFT_PUBLISHED_DETAIL
    assert get(signed_in_client, draft_id) == before
    assert len(fake_eudiplo.calls) == calls
    assert fake_eudiplo.configs == configs
    assert rows(draft_id) == (1, 1, 1)
    row = stored(draft_id)
    assert row is not None
    assert row.draft_version is None
    assert draft_is_sql_null(draft_id)


@pytest.mark.parametrize(
    ('method', 'suffix', 'body'),
    [
        pytest.param('PUT', '/draft', draft_body(version=1), id='save'),
        pytest.param(
            'PUT', '/draft', draft_body(version=1, replace=True), id='save replace'
        ),
        pytest.param('POST', '/publish', publish_body(1), id='publish'),
        pytest.param(
            'POST', '/publish', publish_body(1, replace=True), id='publish replace'
        ),
    ],
)
def test_a_draft_deleted_since_answers_404(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    method: str,
    suffix: str,
    body: dict[str, Any],
) -> None:
    """US3-AS5, FR-024: the editor turns the 404 into "deleted since"."""
    draft_id = create_draft(signed_in_client)
    deleted = signed_in_client.request('DELETE', f'{BASE}/{draft_id}/draft', json={})
    assert deleted.status_code == 200

    response = signed_in_client.request(method, f'{BASE}/{draft_id}{suffix}', json=body)

    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    # The row stays marked deleted (spec 010, research R5), unchanged
    row = stored(draft_id)
    assert row is not None
    assert row.deleted_at is not None
    assert (row.published_at, row.draft_version) == (None, 1)
    assert fake_eudiplo.calls == []


@pytest.mark.parametrize('replace', [False, True])
def test_a_draft_saved_during_its_publish(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    replace: bool,
) -> None:
    """R5: the publish's last lock sees the new version; replace publishes."""
    draft_id = create_draft(signed_in_client)
    create_config = fake_eudiplo._create_config
    created_configs: list[str] = []
    saves: list[object] = []
    their_data = DraftUpdate.model_validate(
        draft_body(version=1, name='Führerschein (their name)', step='documents')
    )

    def save_draft() -> object:
        with SessionLocal() as db:
            return drafts.save_draft(
                db, draft_id, their_data, actor=Actor(name=TEST_USERNAME)
            )

    def create_config_then_save(request: Request) -> Response:
        response = create_config(request)
        created_configs.append(json.loads(request.content)['id'])
        # Another team member saves the draft while EUDIPLO answers. In a thread
        # of its own: a lock the publish held would fail the test, not hang it
        try:
            saves.extend(run_in_threads(save_draft))
        except Exception as error:  # checked after the publish
            saves.append(error)
        return response

    monkeypatch.setattr(fake_eudiplo, '_create_config', create_config_then_save)

    response = publish(
        signed_in_client,
        draft_id,
        1,
        replace=replace,
        rules=rules_input([main_branch([AGE_RULE]), variant([AGE_RULE])]),
    )

    [saved] = saves
    assert not isinstance(saved, Exception), saved
    assert created_configs == [f'fc-{draft_id}-r1']
    row = stored(draft_id)
    assert row is not None
    if not replace:
        assert response.status_code == 409
        assert response.json() == DRAFT_CHANGED_DETAIL
        # The draft keeps the saved content, as a draft
        assert row.published_at is None
        assert row.draft_version == 2
        data = get(signed_in_client, draft_id)
        assert data['status'] == 'draft'
        assert data['name'] == 'Führerschein (their name)'
        assert data['step'] == 'documents'
        # The configuration is deleted and the revision removed
        assert rows(draft_id) == (0, 0, 0)
        assert fake_eudiplo.configs == {}
        assert deleted_configs(fake_eudiplo) == created_configs
    else:
        assert response.status_code == 200, response.json()
        data = response.json()['data']
        assert data['status'] == 'published'
        assert data['name'] == FORM_CONNECTION['name']
        assert row.published_at is not None
        assert row.draft_version is None
        assert draft_is_sql_null(draft_id)
        assert rows(draft_id) == (1, 1, 2)
        assert set(fake_eudiplo.configs) == set(created_configs)
        assert deleted_configs(fake_eudiplo) == []


# Spec 007: variant identifiers (research R10, FR-029). A draft's variants have ids
# from their first save; the branch rows take them when the draft is published


def published_connection_branch_ids(client: TestClient) -> list[str]:
    """The ids of a new published connection's branches, a deleted one's last."""
    created = client.post(
        BASE,
        json=FORM_CONNECTION
        | {
            'rules': rules_input(
                [
                    main_branch([]),
                    variant([], name='Taxi', origin='empty'),
                    variant([], name='Bus', origin='empty'),
                ]
            )
        },
    )
    assert created.status_code == 201, created.json()
    connection = created.json()['data']
    standard, taxi, bus = connection['branches']
    response = client.put(
        f'{BASE}/{connection["id"]}',
        json={
            'rules': rules_input(
                [
                    {
                        key: value
                        for key, value in branch.items()
                        if key not in ('is_main', 'pull_url')
                    }
                    for branch in (standard, taxi)
                ],
                rule_base=connection['next_rule_number'],
                group_base=connection['next_group_number'],
                base_version=connection['rule_set_version'],
            )
        },
    )
    assert response.status_code == 200, response.json()
    return [standard['id'], taxi['id'], bus['id']]


def test_a_drafts_variant_ids_are_assigned_once_and_kept(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    branches = [
        main_branch([AGE_RULE]),
        variant([AGE_RULE]),
        variant([], name='Taxi', origin='empty'),
    ]
    created = signed_in_client.post(
        f'{BASE}/drafts', json=draft_body(rules=draft_rules(branches), step='rules')
    ).json()['data']
    assert_ids_assigned(created['branches'], branches)
    ids = [branch['id'] for branch in created['branches']]

    # The editor sends them back; a variant added meanwhile gets one of its own
    added = variant([], name='Bus', origin='empty')
    response = save(
        signed_in_client,
        created['id'],
        1,
        rules=draft_rules([*created['branches'], added], rule_base=2),
        step='rules',
    )

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert [branch['id'] for branch in data['branches']][:3] == ids
    assert_ids_assigned(data['branches'], [*created['branches'], added])
    assert get(signed_in_client, created['id'])['branches'] == data['branches']


def test_a_drafts_variant_keeps_the_uuid_its_editor_gave_it(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    main_id, variant_id = str(uuid.uuid4()), str(uuid.uuid4())
    branches = [main_branch([], branch_id=main_id), variant([], branch_id=variant_id)]

    created = signed_in_client.post(
        f'{BASE}/drafts', json=draft_body(rules=draft_rules(branches))
    )
    assert created.status_code == 201, created.json()
    assert created.json()['data']['branches'] == branches

    draft_id = created.json()['data']['id']
    other_id = str(uuid.uuid4())
    response = save(
        signed_in_client,
        draft_id,
        1,
        rules=draft_rules(
            [main_branch([], branch_id=main_id), variant([], branch_id=other_id)]
        ),
    )

    assert response.status_code == 200, response.json()
    assert [branch['id'] for branch in response.json()['data']['branches']] == [
        main_id,
        other_id,
    ]


@pytest.mark.parametrize(
    'branch_id',
    [
        pytest.param('variant-2', id='no UUID'),
        pytest.param('', id='empty'),
        pytest.param(str(uuid.uuid4()).upper(), id='upper case'),
        pytest.param('{' + str(uuid.uuid4()) + '}', id='braces'),
        pytest.param(uuid.uuid4().hex, id='no hyphens'),
    ],
)
@pytest.mark.parametrize('main', [True, False], ids=['Standard', 'another variant'])
def test_a_drafts_variant_id_must_be_a_uuid(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    branch_id: str,
    main: bool,
) -> None:
    branches = (
        [main_branch([], branch_id=branch_id)]
        if main
        else [main_branch([]), variant([], branch_id=branch_id)]
    )
    draft_id = create_draft(signed_in_client)
    before = get(signed_in_client, draft_id)

    responses = [
        signed_in_client.post(
            f'{BASE}/drafts', json=draft_body(rules=draft_rules(branches))
        ),
        save(signed_in_client, draft_id, 1, rules=draft_rules(branches)),
    ]

    for response in responses:
        assert response.status_code == 400
        assert response.json() == {
            'error': 'Validation error',
            'message': 'Unknown variant.',
        }
    assert get(signed_in_client, draft_id) == before
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(FormConnection)) == 1


@pytest.mark.parametrize('taken', ['Standard', 'Taxi', 'deleted Bus'])
@pytest.mark.parametrize('main', [True, False], ids=['as Standard', 'as a variant'])
def test_a_drafts_variant_cant_take_another_connections_branch_id(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, taken: str, main: bool
) -> None:
    standard_id, taxi_id, bus_id = published_connection_branch_ids(signed_in_client)
    branch_id = {'Standard': standard_id, 'Taxi': taxi_id, 'deleted Bus': bus_id}[taken]
    branches = (
        [main_branch([], branch_id=branch_id)]
        if main
        else [main_branch([]), variant([], name='Taxi', branch_id=branch_id)]
    )
    draft_id = create_draft(signed_in_client)
    before = get(signed_in_client, draft_id)

    responses = [
        signed_in_client.post(
            f'{BASE}/drafts', json=draft_body(rules=draft_rules(branches))
        ),
        save(signed_in_client, draft_id, 1, rules=draft_rules(branches)),
    ]

    for response in responses:
        assert response.status_code == 400
        assert response.json() == {
            'error': 'Validation error',
            'message': 'Unknown variant.',
        }
    assert get(signed_in_client, draft_id) == before


def test_two_of_a_drafts_variants_cant_share_an_id(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    shared = str(uuid.uuid4())
    draft_id = create_draft(signed_in_client)

    for branches in (
        [main_branch([]), variant([], branch_id=shared), variant([], branch_id=shared)],
        [main_branch([], branch_id=shared), variant([], branch_id=shared)],
    ):
        responses = [
            signed_in_client.post(
                f'{BASE}/drafts', json=draft_body(rules=draft_rules(branches))
            ),
            save(signed_in_client, draft_id, 1, rules=draft_rules(branches)),
        ]
        for response in responses:
            assert response.status_code == 400
            assert response.json() == {
                'error': 'Validation error',
                'message': 'Unknown variant.',
            }
    assert get(signed_in_client, draft_id)['version'] == 1


def test_publishing_a_draft_keeps_its_variant_ids(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-029: a link to a draft's variant still leads to it once it is published."""
    sent = [
        main_branch([AGE_RULE, CLASS_RULE]),
        variant([AGE_RULE, CLASS_RULE]),
        variant([], name='Taxi', origin='empty'),
    ]
    draft = signed_in_client.post(
        f'{BASE}/drafts', json=draft_body(rules=draft_rules(sent), step='rules')
    ).json()['data']
    ids = [branch['id'] for branch in draft['branches']]

    response = publish(
        signed_in_client,
        draft['id'],
        1,
        rules=rules_input(draft['branches'], rule_base=3),
    )

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert [branch['id'] for branch in data['branches']] == ids
    connect_url = f'{BASE_URL}/api/connect/{draft["id"]}'
    assert data['branches'][0]['pull_url'] == (f'{connect_url}/requests/{{reference}}')
    for branch_id, branch in zip(ids[1:], data['branches'][1:], strict=True):
        assert branch['pull_url'] == (
            f'{connect_url}/branches/{branch_id}/requests/{{reference}}'
        )
    with SessionLocal() as db:
        branch_rows = db.scalars(
            select(FormConnectionBranch).where(
                FormConnectionBranch.form_connection_id == draft['id']
            )
        ).all()
    assert {row.id: row.is_main for row in branch_rows} == {
        ids[0]: True,
        ids[1]: False,
        ids[2]: False,
    }
    # The variant's pull URL answers for the draft's id
    reference = trigger(signed_in_client, draft['id'])['reference']
    pulled = signed_in_client.get(branch_pull_url(draft['id'], ids[1], reference))
    assert pulled.status_code == 200, pulled.json()


def test_publishing_refuses_a_variant_id_another_connection_took_meanwhile(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    taken = str(uuid.uuid4())
    draft_id = create_draft(
        signed_in_client,
        rules=draft_rules([main_branch([]), variant([], branch_id=taken)]),
    )
    # A published connection's new variant takes the id after the draft's save
    create_form_connection(
        signed_in_client,
        rules=rules_input(
            [main_branch([]), variant([], name='Taxi', origin='empty', branch_id=taken)]
        ),
    )
    before = get(signed_in_client, draft_id)
    calls = len(fake_eudiplo.calls)

    response = publish(
        signed_in_client,
        draft_id,
        1,
        rules=rules_input(before['branches']),
    )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Unknown variant.',
    }
    # Refused before EUDIPLO is called; the draft stays as it was
    assert len(fake_eudiplo.calls) == calls
    assert get(signed_in_client, draft_id) == before
    assert rows(draft_id) == (0, 0, 0)


def test_a_variant_id_taken_during_a_publish_is_refused_under_the_lock(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """`first_rule_set` checks the ids again; the configuration is deleted again."""
    taken = str(uuid.uuid4())
    draft_id = create_draft(
        signed_in_client,
        rules=draft_rules([main_branch([]), variant([], branch_id=taken)]),
    )
    before = get(signed_in_client, draft_id)
    other_id = create_form_connection(signed_in_client)
    configs = set(fake_eudiplo.configs)
    create_config = fake_eudiplo._create_config

    def take_the_id(request: Request) -> Response:
        # Another connection's save takes the id while EUDIPLO answers
        with SessionLocal() as db:
            db.add(
                FormConnectionBranch(
                    id=taken, form_connection_id=other_id, is_main=False
                )
            )
            db.commit()
        return create_config(request)

    fake_eudiplo._create_config = take_the_id  # type: ignore[method-assign]

    response = publish(
        signed_in_client, draft_id, 1, rules=rules_input(before['branches'])
    )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Unknown variant.',
    }
    assert get(signed_in_client, draft_id) == before
    assert rows(draft_id) == (0, 0, 0)
    assert set(fake_eudiplo.configs) == configs


# Spec 007: the migration gives every stored draft's branches an id (data-model.md
# section 6.1, FR-029)

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / 'alembic'
    / 'versions'
    / '60d71d73af6d_agent_mcp_server.py'
)


def agent_mcp_server_migration() -> ModuleType:
    """The migration's module, imported by its path (alembic/ is no package)."""
    spec = importlib.util.spec_from_file_location('agent_mcp_server', MIGRATION)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def insert_draft(content: dict[str, Any]) -> str:
    """Insert a draft row with SQL, as spec 005 stored it, and return its id."""
    draft_id = str(uuid.uuid4())
    with engine.begin() as connection:
        connection.execute(
            text(
                'INSERT INTO form_connections (id, name, description, draft, '
                "draft_version) VALUES (:id, 'Alter Entwurf', '', "
                'CAST(:draft AS JSONB), 3)'
            ),
            {'id': draft_id, 'draft': json.dumps(content)},
        )
    return draft_id


def stored_draft(draft_id: str) -> tuple[dict[str, Any], int, object]:
    """The row's draft, draft_version and updated_at, read with SQL."""
    with engine.connect() as connection:
        content, version, updated_at = connection.execute(
            text(
                'SELECT draft, draft_version, updated_at FROM form_connections '
                'WHERE id = :id'
            ),
            {'id': draft_id},
        ).one()
    return content, version, updated_at


def without_branch_ids(content: dict[str, Any]) -> dict[str, Any]:
    """The draft with every branch's id left out."""
    branches = [
        {key: value for key, value in branch.items() if key != 'id'}
        for branch in content['branches']
    ]
    return content | {'branches': branches}


def test_the_migration_gives_every_drafts_branches_an_id(
    signed_in_client: TestClient,
) -> None:
    kept_id = str(uuid.uuid4())
    old = {
        'documents': [],
        'branches': [
            main_branch([AGE_RULE]),
            variant([AGE_RULE], name='Ambulance'),
            variant([], name='Leer', origin='empty', branch_id=kept_id),
        ],
        'step': 'rules',
    }
    with_ids = {
        'documents': [],
        'branches': [main_branch([], branch_id=str(uuid.uuid4()))],
        'step': 'connection',
    }
    old_id = insert_draft(old)
    complete_id = insert_draft(with_ids)
    before = {draft_id: stored_draft(draft_id) for draft_id in (old_id, complete_id)}
    backfill_branch_ids = agent_mcp_server_migration().backfill_branch_ids

    with engine.begin() as connection:
        backfill_branch_ids(connection)

    content, version, updated_at = stored_draft(old_id)
    ids = [branch['id'] for branch in content['branches']]
    # Every branch has a UUID of its own; one it had stays
    assert all(str(uuid.UUID(branch_id)) == branch_id for branch_id in ids)
    assert len(set(ids)) == 3
    assert ids[2] == kept_id
    # Nothing else changes: the content, the version, the time of the last save
    assert without_branch_ids(content) == without_branch_ids(before[old_id][0])
    assert (version, updated_at) == before[old_id][1:]
    # A draft whose branches all have ids is left alone
    assert stored_draft(complete_id) == before[complete_id]
    # The draft still reads as one, with the new ids
    data = get(signed_in_client, old_id)
    assert [branch['id'] for branch in data['branches']] == ids

    # Running it again changes nothing
    with engine.begin() as connection:
        backfill_branch_ids(connection)
    assert stored_draft(old_id) == (content, version, updated_at)


# Spec 007: approval requests check and publish the stored draft (research R12,
# FR-022). `check_publishable` runs publishing's checks on the stored content, and
# `publish_stored_draft` publishes it through `publish_draft`


def editor_publish_body(draft: dict[str, Any], documents: Any) -> dict[str, Any]:
    """What the editor sends to publish a draft it loaded without changing it.

    The stored branches, with their ids, numbered from the draft's counters.
    """
    return {
        'name': draft['name'],
        'description': draft['description'],
        'documents': documents,
        'rules': rules_input(
            draft['branches'],
            rule_base=draft['next_rule_number'],
            group_base=draft['next_group_number'],
        ),
        'version': draft['version'],
    }


def check_publishable_refusal(draft_id: str) -> HTTPException:
    """The refusal of `check_publishable` for the stored draft."""
    with SessionLocal() as db:
        row = db.get(FormConnection, draft_id)
        assert row is not None
        with pytest.raises(HTTPException) as refused:
            drafts.check_publishable(db, row)
    return refused.value


@pytest.mark.parametrize(
    ('documents', 'branches'),
    [
        pytest.param([], [main_branch([])], id='no documents'),
        pytest.param(
            FORM_CONNECTION['documents'],
            [main_branch([AGE_RULE | {'condition': None}])],
            id='a rule without a condition',
        ),
        pytest.param(
            FORM_CONNECTION['documents'],
            [main_branch([AGE_RULE]), variant([AGE_RULE], name=' ')],
            id='an unnamed variant',
        ),
    ],
)
def test_check_publishable_refuses_as_publishing_does(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    documents: list[dict[str, Any]],
    branches: list[dict[str, Any]],
) -> None:
    draft_id = create_draft(
        signed_in_client, documents=documents, rules=draft_rules(branches)
    )
    draft = get(signed_in_client, draft_id)

    refusal = check_publishable_refusal(draft_id)
    published = signed_in_client.post(
        f'{BASE}/{draft_id}/publish', json=editor_publish_body(draft, documents)
    )

    assert published.status_code == refusal.status_code == 400
    assert published.json()['error'] == 'Validation error'
    # The message as `errors.py` answers it without a German header (spec 009)
    assert isinstance(refusal.detail, dict)
    answered = {**refusal.detail, 'message': resolve_text(refusal.detail['message'])}
    assert answered == published.json()
    # Nothing is written
    assert get(signed_in_client, draft_id) == draft
    assert rows(draft_id) == (0, 0, 0)
    assert fake_eudiplo.calls == []


def test_check_publishable_passes_a_complete_draft(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(
        signed_in_client,
        description='  FS-20417 ',
        documents=FORM_CONNECTION['documents'],
        rules=draft_rules([main_branch([AGE_RULE, CLASS_RULE])]),
    )

    with SessionLocal() as db:
        row = db.get(FormConnection, draft_id)
        assert row is not None
        name, description, documents, save = drafts.check_publishable(db, row)

    assert (name, description) == ('Führerscheinantrag Entwurf', 'FS-20417')
    assert [document.document_type for document in documents] == ['pid', 'mdl']
    assert save is not None
    assert [branch.id for branch in save.branches] == [
        branch['id'] for branch in get(signed_in_client, draft_id)['branches']
    ]
    assert rows(draft_id) == (0, 0, 0)
    assert fake_eudiplo.calls == []


def test_check_publishable_refuses_a_published_connection(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    form_connection_id = create_form_connection(signed_in_client)

    refusal = check_publishable_refusal(form_connection_id)

    assert refusal.status_code == 409
    assert _answered(refusal.detail) == DRAFT_PUBLISHED_DETAIL


def test_publish_stored_draft_publishes_as_the_editor_does(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """Two drafts with the same content: the editor publishes one, the approval
    path the other, and both answer the same connection."""
    content = {
        'documents': FORM_CONNECTION['documents'],
        'rules': draft_rules(
            [
                main_branch(us2_items(group_message='You are too young.')),
                variant(us2_items(group_message='You are too young.')),
                variant([AGE_RULE, CLASS_RULE], name='Taxi', origin='empty'),
            ]
        ),
        'step': 'test',
    }
    edited_id = create_draft(signed_in_client, **content)
    approved_id = create_draft(signed_in_client, **content)
    edited = get(signed_in_client, edited_id)
    approved = get(signed_in_client, approved_id)
    published = signed_in_client.post(
        f'{BASE}/{edited_id}/publish',
        json=editor_publish_body(edited, content['documents']),
    )
    assert published.status_code == 200, published.json()

    with SessionLocal() as db:
        view = drafts.publish_stored_draft(
            db,
            approved_id,
            approved['version'],
            actor=Actor(name=TEST_USERNAME, agent='Test agent', approved=True),
        )

    data = view.model_dump(mode='json')
    assert data['id'] == approved_id
    assert published_shape(data) == published_shape(published.json()['data'])
    # The variants keep the draft's ids (FR-029)
    assert [branch['id'] for branch in data['branches']] == [
        branch['id'] for branch in approved['branches']
    ]
    assert get(signed_in_client, approved_id) == data
    assert rows(approved_id) == (1, 1, 3)
    assert trigger(signed_in_client, approved_id)['status'] == 'pending'


def test_publish_stored_draft_publishes_only_its_version(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(signed_in_client)
    saved = save(
        signed_in_client,
        draft_id,
        1,
        name='Geändert',
        documents=FORM_CONNECTION['documents'],
    )
    assert saved.status_code == 200, saved.json()
    before = get(signed_in_client, draft_id)

    with SessionLocal() as db, pytest.raises(HTTPException) as refused:
        drafts.publish_stored_draft(
            db,
            draft_id,
            1,
            actor=Actor(name=TEST_USERNAME, agent='Test agent', approved=True),
        )

    assert refused.value.status_code == 409
    assert _answered(refused.value.detail) == DRAFT_CHANGED_DETAIL
    assert get(signed_in_client, draft_id) == before
    assert rows(draft_id) == (0, 0, 0)
    assert fake_eudiplo.calls == []
