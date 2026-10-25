"""Checking a save's branches and rules (FR-002 to FR-006, data-model.md "Validation").

Each refusal is a 400 whose message names the problem, the rule and its branch, in
the words of the rules step's own checks.
"""

from typing import Any

import pytest
from fastapi import HTTPException

from app.schemas import RequestedDocument, RulesInput
from app.services.rules import RulesSave, clean_rules
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    HELD_RULE,
    main_branch,
    rule,
    rules_input,
    target,
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
    assert _problem(_rules(id='main-branch-id')) == message
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
        == 'Another rule in Standard is already called Lives in Stuttgart.'
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
