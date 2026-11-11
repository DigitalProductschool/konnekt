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

Every change records its activity (spec 010, research R4, `services/activity.py`)
and moves the status dates of data-model 1.3 under the row lock, in the
transaction that makes the change, never before EUDIPLO answered.

Publishing with a start date (spec 010, research R1, R2) runs the same publish and
sets up the same EUDIPLO configuration, so the links exist at once, but leaves the
connection inactive with its `start_date`: scheduled. The date is checked with
`start_dates.clean_start_date()` before EUDIPLO is called and again in the
transaction that publishes, after EUDIPLO answered, so that a day that ends
meanwhile publishes nothing. Activating again on a date and changing the start
date (`set_start_date()`) check theirs before and again under the row lock of
`_lock_for_status_change()`, and make the transitions of data-model 1.3 there;
scheduling a live connection cancels its open requests as deactivating does. Only
the worker makes a scheduled connection active, on its day
(`activate_due_connections()`), skipping the rows those changes hold locked.

Deleting marks the row, a draft's too, so that "Undo" can restore it (spec 010,
research R5): `_mark_deleted()` sets `deleted_at` with the deletion's id and the
deleting account and keeps `updated_at`. Every read here answers a marked row as
it answered a deleted connection before (`find_form_connection()`,
`_lock_form_connection()`, the list, the search): it is gone.
"""

import base64
import binascii
import logging
import uuid
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, cast

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, and_, delete, func, null, or_, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..catalog import DOCUMENT_TYPES, CatalogField, get_document_type, label_of
from ..config import settings
from ..errors import describe_error
from ..language import Text
from ..models import FormConnection, FormConnectionRevision
from ..schemas import (
    Branch,
    ConnectionState,
    Deletion,
    DocumentField,
    EditorStep,
    FieldPart,
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
from . import activity, dcql, rules, start_dates
from .activity import SYSTEM, Actor
from .document_requests import cancel_open_requests
from .eudiplo import EudiploError, get_eudiplo_client

logger = logging.getLogger(__name__)

NAME_MAX_LENGTH = 200
DESCRIPTION_MAX_LENGTH = 500
# The search's page size: the default and the largest `limit` (spec 007, R9)
SEARCH_PAGE_SIZE = 25

# The search's status filter (spec 007, research R9): a state as `state_of()`
# derives it, `scheduled` too (spec 010, FR-062)
SearchStatus = ConnectionState

# The management side's 404; serviceBW's URLs answer their own, English one
# (`document_requests.FORM_CONNECTION_NOT_FOUND`, FR-017)
NOT_FOUND = {
    'error': 'Not found',
    'message': Text(en='Form connection not found', de='Anbindung nicht gefunden'),
}
NOT_PUBLISHED_DETAIL = {
    'error': 'not_published',
    'message': Text(
        en='This connection is a draft. Continue it to save or publish it.',
        de=(
            'Diese Anbindung ist ein Entwurf. Setzen Sie ihn fort, um ihn zu '
            'speichern oder zu veröffentlichen.'
        ),
    ),
}
DRAFT_PUBLISHED_DETAIL = {
    'error': 'draft_published',
    'message': Text(
        en='This draft has been published since you opened it.',
        de='Dieser Entwurf wurde veröffentlicht, seit Sie ihn geöffnet haben.',
    ),
}
# No variant of a draft has a pull URL, so the message names none (spec 005, R6)
DRAFT_CHANGED_DETAIL = {
    'error': 'draft_changed',
    'message': Text(
        en='This draft has been modified since you opened it.',
        de='Dieser Entwurf wurde geändert, seit Sie ihn geöffnet haben.',
    ),
}
# An approved approval request finds the status it was made for changed (spec 007,
# research R12); the approval page says which change instead
STATUS_CHANGED_DETAIL = {
    'error': 'status_changed',
    'message': Text(
        en='This connection was deactivated or reactivated in the meantime.',
        de='Diese Anbindung wurde in der Zwischenzeit deaktiviert oder reaktiviert.',
    ),
}


UNKNOWN_CURSOR = Text(en='Unknown cursor.', de='Unbekannter Cursor.')


def _validation_error(message: Text) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={'error': 'Validation error', 'message': message},
    )


# Validation (data-model.md, "Validation (FR-003)"). Each check raises a 400 whose
# message names the problem, and returns the value as it is stored.


def _required_text(
    value: str | None,
    max_length: int,
    empty_message: Text,
    too_long_message: Text,
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
        Text(
            en='Enter a name for the connection.',
            de='Geben Sie einen Namen für die Anbindung ein.',
        ),
        Text(
            en=f'The name can have at most {NAME_MAX_LENGTH} characters.',
            de=f'Der Name darf höchstens {NAME_MAX_LENGTH} Zeichen lang sein.',
        ),
    )


def clean_description(value: str | None) -> str:
    """Trim the description, optional free text of 0-500 characters.

    A note for the team, such as the form's ID in their form management system;
    nothing reads it. ``None``, empty and space-only values are stored as ``''``.
    """
    text = (value or '').strip()
    if len(text) > DESCRIPTION_MAX_LENGTH:
        raise _validation_error(
            Text(
                en=(
                    f'The description can have at most {DESCRIPTION_MAX_LENGTH} '
                    'characters.'
                ),
                de=(
                    f'Die Beschreibung darf höchstens {DESCRIPTION_MAX_LENGTH} '
                    'Zeichen lang sein.'
                ),
            )
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
        raise _validation_error(
            Text(
                en='Add at least one document.',
                de='Fügen Sie mindestens ein Dokument hinzu.',
            )
        )
    selected: dict[str, RequestedDocument] = {}
    for document in documents:
        document_type = get_document_type(document.document_type)
        if document_type is None:
            raise _validation_error(
                Text(
                    en=f"Unknown document type '{document.document_type}'.",
                    de=f'Unbekannter Dokumenttyp „{document.document_type}“.',
                )
            )
        label, label_de = document_type.label, document_type.label_de
        if document_type.key in selected:
            raise _validation_error(
                Text(
                    en=f"'{label}' is added more than once.",
                    de=f'„{label_de}“ wurde mehr als einmal hinzugefügt.',
                )
            )
        if complete and not document.fields:
            raise _validation_error(
                Text(
                    en=f"Select at least one field for '{label}'.",
                    de=f'Wählen Sie mindestens ein Feld für „{label_de}“ aus.',
                )
            )
        keys: set[str] = set()
        for key in document.fields:
            field = document_type.field(key)
            if field is None:
                raise _validation_error(
                    Text(
                        en=f"Unknown field '{key}' for '{label}'.",
                        de=f'Unbekanntes Feld „{key}“ für „{label_de}“.',
                    )
                )
            if key in keys:
                raise _validation_error(
                    Text(
                        en=(
                            f"'{field.label}' is selected more than once for '{label}'."
                        ),
                        de=(
                            f'„{field.label_de}“ ist für „{label_de}“ mehr als '
                            'einmal ausgewählt.'
                        ),
                    )
                )
            keys.add(key)
        selected[document_type.key] = RequestedDocument(
            document_type=document_type.key,
            fields=[field.key for field in document_type.fields if field.key in keys],
        )
    return [selected[type_.key] for type_ in DOCUMENT_TYPES if type_.key in selected]


def check_start_date(start_date: date | None) -> None:
    """Check a start date: a day after today in Germany (FR-003).

    None means "Now" and passes. A date that is today or earlier answers 400
    `invalid_start_date` (`start_dates.clean_start_date()`). Every path that
    takes one calls this before it changes anything and again under the row lock
    (spec 010, research R2): publishing before EUDIPLO is called and after it
    answered, activating again and changing the start date before and under the
    lock of `_lock_for_status_change()`.
    """
    if start_date is not None:
        start_dates.clean_start_date(start_date)


# Views


def trigger_url_of(form_connection_id: str) -> str:
    """The URL serviceBW calls to start a document request (research R12)."""
    return f'{settings.connection_base_url}/api/connect/{form_connection_id}/requests'


def document_field_view(field: CatalogField) -> DocumentField:
    """Show a catalog field, and its parts, with labels in the request's language.

    Every other value is the catalog's, as `DocumentField.model_validate` gives it
    (spec 009, R6: keys, kinds, flags and order never change with the language).
    """
    return DocumentField(
        key=field.key,
        label=label_of(field),
        kind=field.kind,
        option_set=field.option_set,
        date_of_birth=field.date_of_birth,
        parts=(
            None
            if field.parts is None
            else [
                FieldPart(
                    key=part.key,
                    label=label_of(part),
                    kind=part.kind,
                    option_set=part.option_set,
                    per_licence_class=part.per_licence_class,
                    multiple_values=part.multiple_values,
                )
                for part in field.parts
            ]
        ),
        multiple_values=field.multiple_values,
    )


def documents_view(documents: list[RequestedDocument]) -> list[RequestedDocumentView]:
    """Show requested documents with the catalog's labels and field descriptions.

    Used for published connections and for drafts. The labels are in the request's
    language (spec 009); a document type or field that the catalog no longer has
    keeps its key as its label in both languages.
    """
    views: list[RequestedDocumentView] = []
    for document in documents:
        document_type = get_document_type(document.document_type)
        fields: list[DocumentField] = []
        for key in document.fields:
            field = document_type.field(key) if document_type else None
            fields.append(
                document_field_view(field)
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
                label=(
                    label_of(document_type) if document_type else document.document_type
                ),
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


def state_of(form_connection: FormConnection) -> ConnectionState:
    """The state every consumer shows (spec 010, research R1, data-model 1.2).

    The one place that derives it: a draft is unpublished; a published connection
    is live while active, scheduled while inactive with a start date, and
    deactivated while inactive without one. `STATE_CONDITIONS` below says the
    same in SQL; a change to one changes the other.
    """
    if form_connection.published_at is None:
        return 'draft'
    if form_connection.is_active:
        return 'live'
    if form_connection.start_date is not None:
        return 'scheduled'
    return 'deactivated'


# `state_of()` in SQL, for the queries that select by state: the search's status
# filter and the worker's scheduled starts (data-model 1.2). A row matches exactly
# the condition of the state `state_of()` derives for it; whether it is deleted
# is the query's own condition
STATE_CONDITIONS: dict[ConnectionState, ColumnElement[bool]] = {
    'draft': FormConnection.published_at.is_(None),
    'live': and_(
        FormConnection.published_at.is_not(None), FormConnection.is_active.is_(True)
    ),
    'scheduled': and_(
        FormConnection.published_at.is_not(None),
        FormConnection.is_active.is_(False),
        FormConnection.start_date.is_not(None),
    ),
    'deactivated': and_(
        FormConnection.published_at.is_not(None),
        FormConnection.is_active.is_(False),
        FormConnection.start_date.is_(None),
    ),
}


def _iso_or_none(value: datetime | None) -> str | None:
    return None if value is None else to_iso_utc(value)


def _day_or_none(value: date | None) -> str | None:
    """A start date as written, `YYYY-MM-DD`, with no time zone (FR-020)."""
    return None if value is None else value.isoformat()


def _deactivated_at_of(form_connection: FormConnection) -> str | None:
    """`deactivated_at`, answered only while deactivated (data-model 1.1)."""
    if state_of(form_connection) != 'deactivated':
        return None
    return _iso_or_none(form_connection.deactivated_at)


def _step_of(form_connection: FormConnection) -> EditorStep | None:
    """A draft's stored step; null once published (research R3)."""
    if form_connection.published_at is not None or form_connection.draft is None:
        return None
    # The stored draft was checked when it was saved (DRAFT_CONTENT)
    return cast(EditorStep | None, form_connection.draft.get('step'))


