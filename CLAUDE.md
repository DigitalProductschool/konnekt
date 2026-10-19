# AI Agent Instructions - DPS FastAPI React Template

This file provides context for AI coding agents (Claude Code, GitHub Copilot, OpenAI Codex/ChatGPT, Cursor, etc.).

Also read all the files in `./docs` for more specific context (like ARCHITECTURE and KERN). Load them into the context only if they are relevant.

## Project Overview

Full-stack application with separate frontend and backend:

- `/frontend` - React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + React Router 7 + KERN design system
- `/backend` - FastAPI (Python 3.13+) + SQLAlchemy 2 + Alembic + psycopg 3 + PostgreSQL, with a
  background worker thread and a client for the EUDIPLO management API

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
from ..schemas import ApiResponse, ItemCreate, ItemResponse
from ..services.auth import get_current_user, require_json

# Management endpoints need a signed-in DO.IT team member
router = APIRouter(
    prefix="/api/items", tags=["items"], dependencies=[Depends(get_current_user)]
)


@router.get("")
def list_items(db: Session = Depends(get_db)) -> ApiResponse[list[ItemResponse]]:
    """List all items, newest first."""
    items = db.scalars(select(Item).order_by(Item.created_at.desc())).all()
    return ApiResponse(data=[ItemResponse.model_validate(item) for item in items])


@router.post(
    "", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_json)]
)
def create_item(
    item: ItemCreate, db: Session = Depends(get_db)
) -> ApiResponse[ItemResponse]:
    """Create an item."""
    db_item = Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return ApiResponse(
        data=ItemResponse.model_validate(db_item), message="Item created"
    )


@router.get("/{item_id}")
def get_item(item_id: str, db: Session = Depends(get_db)) -> ApiResponse[ItemResponse]:
    """Get one item."""
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "message": "Item not found"},
        )
    return ApiResponse(data=ItemResponse.model_validate(item))
```

Key points:
- Use `APIRouter` for route organization
- Type hints for all parameters and return values
- Use Pydantic models for request/response validation
- Answer with the `{data, message?}` envelope: annotate the handler with
  `ApiResponse[...]` and return `ApiResponse(data=..., message=...)`, with
  `data=None` when there is nothing to return
- Management routers depend on `get_current_user` (401 without a session), and
  their `POST`, `PUT` and `DELETE` endpoints also on `require_json` (415 without
  a JSON body, the CSRF protection). Only `/api/health`, the sign-in, and the
  serviceBW endpoints under `/api/connect/` (restricted by the network instead)
  are open
- Keep routers thin: domain logic goes into `app/services/` (see below)
- Use the **sync** `Session` with 2.0-style `select()` / `db.get()` — not
  `AsyncSession`, and not the legacy `db.query()` API
- Use `Depends()` for dependency injection
- Raise `HTTPException` with a `{'error': ..., 'message': ...}` detail dict so
  the handler in `app/errors.py` passes it through unchanged
- A `5xx` answer never says what went wrong: its message stays generic, and it adds
  `'error_id': log_server_error(error, '<what failed>')` from `app/errors.py`, which
  logs the cause under that ID. Unexpected exceptions get this from the catch-all
  handler
- Include docstrings for endpoints

### Services and the Background Worker

Location: `/backend/app/services/`

- **Services** hold the domain logic that the routers and the worker share. A
  service function takes the `Session` as its first argument and raises
  `HTTPException` with the `{error, message}` detail.
- **EUDIPLO**: get the client with `get_eudiplo_client()` from
  `services/eudiplo.py`, and turn its `EudiploError`s into the API's answer with
  `http_error_for(error, '<message for the UI>')`: `503` when a setting is
  missing, `502` otherwise, both with an `error_id`, and only the log names the
  setting or the failed call. End the read transaction before calling EUDIPLO and
  open a new one afterwards, so that no connection is held while waiting. If what
  happens next depends on a row, lock it then (`db.refresh(row,
  with_for_update=True)`) and check its state again, because the worker or another
  request may have changed it meanwhile: `apply_status()` in
  `services/document_requests.py` and the pull do this.
- **Worker steps** live in `services/worker.py`. A step is a plain function
  without arguments that opens its own `SessionLocal()` session and keeps its
  transactions short; add it to `STEPS` in the order of research R7. Send
  outbound calls through `dispatch(key, call)`, so the loop never waits for them;
  the key is a name plus an internal id, never a request reference. Tests set
  `WORKER_ENABLED=false` and call the steps directly.
- **Logging**: never log claims, tokens, secrets, request references or response
  bodies. Log an exception with `describe_error(error)` from `app/errors.py` (its
  type and code location), not its message, which can quote personal data. It lives
  there, not in `services/worker.py`, because `errors.py` imports nothing from the
  app: the services and the worker can all import it without an import cycle.
- **Developer scripts** live in `backend/scripts/` and run with
  `uv run python -m scripts.<name>`. They aren't in the production image, so they may use
  `dev` dependencies such as Faker; `app/` never imports them. They may import `app.catalog`
  and other modules without side effects, but not `app.config`, which checks the
  middleware's settings at import. `scripts/issue_test_credentials` issues test documents
  with its own EUDIPLO client (roles `issuance:manage` + `issuance:offer`): the middleware
  has no issuance role. It prints the fake person's data, which the app never does.

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

Shared helpers live in `src/api/client.ts`: `apiFetch`, `API_BASE_URL` (the normalized
base URL ending in `/api`: `VITE_API_URL` in local dev, the relative `/api` path in
production, which nginx proxies to the backend container), `handleResponse` and
`ApiError`. Each resource gets its own module next to it.

```typescript
import type { Item, ItemCreate } from '../types/items';
import { apiFetch } from './client';

