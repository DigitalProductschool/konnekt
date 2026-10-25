"""Evaluating a branch's rules on the shared documents (spec 002, research R7).

A pull hands serviceBW the documents of a completed request together with the
evaluation of the called branch's rules on them (research R8). This module computes
it: a pure function of the branch, the delivered documents and the day the citizen
shared them. It uses no database and no EUDIPLO, and it never logs: the documents'
values, the outcomes and the messages are personal data (FR-017).

Every rule ends as `met`, `not_met` or `not_checked` (FR-014). A rule is
`not_checked` when its value is missing, null, an empty list, a text that is empty
after trimming, or can't be read for its condition, such as a date of birth with only
a year. A rule on a licence class's date is `not_met` when the licence doesn't list
the class. A saved rule set has passed the save's checks, so a rule that doesn't fit
the catalog raises `ValueError`, and the pull then hands nothing over.
"""

import math
import re
import unicodedata
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass
from datetime import MAXYEAR, date, datetime, timezone
from zoneinfo import ZoneInfo

from ..catalog import FieldKind, PartKind, get_document_type
from ..option_sets import OPTION_SETS
from ..schemas import (
    Combinator,
    Condition,
    DeliveredDocument,
    Evaluation,
    EvaluationBranch,
    EvaluationMessage,
    EvaluationResult,
    GroupItem,
    Outcome,
    RuleItem,
    RuleTarget,
    SnapshotBranch,
)

# Dates count by the calendar date in Germany when the citizen shared (FR-012). The
# zone loads at import, so a missing time zone database fails at start-up
GERMANY = ZoneInfo('Europe/Berlin')

PLACE_OF_BIRTH = 'place_of_birth'
DRIVING_PRIVILEGES = 'driving_privileges'
# The class code in each entry of driving_privileges (ISO/IEC 18013-5)
CLASS_CODE = 'vehicle_category_code'
# The part of driving_privileges that lists the classes the licence holds
CLASSES = 'classes'

_DATE = re.compile(r'\d{4}-\d{2}-\d{2}')
_DATE_TIME = re.compile(r'\d{4}-\d{2}-\d{2}T.+')
_DIGITS = re.compile(r'\d+')


class _Missing:
    """The value is missing, or can't be read for the condition."""


class _NotHeld:
    """The licence doesn't list the class whose date the rule checks."""


_MISSING = _Missing()
_NOT_HELD = _NotHeld()


def day_of_sharing(completed_at: datetime) -> date:
    """The calendar date in Germany when the citizen shared (FR-012).

    `completed_at` is EUDIPLO's `consumedAt`; a value without a time zone is UTC.
    """
    if completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=timezone.utc)
    return completed_at.astimezone(GERMANY).date()


def years_after(day: date, years: int) -> date:
    """The day `years` years after `day`: its anniversary (FR-012).

    Where that year has no such day, 29 February, it is 1 March. Beyond the
    calendar's last year, it is the calendar's last day.
    """
    return _calendar_day(day.year + years, day.month, day.day)


