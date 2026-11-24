"""The backend as the agents' OAuth 2.1 authorization server (spec 007, research R4).

Clients identify themselves with a Client ID Metadata Document (an `https://`
client id, fetched and cached for 24 hours) or by dynamic registration (RFC 7591).
A signed-in team member's consent stores a one-time authorization code bound to the
client, the redirect URI, the PKCE challenge (S256 only), the access level and the
resource (`MCP_URL`). The token endpoint exchanges it for an access token and a
rotating refresh token, both stored as SHA-256 hashes; a code or a retired refresh
token used again revokes what it issued (contracts/oauth.md).

The register and token endpoints answer RFC 6749 and RFC 7591 bodies: their
refusals are `OauthError`s, which the router turns into those bodies. The consent
page's endpoints answer the API's `{error, message}` envelope. Nothing here logs a
code, a token, a verifier or a metadata document: a refusal is logged as its error
code only.
"""

import base64
import hashlib
import hmac
import json
import logging
import re
import secrets
import uuid
from collections.abc import Mapping
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import SplitResult, urlencode, urlsplit

import httpx2
from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import ColumnElement, delete, func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from ..config import settings
from ..errors import describe_error
from ..language import Text
from ..models import AgentAuthorization, AgentToken, OauthClient, OauthCode, UserAccount
from ..schemas import (
    CLIENT_NAME_INPUT_MAX_LENGTH,
    REDIRECT_URI_MAX_LENGTH,
    REDIRECT_URIS_MAX,
    REGISTRATION_VALUE_MAX_LENGTH,
    REGISTRATION_VALUES_MAX,
    AuthorizeRequest,
    AuthorizeResponse,
    OauthClientView,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)

logger = logging.getLogger(__name__)

# Token and client id prefixes (contracts/oauth.md "Tokens")
ACCESS_TOKEN_PREFIX = 'cp_at_'
REFRESH_TOKEN_PREFIX = 'cp_rt_'
DCR_CLIENT_PREFIX = 'cp_client_'

# The scope words, and the cumulative scope of each access level (data-model 3.1)
SCOPE_WORDS: tuple[str, ...] = ('read', 'drafts', 'manage')
LEVEL_SCOPES: dict[str, str] = {
    'read': 'read',
    'drafts': 'read drafts',
    'manage': 'read drafts manage',
}

CODE_LIFETIME = timedelta(minutes=5)
CLIENT_NAME_MAX_LENGTH = 200
# The columns' sizes (data-model.md sections 1 and 2); REDIRECT_URI_MAX_LENGTH,
# oauth_codes.redirect_uri's, is in schemas.py, which bounds a registration by it
CLIENT_ID_MAX_LENGTH = 500

# Client ID Metadata Documents: fetched again after a day, within these limits
METADATA_MAX_AGE = timedelta(hours=24)
METADATA_TIMEOUT_SECONDS = 5.0
METADATA_MAX_BYTES = 64 * 1024

# PKCE (RFC 7636): a verifier and an S256 challenge are unreserved characters
_PKCE_VALUE = re.compile(r'[A-Za-z0-9._~-]{43,128}')
_LOOPBACK_HOSTS = frozenset({'localhost', '127.0.0.1'})
# Schemes a browser runs or reads locally instead of navigating to a client: the
# consent page sends the browser to the redirect URI, so these are never one
_UNSAFE_SCHEMES = frozenset(
    {'javascript', 'data', 'vbscript', 'file', 'blob', 'about', 'filesystem'}
)
_SCHEME = re.compile(r'[a-z][a-z0-9+.-]*')

# Tests replace it with an `httpx2.MockTransport`
_metadata_transport: httpx2.BaseTransport | None = None


class OauthError(Exception):
    """A refusal the OAuth endpoints answer as an RFC 6749 or RFC 7591 body.

    `description` is the RFC body's `error_description`, always English (spec 009,
    contracts/api-language.md "What stays English"). `message` is what the consent
    page shows of a refusal it can meet (an unknown client, a metadata document),
    in both languages; it defaults to the description.
    """

    def __init__(
        self,
        error: str,
        description: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        message: Text | None = None,
    ) -> None:
        super().__init__(error)
        self.error = error
        self.description = description
        self.status_code = status_code
        self.message: str | Text = message if message is not None else description

    def body(self) -> dict[str, str]:
        """The answer's body: `{error, error_description}`."""
        return {'error': self.error, 'error_description': self.description}


