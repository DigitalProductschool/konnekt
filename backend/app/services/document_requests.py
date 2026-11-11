"""Document requests: starting them, their status, and delivering their documents.

serviceBW starts a request through the trigger URL (FR-008) and follows it through
the pull URL (FR-013), or through the pull URL of another branch of the form
connection, which evaluates that branch's rules (spec 002, FR-025). A request's
status comes from its EUDIPLO session (research
R5): the worker applies the citizen's answer (services/worker.py), and once a request
has expired, a pull makes the last check itself. The documents are delivered once,
and again within the repeat window (FR-018, research R9), each time with the
evaluation of the rules the request was triggered with (spec 002, research R8). The
evaluation is computed at every delivery and never stored or logged (FR-017).

No database transaction is held while EUDIPLO answers (research R15). Every status
change locks the request row and checks the current status again (research R7).
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, cast

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..errors import describe_error
from ..models import (
    DocumentRequest,
    FormConnection,
    FormConnectionBranch,
    FormConnectionRevision,
    FormConnectionRuleSet,
)
from ..schemas import (
    RULE_SET_SNAPSHOT,
    DeliveredDocument,
    Evaluation,
    PullResponse,
    RequestedDocument,
    RequestStatus,
    SnapshotBranch,
    TriggerResponse,
    to_iso_utc,
)
from . import dcql, qr, rules
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
from .evaluation import day_of_sharing, evaluate_branch

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

# The answers of serviceBW's connection URLs, the only callers of the checks
# below: plain English whatever the request's language (spec 009, FR-017). The
# management side's 404 is `form_connections.NOT_FOUND`
FORM_CONNECTION_NOT_FOUND = {
    'error': 'Not found',
    'message': 'Form connection not found',  # serviceBW's answer, English
}
REQUEST_NOT_FOUND = {
    'error': 'Not found',
    'message': 'Request not found',  # serviceBW's answer, English
}
UNAVAILABLE_DETAIL = {
    'error': 'unavailable',
    # serviceBW's answer, English (also a draft's URL, spec 005)
    'message': 'This form connection is deactivated or deleted',
}
# A branch's pull URL (spec 002, contracts/integration-api.md "Order of the checks")
BRANCH_DELETED_DETAIL = {
    'error': 'unavailable',
    'message': 'This variant was deleted',  # serviceBW's answer, English
}
BRANCH_ADDED_LATER_DETAIL = {
    'error': 'branch_added_later',
    # serviceBW's answer, English
    'message': "This variant didn't exist when the request was triggered",
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


# The same test as is_open(), in SQL
OPEN_REQUEST = or_(
    DocumentRequest.status == PENDING,
    and_(
        DocumentRequest.status == COMPLETED,
        DocumentRequest.documents_delivered_at.is_(None),
        DocumentRequest.eudiplo_session_deleted_at.is_(None),
    ),
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


def cancel_open_requests(db: Session, form_connection_id: str) -> int:
    """Make every open request of a form connection unavailable (FR-006).

    Deactivating and deleting call it in their own transaction, so that reactivating
    right afterwards can't revive the requests. Returns how many were cancelled. The
    caller commits; the worker then deletes their EUDIPLO sessions.
    """
    requests = db.scalars(
        select(DocumentRequest).where(
            DocumentRequest.form_connection_id == form_connection_id, OPEN_REQUEST
        )
    ).all()
    return sum(apply_status(db, request, UNAVAILABLE) for request in requests)


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
    - `completed` and delivered: when the repeat window has ended.
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
    return now >= _repeat_window_end(delivered_at)


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


def _branch_of(
    db: Session, request: DocumentRequest, branch_id: str | None
) -> SnapshotBranch:
    """The branch whose rules evaluate a request's documents (FR-025, FR-028).

    `branch_id` names the branch whose pull URL was called, or is None for the main
    branch's. The branch is taken as it was when the request was triggered. A
    request triggered before rules existed has no rule set: its main branch is the
    current one without rules, which every request meets (US1-AS7, research R8).
    A branch that the request's rule set doesn't have was added after the trigger,
    and answers 409 `branch_added_later` (FR-025): every other branch for a request
    triggered before rules existed.
    """
    if request.rule_set_id is None:
        if branch_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=BRANCH_ADDED_LATER_DETAIL
            )
        form_connection = db.get(FormConnection, request.form_connection_id)
        if form_connection is None:
            raise LookupError(f'Document request {request.id} has no form connection')
        main_branch = rules.current_branches(db, form_connection)[0]
        return main_branch.model_copy(update={'items': []})
    rule_set = db.get(FormConnectionRuleSet, request.rule_set_id)
    if rule_set is None:
        raise LookupError(f'Document request {request.id} has no rule set')
    branches = RULE_SET_SNAPSHOT.validate_python(rule_set.branches)
    if branch_id is None:
        return next(branch for branch in branches if branch.origin == 'main')
    branch = next((branch for branch in branches if branch.id == branch_id), None)
    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=BRANCH_ADDED_LATER_DETAIL
        )
    return branch


# Trigger URL


def _usable_form_connection(
    db: Session, form_connection_id: str, not_found: dict[str, str]
) -> FormConnection:
    """The form connection behind a connection URL (research R12).

    Answers 404 with `not_found` when it doesn't exist, and 409 "unavailable" while
    it is deactivated, after it was deleted, and while it is a draft (FR-006; spec
    005, research R8). A draft answers exactly as a deactivated connection does, so
    a caller can't tell them apart, and the check comes before anything reads a
    revision: a draft has none. A deleted draft answers 404, as when deleting it
    removed its row: its row now stays, marked deleted, until the restore time has
    passed (spec 010, research R5, FR-075). On a branch's pull URL it is step 2 of
    spec 002's "Order of the checks", before the branch is looked at.
    """
    form_connection = db.get(FormConnection, form_connection_id)
    if form_connection is None or (
        form_connection.published_at is None and form_connection.deleted_at is not None
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found)
    if (
        form_connection.deleted_at is not None
        or not form_connection.is_active
        or form_connection.published_at is None
    ):
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

    The request also keeps the current rule set, read from the same row as the
    revision, so that it is evaluated with the rules saved together with its
    documents (spec 002, FR-028). Answers 404 for an unknown form connection and
    409 for a deactivated or deleted one, or a draft (spec 005, FR-006). EUDIPLO
    errors reach the caller as `EudiploError`, which includes an offer
    without a cross-device link (research R19, user). Nothing is stored then: the
    EUDIPLO session of a request that can't be saved is deleted again.
    """
    form_connection = _usable_form_connection(
        db, form_connection_id, FORM_CONNECTION_NOT_FOUND
    )
    # Past the check above the connection is published, so both are set
    # (data-model.md); this narrows them from `int | None` to `int`
    current_revision = form_connection.current_revision
    current_rule_set = form_connection.current_rule_set
    if current_revision is None or current_rule_set is None:
        raise LookupError(
            f'Published form connection {form_connection.id} has no current revision'
        )
    revision = db.scalars(
        select(FormConnectionRevision).where(
            FormConnectionRevision.form_connection_id == form_connection.id,
            FormConnectionRevision.revision == current_revision,
        )
    ).one()
    rule_set_id = db.scalars(
        select(FormConnectionRuleSet.id).where(
            FormConnectionRuleSet.form_connection_id == form_connection.id,
            FormConnectionRuleSet.version == current_rule_set,
        )
    ).one()
    triggered_at = _now()
    request = DocumentRequest(
        # Sent to EUDIPLO as the session's reference: no personal data
        id=str(uuid.uuid4()),
        reference=secrets.token_urlsafe(32),
        form_connection_id=form_connection.id,
        revision_id=revision.id,
        rule_set_id=rule_set_id,
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


# Pull URLs


def _check_branch(db: Session, form_connection_id: str, branch_id: str) -> None:
    """The branch behind a pull URL other than the main branch's (spec 002, R3).

    Answers 404 for an unknown branch, another form connection's, and the main
    branch, whose pull URL is spec 001's; and 409 "unavailable" for a deleted one,
    for good (FR-027).
    """
    branch = db.get(FormConnectionBranch, branch_id)
    if (
        branch is None
        or branch.form_connection_id != form_connection_id
        or branch.is_main
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=REQUEST_NOT_FOUND
        )
    if branch.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=BRANCH_DELETED_DETAIL
        )


