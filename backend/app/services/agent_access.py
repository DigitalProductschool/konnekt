"""The user page: a team member's agent connections and personal access tokens.

Spec 007, research R6 and R7, contracts/management-api.md "Agent access". Every
function sees the signed-in account's rows only; another account's row answers
404, as an unknown one does. A changed level applies from the agent's next call,
since the bearer principal reads it at every call; lowering or revoking cancels the
waiting approval requests the agent may no longer make. A personal access token's
secret is answered once and stored only as its SHA-256. The draft limit (research
R17) counts an agent's new drafts in a fixed window of an hour. Nothing here logs
more than ids.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..language import Text
from ..models import AgentAuthorization, AgentToken, OauthClient, UserAccount
from ..schemas import (
    AccessLevel,
    AgentAccessItem,
    AgentAccessList,
    AgentMe,
    TokenCreate,
    TokenCreated,
    to_iso_utc,
)
from . import approvals
from .auth import UNAUTHORIZED, Principal, access_levels_view
from .evaluation import GERMANY
from .oauth import new_secret, token_hash

logger = logging.getLogger(__name__)

PERSONAL_TOKEN_PREFIX = 'cp_pat_'
TOKEN_NAME_MAX_LENGTH = 100

NOT_FOUND = {
    'error': 'Not found',
    'message': Text(en='Agent access not found', de='Agentenzugriff nicht gefunden'),
}
BEARER_ONLY = {
    'error': 'bearer_only',
    'message': Text(
        en='This endpoint is for agents.', de='Dieser Endpunkt ist für Agenten.'
    ),
}

# The draft limit's fixed window (research R17)
DRAFT_WINDOW = timedelta(hours=1)


def _validation_error(message: Text) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={'error': 'Validation error', 'message': message},
    )


def _iso_or_none(value: datetime | None) -> str | None:
    return to_iso_utc(value) if value is not None else None


def _item(
    authorization: AgentAuthorization, client_name: str | None
) -> AgentAccessItem:
    """The row as the user page lists it: a client's name or a token's name."""
    is_oauth = authorization.kind == 'oauth'
    return AgentAccessItem.model_validate(
        {
            'id': authorization.id,
            'kind': authorization.kind,
            'client_name': client_name if is_oauth else None,
            'name': None if is_oauth else authorization.name,
            'access_level': authorization.access_level,
            'created_at': to_iso_utc(authorization.created_at),
            'expires_at': _iso_or_none(authorization.expires_at),
            'last_used_at': _iso_or_none(authorization.last_used_at),
        }
    )


def _client_name(db: Session, authorization: AgentAuthorization) -> str | None:
    if authorization.client_id is None:
        return None
    client = db.get(OauthClient, authorization.client_id)
    return client.client_name if client is not None else None


def _lock_own(
    db: Session, user: UserAccount, authorization_id: str
) -> AgentAuthorization:
    """Lock the account's own authorization and read it again, or answer 404."""
    authorization = db.scalars(
        select(AgentAuthorization)
        .where(
            AgentAuthorization.id == authorization_id,
            AgentAuthorization.user_account_id == user.id,
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()
    if authorization is None:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    return authorization


def list_agent_access(db: Session, user: UserAccount) -> AgentAccessList:
    """The account's agent connections and tokens, newest first, and the levels."""
    rows = db.execute(
        select(AgentAuthorization, OauthClient.client_name)
        .outerjoin(OauthClient, AgentAuthorization.client_id == OauthClient.id)
        .where(AgentAuthorization.user_account_id == user.id)
        .order_by(AgentAuthorization.created_at.desc(), AgentAuthorization.id)
    ).all()
    return AgentAccessList(
        items=[_item(authorization, name) for authorization, name in rows],
        levels=access_levels_view(),
    )


def change_level(
    db: Session, user: UserAccount, authorization_id: str, level: AccessLevel
) -> AgentAccessItem:
    """Set an agent connection's or token's access level; 404 for another account's.

    The agent's next call has the new level. The waiting approval requests the new
    level doesn't allow are cancelled with `access_changed`. A token keeps its
    secret and its expiry.
    """
    authorization = _lock_own(db, user, authorization_id)
    authorization.access_level = level
    approvals.cancel_for(db, authorization.id, reason='access_changed', below=level)
    db.commit()
    logger.info('Agent authorization %s access level changed', authorization.id)
    return _item(authorization, _client_name(db, authorization))


def revoke(db: Session, user: UserAccount, authorization_id: str) -> None:
    """Revoke an agent connection or token; 404 for another account's.

    Its waiting approval requests are cancelled with `revoked`, then the row is
    deleted with its tokens. The cancelled requests stay, with `authorization_id`
    null (`ON DELETE SET NULL`), so the approval page still says why (research
    R7). The agent's next call answers 401.
    """
    authorization = _lock_own(db, user, authorization_id)
    approvals.cancel_for(db, authorization.id, reason='revoked')
    db.delete(authorization)
    db.commit()
    logger.info('Agent authorization %s revoked', authorization_id)


def _token_name(value: str) -> str:
    name = value.strip()
    if not 1 <= len(name) <= TOKEN_NAME_MAX_LENGTH:
        raise _validation_error(
            Text(
                en=(
                    f'Give the token a name of 1 to {TOKEN_NAME_MAX_LENGTH} characters.'
                ),
                de=(
                    f'Geben Sie dem Token einen Namen mit 1 bis '
                    f'{TOKEN_NAME_MAX_LENGTH} Zeichen.'
                ),
            )
        )
    return name


def _token_lifetime(days: int) -> timedelta:
    if not 1 <= days <= settings.agent_token_max_days:
        max_days = settings.agent_token_max_days
        raise _validation_error(
            Text(
                en=f'A token can be valid for at most {max_days} days.',
                de=f'Ein Token kann höchstens {max_days} Tage gültig sein.',
            )
        )
    return timedelta(days=days)


def create_token(db: Session, user: UserAccount, data: TokenCreate) -> TokenCreated:
    """Create a personal access token and answer its secret, this once.

    The name is 1 to 100 characters after trimming, and the token is valid for 1
    to AGENT_TOKEN_MAX_DAYS days; otherwise 400. Only the secret's SHA-256 is
    stored, with the authorization's expiry.
    """
    name = _token_name(data.name)
    expires_at = datetime.now(tz=timezone.utc) + _token_lifetime(data.expires_in_days)
    authorization = AgentAuthorization(
        user_account_id=user.id,
        kind='token',
        name=name,
        access_level=data.access_level,
        expires_at=expires_at,
    )
    db.add(authorization)
    db.flush()
    token = new_secret(PERSONAL_TOKEN_PREFIX)
    db.add(
        AgentToken(
            authorization_id=authorization.id,
            kind='personal',
            token_hash=token_hash(token),
            expires_at=expires_at,
        )
    )
    db.commit()
    logger.info('Personal access token %s created', authorization.id)
    return TokenCreated(item=_item(authorization, None), token=token)


def agent_me(db: Session, principal: Principal) -> AgentMe:
    """Whose access the bearer is, the client's name and the level it has now.

    A browser session answers 403 `bearer_only`: this is the agents' endpoint.
    """
    authorization = principal.authorization
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=BEARER_ONLY)
    return AgentMe.model_validate(
        {
            'username': principal.user.username,
            'client_name': _client_name(db, authorization),
            'kind': authorization.kind,
            'access_level': authorization.access_level,
            'levels': access_levels_view(),
        }
    )


def count_draft_creation(db: Session, authorization_id: str) -> None:
    """Count a new draft in the authorization's window, or answer 429 (FR-020).

    Under the authorization row's lock: a window that started an hour ago or more,
    or never, restarts now with a count of 1; a count below AGENT_DRAFTS_PER_HOUR
    goes up by one; otherwise `rate_limited` with the window's end in Germany's
    time zone. The count is flushed, not committed: the draft's own commit stores
    it, so a creation the server refuses doesn't count, and the lock is held until
    then. A refusal releases the lock. An authorization revoked since the call's
    sign-in answers 401, as its token now would. Saves of a draft never come here.
    """
    authorization = db.scalars(
        select(AgentAuthorization)
        .where(AgentAuthorization.id == authorization_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one_or_none()
    if authorization is None:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=UNAUTHORIZED
        )
    now = datetime.now(tz=timezone.utc)
    started_at = authorization.drafts_window_started_at
    if started_at is None or started_at + DRAFT_WINDOW <= now:
        authorization.drafts_window_started_at = now
        authorization.drafts_in_window = 1
    elif authorization.drafts_in_window < settings.agent_drafts_per_hour:
        authorization.drafts_in_window += 1
    else:
        db.rollback()
        logger.info('Agent authorization %s reached the draft limit', authorization_id)
        again_at = (started_at + DRAFT_WINDOW).astimezone(GERMANY)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                'error': 'rate_limited',
                'message': Text(
                    en=f'This agent can create drafts again at {again_at:%H:%M}.',
                    de=(
                        'Dieser Agent kann ab '
                        f'{again_at:%H:%M} Uhr wieder Entwürfe erstellen.'
                    ),
                ),
            },
        )
    db.flush()
