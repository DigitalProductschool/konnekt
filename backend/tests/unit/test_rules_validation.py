"""Checking a save's branches and rules (FR-002 to FR-006, data-model.md "Validation").

Each refusal is a 400 whose message names the problem, the rule and its branch, in
the words of the rules step's own checks.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

import pytest
from fastapi import HTTPException

from app.db import SessionLocal
from app.models import FormConnection, FormConnectionBranch, FormConnectionRuleSet
from app.schemas import RequestedDocument, RulesInput
from app.services.rules import (
    RulesSave,
    check_first_save,
    check_save,
    clean_rules,
    save_rule_set,
)
from tests.helpers import (
    AGE_19_RULE,
    AGE_21_RULE,
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    HELD_3_YEARS_RULE,
    HELD_RULE,
    STUTTGART_RULE,
    group,
    main_branch,
    rule,
    rules_input,
    target,
    us2_items,
    variant,
)

DOCUMENTS = [
    RequestedDocument.model_validate(document)
    for document in FORM_CONNECTION['documents']
]
# Every kind of value, and an image
ALL_KINDS = [
    RequestedDocument(
        document_type='pid',
        fields=[
            'birthdate',
            'place_of_birth',
            'address_locality',
            'picture',
            'sex',
            'nationalities',
        ],
    ),
    RequestedDocument(
        document_type='mdl',
        fields=['expiry_date', 'driving_privileges', 'height'],
    ),
]
CITY = target('pid', 'address_locality')
HEIGHT = target('mdl', 'height')
EXPIRY = target('mdl', 'expiry_date')


def _rules(*items: dict[str, Any], **branch: Any) -> dict[str, Any]:
    return rules_input([main_branch(list(items)) | branch])


def _clean(
    payload: dict[str, Any],
    documents: list[RequestedDocument] = DOCUMENTS,
    main_branch_id: str | None = None,
) -> RulesSave:
    return clean_rules(RulesInput.model_validate(payload), documents, main_branch_id)


def _problem(
    payload: dict[str, Any],
    documents: list[RequestedDocument] = DOCUMENTS,
    main_branch_id: str | None = None,
) -> str:
    """The message of the 400 that refuses `payload`."""
    with pytest.raises(HTTPException) as caught:
        _clean(payload, documents, main_branch_id)
    assert caught.value.status_code == 400
    detail = caught.value.detail
    assert isinstance(detail, dict)
    assert detail['error'] == 'Validation error'
    message: str = detail['message']
    return message


def _rule_with(
    rule_target: dict[str, Any] | None,
    condition: dict[str, Any] | None,
    message: str = 'You must meet this.',
) -> dict[str, Any]:
    return _rules(rule(1, rule_target, condition, message))


# What a valid save keeps


def test_user_story_1s_rules_are_accepted_as_they_are() -> None:
    save = _clean(_rules(AGE_RULE, CLASS_RULE, HELD_RULE))

    assert [item.model_dump() for item in save.branches[0].items] == [
        AGE_RULE,
        CLASS_RULE,
        HELD_RULE,
    ]
    assert save.numbering_base.rule == 1
    assert save.base_version is None


def test_names_descriptions_and_messages_are_trimmed() -> None:
    save = _clean(
        _rules(
            rule(1, CITY, {'operator': 'equal_to', 'value': ' Stuttgart '}, ' Hi. '),
            name='  Taxi ',
            description='  For taxi drivers  ',
        )
    )

    branch = save.branches[0]
    assert (branch.name, branch.description) == ('Taxi', 'For taxi drivers')
    assert branch.items[0].message == 'Hi.'
    # The value is compared trimmed, but kept as entered
    assert branch.items[0].model_dump()['condition'] == {
        'operator': 'equal_to',
        'value': ' Stuttgart ',
        'match_case': False,
    }


def test_an_empty_description_is_none() -> None:
    save = _clean(_rules(description='   '))

    assert save.branches[0].description is None


def test_a_condition_keeps_only_its_operators_keys() -> None:
    save = _clean(
        _rule_with(
            target('pid', 'birthdate'),
            {
                'operator': 'at_least_years_ago',
                'years': 21.0,
                'value': 'left over',
                'values': ['DE'],
                'unit': 'months',
            },
        )
    )

    condition = save.branches[0].items[0].model_dump()['condition']
    assert condition == {'operator': 'at_least_years_ago', 'years': 21}


@pytest.mark.parametrize(
    ('rule_target', 'condition'),
    [
        (HEIGHT, {'operator': 'greater_than', 'value': 180}),
        (HEIGHT, {'operator': 'not_equal_to', 'value': -2.5}),
        (CITY, {'operator': 'contains', 'value': 'Stutt', 'match_case': True}),
        (target('pid', 'sex'), {'operator': 'includes_one_of', 'values': [1, 2]}),
        (
            target('pid', 'nationalities'),
            {'operator': 'includes_none_of', 'values': ['DE', 'AT']},
        ),
        (
            target('pid', 'place_of_birth', 'country'),
            {'operator': 'includes_one_of', 'values': ['DE']},
        ),
        (
            target('pid', 'place_of_birth', 'locality'),
            {'operator': 'not_contains', 'value': 'Berlin'},
        ),
        (EXPIRY, {'operator': 'before', 'date': '2020-01-01'}),
        (EXPIRY, {'operator': 'on', 'date': '2024-02-29'}),
        (EXPIRY, {'operator': 'exactly_years_ago', 'years': 3}),
        (EXPIRY, {'operator': 'at_least_from_now', 'amount': 6, 'unit': 'months'}),
        (EXPIRY, {'operator': 'less_than_from_now', 'amount': 1, 'unit': 'years'}),
        (
            target('mdl', 'driving_privileges', 'expiry_date', 'C1E'),
            {'operator': 'at_least_from_now', 'amount': 1, 'unit': 'years'},
        ),
    ],
)
def test_every_kind_takes_its_own_conditions(
    rule_target: dict[str, Any], condition: dict[str, Any]
) -> None:
    save = _clean(_rule_with(rule_target, condition), ALL_KINDS)

    kept = save.branches[0].items[0].model_dump()['condition']
    assert kept == condition | (
        {'match_case': condition.get('match_case', False)}
        if 'value' in condition and isinstance(condition['value'], str)
        else {}
    )


# Branches


def test_the_rules_need_exactly_one_main_branch_first() -> None:
    other = main_branch([]) | {'origin': 'empty', 'name': 'Ambulance'}
    message = 'The rules need exactly one main branch.'

    assert _problem(rules_input([])) == message
    assert _problem(rules_input([other])) == message
    assert _problem(rules_input([other, main_branch([])])) == message
    assert _problem(rules_input([main_branch([]), main_branch([])])) == message


def test_the_main_branch_keeps_its_id() -> None:
    message = 'The rules need exactly one main branch.'

    assert _problem(_rules(), main_branch_id='main-branch-id') == message
    assert _problem(_rules(id='another-id'), main_branch_id='main-branch-id') == (
        message
    )
    # Without a main branch id (on create), the main branch's id must be a UUID
    assert _problem(_rules(id='main-branch-id')) == 'Unknown variant.'
    assert _clean(_rules(id='main-branch-id'), main_branch_id='main-branch-id')


def test_a_connection_has_at_most_20_variants() -> None:
    variants = [
        main_branch([]) | {'origin': 'empty', 'name': f'Variant {number}'}
        for number in range(20)
    ]

    assert _clean(rules_input([main_branch([]), *variants[:19]]))
    assert _problem(rules_input([main_branch([]), *variants])) == (
        'A connection can have at most 20 variants.'
    )


@pytest.mark.parametrize(
    ('branch', 'message'),
    [
        ({'name': '   '}, 'Enter a name for every variant.'),
        ({'name': 'x' * 101}, 'A variant’s name can have at most 100 characters.'),
        (
            {'description': 'x' * 501},
            'The description of Standard can have at most 500 characters.',
        ),
    ],
)
def test_a_variant_needs_a_name_and_a_short_description(
    branch: dict[str, Any], message: str
) -> None:
    assert _problem(_rules(**branch)) == message
    assert _clean(_rules(name='x' * 100, description='x' * 500))


def test_two_variants_cant_share_a_name() -> None:
    ambulance = main_branch([]) | {'origin': 'empty', 'name': 'Ambulance'}

    assert _problem(
        rules_input([main_branch([]), ambulance, ambulance | {'name': ' AMBULANCE '}])
    ) == ('Two variants are called AMBULANCE. Give each variant its own name.')


def test_a_variant_has_at_most_200_rules_and_groups() -> None:
    rules_ = [
        rule(number, CITY, {'operator': 'contains', 'value': 'a'}, 'Hi.')
        for number in range(1, 202)
    ]

    assert _clean(_rules(*rules_[:200]))
    assert _problem(_rules(*rules_)) == (
        'Standard can have at most 200 rules and groups.'
    )


@pytest.mark.parametrize('item_id', ['rule-01', 'rule-0', 'rule-x', 'group-1', ''])
def test_identifiers_are_well_formed(item_id: str) -> None:
    assert _problem(_rules(AGE_RULE | {'id': item_id})) == (
        'The rules contain an invalid identifier. Reload the connection and try again.'
    )


def test_identifiers_are_unique_within_a_branch() -> None:
    assert _problem(_rules(AGE_RULE, CLASS_RULE | {'id': 'rule-1'})) == (
        'The rules contain an invalid identifier. Reload the connection and try again.'
    )


# Names


@pytest.mark.parametrize(
    ('name', 'message'),
    [
        ('  ', 'Enter a name for every rule in Standard.'),
        ('x' * 101, 'A rule in Standard has a name longer than 100 characters.'),
    ],
)
def test_a_rule_needs_a_name(name: str, message: str) -> None:
    assert _problem(_rules(AGE_RULE | {'name': name})) == message


def test_names_are_unique_ignoring_letter_case_and_outer_spaces() -> None:
    assert (
        _problem(
            _rules(
                AGE_RULE | {'name': 'Lives in Stuttgart'},
                CLASS_RULE | {'name': ' LIVES IN STUTTGART '},
            )
        )
        == 'There’s already a rule called "Lives in Stuttgart" in Standard.'
    )


@pytest.mark.parametrize(
    ('name', 'message'),
    [
        ('Rule 8', 'Rule 8 is kept for the rule numbered 08.'),
        ('Rule 08', 'Rule 08 is kept for the rule numbered 08.'),
        (' rule 008 ', 'rule 008 is kept for the rule numbered 08.'),
        ('Group 02', 'Group 02 is kept for the group numbered 02.'),
        ('Sub-group 2', 'Sub-group 2 is kept for the sub-group numbered 02.'),
    ],
)
def test_default_names_are_kept_for_their_number(name: str, message: str) -> None:
    assert _problem(_rules(AGE_RULE | {'name': name})) == message


@pytest.mark.parametrize('name', ['Rule 8', 'rule 08', 'Rule 008', 'Rule 8b'])
def test_a_rule_may_take_the_default_name_of_its_own_number(name: str) -> None:
    assert _clean(_rules(AGE_RULE | {'id': 'rule-8', 'name': name}))


def test_the_message_names_the_branch_by_its_name() -> None:
    assert _problem(_rules(AGE_RULE | {'message': ''}, name=' Taxi ')) == (
        'Rule 01 in Taxi has no error message.'
    )


# What a rule checks


def test_a_rule_needs_its_data() -> None:
    assert _problem(_rule_with(None, {'operator': 'on', 'date': '2020-01-01'})) == (
        'Rule 01 in Standard: choose the data to check.'
    )


@pytest.mark.parametrize(
    'rule_target',
    [
        target('pid', 'nationalities'),
        target('pid', 'no_such_field'),
        target('passport', 'birthdate'),
        target('mdl', 'birth_date'),
    ],
)
def test_a_rule_checks_requested_data_only(rule_target: dict[str, Any]) -> None:
    assert _problem(
        _rule_with(rule_target, {'operator': 'on', 'date': '2020-01-01'})
    ) == ('Rule 01 in Standard checks data that’s no longer requested.')


def test_an_image_cant_be_checked() -> None:
    assert _problem(
        _rule_with(target('pid', 'picture'), {'operator': 'on', 'date': '2020-01-01'}),
        ALL_KINDS,
    ) == ('Rule 01 in Standard checks data that’s no longer requested.')


@pytest.mark.parametrize(
    ('rule_target', 'label'),
    [
        (target('pid', 'birthdate', 'country'), 'Date of birth'),
        (target('pid', 'birthdate', None, 'B'), 'Date of birth'),
        (target('mdl', 'driving_privileges', 'country'), 'Licence classes'),
        (target('mdl', 'driving_privileges', 'classes', 'B'), 'Licence classes'),
        (target('mdl', 'driving_privileges', 'issue_date', 'Z'), 'Licence classes'),
        (target('pid', 'place_of_birth', 'locality', 'B'), 'Place of birth'),
    ],
)
def test_a_rules_part_and_class_fit_its_field(
    rule_target: dict[str, Any], label: str
) -> None:
    assert _problem(
        _rule_with(rule_target, {'operator': 'on', 'date': '2020-01-01'}), ALL_KINDS
    ) == (f'Rule 01 in Standard checks a part that {label} doesn’t have.')


@pytest.mark.parametrize(
    'rule_target',
    [
        target('mdl', 'driving_privileges'),
        target('mdl', 'driving_privileges', 'issue_date'),
        target('pid', 'place_of_birth'),
    ],
)
def test_a_field_made_of_parts_needs_its_part(rule_target: dict[str, Any]) -> None:
    assert _problem(
        _rule_with(rule_target, {'operator': 'on', 'date': '2020-01-01'}), ALL_KINDS
    ) == ('Rule 01 in Standard: choose the data to check.')


# Conditions


@pytest.mark.parametrize(
    ('rule_target', 'condition'),
    [
        (target('pid', 'birthdate'), None),
        (target('pid', 'birthdate'), {'operator': 'includes_one_of', 'values': ['B']}),
        (target('pid', 'birthdate'), {'operator': 'between', 'years': 2}),
        (CITY, {'operator': 'greater_than', 'value': 'Stuttgart'}),
        (CITY, {'operator': 'starts_with', 'value': 'Stutt'}),
        (target('mdl', 'driving_privileges', 'classes'), {'operator': 'equal_to'}),
    ],
)
def test_a_rule_needs_a_check_of_its_datas_kind(
    rule_target: dict[str, Any], condition: dict[str, Any] | None
) -> None:
    assert _problem(_rule_with(rule_target, condition)) == (
        'Rule 01 in Standard: choose a check.'
    )


@pytest.mark.parametrize(
    'condition',
    [
        {'operator': 'greater_than'},
        {'operator': 'greater_than', 'value': '180'},
        {'operator': 'less_than', 'value': float('nan')},
        {'operator': 'less_than', 'value': float('inf')},
    ],
)
def test_a_number_condition_needs_a_number(condition: dict[str, Any]) -> None:
    assert _problem(_rule_with(HEIGHT, condition), ALL_KINDS) == (
        'Rule 01 in Standard: enter a number.'
    )


@pytest.mark.parametrize('value', [None, '', '   ', 7])
def test_a_text_condition_needs_a_text(value: object) -> None:
    assert _problem(_rule_with(CITY, {'operator': 'equal_to', 'value': value})) == (
        'Rule 01 in Standard: enter a text to compare with.'
    )


@pytest.mark.parametrize(
    ('rule_target', 'values', 'message'),
    [
        (CLASS_RULE['target'], None, 'choose at least one value.'),
        (CLASS_RULE['target'], [], 'choose at least one value.'),
        (CLASS_RULE['target'], ['XL'], 'choose values from the list.'),
        (CLASS_RULE['target'], ['b'], 'choose values from the list.'),
        (CLASS_RULE['target'], ['B', 'BE', 'B'], 'choose each value only once.'),
        (target('pid', 'sex'), ['1'], 'choose values from the list.'),
        (target('pid', 'sex'), [7], 'choose values from the list.'),
        (target('pid', 'nationalities'), [276], 'choose values from the list.'),
    ],
)
def test_an_enum_condition_needs_values_of_its_set_once_each(
    rule_target: dict[str, Any], values: list[Any] | None, message: str
) -> None:
    condition: dict[str, Any] = {'operator': 'includes_one_of', 'values': values}
    assert _problem(_rule_with(rule_target, condition), ALL_KINDS) == (
        f'Rule 01 in Standard: {message}'
    )


@pytest.mark.parametrize('day', [None, '2020-02-30', '2020-1-1', '01.01.2020', ''])
def test_a_date_condition_needs_a_date(day: str | None) -> None:
    assert _problem(_rule_with(EXPIRY, {'operator': 'after', 'date': day})) == (
        'Rule 01 in Standard: enter a date.'
    )


@pytest.mark.parametrize('years', [None, 0, -1, 1.5])
def test_years_are_a_whole_number_of_at_least_1(years: float | None) -> None:
    assert _problem(
        _rule_with(EXPIRY, {'operator': 'less_than_years_ago', 'years': years})
    ) == ('Rule 01 in Standard: enter a number of years of at least 1.')


@pytest.mark.parametrize(
    ('unit', 'amount', 'message'),
    [
        (None, 6, 'choose years or months.'),
        ('months', 0, 'enter a number of months of at least 1.'),
        ('years', 2.5, 'enter a number of years of at least 1.'),
        ('months', None, 'enter a number of months of at least 1.'),
    ],
)
def test_from_now_needs_a_unit_and_a_whole_number(
    unit: str | None, amount: float | None, message: str
) -> None:
    condition = {'operator': 'at_least_from_now', 'amount': amount, 'unit': unit}
    assert _problem(_rule_with(EXPIRY, condition)) == f'Rule 01 in Standard: {message}'


# Messages


@pytest.mark.parametrize(
    ('message', 'problem'),
    [
        ('', 'Rule 01 in Standard has no error message.'),
        ('   ', 'Rule 01 in Standard has no error message.'),
        (
            'x' * 501,
            'The error message of Rule 01 in Standard can have at most 500 characters.',
        ),
    ],
)
def test_every_rule_has_a_short_error_message(message: str, problem: str) -> None:
    assert _problem(_rules(AGE_RULE | {'message': message})) == problem
    assert _clean(_rules(AGE_RULE | {'message': 'x' * 500}))


def test_the_first_problem_is_the_one_reported() -> None:
    assert (
        _problem(
            _rules(
                AGE_RULE,
                CLASS_RULE | {'message': ''},
                HELD_RULE | {'condition': None},
            )
        )
        == 'Rule 02 in Standard has no error message.'
    )
    # Within a rule, its name comes first, then what it checks
    assert (
        _problem(_rules(AGE_RULE | {'name': 'Rule 05', 'target': None, 'message': ''}))
        == 'Rule 05 is kept for the rule numbered 05.'
    )


# Groups and sub-groups (FR-004, FR-005, FR-008)

GROUP_MESSAGE = 'You must be at least 21, or 19 with class B for 3 years.'


def _us2_with(**changes: Any) -> dict[str, Any]:
    """User story 2's rules, with these changes to the group."""
    stuttgart, us2_group = us2_items()
    return _rules(stuttgart, us2_group | changes)