def months_after(day: date, months: int) -> date:
    """The day `months` months after `day` (FR-012).

    The same day of the month, or the 1st of the following month where that month
    has no such day: 31 January + 1 month is 1 March.
    """
    index = day.month - 1 + months
    return _calendar_day(day.year + index // 12, index % 12 + 1, day.day)


def _calendar_day(year: int, month: int, day: int) -> date:
    if year > MAXYEAR:
        return date.max
    try:
        return date(year, month, day)
    except ValueError:
        # The month has no such day, so it isn't December: the 1st of the next month
        return date(year, month + 1, 1)


def evaluate_branch(
    branch: SnapshotBranch, documents: Sequence[DeliveredDocument], shared_on: date
) -> Evaluation:
    """Evaluate a branch's rules on the delivered documents (FR-009 to FR-011).

    `branch` is a branch of the request's rule set, as it was at the trigger, and
    `shared_on` the day of sharing (`day_of_sharing`). Every level combines its
    rules and groups with its own AND or OR, the top level with the branch's, and a
    group or sub-group counts as one item of its level. `not_checked` counts as not
    met, groups are met or not met, and a branch without rules is met.

    `results` follow the branch's order: the top level first, each group's members
    after it, with `group` naming the group that contains them. `messages` is empty
    when the branch is met. Otherwise it holds, walking the top level in order, the
    message of each rule that isn't met and, for each group that isn't met, its own
    message or, if it has none, its members' found the same way (FR-011).

    A based branch's marks aren't evaluated here yet, nor the groups they dissolve:
    a marked item, or a group with fewer than two members, raises `ValueError`, so
    that no documents go out without a correct evaluation.

    The evaluation names rules and groups, never the values they checked (FR-017).
    """
    values = _DocumentValues(documents)
    top_level = [_evaluated(item, values, shared_on) for item in branch.items]
    met = not top_level or _level_met(branch.operator, top_level)
    return Evaluation(
        branch=EvaluationBranch(id=branch.id, name=branch.name),
        met=met,
        results=list(_results(top_level, None)),
        messages=[] if met else list(_messages(top_level)),
    )


@dataclass(frozen=True)
class _Evaluated:
    """A rule's or group's outcome, with its members' if it is a group."""

    item: RuleItem | GroupItem
    outcome: Outcome
    members: list['_Evaluated']


def _evaluated(
    item: RuleItem | GroupItem, values: '_DocumentValues', shared_on: date
) -> _Evaluated:
    if item.mark is not None:
        raise ValueError('The branch has a marked item, which is not evaluated yet')
    if isinstance(item, RuleItem):
        return _Evaluated(item, _rule_outcome(item, values, shared_on), [])
    if len(item.items) < 2:
        raise ValueError('A saved group has fewer than two members')
    members = [_evaluated(member, values, shared_on) for member in item.items]
    outcome: Outcome = 'met' if _level_met(item.operator, members) else 'not_met'
    return _Evaluated(item, outcome, members)


def _level_met(operator: Combinator, items: Sequence[_Evaluated]) -> bool:
    """AND: every item is met; OR: at least one is (FR-009)."""
    if operator == 'and':
        return all(item.outcome == 'met' for item in items)
    return any(item.outcome == 'met' for item in items)


def _results(
    level: Sequence[_Evaluated], group: str | None
) -> Iterator[EvaluationResult]:
    """Every result of a level in order, each group followed by its members'."""
    for entry in level:
        item = entry.item
        yield EvaluationResult(
            id=item.id,
            type=item.type,
            name=item.name,
            group=group,
            outcome=entry.outcome,
        )
        yield from _results(entry.members, item.id)


def _messages(level: Sequence[_Evaluated]) -> Iterator[EvaluationMessage]:
    """The messages of a level's items that aren't met (FR-011).

    A group with a message of its own reports it instead of its members'.
    """
    for entry in level:
        if entry.outcome == 'met':
            continue
        # Every rule has a message; a group may have none
        message = entry.item.message
        if message is None:
            yield from _messages(entry.members)
        else:
            yield EvaluationMessage(id=entry.item.id, message=message)


class _DocumentValues:
    """The delivered fields' values, by document type and field key."""

    def __init__(self, documents: Sequence[DeliveredDocument]) -> None:
        self._values: dict[str, dict[str, object]] = {}
        for document in documents:
            fields = self._values.setdefault(document.document_type, {})
            for field in document.fields:
                fields[field.key] = field.value

    def get(self, document_type: str, key: str) -> object:
        """The field's value, or _MISSING when it is absent or null."""
        value = self._values.get(document_type, {}).get(key)
        return _MISSING if value is None else value


# Rules


def _rule_outcome(rule: RuleItem, values: _DocumentValues, shared_on: date) -> Outcome:
    target, condition = rule.target, rule.condition
    if target is None or condition is None:
        raise ValueError('A saved rule has no target or no condition')
    kind, option_set = _kind_of(target)
    if kind not in ('number', 'text', 'enum', 'date'):
        raise ValueError(f'A rule checks a field of kind {kind}')
    value = _value_of(target, values)
    if isinstance(value, _NotHeld):
        return 'not_met'
    if isinstance(value, _Missing):
        return 'not_checked'

    holds: bool | None
    if kind == 'number':
        holds = _number_holds(condition, value)
    elif kind == 'text':
        holds = _text_holds(condition, value)
    elif kind == 'enum':
        holds = _enum_holds(condition, value, option_set)
    else:
        holds = _date_holds(condition, value, shared_on)
    if holds is None:
        return 'not_checked'
    return 'met' if holds else 'not_met'


def _kind_of(target: RuleTarget) -> tuple[FieldKind | PartKind, str | None]:
    """The kind of value a rule checks, and the value set of an enum."""
    document_type = get_document_type(target.document_type)
    field = document_type.field(target.field) if document_type else None
    if field is None:
        raise ValueError('A rule checks a field that the catalog does not have')
    if field.kind != 'parts':
        if target.part is not None or target.licence_class is not None:
            raise ValueError('A rule checks a part of a field without parts')
        return field.kind, field.option_set
    part = next(
        (part for part in field.parts or () if part.key == target.part),
        None,
    )
    if part is None:
        raise ValueError('A rule checks a part that its field does not have')
    if part.per_licence_class and not target.licence_class:
        raise ValueError('A rule on a licence class date names no class')
    return part.kind, part.option_set


def _value_of(target: RuleTarget, values: _DocumentValues) -> object:
    """The value a rule checks, _MISSING, or _NOT_HELD for a class not listed."""
    value = values.get(target.document_type, target.field)
    if isinstance(value, _Missing) or target.part is None:
        return value
    if target.field == PLACE_OF_BIRTH:
        if not isinstance(value, Mapping):
            return _MISSING
        part = value.get(target.part)
        return _MISSING if part is None else part
    if target.field == DRIVING_PRIVILEGES:
        return _privileges_value(value, target.part, target.licence_class)
    raise ValueError('A rule checks a part that this module cannot read')


def _privileges_value(value: object, part: str, licence_class: str | None) -> object:
    """The licence classes held, or one class's issue or expiry date.

    A class is held when the licence lists it, whatever its own expiry date
    (FR-003). A class's date never falls back to the licence's own date (FR-014).
    """
    entries = _privilege_entries(value)
    if not entries:
        # Missing, empty, or entries without a class code (research R14)
        return _MISSING
    if part == CLASSES:
        return [code for code, _ in entries]
    wanted = (licence_class or '').strip().casefold()
    for code, entry in entries:
        if code.strip().casefold() == wanted:
            class_date = entry.get(part)
            return _MISSING if class_date is None else class_date
    return _NOT_HELD


def _privilege_entries(value: object) -> list[tuple[str, Mapping[str, object]]]:
    if not isinstance(value, list):
        return []
    entries: list[tuple[str, Mapping[str, object]]] = []
    for entry in value:
        if not isinstance(entry, Mapping):
            continue
        code = entry.get(CLASS_CODE)
        if isinstance(code, str) and code.strip():
            entries.append((code, entry))
    return entries


# Numbers: strict comparisons with one value (F6)


def _number_holds(condition: Condition, value: object) -> bool | None:
    number = _number(value)
    if number is None:
        return None
    limit = _number(condition.value)
    if limit is None:
        raise ValueError('A number rule has no number to compare with')
    match condition.operator:
        case 'greater_than':
            return number > limit
        case 'less_than':
            return number < limit
        case 'equal_to':
            return number == limit
        case 'not_equal_to':
            return number != limit
    raise ValueError('Unknown operator for a number rule')


def _number(value: object) -> float | None:
    # A JSON boolean isn't a number
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return float(value)


# Text (FR-013)


def _text_holds(condition: Condition, value: object) -> bool | None:
    if not isinstance(value, str):
        return None
    match_case = bool(condition.match_case)
    text = _normalised_text(value, match_case)
    if not text:
        return None
    if not isinstance(condition.value, str):
        raise ValueError('A text rule has no text to compare with')
    expected = _normalised_text(condition.value, match_case)
    if not expected:
        raise ValueError('A text rule has an empty text to compare with')
    match condition.operator:
        case 'equal_to':
            return text == expected
        case 'not_equal_to':
            return text != expected
        case 'contains':
            return expected in text
        case 'not_contains':
            return expected not in text
    raise ValueError('Unknown operator for a text rule')


def _normalised_text(text: str, match_case: bool) -> str:
    """Trimmed, in Unicode NFC, and case-folded unless letter case counts.

    `casefold` matches "STRASSE" with "straße" and "KÖLN" with "Köln" (EC-7).
    Spaces inside the text count as written.
    """
    normalised = unicodedata.normalize('NFC', text.strip())
    if match_case:
        return normalised
    return unicodedata.normalize('NFC', normalised.casefold())


# Enums (FR-003)


def _enum_holds(
    condition: Condition, value: object, option_set: str | None
) -> bool | None:
    as_codes = _has_integer_values(option_set)
    items = value if isinstance(value, list) else [value]
    present = {
        key for key in (_enum_key(item, as_codes) for item in items) if key is not None
    }
    if not present:
        return None
    chosen = {
        key
        for key in (_enum_key(item, as_codes) for item in condition.values or [])
        if key is not None
    }
    if not chosen:
        raise ValueError('An enum rule has no values to compare with')
    # A value outside the field's set matches none of the rule's values
    includes = bool(present & chosen)
    match condition.operator:
        case 'includes_one_of':
            return includes
        case 'includes_none_of':
            return not includes
    raise ValueError('Unknown operator for an enum rule')


def _has_integer_values(option_set: str | None) -> bool:
    options = OPTION_SETS.get(option_set or '')
    if not options:
        raise ValueError('An enum rule names no known value set')
    return all(isinstance(option.value, int) for option in options)


def _enum_key(item: object, as_codes: bool) -> str | int | None:
    """An enum value as compared: a code as an integer, a text ignoring case.

    None when it can't be read: a boolean, an empty text, or another type.
    """
    if isinstance(item, bool):
        return None
    if as_codes:
        if isinstance(item, int):
            return item
        if isinstance(item, float) and item.is_integer():
            return int(item)
        if isinstance(item, str) and _DIGITS.fullmatch(item.strip()):
            return int(item.strip())
        return None
    if isinstance(item, str):
        return _normalised_text(item, match_case=False) or None
    return None


# Dates (FR-012)


def _date_holds(condition: Condition, value: object, shared_on: date) -> bool | None:
    day = _date(value)
    if day is None:
        return None
    match condition.operator:
        case 'before' | 'after' | 'on':
            given = _date(condition.date)
            if given is None:
                raise ValueError('A date rule has no date to compare with')
            if condition.operator == 'before':
                return day < given
            if condition.operator == 'after':
                return day > given
            return day == given
        case 'at_least_years_ago':
            return shared_on >= years_after(day, _whole(condition.years))
        case 'less_than_years_ago':
            return shared_on < years_after(day, _whole(condition.years))
        case 'exactly_years_ago':
            years = _whole(condition.years)
            return years_after(day, years) <= shared_on < years_after(day, years + 1)
        case 'at_least_from_now':
            return day >= _from_now(condition, shared_on)
        case 'less_than_from_now':
            return day < _from_now(condition, shared_on)
    raise ValueError('Unknown operator for a date rule')


def _from_now(condition: Condition, shared_on: date) -> date:
    amount = _whole(condition.amount)
    if condition.unit == 'years':
        return years_after(shared_on, amount)
    if condition.unit == 'months':
        return months_after(shared_on, amount)
    raise ValueError('A from-now rule has no unit')


def _whole(number: float | None) -> int:
    """A rule's number of years or months: a whole number of at least 1."""
    if (
        isinstance(number, bool)
        or not isinstance(number, int | float)
        or not float(number).is_integer()
        or number < 1
    ):
        raise ValueError('A date rule has no whole number of at least 1')
    return int(number)


def _date(value: object) -> date | None:
    """A calendar date from `YYYY-MM-DD`, or from a date-time with a time zone.

    A date-time, such as an mdoc's `tdate`, counts by its calendar date in Germany.
    Anything else, such as a year alone, can't be read.
    """
    if not isinstance(value, str):
        return None
    text = value.strip()
    try:
        if _DATE.fullmatch(text):
            return date.fromisoformat(text)
        if _DATE_TIME.fullmatch(text):
            moment = datetime.fromisoformat(text)
            if moment.tzinfo is None:
                return None
            return moment.astimezone(GERMANY).date()
    except ValueError:
        return None
    return None
