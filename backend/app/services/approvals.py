"""Approval requests: an agent asks, a team member approves (spec 007, research R12).

data-model.md section 5. An agent with the action's access level asks for an action
on a connection (`create_request`): `publish` or `delete_draft` of a draft (level
`drafts`), `deactivate`, `reactivate`, `delete` or `set_start_date` of a published
connection (level `manage`). The action's preconditions are checked without
writing, and the request remembers what it was made for: the draft's version, or
the connection's status, its `is_active` and its `start_date` (`was_active`,
`was_start_date`; spec 010, research R9). `publish` and `reactivate` may name a
start date, and `set_start_date` names the new one or none for now: a day after
today in Germany, checked when the request is made and again, as the computed
reason `start_date_passed`, at every read and at approval (FR-065). The team
member it was made for opens its page
(`get_request`) and approves or declines it there, in their browser session.
Expiry, staleness and an ended access are computed at every read and again under
the row locks at approval (section 5.2), so nothing that changes a connection or
an authorization needs to know about approvals. Deleting is the exception (spec
010, research R5): a deletion can be restored, so it stores `cancelled` on the
connection's waiting requests (`cancel_for_deletion`), which a restore leaves
cancelled; a draft marked deleted reads as gone, as when its row was removed
(`_as_read`). Approving runs the existing services with the locks released, so
that no transaction is held while EUDIPLO answers, and each service compares what
the request was made for again under its own row lock; a failure keeps the request
waiting, with its error id, for "Try again" (FR-027). `cancel_for` is what the user
page runs when it lowers or revokes an agent's access (research R7). Nothing here
logs more than ids and counts.
"""

