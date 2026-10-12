"""A stand-in for EUDIPLO's management API, built on httpx2.MockTransport.

It answers the seven calls of contracts/eudiplo-usage.md with the shapes of the
EUDIPLO 9.0 OpenAPI. Tests change the state of sessions the way a wallet and
EUDIPLO would, and can make any call fail.
"""

import json
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal
from urllib.parse import parse_qs

import httpx2

FAKE_EUDIPLO_URL = 'https://eudiplo.test'
FAKE_CLIENT_ID = 'test-client'
FAKE_CLIENT_SECRET = 'test-secret'
FAKE_TRUST_LIST_ID = 'test-trust-list'

CallName = Literal[
    'token',
    'create_config',
    'delete_config',
    'create_offer',
    'list_sessions',
    'get_session',
    'delete_session',
]
SessionStatus = Literal['active', 'fetched', 'completed', 'failed', 'expired']


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _timestamp(value: datetime) -> str:
    # EUDIPLO writes UTC with milliseconds, e.g. 2026-10-09T10:00:00.000Z
    utc = value.astimezone(timezone.utc).isoformat(timespec='milliseconds')
    return utc.replace('+00:00', 'Z')


@dataclass
class FakeSession:
    """One presentation session."""

    id: str
    request_id: str
    reference: str | None
    status: SessionStatus = 'active'
    failure_code: str | None = None
    error_reason: str | None = None
    consumed_at: datetime | None = None
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)
    credentials: list[dict[str, Any]] | None = None

    def to_json(self) -> dict[str, Any]:
        body: dict[str, Any] = {
            'id': self.id,
            'status': self.status,
            'requestId': self.request_id,
            'reference': self.reference,
            'createdAt': _timestamp(self.created_at),
            'updatedAt': _timestamp(self.updated_at),
            'consumed': self.consumed_at is not None,
            'tenantId': 'dps',
        }
        if self.consumed_at is not None:
            body['consumedAt'] = _timestamp(self.consumed_at)
        if self.failure_code is not None:
            body['failureCode'] = self.failure_code
        if self.error_reason is not None:
            body['errorReason'] = self.error_reason
        if self.credentials is not None:
            body['credentials'] = self.credentials
        return body


@dataclass
class ReceivedCall:
    """A call the fake answered, for assertions."""

    name: CallName
    request: httpx2.Request


