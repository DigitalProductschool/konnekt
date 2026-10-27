"""Rules saved with a form connection (spec 002, contracts/management-api.md).

User stories 1 to 3 through the management API: creating and editing a form
connection with rules, groups and sub-groups, and variants with their ids and pull
URLs; the refusals that name the problem, the rule and its branch; saving documents
and rules together or not at all; and a save over another team member's newer rules,
refused unless it replaces them (FR-028).
"""

import copy
import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx2 import Request, Response
from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import (
    FormConnection,
    FormConnectionBranch,
    FormConnectionRevision,
    FormConnectionRuleSet,
)
from app.schemas import FormConnectionUpdate
from app.services import form_connections as form_connections_service
from app.services import rules as rules_service
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    AGE_19_RULE,
    AGE_21_RULE,
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    HELD_3_YEARS_RULE,
    HELD_RULE,
    STUTTGART_RULE,
    US1_RULES,
    US2_RULES,
    branch_pull_url,
    group,
    main_branch,
    rule,
    rules_input,
    target,
    trigger,
    us2_items,
    variant,
)

INVALID_IDENTIFIER = (
    'The rules contain an invalid identifier. Reload the connection and try again.'
)
NATIONALITY_RULE = rule(
    4,
    target('pid', 'nationalities'),
    {'operator': 'includes_one_of', 'values': ['DE']},
    'You must be a German citizen.',
)


def _count(model: type[Any]) -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(model)) or 0


def _create(client: TestClient, **changes: Any) -> dict[str, Any]:
    response = client.post('/api/form-connections', json=FORM_CONNECTION | changes)
    assert response.status_code == 201, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def _edit_rules(
    created: dict[str, Any], items: list[dict[str, Any]], **branch: Any
) -> dict[str, Any]:
    """The rules of an edit of `created`, as the rules step sends them."""
    return rules_input(
        [main_branch(items, branch_id=created['branches'][0]['id']) | branch],
        rule_base=created['next_rule_number'],
        group_base=created['next_group_number'],
        base_version=created['rule_set_version'],
    )


def _put(client: TestClient, created: dict[str, Any], **changes: Any) -> dict[str, Any]:
    response = client.put(f'/api/form-connections/{created["id"]}', json=changes)
    assert response.status_code == 200, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def _get(client: TestClient, form_connection_id: str) -> dict[str, Any]:
    data: dict[str, Any] = client.get(
        f'/api/form-connections/{form_connection_id}'
    ).json()['data']
    return data


# Creating


def test_creating_with_rules_saves_them_with_their_identifiers(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)

    [branch] = created['branches']
    assert (branch['name'], branch['is_main'], branch['operator']) == (
        'Standard',
        True,
        'and',
    )
    assert branch['items'] == [AGE_RULE, CLASS_RULE, HELD_RULE]
    assert created['rule_set_version'] == 1
    assert (created['next_rule_number'], created['next_group_number']) == (4, 1)
    assert branch['pull_url'] == created['pull_url']
    # The details read the same rules back (US1-AS1)
    assert _get(signed_in_client, created['id']) == created


