"""Client for the EUDIPLO management API (contracts/eudiplo-usage.md, research R15).

It covers only the seven calls the middleware makes. Request bodies are sent exactly
as built, because EUDIPLO rejects unknown keys. Responses are read into hand-written
models that ignore fields the middleware doesn't use. Tokens, the client secret and
session credentials are never logged, and neither are response bodies.
"""

import logging
import threading
import time
from collections.abc import Mapping
from datetime import datetime, timezone
from typing import Any, TypeVar
from urllib.parse import quote

import httpx2
from fastapi import HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from pydantic.alias_generators import to_camel

from ..config import Settings, settings
from ..errors import log_server_error

logger = logging.getLogger(__name__)

CONNECT_TIMEOUT_SECONDS = 5.0
READ_TIMEOUT_SECONDS = 10.0
# Renew the cached token this long before it expires
TOKEN_RENEWAL_MARGIN_SECONDS = 300.0
# The largest page GET /api/session allows
SESSION_PAGE_SIZE = 100
# Settings every call needs, in the order a missing one is reported
_CONNECTION_SETTINGS = ('eudiplo_url', 'eudiplo_client_id', 'eudiplo_client_secret')
# The message of the 503 while a setting is empty. Only the log names the setting
NOT_CONFIGURED_MESSAGE = (
    'Something went wrong on our side, so nothing was saved. Contact an '
    'administrator and give them the error ID.'
)


class EudiploError(Exception):
    """A call to EUDIPLO didn't succeed."""


class EudiploNotConfigured(EudiploError):
    """A setting the call needs is empty."""

    def __init__(self, setting: str) -> None:
        super().__init__(f'{setting} is not set')
        self.setting = setting


class EudiploNotFound(EudiploError):
    """EUDIPLO answered 404."""


class EudiploConflict(EudiploError):
    """EUDIPLO answered 409."""


class EudiploUnavailable(EudiploError):
    """EUDIPLO answered another error, didn't answer in time, or answered nonsense."""


class _Response(BaseModel):
    model_config = ConfigDict(extra='ignore')


class _CamelResponse(_Response):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TokenResponse(_Response):
    """Call 1: the parts of the token response the client uses."""

    access_token: str = Field(repr=False)
    expires_in: float


class OfferResponse(_CamelResponse):
    """Call 4: the wallet links of a new presentation request."""

    uri: str
    # Optional in the OpenAPI of EUDIPLO 9.0
    cross_device_uri: str | None = None
    session: str


class SessionSummary(_CamelResponse):
    """A presentation session as call 5 lists it. Credentials are left out."""

    id: str
    # active, fetched, completed, expired or failed
    status: str
    failure_code: str | None = None
    consumed_at: datetime | None = None
    updated_at: datetime


class SessionPage(_CamelResponse):
    """Call 5: one page of sessions, oldest update first."""

    items: list[SessionSummary]
    page: int
    total_pages: int


class PresentedCredential(_Response):
    """One presented document: its DCQL query id and its disclosed claims."""

    id: str
    values: list[dict[str, Any]] = Field(repr=False)


class PresentationSession(SessionSummary):
    """Call 6: a session with its outcome and, once shared, the documents."""

    error_reason: str | None = None
    # Personal data: read only to deliver it, never stored or logged
    credentials: list[PresentedCredential] | None = Field(default=None, repr=False)


ResponseModel = TypeVar('ResponseModel', bound=BaseModel)


def _format_time(value: datetime) -> str:
    """Format a time the way EUDIPLO's filters accept it: UTC with seconds and Z."""
    utc = value.astimezone(timezone.utc).isoformat(timespec='milliseconds')
    return utc.replace('+00:00', 'Z')


