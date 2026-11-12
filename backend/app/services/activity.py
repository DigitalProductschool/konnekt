"""A form connection's activity: who changed what (spec 010, research R4).

Every service that changes a connection takes the person who acts as an `Actor`,
a keyword argument without a default, so that no call site can leave it out. The
management API's routers build it from the call's principal (`actor_of`), an
approved approval request from the team member who approves and the agent that
asked, and the worker's upkeep passes `SYSTEM`. data-model.md section 2.1 says
what its three fields are in the activity's table.

The core (data-model.md sections 2.2 to 2.5):
- `changes_between()` says, without the database, what a save changes: the
  entries it records, and whether the content changed at all (the example's mark);
- `record()` writes an action's entries under the connection's row lock, in the
  caller's transaction, and merges an entry into the connection's newest instant
  when the same person did the same kind of change to the same variant (FR-026);
- `list_activity()` and `last_activity()` read them for the details' card.

No entry holds a rule's content, a message, a value or anything about a citizen
(FR-029), and nothing here logs.

This module never imports `approvals`, which takes `agent_name()` from here, and
imports `form_connections`, which imports it, only inside the functions that need
it.
"""

import base64
import binascii
import json
import uuid
from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import cast

from fastapi import HTTPException, status
from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import Session

from ..models import AgentAuthorization, ConnectionActivity, FormConnection, OauthClient
from ..schemas import (
    DRAFT_CONTENT,
    ActivityActor,
    ActivityEntry,
    ActivityKind,
    ActivityPage,
    BranchInput,
    GroupItem,
    RequestedDocument,
    RuleItem,
    to_iso_utc,
)
from .auth import Principal


@dataclass(frozen=True)
class Actor:
    """Who makes a change to a connection.

    `name` is the team member's username: the one who acted, whom an agent acts
    for, or who approved an agent's request; None for what the middleware does by
    itself (`SYSTEM`). `agent` is the agent's name when an agent made the change or
    asked for it (`agent_name()`), and `approved` is true when the team member
    `name` approved the request that the agent `agent` made.
    """

    name: str | None
    agent: str | None = None
    approved: bool = False


# What the middleware does by itself: no person
SYSTEM = Actor(name=None)


def agent_name(db: Session, authorization: AgentAuthorization) -> str:
    """The agent's name for the page: the client's, or the token's name.

    An agent connection's (`oauth`) is its OAuth client's `client_name`, a
    personal access token's its own name; at most 200 characters, as
    `approval_requests.requested_by` stores it.
    """
    if authorization.kind == 'oauth':
        client = (
            db.get(OauthClient, authorization.client_id)
            if authorization.client_id is not None
            else None
        )
        name = client.client_name if client is not None else ''
    else:
        name = authorization.name
    return name[:200]


def actor_of(db: Session, principal: Principal) -> Actor:
    """Who acts in a call to the management API.

    A browser session: the signed-in team member's username. A bearer token: the
    username of the account the agent acts for, with the agent's name.
    """
    authorization = principal.authorization
    if authorization is None:
        return Actor(name=principal.user.username)
    return Actor(name=principal.user.username, agent=agent_name(db, authorization))


# The kinds (data-model.md section 2.2), in the table's order, which is the order of
# an action's entries (`position`)

CREATED: ActivityKind = 'created'
RENAMED: ActivityKind = 'renamed'
DESCRIPTION_CHANGED: ActivityKind = 'description_changed'
DOCUMENTS_CHANGED: ActivityKind = 'documents_changed'
VARIANT_ADDED: ActivityKind = 'variant_added'
VARIANT_REMOVED: ActivityKind = 'variant_removed'
VARIANT_RENAMED: ActivityKind = 'variant_renamed'
RULES_CHANGED: ActivityKind = 'rules_changed'
PUBLISHED: ActivityKind = 'published'
SCHEDULED: ActivityKind = 'scheduled'
START_DATE_CHANGED: ActivityKind = 'start_date_changed'
BECAME_ACTIVE: ActivityKind = 'became_active'
DEACTIVATED: ActivityKind = 'deactivated'
REACTIVATED: ActivityKind = 'reactivated'
DELETED: ActivityKind = 'deleted'
RESTORED: ActivityKind = 'restored'