def pull(
    db: Session,
    form_connection_id: str,
    reference: str,
    branch_id: str | None = None,
) -> PullResponse:
    """A request's status and, once it is completed, its documents (FR-013, FR-018).

    `branch_id` is None for the main branch's pull URL, and names the branch of
    every other one (spec 002, contracts/integration-api.md "Order of the checks").
    Answers 404 for an unknown form connection, and 409 for a deactivated or
    deleted one, or a draft (spec 005, FR-006). A branch's pull URL then answers
    404 for a branch the form connection doesn't have besides its main branch, and
    409 for a deleted one.
    Then come 404 for a reference that the form connection doesn't know, and 409
    `branch_added_later` for a branch added after the request was triggered.

    A pending request past its expiry gets the last check first. A completed
    request hands out its documents to the first pull, and to every pull within the
    repeat window after it, each time with the evaluation of the called branch's
    rules (spec 002, FR-010). The delivery is the request's: every branch's pull
    URL answers with the same status and documents, and the first delivery through
    any of them starts the repeat window for all (FR-025). Without documents there
    is no evaluation either (FR-017). EUDIPLO errors reach the caller as
    `EudiploError`; nothing is consumed then.
    """
    _usable_form_connection(db, form_connection_id, REQUEST_NOT_FOUND)
    if branch_id is not None:
        _check_branch(db, form_connection_id, branch_id)
    request = db.scalars(
        select(DocumentRequest).where(DocumentRequest.reference == reference)
    ).one_or_none()
    if request is None or request.form_connection_id != form_connection_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=REQUEST_NOT_FOUND
        )
    branch = _branch_of(db, request, branch_id)

    session: PresentationSession | None = None
    if request.status == PENDING and _now() >= request.expires_at:
        session = check_session(db, request)

    documents: list[DeliveredDocument] | None = None
    evaluation: Evaluation | None = None
    if request.status == COMPLETED and documents_available(request, _now()):
        delivery = _deliver(db, request, session, branch)
        if delivery is not None:
            documents, evaluation = delivery
    return PullResponse(
        reference=request.reference,
        status=cast(RequestStatus, request.status),
        expires_at=to_iso_utc(request.expires_at),
        documents=documents,
        evaluation=evaluation,
    )


def _deliver(
    db: Session,
    request: DocumentRequest,
    session: PresentationSession | None,
    branch: SnapshotBranch,
) -> tuple[list[DeliveredDocument], Evaluation] | None:
    """Extract a completed request's documents, evaluate them, and count the delivery.

    Research R8, R9. Uses the session that the last check has just read, or reads
    it without holding a transaction. The evaluation uses `branch`, the called
    branch as the request was triggered with it, and the day the citizen shared, so
    a repeated pull gets the same one. It is made before the delivery is counted:
    if it fails, the error reaches the catch-all handler, nothing is handed out and
    the repeat window doesn't start, so serviceBW can pull again (FR-017). Whether
    the documents can still be
    handed out is checked again under the row lock, so that two pulls at the same
    moment, or a pull and the worker's deletion, agree on what happened. The first
    pull that hands them out sets `documents_delivered_at`, which starts the repeat
    window, and ends the request. Returns None when the documents are gone.
    """
    request_id = request.id
    documents = _requested_documents(db, request.revision_id)
    shared_on = day_of_sharing(request.completed_at or request.status_changed_at)
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
    evaluation = evaluate_branch(branch, delivered, shared_on)

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
    return delivered, evaluation
