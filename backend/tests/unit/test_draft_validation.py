"""Checking a draft's content (spec 005: FR-003, FR-004; research R3 and R4).

A draft save runs the create path's validators with `complete=False`: incomplete
content is accepted, malformed content is refused with the create path's message.
Its identifiers come from its own counters (`number_draft`).
"""

import inspect
import uuid
from collections.abc import Callable
from typing import Any

import pytest
from fastapi import HTTPException

from app.language import Language, Text, request_language, resolve_text
from app.schemas import RequestedDocument, RulesInput
from app.services.form_connections import (
    clean_description,
    clean_documents,
    clean_name,
)
from app.services.rules import (
    DraftNumbering,
    RulesSave,
    _first_numbering,
    check_first_save,
    clean_rules,
    number_draft,
)
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    group,
    main_branch,
    rule,
    rules_input,
    target,
    variant,
)

DOCUMENTS = [
    RequestedDocument.model_validate(document)
    for document in FORM_CONNECTION['documents']
]
INVALID_IDENTIFIER = (
    'The rules contain an invalid identifier. Reload the connection and try again.'
)
ONE_MAIN_BRANCH = 'The rules need exactly one main branch.'


def _draft_rules(
    payload: dict[str, Any],
    documents: list[RequestedDocument] = DOCUMENTS,
    counters: tuple[int, int] = (1, 1),
) -> DraftNumbering:
    """What a draft save does with its rules: the structural checks, then the
    numbering from the draft's counters."""
    save = clean_rules(
        RulesInput.model_validate(payload), documents, None, complete=False
    )
    return number_draft(save, counters)


def _create_rules(
    payload: dict[str, Any], documents: list[RequestedDocument] = DOCUMENTS
) -> None:
    """What creating a connection does with its rules."""
    save = clean_rules(RulesInput.model_validate(payload), documents, None)
    check_first_save(save)


def _problem(call: Callable[[], object], language: Language = 'en') -> str:
    """The message of the 400 that `call` raises, as `errors.py` answers it."""
    with pytest.raises(HTTPException) as caught:
        call()
    assert caught.value.status_code == 400
    detail = caught.value.detail
    assert isinstance(detail, dict)
    assert detail['error'] == 'Validation error'
    message: str | Text = detail['message']
    token = request_language.set(language)
    try:
        return resolve_text(message)
    finally:
        request_language.reset(token)


def _draft_problem(
    payload: dict[str, Any],
    documents: list[RequestedDocument] = DOCUMENTS,
    language: Language = 'en',
) -> str:
    return _problem(lambda: _draft_rules(payload, documents), language)


def _items(numbering: DraftNumbering, position: int = 0) -> list[dict[str, Any]]:
    return [item.model_dump() for item in numbering.branches[position].items]


def _unnamed(number: int, message: str = '') -> dict[str, Any]:
    return rule(number, None, None, message, name='')


# Accepted


def test_no_documents_are_accepted() -> None:
    assert clean_documents([], complete=False) == []


def test_a_document_without_fields_is_accepted() -> None:
    documents = clean_documents(
        [RequestedDocument(document_type='pid', fields=[])], complete=False
    )

    assert documents == [RequestedDocument(document_type='pid', fields=[])]


# The description is optional on every path (spec 006: FR-002, FR-003; R2)


@pytest.mark.parametrize('value', [None, '', '   ', '  \n'])
def test_an_empty_description_is_accepted_as_empty(value: str | None) -> None:
    assert clean_description(value) == ''


def test_a_description_is_trimmed() -> None:
    assert clean_description(' FS-1 ') == 'FS-1'


def test_a_description_of_500_characters_is_accepted() -> None:
    assert clean_description('x' * 500) == 'x' * 500


def test_the_description_check_has_no_complete_switch() -> None:
    assert list(inspect.signature(clean_description).parameters) == ['value']


@pytest.mark.parametrize(
    'incomplete',
    [
        rule(1, None, AGE_RULE['condition'], AGE_RULE['message']),
        rule(1, AGE_RULE['target'], None, AGE_RULE['message']),
        rule(1, AGE_RULE['target'], AGE_RULE['condition'], ''),
    ],
    ids=['without target', 'without condition', 'without message'],
)
def test_an_incomplete_rule_is_accepted(incomplete: dict[str, Any]) -> None:
    numbering = _draft_rules(rules_input([main_branch([incomplete])]))

    assert _items(numbering) == [incomplete]


def test_a_rule_on_data_that_isnt_requested_keeps_its_condition() -> None:
    numbering = _draft_rules(rules_input([main_branch([CLASS_RULE])]), documents=[])

    assert _items(numbering) == [CLASS_RULE]