def refusal(
    error: str,
    description: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    message: Text | None = None,
) -> OauthError:
    """An `OauthError`, logged as its error code only."""
    logger.info('OAuth request refused: %s', error)
    return OauthError(error, description, status_code, message)


def _consent_refusal(error: str, message: Text) -> OauthError:
    """An `OauthError` only the consent page meets: its description is the English."""
    return refusal(error, message.en, message=message)


# The consent page's texts (spec 009): the client's refusals, which reach only
# the consent page's endpoints, and the checks of `_checked_request`
CLIENT_UNKNOWN = Text(en='The client is unknown.', de='Der Client ist unbekannt.')
CLIENT_ID_TOO_LONG = Text(
    en='The client_id is too long.', de='Die client_id ist zu lang.'
)
CLIENT_ID_NOT_A_METADATA_URL = Text(
    en="The client_id isn't a valid metadata document URL.",
    de='Die client_id ist keine gültige URL eines Metadatendokuments.',
)
METADATA_UNAVAILABLE = Text(
    en="The client's metadata document could not be fetched.",
    de='Das Metadatendokument des Clients konnte nicht abgerufen werden.',
)
METADATA_INVALID = Text(
    en="The client's metadata document isn't valid.",
    de='Das Metadatendokument des Clients ist ungültig.',
)
REDIRECT_URI_NOT_THE_CLIENTS = Text(
    en="The redirect URI isn't one of the client's.",
    de='Die Weiterleitungs-URI gehört nicht zum Client.',
)
CHALLENGE_METHOD_NOT_S256 = Text(
    en='The code challenge method must be S256.',
    de='Die Methode der Code-Challenge muss S256 sein.',
)
CHALLENGE_INVALID = Text(
    en='The code challenge must be 43 to 128 URL-safe characters.',
    de='Die Code-Challenge muss aus 43 bis 128 URL-sicheren Zeichen bestehen.',
)
RESOURCE_NOT_MCP = Text(
    en="The resource isn't Konnekt's MCP server.",
    de='Die Ressource ist nicht der MCP-Server von Konnekt.',
)
SCOPE_INVALID = Text(
    en='The scope may only contain read, drafts and manage.',
    de='Der Scope darf nur read, drafts und manage enthalten.',
)


def _invalid_request(message: str | Text) -> HTTPException:
    """The consent page's 400: the request is shown as invalid, without redirecting."""
    logger.info('OAuth request refused: invalid_request')
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={'error': 'invalid_request', 'message': message},
    )


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


# Secrets and PKCE


def token_hash(value: str) -> str:
    """The SHA-256 of a code or token, as stored. The value itself never is."""
    return hashlib.sha256(value.encode()).hexdigest()


def new_secret(prefix: str = '') -> str:
    """`prefix` and 43 URL-safe random characters (256 bits)."""
    return prefix + secrets.token_urlsafe(32)


def new_dcr_client_id() -> str:
    """`cp_client_` and 32 URL-safe random characters."""
    return DCR_CLIENT_PREFIX + secrets.token_urlsafe(24)


def s256_challenge(verifier: str) -> str:
    """BASE64URL(SHA-256(verifier)) without padding (RFC 7636, S256)."""
    digest = hashlib.sha256(verifier.encode('ascii')).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')


def pkce_matches(verifier: str, challenge: str) -> bool:
    """Whether a verifier is well-formed and its S256 challenge equals `challenge`."""
    if _PKCE_VALUE.fullmatch(verifier) is None:
        return False
    return hmac.compare_digest(s256_challenge(verifier), challenge)


# Redirect URIs


def _split(uri: str) -> SplitResult | None:
    try:
        return urlsplit(uri)
    except ValueError:
        return None


def _is_loopback(parts: SplitResult) -> bool:
    """An `http://localhost` or `http://127.0.0.1` URI, on any port (RFC 8252)."""
    if parts.scheme != 'http' or parts.hostname not in _LOOPBACK_HOSTS:
        return False
    if parts.username is not None or parts.password is not None:
        return False
    try:
        parts.port
    except ValueError:
        return False
    return True