export function getItems(): Promise<Item[]> {
  return apiFetch<Item[]>('/items');
}

export function createItem(data: ItemCreate): Promise<Item> {
  return apiFetch<Item>('/items', { method: 'POST', body: data });
}
```

Key points:
- Call the backend only through `apiFetch`. It sends the session cookie
  (`credentials: 'include'`), sends every `POST`, `PUT` and `DELETE` as JSON (`{}`
  without a body, which the backend's CSRF check requires), returns the `data` of
  the `{data, message?}` envelope, and throws an `ApiError` carrying the
  `{error, message, error_id?}` body when the request failed
- A page shows a failed call with `errorNoticeOf(error, '<fallback>')` and the shared
  `ErrorNoticeText`, so the `error_id` of a `5xx` answer appears with its message
- A page that calls the API passes failures through `useSignOutOnUnauthorized()` first: a
  `401` means the session expired, so the app signs out and the route guard asks for a sign-in
  that returns to the page
- Define TypeScript interfaces in `src/types/`, matching the backend Pydantic
  schemas field for field (snake_case)
- Use proper HTTP methods (GET, POST, PUT, DELETE)

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
| CSS classes | kebab-case (Tailwind) | `bg-kern-neutral-025` |

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
| `uv run mypy app/ scripts/ tests/` | Type check |
| `uv run pytest` | Run the tests; `DATABASE_URL` must name a database ending in `_test`, which they empty |
| `uv run python -m app.cli create-user <name>` | Create a sign-in account (also `set-password`, `delete-user`) |
| `uv run python -m scripts.issue_test_credentials` | Issue a test PID and driving licence with random data to a test wallet (README, "Test credentials for a test wallet") |
| `uv run python -m app.cli clear-connections` | Delete every form connection with its revisions and requests; the sign-in accounts stay (`--yes` skips the prompt) |
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
3. **Migration**: Run `uv run alembic revision --autogenerate -m "add feature"`, review the
   generated file, then `uv run alembic upgrade head`
4. **Services**: Put the domain logic in `/backend/app/services/`
5. **Router**: Create router in `/backend/app/routers/`, with the auth dependencies and the
   `ApiResponse` envelope
6. **Register**: Include router in main app: `app.include_router(router)`
7. **Settings**: If the feature needs a new environment variable, add a field to
   `Settings` in `/backend/app/config.py` — undeclared variables are ignored
8. **Tests**: Add API tests in `/backend/tests/api/` and unit tests in `/backend/tests/unit/`

### Frontend

1. **Types**: Define TypeScript interfaces in `/frontend/src/types/`
2. **API client**: Create functions in `/frontend/src/api/`, using `apiFetch`
3. **UI**: Build the page in `/frontend/src/pages/` from the Figma design, reusing the shared
   components in `/frontend/src/components/`, and add its route to `App.tsx`

### Full Stack Example

```bash
# Backend
cd backend
# 1. Add model to app/models.py
# 2. Add schemas to app/schemas.py
# 3. Generate the migration and review it
uv run alembic revision --autogenerate -m "add items"
uv run alembic upgrade head
# 4. Add domain logic to app/services/items.py
# 5. Add router to app/routers/items.py (get_current_user, require_json, ApiResponse)
# 6. Register in app/main.py
# 7. Add tests to tests/api/test_items.py

