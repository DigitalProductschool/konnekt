"""Form connections: validation, creation, reading and changes (FR-001 to FR-006).

Creating a form connection stores revision 1 and creates its EUDIPLO presentation
configuration; changing its documents stores the next revision with a configuration of
its own (data-model.md, "Creating a revision"). Changing the name or the description
creates no revision. A form connection's branches and rules are saved with it, as
rule sets (spec 002, research R9): checked first, then saved in the transaction that
makes the documents current, so documents and rules change together or not at all
(FR-028). Without rules, a new form connection gets its main branch, "Standard" without
rules (FR-018). EUDIPLO errors reach the caller as `EudiploError`; nothing is saved
then. Deactivating and deleting cancel the open requests and call no EUDIPLO: the
worker deletes the sessions and, once no request needs them, the configurations.

A form connection is a draft until it is published (spec 005): it has no revision,
rule set or EUDIPLO configuration yet, and `services/drafts.py` saves and publishes
it. The published paths here refuse a draft with 409 `not_published`, and the
worker's re-sync leaves it alone.
"""

import base64
import binascii
import logging
import uuid
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, and_, delete, func, null, or_, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..catalog import DOCUMENT_TYPES, get_document_type
from ..config import settings
from ..errors import describe_error
from ..models import FormConnection, FormConnectionRevision
from ..schemas import (
    Branch,
    DocumentField,
    FormConnectionCreate,
    FormConnectionPage,
    FormConnectionSummary,
    FormConnectionUpdate,
    RequestedDocument,
    RequestedDocumentView,
    SnapshotBranch,
    to_iso_utc,
)
from ..schemas import FormConnection as FormConnectionView
from . import dcql, rules
from .document_requests import FORM_CONNECTION_NOT_FOUND, cancel_open_requests
from .eudiplo import EudiploError, get_eudiplo_client

logger = logging.getLogger(__name__)

NAME_MAX_LENGTH = 200
DESCRIPTION_MAX_LENGTH = 500
# The search's page size: the default and the largest `limit` (spec 007, R9)
SEARCH_PAGE_SIZE = 25

# The search's status filter (spec 007, research R9)
SearchStatus = Literal['draft', 'live', 'deactivated']

NOT_FOUND = FORM_CONNECTION_NOT_FOUND
NOT_PUBLISHED_DETAIL = {
    'error': 'not_published',
    'message': 'This connection is a draft. Continue it to save or publish it.',
}
DRAFT_PUBLISHED_DETAIL = {
    'error': 'draft_published',
    'message': 'This draft has been published since you opened it.',
}
# No variant of a draft has a pull URL, so the message names none (spec 005, R6)
DRAFT_CHANGED_DETAIL = {
    'error': 'draft_changed',
    'message': 'Another team member saved this draft after you opened it.',
}
# An approved approval request finds the status it was made for changed (spec 007,
# research R12); the approval page says which change instead
STATUS_CHANGED_DETAIL = {
    'error': 'status_changed',
    'message': 'This connection was deactivated or reactivated in the meantime.',
}


def _validation_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={'error': 'Validation error', 'message': message},
    )


# Validation (data-model.md, "Validation (FR-003)"). Each check raises a 400 whose
# message names the problem, and returns the value as it is stored.


def _required_text(
    value: str | None, max_length: int, empty_message: str, too_long_message: str
) -> str:
    text = (value or '').strip()
    if not text:
        raise _validation_error(empty_message)
    if len(text) > max_length:
        raise _validation_error(too_long_message)
    return text


def clean_name(value: str | None) -> str:
    """Trim a form connection's name, which needs 1-200 characters."""
    return _required_text(
        value,
        NAME_MAX_LENGTH,
        'Enter a name.',
        f'The name can have at most {NAME_MAX_LENGTH} characters.',
    )


def clean_description(value: str | None) -> str:
    """Trim the description, optional free text of 0-500 characters.

    A note for the team, such as the form's ID in their form management system;
    nothing reads it. ``None``, empty and space-only values are stored as ``''``.
    """
    text = (value or '').strip()
    if len(text) > DESCRIPTION_MAX_LENGTH:
        raise _validation_error(
            f'The description can have at most {DESCRIPTION_MAX_LENGTH} characters.'
        )
    return text