KINDS: tuple[ActivityKind, ...] = (
    CREATED,
    RENAMED,
    DESCRIPTION_CHANGED,
    DOCUMENTS_CHANGED,
    VARIANT_ADDED,
    VARIANT_REMOVED,
    VARIANT_RENAMED,
    RULES_CHANGED,
    PUBLISHED,
    SCHEDULED,
    START_DATE_CHANGED,
    BECAME_ACTIVE,
    DEACTIVATED,
    REACTIVATED,
    DELETED,
    RESTORED,
)

# The details' activity card loads this many entries at a time
ACTIVITY_PAGE_SIZE = 50


@dataclass(frozen=True)
class Entry:
    """One entry that an action records, before `record()` writes it.

    `variant_id` and `variant_name` for the kinds about a variant (the new name for
    a rename), `start_date` for `scheduled` and for `start_date_changed` to a date.
    """

    kind: ActivityKind
    variant_id: str | None = None
    variant_name: str | None = None
    start_date: date | None = None


# What a save records (data-model.md section 2.3)


@dataclass(frozen=True)
class Content:
    """A connection's content, as a save compares it.

    The name and the description (compared as cleaned), the documents in their
    order, and the branches, main branch first: a stored draft's (`BranchInput`)
    or a rule set's (`SnapshotBranch`), each with its id. A branch without an id is
    one the save adds.
    """

    name: str
    description: str
    documents: Sequence[RequestedDocument]
    branches: Sequence[BranchInput]


def draft_content(form_connection: FormConnection) -> Content:
    """A stored draft's content: its columns and `form_connections.draft`."""
    content = DRAFT_CONTENT.validate_python(form_connection.draft)
    return Content(
        name=form_connection.name,
        description=form_connection.description,
        documents=content.documents,
        branches=content.branches,
    )


class Changes(list[Entry]):
    """The entries a save records, one per kind and variant, in section 2.2's order.

    `changed` says whether the content differs at all. It is true whenever there is
    an entry, and also for what writes none: a variant's description alone, which
    FR-025 doesn't list (R3), or a change of a linked variant that only follows
    Standard. The example's mark reads it (data-model.md section 5).
    """

    def __init__(self, entries: Iterable[Entry], *, changed: bool) -> None:
        """The entries, and whether the content changed at all."""
        super().__init__(entries)
        self.changed = changed or bool(self)


def _cleaned(text: str | None) -> str:
    return (text or '').strip()


def _documents_key(
    documents: Sequence[RequestedDocument],
) -> list[tuple[str, tuple[str, ...]]]:
    """The documents as the ordered list of `(document_type, fields)`."""
    return [(document.document_type, tuple(document.fields)) for document in documents]


def _item_content(item: RuleItem | GroupItem) -> str:
    """An item's own content: a rule whole, a group without its members.

    As canonical JSON, so that the marked items can form a set.
    """
    if isinstance(item, RuleItem):
        return json.dumps(
            item.model_dump(mode='json', exclude={'mark'}), sort_keys=True
        )
    return json.dumps(
        item.model_dump(mode='json', exclude={'mark', 'items'}), sort_keys=True
    )


def _marked_items(
    items: Sequence[RuleItem | GroupItem], own_group: str | None
) -> Iterator[tuple[object, ...]]:
    """A linked variant's marked items, each with its content and its place.

    A `changed` or `added` item is the variant's own version, compared whole; a
    propagation turns one into the other when Standard deletes the item or has it
    again, so both count alike. A `removed` item mirrors Standard's content, so
    only that it is removed counts. The place is the variant's own group that
    holds the item (None outside one): Standard decides every other place, and
    its moves reach the variant by propagation.
    """
    for item in items:
        if item.mark == 'removed':
            yield (item.id, 'removed', own_group)
        elif item.mark is not None:
            yield (item.id, 'own', own_group, _item_content(item))
        if isinstance(item, GroupItem):
            yield from _marked_items(
                item.items, item.id if item.mark == 'added' else own_group
            )


