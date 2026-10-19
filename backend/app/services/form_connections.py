"""Form connections: validation, creation, reading and changes (FR-001 to FR-006).

Creating a form connection stores revision 1 and creates its EUDIPLO presentation
configuration; changing its documents stores the next revision with a configuration of
its own (data-model.md, "Creating a revision"). Changing the name or the serviceBW
form creates no revision. EUDIPLO errors reach the caller as `EudiploError`; nothing
is saved then. Deactivating and deleting cancel the open requests and call no EUDIPLO:
the worker deletes the sessions and, once no request needs them, the configurations.
"""

import logging
import uuid
from collections.abc import Mapping
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..catalog import DOCUMENT_TYPES, get_document_type
from ..config import settings
from ..errors import describe_error
from ..models import FormConnection, FormConnectionRevision
from ..schemas import (
    DocumentField,
    FormConnectionCreate,
    FormConnectionSummary,
    FormConnectionUpdate,
    RequestedDocument,
    RequestedDocumentView,
    to_iso_utc,
)
from ..schemas import FormConnection as FormConnectionView
from . import dcql
from .document_requests import FORM_CONNECTION_NOT_FOUND, cancel_open_requests
from .eudiplo import EudiploError, get_eudiplo_client

logger = logging.getLogger(__name__)

NAME_MAX_LENGTH = 200
SERVICEBW_FORM_MAX_LENGTH = 500

NOT_FOUND = FORM_CONNECTION_NOT_FOUND


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


def clean_servicebw_form(value: str | None) -> str:
    """Trim the serviceBW form, free text of 1-500 characters.

    The UI calls it "Form ID", so the messages do too.
    """
    return _required_text(
        value,
        SERVICEBW_FORM_MAX_LENGTH,
        'Enter the form ID.',
        f'The form ID can have at most {SERVICEBW_FORM_MAX_LENGTH} characters.',
    )


def clean_documents(documents: list[RequestedDocument]) -> list[RequestedDocument]:
    """Check the requested documents against the catalog (FR-003).

    Returns them in catalog order, each with its fields in catalog order.
    """
    if not documents:
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
        if not document.fields:
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


def _documents_view(documents: list[RequestedDocument]) -> list[RequestedDocumentView]:
    views: list[RequestedDocumentView] = []
    for document in documents:
        document_type = get_document_type(document.document_type)
        fields: list[DocumentField] = []
        for key in document.fields:
            field = document_type.field(key) if document_type else None
            fields.append(DocumentField(key=key, label=field.label if field else key))
        views.append(
            RequestedDocumentView(
                document_type=document.document_type,
                label=document_type.label if document_type else document.document_type,
                fields=fields,
            )
        )
    return views


def _view(
    form_connection: FormConnection, documents: list[RequestedDocument]
) -> FormConnectionView:
    trigger_url = trigger_url_of(form_connection.id)
    return FormConnectionView(
        id=form_connection.id,
        name=form_connection.name,
        servicebw_form=form_connection.servicebw_form,
        is_active=form_connection.is_active,
        documents=_documents_view(documents),
        trigger_url=trigger_url,
        # serviceBW puts the request reference in place of the placeholder
        pull_url=f'{trigger_url}/{{reference}}',
        created_at=to_iso_utc(form_connection.created_at),
        updated_at=to_iso_utc(form_connection.updated_at),
    )


