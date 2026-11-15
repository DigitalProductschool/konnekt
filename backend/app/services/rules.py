"""Branches and their rules (specs/002-connection-rules, research R1 to R5, R9).

A form connection's branches and rules are saved as rule sets: immutable, numbered
snapshots of every branch that isn't deleted, main branch first. A branch's identity,
which its pull URL names, is a row of its own. Every form connection has a main
branch, which keeps spec 001's pull URL; every other branch gets one that names it.

A save's rules are checked against the documents it leaves current (FR-006,
data-model.md "Validation"), and each refusal names the problem, the rule and its
branch, in the words of the rules step's own checks (`utils/rules/validation.ts`).
The rules step numbers new rules and groups from the form connection's counters; the
server checks those identifiers and shifts them if another save took the numbers
meanwhile (research R5).

Only the rules step propagates the main branch's changes to the branches based on
it. The server checks that every saved based branch is what a correct propagation
gives, through the invariants of its marks (research R4), so that a propagation bug
can't reach serviceBW.

A draft (specs/005-connection-drafts, research R3 and R4) runs the same checks with
`complete=False`: its structure only, so that a draft may be incomplete but never
malformed. Its identifiers come from its own counters (`number_draft`).
"""

import logging
import math
import re
import uuid
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import cast, overload

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..catalog import (
    LICENCE_CLASSES,
    CatalogField,
    CatalogPart,
    FieldKind,
    get_document_type,
)
from ..config import settings
from ..language import Text
from ..models import FormConnection, FormConnectionBranch, FormConnectionRuleSet
from ..option_sets import OPTION_SETS
from ..schemas import (
    RULE_SET_SNAPSHOT,
    BranchInput,
    Condition,
    GroupItem,
    NumberingBase,
    RequestedDocument,
    RuleItem,
    RulesInput,
    RuleTarget,
    SnapshotBranch,
)
from . import rules_texts as texts
from .evaluation import effective_items
from .rules_texts import (
    DESCRIPTION_MAX_LENGTH,
    INVALID_IDENTIFIER,
    MAX_BRANCHES,
    MAX_ITEMS_PER_BRANCH,
    MESSAGE_MAX_LENGTH,
    NAME_MAX_LENGTH,
    UNKNOWN_BRANCH,
    ItemNoun,
    Label,
)

logger = logging.getLogger(__name__)

MAIN_BRANCH_NAME = 'Standard'

# The size limits (MAX_BRANCHES, …) and the messages, INVALID_IDENTIFIER and
# UNKNOWN_BRANCH among them, are in `rules_texts.py`, in English and German (spec
# 009), so that the fixture script renders them without this module's settings

# The operators of each kind of value, and the keys each one uses
# (data-model.md "Conditions")
NUMBER_OPERATORS = frozenset({'greater_than', 'less_than', 'equal_to', 'not_equal_to'})
TEXT_OPERATORS = frozenset({'equal_to', 'not_equal_to', 'contains', 'not_contains'})
ENUM_OPERATORS = frozenset({'includes_one_of', 'includes_none_of'})
FIXED_DATE_OPERATORS = frozenset({'before', 'after', 'on'})
YEARS_AGO_OPERATORS = frozenset(
    {'at_least_years_ago', 'less_than_years_ago', 'exactly_years_ago'}
)
FROM_NOW_OPERATORS = frozenset({'at_least_from_now', 'less_than_from_now'})
DATE_OPERATORS = FIXED_DATE_OPERATORS | YEARS_AGO_OPERATORS | FROM_NOW_OPERATORS

_RULE_ID = re.compile(r'rule-([1-9][0-9]*)')
_GROUP_ID = re.compile(r'group-([1-9][0-9]*)')
# "Rule 08", "Group 3", "Sub-group 04": kept for the item with that number (FR-005)
_RESERVED_NAME = re.compile(r'(rule|group|sub-group) ([0-9]+)', re.IGNORECASE)
_ISO_DATE = re.compile(r'[0-9]{4}-[0-9]{2}-[0-9]{2}')

TreeItem = RuleItem | GroupItem


def _validation_error(message: Text) -> HTTPException:
    """A 400 whose message `errors.py` answers in the request's language."""
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={'error': 'Validation error', 'message': message},
    )


def _out_of_step(branch_name: Label, main_name: Label) -> HTTPException:
    """A branch that no correct propagation gives (research R4)."""
    return _validation_error(texts.out_of_step(branch_name, main_name))


def main_branch_snapshot(branch_id: str) -> SnapshotBranch:
    """The main branch of a new form connection: "Standard", AND, no rules (FR-018)."""
    return SnapshotBranch(
        id=branch_id,
        name=MAIN_BRANCH_NAME,
        description=None,
        origin='main',
        operator='and',
        operator_mark=None,
        items=[],
    )


def pull_url_of(form_connection_id: str, branch_id: str, is_main: bool) -> str:
    """A branch's pull URL, with the placeholder `{reference}` literally.

    The main branch's is spec 001's pull URL, so the URLs serviceBW already uses
    keep working (FR-018); every other branch's names the branch
    (contracts/integration-api.md).
    """
    connect_url = f'{settings.connection_base_url}/api/connect/{form_connection_id}'
    if is_main:
        return f'{connect_url}/requests/{{reference}}'
    return f'{connect_url}/branches/{branch_id}/requests/{{reference}}'


def walk(items: Sequence[TreeItem]) -> Iterator[tuple[TreeItem, int]]:
    """Every item of a tree with its depth (0 at the top level), in display order.

    An item comes before its members.
    """
    for item in items:
        yield item, 0
        if isinstance(item, GroupItem):
            for member, depth in walk(item.items):
                yield member, depth + 1


def number_of(item_id: str) -> int | None:
    """The number of a `rule-{n}` or `group-{n}` identifier, or None."""
    match = (_RULE_ID if item_id.startswith('rule-') else _GROUP_ID).fullmatch(item_id)
    return int(match.group(1)) if match else None


def _noun(item: TreeItem, depth: int) -> ItemNoun:
    if isinstance(item, RuleItem):
        return 'rule'
    return 'group' if depth == 0 else 'sub-group'