def clean_documents(
    documents: list[RequestedDocument], *, complete: bool = True
) -> list[RequestedDocument]:
    """Check the requested documents against the catalog (FR-003).

    Returns them in catalog order, each with its fields in catalog order. With
    ``complete=False`` (saving a draft, spec 005 research R3), no documents and a
    document without fields are allowed; unknown types and fields, and anything
    listed twice, are still refused.
    """
    if complete and not documents:
        raise _validation_error('Add at least one document.')
    selected: dict[str, RequestedDocument] = {}
    for document in documents:
        document_type = get_document_type(document.document_type)
        if document_type is None:
            raise _validation_error(
                f"Unknown document type '{document.document_type}'."
            )
        label = document_type.label
        if document_type.key in selected:
            raise _validation_error(f"'{label}' is added more than once.")
        if complete and not document.fields:
            raise _validation_error(f"Select at least one field for '{label}'.")
        keys: set[str] = set()
        for key in document.fields:
            field = document_type.field(key)
            if field is None:
                raise _validation_error(f"Unknown field '{key}' for '{label}'.")
            if key in keys:
                raise _validation_error(
                    f"'{field.label}' is selected more than once for '{label}'."
                )
            keys.add(key)
        selected[document_type.key] = RequestedDocument(
            document_type=document_type.key,
            fields=[field.key for field in document_type.fields if field.key in keys],
        )
    return [selected[type_.key] for type_ in DOCUMENT_TYPES if type_.key in selected]


# Views


def trigger_url_of(form_connection_id: str) -> str:
    """The URL serviceBW calls to start a document request (research R12)."""
    return f'{settings.connection_base_url}/api/connect/{form_connection_id}/requests'


def documents_view(documents: list[RequestedDocument]) -> list[RequestedDocumentView]:
    """Show requested documents with the catalog's labels and field descriptions.

    Used for published connections and for drafts. A document type or field that the
    catalog no longer has keeps its key as its label.
    """
    views: list[RequestedDocumentView] = []
    for document in documents:
        document_type = get_document_type(document.document_type)
        fields: list[DocumentField] = []
        for key in document.fields:
            field = document_type.field(key) if document_type else None
            fields.append(
                DocumentField.model_validate(field)
                if field
                # A field the catalog no longer has: no rule can check it
                else DocumentField(
                    key=key,
                    label=key,
                    kind='image',
                    option_set=None,
                    date_of_birth=False,
                    parts=None,
                    multiple_values=False,
                )
            )
        views.append(
            RequestedDocumentView(
                document_type=document.document_type,
                label=document_type.label if document_type else document.document_type,
                fields=fields,
            )
        )
    return views


def _branch_views(
    form_connection_id: str, branches: list[SnapshotBranch]
) -> list[Branch]:
    views: list[Branch] = []
    for branch in branches:
        is_main = branch.origin == 'main'
        views.append(
            Branch.model_validate(
                {
                    **branch.model_dump(),
                    'is_main': is_main,
                    'pull_url': rules.pull_url_of(
                        form_connection_id, branch.id, is_main
                    ),
                }
            )
        )
    return views


def _view(
    form_connection: FormConnection,
    documents: list[RequestedDocument],
    branches: list[SnapshotBranch],
) -> FormConnectionView:
    branch_views = _branch_views(form_connection.id, branches)
    return FormConnectionView(
        id=form_connection.id,
        name=form_connection.name,
        description=form_connection.description,
        is_active=form_connection.is_active,
        documents=documents_view(documents),
        trigger_url=trigger_url_of(form_connection.id),
        # The main branch's, which is spec 001's; serviceBW puts the request
        # reference in place of the placeholder
        pull_url=next(view.pull_url for view in branch_views if view.is_main),
        branches=branch_views,
        status='published',
        rule_set_version=_published_rule_set(form_connection),
        next_rule_number=form_connection.next_rule_number,
        next_group_number=form_connection.next_group_number,
        created_at=to_iso_utc(form_connection.created_at),
        updated_at=to_iso_utc(form_connection.updated_at),
    )


