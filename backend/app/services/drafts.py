"""Connection drafts: saving, reading, publishing and deleting them (spec 005).

A draft is a form connection that isn't published yet: its row has no
`published_at`, no revision, no rule set, no branch rows and no EUDIPLO
configuration, and its content (documents, branches and the editor's step) lives in
`form_connections.draft`, with a version that every save raises (research R1, R6).
A row is in one of two states, draft or published, and a published connection never
becomes a draft again. Its URLs answer as unavailable while it is a draft.

Saving a draft checks its structure only (`complete=False`, research R3) and numbers
new rules and groups from the row's counters (R4). Its variants keep their ids, which
the server assigns where a request sends none, and which their branch rows take when
the draft is published (spec 007, research R10, FR-029). Publishing runs the checks of
creating a connection and then `form_connections.create_revision()` with a
`DraftGuard`, so there is no second save path (R5). An approval request publishes
the stored draft through the same path (`check_publishable()` before it is made,
`publish_stored_draft()` once it is approved; spec 007, research R12). Nothing here
calls EUDIPLO except through publishing. Publishing with a start date schedules the
connection through that same path (spec 010, research R1, R2). Deleting a draft
marks its row, as deleting a published connection does, so that "Undo" can restore
it (spec 010, research R5); the marked row is gone for every read here.
"""

import logging
import uuid
from datetime import date
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models import FormConnection
from ..schemas import (
    DRAFT_CONTENT,
    Deletion,
    DraftContent,
    DraftCreate,
    DraftPublish,
    DraftUpdate,
    FormConnectionDraft,
    NumberingBase,
    RequestedDocument,
    RulesInput,
    to_iso_utc,
)
from ..schemas import FormConnection as FormConnectionView
from . import activity, form_connections, rules
from .activity import Actor
from .form_connections import (
    DRAFT_CHANGED_DETAIL,
    DRAFT_PUBLISHED_DETAIL,
    DraftGuard,
)

logger = logging.getLogger(__name__)


def _draft_published() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail=DRAFT_PUBLISHED_DETAIL
    )


def _draft_changed() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail=DRAFT_CHANGED_DETAIL
    )


def draft_view(db: Session, form_connection: FormConnection) -> FormConnectionDraft:
    """A draft as the API returns it: its content and version, without URLs.

    Its branches carry their ids (spec 007, research R10), and its documents are
    listed in the stored order (spec 010, research R6, FR-050). Answers 409
    `draft_published` for a published row. `last_activity` is the entry the
    activity card's closed line shows (spec 010, data-model 2.5).
    """
    if form_connection.draft is None or form_connection.draft_version is None:
        raise _draft_published()
    content = DRAFT_CONTENT.validate_python(form_connection.draft)
    return FormConnectionDraft(
        state='draft',
        id=form_connection.id,
        name=form_connection.name,
        description=form_connection.description,
        # In the stored order; the content keeps catalog order (spec 010, R6)
        documents=form_connections.documents_view(
            form_connections.ordered_documents(
                content.documents, form_connection.document_order
            )
        ),
        branches=content.branches,
        next_rule_number=form_connection.next_rule_number,
        next_group_number=form_connection.next_group_number,
        step=content.step,
        version=form_connection.draft_version,
        created_at=to_iso_utc(form_connection.created_at),
        updated_at=to_iso_utc(form_connection.updated_at),
        last_activity=activity.last_activity(db, form_connection),
    )


def get_form_connection_or_draft(
    db: Session, form_connection_id: str
) -> FormConnectionView | FormConnectionDraft:
    """A draft's content, or a published connection with its URLs.

    Answers 404 for an unknown or deleted form connection.
    """
    form_connection = form_connections.find_form_connection(db, form_connection_id)
    if form_connection.published_at is None:
        return draft_view(db, form_connection)
    return form_connections.get_form_connection(db, form_connection_id)


def _check_state(
    form_connection: FormConnection, version: int | None, replace: bool
) -> None:
    """Refuse a row that is no longer the draft the editor loaded (research R6).

    409 `draft_published` if it is published, first and also with `replace`
    (FR-023), then 409 `draft_changed` if `version` isn't the stored version and
    `replace` is false (FR-022). Without a `version` (deleting a draft), only the
    state is checked. `DraftGuard.check()` makes the same comparison when
    publishing.
    """
    if form_connection.published_at is not None:
        raise _draft_published()
    if version is not None and not replace and version != form_connection.draft_version:
        raise _draft_changed()


def _lock_draft(
    db: Session,
    form_connection_id: str,
    version: int | None = None,
    replace: bool = False,
) -> FormConnection:
    """Lock a draft's row and check it with `_check_state`, or answer 404 or 409.

    A refusal releases the lock.
    """
    form_connection = form_connections._lock_form_connection(db, form_connection_id)
    try:
        _check_state(form_connection, version, replace)
    except HTTPException:
        db.rollback()
        raise
    return form_connection


