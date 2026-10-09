"""DO.IT sign-in: password hashes, sign-in sessions and request checks (R14)."""

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from functools import cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import LoginSession, UserAccount

SESSION_COOKIE = 'session'
SESSION_COOKIE_PATH = '/api'
USERNAME_PATTERN = re.compile(r'[a-z0-9._-]{3,100}')
MIN_PASSWORD_LENGTH = 12
# Methods that need a JSON body, which a cross-site form can't send (CSRF)
STATE_CHANGING_METHODS = frozenset({'POST', 'PUT', 'PATCH', 'DELETE'})

UNAUTHORIZED = {'error': 'Unauthorized', 'message': 'Sign in to continue'}

# Argon2id with the library's default parameters (RFC 9106, low memory)
_password_hasher = PasswordHasher()


def normalize_username(username: str) -> str:
    """Return the stored form of a username: trimmed and lowercase."""
    return username.strip().lower()


def is_valid_username(username: str) -> bool:
    """Check the stored form: 3-100 characters from a-z 0-9 . _ -."""
    return USERNAME_PATTERN.fullmatch(username) is not None


def hash_password(password: str) -> str:
    """Hash a password with Argon2id."""
    return _password_hasher.hash(password)


@cache
def _unknown_user_hash() -> str:
    # Verified when the username doesn't exist, so both failures take as long
    return hash_password(secrets.token_urlsafe(32))


def authenticate(db: Session, username: str, password: str) -> UserAccount | None:
    """Return the account these credentials belong to, or None.

    The caller can't tell an unknown username from a wrong password: both cost one
    hash verification and both return None.
    """
    user = db.scalars(
        select(UserAccount).where(UserAccount.username == normalize_username(username))
    ).first()
    try:
        _password_hasher.verify(
            user.password_hash if user else _unknown_user_hash(), password
        )
    except (VerificationError, InvalidHashError):
        return None
    if user is None:
        return None
    if _password_hasher.check_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    return user


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _session_lifetime() -> timedelta:
    return timedelta(hours=settings.login_session_hours)


def create_login_session(db: Session, user: UserAccount) -> str:
    """Store a sign-in session for the user and return the token for its cookie.

    Only the token's SHA-256 hash is stored.
    """
    token = secrets.token_urlsafe(32)
    db.add(
        LoginSession(
            user_account_id=user.id,
            token_hash=_hash_token(token),
            expires_at=datetime.now(tz=timezone.utc) + _session_lifetime(),
        )
    )
    db.commit()
    return token


def end_login_session(db: Session, login_session: LoginSession) -> None:
    """Delete a sign-in session (sign-out)."""
    db.delete(login_session)
    db.commit()


def _secure_cookie() -> bool:
    return settings.app_env != 'development'


def set_session_cookie(response: Response, token: str) -> None:
    """Set the session cookie: HttpOnly, SameSite=Strict, Path=/api."""
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(_session_lifetime().total_seconds()),
        path=SESSION_COOKIE_PATH,
        secure=_secure_cookie(),
        httponly=True,
        samesite='strict',
    )


def clear_session_cookie(response: Response) -> None:
    """Tell the browser to drop the session cookie."""
    response.delete_cookie(
        SESSION_COOKIE,
        path=SESSION_COOKIE_PATH,
        secure=_secure_cookie(),
        httponly=True,
        samesite='strict',
    )


def get_current_login_session(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> LoginSession:
    """Return the caller's sign-in session.

    A missing, unknown or expired session answers 401.
    """
    if session_token:
        login_session = db.scalars(
            select(LoginSession).where(
                LoginSession.token_hash == _hash_token(session_token),
                LoginSession.expires_at > datetime.now(tz=timezone.utc),
            )
        ).first()
        if login_session is not None:
            return login_session
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=UNAUTHORIZED)


def get_current_user(
    login_session: LoginSession = Depends(get_current_login_session),
    db: Session = Depends(get_db),
) -> UserAccount:
    """Return the signed-in user, or answer 401."""
    user = db.get(UserAccount, login_session.user_account_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=UNAUTHORIZED
        )
    return user


def require_json(request: Request) -> None:
    """Answer 415 to a state-changing request that isn't sent as JSON.

    A cross-site page can't send a JSON body with cookies without a CORS
    preflight, so this protects the cookie session against CSRF (research R14).
    """
    if request.method not in STATE_CHANGING_METHODS:
        return
    content_type = request.headers.get('content-type', '')
    media_type = content_type.split(';', 1)[0].strip().lower()
    if media_type != 'application/json':
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                'error': 'Unsupported media type',
                'message': 'Send the request body as JSON.',
            },
        )