def _folded(name: str) -> str:
    # Names compare ignoring letter case and the spaces around them (FR-005)
    return name.strip().casefold()


# Validation (FR-002 to FR-008, FR-020; data-model.md "Validation"). The checks run
# in the order of the rules step's, and the first problem found is reported.


@dataclass(frozen=True)
class _RequestedField:
    """A field the save requests, with the label of its document type."""

    document_label: str
    field: CatalogField


def _requested_fields(
    documents: Sequence[RequestedDocument],
) -> dict[tuple[str, str], _RequestedField]:
    requested: dict[tuple[str, str], _RequestedField] = {}
    for document in documents:
        document_type = get_document_type(document.document_type)
        if document_type is None:
            continue
        for key in document.fields:
            field = document_type.field(key)
            if field is not None:
                requested[(document_type.key, key)] = _RequestedField(
                    document_type.label, field
                )
    return requested


@dataclass(frozen=True)
class RulesSave:
    """A save's checked branches, and what the editor numbered new items from."""

    branches: list[BranchInput]
    numbering_base: NumberingBase
    # The rule set version the editor loaded; None on create
    base_version: int | None
    # Save over rules another team member saved meanwhile (FR-028)
    replace: bool = False


def clean_rules(
    rules: RulesInput,
    documents: Sequence[RequestedDocument],
    main_branch_id: str | None,
    *,
    complete: bool = True,
) -> RulesSave:
    """Check a save's branches and rules against the documents it leaves current.

    `main_branch_id` is the form connection's main branch, or None while it has
    none (on create, and for a draft). The branches come back as they are stored,
    with names, descriptions and messages trimmed and each condition reduced to its
    operator's keys. On the first problem, answers 400 with a message that names
    it, the rule and its branch (FR-005, FR-006).

    With `complete=False` (saving a draft, spec 005 research R3), only the
    structure is checked, as `clean_branches` describes; a rule's data and check
    are kept as sent.
    """
    return RulesSave(
        branches=clean_branches(
            rules.branches, documents, main_branch_id, complete=complete
        ),
        numbering_base=rules.numbering_base,
        base_version=rules.base_version,
        replace=rules.replace,
    )


def clean_branches(
    branches: Sequence[BranchInput],
    documents: Sequence[RequestedDocument],
    main_branch_id: str | None,
    *,
    complete: bool = True,
) -> list[BranchInput]:
    """`clean_rules` for a list of branches, such as the current rule set's.

    A save that changes the documents without sending rules checks the current
    rules this way against its new documents (FR-006).

    The main branch is checked first, so a problem in an item that the branches
    based on it inherit unchanged is reported once, for the main branch (FR-006).

    With `complete=False` (a draft, spec 005 FR-003 and FR-004), the checks of the
    structure still apply: at most 20 variants; exactly one main variant, first,
    whose id is `main_branch_id`; variant names of at most 100 characters and
    descriptions of at most 500; at most 200 rules and groups per variant; valid
    identifiers, unique in their variant; sub-groups that hold rules only; groups
    (not dissolved) with at least two members; the marks; rule and group names of
    at most 100 characters and messages of at most 500. The completeness checks
    are skipped: names being present, unique and not reserved, a rule's data and
    check, and its message being present. A rule's `target` and `condition` are
    kept as sent. Names, descriptions and messages are still trimmed. A message
    that would name an unnamed variant names its position ("Variant 3", Standard
    being 1), one that would name an unnamed rule or group its identifier.

    A branch's id (spec 007, research R10) is null or a UUID, unique in the save:
    a non-UUID or a repeated one answers "Unknown variant.". A null id gets a new
    UUID, so the branches come back with ids. With `main_branch_id`, the main
    branch's id must be it; without (on create, and for a draft), it may be null or
    a UUID like the others. Whether a UUID is free is the caller's check, with the
    database: `check_draft_branch_ids`, or `_check_branch_ids` for a published
    connection's save.
    """
    if len(branches) > MAX_BRANCHES:
        raise _validation_error(texts.too_many_branches())
    mains = [branch for branch in branches if branch.origin == 'main']
    if (
        len(mains) != 1
        or branches[0].origin != 'main'
        or (main_branch_id is not None and branches[0].id != main_branch_id)
    ):
        raise _validation_error(texts.main_branch())
    # The main branch's id is checked already when the form connection has one
    _check_id_format(branches[1:] if main_branch_id is not None else branches)

    requested = _requested_fields(documents)
    cleaned: list[BranchInput] = []
    names: set[str] = set()
    for position, branch in enumerate(branches, start=1):
        name = _branch_name(branch.name, names, complete=complete)
        main = cleaned[0] if cleaned else None
        cleaned.append(
            _clean_branch(
                branch,
                name,
                _variant_label(name, position),
                requested,
                main,
                complete=complete,
            )
        )
    return cleaned


def _is_uuid(value: str) -> bool:
    """Whether `value` is a UUID in its canonical form, as pull URLs carry it."""
    try:
        return str(uuid.UUID(value)) == value
    except ValueError:
        return False


def _check_id_format(branches: Sequence[BranchInput]) -> None:
    """Every branch id is null or a UUID, once in the save (research R10)."""
    seen: set[str] = set()
    for branch in branches:
        if branch.id is None:
            continue
        if not _is_uuid(branch.id) or branch.id in seen:
            raise _validation_error(UNKNOWN_BRANCH)
        seen.add(branch.id)


def _variant_label(name: str, position: int) -> Text:
    """How a message names a variant: its name, or "Variant <n>" while it has none.

    Only a draft's variant can be unnamed (spec 005, data-model.md "Validation").
    """
    return texts.variant_label(name, position)


def _branch_name(value: str, earlier_names: set[str], *, complete: bool) -> str:
    name = value.strip()
    if complete and not name:
        raise _validation_error(texts.branch_name_missing())
    if len(name) > NAME_MAX_LENGTH:
        raise _validation_error(texts.branch_name_too_long())
    if not complete:
        # A draft's variants may be unnamed or share a name (spec 005, FR-004)
        return name
    if _folded(name) in earlier_names:
        raise _validation_error(texts.branch_name_twice(name))
    earlier_names.add(_folded(name))
    return name