def redirect_uri_allowed(uri: str) -> bool:
    """Whether `uri` may be a redirect URI at all.

    An absolute `https://` URI, a loopback `http://` one (any other `http://` URI
    is refused), or a native app's own scheme (RFC 8252 7.1); never a scheme the
    browser would run, such as `javascript:`, and never one with a fragment
    (RFC 6749 3.1.2) or with spaces or control characters.
    """
    if not uri or len(uri) > REDIRECT_URI_MAX_LENGTH:
        return False
    if any(
        character.isspace() or ord(character) < 0x20 or ord(character) == 0x7F
        for character in uri
    ):
        return False
    if '#' in uri:
        return False
    parts = _split(uri)
    if parts is None or _SCHEME.fullmatch(parts.scheme) is None:
        return False
    if parts.scheme in _UNSAFE_SCHEMES:
        return False
    if parts.scheme == 'https':
        return bool(parts.hostname)
    if parts.scheme == 'http':
        return _is_loopback(parts)
    return True


def redirect_uri_matches(client: OauthClient, uri: str) -> bool:
    """Whether `uri` is one of the client's redirect URIs.

    Exact, except that `http://localhost` and `http://127.0.0.1` match on any port
    (RFC 8252 7.3); a URI `redirect_uri_allowed` refuses never matches.
    """
    if not redirect_uri_allowed(uri):
        return False
    if uri in client.redirect_uris:
        return True
    parts = _split(uri)
    if parts is None or not _is_loopback(parts):
        return False
    for registered in client.redirect_uris:
        other = _split(registered)
        if (
            other is not None
            and _is_loopback(other)
            and other.hostname == parts.hostname
            and other.path == parts.path
            and other.query == parts.query
        ):
            return True
    return False


def _with_query(uri: str, **params: str) -> str:
    """`uri` with `params` added to its query (RFC 6749 4.1.2), empty ones left out."""
    query = urlencode({key: value for key, value in params.items() if value})
    separator = '&' if urlsplit(uri).query else '?'
    return f'{uri}{separator}{query}'


# Clients


def _metadata_url_problem(client_id: str) -> Text | None:
    """Why an `https://` client id can't name a metadata document, or None."""
    if len(client_id) > CLIENT_ID_MAX_LENGTH:
        return CLIENT_ID_TOO_LONG
    parts = _split(client_id)
    if (
        parts is None
        or parts.scheme != 'https'
        or not parts.hostname
        or parts.username is not None
        or parts.password is not None
        or '#' in client_id
    ):
        return CLIENT_ID_NOT_A_METADATA_URL
    return None


def _metadata_unavailable() -> OauthError:
    return _consent_refusal('invalid_client', METADATA_UNAVAILABLE)


def _fetch_metadata(url: str) -> bytes:
    """GET a Client ID Metadata Document: 5 s, 64 KB at most, no redirects.

    Anything but a `200` within the limits raises `invalid_client`. Called without
    a database transaction.
    """
    try:
        with httpx2.Client(
            timeout=METADATA_TIMEOUT_SECONDS,
            follow_redirects=False,
            transport=_metadata_transport,
        ) as http:
            with http.stream(
                'GET', url, headers={'Accept': 'application/json'}
            ) as response:
                if response.status_code != status.HTTP_200_OK:
                    raise _metadata_unavailable()
                length = response.headers.get('content-length', '')
                if length.isdigit() and int(length) > METADATA_MAX_BYTES:
                    raise _metadata_unavailable()
                body = bytearray()
                for chunk in response.iter_bytes():
                    body.extend(chunk)
                    if len(body) > METADATA_MAX_BYTES:
                        raise _metadata_unavailable()
                return bytes(body)
    except (httpx2.HTTPError, httpx2.InvalidURL, httpx2.StreamError) as error:
        logger.warning(
            'Client metadata document not fetched: %s', describe_error(error)
        )
        raise _metadata_unavailable() from None


def _metadata_invalid() -> OauthError:
    return _consent_refusal('invalid_client', METADATA_INVALID)


def _checked_metadata(url: str, body: bytes) -> tuple[str, list[str]]:
    """The client name and redirect URIs of a fetched document, once checked.

    The document must be a JSON object whose `client_id` equals the URL and whose
    `redirect_uris` is a non-empty list of strings. `client_name` is optional,
    trimmed and cut to 200 characters; without it the URL's host names the client.
    """
    try:
        document = json.loads(body)
    except ValueError:
        raise _metadata_invalid() from None
    if not isinstance(document, dict) or document.get('client_id') != url:
        raise _metadata_invalid()
    redirect_uris = document.get('redirect_uris')
    if (
        not isinstance(redirect_uris, list)
        or not redirect_uris
        or not all(isinstance(uri, str) for uri in redirect_uris)
    ):
        raise _metadata_invalid()
    client_name = document.get('client_name')
    name = (
        client_name.strip()[:CLIENT_NAME_MAX_LENGTH].rstrip()
        if isinstance(client_name, str)
        else ''
    )
    return name or (urlsplit(url).hostname or url), list(redirect_uris)