def test_user_story_2s_group_and_sub_group_are_accepted_as_they_are() -> None:
    save = _clean(_rules(*us2_items(sub_group_message=GROUP_MESSAGE)))

    assert [item.model_dump() for item in save.branches[0].items] == us2_items(
        sub_group_message=GROUP_MESSAGE
    )


def test_a_groups_message_is_trimmed_and_an_empty_one_is_none() -> None:
    trimmed = _clean(_us2_with(message=f'  {GROUP_MESSAGE} '))
    empty = _clean(_us2_with(message='   '))

    assert trimmed.branches[0].items[1].model_dump()['message'] == GROUP_MESSAGE
    assert empty.branches[0].items[1].model_dump()['message'] is None


def test_a_groups_message_has_at_most_500_characters() -> None:
    assert _clean(_us2_with(message='x' * 500))
    assert _problem(_us2_with(message='x' * 501)) == (
        'The error message of Group 01 in Standard can have at most 500 characters.'
    )


@pytest.mark.parametrize(
    ('items', 'message'),
    [
        (
            [group(1, [AGE_21_RULE])],
            'Group 01 in Standard needs at least two rules.',
        ),
        ([group(1, [])], 'Group 01 in Standard needs at least two rules.'),
        (
            [group(1, [AGE_21_RULE, group(2, [AGE_19_RULE], name='Sub-group 02')])],
            'Sub-group 02 in Standard needs at least two rules.',
        ),
    ],
)
def test_a_group_or_sub_group_needs_at_least_two_members(
    items: list[dict[str, Any]], message: str
) -> None:
    assert _problem(_rules(*items)) == message


