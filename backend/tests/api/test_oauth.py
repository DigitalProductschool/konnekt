"""The OAuth authorization server (spec 007, contracts/oauth.md, research R4).

The metadata document; dynamic registration; Client ID Metadata Documents through
a fake `httpx2` transport; the consent page's two endpoints; the token endpoint's
code exchange and refresh rotation with every refusal; and the worker's five
steps that clean up codes, tokens, agent connections, personal access tokens and
unused registrations (research R7).
"""

import json
import logging
from collections.abc import Callable, Iterator
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import parse_qs, quote, urlsplit

import httpx2
import pytest
from fastapi.testclient import TestClient
from httpx2 import Request, Response
from sqlalchemy import func, select, update

from app.config import settings
from app.db import SessionLocal
from app.main import RedactReferencesFilter, app
from app.models import (
    AgentAuthorization,
    AgentToken,
    OauthClient,
    OauthCode,
    UserAccount,
)
from app.services import oauth, worker
from app.services.oauth import s256_challenge, token_hash
from tests.conftest import TEST_USERNAME, create_user
from tests.helpers import bearer_client, create_agent_authorization, now

# RFC 7636, appendix B
VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
REDIRECT_URI = 'http://127.0.0.1:53682/callback'
STATE = 'state-1234'
METADATA_URL = 'https://agent.example/oauth/client-metadata.json'
METADATA_REDIRECT_URI = 'https://agent.example/callback'


def _mcp_url() -> str:
    assert settings.mcp_url is not None
    return settings.mcp_url


# Helpers


def _register(client: TestClient, **changes: Any) -> Response:
    body: dict[str, Any] = {
        'client_name': 'Claude Code',
        'redirect_uris': ['http://127.0.0.1/callback'],
        'token_endpoint_auth_method': 'none',
        'grant_types': ['authorization_code', 'refresh_token'],
        'response_types': ['code'],
    }
    return client.post('/api/oauth/register', json=body | changes)


def _registered(client: TestClient, **changes: Any) -> str:
    response = _register(client, **changes)
    assert response.status_code == 201, response.json()
    client_id: str = response.json()['client_id']
    return client_id


def _authorize_body(client_id: str, **changes: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        'client_id': client_id,
        'redirect_uri': REDIRECT_URI,
        'code_challenge': CHALLENGE,
        'code_challenge_method': 'S256',
        'state': STATE,
        'scope': 'read drafts',
        'resource': _mcp_url(),
        'decision': 'allow',
        'access_level': 'drafts',
    }
    return body | changes


def _authorize(client: TestClient, client_id: str, **changes: Any) -> Response:
    return client.post(
        '/api/oauth/authorize', json=_authorize_body(client_id, **changes)
    )


def _query_of(url: str) -> dict[str, list[str]]:
    return parse_qs(urlsplit(url).query)


def _code(client: TestClient, client_id: str, **changes: Any) -> str:
    """Consent through the consent page's endpoint and return the code."""
    response = _authorize(client, client_id, **changes)
    assert response.status_code == 200, response.json()
    query = _query_of(response.json()['data']['redirect_to'])
    assert query['state'] == [STATE]
    return query['code'][0]


def _exchange(
    client: TestClient, client_id: str, code: str, **changes: str
) -> Response:
    params = {
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': client_id,
        'redirect_uri': REDIRECT_URI,
        'code_verifier': VERIFIER,
        'resource': _mcp_url(),
    }
    return client.post('/api/oauth/token', data=params | changes)


def _refresh(
    client: TestClient, client_id: str, refresh_token: str, **changes: str
) -> Response:
    params = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': client_id,
        'resource': _mcp_url(),
    }
    return client.post('/api/oauth/token', data=params | changes)


def _tokens(client: TestClient, client_id: str, **changes: Any) -> dict[str, Any]:
    """Consent and exchange the code: the token answer."""
    response = _exchange(client, client_id, _code(client, client_id, **changes))
    assert response.status_code == 200, response.json()
    tokens: dict[str, Any] = response.json()
    return tokens


def _bearer_status(token: str) -> int:
    """What `GET /api/form-connections` answers to the token, without a cookie."""
    return (
        bearer_client(TestClient(app), token).get('/api/form-connections').status_code
    )


def _user_id() -> str:
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
    assert user_id is not None
    return user_id


def _oauth_authorizations() -> list[AgentAuthorization]:
    with SessionLocal() as db:
        return list(
            db.scalars(
                select(AgentAuthorization).where(AgentAuthorization.kind == 'oauth')
            ).all()
        )


def _count(model: type[Any]) -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(model)) or 0


def _refused(response: Response, status: int, error: str) -> None:
    assert response.status_code == status, response.json()
    body = response.json()
    assert body.keys() == {'error', 'error_description'}
    assert body['error'] == error
    assert body['error_description']


def _consent_refused(response: Response) -> None:
    assert response.status_code == 400, response.json()
    body = response.json()
    assert body['error'] == 'invalid_request'
    assert body['message']


# Client ID Metadata Documents: a fake host


class FakeMetadataHost:
    """Serves Client ID Metadata Documents and counts the fetches."""

    def __init__(self) -> None:
        self.document: dict[str, Any] = {
            'client_id': METADATA_URL,
            'client_name': 'Agent Example',
            'redirect_uris': [METADATA_REDIRECT_URI],
            'token_endpoint_auth_method': 'none',
        }
        self.requests: list[Request] = []
        self.answer: Callable[[Request], Response] | None = None

    def handle(self, request: Request) -> Response:
        self.requests.append(request)
        if self.answer is not None:
            return self.answer(request)
        return Response(200, json=self.document)