def _clean_draft(
    db: Session, data: DraftCreate, form_connection_id: str | None
) -> tuple[str, str, list[RequestedDocument], rules.RulesSave]:
    """The structural checks of a draft (FR-003, research R3), or a 400.

    Returns the name, the description, the documents and the checked rules, whose
    branches all have ids: a null one gets a UUID, and a UUID the request sends is
    kept unless another form connection's branch has it (`form_connection_id` is
    the draft's, None while it is created; spec 007, research R10).
    """
    name = form_connections.clean_name(data.name)
    description = form_connections.clean_description(data.description)
    documents = form_connections.clean_documents(data.documents, complete=False)
    save = rules.clean_rules(
        RulesInput(
            branches=data.rules.branches,
            numbering_base=data.rules.numbering_base,
        ),
        documents,
        main_branch_id=None,
        complete=False,
    )
    rules.check_draft_branch_ids(db, form_connection_id, save.branches)
    return name, description, documents, save


def _content(
    documents: list[RequestedDocument],
    numbering: rules.DraftNumbering,
    data: DraftCreate,
) -> dict[str, Any]:
    """The JSON that `form_connections.draft` stores."""
    return DRAFT_CONTENT.dump_python(
        DraftContent(documents=documents, branches=numbering.branches, step=data.step),
        mode='json',
    )


def create_draft(
    db: Session, data: DraftCreate, *, actor: Actor
) -> FormConnectionDraft:
    """Store a new draft, version 1, after the structural checks (FR-001, FR-003).

    Its rules and groups are numbered from (1, 1). No EUDIPLO call, and no
    revision, rule set or branch row (FR-005). Answers 400 when the structure is
    broken. `actor` is who creates it, recorded as `created` in the commit that
    inserts the row (spec 010, research R4). The row stores the order of
    `data.documents`; the content keeps catalog order (spec 010, research R6).
    """
    name, description, documents, save = _clean_draft(db, data, None)
    numbering = rules.number_draft(save, (1, 1))
    form_connection = FormConnection(
        id=str(uuid.uuid4()),
        name=name,
        description=description,
        is_active=True,
        published_at=None,
        current_revision=None,
        current_rule_set=None,
        draft=_content(documents, numbering, data),
        draft_version=1,
        next_rule_number=numbering.next_rule_number,
        next_group_number=numbering.next_group_number,
        document_order=form_connections.document_order_of(data.documents),
    )
    db.add(form_connection)
    # The row first, which its entry refers to; it is this transaction's alone
    # until the commit
    db.flush()
    activity.record(db, form_connection.id, [activity.Entry(activity.CREATED)], actor)
    db.commit()
    logger.info('Draft %s saved', form_connection.id)
    return draft_view(db, form_connection)


def save_draft(
    db: Session, form_connection_id: str, data: DraftUpdate, *, actor: Actor
) -> FormConnectionDraft:
    """Replace a draft's content, name and description, and raise its version.

    1. Read the row: 404 if it's missing, 409 `draft_published` if it's
       published (also with `data.replace`), and 409 `draft_changed` if
       `data.version` is outdated and `data.replace` is false, before the content
       is checked, so that a stale editor meets the conflict (research R6).
    2. Check the structure (FR-003): 400 before anything is written.
    3. Lock the row and repeat step 1, number new identifiers from the row's
       counters (research R4), write the content, raise the counters (never lower
       them) and add 1 to the version, in one commit (FR-002, FR-022). That
       commit records what the save changes against the draft as stored under
       the lock (`activity.changes_between()`; nothing for an unchanged draft).

    A refusal stores nothing. No EUDIPLO call. `actor` is who saves it (spec 010,
    research R4). The commit also stores the order of `data.documents`, and the
    activity compares the documents in the stored order, so that a move records
    `documents_changed`; the content keeps catalog order (spec 010, research R6).
    """
    _check_state(
        form_connections.find_form_connection(db, form_connection_id),
        data.version,
        data.replace,
    )
    name, description, documents, save = _clean_draft(db, data, form_connection_id)
    document_order = form_connections.document_order_of(data.documents)

    form_connection = _lock_draft(db, form_connection_id, data.version, data.replace)
    before = form_connections.stored_draft_content(form_connection)
    numbering = rules.number_draft(
        save, (form_connection.next_rule_number, form_connection.next_group_number)
    )
    form_connection.name = name
    form_connection.description = description
    if document_order != form_connection.document_order:
        form_connection.document_order = document_order
    form_connection.draft = _content(documents, numbering, data)
    form_connection.next_rule_number = max(
        form_connection.next_rule_number, numbering.next_rule_number
    )
    form_connection.next_group_number = max(
        form_connection.next_group_number, numbering.next_group_number
    )
    form_connection.draft_version = (form_connection.draft_version or 0) + 1
    # The content about to be stored, its branches with their final identifiers
    after = activity.Content(
        name=name,
        description=description,
        documents=form_connections.ordered_documents(documents, document_order),
        branches=numbering.branches,
    )
    activity.record(
        db, form_connection_id, activity.changes_between(before, after), actor
    )
    db.commit()
    logger.info('Draft %s saved', form_connection_id)
    return draft_view(db, form_connection)


