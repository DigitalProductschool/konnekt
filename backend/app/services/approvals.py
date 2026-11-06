"""Approval requests: an agent asks, a team member approves (spec 007, research R12).

data-model.md section 5. An agent with the action's access level asks for an action
on a connection (`create_request`): the action's preconditions are checked without
writing, and the request remembers what it was made for (a draft's version). The
team member it was made for opens its page (`get_request`) and approves or declines
it there, in their browser session. Expiry, staleness and an ended access are
computed at every read and again under the row locks at approval (section 5.2), so
nothing that deletes or changes a connection or an authorization needs to know
about approvals. Approving runs the existing services with the locks released, so
that no transaction is held while EUDIPLO answers; a failure keeps the request
waiting, with its error id, for "Try again" (FR-027). `cancel_for` is what the user
page runs when it lowers or revokes an agent's access (research R7).

This covers the actions `publish` and `delete_draft`; `deactivate`, `reactivate`
and `delete` follow with user story 7. Nothing here logs more than ids and counts.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal, cast

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..config import settings
from ..models import (
    AgentAuthorization,
    ApprovalRequest,
    FormConnection,
    OauthClient,
    UserAccount,
)
from ..schemas import (
    AccessLevel,
    ApprovalAction,
    ApprovalCreate,
    ApprovalOutcome,
    ApprovalPreview,
    ApprovalStatus,
    ConnectionUrls,
    VariantUrl,
    to_iso_utc,
)
from ..schemas import ApprovalRequest as ApprovalRequestView
from ..schemas import FormConnection as FormConnectionView
from . import drafts, form_connections
from .auth import (
    BROWSER_ONLY,
    UNAUTHORIZED,
    Principal,
    insufficient_access,
    level_allows,
)
from .eudiplo import EudiploError, http_error_for
from .evaluation import GERMANY

logger = logging.getLogger(__name__)

# The access level each action needs (data-model.md sections 3.1 and 5.3)
ACTION_LEVELS: dict[ApprovalAction, AccessLevel] = {
    'publish': 'drafts',
    'delete_draft': 'drafts',
    'deactivate': 'manage',
    'reactivate': 'manage',
    'delete': 'manage',
}
# The actions on a draft, whose requests remember the draft's version
DRAFT_ACTIONS: frozenset[str] = frozenset({'publish', 'delete_draft'})

# The reasons stored with a cancellation; the others are computed at every read
CancelReason = Literal['revoked', 'access_changed']

NOT_FOUND = {'error': 'Not found', 'message': 'Approval request not found'}
NOT_YOURS = {
    'error': 'not_yours',
    'message': 'This request was made for another team member.',
}
PUBLISHED_ALREADY = {
    'error': 'not_allowed',
    'message': 'This connection is published already.',
}
# Until user story 7 brings deactivate, reactivate and delete (T082)
NOT_AVAILABLE_YET = {
    'error': 'not_allowed',
    'message': 'Approval requests for this action are not available yet.',
}

# The answers' messages when an approved action ran, and when declined
# (contracts/management-api.md "Approval requests")
APPROVED_MESSAGES: dict[str, str] = {
    'publish': 'Published',
    'delete_draft': 'Draft deleted',
    'deactivate': 'Connection deactivated',
    'reactivate': 'Connection reactivated',
    'delete': 'Connection deleted',
}
DECLINED_MESSAGE = 'Declined'

# The approval page's sentence for each state that isn't waiting
# (contracts/ui-screens.md S3 "Outcome states"): the message of a 409
# approval_<status>
DONE_TEXTS: dict[str, str] = {
    action: f'{message}.' for action, message in APPROVED_MESSAGES.items()
}
DECLINED_TEXT = 'You declined this request. Nothing has changed.'
EXPIRED_TEXT = (
    'This request expired at {time}. Nothing has changed. The agent can ask again.'
)
REPLACED_TEXT = 'The agent made a newer request for this action.'
CANCELLED_TEXTS: dict[str, str] = {
    'draft_changed': (
        'The draft has changed since the agent asked. Nothing has changed; the '
        'agent has to ask again.'
    ),
    'draft_published': 'The draft has been published since the agent asked.',
    'draft_deleted': 'The draft has been deleted since the agent asked.',
    'access_changed': (
        "The agent's access has changed, so this request was cancelled."
    ),
    'revoked': "The agent's access was revoked, so this request was cancelled.",
    'access_ended': "The agent's access has ended, so this request was cancelled.",
}
CANCELLED_TEXT = 'This request was cancelled.'


def cancel_for(
    db: Session,
    authorization_id: str,
    reason: CancelReason,
    below: AccessLevel | None = None,
) -> int:
    """Cancel an authorization's waiting approval requests, and count them.

    Without `below`, all of them (revoking); with it, those whose action needs more
    than the level `below` (lowering the access: `deactivate`, `reactivate` and
    `delete` below `manage`, every action below `drafts`). Each becomes `cancelled`
    with `reason` and `decided_at`. A request past its expiry already reads as
    `expired` and stays so. The caller commits, together with its own change.
    """
    actions = [
        action
        for action, needed in ACTION_LEVELS.items()
        if below is None or not level_allows(below, needed)
    ]
    if not actions:
        return 0
    now = datetime.now(tz=timezone.utc)
    cancelled = db.scalars(
        update(ApprovalRequest)
        .where(
            ApprovalRequest.authorization_id == authorization_id,
            ApprovalRequest.status == 'waiting',
            ApprovalRequest.expires_at > now,
            ApprovalRequest.action.in_(actions),
        )
        .values(status='cancelled', cancel_reason=reason, decided_at=now)
        .returning(ApprovalRequest.id)
        .execution_options(synchronize_session=False)
    ).all()
    if cancelled:
        logger.info(
            'Cancelled %d approval requests of agent authorization %s',
            len(cancelled),
            authorization_id,
        )
    return len(cancelled)


# The status a request reads as (data-model.md section 5.2)


@dataclass(frozen=True)
class RequestState:
    """What a request reads as now: its status and, when cancelled, the reason."""

    status: ApprovalStatus
    cancel_reason: str | None = None


def _stale_reason(
    request: ApprovalRequest, form_connection: FormConnection | None
) -> str | None:
    """Why a waiting request no longer applies to its connection, or None.

    For `publish` and `delete_draft`: the row is gone (`draft_deleted`), published
    (`draft_published`) or at another draft version (`draft_changed`). A change of
    a published connection's content doesn't matter (spec, edge cases).
    """
    if request.action not in DRAFT_ACTIONS:
        return None
    if form_connection is None:
        return 'draft_deleted'
    if form_connection.published_at is not None:
        return 'draft_published'
    if (
        request.draft_version is None
        or form_connection.draft_version != request.draft_version
    ):
        return 'draft_changed'
    return None


def state_of(
    request: ApprovalRequest,
    form_connection: FormConnection | None,
    now: datetime,
) -> RequestState:
    """The status `request` reads as at `now`, with `form_connection` as it is.

    A stored final status stays what it is. A waiting request reads as `expired`
    once `expires_at` has passed; as `cancelled`, `access_ended` once its
    authorization is gone (null: the worker's sweep or a retired refresh token's
    reuse, which don't run `cancel_for`); as `cancelled` with the stale reason when
    its connection moved on; and as `waiting` otherwise.
    """
    if request.status != 'waiting':
        return RequestState(cast(ApprovalStatus, request.status), request.cancel_reason)
    if request.expires_at <= now:
        return RequestState('expired')
    if request.authorization_id is None:
        return RequestState('cancelled', 'access_ended')
    reason = _stale_reason(request, form_connection)
    if reason is not None:
        return RequestState('cancelled', reason)
    return RequestState('waiting')


def state_text(request: ApprovalRequest, state: RequestState) -> str:
    """The approval page's sentence for a state that isn't waiting."""
    if state.status == 'done':
        return DONE_TEXTS.get(request.action, 'Done.')
    if state.status == 'declined':
        return DECLINED_TEXT
    if state.status == 'expired':
        expired_at = request.expires_at.astimezone(GERMANY)
        return EXPIRED_TEXT.format(time=f'{expired_at:%H:%M}')
    if state.status == 'replaced':
        return REPLACED_TEXT
    return CANCELLED_TEXTS.get(state.cancel_reason or '', CANCELLED_TEXT)


def _not_waiting(request: ApprovalRequest, state: RequestState) -> HTTPException:
    """The 409 for approving or declining a request that isn't waiting."""
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            'error': f'approval_{state.status}',
            'message': state_text(request, state),
        },
    )


