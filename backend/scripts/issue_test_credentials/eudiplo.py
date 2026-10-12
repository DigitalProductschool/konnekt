"""The EUDIPLO management API calls of the script.

The middleware's own client (app/services/eudiplo.py) covers only its presentation
calls, and the middleware's EUDIPLO client has no issuance role (research R2). This one
signs in as a separate API client with the roles `issuance:manage` (credential
configurations, key chains, trust lists) and `issuance:offer` (offers and their
sessions).

Only fake data passes through here, so unlike the middleware's client it reports
EUDIPLO's error messages: they say which field of a configuration or claim is wrong.
"""

from collections.abc import Mapping
from types import TracebackType
from typing import Any, Self
from urllib.parse import quote

import httpx2

CONNECT_TIMEOUT_SECONDS = 5.0
READ_TIMEOUT_SECONDS = 30.0
ROLES_HINT = (
    'The API client needs the roles issuance:manage and issuance:offer in the tenant.'
)


class IssuanceError(Exception):
    """A problem to report to the user; the script exits with status 1."""


class EudiploIssuer:
    """An authenticated connection to EUDIPLO's management API."""

    def __init__(
        self,
        url: str,
        client_id: str,
        client_secret: str,
        transport: httpx2.BaseTransport | None = None,
    ) -> None:
        self.url = url.rstrip('/')
        self._client_id = client_id
        self._client_secret = client_secret
        self._token: str | None = None
        self._http = httpx2.Client(
            timeout=httpx2.Timeout(
                READ_TIMEOUT_SECONDS, connect=CONNECT_TIMEOUT_SECONDS
            ),
            transport=transport,
        )

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        error_type: type[BaseException] | None,
        error: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self._http.close()

    # Calls

    def get_tenant_id(self) -> str:
        """The id of the client's tenant, from its issuance configuration."""
        response = self._send(
            'GET', '/api/issuer/config', action='reading the issuance configuration'
        )
        tenant_id = _json_object(response).get('tenantId')
        if not isinstance(tenant_id, str):
            raise IssuanceError('EUDIPLO answered the issuance configuration oddly.')
        return tenant_id

    def get_credential_config(self, config_id: str) -> dict[str, Any] | None:
        """Read a credential configuration, or None if there is none with this id."""
        return self._read_if_found(
            f'/api/issuer/credentials/{_segment(config_id)}',
            action=f'reading the credential configuration {config_id}',
        )

    def save_credential_config(self, body: Mapping[str, Any]) -> None:
        """Create a credential configuration, or replace the one with the same id.

        EUDIPLO keeps the stored value of a property the body leaves out, so the body
        should name every property.
        """
        self._send(
            'POST',
            '/api/issuer/credentials',
            action=f'saving the credential configuration {body["id"]}',
            json=body,
        )

    def delete_credential_config(self, config_id: str) -> None:
        """Delete a credential configuration; one that is gone already is fine."""
        response = self._call(
            'DELETE', f'/api/issuer/credentials/{_segment(config_id)}'
        )
        if response.status_code != 404:
            _raise_for_status(
                response, f'deleting the credential configuration {config_id}'
            )

    def get_issuer_metadata(self, tenant_id: str) -> httpx2.Response:
        """The tenant's public issuer metadata, as a wallet fetches it."""
        try:
            return self._http.get(
                f'{self.url}/.well-known/openid-credential-issuer/issuers/'
                f'{_segment(tenant_id)}',
                headers={'Accept': 'application/json'},
            )
        except httpx2.HTTPError as error:
            raise _unreachable(self.url, error) from None

    def create_offer(self, body: Mapping[str, Any]) -> dict[str, Any]:
        """Create a credential offer: `session` and the wallet link `uri`."""
        response = self._send(
            'POST', '/api/issuer/offer', action='creating the offer', json=body
        )
        offer = _json_object(response)
        if not isinstance(offer.get('uri'), str):
            raise IssuanceError('EUDIPLO answered the offer without a wallet link.')
        return offer

    def get_session(self, session_id: str) -> dict[str, Any]:
        """Read the issuance session of an offer."""
        response = self._send(
            'GET',
            f'/api/session/{_segment(session_id)}',
            action='reading the offer session',
        )
        return _json_object(response)

    def list_key_chains(self) -> list[dict[str, Any]]:
        """The tenant's key chains."""
        response = self._send('GET', '/api/key-chain', action='listing key chains')
        key_chains = response.json()
        if not isinstance(key_chains, list):
            raise IssuanceError('EUDIPLO answered the key chain list with no list.')
        return [key_chain for key_chain in key_chains if isinstance(key_chain, dict)]

    def get_trust_list(self, trust_list_id: str) -> dict[str, Any] | None:
        """Read a trust list, or None if there is none with this id."""
        return self._read_if_found(
            f'/api/trust-list/{_segment(trust_list_id)}',
            action=f'reading the trust list {trust_list_id}',
        )

    # Plumbing

    def _sign_in(self) -> str:
        if self._token is None:
            try:
                response = self._http.post(
                    f'{self.url}/api/oauth2/token',
                    data={
                        'grant_type': 'client_credentials',
                        'client_id': self._client_id,
                        'client_secret': self._client_secret,
                    },
                )
            except httpx2.HTTPError as error:
                raise _unreachable(self.url, error) from None
            if response.status_code in (400, 401):
                raise IssuanceError(
                    'EUDIPLO rejected the API client: check EUDIPLO_ISSUER_CLIENT_ID '
                    'and EUDIPLO_ISSUER_CLIENT_SECRET.'
                )
            _raise_for_status(response, 'signing in')
            token = _json_object(response).get('access_token')
            if not isinstance(token, str):
                raise IssuanceError('EUDIPLO answered the sign-in without a token.')
            self._token = token
        return self._token

    def _send(
        self, method: str, path: str, *, action: str, json: Any = None
    ) -> httpx2.Response:
        response = self._call(method, path, json)
        _raise_for_status(response, action)
        return response

    def _read_if_found(self, path: str, *, action: str) -> dict[str, Any] | None:
        response = self._call('GET', path)
        if response.status_code == 404:
            return None
        _raise_for_status(response, action)
        return _json_object(response)

    def _call(self, method: str, path: str, json: Any = None) -> httpx2.Response:
        headers = {
            'Authorization': f'Bearer {self._sign_in()}',
            'Accept': 'application/json',
        }
        try:
            return self._http.request(
                method, f'{self.url}{path}', headers=headers, json=json
            )
        except httpx2.HTTPError as error:
            raise _unreachable(self.url, error) from None