@pytest.fixture
def metadata_host(monkeypatch: pytest.MonkeyPatch) -> FakeMetadataHost:
    """Route the backend's metadata document fetches to a fake host."""
    host = FakeMetadataHost()
    monkeypatch.setattr(oauth, '_metadata_transport', httpx2.MockTransport(host.handle))
    return host


@pytest.fixture
def no_metadata_fetch(monkeypatch: pytest.MonkeyPatch) -> Iterator[list[Request]]:
    """Fail the test's assertion if a metadata document is fetched."""
    fetched: list[Request] = []

    def handle(request: Request) -> Response:
        fetched.append(request)
        return Response(500)

    monkeypatch.setattr(oauth, '_metadata_transport', httpx2.MockTransport(handle))
    yield fetched
    assert fetched == []


def _client_url(client_id: str) -> str:
    return f'/api/oauth/clients/{quote(client_id, safe="")}'


def _metadata_fetched_at() -> datetime | None:
    with SessionLocal() as db:
        return db.scalar(
            select(OauthClient.metadata_fetched_at).where(
                OauthClient.client_id == METADATA_URL
            )
        )


# The metadata document (RFC 8414)


def test_metadata_document(client: TestClient) -> None:
    response = client.get('/.well-known/oauth-authorization-server')

    assert response.status_code == 200
    assert response.headers['cache-control'] == 'max-age=3600'
    issuer = settings.oauth_issuer
    assert response.json() == {
        'issuer': issuer,
        'authorization_endpoint': f'{settings.portal_url}/authorize',
        'token_endpoint': f'{issuer}/api/oauth/token',
        'registration_endpoint': f'{issuer}/api/oauth/register',
        'client_id_metadata_document_supported': True,
        'code_challenge_methods_supported': ['S256'],
        'grant_types_supported': ['authorization_code', 'refresh_token'],
        'response_types_supported': ['code'],
        'token_endpoint_auth_methods_supported': ['none'],
        'scopes_supported': ['read', 'drafts', 'manage'],
    }


def test_metadata_document_uses_the_settings(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, 'oauth_issuer', 'https://portal.example')
    monkeypatch.setattr(settings, 'portal_url', 'https://portal.example')

    document = client.get('/.well-known/oauth-authorization-server').json()

    assert document['issuer'] == 'https://portal.example'
    assert document['authorization_endpoint'] == 'https://portal.example/authorize'
    assert document['token_endpoint'] == 'https://portal.example/api/oauth/token'


# Dynamic client registration (RFC 7591)


def test_registration_answers_the_client_without_a_secret(client: TestClient) -> None:
    response = _register(client, client_name='  Claude Code  ')

    assert response.status_code == 201
    body = response.json()
    assert body.keys() == {
        'client_id',
        'client_name',
        'redirect_uris',
        'token_endpoint_auth_method',
        'grant_types',
        'response_types',
    }
    assert body['client_id'].startswith('cp_client_')
    assert len(body['client_id']) == len('cp_client_') + 32
    assert body['client_name'] == 'Claude Code'
    assert body['redirect_uris'] == ['http://127.0.0.1/callback']
    assert body['token_endpoint_auth_method'] == 'none'
    assert body['grant_types'] == ['authorization_code', 'refresh_token']
    assert body['response_types'] == ['code']
    with SessionLocal() as db:
        stored = db.scalars(
            select(OauthClient).where(OauthClient.client_id == body['client_id'])
        ).one()
        assert stored.kind == 'dcr'
        assert stored.metadata_fetched_at is None


def test_registration_cuts_the_name_to_200_characters(client: TestClient) -> None:
    response = _register(client, client_name='x' * 250)

    assert response.status_code == 201
    assert response.json()['client_name'] == 'x' * 200


def test_registration_is_open(client: TestClient) -> None:
    # No sign-in, no cookie: the protocol registers before anyone consents
    assert _register(client).status_code == 201


@pytest.mark.parametrize(
    'changes',
    [
        {'token_endpoint_auth_method': 'client_secret_basic'},
        {'token_endpoint_auth_method': 'client_secret_post'},
        {'redirect_uris': []},
        {'redirect_uris': ['http://agent.example/callback']},
        {'redirect_uris': ['http://127.0.0.1/callback', 'http://10.0.0.1/cb']},
        {'redirect_uris': ['javascript:alert(1)']},
        {'redirect_uris': ['https://agent.example/callback#x']},
        {'client_name': '   '},
        {'client_name': None},
        {'redirect_uris': 'http://127.0.0.1/callback'},
    ],
)
def test_registration_refuses_bad_metadata(
    client: TestClient, changes: dict[str, Any]
) -> None:
    response = _register(client, **changes)

    _refused(response, 400, 'invalid_client_metadata')
    assert _count(OauthClient) == 0


# Client ID Metadata Documents