# Views


def _iso_or_none(value: datetime | None) -> str | None:
    return to_iso_utc(value) if value is not None else None


def request_view(
    request: ApprovalRequest,
    form_connection: FormConnection | None,
    *,
    mine: bool,
    now: datetime | None = None,
    connection_name: str | None = None,
) -> ApprovalRequestView:
    """A request as the API answers it, with the status it reads as at `now`.

    `link` is its approval page; `outcome` is the status, or `failed` while it is
    waiting after an approve attempt failed (FR-027). The connection's name is the
    row's, `connection_name` when the caller read it before the row went, or ''
    once the draft is deleted.
    """
    state = state_of(request, form_connection, now or datetime.now(tz=timezone.utc))
    outcome: ApprovalOutcome = state.status
    if state.status == 'waiting' and request.failed_at is not None:
        outcome = 'failed'
    if connection_name is None:
        connection_name = form_connection.name if form_connection is not None else ''
    return ApprovalRequestView(
        id=request.id,
        action=cast(ApprovalAction, request.action),
        form_connection_id=request.form_connection_id,
        connection_name=connection_name,
        requested_by=request.requested_by,
        status=state.status,
        outcome=outcome,
        cancel_reason=state.cancel_reason,
        link=f'{settings.portal_url}/approvals/{request.id}',
        expires_at=to_iso_utc(request.expires_at),
        created_at=to_iso_utc(request.created_at),
        decided_at=_iso_or_none(request.decided_at),
        failed_at=_iso_or_none(request.failed_at),
        error_id=request.error_id,
        mine=mine,
    )


