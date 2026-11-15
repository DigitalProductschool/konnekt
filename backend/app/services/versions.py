"""A connection's version: a fingerprint of its content (spec 011, research R6).

The version that the details page and the PDF show, `XXXX-XXXX-XXXX`: the first 12
hexadecimal digits, upper case, of the SHA-256 of one canonical JSON document of
the content (data-model.md section 1; FR-028 to FR-031). The same content gives the
same version on any computer, in either language and at any time; any change of
content gives another one. It is computed for every answer and never stored:
`form_connections._view()` and `drafts.draft_view()` call `version_fingerprint()`
with the content they already hold.

The document holds the connection's id, name and description; its documents in
the order the answer lists them (the team's order, spec 010), each with its field
keys; and its variants in their stored order with their rules and groups. A
condition is hashed in its publishable form (`rules.publishable_condition()`), the
form publishing stores, so that a complete draft and the connection publishing
makes of it have the same version (FR-031). Left out (FR-029): the status and the
state, `is_active`, the start date, the status dates, the activity, the example's
mark, every URL, the counters, the rule set version, the draft's step and save
number, the times, every label and the language.

The canonical form is permanent: every printed version depends on it, so a change
of a key, an order or a normalisation here makes every printout look out of date.
`tests/unit/test_versions.py` pins it with a fixed vector. Each part is written
out key by key, never dumped from a schema, so that a field added to a schema
doesn't change it unnoticed: the tests list every field of the content's schemas,
and a new one is either added here or knowingly left out. Nothing here logs.
"""

import hashlib
import json
from collections.abc import Sequence
from typing import Any

from ..schemas import (
    BranchInput,
    Condition,
    GroupItem,
    RequestedDocument,
    RuleItem,
    RuleTarget,
)
from .rules import publishable_condition

# How many hexadecimal digits of the SHA-256 the version shows, in groups of four
_DIGITS = 12
_GROUP = 4

# A condition's keys (`Condition`), each hashed only while it has a value
_CONDITION_KEYS = (
    'operator',
    'value',
    'match_case',
    'values',
    'date',
    'years',
    'amount',
    'unit',
)


def version_fingerprint(
    *,
    form_connection_id: str,
    name: str,
    description: str | None,
    documents: Sequence[RequestedDocument],
    branches: Sequence[BranchInput],
) -> str:
    """The version of a connection's content, such as `62D0-715F-01D1`.

    `documents` in the order the answer lists them (`ordered_documents()` with the
    row's `document_order`), never the revision's catalog order: the order is
    content. `branches` as stored, main branch first: a stored draft's (its
    `DraftContent`) or a rule set's; a `Branch`'s URL and `is_main` are left out.
    `description` is `''` when there is none. Pure: no session, catalog, settings
    or logging.
    """
    content = {
        'id': form_connection_id,
        'name': name,
        'description': description or '',
        'documents': [_document(document) for document in documents],
        'branches': [_branch(branch) for branch in branches],
    }
    canonical = json.dumps(
        content, sort_keys=True, separators=(',', ':'), ensure_ascii=False
    )
    digits = hashlib.sha256(canonical.encode('utf-8')).hexdigest()[:_DIGITS].upper()
    return '-'.join(
        digits[start : start + _GROUP] for start in range(0, _DIGITS, _GROUP)
    )


def _document(document: RequestedDocument) -> dict[str, Any]:
    """A requested document: its type and its field keys, in their order."""
    return {'document_type': document.document_type, 'fields': list(document.fields)}


def _branch(branch: BranchInput) -> dict[str, Any]:
    """A variant with its rules and groups, in their order."""
    return {
        'id': branch.id,
        'name': branch.name,
        'description': branch.description,
        'origin': branch.origin,
        'operator': branch.operator,
        'operator_mark': branch.operator_mark,
        'items': [_item(item) for item in branch.items],
    }


def _item(item: RuleItem | GroupItem) -> dict[str, Any]:
    """A rule, or a group with its members, in their order."""
    if isinstance(item, RuleItem):
        return {
            'type': item.type,
            'id': item.id,
            'name': item.name,
            'mark': item.mark,
            'target': _target(item.target),
            'condition': _condition(item.condition),
            'message': item.message,
        }
    return {
        'type': item.type,
        'id': item.id,
        'name': item.name,
        'mark': item.mark,
        'operator': item.operator,
        'message': item.message,
        'items': [_item(member) for member in item.items],
    }


def _target(target: RuleTarget | None) -> dict[str, Any] | None:
    """What a rule checks, with its four keys; None while a draft's rule has none."""
    if target is None:
        return None
    return {
        'document_type': target.document_type,
        'field': target.field,
        'part': target.part,
        'licence_class': target.licence_class,
    }


def _condition(condition: Condition | None) -> dict[str, Any] | None:
    """A condition in its publishable form, with the keys that have a value.

    As the API's output leaves a key without a value out (`Condition`), so that a
    key a new operator adds to `_CONDITION_KEYS` changes no existing version.
    """
    publishable = publishable_condition(condition)
    if publishable is None:
        return None
    kept: dict[str, Any] = {}
    for key in _CONDITION_KEYS:
        value = getattr(publishable, key)
        if value is not None:
            kept[key] = list(value) if isinstance(value, list) else value
    return kept