import logging
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Literal, cast

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..config import settings
from ..language import Text, resolve_text
from ..models import (
    AgentAuthorization,
    ApprovalRequest,
    FormConnection,
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
from . import drafts, form_connections, start_dates
from .activity import Actor
from .activity import agent_name as _agent_name
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

# The access level each action needs (data-model.md sections 3.1 and 5.3; spec 010,
# research R9: set_start_date)
ACTION_LEVELS: dict[ApprovalAction, AccessLevel] = {
    'publish': 'drafts',
    'delete_draft': 'drafts',
    'deactivate': 'manage',
    'reactivate': 'manage',
    'delete': 'manage',
    'set_start_date': 'manage',
}
# The actions on a draft, whose requests remember the draft's version
DRAFT_ACTIONS: frozenset[str] = frozenset({'publish', 'delete_draft'})
# The actions on a published connection, whose requests remember its status
# (`was_active`, `was_start_date`)
STATUS_ACTIONS: frozenset[str] = frozenset(ACTION_LEVELS) - DRAFT_ACTIONS

# The reasons stored with a cancellation by the user page; the deletion stores
# its own two (`DeletionReason`), and the others are computed at every read
CancelReason = Literal['revoked', 'access_changed']
# The reasons a deletion stores (spec 010, research R5, data-model 7), which
# `_stale_reason()` would compute for a deleted row
DeletionReason = Literal['connection_deleted', 'draft_deleted']

NOT_FOUND = {
    'error': 'Not found',
    'message': Text(
        en='Approval request not found', de='Freigabeanfrage nicht gefunden'
    ),
}
NOT_YOURS = {
    'error': 'not_yours',
    'message': Text(
        en='This request was made for another team member.',
        de='Diese Anfrage wurde für ein anderes Teammitglied gestellt.',
    ),
}
PUBLISHED_ALREADY = {
    'error': 'not_allowed',
    'message': Text(
        en='This connection is published already.',
        de='Diese Anbindung ist bereits veröffentlicht.',
    ),
}
# deactivate, reactivate and delete need a published connection, deactivate a live
# one and reactivate a deactivated one (data-model.md section 5.3)
IS_A_DRAFT = {
    'error': 'not_allowed',
    'message': Text(
        en='This connection is a draft: it has nothing live yet.',
        de='Diese Anbindung ist ein Entwurf: Von ihr ist noch nichts aktiv.',
    ),
}
ALREADY_DEACTIVATED = {
    'error': 'not_allowed',
    'message': Text(
        en='This connection is already deactivated.',
        de='Diese Anbindung ist bereits deaktiviert.',
    ),
}
ALREADY_LIVE = {
    'error': 'not_allowed',
    'message': Text(
        en='This connection is already live.',
        de='Diese Anbindung ist bereits aktiv.',
    ),
}
# A scheduled connection's start date is changed, not reactivated; a deactivated
# one is reactivated, not given a start date (spec 010, data-model 7;
# contracts/copy.md section 8)
IS_SCHEDULED = {
    'error': 'not_allowed',
    'message': Text(
        en='This connection is scheduled. Change its start date instead.',
        de='Diese Anbindung ist geplant. Ändern Sie stattdessen das Startdatum.',
    ),
}
IS_DEACTIVATED = {
    'error': 'not_allowed',
    'message': Text(
        en='This connection is deactivated. Reactivate it instead.',
        de='Diese Anbindung ist deaktiviert. Reaktivieren Sie sie stattdessen.',
    ),
}
ALREADY_SCHEDULED_FOR = {
    'error': 'not_allowed',
    'message': Text(
        en='This connection is already scheduled for that date.',
        de='Diese Anbindung ist bereits für dieses Datum geplant.',
    ),
}

# The answers' messages when an approved action ran, and when declined
# (contracts/management-api.md "Approval requests"): `ApiResponse.message`, which
# stays English (spec 009, R6)
APPROVED_MESSAGES: dict[str, str] = {
    'publish': 'Published',
    'delete_draft': 'Draft deleted',
    'deactivate': 'Connection deactivated',
    'reactivate': 'Connection reactivated',
    'delete': 'Connection deleted',
    'set_start_date': 'Start date saved',
}
DECLINED_MESSAGE = 'Declined'

# The approval page's sentence for each state that isn't waiting
# (contracts/ui-screens.md S3 "Outcome states"): the message of a 409
# approval_<status>, in both languages (spec 009, glossary "approval request")
_DONE_TEXTS_DE: dict[str, str] = {
    'publish': 'Veröffentlicht.',
    'delete_draft': 'Entwurf gelöscht.',
    'deactivate': 'Anbindung deaktiviert.',
    'reactivate': 'Anbindung reaktiviert.',
    'delete': 'Anbindung gelöscht.',
    'set_start_date': 'Startdatum gespeichert.',
}
DONE_TEXTS: dict[str, Text] = {
    action: Text(en=f'{message}.', de=_DONE_TEXTS_DE[action])
    for action, message in APPROVED_MESSAGES.items()
}
# A done publish or reactivate with a start date (spec 010, contracts/copy.md
# section 7): the date as the pages write it, DD.MM.YYYY
DONE_ON_A_DATE_TEXTS: dict[str, Text] = {
    'publish': Text(
        en='Published and scheduled for {date}.',
        de='Veröffentlicht und für den {date} geplant.',
    ),
    'reactivate': Text(
        en='Connection scheduled for {date}.', de='Anbindung für den {date} geplant.'
    ),
}
DONE_TEXT = Text(en='Done.', de='Erledigt.')
DECLINED_TEXT = Text(
    en='You declined this request. Nothing has changed.',
    de='Sie haben diese Anfrage abgelehnt. Es wurde nichts geändert.',
)
EXPIRED_TEXT = Text(
    en='This request expired at {time}. Nothing has changed. The agent can ask again.',
    de=(
        'Diese Anfrage ist um {time} Uhr abgelaufen. Es wurde nichts geändert. Der '
        'Agent kann erneut fragen.'
    ),
)
REPLACED_TEXT = Text(
    en='The agent made a newer request for this action.',
    de='Der Agent hat für diese Aktion eine neuere Anfrage gestellt.',
)
CANCELLED_TEXTS: dict[str, Text] = {
    'draft_changed': Text(
        en=(
            'The draft has changed since the agent asked. Nothing has changed; the '
            'agent has to ask again.'
        ),
        de=(
            'Der Entwurf wurde geändert, seit der Agent gefragt hat. Es wurde nichts '
            'geändert; der Agent muss erneut fragen.'
        ),
    ),
    'draft_published': Text(
        en='The draft has been published since the agent asked.',
        de='Der Entwurf wurde veröffentlicht, seit der Agent gefragt hat.',
    ),
    'draft_deleted': Text(
        en='The draft has been deleted since the agent asked.',
        de='Der Entwurf wurde gelöscht, seit der Agent gefragt hat.',
    ),
    'connection_deleted': Text(
        en='The connection has been deleted in the meantime.',
        de='Die Anbindung wurde in der Zwischenzeit gelöscht.',
    ),
    'access_changed': Text(
        en="The agent's access has changed, so this request was cancelled.",
        de=(
            'Der Zugriff des Agenten wurde geändert, daher wurde diese Anfrage '
            'abgebrochen.'
        ),
    ),
    'revoked': Text(
        en="The agent's access was revoked, so this request was cancelled.",
        de=(
            'Der Zugriff des Agenten wurde widerrufen, daher wurde diese Anfrage '
            'abgebrochen.'
        ),
    ),
    'access_ended': Text(
        en="The agent's access has ended, so this request was cancelled.",
        de=(
            'Der Zugriff des Agenten ist abgelaufen, daher wurde diese Anfrage '
            'abgebrochen.'
        ),
    ),
    # Spec 010, FR-065, contracts/copy.md section 7
    'start_date_passed': Text(
        en=(
            'The start date is no longer after today. The agent can ask again with '
            'a new date.'
        ),
        de=(
            'Das Startdatum liegt nicht mehr nach dem heutigen Tag. Der Agent kann '
            'mit einem neuen Datum erneut fragen.'
        ),
    ),
}
CANCELLED_TEXT = Text(
    en='This request was cancelled.', de='Diese Anfrage wurde abgebrochen.'
)
# connection_changed names the change, by the connection's state now
# (`_connection_change`): a request made while the connection was live finds it
# deactivated, one made while it was deactivated finds it reactivated
CONNECTION_CHANGED_TEXT = Text(
    en='The connection was {change} in the meantime.',
    de='Die Anbindung wurde in der Zwischenzeit {change}.',
)
CONNECTION_CHANGES: dict[bool, Text] = {
    True: Text(en='deactivated', de='deaktiviert'),
    False: Text(en='reactivated', de='reaktiviert'),
}
# Spec 010, FR-066, contracts/copy.md section 7: a connection that is live now,
# for a request other than reactivate (made while it was scheduled), and one that
# is scheduled now (its start date moved or came)
BECAME_ACTIVE_TEXT = Text(
    en='The connection became active in the meantime.',
    de='Die Anbindung ist in der Zwischenzeit aktiv geworden.',
)
START_DATE_CHANGED_TEXT = Text(
    en="The connection's start date changed in the meantime.",
    de='Das Startdatum der Anbindung wurde in der Zwischenzeit geändert.',
)


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


def cancel_for_deletion(db: Session, form_connection: FormConnection) -> int:
    """Store the cancellation of a deleted connection's waiting requests; count them.

    Spec 010, research R5, data-model 3 and 7 (FR-035): the deletion runs this
    under the connection's row lock, in its own transaction, so that a restore
    doesn't bring the requests back. A draft's requests (`publish`,
    `delete_draft`) become `cancelled` with `draft_deleted`, a published
    connection's (`deactivate`, `reactivate`, `delete`) with
    `connection_deleted`, each with `decided_at`: the reason `_stale_reason()`
    computes for the deleted row, so each reads as it read after a deletion
    before. A request that reads otherwise already is left as it is: past its
    expiry (`expired`), without its authorization (`access_ended`), or a draft's
    request on the connection the draft became (`draft_published`). The caller
    commits, together with the deletion.
    """
    draft = form_connection.published_at is None
    reason: DeletionReason = 'draft_deleted' if draft else 'connection_deleted'
    now = _now()
    cancelled = db.scalars(
        update(ApprovalRequest)
        .where(
            ApprovalRequest.form_connection_id == form_connection.id,
            ApprovalRequest.status == 'waiting',
            ApprovalRequest.expires_at > now,
            ApprovalRequest.authorization_id.is_not(None),
            ApprovalRequest.action.in_(DRAFT_ACTIONS if draft else STATUS_ACTIONS),
        )
        .values(status='cancelled', cancel_reason=reason, decided_at=now)
        .returning(ApprovalRequest.id)
        .execution_options(synchronize_session=False)
    ).all()
    return len(cancelled)


# The status a request reads as (data-model.md section 5.2)


@dataclass(frozen=True)
class RequestState:
    """What a request reads as now: its status and, when cancelled, the reason."""

    status: ApprovalStatus
    cancel_reason: str | None = None


def _start_date_passed(request: ApprovalRequest) -> bool:
    """Whether the start date the request asks for is no longer after today.

    Today in Germany (`start_dates.today_in_germany()`), as `clean_start_date()`
    judges a date when the request is made (spec 010, FR-065). A request without
    a start date never passes it.
    """
    return (
        request.start_date is not None
        and request.start_date <= start_dates.today_in_germany()
    )


def _stale_reason(
    request: ApprovalRequest, form_connection: FormConnection | None
) -> str | None:
    """Why a waiting request no longer applies to its connection, or None.

    For `publish` and `delete_draft`: the row is gone or marked deleted
    (`draft_deleted`; spec 010, research R5: a deleted draft's row stays until the
    restore time has passed), published (`draft_published`) or at another draft
    version (`draft_changed`). For `deactivate`, `reactivate`, `delete` and
    `set_start_date`: the connection is deleted (`connection_deleted`), or its
    status is no longer the one the request was made for: its `is_active` is not
    the request's `was_active`, or its `start_date` not the request's
    `was_start_date`, because it was deactivated, reactivated, scheduled, became
    active or its start date moved (`connection_changed`; spec 010, FR-066).
    Then, for every action, the start date the request asks for is no longer
    after today in Germany (`start_date_passed`; spec 010, FR-065): the day it
    names has come while the request waited. A change of a published
    connection's content (a new revision or rule set) doesn't matter (spec,
    edge cases).
    """
    if request.action in DRAFT_ACTIONS:
        if form_connection is None:
            return 'draft_deleted'
        if form_connection.published_at is not None:
            return 'draft_published'
        if form_connection.deleted_at is not None:
            return 'draft_deleted'
        if (
            request.draft_version is None
            or form_connection.draft_version != request.draft_version
        ):
            return 'draft_changed'
    else:
        # A published connection's row stays when it is deleted, and never
        # becomes a draft again
        if form_connection is None or form_connection.deleted_at is not None:
            return 'connection_deleted'
        if (
            form_connection.published_at is None
            or request.was_active is None
            or form_connection.is_active != request.was_active
            or form_connection.start_date != request.was_start_date
        ):
            return 'connection_changed'
    if _start_date_passed(request):
        return 'start_date_passed'
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


def _formatted(text: Text, **values: str) -> Text:
    return Text(en=text.en.format(**values), de=text.de.format(**values))


def _done_text(request: ApprovalRequest) -> Text:
    """A done request's sentence: with the date for a publish or reactivate on one.

    The date is the one the request asked for, as the pages write a day,
    DD.MM.YYYY (spec 010, contracts/copy.md section 7).
    """
    on_a_date = DONE_ON_A_DATE_TEXTS.get(request.action)
    if on_a_date is not None and request.start_date is not None:
        return _formatted(on_a_date, date=f'{request.start_date:%d.%m.%Y}')
    return DONE_TEXTS.get(request.action, DONE_TEXT)


def _connection_change(
    request: ApprovalRequest, form_connection: FormConnection | None
) -> Text:
    """How the connection moved on, for `connection_changed` (spec 010, FR-066).

    By the state it has now (`form_connections.state_of()`), which the approval
    page reads from the preview's connection too: deactivated; scheduled (its
    start date moved, or it got one), "The connection's start date changed in
    the meantime."; live, reactivated for a `reactivate` request, which is made
    for a deactivated connection, and "The connection became active in the
    meantime." for the others. Without a published connection to read, the
    change is told from the request's `was_active`, as before.
    """
    state = (
        form_connections.state_of(form_connection)
        if form_connection is not None and form_connection.published_at is not None
        else None
    )
    if state == 'scheduled':
        return START_DATE_CHANGED_TEXT
    if state == 'live' and request.action != 'reactivate':
        return BECAME_ACTIVE_TEXT
    if state == 'live':
        change = CONNECTION_CHANGES[False]
    elif state == 'deactivated':
        change = CONNECTION_CHANGES[True]
    else:
        change = CONNECTION_CHANGES[bool(request.was_active)]
    return Text(
        en=CONNECTION_CHANGED_TEXT.en.format(change=change.en),
        de=CONNECTION_CHANGED_TEXT.de.format(change=change.de),
    )


def state_text(
    request: ApprovalRequest,
    state: RequestState,
    form_connection: FormConnection | None = None,
) -> Text:
    """The approval page's sentence for a state that isn't waiting.

    In both languages: only the 409's message carries it, which the exception
    handler answers in the request's language; it is never stored.
    `form_connection` is the request's connection as it is now, which
    `connection_changed` words its change by (`_connection_change`).
    """
    if state.status == 'done':
        return _done_text(request)
    if state.status == 'declined':
        return DECLINED_TEXT
    if state.status == 'expired':
        time = f'{request.expires_at.astimezone(GERMANY):%H:%M}'
        return _formatted(EXPIRED_TEXT, time=time)
    if state.status == 'replaced':
        return REPLACED_TEXT
    if state.cancel_reason == 'connection_changed':
        return _connection_change(request, form_connection)
    return CANCELLED_TEXTS.get(state.cancel_reason or '', CANCELLED_TEXT)


def _not_waiting(
    request: ApprovalRequest,
    state: RequestState,
    form_connection: FormConnection | None,
) -> HTTPException:
    """The 409 for approving or declining a request that isn't waiting."""
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            'error': f'approval_{state.status}',
            'message': state_text(request, state, form_connection),
        },
    )