# Frontend
cd frontend
# 8. Add types to src/types/items.ts and API functions (apiFetch) to src/api/items.ts
# 9. Create the page in src/pages/Items/, with types.ts, constants.ts and utils.ts beside it
# 10. Add the route to App.tsx and its path to ROUTES in src/constants.ts
```

## Frontend Development Guidelines

- Use Tailwind CSS utility classes
- Font: Fira Sans, KERN's typeface, loaded from `@kern-ux/native` and set as the default font in
  `index.css`
- Custom theme values are defined in `index.css` using the `@theme` directive (for example the
  `shadow-card`, `shadow-menu` and `shadow-chip` tokens, which KERN lacks)
- The KERN design system is imported in `index.css`: Tailwind, KERN's fonts, KERN's CSS, then the
  KERN Tailwind theme, which turns KERN's design tokens into Tailwind classes. Keep that order,
  and see `docs/KERN-DESIGN-SYSTEM.md` for the components and tokens. Don't import the React
  kit's own stylesheet (`kern-react-kit.css`): it bundles an older KERN that overrides KERN 2.8.
  Before using a kit component that ships styles of its own (Menubar, Menu, Tabs, InputDate,
  the Radio error state), add those styles
- The app is light-only, as the Figma design is: `data-kern-theme="light"` on `<html>` in
  `index.html` pins KERN's light theme, and `color-scheme: only light` in `index.css` keeps the
  browser's own parts (scrollbars, form controls) light. Keep both. Without the attribute,
  `kern.css` follows the browser's dark mode and switches its semantic tokens, while primitives
  like `neutral-025`, the SVGs and the shadows stay light. Don't use Tailwind's `dark:` variant,
  which still follows the browser's preference
- Focus rings show for keyboard focus only. `kern.css` draws the ring of its buttons on any
  `:focus`, so a click or a tap would leave it on the button; the
  `.kern-btn:focus:not(:focus-visible)` rule in `index.css` turns that off for every KERN button,
  and a second rule for KERN's checkboxes. Keep them, and give your own interactive elements
  `focus-visible:` rings (as `UserMenu` does), never `focus:` ones
- `index.css` keeps KERN's adaptive type tokens at their small-screen values on every width,
  as the Figma design uses them, so `text-kern-adaptive-*` matches Figma
- With the KERN Tailwind theme, numeric utilities are pixels (`p-16` is 16px). KERN's CSS is not
  in a cascade layer, so it beats Tailwind utilities on the same property, state variants
  included: wrap the KERN element instead, or use the `!` suffix sparingly (`pr-56!`,
  `group-hover:hidden!`). Inside a labelled `kern-btn`, hide text with Tailwind's `sr-only`, not
  `kern-sr-only`: `kern.css` makes any `.kern-btn` that contains `.kern-sr-only` icon-sized
- The visual design comes from Figma (see "Figma implementation workflow" below);
  `specs/001-servicebw-eudi-middleware/design-notes.md` records its copy, tokens and the decisions
  taken. The UI calls form connections "connections" (V1 said "use cases"). SVG glyphs from the
  design live in `src/assets/icons/`, decorative SVGs in `src/assets/illustrations/`; KERN's own
  icons use the `kern-icon` classes
- Signed-in state comes from `useCurrentUser()`. Routes are declared in `App.tsx` with the paths
  in `ROUTES` (`src/constants.ts`); signed-in screens render inside `RequireSignIn` and
  `AppLayout`, except the create wizard (`/form-connections/new`, and `/get-started` through
  `pages/FirstConnection/`) and the details (`/form-connections/:id`, the wizard's last screen
  in Figma), which render their own `WizardLayout` (header with a title, 1120 px column, action
  bar) in every state, loading and errors included. Headers and action bars never scroll: `AppLayout`'s top bar is sticky,
  and `WizardLayout` fills the window and scrolls only the step between them. From the `split:`
  variant (`index.css`: 1024 px wide, 640 px tall) its `head` (progress and page title) stays
  put too, so only the area below it scrolls. Render modal dialogs and toasts in its `overlay`,
  outside that area. The signed-out ones (`/login`, `/forgot-password`) render inside
  `RequireSignedOut` and `AuthLayout`. A sign-in without a requested route (`/` counts as none)
  lands on `/get-started`: the wizard headed "Create your first connection" while no form
  connection exists, the overview otherwise. Every page sets its tab title with
  `useDocumentTitle()` and has one `h1`: `PageTitle` on signed-in screens, except the loaded
  details, whose header title is the `h1` (`titleAsHeading`); the intro's headline in
  `AuthLayout` on signed-out ones
- Links between the app's routes are React Router `Link`s with KERN's classes (`kern-link`, or
  `kern-btn kern-btn--primary` with a `kern-label` span): `KernLink` and `KernButton` with `href`
  render a plain `<a>`, which reloads the page
- Maintain components that you create small, extract new functionality to new components.
- When you are declaring types needed in the component, extract them to separate types.ts file in the directory next to the component itself
- When you are declaring constants needed in the component, extract them to separate constants.ts file in the directory next to the component itself.
- If your component uses utility functions independent from component state logic, extract them to separate utils.ts file in the directory next to the component itself.
- If your component has several state variables, use useReducer hook with actions to extract functionality.
- If your component is mapping some jsx code to a list of items, extract that code to a separate sub-component.

## Figma implementation workflow

When I give a Figma URL for a UI task:

### 1. Node discovery
Delegate to the `figma-node-finder` subagent. Pass it the Figma URL and the current speckit task.
Do not call get_metadata or explore the Figma tree in the main context.
If its output contains UNCERTAIN items, ask me before implementing.

### 2. Tokens (once)
Call `get_variable_defs` on the ROOT node. Map Figma variables to existing project tokens.
If a value has no matching token, list it and ask. Do not invent tokens.

### 3. Implementation (per node, in the returned order)
1. `get_design_context` on the node-id.
2. `get_screenshot` on the node-id.
3. Implement with EXACT values (spacing, borders, radii, font size/weight, line height, colors).
   No approximation. Treat the MCP's React/Tailwind output as a spec, not final code;
   adapt it to project conventions and reuse existing components.
4. Use assets as returned by the MCP; do not substitute icons or images.

### 4. Visual verification (per node)
Dev server: `<npm run dev>` → `<http://localhost:5173/login>`. Start it in the background if not running.
1. `browser_resize` to the ROOT frame size (w×h from figma-node-finder), then `browser_navigate`.
   KERN reserves the scrollbar's width on `html` (`scrollbar-gutter: stable`), so the page can be
   narrower than the window even when nothing scrolls, and every centred element is then off by
   half the gutter. Check `document.body.getBoundingClientRect().width`, and widen the window by
   the difference from the frame width (1455 for a 1440 frame in Chromium on Linux).