@dataclass(frozen=True)
class _TakenName:
    """A name taken in a branch, by the item that holds it or may get it back."""

    noun: ItemNoun
    name: str
    owner_id: str


@dataclass(frozen=True)
class _BranchCheck:
    """What the checks of one branch's items need."""

    # How messages name the branch (`_variant_label`)
    name: Text
    requested: dict[tuple[str, str], _RequestedField]
    # Taken names by their folded form, filled while the items are checked
    names: dict[str, _TakenName]
    # In a branch based on the main branch: the main branch's checked items by
    # identifier, with their nouns there. None in every other branch
    inherited: dict[str, tuple[TreeItem, ItemNoun]] | None
    out_of_step: HTTPException
    # False for a draft: the structure only (spec 005, research R3)
    complete: bool


def _clean_branch(
    branch: BranchInput,
    name: str,
    label: Text,
    requested: dict[tuple[str, str], _RequestedField],
    main: BranchInput | None,
    *,
    complete: bool,
) -> BranchInput:
    """Check one branch. `main` is the checked main branch, or None for itself.

    `name` is the branch's trimmed name, `label` how messages name it.
    """
    description = (branch.description or '').strip() or None
    if description is not None and len(description) > DESCRIPTION_MAX_LENGTH:
        raise _validation_error(texts.description_too_long(label))
    entries = list(walk(branch.items))
    if len(entries) > MAX_ITEMS_PER_BRANCH:
        raise _validation_error(texts.too_many_items(label))
    identifiers: set[str] = set()
    for item, _depth in entries:
        expected = _RULE_ID if isinstance(item, RuleItem) else _GROUP_ID
        if not expected.fullmatch(item.id) or item.id in identifiers:
            raise _validation_error(INVALID_IDENTIFIER)
        identifiers.add(item.id)

    out_of_step = _out_of_step(label, _variant_label(main.name, 1) if main else label)
    inherited: dict[str, tuple[TreeItem, ItemNoun]] | None = None
    if branch.origin == 'based' and main is not None:
        inherited = {
            item.id: (item, _noun(item, depth)) for item, depth in walk(main.items)
        }
        _check_marks(branch, entries, main, inherited, out_of_step)
    elif branch.operator_mark is not None or any(
        item.mark is not None for item, _depth in entries
    ):
        # Marks appear only in branches based on the main branch
        raise out_of_step

    check = _BranchCheck(
        name=label,
        requested=requested,
        names=_names_taken_by_undo(entries, inherited),
        inherited=inherited,
        out_of_step=out_of_step,
        complete=complete,
    )
    return branch.model_copy(
        update={
            # A branch added without an id gets one now (spec 007, research R10)
            'id': branch.id or str(uuid.uuid4()),
            'name': name,
            'description': description,
            'items': [_clean_item(item, 0, check) for item in branch.items],
        }
    )


def _check_marks(
    branch: BranchInput,
    entries: Sequence[tuple[TreeItem, int]],
    main: BranchInput,
    inherited: Mapping[str, tuple[TreeItem, ItemNoun]],
    out_of_step: HTTPException,
) -> None:
    """The marks of a branch based on the main branch (research R4).

    data-model.md, "Marks in a based branch" and "Validation". Every item of the
    main branch appears in it once, unmarked, `changed` or `removed`; every other
    item is the branch's own, marked `added`. The top level's AND/OR follows the
    main branch's until the branch switches it (`operator_mark`). The items'
    contents are compared while they are checked (`_check_follows`).
    """
    if branch.operator_mark is None and branch.operator != main.operator:
        raise out_of_step
    for item, _depth in entries:
        if (item.id in inherited) == (item.mark == 'added'):
            raise out_of_step
    # The identifiers are unique within the branch, so each appears once
    if not inherited.keys() <= {item.id for item, _depth in entries}:
        raise out_of_step


def _names_taken_by_undo(
    entries: Sequence[tuple[TreeItem, int]],
    inherited: Mapping[str, tuple[TreeItem, ItemNoun]] | None,
) -> dict[str, _TakenName]:
    """The main branch's names of the items a based branch changed (FR-005).

    An undo would bring them back, so no other item of the branch may take them.
    The names of removed items are taken too, as the items' own names.
    """
    taken: dict[str, _TakenName] = {}
    for item, _depth in entries:
        if inherited is not None and item.mark == 'changed':
            original, noun = inherited[item.id]
            taken[_folded(original.name)] = _TakenName(noun, original.name, item.id)
    return taken


@dataclass(frozen=True)
class _Subject:
    """The rule or group a message is about: its name and its branch's label."""

    item: str
    branch: Label


def _condition_problem(subject: _Subject, problem: str) -> HTTPException:
    """The 400 of a condition problem without a parameter ("choose a check.")."""
    return _validation_error(
        texts.condition_problem(
            subject.item, subject.branch, texts.CONDITION_PROBLEMS[problem]
        )
    )


def _clean_item(item: TreeItem, depth: int, check: _BranchCheck) -> TreeItem:
    noun = _noun(item, depth)
    name = _item_name(item, noun, check)
    # An unnamed item of a draft is named by its identifier (spec 005)
    subject = _Subject(name or item.id, check.name)
    if isinstance(item, GroupItem):
        _check_members(item, depth, subject, check)
        message = (item.message or '').strip() or None
        if message is not None and len(message) > MESSAGE_MAX_LENGTH:
            raise _validation_error(
                texts.message_too_long(subject.item, subject.branch)
            )
        cleaned_group = item.model_copy(update={'name': name, 'message': message})
        _check_follows(cleaned_group, check)
        return cleaned_group.model_copy(
            update={
                'items': [
                    _clean_item(member, depth + 1, check) for member in item.items
                ]
            }
        )
    condition = item.condition
    if check.complete:
        target, kind, entry = _clean_target(item.target, subject, check.requested)
        if item.condition is None:
            raise _condition_problem(subject, 'choose_check')
        condition = _clean_condition(item.condition, kind, entry, target, subject)
    # A draft's rule keeps its data and check as sent (spec 005, FR-004)
    message = item.message.strip()
    if check.complete and not message:
        raise _validation_error(texts.no_message(subject.item, subject.branch))
    if len(message) > MESSAGE_MAX_LENGTH:
        raise _validation_error(texts.message_too_long(subject.item, subject.branch))
    cleaned_rule = item.model_copy(
        update={'name': name, 'condition': condition, 'message': message}
    )
    _check_follows(cleaned_rule, check)
    return cleaned_rule