def _summary(form_connection: FormConnection) -> FormConnectionSummary:
    return FormConnectionSummary(
        id=form_connection.id,
        name=form_connection.name,
        description=form_connection.description,
        is_active=form_connection.is_active,
        status='draft' if form_connection.published_at is None else 'published',
        updated_at=to_iso_utc(form_connection.updated_at),
    )


# Reading


def find_form_connection(db: Session, form_connection_id: str) -> FormConnection:
    """Return a form connection that isn't deleted, or answer 404."""
    form_connection = db.get(FormConnection, form_connection_id)
    if form_connection is None or form_connection.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    return form_connection


def _lock_form_connection(db: Session, form_connection_id: str) -> FormConnection:
    """Lock a form connection's row and read it again, or answer 404 once deleted."""
    form_connection = db.scalars(
        select(FormConnection)
        .where(FormConnection.id == form_connection_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()
    if form_connection is None or form_connection.deleted_at is not None:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    return form_connection


def _not_published() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail=NOT_PUBLISHED_DETAIL
    )


def find_published_form_connection(
    db: Session, form_connection_id: str
) -> FormConnection:
    """Return a published form connection that isn't deleted.

    Answers 404 like `find_form_connection`, and 409 `not_published` for a draft.
    """
    form_connection = find_form_connection(db, form_connection_id)
    if form_connection.published_at is None:
        raise _not_published()
    return form_connection


def _lock_published_form_connection(
    db: Session, form_connection_id: str
) -> FormConnection:
    """Lock a published form connection's row and read it again.

    Answers 404 like `_lock_form_connection`, and 409 `not_published` for a draft,
    after releasing the lock.
    """
    form_connection = _lock_form_connection(db, form_connection_id)
    if form_connection.published_at is None:
        db.rollback()
        raise _not_published()
    return form_connection


@dataclass(frozen=True)
class DraftGuard:
    """What publishing a draft requires of its row (spec 005, research R5, R6).

    `create_revision()` checks it under both of its row locks: before it reserves
    the revision, and before it makes the revision current. `version` is the draft
    version the editor loaded, and `replace` publishes over another team member's
    save.
    """

    version: int
    replace: bool

    def check(self, form_connection: FormConnection) -> None:
        """Refuse a row that is no longer the draft the editor loaded.

        409 `draft_published` if it is published, also with `replace` (FR-023),
        then 409 `draft_changed` if another save raised its version and `replace`
        is false (FR-022).
        """
        if form_connection.published_at is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=DRAFT_PUBLISHED_DETAIL
            )
        if not self.replace and self.version != form_connection.draft_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=DRAFT_CHANGED_DETAIL
            )


def _lock_for_revision(
    db: Session, form_connection_id: str, guard: DraftGuard | None
) -> FormConnection:
    """Lock the row that `create_revision()` works on and check its state.

    Without `guard`, a published form connection's (`_lock_published_form_connection`).
    With it, a draft's: 404 if it is missing, and the guard's refusal, each after
    releasing the lock.
    """
    if guard is None:
        return _lock_published_form_connection(db, form_connection_id)
    form_connection = _lock_form_connection(db, form_connection_id)
    try:
        guard.check(form_connection)
    except HTTPException:
        db.rollback()
        raise
    return form_connection


def _published_revision(form_connection: FormConnection) -> int:
    """The revision new requests use; a draft has none and answers 409."""
    if form_connection.current_revision is None:
        raise _not_published()
    return form_connection.current_revision


def _published_rule_set(form_connection: FormConnection) -> int:
    """The rule set new requests use; a draft has none and answers 409."""
    if form_connection.current_rule_set is None:
        raise _not_published()
    return form_connection.current_rule_set


def _current_revision(
    db: Session, form_connection: FormConnection
) -> FormConnectionRevision:
    return db.scalars(
        select(FormConnectionRevision).where(
            FormConnectionRevision.form_connection_id == form_connection.id,
            FormConnectionRevision.revision == _published_revision(form_connection),
        )
    ).one()


def _documents_of(revision: FormConnectionRevision) -> list[RequestedDocument]:
    return [RequestedDocument.model_validate(entry) for entry in revision.documents]


def _current_documents(
    db: Session, form_connection: FormConnection
) -> list[RequestedDocument]:
    return _documents_of(_current_revision(db, form_connection))


