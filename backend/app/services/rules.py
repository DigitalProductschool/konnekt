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
"""

import logging
import math
import re
import uuid
from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Literal

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

logger = logging.getLogger(__name__)

MAIN_BRANCH_NAME = 'Standard'

# Size limits (spec Assumptions)
MAX_BRANCHES = 20
MAX_ITEMS_PER_BRANCH = 200
NAME_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 500
MESSAGE_MAX_LENGTH = 500

INVALID_IDENTIFIER = (
    'The rules contain an invalid identifier. Reload the connection and try again.'
)

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
ItemNoun = Literal['rule', 'group', 'sub-group']


def _validation_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={'error': 'Validation error', 'message': message},
    )


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


def clean_rules(
    rules: RulesInput,
    documents: Sequence[RequestedDocument],
    main_branch_id: str | None,
) -> RulesSave:
    """Check a save's branches and rules against the documents it leaves current.

    `main_branch_id` is the form connection's main branch, or None while it has
    none (on create). The branches come back as they are stored, with names,
    descriptions and messages trimmed and each condition reduced to its
    operator's keys. On the first problem, answers 400 with a message that names
    it, the rule and its branch (FR-005, FR-006).
    """
    return RulesSave(
        branches=clean_branches(rules.branches, documents, main_branch_id),
        numbering_base=rules.numbering_base,
        base_version=rules.base_version,
    )


def clean_branches(
    branches: Sequence[BranchInput],
    documents: Sequence[RequestedDocument],
    main_branch_id: str | None,
) -> list[BranchInput]:
    """`clean_rules` for a list of branches, such as the current rule set's.

    A save that changes the documents without sending rules checks the current
    rules this way against its new documents (FR-006).
    """
    if len(branches) > MAX_BRANCHES:
        raise _validation_error(
            f'A connection can have at most {MAX_BRANCHES} variants.'
        )
    mains = [branch for branch in branches if branch.origin == 'main']
    if (
        len(mains) != 1
        or branches[0].origin != 'main'
        or branches[0].id != main_branch_id
    ):
        raise _validation_error('The rules need exactly one main branch.')

    requested = _requested_fields(documents)
    cleaned: list[BranchInput] = []
    names: set[str] = set()
    for branch in branches:
        name = _branch_name(branch.name, names)
        cleaned.append(_clean_branch(branch, name, requested))
    return cleaned


def _branch_name(value: str, earlier_names: set[str]) -> str:
    name = value.strip()
    if not name:
        raise _validation_error('Enter a name for every variant.')
    if len(name) > NAME_MAX_LENGTH:
        raise _validation_error(
            f'A variant’s name can have at most {NAME_MAX_LENGTH} characters.'
        )
    if _folded(name) in earlier_names:
        raise _validation_error(
            f'Two variants are called {name}. Give each variant its own name.'
        )
    earlier_names.add(_folded(name))
    return name


def _clean_branch(
    branch: BranchInput,
    name: str,
    requested: dict[tuple[str, str], _RequestedField],
) -> BranchInput:
    description = (branch.description or '').strip() or None
    if description is not None and len(description) > DESCRIPTION_MAX_LENGTH:
        raise _validation_error(
            f'The description of {name} can have at most {DESCRIPTION_MAX_LENGTH} '
            'characters.'
        )
    entries = list(walk(branch.items))
    if len(entries) > MAX_ITEMS_PER_BRANCH:
        raise _validation_error(
            f'{name} can have at most {MAX_ITEMS_PER_BRANCH} rules and groups.'
        )
    identifiers: set[str] = set()
    for item, _depth in entries:
        expected = _RULE_ID if isinstance(item, RuleItem) else _GROUP_ID
        if not expected.fullmatch(item.id) or item.id in identifiers:
            raise _validation_error(INVALID_IDENTIFIER)
        identifiers.add(item.id)

    names: dict[str, tuple[ItemNoun, str]] = {}
    return branch.model_copy(
        update={
            'name': name,
            'description': description,
            'items': [
                _clean_item(item, 0, name, names, requested) for item in branch.items
            ],
        }
    )


def _clean_item(
    item: TreeItem,
    depth: int,
    branch_name: str,
    names: dict[str, tuple[ItemNoun, str]],
    requested: dict[tuple[str, str], _RequestedField],
) -> TreeItem:
    noun = _noun(item, depth)
    name = _item_name(item, noun, branch_name, names)
    if isinstance(item, GroupItem):
        subject = f'{name} in {branch_name}'
        _check_members(item, depth, subject)
        message = (item.message or '').strip() or None
        if message is not None and len(message) > MESSAGE_MAX_LENGTH:
            raise _validation_error(
                f'The error message of {subject} can have at most '
                f'{MESSAGE_MAX_LENGTH} characters.'
            )
        return item.model_copy(
            update={
                'name': name,
                'message': message,
                'items': [
                    _clean_item(member, depth + 1, branch_name, names, requested)
                    for member in item.items
                ],
            }
        )
    subject = f'{name} in {branch_name}'
    target, kind, entry = _clean_target(item.target, subject, requested)
    if item.condition is None:
        raise _validation_error(f'{subject}: choose a check.')
    condition = _clean_condition(item.condition, kind, entry, target, subject)
    message = item.message.strip()
    if not message:
        raise _validation_error(f'{subject} has no error message.')
    if len(message) > MESSAGE_MAX_LENGTH:
        raise _validation_error(
            f'The error message of {subject} can have at most {MESSAGE_MAX_LENGTH} '
            'characters.'
        )
    return item.model_copy(
        update={'name': name, 'condition': condition, 'message': message}
    )


def _check_members(group: GroupItem, depth: int, subject: str) -> None:
    """A group holds rules and sub-groups, a sub-group rules only (FR-008).

    Each needs at least two active members: the members a based branch removed
    don't count.
    """
    if depth > 0 and any(isinstance(member, GroupItem) for member in group.items):
        raise _validation_error(f'{subject} can only hold rules.')
    active = [member for member in group.items if member.mark != 'removed']
    if len(active) < 2:
        raise _validation_error(f'{subject} needs at least two rules.')


def _item_name(
    item: TreeItem,
    noun: ItemNoun,
    branch_name: str,
    names: dict[str, tuple[ItemNoun, str]],
) -> str:
    """Check a rule's or group's name against the earlier names of its branch."""
    name = item.name.strip()
    if not name:
        raise _validation_error(f'Enter a name for every {noun} in {branch_name}.')
    if len(name) > NAME_MAX_LENGTH:
        raise _validation_error(
            f'A {noun} in {branch_name} has a name longer than {NAME_MAX_LENGTH} '
            'characters.'
        )
    earlier = names.get(_folded(name))
    if earlier is not None:
        earlier_noun, earlier_name = earlier
        raise _validation_error(
            f'Another {earlier_noun} in {branch_name} is already called {earlier_name}.'
        )
    reserved = reserved_name_problem(name, item)
    if reserved is not None:
        raise _validation_error(reserved)
    names[_folded(name)] = (noun, name)
    return name


def reserved_name_problem(name: str, item: TreeItem) -> str | None:
    """Why `name` is kept for another item, or None (FR-005).

    "Rule NN" belongs to the rule `rule-{NN}`, "Group NN" and "Sub-group NN" to the
    group `group-{NN}`, with or without leading zeros.
    """
    match = _RESERVED_NAME.fullmatch(name.strip())
    if match is None:
        return None
    word, number = match.group(1).lower(), int(match.group(2))
    owner_id = f'rule-{number}' if word == 'rule' else f'group-{number}'
    if item.id == owner_id:
        return None
    return f'{name.strip()} is kept for the {word} numbered {number:02d}.'


def _clean_target(
    target: RuleTarget | None,
    subject: str,
    requested: dict[tuple[str, str], _RequestedField],
) -> tuple[RuleTarget, FieldKind, _RequestedField]:
    """Check what a rule checks; return it with its kind of value (FR-002, FR-003)."""
    if target is None:
        raise _validation_error(f'{subject}: choose the data to check.')
    entry = requested.get((target.document_type, target.field))
    if entry is None or entry.field.kind == 'image':
        raise _validation_error(f'{subject} checks data that’s no longer requested.')
    field = entry.field
    wrong_part = _validation_error(
        f'{subject} checks a part that {field.label} doesn’t have.'
    )
    if field.parts is None:
        if target.part is not None or target.licence_class is not None:
            raise wrong_part
        return target, field.kind, entry
    if target.part is None:
        raise _validation_error(f'{subject}: choose the data to check.')
    part = _part_of(field, target.part)
    if part is None:
        raise wrong_part
    if part.per_licence_class:
        if target.licence_class is None:
            raise _validation_error(f'{subject}: choose the data to check.')
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


def _clean_condition(
    condition: Condition,
    kind: FieldKind,
    entry: _RequestedField,
    target: RuleTarget,
    subject: str,
) -> Condition:
    """Check a condition against its target's kind; keep only its operator's keys."""
    operator = condition.operator
    if kind == 'number' and operator in NUMBER_OPERATORS:
        value = condition.value
        if not isinstance(value, float | int) or not math.isfinite(value):
            raise _validation_error(f'{subject}: enter a number.')
        return Condition(operator=operator, value=value)
    if kind == 'text' and operator in TEXT_OPERATORS:
        if not isinstance(condition.value, str) or not condition.value.strip():
            raise _validation_error(f'{subject}: enter a text to compare with.')
        return Condition(
            operator=operator,
            value=condition.value,
            match_case=bool(condition.match_case),
        )
    if kind == 'enum' and operator in ENUM_OPERATORS:
        return Condition(
            operator=operator,
            values=_enum_values(condition, entry.field, target, subject),
        )
    if kind == 'date' and operator in FIXED_DATE_OPERATORS:
        if not _is_date(condition.date):
            raise _validation_error(f'{subject}: enter a date.')
        return Condition(operator=operator, date=condition.date)
    if kind == 'date' and operator in YEARS_AGO_OPERATORS:
        years = _whole_number(condition.years)
        if years is None:
            raise _validation_error(
                f'{subject}: enter a number of years of at least 1.'
            )
        return Condition(operator=operator, years=years)
    if kind == 'date' and operator in FROM_NOW_OPERATORS:
        unit = condition.unit
        if unit not in ('years', 'months'):
            raise _validation_error(f'{subject}: choose years or months.')
        amount = _whole_number(condition.amount)
        if amount is None:
            raise _validation_error(
                f'{subject}: enter a number of {unit} of at least 1.'
            )
        return Condition(operator=operator, amount=amount, unit=unit)
    raise _validation_error(f'{subject}: choose a check.')


def _enum_values(
    condition: Condition, field: CatalogField, target: RuleTarget, subject: str
) -> list[str | int]:
    values = condition.values or []
    if not values:
        raise _validation_error(f'{subject}: choose at least one value.')
    option_set = _enum_set(field, target)
    allowed = _option_values(option_set) if option_set else []
    seen: list[str | int] = []
    for value in values:
        # 1 and True are equal in Python, but True is never a value of a set
        if isinstance(value, bool) or value not in allowed:
            raise _validation_error(f'{subject}: choose values from the list.')
        if value in seen:
            raise _validation_error(f'{subject}: choose each value only once.')
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


def current_branches(
    db: Session, form_connection: FormConnection
) -> list[SnapshotBranch]:
    """The branches of a form connection's current rule set, main branch first."""
    rule_set = _rule_set(db, form_connection.id, form_connection.current_rule_set)
    if rule_set is None:
        raise LookupError(
            f'Form connection {form_connection.id} has no rule set '
            f'{form_connection.current_rule_set}'
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


@dataclass(frozen=True)
class _Plan:
    """What saving a rule set would do: its numbering and its branches as saved."""

    current: list[SnapshotBranch]
    numbering: _Numbering
    live_ids: set[str]


def _plan(db: Session, form_connection: FormConnection, save: RulesSave) -> _Plan:
    current = current_branches(db, form_connection)
    loaded = current
    base_version = save.base_version
    if base_version is not None and base_version != form_connection.current_rule_set:
        rule_set = _rule_set(db, form_connection.id, base_version)
        loaded = (
            RULE_SET_SNAPSHOT.validate_python(rule_set.branches) if rule_set else []
        )
    loaded_ids = _identifiers(loaded)
    numbering = _allocate(
        save.branches,
        save.numbering_base,
        loaded_ids | _identifiers(current),
        loaded_ids,
        (form_connection.next_rule_number, form_connection.next_group_number),
    )
    live_ids = set(
        db.scalars(
            select(FormConnectionBranch.id).where(
                FormConnectionBranch.form_connection_id == form_connection.id,
                FormConnectionBranch.deleted_at.is_(None),
            )
        )
    )
    _check_branch_ids(save.branches, live_ids)
    return _Plan(current=current, numbering=numbering, live_ids=live_ids)


def _check_branch_ids(branches: Sequence[BranchInput], live_ids: set[str]) -> None:
    """A saved branch keeps its id, which must be a live branch's (FR-025)."""
    for branch in branches:
        if branch.id is not None and branch.id not in live_ids:
            raise _validation_error('Unknown variant.')


def _saved_branches(
    db: Session,
    form_connection_id: str,
    branches: Sequence[BranchInput],
    numbering: _Numbering,
) -> list[SnapshotBranch]:
    """The branches as stored, with their final identifiers (FR-025, research R5).

    A branch without an id is new: it gets a UUID4, which its pull URL names for
    good, and its row.
    """
    saved: list[SnapshotBranch] = []
    for branch in branches:
        branch_id = branch.id
        if branch_id is None:
            branch_id = str(uuid.uuid4())
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
    """Refuse a save whose identifiers or branch ids `save_rule_set` would refuse.

    Runs in the read transaction before EUDIPLO is called; writes nothing.
    """
    _plan(db, form_connection, save)


def save_rule_set(
    db: Session, form_connection: FormConnection, save: RulesSave
) -> list[SnapshotBranch]:
    """Save cleaned branches as the form connection's current rules (research R9).

    The caller holds the form connection's row lock and commits; nothing here
    commits. New identifiers are checked and renumbered (`_allocate`), branches
    without an id get their row, and the current rule set's branches that the save
    leaves out are marked deleted, so their pull URLs answer "unavailable" for good
    (FR-027). The next rule set version is added only when the snapshot differs
    from the current one. Returns the branches as saved.
    """
    plan = _plan(db, form_connection, save)
    saved = _saved_branches(db, form_connection.id, save.branches, plan.numbering)

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


def _first_numbering(save: RulesSave) -> _Numbering:
    _check_branch_ids(save.branches, set())
    return _allocate(save.branches, save.numbering_base, set(), set(), (1, 1))


def check_first_save(save: RulesSave) -> None:
    """Refuse a new form connection's rules that `first_rule_set` would refuse."""
    _first_numbering(save)


def first_rule_set(
    db: Session, form_connection: FormConnection, save: RulesSave | None
) -> list[SnapshotBranch]:
    """Add a new form connection's branch rows and rule set 1 (FR-018, research R9).

    Without `save`, the form connection gets the main branch "Standard" without
    rules. Its counters start at 1. The caller has added the form connection, and
    commits.
    """
    if save is None:
        saved = [main_branch_snapshot(str(uuid.uuid4()))]
        db.add(
            FormConnectionBranch(
                id=saved[0].id, form_connection_id=form_connection.id, is_main=True
            )
        )
        numbering = _Numbering(renumbered={}, next_rule_number=1, next_group_number=1)
    else:
        numbering = _first_numbering(save)
        saved = _saved_branches(db, form_connection.id, save.branches, numbering)
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
