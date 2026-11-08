"""Approval requests: an agent asks, the team member approves in the Portal.

Spec 007, contracts/management-api.md "Approval requests", research R12. An agent
creates a request with its bearer token and reads its own; the team member it was
made for reads it on the approval page and approves or declines it there, in the
browser session only (a bearer answers 403 `browser_only`).
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import UserAccount
from ..schemas import ApiResponse, ApprovalCreate, ApprovalPreview, ApprovalRequest
from ..services import approvals
from ..services.auth import (
    Principal,
    get_current_principal,
    require_browser_session,
    require_json,
)
from .form_connections import CONFIG_FAILED

router = APIRouter(prefix='/api/approval-requests', tags=['approval-requests'])


@router.post(
    '',
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_json)],
)
def create_approval_request(
    data: ApprovalCreate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> ApiResponse[ApprovalRequest]:
    """Ask the team member to approve an action; nothing is done yet.

    Agents only: a browser session answers 403 `browser_only`, an agent below the
    action's level 403 `insufficient_access`. An unknown or deleted connection
    answers 404, an action that doesn't apply 409 `not_allowed`, and a draft that
    publishing would refuse 400 with publishing's message. A waiting request for
    the same connection and action becomes `replaced`.
    """
    request = approvals.create_request(db, principal, data)
    return ApiResponse(data=request, message='Approval requested')


@router.get('/{request_id}')
def get_approval_request(
    request_id: str,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> ApiResponse[ApprovalPreview]:
    """Read a request as it is now, with what it acts on.

    A browser session reads its own account's requests (403 `not_yours`
    otherwise), a bearer its own authorization's (404 otherwise).
    """
    return ApiResponse(data=approvals.get_request(db, principal, request_id))


@router.post('/{request_id}/approve', dependencies=[Depends(require_json)])
def approve_request(
    request_id: str,
    user: UserAccount = Depends(require_browser_session),
    db: Session = Depends(get_db),
) -> ApiResponse[ApprovalPreview]:
    """Approve a waiting request: its action runs as in the Connection Portal.

    The request's account only (403 `not_yours`). A request that isn't waiting,
    has expired or no longer applies answers 409 `approval_<status>` and nothing
    is done. A failure of EUDIPLO answers 502 or 503 with an `error_id`, as
    publishing does, and the request stays waiting for another attempt.
    """
    preview = approvals.approve(db, user, request_id, CONFIG_FAILED)
    return ApiResponse(
        data=preview, message=approvals.APPROVED_MESSAGES[preview.request.action]
    )


@router.post('/{request_id}/decline', dependencies=[Depends(require_json)])
def decline_request(
    request_id: str,
    user: UserAccount = Depends(require_browser_session),
    db: Session = Depends(get_db),
) -> ApiResponse[ApprovalPreview]:
    """Decline a waiting request; nothing else changes.

    The same rules as approving: the request's account only, and a request that
    isn't waiting answers 409 `approval_<status>`.
    """
    preview = approvals.decline(db, user, request_id)
    return ApiResponse(data=preview, message=approvals.DECLINED_MESSAGE)
