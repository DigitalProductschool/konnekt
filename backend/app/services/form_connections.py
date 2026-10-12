"""Form connections: validation, creation, reading and changes (FR-001 to FR-005).

Creating a form connection stores revision 1 and creates its EUDIPLO presentation
configuration (data-model.md, "Creating a revision"). Changing the name, the
serviceBW form or the webhook address creates no revision. EUDIPLO errors reach the
caller as `EudiploError`; nothing is saved then.
"""

import logging
import re
import uuid
from urllib.parse import urlsplit

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..catalog import DOCUMENT_TYPES, get_document_type
from ..config import settings
from ..errors import describe_error
from ..models import FormConnection, FormConnectionRevision
from ..schemas import (
    DocumentField,
    FormConnectionCreate,
    FormConnectionMode,
    FormConnectionSummary,
    FormConnectionUpdate,
    RequestedDocument,
    RequestedDocumentView,
    to_iso_utc,
)
from ..schemas import FormConnection as FormConnectionView
from . import dcql
from .eudiplo import EudiploError, get_eudiplo_client

logger = logging.getLogger(__name__)

NAME_MAX_LENGTH = 200
SERVICEBW_FORM_MAX_LENGTH = 500
WEBHOOK_URL_MAX_LENGTH = 2000
_WHITESPACE = re.compile(r'\s')

NOT_FOUND = {'error': 'Not found', 'message': 'Form connection not found'}


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


def clean_webhook_url(value: str | None) -> str | None:
    """Check a webhook address; a blank one means none, so pull mode (FR-014).

    It must be an absolute https:// URL, or http:// with ALLOW_PLAIN_HTTP (FR-019).
    """
    url = (value or '').strip()
    if not url:
        return None
    if len(url) > WEBHOOK_URL_MAX_LENGTH:
        raise _validation_error(
            f'The webhook address can have at most {WEBHOOK_URL_MAX_LENGTH} characters.'
        )
    if settings.allow_plain_http:
        schemes = {'https', 'http'}
        message = 'The webhook address must be an https:// or http:// URL.'
    else:
        schemes = {'https'}
        message = 'The webhook address must be an https:// URL.'
    try:
        parts = urlsplit(url)
        # Reading the port checks it
        parts.port
    except ValueError:
        raise _validation_error(message) from None
    if parts.scheme not in schemes or not parts.hostname or _WHITESPACE.search(url):
        raise _validation_error(message)
    return url


# Views


def mode_of(form_connection: FormConnection) -> FormConnectionMode:
    """Webhook mode with a webhook address, otherwise pull mode."""
    return 'webhook' if form_connection.webhook_url else 'pull'


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
        mode=mode_of(form_connection),
        webhook_url=form_connection.webhook_url,
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
        mode=mode_of(form_connection),
        updated_at=to_iso_utc(form_connection.updated_at),
    )


# Reading


def find_form_connection(db: Session, form_connection_id: str) -> FormConnection:
    """Return a form connection that isn't deleted, or answer 404."""
    form_connection = db.get(FormConnection, form_connection_id)
    if form_connection is None or form_connection.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    return form_connection


def _current_documents(
    db: Session, form_connection: FormConnection
) -> list[RequestedDocument]:
    revision = db.scalars(
        select(FormConnectionRevision).where(
            FormConnectionRevision.form_connection_id == form_connection.id,
            FormConnectionRevision.revision == form_connection.current_revision,
        )
    ).one()
    return [RequestedDocument.model_validate(entry) for entry in revision.documents]


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
    webhook_url = clean_webhook_url(data.webhook_url)

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
        webhook_url=webhook_url,
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


def update_form_connection(
    db: Session, form_connection_id: str, data: FormConnectionUpdate
) -> FormConnectionView:
    """Change the name, the serviceBW form or the webhook address.

    An absent field stays unchanged, and `webhook_url: null` removes the address,
    which switches new requests to pull mode. None of these creates a revision.
    Deactivated form connections can be changed too.
    """
    form_connection = find_form_connection(db, form_connection_id)
    changed = data.model_fields_set
    if 'documents' in changed:
        # New revisions for changed documents come with User Story 4 (T065)
        raise _validation_error('Changing the documents is not supported yet.')

    values: dict[str, str | None] = {}
    if 'name' in changed:
        values['name'] = clean_name(data.name)
    if 'servicebw_form' in changed:
        values['servicebw_form'] = clean_servicebw_form(data.servicebw_form)
    if 'webhook_url' in changed:
        values['webhook_url'] = clean_webhook_url(data.webhook_url)
    for attribute, value in values.items():
        setattr(form_connection, attribute, value)
    db.commit()
    return _view(form_connection, _current_documents(db, form_connection))