def test_a_group_of_a_rule_and_a_sub_group_has_two_members() -> None:
    sub_group = group(2, [AGE_19_RULE, HELD_3_YEARS_RULE], name='Sub-group 02')

    assert _clean(_rules(group(1, [AGE_21_RULE, sub_group])))


def test_a_sub_group_can_only_hold_rules() -> None:
    inner = group(3, [AGE_19_RULE, HELD_3_YEARS_RULE])
    sub_group = group(2, [STUTTGART_RULE, inner], name='Sub-group 02')

    assert _problem(_rules(group(1, [AGE_21_RULE, sub_group]))) == (
        'Sub-group 02 in Standard can only hold rules.'
    )


def test_members_a_based_branch_removed_dont_count() -> None:
    # Ambulance grouped two inherited rules in a group of its own, then removed one
    ambulance = main_branch(
        [
            group(1, [AGE_RULE, CLASS_RULE | {'mark': 'removed'}]) | {'mark': 'added'},
            HELD_RULE,
        ],
        name='Ambulance',
    ) | {'origin': 'based'}
    payload = rules_input([main_branch([AGE_RULE, CLASS_RULE, HELD_RULE]), ambulance])

    assert _problem(payload) == 'Group 01 in Ambulance needs at least two rules.'


@pytest.mark.parametrize(
    ('name', 'message'),
    [
        ('  ', 'Enter a name for every group in Standard.'),
        ('x' * 101, 'A group in Standard has a name longer than 100 characters.'),
        (' rule 01 ', 'There’s already a rule called "Rule 01" in Standard.'),
        ('Group 03', 'Group 03 is kept for the group numbered 03.'),
        ('Sub-group 3', 'Sub-group 3 is kept for the sub-group numbered 03.'),
        ('Rule 05', 'Rule 05 is kept for the rule numbered 05.'),
    ],
)
def test_a_groups_name_follows_the_rules_for_names(name: str, message: str) -> None:
    assert _problem(_us2_with(name=name)) == message