def _current_view(db: Session, form_connection: FormConnection) -> FormConnectionView:
    """A form connection with its current documents and its current branches."""
    return _view(
        form_connection,
        _current_documents(db, form_connection),
        rules.current_branches(db, form_connection),
    )


def list_form_connections(db: Session) -> list[FormConnectionSummary]:
    """Form connections that aren't deleted, most recently updated first."""
    form_connections = db.scalars(
        select(FormConnection)
        .where(FormConnection.deleted_at.is_(None))
        .order_by(FormConnection.updated_at.desc(), FormConnection.id)
    ).all()
    return [_summary(form_connection) for form_connection in form_connections]


# The search (spec 007, research R9; FR-007)

_SEARCH_STATUS_FILTERS: dict[SearchStatus, ColumnElement[bool]] = {
    'draft': FormConnection.published_at.is_(None),
    'live': and_(
        FormConnection.published_at.is_not(None), FormConnection.is_active.is_(True)
    ),
    'deactivated': and_(
        FormConnection.published_at.is_not(None), FormConnection.is_active.is_(False)
    ),
}
_CURSOR_SEPARATOR = '|'


def _like_pattern(text: str) -> str:
    """`%text%`, with LIKE's `%`, `_` and the escape character `\\` taken literally."""
    escaped = text.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
    return f'%{escaped}%'


def _encode_cursor(form_connection: FormConnection) -> str:
    """The position after a row: its `updated_at` (ISO) and `id`, base64."""
    position = (
        f'{form_connection.updated_at.isoformat()}{_CURSOR_SEPARATOR}'
        f'{form_connection.id}'
    )
    return base64.urlsafe_b64encode(position.encode()).decode('ascii')


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    """The `updated_at` and `id` a cursor holds; anything else answers 400."""
    try:
        position = base64.urlsafe_b64decode(cursor.encode('ascii')).decode()
        updated_at_text, form_connection_id = position.split(_CURSOR_SEPARATOR)
        updated_at = datetime.fromisoformat(updated_at_text)
        uuid.UUID(form_connection_id)
    except (ValueError, UnicodeError, binascii.Error):
        raise _validation_error('Unknown cursor.') from None
    if updated_at.tzinfo is None:
        raise _validation_error('Unknown cursor.')
    return updated_at, form_connection_id


def search_form_connections(
    db: Session,
    q: str | None,
    status: SearchStatus | None,
    cursor: str | None,
    limit: int = SEARCH_PAGE_SIZE,
) -> FormConnectionPage:
    """A page of the form connections that aren't deleted, for agents (FR-007).

    `q`, trimmed, matches the name or the description case-insensitively and
    literally; empty, it matches every row. `status` keeps drafts, live or
    deactivated connections. Ordered by `updated_at` descending, then `id`, with a
    keyset cursor, so that changes between calls don't shift the pages;
    `next_cursor` is None on the last page. A cursor this search didn't answer
    gets 400.
    """
    query = select(FormConnection).where(FormConnection.deleted_at.is_(None))
    text = (q or '').strip()
    if text:
        pattern = _like_pattern(text)
        query = query.where(
            or_(
                FormConnection.name.ilike(pattern, escape='\\'),
                FormConnection.description.ilike(pattern, escape='\\'),
            )
        )
    if status is not None:
        query = query.where(_SEARCH_STATUS_FILTERS[status])
    if cursor is not None:
        updated_at, form_connection_id = _decode_cursor(cursor)
        query = query.where(
            or_(
                FormConnection.updated_at < updated_at,
                and_(
                    FormConnection.updated_at == updated_at,
                    FormConnection.id > form_connection_id,
                ),
            )
        )
    rows = db.scalars(
        query.order_by(FormConnection.updated_at.desc(), FormConnection.id).limit(
            limit + 1
        )
    ).all()
    page = rows[:limit]
    return FormConnectionPage(
        items=[_summary(form_connection) for form_connection in page],
        next_cursor=_encode_cursor(page[-1]) if len(rows) > limit else None,
    )


def get_form_connection(db: Session, form_connection_id: str) -> FormConnectionView:
    """A form connection with its current documents, branches and URLs, or 404."""
    return _current_view(db, find_form_connection(db, form_connection_id))