def _view(
    db: Session,
    form_connection: FormConnection,
    documents: list[RequestedDocument],
    branches: list[SnapshotBranch],
) -> FormConnectionView:
    branch_views = _branch_views(form_connection.id, branches)
    state = state_of(form_connection)
    published_at = form_connection.published_at
    if state == 'draft' or published_at is None:
        raise _not_published()
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
        state=state,
        published_at=to_iso_utc(published_at),
        activated_at=_iso_or_none(form_connection.activated_at),
        deactivated_at=_deactivated_at_of(form_connection),
        start_date=_day_or_none(form_connection.start_date),
        last_activity=activity.last_activity(db, form_connection),
    )


def _summary(form_connection: FormConnection) -> FormConnectionSummary:
    return FormConnectionSummary(
        id=form_connection.id,
        name=form_connection.name,
        description=form_connection.description,
        is_active=form_connection.is_active,
        status='draft' if form_connection.published_at is None else 'published',
        updated_at=to_iso_utc(form_connection.updated_at),
        state=state_of(form_connection),
        published_at=_iso_or_none(form_connection.published_at),
        deactivated_at=_deactivated_at_of(form_connection),
        start_date=_day_or_none(form_connection.start_date),
        step=_step_of(form_connection),
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
    db: Session,
    form_connection_id: str,
    guard: DraftGuard | None,
    start_date: date | None,
) -> FormConnection:
    """Lock the row that `create_revision()` works on and check its state.

    Without `guard`, a published form connection's (`_lock_published_form_connection`).
    With it, a draft's: 404 if it is missing, the guard's refusal, and then 400
    `invalid_start_date` for a `start_date` that is no longer after today
    (`check_start_date`), each after releasing the lock.
    """
    if guard is None:
        return _lock_published_form_connection(db, form_connection_id)
    form_connection = _lock_form_connection(db, form_connection_id)
    try:
        guard.check(form_connection)
        check_start_date(start_date)
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
        db,
        form_connection,
        _current_documents(db, form_connection),
        rules.current_branches(db, form_connection),
    )