def test_a_sub_groups_name_is_checked_against_the_groups() -> None:
    stuttgart, us2_group = us2_items()
    us2_group['items'][1] |= {'name': ' GROUP 01'}

    assert _problem(_rules(stuttgart, us2_group)) == (
        'There’s already a group called "Group 01" in Standard.'
    )
    us2_group['items'][1] |= {'name': ''}
    assert _problem(_rules(stuttgart, us2_group)) == (
        'Enter a name for every sub-group in Standard.'
    )


@pytest.mark.parametrize('name', ['Group 1', 'group 01', 'Sub-group 01', 'Taxi'])
def test_a_group_may_take_the_default_names_of_its_own_number(name: str) -> None:
    assert _clean(_us2_with(name=name))


@pytest.mark.parametrize('group_id', ['group-01', 'group-0', 'rule-5', 'group-2'])
def test_group_identifiers_are_well_formed_and_unique(group_id: str) -> None:
    # group-2 is the sub-group's
    assert _problem(_us2_with(id=group_id)) == (
        'The rules contain an invalid identifier. Reload the connection and try again.'
    )


def test_a_group_and_a_rule_may_share_a_number() -> None:
    assert _clean(_rules(group(1, [AGE_RULE, CLASS_RULE])))


def test_group_members_count_towards_the_size_limit() -> None:
    members = [
        rule(number, CITY, {'operator': 'contains', 'value': 'a'}, 'Hi.')
        for number in range(1, 201)
    ]

    assert _clean(_rules(group(1, members[:199])))
    assert _problem(_rules(group(1, members))) == (
        'Standard can have at most 200 rules and groups.'
    )