# Views


def _iso_or_none(value: datetime | None) -> str | None:
    return to_iso_utc(value) if value is not None else None


def _day_or_none(value: date | None) -> str | None:
    """A start date as written, `YYYY-MM-DD`, with no time zone (FR-020)."""
    return value.isoformat() if value is not None else None


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
    once the draft is deleted. `start_date` is the date the agent asked for
    (spec 010, research R9).
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
        start_date=_day_or_none(request.start_date),
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
    """A request with what it acts on, as the connection is now.

    `publish` and `delete_draft`: the stored draft while it is one, and, once a
    publish is done and the connection isn't deleted, the connection with its
    URLs, so that its own `state` and `start_date` tell whether it is live or
    scheduled for a day (spec 010, research R9, FR-065). `deactivate`,
    `reactivate`, `delete` and `set_start_date`: the connection and its URLs
    while it is published and not deleted, in every status (after a done
    reactivate, the URLs that work again, or work from its start date); neither
    once it is deleted. The draft and the connection come from
    `drafts.draft_view()` and `form_connections.get_form_connection()`, so their
    documents are in the stored order (spec 010, research R6, FR-050).
    """
    view = request_view(
        request,
        form_connection,
        mine=mine,
        now=now,
        connection_name=connection_name,
    )
    draft = None
    connection = None
    urls = None
    if form_connection is None:
        pass
    elif request.action in DRAFT_ACTIONS:
        if form_connection.published_at is None:
            draft = drafts.draft_view(db, form_connection)
        elif (
            request.action == 'publish'
            and view.status == 'done'
            and form_connection.deleted_at is None
        ):
            connection = form_connections.get_form_connection(db, form_connection.id)
            urls = _urls_of(connection)
    elif (
        form_connection.published_at is not None and form_connection.deleted_at is None
    ):
        connection = form_connections.get_form_connection(db, form_connection.id)
        urls = _urls_of(connection)
    return ApprovalPreview(request=view, draft=draft, connection=connection, urls=urls)


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


