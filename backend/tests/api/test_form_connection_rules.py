"""Rules saved with a form connection (spec 002, contracts/management-api.md).

User story 1 through the management API: creating and editing a form connection with
rules, the refusals that name the problem, the rule and its branch, and saving
documents and rules together or not at all (FR-028).
"""

import copy
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import FormConnection, FormConnectionRevision, FormConnectionRuleSet
from app.services import rules as rules_service
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    HELD_RULE,
    US1_RULES,
    main_branch,
    rule,
    rules_input,
    target,
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
