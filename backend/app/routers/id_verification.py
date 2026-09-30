import random
import secrets
import threading
from dataclasses import dataclass
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from ..schemas import AskIdResponse, PersonIdResponse

router = APIRouter(prefix='/api', tags=['id-verification'])

_FIRST_NAMES = [
    'Anna',
    'Max',
    'Lena',
    'Paul',
    'Mia',
    'Leon',
    'Emma',
    'Finn',
    'Laura',
    'Noah',
]
_LAST_NAMES = [
    'Müller',
    'Schmidt',
    'Fischer',
    'Weber',
    'Wagner',
    'Becker',
    'Hoffmann',
    'Schulz',
    'Koch',
    'Richter',
]
_NATIONALITIES = [
    'German',
    'Italian',
    'French',
    'Spanish',
    'Polish',
    'Austrian',
    'Dutch',
    'Swiss',
]

_BIRTHDATE_RANGE_START = date(1950, 1, 1)
_BIRTHDATE_RANGE_DAYS = (date(2005, 12, 31) - _BIRTHDATE_RANGE_START).days


@dataclass
class _PendingId:
    """An in-memory, not-yet-confirmed identity request."""

    status: str  # 'pending' or 'available'
    data: PersonIdResponse


# In-memory only, per the task: no DB table is needed for this handshake. State
# is lost on restart and not shared across multiple backend replicas.
_store: dict[str, _PendingId] = {}
_store_lock = threading.Lock()


def _generate_mock_person() -> PersonIdResponse:
    """Build a fresh, randomized mock identity for a single ask-id request."""
    birthdate = _BIRTHDATE_RANGE_START + timedelta(
        days=random.randint(0, _BIRTHDATE_RANGE_DAYS)
    )

    return PersonIdResponse(
        name=random.choice(_FIRST_NAMES),
        surname=random.choice(_LAST_NAMES),
        birthdate=birthdate.isoformat(),
        nationality=random.choice(_NATIONALITIES),
    )


@router.post('/ask-id', status_code=201)
def ask_id(request: Request) -> dict[str, dict[str, str] | str]:
    """Start a new identity request.

    Generates a one-time token with its own randomized mock identity, held
    pending until the returned link is opened, and returns that link + token.
    """
    token = secrets.token_urlsafe(24)

    with _store_lock:
        _store[token] = _PendingId(status='pending', data=_generate_mock_person())

    # Built from the request instead of url_for(): in production this request
    # arrives through the frontend's nginx proxy (the only public entrypoint),
    # which forwards the original Host and X-Forwarded-Proto — using those
    # gives back a link on the public origin rather than the internal backend.
    scheme = request.headers.get('x-forwarded-proto', request.url.scheme)
    host = request.headers.get('host', request.url.netloc)
    link = f'{scheme}://{host}/api/ask-id/confirm/{token}'

    return {
        'data': AskIdResponse(link=link, token=token).model_dump(),
        'message': 'Identity request created',
    }


@router.get('/ask-id/confirm/{token}', response_class=HTMLResponse)
def confirm_id(token: str) -> HTMLResponse:
    """Confirm a pending identity request.

    This is the link handed out by `/ask-id`: opening it is what marks the
    token as available for `/get-id` to return.
    """
    with _store_lock:
        pending = _store.get(token)
        if pending is None:
            return HTMLResponse(
                '<!doctype html><html><body>'
                '<p>This link is invalid or has expired.</p>'
                '</body></html>',
                status_code=404,
            )
        pending.status = 'available'

    return HTMLResponse(
        '<!doctype html><html><body>'
        '<p>Identity confirmed. You may close this page and return to the app.</p>'
        '</body></html>'
    )


@router.get('/get-id/{token}')
def get_id(token: str) -> dict[str, dict[str, str]]:
    """Fetch the mock identity data for a confirmed token.

    404s while the token is unknown or still pending confirmation. The token
    is single-use: a successful fetch consumes it, and later calls 404 too.
    """
    with _store_lock:
        pending = _store.get(token)

        if pending is None or pending.status != 'available':
            raise HTTPException(
                status_code=404,
                detail={
                    'error': 'Not found',
                    'message': 'Identity data not available for this token',
                },
            )

        data = pending.data
        del _store[token]

    return {'data': data.model_dump()}