class EudiploClient:
    """The middleware's EUDIPLO API client: one HTTP connection pool, one token.

    It is safe to use from several threads.
    """

    def __init__(
        self,
        config: Settings = settings,
        transport: httpx2.BaseTransport | None = None,
    ) -> None:
        self._config = config
        self._http = httpx2.Client(
            timeout=httpx2.Timeout(
                READ_TIMEOUT_SECONDS, connect=CONNECT_TIMEOUT_SECONDS
            ),
            transport=transport,
        )
        self._token: str | None = None
        self._token_renew_at = 0.0
        self._token_lock = threading.Lock()

    # Calls

    def create_config(self, body: Mapping[str, Any]) -> None:
        """Store a presentation configuration (call 2).

        EUDIPLO updates a configuration whose id already exists.
        """
        self._require(*_CONNECTION_SETTINGS, 'eudiplo_trust_list_id')
        self._request('create_config', 'POST', '/api/verifier/config', json=body)

    def delete_config(self, config_id: str) -> bool:
        """Delete a presentation configuration (call 3).

        Returns False when EUDIPLO no longer had it, which counts as success.
        """
        return self._delete(
            'delete_config', f'/api/verifier/config/{quote(config_id, safe="")}'
        )

    def create_offer(self, request_id: str, reference: str) -> OfferResponse:
        """Start a presentation request for a configuration (call 4)."""
        response = self._request(
            'create_offer',
            'POST',
            '/api/verifier/offer',
            json={
                'response_type': 'uri',
                'requestId': request_id,
                'reference': reference,
            },
        )
        return self._parse('create_offer', OfferResponse, response)

    def list_sessions(self, updated_from: datetime, page: int = 1) -> SessionPage:
        """List presentation sessions updated at or after a time (call 5)."""
        response = self._request(
            'list_sessions',
            'GET',
            '/api/session',
            params={
                'type': 'presentation',
                'updatedFrom': _format_time(updated_from),
                'sortBy': 'updatedAt',
                'sortOrder': 'asc',
                'page': page,
                'pageSize': SESSION_PAGE_SIZE,
            },
        )
        return self._parse('list_sessions', SessionPage, response)

    def get_session(self, session_id: str) -> PresentationSession:
        """Read one session, including the documents once shared (call 6)."""
        response = self._request(
            'get_session', 'GET', f'/api/session/{quote(session_id, safe="")}'
        )
        return self._parse('get_session', PresentationSession, response)

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and the documents in it (call 7).

        Returns False when EUDIPLO no longer had it, which counts as success.
        """
        return self._delete(
            'delete_session', f'/api/session/{quote(session_id, safe="")}'
        )

    # Plumbing

    def _require(self, *fields: str) -> None:
        for field in fields:
            if not getattr(self._config, field):
                raise EudiploNotConfigured(field.upper())

    def _url(self, path: str) -> str:
        return self._config.eudiplo_url.rstrip('/') + path

    def _token_for_request(self, stale: str | None = None) -> str:
        """Return a cached token, fetching a new one when it is due or `stale`."""
        with self._token_lock:
            if (
                self._token is None
                or self._token == stale
                or time.monotonic() >= self._token_renew_at
            ):
                token = self._fetch_token()
                lifetime = max(token.expires_in, 0.0)
                margin = min(TOKEN_RENEWAL_MARGIN_SECONDS, lifetime / 2)
                self._token = token.access_token
                self._token_renew_at = time.monotonic() + lifetime - margin
            return self._token

    def _fetch_token(self) -> TokenResponse:
        response = self._send(
            'token',
            'POST',
            '/api/oauth2/token',
            data={
                'grant_type': 'client_credentials',
                'client_id': self._config.eudiplo_client_id,
                'client_secret': self._config.eudiplo_client_secret,
            },
        )
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            logger.warning('EUDIPLO rejected the client credentials')
            raise EudiploUnavailable('EUDIPLO rejected the client credentials')
        self._raise_for_status('token', response)
        return self._parse('token', TokenResponse, response)

    def _request(
        self,
        operation: str,
        method: str,
        path: str,
        *,
        json: Any = None,
        params: Mapping[str, str | int] | None = None,
    ) -> httpx2.Response:
        """Send an authenticated call, fetching a new token once after a 401."""
        self._require(*_CONNECTION_SETTINGS)
        token = self._token_for_request()
        response = self._send(
            operation, method, path, token=token, json=json, params=params
        )
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            token = self._token_for_request(stale=token)
            response = self._send(
                operation, method, path, token=token, json=json, params=params
            )
        self._raise_for_status(operation, response)
        return response

    def _send(
        self,
        operation: str,
        method: str,
        path: str,
        *,
        token: str | None = None,
        json: Any = None,
        params: Mapping[str, str | int] | None = None,
        data: Mapping[str, str] | None = None,
    ) -> httpx2.Response:
        headers = {'Accept': 'application/json'}
        if token is not None:
            headers['Authorization'] = f'Bearer {token}'
        try:
            return self._http.request(
                method,
                self._url(path),
                headers=headers,
                json=json,
                params=params,
                data=data,
            )
        except httpx2.HTTPError as error:
            # The exception text may contain the URL only, but stay terse anyway
            logger.warning('EUDIPLO %s failed: %s', operation, type(error).__name__)
            raise EudiploUnavailable(f'EUDIPLO {operation} failed') from None

    def _raise_for_status(self, operation: str, response: httpx2.Response) -> None:
        # 404 and 409 are answers the callers handle, so they aren't logged here
        if response.is_success:
            return
        if response.status_code == status.HTTP_404_NOT_FOUND:
            raise EudiploNotFound(f'EUDIPLO {operation} answered 404')
        if response.status_code == status.HTTP_409_CONFLICT:
            raise EudiploConflict(f'EUDIPLO {operation} answered 409')
        logger.warning('EUDIPLO %s answered %s', operation, response.status_code)
        raise EudiploUnavailable(f'EUDIPLO {operation} answered {response.status_code}')

    def _delete(self, operation: str, path: str) -> bool:
        try:
            self._request(operation, 'DELETE', path)
        except EudiploNotFound:
            return False
        return True

    def _parse(
        self,
        operation: str,
        model: type[ResponseModel],
        response: httpx2.Response,
    ) -> ResponseModel:
        try:
            return model.model_validate_json(response.content)
        except ValidationError:
            # The validation error quotes the input, which may be personal data
            logger.warning('EUDIPLO %s answered an unexpected body', operation)
            raise EudiploUnavailable(
                f'EUDIPLO {operation} answered an unexpected body'
            ) from None


_client: EudiploClient | None = None
_client_lock = threading.Lock()


def get_eudiplo_client() -> EudiploClient:
    """Return the shared client.

    Tests replace it by setting `_client` to a client with an
    `httpx2.MockTransport`.
    """
    global _client
    with _client_lock:
        if _client is None:
            _client = EudiploClient()
        return _client


def http_error_for(error: EudiploError, upstream_message: str) -> HTTPException:
    """Turn a client error into the API's answer: 503 when not configured, else 502.

    What went wrong, such as which setting is empty, goes to the log only, under the
    error id that the answer carries.
    """
    if isinstance(error, EudiploNotConfigured):
        error_id = log_server_error(
            error, f'EUDIPLO is not configured: {error.setting} is not set'
        )
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                'error': 'Not configured',
                'message': NOT_CONFIGURED_MESSAGE,
                'error_id': error_id,
            },
        )
    error_id = log_server_error(error, 'EUDIPLO call failed')
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={
            'error': 'Upstream error',
            'message': upstream_message,
            'error_id': error_id,
        },
    )
