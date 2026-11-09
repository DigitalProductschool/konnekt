"""DO.IT sign-in: password hashes, sign-in sessions and request checks (R14).

Spec 007 adds the bearer principal: an agent calls the management API with an
agent connection's access token or a personal access token, at the access level
stored on its authorization (data-model.md section 4.1, contracts/oauth.md
"Bearer access"). Nothing here logs: no token, hash or header value, and nothing
on a refused bearer but the status of the answer.
"""

import hashlib
import re
import secrets
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from ..config import settings
from ..db import SessionLocal, get_db
from ..language import Text, resolve_text
from ..models import AgentAuthorization, AgentToken, LoginSession, UserAccount
from ..schemas import AccessLevel, AccessLevelInfo

SESSION_COOKIE = 'session'
SESSION_COOKIE_PATH = '/api'
USERNAME_PATTERN = re.compile(r'[a-z0-9._-]{3,100}')
MIN_PASSWORD_LENGTH = 12
# Methods that need a JSON body, which a cross-site form can't send (CSRF)
STATE_CHANGING_METHODS = frozenset({'POST', 'PUT', 'PATCH', 'DELETE'})

UNAUTHORIZED = {
    'error': 'Unauthorized',
    'message': Text(en='Sign in to continue', de='Melden Sie sich an, um fortzufahren'),
}
BROWSER_ONLY = {
    'error': 'browser_only',
    'message': Text(
        en='This action is done in Konnekt.',
        de='Diese Aktion wird in Konnekt ausgeführt.',
    ),
}

# The three access levels in order, each including the ones before it, with their
# name and what they allow in both languages (data-model.md section 3.1; the texts
# of contracts/ui-screens.md S1; spec 009, glossary "access level")
ACCESS_LEVEL_TEXTS: dict[AccessLevel, tuple[Text, Text]] = {
    'read': (
        Text(en='Read only', de='Nur lesen'),
        Text(
            en=(
                'Find and read connections, variants and rules, run the rule checks '
                'and test fictitious citizens. Nothing changes.'
            ),
            de=(
                'Anbindungen, Varianten und Regeln finden und lesen, die '
                'Regelprüfung ausführen und fiktive Personen testen. Es ändert '
                'sich nichts.'
            ),
        ),
    ),
    'drafts': (
        Text(en='Read and edit drafts', de='Lesen und Entwürfe bearbeiten'),
        Text(
            en=(
                'Also create and change drafts, and ask you to publish or delete a '
                'draft. Published connections stay read-only.'
            ),
            de=(
                'Außerdem Entwürfe erstellen und ändern und Sie bitten, einen '
                'Entwurf zu veröffentlichen oder zu löschen. Veröffentlichte '
                'Anbindungen können nur gelesen werden.'
            ),
        ),
    ),
    'manage': (
        Text(
            en='Read, edit drafts and manage live connections',
            de='Lesen, Entwürfe bearbeiten und aktive Anbindungen verwalten',
        ),
        Text(
            en=(
                'Also ask you to deactivate, reactivate or delete published '
                'connections. Each of these needs your approval here.'
            ),
            de=(
                'Außerdem Sie bitten, veröffentlichte Anbindungen zu deaktivieren, '
                'zu reaktivieren oder zu löschen. Dafür ist jeweils hier Ihre '
                'Freigabe nötig.'
            ),
        ),
    ),
}
# The levels in English, as the MCP server and the tests read them; the API
# answers `access_levels_view()`, in the request's language
ACCESS_LEVELS: tuple[AccessLevelInfo, ...] = tuple(
    AccessLevelInfo(level=level, name=name.en, allows=allows.en)
    for level, (name, allows) in ACCESS_LEVEL_TEXTS.items()
)
_LEVEL_ORDER: tuple[str, ...] = tuple(info.level for info in ACCESS_LEVELS)
# What a level is needed for, in the message of a 403 insufficient_access
_NEEDED_FOR: dict[str, Text] = {
    'read': Text(en='Reading connections', de='Das Lesen von Anbindungen'),
    'drafts': Text(en='Changing drafts', de='Das Bearbeiten von Entwürfen'),
    'manage': Text(
        en='Deactivating, reactivating and deleting published connections',
        de=('Das Deaktivieren, Reaktivieren und Löschen veröffentlichter Anbindungen'),
    ),
}
# The tokens a bearer may send. A refresh token is only for the token endpoint
BEARER_TOKEN_KINDS = ('access', 'personal')
# last_used_at is written at most this often per authorization
LAST_USED_INTERVAL = timedelta(minutes=1)

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