def _as_read(form_connection: FormConnection | None) -> FormConnection | None:
    """A connection's row as the requests read it: None for a deleted draft.

    A draft's row now stays marked deleted until the restore time has passed
    (spec 010, research R5); its requests and their page read it as gone, as when
    deleting a draft removed its row: no draft to show and no name. A deleted
    published connection's row is read as it is, as before.
    """
    if (
        form_connection is not None
        and form_connection.published_at is None
        and form_connection.deleted_at is not None
    ):
        return None
    return form_connection


def _read_connection(db: Session, form_connection_id: str) -> FormConnection | None:
    """A connection's row as the requests read it (`_as_read`), without a lock."""
    return _as_read(db.get(FormConnection, form_connection_id))


def _lock_connection(db: Session, form_connection_id: str) -> FormConnection | None:
    """Lock a connection's row and read it again; None once a draft is deleted.

    A deleted draft's row stays locked, and reads as None (`_as_read`).
    """
    return _as_read(
        db.scalars(
            select(FormConnection)
            .where(FormConnection.id == form_connection_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        ).one_or_none()
    )


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


def _check_preconditions(
    db: Session,
    form_connection: FormConnection,
    action: ApprovalAction,
    start_date: date | None,
) -> None:
    """Refuse an action that doesn't apply to the connection, writing nothing.

    A deleted connection answers 404, as the callers' reads do. `publish` and
    `delete_draft` need a draft (409 `not_allowed` for a published connection),
    and `publish` one that publishing accepts as stored
    (`drafts.check_publishable()`, whose 400 passes through; FR-022).
    `deactivate`, `reactivate`, `delete` and `set_start_date` need a published
    connection (409 `not_allowed`: a draft has nothing live yet), and then, by
    its state (`form_connections.state_of()`; spec 010, data-model 7), 409
    `not_allowed` with the reason (contracts/copy.md section 8):
    - `deactivate`: live or scheduled, not deactivated;
    - `reactivate`, with or without `start_date`: deactivated, not live, and not
      scheduled, whose start date is changed instead;
    - `set_start_date`: scheduled, to another date than its own or to now
      (`start_date` None), or live, to a date; not deactivated (it is
      reactivated instead), not live to now (it is live already);
    - `delete`: every published state.
    `start_date` itself (a day after today) is the caller's to check.
    """
    if form_connection.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=form_connections.NOT_FOUND
        )
    if action in DRAFT_ACTIONS:
        if form_connection.published_at is not None:
            raise _not_allowed(PUBLISHED_ALREADY)
        if action == 'publish':
            drafts.check_publishable(db, form_connection)
        return
    if form_connection.published_at is None:
        raise _not_allowed(IS_A_DRAFT)
    state = form_connections.state_of(form_connection)
    if action == 'deactivate' and state == 'deactivated':
        raise _not_allowed(ALREADY_DEACTIVATED)
    if action == 'reactivate':
        if state == 'live':
            raise _not_allowed(ALREADY_LIVE)
        if state == 'scheduled':
            raise _not_allowed(IS_SCHEDULED)
    if action == 'set_start_date':
        if state == 'deactivated':
            raise _not_allowed(IS_DEACTIVATED)
        if state == 'live' and start_date is None:
            raise _not_allowed(ALREADY_LIVE)
        if state == 'scheduled' and start_date == form_connection.start_date:
            raise _not_allowed(ALREADY_SCHEDULED_FOR)