def _current_content(db: Session, form_connection: FormConnection) -> activity.Content:
    """A published connection's content as its activity compares a save's.

    Its name, description, current documents and current branches (spec 010,
    data-model 2.3). The callers read it under the row lock, before the save
    writes anything.
    """
    return activity.Content(
        name=form_connection.name,
        description=form_connection.description,
        documents=_current_documents(db, form_connection),
        branches=rules.current_branches(db, form_connection),
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
        raise _validation_error(UNKNOWN_CURSOR) from None
    if updated_at.tzinfo is None:
        raise _validation_error(UNKNOWN_CURSOR)
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
    literally; empty, it matches every row. `status` keeps the drafts, the
    scheduled, the live or the deactivated connections, as `state_of()` derives
    their state (`STATE_CONDITIONS`; spec 010, FR-062): a scheduled connection is
    no deactivated one. Ordered by `updated_at` descending, then `id`, with a
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
        query = query.where(STATE_CONDITIONS[status])
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
    db: Session, data: FormConnectionCreate, *, actor: Actor
) -> FormConnectionView:
    """Create a form connection with revision 1 and its EUDIPLO configuration.

    Its branches and rules become rule set 1, in the same transaction; without
    `rules`, it gets its main branch, "Standard" without rules. Everything is
    checked first; then the configuration is created. If the database then refuses
    the form connection, the configuration is deleted again. `actor` is who
    creates it: the transaction that inserts the row, after EUDIPLO answered,
    records `created` and `published` with them and sets `activated_at` to the
    publication's time (spec 010, research R3, R4, data-model 1.3).

    With `data.start_date` it is created scheduled (spec 010, research R1, R2,
    data-model 1.3, "publish, on a date"): the date is checked last before
    EUDIPLO is called and again in the transaction that inserts the row, after
    EUDIPLO answered, both with 400 `invalid_start_date` for a day that isn't
    after today in Germany; the second refusal deletes the configuration again,
    and nothing is stored. The row is inserted inactive with its `start_date`
    and without `activated_at`, and that transaction records `created`,
    `published` and `scheduled` with the date.
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
    start_date = data.start_date
    check_start_date(start_date)

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

    published_at = datetime.now(tz=timezone.utc)
    scheduled = start_date is not None
    form_connection = FormConnection(
        id=form_connection_id,
        name=name,
        description=description,
        # Scheduled: published, not active, with its start date (data-model 1.3)
        is_active=not scheduled,
        published_at=published_at,
        # Published with "Now": active since its publication; scheduled: not
        # yet, the worker sets it at the start (data-model 1.3)
        activated_at=None if scheduled else published_at,
        start_date=start_date,
        current_revision=1,
        current_rule_set=1,
        next_rule_number=1,
        next_group_number=1,
    )
    entries = [activity.Entry(activity.CREATED), activity.Entry(activity.PUBLISHED)]
    if start_date is not None:
        entries.append(activity.Entry(activity.SCHEDULED, start_date=start_date))
    try:
        # Again after EUDIPLO answered: the day may have ended meanwhile (FR-003);
        # a refusal deletes the configuration below
        check_start_date(start_date)
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
        # The new row is this transaction's alone until the commit
        activity.record(db, form_connection_id, entries, actor)
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
    return _view(db, form_connection, documents, branches)


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


def _check_reservation(
    db: Session,
    form_connection_id: str,
    revision_id: str,
    number: int,
    config_id: str,
) -> None:
    """Refuse a revision whose reservation is gone, under the last row lock.

    `create_revision()` reserves revision `number` (row `revision_id`) before it
    calls EUDIPLO. A draft deleted meanwhile loses it (`_mark_deleted`), and if
    the draft is restored before this lock (spec 010, research R5), the row
    passes every other check: making `number` current would leave the published
    connection without its revision. Refused as for a deleted row, after
    releasing the lock: 404, and the configuration `config_id` is deleted again,
    unless a later publish has reserved `number` since, whose configuration has
    the same id.
    """
    kept = db.scalar(
        select(FormConnectionRevision.id).where(
            FormConnectionRevision.id == revision_id
        )
    )
    if kept is not None:
        return
    taken = db.scalar(
        select(FormConnectionRevision.id).where(
            FormConnectionRevision.form_connection_id == form_connection_id,
            FormConnectionRevision.revision == number,
        )
    )
    db.rollback()
    if taken is None:
        _delete_unsaved_config(config_id)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)


def _publish(
    db: Session,
    form_connection: FormConnection,
    revision: int,
    save: rules.RulesSave | None,
    start_date: date | None,
) -> list[SnapshotBranch]:
    """Turn a locked draft row into a published connection, uncommitted.

    The revision becomes current, and rule set 1, the branch rows and the counters
    are written from the row's counters (spec 005, research R4, R5). Published
    with "Now" (`start_date` None), it is active since its publication; with a
    `start_date`, which the caller has checked under this lock, it is scheduled:
    not active, with that date and without `activated_at`, which the worker sets
    at the start (spec 010, data-model 1.3). Returns the branches as rule set 1
    stores them, each with its final id.
    """
    branches = rules.first_rule_set(
        db,
        form_connection,
        save,
        counters=(form_connection.next_rule_number, form_connection.next_group_number),
    )
    published_at = datetime.now(tz=timezone.utc)
    # Every column of the CHECK constraints changes in the same flush
    form_connection.current_revision = revision
    form_connection.published_at = published_at
    if start_date is None:
        form_connection.activated_at = published_at
    else:
        form_connection.is_active = False
        form_connection.start_date = start_date
        form_connection.activated_at = None
    # SQL NULL: None would store JSON null, which the CHECK constraint refuses
    form_connection.draft = null()
    form_connection.draft_version = None
    return branches


def create_revision(
    db: Session,
    form_connection_id: str,
    documents: list[RequestedDocument],
    changes: Mapping[str, str] | None = None,
    save: rules.RulesSave | None = None,
    guard: DraftGuard | None = None,
    *,
    actor: Actor,
    start_date: date | None = None,
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
    answers 404 (its row stays, marked deleted, and the deletion removed the
    reserved revision; spec 010, research R5), also when it was restored before
    the last lock (`_check_reservation()`), one published meanwhile 409
    `draft_published` (also with `replace`), and one saved meanwhile 409
    `draft_changed` unless `replace`; either way the configuration is deleted
    again, and a refusal under the last lock also removes the revision.
    Otherwise the last commit makes the revision current, writes
    rule set 1, the branch rows and the counters (`rules.first_rule_set()` with the
    row's counters, from `save` or the main branch "Standard" without rules),
    applies `changes`, sets `published_at`, and clears `draft` and `draft_version`.
    Without `guard`, a published form connection's path is as above.

    `actor` is who makes the change: the caller's, or `SYSTEM` for the worker's
    re-sync (spec 010, research R4). The last commit, under the last row lock and
    never before EUDIPLO answered, records what the save changes
    (`activity.changes_between()`) against the content read under that lock: a
    published connection's current one, or the stored draft, then `published`,
    and a publish sets `activated_at` (`_publish`). A save that changes nothing,
    such as the re-sync's, records nothing; a refusal or a failure, nothing either.

    `start_date` publishes the draft scheduled (spec 010, research R1, R2); only
    a publish, with `guard`, takes one. The caller has checked it before EUDIPLO
    is called; it is checked again with `check_start_date()` under both row locks,
    after the guard: under the first, a day that ended meanwhile is refused before
    anything is reserved; under the last, after EUDIPLO answered, it is refused as
    the guard's refusal is, so the configuration is deleted, the revision removed
    and the row stays a draft. Otherwise the last commit publishes the row not
    active, with `start_date` and without `activated_at` (`_publish`), and records
    `published` then `scheduled` with the date.
    """
    if start_date is not None and guard is None:
        raise ValueError('Only publishing a draft takes a start date')
    changes = changes or {}
    form_connection = _lock_for_revision(db, form_connection_id, guard, start_date)
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
        # Deleted meanwhile; the worker cleans up the revision's configuration
        # too. A draft's deletion removed the revision reserved above
        # (`_mark_deleted`; spec 010, R15 V9)
        _delete_unsaved_config(body['id'])
        raise
    _check_reservation(db, form_connection_id, revision_id, number, body['id'])
    try:
        published: list[activity.Entry] = []
        if guard is None:
            before = _current_content(db, form_connection)
            if number > _published_revision(form_connection):
                form_connection.current_revision = number
            branches = (
                before.branches
                if save is None
                else rules.save_rule_set(db, form_connection, save)
            )
        else:
            guard.check(form_connection)
            # Again after EUDIPLO answered: the day may have ended meanwhile
            # (FR-003); a refusal deletes the configuration below, as the guard's
            check_start_date(start_date)
            # The stored draft, read before publishing clears it
            before = activity.draft_content(form_connection)
            branches = _publish(db, form_connection, number, save, start_date)
            published.append(activity.Entry(activity.PUBLISHED))
            if start_date is not None:
                published.append(
                    activity.Entry(activity.SCHEDULED, start_date=start_date)
                )
        for attribute, value in changes.items():
            setattr(form_connection, attribute, value)
        after = activity.Content(
            name=form_connection.name,
            description=form_connection.description,
            # A later revision that became current meanwhile stays current
            documents=(
                documents
                if form_connection.current_revision == number
                else before.documents
            ),
            branches=branches,
        )
        activity.record(
            db,
            form_connection_id,
            [*activity.changes_between(before, after), *published],
            actor,
        )
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
    db: Session, form_connection_id: str, data: FormConnectionUpdate, *, actor: Actor
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
    Deactivated form connections can be changed too. `actor` is who makes the
    change, and `create_revision()` gets it too (spec 010, research R4). Both
    paths record what the save changes against the content read under the row
    lock, in the commit that saves it: `create_revision()`'s last one, or, without
    a revision, the one under `_lock_published_form_connection()`, which a change
    of the name or the description alone takes too. A save that changes nothing
    records nothing, and no save moves a status date (FR-018).
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
        # Under the row lock also for the name and the description alone: the
        # activity compares the content as stored now (spec 010, research R4)
        form_connection = _lock_published_form_connection(db, form_connection_id)
        before = _current_content(db, form_connection)
        branches = (
            before.branches
            if save is None
            else rules.save_rule_set(db, form_connection, save)
        )
        for attribute, value in changes.items():
            setattr(form_connection, attribute, value)
        after = activity.Content(
            name=form_connection.name,
            description=form_connection.description,
            documents=before.documents,
            branches=branches,
        )
        activity.record(
            db, form_connection_id, activity.changes_between(before, after), actor
        )
        db.commit()
    else:
        # End the read transaction: the revision path locks the row itself
        db.rollback()
        form_connection = create_revision(
            db, form_connection_id, documents, changes, save, actor=actor
        )
    return _current_view(db, form_connection)


