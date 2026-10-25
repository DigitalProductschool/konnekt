"""Identifiers of rules and groups, and the counters (research R5, FR-010).

The rules step numbers new rules from the counters it loaded (`numbering_base`).
Saving checks those identifiers and moves them up when another save took the numbers
meanwhile, so that no identifier is ever reused within a form connection.
"""

import uuid
from typing import Any

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import FormConnection, FormConnectionBranch, FormConnectionRuleSet
from app.schemas import RequestedDocument, RulesInput
from app.services.rules import (
    check_first_save,
    clean_rules,
    first_rule_set,
    save_rule_set,
)
from tests.helpers import (
    FORM_CONNECTION,
    group,
    main_branch,
    rule,
    rules_input,
    target,
)

DOCUMENTS = [
    RequestedDocument.model_validate(document)
    for document in FORM_CONNECTION['documents']
]
INVALID_IDENTIFIER = (
    'The rules contain an invalid identifier. Reload the connection and try again.'
)


def _city_rule(number: int, *, name: str | None = None) -> dict[str, Any]:
    return rule(
        number,
        target('pid', 'address_locality'),
        {'operator': 'equal_to', 'value': f'City {number}', 'match_case': False},
        'You must live there.',
        name=name,
    )


def _create(
    db: Session,
    versions: list[list[dict[str, Any]]],
    *,
    next_rule_number: int,
    next_group_number: int = 1,
) -> tuple[str, str]:
    """A form connection whose rule sets have these main branch rules, in order.

    The last version is current. Returns the form connection's and its main
    branch's ids.
    """
    form_connection_id, branch_id = str(uuid.uuid4()), str(uuid.uuid4())
    db.add(
        FormConnection(
            id=form_connection_id,
            name='Test',
            servicebw_form='FS-1',
            current_revision=1,
            current_rule_set=len(versions),
            next_rule_number=next_rule_number,
            next_group_number=next_group_number,
        )
    )
    db.flush()
    db.add(
        FormConnectionBranch(
            id=branch_id, form_connection_id=form_connection_id, is_main=True
        )
    )
    for version, items in enumerate(versions, start=1):
        db.add(
            FormConnectionRuleSet(
                form_connection_id=form_connection_id,
                version=version,
                branches=[main_branch(items, branch_id=branch_id)],
            )
        )
    db.commit()
    return form_connection_id, branch_id


def _save(
    form_connection_id: str,
    branch_id: str,
    items: list[dict[str, Any]],
    *,
    rule_base: int,
    group_base: int = 1,
    base_version: int | None,
) -> list[dict[str, Any]]:
    """Save the main branch's rules as the editor would; return them as saved.

    The save replaces any rules saved since `base_version` (FR-028), which is how
    an editor's numbers can meet another save's.
    """
    payload = rules_input(
        [main_branch(items, branch_id=branch_id)],
        rule_base=rule_base,
        group_base=group_base,
        base_version=base_version,
        replace=True,
    )
    with SessionLocal() as db:
        save = clean_rules(RulesInput.model_validate(payload), DOCUMENTS, branch_id)
        form_connection = db.get_one(FormConnection, form_connection_id)
        saved = save_rule_set(db, form_connection, save)
        db.commit()
    return [item.model_dump() for item in saved[0].items]


def _state(form_connection_id: str) -> tuple[int, int, int]:
    """The current rule set, and the next rule and group numbers."""
    with SessionLocal() as db:
        form_connection = db.get_one(FormConnection, form_connection_id)
        return (
            form_connection.current_rule_set,
            form_connection.next_rule_number,
            form_connection.next_group_number,
        )


def _invalid(
    form_connection_id: str,
    branch_id: str,
    items: list[dict[str, Any]],
    *,
    rule_base: int,
    base_version: int | None,
) -> None:
    with pytest.raises(HTTPException) as caught:
        _save(
            form_connection_id,
            branch_id,
            items,
            rule_base=rule_base,
            base_version=base_version,
        )
    assert caught.value.status_code == 400
    assert caught.value.detail == {
        'error': 'Validation error',
        'message': INVALID_IDENTIFIER,
    }