def _own_rules(branch: BranchInput, standard_ids: set[str]) -> object:
    """What counts as a change of a variant's rules (data-model.md section 2.3).

    The main variant and a variant that started empty: the whole tree and the top
    level's AND/OR. A variant linked to Standard: its marked items and its top
    level's AND/OR while `operator_mark` is set. Of its removed items, only those
    of an item that Standard has before and after the save (`standard_ids`): one
    that Standard deletes leaves the variant by propagation.
    """
    if branch.origin != 'based':
        return (
            branch.operator,
            [item.model_dump(mode='json') for item in branch.items],
        )
    marked = {
        entry
        for entry in _marked_items(branch.items, None)
        if entry[1] != 'removed' or entry[0] in standard_ids
    }
    operator = branch.operator if branch.operator_mark is not None else None
    return (operator, frozenset(marked))


def _item_ids(items: Sequence[RuleItem | GroupItem]) -> Iterator[str]:
    for item in items:
        yield item.id
        if isinstance(item, GroupItem):
            yield from _item_ids(item.items)


def _standard_ids(branches: Sequence[BranchInput]) -> set[str]:
    """The identifiers of the main variant's items."""
    return {
        item_id
        for branch in branches
        if branch.origin == 'main'
        for item_id in _item_ids(branch.items)
    }


def _has_own_rules(branch: BranchInput) -> bool:
    """Whether an added variant comes with rules of its own.

    A variant linked to Standard: a marked item or a switched top-level AND/OR,
    since its copies of Standard's rules aren't its own. Any other: any item.
    """
    if branch.origin != 'based':
        return bool(branch.items)
    return branch.operator_mark is not None or any(_marked_items(branch.items, None))


def _whole(content: Content) -> object:
    """Everything a content holds, for `Changes.changed`."""
    return (
        _cleaned(content.name),
        _cleaned(content.description),
        _documents_key(content.documents),
        [
            {
                **branch.model_dump(mode='json'),
                'name': _cleaned(branch.name),
                'description': _cleaned(branch.description),
            }
            for branch in content.branches
        ],
    )


def changes_between(before: Content, after: Content) -> Changes:
    """What a save from `before` to `after` records (data-model.md section 2.3).

    Pure: no database. One entry per kind and variant, in section 2.2's order:
    - `renamed` and `description_changed`: the texts compared as cleaned;
    - `documents_changed`: the ordered list of `(document_type, fields)`;
    - `variant_added`, `variant_removed`, `variant_renamed`: the variants matched
      by id (one without an id is added), with the new name, the removed one's
      last name;
    - `rules_changed`: a variant whose own rules differ (`_own_rules`), so that a
      change of Standard that propagates to the linked variants is one entry. An
      added variant gets one too when it has rules of its own.

    A variant's description alone gives no entry, but `Changes.changed` reports it.
    """
    entries: list[Entry] = []
    if _cleaned(before.name) != _cleaned(after.name):
        entries.append(Entry(RENAMED))
    if _cleaned(before.description) != _cleaned(after.description):
        entries.append(Entry(DESCRIPTION_CHANGED))
    if _documents_key(before.documents) != _documents_key(after.documents):
        entries.append(Entry(DOCUMENTS_CHANGED))

    earlier = {branch.id: branch for branch in before.branches if branch.id}
    later_ids = {branch.id for branch in after.branches if branch.id}
    added = [
        branch
        for branch in after.branches
        if branch.id is None or branch.id not in earlier
    ]
    kept = [
        (earlier[branch.id], branch)
        for branch in after.branches
        if branch.id is not None and branch.id in earlier
    ]
    standard_ids = _standard_ids(before.branches) & _standard_ids(after.branches)

    for branch in added:
        entries.append(Entry(VARIANT_ADDED, branch.id, _cleaned(branch.name)))
    for branch in before.branches:
        if branch.id and branch.id not in later_ids:
            entries.append(Entry(VARIANT_REMOVED, branch.id, _cleaned(branch.name)))
    for old, new in kept:
        if _cleaned(old.name) != _cleaned(new.name):
            entries.append(Entry(VARIANT_RENAMED, new.id, _cleaned(new.name)))
    for old, new in kept:
        if _own_rules(old, standard_ids) != _own_rules(new, standard_ids):
            entries.append(Entry(RULES_CHANGED, new.id, _cleaned(new.name)))
    for branch in added:
        if _has_own_rules(branch):
            entries.append(Entry(RULES_CHANGED, branch.id, _cleaned(branch.name)))
    entries.sort(key=lambda entry: KINDS.index(entry.kind))
    return Changes(entries, changed=_whole(before) != _whole(after))


