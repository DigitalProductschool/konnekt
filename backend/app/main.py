import asyncio
import logging
import re
from collections.abc import AsyncIterator, Mapping
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .errors import register_exception_handlers
from .routers.auth import router as auth_router
from .routers.connect import router as connect_router
from .routers.document_types import router as document_types_router
from .routers.form_connections import router as form_connections_router
from .schemas import to_iso_utc
from .services.worker import Worker

# The reference in a pull URL, /api/connect/<id>/requests/<reference>. It also
# matches mistyped paths, such as doubled slashes, that reach the log as 404s
_REFERENCE_IN_PATH = re.compile(
    r'(/connect/[^?#\s"]*?/requests/)[^/?#\s"]+', re.IGNORECASE
)


def redact_references(text: str) -> str:
    """Replace the request reference in pull URLs with `<reference>` (research R13)."""
    return _REFERENCE_IN_PATH.sub(r'\1<reference>', text)


class RedactReferencesFilter(logging.Filter):
    """Keeps request references out of uvicorn's access log.

    A reference is the key to a request's documents in pull mode, so it must never
    be logged (FR-019). uvicorn passes the path, with its query, as an argument of
    the log record.
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


app.include_router(auth_router)
app.include_router(document_types_router)
app.include_router(form_connections_router)
app.include_router(connect_router)