def _stored_client(db: Session, client_id: str) -> OauthClient | None:
    return db.scalars(
        select(OauthClient).where(OauthClient.client_id == client_id)
    ).first()


def _store_metadata(
    db: Session, client_id: str, client_name: str, redirect_uris: list[str]
) -> OauthClient:
    """Insert or update a metadata document's client in one statement.

    `ON CONFLICT` keeps two fetches of the same document at the same time from
    colliding on the unique `client_id`.
    """
    fetched_at = _now()
    statement = pg_insert(OauthClient).values(
        id=str(uuid.uuid4()),
        client_id=client_id,
        kind='cimd',
        client_name=client_name,
        redirect_uris=redirect_uris,
        metadata_fetched_at=fetched_at,
    )
    db.execute(
        statement.on_conflict_do_update(
            index_elements=[OauthClient.client_id],
            set_={
                'client_name': statement.excluded.client_name,
                'redirect_uris': statement.excluded.redirect_uris,
                'metadata_fetched_at': statement.excluded.metadata_fetched_at,
                'updated_at': fetched_at,
            },
        )
    )
    db.commit()
    return db.scalars(
        select(OauthClient).where(OauthClient.client_id == client_id)
    ).one()


def client_for(
    db: Session, client_id: str, redirect_uri: str | None = None
) -> OauthClient:
    """The client a `client_id` names, or `invalid_client`.

    An `https://` client id is a Client ID Metadata Document: it is fetched when
    the backend first sees it, when the cached copy is older than 24 hours, and when
    `redirect_uri` is allowed but isn't one of the cached ones, with no transaction
    held during the fetch. Any other client id must be a registered client's.
    """
    client = _stored_client(db, client_id)
    if not client_id.startswith('https://'):
        if client is None or client.kind != 'dcr':
            raise _consent_refusal('invalid_client', CLIENT_UNKNOWN)
        return client
    problem = _metadata_url_problem(client_id)
    if problem is not None:
        raise _consent_refusal('invalid_client', problem)
    if (
        client is not None
        and client.kind == 'cimd'
        and client.metadata_fetched_at is not None
        and client.metadata_fetched_at > _now() - METADATA_MAX_AGE
        and (
            redirect_uri is None
            or not redirect_uri_allowed(redirect_uri)
            or redirect_uri_matches(client, redirect_uri)
        )
    ):
        return client
    # End the read transaction: no connection is held while the client answers
    db.rollback()
    client_name, redirect_uris = _checked_metadata(
        client_id, _fetch_metadata(client_id)
    )
    return _store_metadata(db, client_id, client_name, redirect_uris)


def client_view(db: Session, user: UserAccount, client_id: str) -> OauthClientView:
    """The client as the consent page shows it, or `invalid_client`.

    `current_access_level` is the account's existing agent connection's level for
    this client, None without one.
    """
    client = client_for(db, client_id)
    current = db.scalar(
        select(AgentAuthorization.access_level).where(
            AgentAuthorization.user_account_id == user.id,
            AgentAuthorization.client_id == client.id,
            AgentAuthorization.kind == 'oauth',
        )
    )
    return OauthClientView.model_validate(
        {
            'client_id': client.client_id,
            'client_name': client.client_name,
            'kind': client.kind,
            'current_access_level': current,
        }
    )


# Dynamic registrations (spec 012, research R6, finding 5)

# A dynamically registered client that nothing uses: no agent connection and no
# authorization code refer to it. The worker deletes one an hour old
# (`worker.delete_unused_oauth_clients`), and a registration removes the oldest
# beyond OAUTH_MAX_UNUSED_REGISTRATIONS (`register_client`)
UNUSED_CLIENT: tuple[ColumnElement[bool], ...] = (
    OauthClient.kind == 'dcr',
    ~select(AgentAuthorization.id)
    .where(AgentAuthorization.client_id == OauthClient.id)
    .exists(),
    ~select(OauthCode.id).where(OauthCode.client_id == OauthClient.id).exists(),
)

# The transaction-level advisory lock that registrations take one after another:
# an arbitrary number, unique among the application's advisory locks
REGISTRATION_LOCK_KEY = 7591