def _publish_checks(
    db: Session,
    form_connection: FormConnection,
    name: str | None,
    description: str | None,
    documents: list[RequestedDocument],
    rules_input: RulesInput | None,
) -> tuple[str, str, list[RequestedDocument], rules.RulesSave | None]:
    """The checks of publishing a draft, in their order: a 400 before any write.

    Those of creating a form connection, unchanged and with their messages (spec
    005, FR-009; the description optional, spec 006), the rules' identifiers
    against the draft's counters, and the variants' ids, which their branch rows
    take (spec 007, FR-029). Returns the name, the description, the documents and
    the checked rules (None without rules).
    """
    clean_name = form_connections.clean_name(name)
    clean_description = form_connections.clean_description(description)
    clean_documents = form_connections.clean_documents(documents)
    save: rules.RulesSave | None = None
    if rules_input is not None:
        save = rules.clean_rules(rules_input, clean_documents, main_branch_id=None)
        rules.check_first_save(
            save,
            counters=(
                form_connection.next_rule_number,
                form_connection.next_group_number,
            ),
        )
        # The branch rows take the draft's ids (FR-029); `first_rule_set` repeats
        # this under the row lock
        rules.check_draft_branch_ids(db, form_connection.id, save.branches)
    return clean_name, clean_description, clean_documents, save


def _stored_rules(form_connection: FormConnection, content: DraftContent) -> RulesInput:
    """A stored draft's branches as publishing takes them.

    Numbered from the row's counters, so that every stored identifier counts as
    loaded and keeps its number, as the editor's publish of the loaded draft sends
    them (research R4).
    """
    return RulesInput(
        branches=content.branches,
        numbering_base=NumberingBase(
            rule=form_connection.next_rule_number,
            group=form_connection.next_group_number,
        ),
    )


def check_publishable(
    db: Session, form_connection: FormConnection
) -> tuple[str, str, list[RequestedDocument], rules.RulesSave | None]:
    """Whether publishing would accept the stored draft, without writing anything.

    The checks of `publish_draft()`'s step 2 on the draft's stored name,
    description, documents and branches, numbered from the row's counters: a 400
    with publishing's message for the first problem (FR-022; spec 005, FR-009). An
    approval request to publish is made only for a draft that passes (spec 007,
    research R12). Answers 409 `draft_published` for a published row.
    """
    if form_connection.draft is None or form_connection.published_at is not None:
        raise _draft_published()
    content = DRAFT_CONTENT.validate_python(form_connection.draft)
    return _publish_checks(
        db,
        form_connection,
        form_connection.name,
        form_connection.description,
        content.documents,
        _stored_rules(form_connection, content),
    )


def publish_draft(
    db: Session, form_connection_id: str, data: DraftPublish, *, actor: Actor
) -> FormConnectionView:
    """Publish a draft: the first revision, rule set 1 and the URLs (FR-009).

    1. Read the row: 404 if it's missing, 409 `draft_published` if it's
       published (also with `data.replace`), and 409 `draft_changed` if
       `data.version` is outdated and `data.replace` is false, before the content
       is checked (research R6).
    2. The checks of creating a form connection, unchanged and in its order, the
       rules' identifiers against the draft's counters, and the variants' ids,
       which their branch rows take (spec 007, FR-029): 400 before anything is
       written (`_publish_checks`, which `check_publishable()` shares).
    3. `data.start_date`, if any, must be a day after today in Germany: 400
       `invalid_start_date` before anything is written or EUDIPLO is called
       (`form_connections.check_start_date()`; spec 010, FR-003).
    4. `form_connections.create_revision()` with a `DraftGuard`, which repeats
       step 1 under both of its row locks, reserves the revision, creates the
       EUDIPLO configuration with no transaction held, and publishes the row in
       one commit (research R5). That commit, under the last lock, records what
       the body changes against the stored draft, then `published`, and sets
       `activated_at` (spec 010, data-model 1.3, 2.3). With a start date, it
       checks the date again under both locks and publishes the row scheduled:
       not active, with its `start_date`, without `activated_at`, recording
       `published` then `scheduled` (data-model 1.3, "publish, on a date").

    An `EudiploError` reaches the caller, and the draft stays a draft. A draft
    deleted meanwhile answers 404, one published meanwhile 409 `draft_published`,
    one saved meanwhile 409 `draft_changed` unless `data.replace`, and a start
    date that is no longer after today when the row is locked again 400
    `invalid_start_date`; the configuration is then deleted again and the draft
    keeps its stored content. None of these records anything. `actor` is who
    publishes it (spec 010, research R4). The publish stores the order of
    `data.documents`; the revision keeps catalog order (spec 010, research R6).
    """
    form_connection = form_connections.find_form_connection(db, form_connection_id)
    _check_state(form_connection, data.version, data.replace)
    name, description, documents, save = _publish_checks(
        db,
        form_connection,
        data.name,
        data.description,
        data.documents,
        data.rules,
    )
    form_connections.check_start_date(data.start_date)

    # End the read transaction: the revision path locks the row itself
    db.rollback()
    form_connections.create_revision(
        db,
        form_connection_id,
        documents,
        changes={'name': name, 'description': description},
        save=save,
        guard=DraftGuard(version=data.version, replace=data.replace),
        actor=actor,
        start_date=data.start_date,
        document_order=form_connections.document_order_of(data.documents),
    )
    logger.info('Draft %s published', form_connection_id)
    return form_connections.get_form_connection(db, form_connection_id)