def _check_members(
    group: GroupItem, depth: int, subject: _Subject, check: _BranchCheck
) -> None:
    """A group holds rules and sub-groups, a sub-group rules only (FR-008).

    Each needs at least two members that count (`effective_items`): those a based
    branch removed don't. In a based branch, an inherited group with fewer is
    dissolved there and stays, so that it counts again once two members do
    (data-model.md, "Dissolution"); a group the branch added needs two.
    """
    if depth > 0 and any(isinstance(member, GroupItem) for member in group.items):
        raise _validation_error(texts.rules_only(subject.item, subject.branch))
    based = check.inherited is not None
    if based and group.mark != 'added':
        return
    if len(effective_items(group.items, based)) < 2:
        raise _validation_error(texts.too_few_members(subject.item, subject.branch))


def _change_of(item: TreeItem) -> tuple[object, ...]:
    """What counts as a change of a checked rule or group (FR-022).

    data-model.md, "Equal": a rule's target, condition, message and name; a group's
    AND/OR, name and message. Never a group's members or an item's place.
    """
    if isinstance(item, RuleItem):
        return (
            item.name,
            item.target.model_dump() if item.target else None,
            item.condition.model_dump() if item.condition else None,
            item.message,
        )
    return (item.name, item.operator, item.message)


def _check_follows(item: TreeItem, check: _BranchCheck) -> None:
    """An unmarked or removed item of a based branch equals the main branch's.

    A `changed` item may equal it too, after a change in the main branch (FR-024).
    """
    if check.inherited is None or item.mark not in (None, 'removed'):
        return
    original, _noun_there = check.inherited[item.id]
    if _change_of(item) != _change_of(original):
        raise check.out_of_step


def _item_name(item: TreeItem, noun: ItemNoun, check: _BranchCheck) -> str:
    """Check a rule's or group's name against the names taken in its branch.

    Those are the names of the items checked before it, and in a based branch the
    main branch's names of the items changed there (FR-005). A draft's names are
    only trimmed and limited in length: they may be empty, shared or reserved
    (spec 005, research R3).
    """
    name = item.name.strip()
    if check.complete and not name:
        raise _validation_error(texts.item_name_missing(noun, check.name))
    if len(name) > NAME_MAX_LENGTH:
        raise _validation_error(texts.item_name_too_long(noun, check.name))
    if not check.complete:
        return name
    earlier = check.names.get(_folded(name))
    if earlier is not None and earlier.owner_id != item.id:
        raise _validation_error(
            texts.name_taken(earlier.noun, check.name, earlier.name)
        )
    reserved = reserved_name_problem(name, item)
    if reserved is not None:
        raise _validation_error(reserved)
    check.names[_folded(name)] = _TakenName(noun, name, item.id)
    return name


def reserved_name_problem(name: str, item: TreeItem) -> Text | None:
    """Why `name` is kept for another item, or None (FR-005).

    "Rule NN" belongs to the rule `rule-{NN}`, "Group NN" and "Sub-group NN" to the
    group `group-{NN}`, with or without leading zeros.
    """
    match = _RESERVED_NAME.fullmatch(name.strip())
    if match is None:
        return None
    word = cast(ItemNoun, match.group(1).lower())
    number = int(match.group(2))
    owner_id = f'rule-{number}' if word == 'rule' else f'group-{number}'
    if item.id == owner_id:
        return None
    return texts.name_reserved(name.strip(), word, f'{number:02d}')


def _clean_target(
    target: RuleTarget | None,
    subject: _Subject,
    requested: dict[tuple[str, str], _RequestedField],
) -> tuple[RuleTarget, FieldKind, _RequestedField]:
    """Check what a rule checks; return it with its kind of value (FR-002, FR-003)."""
    choose_data = _validation_error(texts.choose_data(subject.item, subject.branch))
    if target is None:
        raise choose_data
    entry = requested.get((target.document_type, target.field))
    if entry is None or entry.field.kind == 'image':
        raise _validation_error(texts.not_requested(subject.item, subject.branch))
    field = entry.field
    wrong_part = _validation_error(
        texts.unknown_part(
            subject.item, subject.branch, Text(en=field.label, de=field.label_de)
        )
    )
    if field.parts is None:
        if target.part is not None or target.licence_class is not None:
            raise wrong_part
        return target, field.kind, entry
    if target.part is None:
        raise choose_data
    part = _part_of(field, target.part)
    if part is None:
        raise wrong_part
    if part.per_licence_class:
        if target.licence_class is None:
            raise choose_data
        if target.licence_class not in _option_values(LICENCE_CLASSES):
            raise wrong_part
    elif target.licence_class is not None:
        raise wrong_part
    return target, part.kind, entry


def _part_of(field: CatalogField, key: str) -> CatalogPart | None:
    return next((part for part in field.parts or () if part.key == key), None)


def _option_values(option_set: str) -> list[str | int]:
    return [option.value for option in OPTION_SETS[option_set]]


def _enum_set(field: CatalogField, target: RuleTarget) -> str | None:
    if field.parts is not None and target.part is not None:
        part = _part_of(field, target.part)
        return part.option_set if part else None
    return field.option_set


@overload
def publishable_condition(condition: Condition) -> Condition: ...


@overload
def publishable_condition(condition: None) -> None: ...