def test_a_groups_problems_come_before_its_members() -> None:
    incomplete = AGE_21_RULE | {'message': ''}

    assert _problem(_rules(group(1, [incomplete]))) == (
        'Group 01 in Standard needs at least two rules.'
    )
    assert _problem(_rules(group(1, [incomplete, AGE_19_RULE], name='Rule 09'))) == (
        'Rule 09 is kept for the rule numbered 09.'
    )
    assert _problem(_rules(group(1, [incomplete, AGE_19_RULE]))) == (
        'Rule 02 in Standard has no error message.'
    )


# Variants based on Standard, and their marks (FR-005, FR-006, FR-019 to FR-024;
# research R4; data-model.md "Marks in a based branch" and "Validation")

OUT_OF_STEP = (
    'The variant Ambulance is out of step with Standard. Reload the connection and '
    'try again.'
)
INVALID_IDENTIFIER = (
    'The rules contain an invalid identifier. Reload the connection and try again.'
)
UNKNOWN_VARIANT = 'Unknown variant.'
US1_ITEMS = [AGE_RULE, CLASS_RULE, HELD_RULE]


def _with_ambulance(
    main_items: list[dict[str, Any]],
    ambulance_items: list[dict[str, Any]],
    **ambulance: Any,
) -> dict[str, Any]:
    """Standard with `main_items`, and Ambulance, based on it, with its own."""
    return rules_input([main_branch(main_items), variant(ambulance_items, **ambulance)])


def _marked(item: dict[str, Any], mark: str | None) -> dict[str, Any]:
    return item | {'mark': mark}


def _edited(
    items: list[dict[str, Any]], item_id: str, **changes: Any
) -> list[dict[str, Any]]:
    """A copy of `items` in which the rule or group `item_id` has these changes."""
    edited: list[dict[str, Any]] = []
    for item in items:
        if item['id'] == item_id:
            item = item | changes
        if item['type'] == 'group':
            item = item | {'items': _edited(item['items'], item_id, **changes)}
        edited.append(item)
    return edited


def test_a_based_variant_that_follows_standard_is_accepted() -> None:
    save = _clean(_with_ambulance(us2_items(), us2_items()))

    assert [item.model_dump() for item in save.branches[1].items] == us2_items()


@pytest.mark.parametrize('mark', ['changed', 'removed', 'added'])
def test_marks_appear_only_in_based_variants(mark: str) -> None:
    marked = [_marked(AGE_RULE, mark), CLASS_RULE]
    taxi = 'The variant Taxi is out of step with Standard. Reload the connection and '

    assert _problem(_rules(*marked)) == (
        'The variant Standard is out of step. Reload the connection and try again.'
    )
    assert _problem(
        rules_input(
            [main_branch(US1_ITEMS), variant(marked, name='Taxi', origin='empty')]
        )
    ) == (taxi + 'try again.')


def test_a_switched_and_or_appears_only_in_based_variants() -> None:
    taxi = variant([], name='Taxi', origin='empty', operator_mark='changed')

    assert _problem(_rules(operator_mark='changed')) == (
        'The variant Standard is out of step. Reload the connection and try again.'
    )
    assert _problem(rules_input([main_branch([]), taxi])).startswith(
        'The variant Taxi is out of step with Standard.'
    )


@pytest.mark.parametrize(
    ('main_items', 'ambulance_items'),
    [
        # A top-level rule
        (US1_ITEMS, [AGE_RULE, CLASS_RULE]),
        # A group's member
        (us2_items(), [STUTTGART_RULE, group(1, [AGE_21_RULE], operator='or')]),
        # A group with its members
        (us2_items(), [STUTTGART_RULE]),
        # Everything
        (us2_items(), []),
    ],
)
def test_every_item_of_standard_appears_in_a_basedvariant(
    main_items: list[dict[str, Any]], ambulance_items: list[dict[str, Any]]
) -> None:
    assert _problem(_with_ambulance(main_items, ambulance_items)) == OUT_OF_STEP


