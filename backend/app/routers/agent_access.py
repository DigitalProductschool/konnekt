"""Agent access: the user page's endpoints and the agents' own principal.

Spec 007, contracts/management-api.md "Agent access" and "Agent principal",
research R6 and R7. The user page's four endpoints are the team member's browser
session's only: a bearer answers 403 `browser_only`. `GET /api/agent/me` is the
other way round: it answers the bearer's account and level, and a cookie session
403 `bearer_only`.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import UserAccount
from ..schemas import (
    AgentAccessItem,
    AgentAccessList,
    AgentAccessUpdate,
    AgentMe,
    ApiResponse,
    TokenCreate,
    TokenCreated,
)
from ..services import agent_access
from ..services.auth import (
    Principal,
    get_current_principal,
    require_browser_session,
    require_json,
)

router = APIRouter(prefix='/api', tags=['agent-access'])


@router.get('/agent-access')
def list_agent_access(
    user: UserAccount = Depends(require_browser_session),
    db: Session = Depends(get_db),
) -> ApiResponse[AgentAccessList]:
    """List the signed-in account's agent connections and tokens, newest first.

    Answers the three access levels with them, for the level choice.
    """
    return ApiResponse(data=agent_access.list_agent_access(db, user))


@router.put('/agent-access/{authorization_id}', dependencies=[Depends(require_json)])
def change_access_level(
    authorization_id: str,
    data: AgentAccessUpdate,
    user: UserAccount = Depends(require_browser_session),
    db: Session = Depends(get_db),
) -> ApiResponse[AgentAccessItem]:
    """Change an agent connection's or token's access level.

    It applies from the agent's next call; the waiting approval requests the new
    level doesn't allow are cancelled. Another account's row answers 404.
    """
    item = agent_access.change_level(db, user, authorization_id, data.access_level)
    return ApiResponse(data=item, message='Access level changed')


@router.delete('/agent-access/{authorization_id}', dependencies=[Depends(require_json)])
def revoke_access(
    authorization_id: str,
    user: UserAccount = Depends(require_browser_session),
    db: Session = Depends(get_db),
) -> ApiResponse[None]:
    """Revoke an agent connection or token: its next call answers 401.

    Its waiting approval requests are cancelled and its tokens deleted. Another
    account's row answers 404.
    """
    agent_access.revoke(db, user, authorization_id)
    return ApiResponse(data=None, message='Access revoked')


@router.post(
    '/agent-access/tokens',
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_json)],
)
def create_token(
    data: TokenCreate,
    user: UserAccount = Depends(require_browser_session),
    db: Session = Depends(get_db),
) -> ApiResponse[TokenCreated]:
    """Create a personal access token; the answer holds its secret, this once.

    A name that is empty or over 100 characters after trimming, or a validity
    outside 1 to AGENT_TOKEN_MAX_DAYS days, answers 400.
    """
    return ApiResponse(
        data=agent_access.create_token(db, user, data), message='Token created'
    )


@router.get('/agent/me')
def get_agent_me(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> ApiResponse[AgentMe]:
    """Answer the bearer's account, client name and current access level.

    For agents only: a browser session answers 403 `bearer_only`.
    """
    return ApiResponse(data=agent_access.agent_me(db, principal))