def publishable_condition(condition: Condition | None) -> Condition | None:
    """A condition with only the keys its operator uses, as publishing stores it.

    The key selection of `_clean_condition`, without any check (spec 011,
    data-model.md section 1, "The publishable form of a condition"), so that a
    complete draft and the connection publishing makes of it have one version:

    - `contains`, `not_contains`, and `equal_to`, `not_equal_to` with a text
      `value`: `operator`, `value` and `match_case`, false when absent;
    - `greater_than`, `less_than`, and `equal_to`, `not_equal_to` with a number
      `value` (a bool isn't one): `operator` and `value`;
    - `includes_one_of`, `includes_none_of`: `operator` and `values`, in order;
    - `before`, `after`, `on`: `operator` and `date`;
    - the years-ago operators: `operator` and `years`, a whole float as an int;
    - the from-now operators: `operator`, `amount`, a whole float as an int, and
      `unit`.

    Any other condition, such as a draft's unfinished one, and no condition stay
    as they are.
    """
    if condition is None:
        return None
    operator = condition.operator
    value = condition.value
    if operator in TEXT_OPERATORS and (
        operator not in NUMBER_OPERATORS or isinstance(value, str)
    ):
        return Condition(
            operator=operator, value=value, match_case=bool(condition.match_case)
        )
    if operator in NUMBER_OPERATORS and (
        operator not in TEXT_OPERATORS or _is_number(value)
    ):
        return Condition(operator=operator, value=value)
    if operator in ENUM_OPERATORS:
        values = None if condition.values is None else list(condition.values)
        return Condition(operator=operator, values=values)
    if operator in FIXED_DATE_OPERATORS:
        return Condition(operator=operator, date=condition.date)
    if operator in YEARS_AGO_OPERATORS:
        return Condition(operator=operator, years=_int_if_whole(condition.years))
    if operator in FROM_NOW_OPERATORS:
        return Condition(
            operator=operator,
            amount=_int_if_whole(condition.amount),
            unit=condition.unit,
        )
    return condition


def _is_number(value: object) -> bool:
    """Whether `value` is a number; True and False are not, though bool is an int."""
    return isinstance(value, float | int) and not isinstance(value, bool)


def _int_if_whole(value: float | None) -> float | None:
    """A whole float as an int (`5.0` → `5`); any other value as it is."""
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def _clean_condition(
    condition: Condition,
    kind: FieldKind,
    entry: _RequestedField,
    target: RuleTarget,
    subject: _Subject,
) -> Condition:
    """Check a condition against its target's kind; keep only its operator's keys.

    The keys kept are `publishable_condition()`'s, applied to the condition the
    checks accepted, so that the condition publishing stores and the one a draft's
    version hashes can't drift (spec 011, data-model.md section 1).
    """
    operator = condition.operator
    if kind == 'number' and operator in NUMBER_OPERATORS:
        value = condition.value
        if not isinstance(value, float | int) or not math.isfinite(value):
            raise _condition_problem(subject, 'enter_number')
    elif kind == 'text' and operator in TEXT_OPERATORS:
        if not isinstance(condition.value, str) or not condition.value.strip():
            raise _condition_problem(subject, 'enter_text')
    elif kind == 'enum' and operator in ENUM_OPERATORS:
        _enum_values(condition, entry.field, target, subject)
    elif kind == 'date' and operator in FIXED_DATE_OPERATORS:
        if not _is_date(condition.date):
            raise _condition_problem(subject, 'enter_date')
    elif kind == 'date' and operator in YEARS_AGO_OPERATORS:
        if _whole_number(condition.years) is None:
            raise _condition_problem(subject, 'years_at_least_1')
    elif kind == 'date' and operator in FROM_NOW_OPERATORS:
        unit = condition.unit
        if unit not in ('years', 'months'):
            raise _condition_problem(subject, 'choose_unit')
        if _whole_number(condition.amount) is None:
            raise _validation_error(
                texts.condition_problem(
                    subject.item, subject.branch, texts.amount_at_least_1(unit)
                )
            )
    else:
        raise _condition_problem(subject, 'choose_check')
    return publishable_condition(condition)


def _enum_values(
    condition: Condition, field: CatalogField, target: RuleTarget, subject: _Subject
) -> list[str | int]:
    values = condition.values or []
    if not values:
        raise _condition_problem(subject, 'choose_value')
    option_set = _enum_set(field, target)
    allowed = _option_values(option_set) if option_set else []
    seen: list[str | int] = []
    for value in values:
        # 1 and True are equal in Python, but True is never a value of a set
        if isinstance(value, bool) or value not in allowed:
            raise _condition_problem(subject, 'values_from_list')
        if value in seen:
            raise _condition_problem(subject, 'value_once')
        seen.append(value)
    return seen