2. Font check: `browser_evaluate` with `document.fonts.check('<weight> <size>px "<Figma font>"')`.
   If it returns false, fix font loading before anything else.
3. Numeric check (primary): `browser_evaluate` with getBoundingClientRect + getComputedStyle on the
   section's key elements: width/height, padding, margin, gap, border width/style/color, border-radius,
   font-family/size/weight, line-height, letter-spacing, color, background.
   Compare against the get_design_context values. Output a table: element | property | Figma | actual.
4. Visual check (secondary): `browser_take_screenshot` of the section element only. Compare it with the
   Figma `get_screenshot` for alignment, missing elements and ordering.
5. Fix every mismatch and repeat 3–4. Tolerance: 0px for spacing, borders and radii; exact for colors
   and typography; ±1px for text box heights (font rendering).
6. Move to the next node only when the table is clean. Otherwise report what's unresolved and why.

### Rules
- Never call get_design_context on the full page frame.
- Never implement nodes outside the current task.

## Do Not

### Backend

- Perform blocking I/O inside an `async def` handler — either make the handler a
  plain `def` (FastAPI will run it in a threadpool) or await a real async client
- Use `AsyncSession`, or the legacy `db.query(...)` API — use the sync `Session`
  with 2.0-style `select()` / `db.get()`
