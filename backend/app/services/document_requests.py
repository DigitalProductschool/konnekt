"""Document requests: starting them, their status, and pull-mode delivery.

serviceBW starts a request through the trigger URL (FR-008) and follows it through
the pull URL (FR-013). A request's status comes from its EUDIPLO session (research
R5): the worker applies the citizen's answer (services/worker.py), and once a request
has expired, a pull makes the last check itself. In pull mode the documents are
delivered once, and again within the repeat window (FR-018, research R9).

No database transaction is held while EUDIPLO answers (research R15). Every status
change locks the request row and checks the current status again (research R7).
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, cast

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..errors import describe_error
from ..models import DocumentRequest, FormConnection, FormConnectionRevision
from ..schemas import (
    DeliveredDocument,
    PullResponse,
    RequestedDocument,
    RequestStatus,
    TriggerResponse,
    to_iso_utc,
)
from . import dcql, qr
from .documents import extract_documents
from .eudiplo import (
    EudiploClient,
    EudiploConflict,
    EudiploError,
    EudiploNotFound,
    EudiploUnavailable,
    OfferResponse,
    PresentationSession,
    get_eudiplo_client,
)
from .form_connections import NOT_FOUND as FORM_CONNECTION_NOT_FOUND
from .form_connections import mode_of

logger = logging.getLogger(__name__)

PENDING: RequestStatus = 'pending'
COMPLETED: RequestStatus = 'completed'
DECLINED: RequestStatus = 'declined'
VERIFICATION_FAILED: RequestStatus = 'verification_failed'
EXPIRED: RequestStatus = 'expired'
UNAVAILABLE: RequestStatus = 'unavailable'

# Final statuses that end a request at once. A completed request ends when its
# documents are delivered or deleted (data-model.md, "Ended requests")
ENDING_STATUSES = frozenset({DECLINED, VERIFICATION_FAILED, EXPIRED, UNAVAILABLE})

PULL_MODE = 'pull'
WEBHOOK_MODE = 'webhook'

# Wallet error responses (OAuth 2.0 and OpenID4VP): the wallet shared nothing, for
# example because the citizen declined (research R5)
WALLET_ERROR_CODES = frozenset(
    {
        'access_denied',
        'invalid_request',
        'invalid_client',
        'invalid_scope',
        'unauthorized_client',
        'unsupported_response_type',
        'server_error',
        'temporarily_unavailable',
        'vp_formats_not_supported',
        'invalid_request_uri_method',
        'invalid_transaction_data',
        'wallet_unavailable',
    }
)

# Documents are deleted this long before DOCUMENT_RETENTION_SECONDS has passed, so
# that the worker's 2-second cycle stays inside the limit (research R8)
DELETION_MARGIN = timedelta(seconds=60)

REQUEST_NOT_FOUND = {'error': 'Not found', 'message': 'Request not found'}
UNAVAILABLE_DETAIL = {
    'error': 'unavailable',
    'message': 'This form connection is deactivated or deleted',
}


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


# Statuses


def status_for_session(session_status: str, failure_code: str | None) -> RequestStatus:
    """The request status of an EUDIPLO session's state (research R5).

    A failed session with a wallet error code is `declined`. One with a verification
    code, an unknown code or no code is `verification_failed`, so that a new code
    never reads as the citizen's choice. A session that still waits for the wallet
    (`active`, `fetched`, or a state this version doesn't know) is `pending`.
    """
    if session_status == 'completed':
        return COMPLETED
    if session_status == 'expired':
        return EXPIRED
    if session_status == 'failed':
        if failure_code in WALLET_ERROR_CODES:
            return DECLINED
        return VERIFICATION_FAILED
    return PENDING


def is_open(request: DocumentRequest) -> bool:
    """Whether a request is open (data-model.md, "Open requests").

    It is open while pending, or while completed with documents that are neither
    delivered nor deleted.
    """
    if request.status == PENDING:
        return True
    return (
        request.status == COMPLETED
        and request.documents_delivered_at is None
        and request.eudiplo_session_deleted_at is None
    )


def apply_status(
    db: Session,
    request: DocumentRequest,
    new_status: RequestStatus,
    *,
    failure_code: str | None = None,
    completed_at: datetime | None = None,
) -> bool:
    """Change a request's status, if the change is still allowed (research R5, R7).

    Locks the row and reads the current status again, so that of two competing
    changes only the first takes effect. `pending` can become any other status, and
    an open `completed` request only `unavailable`; the other statuses are final.
    `completed_at` is EUDIPLO's `consumedAt`, when the citizen shared. Returns
    whether the status changed. The caller commits.
    """
    db.refresh(request, with_for_update=True)
    if not _may_change(request, new_status):
        return False
    now = _now()
    request.status = new_status
    request.status_changed_at = now
    request.failure_code = failure_code
    if new_status == COMPLETED:
        request.completed_at = completed_at or now
    if new_status in ENDING_STATUSES:
        request.ended_at = now
    logger.info('Document request %s is now %s', request.id, new_status)
    return True


def _may_change(request: DocumentRequest, new_status: RequestStatus) -> bool:
    if request.status == PENDING:
        return new_status != PENDING
    return (
        request.status == COMPLETED and new_status == UNAVAILABLE and is_open(request)
    )


def check_session(db: Session, request: DocumentRequest) -> PresentationSession | None:
    """Read a pending request's EUDIPLO session and apply its outcome (research R5).

    Past the request's expiry this is the last check (research R7): a session that
    still waits for the wallet, or is gone, makes the request `expired`. The read
    transaction ends before EUDIPLO is called, and the outcome is applied under the
    row lock and committed.

    Returns the session, which carries the documents once shared, or None when
    EUDIPLO no longer has it. Other EUDIPLO errors reach the caller, and nothing
    changes then.
    """
    session_id, expires_at = request.eudiplo_session_id, request.expires_at
    # End the read transaction: no connection is held while EUDIPLO answers
    db.rollback()
    session: PresentationSession | None
    try:
        session = get_eudiplo_client().get_session(session_id)
    except EudiploNotFound:
        session = None

    now = _now()
    new_status: RequestStatus = PENDING
    failure_code: str | None = None
    completed_at: datetime | None = None
    if session is not None:
        new_status = status_for_session(session.status, session.failure_code)
        if new_status in (DECLINED, VERIFICATION_FAILED):
            failure_code = session.failure_code
        completed_at = session.consumed_at or session.updated_at
    if new_status == PENDING and now >= expires_at:
        new_status = EXPIRED

    if new_status != PENDING:
        apply_status(
            db,
            request,
            new_status,
            failure_code=failure_code,
            completed_at=completed_at,
        )
    elif session is None:
        db.refresh(request, with_for_update=True)
    if session is None:
        mark_session_deleted(request, now)
    db.commit()
    return session


# Documents and the EUDIPLO session


def documents_deadline(request: DocumentRequest) -> datetime:
    """When a completed request's documents are deleted, delivered or not (FR-020).

    DOCUMENT_RETENTION_SECONDS after the citizen shared, less DELETION_MARGIN.
    """
    shared_at = request.completed_at or request.status_changed_at
    return (
        shared_at
        + timedelta(seconds=settings.document_retention_seconds)
        - DELETION_MARGIN
    )


def _repeat_window_end(delivered_at: datetime) -> datetime:
    return delivered_at + timedelta(seconds=settings.pull_repeat_window_seconds)


def documents_available(request: DocumentRequest, now: datetime) -> bool:
    """Whether a pull can still hand out a completed request's documents (FR-018).

    Before the first delivery, and within PULL_REPEAT_WINDOW_SECONDS after it, as
    long as the EUDIPLO session exists and the deletion time hasn't come (FR-020).
    """
    if request.eudiplo_session_deleted_at is not None:
        return False
    if now >= documents_deadline(request):
        return False
    delivered_at = request.documents_delivered_at
    return delivered_at is None or now < _repeat_window_end(delivered_at)


def session_deletion_due(request: DocumentRequest, now: datetime) -> bool:
    """Whether the worker deletes the request's EUDIPLO session now (research R8).

    - A final status other than `completed`: at once.
    - `completed` and delivered: at once in webhook mode, and in pull mode when the
      repeat window has ended.
    - `completed`, delivered or not: at the deletion time, which also ends a repeat
      window early.
    """
    if request.eudiplo_session_deleted_at is not None or request.status == PENDING:
        return False
    if request.status != COMPLETED:
        return True
    if now >= documents_deadline(request):
        return True
    delivered_at = request.documents_delivered_at
    if delivered_at is None:
        return False
    return request.mode == WEBHOOK_MODE or now >= _repeat_window_end(delivered_at)


def mark_session_deleted(request: DocumentRequest, now: datetime) -> None:
    """Record that the request's EUDIPLO session, with any documents, is gone.

    A request with a final status ends then, unless it had already ended
    (data-model.md, "Ended requests"). The caller holds the row lock and commits.
    """
    if request.eudiplo_session_deleted_at is None:
        request.eudiplo_session_deleted_at = now
    if request.status != PENDING and request.ended_at is None:
        request.ended_at = now


def delete_eudiplo_session(db: Session, request: DocumentRequest) -> None:
    """Delete a request's EUDIPLO session, with any documents in it, once it is due.

    A 404 counts as success (research R8). The read transaction ends before EUDIPLO
    is called. Other EUDIPLO errors reach the caller; the session stays recorded as
    not deleted, so the worker tries again in its next cycle.
    """
    if not session_deletion_due(request, _now()):
        return
    session_id = request.eudiplo_session_id
    db.rollback()
    get_eudiplo_client().delete_session(session_id)
    db.refresh(request, with_for_update=True)
    mark_session_deleted(request, _now())
    db.commit()


def _requested_documents(db: Session, revision_id: str) -> list[RequestedDocument]:
    revision = db.scalars(
        select(FormConnectionRevision).where(FormConnectionRevision.id == revision_id)
    ).one()
    return [RequestedDocument.model_validate(entry) for entry in revision.documents]


# Trigger URL


def _usable_form_connection(
    db: Session, form_connection_id: str, not_found: dict[str, str]
) -> FormConnection:
    """The form connection behind a connection URL (research R12).

    Answers 404 with `not_found` when it doesn't exist, and 409 "unavailable" while
    it is deactivated or after it was deleted (FR-006).
    """
    form_connection = db.get(FormConnection, form_connection_id)
    if form_connection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found)
    if form_connection.deleted_at is not None or not form_connection.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=UNAVAILABLE_DETAIL
        )
    return form_connection


def _create_offer(
    client: EudiploClient, config_id: str, request_id: str, config: dict[str, Any]
) -> OfferResponse:
    """Create the EUDIPLO request, re-creating a missing configuration once (R2)."""
    try:
        return client.create_offer(config_id, request_id)
    except EudiploConflict:
        # Removed from the shared tenant by hand, for example
        logger.warning(
            'EUDIPLO configuration %s is missing; creating it again', config_id
        )
    client.create_config(config)
    return client.create_offer(config_id, request_id)


def _delete_unsaved_session(session_id: str, request_id: str) -> None:
    """Best effort: remove the EUDIPLO session of a request that wasn't saved."""
    try:
        get_eudiplo_client().delete_session(session_id)
    except EudiploError as error:
        logger.error(
            'Could not delete the EUDIPLO session of unsaved document request %s: %s',
            request_id,
            describe_error(error),
        )
    else:
        logger.warning(
            'Deleted the EUDIPLO session of unsaved document request %s', request_id
        )


def trigger(db: Session, form_connection_id: str) -> TriggerResponse:
    """Start a document request with the form connection's current revision (FR-008).

    Answers 404 for an unknown form connection and 409 for a deactivated or deleted
    one. EUDIPLO errors reach the caller as `EudiploError`, which includes an offer
    without a cross-device link (research R19, user). Nothing is stored then: the
    EUDIPLO session of a request that can't be saved is deleted again.
    """
    form_connection = _usable_form_connection(
        db, form_connection_id, FORM_CONNECTION_NOT_FOUND
    )
    revision = db.scalars(
        select(FormConnectionRevision).where(
            FormConnectionRevision.form_connection_id == form_connection.id,
            FormConnectionRevision.revision == form_connection.current_revision,
        )
    ).one()
    triggered_at = _now()
    request = DocumentRequest(
        # Sent to EUDIPLO as the session's reference: no personal data
        id=str(uuid.uuid4()),
        reference=secrets.token_urlsafe(32),
        form_connection_id=form_connection.id,
        revision_id=revision.id,
        mode=mode_of(form_connection),
        webhook_url=form_connection.webhook_url,
        status=PENDING,
        status_changed_at=triggered_at,
        # Whole seconds, as serviceBW sees it; never later than EUDIPLO's own expiry
        expires_at=(
            triggered_at + timedelta(seconds=revision.lifetime_seconds)
        ).replace(microsecond=0),
    )
    request_id = request.id
    reference = request.reference
    expires_at = request.expires_at
    config_id = revision.eudiplo_config_id
    # Only used when EUDIPLO lost the configuration
    config = dcql.build_config(
        form_connection_id=form_connection.id,
        revision=revision.revision,
        name=form_connection.name,
        documents=[
            RequestedDocument.model_validate(entry) for entry in revision.documents
        ],
        lifetime_seconds=revision.lifetime_seconds,
        trust_list_id=settings.eudiplo_trust_list_id,
    )
    # End the read transaction: no connection is held while EUDIPLO answers
    db.rollback()

    offer = _create_offer(get_eudiplo_client(), config_id, request_id, config)
    try:
        qr_code_link = offer.cross_device_uri
        if not qr_code_link:
            # The QR code must open the request on another device (research R11)
            logger.warning(
                'EUDIPLO started document request %s without a cross-device link',
                request_id,
            )
            raise EudiploUnavailable('EUDIPLO create_offer gave no crossDeviceUri')
        qr_code = qr.png_data_uri(qr_code_link)
        request.eudiplo_session_id = offer.session
        db.add(request)
        db.commit()
    except Exception:
        db.rollback()
        _delete_unsaved_session(offer.session, request_id)
        raise

    logger.info(
        'Document request %s started for form connection %s',
        request_id,
        form_connection_id,
    )
    return TriggerResponse(
        reference=reference,
        status=PENDING,
        wallet_link=offer.uri,
        qr_code_link=qr_code_link,
        qr_code=qr_code,
        expires_at=to_iso_utc(expires_at),
    )


# Pull URL


def pull(db: Session, form_connection_id: str, reference: str) -> PullResponse:
    """A request's status and, in pull mode, its documents (FR-013, FR-018).

    Answers 404 for an unknown form connection, 409 for a deactivated or deleted
    one, and then 404 for a reference that it doesn't know, or that belongs to
    another form connection. A pending request past its expiry gets the last check
    first. A completed pull-mode request hands out its documents to the first pull,
    and to every pull within the repeat window after it. EUDIPLO errors reach the
    caller as `EudiploError`; nothing is consumed then.
    """
    _usable_form_connection(db, form_connection_id, REQUEST_NOT_FOUND)
    request = db.scalars(
        select(DocumentRequest).where(DocumentRequest.reference == reference)
    ).one_or_none()
    if request is None or request.form_connection_id != form_connection_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=REQUEST_NOT_FOUND
        )

    session: PresentationSession | None = None
    if request.status == PENDING and _now() >= request.expires_at:
        session = check_session(db, request)

    documents: list[DeliveredDocument] | None = None
    if (
        request.mode == PULL_MODE
        and request.status == COMPLETED
        and documents_available(request, _now())
    ):
        documents = _deliver(db, request, session)
    return PullResponse(
        reference=request.reference,
        status=cast(RequestStatus, request.status),
        expires_at=to_iso_utc(request.expires_at),
        documents=documents,
    )