def _segment(value: str) -> str:
    return quote(value, safe='')


def _unreachable(url: str, error: httpx2.HTTPError) -> IssuanceError:
    return IssuanceError(
        f"Couldn't reach EUDIPLO at {url} ({type(error).__name__}): check EUDIPLO_URL."
    )


def _raise_for_status(response: httpx2.Response, action: str) -> None:
    if response.is_success:
        return
    if response.status_code == 403:
        raise IssuanceError(f'EUDIPLO refused {action} (403). {ROLES_HINT}')
    detail = error_message(response)
    raise IssuanceError(
        f'EUDIPLO answered {response.status_code} to {action}'
        + (f': {detail}' if detail else '.')
    )


def error_message(response: httpx2.Response) -> str:
    """EUDIPLO's explanation of an error, from its JSON body."""
    try:
        body = response.json()
    except ValueError:
        return response.text[:500].strip()
    if not isinstance(body, dict):
        return ''
    message = body.get('message') or body.get('error_description') or body.get('error')
    if isinstance(message, list):
        return '; '.join(str(item) for item in message)
    return str(message) if message else ''


def _json_object(response: httpx2.Response) -> dict[str, Any]:
    try:
        body = response.json()
    except ValueError:
        body = None
    if not isinstance(body, dict):
        raise IssuanceError('EUDIPLO answered with something other than a JSON object.')
    return body