def test_a_condition_that_doesnt_fit_its_data_is_kept() -> None:
    mismatched = rule(
        1,
        target('pid', 'birthdate'),
        {'operator': 'contains', 'value': 'Stutt'},
        'You must meet this.',
    )

    numbering = _draft_rules(rules_input([main_branch([mismatched])]))

    assert _items(numbering) == [mismatched]


def test_a_variant_without_rules_is_accepted() -> None:
    numbering = _draft_rules(
        rules_input([main_branch([]), variant([], origin='empty', name='Taxi')])
    )

    assert [branch.items for branch in numbering.branches] == [[], []]


@pytest.mark.parametrize('names', [('', ''), ('Taxi', 'Taxi'), ('Taxi', ' taxi ')])
def test_missing_or_duplicate_variant_names_are_accepted(
    names: tuple[str, str],
) -> None:
    numbering = _draft_rules(
        rules_input(
            [
                main_branch([]),
                variant([], origin='empty', name=names[0]),
                variant([], origin='empty', name=names[1]),
            ]
        )
    )

    assert [branch.name for branch in numbering.branches[1:]] == [
        name.strip() for name in names
    ]


def test_an_unnamed_main_variant_is_accepted() -> None:
    numbering = _draft_rules(rules_input([main_branch([], name='')]))

    assert numbering.branches[0].name == ''


@pytest.mark.parametrize('names', [('', ''), ('Age', 'Age'), ('Age', ' age ')])
def test_missing_or_duplicate_rule_names_are_accepted(names: tuple[str, str]) -> None:
    numbering = _draft_rules(
        rules_input(
            [
                main_branch(
                    [_unnamed(1) | {'name': names[0]}, _unnamed(2) | {'name': names[1]}]
                )
            ]
        )
    )

    assert [item['name'] for item in _items(numbering)] == [
        name.strip() for name in names
    ]


@pytest.mark.parametrize('names', [('', ''), ('Age', 'Age')])
def test_missing_or_duplicate_group_names_are_accepted(names: tuple[str, str]) -> None:
    numbering = _draft_rules(
        rules_input(
            [
                main_branch(
                    [
                        group(1, [_unnamed(1), _unnamed(2)], name=names[0]),
                        group(2, [_unnamed(3), _unnamed(4)], name=names[1]),
                    ]
                )
            ]
        )
    )

    assert [item['name'] for item in _items(numbering)] == list(names)


def test_a_group_and_a_rule_may_share_a_name() -> None:
    numbering = _draft_rules(
        rules_input(
            [
                main_branch(
                    [
                        _unnamed(3) | {'name': 'Age'},
                        group(1, [_unnamed(1), _unnamed(2)], name='Age'),
                    ]
                )
            ]
        )
    )

    assert [item['name'] for item in _items(numbering)] == ['Age', 'Age']


def test_a_reserved_name_on_another_rule_is_accepted() -> None:
    named = _unnamed(5) | {'name': 'Rule 03'}

    numbering = _draft_rules(rules_input([main_branch([named])]))

    assert _items(numbering) == [named]


# Refused, with the create path's message


def test_an_unknown_document_type_is_refused() -> None:
    message = _problem(
        lambda: clean_documents(
            [RequestedDocument(document_type='x', fields=[])], complete=False
        )
    )

    assert message == "Unknown document type 'x'."


def test_an_unknown_field_is_refused() -> None:
    message = _problem(
        lambda: clean_documents(
            [RequestedDocument(document_type='pid', fields=['x'])], complete=False
        )
    )

    assert message == "Unknown field 'x' for 'Personal ID'."


def test_a_document_added_twice_is_refused() -> None:
    message = _problem(
        lambda: clean_documents(
            [
                RequestedDocument(document_type='pid', fields=[]),
                RequestedDocument(document_type='pid', fields=['birthdate']),
            ],
            complete=False,
        )
    )

    assert message == "'Personal ID' is added more than once."


def test_21_variants_are_refused() -> None:
    variants = [variant([], origin='empty', name='') for _ in range(20)]

    message = _draft_problem(rules_input([main_branch([]), *variants]))

    assert message == 'A connection can have at most 20 variants.'


def test_20_variants_are_accepted() -> None:
    variants = [variant([], origin='empty', name='') for _ in range(19)]

    numbering = _draft_rules(rules_input([main_branch([]), *variants]))

    assert len(numbering.branches) == 20