def _not_allowed(detail: dict[str, object]) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _checked(form_connection: FormConnection) -> tuple[object, ...]:
    """What the preconditions read of a connection's row, to tell a change."""
    return (
        form_connection.published_at,
        form_connection.draft_version,
        form_connection.is_active,
        form_connection.start_date,
    )


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
    2. The start date, if any (`publish`, `reactivate`, `set_start_date`; the
       body refuses one for the other actions), must be a day after today in
       Germany: 400 `invalid_start_date` otherwise (`check_start_date()`; spec
       010, FR-065).
    3. The connection must exist and not be deleted (404), and the action apply
       to it, checked without writing (`_check_preconditions`): 409
       `not_allowed`, or publishing's 400.
    4. Under the connection's row lock (404 once deleted): the checks again if
       the row changed meanwhile (saved, published, deactivated, reactivated,
       scheduled, activated or its start date moved), the start date again (the
       day may have ended since step 2), and the authorization, held until the
       commit (`_lock_authorization`); then every waiting, unexpired request for
       the same connection and action becomes `replaced`, and the new request is
       inserted, `waiting` for APPROVAL_REQUEST_MINUTES with the start date asked
       for and what it is made for as read under the lock (the draft's version
       for `publish` and `delete_draft`; the connection's `is_active` and
       `start_date` as `was_active` and `was_start_date` for the other actions),
       the agent's authorization and name, and the account, in one commit.

    A refusal makes no request. Answers the request with its page's link.
    Nothing is published, deactivated, reactivated, scheduled or deleted.
    """
    authorization = principal.authorization
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=BROWSER_ONLY)
    needed = ACTION_LEVELS[data.action]
    if not level_allows(authorization.access_level, needed):
        raise insufficient_access(needed)
    start_date = data.start_date
    form_connections.check_start_date(start_date)
    form_connection_id = data.form_connection_id
    form_connection = form_connections.find_form_connection(db, form_connection_id)
    _check_preconditions(db, form_connection, data.action, start_date)
    checked = _checked(form_connection)
    authorization_id = authorization.id
    user_account_id = principal.user.id
    requested_by = _agent_name(db, authorization)

    form_connection = form_connections._lock_form_connection(db, form_connection_id)
    try:
        if _checked(form_connection) != checked:
            # Changed since the check: check the row as it is now
            _check_preconditions(db, form_connection, data.action, start_date)
        # Again under the lock: the day may have ended since the first check
        form_connections.check_start_date(start_date)
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
    on_draft = data.action in DRAFT_ACTIONS
    request = ApprovalRequest(
        id=str(uuid.uuid4()),
        form_connection_id=form_connection_id,
        action=data.action,
        authorization_id=authorization_id,
        requested_by=requested_by,
        user_account_id=user_account_id,
        draft_version=form_connection.draft_version if on_draft else None,
        was_active=None if on_draft else form_connection.is_active,
        was_start_date=None if on_draft else form_connection.start_date,
        start_date=start_date,
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
    form_connection = _read_connection(db, request.form_connection_id)
    return _preview(
        db,
        request,
        form_connection,
        mine=request.user_account_id == principal.user.id,
        now=_now(),
    )


# Approving and declining (FR-024 to FR-027)


def _detail_of(error: HTTPException, key: str) -> str:
    """A text of an `HTTPException`'s `{error, message, ...}` detail, or ''.

    A `Text` (a message) is resolved in the request's language, so that it is
    never dropped (spec 009, V3).
    """
    detail: object = error.detail
    value = detail.get(key) if isinstance(detail, dict) else None
    if isinstance(value, Text):
        return resolve_text(value)
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


# A draft service's 409 after the approval's check: the reason it means
_DRAFT_RACE_REASONS: dict[str, str] = {
    'draft_published': 'draft_published',
    'draft_changed': 'draft_changed',
}


def _is_race(refusal: HTTPException) -> bool:
    """Whether a service's refusal is a race with the approval's check.

    A 404 or 409 (the row moved on), or a 400 `invalid_start_date`: the day the
    request asks for came between the approval's check and the service's own
    (spec 010, FR-065).
    """
    if refusal.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_409_CONFLICT):
        return True
    return (
        refusal.status_code == status.HTTP_400_BAD_REQUEST
        and _detail_of(refusal, 'error') == 'invalid_start_date'
    )


def _race_reason(action: str, refusal: HTTPException) -> str:
    """The stale reason a service's refusal after the approval's check means.

    A 400 `invalid_start_date`: the start date is no longer after today
    (`start_date_passed`). For `publish` and `delete_draft`: the draft was
    deleted (404), published or saved (409). For the other actions: the
    connection was deleted (404), or its status moved (409 `status_changed`:
    deactivated, reactivated, scheduled, became active, or its start date
    moved; `not_published` can't happen, since a published connection never
    becomes a draft again).
    """
    if refusal.status_code == status.HTTP_400_BAD_REQUEST:
        return 'start_date_passed'
    if action in DRAFT_ACTIONS:
        if refusal.status_code == status.HTTP_404_NOT_FOUND:
            return 'draft_deleted'
        return _DRAFT_RACE_REASONS.get(_detail_of(refusal, 'error'), 'draft_changed')
    if refusal.status_code == status.HTTP_404_NOT_FOUND:
        return 'connection_deleted'
    return 'connection_changed'


def _race_refusal(
    db: Session, request_id: str, form_connection_id: str, refusal: HTTPException
) -> HTTPException:
    """The answer when the service refused what the check let through.

    Only a race with the check does that: the draft was published, saved or
    deleted, the connection's status moved or it was deleted, the day the
    request asks for came, or another approval ran, after the locks were
    released. The request is read again and answered as it reads now; if it
    still reads as waiting, as cancelled with the reason the service's refusal
    means for its action (`_race_reason`).
    """
    db.rollback()
    request = db.get(ApprovalRequest, request_id)
    if request is None:
        return _not_found()
    form_connection = _read_connection(db, form_connection_id)
    state = state_of(request, form_connection, _now())
    if state.status == 'waiting':
        state = RequestState('cancelled', _race_reason(request.action, refusal))
    return _not_waiting(request, state, form_connection)


def _service_call(
    request: ApprovalRequest, actor: Actor
) -> Callable[[Session], object] | None:
    """What approving `request` runs: its action's service, given what the request
    was made for, which the service compares again under its own row lock.

    `drafts.publish_stored_draft()` (the draft at the request's version, through
    the `DraftGuard`, with the start date asked for) or `drafts.delete_draft()`
    (with the request's version); `form_connections.deactivate_form_connection()`,
    `activate_form_connection()` (with the start date asked for),
    `set_start_date()` (with the new date, or None for now) or
    `delete_form_connection()`, each with the status the request was made for as
    `expected` (`StatusSnapshot` of `was_active` and `was_start_date`; 409
    `status_changed` if it moved; spec 010, research R9). A start date is
    checked again by the service, before and under its row lock (400
    `invalid_start_date`). Each with `actor`, the team member who approves with
    the agent that asked (spec 010, research R4). The deletions get no deletion
    id and no deleting account: they answer `Deletion` with `id` null, and
    nothing can restore them (spec 010, FR-067). None when the request lacks its
    snapshot, which a waiting request never does: it reads as stale.
    """
    form_connection_id = request.form_connection_id
    action = request.action
    start_date = request.start_date
    if action in DRAFT_ACTIONS:
        version = request.draft_version
        if version is None:
            return None
        if action == 'publish':
            return lambda db: drafts.publish_stored_draft(
                db, form_connection_id, version, actor=actor, start_date=start_date
            )
        return lambda db: drafts.delete_draft(
            db, form_connection_id, version, actor=actor
        )
    was_active = request.was_active
    if was_active is None:
        return None
    expected = form_connections.StatusSnapshot(
        was_active=was_active, was_start_date=request.was_start_date
    )
    if action == 'deactivate':
        return lambda db: form_connections.deactivate_form_connection(
            db, form_connection_id, actor=actor, expected=expected
        )
    if action == 'reactivate':
        return lambda db: form_connections.activate_form_connection(
            db,
            form_connection_id,
            actor=actor,
            expected=expected,
            start_date=start_date,
        )
    if action == 'set_start_date':
        return lambda db: form_connections.set_start_date(
            db, form_connection_id, start_date, actor=actor, expected=expected
        )
    if action == 'delete':
        return lambda db: form_connections.delete_form_connection(
            db, form_connection_id, actor=actor, expected=expected
        )
    return None


def approve(
    db: Session, user: UserAccount, request_id: str, upstream_message: str | Text
) -> ApprovalPreview:
    """Run the approved action through the existing service (FR-024, FR-027).

    1. The request's account only (403 `not_yours`).
    2. Under the connection's row lock and the request's: it must read as
       `waiting`, neither expired nor stale nor with its access ended, and its
       start date, if any, still after today in Germany (`start_date_passed`);
       otherwise 409 `approval_<status>` with the page's reason, and nothing is
       done.
    3. The locks are released, and the action's service runs (`_service_call`):
       publishing or deleting the draft at the request's version, publishing on
       the date asked for, or deactivating, reactivating (now or on the date),
       changing the start date or deleting the connection if its status is
       still the one the request was made for (`was_active`, `was_start_date`),
       each compared again under the service's own row lock, with no
       transaction held while EUDIPLO answers. Only publishing calls EUDIPLO.
       Its actor is `user`, who approved the request of the agent
       `requested_by`, and the service records its activity with them, as the
       same action in the browser does (spec 010, FR-027, FR-067).
    4. Success: the request's row is locked again and becomes `done`.

    An `EudiploError` becomes `http_error_for(error, upstream_message)`'s answer,
    whose `error_id` the request keeps with `failed_at`, still waiting: the page
    offers "Try again" while it is valid. A 404 or 409 of the service, or its 400
    `invalid_start_date` when the day came meanwhile, is a race with step 2 and
    is answered as the request reads then (`_race_refusal`): 409
    `approval_cancelled`, with nothing changed.
    """
    request = _own_request(db, user, request_id)
    form_connection_id = request.form_connection_id
    request, form_connection = _lock_both(db, request_id, form_connection_id)
    state = state_of(request, form_connection, _now())
    if state.status != 'waiting':
        # Worded from the rows as read under the locks
        refusal = _not_waiting(request, state, form_connection)
        db.rollback()
        raise refusal
    # Read before the rollback below expires the rows: the approving team member,
    # and the agent's name the request was made with
    actor = Actor(name=user.username, agent=request.requested_by, approved=True)
    run = _service_call(request, actor)
    if form_connection is None or run is None:
        # Never for a waiting request, which reads as stale then
        reason = _stale_reason(request, form_connection)
        refusal = _not_waiting(
            request, RequestState('cancelled', reason), form_connection
        )
        db.rollback()
        raise refusal
    connection_name = form_connection.name

    # Release both locks: the service locks the connection's row itself
    db.rollback()
    try:
        run(db)
    except EudiploError as error:
        failure = http_error_for(error, upstream_message)
        _record_failure(db, request_id, _detail_of(failure, 'error_id') or None)
        raise failure from None
    except HTTPException as refusal:
        if not _is_race(refusal):
            raise
        raise _race_refusal(db, request_id, form_connection_id, refusal) from None

    db.rollback()
    now = _now()
    done = _lock_request(db, request_id)
    if done is None:
        db.rollback()
        raise _not_found()
    # The action ran on this approval, even if the agent's access was revoked
    # or a newer request made meanwhile, and an approved deletion stored
    # `cancelled` on this request too (`cancel_for_deletion`)
    done.status = 'done'
    done.cancel_reason = None
    done.decided_at = now
    db.commit()
    logger.info('Approval request %s approved', request_id)
    return _preview(
        db,
        done,
        _read_connection(db, form_connection_id),
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
        refusal = _not_waiting(request, state, form_connection)
        db.rollback()
        raise refusal
    request.status = 'declined'
    request.decided_at = now
    db.commit()
    logger.info('Approval request %s declined', request_id)
    return _preview(db, request, form_connection, mine=True, now=now)
