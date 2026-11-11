"""Deleting several connections, taking a deletion back, and making it final.

Spec 010, research R5 and R10. Deleting marks a connection's row
(`form_connections._mark_deleted()`): one id for the rows deleted together, and
the team member who deleted. `delete_connections()` deletes several connections
as one deletion, all or none (FR-041, FR-043). For DELETION_UNDO_SECONDS that team
member can take the deletion back: `restore_deletion()` clears the marks of all its
rows or of none (data-model 3, FR-034 to FR-036). Nothing else was touched, so the
connections are back as they were, and what the deletion ended stays ended
(FR-035). Both lock the rows in id order, as every deletion does, so that two of
them never wait for each other in a circle.

`restore_cutoff()` is the one boundary of the restore time, which the restore and
the worker's two steps after it share: a row deleted at or before it can no longer
be restored, and only then does the worker delete its EUDIPLO configurations
(`delete_unused_configs`) and make the deletion final as a deletion was before
this feature (`finish_deletions()`: its activity, and a draft's row; FR-030).

Nothing here calls EUDIPLO, and the logs hold ids and counts only.
"""

import logging
import uuid
from collections.abc import Sequence
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..config import settings
from ..language import Text
from ..models import ConnectionActivity, FormConnection, FormConnectionRevision
from ..schemas import ConnectionState, Deletion, DeletionItem, FormConnectionSummary
from . import activity, form_connections
from .activity import Actor

logger = logging.getLogger(__name__)

# The most rows `finish_deletions()` takes in one transaction
FINISH_BATCH_SIZE = 100

NOT_RESTORABLE_DETAIL = {
    'error': 'not_restorable',
    'message': Text(
        en='This can no longer be restored.',
        de='Das kann nicht mehr wiederhergestellt werden.',
    ),
}
# A bulk deletion's refusal (FR-043, contracts/copy.md section 8); the answer adds
# `changed_ids`. The dialog names the connection from its own rows
SELECTION_CHANGED_MESSAGE = Text(
    en='Nothing was deleted: a connection was deleted or changed in the meantime.',
    de=(
        'Nichts wurde gelöscht: Eine Anbindung wurde inzwischen gelöscht oder geändert.'
    ),
)


def _now() -> datetime:
    """The restore's clock, read under the row locks; the tests move it."""
    return datetime.now(tz=timezone.utc)


def restore_cutoff(now: datetime) -> datetime:
    """The latest deletion time whose restore time has passed at `now`.

    A row deleted at or before it can no longer be restored: its deletion is
    final. One deleted after it can, until its deletion's `restorable_until`
    (`_mark_deleted()`); with DELETION_UNDO_SECONDS 0, none can.
    """
    return now - timedelta(seconds=settings.deletion_undo_seconds)


def _as_shown(form_connection: FormConnection | None, state: ConnectionState) -> bool:
    """Whether a locked row is still what the dialog showed: there, not deleted, and
    in `state` as every view derives it (`state_of()`)."""
    return (
        form_connection is not None
        and form_connection.deleted_at is None
        and form_connections.state_of(form_connection) == state
    )


def delete_connections(
    db: Session,
    items: Sequence[DeletionItem],
    *,
    account_id: str,
    actor: Actor,
) -> Deletion:
    """Delete several connections as one deletion, all or none (FR-041, FR-043).

    Research R10. `items` are the rows the dialog listed, each with the state it
    showed; `DeletionCreate` checked them (1 to 500, distinct ids). Drafts and
    published connections alike: every listed row is locked in one statement, in
    id order as every deletion locks them (`restore_deletion()` too), so that two
    deletions whose rows overlap never wait for each other in a circle; the
    second one waits, then finds the first one's rows deleted.

    Under the locks, each item's row must exist, not be deleted, and be in the
    item's state (`_as_shown()`). If one isn't, the locks are released and 409
    `selection_changed` answers the ids of all such items, in the order of
    `items`, in `changed_ids`: nothing changes, no activity is recorded and no
    request is cancelled. Otherwise every row is marked with one new deletion id
    and the account `account_id`, in id order, by the single deletes' own
    `form_connections._mark_deleted()` (its open requests cancelled, its waiting
    approval requests stored cancelled, a draft's reserved revision removed,
    `deleted` recorded with `actor`), and one commit makes the deletion. No
    EUDIPLO call: the worker cleans up after the restore time, as for a single
    deletion.

    Answers the deletion, which `restore_deletion()` brings back whole until
    `restorable_until`: the first row's, as `_mark_deleted()` reads the clock
    row by row, so that its restore time ends first. Logs the deletion's id and
    the counts.
    """
    rows = db.scalars(
        select(FormConnection)
        .where(FormConnection.id.in_([item.id for item in items]))
        .order_by(FormConnection.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).all()
    by_id = {row.id: row for row in rows}
    changed_ids = [
        item.id for item in items if not _as_shown(by_id.get(item.id), item.state)
    ]
    if changed_ids:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                'error': 'selection_changed',
                'message': SELECTION_CHANGED_MESSAGE,
                'changed_ids': changed_ids,
            },
        )
    deletion_id = str(uuid.uuid4())
    marked: list[Deletion] = []
    cancelled = 0
    for row in rows:
        deletion, row_cancelled = form_connections._mark_deleted(
            db,
            row,
            actor=actor,
            deleted_by_id=account_id,
            deletion_id=deletion_id,
        )
        marked.append(deletion)
        cancelled += row_cancelled
    db.commit()
    logger.info(
        'Deletion %s: %d form connections deleted; %d open requests cancelled',
        deletion_id,
        len(rows),
        cancelled,
    )
    return marked[0]