class FakeEudiplo:
    """In-memory EUDIPLO: configurations, sessions and access tokens."""

    def __init__(self) -> None:
        self.configs: dict[str, dict[str, Any]] = {}
        self.sessions: dict[str, FakeSession] = {}
        self.calls: list[ReceivedCall] = []
        self.valid_tokens: set[str] = set()
        # crossDeviceUri is optional in the offer response of the OpenAPI
        self.omit_cross_device_uri = False
        # Lists sessions without failureCode and consumedAt, which the sync then
        # has to read from the session itself
        self.list_without_outcome = False
        self._failures: dict[CallName, list[int]] = {}
        self.transport = httpx2.MockTransport(self._handle)

    # Test controls

    def fail(self, call: CallName, status_code: int, times: int = 1) -> None:
        """Make the next `times` calls of this kind answer `status_code`."""
        self._failures.setdefault(call, []).extend([status_code] * times)

    def expire_tokens(self) -> None:
        """Invalidate every issued token, so the next call gets a 401."""
        self.valid_tokens.clear()

    def set_session(
        self,
        session_id: str,
        status: SessionStatus,
        *,
        failure_code: str | None = None,
        error_reason: str | None = None,
        consumed_at: datetime | None = None,
        credentials: list[dict[str, Any]] | None = None,
        updated_at: datetime | None = None,
    ) -> FakeSession:
        """Move a session to a new state, as the wallet's answer would."""
        session = self.sessions[session_id]
        session.status = status
        session.failure_code = failure_code
        session.error_reason = error_reason
        session.consumed_at = consumed_at
        session.credentials = credentials
        session.updated_at = updated_at or _now()
        return session

    def call_names(self) -> list[CallName]:
        """The calls received so far, in order."""
        return [call.name for call in self.calls]

    # Transport

    def _handle(self, request: httpx2.Request) -> httpx2.Response:
        name = self._route(request)
        if name is None:
            return self._error(404, 'Cannot route the request')
        self.calls.append(ReceivedCall(name, request))

        failures = self._failures.get(name)
        if failures:
            return self._error(failures.pop(0), f'Forced failure of {name}')
        if name == 'token':
            return self._token(request)
        if self._bearer(request) not in self.valid_tokens:
            return self._error(401, 'Unauthorized')

        handler = {
            'create_config': self._create_config,
            'delete_config': self._delete_config,
            'create_offer': self._create_offer,
            'list_sessions': self._list_sessions,
            'get_session': self._get_session,
            'delete_session': self._delete_session,
        }[name]
        return handler(request)

    @staticmethod
    def _route(request: httpx2.Request) -> CallName | None:
        method, path = request.method, request.url.path
        if method == 'POST' and path == '/api/oauth2/token':
            return 'token'
        if method == 'POST' and path == '/api/verifier/config':
            return 'create_config'
        if method == 'DELETE' and path.startswith('/api/verifier/config/'):
            return 'delete_config'
        if method == 'POST' and path == '/api/verifier/offer':
            return 'create_offer'
        if method == 'GET' and path == '/api/session':
            return 'list_sessions'
        if method == 'GET' and path.startswith('/api/session/'):
            return 'get_session'
        if method == 'DELETE' and path.startswith('/api/session/'):
            return 'delete_session'
        return None

    @staticmethod
    def _bearer(request: httpx2.Request) -> str:
        return request.headers.get('authorization', '').removeprefix('Bearer ')

    @staticmethod
    def _last_segment(request: httpx2.Request) -> str:
        return request.url.path.rsplit('/', 1)[-1]

    @staticmethod
    def _error(status_code: int, message: str) -> httpx2.Response:
        # NestJS's error shape
        return httpx2.Response(
            status_code,
            json={'statusCode': status_code, 'message': message, 'error': 'Error'},
        )

    def _token(self, request: httpx2.Request) -> httpx2.Response:
        form = {
            key: values[0] for key, values in parse_qs(request.content.decode()).items()
        }
        if form != {
            'grant_type': 'client_credentials',
            'client_id': FAKE_CLIENT_ID,
            'client_secret': FAKE_CLIENT_SECRET,
        }:
            return httpx2.Response(401, json={'error': 'invalid_client'})
        token = secrets.token_urlsafe(16)
        self.valid_tokens.add(token)
        return httpx2.Response(
            200,
            json={
                'access_token': token,
                'token_type': 'Bearer',
                'expires_in': 86400,
                'state': '',
            },
        )

    def _create_config(self, request: httpx2.Request) -> httpx2.Response:
        body = json.loads(request.content)
        now = _timestamp(_now())
        self.configs[body['id']] = body
        return httpx2.Response(
            201, json={**body, 'tenant': 'dps', 'createdAt': now, 'updatedAt': now}
        )

    def _delete_config(self, request: httpx2.Request) -> httpx2.Response:
        if self.configs.pop(self._last_segment(request), None) is None:
            return self._error(404, 'Presentation configuration not found')
        return httpx2.Response(204)

    def _create_offer(self, request: httpx2.Request) -> httpx2.Response:
        body = json.loads(request.content)
        if body.get('requestId') not in self.configs:
            return self._error(409, 'Unknown presentation configuration')
        session = FakeSession(
            id=str(uuid.uuid4()),
            request_id=body['requestId'],
            reference=body.get('reference'),
        )
        self.sessions[session.id] = session
        request_uri = f'{FAKE_EUDIPLO_URL}/presentations/{session.id}/oid4vp/request'
        offer = {
            'uri': f'openid4vp://?request_uri={request_uri}',
            'session': session.id,
        }
        if not self.omit_cross_device_uri:
            offer['crossDeviceUri'] = (
                f'openid4vp://?request_uri={request_uri}%2Fno-redirect'
            )
        return httpx2.Response(201, json=offer)

    def _list_sessions(self, request: httpx2.Request) -> httpx2.Response:
        params = request.url.params
        updated_from = datetime.fromisoformat(params['updatedFrom'])
        page = int(params.get('page', '1'))
        page_size = int(params.get('pageSize', '25'))
        matching = sorted(
            (
                session
                for session in self.sessions.values()
                if session.updated_at >= updated_from
            ),
            key=lambda session: session.updated_at,
        )
        start = (page - 1) * page_size
        total_pages = max(1, -(-len(matching) // page_size))
        # Like the full Session schema, list items may carry credentials
        items = [s.to_json() for s in matching[start : start + page_size]]
        if self.list_without_outcome:
            for item in items:
                item.pop('failureCode', None)
                item.pop('consumedAt', None)
        return httpx2.Response(
            200,
            json={
                'items': items,
                'total': len(matching),
                'page': page,
                'pageSize': page_size,
                'totalPages': total_pages,
            },
        )

    def _get_session(self, request: httpx2.Request) -> httpx2.Response:
        session = self.sessions.get(self._last_segment(request))
        if session is None:
            return self._error(404, 'Session not found')
        return httpx2.Response(200, json=session.to_json())

    def _delete_session(self, request: httpx2.Request) -> httpx2.Response:
        if self.sessions.pop(self._last_segment(request), None) is None:
            return self._error(404, 'Session not found')
        return httpx2.Response(204)