def test_metadata_document_client(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    response = signed_in_client.get(_client_url(METADATA_URL))

    assert response.status_code == 200, response.json()
    assert response.json()['data'] == {
        'client_id': METADATA_URL,
        'client_name': 'Agent Example',
        'kind': 'cimd',
        'current_access_level': None,
    }
    [request] = metadata_host.requests
    assert request.method == 'GET'
    assert str(request.url) == METADATA_URL
    assert request.headers['accept'] == 'application/json'
    with SessionLocal() as db:
        stored = db.scalars(
            select(OauthClient).where(OauthClient.client_id == METADATA_URL)
        ).one()
        assert stored.kind == 'cimd'
        assert stored.redirect_uris == [METADATA_REDIRECT_URI]
        assert stored.metadata_fetched_at is not None


def test_metadata_document_without_a_name_is_named_by_its_host(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    del metadata_host.document['client_name']

    response = signed_in_client.get(_client_url(METADATA_URL))

    assert response.json()['data']['client_name'] == 'agent.example'


def test_metadata_document_name_is_trimmed_and_cut(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    metadata_host.document['client_name'] = '  ' + 'n' * 300

    response = signed_in_client.get(_client_url(METADATA_URL))

    assert response.json()['data']['client_name'] == 'n' * 200


def _not_a_client(response: Response) -> None:
    assert response.status_code == 404, response.json()
    body = response.json()
    assert body['error'] == 'invalid_client'
    assert body['message']


@pytest.mark.parametrize(
    'document_changes',
    [
        {'client_id': 'https://agent.example/other.json'},
        {'redirect_uris': []},
        {'redirect_uris': [1]},
        {'redirect_uris': None},
    ],
)
def test_metadata_document_that_fails_the_checks(
    signed_in_client: TestClient,
    metadata_host: FakeMetadataHost,
    document_changes: dict[str, Any],
) -> None:
    metadata_host.document |= document_changes

    _not_a_client(signed_in_client.get(_client_url(METADATA_URL)))
    assert _count(OauthClient) == 0


def test_metadata_document_that_is_not_an_object(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    metadata_host.answer = lambda _request: Response(200, json=[METADATA_URL])

    _not_a_client(signed_in_client.get(_client_url(METADATA_URL)))


def test_metadata_document_that_is_not_found(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    metadata_host.answer = lambda _request: Response(404)

    _not_a_client(signed_in_client.get(_client_url(METADATA_URL)))


def test_metadata_document_over_64_kb(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    metadata_host.document['padding'] = 'x' * (64 * 1024)

    _not_a_client(signed_in_client.get(_client_url(METADATA_URL)))


def test_metadata_document_over_64_kb_without_a_length(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    body = json.dumps(metadata_host.document | {'padding': 'x' * 70_000}).encode()

    def chunks() -> Iterator[bytes]:
        for start in range(0, len(body), 8192):
            yield body[start : start + 8192]

    metadata_host.answer = lambda _request: Response(200, content=chunks())

    _not_a_client(signed_in_client.get(_client_url(METADATA_URL)))


def test_metadata_document_redirect_is_not_followed(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    metadata_host.answer = lambda request: (
        Response(302, headers={'Location': 'https://agent.example/moved.json'})
        if request.url.path != '/moved.json'
        else Response(200, json=metadata_host.document)
    )

    _not_a_client(signed_in_client.get(_client_url(METADATA_URL)))
    assert len(metadata_host.requests) == 1


def test_metadata_document_that_times_out(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    def time_out(request: Request) -> Response:
        raise httpx2.ReadTimeout('timed out', request=request)

    metadata_host.answer = time_out

    _not_a_client(signed_in_client.get(_client_url(METADATA_URL)))


def test_metadata_document_is_cached_for_24_hours(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    assert signed_in_client.get(_client_url(METADATA_URL)).status_code == 200
    assert signed_in_client.get(_client_url(METADATA_URL)).status_code == 200
    assert len(metadata_host.requests) == 1

    metadata_host.document['client_name'] = 'Agent Example 2'
    with SessionLocal() as db:
        db.execute(
            update(OauthClient)
            .where(OauthClient.client_id == METADATA_URL)
            .values(metadata_fetched_at=now() - timedelta(hours=25))
        )
        db.commit()

    response = signed_in_client.get(_client_url(METADATA_URL))

    assert response.json()['data']['client_name'] == 'Agent Example 2'
    assert len(metadata_host.requests) == 2
    fetched_at = _metadata_fetched_at()
    assert fetched_at is not None and fetched_at > now() - timedelta(minutes=1)
    assert _count(OauthClient) == 1


def test_metadata_document_is_fetched_again_for_another_redirect_uri(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    assert signed_in_client.get(_client_url(METADATA_URL)).status_code == 200
    other_uri = 'https://agent.example/other-callback'
    metadata_host.document['redirect_uris'] = [METADATA_REDIRECT_URI, other_uri]

    response = _authorize(signed_in_client, METADATA_URL, redirect_uri=other_uri)

    assert response.status_code == 200, response.json()
    assert response.json()['data']['redirect_to'].startswith(f'{other_uri}?code=')
    assert len(metadata_host.requests) == 2


def test_metadata_document_redirect_uri_still_unknown_after_fetching_again(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    response = _authorize(
        signed_in_client,
        METADATA_URL,
        redirect_uri='https://agent.example/other-callback',
    )

    _consent_refused(response)
    assert len(metadata_host.requests) == 1


def test_metadata_document_client_exchanges_its_code(
    signed_in_client: TestClient, metadata_host: FakeMetadataHost
) -> None:
    code = _code(signed_in_client, METADATA_URL, redirect_uri=METADATA_REDIRECT_URI)

    response = _exchange(
        signed_in_client, METADATA_URL, code, redirect_uri=METADATA_REDIRECT_URI
    )

    assert response.status_code == 200, response.json()
    # The token endpoint doesn't fetch the document
    assert len(metadata_host.requests) == 1


@pytest.mark.parametrize(
    'client_id',
    [
        'http://agent.example/oauth/client-metadata.json',
        'https://agent.example/oauth/client-metadata.json#x',
        'https://user@agent.example/oauth/client-metadata.json',
        'https://agent.example/' + 'a' * 500,
    ],
)
def test_metadata_document_url_that_is_refused_unfetched(
    signed_in_client: TestClient, no_metadata_fetch: list[Request], client_id: str
) -> None:
    _not_a_client(signed_in_client.get(_client_url(client_id)))


# The consent page's client view


def test_client_view_shows_the_current_access_level(
    signed_in_client: TestClient,
) -> None:
    client_id = _registered(signed_in_client)
    view = signed_in_client.get(_client_url(client_id)).json()['data']
    assert view == {
        'client_id': client_id,
        'client_name': 'Claude Code',
        'kind': 'dcr',
        'current_access_level': None,
    }

    _tokens(signed_in_client, client_id, access_level='drafts')

    view = signed_in_client.get(_client_url(client_id)).json()['data']
    assert view['current_access_level'] == 'drafts'


def test_client_view_is_the_signed_in_accounts(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    _tokens(signed_in_client, client_id)
    other_user = create_user('bob')
    with SessionLocal() as db:
        db.execute(
            update(AgentAuthorization)
            .where(AgentAuthorization.kind == 'oauth')
            .values(user_account_id=other_user)
        )
        db.commit()

    view = signed_in_client.get(_client_url(client_id)).json()['data']

    assert view['current_access_level'] is None


def test_client_view_of_an_unknown_client(
    signed_in_client: TestClient, no_metadata_fetch: list[Request]
) -> None:
    _not_a_client(signed_in_client.get(_client_url('cp_client_unknown')))


def test_client_view_needs_a_sign_in(client: TestClient) -> None:
    client_id = _registered(client)

    response = client.get(_client_url(client_id))

    assert response.status_code == 401


def test_client_view_refuses_a_bearer_without_a_cookie(client: TestClient) -> None:
    client_id = _registered(client)
    _authorization_id, token = create_agent_authorization(create_user(), 'manage')

    response = bearer_client(client, token).get(_client_url(client_id))

    assert response.status_code == 401


# Authorization (the consent page)


def test_allow_answers_the_redirect_with_code_and_state(
    signed_in_client: TestClient,
) -> None:
    client_id = _registered(signed_in_client)

    response = _authorize(signed_in_client, client_id, access_level='manage')

    assert response.status_code == 200
    redirect_to = response.json()['data']['redirect_to']
    assert redirect_to.startswith(f'{REDIRECT_URI}?')
    query = _query_of(redirect_to)
    assert query.keys() == {'code', 'state'}
    assert query['state'] == [STATE]
    code = query['code'][0]
    assert len(code) == 43
    with SessionLocal() as db:
        stored = db.scalars(select(OauthCode)).one()
        assert stored.code_hash == token_hash(code)
        assert stored.access_level == 'manage'
        assert stored.redirect_uri == REDIRECT_URI
        assert stored.code_challenge == CHALLENGE
        assert stored.resource == _mcp_url()
        assert stored.user_account_id == _user_id()
        assert stored.used_at is None
        lifetime = stored.expires_at - now()
        assert timedelta(minutes=4) < lifetime <= timedelta(minutes=5)


def test_allow_without_a_level_gives_read(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)

    tokens = _tokens(signed_in_client, client_id, access_level=None)

    assert tokens['scope'] == 'read'


def test_redirect_keeps_the_redirect_uris_query(signed_in_client: TestClient) -> None:
    redirect_uri = 'https://agent.example/callback?session=1'
    client_id = _registered(signed_in_client, redirect_uris=[redirect_uri])

    response = _authorize(
        signed_in_client, client_id, redirect_uri=redirect_uri, state='a b&c'
    )

    redirect_to = response.json()['data']['redirect_to']
    assert redirect_to.startswith(f'{redirect_uri}&code=')
    query = _query_of(redirect_to)
    assert query['session'] == ['1']
    assert query['state'] == ['a b&c']


def test_deny_answers_access_denied(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)

    response = _authorize(signed_in_client, client_id, decision='deny')

    assert response.status_code == 200
    redirect_to = response.json()['data']['redirect_to']
    assert redirect_to == f'{REDIRECT_URI}?error=access_denied&state={STATE}'
    assert _count(OauthCode) == 0
    assert _count(AgentAuthorization) == 0


def test_loopback_port_may_differ(signed_in_client: TestClient) -> None:
    client_id = _registered(
        signed_in_client, redirect_uris=['http://127.0.0.1:1234/callback']
    )

    response = _authorize(signed_in_client, client_id)

    assert response.status_code == 200, response.json()
    assert response.json()['data']['redirect_to'].startswith(f'{REDIRECT_URI}?code=')


@pytest.mark.parametrize(
    'changes',
    [
        {'code_challenge_method': 'plain'},
        {'code_challenge_method': 'plain', 'code_challenge': VERIFIER},
        {'code_challenge': 'too-short'},
        {'code_challenge': ''},
        {'scope': 'read write'},
        {'scope': 'admin'},
        {'resource': 'https://elsewhere.example/mcp'},
        {'resource': ''},
        {'redirect_uri': 'http://127.0.0.1:53682/other'},
        {'redirect_uri': 'https://agent.example/callback'},
        {'client_id': 'cp_client_unknown'},
    ],
)
@pytest.mark.parametrize('decision', ['allow', 'deny'])
def test_bad_authorization_request(
    signed_in_client: TestClient, changes: dict[str, Any], decision: str
) -> None:
    client_id = _registered(signed_in_client)

    body = _authorize_body(client_id, decision=decision) | changes
    response = signed_in_client.post('/api/oauth/authorize', json=body)

    _consent_refused(response)
    assert _count(OauthCode) == 0


def test_authorization_needs_a_sign_in(client: TestClient) -> None:
    client_id = _registered(client)

    response = _authorize(client, client_id)

    assert response.status_code == 401
    assert _count(OauthCode) == 0


def test_authorization_needs_json(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)

    response = signed_in_client.post(
        '/api/oauth/authorize', data=_authorize_body(client_id)
    )

    assert response.status_code == 415


# The token endpoint: the code exchange


def test_code_exchange_answers_the_tokens(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)

    response = _exchange(signed_in_client, client_id, code)

    assert response.status_code == 200, response.json()
    assert response.headers['cache-control'] == 'no-store'
    body = response.json()
    assert body.keys() == {
        'access_token',
        'token_type',
        'expires_in',
        'refresh_token',
        'scope',
    }
    assert body['token_type'] == 'Bearer'
    assert body['expires_in'] == 3600
    assert body['scope'] == 'read drafts'
    assert body['access_token'].startswith('cp_at_')
    assert len(body['access_token']) == len('cp_at_') + 43
    assert body['refresh_token'].startswith('cp_rt_')
    assert len(body['refresh_token']) == len('cp_rt_') + 43
    [authorization] = _oauth_authorizations()
    assert authorization.user_account_id == _user_id()
    assert authorization.access_level == 'drafts'
    assert authorization.name == ''
    with SessionLocal() as db:
        tokens = {
            token.kind: token
            for token in db.scalars(
                select(AgentToken).where(
                    AgentToken.authorization_id == authorization.id
                )
            )
        }
        assert tokens.keys() == {'access', 'refresh'}
        assert tokens['access'].token_hash == token_hash(body['access_token'])
        assert tokens['refresh'].token_hash == token_hash(body['refresh_token'])
        access_lifetime = tokens['access'].expires_at - now()
        assert timedelta(minutes=59) < access_lifetime <= timedelta(minutes=60)
        refresh_lifetime = tokens['refresh'].expires_at - now()
        assert timedelta(days=29) < refresh_lifetime <= timedelta(days=30)
        code_row = db.scalars(select(OauthCode)).one()
        assert code_row.used_at is not None
    # The access token is the agent's bearer, at the consented level
    me = bearer_client(TestClient(app), body['access_token']).get('/api/agent/me')
    assert me.status_code == 200, me.json()
    assert me.json()['data']['access_level'] == 'drafts'
    assert me.json()['data']['client_name'] == 'Claude Code'
    assert me.json()['data']['kind'] == 'oauth'
    assert me.json()['data']['username'] == TEST_USERNAME


@pytest.mark.parametrize(
    ('level', 'scope'),
    [('read', 'read'), ('drafts', 'read drafts'), ('manage', 'read drafts manage')],
)
def test_scope_is_the_levels_set(
    signed_in_client: TestClient, level: str, scope: str
) -> None:
    client_id = _registered(signed_in_client)

    tokens = _tokens(signed_in_client, client_id, scope='read', access_level=level)

    assert tokens['scope'] == scope


def test_code_exchange_accepts_json(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)

    response = signed_in_client.post(
        '/api/oauth/token',
        json={
            'grant_type': 'authorization_code',
            'code': code,
            'client_id': client_id,
            'redirect_uri': REDIRECT_URI,
            'code_verifier': VERIFIER,
            'resource': _mcp_url(),
        },
    )

    assert response.status_code == 200, response.json()


def test_the_access_token_reads_connections(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    tokens = _tokens(signed_in_client, client_id)

    assert _bearer_status(tokens['access_token']) == 200
    # A refresh token isn't a bearer
    assert _bearer_status(tokens['refresh_token']) == 401


def test_the_token_endpoint_ignores_the_cookie(signed_in_client: TestClient) -> None:
    response = signed_in_client.post('/api/oauth/token', data={})

    _refused(response, 400, 'invalid_request')


def test_a_code_used_twice_revokes_its_tokens(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)
    first = _exchange(signed_in_client, client_id, code)
    assert first.status_code == 200
    access_token = first.json()['access_token']
    assert _bearer_status(access_token) == 200

    second = _exchange(signed_in_client, client_id, code)

    _refused(second, 400, 'invalid_grant')
    assert second.headers['cache-control'] == 'no-store'
    assert _bearer_status(access_token) == 401
    refreshed = _refresh(signed_in_client, client_id, first.json()['refresh_token'])
    _refused(refreshed, 400, 'invalid_grant')
    assert _count(AgentToken) == 0


def test_verifier_mismatch(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)

    response = _exchange(signed_in_client, client_id, code, code_verifier='x' * 43)

    _refused(response, 400, 'invalid_grant')
    assert _count(AgentToken) == 0


def test_verifier_sent_as_plain_challenge(signed_in_client: TestClient) -> None:
    # A client that would use `plain`: its challenge is its verifier
    client_id = _registered(signed_in_client)
    verifier = 'p' * 43
    code = _code(signed_in_client, client_id, code_challenge=s256_challenge(verifier))

    response = _exchange(
        signed_in_client, client_id, code, code_verifier=s256_challenge(verifier)
    )

    _refused(response, 400, 'invalid_grant')


def test_redirect_uri_mismatch(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)

    response = _exchange(
        signed_in_client,
        client_id,
        code,
        redirect_uri='http://127.0.0.1:1111/callback',
    )

    _refused(response, 400, 'invalid_grant')


def test_expired_code(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)
    with SessionLocal() as db:
        db.execute(update(OauthCode).values(expires_at=now() - timedelta(seconds=1)))
        db.commit()

    response = _exchange(signed_in_client, client_id, code)

    _refused(response, 400, 'invalid_grant')


def test_unknown_code(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)

    response = _exchange(signed_in_client, client_id, 'not-a-code')

    _refused(response, 400, 'invalid_grant')


def test_another_client(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    other_client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)

    response = _exchange(signed_in_client, other_client_id, code)

    _refused(response, 401, 'invalid_client')
    # The code stays usable by its own client
    assert _exchange(signed_in_client, client_id, code).status_code == 200


def test_resource_mismatch(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)

    response = _exchange(
        signed_in_client, client_id, code, resource='https://elsewhere.example/mcp'
    )

    _refused(response, 400, 'invalid_target')


@pytest.mark.parametrize(
    'missing',
    ['code', 'client_id', 'redirect_uri', 'code_verifier', 'resource'],
)
@pytest.mark.parametrize('empty', [True, False])
def test_missing_parameter(
    signed_in_client: TestClient, missing: str, empty: bool
) -> None:
    client_id = _registered(signed_in_client)
    params = {
        'grant_type': 'authorization_code',
        'code': _code(signed_in_client, client_id),
        'client_id': client_id,
        'redirect_uri': REDIRECT_URI,
        'code_verifier': VERIFIER,
        'resource': _mcp_url(),
    }
    if empty:
        params[missing] = ''
    else:
        del params[missing]

    response = signed_in_client.post('/api/oauth/token', data=params)

    _refused(response, 400, 'invalid_request')


@pytest.mark.parametrize('grant_type', ['', 'password', 'client_credentials'])
def test_other_grant_type(client: TestClient, grant_type: str) -> None:
    response = client.post('/api/oauth/token', data={'grant_type': grant_type})

    _refused(response, 400, 'invalid_request')
    assert response.headers['cache-control'] == 'no-store'


def test_a_parameter_sent_twice_counts_as_missing(
    signed_in_client: TestClient,
) -> None:
    client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)

    response = signed_in_client.post(
        '/api/oauth/token',
        content=(
            f'grant_type=authorization_code&code={code}&code={code}'
            f'&client_id={client_id}&redirect_uri={quote(REDIRECT_URI, safe="")}'
            f'&code_verifier={VERIFIER}&resource={quote(_mcp_url(), safe="")}'
        ),
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )

    _refused(response, 400, 'invalid_request')


def test_a_new_consent_updates_the_level_and_keeps_one_row(
    signed_in_client: TestClient,
) -> None:
    client_id = _registered(signed_in_client)
    first = _tokens(signed_in_client, client_id, access_level='read')
    [before] = _oauth_authorizations()

    second = _tokens(
        signed_in_client, client_id, scope='read drafts manage', access_level='manage'
    )

    [after] = _oauth_authorizations()
    assert after.id == before.id
    assert after.access_level == 'manage'
    assert after.updated_at > before.updated_at
    assert second['scope'] == 'read drafts manage'
    # The level is the row's: the first connection's token has it too
    assert _bearer_status(first['access_token']) == 200


def test_consents_of_two_clients_are_two_connections(
    signed_in_client: TestClient,
) -> None:
    _tokens(signed_in_client, _registered(signed_in_client))
    _tokens(signed_in_client, _registered(signed_in_client))

    assert len(_oauth_authorizations()) == 2


# The token endpoint: refresh rotation


def test_refresh_rotates_the_pair(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    first = _tokens(signed_in_client, client_id)

    response = _refresh(signed_in_client, client_id, first['refresh_token'])

    assert response.status_code == 200, response.json()
    assert response.headers['cache-control'] == 'no-store'
    second = response.json()
    assert second['token_type'] == 'Bearer'
    assert second['expires_in'] == 3600
    assert second['scope'] == 'read drafts'
    assert second['access_token'] != first['access_token']
    assert second['refresh_token'] != first['refresh_token']
    assert _bearer_status(second['access_token']) == 200
    with SessionLocal() as db:
        old = db.scalars(
            select(AgentToken).where(
                AgentToken.token_hash == token_hash(first['refresh_token'])
            )
        ).one()
        new = db.scalars(
            select(AgentToken).where(
                AgentToken.token_hash == token_hash(second['refresh_token'])
            )
        ).one()
        assert old.replaced_by_id == new.id
        assert new.replaced_by_id is None
    # The new refresh token works in turn
    third = _refresh(signed_in_client, client_id, second['refresh_token'])
    assert third.status_code == 200


def test_reusing_a_retired_refresh_token_revokes_the_connection(
    signed_in_client: TestClient,
) -> None:
    client_id = _registered(signed_in_client)
    first = _tokens(signed_in_client, client_id)
    second = _refresh(signed_in_client, client_id, first['refresh_token']).json()
    assert _bearer_status(second['access_token']) == 200

    reuse = _refresh(signed_in_client, client_id, first['refresh_token'])

    _refused(reuse, 400, 'invalid_grant')
    assert _oauth_authorizations() == []
    assert _count(AgentToken) == 0
    assert _bearer_status(second['access_token']) == 401
    _refused(
        _refresh(signed_in_client, client_id, second['refresh_token']),
        400,
        'invalid_grant',
    )


def test_refresh_answers_the_level_stored_now(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    first = _tokens(signed_in_client, client_id, access_level='drafts')
    with SessionLocal() as db:
        db.execute(update(AgentAuthorization).values(access_level='read'))
        db.commit()

    response = _refresh(signed_in_client, client_id, first['refresh_token'])

    assert response.json()['scope'] == 'read'


def test_refresh_by_another_client(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    other_client_id = _registered(signed_in_client)
    tokens = _tokens(signed_in_client, client_id)

    response = _refresh(signed_in_client, other_client_id, tokens['refresh_token'])

    _refused(response, 400, 'invalid_grant')
    # Not a reuse: the token still works for its client
    assert (
        _refresh(signed_in_client, client_id, tokens['refresh_token']).status_code
        == 200
    )


def test_expired_refresh_token(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    tokens = _tokens(signed_in_client, client_id)
    with SessionLocal() as db:
        db.execute(
            update(AgentToken)
            .where(AgentToken.kind == 'refresh')
            .values(expires_at=now() - timedelta(seconds=1))
        )
        db.commit()

    response = _refresh(signed_in_client, client_id, tokens['refresh_token'])

    _refused(response, 400, 'invalid_grant')


def test_unknown_refresh_token(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)

    response = _refresh(signed_in_client, client_id, 'cp_rt_unknown')

    _refused(response, 400, 'invalid_grant')


def test_access_token_is_not_a_refresh_token(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    tokens = _tokens(signed_in_client, client_id)

    response = _refresh(signed_in_client, client_id, tokens['access_token'])

    _refused(response, 400, 'invalid_grant')


def test_refresh_resource_mismatch(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    tokens = _tokens(signed_in_client, client_id)

    response = _refresh(
        signed_in_client,
        client_id,
        tokens['refresh_token'],
        resource='https://elsewhere.example/mcp',
    )

    _refused(response, 400, 'invalid_target')


def test_refresh_without_a_resource(signed_in_client: TestClient) -> None:
    client_id = _registered(signed_in_client)
    tokens = _tokens(signed_in_client, client_id)

    response = signed_in_client.post(
        '/api/oauth/token',
        data={
            'grant_type': 'refresh_token',
            'refresh_token': tokens['refresh_token'],
            'client_id': client_id,
        },
    )

    assert response.status_code == 200, response.json()


def test_nothing_secret_is_logged(
    signed_in_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level('DEBUG')
    client_id = _registered(signed_in_client)
    code = _code(signed_in_client, client_id)
    tokens = _exchange(signed_in_client, client_id, code).json()
    second = _refresh(signed_in_client, client_id, tokens['refresh_token']).json()
    _refresh(signed_in_client, client_id, tokens['refresh_token'])
    _exchange(signed_in_client, client_id, code)

    text = caplog.text
    for secret in (
        code,
        VERIFIER,
        CHALLENGE,
        tokens['access_token'],
        tokens['refresh_token'],
        second['access_token'],
        second['refresh_token'],
        token_hash(code),
    ):
        assert secret not in text
    assert 'invalid_grant' in text


def _access_record(method: str, path: str, status: int) -> logging.LogRecord:
    """A record as uvicorn's access logger makes it."""
    return logging.LogRecord(
        'uvicorn.access',
        logging.INFO,
        __file__,
        1,
        '%s - "%s %s HTTP/%s" %d',
        ('10.0.0.5:51234', method, path, '1.1', status),
        None,
    )


@pytest.mark.parametrize(
    ('path', 'logged'),
    [
        (f'/api/oauth/token?code=c0de&code_verifier={VERIFIER}', '/api/oauth/token'),
        ('/api/oauth/token?refresh_token=cp_rt_secret', '/api/oauth/token'),
        ('/API/OAuth/authorize?access_token=cp_at_secret', '/API/OAuth/authorize'),
        (
            f'/api/oauth/clients/{quote(METADATA_URL, safe="")}?code=c0de',
            f'/api/oauth/clients/{quote(METADATA_URL, safe="")}',
        ),
    ],
)
def test_the_access_log_shows_no_oauth_query(path: str, logged: str) -> None:
    record = _access_record('POST', path, 400)

    assert RedactReferencesFilter().filter(record) is True

    message = record.getMessage()
    assert message == f'10.0.0.5:51234 - "POST {logged}?<redacted> HTTP/1.1" 400'
    for secret in ('c0de', VERIFIER, 'cp_rt_secret', 'cp_at_secret'):
        assert secret not in message


def test_the_access_log_keeps_other_queries() -> None:
    path = '/api/form-connections/search?status=draft'
    record = _access_record('GET', path, 200)

    assert RedactReferencesFilter().filter(record) is True
    assert path in record.getMessage()


# The worker's steps (research R7)


def _insert_client(kind: str = 'dcr', age: timedelta = timedelta(0)) -> str:
    with SessionLocal() as db:
        client = OauthClient(
            client_id=(
                oauth.new_dcr_client_id()
                if kind == 'dcr'
                else f'https://{oauth.new_secret()[:10]}.example/meta.json'
            ),
            kind=kind,
            client_name='Agent',
            redirect_uris=['http://127.0.0.1/callback'],
            created_at=now() - age,
        )
        db.add(client)
        db.commit()
        return client.id


def _insert_code(client_row_id: str, user_id: str, expires_in: timedelta) -> str:
    with SessionLocal() as db:
        code = OauthCode(
            code_hash=token_hash(oauth.new_secret()),
            client_id=client_row_id,
            user_account_id=user_id,
            redirect_uri=REDIRECT_URI,
            code_challenge=CHALLENGE,
            access_level='read',
            resource=_mcp_url(),
            expires_at=now() + expires_in,
        )
        db.add(code)
        db.commit()
        return code.id


def _insert_authorization(
    user_id: str,
    kind: str = 'oauth',
    client_row_id: str | None = None,
    expires_at: datetime | None = None,
) -> str:
    with SessionLocal() as db:
        authorization = AgentAuthorization(
            user_account_id=user_id,
            kind=kind,
            client_id=client_row_id or (_insert_client() if kind == 'oauth' else None),
            name='' if kind == 'oauth' else 'Token',
            access_level='read',
            expires_at=expires_at,
        )
        db.add(authorization)
        db.commit()
        return authorization.id


def _insert_token(
    authorization_id: str,
    kind: str,
    expires_in: timedelta,
    replaced_by_id: str | None = None,
    updated_ago: timedelta = timedelta(0),
) -> str:
    with SessionLocal() as db:
        token = AgentToken(
            authorization_id=authorization_id,
            kind=kind,
            token_hash=token_hash(oauth.new_secret()),
            expires_at=now() + expires_in,
            replaced_by_id=replaced_by_id,
        )
        db.add(token)
        db.flush()
        token_id = token.id
        db.commit()
    if updated_ago:
        with SessionLocal() as db:
            db.execute(
                update(AgentToken)
                .where(AgentToken.id == token_id)
                .values(updated_at=now() - updated_ago)
            )
            db.commit()
    return token_id


def _ids(model: type[Any]) -> set[str]:
    with SessionLocal() as db:
        return set(db.scalars(select(model.id)).all())


def test_worker_steps_are_registered() -> None:
    # The approval requests' step follows them (test_approval_requests.py)
    assert worker.STEPS[-6:-1] == (
        worker.delete_expired_oauth_codes,
        worker.delete_expired_agent_tokens,
        worker.delete_idle_agent_connections,
        worker.delete_expired_personal_tokens,
        worker.delete_unused_oauth_clients,
    )


def test_worker_deletes_expired_codes() -> None:
    user_id = create_user()
    client_row_id = _insert_client()
    expired = _insert_code(client_row_id, user_id, timedelta(seconds=-1))
    current = _insert_code(client_row_id, user_id, timedelta(minutes=5))

    worker.delete_expired_oauth_codes()

    assert _ids(OauthCode) == {current}
    assert expired not in _ids(OauthCode)


def test_worker_deletes_expired_agent_tokens() -> None:
    user_id = create_user()
    connection = _insert_authorization(user_id)
    personal = _insert_authorization(
        user_id, kind='token', expires_at=now() + timedelta(days=1)
    )
    access_expired = _insert_token(connection, 'access', timedelta(seconds=-1))
    access_current = _insert_token(connection, 'access', timedelta(minutes=5))
    refresh_current = _insert_token(connection, 'refresh', timedelta(days=30))
    refresh_expired = _insert_token(connection, 'refresh', timedelta(seconds=-1))
    retired_long_ago = _insert_token(
        connection,
        'refresh',
        timedelta(days=25),
        replaced_by_id=refresh_current,
        updated_ago=timedelta(days=1, minutes=1),
    )
    retired_recently = _insert_token(
        connection,
        'refresh',
        timedelta(days=29),
        replaced_by_id=refresh_current,
        updated_ago=timedelta(hours=23),
    )
    # A personal access token's row goes with its authorization, not here
    personal_row = _insert_token(personal, 'personal', timedelta(seconds=-1))

    worker.delete_expired_agent_tokens()

    remaining = _ids(AgentToken)
    assert remaining == {
        access_current,
        refresh_current,
        retired_recently,
        personal_row,
    }
    assert not remaining & {access_expired, refresh_expired, retired_long_ago}


def test_worker_deletes_idle_agent_connections() -> None:
    user_id = create_user()
    renewable = _insert_authorization(user_id)
    _insert_token(renewable, 'refresh', timedelta(days=1))
    expired = _insert_authorization(user_id)
    expired_access = _insert_token(expired, 'access', timedelta(minutes=5))
    _insert_token(expired, 'refresh', timedelta(seconds=-1))
    only_retired = _insert_authorization(user_id)
    _insert_token(
        only_retired,
        'refresh',
        timedelta(days=1),
        replaced_by_id='00000000-0000-4000-8000-000000000000',
    )
    without_tokens = _insert_authorization(user_id)
    personal = _insert_authorization(
        user_id, kind='token', expires_at=now() + timedelta(days=1)
    )

    worker.delete_idle_agent_connections()

    assert _ids(AgentAuthorization) == {renewable, personal}
    assert expired_access not in _ids(AgentToken)
    assert not {expired, only_retired, without_tokens} & _ids(AgentAuthorization)


def test_worker_keeps_a_connection_the_agent_keeps_using(
    signed_in_client: TestClient,
) -> None:
    client_id = _registered(signed_in_client)
    tokens = _tokens(signed_in_client, client_id)
    _refresh(signed_in_client, client_id, tokens['refresh_token'])

    worker.delete_idle_agent_connections()

    assert len(_oauth_authorizations()) == 1


def test_worker_deletes_expired_personal_tokens() -> None:
    user_id = create_user()
    expired = _insert_authorization(
        user_id, kind='token', expires_at=now() - timedelta(seconds=1)
    )
    expired_secret = _insert_token(expired, 'personal', timedelta(seconds=-1))
    current = _insert_authorization(
        user_id, kind='token', expires_at=now() + timedelta(days=1)
    )
    connection = _insert_authorization(user_id)

    worker.delete_expired_personal_tokens()

    assert _ids(AgentAuthorization) == {current, connection}
    assert expired_secret not in _ids(AgentToken)


def test_worker_deletes_unused_registrations() -> None:
    user_id = create_user()
    unused = _insert_client(age=timedelta(hours=1, minutes=1))
    recent = _insert_client(age=timedelta(minutes=59))
    used = _insert_client(age=timedelta(days=2))
    _insert_authorization(user_id, client_row_id=used)
    with_code = _insert_client(age=timedelta(hours=2))
    _insert_code(with_code, user_id, timedelta(minutes=5))
    metadata_document = _insert_client(kind='cimd', age=timedelta(days=2))

    worker.delete_unused_oauth_clients()

    assert _ids(OauthClient) == {recent, used, with_code, metadata_document}
    assert unused not in _ids(OauthClient)


def test_worker_steps_log_ids_only(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level('INFO')
    user_id = create_user()
    unused = _insert_client(age=timedelta(hours=2))
    expired = _insert_authorization(
        user_id, kind='token', expires_at=now() - timedelta(seconds=1)
    )
    idle = _insert_authorization(user_id)

    worker.run_steps(
        (
            worker.delete_expired_oauth_codes,
            worker.delete_expired_agent_tokens,
            worker.delete_idle_agent_connections,
            worker.delete_expired_personal_tokens,
            worker.delete_unused_oauth_clients,
        )
    )

    messages = [record.getMessage() for record in caplog.records]
    assert f'Deleted unused OAuth client {unused}' in messages
    assert f'Deleted expired personal access token {expired}' in messages
    assert f'Deleted idle agent connection {idle}' in messages
    assert not [record for record in caplog.records if record.levelname == 'ERROR']