# Deactivating, activating, scheduling and deleting (FR-006; spec 010, FR-008 to
# FR-012, data-model 1.3)


def _status_changed() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail=STATUS_CHANGED_DETAIL
    )


def _lock_for_status_change(
    db: Session, form_connection_id: str, expected_active: bool | None
) -> FormConnection:
    """Lock a published form connection's row to change its status.

    Answers 404 and 409 `not_published` like `_lock_published_form_connection`.
    With `expected_active`, the `is_active` an approved approval request was made
    for (spec 007, research R12), also 409 `status_changed` when the row's is
    another one by now, after releasing the lock: the connection was deactivated
    or reactivated since the approval's check. The management interface passes
    none; each caller then refuses, under this lock, the state its action doesn't
    apply to (`_lock_for_start_date`).
    """
    form_connection = _lock_published_form_connection(db, form_connection_id)
    if expected_active is not None and form_connection.is_active != expected_active:
        db.rollback()
        raise _status_changed()
    return form_connection


def _lock_for_start_date(
    db: Session,
    form_connection_id: str,
    expected_active: bool | None,
    refused: ConnectionState,
    start_date: date | None,
) -> FormConnection:
    """Lock a published connection's row for an action that takes a start date.

    `_lock_for_status_change()`'s refusals; then, under the lock, 409
    `status_changed` while the connection is in the state `refused`, which the
    action doesn't apply to, and 400 `invalid_start_date` for a `start_date` that
    is no longer after today in Germany (`check_start_date`): the caller checked
    it before the lock, and the day may have ended since (spec 010, FR-003). A
    refusal releases the lock.
    """
    form_connection = _lock_for_status_change(db, form_connection_id, expected_active)
    try:
        if state_of(form_connection) == refused:
            raise _status_changed()
        check_start_date(start_date)
    except HTTPException:
        db.rollback()
        raise
    return form_connection


