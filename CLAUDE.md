# AI Agent Instructions - DPS FastAPI React Template

This file provides context for AI coding agents (Claude Code, GitHub Copilot, OpenAI Codex/ChatGPT, Cursor, etc.).

Also read all the files in `./docs` for more specific context (like ARCHITECTURE and KERN). Load them into the context only if they are relevant.

## Project Overview

Full-stack application with separate frontend and backend:

- `/frontend` - React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + KERN design system
- `/backend` - FastAPI (Python 3.13+) + SQLAlchemy 2 + Alembic + psycopg 3 + PostgreSQL

The backend uses a **synchronous** SQLAlchemy `Session`, not `AsyncSession`.
Route handlers are plain `def`, and FastAPI runs them in a threadpool. Do not
introduce `async def` handlers that touch the database.

## Key Patterns

### Backend API Routes

Location: `/backend/app/routers/` or `/backend/app/main.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Item
from ..schemas import ItemCreate, ItemResponse, ItemUpdate

router = APIRouter(prefix="/api/items", tags=["items"])


@router.get("/", response_model=list[ItemResponse])
def get_items(db: Session = Depends(get_db)) -> list[Item]:
    """Get all items."""
    return list(db.scalars(select(Item).order_by(Item.created_at.desc())).all())


@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(item: ItemCreate, db: Session = Depends(get_db)) -> Item:
    """Create a new item."""
    db_item = Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: str, db: Session = Depends(get_db)) -> Item:
    """Get a specific item."""
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=404,
            detail={"error": "Not found", "message": "Item not found"},
        )
    return item
```

Key points:
- Use `APIRouter` for route organization
- Type hints for all parameters and return values
- Use Pydantic models for request/response validation
- Use the **sync** `Session` with 2.0-style `select()` / `db.get()` — not
  `AsyncSession`, and not the legacy `db.query()` API
- Use `Depends()` for dependency injection
- Raise `HTTPException` with a `{'error': ..., 'message': ...}` detail dict so
  the handler in `app/errors.py` passes it through unchanged
- Include docstrings for endpoints

### Pydantic Schemas

Location: `/backend/app/schemas.py`

```python
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


class ItemBase(BaseModel):
    """Base item schema."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class ItemCreate(ItemBase):
    """Schema for creating an item."""

    pass


class ItemUpdate(BaseModel):
    """Schema for updating an item."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class ItemResponse(ItemBase):
    """Schema for item response."""

    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

Key points:
- Use Pydantic v2 with `BaseModel`
- Separate schemas for Create, Update, and Response
- Use `Field()` for validation
- Use `ConfigDict(from_attributes=True)` for ORM mapping

### SQLAlchemy Models

Location: `/backend/app/models.py`

```python
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
import uuid

from .db import Base


class Item(Base):
    """Item model."""

    __tablename__ = "items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

Key points:
- Use SQLAlchemy 2.0+ style with `Mapped` and `mapped_column`
- Use `uuid.uuid4()` for IDs (or consider `nanoid` or `cuid2`)
- Always include `created_at` and `updated_at`
- Use `DateTime(timezone=True)` with `server_default=func.now()`. Never use
  `datetime.utcnow` — it is deprecated. If you need a Python-side timestamp,
  use `datetime.now(tz=timezone.utc)`.
- Use appropriate column types (String, Text, Integer, Boolean, etc.)
- Add indexes for fields used in queries

### Frontend API Functions

Location: `/frontend/src/api/`

Shared helpers live in `src/api/client.ts`: `API_BASE_URL`, the normalized base URL
ending in `/api` (`VITE_API_URL` in local dev, the relative `/api` path in production,
which nginx proxies to the backend container), `handleResponse` and `ApiError`. Each
resource gets its own module next to it.

```typescript
import type { ApiResponse } from '../types/api';
import type { Item, ItemCreate } from '../types/items';
import { API_BASE_URL, handleResponse } from './client';

export async function getItems(): Promise<Item[]> {
  const response = await fetch(`${API_BASE_URL}/items`);
  const result = await handleResponse<ApiResponse<Item[]>>(response);
  return result.data;
}

export async function createItem(data: ItemCreate): Promise<Item> {
  const response = await fetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleResponse<ApiResponse<Item>>(response);
  return result.data;
}
```

