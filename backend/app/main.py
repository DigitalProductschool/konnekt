import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .errors import register_exception_handlers
from .routers.auth import router as auth_router
from .routers.document_types import router as document_types_router
from .routers.form_connections import router as form_connections_router
from .schemas import to_iso_utc
from .services.worker import Worker


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