def publish_stored_draft(
    db: Session,
    form_connection_id: str,
    version: int,
    *,
    actor: Actor,
    start_date: date | None = None,
) -> FormConnectionView:
    """Publish the stored draft as it was at `version` (spec 007, research R12).

    What an approved approval request runs: the `DraftPublish` body is built from
    the stored draft (its name, description, documents and branches, numbered from
    the row's counters) with `version`, `replace=False` and `start_date`, and goes
    through `publish_draft()`, so there is one save path with the `DraftGuard`.
    404 if the draft is missing, 409 `draft_published` if it is published, and 409
    `draft_changed` if its version is no longer `version`, here and under the
    publish's row locks: only the content of that version is published. With
    `start_date`, the date the request asked for, it is published scheduled, and
    a date that isn't after today in Germany, before EUDIPLO is called or under the
    publish's row locks, answers 400 `invalid_start_date` (spec 010, research R2).
    An `EudiploError` reaches the caller, and the draft stays a draft. `actor` is
    who publishes it: the team member who approved, with the agent that asked.
    """
    form_connection = form_connections.find_form_connection(db, form_connection_id)
    # The content read below belongs to this version: both come from one row
    _check_state(form_connection, version, replace=False)
    content = DRAFT_CONTENT.validate_python(form_connection.draft)
    data = DraftPublish(
        name=form_connection.name,
        description=form_connection.description,
        # In the stored order, which the publish stores again (spec 010, R6)
        documents=form_connections.ordered_documents(
            content.documents, form_connection.document_order
        ),
        rules=_stored_rules(form_connection, content),
        start_date=start_date,
        version=version,
        replace=False,
    )
    return publish_draft(db, form_connection_id, data, actor=actor)


def delete_draft(
    db: Session,
    form_connection_id: str,
    version: int | None = None,
    *,
    actor: Actor,
    deletion_id: str | None = None,
    deleted_by_id: str | None = None,
) -> Deletion:
    """Delete a draft (FR-010, research R7), restorably (spec 010, research R5).

    Answers 404 if it's missing or deleted and 409 `draft_published` if it's
    published. The editor's delete compares no version; an approved approval
    request passes the `version` it was made for, and a draft saved since answers
    409 `draft_changed` under the row lock, so that only the content the team
    member saw is deleted (spec 007, research R12, FR-024). Otherwise, under the
    row lock and in one commit, `form_connections._mark_deleted()` marks the row
    deleted, which stays until the restore time has passed, removes any revision
    that a publish in flight reserved, stores the draft's waiting approval
    requests as cancelled with `draft_deleted`, and records `deleted` with
    `actor`; that publish then finds the row deleted, answers 404 and deletes its
    own configuration. From then on the draft is gone for every read, as when its
    row was removed, and its URLs answer 404. No EUDIPLO call. Answers the
    deletion: restorable with `deletion_id` and `deleted_by_id`, which the router
    passes; without them, as an approved approval request runs it, `id` null
    (FR-067).
    """
    form_connection = _lock_draft(db, form_connection_id, version)
    deletion, _ = form_connections._mark_deleted(
        db,
        form_connection,
        actor=actor,
        deleted_by_id=deleted_by_id,
        deletion_id=deletion_id,
    )
    db.commit()
    logger.info('Draft %s deleted', form_connection_id)
    return deletion