def deactivate_form_connection(
    db: Session,
    form_connection_id: str,
    *,
    actor: Actor,
    expected_active: bool | None = None,
) -> FormConnectionView:
    """Deactivate a form connection: its URLs answer 409 from the next call on.

    Its open requests become unavailable in the same transaction. EUDIPLO isn't
    called: the worker deletes their sessions in its next cycle. `actor` is who
    deactivates it (spec 010, research R4); `expected_active` as
    `_lock_for_status_change` says. Under the row lock (data-model 1.3), a live
    connection becomes inactive, and a scheduled one loses its `start_date`, so
    that its schedule ends and it never becomes active by itself (FR-012); either
    gets `deactivated_at` and the entry `deactivated`. One that is deactivated
    already keeps its date and gets no entry.
    """
    form_connection = _lock_for_status_change(db, form_connection_id, expected_active)
    state = state_of(form_connection)
    if state != 'deactivated':
        if state == 'live':
            form_connection.is_active = False
        else:
            # Scheduled: inactive already; the schedule ends (FR-012)
            form_connection.start_date = None
        form_connection.deactivated_at = datetime.now(tz=timezone.utc)
        activity.record(
            db, form_connection_id, [activity.Entry(activity.DEACTIVATED)], actor
        )
    cancelled = cancel_open_requests(db, form_connection_id)
    db.commit()
    logger.info(
        'Form connection %s deactivated; %s open requests cancelled',
        form_connection_id,
        cancelled,
    )
    return _current_view(db, form_connection)