# Saving


def _delete_unsaved_config(config_id: str) -> None:
    """Best effort: remove the EUDIPLO configuration of a revision that wasn't saved."""
    try:
        get_eudiplo_client().delete_config(config_id)
    except EudiploError as error:
        logger.error(
            'Could not delete EUDIPLO configuration %s of an unsaved revision: %s',
            config_id,
            describe_error(error),
        )
    else:
        logger.warning(
            'Deleted EUDIPLO configuration %s of an unsaved revision', config_id
        )


def create_form_connection(
    db: Session, data: FormConnectionCreate
) -> FormConnectionView:
    """Create a form connection with revision 1 and its EUDIPLO configuration.

    Its branches and rules become rule set 1, in the same transaction; without
    `rules`, it gets its main branch, "Standard" without rules. Everything is
    checked first; then the configuration is created. If the database then refuses
    the form connection, the configuration is deleted again.
    """
    name = clean_name(data.name)
    description = clean_description(data.description)
    documents = clean_documents(data.documents)
    save: rules.RulesSave | None = None
    if data.rules is not None:
        save = rules.clean_rules(data.rules, documents, main_branch_id=None)
        rules.check_first_save(save)
        # A variant id the editor chose must be free (spec 007, research R10);
        # `first_rule_set` checks it again before the rows are written
        rules.check_draft_branch_ids(db, None, save.branches)

    form_connection_id = str(uuid.uuid4())
    lifetime_seconds = settings.request_lifetime_seconds
    body = dcql.build_config(
        form_connection_id=form_connection_id,
        revision=1,
        name=name,
        documents=documents,
        lifetime_seconds=lifetime_seconds,
        trust_list_id=settings.eudiplo_trust_list_id,
    )
    # End the read transaction: no connection is held while EUDIPLO answers
    db.rollback()
    get_eudiplo_client().create_config(body)

    form_connection = FormConnection(
        id=form_connection_id,
        name=name,
        description=description,
        is_active=True,
        published_at=datetime.now(tz=timezone.utc),
        current_revision=1,
        current_rule_set=1,
        next_rule_number=1,
        next_group_number=1,
    )
    try:
        db.add(form_connection)
        db.flush()
        db.add(
            FormConnectionRevision(
                form_connection_id=form_connection_id,
                revision=1,
                documents=[document.model_dump() for document in documents],
                lifetime_seconds=lifetime_seconds,
                config_hash=dcql.config_hash(body),
                eudiplo_config_id=body['id'],
            )
        )
        branches = rules.first_rule_set(db, form_connection, save)
        db.commit()
    except HTTPException:
        db.rollback()
        _delete_unsaved_config(body['id'])
        raise
    except SQLAlchemyError as error:
        db.rollback()
        logger.error(
            'Saving form connection %s failed: %s',
            form_connection_id,
            describe_error(error),
        )
        _delete_unsaved_config(body['id'])
        raise
    return _view(form_connection, documents, branches)


def _build_config(
    form_connection_id: str,
    revision: int,
    name: str,
    documents: list[RequestedDocument],
) -> dict[str, Any]:
    """A revision's configuration body with the current settings (research R2)."""
    return dcql.build_config(
        form_connection_id=form_connection_id,
        revision=revision,
        name=name,
        documents=documents,
        lifetime_seconds=settings.request_lifetime_seconds,
        trust_list_id=settings.eudiplo_trust_list_id,
    )


def _remove_unused_revision(db: Session, revision_id: str) -> None:
    """Best effort: remove a revision that never became current.

    Its EUDIPLO configuration couldn't be created, so no request can use it.
    """
    try:
        db.rollback()
        db.execute(
            delete(FormConnectionRevision).where(
                FormConnectionRevision.id == revision_id
            )
        )
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        logger.error(
            'Could not remove unused revision %s: %s',
            revision_id,
            describe_error(error),
        )