def test_creating_without_rules_gives_a_main_branch_without_rules(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    without = _create(signed_in_client)
    empty = _create(signed_in_client, rules=rules_input([main_branch([])]))

    for created in (without, empty):
        [branch] = created['branches']
        assert (branch['name'], branch['items']) == ('Standard', [])
        assert (created['next_rule_number'], created['next_group_number']) == (1, 1)


def _with_rule(**changes: Any) -> dict[str, Any]:
    rules = copy.deepcopy(US1_RULES)
    rules['branches'][0]['items'][2] |= changes
    return rules


@pytest.mark.parametrize(
    ('rules', 'message'),
    [
        (_with_rule(message=' '), 'Rule 03 in Standard has no error message.'),
        (
            _with_rule(condition={'operator': 'at_least_years_ago'}),
            'Rule 03 in Standard: enter a number of years of at least 1.',
        ),
        (
            _with_rule(condition={'operator': 'at_least_years_ago', 'years': 1.5}),
            'Rule 03 in Standard: enter a number of years of at least 1.',
        ),
        (_with_rule(condition=None), 'Rule 03 in Standard: choose a check.'),
        (_with_rule(target=None), 'Rule 03 in Standard: choose the data to check.'),
        (
            _with_rule(
                target=target('pid', 'address_locality'),
                condition={'operator': 'equal_to', 'value': '  '},
            ),
            'Rule 03 in Standard: enter a text to compare with.',
        ),
        (
            _with_rule(target=target('pid', 'nationalities')),
            'Rule 03 in Standard checks data that’s no longer requested.',
        ),
        (
            _with_rule(name='Rule 01'),
            'Another rule in Standard is already called Rule 01.',
        ),
    ],
)
def test_a_refused_rule_saves_nothing(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    rules: dict[str, Any],
    message: str,
) -> None:
    response = signed_in_client.post(
        '/api/form-connections', json=FORM_CONNECTION | {'rules': rules}
    )

    assert response.status_code == 400
    assert response.json() == {'error': 'Validation error', 'message': message}
    # Checked before EUDIPLO is called (research R9)
    assert fake_eudiplo.calls == []
    assert _count(FormConnection) == 0


@pytest.mark.parametrize(
    'condition',
    [
        {'operator': 'at_least_years_ago', 'years': '2'},
        {'operator': 'greater_than', 'value': True},
        {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': 'yes'},
        {'operator': 'includes_one_of', 'values': [True]},
    ],
)
def test_values_of_the_wrong_json_type_are_refused(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    condition: dict[str, Any],
) -> None:
    response = signed_in_client.post(
        '/api/form-connections',
        json=FORM_CONNECTION | {'rules': _with_rule(condition=condition)},
    )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Invalid request payload',
    }
    assert _count(FormConnection) == 0


# Editing


def test_editing_the_rules_only_saves_the_next_rule_set(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)
    calls_before = len(fake_eudiplo.calls)

    edited = _put(
        signed_in_client,
        created,
        rules=_edit_rules(created, [AGE_RULE, CLASS_RULE, HELD_RULE]),
    )

    assert edited['branches'][0]['items'] == [AGE_RULE, CLASS_RULE, HELD_RULE]
    assert edited['branches'][0]['id'] == created['branches'][0]['id']
    assert edited['rule_set_version'] == 2
    assert (edited['next_rule_number'], edited['next_group_number']) == (4, 1)
    # The documents stay, so there is no new revision and no EUDIPLO call
    assert edited['documents'] == created['documents']
    assert _count(FormConnectionRevision) == 1
    assert len(fake_eudiplo.calls) == calls_before
    assert (edited['trigger_url'], edited['pull_url']) == (
        created['trigger_url'],
        created['pull_url'],
    )


def test_a_rename_with_the_rules_is_saved_in_one_go(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)

    edited = _put(
        signed_in_client,
        created,
        name='Renamed',
        rules=_edit_rules(created, [AGE_RULE], name='Taxi'),
    )

    assert edited['name'] == 'Renamed'
    assert edited['branches'][0]['name'] == 'Taxi'


def test_editing_documents_and_rules_together_saves_both(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    documents = copy.deepcopy(FORM_CONNECTION['documents'])
    documents[0]['fields'].append('nationalities')

    edited = _put(
        signed_in_client,
        created,
        documents=documents,
        rules=_edit_rules(created, [AGE_RULE, CLASS_RULE, HELD_RULE, NATIONALITY_RULE]),
    )

    assert edited['branches'][0]['items'][-1] == NATIONALITY_RULE
    assert edited['rule_set_version'] == 2
    assert edited['next_rule_number'] == 5
    assert _count(FormConnectionRevision) == 2
    assert 'nationalities' in [
        field['key'] for field in edited['documents'][0]['fields']
    ]


def test_new_rules_must_fit_the_new_documents(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        json={'rules': _edit_rules(created, [AGE_RULE, NATIONALITY_RULE])},
    )

    assert response.status_code == 400
    assert response.json()['message'] == (
        'Rule 04 in Standard checks data that’s no longer requested.'
    )
    assert _get(signed_in_client, created['id']) == created


def test_documents_that_a_rule_checks_cant_be_dropped_without_the_rule(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    calls_before = len(fake_eudiplo.calls)
    documents = copy.deepcopy(FORM_CONNECTION['documents'])
    documents[0]['fields'].remove('birthdate')

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}', json={'documents': documents}
    )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Rule 01 in Standard checks data that’s no longer requested.',
    }
    assert len(fake_eudiplo.calls) == calls_before
    assert _get(signed_in_client, created['id']) == created

    # Dropping the rule with the data is fine
    edited = _put(
        signed_in_client,
        created,
        documents=documents,
        rules=_edit_rules(created, [CLASS_RULE, HELD_RULE]),
    )
    assert [item['id'] for item in edited['branches'][0]['items']] == [
        'rule-2',
        'rule-3',
    ]
    # Its identifier isn't given out again
    assert edited['next_rule_number'] == 4