def _restorable(
    form_connection: FormConnection, account_id: str, cutoff: datetime
) -> bool:
    """Whether the deleting account may still restore a row deleted by it."""
    return (
        form_connection.deleted_by_id == account_id
        and form_connection.deleted_at is not None
        and form_connection.deleted_at > cutoff
    )


def restore_deletion(
    db: Session, deletion_id: str, *, account_id: str, actor: Actor
) -> list[FormConnectionSummary]:
    """Bring back every connection of a deletion, or none (FR-034 to FR-036).

    Locks the rows that `deletion_id` still marks deleted, in id order as every
    deletion locks them, and reads the clock only once it holds them: the
    worker's configuration cleanup checks the restore time under the same row
    lock before it calls EUDIPLO, so a row it found final can't be restored
    afterwards, and one restored first keeps its configuration (R15 V10).

    No row (an unknown id, a deletion restored already, or one an approval
    request ran, which has no id), a row deleted at or before `restore_cutoff()`,
    or a row that another account deleted answers 409 `not_restorable` after
    releasing the locks, and nothing changes. Otherwise, in one commit, every row's
    `deleted_at`, `deletion_id` and `deleted_by_id` are cleared, its `updated_at`
    is kept (`flag_modified`, as `_mark_deleted()` keeps it; R15 V1), and
    `restored` is recorded with `actor`.

    Nothing else changes: the status, the dates, the start date, the content, the
    activity and the links' ids are as before the deletion, and the requests and
    approval requests it cancelled stay cancelled (FR-035). A scheduled connection
    whose start date came meanwhile stays scheduled here: the worker's next cycle
    makes it active, as of its start (`activate_due_connections()`). No EUDIPLO
    call: the configurations were kept for the restore time. Answers the restored
    connections in the overview's order, most recently updated first.
    """
    rows = db.scalars(
        select(FormConnection)
        .where(
            FormConnection.deletion_id == deletion_id,
            FormConnection.deleted_at.is_not(None),
        )
        .order_by(FormConnection.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).all()
    cutoff = restore_cutoff(_now())
    if not rows or not all(_restorable(row, account_id, cutoff) for row in rows):
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=NOT_RESTORABLE_DETAIL
        )
    for row in rows:
        row.deleted_at = None
        row.deletion_id = None
        row.deleted_by_id = None
        # Before anything flushes the row: its current `updated_at` goes into the
        # UPDATE, so the column's `onupdate` doesn't move it
        flag_modified(row, 'updated_at')
    for row in rows:
        activity.record(db, row.id, [activity.Entry(activity.RESTORED)], actor)
    # The overview's order (`list_form_connections()`); `sorted` is stable
    ordered = sorted(rows, key=lambda row: row.id)
    ordered.sort(key=lambda row: row.updated_at, reverse=True)
    restored = [form_connections._summary(row) for row in ordered]
    db.commit()
    logger.info('Deletion %s restored: %d form connections', deletion_id, len(rows))
    return restored


def finish_deletions(db: Session, now: datetime) -> tuple[int, int]:
    """Make final the deletions whose restore time has passed at `now` (FR-030).

    The worker's last step. For the rows deleted at or before `restore_cutoff()`
    (one an approval request deleted too, after the same time), it deletes their
    `connection_activity` rows, and the rows of deleted drafts with any revision
    a publish in flight had reserved (`_mark_deleted()` removed it already; kept,
    as the migration's downgrade keeps it): what deleting a draft did before this
    feature. A draft has no rule set, branch row or request. A published
    connection's row stays for good, so that its URLs keep answering 409
    `unavailable`; its configurations go with the worker's `delete_unused_configs`
    step, after the same time.

    Short transactions of at most FINISH_BATCH_SIZE rows, each committed: the rows
    are locked `FOR UPDATE SKIP LOCKED`, so that the step never waits for a row
    another transaction holds (a refused late restore, for example), which a later
    cycle takes; the draft rows' delete checks their conditions again. A row is
    taken while it is a draft or still has activity, so each published one is
    finished once. Logs the two counts only, and returns them: the activity
    entries and the drafts deleted.
    """
    final = FormConnection.deleted_at <= restore_cutoff(now)
    draft = FormConnection.published_at.is_(None)
    has_activity = (
        select(ConnectionActivity.id)
        .where(ConnectionActivity.form_connection_id == FormConnection.id)
        .exists()
    )
    entries = drafts = 0
    while True:
        ids = list(
            db.scalars(
                select(FormConnection.id)
                .where(final, or_(draft, has_activity))
                .order_by(FormConnection.id)
                .limit(FINISH_BATCH_SIZE)
                .with_for_update(skip_locked=True)
            ).all()
        )
        if not ids:
            break
        entries += len(
            db.scalars(
                delete(ConnectionActivity)
                .where(ConnectionActivity.form_connection_id.in_(ids))
                .returning(ConnectionActivity.id)
                .execution_options(synchronize_session=False)
            ).all()
        )
        finished_drafts = select(FormConnection.id).where(
            FormConnection.id.in_(ids), final, draft
        )
        db.execute(
            delete(FormConnectionRevision)
            .where(FormConnectionRevision.form_connection_id.in_(finished_drafts))
            .execution_options(synchronize_session=False)
        )
        drafts += len(
            db.scalars(
                delete(FormConnection)
                .where(FormConnection.id.in_(ids), final, draft)
                .returning(FormConnection.id)
                .execution_options(synchronize_session=False)
            ).all()
        )
        db.commit()
        if len(ids) < FINISH_BATCH_SIZE:
            break
    if entries or drafts:
        logger.info(
            'Finished deletions: %d activity entries and %d drafts deleted',
            entries,
            drafts,
        )
    return entries, drafts