Key points:
- Use native `fetch` API, with URLs built from `API_BASE_URL`
- Pass every response through `handleResponse`; it throws an `ApiError` carrying the
  `{error, message}` body when the request failed
- Unwrap the `{data, message?}` envelope and return `data`
- Define TypeScript interfaces in `src/types/`, matching the backend Pydantic schemas
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Include `Content-Type` header for JSON requests

## Coding Standards

### Python (Backend)

- **Formatter**: Ruff (configured in `pyproject.toml`)
- **Linter**: Ruff
- **Type checker**: mypy
- **Line width**: 88 characters (Ruff default)
- **Quotes**: Single quotes preferred
- **Imports**: Sorted with isort rules (E, F, I)
- **Docstrings**: Use for all public functions, classes, and modules
- **Sync DB access**: Database operations use the synchronous SQLAlchemy
  `Session`. Route handlers that touch the database are plain `def`.

### TypeScript (Frontend)

- **Quotes**: Single quotes
- **Semicolons**: Yes
- **Line width**: 100 characters
- **Indentation**: 2 spaces
- **Trailing commas**: ES5 style
- **Import order**: External deps first, then relative

## Naming Conventions

### Python (Backend)

| Item | Convention | Example |
|------|------------|---------|
| Files | snake_case | `team_members.py` |
| Classes | PascalCase | `TeamMember` |
| Functions | snake_case | `get_team_member()` |
| Variables | snake_case | `team_member` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Pydantic models | PascalCase | `TeamMemberCreate` |
| Database tables | snake_case | `team_members` |
| Database columns | snake_case | `git_handle` |
| Router tags | lowercase | `'team-members'` |

### TypeScript (Frontend)

| Item | Convention | Example |
|------|------------|---------|
| React components | PascalCase | `TeamMemberCard.tsx` |
| Utility files | camelCase | `formatDate.ts` |
| API files | kebab-case | `team-members.ts` |
| TypeScript interfaces | PascalCase | `TeamMember` |
| Type request/response | PascalCase | `TeamMemberCreate` |
| Variables | camelCase | `teamMember` |
| CSS classes | kebab-case (Tailwind) | `bg-dps-blue-500` |

## Commands

### Backend (Python)

| Command | Description |
|---------|-------------|
| `cd backend` | Navigate to backend directory |
| `uv sync` | Install dependencies (includes the `dev` group) |
| `uv sync --no-dev` | Install runtime dependencies only, as production does |
| `uv run uvicorn app.main:app --reload` | Start dev server |
| `uv run ruff check .` | Lint code |
| `uv run ruff check --fix .` | Fix lint issues |
| `uv run ruff format .` | Format code |
| `uv run mypy app/ tests/` | Type check |
| `uv run pre-commit install` | Install the repo's git hooks |
| `uv run pre-commit run --all-files` | Run every hook against the whole repo |
| `uv lock --upgrade` | Refresh `uv.lock` to the newest allowed versions |
| `uv run alembic revision --autogenerate -m "msg"` | Create migration |
| `uv run alembic upgrade head` | Run migrations |

### Frontend (TypeScript)

| Command | Description |
|---------|-------------|
| `cd frontend` | Navigate to frontend directory |
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with `--fix` |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting without writing |

### Docker

| Command | Description |
|---------|-------------|
| `docker compose up` | Start all services |
| `docker compose up postgres -d` | Start only database |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and remove volumes |

## Adding Features

### Backend

1. **Model**: Create SQLAlchemy model in `/backend/app/models.py`
2. **Schema**: Create Pydantic schemas in `/backend/app/schemas.py`
3. **Migration**: Run `uv run alembic revision --autogenerate -m "add feature"` and `uv run alembic upgrade head`
4. **Router**: Create router in `/backend/app/routers/` or add to `/backend/app/main.py`
5. **Register**: Include router in main app: `app.include_router(router)`
6. **Settings**: If the feature needs a new environment variable, add a field to
   `Settings` in `/backend/app/config.py` — undeclared variables are ignored