def _login_session_of(db: Session, session_token: str | None) -> LoginSession | None:
    """The sign-in session a cookie token belongs to, unless unknown or expired."""
    if not session_token:
        return None
    return db.scalars(
        select(LoginSession).where(
            LoginSession.token_hash == _hash_token(session_token),
            LoginSession.expires_at > datetime.now(tz=timezone.utc),
        )
    ).first()


def get_current_login_session(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> LoginSession:
    """Return the caller's sign-in session.

    A missing, unknown or expired session answers 401.
    """
    login_session = _login_session_of(db, session_token)
    if login_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=UNAUTHORIZED
        )
    return login_session


def get_current_user(
    login_session: LoginSession = Depends(get_current_login_session),
    db: Session = Depends(get_db),
) -> UserAccount:
    """Return the user of the cookie session, or answer 401.

    Cookie only: a bearer token is never looked at here (`get_current_principal`
    is the dependency that accepts one).
    """
    user = db.get(UserAccount, login_session.user_account_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=UNAUTHORIZED
        )
    return user


# The bearer principal (spec 007, data-model.md section 4.1, research R4 to R6)


def level_allows(have: str, need: AccessLevel) -> bool:
    """Whether the access level `have` includes `need` (read < drafts < manage).

    A value that isn't one of the three levels allows nothing.
    """
    if have not in _LEVEL_ORDER:
        return False
    return _LEVEL_ORDER.index(have) >= _LEVEL_ORDER.index(need)


def access_levels_view() -> list[AccessLevelInfo]:
    """The three access levels in order, named in the request's language."""
    return [
        AccessLevelInfo(
            level=level, name=resolve_text(name), allows=resolve_text(allows)
        )
        for level, (name, allows) in ACCESS_LEVEL_TEXTS.items()
    ]


def insufficient_access(level: AccessLevel) -> HTTPException:
    """The 403 for an agent whose access level is below `level`.

    The answer names the level needed, so that the agent can ask for it.
    """
    needed_for = _NEEDED_FOR[level]
    name = ACCESS_LEVEL_TEXTS[level][0]
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            'error': 'insufficient_access',
            'message': Text(
                en=f"{needed_for.en} needs the access level '{name.en}'.",
                de=f'{needed_for.de} erfordert die Zugriffsstufe „{name.de}“.',
            ),
            'needs_access_level': level,
        },
    )


@dataclass(frozen=True)
class Principal:
    """Who makes a call to the management API.

    `authorization` is None for a team member's browser session (the cookie), which
    may do everything the interface offers. Otherwise it is the agent connection or
    personal access token whose bearer token was sent, loaded at this call, so its
    `access_level` is the one stored now (FR-006); `user` is its account.
    """

    user: UserAccount
    authorization: AgentAuthorization | None


def _bearer_token(authorization: str | None) -> str | None:
    """The token of an `Authorization: Bearer` header, or None for no bearer.

    The scheme is matched ignoring case (RFC 7235). A header with another scheme
    isn't a bearer: the call is judged by its cookie, as without the header. A
    bearer header without a token answers '' and is refused like a wrong token.
    """
    if authorization is None:
        return None
    parts = authorization.strip().split(None, 1)
    if not parts or parts[0].lower() != 'bearer':
        return None
    return parts[1].strip() if len(parts) == 2 else ''


def _authorization_is_current(
    token_kind: str, authorization: AgentAuthorization, now: datetime
) -> bool:
    """Whether a matched token's authorization still grants access.

    A personal access token lasts until its authorization's `expires_at`, which it
    must have; any authorization past its `expires_at` grants nothing, and neither
    does an access level that isn't one of the three.
    """
    expires_at = authorization.expires_at
    if expires_at is None:
        if token_kind == 'personal':
            return False
    elif expires_at <= now:
        return False
    return authorization.access_level in _LEVEL_ORDER


