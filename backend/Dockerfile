# Production Dockerfile for FastAPI backend
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install uv (pinned — a floating :latest tag makes builds unreproducible)
COPY --from=ghcr.io/astral-sh/uv:0.12.9 /uv /usr/local/bin/uv

# Copy dependency files. The lockfile is required, not optional: a build that
# silently re-resolves is a build that ships untested versions.
COPY backend/pyproject.toml backend/uv.lock ./

# Install dependencies. No `|| uv sync` fallback — a stale lock must fail loudly.
RUN uv sync --frozen --no-dev

# Copy application code
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./alembic.ini

EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-3000}"]