- Use `datetime.utcnow()` (deprecated) — use `datetime.now(tz=timezone.utc)`
- Commit `.env` files (create `.env.example` instead)
- Use `print()` for logging (use FastAPI's logger or `logging` module)
- Log claims, tokens, secrets, request references, response bodies or exception
  messages (use `describe_error()` from `app/errors.py`)
- Put a setting's name, a component's internals or an exception's text into an
  error answer — log them with `log_server_error()` and answer with its `error_id`
- Hold a database transaction open while waiting for EUDIPLO
- Ignore type hints (mypy should pass)
- Declare a dependency in `pyproject.toml` that the code does not import

### Frontend

- Commit `.env` or `.env.local` files (use `.env.example`)
- Use inline styles (use Tailwind classes)
- Use `require()` (use ES imports)
- Use `any` type without justification
- Call `fetch` directly for the backend API (use `apiFetch`)
- Import `@kern-ux-annex/kern-react-kit/kern-react-kit.css`

### General

- Commit sensitive data (API keys, passwords, tokens)
- Modify auto-generated files (Alembic migrations after creation)

## Project Structure Details

### Backend Structure

```
backend/
├── app/
│   ├── __init__.py       # Minimum Python version guard
│   ├── main.py           # FastAPI app, routers, worker lifespan, access-log redaction
│   ├── config.py         # Settings with pydantic-settings
│   ├── db.py             # Base, engine, sessionmaker, get_db dependency
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   ├── errors.py         # Exception handlers, log_server_error (5xx error ids), describe_error
│   ├── catalog.py        # Document types and their fields (PID, mDL)
│   ├── cli.py            # Account management and clear-connections, run as `python -m app.cli`
│   ├── routers/          # API routers, one module per resource
│   │   ├── __init__.py
│   │   ├── auth.py       # /api/auth/login, /logout, /me
│   │   ├── document_types.py   # /api/document-types
│   │   ├── form_connections.py # /api/form-connections
│   │   └── connect.py    # /api/connect/: serviceBW's trigger and pull URLs, no sign-in
│   └── services/         # Domain logic shared by the routers and the worker
│       ├── auth.py       # Password hashes, sign-in sessions, get_current_user, require_json
│       ├── eudiplo.py    # EUDIPLO client, get_eudiplo_client, http_error_for
│       ├── dcql.py       # A revision's EUDIPLO configuration body and config_hash
│       ├── form_connections.py  # Validation, create, read, update
│       ├── document_requests.py # Trigger, pull, status mapping, apply_status
│       ├── documents.py  # EUDIPLO credentials → exactly the configured fields
│       ├── qr.py         # QR code of the cross-device link (segno)
│       └── worker.py     # Background worker: loop, steps, dispatch
├── alembic/              # Database migrations
├── scripts/              # Developer scripts, not in the image: issue_test_credentials/
├── tests/                # conftest.py, fake_eudiplo.py, helpers.py, api/, unit/
├── .python-version       # Interpreter uv provisions (3.13)
├── pyproject.toml        # Dependencies + ruff/mypy/pytest config
└── uv.lock              # Lock file
```

Note: the database module is `app/db.py`, not `app/database.py`. Pytest, ruff,
and mypy are all configured in `pyproject.toml` — do not add a `pytest.ini`, as
it takes precedence and would silently shadow that config. The tests refuse to
run unless `DATABASE_URL` names a database ending in `_test`, because they empty
it; `tests/fake_eudiplo.py` stands in for EUDIPLO.

### Frontend Structure

```
frontend/
├── src/
│   ├── api/              # client.ts (apiFetch, ApiError) and one module per resource
│   ├── assets/           # From the Figma design: icons/ (SVG glyphs), illustrations/
│   ├── components/       # Shared components: AppLayout, AuthLayout, TopBar, UserMenu, ...
│   ├── pages/            # One folder per screen
│   ├── hooks/            # Custom React hooks (useCurrentUser, useDocumentTitle)
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types
│   ├── constants.ts      # App name, routes, the KERN kit's English texts
│   ├── index.css         # Tailwind, KERN and the project's design tokens
│   ├── App.tsx           # Routes
│   └── main.tsx          # Router, KERN context and sign-in state providers
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