def test_new_rules_keep_their_numbers_and_the_counters_follow() -> None:
    with SessionLocal() as db:
        form_connection_id, branch_id = _create(db, [[]], next_rule_number=1)
    items = [_city_rule(1), _city_rule(2), _city_rule(3, name='Lives there')]

    saved = _save(form_connection_id, branch_id, items, rule_base=1, base_version=1)

    assert saved == items
    assert _state(form_connection_id) == (2, 4, 1)


def test_new_identifiers_start_at_the_base() -> None:
    with SessionLocal() as db:
        form_connection_id, branch_id = _create(
            db, [[_city_rule(1)]], next_rule_number=3
        )

    # rule-2 was deleted before the editor loaded the rules, which numbered from 3
    _invalid(
        form_connection_id,
        branch_id,
        [_city_rule(1), _city_rule(2)],
        rule_base=3,
        base_version=1,
    )
    # Not known at all
    _invalid(
        form_connection_id,
        branch_id,
        [_city_rule(1), _city_rule(2)],
        rule_base=3,
        base_version=None,
    )
    assert _state(form_connection_id) == (1, 3, 1)


def test_a_rule_another_save_deleted_comes_back_under_its_identifier() -> None:
    with SessionLocal() as db:
        # The editor loaded version 1; another save then deleted rule-2
        form_connection_id, branch_id = _create(
            db,
            [[_city_rule(1), _city_rule(2)], [_city_rule(1)]],
            next_rule_number=3,
        )

    saved = _save(
        form_connection_id,
        branch_id,
        [_city_rule(1), _city_rule(2)],
        rule_base=3,
        base_version=1,
    )

    assert [item['id'] for item in saved] == ['rule-1', 'rule-2']
    assert _state(form_connection_id) == (3, 3, 1)


def test_new_identifiers_move_up_when_another_save_took_their_numbers() -> None:
    with SessionLocal() as db:
        # The editor loaded version 1, numbering from 2; another save then added
        # its own rule-2 and rule-3
        form_connection_id, branch_id = _create(
            db,
            [
                [_city_rule(1)],
                [_city_rule(1), _city_rule(2), _city_rule(3, name='Holds B')],
            ],
            next_rule_number=4,
        )

    saved = _save(
        form_connection_id,
        branch_id,
        [_city_rule(1), _city_rule(2), _city_rule(3, name='Lives there')],
        rule_base=2,
        base_version=1,
    )

    # The editor's rule-2 isn't the other save's rule-2
    assert [(item['id'], item['name']) for item in saved] == [
        ('rule-1', 'Rule 01'),
        ('rule-4', 'Rule 04'),
        ('rule-5', 'Lives there'),
    ]
    assert _state(form_connection_id) == (3, 6, 1)


def test_moved_default_names_keep_two_digits() -> None:
    with SessionLocal() as db:
        form_connection_id, branch_id = _create(
            db, [[_city_rule(1)]], next_rule_number=10
        )

    saved = _save(
        form_connection_id,
        branch_id,
        [_city_rule(1), _city_rule(2), _city_rule(3, name='rule 3')],
        rule_base=2,
        base_version=1,
    )

    assert [(item['id'], item['name']) for item in saved] == [
        ('rule-1', 'Rule 01'),
        ('rule-10', 'Rule 10'),
        ('rule-11', 'Rule 11'),
    ]


def test_new_groups_take_their_numbers_from_the_group_counter() -> None:
    with SessionLocal() as db:
        form_connection_id, branch_id = _create(db, [[]], next_rule_number=1)
    sub_group = group(2, [_city_rule(3), _city_rule(4)], name='Sub-group 02')
    items = [_city_rule(1), group(1, [_city_rule(2), sub_group], operator='or')]

    saved = _save(form_connection_id, branch_id, items, rule_base=1, base_version=1)

    # Groups and sub-groups share the group counter (research R5)
    assert saved == items
    assert _state(form_connection_id) == (2, 5, 3)