### Frontend

6. **Types**: Define TypeScript interfaces in `/frontend/src/types/`
7. **API client**: Create functions in `/frontend/src/api/`
8. **UI**: Build React components using the API functions

### Full Stack Example

```bash
# Backend
cd backend
# 1. Add model to app/models.py
# 2. Add schemas to app/schemas.py
# 3. Generate migration
uv run alembic revision --autogenerate -m "add items"
uv run alembic upgrade head
# 4. Add router to app/routers/items.py
# 5. Register in app/main.py

# Frontend
cd frontend
# 6. Add types to src/types/items.ts and API functions to src/api/items.ts
# 7. Create components in src/components/items/
```

## Frontend Development Guidelines

- Use Tailwind CSS utility classes
- Font: Plus Jakarta Sans (via `font-sans` class)
- Custom theme values are defined in `index.css` using the `@theme` directive
- The KERN design system is imported in `index.css`: KERN's CSS after Tailwind, then the KERN
  Tailwind theme, which turns KERN's design tokens into Tailwind classes. Keep that order, and
  see `docs/KERN-DESIGN-SYSTEM.md` for the components and tokens
- Maintain components that you create small, extract new functionality to new components.
- When you are declaring types needed in the component, extract them to separate types.ts file in the directory next to the component itself
- When you are declaring constants needed in the component, extract them to separate constants.ts file in the directory next to the component itself.
- If your component uses utility functions independent from component state logic, extract them to separate utils.ts file in the directory next to the component itself.
- If your component has several state variables, use useReducer hook with actions to extract functionality.
- If your component is mapping some jsx code to a list of items, extract that code to a separate sub-component.

## Do Not

### Backend

- Perform blocking I/O inside an `async def` handler — either make the handler a
  plain `def` (FastAPI will run it in a threadpool) or await a real async client
- Use `AsyncSession`, or the legacy `db.query(...)` API — use the sync `Session`
  with 2.0-style `select()` / `db.get()`
- Use `datetime.utcnow()` (deprecated) — use `datetime.now(tz=timezone.utc)`
- Commit `.env` files (create `.env.example` instead)
- Use `print()` for logging (use FastAPI's logger or `logging` module)
- Ignore type hints (mypy should pass)
- Declare a dependency in `pyproject.toml` that the code does not import

### Frontend

- Commit `.env` or `.env.local` files (use `.env.example`)
- Use inline styles (use Tailwind classes)
- Use `require()` (use ES imports)
- Use `any` type without justification

### General

- Commit sensitive data (API keys, passwords, tokens)
- Modify auto-generated files (Alembic migrations after creation)

## Project Structure Details

### Backend Structure

```
backend/
├── app/
│   ├── __init__.py       # Minimum Python version guard
│   ├── main.py           # FastAPI app, routers registration
│   ├── config.py         # Settings with pydantic-settings
│   ├── db.py             # Base, engine, sessionmaker, get_db dependency
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   ├── errors.py         # Exception handlers
│   └── routers/          # API routers, one module per resource
│       └── __init__.py
├── alembic/              # Database migrations
├── tests/                # Tests
├── .python-version       # Interpreter uv provisions (3.13)
├── pyproject.toml        # Dependencies + ruff/mypy/pytest config
└── uv.lock              # Lock file
```

Note: the database module is `app/db.py`, not `app/database.py`. Pytest, ruff,
and mypy are all configured in `pyproject.toml` — do not add a `pytest.ini`, as
it takes precedence and would silently shadow that config.

### Frontend Structure

```
frontend/
├── src/
│   ├── api/              # API client functions
│   ├── components/       # React components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── public/               # Static assets
├── package.json
└── vite.config.ts
```

## Documentation Checklist

When making changes, update documentation if:

- [ ] New environment variables → Update README.md, docs/ARCHITECTURE.md and .env.example files
- [ ] New patterns or conventions → Update CLAUDE.md
- [ ] Architectural changes → Update docs/ARCHITECTURE.md
- [ ] New dependencies → Document in README.md why they were added
