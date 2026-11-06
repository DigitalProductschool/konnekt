"""Approval requests: an agent asks, a team member approves (spec 007, research R12).

data-model.md section 5. For now only `cancel_for`, which the user page runs when
it lowers or revokes an agent's access (research R7). Nothing here logs more than
ids and counts.
"""

import logging
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import update
from sqlalchemy.orm import Session

from ..models import ApprovalRequest
from ..schemas import AccessLevel, ApprovalAction
from .auth import level_allows

logger = logging.getLogger(__name__)

# The access level each action needs (data-model.md sections 3.1 and 5.3)
ACTION_LEVELS: dict[ApprovalAction, AccessLevel] = {
    'publish': 'drafts',
    'delete_draft': 'drafts',
    'deactivate': 'manage',
    'reactivate': 'manage',
    'delete': 'manage',
}

# The reasons stored with a cancellation; the others are computed at every read
CancelReason = Literal['revoked', 'access_changed']


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