def _urls_of(connection: FormConnectionView) -> ConnectionUrls:
    """The trigger URL and each variant's pull URL, main variant first."""
    return ConnectionUrls(
        trigger_url=connection.trigger_url,
        variants=[
            VariantUrl(id=branch.id, name=branch.name, pull_url=branch.pull_url)
            for branch in connection.branches
        ],
    )


def _preview(
    db: Session,
    request: ApprovalRequest,
    form_connection: FormConnection | None,
    *,
    mine: bool,
    now: datetime,
    connection_name: str | None = None,
) -> ApprovalPreview:
    """A request with what it acts on: the stored draft while it is one, and the
    connection URLs once a publish is done and the connection isn't deleted."""
    view = request_view(
        request,
        form_connection,
        mine=mine,
        now=now,
        connection_name=connection_name,
    )
    draft = None
    urls = None
    if form_connection is not None and request.action in DRAFT_ACTIONS:
        if form_connection.published_at is None:
            draft = drafts.draft_view(form_connection)
        elif (
            request.action == 'publish'
            and view.status == 'done'
            and form_connection.deleted_at is None
        ):
            urls = _urls_of(
                form_connections.get_form_connection(db, form_connection.id)
            )
    return ApprovalPreview(request=view, draft=draft, connection=None, urls=urls)


# Rows and locks


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)


