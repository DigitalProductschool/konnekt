from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .errors import register_exception_handlers
from .schemas import to_iso_utc

# Import our routers here
# from .routers.example import router as example_router


app = FastAPI(
    title='serviceBW ↔ EUDI Wallet Middleware',
    description='FastAPI backend with PostgreSQL',
    version='0.1.0',
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


# Include our routers here
# app.include_router(example_router)
