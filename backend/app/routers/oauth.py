"""The OAuth endpoints (spec 007, contracts/oauth.md, research R4).

`register` and `token` are open, as the protocol needs, and answer RFC 7591 and
RFC 6749 bodies, not the `{data}` envelope (constitution I): their refusals are
answered here as `JSONResponse`s, since the exception handlers pass only
`{error, message}` details through. The consent page's endpoints, `clients` and
`authorize`, need the team member's browser session and answer the envelope.
"""

import json
from typing import Any
from urllib.parse import parse_qs

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import UserAccount
from ..schemas import (
    ApiResponse,
    AuthorizeRequest,
    AuthorizeResponse,
    OauthClientView,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from ..services import oauth
from ..services.auth import get_current_user, require_json

# Token answers are never cached (RFC 6749 5.1)
NO_STORE = {'Cache-Control': 'no-store'}

router = APIRouter(prefix='/api/oauth', tags=['oauth'])


def _rfc_error(
    error: oauth.OauthError, headers: dict[str, str] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code, content=error.body(), headers=headers
    )


async def token_parameters(request: Request) -> dict[str, str]:
    """The token request's parameters, from a form or a JSON body.

    RFC 6749 sends `application/x-www-form-urlencoded`; JSON is accepted too. Only
    string values count, and a parameter sent twice counts as missing (RFC 6749
    3.2). A body that can't be read gives no parameters, so the grant answers
    `invalid_request`. Reading the body is the only work done here.
    """
    body = await request.body()
    content_type = request.headers.get('content-type', '')
    media_type = content_type.split(';', 1)[0].strip().lower()
    if media_type == 'application/json':
        try:
            data = json.loads(body)
        except ValueError:
            return {}
        if not isinstance(data, dict):
            return {}
        return {key: value for key, value in data.items() if isinstance(value, str)}
    try:
        form = parse_qs(body.decode('utf-8'), keep_blank_values=True)
    except UnicodeDecodeError:
        return {}
    return {key: values[0] for key, values in form.items() if len(values) == 1}


@router.post(
    '/register',
    status_code=status.HTTP_201_CREATED,
    response_model=RegisterResponse,
)
def register_client(
    payload: dict[str, Any] = Body(...), db: Session = Depends(get_db)
) -> RegisterResponse | JSONResponse:
    """Register a public client dynamically (RFC 7591), without a secret.

    Open, JSON. Answers `201` with the registration, or `400
    invalid_client_metadata` for metadata that doesn't fit: a missing name, a
    secret authentication method, no redirect URI, or a non-loopback `http://` one.
    """
    try:
        data = RegisterRequest.model_validate(payload)
    except ValidationError:
        return _rfc_error(
            oauth.refusal(
                'invalid_client_metadata',
                'The registration needs client_name and redirect_uris.',
            )
        )
    try:
        return oauth.register_client(db, data)
    except oauth.OauthError as error:
        return _rfc_error(error)


@router.get('/clients/{client_id:path}')
def get_client(
    client_id: str,
    user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[OauthClientView]:
    """The client the consent page names, with the account's current level for it.

    Browser session only. A Client ID Metadata Document is fetched when it isn't
    cached or is older than a day. An unknown client, or a document that can't be
    fetched or fails the checks, answers `404 invalid_client`.
    """
    try:
        view = oauth.client_view(db, user, client_id)
    except oauth.OauthError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'error': 'invalid_client', 'message': error.message},
        ) from None
    return ApiResponse(data=view)


@router.post('/authorize', dependencies=[Depends(require_json)])
def authorize(
    data: AuthorizeRequest,
    user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[AuthorizeResponse]:
    """The team member's consent: where the consent page sends the browser.

    Browser session only. `allow` answers the redirect URI with `code` and
    `state`, `deny` with `error=access_denied` and `state`. A bad request (unknown
    client, redirect URI mismatch, a challenge that isn't S256, a `resource` other
    than `MCP_URL`, an unknown scope) answers `400 invalid_request`, and the page
    shows it without redirecting.
    """
    return ApiResponse(data=oauth.authorize(db, user, data))


@router.post('/token', response_model=TokenResponse)
def token(
    response: Response,
    params: dict[str, str] = Depends(token_parameters),
    db: Session = Depends(get_db),
) -> TokenResponse | JSONResponse:
    """Exchange an authorization code, or a refresh token, for tokens (RFC 6749).

    Open, never the cookie; a form or JSON body. `grant_type=authorization_code`
    takes `code`, `client_id`, `redirect_uri`, `code_verifier` and `resource`;
    `grant_type=refresh_token` takes `refresh_token`, `client_id` and an optional
    `resource`. Refusals are RFC 6749 bodies: `invalid_request`, `invalid_grant`,
    `invalid_target`, and `401 invalid_client`. Every answer is `no-store`.
    """
    response.headers.update(NO_STORE)
    try:
        return oauth.token_grant(db, params)
    except oauth.OauthError as error:
        return _rfc_error(error, NO_STORE)