def _is_date(value: str | None) -> bool:
    if value is None or not _ISO_DATE.fullmatch(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _whole_number(value: float | None) -> int | None:
    """A whole number of at least 1, as an int, or None (FR-003)."""
    if value is None or isinstance(value, bool) or not math.isfinite(value):
        return None
    if value != int(value) or value < 1:
        return None
    return int(value)


# Identifiers (research R5, FR-010)


@dataclass(frozen=True)
class _Numbering:
    """How a save's new identifiers are renumbered, and the counters after it."""

    renumbered: dict[str, str]
    next_rule_number: int
    next_group_number: int


def _identifiers(branches: Sequence[BranchInput | SnapshotBranch]) -> set[str]:
    return {item.id for branch in branches for item, _depth in walk(branch.items)}


def _allocate(
    branches: Sequence[BranchInput],
    numbering_base: NumberingBase,
    known: set[str],
    loaded: set[str],
    counters: tuple[int, int],
) -> _Numbering:
    """Check a save's identifiers, and renumber its new ones (research R5).

    `counters` are the form connection's next rule and group numbers. `loaded` holds
    the identifiers of the rule set the editor loaded, `known` those of every rule
    set the editor could have seen (the loaded one and the current one). An
    identifier of the loaded rule set is the same rule or group, also when another
    save deleted it meanwhile: it comes back under its identifier (FR-028). Any
    other identifier is one the editor numbered from `numbering_base`, so it is new
    and at or above the base; one below the base that the editor can't have seen is
    refused. If another save took numbers since the base, new identifiers move up by
    the difference, the same way in every branch, so that no identifier is reused
    within the form connection.
    """
    bases = {'rule': numbering_base.rule, 'group': numbering_base.group}
    next_numbers = {'rule': counters[0], 'group': counters[1]}
    shifts = {kind: max(0, next_numbers[kind] - bases[kind]) for kind in bases}
    highest = {kind: next_numbers[kind] - 1 for kind in bases}
    renumbered: dict[str, str] = {}
    for item_id in sorted(_identifiers(branches)):
        kind = 'rule' if item_id.startswith('rule-') else 'group'
        number = number_of(item_id)
        if number is None:
            raise _validation_error(INVALID_IDENTIFIER)
        if item_id in loaded or (item_id in known and number < bases[kind]):
            highest[kind] = max(highest[kind], number)
            continue
        if number < bases[kind]:
            raise _validation_error(INVALID_IDENTIFIER)
        new_number = number + shifts[kind]
        if new_number != number:
            renumbered[item_id] = f'{kind}-{new_number}'
        highest[kind] = max(highest[kind], new_number)
    return _Numbering(
        renumbered=renumbered,
        next_rule_number=max(next_numbers['rule'], highest['rule'] + 1),
        next_group_number=max(next_numbers['group'], highest['group'] + 1),
    )


def _renumber_items(
    items: Sequence[TreeItem], renumbered: dict[str, str]
) -> list[TreeItem]:
    """Give new items their final identifiers, and default names their numbers."""
    result: list[TreeItem] = []
    for item in items:
        update: dict[str, object] = {}
        new_id = renumbered.get(item.id)
        if new_id is not None:
            update['id'] = new_id
            update['name'] = _renamed_default(item.name, item.id, new_id)
        if isinstance(item, GroupItem):
            update['items'] = _renumber_items(item.items, renumbered)
        result.append(item.model_copy(update=update) if update else item)
    return result


def _renamed_default(name: str, old_id: str, new_id: str) -> str:
    """'Rule 03' for rule-3 becomes 'Rule 05' for rule-5; other names stay."""
    match = _RESERVED_NAME.fullmatch(name)
    if match is None or reserved_name_problem(name, _probe(old_id)) is not None:
        return name
    word = {'rule': 'Rule', 'group': 'Group', 'sub-group': 'Sub-group'}[
        match.group(1).lower()
    ]
    return f'{word} {number_of(new_id):02d}'


def _probe(item_id: str) -> TreeItem:
    """A stand-in item with this identifier, for `reserved_name_problem`."""
    if item_id.startswith('rule-'):
        return RuleItem(type='rule', id=item_id, name='', message='')
    return GroupItem(type='group', id=item_id, name='', operator='and', items=[])


# Saving (research R9). The checks run once before EUDIPLO is called, so that a
# refused save writes nothing, and again under the form connection's row lock.


def _rule_set(
    db: Session, form_connection_id: str, version: int
) -> FormConnectionRuleSet | None:
    return db.scalars(
        select(FormConnectionRuleSet).where(
            FormConnectionRuleSet.form_connection_id == form_connection_id,
            FormConnectionRuleSet.version == version,
        )
    ).one_or_none()


def _current_rule_set(form_connection: FormConnection) -> int:
    """The rule set version new requests use (spec 005, research R8).

    A draft has none. Only published connections reach the readers of the current
    rules, since their callers refuse drafts first, so a draft here is a bug.
    """
    if form_connection.current_rule_set is None:
        raise LookupError(f'Form connection {form_connection.id} is a draft')
    return form_connection.current_rule_set


def current_branches(
    db: Session, form_connection: FormConnection
) -> list[SnapshotBranch]:
    """The branches of a published form connection's current rule set, main branch
    first. A draft has none and raises `LookupError`.
    """
    version = _current_rule_set(form_connection)
    rule_set = _rule_set(db, form_connection.id, version)
    if rule_set is None:
        raise LookupError(
            f'Form connection {form_connection.id} has no rule set {version}'
        )
    return RULE_SET_SNAPSHOT.validate_python(rule_set.branches)


def main_branch_id_of(db: Session, form_connection_id: str) -> str | None:
    """The id of a form connection's main branch, or None."""
    return db.scalar(
        select(FormConnectionBranch.id).where(
            FormConnectionBranch.form_connection_id == form_connection_id,
            FormConnectionBranch.is_main.is_(True),
        )
    )


def _loaded_branches(
    db: Session,
    form_connection: FormConnection,
    base_version: int | None,
    current: list[SnapshotBranch],
) -> list[SnapshotBranch]:
    """The branches of the rule set the editor loaded; the current ones by default."""
    if base_version is None or base_version == _current_rule_set(form_connection):
        return current
    rule_set = _rule_set(db, form_connection.id, base_version)
    return RULE_SET_SNAPSHOT.validate_python(rule_set.branches) if rule_set else []


def _live_branch_ids(db: Session, form_connection_id: str) -> set[str]:
    return set(
        db.scalars(
            select(FormConnectionBranch.id).where(
                FormConnectionBranch.form_connection_id == form_connection_id,
                FormConnectionBranch.deleted_at.is_(None),
            )
        )
    )


def _taken_branch_ids(
    db: Session, branches: Sequence[BranchInput], form_connection_id: str | None
) -> set[str]:
    """The save's branch ids that have a row: any form connection's but
    `form_connection_id`'s, deleted or not."""
    ids = {branch.id for branch in branches if branch.id is not None}
    if not ids:
        return set()
    query = select(FormConnectionBranch.id).where(FormConnectionBranch.id.in_(ids))
    if form_connection_id is not None:
        query = query.where(
            FormConnectionBranch.form_connection_id != form_connection_id
        )
    return set(db.scalars(query))


def check_draft_branch_ids(
    db: Session, form_connection_id: str | None, branches: Sequence[BranchInput]
) -> None:
    """Refuse a branch id that another form connection's branch has (research R10).

    For the branches of a draft, or of a form connection without branch rows yet
    (`form_connection_id` is None while it has no id): such a branch's id becomes
    its row's when it is published (FR-029), and a branch's id is never reused,
    also not a deleted one's. `clean_branches` has checked that every id is a UUID,
    once in the save. Answers 400 "Unknown variant.".
    """
    if _taken_branch_ids(db, branches, form_connection_id):
        raise _validation_error(UNKNOWN_BRANCH)


def _returning_ids(
    branches: Sequence[BranchInput],
    loaded: Sequence[SnapshotBranch],
    live_ids: set[str],
) -> set[str]:
    """The ids of a save's branches that another save deleted since it loaded them."""
    loaded_ids = {branch.id for branch in loaded}
    return {
        branch.id
        for branch in branches
        if branch.id is not None
        and branch.id in loaded_ids
        and branch.id not in live_ids
    }


def check_rules_version(
    db: Session, form_connection: FormConnection, rules: RulesInput | RulesSave
) -> None:
    """Refuse a save over rules another team member saved meanwhile (FR-028).

    Unless the save replaces them, it must be based on the current rule set;
    otherwise it is refused with 409 `rules_changed`. Its message names the
    variants that replacing would delete (the current ones the save leaves out) and
    bring back with a new pull URL (the save's ones that another save deleted).
    It runs before the rules are checked, so that a stale editor meets this answer
    and not a refusal that its staleness causes, such as "Unknown variant.", and
    again under the row lock (research R9). A draft has no rules to be stale
    against and raises `LookupError`: its callers refuse drafts first.
    """
    if rules.replace or rules.base_version == _current_rule_set(form_connection):
        return
    current = current_branches(db, form_connection)
    saved_ids = {branch.id for branch in rules.branches if branch.id is not None}
    deleted = [
        branch.name
        for branch in current
        if branch.origin != 'main' and branch.id not in saved_ids
    ]
    returning_ids = _returning_ids(
        rules.branches,
        _loaded_branches(db, form_connection, rules.base_version, current),
        _live_branch_ids(db, form_connection.id),
    )
    returning = [
        branch.name.strip() for branch in rules.branches if branch.id in returning_ids
    ]
    raise _rules_changed(deleted, returning)


def _rules_changed(deleted: Sequence[str], returning: Sequence[str]) -> HTTPException:
    """The 409 of a stale save, in the UI's words: "variant", "result link"."""
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            'error': 'rules_changed',
            'message': texts.rules_changed(deleted, returning),
        },
    )