def test_new_groups_move_up_when_another_save_took_their_numbers() -> None:
    rules_ = [_city_rule(1), _city_rule(2), _city_rule(3)]
    with SessionLocal() as db:
        # The editor loaded version 1, numbering groups from 1; another save then
        # grouped the same rules as group-1 and group-2
        form_connection_id, branch_id = _create(
            db,
            [
                rules_,
                [group(1, [rules_[0], group(2, rules_[1:], name='Sub-group 02')])],
            ],
            next_rule_number=4,
            next_group_number=3,
        )
    sub_group = group(2, rules_[1:], name='Holders of B')

    saved = _save(
        form_connection_id,
        branch_id,
        [group(1, [rules_[0], sub_group], operator='or')],
        rule_base=4,
        group_base=1,
        base_version=1,
    )

    # The default name moves with the number, the team's own name stays
    [saved_group] = saved
    assert (saved_group['id'], saved_group['name']) == ('group-3', 'Group 03')
    saved_sub_group = saved_group['items'][1]
    assert (saved_sub_group['id'], saved_sub_group['name']) == (
        'group-4',
        'Holders of B',
    )
    assert [member['id'] for member in saved_sub_group['items']] == [
        'rule-2',
        'rule-3',
    ]
    assert _state(form_connection_id) == (3, 4, 5)


def test_the_counters_are_never_lowered() -> None:
    with SessionLocal() as db:
        form_connection_id, branch_id = _create(
            db, [[_city_rule(1), _city_rule(6)]], next_rule_number=7
        )

    _save(form_connection_id, branch_id, [], rule_base=7, base_version=1)
    assert _state(form_connection_id) == (2, 7, 1)

    # An editor that numbered from a higher base keeps its numbers
    saved = _save(
        form_connection_id, branch_id, [_city_rule(9)], rule_base=9, base_version=2
    )
    assert saved[0]['id'] == 'rule-9'
    assert _state(form_connection_id) == (3, 10, 1)


def test_no_identifier_is_reused_after_a_deletion() -> None:
    with SessionLocal() as db:
        form_connection_id, branch_id = _create(
            db, [[_city_rule(1), _city_rule(2)]], next_rule_number=3
        )
    _save(form_connection_id, branch_id, [_city_rule(1)], rule_base=3, base_version=1)

    # An editor still numbering from 2 gets the next free number
    saved = _save(
        form_connection_id,
        branch_id,
        [_city_rule(1), _city_rule(2)],
        rule_base=2,
        base_version=2,
    )

    assert [item['id'] for item in saved] == ['rule-1', 'rule-3']
    assert _state(form_connection_id) == (3, 4, 1)


def test_an_unchanged_rule_set_creates_no_version() -> None:
    with SessionLocal() as db:
        form_connection_id, branch_id = _create(
            db, [[_city_rule(1)]], next_rule_number=2
        )

    _save(form_connection_id, branch_id, [_city_rule(1)], rule_base=2, base_version=1)

    assert _state(form_connection_id) == (1, 2, 1)
    with SessionLocal() as db:
        versions = db.scalars(
            select(FormConnectionRuleSet.version).where(
                FormConnectionRuleSet.form_connection_id == form_connection_id
            )
        ).all()
    assert versions == [1]


def test_a_new_form_connections_rules_are_numbered_from_1() -> None:
    payload = rules_input([main_branch([_city_rule(1), _city_rule(2)])])
    save = clean_rules(RulesInput.model_validate(payload), DOCUMENTS, None)
    check_first_save(save)

    with SessionLocal() as db:
        form_connection = FormConnection(
            id=str(uuid.uuid4()),
            name='Test',
            servicebw_form='FS-1',
            current_revision=1,
            current_rule_set=1,
            next_rule_number=1,
            next_group_number=1,
        )
        db.add(form_connection)
        db.flush()
        saved = first_rule_set(db, form_connection, save)
        db.commit()
        assert [item.id for item in saved[0].items] == ['rule-1', 'rule-2']
        assert (
            form_connection.next_rule_number,
            form_connection.next_group_number,
        ) == (
            3,
            1,
        )


def test_a_new_form_connection_has_no_saved_branch_to_name() -> None:
    payload = rules_input(
        [
            main_branch([]),
            main_branch([]) | {'id': str(uuid.uuid4()), 'origin': 'empty', 'name': 'X'},
        ]
    )
    save = clean_rules(RulesInput.model_validate(payload), DOCUMENTS, None)

    with pytest.raises(HTTPException) as caught:
        check_first_save(save)
    assert caught.value.detail == {
        'error': 'Validation error',
        'message': 'Unknown variant.',
    }
