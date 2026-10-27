"""serviceBW's connection URLs: the trigger URL and each branch's pull URL.

contracts/integration-api.md describes them, and spec 002's the pull URLs of the
branches other than the main branch. They need no sign-in and no JSON body:
the production nginx forwards /api/connect/ only from serviceBW's network (FR-017,
research R13). Request references are secrets, so they never reach a log.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import ApiResponse, PullResponse, TriggerResponse
from ..services import document_requests
from ..services.eudiplo import EudiploError, http_error_for

# The answers when EUDIPLO can't start a request, or can't hand out its documents
TRIGGER_FAILED = 'The wallet service could not start the request. Try again.'
PULL_FAILED = 'The documents could not be fetched. Try again.'

router = APIRouter(prefix='/api/connect', tags=['connect'])


@router.post('/{form_connection_id}/requests', status_code=status.HTTP_201_CREATED)
def start_document_request(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[TriggerResponse]:
    """Start a document request: a wallet link, its QR code and a reference.

    Any body is ignored. Every call starts a new, independent request (FR-008).
    """
    try:
        started = document_requests.trigger(db, form_connection_id)
    except EudiploError as error:
        raise http_error_for(error, TRIGGER_FAILED) from None
    return ApiResponse(data=started, message='Document request started')


@router.get('/{form_connection_id}/requests/{reference}')
def get_document_request(
    form_connection_id: str, reference: str, db: Session = Depends(get_db)
) -> ApiResponse[PullResponse]:
    """Report a request's status and, in pull mode, deliver its documents.

    The documents come with the first pull after the citizen shared, and with every
    pull in the repeat window after it (FR-013, FR-018).
    """
    try:
        pulled = document_requests.pull(db, form_connection_id, reference)
    except EudiploError as error:
        raise http_error_for(error, PULL_FAILED) from None
    return ApiResponse(data=pulled)


@router.get('/{form_connection_id}/branches/{branch_id}/requests/{reference}')
def get_branch_document_request(
    form_connection_id: str,
    branch_id: str,
    reference: str,
    db: Session = Depends(get_db),
) -> ApiResponse[PullResponse]:
    """Report a request's status and documents, evaluated with a branch's rules.

    The pull URL of every branch but the main branch, whose pull URL is the one
    above (spec 002, FR-025). It answers with the request's status and documents
    like the main branch's, with this branch's evaluation; a deleted branch answers
    409 "unavailable" for good, and one added after the request was triggered 409
    `branch_added_later` (FR-027).
    """
    try:
        pulled = document_requests.pull(db, form_connection_id, reference, branch_id)
    except EudiploError as error:
        raise http_error_for(error, PULL_FAILED) from None
    return ApiResponse(data=pulled)