def _publish(
    db: Session,
    form_connection: FormConnection,
    revision: int,
    save: rules.RulesSave | None,
) -> None:
    """Turn a locked draft row into a published connection, uncommitted.

    The revision becomes current, and rule set 1, the branch rows and the counters
    are written from the row's counters (spec 005, research R4, R5).
    """
    rules.first_rule_set(
        db,
        form_connection,
        save,
        counters=(form_connection.next_rule_number, form_connection.next_group_number),
    )
    # Every column of the CHECK constraint changes in the same flush
    form_connection.current_revision = revision
    form_connection.published_at = datetime.now(tz=timezone.utc)
    # SQL NULL: None would store JSON null, which the CHECK constraint refuses
    form_connection.draft = null()
    form_connection.draft_version = None


def create_revision(
    db: Session,
    form_connection_id: str,
    documents: list[RequestedDocument],
    changes: Mapping[str, str] | None = None,
    save: rules.RulesSave | None = None,
    guard: DraftGuard | None = None,
) -> FormConnection:
    """Store `documents` as the next revision and make it current (FR-005).

    data-model.md, "Creating a revision". No transaction is held while EUDIPLO
    answers, so the number is reserved first:
    1. Under the form connection's row lock, take the next number and insert the
       revision. It isn't current yet, so no request uses it, and a second edit at
       the same time takes the number after it.
    2. Create the EUDIPLO configuration.
    3. Lock the row again, make the revision current, unless a later one became
       current meanwhile, save the rules of `save` (spec 002, research R9), which
       are refused if another team member saved rules meanwhile and `save` doesn't
       replace them (FR-028), and apply `changes` (the name or the
       description), in one commit.

    Requests already in progress keep their revision and rule set, and the URLs
    never change. If EUDIPLO fails, the revision is removed again and the
    `EudiploError` reaches the caller. If the rules are refused under the lock, or
    the last commit fails, the configuration is deleted again, and the previous
    revision and rule set stay current (FR-028). A form connection that is or gets
    deleted answers 404, and a draft 409 `not_published`. The new configuration
    uses the current settings, and the revision stores the current
    REQUEST_LIFETIME_SECONDS.

    With `guard`, the row is a draft and this publishes it (spec 005, research R5):
    `guard.check()` runs under both row locks, before the revision is reserved
    (revision 1 on a draft without revisions, or 2 if a concurrent attempt still
    holds 1) and before it becomes current. A draft that is deleted meanwhile
    answers 404, one published meanwhile 409 `draft_published` (also with
    `replace`), and one saved meanwhile 409 `draft_changed` unless `replace`; either
    way the configuration is deleted again, and a refusal under the last lock also
    removes the revision. Otherwise the last commit makes the revision current, writes
    rule set 1, the branch rows and the counters (`rules.first_rule_set()` with the
    row's counters, from `save` or the main branch "Standard" without rules),
    applies `changes`, sets `published_at`, and clears `draft` and `draft_version`.
    Without `guard`, a published form connection's path is as above.
    """
    changes = changes or {}
    form_connection = _lock_for_revision(db, form_connection_id, guard)
    latest = db.scalar(
        select(func.max(FormConnectionRevision.revision)).where(
            FormConnectionRevision.form_connection_id == form_connection_id
        )
    )
    number = (latest or 0) + 1
    body = _build_config(
        form_connection_id,
        number,
        changes.get('name', form_connection.name),
        documents,
    )
    revision_id = str(uuid.uuid4())
    db.add(
        FormConnectionRevision(
            id=revision_id,
            form_connection_id=form_connection_id,
            revision=number,
            documents=[document.model_dump() for document in documents],
            lifetime_seconds=settings.request_lifetime_seconds,
            config_hash=dcql.config_hash(body),
            eudiplo_config_id=body['id'],
        )
    )
    db.commit()

    try:
        get_eudiplo_client().create_config(body)
    except EudiploError:
        _remove_unused_revision(db, revision_id)
        raise

    try:
        if guard is None:
            form_connection = _lock_published_form_connection(db, form_connection_id)
        else:
            form_connection = _lock_form_connection(db, form_connection_id)
    except HTTPException:
        # Deleted meanwhile; the worker cleans up the revision's configuration too
        _delete_unsaved_config(body['id'])
        raise
    try:
        if guard is None:
            if number > _published_revision(form_connection):
                form_connection.current_revision = number
            if save is not None:
                rules.save_rule_set(db, form_connection, save)
        else:
            guard.check(form_connection)
            _publish(db, form_connection, number, save)
        for attribute, value in changes.items():
            setattr(form_connection, attribute, value)
        db.commit()
    except HTTPException:
        db.rollback()
        _delete_unsaved_config(body['id'])
        _remove_unused_revision(db, revision_id)
        raise
    except SQLAlchemyError as error:
        db.rollback()
        logger.error(
            'Saving revision %s of form connection %s failed: %s',
            number,
            form_connection_id,
            describe_error(error),
        )
        _delete_unsaved_config(body['id'])
        raise
    logger.info('Form connection %s: revision %s created', form_connection_id, number)
    return form_connection