def _touch_last_used(authorization: AgentAuthorization, now: datetime) -> None:
    """Record the authorization's use, unless that was done less than a minute ago.

    One UPDATE in a session of its own, committed at once, so the request's session
    and transaction stay as they were. The condition is repeated in the UPDATE, so
    concurrent calls write it once.
    """
    cutoff = now - LAST_USED_INTERVAL
    if authorization.last_used_at is not None and authorization.last_used_at >= cutoff:
        return
    with SessionLocal() as db:
        db.execute(
            update(AgentAuthorization)
            .where(
                AgentAuthorization.id == authorization.id,
                or_(
                    AgentAuthorization.last_used_at.is_(None),
                    AgentAuthorization.last_used_at < cutoff,
                ),
            )
            .values(last_used_at=now)
            .execution_options(synchronize_session=False)
        )
        db.commit()


def _bearer_principal(db: Session, token: str) -> Principal:
    """Resolve a bearer token through its SHA-256 hash, or answer 401.

    Accepted: an access or personal access token whose own `expires_at` is ahead
    and whose authorization is current (`_authorization_is_current`). An unknown,
    expired, refresh or revoked token answers the 401 of a missing sign-in.
    """
    refused = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail=UNAUTHORIZED
    )
    if not token:
        raise refused
    now = datetime.now(tz=timezone.utc)
    row = db.execute(
        select(AgentToken.kind, AgentAuthorization, UserAccount)
        .join(AgentAuthorization, AgentToken.authorization_id == AgentAuthorization.id)
        .join(UserAccount, AgentAuthorization.user_account_id == UserAccount.id)
        .where(
            AgentToken.token_hash == _hash_token(token),
            AgentToken.kind.in_(BEARER_TOKEN_KINDS),
            AgentToken.expires_at > now,
        )
    ).first()
    if row is None:
        raise refused
    token_kind, authorization, user = row._tuple()
    if not _authorization_is_current(token_kind, authorization, now):
        raise refused
    _touch_last_used(authorization, now)
    return Principal(user=user, authorization=authorization)


def get_current_principal(
    authorization: str | None = Header(default=None),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> Principal:
    """Return the caller: an agent's bearer token, or else the cookie session.

    With an `Authorization: Bearer` header only the token counts, the cookie is
    never looked at: a token that isn't current answers 401 even beside a valid
    cookie. Without one, the cookie session is judged as `get_current_user` does.
    Every refusal is the same 401.
    """
    token = _bearer_token(authorization)
    if token is not None:
        return _bearer_principal(db, token)
    login_session = _login_session_of(db, session_token)
    user = (
        db.get(UserAccount, login_session.user_account_id)
        if login_session is not None
        else None
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=UNAUTHORIZED
        )
    return Principal(user=user, authorization=None)


def require_level(level: AccessLevel) -> Callable[[Principal], None]:
    """A dependency that refuses an agent below `level` with 403.

    The answer is `insufficient_access` with `needs_access_level`. A browser
    session passes at every level.
    """

    def check_level(principal: Principal = Depends(get_current_principal)) -> None:
        authorization = principal.authorization
        if authorization is not None and not level_allows(
            authorization.access_level, level
        ):
            raise insufficient_access(level)

    return check_level


def require_browser_session(
    principal: Principal = Depends(get_current_principal),
) -> UserAccount:
    """Refuse every agent with 403 `browser_only`, and return the signed-in user.

    For the endpoints that only a team member uses in Konnekt: the
    direct status changes, which agents reach through approval requests, and a
    published connection's content (FR-018, FR-021).
    """
    if principal.authorization is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=BROWSER_ONLY)
    return principal.user


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
                'message': Text(
                    en='Send the request body as JSON.',
                    de='Senden Sie den Inhalt der Anfrage als JSON.',
                ),
            },
        )