@dataclass(frozen=True)
class _Plan:
    """What saving a rule set would do: its numbering and its branches as saved."""

    current: list[SnapshotBranch]
    numbering: _Numbering
    # The save's branches, with the id of a branch that comes back dropped
    branches: list[BranchInput]
    # The form connection's branches that aren't deleted
    live_ids: set[str]


def _plan(db: Session, form_connection: FormConnection, save: RulesSave) -> _Plan:
    check_rules_version(db, form_connection, save)
    current = current_branches(db, form_connection)
    loaded = _loaded_branches(db, form_connection, save.base_version, current)
    loaded_ids = _identifiers(loaded)
    numbering = _allocate(
        save.branches,
        save.numbering_base,
        loaded_ids | _identifiers(current),
        loaded_ids,
        (form_connection.next_rule_number, form_connection.next_group_number),
    )
    live_ids = _live_branch_ids(db, form_connection.id)
    branches = save.branches
    if save.replace:
        # A branch that another save deleted comes back as a new branch, with a new
        # pull URL: the deleted one's answers "unavailable" for good (FR-027, FR-028)
        returning = _returning_ids(save.branches, loaded, live_ids)
        branches = [
            branch.model_copy(update={'id': None}) if branch.id in returning else branch
            for branch in save.branches
        ]
    _check_branch_ids(
        branches,
        live_ids,
        {branch.id: branch.origin for branch in current},
        _taken_branch_ids(db, branches, None) - live_ids,
    )
    return _Plan(
        current=current, numbering=numbering, branches=branches, live_ids=live_ids
    )


def _check_branch_ids(
    branches: Sequence[BranchInput],
    live_ids: set[str],
    origins: Mapping[str, str],
    taken: set[str],
) -> None:
    """A saved branch keeps its id and its origin (FR-019, FR-025).

    An id is a live branch of this form connection's, or a new branch's (spec 007,
    research R10): one that no branch row has, which `clean_branches` assigned or
    the editor chose. Once in the save. `taken` are the ids that have a row and
    aren't live branches of this form connection's: another form connection's
    branch and a deleted one are unknown, since a branch's id is never reused.
    `origins` are the current branches' origins, which are fixed when a branch is
    added.
    """
    main_name = branches[0].name if branches else ''
    seen: set[str] = set()
    for branch in branches:
        if branch.id is None:
            continue
        if branch.id in taken or branch.id in seen:
            raise _validation_error(UNKNOWN_BRANCH)
        seen.add(branch.id)
        if branch.id in live_ids and origins.get(branch.id) != branch.origin:
            raise _out_of_step(branch.name, main_name)


def _saved_branches(
    db: Session,
    form_connection_id: str,
    branches: Sequence[BranchInput],
    numbering: _Numbering,
    live_ids: set[str],
) -> list[SnapshotBranch]:
    """The branches as stored, with their final identifiers (FR-025, research R5).

    A branch whose id isn't one of `live_ids` is new: it gets its row with that id,
    the draft's or the editor's (spec 007, research R10), or a new UUID4 if it has
    none; its pull URL names it for good.
    """
    saved: list[SnapshotBranch] = []
    for branch in branches:
        branch_id = branch.id or str(uuid.uuid4())
        if branch_id not in live_ids:
            db.add(
                FormConnectionBranch(
                    id=branch_id,
                    form_connection_id=form_connection_id,
                    is_main=branch.origin == 'main',
                )
            )
        saved.append(
            SnapshotBranch.model_validate(
                {
                    **branch.model_dump(),
                    'id': branch_id,
                    'items': _renumber_items(branch.items, numbering.renumbered),
                }
            )
        )
    return saved


def check_save(db: Session, form_connection: FormConnection, save: RulesSave) -> None:
    """Refuse a save that `save_rule_set` would refuse: a stale one, or one whose
    identifiers or branch ids are wrong.

    Runs in the read transaction before EUDIPLO is called; writes nothing.
    """
    _plan(db, form_connection, save)