# What each field of a registration must be: the description of a body that fails
# `RegisterRequest`'s validation, by the first field that fails (RFC body, English)
REGISTRATION_FIELD_RULES: dict[str, str] = {
    'client_name': (
        'client_name is required: a string of at most '
        f'{CLIENT_NAME_INPUT_MAX_LENGTH} characters.'
    ),
    'redirect_uris': (
        f'redirect_uris is required: a list of at most {REDIRECT_URIS_MAX} URIs '
        f'of at most {REDIRECT_URI_MAX_LENGTH} characters each.'
    ),
    'token_endpoint_auth_method': 'token_endpoint_auth_method must be none.',
    'grant_types': (
        f'grant_types must be a list of at most {REGISTRATION_VALUES_MAX} strings '
        f'of at most {REGISTRATION_VALUE_MAX_LENGTH} characters each.'
    ),
    'response_types': (
        f'response_types must be a list of at most {REGISTRATION_VALUES_MAX} '
        f'strings of at most {REGISTRATION_VALUE_MAX_LENGTH} characters each.'
    ),
}
REGISTRATION_NEEDS = 'The registration needs client_name and redirect_uris.'


def invalid_registration(error: ValidationError) -> OauthError:
    """The refusal of a registration body that fails `RegisterRequest`'s validation.

    `invalid_client_metadata` (RFC 7591 3.2.2), described by what the first field
    that fails must be.
    """
    problems = error.errors()
    location = problems[0]['loc'] if problems else ()
    field = location[0] if location else None
    description = (
        REGISTRATION_FIELD_RULES.get(field, REGISTRATION_NEEDS)
        if isinstance(field, str)
        else REGISTRATION_NEEDS
    )
    return refusal('invalid_client_metadata', description)


def _remove_unused_beyond_cap(db: Session, new_client_id: str) -> list[str]:
    """Remove the oldest unused registrations beyond the cap; return their ids.

    The new registration (`new_client_id`, unused itself) and the newest other
    unused ones stay, OAUTH_MAX_UNUSED_REGISTRATIONS in all. Called under the
    registration lock, so no other registration adds one meanwhile. The rows are
    locked first, skipping those another transaction holds (a consent storing its
    code, the worker deleting them), and the conditions are checked again in the
    delete, as the worker does: a client that is used meanwhile stays.
    """
    beyond_cap = db.scalars(
        select(OauthClient.id)
        .where(*UNUSED_CLIENT, OauthClient.id != new_client_id)
        .order_by(OauthClient.created_at.desc(), OauthClient.id.desc())
        .offset(settings.oauth_max_unused_registrations - 1)
    ).all()
    if not beyond_cap:
        return []
    candidates = db.scalars(
        select(OauthClient.id)
        .where(OauthClient.id.in_(beyond_cap), *UNUSED_CLIENT)
        .with_for_update(skip_locked=True)
    ).all()
    if not candidates:
        return []
    return list(
        db.scalars(
            delete(OauthClient)
            .where(OauthClient.id.in_(candidates), *UNUSED_CLIENT)
            .returning(OauthClient.id)
            .execution_options(synchronize_session=False)
        ).all()
    )


def register_client(db: Session, data: RegisterRequest) -> RegisterResponse:
    """Register a public client (RFC 7591): no secret, `cp_client_` id.

    A secret authentication method, no redirect URI, or one that
    `redirect_uri_allowed` refuses (such as a non-loopback `http://` URI) answers
    `invalid_client_metadata`. A registration no authorization uses is deleted by
    the worker after an hour, and at most OAUTH_MAX_UNUSED_REGISTRATIONS of them
    are kept: each registration removes the oldest unused ones beyond that, never
    one that an agent connection or an authorization code uses. Registrations
    take turns (an advisory lock until the commit), so parallel ones never pass
    the cap together.
    """
    if data.token_endpoint_auth_method != 'none':
        # RFC body, English
        raise refusal(
            'invalid_client_metadata',
            'Only public clients can register: token_endpoint_auth_method must '
            'be none.',
        )
    if not data.redirect_uris:
        # RFC body, English
        raise refusal(
            'invalid_client_metadata', 'redirect_uris must name at least one URI.'
        )
    if not all(redirect_uri_allowed(uri) for uri in data.redirect_uris):
        # RFC body, English
        raise refusal(
            'invalid_client_metadata',
            'A redirect URI must be an https:// URI, a loopback http:// URI '
            "(localhost or 127.0.0.1) or an app's own scheme, without a fragment.",
        )
    client_name = data.client_name.strip()[:CLIENT_NAME_MAX_LENGTH].rstrip()
    if not client_name:
        # RFC body, English
        raise refusal('invalid_client_metadata', 'client_name is required.')
    db.execute(select(func.pg_advisory_xact_lock(REGISTRATION_LOCK_KEY)))
    client = OauthClient(
        client_id=new_dcr_client_id(),
        kind='dcr',
        client_name=client_name,
        redirect_uris=list(data.redirect_uris),
    )
    db.add(client)
    db.flush()
    removed = _remove_unused_beyond_cap(db, client.id)
    db.commit()
    logger.info('OAuth client %s registered', client.id)
    for removed_id in removed:
        logger.info('Unused OAuth client %s removed for a new registration', removed_id)
    return RegisterResponse(
        client_id=client.client_id,
        client_name=client.client_name,
        redirect_uris=list(client.redirect_uris),
    )