def update_form_connection(
    db: Session, form_connection_id: str, data: FormConnectionUpdate
) -> FormConnectionView:
    """Change the name, the description, the documents or the rules.

    An absent field stays unchanged. Everything is checked before anything is
    written or EUDIPLO is called (research R9): the rules against the documents the
    save leaves current, and, when only the documents change, the current rules
    against the new documents, so that no rule is left checking data that is no
    longer requested (FR-006). Rules saved over newer ones, which another team
    member saved after this editor loaded them, are refused with 409
    `rules_changed` unless the save replaces them, before they are checked and
    again under the row lock; the name and the documents keep "the later save
    wins" (FR-028).

    Changed documents become a new revision with a configuration of its own
    (`create_revision`), whose last transaction also saves the rules; changed rules
    alone are saved in one transaction under the row lock. Requests in progress keep
    their revision and rule set, and the URLs stay the same (FR-005, FR-028).
    Documents equal to the current ones create no revision, and neither do the name
    and the description; rules equal to the current ones create no rule set.
    Deactivated form connections can be changed too.
    """
    form_connection = find_published_form_connection(db, form_connection_id)
    changed = data.model_fields_set
    changes: dict[str, str] = {}
    if 'name' in changed:
        changes['name'] = clean_name(data.name)
    if 'description' in changed:
        changes['description'] = clean_description(data.description)
    current_documents = _current_documents(db, form_connection)
    documents: list[RequestedDocument] | None = None
    if 'documents' in changed:
        documents = clean_documents(data.documents or [])
        if documents == current_documents:
            documents = None

    main_branch_id = rules.main_branch_id_of(db, form_connection_id)
    save: rules.RulesSave | None = None
    if data.rules is not None:
        # Before the rules are checked: a stale editor meets the 409, not a refusal
        # that its staleness causes (FR-028)
        rules.check_rules_version(db, form_connection, data.rules)
        save = rules.clean_rules(
            data.rules, documents or current_documents, main_branch_id
        )
        rules.check_save(db, form_connection, save)
    elif documents is not None:
        rules.clean_branches(
            rules.current_branches(db, form_connection), documents, main_branch_id
        )

    if documents is None:
        if save is not None:
            form_connection = _lock_published_form_connection(db, form_connection_id)
            rules.save_rule_set(db, form_connection, save)
        for attribute, value in changes.items():
            setattr(form_connection, attribute, value)
        db.commit()
    else:
        # End the read transaction: the revision path locks the row itself
        db.rollback()
        form_connection = create_revision(
            db, form_connection_id, documents, changes, save
        )
    return _current_view(db, form_connection)


# Deactivating, activating and deleting (FR-006)


def _lock_for_status_change(
    db: Session, form_connection_id: str, expected_active: bool | None
) -> FormConnection:
    """Lock a published form connection's row to change its status.

    Answers 404 and 409 `not_published` like `_lock_published_form_connection`.
    With `expected_active`, the `is_active` an approved approval request was made
    for (spec 007, research R12), also 409 `status_changed` when the row's is
    another one by now, after releasing the lock: the connection was deactivated
    or reactivated since the approval's check. The management interface passes
    none and changes the status whatever it is.
    """
    form_connection = _lock_published_form_connection(db, form_connection_id)
    if expected_active is not None and form_connection.is_active != expected_active:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=STATUS_CHANGED_DETAIL
        )
    return form_connection