def test_an_item_of_standard_appears_once_in_a_basedvariant() -> None:
    twice = [AGE_RULE, CLASS_RULE, HELD_RULE, AGE_RULE]
    in_own_group = [
        AGE_RULE,
        _marked(group(4, [CLASS_RULE, AGE_RULE]), 'added'),
        HELD_RULE,
    ]

    assert _problem(_with_ambulance(US1_ITEMS, twice)) == INVALID_IDENTIFIER
    assert _problem(_with_ambulance(US1_ITEMS, in_own_group)) == INVALID_IDENTIFIER


@pytest.mark.parametrize(
    ('item', 'accepted'),
    [
        # An item of Standard follows it, or is changed or removed; never added
        (_marked(HELD_RULE, 'added'), False),
        (_marked(HELD_RULE, None), True),
        (_marked(HELD_RULE, 'changed'), True),
        (_marked(HELD_RULE, 'removed'), True),
    ],
)
def test_an_item_of_standard_isnt_marked_added(
    item: dict[str, Any], accepted: bool
) -> None:
    payload = _with_ambulance(US1_ITEMS, [AGE_RULE, CLASS_RULE, item])

    if accepted:
        assert _clean(payload)
    else:
        assert _problem(payload) == OUT_OF_STEP


@pytest.mark.parametrize('mark', [None, 'changed', 'removed'])
def test_an_item_of_the_variants_own_is_marked_added(mark: str | None) -> None:
    own = rule(9, CITY, {'operator': 'contains', 'value': 'a'}, 'Hi.')
    payload = _with_ambulance(US1_ITEMS, [*US1_ITEMS, _marked(own, mark)])

    assert _problem(payload) == OUT_OF_STEP
    assert _clean(_with_ambulance(US1_ITEMS, [*US1_ITEMS, _marked(own, 'added')]))


@pytest.mark.parametrize(
    ('item_id', 'change'),
    [
        # A rule: its name, what it checks, its condition and its message
        ('rule-1', {'name': 'Lives there'}),
        ('rule-1', {'target': target('pid', 'family_name')}),
        ('rule-1', {'condition': {'operator': 'equal_to', 'value': 'Esslingen'}}),
        ('rule-1', {'condition': {'operator': 'contains', 'value': 'Stuttgart'}}),
        (
            'rule-1',
            {
                'condition': {
                    'operator': 'equal_to',
                    'value': 'Stuttgart',
                    'match_case': True,
                }
            },
        ),
        ('rule-1', {'message': 'Live in Stuttgart.'}),
        # A rule in a group
        ('rule-2', {'condition': {'operator': 'at_least_years_ago', 'years': 22}}),
        # A group: its AND/OR, name and message
        ('group-1', {'operator': 'and'}),
        ('group-1', {'name': 'Adults'}),
        ('group-1', {'message': 'You must be an adult.'}),
        ('group-2', {'operator': 'or'}),
    ],
)
@pytest.mark.parametrize('mark', [None, 'removed'])
def test_an_unmarked_or_removed_item_equals_standards(
    item_id: str, change: dict[str, Any], mark: str | None
) -> None:
    ambulance = _edited(us2_items(), item_id, mark=mark, **change)

    assert _problem(_with_ambulance(us2_items(), ambulance)) == OUT_OF_STEP
    # Changed in Ambulance, the item has its own content
    changed = _edited(us2_items(), item_id, mark='changed', **change)
    assert _clean(_with_ambulance(us2_items(), changed))


def test_items_are_compared_as_they_are_saved() -> None:
    # Outer spaces are trimmed, and a condition keeps only its operator's keys
    ambulance = _edited(
        us2_items(),
        'rule-1',
        name=' Rule 01 ',
        message=' You must live in Stuttgart. ',
        condition={'operator': 'equal_to', 'value': 'Stuttgart', 'years': 3},
    )

    assert _clean(_with_ambulance(us2_items(), ambulance))


def test_a_changed_item_may_equal_standards() -> None:
    ambulance = _edited(
        _edited(us2_items(), 'rule-1', mark='changed'), 'group-1', mark='changed'
    )

    assert _clean(_with_ambulance(us2_items(), ambulance))


@pytest.mark.parametrize(
    ('operator', 'operator_mark', 'accepted'),
    [
        ('or', None, False),
        ('or', 'changed', True),
        # Switched back in Ambulance, without undo: it stays its own
        ('and', 'changed', True),
        ('and', None, True),
    ],
)
def test_a_based_variants_top_level_follows_standards_until_switched(
    operator: str, operator_mark: str | None, accepted: bool
) -> None:
    payload = _with_ambulance(
        US1_ITEMS, US1_ITEMS, operator=operator, operator_mark=operator_mark
    )

    if accepted:
        assert _clean(payload)
    else:
        assert _problem(payload) == OUT_OF_STEP


def test_a_rule_added_to_an_inherited_group_leaves_the_group_as_it_is() -> None:
    added = _marked(
        rule(5, CITY, {'operator': 'contains', 'value': 'gart'}, 'Hi.'), 'added'
    )
    stuttgart, us2_group = us2_items()
    ambulance = [stuttgart, us2_group | {'items': [*us2_group['items'], added]}]

    assert _clean(_with_ambulance(us2_items(), ambulance))


def test_inherited_rules_grouped_in_the_variant_stay_as_they_are() -> None:
    # Ambulance put two of Standard's rules into a group of its own
    own_group = _marked(group(1, [AGE_RULE, CLASS_RULE], operator='or'), 'added')

    assert _clean(_with_ambulance(US1_ITEMS, [own_group, HELD_RULE]))


