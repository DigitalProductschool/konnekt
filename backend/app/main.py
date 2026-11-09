import asyncio
import logging
import re
from collections.abc import AsyncIterator, Mapping
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from .config import settings
from .errors import register_exception_handlers
from .language import language_of_scope, request_language
from .routers.agent_access import router as agent_access_router
from .routers.approval_requests import router as approval_requests_router
from .routers.auth import router as auth_router
from .routers.connect import router as connect_router
from .routers.document_types import router as document_types_router
from .routers.form_connections import router as form_connections_router
from .routers.oauth import router as oauth_router
from .routers.option_sets import router as option_sets_router
from .schemas import to_iso_utc
from .services import oauth
from .services.worker import Worker

# The reference in a pull URL, /api/connect/<id>/requests/<reference>, also in a
# branch's, /api/connect/<id>/branches/<branch id>/requests/<reference>. It also
# matches mistyped paths, such as doubled slashes, that reach the log as 404s
_REFERENCE_IN_PATH = re.compile(
    r'(/connect/[^?#\s"]*?/requests/)[^/?#\s"]+', re.IGNORECASE
)


# The query of an OAuth endpoint's URL. The endpoints read none, but a client that
# puts a code, a verifier or a token there would have it logged (spec 007, R18)
_OAUTH_QUERY = re.compile(r'(/api/oauth/[^?#\s"]*)\?[^#\s"]*', re.IGNORECASE)


def redact_references(text: str) -> str:
    """Replace the request reference in pull URLs with `<reference>` (research R13).

    Also replaces the query of an OAuth endpoint's URL with `<redacted>` (spec 007,
    research R18).
    """
    text = _OAUTH_QUERY.sub(r'\1?<redacted>', text)
    return _REFERENCE_IN_PATH.sub(r'\1<reference>', text)


class RedactReferencesFilter(logging.Filter):
    """Keeps request references and OAuth queries out of uvicorn's access log.

    A reference is the key to a request's documents in pull mode, so it must never
    be logged (FR-019), and neither may a code or a token (spec 007, FR-040).
    uvicorn passes the path, with its query, as an argument of the log record.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_references(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(
                redact_references(arg) if isinstance(arg, str) else arg
                for arg in record.args
            )
        elif isinstance(record.args, Mapping):
            record.args = {
                key: redact_references(value) if isinstance(value, str) else value
                for key, value in record.args.items()
            }
        return True


logging.getLogger('uvicorn.access').addFilter(RedactReferencesFilter())


class LanguageMiddleware:
    """Sets the language of a request's texts for its handlers (spec 009, R6).

    Pure ASGI: for an HTTP request it sets `request_language` from the
    `Accept-Language` header, or to English for every path under `/api/connect/`
    whatever the header says (FR-017), by `language_of_scope`, and resets it once
    the app has answered or raised. Plain `def` handlers run in Starlette's
    threadpool with a copy of the context, so services read `current_language()`.
    It never logs the header or the language (FR-018).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return
        token = request_language.set(language_of_scope(scope))
        try:
            await self.app(scope, receive, send)
        finally:
            request_language.reset(token)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Run the background worker while the app is up, unless WORKER_ENABLED=false."""
    worker = Worker() if settings.worker_enabled else None
    if worker is not None:
        worker.start()
    try:
        yield
    finally:
        if worker is not None:
            # Joining the thread blocks, so keep it off the event loop
            await asyncio.to_thread(worker.stop)


app = FastAPI(
    title='serviceBW ↔ EUDI Wallet Middleware',
    description='FastAPI backend with PostgreSQL',
    version='0.1.0',
    lifespan=lifespan,
)

# Starlette makes the middleware added last the outermost. The language middleware
# is added first so that it runs inside CORS, around the exception handlers and the
# routers; the handler of a 5xx runs outside both (see errors.py)
app.add_middleware(LanguageMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Register exception handlers
register_exception_handlers(app)


@app.get('/api/health')
def health_check() -> dict[str, dict[str, str]]:
    """Report that the API is running."""
    return {
        'data': {
            'status': 'ok',
            'timestamp': to_iso_utc(datetime.now(tz=timezone.utc)),
        }
    }


@app.get('/.well-known/oauth-authorization-server')
def oauth_authorization_server() -> JSONResponse:
    """The authorization server's metadata (RFC 8414; spec 007, research R4).

    Open, outside `/api` as the RFC places it, and plain JSON, not the `{data}`
    envelope; clients may cache it for an hour.
    """
    return JSONResponse(
        content=oauth.metadata(), headers={'Cache-Control': 'max-age=3600'}
    )


app.include_router(agent_access_router)
app.include_router(approval_requests_router)
app.include_router(auth_router)
app.include_router(document_types_router)
app.include_router(form_connections_router)
app.include_router(oauth_router)
app.include_router(option_sets_router)
app.include_router(connect_router)
