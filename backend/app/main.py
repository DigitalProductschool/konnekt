from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .errors import register_exception_handlers
from .routers.id_verification import router as id_verification_router
from .routers.team_members import router as team_members_router

# Import our routers here
# from .routers.example import router as example_router


app = FastAPI(
    title='DPS Template API',
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


@app.get('/')
async def root() -> dict[str, str]:
    return {'message': 'Welcome to DPS Template API'}


@app.get('/api/health')
def health_check() -> dict[str, str]:
    return {
        'status': 'ok',
        'timestamp': datetime.now(tz=timezone.utc).isoformat().replace('+00:00', 'Z'),
        'api_key': settings.api_key,
    }


# Include our routers here
# app.include_router(example_router)
app.include_router(team_members_router)
app.include_router(id_verification_router)