@pytest.mark.parametrize(
    'removed_ids',
    [
        # Only the sub-group is left: the group is dissolved in Ambulance
        ['rule-2'],
        # Nothing is left of the group
        ['rule-2', 'group-2'],
        ['rule-2', 'rule-3', 'rule-4'],
        # The sub-group is dissolved
        ['rule-3'],
    ],
)
def test_an_inherited_group_may_be_dissolved_in_a_basedvariant(
    removed_ids: list[str],
) -> None:
    ambulance = us2_items()
    for item_id in removed_ids:
        ambulance = _edited(ambulance, item_id, mark='removed')

    assert _clean(_with_ambulance(us2_items(), ambulance))


def test_a_group_of_the_variants_own_needs_two_members_that_count() -> None:
    # The inherited sub-group in it is dissolved, with nothing left
    stuttgart, us2_group = us2_items()
    [gone] = _edited(
        _edited([us2_group['items'][1]], 'rule-3', mark='removed'),
        'rule-4',
        mark='removed',
    )
    own = _marked(group(5, [stuttgart, gone]), 'added')
    ambulance = [own, us2_group | {'items': [AGE_21_RULE]}]

    assert _problem(_with_ambulance(us2_items(), ambulance)) == (
        'Group 05 in Ambulance needs at least two rules.'
    )


def _born_before_2000(name: str) -> dict[str, Any]:
    birthdate = target('pid', 'birthdate')
    return rule(
        9, birthdate, {'operator': 'before', 'date': '2000-01-01'}, 'Hi.', name=name
    )


def test_the_names_of_removed_items_are_taken() -> None:
    age = AGE_RULE | {'name': 'Age'}
    own = _marked(_born_before_2000(name=' AGE '), 'added')

    assert (
        _problem(
            _with_ambulance(
                [age, CLASS_RULE], [_marked(age, 'removed'), CLASS_RULE, own]
            )
        )
        == 'There’s already a rule called "Age" in Ambulance.'
    )


def test_standards_names_of_changed_items_are_taken() -> None:
    age = AGE_RULE | {'name': 'Age'}
    changed = _marked(age | {'name': 'Age 19'}, 'changed')
    own = _marked(_born_before_2000(name='age'), 'added')

    # An undo would bring "Age" back, wherever the other rule is
    assert (
        _problem(_with_ambulance([age, CLASS_RULE], [own, changed, CLASS_RULE]))
        == 'There’s already a rule called "Age" in Ambulance.'
    )
    # The changed rule itself may keep the name
    years_19 = {'operator': 'at_least_years_ago', 'years': 19}
    kept = _marked(age | {'condition': years_19}, 'changed')
    assert _clean(_with_ambulance([age, CLASS_RULE], [kept, CLASS_RULE]))


def test_standards_name_of_a_changed_group_is_taken_as_a_groups() -> None:
    main = _edited(us2_items(), 'group-1', name='Adults')
    ambulance = [
        *_edited(main, 'group-1', name='Grown-ups', mark='changed'),
        _marked(
            rule(9, CITY, {'operator': 'contains', 'value': 'a'}, 'Hi.', name='adults'),
            'added',
        ),
    ]

    assert _problem(_with_ambulance(main, ambulance)) == (
        'There’s already a group called "Adults" in Ambulance.'
    )


@pytest.mark.parametrize('mark', [None, 'removed'])
def test_a_problem_in_an_inherited_item_is_reported_for_standard(
    mark: str | None,
) -> None:
    incomplete = AGE_RULE | {'message': ''}

    assert (
        _problem(
            _with_ambulance(
                [incomplete, CLASS_RULE], [_marked(incomplete, mark), CLASS_RULE]
            )
        )
        == 'Rule 01 in Standard has no error message.'
    )
    # Standard's rule checks data that's no longer requested, in both variants
    unrequested = AGE_RULE | {'target': target('pid', 'nationalities')}
    assert (
        _problem(_with_ambulance([unrequested], [_marked(unrequested, mark)]))
        == 'Rule 01 in Standard checks data that’s no longer requested.'
    )


def test_a_problem_in_a_variants_own_item_is_reported_for_thevariant() -> None:
    incomplete = AGE_RULE | {'message': ''}

    assert (
        _problem(
            _with_ambulance(
                US1_ITEMS, [_marked(incomplete, 'changed'), CLASS_RULE, HELD_RULE]
            )
        )
        == 'Rule 01 in Ambulance has no error message.'
    )
    # A removed item is checked like the others
    assert (
        _problem(
            _with_ambulance(
                US1_ITEMS, [_marked(incomplete, 'removed'), CLASS_RULE, HELD_RULE]
            )
        )
        == 'Rule 01 in Ambulance has no error message.'
    )


def test_a_connection_has_at_most_20_based_variants() -> None:
    variants = [variant(US1_ITEMS, name=f'Variant {number}') for number in range(20)]

    assert _clean(rules_input([main_branch(US1_ITEMS), *variants[:19]]))
    assert _problem(rules_input([main_branch(US1_ITEMS), *variants])) == (
        'A connection can have at most 20 variants.'
    )


# A saved variant's id and origin, checked against the stored branches