def _lock_request(db: Session, request_id: str) -> ApprovalRequest | None:
    """Lock a request's row and read it again; None once it is gone."""
    return db.scalars(
        select(ApprovalRequest)
        .where(ApprovalRequest.id == request_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()


def _lock_connection(db: Session, form_connection_id: str) -> FormConnection | None:
    """Lock a connection's row and read it again; None once a draft is deleted."""
    return db.scalars(
        select(FormConnection)
        .where(FormConnection.id == form_connection_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()


def _lock_both(
    db: Session, request_id: str, form_connection_id: str
) -> tuple[ApprovalRequest, FormConnection | None]:
    """Lock the connection's row, then the request's, and read both again.

    Always in this order, which creating a request keeps too (the connection's
    row, then the requests it replaces), so that the two never wait for each
    other. Answers 404 once the request is gone, after releasing the locks.
    """
    form_connection = _lock_connection(db, form_connection_id)
    request = _lock_request(db, request_id)
    if request is None:
        db.rollback()
        raise _not_found()
    return request, form_connection


def _own_request(db: Session, user: UserAccount, request_id: str) -> ApprovalRequest:
    """The request, if it was made for `user`: 404 if unknown, 403 `not_yours`."""
    request = db.get(ApprovalRequest, request_id)
    if request is None:
        raise _not_found()
    if request.user_account_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=NOT_YOURS)
    return request


# Creating a request (data-model.md section 5.3)


def _agent_name(db: Session, authorization: AgentAuthorization) -> str:
    """The agent's name for the page: the client's, or the token's name."""
    if authorization.kind == 'oauth':
        client = (
            db.get(OauthClient, authorization.client_id)
            if authorization.client_id is not None
            else None
        )
        name = client.client_name if client is not None else ''
    else:
        name = authorization.name
    return name[:200]


def _check_preconditions(
    db: Session, form_connection: FormConnection, action: ApprovalAction
) -> None:
    """Refuse an action that doesn't apply to the connection, writing nothing.

    `publish` and `delete_draft` need a draft (409 `not_allowed` for a published
    connection), and `publish` one that publishing accepts as stored
    (`drafts.check_publishable()`, whose 400 passes through; FR-022).
    """
    if action not in DRAFT_ACTIONS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=NOT_AVAILABLE_YET
        )
    if form_connection.published_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=PUBLISHED_ALREADY
        )
    if action == 'publish':
        drafts.check_publishable(db, form_connection)


def _lock_authorization(
    db: Session, authorization_id: str, needed: AccessLevel
) -> None:
    """Hold the asking authorization while the request is written, and check it.

    `FOR KEY SHARE`: revoking, lowering the level and the worker's sweep wait for
    the commit (and then cancel the new request, or set its `authorization_id` to
    null), while a bearer call may still touch `last_used_at`. An authorization
    revoked since the call's sign-in answers 401, as its token now would; one
    lowered below `needed` meanwhile, 403 `insufficient_access`.
    """
    authorization = db.scalars(
        select(AgentAuthorization)
        .where(AgentAuthorization.id == authorization_id)
        .with_for_update(read=True, key_share=True)
        .execution_options(populate_existing=True)
    ).one_or_none()
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=UNAUTHORIZED
        )
    if not level_allows(authorization.access_level, needed):
        raise insufficient_access(needed)