def _deliver(
    db: Session, request: DocumentRequest, session: PresentationSession | None
) -> list[DeliveredDocument] | None:
    """Extract a completed request's documents, and count the delivery (research R9).

    Uses the session that the last check has just read, or reads it without
    holding a transaction. Whether the documents can still be handed out is checked
    again under the row lock, so that two pulls at the same moment, or a pull and
    the worker's deletion, agree on what happened. The first pull that hands them
    out sets `documents_delivered_at`, which starts the repeat window, and ends the
    request. Returns None when the documents are gone.
    """
    request_id = request.id
    documents = _requested_documents(db, request.revision_id)
    if session is None:
        session_id = request.eudiplo_session_id
        db.rollback()
        try:
            session = get_eudiplo_client().get_session(session_id)
        except EudiploNotFound:
            # Deleted already, so the documents are gone
            db.refresh(request, with_for_update=True)
            mark_session_deleted(request, _now())
            db.commit()
            return None
    if not session.credentials:
        logger.warning(
            'The EUDIPLO session of document request %s holds no documents',
            request_id,
        )
        return None
    delivered = extract_documents(session.credentials, documents, request_id=request_id)

    db.refresh(request, with_for_update=True)
    now = _now()
    if request.status != COMPLETED or not documents_available(request, now):
        db.commit()
        return None
    if request.documents_delivered_at is None:
        # The first delivery: it starts the repeat window, and the request ends
        request.documents_delivered_at = now
        request.ended_at = now
        logger.info('Document request %s: documents delivered to a pull', request_id)
    db.commit()
    return delivered