def _stored_connection() -> dict[str, str]:
    """A form connection with Standard, Ambulance (based), Taxi (empty) and a
    deleted variant, beside another form connection; their ids by name."""
    ids = {
        key: str(uuid.uuid4())
        for key in (
            'connection',
            'Standard',
            'Ambulance',
            'Taxi',
            'Deleted',
            'other',
            'other main',
        )
    }
    with SessionLocal() as db:
        for connection_id in (ids['connection'], ids['other']):
            db.add(
                FormConnection(
                    id=connection_id,
                    name='Test',
                    description='FS-1',
                    published_at=datetime.now(tz=timezone.utc),
                    current_revision=1,
                    current_rule_set=1,
                    next_rule_number=1,
                    next_group_number=1,
                )
            )
        db.flush()
        db.add_all(
            [
                FormConnectionBranch(
                    id=ids['Standard'],
                    form_connection_id=ids['connection'],
                    is_main=True,
                ),
                FormConnectionBranch(
                    id=ids['Ambulance'],
                    form_connection_id=ids['connection'],
                    is_main=False,
                ),
                FormConnectionBranch(
                    id=ids['Taxi'], form_connection_id=ids['connection'], is_main=False
                ),
                FormConnectionBranch(
                    id=ids['Deleted'],
                    form_connection_id=ids['connection'],
                    is_main=False,
                    deleted_at=datetime.now(tz=timezone.utc),
                ),
                FormConnectionBranch(
                    id=ids['other main'],
                    form_connection_id=ids['other'],
                    is_main=True,
                ),
            ]
        )
        db.add(
            FormConnectionRuleSet(
                form_connection_id=ids['connection'],
                version=1,
                branches=_stored_branches(ids),
            )
        )
        db.commit()
    return ids


def _stored_branches(ids: dict[str, str], **origins: str) -> list[dict[str, Any]]:
    """Standard, Ambulance and Taxi without rules, as saved or as an edit sends
    them; `origins` changes theirs."""
    return [
        main_branch([], branch_id=ids['Standard']),
        variant(
            [],
            branch_id=ids['Ambulance'],
            origin=origins.get('Ambulance', 'based'),
        ),
        variant(
            [], name='Taxi', branch_id=ids['Taxi'], origin=origins.get('Taxi', 'empty')
        ),
    ]


def _save_problem(ids: dict[str, str], branches: list[dict[str, Any]]) -> str | None:
    """The message that refuses saving `branches`, or None if they pass."""
    payload = RulesInput.model_validate(rules_input(branches, base_version=1))
    with SessionLocal() as db:
        form_connection = db.get_one(FormConnection, ids['connection'])
        try:
            check_save(
                db, form_connection, clean_rules(payload, DOCUMENTS, ids['Standard'])
            )
        except HTTPException as error:
            assert error.status_code == 400
            assert isinstance(error.detail, dict)
            message: str = error.detail['message']
            return message
    return None


def test_saved_variants_and_new_ones_pass() -> None:
    ids = _stored_connection()
    new = variant([], name='School transport', origin='empty')

    assert _save_problem(ids, [*_stored_branches(ids), new]) is None
    # Leaving out a variant deletes it
    assert _save_problem(ids, _stored_branches(ids)[:1]) is None


@pytest.mark.parametrize('stored', ['Deleted', 'other', 'not a UUID'])
def test_a_saved_variant_is_a_live_variant_of_this_connection(stored: str) -> None:
    ids = _stored_connection()
    branch_id = {
        'Deleted': ids['Deleted'],
        'other': ids['other main'],
        'not a UUID': 'variant-4',
    }[stored]
    stranger = variant([], name='Stranger', origin='empty', branch_id=branch_id)

    assert _save_problem(ids, [*_stored_branches(ids), stranger]) == UNKNOWN_VARIANT


def test_an_unused_uuid_is_a_new_variant() -> None:
    """Spec 007, research R10: the editor may choose a new variant's id."""
    ids = _stored_connection()
    fresh = str(uuid.uuid4())
    branches = [
        *_stored_branches(ids),
        variant([], name='School transport', origin='empty', branch_id=fresh),
    ]

    assert _save_problem(ids, branches) is None
    payload = RulesInput.model_validate(rules_input(branches, base_version=1))
    with SessionLocal() as db:
        form_connection = db.get_one(FormConnection, ids['connection'])
        saved = save_rule_set(
            db, form_connection, clean_rules(payload, DOCUMENTS, ids['Standard'])
        )
        db.commit()
        row = db.get_one(FormConnectionBranch, fresh)
        assert (row.form_connection_id, row.is_main, row.deleted_at) == (
            ids['connection'],
            False,
            None,
        )
    assert [branch.id for branch in saved][-1] == fresh


def test_a_variant_is_saved_once() -> None:
    ids = _stored_connection()
    again = variant([], name='Ambulance 2', branch_id=ids['Ambulance'])

    assert _save_problem(ids, [*_stored_branches(ids), again]) == UNKNOWN_VARIANT
    # Not even as Standard's id
    standard = variant([], name='Standard 2', branch_id=ids['Standard'])
    assert _save_problem(ids, [*_stored_branches(ids), standard]) == UNKNOWN_VARIANT


@pytest.mark.parametrize(
    ('origins', 'variant'),
    [({'Ambulance': 'empty'}, 'Ambulance'), ({'Taxi': 'based'}, 'Taxi')],
)
def test_a_saved_variant_keeps_its_origin(
    origins: dict[str, str], variant: str
) -> None:
    ids = _stored_connection()

    assert _save_problem(ids, _stored_branches(ids, **origins)) == (
        f'The variant {variant} is out of step with Standard. Reload the connection '
        'and try again.'
    )


def test_a_new_connections_variants_keep_the_uuids_they_were_given() -> None:
    """Spec 007, research R10: whether a UUID is free is `first_rule_set`'s check."""
    ambulance_id = str(uuid.uuid4())
    save = _clean(rules_input([main_branch([]), variant([], branch_id=ambulance_id)]))

    check_first_save(save)
    assert save.branches[1].id == ambulance_id
    assert (
        _problem(rules_input([main_branch([]), variant([], branch_id='variant-2')]))
        == UNKNOWN_VARIANT
    )