def test_documents_that_no_rule_checks_can_change_without_the_rules(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    documents = copy.deepcopy(FORM_CONNECTION['documents'])
    documents[0]['fields'].remove('address_locality')

    edited = _put(signed_in_client, created, documents=documents)

    assert edited['branches'] == created['branches']
    assert edited['rule_set_version'] == 1
    assert _count(FormConnectionRevision) == 2


def test_an_unchanged_rule_set_creates_no_version(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)

    edited = _put(
        signed_in_client,
        created,
        rules=_edit_rules(created, [AGE_RULE, CLASS_RULE, HELD_RULE]),
    )

    assert edited == created | {'updated_at': edited['updated_at']}
    assert _count(FormConnectionRuleSet) == 1


def test_a_refused_edit_changes_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        json={
            'name': 'Renamed',
            'rules': _edit_rules(created, [AGE_RULE | {'message': ''}]),
        },
    )

    assert response.status_code == 400
    assert response.json()['message'] == 'Rule 01 in Standard has no error message.'
    assert _get(signed_in_client, created['id']) == created


def test_the_main_branch_keeps_its_id(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)
    rules = _edit_rules(created, [AGE_RULE])
    rules['branches'][0]['id'] = None

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}', json={'rules': rules}
    )

    assert response.status_code == 400
    assert response.json()['message'] == 'The rules need exactly one main branch.'


@pytest.mark.parametrize('status_code', [500, 503])
def test_a_failed_configuration_saves_neither_documents_nor_rules(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, status_code: int
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    documents = copy.deepcopy(FORM_CONNECTION['documents'])
    documents[0]['fields'].append('nationalities')
    fake_eudiplo.fail('create_config', status_code)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        json={
            'documents': documents,
            'rules': _edit_rules(created, [AGE_RULE, NATIONALITY_RULE]),
        },
    )

    assert response.status_code == 502
    # Nothing has changed (FR-028), and the team member can try again
    assert _get(signed_in_client, created['id']) == created
    assert _count(FormConnectionRevision) == 1
    assert _count(FormConnectionRuleSet) == 1
    retried = _put(
        signed_in_client,
        created,
        documents=documents,
        rules=_edit_rules(created, [AGE_RULE, NATIONALITY_RULE]),
    )
    assert retried['rule_set_version'] == 2