def _summary(form_connection: FormConnection) -> FormConnectionSummary:
    return FormConnectionSummary(
        id=form_connection.id,
        name=form_connection.name,
        servicebw_form=form_connection.servicebw_form,
        is_active=form_connection.is_active,
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


def _current_revision(
    db: Session, form_connection: FormConnection
) -> FormConnectionRevision:
    return db.scalars(
        select(FormConnectionRevision).where(
            FormConnectionRevision.form_connection_id == form_connection.id,
            FormConnectionRevision.revision == form_connection.current_revision,
        )
    ).one()


def _documents_of(revision: FormConnectionRevision) -> list[RequestedDocument]:
    return [RequestedDocument.model_validate(entry) for entry in revision.documents]


def _current_documents(
    db: Session, form_connection: FormConnection
) -> list[RequestedDocument]:
    return _documents_of(_current_revision(db, form_connection))


def list_form_connections(db: Session) -> list[FormConnectionSummary]:
    """Form connections that aren't deleted, most recently updated first."""
    form_connections = db.scalars(
        select(FormConnection)
        .where(FormConnection.deleted_at.is_(None))
        .order_by(FormConnection.updated_at.desc(), FormConnection.id)
    ).all()
    return [_summary(form_connection) for form_connection in form_connections]


def get_form_connection(db: Session, form_connection_id: str) -> FormConnectionView:
    """A form connection with its current documents and its URLs, or 404."""
    form_connection = find_form_connection(db, form_connection_id)
    return _view(form_connection, _current_documents(db, form_connection))


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

    The configuration is created first. If the database then refuses the form
    connection, the configuration is deleted again.
    """
    name = clean_name(data.name)
    servicebw_form = clean_servicebw_form(data.servicebw_form)
    documents = clean_documents(data.documents)

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
        servicebw_form=servicebw_form,
        is_active=True,
        current_revision=1,
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
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        logger.error(
            'Saving form connection %s failed: %s',
            form_connection_id,
            describe_error(error),
        )
        _delete_unsaved_config(body['id'])
        raise
    return _view(form_connection, documents)


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


def create_revision(
    db: Session,
    form_connection_id: str,
    documents: list[RequestedDocument],
    changes: Mapping[str, str] | None = None,
) -> FormConnection:
    """Store `documents` as the next revision and make it current (FR-005).

    data-model.md, "Creating a revision". No transaction is held while EUDIPLO
    answers, so the number is reserved first:
    1. Under the form connection's row lock, take the next number and insert the
       revision. It isn't current yet, so no request uses it, and a second edit at
       the same time takes the number after it.
    2. Create the EUDIPLO configuration.
    3. Lock the row again, make the revision current, unless a later one became
       current meanwhile, and apply `changes` (the name or the serviceBW form).

    Requests already in progress keep their revision, and the URLs never change. If
    EUDIPLO fails, the revision is removed again and the `EudiploError` reaches the
    caller. If the last commit fails, the configuration is deleted again. A form
    connection that is or gets deleted answers 404. The new configuration uses the
    current settings, and the revision stores the current REQUEST_LIFETIME_SECONDS.
    """
    changes = changes or {}
    form_connection = _lock_form_connection(db, form_connection_id)
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
        form_connection = _lock_form_connection(db, form_connection_id)
    except HTTPException:
        # Deleted meanwhile; the worker cleans up the revision's configuration too
        _delete_unsaved_config(body['id'])
        raise
    try:
        if number > form_connection.current_revision:
            form_connection.current_revision = number
        for attribute, value in changes.items():
            setattr(form_connection, attribute, value)
        db.commit()
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
    """Change the name, the serviceBW form or the documents.

    An absent field stays unchanged. Changed documents become a new revision with a
    configuration of its own (`create_revision`): requests in progress keep theirs,
    and the URLs stay the same (FR-005). Documents equal to the current ones create
    no revision, and neither do the name and the serviceBW form. Deactivated form
    connections can be changed too.
    """
    form_connection = find_form_connection(db, form_connection_id)
    changed = data.model_fields_set
    changes: dict[str, str] = {}
    if 'name' in changed:
        changes['name'] = clean_name(data.name)
    if 'servicebw_form' in changed:
        changes['servicebw_form'] = clean_servicebw_form(data.servicebw_form)
    documents: list[RequestedDocument] | None = None
    if 'documents' in changed:
        documents = clean_documents(data.documents or [])
        if documents == _current_documents(db, form_connection):
            documents = None

    if documents is None:
        for attribute, value in changes.items():
            setattr(form_connection, attribute, value)
        db.commit()
    else:
        # End the read transaction: the revision path locks the row itself
        db.rollback()
        form_connection = create_revision(db, form_connection_id, documents, changes)
    return _view(form_connection, _current_documents(db, form_connection))


# Deactivating, activating and deleting (FR-006)


def deactivate_form_connection(
    db: Session, form_connection_id: str
) -> FormConnectionView:
    """Deactivate a form connection: its URLs answer 409 from the next call on.

    Its open requests become unavailable in the same transaction. EUDIPLO isn't
    called: the worker deletes their sessions in its next cycle.
    """
    form_connection = _lock_form_connection(db, form_connection_id)
    form_connection.is_active = False
    cancelled = cancel_open_requests(db, form_connection_id)
    db.commit()
    logger.info(
        'Form connection %s deactivated; %s open requests cancelled',
        form_connection_id,
        cancelled,
    )
    return _view(form_connection, _current_documents(db, form_connection))


def activate_form_connection(
    db: Session, form_connection_id: str
) -> FormConnectionView:
    """Activate a form connection again: its URLs work again, unchanged."""
    form_connection = _lock_form_connection(db, form_connection_id)
    form_connection.is_active = True
    db.commit()
    logger.info('Form connection %s activated', form_connection_id)
    return _view(form_connection, _current_documents(db, form_connection))


def delete_form_connection(db: Session, form_connection_id: str) -> None:
    """Delete a form connection: its URLs answer 409 for good.

    The row stays, marked deleted, so that the URLs can still say "unavailable".
    Open requests are cancelled as for deactivating, and EUDIPLO isn't called.
    """
    form_connection = _lock_form_connection(db, form_connection_id)
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
    it created one. A deleted form connection is left alone.
    """
    form_connection = db.get(FormConnection, form_connection_id)
    if form_connection is None or form_connection.deleted_at is not None:
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
