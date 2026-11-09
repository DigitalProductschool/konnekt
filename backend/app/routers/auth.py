from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import LoginSession, UserAccount
from ..schemas import ApiResponse, LoginRequest, UserView
from ..services.auth import (
    authenticate,
    clear_session_cookie,
    create_login_session,
    end_login_session,
    get_current_login_session,
    get_current_user,
    require_browser_session,
    require_json,
    set_session_cookie,
)

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/login', dependencies=[Depends(require_json)])
def login(
    credentials: LoginRequest, response: Response, db: Session = Depends(get_db)
) -> ApiResponse[UserView]:
    """Sign in and set the session cookie.

    A wrong username and a wrong password get the same answer.
    """
    user = authenticate(db, credentials.username, credentials.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                'error': 'Unauthorized',
                'message': 'Username or password is wrong. Check both and try again.',
            },
        )
    set_session_cookie(response, create_login_session(db, user))
    return ApiResponse(data=UserView.model_validate(user))


@router.post(
    '/logout', dependencies=[Depends(require_browser_session), Depends(require_json)]
)
def logout(
    response: Response,
    login_session: LoginSession = Depends(get_current_login_session),
    db: Session = Depends(get_db),
) -> ApiResponse[None]:
    """Sign out: delete the sign-in session and clear the cookie.

    Browser session only: an agent's bearer token answers 403 `browser_only`.
    """
    end_login_session(db, login_session)
    clear_session_cookie(response)
    return ApiResponse(data=None, message='Signed out')


@router.get('/me', dependencies=[Depends(require_browser_session)])
def get_me(user: UserAccount = Depends(get_current_user)) -> ApiResponse[UserView]:
    """Return the signed-in user.

    Browser session only: an agent's bearer token answers 403 `browser_only`.
    """
    return ApiResponse(data=UserView.model_validate(user))