# Authorization codes


def _checked_request(db: Session, request: AuthorizeRequest) -> OauthClient:
    """Check a consent page request, or answer `400 invalid_request`.

    The client must be known, the redirect URI one of its own, the challenge an
    S256 one of 43 to 128 characters, the resource `MCP_URL`, and every scope word
    one of `read drafts manage`.
    """
    try:
        client = client_for(db, request.client_id, request.redirect_uri)
    except OauthError as error:
        raise _invalid_request(error.message) from None
    if not redirect_uri_matches(client, request.redirect_uri):
        raise _invalid_request(REDIRECT_URI_NOT_THE_CLIENTS)
    if request.code_challenge_method != 'S256':
        raise _invalid_request(CHALLENGE_METHOD_NOT_S256)
    if _PKCE_VALUE.fullmatch(request.code_challenge) is None:
        raise _invalid_request(CHALLENGE_INVALID)
    if request.resource != settings.mcp_url:
        raise _invalid_request(RESOURCE_NOT_MCP)
    if any(word not in SCOPE_WORDS for word in request.scope.split()):
        raise _invalid_request(SCOPE_INVALID)
    return client


def create_code(db: Session, user: UserAccount, request: AuthorizeRequest) -> str:
    """Store an authorization code for the team member's consent and return it.

    The code (43 random characters, stored as its SHA-256) lives 5 minutes and is
    bound to the client, the redirect URI, the PKCE challenge, the chosen access
    level ('read' when none is given) and the resource. A bad request answers
    `400 invalid_request`.
    """
    client = _checked_request(db, request)
    # A registration that nothing uses yet may be removed meanwhile, by the worker
    # or by a registration beyond the cap: the row is locked against that until the
    # code is stored, and one that is gone answers as an unknown client
    still_there = db.scalar(
        select(OauthClient.id)
        .where(OauthClient.id == client.id)
        .with_for_update(read=True, key_share=True)
    )
    if still_there is None:
        raise _invalid_request(CLIENT_UNKNOWN)
    code = new_secret()
    db.add(
        OauthCode(
            code_hash=token_hash(code),
            client_id=client.id,
            user_account_id=user.id,
            redirect_uri=request.redirect_uri,
            code_challenge=request.code_challenge,
            access_level=request.access_level or 'read',
            resource=request.resource,
            expires_at=_now() + CODE_LIFETIME,
        )
    )
    db.commit()
    return code


def authorize(
    db: Session, user: UserAccount, request: AuthorizeRequest
) -> AuthorizeResponse:
    """The consent page's decision: where to send the browser.

    `allow`: the redirect URI with `code` and `state`; `deny`: with
    `error=access_denied` and `state`. Either way the request is checked first, and
    a bad one answers `400 invalid_request` without a redirect.
    """
    if request.decision == 'deny':
        _checked_request(db, request)
        return AuthorizeResponse(
            redirect_to=_with_query(
                request.redirect_uri, error='access_denied', state=request.state
            )
        )
    code = create_code(db, user, request)
    return AuthorizeResponse(
        redirect_to=_with_query(request.redirect_uri, code=code, state=request.state)
    )


# Tokens


def _required(params: Mapping[str, str], name: str) -> str:
    value = params.get(name)
    if not value:
        # RFC body, English
        raise refusal('invalid_request', f'The parameter {name} is missing.')
    return value


def _invalid_grant(description: str) -> OauthError:
    return refusal('invalid_grant', description)


