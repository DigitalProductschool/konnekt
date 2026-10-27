"""The evaluator: each condition, the parts, the levels and groups (research R7)."""

from datetime import date
from typing import Any

import pytest

from app.schemas import DeliveredDocument, DeliveredField, Evaluation, SnapshotBranch
from app.services.evaluation import evaluate_branch

SHARED_ON = date(2026, 10, 23)
MAIN_BRANCH_ID = '6f1c2a3b-0d4e-4f5a-8b6c-7d8e9f0a1b2c'


def _rule(
    number: int,
    document_type: str,
    field: str,
    condition: dict[str, Any] | None,
    *,
    part: str | None = None,
    licence_class: str | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    return {
        'type': 'rule',
        'id': f'rule-{number}',
        'name': f'Rule {number:02d}',
        'mark': None,
        'target': {
            'document_type': document_type,
            'field': field,
            'part': part,
            'licence_class': licence_class,
        },
        'condition': condition,
        'message': message or f'Message of rule {number}.',
    }


def _branch(*items: dict[str, Any], operator: str = 'and') -> SnapshotBranch:
    return SnapshotBranch.model_validate(
        {
            'id': MAIN_BRANCH_ID,
            'name': 'Standard',
            'description': None,
            'origin': 'main',
            'operator': operator,
            'operator_mark': None,
            'items': list(items),
        }
    )


def _documents(**by_type: dict[str, object]) -> list[DeliveredDocument]:
    return [
        DeliveredDocument(
            document_type=document_type,
            label=document_type,
            fields=[
                DeliveredField.model_validate(
                    {'key': key, 'label': key, 'value': value}
                )
                for key, value in fields.items()
            ],
        )
        for document_type, fields in by_type.items()
    ]


def _outcome(
    document_type: str,
    field: str,
    condition: dict[str, Any],
    value: object,
    *,
    part: str | None = None,
    licence_class: str | None = None,
) -> str:
    """The outcome of one rule on one field's value."""
    branch = _branch(
        _rule(
            1, document_type, field, condition, part=part, licence_class=licence_class
        )
    )
    documents = _documents(**{document_type: {field: value}})
    return evaluate_branch(branch, documents, SHARED_ON).results[0].outcome


# Numbers: strict comparisons with one value


@pytest.mark.parametrize(
    ('operator', 'limit', 'height', 'expected'),
    [
        ('greater_than', 170, 180, 'met'),
        ('greater_than', 180, 180, 'not_met'),
        ('less_than', 190, 180, 'met'),
        ('less_than', 180, 180, 'not_met'),
        ('equal_to', 180, 180, 'met'),
        ('equal_to', 180.0, 180, 'met'),
        ('equal_to', 181, 180, 'not_met'),
        ('not_equal_to', 181, 180, 'met'),
        ('not_equal_to', 180, 180, 'not_met'),
        ('greater_than', 72, 72.5, 'met'),
    ],
)
def test_number_conditions(
    operator: str, limit: float, height: float, expected: str
) -> None:
    condition = {'operator': operator, 'value': limit}

    assert _outcome('mdl', 'height', condition, height) == expected


@pytest.mark.parametrize('height', [True, False, '180', [180], {'cm': 180}])
def test_a_number_that_isnt_a_json_number_cant_be_checked(height: object) -> None:
    condition = {'operator': 'greater_than', 'value': 0}

    assert _outcome('mdl', 'height', condition, height) == 'not_checked'


# Text (FR-013)


@pytest.mark.parametrize(
    ('operator', 'city', 'expected'),
    [
        ('equal_to', 'Stuttgart', 'met'),
        ('equal_to', 'Esslingen', 'not_met'),
        ('equal_to', 'Stuttgart-Vaihingen', 'not_met'),
        ('not_equal_to', 'Esslingen', 'met'),
        ('not_equal_to', 'Stuttgart', 'not_met'),
        ('contains', 'Stuttgart-Vaihingen', 'met'),
        ('contains', 'Esslingen', 'not_met'),
        ('not_contains', 'Esslingen', 'met'),
        ('not_contains', 'Stuttgart-Vaihingen', 'not_met'),
    ],
)
def test_text_conditions(operator: str, city: str, expected: str) -> None:
    condition = {'operator': operator, 'value': 'Stuttgart', 'match_case': False}

    assert _outcome('pid', 'address_locality', condition, city) == expected


@pytest.mark.parametrize(
    ('field', 'operator', 'expected_value', 'value', 'ignoring', 'matching'),
    [
        ('address_locality', 'equal_to', 'Köln', 'KÖLN', 'met', 'not_met'),
        ('address_locality', 'equal_to', 'Stuttgart', 'STUTTGART', 'met', 'not_met'),
        (
            'address_street_address',
            'contains',
            'straße',
            'HEIDESTRASSE 17',
            'met',
            'not_met',
        ),
        ('address_locality', 'equal_to', 'Köln', 'Köln', 'met', 'met'),
    ],
)
def test_letter_case_counts_only_when_the_rule_says_so(
    field: str,
    operator: str,
    expected_value: str,
    value: str,
    ignoring: str,
    matching: str,
) -> None:
    def outcome(match_case: bool) -> str:
        condition = {
            'operator': operator,
            'value': expected_value,
            'match_case': match_case,
        }
        return _outcome('pid', field, condition, value)

    assert outcome(match_case=False) == ignoring
    assert outcome(match_case=True) == matching


def test_a_text_condition_without_a_letter_case_choice_ignores_letter_case() -> None:
    condition = {'operator': 'equal_to', 'value': 'Stuttgart'}

    assert _outcome('pid', 'address_locality', condition, 'STUTTGART') == 'met'


@pytest.mark.parametrize('match_case', [False, True])
def test_a_composed_and_a_decomposed_letter_are_equal(match_case: bool) -> None:
    composed = 'Köln'
    decomposed = 'Köln'
    condition = {'operator': 'equal_to', 'value': composed, 'match_case': match_case}

    assert _outcome('pid', 'address_locality', condition, decomposed) == 'met'
    condition['value'] = decomposed
    assert _outcome('pid', 'address_locality', condition, composed) == 'met'


@pytest.mark.parametrize('match_case', [False, True])
def test_spaces_at_the_ends_dont_count(match_case: bool) -> None:
    condition = {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': match_case}

    assert _outcome('pid', 'address_locality', condition, ' Stuttgart ') == 'met'
    condition['value'] = '  Stuttgart\t'
    assert _outcome('pid', 'address_locality', condition, 'Stuttgart') == 'met'


def test_spaces_inside_a_text_count_as_written() -> None:
    condition = {'operator': 'equal_to', 'value': 'Bad Cannstatt', 'match_case': False}

    assert _outcome('pid', 'address_locality', condition, 'Bad  Cannstatt') == (
        'not_met'
    )


@pytest.mark.parametrize('city', ['', '   ', 70173, ['Stuttgart'], True])
def test_an_empty_or_non_text_value_cant_be_checked(city: object) -> None:
    condition = {'operator': 'not_equal_to', 'value': 'Stuttgart', 'match_case': False}

    assert _outcome('pid', 'address_locality', condition, city) == 'not_checked'


# Enums (FR-003)


@pytest.mark.parametrize(
    ('operator', 'values', 'nationalities', 'expected'),
    [
        ('includes_one_of', ['AT'], ['DE', 'AT'], 'met'),
        ('includes_one_of', ['FR', 'DE'], ['DE', 'AT'], 'met'),
        ('includes_one_of', ['FR'], ['DE', 'AT'], 'not_met'),
        ('includes_none_of', ['FR'], ['DE', 'AT'], 'met'),
        ('includes_none_of', ['FR', 'AT'], ['DE', 'AT'], 'not_met'),
        # Compared ignoring letter case
        ('includes_one_of', ['DE'], ['de'], 'met'),
        # A value outside the field's set matches none of the rule's values
        ('includes_one_of', ['DE'], ['XX'], 'not_met'),
        ('includes_none_of', ['DE'], ['XX'], 'met'),
    ],
)
def test_enum_conditions_on_a_list(
    operator: str, values: list[str], nationalities: list[str], expected: str
) -> None:
    condition = {'operator': operator, 'values': values}

    assert _outcome('pid', 'nationalities', condition, nationalities) == expected


def test_a_single_enum_value_counts_as_a_list_of_one() -> None:
    def outcome(operator: str, nationality: str) -> str:
        condition = {'operator': operator, 'values': ['DE', 'AT']}
        return _outcome('mdl', 'nationality', condition, nationality)

    assert outcome('includes_one_of', 'AT') == 'met'
    assert outcome('includes_one_of', 'FR') == 'not_met'
    assert outcome('includes_none_of', 'FR') == 'met'
    assert outcome('includes_none_of', 'DE') == 'not_met'


@pytest.mark.parametrize(
    ('operator', 'values', 'sex', 'expected'),
    [
        ('includes_one_of', [2], 2, 'met'),
        ('includes_one_of', [1], 2, 'not_met'),
        ('includes_none_of', [1], 2, 'met'),
        ('includes_none_of', [2], 2, 'not_met'),
        # Codes compare as integers
        ('includes_one_of', [2], '2', 'met'),
        ('includes_one_of', [2], 2.0, 'met'),
        # A code outside the set matches none of the rule's values
        ('includes_one_of', [1, 2], 7, 'not_met'),
        ('includes_none_of', [1, 2], 7, 'met'),
    ],
)
def test_enum_conditions_on_codes(
    operator: str, values: list[int], sex: object, expected: str
) -> None:
    condition = {'operator': operator, 'values': values}

    assert _outcome('pid', 'sex', condition, sex) == expected


def test_an_enum_of_texts_like_the_eye_colour() -> None:
    condition = {'operator': 'includes_one_of', 'values': ['blue', 'green']}

    assert _outcome('mdl', 'eye_colour', condition, 'Blue') == 'met'
    assert _outcome('mdl', 'eye_colour', condition, 'brown') == 'not_met'


@pytest.mark.parametrize(
    ('field', 'value'),
    [
        ('nationalities', []),
        ('nationalities', ['']),
        ('nationalities', ['  ']),
        ('nationalities', [{'code': 'DE'}]),
        ('nationalities', [True]),
        ('sex', True),
        ('sex', 'female'),
        ('sex', 1.5),
    ],
)
def test_an_empty_or_unreadable_enum_value_cant_be_checked(
    field: str, value: object
) -> None:
    for operator in ('includes_one_of', 'includes_none_of'):
        values = ['DE'] if field == 'nationalities' else [1]
        condition = {'operator': operator, 'values': values}

        assert _outcome('pid', field, condition, value) == 'not_checked'


# Dates (FR-012); the calendar's edge cases are in test_rule_dates.py


@pytest.mark.parametrize(
    ('condition', 'expiry_date', 'expected'),
    [
        ({'operator': 'before', 'date': '2030-01-01'}, '2029-12-31', 'met'),
        ({'operator': 'before', 'date': '2030-01-01'}, '2030-01-01', 'not_met'),
        ({'operator': 'after', 'date': '2030-01-01'}, '2030-01-02', 'met'),
        ({'operator': 'after', 'date': '2030-01-01'}, '2030-01-01', 'not_met'),
        ({'operator': 'on', 'date': '2030-01-01'}, '2030-01-01', 'met'),
        ({'operator': 'on', 'date': '2030-01-01'}, '2029-12-31', 'not_met'),
        ({'operator': 'at_least_years_ago', 'years': 2}, '2024-10-23', 'met'),
        ({'operator': 'at_least_years_ago', 'years': 2}, '2024-10-24', 'not_met'),
        ({'operator': 'less_than_years_ago', 'years': 2}, '2024-10-24', 'met'),
        ({'operator': 'less_than_years_ago', 'years': 2}, '2024-10-23', 'not_met'),
        ({'operator': 'exactly_years_ago', 'years': 2}, '2024-10-23', 'met'),
        ({'operator': 'exactly_years_ago', 'years': 2}, '2023-10-24', 'met'),
        ({'operator': 'exactly_years_ago', 'years': 2}, '2023-10-23', 'not_met'),
        ({'operator': 'exactly_years_ago', 'years': 2}, '2024-10-24', 'not_met'),
        (
            {'operator': 'at_least_from_now', 'amount': 6, 'unit': 'months'},
            '2027-04-23',
            'met',
        ),
        (
            {'operator': 'at_least_from_now', 'amount': 6, 'unit': 'months'},
            '2027-04-22',
            'not_met',
        ),
        (
            {'operator': 'less_than_from_now', 'amount': 6, 'unit': 'months'},
            '2027-04-22',
            'met',
        ),
        (
            {'operator': 'less_than_from_now', 'amount': 6, 'unit': 'months'},
            '2027-04-23',
            'not_met',
        ),
        (
            {'operator': 'at_least_from_now', 'amount': 1, 'unit': 'years'},
            '2027-10-23',
            'met',
        ),
        (
            {'operator': 'less_than_from_now', 'amount': 1, 'unit': 'years'},
            '2027-10-23',
            'not_met',
        ),
    ],
)
def test_date_conditions(
    condition: dict[str, Any], expiry_date: str, expected: str
) -> None:
    assert _outcome('mdl', 'expiry_date', condition, expiry_date) == expected


def test_the_age_conditions_of_a_date_of_birth() -> None:
    def outcome(operator: str, birth_date: str) -> str:
        condition = {'operator': operator, 'years': 21}
        return _outcome('mdl', 'birth_date', condition, birth_date)

    assert outcome('at_least_years_ago', '2005-10-23') == 'met'
    assert outcome('at_least_years_ago', '2005-10-24') == 'not_met'
    assert outcome('less_than_years_ago', '2005-10-24') == 'met'
    assert outcome('less_than_years_ago', '2005-10-23') == 'not_met'
    assert outcome('exactly_years_ago', '2005-10-23') == 'met'
    assert outcome('exactly_years_ago', '2004-10-23') == 'not_met'


@pytest.mark.parametrize(
    'birthdate',
    [
        '1984',
        '1984-01',
        '26.01.1984',
        '19840126',
        '1984-02-30',
        # A date-time without a time zone has no calendar date in Germany
        '1984-01-26T10:00:00',
        19840126,
        '',
        ['1984-01-26'],
    ],
)
def test_a_date_that_cant_be_read_cant_be_checked(birthdate: object) -> None:
    condition = {'operator': 'at_least_years_ago', 'years': 21}

    assert _outcome('pid', 'birthdate', condition, birthdate) == 'not_checked'


def test_a_date_time_counts_by_its_calendar_date_in_germany() -> None:
    # 23:30 UTC on 22 October is 23 October in Germany
    condition = {'operator': 'on', 'date': '2026-10-23'}

    assert (
        _outcome('mdl', 'portrait_capture_date', condition, '2026-10-22T23:30:00Z')
        == 'met'
    )
    assert (
        _outcome('mdl', 'portrait_capture_date', condition, '2026-10-23T08:00:00+02:00')
        == 'met'
    )


# Parts: the place of birth (FR-003)

PLACE_OF_BIRTH = {
    'country': 'DE',
    'region': 'Baden-Württemberg',
    'locality': 'Stuttgart',
}


@pytest.mark.parametrize(
    ('part', 'condition', 'expected'),
    [
        ('country', {'operator': 'includes_one_of', 'values': ['DE']}, 'met'),
        ('country', {'operator': 'includes_none_of', 'values': ['DE']}, 'not_met'),
        (
            'region',
            {'operator': 'equal_to', 'value': 'baden-württemberg', 'match_case': False},
            'met',
        ),
        (
            'locality',
            {'operator': 'contains', 'value': 'stutt', 'match_case': False},
            'met',
        ),
        (
            'locality',
            {'operator': 'contains', 'value': 'stutt', 'match_case': True},
            'not_met',
        ),
    ],
)
def test_the_parts_of_the_place_of_birth(
    part: str, condition: dict[str, Any], expected: str
) -> None:
    assert (
        _outcome('pid', 'place_of_birth', condition, PLACE_OF_BIRTH, part=part)
        == expected
    )


@pytest.mark.parametrize(
    'place_of_birth',
    [{'country': 'DE', 'region': 'Baden-Württemberg'}, {'locality': None}, 'Stuttgart'],
)
def test_a_missing_part_cant_be_checked(place_of_birth: object) -> None:
    condition = {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': False}

    assert (
        _outcome('pid', 'place_of_birth', condition, place_of_birth, part='locality')
        == 'not_checked'
    )


# Parts: the licence classes (FR-003, FR-014)

PRIVILEGES = [
    {'vehicle_category_code': 'AM', 'issue_date': '2015-06-01'},
    {
        'vehicle_category_code': 'B',
        'issue_date': '2019-03-01',
        'expiry_date': '2034-03-01',
    },
    # Held, though its own expiry date has passed
    {
        'vehicle_category_code': 'C1',
        'issue_date': '2010-05-01',
        'expiry_date': '2020-01-01',
    },
]


def _class_outcome(
    part: str,
    condition: dict[str, Any],
    privileges: object = None,
    licence_class: str | None = None,
) -> str:
    return _outcome(
        'mdl',
        'driving_privileges',
        condition,
        PRIVILEGES if privileges is None else privileges,
        part=part,
        licence_class=licence_class,
    )


@pytest.mark.parametrize(
    ('operator', 'values', 'expected'),
    [
        ('includes_one_of', ['B'], 'met'),
        ('includes_one_of', ['BE', 'B'], 'met'),
        ('includes_one_of', ['C'], 'not_met'),
        ('includes_none_of', ['C'], 'met'),
        ('includes_none_of', ['B'], 'not_met'),
        # Held whatever its own expiry date
        ('includes_one_of', ['C1'], 'met'),
    ],
)
def test_the_licence_classes_held(
    operator: str, values: list[str], expected: str
) -> None:
    condition = {'operator': operator, 'values': values}

    assert _class_outcome('classes', condition) == expected


def test_holding_another_class_isnt_holding_b() -> None:
    condition = {'operator': 'includes_one_of', 'values': ['B']}
    privileges = [{'vehicle_category_code': 'BE', 'issue_date': '2019-03-01'}]

    assert _class_outcome('classes', condition, privileges) == 'not_met'


def test_a_class_dates_rule_on_a_held_class() -> None:
    condition = {'operator': 'at_least_years_ago', 'years': 2}

    assert _class_outcome('issue_date', condition, licence_class='B') == 'met'
    condition['years'] = 8
    assert _class_outcome('issue_date', condition, licence_class='B') == 'not_met'


def test_a_class_code_is_compared_ignoring_letter_case() -> None:
    privileges = [{'vehicle_category_code': 'b', 'issue_date': '2019-03-01'}]

    assert (
        _class_outcome(
            'issue_date',
            {'operator': 'at_least_years_ago', 'years': 2},
            privileges,
            licence_class='B',
        )
        == 'met'
    )
    assert (
        _class_outcome(
            'classes', {'operator': 'includes_one_of', 'values': ['B']}, privileges
        )
        == 'met'
    )


def test_a_class_dates_rule_on_a_class_not_held_isnt_met() -> None:
    issue_date = {'operator': 'at_least_years_ago', 'years': 2}
    expiry_date = {'operator': 'less_than_from_now', 'amount': 6, 'unit': 'months'}

    assert _class_outcome('issue_date', issue_date, licence_class='C') == 'not_met'
    assert _class_outcome('expiry_date', expiry_date, licence_class='C') == 'not_met'


def test_an_expired_class_is_held_but_its_expiry_date_rule_isnt_met() -> None:
    condition = {'operator': 'at_least_from_now', 'amount': 1, 'unit': 'months'}

    assert _class_outcome('expiry_date', condition, licence_class='C1') == 'not_met'
    assert (
        _class_outcome('classes', {'operator': 'includes_one_of', 'values': ['C1']})
        == 'met'
    )


def test_a_held_class_without_its_own_expiry_date_cant_be_checked() -> None:
    # The licence's own expiry date is no fallback
    branch = _branch(
        _rule(
            1,
            'mdl',
            'driving_privileges',
            {'operator': 'at_least_from_now', 'amount': 6, 'unit': 'months'},
            part='expiry_date',
            licence_class='AM',
        )
    )
    documents = _documents(
        mdl={'expiry_date': '2034-03-01', 'driving_privileges': PRIVILEGES}
    )

    evaluation = evaluate_branch(branch, documents, SHARED_ON)

    assert evaluation.results[0].outcome == 'not_checked'


def test_a_held_class_without_an_issue_date_cant_be_checked() -> None:
    privileges = [{'vehicle_category_code': 'B'}]

    assert (
        _class_outcome(
            'issue_date',
            {'operator': 'at_least_years_ago', 'years': 2},
            privileges,
            licence_class='B',
        )
        == 'not_checked'
    )


@pytest.mark.parametrize(
    'privileges',
    [
        [],
        # What EUDIPLO up to 9.1.0 delivers (research R14)
        [{}, {}],
        [{'vehicle_category_code': ''}],
        'B',
        {'vehicle_category_code': 'B'},
    ],
)
def test_licence_classes_that_cant_be_read_cant_be_checked(privileges: object) -> None:
    classes = {'operator': 'includes_one_of', 'values': ['B']}
    issue_date = {'operator': 'at_least_years_ago', 'years': 2}

    assert _class_outcome('classes', classes, privileges) == 'not_checked'
    assert (
        _class_outcome('issue_date', issue_date, privileges, licence_class='B')
        == 'not_checked'
    )


# Missing values (FR-014)


def test_a_missing_or_null_value_cant_be_checked() -> None:
    condition = {'operator': 'at_least_years_ago', 'years': 21}
    branch = _branch(_rule(1, 'pid', 'birthdate', condition))

    absent_field = _documents(pid={'family_name': 'Mustermann'})
    absent_document = _documents(mdl={'birth_date': '1984-01-26'})
    null_value = _documents(pid={'birthdate': None})

    for documents in (absent_field, absent_document, null_value, []):
        evaluation = evaluate_branch(branch, documents, SHARED_ON)
        assert evaluation.results[0].outcome == 'not_checked'


# The top level (FR-009 to FR-011)

AGE_21 = _rule(
    1,
    'pid',
    'birthdate',
    {'operator': 'at_least_years_ago', 'years': 21},
    message='You must be at least 21 years old.',
)
HOLDS_B = _rule(
    2,
    'mdl',
    'driving_privileges',
    {'operator': 'includes_one_of', 'values': ['B']},
    part='classes',
    message='You must hold a class B licence.',
)
B_FOR_2_YEARS = _rule(
    3,
    'mdl',
    'driving_privileges',
    {'operator': 'at_least_years_ago', 'years': 2},
    part='issue_date',
    licence_class='B',
    message='You must have held class B for at least 2 years.',
)


def _person(birthdate: str, b_since: str) -> list[DeliveredDocument]:
    return _documents(
        pid={'family_name': 'Mustermann', 'birthdate': birthdate},
        mdl={
            'driving_privileges': [
                {'vehicle_category_code': 'B', 'issue_date': b_since}
            ]
        },
    )


def test_a_25_year_old_who_held_b_for_5_years_meets_the_three_rules() -> None:
    branch = _branch(AGE_21, HOLDS_B, B_FOR_2_YEARS)

    evaluation = evaluate_branch(branch, _person('2001-01-01', '2021-09-01'), SHARED_ON)

    assert evaluation.model_dump() == {
        'branch': {'id': MAIN_BRANCH_ID, 'name': 'Standard'},
        'met': True,
        'results': [
            {
                'id': 'rule-1',
                'type': 'rule',
                'name': 'Rule 01',
                'group': None,
                'outcome': 'met',
            },
            {
                'id': 'rule-2',
                'type': 'rule',
                'name': 'Rule 02',
                'group': None,
                'outcome': 'met',
            },
            {
                'id': 'rule-3',
                'type': 'rule',
                'name': 'Rule 03',
                'group': None,
                'outcome': 'met',
            },
        ],
        'messages': [],
    }


def test_a_20_year_old_who_held_b_for_1_year_gets_two_messages() -> None:
    branch = _branch(AGE_21, HOLDS_B, B_FOR_2_YEARS)

    evaluation = evaluate_branch(branch, _person('2006-06-30', '2025-09-01'), SHARED_ON)

    assert evaluation.met is False
    assert [result.outcome for result in evaluation.results] == [
        'not_met',
        'met',
        'not_met',
    ]
    assert [message.model_dump() for message in evaluation.messages] == [
        {'id': 'rule-1', 'message': 'You must be at least 21 years old.'},
        {'id': 'rule-3', 'message': 'You must have held class B for at least 2 years.'},
    ]


def test_and_counts_couldnt_be_checked_as_not_met() -> None:
    branch = _branch(AGE_21, HOLDS_B)
    documents = _documents(
        pid={'birthdate': '1984'},
        mdl={'driving_privileges': [{'vehicle_category_code': 'B'}]},
    )

    evaluation = evaluate_branch(branch, documents, SHARED_ON)

    assert evaluation.met is False
    assert [result.outcome for result in evaluation.results] == ['not_checked', 'met']
    assert [message.id for message in evaluation.messages] == ['rule-1']


def test_or_is_met_when_one_rule_is_met_and_reports_no_message() -> None:
    branch = _branch(AGE_21, B_FOR_2_YEARS, operator='or')

    evaluation = evaluate_branch(branch, _person('2006-06-30', '2021-09-01'), SHARED_ON)

    assert evaluation.met is True
    assert [result.outcome for result in evaluation.results] == ['not_met', 'met']
    assert evaluation.messages == []


def test_or_reports_every_message_in_order_when_no_rule_is_met() -> None:
    branch = _branch(AGE_21, HOLDS_B, B_FOR_2_YEARS, operator='or')
    documents = _documents(
        pid={'birthdate': '2006-06-30'},
        mdl={'driving_privileges': [{'vehicle_category_code': 'AM'}]},
    )

    evaluation = evaluate_branch(branch, documents, SHARED_ON)

    assert evaluation.met is False
    assert [result.outcome for result in evaluation.results] == [
        'not_met',
        'not_met',
        'not_met',
    ]
    assert [message.id for message in evaluation.messages] == [
        'rule-1',
        'rule-2',
        'rule-3',
    ]


@pytest.mark.parametrize('operator', ['and', 'or'])
def test_a_branch_without_rules_is_met(operator: str) -> None:
    evaluation = evaluate_branch(_branch(operator=operator), [], SHARED_ON)

    assert evaluation.model_dump() == {
        'branch': {'id': MAIN_BRANCH_ID, 'name': 'Standard'},
        'met': True,
        'results': [],
        'messages': [],
    }


def test_the_evaluation_holds_no_value_of_the_documents() -> None:
    branch = _branch(
        AGE_21,
        HOLDS_B,
        B_FOR_2_YEARS,
        _rule(
            4,
            'pid',
            'address_locality',
            {'operator': 'equal_to', 'value': 'Esslingen', 'match_case': False},
        ),
    )
    documents = _documents(
        pid={
            'family_name': 'Mustermann',
            'birthdate': '2006-06-30',
            'address_locality': 'Heilbronn',
        },
        mdl={
            'driving_privileges': [
                {'vehicle_category_code': 'BE', 'issue_date': '2025-09-01'}
            ]
        },
    )

    dumped = evaluate_branch(branch, documents, SHARED_ON).model_dump_json()

    for value in ('Mustermann', '2006', '06-30', 'Heilbronn', 'BE', '2025-09-01'):
        assert value not in dumped


# Groups and sub-groups (FR-009, FR-011)


def _group(
    number: int,
    operator: str,
    *items: dict[str, Any],
    name: str | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    return {
        'type': 'group',
        'id': f'group-{number}',
        'name': name or f'Group {number:02d}',
        'mark': None,
        'operator': operator,
        'message': message,
        'items': list(items),
    }


# User story 2: lives in Stuttgart AND (at least 21 OR (at least 19 AND has held
# class B for at least 3 years))
LIVES_IN_STUTTGART = _rule(
    1,
    'pid',
    'address_locality',
    {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': False},
    message='You must live in Stuttgart.',
)
AT_LEAST_21 = _rule(
    2,
    'pid',
    'birthdate',
    {'operator': 'at_least_years_ago', 'years': 21},
    message='You must be at least 21 years old.',
)
AT_LEAST_19 = _rule(
    3,
    'pid',
    'birthdate',
    {'operator': 'at_least_years_ago', 'years': 19},
    message='You must be at least 19 years old.',
)
B_FOR_3_YEARS = _rule(
    4,
    'mdl',
    'driving_privileges',
    {'operator': 'at_least_years_ago', 'years': 3},
    part='issue_date',
    licence_class='B',
    message='You must have held class B for at least 3 years.',
)
GROUP_MESSAGE = 'You must be at least 21, or 19 with class B for 3 years.'
SUB_GROUP_MESSAGE = 'You must be at least 19 with class B for 3 years.'


def _user_story_2(
    group_message: str | None = None, sub_group_message: str | None = None
) -> SnapshotBranch:
    return _branch(
        LIVES_IN_STUTTGART,
        _group(
            1,
            'or',
            AT_LEAST_21,
            _group(
                2,
                'and',
                AT_LEAST_19,
                B_FOR_3_YEARS,
                name='Sub-group 02',
                message=sub_group_message,
            ),
            message=group_message,
        ),
    )


def _applicant(
    birthdate: str, city: str, b_since: str | None
) -> list[DeliveredDocument]:
    """Someone born on `birthdate` who lives in `city` and has held class B since
    `b_since`, or holds only class AM."""
    privilege = (
        {'vehicle_category_code': 'B', 'issue_date': b_since}
        if b_since
        else {'vehicle_category_code': 'AM', 'issue_date': '2020-01-01'}
    )
    return _documents(
        pid={'birthdate': birthdate, 'address_locality': city},
        mdl={'driving_privileges': [privilege]},
    )


# On SHARED_ON, 23 Oct 2026
AGED_25 = '2001-01-01'
AGED_20 = '2006-06-30'
AGED_18 = '2008-06-30'
B_FOR_3 = '2023-09-01'
B_FOR_1 = '2025-09-01'


@pytest.mark.parametrize(
    ('documents', 'met', 'messages'),
    [
        # At least 21
        (_applicant(AGED_25, 'Stuttgart', B_FOR_1), True, []),
        # At least 19 with class B for 3 years (US2-AS2)
        (_applicant(AGED_20, 'Stuttgart', B_FOR_3), True, []),
        # 20 with class B for 1 year: the 21-year and 3-year rules' messages, not
        # the 19-year rule's, which is met (US2-AS3)
        (_applicant(AGED_20, 'Stuttgart', B_FOR_1), False, ['rule-2', 'rule-4']),
        # At least 21, but not from Stuttgart
        (_applicant(AGED_25, 'Esslingen', B_FOR_3), False, ['rule-1']),
        # Neither way to qualify
        (
            _applicant(AGED_18, 'Esslingen', None),
            False,
            ['rule-1', 'rule-2', 'rule-3', 'rule-4'],
        ),
    ],
)
def test_each_way_to_qualify_for_user_story_2(
    documents: list[DeliveredDocument], met: bool, messages: list[str]
) -> None:
    evaluation = evaluate_branch(_user_story_2(), documents, SHARED_ON)

    assert evaluation.met is met
    assert [message.id for message in evaluation.messages] == messages


def test_a_group_and_its_members_are_reported_in_the_rules_steps_order() -> None:
    evaluation = evaluate_branch(
        _user_story_2(), _applicant(AGED_20, 'Stuttgart', B_FOR_1), SHARED_ON
    )

    assert [result.model_dump() for result in evaluation.results] == [
        {
            'id': 'rule-1',
            'type': 'rule',
            'name': 'Rule 01',
            'group': None,
            'outcome': 'met',
        },
        {
            'id': 'group-1',
            'type': 'group',
            'name': 'Group 01',
            'group': None,
            'outcome': 'not_met',
        },
        {
            'id': 'rule-2',
            'type': 'rule',
            'name': 'Rule 02',
            'group': 'group-1',
            'outcome': 'not_met',
        },
        {
            'id': 'group-2',
            'type': 'group',
            'name': 'Sub-group 02',
            'group': 'group-1',
            'outcome': 'not_met',
        },
        {
            'id': 'rule-3',
            'type': 'rule',
            'name': 'Rule 03',
            'group': 'group-2',
            'outcome': 'met',
        },
        {
            'id': 'rule-4',
            'type': 'rule',
            'name': 'Rule 04',
            'group': 'group-2',
            'outcome': 'not_met',
        },
    ]
    assert [message.model_dump() for message in evaluation.messages] == [
        {'id': 'rule-2', 'message': 'You must be at least 21 years old.'},
        {'id': 'rule-4', 'message': 'You must have held class B for at least 3 years.'},
    ]


def test_a_group_reports_its_own_message_instead_of_its_members() -> None:
    branch = _user_story_2(group_message=GROUP_MESSAGE)

    evaluation = evaluate_branch(
        branch, _applicant(AGED_20, 'Stuttgart', B_FOR_1), SHARED_ON
    )

    # US2-AS4
    assert [message.model_dump() for message in evaluation.messages] == [
        {'id': 'group-1', 'message': GROUP_MESSAGE}
    ]


def test_a_sub_group_reports_its_own_message_inside_a_group_without_one() -> None:
    branch = _user_story_2(sub_group_message=SUB_GROUP_MESSAGE)

    evaluation = evaluate_branch(
        branch, _applicant(AGED_18, 'Esslingen', None), SHARED_ON
    )

    assert [message.model_dump() for message in evaluation.messages] == [
        {'id': 'rule-1', 'message': 'You must live in Stuttgart.'},
        {'id': 'rule-2', 'message': 'You must be at least 21 years old.'},
        {'id': 'group-2', 'message': SUB_GROUP_MESSAGE},
    ]


def test_a_met_group_reports_no_message_of_its_members() -> None:
    # US2-AS5: the OR group is met through the 21-year rule, though the 3-year rule
    # isn't, and only the top-level rule that isn't met is reported
    branch = _branch(LIVES_IN_STUTTGART, _group(1, 'or', AT_LEAST_21, B_FOR_3_YEARS))

    evaluation = evaluate_branch(
        branch, _applicant(AGED_25, 'Esslingen', B_FOR_1), SHARED_ON
    )

    assert [(result.id, result.outcome) for result in evaluation.results] == [
        ('rule-1', 'not_met'),
        ('group-1', 'met'),
        ('rule-2', 'met'),
        ('rule-4', 'not_met'),
    ]
    assert [message.id for message in evaluation.messages] == ['rule-1']


def test_a_met_group_meets_an_or_top_level() -> None:
    branch = _branch(
        LIVES_IN_STUTTGART,
        _group(1, 'and', AT_LEAST_19, B_FOR_3_YEARS),
        operator='or',
    )

    evaluation = evaluate_branch(
        branch, _applicant(AGED_20, 'Esslingen', B_FOR_3), SHARED_ON
    )

    assert evaluation.met is True
    assert evaluation.messages == []


def test_a_group_counts_couldnt_be_checked_as_not_met() -> None:
    branch = _branch(_group(1, 'or', AT_LEAST_21, B_FOR_3_YEARS))
    documents = _documents(
        pid={'birthdate': '1984'},
        mdl={'driving_privileges': [{'vehicle_category_code': 'B'}]},
    )

    evaluation = evaluate_branch(branch, documents, SHARED_ON)

    assert evaluation.met is False
    assert [(result.id, result.outcome) for result in evaluation.results] == [
        ('group-1', 'not_met'),
        ('rule-2', 'not_checked'),
        ('rule-4', 'not_checked'),
    ]
    assert [message.id for message in evaluation.messages] == ['rule-2', 'rule-4']


def test_the_result_list_of_the_contracts_example() -> None:
    # contracts/integration-api.md, "Pull answer": a 20-year-old from Stuttgart
    # whose class B has no issue date
    branch = _branch(
        _rule(
            4,
            'pid',
            'address_locality',
            {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': False},
        )
        | {'name': 'Lives in Stuttgart'},
        _group(
            1,
            'or',
            AT_LEAST_21 | {'id': 'rule-1', 'name': 'Rule 01'},
            _group(
                2,
                'and',
                AT_LEAST_19 | {'id': 'rule-5', 'name': 'Rule 05'},
                B_FOR_3_YEARS | {'id': 'rule-3', 'name': 'Rule 03'},
                name='Sub-group 02',
            ),
        ),
    )
    documents = _documents(
        pid={'birthdate': AGED_20, 'address_locality': 'Stuttgart'},
        mdl={'driving_privileges': [{'vehicle_category_code': 'B'}]},
    )

    evaluation = evaluate_branch(branch, documents, SHARED_ON)

    assert evaluation.model_dump(exclude={'branch'}) == {
        'met': False,
        'results': [
            {
                'id': 'rule-4',
                'type': 'rule',
                'name': 'Lives in Stuttgart',
                'group': None,
                'outcome': 'met',
            },
            {
                'id': 'group-1',
                'type': 'group',
                'name': 'Group 01',
                'group': None,
                'outcome': 'not_met',
            },
            {
                'id': 'rule-1',
                'type': 'rule',
                'name': 'Rule 01',
                'group': 'group-1',
                'outcome': 'not_met',
            },
            {
                'id': 'group-2',
                'type': 'group',
                'name': 'Sub-group 02',
                'group': 'group-1',
                'outcome': 'not_met',
            },
            {
                'id': 'rule-5',
                'type': 'rule',
                'name': 'Rule 05',
                'group': 'group-2',
                'outcome': 'met',
            },
            {
                'id': 'rule-3',
                'type': 'rule',
                'name': 'Rule 03',
                'group': 'group-2',
                'outcome': 'not_checked',
            },
        ],
        'messages': [
            {'id': 'rule-1', 'message': 'You must be at least 21 years old.'},
            {
                'id': 'rule-3',
                'message': 'You must have held class B for at least 3 years.',
            },
        ],
    }


# A branch based on the main branch: its marks (FR-008, FR-009, FR-023; data-model.md
# "Dissolution")

AMBULANCE_ID = 'a83e5d0c-3f4b-4f6e-9b84-0e7f3c1d9a21'


def _based(
    *items: dict[str, Any], operator: str = 'and', operator_mark: str | None = None
) -> SnapshotBranch:
    return SnapshotBranch.model_validate(
        {
            'id': AMBULANCE_ID,
            'name': 'Ambulance',
            'description': 'Applicants for an ambulance licence',
            'origin': 'based',
            'operator': operator,
            'operator_mark': operator_mark,
            'items': list(items),
        }
    )


def _marked(item: dict[str, Any], mark: str) -> dict[str, Any]:
    return item | {'mark': mark}


def _reported(evaluation: Evaluation) -> list[tuple[str, str | None, str]]:
    """Each result's identifier, containing group and outcome."""
    return [(result.id, result.group, result.outcome) for result in evaluation.results]


# On SHARED_ON: 20 years old, has held class B for 1 year
AGED_20_B_FOR_1 = _applicant(AGED_20, 'Stuttgart', B_FOR_1)


def test_the_evaluation_names_the_based_branch() -> None:
    evaluation = evaluate_branch(_based(AT_LEAST_19), AGED_20_B_FOR_1, SHARED_ON)

    assert evaluation.branch.model_dump() == {'id': AMBULANCE_ID, 'name': 'Ambulance'}
    assert evaluation.met is True


def test_changed_and_added_rules_are_evaluated_as_the_branch_has_them() -> None:
    # Ambulance asks for 19 where Standard asks for 21, and adds the 3-year rule
    changed_age = _marked(
        AT_LEAST_21
        | {
            'condition': {'operator': 'at_least_years_ago', 'years': 19},
            'message': 'You must be at least 19 years old.',
        },
        'changed',
    )
    branch = _based(changed_age, _marked(B_FOR_3_YEARS, 'added'))

    evaluation = evaluate_branch(branch, AGED_20_B_FOR_1, SHARED_ON)

    assert _reported(evaluation) == [
        ('rule-2', None, 'met'),
        ('rule-4', None, 'not_met'),
    ]
    assert [message.id for message in evaluation.messages] == ['rule-4']


def test_a_switched_top_level_is_combined_with_the_branchs_operator() -> None:
    branch = _based(AT_LEAST_21, AT_LEAST_19, operator='or', operator_mark='changed')

    assert evaluate_branch(branch, AGED_20_B_FOR_1, SHARED_ON).met is True


def test_removed_rules_are_neither_evaluated_nor_reported() -> None:
    branch = _based(_marked(AT_LEAST_21, 'removed'), AT_LEAST_19)

    evaluation = evaluate_branch(branch, AGED_20_B_FOR_1, SHARED_ON)

    assert _reported(evaluation) == [('rule-3', None, 'met')]
    assert evaluation.met is True


def test_a_removed_group_is_neither_evaluated_nor_reported_with_its_members() -> None:
    # Its members are unmarked: a rule that Standard added to the group, too
    removed = _marked(
        _group(1, 'and', AT_LEAST_21, B_FOR_3_YEARS, message=GROUP_MESSAGE), 'removed'
    )

    evaluation = evaluate_branch(
        _based(LIVES_IN_STUTTGART, removed), AGED_20_B_FOR_1, SHARED_ON
    )

    assert _reported(evaluation) == [('rule-1', None, 'met')]
    assert evaluation.met is True


@pytest.mark.parametrize('operator', ['and', 'or'])
def test_a_branch_whose_rules_are_all_removed_is_met(operator: str) -> None:
    branch = _based(
        _marked(AT_LEAST_21, 'removed'),
        _marked(_group(1, 'and', AT_LEAST_19, B_FOR_3_YEARS), 'removed'),
        operator=operator,
    )

    evaluation = evaluate_branch(branch, AGED_20_B_FOR_1, SHARED_ON)

    assert (evaluation.met, evaluation.results, evaluation.messages) == (True, [], [])


def test_a_dissolved_group_passes_its_remaining_member_to_its_level() -> None:
    # Ambulance removed the 21-year rule from user story 2's group. The group, its
    # OR and its message no longer apply; the sub-group takes its place
    group = _group(
        1,
        'or',
        _marked(AT_LEAST_21, 'removed'),
        _group(2, 'and', AT_LEAST_19, B_FOR_3_YEARS, name='Sub-group 02'),
        message=GROUP_MESSAGE,
    )

    evaluation = evaluate_branch(
        _based(LIVES_IN_STUTTGART, group), AGED_20_B_FOR_1, SHARED_ON
    )

    assert _reported(evaluation) == [
        ('rule-1', None, 'met'),
        ('group-2', None, 'not_met'),
        ('rule-3', 'group-2', 'met'),
        ('rule-4', 'group-2', 'not_met'),
    ]
    assert [message.model_dump() for message in evaluation.messages] == [
        {'id': 'rule-4', 'message': 'You must have held class B for at least 3 years.'}
    ]


def test_a_dissolved_sub_group_passes_its_rule_to_the_group() -> None:
    sub_group = _group(
        2,
        'and',
        _marked(AT_LEAST_19, 'removed'),
        B_FOR_3_YEARS,
        message=SUB_GROUP_MESSAGE,
    )

    evaluation = evaluate_branch(
        _based(_group(1, 'or', AT_LEAST_21, sub_group)), AGED_20_B_FOR_1, SHARED_ON
    )

    assert _reported(evaluation) == [
        ('group-1', None, 'not_met'),
        ('rule-2', 'group-1', 'not_met'),
        ('rule-4', 'group-1', 'not_met'),
    ]
    assert [message.id for message in evaluation.messages] == ['rule-2', 'rule-4']


def test_a_changed_group_dissolves_in_the_branch_too() -> None:
    changed = _marked(
        _group(1, 'or', _marked(AT_LEAST_21, 'removed'), B_FOR_3_YEARS), 'changed'
    )

    evaluation = evaluate_branch(_based(changed), AGED_20_B_FOR_1, SHARED_ON)

    assert _reported(evaluation) == [('rule-4', None, 'not_met')]


def test_a_dissolved_group_without_members_that_count_reports_nothing() -> None:
    group = _group(
        1, 'and', _marked(AT_LEAST_21, 'removed'), _marked(AT_LEAST_19, 'removed')
    )

    evaluation = evaluate_branch(
        _based(group, B_FOR_3_YEARS), AGED_20_B_FOR_1, SHARED_ON
    )

    assert _reported(evaluation) == [('rule-4', None, 'not_met')]


@pytest.mark.parametrize(
    'second_member',
    [
        # The removal was undone
        AT_LEAST_21,
        # Standard added a member to the group
        B_FOR_3_YEARS,
        # Ambulance added one
        _marked(B_FOR_3_YEARS, 'added'),
    ],
)
def test_a_dissolved_group_counts_again_once_two_members_count(
    second_member: dict[str, Any],
) -> None:
    group = _group(1, 'or', AT_LEAST_19, second_member)

    evaluation = evaluate_branch(_based(group), AGED_20_B_FOR_1, SHARED_ON)

    assert [result.id for result in evaluation.results] == [
        'group-1',
        'rule-3',
        second_member['id'],
    ]
    assert evaluation.results[1].group == 'group-1'


def test_a_sub_group_the_branch_formed_counts_as_one_member_of_the_group() -> None:
    # Ambulance put the group's two rules into a sub-group of its own
    own = _marked(_group(5, 'and', AT_LEAST_21, AT_LEAST_19), 'added')

    alone = evaluate_branch(_based(_group(1, 'or', own)), AGED_20_B_FOR_1, SHARED_ON)
    beside = evaluate_branch(
        _based(_group(1, 'or', own, B_FOR_3_YEARS)), AGED_20_B_FOR_1, SHARED_ON
    )

    # With nothing beside it, the group is dissolved and its sub-group takes its place
    assert _reported(alone) == [
        ('group-5', None, 'not_met'),
        ('rule-2', 'group-5', 'not_met'),
        ('rule-3', 'group-5', 'met'),
    ]
    assert _reported(beside) == [
        ('group-1', None, 'not_met'),
        ('group-5', 'group-1', 'not_met'),
        ('rule-2', 'group-5', 'not_met'),
        ('rule-3', 'group-5', 'met'),
        ('rule-4', 'group-1', 'not_met'),
    ]


def test_a_group_the_branch_added_isnt_dissolved_by_the_evaluator() -> None:
    # The save's checks refuse it, since a group of the branch's own is dissolved at
    # once (data-model.md "Dissolution")
    own = _marked(
        _group(5, 'and', AT_LEAST_19, _marked(AT_LEAST_21, 'removed')), 'added'
    )

    with pytest.raises(ValueError):
        evaluate_branch(_based(own), AGED_20_B_FOR_1, SHARED_ON)


# Saved rules that can't be right


@pytest.mark.parametrize('origin', ['main', 'empty'])
@pytest.mark.parametrize('mark', ['changed', 'removed', 'added'])
def test_a_mark_outside_a_based_branch_is_refused(mark: str, origin: str) -> None:
    branch = _branch(AGE_21 | {'mark': mark}).model_copy(update={'origin': origin})

    with pytest.raises(ValueError):
        evaluate_branch(branch, _person('2001-01-01', '2021-09-01'), SHARED_ON)


@pytest.mark.parametrize(
    'group',
    [
        _group(1, 'or', AGE_21, HOLDS_B) | {'mark': 'changed'},
        _group(1, 'or', AGE_21 | {'mark': 'removed'}, HOLDS_B),
        # Only a based branch's marks dissolve groups; a saved group of another
        # branch always has two members
        _group(1, 'or', AGE_21),
        _group(1, 'or'),
    ],
)
def test_a_marked_or_dissolved_group_is_refused(group: dict[str, Any]) -> None:
    with pytest.raises(ValueError):
        evaluate_branch(_branch(group), _person('2001-01-01', '2021-09-01'), SHARED_ON)


@pytest.mark.parametrize(
    'rule',
    [
        AGE_21 | {'target': None},
        AGE_21 | {'condition': None},
        _rule(1, 'pid', 'picture', {'operator': 'equal_to', 'value': 'x'}),
        _rule(1, 'pid', 'unknown_field', {'operator': 'equal_to', 'value': 'x'}),
        _rule(1, 'pid', 'birthdate', {'operator': 'greater_than', 'value': 3}),
        _rule(1, 'pid', 'birthdate', {'operator': 'at_least_years_ago', 'years': 0}),
        _rule(1, 'pid', 'birthdate', {'operator': 'at_least_from_now', 'amount': 2}),
        _rule(
            1,
            'mdl',
            'driving_privileges',
            {'operator': 'at_least_years_ago', 'years': 2},
            part='issue_date',
        ),
        _rule(
            1,
            'pid',
            'birthdate',
            {'operator': 'at_least_years_ago', 'years': 2},
            part='issue_date',
        ),
    ],
)
def test_a_saved_rule_that_doesnt_fit_the_catalog_raises(rule: dict[str, Any]) -> None:
    documents = _documents(
        pid={'birthdate': '1984-01-26', 'picture': 'x', 'unknown_field': 'x'},
        mdl={'driving_privileges': PRIVILEGES},
    )

    with pytest.raises(ValueError):
        evaluate_branch(_branch(rule), documents, SHARED_ON)