# Writing and merging (data-model.md section 2.4)


def _same(row: ConnectionActivity, entry: Entry, actor: Actor) -> bool:
    """Whether an entry merges into a row: the same kind, person and variant."""
    return (
        row.kind == entry.kind
        and row.actor_name == actor.name
        and row.agent_name == actor.agent
        and row.approved == actor.approved
        and row.variant_id == entry.variant_id
    )


def record(
    db: Session,
    form_connection_id: str,
    entries: Sequence[Entry],
    actor: Actor,
) -> None:
    """Write the entries of one action by `actor` (FR-025 to FR-027).

    The caller holds the connection's row lock and commits: this writes and
    flushes, in the transaction that makes the change. The entries share one
    `occurred_at`, now, and take their `position` in the order of section 2.2.
    An entry whose kind, person (`actor_name`, `agent_name`, `approved`) and
    `variant_id` equal an entry of the connection's newest instant merges into it:
    that row's time moves to now, and its `position`, `variant_name` and
    `start_date` take the new values (FR-026). Any other entry is inserted. No
    entries, no write.
    """
    if not entries:
        return
    now = datetime.now(tz=timezone.utc)
    newest_instant = (
        select(func.max(ConnectionActivity.occurred_at))
        .where(ConnectionActivity.form_connection_id == form_connection_id)
        .scalar_subquery()
    )
    newest = list(
        db.scalars(
            select(ConnectionActivity).where(
                ConnectionActivity.form_connection_id == form_connection_id,
                ConnectionActivity.occurred_at == newest_instant,
            )
        ).all()
    )
    ordered = sorted(entries, key=lambda entry: KINDS.index(entry.kind))
    for position, entry in enumerate(ordered):
        row = next((row for row in newest if _same(row, entry, actor)), None)
        if row is None:
            db.add(
                ConnectionActivity(
                    form_connection_id=form_connection_id,
                    kind=entry.kind,
                    occurred_at=now,
                    position=position,
                    variant_id=entry.variant_id,
                    variant_name=entry.variant_name,
                    start_date=entry.start_date,
                    actor_name=actor.name,
                    agent_name=actor.agent,
                    approved=actor.approved,
                )
            )
            continue
        # Each row of the newest instant takes at most one entry
        newest.remove(row)
        row.occurred_at = now
        row.position = position
        row.variant_name = entry.variant_name
        row.start_date = entry.start_date
    db.flush()


# Reading (data-model.md section 2.5)

_CURSOR_SEPARATOR = '|'


def entry_view(row: ConnectionActivity) -> ActivityEntry:
    """An entry as the API answers it; `actor` null without a person."""
    return ActivityEntry(
        id=row.id,
        # One of KINDS: only `record()` and the migration's backfill write rows
        kind=cast(ActivityKind, row.kind),
        at=to_iso_utc(row.occurred_at),
        variant=row.variant_name,
        start_date=None if row.start_date is None else row.start_date.isoformat(),
        actor=(
            None
            if row.actor_name is None
            else ActivityActor(
                name=row.actor_name, agent=row.agent_name, approved=row.approved
            )
        ),
    )