def deactivate_form_connection(
    db: Session, form_connection_id: str, *, expected_active: bool | None = None
) -> FormConnectionView:
    """Deactivate a form connection: its URLs answer 409 from the next call on.

    Its open requests become unavailable in the same transaction. EUDIPLO isn't
    called: the worker deletes their sessions in its next cycle. `expected_active`
    as `_lock_for_status_change` says.
    """
    form_connection = _lock_for_status_change(db, form_connection_id, expected_active)
    form_connection.is_active = False
    cancelled = cancel_open_requests(db, form_connection_id)
    db.commit()
    logger.info(
        'Form connection %s deactivated; %s open requests cancelled',
        form_connection_id,
        cancelled,
    )
    return _current_view(db, form_connection)


def activate_form_connection(
    db: Session, form_connection_id: str, *, expected_active: bool | None = None
) -> FormConnectionView:
    """Activate a form connection again: its URLs work again, unchanged.

    `expected_active` as `_lock_for_status_change` says.
    """
    form_connection = _lock_for_status_change(db, form_connection_id, expected_active)
    form_connection.is_active = True
    db.commit()
    logger.info('Form connection %s activated', form_connection_id)
    return _current_view(db, form_connection)


def delete_form_connection(
    db: Session, form_connection_id: str, *, expected_active: bool | None = None
) -> None:
    """Delete a form connection: its URLs answer 409 for good.

    The row stays, marked deleted, so that the URLs can still say "unavailable".
    Open requests are cancelled as for deactivating, and EUDIPLO isn't called.
    `expected_active` as `_lock_for_status_change` says.
    """
    form_connection = _lock_for_status_change(db, form_connection_id, expected_active)
    form_connection.deleted_at = datetime.now(tz=timezone.utc)
    cancelled = cancel_open_requests(db, form_connection_id)
    db.commit()
    logger.info(
        'Form connection %s deleted; %s open requests cancelled',
        form_connection_id,
        cancelled,
    )


# The worker's upkeep of configurations (research R2, R7)


def resync_config(db: Session, form_connection_id: str) -> bool:
    """Renew a form connection's configuration if the settings changed (research R2).

    Builds the current revision's configuration again with the current catalog,
    EUDIPLO_TRUST_LIST_ID and REQUEST_LIFETIME_SECONDS, not the revision's stored
    lifetime. When its hash differs from the stored one, the same documents become a
    new revision (`create_revision`), which new requests use at once. Returns whether
    it created one. A deleted form connection is left alone, and so is a draft,
    which has nothing set up with EUDIPLO (spec 005, FR-005).
    """
    form_connection = db.get(FormConnection, form_connection_id)
    if (
        form_connection is None
        or form_connection.deleted_at is not None
        or form_connection.published_at is None
    ):
        return False
    revision = _current_revision(db, form_connection)
    documents = _documents_of(revision)
    body = _build_config(
        form_connection_id, revision.revision, form_connection.name, documents
    )
    if dcql.config_hash(body) == revision.config_hash:
        db.rollback()
        return False
    # End the read transaction: the revision path locks the row itself
    db.rollback()
    try:
        create_revision(db, form_connection_id, documents)
    except HTTPException:
        # Deleted meanwhile
        return False
    logger.info(
        'Form connection %s: configuration renewed for changed settings',
        form_connection_id,
    )
    return True


def delete_unused_config(db: Session, revision_id: str) -> None:
    """Delete the EUDIPLO configuration of a revision that no request needs any more.

    The worker decides when (research R7, step 7). A 404 counts as success. The read
    transaction ends before EUDIPLO is called. Other EUDIPLO errors reach the caller,
    and the configuration stays recorded as not deleted, so the worker tries again.
    """
    revision = db.get(FormConnectionRevision, revision_id)
    if revision is None or revision.eudiplo_config_deleted_at is not None:
        return
    config_id = revision.eudiplo_config_id
    db.rollback()
    get_eudiplo_client().delete_config(config_id)
    db.execute(
        update(FormConnectionRevision)
        .where(
            FormConnectionRevision.id == revision_id,
            FormConnectionRevision.eudiplo_config_deleted_at.is_(None),
        )
        .values(eudiplo_config_deleted_at=datetime.now(tz=timezone.utc))
    )
    db.commit()
    logger.info('Deleted unused EUDIPLO configuration %s', config_id)