def create_request(
    db: Session, principal: Principal, data: ApprovalCreate
) -> ApprovalRequestView:
    """An agent asks the team member to approve an action (FR-021, FR-022).

    1. Only an agent asks: a browser session answers 403 `browser_only`, an agent
       below the action's level 403 `insufficient_access`.
    2. The connection must exist and not be deleted (404), and the action apply
       to it, checked without writing (`_check_preconditions`): 409
       `not_allowed`, or publishing's 400.
    3. Under the connection's row lock: the checks again if the row changed
       meanwhile, and the authorization, held until the commit
       (`_lock_authorization`); then every waiting, unexpired request for the
       same connection and action becomes `replaced`, and the new request is
       inserted, `waiting` for APPROVAL_REQUEST_MINUTES with the draft's version,
       the agent's authorization and name, and the account, in one commit.

    Answers the request with its page's link. Nothing is published or deleted.
    """
    authorization = principal.authorization
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=BROWSER_ONLY)
    needed = ACTION_LEVELS[data.action]
    if not level_allows(authorization.access_level, needed):
        raise insufficient_access(needed)
    form_connection_id = data.form_connection_id
    form_connection = form_connections.find_form_connection(db, form_connection_id)
    _check_preconditions(db, form_connection, data.action)
    checked = (form_connection.published_at, form_connection.draft_version)
    authorization_id = authorization.id
    user_account_id = principal.user.id
    requested_by = _agent_name(db, authorization)

    form_connection = form_connections._lock_form_connection(db, form_connection_id)
    try:
        if (form_connection.published_at, form_connection.draft_version) != checked:
            # Saved or published since the check: check the row as it is now
            _check_preconditions(db, form_connection, data.action)
        _lock_authorization(db, authorization_id, needed)
    except HTTPException:
        db.rollback()
        raise
    now = _now()
    db.execute(
        update(ApprovalRequest)
        .where(
            ApprovalRequest.form_connection_id == form_connection_id,
            ApprovalRequest.action == data.action,
            ApprovalRequest.status == 'waiting',
            ApprovalRequest.expires_at > now,
        )
        .values(status='replaced', decided_at=now)
        .execution_options(synchronize_session=False)
    )
    request = ApprovalRequest(
        id=str(uuid.uuid4()),
        form_connection_id=form_connection_id,
        action=data.action,
        authorization_id=authorization_id,
        requested_by=requested_by,
        user_account_id=user_account_id,
        draft_version=form_connection.draft_version,
        status='waiting',
        expires_at=now + timedelta(minutes=settings.approval_request_minutes),
    )
    db.add(request)
    db.commit()
    logger.info('Approval request %s created', request.id)
    return request_view(request, form_connection, mine=True, now=now)


# Reading a request


def get_request(db: Session, principal: Principal, request_id: str) -> ApprovalPreview:
    """A request with what its page shows, as it reads now (FR-023, FR-024).

    A browser session reads its own account's requests only (403 `not_yours`,
    with nothing of the request); a bearer its own authorization's only (404, as
    for an unknown id; a request whose authorization is gone is no bearer's).
    """
    request = db.get(ApprovalRequest, request_id)
    if request is None:
        raise _not_found()
    authorization = principal.authorization
    if authorization is None:
        if request.user_account_id != principal.user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=NOT_YOURS)
    elif request.authorization_id != authorization.id:
        raise _not_found()
    form_connection = db.get(FormConnection, request.form_connection_id)
    return _preview(
        db,
        request,
        form_connection,
        mine=request.user_account_id == principal.user.id,
        now=_now(),
    )


# Approving and declining (FR-024 to FR-027)


def _detail_of(error: HTTPException, key: str) -> str:
    """A text of an `HTTPException`'s `{error, message, ...}` detail, or ''."""
    detail: object = error.detail
    value = detail.get(key) if isinstance(detail, dict) else None
    return value if isinstance(value, str) else ''


def _record_failure(db: Session, request_id: str, error_id: str | None) -> None:
    """Keep the request waiting with the failed attempt's time and error id."""
    db.rollback()
    request = _lock_request(db, request_id)
    if request is not None:
        request.failed_at = _now()
        request.error_id = error_id
    db.commit()
    logger.info(
        'Approval request %s: the approved action failed (error %s)',
        request_id,
        error_id,
    )


# A service's refusal after the approval's check: the reason it means
_RACE_REASONS: dict[str, str] = {
    'draft_published': 'draft_published',
    'draft_changed': 'draft_changed',
}


def _race_refusal(
    db: Session, request_id: str, form_connection_id: str, refusal: HTTPException
) -> HTTPException:
    """The answer when the service refused what the check let through.

    Only a race with the check does that: the draft was published, saved or
    deleted, or another approval ran, after the locks were released. The request
    is read again and answered as it reads now; if it still reads as waiting, as
    cancelled with the reason the service's refusal means.
    """
    db.rollback()
    request = db.get(ApprovalRequest, request_id)
    if request is None:
        return _not_found()
    form_connection = db.get(FormConnection, form_connection_id)
    state = state_of(request, form_connection, _now())
    if state.status == 'waiting':
        reason = (
            'draft_deleted'
            if refusal.status_code == status.HTTP_404_NOT_FOUND
            else _RACE_REASONS.get(_detail_of(refusal, 'error'), 'draft_changed')
        )
        state = RequestState('cancelled', reason)
    return _not_waiting(request, state)