def _issue_tokens(
    db: Session, authorization: AgentAuthorization, now: datetime
) -> tuple[TokenResponse, AgentToken]:
    """Store a new access and refresh token for the authorization.

    Returns the answer, with both tokens in plain text once, and the refresh
    token's row. The caller commits.
    """
    access_token = new_secret(ACCESS_TOKEN_PREFIX)
    refresh_token = new_secret(REFRESH_TOKEN_PREFIX)
    access_row = AgentToken(
        authorization_id=authorization.id,
        kind='access',
        token_hash=token_hash(access_token),
        expires_at=now + timedelta(minutes=settings.agent_access_token_minutes),
    )
    refresh_row = AgentToken(
        authorization_id=authorization.id,
        kind='refresh',
        token_hash=token_hash(refresh_token),
        expires_at=now + timedelta(days=settings.agent_connection_idle_days),
    )
    db.add_all([access_row, refresh_row])
    db.flush()
    answer = TokenResponse(
        access_token=access_token,
        expires_in=settings.agent_access_token_minutes * 60,
        refresh_token=refresh_token,
        scope=LEVEL_SCOPES[authorization.access_level],
    )
    return answer, refresh_row


def _agent_connection(
    db: Session, code: OauthCode, now: datetime
) -> AgentAuthorization:
    """The account's agent connection for the code's client, created or updated.

    One row per account and client (`kind='oauth'`): a new consent sets its level
    and resets `updated_at`. The insert skips an existing row, so two exchanges at
    the same time can't collide on the partial unique index; the row is locked.
    """
    db.execute(
        pg_insert(AgentAuthorization)
        .values(
            id=str(uuid.uuid4()),
            user_account_id=code.user_account_id,
            kind='oauth',
            client_id=code.client_id,
            name='',
            access_level=code.access_level,
        )
        .on_conflict_do_nothing(
            index_elements=['user_account_id', 'client_id'],
            index_where=text("kind = 'oauth'"),
        )
    )
    authorization = db.scalars(
        select(AgentAuthorization)
        .where(
            AgentAuthorization.user_account_id == code.user_account_id,
            AgentAuthorization.client_id == code.client_id,
            AgentAuthorization.kind == 'oauth',
        )
        .with_for_update()
    ).one()
    authorization.access_level = code.access_level
    authorization.updated_at = now
    return authorization


def _revoke_code_tokens(db: Session, code: OauthCode) -> None:
    """Delete the tokens a code issued: those of its client's agent connection.

    One agent connection per account and client holds every token a code for it
    issued and their refreshed successors, so all of its tokens go. The connection
    itself stays until the worker finds it unused.
    """
    authorization_id = db.scalar(
        select(AgentAuthorization.id).where(
            AgentAuthorization.user_account_id == code.user_account_id,
            AgentAuthorization.client_id == code.client_id,
            AgentAuthorization.kind == 'oauth',
        )
    )
    if authorization_id is not None:
        db.execute(
            delete(AgentToken).where(AgentToken.authorization_id == authorization_id)
        )
    db.commit()
    logger.warning(
        'Authorization code used again: tokens of agent connection %s deleted',
        authorization_id,
    )


def exchange_code(db: Session, params: Mapping[str, str]) -> TokenResponse:
    """The `authorization_code` grant: a code and its PKCE verifier for tokens.

    Under the code row's lock: an unknown, used or expired code answers
    `invalid_grant`, and a used one's second use also deletes the tokens it issued;
    another client than the code's answers `401 invalid_client`; a verifier whose
    S256 challenge isn't the code's, or another redirect URI, `invalid_grant`; a
    `resource` other than the code's (`MCP_URL`), `invalid_target`. Then the code is
    used, the account's agent connection for the client gets the consented level,
    and a new access and refresh token are answered once.
    """
    code_value = _required(params, 'code')
    client_id = _required(params, 'client_id')
    redirect_uri = _required(params, 'redirect_uri')
    code_verifier = _required(params, 'code_verifier')
    resource = _required(params, 'resource')
    now = _now()
    code = db.scalars(
        select(OauthCode)
        .where(OauthCode.code_hash == token_hash(code_value))
        .with_for_update()
    ).first()
    if code is None:
        # RFC body, English
        raise _invalid_grant('The authorization code is unknown.')
    if code.used_at is not None:
        _revoke_code_tokens(db, code)
        # RFC body, English
        raise _invalid_grant('The authorization code was already used.')
    if code.expires_at <= now:
        # RFC body, English
        raise _invalid_grant('The authorization code has expired.')
    client = db.get(OauthClient, code.client_id)
    if client is None or client.client_id != client_id:
        # RFC body, English
        raise refusal(
            'invalid_client',
            'The authorization code was issued to another client.',
            status.HTTP_401_UNAUTHORIZED,
        )
    if not pkce_matches(code_verifier, code.code_challenge):
        # RFC body, English
        raise _invalid_grant("The code verifier doesn't match the code challenge.")
    if redirect_uri != code.redirect_uri:
        # RFC body, English
        raise _invalid_grant("The redirect URI isn't the authorization request's.")
    if resource != code.resource or resource != settings.mcp_url:
        # RFC body, English
        raise refusal('invalid_target', "The resource isn't Konnekt's MCP server.")
    code.used_at = now
    authorization = _agent_connection(db, code, now)
    answer, _refresh_row = _issue_tokens(db, authorization, now)
    authorization_id = authorization.id
    db.commit()
    logger.info('Agent connection %s issued tokens', authorization_id)
    return answer


