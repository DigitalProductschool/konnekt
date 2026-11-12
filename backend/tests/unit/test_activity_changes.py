"""What a save records: `activity.changes_between()` (spec 010, research R4).

data-model.md section 2.3, rule by rule: the name and the description as cleaned,
the documents as the ordered list of `(document_type, fields)`, the variants
matched by id, and the rules of a variant when its own tree differs: the whole
tree for Standard and a variant that started empty, only what is its own for a
linked variant, so that a change of Standard that propagates is one entry. A
variant's description alone gives no entry but counts as a change (design-notes
section 4.1, call 4).
"""

import copy
from typing import Any, get_args

from pydantic import TypeAdapter

from app.models import FormConnection
from app.schemas import ActivityKind, BranchInput, RequestedDocument
from app.services.activity import (
    KINDS,
    Content,
    Entry,
    changes_between,
    draft_content,
)
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    HELD_RULE,
    group,
    main_branch,
    rule,
    target,
    variant,
)

STANDARD_ID = '0b6f9a52-0000-4000-8000-000000000001'
AMBULANCE_ID = '0b6f9a52-0000-4000-8000-000000000002'
EMPTY_ID = '0b6f9a52-0000-4000-8000-000000000003'

BRANCHES = TypeAdapter(list[BranchInput])
DOCUMENTS = [
    RequestedDocument(document_type='pid', fields=['family_name', 'birthdate']),
    RequestedDocument(document_type='mdl', fields=['driving_privileges']),
]


def marked(item: dict[str, Any], mark: str, **changes: Any) -> dict[str, Any]:
    """An item of a linked variant with its mark and its own content."""
    return copy.deepcopy(item) | {'mark': mark} | changes


def content(
    branches: list[dict[str, Any]],
    *,
    name: str = 'Taxi licence',
    description: str = 'Form 4711',
    documents: list[RequestedDocument] | None = None,
) -> Content:
    return Content(
        name=name,
        description=description,
        documents=DOCUMENTS if documents is None else documents,
        branches=BRANCHES.validate_python(branches),
    )


def standard(items: list[dict[str, Any]], **changes: Any) -> dict[str, Any]:
    return main_branch(items, branch_id=STANDARD_ID) | changes


def ambulance(items: list[dict[str, Any]], **changes: Any) -> dict[str, Any]:
    return variant(items, branch_id=AMBULANCE_ID, **changes)


def empty_variant(items: list[dict[str, Any]], **changes: Any) -> dict[str, Any]:
    return variant(
        items, name='Night shift', origin='empty', branch_id=EMPTY_ID, **changes
    )