def save_rule_set(
    db: Session, form_connection: FormConnection, save: RulesSave
) -> list[SnapshotBranch]:
    """Save cleaned branches as the form connection's current rules (research R9).

    The caller holds the form connection's row lock and commits; nothing here
    commits. A save over rules saved since its `base_version` is refused unless it
    replaces them (`check_rules_version`). New identifiers are checked and
    renumbered (`_allocate`), branches without an id get their row, as does a branch
    that a replaced save deleted, and the current rule set's branches that the save
    leaves out are marked deleted, so their pull URLs answer "unavailable" for good
    (FR-027). The next rule set version is added only when the snapshot differs
    from the current one. Returns the branches as saved.
    """
    plan = _plan(db, form_connection, save)
    saved = _saved_branches(
        db, form_connection.id, plan.branches, plan.numbering, plan.live_ids
    )

    kept = {branch.id for branch in saved}
    now = datetime.now(tz=timezone.utc)
    for branch in plan.current:
        if branch.id not in kept:
            row = db.get(FormConnectionBranch, branch.id)
            if row is not None and not row.is_main and row.deleted_at is None:
                row.deleted_at = now

    form_connection.next_rule_number = plan.numbering.next_rule_number
    form_connection.next_group_number = plan.numbering.next_group_number
    snapshot = RULE_SET_SNAPSHOT.dump_python(saved, mode='json')
    if snapshot != RULE_SET_SNAPSHOT.dump_python(plan.current, mode='json'):
        latest = db.scalar(
            select(func.max(FormConnectionRuleSet.version)).where(
                FormConnectionRuleSet.form_connection_id == form_connection.id
            )
        )
        version = (latest or 0) + 1
        db.add(
            FormConnectionRuleSet(
                form_connection_id=form_connection.id,
                version=version,
                branches=snapshot,
            )
        )
        form_connection.current_rule_set = version
        logger.info(
            'Form connection %s: rule set %s saved', form_connection.id, version
        )
    return saved


def _first_numbering(
    save: RulesSave, counters: tuple[int, int] | None = None
) -> _Numbering:
    """Check and renumber the identifiers of rules that have no rule set yet.

    Without `counters`, a new form connection's: the counters start at (1, 1) and
    no identifier counts as loaded. With them, a draft's (spec 005, research R4):
    the counters are the row's, and an identifier below `save.numbering_base`
    counts as loaded and keeps its number; one at or above it is new and moves up
    past the numbers taken meanwhile. Branch ids are kept: `clean_branches` checked
    their form, and `first_rule_set` checks that no other form connection has them
    (spec 007, research R10).
    """
    if counters is None:
        return _allocate(save.branches, save.numbering_base, set(), set(), (1, 1))
    bases = {'rule': save.numbering_base.rule, 'group': save.numbering_base.group}
    loaded: set[str] = set()
    for item_id in _identifiers(save.branches):
        number = number_of(item_id)
        kind = 'rule' if item_id.startswith('rule-') else 'group'
        if number is not None and number < bases[kind]:
            loaded.add(item_id)
    return _allocate(save.branches, save.numbering_base, loaded, loaded, counters)


def check_first_save(save: RulesSave, counters: tuple[int, int] | None = None) -> None:
    """Refuse a new form connection's rules whose identifiers `first_rule_set`
    would refuse; whether its branch ids are free needs the database
    (`check_draft_branch_ids`).

    Publishing a draft passes the row's counters (`_first_numbering`).
    """
    _first_numbering(save, counters)


def first_rule_set(
    db: Session,
    form_connection: FormConnection,
    save: RulesSave | None,
    counters: tuple[int, int] | None = None,
) -> list[SnapshotBranch]:
    """Add a new form connection's branch rows and rule set 1 (FR-018, research R9).

    Without `save`, the form connection gets the main branch "Standard" without
    rules. Its counters start at 1, or stay at `counters`. Publishing a draft
    passes the row's counters, so that its rules keep the numbers they had in the
    draft and the counters never go down (spec 005, research R4). The branch rows
    take the branches' ids, so a draft's variants keep theirs (spec 007, FR-029);
    an id that another form connection's branch has answers 400 "Unknown variant."
    The caller has added the form connection, and commits.
    """
    if save is None:
        saved = [main_branch_snapshot(str(uuid.uuid4()))]
        db.add(
            FormConnectionBranch(
                id=saved[0].id, form_connection_id=form_connection.id, is_main=True
            )
        )
        next_rule_number, next_group_number = counters or (1, 1)
        numbering = _Numbering(
            renumbered={},
            next_rule_number=next_rule_number,
            next_group_number=next_group_number,
        )
    else:
        numbering = _first_numbering(save, counters)
        check_draft_branch_ids(db, form_connection.id, save.branches)
        saved = _saved_branches(db, form_connection.id, save.branches, numbering, set())
    db.add(
        FormConnectionRuleSet(
            form_connection_id=form_connection.id,
            version=1,
            branches=RULE_SET_SNAPSHOT.dump_python(saved, mode='json'),
        )
    )
    form_connection.current_rule_set = 1
    form_connection.next_rule_number = numbering.next_rule_number
    form_connection.next_group_number = numbering.next_group_number
    return saved


@dataclass(frozen=True)
class DraftNumbering:
    """A draft's branches with their final identifiers, and its counters after."""

    branches: list[BranchInput]
    next_rule_number: int
    next_group_number: int


def number_draft(save: RulesSave, counters: tuple[int, int]) -> DraftNumbering:
    """Number a draft's rules and groups from its counters (spec 005, research R4).

    `counters` are (1, 1) when a draft is created, and the row's, read under its
    lock, when one is saved. An identifier below `save.numbering_base` keeps its
    number; one at or above it is new and moves up past the numbers taken
    meanwhile, the same way in every variant, and a default name follows its new
    number. The branches keep their ids (spec 007, research R10). The counters end
    above every identifier and never go down. Writes nothing.
    """
    numbering = _first_numbering(save, counters)
    return DraftNumbering(
        branches=[
            branch.model_copy(
                update={'items': _renumber_items(branch.items, numbering.renumbered)}
            )
            for branch in save.branches
        ],
        next_rule_number=numbering.next_rule_number,
        next_group_number=numbering.next_group_number,
    )