def activate_form_connection(
    db: Session,
    form_connection_id: str,
    *,
    actor: Actor,
    expected_active: bool | None = None,
    start_date: date | None = None,
) -> FormConnectionView:
    """Activate a deactivated form connection again, now or on a date.

    "Now" (`start_date` None): its URLs work again, unchanged. With `start_date`,
    a day after today in Germany, it is scheduled for that day instead: its URLs
    keep answering as a deactivated connection's until the worker activates it
    (spec 010, FR-011). `actor` is who activates it (research R4);
    `expected_active` as `_lock_for_status_change` says.

    The date is checked before the row is locked and again under the lock, 400
    `invalid_start_date` either time (research R2), and a scheduled connection
    answers 409 `status_changed` under the lock: its start date is changed
    instead (`set_start_date`). Under the row lock (data-model 1.3), a
    deactivated connection gets `activated_at` and the entry `reactivated` with
    "Now", or its `start_date` and the entry `scheduled` with the date; it keeps
    `deactivated_at` either way, which the views answer only while deactivated.
    One that is live already changes nothing and gets no entry, with a date too.
    """
    check_start_date(start_date)
    form_connection = _lock_for_start_date(
        db, form_connection_id, expected_active, 'scheduled', start_date
    )
    scheduling = False
    if state_of(form_connection) == 'deactivated':
        if start_date is None:
            form_connection.is_active = True
            form_connection.activated_at = datetime.now(tz=timezone.utc)
            entry = activity.Entry(activity.REACTIVATED)
        else:
            # Not active until the worker's step on that day (research R2)
            form_connection.start_date = start_date
            entry = activity.Entry(activity.SCHEDULED, start_date=start_date)
            scheduling = True
        activity.record(db, form_connection_id, [entry], actor)
    db.commit()
    if scheduling:
        logger.info('Form connection %s scheduled', form_connection_id)
    else:
        logger.info('Form connection %s activated', form_connection_id)
    return _current_view(db, form_connection)