def test_two_main_variants_are_refused() -> None:
    message = _draft_problem(
        rules_input([main_branch([]), main_branch([], name='Taxi')])
    )

    assert message == ONE_MAIN_BRANCH


def test_a_main_variant_that_isnt_first_is_refused() -> None:
    message = _draft_problem(
        rules_input([variant([], origin='empty', name='Taxi'), main_branch([])])
    )

    assert message == ONE_MAIN_BRANCH


@pytest.mark.parametrize(
    'branches',
    [
        [main_branch([], branch_id='variant-1')],
        [main_branch([]), variant([], origin='empty', branch_id='variant-2')],
    ],
    ids=['main variant', 'other variant'],
)
def test_a_variant_whose_id_isnt_a_uuid_is_refused_as_the_create_path_refuses_it(
    branches: list[dict[str, Any]],
) -> None:
    payload = rules_input(branches)

    assert _problem(lambda: _create_rules(payload)) == 'Unknown variant.'
    assert _draft_problem(payload) == 'Unknown variant.'


def test_a_variants_uuid_is_kept_as_the_create_path_keeps_it() -> None:
    """Spec 007, research R10: a UUID is kept, and a null id gets one."""
    main_id = '00000000-0000-0000-0000-000000000001'
    variant_id = '00000000-0000-0000-0000-000000000002'
    payload = rules_input(
        [
            main_branch([], branch_id=main_id),
            variant([], origin='empty', branch_id=variant_id),
            variant([], origin='empty', name='Taxi'),
        ]
    )

    _create_rules(payload)
    numbering = _draft_rules(payload)

    ids = [branch.id for branch in numbering.branches]
    assert ids[:2] == [main_id, variant_id]
    assert ids[2] is not None and str(uuid.UUID(ids[2])) == ids[2]


@pytest.mark.parametrize('identifier', ['rule-x', 'rule-0', 'rule-01', 'group-1'])
def test_an_invalid_rule_identifier_is_refused(identifier: str) -> None:
    message = _draft_problem(
        rules_input([main_branch([_unnamed(1) | {'id': identifier}])])
    )

    assert message == INVALID_IDENTIFIER


def test_a_duplicate_identifier_is_refused() -> None:
    message = _draft_problem(rules_input([main_branch([_unnamed(1), _unnamed(1)])]))

    assert message == INVALID_IDENTIFIER


def test_a_sub_group_holding_a_group_is_refused() -> None:
    inner = group(3, [_unnamed(1), _unnamed(2)])
    sub_group = group(2, [inner, _unnamed(3)], name='Sub-group 02')

    message = _draft_problem(
        rules_input([main_branch([group(1, [sub_group, _unnamed(4)])])])
    )

    assert message == 'Sub-group 02 in Standard can only hold rules.'


def test_a_group_with_one_member_is_refused() -> None:
    message = _draft_problem(
        rules_input([main_branch([group(1, [_unnamed(1)], name='')])])
    )

    assert message == 'group-1 in Standard needs at least two rules.'


def test_a_based_variant_out_of_step_is_refused() -> None:
    # The variant has a rule that isn't the main variant's, without the `added` mark
    message = _draft_problem(
        rules_input([main_branch([_unnamed(1)]), variant([_unnamed(1), _unnamed(2)])])
    )

    assert message == (
        'The variant Ambulance is out of step with Standard. '
        'Reload the connection and try again.'
    )


def test_an_unnamed_variant_out_of_step_is_named_by_its_position() -> None:
    message = _draft_problem(
        rules_input(
            [
                main_branch([_unnamed(1)]),
                variant([_unnamed(1)], name='Taxi'),
                variant([], name=''),
            ]
        )
    )

    assert message == (
        'The variant Variant 3 is out of step with Standard. '
        'Reload the connection and try again.'
    )


def test_201_items_are_refused() -> None:
    items = [_unnamed(number) for number in range(1, 202)]

    message = _draft_problem(rules_input([main_branch(items)]))

    assert message == 'Standard can have at most 200 rules and groups.'


def test_200_items_are_accepted() -> None:
    items = [_unnamed(number) for number in range(1, 201)]

    numbering = _draft_rules(rules_input([main_branch(items)]))

    assert len(numbering.branches[0].items) == 200


def test_a_name_of_201_characters_is_refused() -> None:
    message = _problem(lambda: clean_name('x' * 201))

    assert message == 'The name can have at most 200 characters.'


def test_a_description_of_501_characters_is_refused() -> None:
    message = _problem(lambda: clean_description('x' * 501))

    assert message == 'The description can have at most 500 characters.'


