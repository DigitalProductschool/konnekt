"""The version of a connection's content (spec 011, research R6, data-model.md
section 1; FR-028 to FR-031, SC-004).

`version_fingerprint()` hashes one canonical JSON document of the content. Two
fixed vectors, the prototype's sample connection and its draft
(`specs/011-connection-pdf/prototype/data.mjs`, here with the API's shapes, real
catalog keys and valid conditions), notice any change of that canonical form,
which would make every printed version look out of date. Every kind of element
of FR-029 changes the version and nothing else does. A condition counts in its
publishable form, the form publishing stores (`rules.publishable_condition()`), so
that a complete draft and the connection publishing makes of it have one version.
The answers' versions, before and after publishing, are the API tests'
(test_form_connection_drafts.py, test_form_connections.py,
test_approval_requests.py).
"""

import copy
import hashlib
import inspect
import json
import re
from collections.abc import Callable
from typing import Any

import pytest

from app.schemas import (
    Branch,
    BranchInput,
    Condition,
    FormConnection,
    FormConnectionDraft,
    GroupItem,
    RequestedDocument,
    RuleItem,
    RuleTarget,
)
from app.services.form_connections import clean_documents, documents_view
from app.services.rules import clean_branches, publishable_condition
from app.services.versions import version_fingerprint
from tests.helpers import group, rule, target

VERSION = re.compile(r'[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}')

# The prototype's sample (prototype/data.mjs): "Taxi and private hire driver
# licence", two documents with 12 data items, Standard, Taxi based on it (a
# changed, a removed and an added rule, an added group with a sub-group) and Hire
# car with rules of its own. Its statements are turned into targets and
# conditions: "Address" is the country of residence, which rule-9 checks; rule-6's
# six towns are one town, since a text is compared with one value; rule-12's
# "is after today" is a fixed day, since no check compares with today. The main
# variant's id is a UUID, as every stored variant's is (spec 007, research R10)
SAMPLE_ID = '3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71'
STANDARD_ID = '5d0b8f6e-2c4a-4e1b-9f3d-7a6c5b4e3d2c'
TAXI_ID = '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f'
HIRE_CAR_ID = '9e8d7c6b-5a49-4382-a716-05f4e3d2c1b0'