def set_start_date(
    db: Session,
    form_connection_id: str,
    start_date: date | None,
    *,
    actor: Actor,
) -> FormConnectionView:
    """Change a scheduled or live connection's start (spec 010, FR-008, FR-009).

    `start_date` is a day after today in Germany, or None for now. It is checked
    before the row is locked and again under the lock of
    `_lock_for_status_change()`, 400 `invalid_start_date` either time (research
    R2). Under that lock, in the transaction that makes the change (data-model
    1.3):
    - scheduled, another date: the start moves; `start_date_changed` with the
      date;
    - scheduled, None: active now, with `activated_at` now and no `start_date`;
      `start_date_changed` without a date;
    - live, a date: scheduled for that day, so that its URLs answer as a
      deactivated connection's until the worker activates it, and its open
      requests are cancelled as deactivating cancels them; `scheduled` with the
      date;
    - live with None, or scheduled with the date it has: nothing changes and
      nothing is recorded.

    A deactivated connection answers 409 `status_changed` under the lock (it is
    activated again instead), a draft 409 `not_published`, and an unknown or
    deleted one 404. EUDIPLO isn't called. `actor` is who changes it (research
    R4).
    """
    check_start_date(start_date)
    form_connection = _lock_for_start_date(
        db, form_connection_id, None, 'deactivated', start_date
    )
    entries: list[activity.Entry] = []
    cancelled = 0
    if state_of(form_connection) == 'scheduled':
        if start_date is None:
            form_connection.is_active = True
            form_connection.start_date = None
            form_connection.activated_at = datetime.now(tz=timezone.utc)
            entries.append(activity.Entry(activity.START_DATE_CHANGED))
        elif start_date != form_connection.start_date:
            form_connection.start_date = start_date
            entries.append(
                activity.Entry(activity.START_DATE_CHANGED, start_date=start_date)
            )
    elif start_date is not None:
        # Live: not active until the worker's step on that day (research R2);
        # its requests in progress end as a deactivation ends them (FR-009)
        form_connection.is_active = False
        form_connection.start_date = start_date
        cancelled = cancel_open_requests(db, form_connection_id)
        entries.append(activity.Entry(activity.SCHEDULED, start_date=start_date))
    activity.record(db, form_connection_id, entries, actor)
    db.commit()
    logger.info(
        'Form connection %s: start date saved; %s open requests cancelled',
        form_connection_id,
        cancelled,
    )
    return _current_view(db, form_connection)


def _mark_deleted(
    db: Session,
    form_connection: FormConnection,
    *,
    actor: Actor,
    deleted_by_id: str | None,
    deletion_id: str | None,
) -> tuple[Deletion, int]:
    """Mark a locked row deleted, uncommitted, and answer the deletion.

    Spec 010, research R5, data-model 3: what every deletion does, a draft's
    (`drafts.delete_draft()`) and a published connection's
    (`delete_form_connection()`). The caller holds the row lock and commits. The
    row stays: `deleted_at`, the deletion's `deletion_id` and the deleting
    account's `deleted_by_id` are set, and `updated_at` keeps its value
    (`flag_modified` puts it into the UPDATE, which skips the column's
    `onupdate`; R15 V1), so that a restore brings the row back as it was. The
    open requests are cancelled as deactivating cancels them (FR-035); a revision
    that a draft's publish in flight reserved is removed, so that the publish
    finds the row deleted at its last lock, answers 404 and deletes its
    configuration; the connection's waiting approval requests are stored
    `cancelled` with `draft_deleted` or `connection_deleted`
    (`approvals.cancel_for_deletion()`), so that a restore doesn't bring them
    back; and `deleted` is recorded with `actor`. Nothing else changes, and
    EUDIPLO isn't called.

    `deletion_id` and `deleted_by_id` come from the router: a fresh UUID and the
    team member who deletes. A deletion an approved approval request runs has
    neither, answers `id` null and can't be restored (FR-067). Returns the
    answer and the count of the cancelled open requests, for the caller's log
    line.
    """
    # Here, not at the top: `approvals` imports this module
    from .approvals import cancel_for_deletion

    deleted_at = datetime.now(tz=timezone.utc)
    form_connection.deleted_at = deleted_at
    form_connection.deletion_id = deletion_id
    form_connection.deleted_by_id = deleted_by_id
    # Before anything flushes the row: its current `updated_at` goes into the
    # UPDATE, so the column's `onupdate` doesn't move it
    flag_modified(form_connection, 'updated_at')
    form_connection_id = form_connection.id
    cancelled = cancel_open_requests(db, form_connection_id)
    if form_connection.published_at is None:
        # A draft has no revision but one a publish in flight reserved (spec 005)
        db.execute(
            delete(FormConnectionRevision).where(
                FormConnectionRevision.form_connection_id == form_connection_id
            )
        )
    cancel_for_deletion(db, form_connection)
    activity.record(db, form_connection_id, [activity.Entry(activity.DELETED)], actor)
    if deletion_id is None:
        return Deletion(id=None, restorable_until=None), cancelled
    restorable_until = deleted_at + timedelta(seconds=settings.deletion_undo_seconds)
    deletion = Deletion(id=deletion_id, restorable_until=to_iso_utc(restorable_until))
    return deletion, cancelled


def delete_form_connection(
    db: Session,
    form_connection_id: str,
    *,
    actor: Actor,
    expected_active: bool | None = None,
    deletion_id: str | None = None,
    deleted_by_id: str | None = None,
) -> Deletion:
    """Delete a published form connection: its URLs answer 409 from now on.

    The row stays, marked deleted (`_mark_deleted()`), so that the URLs can still
    say "unavailable", for good once the restore time has passed (spec 010,
    research R5). Open requests are cancelled as for deactivating, and the
    connection's waiting approval requests stored cancelled; EUDIPLO isn't called.
    `actor` is who deletes it, recorded as `deleted` under the row lock (spec 010,
    research R4); `expected_active` as `_lock_for_status_change` says. Answers
    the deletion: with `deletion_id` and `deleted_by_id`, which the router passes,
    restorable until DELETION_UNDO_SECONDS from now; without them, as an approved
    approval request runs it, `id` null (FR-067).
    """
    form_connection = _lock_for_status_change(db, form_connection_id, expected_active)
    deletion, cancelled = _mark_deleted(
        db,
        form_connection,
        actor=actor,
        deleted_by_id=deleted_by_id,
        deletion_id=deletion_id,
    )
    db.commit()
    logger.info(
        'Form connection %s deleted; %s open requests cancelled',
        form_connection_id,
        cancelled,
    )
    return deletion