def approve(
    db: Session, user: UserAccount, request_id: str, upstream_message: str
) -> ApprovalPreview:
    """Run the approved action through the existing service (FR-024, FR-027).

    1. The request's account only (403 `not_yours`).
    2. Under the connection's row lock and the request's: it must read as
       `waiting`, neither expired nor stale nor with its access ended; otherwise
       409 `approval_<status>` with the page's reason, and nothing is done.
    3. The locks are released, and `drafts.publish_stored_draft()` (the draft at
       the request's version, through the `DraftGuard`) or `drafts.delete_draft()`
       (with the request's version, compared under its row lock) runs, with no
       transaction held while EUDIPLO answers.
    4. Success: the request's row is locked again and becomes `done`.

    An `EudiploError` becomes `http_error_for(error, upstream_message)`'s answer,
    whose `error_id` the request keeps with `failed_at`, still waiting: the page
    offers "Try again" while it is valid. A 404 or 409 of the service is a race
    with step 2 and is answered as the request reads then (`_race_refusal`).
    """
    request = _own_request(db, user, request_id)
    form_connection_id = request.form_connection_id
    request, form_connection = _lock_both(db, request_id, form_connection_id)
    state = state_of(request, form_connection, _now())
    if state.status != 'waiting':
        db.rollback()
        raise _not_waiting(request, state)
    action = request.action
    draft_version = request.draft_version
    if action not in DRAFT_ACTIONS or form_connection is None:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=NOT_AVAILABLE_YET
        )
    if draft_version is None:
        # Never for a waiting draft request, which reads as draft_changed then
        db.rollback()
        raise _not_waiting(request, RequestState('cancelled', 'draft_changed'))
    connection_name = form_connection.name

    # Release both locks: the service locks the connection's row itself
    db.rollback()
    try:
        if action == 'publish':
            drafts.publish_stored_draft(db, form_connection_id, draft_version)
        else:
            drafts.delete_draft(db, form_connection_id, draft_version)
    except EudiploError as error:
        failure = http_error_for(error, upstream_message)
        _record_failure(db, request_id, _detail_of(failure, 'error_id') or None)
        raise failure from None
    except HTTPException as refusal:
        if refusal.status_code not in (
            status.HTTP_404_NOT_FOUND,
            status.HTTP_409_CONFLICT,
        ):
            raise
        raise _race_refusal(db, request_id, form_connection_id, refusal) from None

    db.rollback()
    now = _now()
    done = _lock_request(db, request_id)
    if done is None:
        db.rollback()
        raise _not_found()
    # The action ran on this approval, even if the agent's access was revoked
    # or a newer request made meanwhile
    done.status = 'done'
    done.cancel_reason = None
    done.decided_at = now
    db.commit()
    logger.info('Approval request %s approved', request_id)
    return _preview(
        db,
        done,
        db.get(FormConnection, form_connection_id),
        mine=True,
        now=now,
        connection_name=connection_name,
    )


def decline(db: Session, user: UserAccount, request_id: str) -> ApprovalPreview:
    """Decline a request: it becomes `declined`, and nothing else changes.

    The same rules as approving: the request's account only (403 `not_yours`),
    and under the row locks it must read as `waiting` (409 `approval_<status>`).
    """
    request = _own_request(db, user, request_id)
    request, form_connection = _lock_both(db, request_id, request.form_connection_id)
    now = _now()
    state = state_of(request, form_connection, now)
    if state.status != 'waiting':
        db.rollback()
        raise _not_waiting(request, state)
    request.status = 'declined'
    request.decided_at = now
    db.commit()
    logger.info('Approval request %s declined', request_id)
    return _preview(db, request, form_connection, mine=True, now=now)