def refresh(db: Session, params: Mapping[str, str]) -> TokenResponse:
    """The `refresh_token` grant: a new token pair, the old refresh token retired.

    Under the refresh token's row lock: an unknown or expired one, or another
    client than the connection's, answers `invalid_grant`; a `resource` other than
    `MCP_URL`, `invalid_target`. A retired (replaced) refresh token used again
    deletes its agent connection, whose tokens cascade, and answers `invalid_grant`;
    its approval requests stay with `authorization_id` null, and a waiting one
    reads as `cancelled` with `access_ended` (computed by `approvals`, data-model.md
    section 5.2; no `cancel_for` here). The answer's scope is the connection's
    level as stored now.
    """
    refresh_token = _required(params, 'refresh_token')
    client_id = _required(params, 'client_id')
    resource = params.get('resource')
    now = _now()
    row = db.scalars(
        select(AgentToken)
        .where(
            AgentToken.token_hash == token_hash(refresh_token),
            AgentToken.kind == 'refresh',
        )
        .with_for_update()
    ).first()
    if row is None:
        # RFC body, English
        raise _invalid_grant('The refresh token is unknown.')
    if row.replaced_by_id is not None:
        authorization_id = row.authorization_id
        db.execute(
            delete(AgentAuthorization).where(AgentAuthorization.id == authorization_id)
        )
        db.commit()
        logger.warning(
            'Retired refresh token used again: agent connection %s revoked',
            authorization_id,
        )
        # RFC body, English
        raise _invalid_grant('The refresh token was already used.')
    if row.expires_at <= now:
        # RFC body, English
        raise _invalid_grant('The refresh token has expired.')
    authorization = db.get(AgentAuthorization, row.authorization_id)
    client = (
        db.get(OauthClient, authorization.client_id)
        if authorization is not None and authorization.client_id is not None
        else None
    )
    if (
        authorization is None
        or authorization.kind != 'oauth'
        or client is None
        or client.client_id != client_id
        or authorization.access_level not in LEVEL_SCOPES
    ):
        # RFC body, English
        raise _invalid_grant('The refresh token was issued to another client.')
    if resource and resource != settings.mcp_url:
        # RFC body, English
        raise refusal('invalid_target', "The resource isn't Konnekt's MCP server.")
    answer, refresh_row = _issue_tokens(db, authorization, now)
    row.replaced_by_id = refresh_row.id
    db.commit()
    return answer


def token_grant(db: Session, params: Mapping[str, str]) -> TokenResponse:
    """The token endpoint: `authorization_code` or `refresh_token`.

    Any other `grant_type`, or none, answers `invalid_request`.
    """
    grant_type = params.get('grant_type')
    if grant_type == 'authorization_code':
        return exchange_code(db, params)
    if grant_type == 'refresh_token':
        return refresh(db, params)
    # RFC body, English
    raise refusal(
        'invalid_request',
        'The grant_type must be authorization_code or refresh_token.',
    )


# Metadata


def metadata() -> dict[str, Any]:
    """The authorization server's metadata document (RFC 8414, research R4)."""
    issuer = settings.oauth_issuer
    return {
        'issuer': issuer,
        'authorization_endpoint': f'{settings.portal_url}/authorize',
        'token_endpoint': f'{issuer}/api/oauth/token',
        'registration_endpoint': f'{issuer}/api/oauth/register',
        'client_id_metadata_document_supported': True,
        'code_challenge_methods_supported': ['S256'],
        'grant_types_supported': ['authorization_code', 'refresh_token'],
        'response_types_supported': ['code'],
        'token_endpoint_auth_methods_supported': ['none'],
        'scopes_supported': list(SCOPE_WORDS),
    }