def test_a_long_message_on_an_unnamed_rule_names_its_identifier() -> None:
    message = _draft_problem(rules_input([main_branch([_unnamed(7, 'x' * 501)])]))

    assert message == (
        'The error message of rule-7 in Standard can have at most 500 characters.'
    )


# Numbering (research R4)


def test_identifiers_below_the_base_keep_their_numbers() -> None:
    payload = rules_input(
        [main_branch([_unnamed(1), _unnamed(2)])], rule_base=3, group_base=1
    )

    numbering = _draft_rules(payload, counters=(9, 4))

    assert [item['id'] for item in _items(numbering)] == ['rule-1', 'rule-2']
    assert (numbering.next_rule_number, numbering.next_group_number) == (9, 4)


def test_new_identifiers_move_past_the_counters_in_every_variant_alike() -> None:
    # The editor started from (3, 1); another save took rule-3 and rule-4 meanwhile
    new_rule = rule(3, None, None, '')
    added = rule(4, None, None, '') | {'mark': 'added'}
    sub_group = group(1, [_unnamed(5), _unnamed(6)])
    payload = rules_input(
        [
            main_branch([_unnamed(1), new_rule]),
            variant([_unnamed(1), new_rule, added]),
            variant([sub_group], origin='empty', name='Taxi'),
        ],
        rule_base=3,
        group_base=1,
    )

    numbering = _draft_rules(payload, counters=(5, 2))

    assert [(item['id'], item['name']) for item in _items(numbering, 0)] == [
        ('rule-1', ''),
        ('rule-5', 'Rule 05'),
    ]
    assert [(item['id'], item['name']) for item in _items(numbering, 1)] == [
        ('rule-1', ''),
        ('rule-5', 'Rule 05'),
        ('rule-6', 'Rule 06'),
    ]
    taxi_group = _items(numbering, 2)[0]
    assert (taxi_group['id'], taxi_group['name']) == ('group-2', 'Group 02')
    assert [member['id'] for member in taxi_group['items']] == ['rule-7', 'rule-8']
    assert (numbering.next_rule_number, numbering.next_group_number) == (9, 3)


def test_the_counters_never_go_down() -> None:
    payload = rules_input([main_branch([_unnamed(1)])], rule_base=2, group_base=1)

    numbering = _draft_rules(payload, counters=(12, 7))

    assert (numbering.next_rule_number, numbering.next_group_number) == (12, 7)


def test_a_new_draft_numbers_from_one() -> None:
    numbering = _draft_rules(rules_input([main_branch([_unnamed(1), _unnamed(2)])]))

    assert [item['id'] for item in _items(numbering)] == ['rule-1', 'rule-2']
    assert (numbering.next_rule_number, numbering.next_group_number) == (3, 1)


def test_without_counters_an_identifier_below_the_base_is_refused() -> None:
    save = clean_rules(
        RulesInput.model_validate(
            rules_input([main_branch([_unnamed(1)])], rule_base=3, group_base=1)
        ),
        DOCUMENTS,
        None,
        complete=False,
    )

    assert _problem(lambda: _first_numbering(save)) == INVALID_IDENTIFIER


def test_a_save_without_rules_keeps_the_draft_counters() -> None:
    save: RulesSave = clean_rules(
        RulesInput.model_validate(rules_input([main_branch([])])),
        DOCUMENTS,
        None,
        complete=False,
    )

    numbering = number_draft(save, (4, 2))

    assert (numbering.next_rule_number, numbering.next_group_number) == (4, 2)


# German (spec 009, T015): a draft's messages name what the English ones do


def test_an_unnamed_variant_is_named_by_its_position_in_german() -> None:
    message = _draft_problem(
        rules_input(
            [
                main_branch([_unnamed(1)]),
                variant([_unnamed(1)], name='Taxi'),
                variant([], name=''),
            ]
        ),
        language='de',
    )

    assert message == (
        'Die Variante Variante 3 ist nicht auf dem Stand von Standard. '
        'Laden Sie die Anbindung neu und versuchen Sie es erneut.'
    )


def test_201_items_are_refused_in_german() -> None:
    items = [_unnamed(number) for number in range(1, 202)]

    message = _draft_problem(rules_input([main_branch(items)]), language='de')

    assert message == 'Standard kann höchstens 200 Regeln und Gruppen haben.'


def test_an_invalid_identifier_is_refused_in_german() -> None:
    message = _draft_problem(
        rules_input([main_branch([_unnamed(1), _unnamed(1)])]), language='de'
    )

    assert message == (
        'Die Regeln enthalten eine ungültige Kennung. Laden Sie die Anbindung neu '
        'und versuchen Sie es erneut.'
    )