# The scheduled starts, made by the worker (spec 010, research R2; FR-005)


def activate_due_connections(db: Session, today: date) -> list[str]:
    """Make active the scheduled connections whose start date has come; their ids.

    The only code that activates on a date (research R2): the worker's step
    `activate_scheduled_connections` calls it every cycle with today in Germany.
    It locks the rows that are scheduled (`STATE_CONDITIONS`: published, not
    active, with a `start_date`), not deleted, and whose `start_date` is on or
    before `today`, with `FOR UPDATE SKIP LOCKED`: a row that a status change
    holds (`_lock_for_status_change()`, which deleting takes too) is skipped and
    taken by a later cycle, so the step never waits. PostgreSQL checks the
    conditions again on a row's newest version when it locks it, so a connection
    whose date was moved, that was deactivated, deleted or started "Now" in the
    meantime is left alone.

    Each one becomes active as data-model 1.3's "the start comes" says, in one
    flush for the CHECK constraint `ck_form_connections_start_date`: `is_active`,
    no `start_date`, and `activated_at` at the start, 00:00 in Germany of its
    date (`start_instant()`), also when the middleware wasn't running then. Its
    entry `became_active` has no person (`SYSTEM`). One transaction, committed
    here; EUDIPLO isn't called (the configuration exists since publishing).
    """
    due = db.scalars(
        select(FormConnection)
        .where(
            STATE_CONDITIONS['scheduled'],
            FormConnection.deleted_at.is_(None),
            FormConnection.start_date <= today,
        )
        .order_by(FormConnection.id)
        .with_for_update(skip_locked=True)
        .execution_options(populate_existing=True)
    ).all()
    activated: list[str] = []
    for form_connection in due:
        start_date = form_connection.start_date
        if start_date is None:
            # Not reachable: the query asks for a start date
            continue
        # Every column of the CHECK constraint changes in the same flush
        form_connection.is_active = True
        form_connection.start_date = None
        form_connection.activated_at = start_dates.start_instant(start_date)
        activity.record(
            db, form_connection.id, [activity.Entry(activity.BECAME_ACTIVE)], SYSTEM
        )
        activated.append(form_connection.id)
    db.commit()
    return activated


# The worker's upkeep of configurations (research R2, R7)


def resync_config(db: Session, form_connection_id: str) -> bool:
    """Renew a form connection's configuration if the settings changed (research R2).

    Builds the current revision's configuration again with the current catalog,
    EUDIPLO_TRUST_LIST_ID and REQUEST_LIFETIME_SECONDS, not the revision's stored
    lifetime. When its hash differs from the stored one, the same documents become a
    new revision (`create_revision`), which new requests use at once. Returns whether
    it created one. A deleted form connection is left alone, and so is a draft,
    which has nothing set up with EUDIPLO (spec 005, FR-005). The middleware does
    this by itself: its actor is `SYSTEM` (spec 010, research R4).
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
        create_revision(db, form_connection_id, documents, actor=SYSTEM)
    except HTTPException:
        # Deleted meanwhile
        return False
    logger.info(
        'Form connection %s: configuration renewed for changed settings',
        form_connection_id,
    )
    return True


def _config_unused(
    form_connection: FormConnection,
    revision: FormConnectionRevision,
    deleted_before: datetime,
) -> bool:
    """Whether a revision's configuration goes: replaced, or its deletion final."""
    current = form_connection.current_revision
    if current is not None and revision.revision < current:
        return True
    deleted_at = form_connection.deleted_at
    return deleted_at is not None and deleted_at <= deleted_before


def delete_unused_config(
    db: Session, revision_id: str, *, deleted_before: datetime
) -> None:
    """Delete the EUDIPLO configuration of a revision that no request needs any more.

    The worker decides when (research R7, step 7): once a later revision is
    current, or once the connection was deleted at or before `deleted_before`,
    the end of the restore time (`deletions.restore_cutoff()`; spec 010, research
    R5). Its choice is checked again under the connection's row lock, which a
    restore takes too, before EUDIPLO is called (R15 V10): a connection restored
    since keeps its configuration, and a restore that comes after this check
    finds the restore time over and is refused. The lock is released before
    EUDIPLO is called. A 404 counts as success. Other EUDIPLO errors reach the
    caller, and the configuration stays recorded as not deleted, so the worker
    tries again.
    """
    revision = db.get(FormConnectionRevision, revision_id)
    if revision is None or revision.eudiplo_config_deleted_at is not None:
        return
    form_connection = db.scalars(
        select(FormConnection)
        .where(FormConnection.id == revision.form_connection_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()
    unused = form_connection is not None and _config_unused(
        form_connection, revision, deleted_before
    )
    config_id = revision.eudiplo_config_id
    # Releases the lock: no transaction is held while EUDIPLO answers
    db.rollback()
    if not unused:
        return
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