OLDER_AGE_RULE = AGE_RULE | {
    'condition': {'operator': 'at_least_years_ago', 'years': 25},
}
YOUNGER_AGE_RULE = AGE_RULE | {
    'condition': {'operator': 'at_least_years_ago', 'years': 19},
    'message': 'You must be at least 19 years old.',
}
CITY_RULE = rule(
    7,
    target('pid', 'address_locality'),
    {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': False},
    'You must live in Stuttgart.',
)


def base() -> Content:
    """Standard with three rules, Ambulance linked to it with its own age rule."""
    return content(
        [
            standard([AGE_RULE, CLASS_RULE, HELD_RULE]),
            ambulance([marked(YOUNGER_AGE_RULE, 'changed'), CLASS_RULE, HELD_RULE]),
            empty_variant([CLASS_RULE]),
        ]
    )


def rules_changed(branch_id: str, name: str) -> Entry:
    return Entry('rules_changed', branch_id, name)


def test_the_kinds_are_the_contract_s_in_the_table_s_order() -> None:
    assert KINDS == get_args(ActivityKind)
    assert KINDS[:4] == (
        'created',
        'renamed',
        'description_changed',
        'documents_changed',
    )


def test_the_same_content_records_nothing() -> None:
    changes = changes_between(base(), base())
    assert changes == []
    assert not changes.changed


def test_the_name_and_the_description_are_compared_as_cleaned() -> None:
    padded = content(base_branches(), name='  Taxi licence ', description='Form 4711 ')
    assert changes_between(base(), padded) == []

    renamed = content(base_branches(), name='Taxi permit')
    described = content(base_branches(), description='')
    assert changes_between(base(), renamed) == [Entry('renamed')]
    assert changes_between(base(), described) == [Entry('description_changed')]


def base_branches() -> list[dict[str, Any]]:
    return [
        standard([AGE_RULE, CLASS_RULE, HELD_RULE]),
        ambulance([marked(YOUNGER_AGE_RULE, 'changed'), CLASS_RULE, HELD_RULE]),
        empty_variant([CLASS_RULE]),
    ]


def test_the_documents_are_compared_in_their_order_with_their_fields() -> None:
    moved = content(base_branches(), documents=list(reversed(DOCUMENTS)))
    other_fields = content(
        base_branches(),
        documents=[
            RequestedDocument(document_type='pid', fields=['family_name']),
            DOCUMENTS[1],
        ],
    )
    added = content(
        base_branches(),
        documents=[*DOCUMENTS, RequestedDocument(document_type='ehic', fields=[])],
    )
    for after in (moved, other_fields, added):
        assert changes_between(base(), after) == [Entry('documents_changed')]


def test_variants_are_matched_by_id() -> None:
    new_id = '0b6f9a52-0000-4000-8000-000000000004'
    after = content(
        [
            standard([AGE_RULE, CLASS_RULE, HELD_RULE]),
            # Renamed: the entry carries the new name
            ambulance(
                [marked(YOUNGER_AGE_RULE, 'changed'), CLASS_RULE, HELD_RULE],
                name='Patient transport',
            ),
            # Added with an id, and one without (the server assigns it later)
            variant([AGE_RULE, CLASS_RULE, HELD_RULE], name='Rental', branch_id=new_id),
            variant([AGE_RULE, CLASS_RULE, HELD_RULE], name='Coach'),
        ]
    )
    assert changes_between(base(), after) == [
        Entry('variant_added', new_id, 'Rental'),
        Entry('variant_added', None, 'Coach'),
        # Removed: the entry carries its last name
        Entry('variant_removed', EMPTY_ID, 'Night shift'),
        Entry('variant_renamed', AMBULANCE_ID, 'Patient transport'),
    ]


def test_an_added_variant_with_rules_of_its_own_also_changed_rules() -> None:
    linked_id = '0b6f9a52-0000-4000-8000-000000000005'
    empty_id = '0b6f9a52-0000-4000-8000-000000000006'
    after = content(
        [
            *base_branches(),
            variant(
                [AGE_RULE, marked(CLASS_RULE, 'removed'), HELD_RULE],
                name='Rental',
                branch_id=linked_id,
            ),
            variant([CITY_RULE], name='City', origin='empty', branch_id=empty_id),
            variant([], name='Blank', origin='empty'),
        ]
    )
    assert changes_between(base(), after) == [
        Entry('variant_added', linked_id, 'Rental'),
        Entry('variant_added', empty_id, 'City'),
        Entry('variant_added', None, 'Blank'),
        rules_changed(linked_id, 'Rental'),
        rules_changed(empty_id, 'City'),
    ]


def test_standard_s_rules_are_its_whole_tree() -> None:
    cases = [
        # A rule's content
        [OLDER_AGE_RULE, CLASS_RULE, HELD_RULE],
        # An order
        [CLASS_RULE, AGE_RULE, HELD_RULE],
        # A rule added, and one deleted
        [AGE_RULE, CLASS_RULE, HELD_RULE, CITY_RULE],
        [AGE_RULE, CLASS_RULE],
        # A group around two of them
        [AGE_RULE, group(1, [CLASS_RULE, HELD_RULE])],
    ]
    for items in cases:
        branches = base_branches()
        branches[0] = standard(items)
        changes = changes_between(base(), content(branches))
        assert rules_changed(STANDARD_ID, 'Standard') in changes, items

    # The top level's AND/OR
    branches = base_branches()
    branches[0] = standard([AGE_RULE, CLASS_RULE, HELD_RULE], operator='or')
    branches[1] = ambulance(
        [marked(YOUNGER_AGE_RULE, 'changed'), CLASS_RULE, HELD_RULE], operator='or'
    )
    assert changes_between(base(), content(branches)) == [
        rules_changed(STANDARD_ID, 'Standard')
    ]


def test_a_variant_that_started_empty_compares_its_whole_tree() -> None:
    for after in (
        empty_variant([CLASS_RULE, CITY_RULE]),
        empty_variant([]),
        empty_variant([CLASS_RULE], operator='or'),
        empty_variant([CLASS_RULE | {'message': 'Class B, please.'}]),
    ):
        branches = base_branches()
        branches[2] = after
        assert changes_between(base(), content(branches)) == [
            rules_changed(EMPTY_ID, 'Night shift')
        ]


def test_a_propagating_change_of_standard_is_one_entry() -> None:
    before = content(
        [
            standard([AGE_RULE, CLASS_RULE, HELD_RULE, CITY_RULE]),
            ambulance(
                [
                    marked(YOUNGER_AGE_RULE, 'changed'),
                    CLASS_RULE,
                    marked(HELD_RULE, 'changed', name='Held B'),
                    marked(CITY_RULE, 'removed'),
                    marked(rule(9, None, None, 'Own.'), 'added'),
                ]
            ),
        ]
    )
    other_class_rule = CLASS_RULE | {'message': 'Class B or BE.'}
    new_rule = rule(10, target('pid', 'family_name'), None, 'New.')
    # Standard: a rule changed, one added in front, one deleted that Ambulance had
    # changed (it stays there, `added`), one deleted that Ambulance had removed (it
    # leaves), and the top level switched to OR; Ambulance follows by propagation
    after = content(
        [
            standard([new_rule, AGE_RULE, other_class_rule], operator='or'),
            ambulance(
                [
                    new_rule,
                    marked(YOUNGER_AGE_RULE, 'changed'),
                    other_class_rule,
                    marked(HELD_RULE, 'added', name='Held B'),
                    marked(rule(9, None, None, 'Own.'), 'added'),
                ],
                operator='or',
            ),
        ]
    )
    assert changes_between(before, after) == [rules_changed(STANDARD_ID, 'Standard')]


def test_a_removed_item_follows_standard_s_content() -> None:
    before = content(
        [
            standard([AGE_RULE, CLASS_RULE]),
            ambulance([marked(AGE_RULE, 'removed'), CLASS_RULE]),
        ]
    )
    after = content(
        [
            standard([OLDER_AGE_RULE, CLASS_RULE]),
            ambulance([marked(OLDER_AGE_RULE, 'removed'), CLASS_RULE]),
        ]
    )
    assert changes_between(before, after) == [rules_changed(STANDARD_ID, 'Standard')]


def test_a_linked_variant_s_own_rules() -> None:
    standard_rules = standard([AGE_RULE, CLASS_RULE, HELD_RULE])
    own_group = group(5, [CLASS_RULE, HELD_RULE]) | {'mark': 'added'}
    cases = {
        'its changed rule changed again': [
            marked(OLDER_AGE_RULE, 'changed'),
            CLASS_RULE,
            HELD_RULE,
        ],
        'a changed rule reset': [AGE_RULE, CLASS_RULE, HELD_RULE],
        'a rule changed': [
            marked(YOUNGER_AGE_RULE, 'changed'),
            marked(CLASS_RULE, 'changed', message='Class B or BE.'),
            HELD_RULE,
        ],
        'a rule removed': [
            marked(YOUNGER_AGE_RULE, 'changed'),
            marked(CLASS_RULE, 'removed'),
            HELD_RULE,
        ],
        'a rule of its own added': [
            marked(YOUNGER_AGE_RULE, 'changed'),
            CLASS_RULE,
            HELD_RULE,
            marked(CITY_RULE, 'added'),
        ],
        'a group of its own around two inherited rules': [
            marked(YOUNGER_AGE_RULE, 'changed'),
            own_group,
        ],
        'its changed rule moved into a group of its own': [
            group(5, [marked(YOUNGER_AGE_RULE, 'changed'), CLASS_RULE])
            | {'mark': 'added'},
            HELD_RULE,
        ],
    }
    for case, items in cases.items():
        after = content([standard_rules, ambulance(items), empty_variant([CLASS_RULE])])
        assert changes_between(base(), after) == [
            rules_changed(AMBULANCE_ID, 'Ambulance')
        ], case

    # Its own top-level AND/OR: switched, and switched back while marked
    items = [marked(YOUNGER_AGE_RULE, 'changed'), CLASS_RULE, HELD_RULE]
    switched = ambulance(items, operator='or', operator_mark='changed')
    after = content([standard_rules, switched, empty_variant([CLASS_RULE])])
    assert changes_between(base(), after) == [rules_changed(AMBULANCE_ID, 'Ambulance')]
    back = ambulance(items, operator='and', operator_mark='changed')
    later = content([standard_rules, back, empty_variant([CLASS_RULE])])
    assert changes_between(after, later) == [rules_changed(AMBULANCE_ID, 'Ambulance')]


def test_a_variant_s_description_alone_is_a_change_without_an_entry() -> None:
    branches = base_branches()
    branches[1] = ambulance(
        [marked(YOUNGER_AGE_RULE, 'changed'), CLASS_RULE, HELD_RULE],
        description='For ambulance services.',
    )
    changes = changes_between(base(), content(branches))
    assert changes == []
    assert changes.changed


def test_a_save_that_changes_several_things_gives_one_entry_per_kind_and_variant() -> (
    None
):
    after = content(
        [
            standard([OLDER_AGE_RULE, CLASS_RULE, HELD_RULE], name='Taxi'),
            ambulance(
                [
                    marked(YOUNGER_AGE_RULE, 'changed', name='Young'),
                    CLASS_RULE,
                    HELD_RULE,
                ]
            ),
            empty_variant([CLASS_RULE, CITY_RULE]),
        ],
        name='Taxi permit',
        description='Form 4712',
        documents=[DOCUMENTS[0]],
    )
    changes = changes_between(base(), after)
    # In the order of data-model.md section 2.2, the variants in tab order
    assert changes == [
        Entry('renamed'),
        Entry('description_changed'),
        Entry('documents_changed'),
        Entry('variant_renamed', STANDARD_ID, 'Taxi'),
        rules_changed(STANDARD_ID, 'Taxi'),
        rules_changed(AMBULANCE_ID, 'Ambulance'),
        rules_changed(EMPTY_ID, 'Night shift'),
    ]
    assert changes.changed


def test_a_stored_draft_s_content() -> None:
    draft = {
        'documents': [document.model_dump() for document in DOCUMENTS],
        'branches': base_branches(),
        'step': 'rules',
    }
    row = FormConnection(name='Taxi licence', description='Form 4711', draft=draft)
    stored = draft_content(row)
    assert stored == base()
    assert changes_between(stored, base()) == []