# The 27 member states of the EU, rule-8's values
EU_MEMBER_STATES = [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU',
    'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]  # fmt: skip

AGE = target('pid', 'birthdate')
CLASSES = target('mdl', 'driving_privileges', 'classes')
EXPIRY = target('mdl', 'expiry_date')


def _rule(
    number: int,
    name: str,
    rule_target: dict[str, Any],
    condition: dict[str, Any] | None,
    message: str,
    mark: str | None = None,
) -> dict[str, Any]:
    """A rule as the prototype's `rule()` writes it, with a target and a condition."""
    return rule(number, rule_target, condition, message, name=name) | {'mark': mark}


def _group(
    number: int,
    name: str,
    operator: str,
    items: list[dict[str, Any]],
    message: str | None,
    mark: str | None = None,
) -> dict[str, Any]:
    """A group as the prototype's `group()` writes it."""
    return group(number, items, operator=operator, name=name, message=message) | {
        'mark': mark
    }


def _years_ago(years: float) -> dict[str, Any]:
    return {'operator': 'at_least_years_ago', 'years': years}


def _held(licence_class: str) -> dict[str, Any]:
    """The issue date of a licence class."""
    return target('mdl', 'driving_privileges', 'issue_date', licence_class)


def _standard_items() -> list[dict[str, Any]]:
    return [
        _rule(
            1,
            'Minimum age',
            AGE,
            _years_ago(21),
            'You must be at least 21 years old to apply.',
        ),
        _rule(
            2,
            'Licence class B',
            CLASSES,
            {'operator': 'includes_one_of', 'values': ['B']},
            'You need a driving licence of class B.',
        ),
        _group(
            1,
            'Licence held long enough',
            'or',
            [
                _rule(
                    3,
                    'Class B for two years',
                    _held('B'),
                    _years_ago(2),
                    'You must have held class B for at least two years.',
                ),
                _rule(
                    4,
                    'Class BE for two years',
                    _held('BE'),
                    _years_ago(2),
                    'You must have held class BE for at least two years.',
                ),
            ],
            'You must have held your driving licence for at least two years.',
        ),
        _rule(
            5,
            'Licence still valid',
            EXPIRY,
            {'operator': 'at_least_from_now', 'amount': 6, 'unit': 'months'},
            'Your driving licence must be valid for at least six more months.',
        ),
    ]


def _taxi_items() -> list[dict[str, Any]]:
    minimum_age, class_b, held_long_enough, still_valid = _standard_items()
    return [
        minimum_age
        | {
            'mark': 'changed',
            'condition': _years_ago(23),
            'message': 'You must be at least 23 years old to drive a taxi.',
        },
        class_b,
        held_long_enough,
        still_valid | {'mark': 'removed'},
        _rule(
            6,
            'Lives in the region',
            target('pid', 'address_locality'),
            {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': False},
            'Taxi licences are only issued to residents of the Stuttgart region.',
            'added',
        ),
        _group(
            2,
            'Nationality or residence',
            'or',
            [
                _rule(
                    7,
                    'German nationality',
                    target('pid', 'nationalities'),
                    {'operator': 'includes_one_of', 'values': ['DE']},
                    'You need German nationality.',
                    'added',
                ),
                _group(
                    3,
                    'EU citizen living here',
                    'and',
                    [
                        _rule(
                            8,
                            'EU nationality',
                            target('pid', 'nationalities'),
                            {'operator': 'includes_one_of', 'values': EU_MEMBER_STATES},
                            'You need the nationality of an EU member state.',
                            'added',
                        ),
                        _rule(
                            9,
                            'Lives in Germany',
                            target('pid', 'address_country'),
                            {'operator': 'includes_one_of', 'values': ['DE']},
                            'You need an address in Germany.',
                            'added',
                        ),
                    ],
                    None,
                    'added',
                ),
            ],
            'You need German nationality, or an EU nationality and an address in '
            'Germany.',
            'added',
        ),
    ]


def _hire_car_items() -> list[dict[str, Any]]:
    return [
        _rule(
            10,
            'Minimum age',
            AGE,
            _years_ago(21),
            'You must be at least 21 years old to apply.',
        ),
        _rule(
            11,
            'Licence class B',
            CLASSES,
            {'operator': 'includes_one_of', 'values': ['B']},
            'You need a driving licence of class B.',
        ),
        _rule(
            12,
            'Licence still valid',
            EXPIRY,
            {'operator': 'after', 'date': '2026-11-09'},
            'Your driving licence has expired.',
        ),
    ]


def _branch(
    branch_id: str,
    name: str,
    description: str | None,
    origin: str,
    items: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        'id': branch_id,
        'name': name,
        'description': description,
        'origin': origin,
        'operator': 'and',
        'operator_mark': None,
        'items': items,
    }


# The content as the API answers it, the documents' labels left out
SAMPLE: dict[str, Any] = {
    'id': SAMPLE_ID,
    'name': 'Taxi and private hire driver licence',
    'description': (
        'Application for the passenger transport licence (Fahrerlaubnis zur '
        'Fahrgastbeförderung) on serviceBW, Stuttgart road traffic authority.'
    ),
    # Each document's fields in catalog order, as publishing stores them
    'documents': [
        {
            'document_type': 'pid',
            'fields': [
                'family_name',
                'given_name',
                'birthdate',
                'place_of_birth',
                'nationalities',
                'address_locality',
                'address_country',
            ],
        },
        {
            'document_type': 'mdl',
            'fields': [
                'issue_date',
                'expiry_date',
                'issuing_authority',
                'document_number',
                'driving_privileges',
            ],
        },
    ],
    'branches': [
        _branch(STANDARD_ID, 'Standard', None, 'main', _standard_items()),
        _branch(
            TAXI_ID,
            'Taxi',
            (
                'For taxi drivers licensed in Stuttgart: local residence and a '
                'higher minimum age.'
            ),
            'based',
            _taxi_items(),
        ),
        _branch(
            HIRE_CAR_ID,
            'Hire car',
            'Private hire vehicles (Mietwagen): no residence rule, any EU licence.',
            'empty',
            _hire_car_items(),
        ),
    ],
}


def _sample_draft() -> dict[str, Any]:
    """The sample as a draft under review (the prototype's `draftOf()`): Hire car's
    rule-11 has no message yet, and rule-12 no check and no message."""
    draft = copy.deepcopy(SAMPLE)
    hire_car = draft['branches'][2]['items']
    hire_car[1]['message'] = ''
    hire_car[2]['condition'] = None
    hire_car[2]['message'] = ''
    return draft


# The fixed vectors. A change of either is a change of the canonical form: every
# printed version would look out of date (FR-030). The `canonical()` of the
# prototype's `fingerprint.mjs`, run over the same content document, gives the same
SAMPLE_VERSION = 'FA7E-47BB-5368'
SAMPLE_DRAFT_VERSION = '3D3C-F9EA-5FE0'


def fingerprint_of(content: dict[str, Any]) -> str:
    """The version of content shaped as SAMPLE."""
    return version_fingerprint(
        form_connection_id=content['id'],
        name=content['name'],
        description=content['description'],
        documents=[
            RequestedDocument.model_validate(document)
            for document in content['documents']
        ],
        branches=[BranchInput.model_validate(branch) for branch in content['branches']],
    )


# The canonical form


def test_the_sample_has_a_fixed_version() -> None:
    assert fingerprint_of(SAMPLE) == SAMPLE_VERSION
    assert fingerprint_of(_sample_draft()) == SAMPLE_DRAFT_VERSION


def test_the_sample_is_content_publishing_accepts_as_it_is() -> None:
    """The fixture is the published sample: publishing's checks keep it unchanged."""
    documents = [RequestedDocument.model_validate(d) for d in SAMPLE['documents']]
    branches = [BranchInput.model_validate(b) for b in SAMPLE['branches']]

    assert clean_documents(documents) == documents
    assert clean_branches(branches, documents, None) == branches


def test_the_version_is_the_sha256_of_the_canonical_document() -> None:
    """Keys sorted, no whitespace, `ensure_ascii=False`, UTF-8; the first twelve
    hexadecimal digits, upper case, in three groups of four (FR-028)."""
    version = version_fingerprint(
        form_connection_id='c-1',
        name='Führerschein',
        description=None,
        documents=[RequestedDocument(document_type='pid', fields=['birthdate'])],
        branches=[
            BranchInput(
                id='b-1',
                name='Standard',
                origin='main',
                operator='and',
                items=[
                    RuleItem.model_validate(
                        _rule(1, 'Alter', AGE, _years_ago(21.0), 'Zu jung.')
                    )
                ],
            )
        ],
    )

    canonical = (
        '{"branches":[{"description":null,"id":"b-1","items":[{"condition":'
        '{"operator":"at_least_years_ago","years":21},"id":"rule-1","mark":null,'
        '"message":"Zu jung.","name":"Alter","target":{"document_type":"pid",'
        '"field":"birthdate","licence_class":null,"part":null},"type":"rule"}],'
        '"name":"Standard","operator":"and","operator_mark":null,"origin":"main"}],'
        '"description":"","documents":[{"document_type":"pid","fields":'
        '["birthdate"]}],"id":"c-1","name":"Führerschein"}'
    )
    digits = hashlib.sha256(canonical.encode('utf-8')).hexdigest().upper()
    assert version == f'{digits[0:4]}-{digits[4:8]}-{digits[8:12]}'


def test_every_field_of_the_contents_schemas_is_decided() -> None:
    """A field added to one of these schemas fails here: add it to the canonical
    form in `versions.py` if it is content (FR-029), or leave it out knowingly.
    Either way, decide whether every printed version may change."""
    assert set(RequestedDocument.model_fields) == {'document_type', 'fields'}
    assert set(BranchInput.model_fields) == {
        'id',
        'name',
        'description',
        'origin',
        'operator',
        'operator_mark',
        'items',
    }
    assert set(RuleItem.model_fields) == {
        'type',
        'id',
        'name',
        'mark',
        'target',
        'condition',
        'message',
    }
    assert set(GroupItem.model_fields) == {
        'type',
        'id',
        'name',
        'mark',
        'operator',
        'message',
        'items',
    }
    assert set(RuleTarget.model_fields) == {
        'document_type',
        'field',
        'part',
        'licence_class',
    }
    assert set(Condition.model_fields) == {
        'operator',
        'value',
        'match_case',
        'values',
        'date',
        'years',
        'amount',
        'unit',
    }


def test_the_version_takes_only_the_content() -> None:
    """No status, state, start date, URL, counter, step, save number, example mark,
    time or language reaches it (FR-029)."""
    parameters = inspect.signature(version_fingerprint).parameters
    assert list(parameters) == [
        'form_connection_id',
        'name',
        'description',
        'documents',
        'branches',
    ]


# What changes the version: each kind of element of FR-029 (SC-004)

Change = Callable[[dict[str, Any]], object]


def _set(*path: str | int, to: Any) -> Change:
    """Set the value at `path` in the content to `to`."""

    def change(content: dict[str, Any]) -> None:
        *parents, last = path
        node: Any = content
        for key in parents:
            node = node[key]
        node[last] = to

    return change


def _swap(*path: str | int) -> Change:
    """Swap the first two entries of the list at `path`."""

    def change(content: dict[str, Any]) -> None:
        entries: Any = content
        for key in path:
            entries = entries[key]
        entries[0], entries[1] = entries[1], entries[0]

    return change


def _swap_variants(content: dict[str, Any]) -> None:
    """Taxi and Hire car change places; Standard stays first."""
    branches = content['branches']
    branches[1], branches[2] = branches[2], branches[1]


def _nest(content: dict[str, Any]) -> None:
    """Standard's rule-5 moves into its group, after the group's two rules."""
    items = content['branches'][0]['items']
    items[2]['items'].append(items.pop(3))


def _remove_document(content: dict[str, Any]) -> None:
    content['documents'].pop()


def _remove_data_item(content: dict[str, Any]) -> None:
    content['documents'][0]['fields'].remove('place_of_birth')


# Paths into SAMPLE
STANDARD = ('branches', 0)
TAXI = ('branches', 1)
HIRE_CAR = ('branches', 2)
# Standard's rule-1, its group-1 and the group's rule-4
MINIMUM_AGE = (*STANDARD, 'items', 0)
HELD_LONG_ENOUGH = (*STANDARD, 'items', 2)
CLASS_BE = (*HELD_LONG_ENOUGH, 'items', 1)
# Taxi's rule-2 and group-1, inherited unchanged, its rule-6 and its rule-8
TAXI_CLASS_B = (*TAXI, 'items', 1)
TAXI_HELD_LONG_ENOUGH = (*TAXI, 'items', 2)
LIVES_IN_THE_REGION = (*TAXI, 'items', 4)
EU_NATIONALITY = (*TAXI, 'items', 5, 'items', 1, 'items', 0)
# Hire car's rule-12
STILL_VALID = (*HIRE_CAR, 'items', 2)

CHANGES = [
    pytest.param(_set('id', to='7c1e9a24-3d5b-4f6a-8b2c-0e9d8c7b6a51'), id='the id'),
    pytest.param(_set('name', to='Taxi driver licence'), id='the name'),
    pytest.param(_set('description', to='FS-20417'), id='the description'),
    pytest.param(_remove_document, id='a document'),
    pytest.param(_remove_data_item, id='a data item'),
    pytest.param(_swap('documents'), id='the order of two documents'),
    pytest.param(
        _set(*HIRE_CAR, 'id', to='1f2e3d4c-5b6a-4798-8a7b-6c5d4e3f2a1b'),
        id="a variant's id",
    ),
    pytest.param(_set(*HIRE_CAR, 'name', to='Private hire'), id="a variant's name"),
    pytest.param(_set(*HIRE_CAR, 'description', to=None), id="a variant's description"),
    pytest.param(_set(*HIRE_CAR, 'origin', to='based'), id="a variant's origin"),
    pytest.param(_set(*HIRE_CAR, 'operator', to='or'), id="a variant's AND/OR"),
    pytest.param(
        _set(*TAXI, 'operator_mark', to='changed'), id="a variant's AND/OR mark"
    ),
    pytest.param(_swap_variants, id='the order of two variants'),
    pytest.param(_set(*STILL_VALID, 'id', to='rule-13'), id="a rule's identifier"),
    pytest.param(_set(*MINIMUM_AGE, 'name', to='Age'), id="a rule's name"),
    pytest.param(
        _set(*MINIMUM_AGE, 'target', to=target('mdl', 'birth_date')),
        id="a rule's target",
    ),
    pytest.param(
        _set(*CLASS_BE, 'target', 'licence_class', to='C'),
        id="a rule's licence class",
    ),
    pytest.param(
        _set(*MINIMUM_AGE, 'condition', 'operator', to='exactly_years_ago'),
        id="a rule's check",
    ),
    pytest.param(
        _set(*MINIMUM_AGE, 'condition', 'years', to=22),
        id="a rule's condition value",
    ),
    pytest.param(
        _set(*LIVES_IN_THE_REGION, 'condition', 'match_case', to=True),
        id="a rule's letter case",
    ),
    pytest.param(
        _swap(*EU_NATIONALITY, 'condition', 'values'),
        id="the order of a rule's values",
    ),
    pytest.param(
        _set(*MINIMUM_AGE, 'message', to='You are too young.'),
        id="a rule's message",
    ),
    pytest.param(_set(*TAXI_CLASS_B, 'mark', to='changed'), id="a rule's mark"),
    pytest.param(_swap(*STANDARD, 'items'), id='the order of two items'),
    pytest.param(
        _set(*HELD_LONG_ENOUGH, 'id', to='group-4'), id="a group's identifier"
    ),
    pytest.param(_set(*HELD_LONG_ENOUGH, 'name', to='Experience'), id="a group's name"),
    pytest.param(_set(*HELD_LONG_ENOUGH, 'operator', to='and'), id="a group's AND/OR"),
    pytest.param(_set(*HELD_LONG_ENOUGH, 'message', to=None), id="a group's message"),
    pytest.param(
        _set(*TAXI_HELD_LONG_ENOUGH, 'mark', to='changed'), id="a group's mark"
    ),
    pytest.param(_nest, id='the nesting'),
]


@pytest.mark.parametrize('change', CHANGES)
def test_each_kind_of_element_changes_the_version(change: Change) -> None:
    content = copy.deepcopy(SAMPLE)
    change(content)

    assert fingerprint_of(content) != SAMPLE_VERSION


def test_every_change_gives_a_version_of_its_own() -> None:
    versions = {SAMPLE_VERSION}
    for case in CHANGES:
        content = copy.deepcopy(SAMPLE)
        [change] = case.values
        assert callable(change)
        change(content)
        versions.add(fingerprint_of(content))

    assert len(versions) == len(CHANGES) + 1
    assert all(VERSION.fullmatch(version) for version in versions)


def test_an_edit_and_its_undo_give_the_same_version() -> None:
    content = copy.deepcopy(SAMPLE)
    _swap('documents')(content)
    _swap('documents')(content)

    assert fingerprint_of(content) == SAMPLE_VERSION


# What doesn't change it (FR-029, SC-004)


def _published_answer(**changes: Any) -> FormConnection:
    """The sample as `GET /api/form-connections/{id}` answers it, with `changes`."""
    base = f'https://middleware.test/api/connect/{SAMPLE_ID}'
    documents = [RequestedDocument.model_validate(d) for d in SAMPLE['documents']]
    answer = FormConnection(
        id=SAMPLE_ID,
        name=SAMPLE['name'],
        description=SAMPLE['description'],
        version_fingerprint=SAMPLE_VERSION,
        is_active=True,
        documents=documents_view(documents),
        trigger_url=f'{base}/requests',
        pull_url=f'{base}/requests/{{reference}}',
        branches=[
            Branch.model_validate(
                branch
                | {
                    'is_main': branch['origin'] == 'main',
                    'pull_url': f'{base}/{branch["id"]}/requests/{{reference}}',
                }
            )
            for branch in SAMPLE['branches']
        ],
        rule_set_version=4,
        next_rule_number=13,
        next_group_number=4,
        created_at='2026-11-02T08:00:00Z',
        updated_at='2026-11-09T15:45:00Z',
        state='live',
        published_at='2026-11-03T09:00:00Z',
        activated_at='2026-11-03T09:00:00Z',
        deactivated_at=None,
        start_date=None,
        last_activity=None,
    )
    return answer.model_copy(update=changes)


def _draft_answer(**changes: Any) -> FormConnectionDraft:
    """The sample as a stored draft answers it, with `changes`."""
    published = _published_answer()
    answer = FormConnectionDraft(
        id=SAMPLE_ID,
        name=SAMPLE['name'],
        description=SAMPLE['description'],
        version_fingerprint=SAMPLE_VERSION,
        documents=published.documents,
        branches=[BranchInput.model_validate(b) for b in SAMPLE['branches']],
        next_rule_number=13,
        next_group_number=4,
        step='test',
        version=7,
        created_at='2026-11-02T08:00:00Z',
        updated_at='2026-11-09T13:10:00Z',
        last_activity=None,
        example=None,
    )
    return answer.model_copy(update=changes)


def _version_of_answer(answer: FormConnection | FormConnectionDraft) -> str:
    """The version from an answer's content, as `_view()` and `draft_view()` take
    it: the field keys of its documents and its branches as they are."""
    return version_fingerprint(
        form_connection_id=answer.id,
        name=answer.name,
        description=answer.description,
        documents=[
            RequestedDocument(
                document_type=document.document_type,
                fields=[field.key for field in document.fields],
            )
            for document in answer.documents
        ],
        branches=answer.branches,
    )


def _relabelled(answer: FormConnection) -> dict[str, Any]:
    """Other labels for every document and data item, as another language has."""
    return {
        'documents': [
            document.model_copy(
                update={
                    'label': f'«{document.label}»',
                    'fields': [
                        field.model_copy(update={'label': field.label.upper()})
                        for field in document.fields
                    ],
                }
            )
            for document in answer.documents
        ]
    }


PUBLISHED_CHANGES = [
    pytest.param({}, id='as it is'),
    pytest.param({'is_active': False, 'state': 'deactivated'}, id='deactivated'),
    pytest.param(
        {'is_active': False, 'state': 'scheduled', 'start_date': '2026-12-01'},
        id='scheduled',
    ),
    pytest.param(
        {'published_at': '2026-11-10T09:00:00Z', 'activated_at': None},
        id='the status dates',
    ),
    pytest.param(
        {'created_at': '2026-11-10T08:00:00Z', 'updated_at': '2026-11-11T08:00:00Z'},
        id='the times',
    ),
    pytest.param(
        {
            'trigger_url': 'https://other.test/requests',
            'pull_url': 'https://other.test/requests/{reference}',
        },
        id='the URLs',
    ),
    pytest.param(
        {'rule_set_version': 9, 'next_rule_number': 40, 'next_group_number': 12},
        id='the counters',
    ),
]


@pytest.mark.parametrize('changes', PUBLISHED_CHANGES)
def test_a_published_answers_other_fields_leave_the_version(
    changes: dict[str, Any],
) -> None:
    assert _version_of_answer(_published_answer(**changes)) == SAMPLE_VERSION


def test_labels_and_branch_urls_leave_the_version() -> None:
    answer = _published_answer()
    other_urls = [
        branch.model_copy(
            update={'pull_url': 'https://other.test/{reference}', 'is_main': False}
        )
        for branch in answer.branches
    ]

    assert _version_of_answer(answer.model_copy(update=_relabelled(answer))) == (
        SAMPLE_VERSION
    )
    assert _version_of_answer(answer.model_copy(update={'branches': other_urls})) == (
        SAMPLE_VERSION
    )


DRAFT_CHANGES = [
    pytest.param({}, id='as it is'),
    pytest.param({'step': 'connection'}, id='the step'),
    pytest.param({'version': 8}, id='the save number'),
    pytest.param({'example': 'unchanged'}, id='the example'),
    pytest.param({'next_rule_number': 40, 'next_group_number': 12}, id='the counters'),
    pytest.param(
        {'created_at': '2026-11-10T08:00:00Z', 'updated_at': '2026-11-11T08:00:00Z'},
        id='the times',
    ),
]


@pytest.mark.parametrize('changes', DRAFT_CHANGES)
def test_a_drafts_other_fields_leave_the_version(changes: dict[str, Any]) -> None:
    """The draft of the published sample has the sample's version."""
    assert _version_of_answer(_draft_answer(**changes)) == SAMPLE_VERSION


def test_no_description_is_an_empty_one() -> None:
    content = copy.deepcopy(SAMPLE) | {'description': ''}

    assert fingerprint_of(content) == fingerprint_of(content | {'description': None})


# The publishable form of a condition (data-model.md section 1)


@pytest.mark.parametrize(
    ('stored', 'publishable'),
    [
        pytest.param(
            {'operator': 'contains', 'value': 'Stutt'},
            {'operator': 'contains', 'value': 'Stutt', 'match_case': False},
            id='a missing match_case',
        ),
        pytest.param(
            {'operator': 'not_contains', 'value': 'x', 'match_case': True, 'years': 3},
            {'operator': 'not_contains', 'value': 'x', 'match_case': True},
            id='text, with an extra key',
        ),
        pytest.param(
            {'operator': 'equal_to', 'value': 'Stuttgart', 'values': ['DE']},
            {'operator': 'equal_to', 'value': 'Stuttgart', 'match_case': False},
            id='equal to a text',
        ),
        pytest.param(
            {'operator': 'not_equal_to', 'value': 180.0, 'match_case': True},
            {'operator': 'not_equal_to', 'value': 180.0},
            id='equal to a number',
        ),
        pytest.param(
            {'operator': 'greater_than', 'value': 1.5, 'unit': 'months'},
            {'operator': 'greater_than', 'value': 1.5},
            id='a number',
        ),
        pytest.param(
            {'operator': 'includes_one_of', 'values': ['FR', 'DE'], 'value': 'x'},
            {'operator': 'includes_one_of', 'values': ['FR', 'DE']},
            id='values, in their order',
        ),
        pytest.param(
            {'operator': 'includes_none_of', 'values': ['B'], 'date': '2026-01-31'},
            {'operator': 'includes_none_of', 'values': ['B']},
            id='values, with an extra key',
        ),
        pytest.param(
            {'operator': 'on', 'date': '2026-01-31', 'years': 2},
            {'operator': 'on', 'date': '2026-01-31'},
            id='a date',
        ),
        pytest.param(
            {'operator': 'at_least_years_ago', 'years': 5.0, 'amount': 2},
            {'operator': 'at_least_years_ago', 'years': 5},
            id='years: 5.0',
        ),
        pytest.param(
            {'operator': 'exactly_years_ago', 'years': 2.5},
            {'operator': 'exactly_years_ago', 'years': 2.5},
            id='years that are not whole',
        ),
        pytest.param(
            {'operator': 'less_than_from_now', 'amount': 2.0, 'unit': 'years', 'x': 1},
            {'operator': 'less_than_from_now', 'amount': 2, 'unit': 'years'},
            id='amount: 2.0',
        ),
        pytest.param(
            {'operator': 'at_least_from_now', 'amount': 6, 'years': 1},
            {'operator': 'at_least_from_now', 'amount': 6},
            id='an amount without a unit',
        ),
        pytest.param(
            {'operator': 'equal_to', 'years': 3},
            {'operator': 'equal_to', 'years': 3},
            id='equal to nothing yet',
        ),
        pytest.param(
            {'operator': 'between', 'value': 'x', 'years': 2},
            {'operator': 'between', 'value': 'x', 'years': 2},
            id='an unknown operator',
        ),
    ],
)
def test_the_publishable_form_keeps_only_the_operators_keys(
    stored: dict[str, Any], publishable: dict[str, Any]
) -> None:
    kept = publishable_condition(Condition.model_validate(stored))

    # As JSON, so that 5 and 5.0 differ
    assert json.dumps(kept.model_dump(mode='json'), sort_keys=True) == json.dumps(
        publishable, sort_keys=True
    )


def test_no_condition_and_a_bool_stay_as_they_are() -> None:
    """A bool is no number, though Python counts it as an int."""
    as_bool = Condition.model_construct(operator='equal_to', value=True)

    assert publishable_condition(None) is None
    assert publishable_condition(as_bool) is as_bool


@pytest.mark.parametrize(
    ('rule_target', 'sent'),
    [
        (CLASSES, {'operator': 'includes_one_of', 'values': ['BE', 'B'], 'value': 'x'}),
        (AGE, {'operator': 'less_than_years_ago', 'years': 19.0, 'unit': 'months'}),
        (EXPIRY, {'operator': 'at_least_from_now', 'amount': 2.0, 'unit': 'years'}),
        (EXPIRY, {'operator': 'before', 'date': '2030-01-01', 'match_case': True}),
        (target('pid', 'address_locality'), {'operator': 'contains', 'value': 'S'}),
        (target('pid', 'address_locality'), {'operator': 'equal_to', 'value': 'S'}),
    ],
)
def test_publishing_stores_the_publishable_form(
    rule_target: dict[str, Any], sent: dict[str, Any]
) -> None:
    """`_clean_condition` returns `publishable_condition()`'s result, so the two
    can't drift."""
    documents = [RequestedDocument.model_validate(d) for d in SAMPLE['documents']]
    branch = BranchInput.model_validate(
        _branch(
            STANDARD_ID,
            'Standard',
            None,
            'main',
            [_rule(1, 'R', rule_target, sent, 'No.')],
        )
    )

    [cleaned] = clean_branches([branch], documents, None)

    stored = cleaned.items[0]
    assert isinstance(stored, RuleItem) and stored.condition is not None
    expected = publishable_condition(Condition.model_validate(sent))
    assert json.dumps(stored.condition.model_dump(mode='json')) == json.dumps(
        expected.model_dump(mode='json')
    )


def _draft_as_sent() -> dict[str, Any]:
    """The sample as an editor or an agent may save it: conditions with extra
    keys, without `match_case` and with whole floats (spec 005, FR-004)."""
    draft = copy.deepcopy(SAMPLE)
    standard, taxi, hire_car = (branch['items'] for branch in draft['branches'])
    standard[0]['condition'] = {**_years_ago(21.0), 'value': 'x'}
    # Standard's rule-5 and Taxi's removed copy of it stay equal
    for still_valid in (standard[3], taxi[3]):
        still_valid['condition'] |= {'amount': 6.0, 'years': 2}
    taxi[0]['condition'] = {**_years_ago(23.0), 'unit': 'months'}
    del taxi[4]['condition']['match_case']
    taxi[4]['condition']['values'] = ['DE']
    hire_car[0]['condition'] = _years_ago(21.0)
    hire_car[1]['condition']['date'] = '2026-01-01'
    return draft


def test_a_draft_saved_with_extra_keys_has_the_version_of_what_it_publishes() -> None:
    """FR-031: the stored draft, and the content publishing's checks make of it."""
    draft = _draft_as_sent()
    documents = [RequestedDocument.model_validate(d) for d in draft['documents']]
    sent = [BranchInput.model_validate(branch) for branch in draft['branches']]

    stored = clean_branches(sent, documents, None, complete=False)
    published = clean_branches(sent, documents, None)

    # A draft keeps its conditions as sent; publishing reduces them
    assert stored == sent
    assert published != sent
    assert published == [
        BranchInput.model_validate(branch) for branch in SAMPLE['branches']
    ]
    assert fingerprint_of(draft) == SAMPLE_VERSION
    published_content = draft | {'branches': [b.model_dump() for b in published]}
    assert fingerprint_of(published_content) == SAMPLE_VERSION