def _newest_first(
    query: Select[tuple[ConnectionActivity]],
) -> Select[tuple[ConnectionActivity]]:
    """The list's order: the newest instant first, an action's last entry first."""
    return query.order_by(
        ConnectionActivity.occurred_at.desc(),
        ConnectionActivity.position.desc(),
        ConnectionActivity.id,
    )


def _encode_cursor(row: ConnectionActivity) -> str:
    """The position after an entry: its time (ISO), `position` and `id`, base64."""
    position = _CURSOR_SEPARATOR.join(
        (row.occurred_at.isoformat(), str(row.position), row.id)
    )
    return base64.urlsafe_b64encode(position.encode()).decode('ascii')


def _unknown_cursor() -> HTTPException:
    """The search's answer to a cursor it didn't give (spec 007, research R9)."""
    from .form_connections import UNKNOWN_CURSOR

    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={'error': 'Validation error', 'message': UNKNOWN_CURSOR},
    )


def _decode_cursor(cursor: str) -> tuple[datetime, int, str]:
    """The time, `position` and `id` a cursor holds; anything else answers 400."""
    try:
        text = base64.urlsafe_b64decode(cursor.encode('ascii')).decode()
        occurred_text, position_text, entry_id = text.split(_CURSOR_SEPARATOR)
        occurred_at = datetime.fromisoformat(occurred_text)
        position = int(position_text)
        uuid.UUID(entry_id)
    except (ValueError, UnicodeError, binascii.Error):
        raise _unknown_cursor() from None
    if occurred_at.tzinfo is None:
        raise _unknown_cursor()
    return occurred_at, position, entry_id


def list_activity(
    db: Session, form_connection_id: str, cursor: str | None
) -> ActivityPage:
    """A page of a connection's activity, newest first (FR-023, FR-031).

    `ORDER BY occurred_at DESC, position DESC, id`, 50 per page with a keyset
    cursor over the three, built as the search's is, so that new entries don't
    shift the pages; `next_cursor` is None on the last page. A cursor this list
    didn't answer gets 400, and a deleted or unknown connection 404.
    """
    from . import form_connections

    form_connections.find_form_connection(db, form_connection_id)
    query = select(ConnectionActivity).where(
        ConnectionActivity.form_connection_id == form_connection_id
    )
    if cursor is not None:
        occurred_at, position, entry_id = _decode_cursor(cursor)
        query = query.where(
            or_(
                ConnectionActivity.occurred_at < occurred_at,
                and_(
                    ConnectionActivity.occurred_at == occurred_at,
                    or_(
                        ConnectionActivity.position < position,
                        and_(
                            ConnectionActivity.position == position,
                            ConnectionActivity.id > entry_id,
                        ),
                    ),
                ),
            )
        )
    rows = db.scalars(_newest_first(query).limit(ACTIVITY_PAGE_SIZE + 1)).all()
    page = rows[:ACTIVITY_PAGE_SIZE]
    return ActivityPage(
        items=[entry_view(row) for row in page],
        next_cursor=(
            _encode_cursor(page[-1]) if len(rows) > ACTIVITY_PAGE_SIZE else None
        ),
    )


def last_activity(db: Session, form_connection: FormConnection) -> ActivityEntry | None:
    """The entry the closed activity card's line shows (FR-024, FR-032).

    While the connection is deactivated, its newest `deactivated` entry; otherwise
    the newest entry that has a person; without one, the newest entry, which the
    line shows as the time alone. None for a connection without entries.
    """
    from .form_connections import state_of

    query = select(ConnectionActivity).where(
        ConnectionActivity.form_connection_id == form_connection.id
    )
    candidates = [query.where(ConnectionActivity.actor_name.is_not(None)), query]
    if state_of(form_connection) == 'deactivated':
        candidates.insert(0, query.where(ConnectionActivity.kind == DEACTIVATED))
    for candidate in candidates:
        row = db.scalars(_newest_first(candidate).limit(1)).first()
        if row is not None:
            return entry_view(row)
    return None