def test_a_refusal_under_the_lock_removes_the_new_configuration(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The rules are checked again under the row lock, after EUDIPLO answered."""
    created = _create(signed_in_client, rules=US1_RULES)
    documents = copy.deepcopy(FORM_CONNECTION['documents'])
    documents[0]['fields'].append('nationalities')
    # A new rule numbered below a base that the editor can't have loaded
    rules = _edit_rules(
        created, [AGE_RULE, NATIONALITY_RULE | {'id': 'rule-5', 'name': 'Rule 05'}]
    )
    rules['numbering_base']['rule'] = 9
    body = {'documents': documents, 'rules': rules}
    calls_before = len(fake_eudiplo.calls)

    refused = signed_in_client.put(f'/api/form-connections/{created["id"]}', json=body)

    assert refused.status_code == 400
    assert refused.json()['message'] == INVALID_IDENTIFIER
    assert len(fake_eudiplo.calls) == calls_before

    # As if the check before EUDIPLO had passed, and another save came in between
    monkeypatch.setattr(rules_service, 'check_save', lambda *_args: None)

    response = signed_in_client.put(f'/api/form-connections/{created["id"]}', json=body)

    assert response.status_code == 400
    assert response.json()['message'] == INVALID_IDENTIFIER
    assert fake_eudiplo.call_names()[-2:] == ['create_config', 'delete_config']
    assert fake_eudiplo.configs.keys() == {f'fc-{created["id"]}-r1'}
    assert _get(signed_in_client, created['id']) == created
    assert _count(FormConnectionRevision) == 1


# Groups and sub-groups (user story 2)

GROUP_MESSAGE = 'You must be at least 21, or 19 with class B for 3 years.'


def test_creating_with_a_group_and_a_sub_group_saves_them(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    items = us2_items(group_message=GROUP_MESSAGE)

    created = _create(signed_in_client, rules=rules_input([main_branch(items)]))

    assert created['branches'][0]['items'] == items
    # Groups and sub-groups count with the group counter (research R5)
    assert (created['next_rule_number'], created['next_group_number']) == (5, 3)
    assert _get(signed_in_client, created['id']) == created


def test_a_new_group_is_numbered_from_the_group_counter(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US2_RULES)
    new_group = group(
        3,
        [
            rule(
                5,
                target('mdl', 'expiry_date'),
                {'operator': 'at_least_from_now', 'amount': 6, 'unit': 'months'},
                'Your licence must be valid for at least 6 more months.',
            ),
            CLASS_RULE | {'id': 'rule-6', 'name': 'Rule 06'},
        ],
        operator='or',
    )

    edited = _put(
        signed_in_client,
        created,
        rules=_edit_rules(created, [*us2_items(), new_group]),
    )

    assert edited['branches'][0]['items'][2] == new_group
    assert edited['rule_set_version'] == 2
    assert (edited['next_rule_number'], edited['next_group_number']) == (7, 4)


@pytest.mark.parametrize(
    ('items', 'message'),
    [
        (
            [STUTTGART_RULE, group(1, [AGE_21_RULE])],
            'Group 01 in Standard needs at least two rules.',
        ),
        (
            [
                group(
                    1,
                    [
                        AGE_21_RULE,
                        group(
                            2,
                            [
                                AGE_19_RULE,
                                group(3, [STUTTGART_RULE, HELD_3_YEARS_RULE]),
                            ],
                            name='Sub-group 02',
                        ),
                    ],
                )
            ],
            'Sub-group 02 in Standard can only hold rules.',
        ),
    ],
)
def test_a_refused_group_saves_nothing(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    items: list[dict[str, Any]],
    message: str,
) -> None:
    response = signed_in_client.post(
        '/api/form-connections',
        json=FORM_CONNECTION | {'rules': rules_input([main_branch(items)])},
    )

    assert response.status_code == 400
    assert response.json() == {'error': 'Validation error', 'message': message}
    assert fake_eudiplo.calls == []
    assert _count(FormConnection) == 0


def test_a_group_is_combined_with_and_or_or(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    stuttgart, us2_group = us2_items()
    rules = rules_input([main_branch([stuttgart, us2_group | {'operator': 'xor'}])])

    response = signed_in_client.post(
        '/api/form-connections', json=FORM_CONNECTION | {'rules': rules}
    )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Invalid request payload',
    }
    assert _count(FormConnection) == 0


# Branches ("variants" in the UI; FR-019, FR-020, FR-025, FR-027; research R3, R4)

OUT_OF_STEP = (
    'The variant Ambulance is out of step with Standard. Reload the connection and '
    'try again.'
)
US1_ITEMS = [AGE_RULE, CLASS_RULE, HELD_RULE]
AGE_19_IN_AMBULANCE = AGE_RULE | {
    'mark': 'changed',
    'condition': {'operator': 'at_least_years_ago', 'years': 19},
    'message': 'You must be at least 19 years old.',
}
CITY_IN_TAXI = rule(
    4,
    target('pid', 'address_locality'),
    {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': False},
    'You must live in Stuttgart.',
)
AMBULANCE = variant(
    [AGE_19_IN_AMBULANCE, CLASS_RULE, HELD_RULE],
    description='Applicants for an ambulance licence',
)
TAXI = variant([CITY_IN_TAXI], name='Taxi', origin='empty')


def _branch_rows(form_connection_id: str) -> dict[str, FormConnectionBranch]:
    with SessionLocal() as db:
        rows = db.scalars(
            select(FormConnectionBranch).where(
                FormConnectionBranch.form_connection_id == form_connection_id
            )
        ).all()
        return {row.id: row for row in rows}


def _as_sent(branch: dict[str, Any], **changes: Any) -> dict[str, Any]:
    """A saved branch as the rules step sends it back."""
    sent = {
        key: value
        for key, value in branch.items()
        if key not in ('is_main', 'pull_url')
    }
    return copy.deepcopy(sent) | changes


def _save_branches(
    created: dict[str, Any], branches: list[dict[str, Any]]
) -> dict[str, Any]:
    """The rules of an edit of `created` with these branches."""
    return rules_input(
        branches,
        rule_base=created['next_rule_number'],
        group_base=created['next_group_number'],
        base_version=created['rule_set_version'],
    )


def test_a_save_with_variants_returns_their_ids_and_pull_urls(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(
        signed_in_client, rules=rules_input([main_branch(US1_ITEMS), AMBULANCE, TAXI])
    )

    standard, ambulance, taxi = created['branches']
    # In tab order, as sent
    assert [(branch['name'], branch['origin']) for branch in created['branches']] == [
        ('Standard', 'main'),
        ('Ambulance', 'based'),
        ('Taxi', 'empty'),
    ]
    assert (ambulance['items'], taxi['items']) == (AMBULANCE['items'], TAXI['items'])
    assert ambulance['description'] == 'Applicants for an ambulance licence'
    assert [branch['is_main'] for branch in created['branches']] == [True, False, False]
    # Standard keeps spec 001's pull URL; every other branch's names it (FR-025)
    assert standard['pull_url'] == created['pull_url']
    connect_url = f'https://middleware.test/api/connect/{created["id"]}'
    for branch in (ambulance, taxi):
        assert uuid.UUID(branch['id']).version == 4
        assert branch['pull_url'] == (
            f'{connect_url}/branches/{branch["id"]}/requests/{{reference}}'
        )
    rows = _branch_rows(created['id'])
    assert set(rows) == {standard['id'], ambulance['id'], taxi['id']}
    assert [row.id for row in rows.values() if row.is_main] == [standard['id']]
    # Taxi's own rule took the next number
    assert created['next_rule_number'] == 5
    assert _get(signed_in_client, created['id']) == created


def test_a_variant_added_in_an_edit_gets_its_id_and_pull_url(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)

    edited = _put(
        signed_in_client,
        created,
        rules=_save_branches(created, [_as_sent(created['branches'][0]), AMBULANCE]),
    )

    standard, ambulance = edited['branches']
    assert standard['id'] == created['branches'][0]['id']
    assert ambulance['name'] == 'Ambulance'
    assert ambulance['pull_url'] == (
        f'https://middleware.test/api/connect/{created["id"]}/branches/'
        f'{ambulance["id"]}/requests/{{reference}}'
    )
    assert edited['rule_set_version'] == 2


def test_a_rename_keeps_the_ids_and_the_pull_urls(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(
        signed_in_client, rules=rules_input([main_branch(US1_ITEMS), AMBULANCE])
    )
    standard, ambulance = created['branches']

    edited = _put(
        signed_in_client,
        created,
        rules=_save_branches(
            created,
            [
                # Standard can be renamed and described too (FR-020)
                _as_sent(standard, name='All applicants', description='Everyone'),
                _as_sent(ambulance, name='Ambulance service', description=None),
            ],
        ),
    )

    assert [
        (branch['id'], branch['name'], branch['description'], branch['pull_url'])
        for branch in edited['branches']
    ] == [
        (standard['id'], 'All applicants', 'Everyone', standard['pull_url']),
        (ambulance['id'], 'Ambulance service', None, ambulance['pull_url']),
    ]
    assert edited['pull_url'] == created['pull_url']


def test_a_variant_left_out_is_deleted_and_its_id_isnt_reused(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(
        signed_in_client, rules=rules_input([main_branch(US1_ITEMS), AMBULANCE])
    )
    standard, ambulance = created['branches']

    without = _put(
        signed_in_client, created, rules=_save_branches(created, [_as_sent(standard)])
    )

    assert [branch['id'] for branch in without['branches']] == [standard['id']]
    assert _branch_rows(created['id'])[ambulance['id']].deleted_at is not None
    # The deleted variant's id can't be saved again
    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        json={
            'rules': _save_branches(without, [_as_sent(standard), _as_sent(ambulance)])
        },
    )
    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Unknown variant.',
    }
    assert _get(signed_in_client, created['id']) == without
    # A new variant of the same name is a new branch, with its own pull URL
    again = _put(
        signed_in_client,
        without,
        rules=_save_branches(without, [_as_sent(standard), AMBULANCE]),
    )
    assert again['branches'][1]['name'] == 'Ambulance'
    assert again['branches'][1]['id'] != ambulance['id']
    assert again['branches'][1]['pull_url'] != ambulance['pull_url']
    assert _branch_rows(created['id'])[ambulance['id']].deleted_at is not None


def test_the_main_branch_cant_be_left_out(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(
        signed_in_client, rules=rules_input([main_branch(US1_ITEMS), AMBULANCE])
    )
    ambulance = created['branches'][1]

    for branches in (
        [_as_sent(ambulance)],
        [_as_sent(ambulance, origin='main')],
    ):
        response = signed_in_client.put(
            f'/api/form-connections/{created["id"]}',
            json={'rules': _save_branches(created, branches)},
        )
        assert response.status_code == 400
        assert response.json()['message'] == 'The rules need exactly one main branch.'
    assert _get(signed_in_client, created['id']) == created
    assert all(row.deleted_at is None for row in _branch_rows(created['id']).values())


def test_an_out_of_step_variant_is_refused_on_create_and_nothing_is_saved(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    # Ambulance lacks Standard's class B rule
    ambulance = variant([AGE_19_IN_AMBULANCE, CLASS_RULE])
    rules = rules_input([main_branch(US1_ITEMS), ambulance])

    response = signed_in_client.post(
        '/api/form-connections', json=FORM_CONNECTION | {'rules': rules}
    )

    assert response.status_code == 400
    assert response.json() == {'error': 'Validation error', 'message': OUT_OF_STEP}
    assert fake_eudiplo.calls == []
    assert _count(FormConnection) == 0
    assert _count(FormConnectionBranch) == 0


def test_an_out_of_step_variant_is_refused_on_edit_and_nothing_is_saved(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(
        signed_in_client, rules=rules_input([main_branch(US1_ITEMS), AMBULANCE])
    )
    standard, ambulance = created['branches']
    calls = len(fake_eudiplo.calls)
    # Standard asks for class B for 3 years, but Ambulance's unmarked copy of the
    # rule still asks for 2: the change didn't reach it. The documents change too
    held_3_years = HELD_RULE | {
        'condition': {'operator': 'at_least_years_ago', 'years': 3}
    }

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        json={
            'name': 'Renamed',
            'documents': FORM_CONNECTION['documents'][:1]
            + [FORM_CONNECTION['documents'][1] | {'fields': ['driving_privileges']}],
            'rules': _save_branches(
                created,
                [
                    _as_sent(standard, items=[AGE_RULE, CLASS_RULE, held_3_years]),
                    _as_sent(ambulance, name=' Ambulance '),
                ],
            ),
        },
    )

    assert response.status_code == 400
    assert response.json() == {'error': 'Validation error', 'message': OUT_OF_STEP}
    # Refused before EUDIPLO is called (research R9)
    assert len(fake_eudiplo.calls) == calls
    assert _get(signed_in_client, created['id']) == created
    assert _count(FormConnectionRuleSet) == 1
    assert _count(FormConnectionRevision) == 1


# Saving over another team member's newer rules (FR-028, research R9)

RULES_CHANGED = (
    'Another team member saved the rules of this connection after you opened it.'
)
SCHOOL_TRANSPORT = variant([], name='School transport', origin='empty')
NIGHT_SHIFT = variant([], name='Night shift', origin='empty')


def _refused_as_stale(
    client: TestClient, created: dict[str, Any], **changes: Any
) -> str:
    """Send an edit of `created`; return the message of its 409 `rules_changed`."""
    response = client.put(f'/api/form-connections/{created["id"]}', json=changes)
    assert response.status_code == 409, response.json()
    assert response.json()['error'] == 'rules_changed'
    message: str = response.json()['message']
    return message


def _replacing(rules: dict[str, Any]) -> dict[str, Any]:
    """The same save, replacing the rules another team member saved meanwhile."""
    return rules | {'replace': True}


def _with_nationalities() -> list[dict[str, Any]]:
    documents = copy.deepcopy(FORM_CONNECTION['documents'])
    documents[0]['fields'].append('nationalities')
    return documents


def test_a_save_over_newer_rules_is_refused_and_saves_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(
        signed_in_client, rules=rules_input([main_branch(US1_ITEMS), AMBULANCE])
    )
    standard, ambulance = created['branches']
    # Another team member adds two variants
    theirs = _put(
        signed_in_client,
        created,
        rules=_save_branches(
            created,
            [_as_sent(standard), _as_sent(ambulance), SCHOOL_TRANSPORT, NIGHT_SHIFT],
        ),
    )
    # This editor opened the rules before, and describes Ambulance
    mine = _save_branches(
        created, [_as_sent(standard), _as_sent(ambulance, description='Ambulances')]
    )

    message = _refused_as_stale(signed_in_client, created, name='Renamed', rules=mine)

    assert message == (
        f'{RULES_CHANGED} Replacing their changes deletes the variants School '
        'transport and Night shift.'
    )
    # Nothing is saved, the name included
    assert _get(signed_in_client, created['id']) == theirs
    assert _count(FormConnectionRuleSet) == 2
    assert all(row.deleted_at is None for row in _branch_rows(created['id']).values())


def test_replacing_newer_rules_saves_and_shifts_new_identifiers(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    # Another team member adds rule-4; this editor numbered its own new rule from
    # the same counter
    _put(
        signed_in_client,
        created,
        rules=_edit_rules(created, [*US1_ITEMS, CITY_IN_TAXI]),
    )
    karlsruhe = CITY_IN_TAXI | {
        'condition': {
            'operator': 'equal_to',
            'value': 'Karlsruhe',
            'match_case': False,
        },
        'message': 'You must live in Karlsruhe.',
    }
    mine = _edit_rules(created, [*US1_ITEMS, karlsruhe])
    # No variant is deleted or comes back, so the message names none
    assert _refused_as_stale(signed_in_client, created, rules=mine) == RULES_CHANGED

    replaced = _put(signed_in_client, created, rules=_replacing(mine))

    # This editor's version, whole: its new rule moved up past the other's rule-4,
    # which no rule keeps, and its default name moved with it (research R5)
    assert replaced['branches'][0]['items'] == [
        *US1_ITEMS,
        karlsruhe | {'id': 'rule-5', 'name': 'Rule 05'},
    ]
    assert replaced['rule_set_version'] == 3
    assert (replaced['next_rule_number'], replaced['next_group_number']) == (6, 1)


def test_replacing_brings_back_a_deleted_rule_under_its_identifier(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    # Another team member deletes rule-3; this editor keeps it, and changes rule-1
    _put(signed_in_client, created, rules=_edit_rules(created, [AGE_RULE, CLASS_RULE]))
    age = AGE_RULE | {'message': 'Applicants must be at least 21.'}

    replaced = _put(
        signed_in_client,
        created,
        rules=_replacing(_edit_rules(created, [age, CLASS_RULE, HELD_RULE])),
    )

    # The same rule returns, so no identifier is reused (FR-010)
    assert replaced['branches'][0]['items'] == [age, CLASS_RULE, HELD_RULE]
    assert replaced['next_rule_number'] == 4


def test_replacing_brings_back_a_deleted_variant_with_a_new_pull_url(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(
        signed_in_client, rules=rules_input([main_branch(US1_ITEMS), AMBULANCE, TAXI])
    )
    standard, ambulance, taxi = created['branches']
    # Another team member deletes Taxi and adds School transport
    theirs = _put(
        signed_in_client,
        created,
        rules=_save_branches(
            created, [_as_sent(standard), _as_sent(ambulance), SCHOOL_TRANSPORT]
        ),
    )
    school = theirs['branches'][2]
    mine = _save_branches(
        created, [_as_sent(standard), _as_sent(ambulance), _as_sent(taxi)]
    )

    # The stale save still holds Taxi: it meets the 409, not "Unknown variant."
    assert _refused_as_stale(signed_in_client, created, rules=mine) == (
        f'{RULES_CHANGED} Replacing their changes deletes the variant School '
        'transport and brings back the variant Taxi with a new result link.'
    )

    replaced = _put(signed_in_client, created, rules=_replacing(mine))

    assert [branch['name'] for branch in replaced['branches']] == [
        'Standard',
        'Ambulance',
        'Taxi',
    ]
    new_taxi = replaced['branches'][2]
    assert (new_taxi['origin'], new_taxi['items']) == ('empty', taxi['items'])
    # A new branch, with its own row and pull URL (FR-025)
    assert new_taxi['id'] not in (taxi['id'], school['id'])
    assert uuid.UUID(new_taxi['id']).version == 4
    assert new_taxi['pull_url'] != taxi['pull_url']
    rows = _branch_rows(created['id'])
    assert rows[new_taxi['id']].deleted_at is None
    assert rows[taxi['id']].deleted_at is not None
    assert rows[school['id']].deleted_at is not None
    # Taxi's old pull URL keeps answering "unavailable" (FR-027)
    started = trigger(signed_in_client, created['id'])
    old = signed_in_client.get(
        branch_pull_url(created['id'], taxi['id'], started['reference'])
    )
    assert (old.status_code, old.json()) == (
        409,
        {'error': 'unavailable', 'message': 'This variant was deleted'},
    )
    new = signed_in_client.get(
        branch_pull_url(created['id'], new_taxi['id'], started['reference'])
    )
    assert new.status_code == 200


def test_a_stale_save_meets_the_409_before_its_rules_are_checked(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    # Another team member stops requesting the date of birth, with the rule on it
    documents = copy.deepcopy(FORM_CONNECTION['documents'])
    documents[0]['fields'].remove('birthdate')
    _put(
        signed_in_client,
        created,
        documents=documents,
        rules=_edit_rules(created, [CLASS_RULE, HELD_RULE]),
    )

    # Checked against those documents, the age rule would be refused instead
    message = _refused_as_stale(
        signed_in_client, created, rules=_edit_rules(created, US1_ITEMS)
    )

    assert message == RULES_CHANGED


def test_a_stale_editor_saves_the_name_and_the_documents(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    theirs = _put(
        signed_in_client, created, rules=_edit_rules(created, [AGE_RULE, CLASS_RULE])
    )

    # The editor sends no rules when they didn't change (contracts/management-api.md)
    renamed = _put(signed_in_client, created, name='Renamed')
    edited = _put(signed_in_client, created, documents=_with_nationalities())

    # For the name and the documents, the later save wins; the rules stay theirs
    assert renamed['name'] == 'Renamed'
    assert 'nationalities' in [
        field['key'] for field in edited['documents'][0]['fields']
    ]
    for saved in (renamed, edited):
        assert saved['branches'] == theirs['branches']
        assert saved['rule_set_version'] == theirs['rule_set_version']


def test_a_stale_save_of_documents_and_rules_calls_no_eudiplo(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    _put(signed_in_client, created, rules=_edit_rules(created, [AGE_RULE, CLASS_RULE]))
    calls = fake_eudiplo.call_names()

    message = _refused_as_stale(
        signed_in_client,
        created,
        documents=_with_nationalities(),
        rules=_edit_rules(created, [*US1_ITEMS, NATIONALITY_RULE]),
    )

    assert message == RULES_CHANGED
    # Refused before a configuration is created (research R9)
    assert fake_eudiplo.call_names() == calls
    assert _count(FormConnectionRevision) == 1


def test_a_save_overtaken_while_eudiplo_answers_is_refused_under_the_lock(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created = _create(signed_in_client, rules=US1_RULES)
    create_config = fake_eudiplo._create_config

    def overtaken(request: Request) -> Response:
        # Another team member saves the rules while EUDIPLO creates the configuration
        with SessionLocal() as db:
            form_connections_service.update_form_connection(
                db,
                created['id'],
                FormConnectionUpdate.model_validate(
                    {'rules': _edit_rules(created, [AGE_RULE, CLASS_RULE])}
                ),
            )
        return create_config(request)

    monkeypatch.setattr(fake_eudiplo, '_create_config', overtaken)

    message = _refused_as_stale(
        signed_in_client,
        created,
        documents=_with_nationalities(),
        rules=_edit_rules(created, [*US1_ITEMS, NATIONALITY_RULE]),
    )

    assert message == RULES_CHANGED
    # The new configuration is deleted again, and the other's rules stay
    assert fake_eudiplo.call_names()[-2:] == ['create_config', 'delete_config']
    assert fake_eudiplo.configs.keys() == {f'fc-{created["id"]}-r1'}
    assert _count(FormConnectionRevision) == 1
    current = _get(signed_in_client, created['id'])
    assert current['branches'][0]['items'] == [AGE_RULE, CLASS_RULE]
    assert current['documents'] == created['documents']


# Sign-in and CSRF


def test_rules_need_a_session(client: TestClient, fake_eudiplo: FakeEudiplo) -> None:
    response = client.post(
        '/api/form-connections', json=FORM_CONNECTION | {'rules': US1_RULES}
    )
    assert response.status_code == 401
    assert _count(FormConnection) == 0


def test_saving_rules_needs_a_json_body(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client)

    response = signed_in_client.put(
        f'/api/form-connections/{created["id"]}',
        content='rules=x',
        headers={'Content-Type': 'text/plain'},
    )

    assert response.status_code == 415
    assert _get(signed_in_client, created['id']) == created
