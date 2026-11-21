# Architecture Documentation

## System Overview

Three applications, built and deployed as containers of one stack: a React SPA, a
FastAPI service with a PostgreSQL database, and the MCP server through which the team
members' LLM agents work. The backend also runs a background worker thread, and talks to
EUDIPLO, which handles the citizens' wallets. The Node code is one npm workspace (see
[Repository Structure](#repository-structure)); the backend manages its own
dependencies with uv.

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  Backend (FastAPI)   │────▶│   PostgreSQL    │
│  (React/Vite)   │     │  + worker thread     │     │   (Database)    │
└─────────────────┘     └──────────┬───────────┘     └─────────────────┘
                          ▲        │ management API (HTTPS, OAuth token)
┌─────────────────┐       │        ▼
│   MCP server    │───────┘  ┌──────────────────────┐
│ (Node, mcp/)    │ bearer   │  EUDIPLO (tenant     │◀──── citizens' EUDI wallets
└────────▲────────┘          │  dps, hosted)        │      (OpenID4VP)
         │ MCP (Streamable   └──────────────────────┘
         │ HTTP, OAuth 2.1)
   LLM agents on the team members' machines
```

Types are **not** shared with the backend at build time. The interfaces in
`api-types/src/` mirror the Pydantic schemas in `backend/app/schemas.py` by hand — when
you change one, change the other. The SPA and the MCP server import them by name.

This repository is being turned into the serviceBW ↔ EUDI Wallet middleware. Its
target architecture, with form connections, document requests and an nginx
allow-list, is in
[the plan](../specs/001-servicebw-eudi-middleware/plan.md). This document
describes what is implemented so far: the data model, DO.IT sign-in, form
connections with their EUDIPLO configurations, editing, deactivating and deleting
them, serviceBW's trigger and pull URLs, the worker steps, the nginx allow-list for
the connection URLs, and the management UI. serviceBW gets results only by pulling:
webhook mode was dropped from the scope on 2026-10-19.

Spec 002 ([plan](../specs/002-connection-rules/plan.md)) adds **rules** to a form
connection: conditions on the requested fields, combined with AND or OR in groups
and sub-groups, in **branches** ("variants" in the UI) that each get a pull URL of
their own. A pull hands serviceBW the documents together with the **evaluation** of
the called branch's rules. See [Rules and branches](#rules-and-branches-spec-002).

Spec 003 ([plan](../specs/003-rule-consistency-checks/plan.md)) adds **rule
consistency checks**: while the team member edits, the Rules step points out rules and
groups that conflict, repeat or cover each other, are always met, or make a variant
that no citizen can meet. They run only in the browser and never reach the server.
See [Rule consistency checks](#rule-consistency-checks-spec-003).

Spec 007 ([plan](../specs/007-agent-mcp-server/plan.md)) lets team members connect **LLM
agents** through an MCP server: the agents find and read connections, build drafts one change
at a time with the editor's own logic, run the rule checks and test fictitious citizens, and
ask for the team member's **approval** to publish or delete a draft or to deactivate,
reactivate or delete a live connection. See
[Agent access and the MCP server](#agent-access-and-the-mcp-server-spec-007).

Spec 010 ([plan](../specs/010-revamp-backend-gaps/plan.md)) builds the stored-data features of
the KERN Revamp design that spec 008 deferred: **scheduling** a connection to become active on a
date, its **status dates**, an **activity** log per connection, **deleting that can be taken
back** ("Undo"), deleting several connections at once, the documents in the **team's order**,
the **example** connection and the catalog's **data groups**. See
[Form connections](#form-connections) and [The activity](#the-activity-spec-010).

### Data Flow

1. User interacts with the React frontend
2. Frontend calls the backend API through `apiFetch` in `frontend/src/api/client.ts`,
   which sends the `session` cookie and sends every write as JSON
3. FastAPI checks the sign-in session (`get_current_user`, or `get_current_principal`
   where an agent's bearer token is accepted too) and, for `POST`, `PUT` and `DELETE`, the
   JSON content type (`require_json`), then validates the body against a Pydantic schema
4. The route handler calls the domain logic in `app/services/`, which queries via
   a SQLAlchemy `Session` injected by `Depends(get_db)` and, where needed, calls
   EUDIPLO
5. psycopg 3 communicates with PostgreSQL
6. Response flows back in the `{data, message?}` envelope: Database → SQLAlchemy →
   FastAPI → Frontend → User

## Repository Structure

```
dps-react-python-template/
├── package.json           # npm workspace root: api-types, rules, frontend, mcp; scripts over them
├── package-lock.json      # One lockfile for every Node package
├── eslint.config.mjs      # ESLint 9 flat config, one block per package
├── tsconfig.base.json     # Compiler options every package extends
├── .prettierrc            # Prettier formatting rules
├── api-types/             # @connection-portal/api-types: the TypeScript mirrors of the schemas
├── rules/                 # @connection-portal/rules: the pure rules logic, checks/ and personas/,
│                          # language.ts (spec 009), fixtures/server-messages.json and
│                          # fixtures/example-connection.json (spec 010), both generated
├── frontend/              # React SPA (Vite), depends on api-types and rules
│   └── .prettierrc        # The root's rules plus the Tailwind plugin
├── mcp/                   # @connection-portal/mcp: the MCP server, depends on api-types and rules
│   └── plugin/            # Guidance for agents: instructions, skills, the Claude Code plugin
├── backend/               # FastAPI API (SQLAlchemy + Alembic)
├── docs/                  # Architecture, EUDIPLO, KERN and Figma workflow docs
├── specs/                 # Feature specification, plan, contracts and tasks (Spec Kit)
├── .claude-plugin/
│   └── marketplace.json   # The Claude Code marketplace that lists mcp/plugin
├── .pre-commit-config.yaml # Git hook definitions (both stacks)
├── .dockerignore          # Applies to every image build (context is the repo root)
├── docker-compose.yml     # Local development
└── docker-compose.prod.yml # Production and previews (Coolify)
```

The Node code is one npm workspace with four packages, `api-types/`, `rules/`, `frontend/`
and `mcp/`, while the backend uses Ruff and mypy. `npm install` at the root installs every
package's dependencies into the root `node_modules/` and links the two shared packages
there, so that the frontend and the MCP server import them by name
(`@connection-portal/api-types/<name>`, `@connection-portal/rules/<path>`). `api-types` and
`rules` export their TypeScript source (`"./*": "./src/*.ts"`) and build nothing; Vite
compiles them into the frontend, and Vite's SSR build bundles them into the MCP server's
`mcp/dist/`. `rules/` imports only `api-types` and itself, `api-types` nothing, neither
imports `frontend/` or `mcp/`, and `frontend/` and `mcp/` never import each other
(`no-restricted-imports` in the root `eslint.config.mjs`). The root scripts `lint`, `test`,
`build` (every package's `typecheck`, then every `build`), `format` and `format:check` run
each package's script of that name.

Git hooks are repository-wide: they are defined in the root `.pre-commit-config.yaml` and
cover both stacks, running `ruff check --fix` and `ruff format` on Python files and, from
the root, `prettier --write` and `eslint --fix` on `api-types/`, `rules/`, `frontend/` and
`mcp/` files, plus the trailing-whitespace, merge-conflict and large-file checks and
gitleaks' scan of the staged changes for secrets. CI scans the history with gitleaks too
(`README.md`, "Secrets (gitleaks)").

The hooks are installed by the root `package.json`'s `prepare` script, which runs
`uv run pre-commit install` in `backend/` — so `npm install` at the root is what wires
up the backend's hooks. `pre-commit` itself is a `dev` dependency in
`backend/pyproject.toml` and lives in `backend/.venv`, which is why the `prepare` script
has to `cd` there. The script ends in `|| exit 0` so a machine without `uv` can still
install frontend dependencies; on such a machine the hooks are silently absent and have to
be installed manually later.

mypy is intentionally not a hook — it is too slow for a commit, so run
`uv run mypy app/ scripts/ tests/` yourself before pushing backend changes. See the `Code Quality`
section of `README.md` for the full command list and editor format-on-save setup.

## Application Details

### frontend

**Tech Stack**: React 19, Vite 8, Tailwind CSS 4, TypeScript, React Router 7, KERN design system

```
frontend/
├── src/
│   ├── api/              # client.ts (apiFetch, ApiError, setRequestLanguage), one module per
│   │                     # resource: auth.ts, document-types.ts, form-connections.ts,
│   │                     # option-sets.ts; spec 007: agent-access.ts, approvals.ts, oauth.ts
│   ├── assets/           # From the Figma design: icons/ (SVG glyphs), illustrations/;
│   │                     # fonts/: the PDF's Fira TTFs with OFL.txt (spec 011)
│   ├── components/       # App shell (AppLayout, TopBar with the header pills, UserMenu,
│   │                     # PageTitle), the wizard's frame (WizardLayout, WizardProgress), the
│   │                     # signed-out screens' frame (AuthLayout), route guards, sign-in state
│   │                     # provider, ConfirmDialog, Toast, ActionMenu, InfoTooltip, shared
│   │                     # form pieces, and the read-only rules display that the Rules step
│   │                     # and the details share: RuleRow, GroupFrame, Connector, BranchMark,
│   │                     # BranchName; FindingNote, the note under a rule or group with a
│   │                     # finding of the rule checks; LocalDraftsOffer (spec 005);
│   │                     # AccessLevelChoice, the three access levels as radio buttons (spec 007);
│   │                     # LanguageProvider (the language) and LanguageSwitch (spec 009);
│   │                     # ActiveFromChoice ("Active from: Now / On a date") and
│   │                     # ExampleBanner (spec 010)
│   ├── hooks/            # useCurrentUser (sign-in state), useDocumentTitle, useDocumentTypes,
│   │                     # useOptionSets, useFormConnection, useSignOutOnUnauthorized,
│   │                     # useRuleChecks (the rule checks' run and their worker), usePersonas,
│   │                     # useTodayInGermany (spec 004), useLocalDraftStore, useLocalDraft,
│   │                     # useLocalDrafts (spec 005), useRememberedHomepage (spec 008),
│   │                     # usePinned, useUndoShortcut; useLanguage with useCopy (spec 009);
│   │                     # useRowDrag (dragging the documents, spec 010); useConnectionPdf
│   │                     # (the PDF's download and its worker, spec 011)
│   ├── pages/            # One folder per screen: Login, ForgotPassword, FormConnectionList
│   │                     # (the overview and the welcome page at /), FirstConnection
│   │                     # (/get-started), FormConnectionEditor (the wizard, with
│   │                     # DocumentsStep/, RulesStep/, RulesStep/RuleEditor/ and TestStep/),
│   │                     # FormConnectionEdit, FormConnectionDetail; spec 007: Authorize (the
│   │                     # consent page), Account (the user page), Approval (an approval
│   │                     # request)
│   ├── utils/            # Shared helpers: menuNavigation.ts (arrow keys in menus),
│   │                     # popupPlacement.ts (where a popup opens), stickyPin.ts,
│   │                     # undoShortcut.ts, messageField.ts; localDrafts/: the local drafts'
│   │                     # pure modules (spec 005); language/: the language's resolver (spec 009);
│   │                     # connectionPdf/: the PDF's pure modules, and connectionSummary.ts,
│   │                     # the Summary's numbers that the PDF shares (spec 011)
│   ├── workers/          # The browser Worker entries: checks.ts (the rule checks),
│   │                     # personas.ts (the test personas) and pdf.ts (the connection PDF,
│   │                     # with pdfFonts.ts, the fonts' URLs; spec 011)
│   ├── constants.ts      # App name (Konnekt), routes, the wizard's steps and their labels, the
│   │                     # KERN kit's texts in both languages (KERN_TRANSLATIONS)
│   ├── copy.test.ts      # Every copy table complete in both languages (spec 009)
│   ├── App.tsx           # Routes
│   ├── main.tsx          # Entry point: router, language (with the KERN context), sign-in state
│   └── index.css         # Tailwind, KERN, the KERN Revamp overlay, the project's tokens and
│                         # KERN overrides
├── vite.config.ts        # Vite configuration, and Vitest's `test` block (node environment)
├── nginx.conf            # Serves the production build, proxies /api to the backend and
│                         # /mcp to the MCP server
└── package.json
```

**Key Decisions**:
- Vite for fast HMR and optimized builds
- Tailwind 4 with `@theme` directive for design tokens
- Self-hosted fonts for GDPR compliance: KERN's Fira Sans files from `@kern-ux/native`
- Native fetch for API calls (no axios dependency). `apiFetch` in `src/api/client.ts`
  sends the session cookie (`credentials: 'include'`), sends every `POST`, `PUT` and
  `DELETE` as JSON (`{}` without a body), unwraps the `data` of the `{data, message?}`
  envelope and throws an `ApiError` for `{error, message}` bodies
- Routing with React Router 7 (`BrowserRouter`). `RequireSignIn` sends signed-out
  users to `/login` and back to the requested route afterwards, and `RequireSignedOut`
  sends signed-in users on from `/login` and `/forgot-password`. A sign-in without a
  requested route lands on the homepage `/` (`redirectTarget()`), which is the welcome page
  while the account's list of connections and drafts is empty and the overview otherwise
  (spec 008, FR-027; see "The homepage" below). The welcome page's "Create connection" opens
  `/get-started`, the create wizard headed "Create your first connection", which opens the
  overview instead once a connection exists. The product name leads to `/`.
  `/form-connections/:id/edit` opens the same
  wizard, filled in with the connection; for a draft (spec 005), the create flow at the
  draft's stored step. The create routes carry the flow's local draft in `?local=` (see
  [Local drafts](#local-drafts-spec-005)). nginx already falls back to `index.html` for
  client-side routes. Passwords are reset with the account CLI, so `/forgot-password`
  only says whom to ask
- Sign-in state lives in `CurrentUserProvider`, which asks `GET /api/auth/me` once;
  components read it with `useCurrentUser()`
- **Layouts** (spec 008, `contracts/ui-screens.md` L1–L4, research R4). Three route groups in
  `App.tsx`: the signed-out screens (`/login`, `/forgot-password`) inside `RequireSignedOut`,
  each in `AuthLayout` (L1: the blue surface with the white chain, the hero with the white
  logo, and the card; bug `new-visuals` B1); the consent, account and approval
  pages inside `RequireSignIn` and `AppLayout` (L2: the header pills over a 1120 px column);
  and a layout-less group inside `RequireSignIn` whose pages render their own layout in every
  state, loading and errors included. In that group, `/` renders `AppLayout` itself for the
  welcome page and the overview, and its loading page has none (the signed-out header and the
  56 px loader, U10 "loading your workspace"); the create wizard (`/form-connections/new`,
  and `/get-started` through `pages/FirstConnection/`), editing
  (`/form-connections/:id/edit`, through `pages/FormConnectionEdit/`) and the details
  (`/form-connections/:id`) render `WizardLayout` (L3: the header pills, the step header, a
  1120 px column and the 72 px footer; the details' `details` variant, L4, has no step header
  and an 832 px column).
  **The page scrolls** on every layout, not an area inside the frame (the wizard's inner
  scroll and its `split:` variant are gone); only a few parts scroll inside themselves (the
  overview's list card, the test step's panel). What stays put:
  - the header (`TopBar`, its 64 px area with the 48 px pills) is sticky in windows at least
    320 CSS px wide and 480 px tall (`[@media(width>=20rem)_and_(height>=30rem)]`); in
    narrower or shorter ones (1280 × 1024 at 400 % zoom, a 320 px window at 200 %) it
    scrolls away with the page, so that it can't cover half the window (WCAG 1.4.10, T096);
  - the wizard's step header (progress, title, description) pins under the pills from
    768 px wide and 640 px tall, the `wizard-pinned:` variant of `index.css`, and scrolls away
    below that; the rules step pins its variant tab row and selection bar under it;
  - the wizard's footer (sticky) and the overview's bar with "Create connection" (fixed)
    stay at the window's bottom from 480 px tall (`[@media(height>=30rem)]`) and sit at the
    page's end below that, where their wrapped rows would leave the step no room (spec 005
    FR-028).
  How much of the window the sticky parts cover is measured, because their height follows
  their wrapped text: `WizardLayout` sets `--wizard-sticky-top` (the bottom of the pinned
  step header, or of the header where only that is sticky, else 0) and
  `--wizard-sticky-bottom` (the sticky footer's height, else 0) on `<html>`, and the rules
  step sets `--rules-tabs-height` (its pinned tab row's height) on its own root, both with
  `style.setProperty()` (constitution 1.2.1: a measured value only, the styles are classes).
  Spec 010 adds two more measured values: the dragged document's box and offset
  (`--drag-left`, `--drag-top`, `--drag-width`, `--drag-x`, `--drag-y`, set by `useRowDrag`)
  and the bulk delete dialog's list height (`BulkDeleteDialog`).
  `index.css`'s `scroll-padding` keeps what scrolls into view clear of them (WCAG 2.4.11),
  and the steps' exceptions read them (the documents step's list, the rules step's pinned
  selection bar, the test step's panel, the toast above the footer, the menus' edges in
  `placementFrom()`). Below 320 CSS px (the `narrow:` variant, see the KERN bullet) the
  toast region is sticky at the window's bottom instead of fixed, so that a toast with an
  action can't hide the page's last controls. A page change fades the main region in over
  150 ms and scrolls to the top (`App.tsx`, FR-052c). Modal dialogs and toasts render in the
  layout's `overlay`
- **Titles**: every page sets its tab title with `useDocumentTitle()` and has one `h1`:
  `PageTitle` on signed-in screens, except the loaded details, whose header title is the
  `h1` (`titleAsHeading`), and the intro's headline in `AuthLayout` on signed-out ones.
  `useDocumentTitle()` runs again whenever the title string changes, so the tab title follows
  a switch of the language
- **Popups**: menus, popovers and tooltips open where they fit (research R10).
  `placementFrom()` in `src/utils/popupPlacement.ts`, called in the event that opens them,
  measures the control against the window and the sticky edges and returns the side
  (`start`, `end` or `full`: across the rules card or the page, below the control), for a
  menu also the direction (`down` or `up`) and the largest max-height step that fits
  (160–480 px, the list scrolling inside); the component maps each to a fixed set of
  Tailwind classes, and the wrapper takes `popupWrapperClass()`. No inline coordinates: a
  fixed-width popup anchored with `left-0` or `right-0` alone runs off the screen at 320 px
  and 200 % zoom. A popup inside a box that scrolls or hides its overflow, which would cut
  it off (the overview's description bubble in the list card's rows, bug
  connection-tooltip-clipped), opens in the top layer instead: a `popover="manual"` that an
  effect shows and hides with its open state, anchored to its control by CSS anchor
  positioning in classes (`[anchor-name:…]` on the control, `[anchor-scope:…]` on the item
  that repeats it, `[position-anchor:…]`, `top-[anchor(bottom)]` and
  `[position-try-fallbacks:flip-block,…]` on the popup), so that the browser opens it below
  or above at its real height and moves it with a scrolling box; `placementFrom()` still
  gives the side. It stays the wrapper's child in the DOM, so hovering into it, the outside
  press and Escape work as before. Where `supportsAnchoredPopups()` is false (no anchor
  positioning), it stays positioned inside the page as before
- **Dialogs** are `ConfirmDialog`, a native modal `<dialog class="kern-dialog">` that fades
  in and out with its scrim. The ×, Escape and a click on the scrim close it, except for the
  dialogs that delete or publish (`dismissOnScrim={false}`: deleting a connection or a
  draft, revoking an agent's access, the publish dialog; FR-052a), where only the buttons,
  the × and Escape do; a dialog that is busy (publishing, deleting) can't be closed at all.
  `hideConfirm` (spec 010) takes the confirm button away while the dialog stays open, the
  cancel button taking the focus: the bulk delete dialog sets it after `409
  selection_changed`, so that it offers no retry and the person reopens it from the selection
  bar with the current statuses (design-notes §4.2 T084 (3), T106)
- **Toasts** (`components/Toast`): one at a time, the newest replacing the previous, announced
  through the live region, in three kinds: `neutral`, `success` and `danger` (red with the
  delete icon, for this feature's deletions and a document's removal; spec 010, design-notes
  §4.2 T038). **Every toast closes by itself after 6 seconds** (`TOAST_DURATION_MS`), with or
  without an action; the time runs only while neither the pointer nor the keyboard focus is on
  it, and starts again from the beginning once both have left (the pure reducer in
  `Toast/utils.ts`). Escape on it
  closes it. This replaces spec 008's rule that a toast with an action stays until it is used
  (spec 010, FR-082)
- KERN design system: `index.css` imports Tailwind, KERN's fonts, `kern.css` and the
  KERN Tailwind theme, in that order. The React kit's own stylesheet is not imported,
  because it bundles an older KERN whose rules override KERN 2.8 (`docs/KERN-DESIGN-SYSTEM.md`
  §2). The UI follows the designer's **KERN Revamp** (spec 008): the **overlay**, one
  `:root` block right after the imports, sets the Revamp's values under KERN's own names
  (colours, radii, the type at one size on every width, the disabled opacity of 0.68 and the
  primary button's pressed shade, both for AA), so that `kern.css`, the kit and the Tailwind
  theme pick them up. Its `@theme` adds the values KERN has no name for: the shadows
  (`shadow-card`, `shadow-menu`, `shadow-toast`), three frame colours of the documents step,
  the variant marks' colours, the motion's durations and keyframes. The scoped overrides
  that follow (the footer's 40 px buttons, the pressed and disabled states, the checkbox, the
  alert, the 56 px loader, the danger buttons, the dialog's fade) and the focus ring of
  KERN's buttons, checkboxes and radios for keyboard focus only (`kern.css` draws it on any
  `:focus`) are listed in `docs/KERN-DESIGN-SYSTEM.md` §3.1. Two custom variants:
  `wizard-pinned:` (see Layouts) and `narrow:`, windows under 320 CSS px (a 320 px window at
  200 % zoom), with a block that wraps long words and halves the side paddings and gaps
  there (FR-010). Every element that transitions carries `motion`, which the one
  `prefers-reduced-motion` rule switches off (FR-050). With the KERN Tailwind theme, numeric
  utilities are pixels (`p-16` is 16px)
- Light only, as the Figma design has no dark variant: `index.html` pins KERN's light
  theme with `data-kern-theme="light"` on `<html>`, which `kern.css` would otherwise
  switch to dark with the browser's preference, and `index.css` sets
  `color-scheme: only light` for the browser's own controls and against Chromium's auto
  dark theme (`docs/KERN-DESIGN-SYSTEM.md` §7). The one exception is the favicon
  (`src/assets/illustrations/favicon.svg`): the browser draws its tab bar in its own theme,
  so the SVG's own `prefers-color-scheme` rule makes the logo's squares blue (`#1D56F0`) on a
  light theme and white on a dark one, without a background (Figma "logo for website")
- **The visuals** (`src/assets/illustrations/`, bug `new-visuals`, Figma "⛓️ New visuals"
  7741:61917): the eight pictures (the sign-in chain, the four band pictures, the welcome and
  not-found chains, the empty documents folder) are lossless WebP at 2× their display size or
  more, each at most 1.5 MB (`assets/illustrations.test.ts` checks it), with colour, opacity,
  rotation and crop baked in: never CSS filters, blend modes, opacity or rotation on them. Each
  is an
  `<img alt="" aria-hidden="true">` at a fixed pixel size (`h-…!`, `max-w-none!`: KERN's
  unlayered `img` rule sets `height: auto` and `max-width: 100%`) that never scales; only a
  clip layer of its own (`absolute inset-0 overflow-hidden`) cuts it, never the page's root or
  a card that holds a menu or a focus ring, so the sticky header and the ⋯ menus stay unclipped.
  Text keeps at least 24 px from a picture's first visible pixel: the cards and bands reserve
  that room in their right padding, and below 768 px (the sign-in surface: 1021 px) the
  pictures go. `AuthLayout` puts the chain behind everything on the surface (`isolate`,
  `-z-10`); the white logo (`logo-white.svg`) is the one picture with a name (`alt="Konnekt"`)
- The visual design comes from Figma ("Middleware – V5" on the KERN Revamp). Its decisions
  are recorded in `specs/008-kern-revamp-redesign/`: `spec.md` (what decides what, and the
  Clarifications), `contracts/ui-screens.md` (the layouts L1–L4 and screens S1–S22 with
  their states), `figma-audit/report.md` (the decided deviations F#, W#, C#) and
  `design-notes.md` (the overlay, the component decisions, the patterns, the verification
  tables and the history). The design notes of specs 001 and 002 are history; the behaviour
  they cite stays in force (`docs/FIGMA-WORKFLOW.md`)
- The wizard has four steps, Connection, Documents, Rules and Test (`CONNECTION_STEPS`
  in `src/constants.ts`), in create and in edit, shown as "Step n of 4" (`WizardProgress`, a
  `progressbar`; clickable while editing only). Publishing is a dialog, not a step
  (`PublishDialog`, spec 008 Q7): the test step's "Publish" (the edit flow's "Save") opens
  its summary, then its status ("Publishing…", "Published"), a failure with the error ID, or
  a conflict; while no variant has rules, the rules step's "Publish without rules" (and the
  edit flow's "Save") opens "Publish without rules?" ("Save without rules?") instead.
  Spec 010 puts "Active from" into the publish dialog (`ActiveFromChoice`):
  "Now" publishes as before, "On a date" with a date field that refuses a day not after
  today in Germany (today from `useTodayInGermany()`; the server's `400 invalid_start_date` shows there
  too) turns the button into "Schedule" and publishes with `start_date`; "Try again" repeats
  the same choice. The edit flow of a scheduled connection says that its changes take effect
  on its date, and saving never changes the date.
  The editor's reducer keeps the connection and its documents; the documents step's view
  reducer (`DocumentsStep/reducer.ts`) the shown document, the search, the removal waiting
  for "Undo", the removal question and the needs-data flags, and `rowDragReducer`
  (`DocumentsStep/utils.ts`) a drag in progress; the Rules step's own reducer
  the branches, the open tab, select mode and its dialogs; the rule editor a fourth one.
  Nothing reaches the API before Publish
  or Save, or, in the create flow, "Save and exit", which stores the work as a draft (see
  [Form connections](#form-connections)); until then the work lives in the page's state and,
  in the create flow, in its local draft (see [Local drafts](#local-drafts-spec-005)). The
  details open the edit wizard at a step through the router state `EditLocationState.step`
  (`'connection'`, `'documents'` or `'rules'`)
- **The header pills and leaving a flow** (L2, FR-026): `TopBar` draws the Konnekt pill
  (home) and the account pill (`UserMenu`: the name, "Your account", "Log out"); inside a
  connection a second pill, "Your connections / <name> · <status>", grows out of the first.
  Spec 009 puts the language switch (`LanguageSwitch`) in `TopBar`'s right group, before the
  account pill, so every layout that renders `TopBar` (`AppLayout`, `AuthLayout`,
  `WizardLayout`, the homepage's loading page) shows it, signed out too (see
  [Languages](#languages-spec-009)). On the sign-in screens' blue surface (`brandSurface`,
  bug `new-visuals` B1) the header has no Konnekt pill, since the hero's logo names the
  product, and its area turns the surface's blue, not white, once the page has scrolled; the
  homepage's loading page keeps the white pill (`signedOut`).
  The connection's name in that pill is the only place on the details and in the edit flow
  that says which connection is open, so it keeps at least min(its own width, 96 px) at every
  width (flex basis 96 px, growing to its full width where there is room) and is cut with
  "…" only beyond that; where it can't stand beside the status pill, the status pill wraps
  under it inside the pill (spec 010, design-notes §4.2 T084 (4), T098). The status pill
  reads "Scheduled · <date>" for a scheduled connection.
  In a flow, the product name, "Your connections" and "Log out" go through the editor's
  leave model (`FormConnectionEditor/leaveFlow.ts`, pure, research R9): a new connection's
  or a stored draft's flow asks "Leave this connection?" ("Save progress" stores it through
  "Save and exit", "Discard connection" forgets its local draft), the edit flow of a
  published connection asks "Save your changes?" while it has unsaved changes, and "Log out"
  with unsaved work asks "Save before you log out?". There is no router blocker: the
  browser's back button leaves without asking, and closing or reloading the tab gets the
  browser's own "Leave site?" while the flow has unsaved work
- **The homepage** (`/`, `pages/FormConnectionList/`, FR-027): the welcome page ("Welcome to
  Konnekt", "Create connection") while the list of connections and drafts is empty, the
  overview otherwise. So that a reload shows no flash of the wrong page,
  `useRememberedHomepage()` keeps one flag per account in `localStorage` (see
  [Local drafts](#local-drafts-spec-005)), written whenever the list loads and after the last
  connection is deleted, and the pure `homepageOf(list, remembered)` picks the page while the
  list loads; without a memory the loading page shows. The local-drafts offer
  (`LocalDraftsOffer`, spec 005) sits above the welcome page's h1, between the overview's
  title and its toolbar, and above step 1's card on `/get-started`. The welcome page's "Start
  from an example" opens `ExampleDialog`, whose "Create the example" calls
  `POST /api/form-connections/example` and opens the new draft at step 1; while a loaded
  draft is the example, each step shows `ExampleBanner` and the publish dialog a line, until
  the draft is changed (spec 010, FR-054 to FR-061)
- **The overview's rows and selection** (spec 010, S4): a row's date reads by state
  (`rowMetaOf`): "Edited <date> · <step> step" for a draft, "Active from <date>" while
  scheduled, "Published <date>" while live, "Deactivated <date>" while deactivated. Every
  row has a checkbox and the list's header a select-all over the rows the search shows
  (`selectionReducer`, never stored; a row that leaves the list leaves the selection). While
  a row is selected the selection bar ("<n> selected", announced; "Cancel"; "Delete") stands
  where the toolbar was; its "Delete" opens the row's own delete dialog for one row and
  `BulkDeleteDialog` for more, which sends each row's id and the state it shows to
  `POST /api/form-connections/deletions`. After a `409 selection_changed` the dialog names the
  connection that changed, offers no retry (`hideConfirm`) and the list loads again behind it.
  Every deletion, single or bulk, from the overview or the details, ends on the overview with
  the red toast "“<name>” deleted." or "<n> connections deleted." and "Undo", which sends the
  restore of the deletion's id (`deletionReducer`): the rows come back without a reload and
  "restored." is announced; `409 not_restorable` says the deletion can no longer be restored;
  another failure offers "Undo" again. The deletion's id lives only with its toast: once the
  toast is gone (its 6 seconds, Escape, a newer toast, leaving the page), nothing can restore
  it from the UI
- **The details** (`/form-connections/:id`, L4, S15, S16): the status band, whose sentence is
  the page's h1, with the **date pill** under it (`StatusBand.tsx`, C1): the calendar, the line
  by state ("Active since <date>, <time>", "Active from <date>, 00:00", "Deactivated since
  <date>, <time>", a draft's "Edited <date>, <time>") and the ⋯ menu inside it ("Change start
  date", "Deactivate", "Delete connection" by state; a draft's "Delete draft", bug
  `new-visuals` B2); the band's picture, one per state, lies in a 241 px box at its top right
  (see "The visuals" above); while
  deactivated, "Activate again" stands next to the pill (spec 010, FR-015, FR-016). A
  scheduled connection reads "Your connection is scheduled" in the blue band and otherwise
  shows a live connection's details, every link with its copy button. "Change start date"
  opens `StartDateDialog` (`PUT …/start-date`, "Now" or a date), "Activate again"
  `ReactivateDialog` with "Active from"; a failure stays in the dialog with "Try again". Under
  the band, **three cards as one accordion** (one open at a time, or none): Links (open after
  publishing, scheduling and the edit flow's "Save"), Summary (open on every other arrival;
  the documents in the stored order, the rules as variant tabs and the rule checks' findings,
  computed in the browser with `useRuleChecks()` (`RulesSummaryContent`), never by the server)
  and Activity (`ActivityCard`: closed, one line from `last_activity`, "Last edited by …" or
  "Deactivated by …"; open, the entries newest first, 50 at a time, loaded again after an
  action on the page changed the connection; see [The activity](#the-activity-spec-010)). A
  stored draft's details show the Summary first, then the Links card without URLs, then the
  Activity, with "Delete draft" in the date pill's ⋯. A card's header row is its heading and
  the toggle; `DetailAccordion`'s `strip` slot adds a strip under that row, inside the header, so that it
  shows open and closed: the Summary's holds "Version …" and "Download PDF" (`PdfDownload`,
  spec 011, as clarified on 2026-11-18; see [The connection PDF](#the-connection-pdf-spec-011))
- **The documents step** (spec 010, S8): the documents stay in the team's order. A row is
  dragged to its place with a mouse, a pen or, after a 400 ms hold, a touch (`useRowDrag`
  feeding the pure `rowDragReducer`; no library and no HTML drag and drop; Escape or a
  release outside the list changes nothing), and its ⋯ menu offers "Move up" and "Move down"
  as the keyboard's way, announced in a status region; both go through `moveDocument()` of
  `rules/src/edits.ts`. The same ⋯, on every row, a single document's too, ends with "Remove
  document", which asks first (`documentMenuOf()`; the row has no trash since 2026-11-18). A new document goes to the end; "Undo" after a removal puts it back
  at its place. A document with more than 10 data items shows them under the catalog's data
  groups (`groupedFieldsOf()`: the catalog's `field_groups`, each group's items in catalog
  order; `null`, the flat list, for a document without groups or with an item outside them),
  each group headed by a checkbox (`FieldGroup.tsx`) that is ticked, clear or mixed; ticking
  chooses all its items, and clearing a fully ticked group clears them through the question
  that "All data items" asks when rules check the data, with its own title ("Stop requesting
  “<group>” data from <document>?"; the editor's removal of kind `'group'`, judged item by
  item by `dataRemovalOf()`). The groups come from `GET /api/document-types` only, never
  from a connection's documents
- **Vitest** tests the pure logic in Node, without a DOM: the modules of `rules/src/`
  and the sibling `utils.ts` of components, each with its `*.test.ts` beside it. `npm test`
  is a gate (constitution III), because the rules' propagation between branches runs only
  in the browser. In `frontend/` it is configured in the `test` block of `vite.config.ts`,
  which a `vitest.config.ts` would silently replace; `rules/`, which has no Vite build, has
  its own `rules/vitest.config.ts`
- The **rule checks** (spec 003) run in the browser, in a module Web Worker that the
  editor page starts through `useRuleChecks()`; Vite builds the worker into a chunk of
  its own. See [Rule consistency checks](#rule-consistency-checks-spec-003)
- **Agent access** (spec 007) adds three signed-in screens in `AppLayout`, each with one
  `h1` (`contracts/ui-screens.md` of the spec, S1 to S3):
  - the **consent page** (`/authorize`, `pages/Authorize/`): an agent's OAuth authorization
    request, read from the query string, which a sign-in round trip keeps. It names the
    client (`GET /api/oauth/clients/{client_id}`), preselects the access level from the
    requested `scope` in `AccessLevelChoice`, says so when the agent asks for more than its
    current level, and sends "Allow" or "Deny" to `POST /api/oauth/authorize`, then follows
    the answer's `redirect_to` to the agent. A bad request is shown on the page, without a
    redirect;
  - the **user page** (`/account`, `pages/Account/`, reached through "Your account" in
    `UserMenu`): the account's agent connections and personal access tokens, with "Change
    access level", "Revoke" and "Create token"; a new token is shown once, in
    `TokenCreatedDialog`;
  - the **approval page** (`/approvals/:id`, `pages/Approval/`): what an approval request
    would do, from `GET /api/approval-requests/{id}`. For `publish` it shows the publish
    step's summary of the stored draft and the findings of the rule checks, computed in the
    page with `useRuleChecks()`; for the other actions the connection and the URLs it
    affects; with spec 010 also the start date the agent asked for, the `set_start_date`
    action, and the example's line while the stored draft is the unchanged example.
    "Approve" and "Decline" give way to the outcome (done, declined, expired, replaced,
    cancelled with its reason, another team member's request, or a failure with "Try
    again").

  The rules step's menus have **"Copy link"** for a variant, a rule and a group, and
  `FormConnectionEdit` opens a link's `step`, `variant` and `item` search parameters, with
  `LinkNotice` when what it names no longer exists (see
  [Agent access and the MCP server](#agent-access-and-the-mcp-server-spec-007))

### backend

**Tech Stack**: FastAPI, SQLAlchemy 2, Alembic, psycopg 3, Pydantic 2, Python 3.13

```
backend/
├── app/
│   ├── routers/          # APIRouter modules (one per resource): auth.py,
│   │                     # document_types.py, option_sets.py, form_connections.py,
│   │                     # connect.py; spec 007: oauth.py, agent_access.py,
│   │                     # approval_requests.py
│   ├── services/         # Domain logic shared by routers and worker:
│   │                     # auth.py (sign-in), eudiplo.py (EUDIPLO client), dcql.py,
│   │                     # form_connections.py, drafts.py (spec 005: saving,
│   │                     # publishing and deleting drafts), rules.py (branches, rule
│   │                     # sets and their checks), rules_texts.py (the rules' messages
│   │                     # in both languages, spec 009), document_requests.py (trigger, pull,
│   │                     # statuses), documents.py (field extraction),
│   │                     # evaluation.py (the rules on the shared documents),
│   │                     # qr.py, worker.py; spec 007: oauth.py (the authorization
│   │                     # server), agent_access.py (the user page, the draft limit),
│   │                     # approvals.py (approval requests); spec 010: start_dates.py (a
│   │                     # start date's day in Germany), activity.py (the activity),
│   │                     # deletions.py (bulk deletion, restore, finishing deletions)
│   ├── catalog.py        # Document types, their fields, and each field's kind, parts,
│   │                     # multiple_values (whether it can hold several values) and data
│   │                     # group (spec 010)
│   ├── example.py        # The example connection's content in both languages (spec 010)
│   ├── option_sets.py    # The value sets of enum fields: countries, sex, licence
│   │                     # classes, eye and hair colours
│   ├── cli.py            # Accounts: create-user, set-password, delete-user; clear-connections
│   ├── config.py         # Settings via pydantic-settings, with the startup check
│   ├── db.py             # Engine, sessionmaker, get_db dependency
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── errors.py         # Exception handlers, log_server_error, describe_error
│   ├── language.py       # Text, the request's language (spec 009)
│   └── main.py           # FastAPI app entry point; its lifespan runs the worker,
│                         # LanguageMiddleware sets the request's language, and it
│                         # redacts references in uvicorn's access log
├── alembic/              # Database migrations
├── scripts/              # Developer scripts, not in the production image:
│                         # issue_test_credentials/ issues test documents to a wallet,
│                         # export_check_fixtures.py writes the rule checks' fixtures
│                         # and the parity fixture of the server's messages (spec 009)
├── tests/                # pytest suite: conftest.py, fake_eudiplo.py, helpers.py, api/, unit/
├── .python-version       # Interpreter uv provisions (3.13)
├── pyproject.toml        # Dependencies + ruff/mypy/pytest config
└── uv.lock               # Fully resolved dependency pins
```

**Key Decisions**:
- **Synchronous** SQLAlchemy `Session`, not `AsyncSession`. FastAPI runs sync
  route handlers in a threadpool, which is adequate at this scale and keeps the
  code simpler. Switching to async means changing the driver, the engine, the
  sessionmaker, and every handler together.
- psycopg 3 (`postgresql+psycopg://`) as the driver. `asyncpg` is not installed
  and will not work with the sync engine.
- `pool_pre_ping=True` so stale pooled connections are detected rather than
  surfacing as errors on first query. The pool holds `pool_size=10` connections
  plus `max_overflow=20`, for the request handlers and the worker's calls.
- Dependencies are declared in `pyproject.toml` and pinned in `uv.lock`. Both
  Dockerfiles install with `uv sync --frozen`, so a stale lockfile fails the
  build instead of silently resolving different versions.
- Only libraries the code imports are declared.
- Domain logic lives in `app/services/`, so the routers stay thin and the worker
  reuses the same functions.
- **The catalog's data groups** (spec 010, FR-077 to FR-080, research R8, data-model §6):
  `FIELD_GROUPS` in `app/catalog.py` lists the groups in the panel's order (Name, Birth,
  Address, Document, Licence, Appearance, Other details), each with its German label, and
  every field of a document with more than `MAX_FIELDS_WITHOUT_GROUPS` (10) fields names its
  group's key in `CatalogField.group`; `CatalogDocumentType.field_groups()` answers the groups
  a document uses, empty for 10 fields or fewer. The groups change neither the catalog's
  order nor its keys or claims, so nothing changes for EUDIPLO or serviceBW. Only
  `GET /api/document-types` answers them: each document type's `field_groups` (`FieldGroup
  { key, label }`, the label through `label_of()`) and each field's `group`
  (`routers/document_types.py`, `_document_type_view()`); every other `DocumentField` (a
  connection's or a draft's documents, the approval previews) carries `group: null`, since the
  panel and `get_catalog` read the groups from the catalog (design-notes §4.2 T072 (1), T084
  (9)). Agents still choose data items one by one: no endpoint or tool takes a group.
- Outside development the backend refuses to start unless `CONNECTION_BASE_URL`
  is set and uses `https://` (or `ALLOW_PLAIN_HTTP=true`): the connection URLs
  that DO.IT copies into serviceBW are built from it.
- Developer scripts live in `scripts/` and run with `uv run python -m scripts.<name>`.
  They aren't in the production image, so they may use `dev` dependencies such as
  Faker, and `app/` never imports them. They may import `app.catalog` and other
  modules without side effects, but not `app.config`, which checks the middleware's
  settings at import. `issue_test_credentials` issues test documents with an EUDIPLO
  client of its own, since the middleware has no issuance role, and prints the fake
  person's data, which the app never does.

### Sign-in (DO.IT team members)

- **Accounts** are rows in `user_accounts` with an Argon2id password hash
  (`argon2-cffi`). Only the command-line tool `app.cli` creates, changes and
  deletes them; the UI has no account management.
- **Sessions** are rows in `login_sessions`. Signing in stores the SHA-256 hash of
  a random token, and the token goes to the browser in the `session` cookie:
  `HttpOnly`, `SameSite=Strict`, `Path=/api`, and `Secure` unless
  `APP_ENV=development`. A session lasts `LOGIN_SESSION_HOURS`; signing out
  deletes the row, and the worker deletes expired ones.
- **Protected routes** depend on `get_current_user`, which answers `401` without a
  valid session, or on `get_current_principal`, which also accepts an agent's bearer token
  (see [Agent access and the MCP server](#agent-access-and-the-mcp-server-spec-007)).
  `/api/health`, the sign-in itself and the OAuth endpoints that the protocol leaves open
  (the metadata, registration and the token endpoint) are open.
- **CSRF**: every `POST`, `PUT` and `DELETE` must be sent as
  `application/json`, or `require_json` answers `415`. A cross-site page can't send
  JSON with cookies without a CORS preflight, which only `CORS_ORIGIN` (development)
  or the app's own origin passes. `SameSite` alone isn't enough, because PR previews
  under the same domain count as the same site.

### EUDIPLO client

`app/services/eudiplo.py` is a synchronous `httpx2.Client` (5 s connect and 10 s
read timeout) for the seven management API calls the middleware uses
(`specs/001-servicebw-eudi-middleware/contracts/eudiplo-usage.md`). It caches the
OAuth token in memory, renews it 5 minutes before it expires, and fetches a new one
once after a `401`. Responses are read into hand-written Pydantic models that ignore
unknown fields. `http_error_for()` turns its errors into the API's answers: `503
Not configured` or `502 Upstream error`, each with a generic message and an
`error_id`. The missing setting or the failed call is named only in the log, under
that ID (see Error Handling). It never logs
tokens, secrets, response bodies or session credentials; a validation error, which
would quote the body, is replaced by a terse one. Tests swap in a client with an
`httpx2.MockTransport` (`tests/fake_eudiplo.py`).

**Transactions around EUDIPLO calls**: no database connection is held while EUDIPLO
answers. A service ends its read transaction before the call and opens a new one
afterwards. If what happens next depends on a row, it locks the row then
(`db.refresh(row, with_for_update=True)`) and checks its state again, because the worker
or another request may have changed it meanwhile: `apply_status()` in
`services/document_requests.py` and the pull do this. A number that must stay unique is
reserved before the call: `create_revision()` inserts the next revision under the row lock
and commits, calls EUDIPLO, then locks again to make it current (see
[Form connections](#form-connections); the rules save joins that last transaction, see
[Rules and branches](#rules-and-branches-spec-002)).

### Form connections

`app/routers/form_connections.py` is the management API
(`specs/001-servicebw-eudi-middleware/contracts/management-api.md`, for drafts
`specs/005-connection-drafts/contracts/management-api.md`, and for scheduling, the activity,
restorable and bulk deletions, the document order and the example
`specs/010-revamp-backend-gaps/contracts/management-api.md`, with the columns and transitions
in its [data-model.md](../specs/010-revamp-backend-gaps/data-model.md)), and
`app/services/form_connections.py` holds its logic, `app/services/drafts.py` that of
drafts, `app/services/start_dates.py` the start date's day in Germany and
`app/services/deletions.py` the bulk deletion, the restore and the deletions' end:

- **Revisions**: each set of documents is an immutable revision with its own EUDIPLO
  presentation configuration, `fc-<id>-r<n>`. Creating a form connection stores
  revision 1; changing its documents stores the next one, which only requests
  triggered afterwards use. The name and the description create no revision, and
  the connection URLs never change.
- **Creating a revision** (`create_revision`) holds no transaction while EUDIPLO
  answers. Under the form connection's row lock it takes the next number and inserts
  the revision, not yet current; then it creates the configuration; then it locks the
  row again and makes the revision current. Two edits at the same time therefore get
  distinct numbers, and if EUDIPLO fails, the revision is removed again.
- **Drafts** (spec 005; research R1 to R8 in `specs/005-connection-drafts/`, the columns
  in its [data-model.md](../specs/005-connection-drafts/data-model.md)): a row of
  `form_connections` is a draft or a published connection, never both, and a published
  connection never becomes a draft again. A draft has `published_at` null, its content
  (documents, branches and the editor's step; `DRAFT_CONTENT` in `schemas.py`) in the
  JSONB column `draft`, and a `draft_version` that is 1 when created and goes up by one
  with every save. It has no revision, rule set, branch rows or EUDIPLO configuration, so
  `current_revision` and `current_rule_set` are null. Its name is required, its
  description may be `''` like a published connection's, and `is_active` means nothing
  until it is published. The CHECK constraint `ck_form_connections_draft_or_published`
  holds the two states: `published_at`, `current_revision` and `current_rule_set` all
  set and `draft` and `draft_version` null, or the other way round. The migration
  (`d2b97ba4a2c7_connection_drafts`) published every existing row as of its
  `created_at`, and its downgrade deletes the drafts first. Since spec 010 a deleted draft's
  row stays too, marked deleted, until its restore time has passed (see "Deleting, and taking
  it back" below).
- **The draft endpoints**: `POST /api/form-connections/drafts` stores a new draft,
  `PUT …/{id}/draft` replaces its content and raises its version, `POST …/{id}/publish`
  publishes it, and `DELETE …/{id}/draft` marks it deleted, restorable for
  `DELETION_UNDO_SECONDS`. Only publishing calls EUDIPLO.
  `GET /api/form-connections` lists drafts with the published connections, each with its
  `status`, and `GET …/{id}` answers a draft's content and version, without URLs. The
  refusals, all `409` with the `{error, message}` detail:
  - `draft_changed`: a save or publish with a `version` that another save has since
    raised, unless the body says `replace: true`. The editor offers "Reload" or
    "Replace their changes";
  - `draft_published`: a draft endpoint on a published connection, also with
    `replace`;
  - `not_published`: an endpoint of published connections (`PUT …/{id}`,
    `…/deactivate`, `…/activate`, `DELETE …/{id}`) on a draft. Their reads go through
    `find_published_form_connection()` and `_lock_published_form_connection()`, which
    also narrow `current_revision` and `current_rule_set` to `int`.

  Saving and publishing check the version once before the content is checked, so that a
  stale editor meets the conflict, and again under the row lock.
- **The `complete` switch**: a draft save runs the same validators as publishing with
  `complete=False` (`clean_documents`, `rules.clean_rules`): the structure is checked
  (unknown document types and fields, duplicates, the limits, identifiers, groups,
  marks), the completeness is not (at least one document and field, variant, rule and
  group names being present, unique and not reserved, a rule's data, check and
  message). The connection's name is required in a draft too. `clean_description`
  runs the same way on every path: it trims, allows `''` and refuses more than 500
  code points ("The description can have at most 500 characters."). Publishing a draft
  runs the checks of `POST /api/form-connections` unchanged, with the same messages.
- **Publishing goes through `create_revision()`**, with a `DraftGuard(version,
  replace)` instead of a second save path. The guard is checked under both row locks,
  before the revision is reserved and before it becomes current. Under the last lock,
  `_publish()` makes the reserved revision current, writes rule set 1 and the branch
  rows (`rules.first_rule_set()` with the row's counters), applies the name and the
  description, sets `published_at` and clears `draft` and `draft_version`, in one
  commit. If EUDIPLO fails, the row stays a draft. If the guard refuses under the last
  lock (another publish won, or a save raised the version and this publish has no
  `replace`), the configuration is deleted and the revision removed again.
- **The four states** (spec 010, research R1, data-model §1.2): a connection's `state` is
  derived, never stored, by `state_of()`, the one place that derives it: `draft`
  (`published_at` null), `live` (published and `is_active`), `scheduled` (published, not
  active, with a `start_date`) and `deactivated` (published, not active, without one).
  `STATE_CONDITIONS`, right under it, says the same in SQL for the search's `status` filter
  and the worker's scheduled starts; a change to one changes the other. A scheduled
  connection is a published connection whose `is_active` is false, so everything that reads
  `is_active` (the connection URLs, the trigger, the worker's cancel step) treats it as not
  usable without a change. `status` stays `'draft' | 'published'`, the discriminator of
  `FormConnectionOrDraft`; `state` is what the UI and the agents show. The CHECK
  `ck_form_connections_start_date` allows a `start_date` only on a published, inactive row,
  and the partial index `ix_form_connections_start_date` serves the worker's scan.
- **Scheduling** (FR-001 to FR-014, research R2, data-model §1.3): a start date is a
  calendar day in Germany (`YYYY-MM-DD`, shown as written), and the connection becomes
  active at 00:00 of that day in `Europe/Berlin` (`start_instant()`; midnight exists on every
  day there). It is set by publishing on a date (`start_date` in the body of
  `POST …/{id}/publish` or `POST /api/form-connections`: published and calling EUDIPLO as any
  publish, so the URLs exist at once, but not active), by "Activate again" on a date
  (`POST …/{id}/activate` with `ActivateRequest`; an empty body is "now"), and by
  `PUT …/{id}/start-date` (`StartDateUpdate`): a scheduled connection's date moves, or `null`
  makes it live now; a live connection given a date is scheduled and its open requests are
  cancelled, while `null` changes nothing; a deactivated connection answers `409
  status_changed`, a draft `409 not_published`. A scheduled connection given the date it
  already has answers `200` and writes nothing. Activating a scheduled connection answers
  `409 status_changed`; deactivating it ends the schedule (`start_date` null, `deactivated_at`
  now). Saving a published connection (`PUT …/{id}`) takes no date and never changes one.
  Every status change locks the row through `_lock_for_status_change()` (and, for a date,
  `_lock_for_start_date()`), which refuses the state the action doesn't apply to and an
  approval's stale snapshot (`expected: StatusSnapshot(was_active, was_start_date)`). **Only
  the worker's first step activates on a date** (`activate_due_connections()`, see
  [Background worker](#background-worker)), with `activated_at` at the start, also when the
  middleware wasn't running then.
- **The start date is checked before EUDIPLO and under the locks** (FR-003): `check_start_date()`
  passes `None` ("Now") and hands a date to `start_dates.clean_start_date()`, which refuses
  today or an earlier day in Germany with `400 invalid_start_date` ("Enter a date after
  today."). Every path that takes one checks it first, before it reads the connection, so an
  invalid date answers `400` before a `404` or `409`, and again under the row lock, so that a
  day that ends between the dialog and the save is refused and nothing changes. A publish
  checks it before EUDIPLO is called and again under both of `create_revision()`'s locks,
  after the `DraftGuard` and refused as the guard refuses: under the first lock nothing is
  reserved or called yet; under the last, after EUDIPLO answered, the configuration is
  deleted, the revision removed and the row stays a draft. `create_form_connection()` has no
  row to lock before its insert: its second check runs in the transaction that inserts the
  row, after EUDIPLO answered. The content's checks come before the date's, and
  `create_revision()` takes a date only with a guard. Publishing on a date records
  `published` then `scheduled`.
- **The status dates** (FR-015 to FR-021, data-model §1.1, §1.4): `published_at` is when the
  draft was published, "Now" or on a date; `activated_at` when the connection last became
  active (publishing "Now", its start, "Activate again" or "Change start date" with "Now"),
  null for a draft and a connection never active; `deactivated_at` when it was last
  deactivated, kept after a reactivation and shown only while it is deactivated.
  Deactivating twice or activating an active connection changes no date and records
  nothing; a save, rename or reorder changes no status column. The answers carry them with
  `state`, `start_date`, a draft's `step` (`FormConnectionSummary`) and `last_activity`. Their
  migration (`bfd1be13755d`) set `activated_at` to `published_at` and a deactivated row's
  `deactivated_at` to its `updated_at`.
- **The document order** (FR-045 to FR-052, research R6, data-model §4):
  `document_order` (JSONB, default `[]`) holds the document type keys in the team's order,
  for a draft and a published connection alike. Every save path (`create_draft()`,
  `save_draft()`, `publish_draft()`, `create_form_connection()`, `update_form_connection()`)
  stores the order of `documents` as sent (`document_order_of()`), and every answer lists
  `documents` in the stored order (`ordered_documents()`: the stored keys first, any other
  document after them in catalog order, so `[]` is catalog order). The draft's content,
  every revision's `documents`, the DCQL query and its `config_hash`, the re-sync and what
  serviceBW receives stay in catalog order (`clean_documents()`), and so do the data items
  inside a document. A save that only reorders creates no revision and calls no EUDIPLO:
  under the row lock `update_form_connection()` writes the order only while the stored
  documents still equal the sent ones (in any order) and only when it differs, and records
  `documents_changed`; `create_revision(document_order=…)` writes it when its revision
  becomes current.
- **The example** (FR-054 to FR-061, research R7, data-model §5):
  `POST /api/form-connections/example` (browser only) stores a new draft through the same
  `_insert_draft()` as `create_draft()`, with `example_content()` of `app/example.py` in the
  request's language, the step `connection` and `example = 'unchanged'`; every call creates
  another, and it doesn't count towards the agents' draft limit. `app/example.py` is a leaf
  like `rules_texts.py` (it imports `app.language`, `app.catalog` and `app.schemas`, never
  `app.config`), so that `scripts/export_check_fixtures.py` writes the example in both
  languages to `rules/src/fixtures/example-connection.json` (generated: never edit it by
  hand), on which `rules/src/example.test.ts` runs the validation and the rule checks and
  expects nothing. A draft save that changes anything (`changes_between()`'s `changed`, a
  variant's description included; not a save that only moves the step) sets `example =
  'changed'`, which never goes back; publishing sets it null (`_publish()`), and
  `ck_form_connections_example` holds that. The publish dialog shows the example's line
  while the loaded draft is `'unchanged'` and unchanged in the page, the approval page while
  the stored draft is.
- **Deleting, and taking it back** (FR-033 to FR-044, research R5, R10, data-model §3): every
  deletion marks the row and keeps it. `_mark_deleted()`, shared by `delete_form_connection()`,
  `drafts.delete_draft()` and the bulk deletion, sets `deleted_at`, `deletion_id` (a UUID the
  router or the bulk deletion makes, one for the rows deleted together) and `deleted_by_id`
  under the row lock, keeps `updated_at` (`flag_modified`), cancels the open requests as
  deactivating does, removes a revision that a draft's publish in flight has reserved, stores
  the connection's waiting approval requests as `cancelled` with `draft_deleted` or
  `connection_deleted` (`approvals.cancel_for_deletion()`), so that a restore doesn't bring
  them back, and records `deleted`. It calls no EUDIPLO. Every delete answers a `Deletion {
  id, restorable_until }`. A marked row is gone for every read of the management API
  (`find_form_connection()` and `_lock_form_connection()` answer `404`; the list and the
  search filter it out). `POST /api/form-connections/deletions` (browser only; 1 to 500
  distinct items, each with the `state` the dialog showed) deletes drafts and published
  connections as one deletion: it locks every row in one `SELECT … ORDER BY id FOR UPDATE`,
  and if one is gone, deleted or in another state, it answers `409 selection_changed` with
  `changed_ids` and changes nothing. `_mark_deleted()` reads the clock for each row, so the
  rows of a bulk deletion get slightly increasing `deleted_at`, and the deletion's
  `restorable_until` is the first row's (`DELETION_UNDO_SECONDS` after it).
  `POST /api/form-connections/deletions/{deletion_id}/restore` (browser only, the account that
  deleted) locks the rows that the id still marks deleted, in id order as every deletion
  locks them, reads the clock only then, and either clears the three columns on all of them,
  keeping `updated_at`, and records `restored`, or answers `409 not_restorable` and changes
  nothing: for an unknown or already restored id, a row deleted at or before
  `deletions.restore_cutoff()`, or another account's deletion. It judges the rows it still
  finds, so a draft of a bulk deletion that the worker has already finished is not among
  them (open as T110 in the feature's `tasks.md`). Nothing else comes back: the requests and
  approval requests the deletion cancelled stay cancelled, and a scheduled connection whose
  day came meanwhile is activated by the worker's next cycle, as of its start. A deletion
  that an approved approval request runs has no `deletion_id` and no `deleted_by_id`,
  answers `id` null and can never be restored (FR-067), yet the worker finishes it only after
  the same restore time as a person's. `DELETION_UNDO_SECONDS=0` switches restoring off.
  After the restore time the worker's last step, `finish_deletions`, deletes the activity of
  those connections and the rows of deleted drafts (what deleting a draft did before spec
  010), and `delete_unused_configs` their configurations; a deleted published connection keeps
  its row for good, so that its URLs keep answering `409 unavailable`.
- **The reservation guard** (`_check_reservation()`, under `create_revision()`'s last lock): a
  draft deleted while its publish waited for EUDIPLO lost the revision the publish reserved;
  restored before that lock, the row would pass every other check, and making the number
  current would leave the published connection without its revision. The guard answers
  `404` and deletes the configuration, unless a later publish has reserved the same number
  since, whose configuration has the same id (`fc-<id>-r<n>`). Two windows stay, left by the
  user's decision (design-notes §4.2 T084 (1)); both need a delete and its "Undo" inside one
  publish's EUDIPLO call plus a second publish of the same draft: (a) the second publish can
  reserve the same revision between the first one's rollback and its `delete_config`, which
  then deletes the configuration the second publish's revision uses; (b) the configuration
  holds whichever of the two bodies EUDIPLO received last.
- **Deactivating and deleting** cancel the open requests in the same transaction,
  and call no EUDIPLO: the worker deletes the sessions and, once no request needs
  them (after a deletion also once its restore time has passed), the configurations. A
  deleted published form connection keeps its row, so its URLs keep answering `409
  unavailable`; a deleted draft's URLs answer `404` (see
  [serviceBW's connection URLs](#servicebws-connection-urls)); the management API answers
  `404` for both.
- **Clearing everything** (`python -m app.cli clear-connections`) deletes the rows of
  every form connection, with its revisions, branches, rule sets and requests. It
  first deletes the EUDIPLO session of every request that
  still has one, and deletes no row unless all of them are gone; a request that
  starts meanwhile stops it too. The configurations stay, as they hold no personal
  data.

### The activity (spec 010)

Every connection has an activity log: who changed what, shown in the details' Activity card
and read by agents with `get_activity`. The decisions are research R3 and R4 in
`specs/010-revamp-backend-gaps/`, the table its data-model §2; `app/services/activity.py` holds
the logic.

- **The table** `connection_activity` (`ON DELETE CASCADE` from `form_connections`, indexed on
  (`form_connection_id`, `occurred_at`)): `kind`, `occurred_at`, `position` (the entry's place
  among one action's entries), `variant_id` and `variant_name` for the kinds about a variant,
  `start_date` for `scheduled` and `start_date_changed`, and the person: `actor_name` (the
  team member's username when the entry was made, kept as text so that it survives the
  account), `agent_name` and `approved`. The kinds: `created`, `renamed`,
  `description_changed`, `documents_changed`, `variant_added`, `variant_removed`,
  `variant_renamed`, `rules_changed`, `published`, `scheduled`, `start_date_changed`,
  `became_active`, `deactivated`, `reactivated`, `deleted`, `restored`. Nothing else is ever
  written: no view, copy or test, no declined or expired approval request, no rule's
  content, message or value (FR-029); a change of a variant's description alone writes no
  entry. Nothing in the module logs.
- **The `Actor`**: every service that changes a connection takes `actor: Actor` as a keyword
  argument without a default, so that no call site can leave it out. The routers build it
  from the call's principal with `actor_of()` (a browser session: the username; a bearer: the
  username of the account the agent acts for, with the agent's name, `agent_name()`), an
  approved approval request passes the approver with the asking agent and `approved=True`,
  and the worker passes `SYSTEM` (no person: the scheduled start, the re-sync).
- **What a save records** (data-model §2.3): `changes_between(before, after)` is a pure
  function over two contents (name, description, documents in their order, branches). The
  save paths call it with the content read under the row lock and the content they are about
  to store (`save_draft()`, `publish_draft()`, `update_form_connection()`, and
  `create_revision()` under its last lock), and record one entry per kind and variant: the
  name and the description compared as cleaned, the documents as the ordered list of
  (document type, fields), variants matched by id (added, removed, renamed), and a variant's
  rules when its own tree differs. For a variant linked to Standard only what is its own
  counts (its marked items and, while `operator_mark` is set, its top level's AND/OR), so a
  change of Standard that propagates is one entry, "Rules changed in Standard". Its answer's
  `changed` is true also when nothing is recorded but the content differs, which the
  example's mark reads. Status changes, deletions and restores record their own kind.
- **Writing and merging** (FR-025 to FR-027): `activity.record()` writes one action's entries
  in the transaction that makes the change, under the connection's row lock, with one
  `occurred_at` and each entry's `position` in the kinds' order (publishing on a date:
  `published` 0, `scheduled` 1). An entry whose kind, person (`actor_name`, `agent_name`,
  `approved`) and `variant_id` equal one of the entries at the connection's newest instant
  merges into it (its time moves to now, its `position`, `variant_name` and `start_date` take
  the new values); any other is inserted. So twenty rule edits of one agent on one variant
  are one entry, and anything in between starts a new one. A refused or failed change
  records nothing.
- **Reading**: `GET /api/form-connections/{id}/activity?cursor=` answers an `ActivityPage`,
  newest first (`occurred_at`, `position`, `id`, all descending but the id), 50 entries a
  page, with a keyset cursor built as the search's; a deleted or unknown connection answers
  `404`, an unknown cursor `400`. Agents may read it at every level. There is no endpoint
  that writes, changes or removes an entry (FR-031). `last_activity` on a connection and a
  draft is the closed card's line: while deactivated its newest `deactivated` entry,
  otherwise the newest entry with a person, else the newest entry.
- **Lifetime** (FR-030): entries stay as long as the row. Deleting doesn't touch them, so a
  restore brings them back; once a deletion can no longer be restored, the worker's
  `finish_deletions` deletes them (see [Background worker](#background-worker)). The
  migration (`bfd1be13755d`) wrote entries without a person for every existing connection
  that wasn't deleted: `created`, `published` (never before `created`) and `deactivated`.

### Rules and branches (spec 002)

`app/services/rules.py` saves and checks a form connection's branches and rules,
`app/services/evaluation.py` evaluates them at a pull, and the Rules step edits them
(`frontend/src/pages/FormConnectionEditor/RulesStep/`). The decisions are research R1
to R10 in `specs/002-connection-rules/`, the tables its
[data-model.md](../specs/002-connection-rules/data-model.md).

- **Rule sets**: a form connection's branches and rules are stored as immutable,
  numbered rule sets in `form_connection_rule_sets`, beside the revisions.
  `form_connections.current_rule_set` names the one new requests use, as
  `current_revision` names the documents, and the trigger reads both from the same
  row, so a request keeps the pair that was saved together (`document_requests.rule_set_id`).
  A rule set's `branches` is one JSONB snapshot of every branch that isn't deleted,
  main branch first: name, description, origin (`main`, `based` or `empty`), the top
  level's AND/OR and the tree of rules, groups and sub-groups, two levels deep. The
  Pydantic models in `schemas.py` (`RULE_SET_SNAPSHOT`) validate it on the way in and
  out. A save whose snapshot equals the current one adds no version; requests point to
  the old ones, which stay. Rules don't change what the wallet is asked for, so a
  rules-only save creates no revision and needs no EUDIPLO.
- **Branch identities**: `form_connection_branches` holds each branch's `id`, which its
  pull URL names, `is_main` (one main branch per form connection, a partial unique
  index) and `deleted_at`. Names and rules live in the rule sets, so a rename never
  changes a URL. A save that leaves a branch out marks it deleted, and its pull URL
  answers `409 unavailable` for good. Every form connection has a main branch,
  "Standard" until renamed; the migration gave existing ones a main branch without
  rules, and their requests started before it, without a rule set, are evaluated as
  met.
- **Identifiers**: rules are `rule-{n}`, groups and sub-groups `group-{n}`, numbered from
  the form connection's counters `next_rule_number` and `next_group_number`, which never
  go down. An identifier never changes and is never reused, because serviceBW may key
  on it. The editor numbers new items from the counters it loaded; the server checks
  them and shifts them past numbers another save took meanwhile.
- **Identifiers in a draft** (spec 005, research R4) come from the same counters of the
  draft's row (`number_draft()`: (1, 1) for a new draft, the row's under its lock for a
  save). The editor sends `numbering_base`, the counters it started from. An identifier
  below it counts as loaded and keeps its number; one at or above it is new and moves up
  past the numbers another save took meanwhile, the same way in every variant (a default
  name follows its new number). Each save raises the counters and never lowers them.
  Publishing checks the identifiers against the row's counters (`check_first_save()`)
  and writes rule set 1 with them (`first_rule_set()`), so a rule keeps the identifier
  that a draft save gave it.
- **Variant identifiers in a draft** (spec 007, research R10): every variant of a stored
  draft carries a UUID, although a draft has no branch rows. A draft save may send `null`,
  and the server assigns one (`_clean_branch()`), or a UUID that is unique in the body and
  isn't another connection's branch id (`check_draft_branch_ids()`); anything else is refused
  ("Unknown variant."). Publishing creates the branch rows with the draft's ids
  (`first_rule_set()`), so a variant's link and its pull URL name the same id before and after
  publishing. A save of a published connection may likewise give a new branch a client UUID.
  The migration `60d71d73af6d_agent_mcp_server` gave the variants of existing drafts ids.
- **Marks**: a branch based on the main branch is stored as its full tree, and each
  item carries a mark: none (follows the main branch, a copy of its item), `changed`,
  `removed` (shown, not evaluated) or `added`; `operator_mark` says that the top
  level's AND/OR was switched there. The evaluator, the details and the publish
  summary read the tree as it is, without merging anything. A based group with fewer
  than two active members counts as dissolved there; that is derived from the tree,
  not stored (`effective_items` in `evaluation.py`, and `tree.ts` in the browser).
- **Propagation runs only in the browser**: when the main branch changes in the Rules
  step, `propagateMain` in `rules/src/branches.ts` updates every based
  branch (data-model.md, "Propagation from the main branch"), so the step shows each
  branch's rules at once. The server doesn't propagate: it checks every saved snapshot
  against the invariants that a correct propagation satisfies (every main-branch item
  once in each based branch, unmarked and removed items equal to the main branch's,
  marks only in based branches) and refuses a violation with `400` "The variant … is
  out of step with Standard", so a propagation bug can't reach serviceBW. Vitest pins every
  propagation rule and mark transition in `branches.test.ts`.
- **One implementation of editing**: `rules/src/edits.ts` holds the editor's actions on the
  rules as pure functions (add, change, delete, group and reset items, add and delete
  variants, and so on), the compositions of `branches.ts` and `tree.ts`. The Rules step's
  reducer calls them, and so does every draft-changing tool of the MCP server, so that an
  agent's change stores the same content, marks and identifiers as the editor's. Each takes
  the branches and the counters and answers the new state or a refusal with the editor's
  message; a new variant's id is the caller's (the editor's `crypto.randomUUID()`).
  `edits.test.ts` replays the reducer's cases.
- **Codes beside messages** (spec 009, research R10): a `RulesProblem` (`rules/src/types.ts`)
  carries `code`, the key of its message in `RULES_MESSAGES`, `CONDITION_PROBLEM_MESSAGES` or
  `EDIT_MESSAGES` (`'chooseData'`, `'noMessage'` …), beside the message in the context's
  language; an `EditRefusal`'s `code` is optional, since the MCP server builds some refusals
  without one. Callers branch on the code, never on the message, as the MCP server does
  (`mcp/src/findings.ts`, `mcp/src/tools/checks.ts`). The server's messages are mirrored word for word in both
  languages and pinned by the parity fixture (see [Languages](#languages-spec-009)).
- **Saving**: `POST` and `PUT /api/form-connections` take the rules with the rest, so
  documents, branches and rules change together or not at all. The server checks the
  name and the documents, then the rules against the documents the save leaves current,
  before anything is written or EUDIPLO is called; a refusal is a `400` whose message
  names the problem, the rule and its branch, in the words of the Rules step's own
  checks (`rules/src/validation.ts`). Rules alone are saved in one transaction under
  the form connection's row lock. With changed documents, `create_revision` runs as
  before, and its final locked transaction, which makes the revision current, also
  saves the rule set (`save_rule_set()`). Creating a form connection saves its branch
  rows and rule set 1 in the transaction that inserts it.
- **`409 rules_changed`**: `GET /api/form-connections/{id}` returns `rule_set_version`,
  and the editor sends `rules` only when the team member changed them, with
  `base_version`, the version it loaded. If another save made a newer rule set current,
  the save is refused with `409 rules_changed` (`check_rules_version()`), before the
  rules are checked (so a stale editor meets this answer, not "Unknown variant.") and
  again under the row lock.
  Its message names the variants that replacing would delete or bring back with a new
  result link. The save dialog offers "Reload" or "Replace their changes", which sends
  the same save with `replace: true`: the rule set is the unit, since the server can't
  merge two saves without propagating. The name and the documents keep "the later save
  wins".
- **Kinds and value sets**: the catalog gives each field its kind (text, number, date,
  enum, image, or made of parts), its value set and its parts, such as the place of
  birth's country or a licence class's issue date, and `GET /api/document-types`
  returns them. It also says whether a field or part can hold several values
  (`multiple_values`: the PID's nationalities and the driving licence's classes), which
  the rule checks of spec 003 need; the evaluation treats a single value as a list of one.
  `GET /api/option-sets` (`routers/option_sets.py`, signed in) returns the value sets of
  `app/option_sets.py`, so the menus, the server's checks and the evaluation use the
  same values; licence classes come with their descriptions.
- **Evaluation**: computed at each delivery, from the documents just read from EUDIPLO
  and the called branch as the request's rule set has it (see
  [serviceBW's connection URLs](#servicebws-connection-urls)). It is a pure function
  without database or EUDIPLO. Dates count by **Germany's calendar day** of sharing,
  the date in `Europe/Berlin` (`zoneinfo`, loaded at import, so a missing time zone
  database fails at start-up) of the request's `completed_at`; anniversaries of 29
  February fall on 1 March. Text compares trimmed, NFC-normalised and, ignoring letter
  case, `casefold()`ed. A rule is `met`, `not_met` or `not_checked` (missing or
  unreadable value, which counts as not met). The evaluation is **never stored and
  never logged**: its results and messages are about the citizen, so it goes with
  the documents, and repeated pulls compute it again, the same, since the day of
  sharing is fixed.

### Rule consistency checks (spec 003)

While the team member edits, the Rules step checks each variant's rules and shows its
**findings**: rules and groups that conflict, that are duplicates or covered by others,
or that are always met, and variants that no citizen can meet or that every citizen
meets. The decisions are research R1 to R15 in `specs/003-rule-consistency-checks/`.
The checks have no endpoint, table, setting or dependency of their own.

- **In the browser, in a module Web Worker**: `useRuleChecks()`
  (`frontend/src/hooks/useRuleChecks.ts`), in the editor page
  (`pages/FormConnectionEditor/index.tsx`), builds each branch's checked tree on the main
  thread after every change (`checks/checkedTree.ts` in `rules/src/`, with a fingerprint, so
  an unchanged branch reuses its cached result) and starts a module worker,
  `new Worker(new URL('../workers/checks.ts', import.meta.url), { type: 'module' })`,
  for the others: the shown branch first, then the rest in tab order. The worker
  (`frontend/src/workers/checks.ts`) runs the solver and the findings (`checks/solver.ts`,
  `checks/findings.ts`, the theories per kind) and posts each branch's result as it
  finishes. A change during a run terminates the worker and starts a new one. A run has
  5 seconds from the change; branches it can't finish count as not checked completely,
  and a worker that can't start leaves every branch not checked completely, while
  editing goes on. Vite builds the worker into a
  chunk of its own under `assets/`, so the solver and the case-folding table stay out of
  the main bundle. The run state is the pure reducer of `checks/runState.ts`; the modules
  of `rules/src/checks/` are pure, and only `frontend/src/workers/checks.ts` and the hook
  touch browser APIs.
- **Shown in two places only**: the Rules step (notes under rules and groups through
  `FindingNote`, the findings banner, the variant tab's icon and tooltip, and a polite
  status region, `FindingsAnnouncer`) and the publish and save dialog, which lists the
  variants with findings. Findings never block Publish or Save. Every finding text comes
  from `checks/findingMessages.ts`, which composes it from the words of `checks/findingTexts.ts`
  in either language (spec 009). The details page never shows them. Spec 007 shows them
  in a third place, the approval page of a publish request, and runs the same checks for
  agents in the MCP server, with `resolutionOf()` in `findingMessages.ts` saying what would
  resolve each finding (see
  [Agent access and the MCP server](#agent-access-and-the-mcp-server-spec-007)).
- **Never stored, sent or logged**: findings exist only in the page's memory. They are
  not part of a save, no request carries them, nothing in `checks/`, the worker or the
  hook writes to the console, and the hook handles the worker's errors so that the
  browser doesn't log them. Nothing changes for serviceBW or the server.
- **The catalog's `multiple_values`**: whether a field or part can hold several values
  comes from `app/catalog.py` through `GET /api/document-types`
  (`api-types/src/document-types.ts` mirrors it), so that a rule set requiring two
  nationalities isn't reported as a conflict.
- **In step with `evaluation.py`**: the checks judge each condition as the evaluator
  does: text trimmed, NFC-normalised and case-folded with Python's `str.casefold()`,
  dates by the evaluator's calendar arithmetic. Two files are generated from the
  interpreter and the evaluator by `backend/scripts/export_check_fixtures.py`:
  `rules/src/checks/caseFolding.ts` (Python's case-folding table, which `checks/text.ts` uses) and
  `rules/src/checks/fixtures/evaluator-vectors.json` (Python's results for text normalisation,
  `years_after()`, `months_after()`, day numbers and rule outcomes), which the Vitest
  tests replay against `checks/text.ts`, `checks/calendar.ts` and the test evaluator. They
  are never edited by hand; after a Python upgrade or a change to the evaluator's
  comparisons, run `uv run python -m scripts.export_check_fixtures` from `backend/` and
  commit the result. Its `--check` writes nothing and fails on stale files, and
  `backend/tests/unit/test_check_fixtures.py` runs it. A brute-force oracle
  (`checks/testOracle.ts`, test-only) checks the solver's answers against an evaluator
  ported from `evaluation.py` (`rules/src/evaluation.ts`, since spec 004 production code
  that the test step shares; see "The test step and the test personas").

### The test step and the test personas (spec 004)

Before publishing, the team member sees how three sample citizens (personas) fare against
each variant's rules. The decisions are research R1 to R16 in
`specs/004-rule-test-personas/`, the shapes in its `contracts/personas.md`. The step has no
endpoint, table, setting or dependency of its own.

- **The step in the wizard**: `pages/FormConnectionEditor/TestStep/`, with no route of its
  own, in the create and the edit wizard. While any variant has a rule, or a rule editor is
  open, the Rules step's button to go on is "Test rules" (`rulesNextActionOf()`), and
  Publish and Save move to the test step; without rules, the Rules and Documents steps
  keep "Publish without rules" ("Save without rules"), which skips the test step. "Test
  rules" first asks about an open rule editor's changes, then goes through the same checks
  as publishing (`passesPreChecks()`): an incomplete condition, a missing message, a rule on
  data that isn't requested, or a variant without a (unique) name is refused where
  publishing would refuse it, in the Rules step. The publish and save dialog, opened from
  the test step, is the unchanged one; its "Check rules again" goes back to the Rules
  step, to the first variant with findings or the one that was open.
- **Generation in a module worker**: `usePersonas()`
  (`hooks/usePersonas.ts`) starts `frontend/src/workers/personas.ts`
  (`new Worker(new URL('../workers/personas.ts', import.meta.url), { type: 'module' })`) with a `generate` message: the checked
  trees, the slots to generate and a deadline. The worker runs `generatePersonas()`
  (`rules/src/personas/generation.ts`: the branches' outcome vectors found with spec 003's solver,
  then values per rule target, research R6 to R8) and posts one `generated` message. The
  run stops searching at `GENERATION_STOP_MS` (4.5 s from the start) and delivers the best
  personas so far; a watchdog fails the run at `GENERATION_WATCHDOG_MS` (5.5 s), and a worker
  that can't start or throws fails it too, with "Try again". A request during a running run is
  merged into it, and an answer for an older run id is ignored. The worker keeps no state, catches nothing and logs
  nothing. Prefixes of the vector search that the solver answers `'unknown'` are dropped after
  `MAX_QUESTIONS_BELOW_UNKNOWN` (14) questions, so that an unsolvable corner can't use up
  the deadline.
- **Evaluation on the main thread**: the personas' results are computed in the page, on
  every change, by `rules/src/evaluation.ts`, the port of `evaluation.py` (spec 003's
  test evaluator promoted to production code, so that the step shows exactly what the real
  evaluation answers). It and the checked trees are loaded by `usePersonas`'s one dynamic
  `import()` of `@connection-portal/rules/personas/results`, so the main bundle doesn't hold them (the step shows
  its loading state meanwhile). The vectors of `export_check_fixtures`, `rule_outcomes` and
  `branch_evaluations` (whole-branch outcomes), pin it to Python.
- **The day**: the test day is today in Germany, from `useTodayInGermany()`
  (`hooks/useTodayInGermany.ts`, read again every minute and when the page becomes visible),
  shown under the result's heading in the result card ("Tested as if shared today,
  19.11.2026", `TestDayLine`); ages and dates are judged on it.
- **Fill runs and substitution**: the step opening again (after the team member went back to
  the rules) keeps the personas. `opened` marks each persona that lacks a key for a
  field the rules now check as `filled`, and the others `kept`; a fill run generates only
  those slots. An empty value counts as present, and so does a hidden one (a value of a
  field no rule checks any more), so a field that comes back isn't generated again, and a
  field the team member emptied stays empty. For a `filled` slot the worker substitutes the
  persona's fixed values into the checked trees (`personas/substitute.ts`, rule by rule,
  through the evaluator) and plans only what is still free. `runSucceeded` writes the
  absent keys only: a value the persona has is never replaced. A `free` slot ("Generate
  again", "Generate all again") replaces all values, hidden ones too.
- **Lifetime**: the personas are the state of `usePersonas`' reducer
  (`personas/personaState.ts`), in the editor page. They live as long as the page: they
  survive going between the steps, and a reload, leaving the flow or a new create or edit
  flow starts with new ones. Edits (names, values, "Done") are part of that state.
- **Nothing stored or sent**: personas, their values and results are never saved, never in a
  request, and never logged (no `console.*` in `personas/`, its worker, `usePersonas` or
  `useTodayInGermany`). Publishing and saving don't change; serviceBW and the server don't
  know about the personas.

### Local drafts (spec 005)

The create flow keeps its unsaved work in the browser's `localStorage`, so that a closed tab,
a crash or an expired session loses at most the last second. A local draft is not a stored
draft: it never leaves the device by itself, and only "Save and exit" or publishing sends its
content, as the body of that request (see [Form connections](#form-connections)). The
decisions are research R9 to R12 in `specs/005-connection-drafts/`, the shapes in its
`contracts/local-drafts.md`. Local drafts have no endpoint, table, setting or dependency.

- **Key and format**: one entry per flow, under
  `connection-portal:local-draft:v1:<username>:<flowKey>`. The flow key is `new-<uuid>` for a
  connection never saved and `draft-<id>` for a stored draft. The value is a
  `LocalDraftRecord` as JSON, `format: 2`: the flow key, the stored draft's id and the version
  the flow loaded, `changedAt`, the step and the content, which is what "Save and exit" would
  send (name, description, documents, branches with an open rule editor's rule kept,
  `numberingBase` and the counters). Every read validates the record; one that doesn't match
  its key or format is skipped and removed. Records of format 1, which held the form ID
  before spec 006, are removed this way, not converted; the key prefix stays `v1`.
- **Pure modules, one binding hook**: `utils/localDrafts/` is pure: `keys.ts`,
  `format.ts`, `content.ts` and `store.ts`, each with its `*.test.ts`, beside
  `constants.ts` and `types.ts`. The store takes an injected `StorageLike`, which the tests
  fake in memory (`testStorage.ts`).
  `hooks/useLocalDraftStore.ts` creates the page's one store, inside `try/catch`, and every
  hook shares it. Besides it, only `hooks/useRememberedHomepage.ts` (spec 008, see below)
  and `components/LanguageProvider/` (spec 009, the key `connection-portal:language:v1`, see
  [Languages](#languages-spec-009)) touch `window.localStorage`. Every storage access in the store is in `try/catch`:
  blocked, full or missing storage makes local drafts silently unavailable, and the flow
  works without them.
- **The homepage flag** (spec 008, FR-027): `useRememberedHomepage()` keeps one flag per
  account beside the records, under
  `connection-portal:local-draft:v1:<username>:homepage:has-connections` (the key helper's
  `<prefix><account>:` and the tail `homepage:has-connections`), `true` or `false`: whether
  the account's list of connections and drafts held anything when it last loaded, so that `/`
  shows the welcome page or the overview while the list loads again. The `:` in its tail
  keeps the store from taking it for a flow key, so it is never listed, offered, expired or
  removed with the records. It holds nothing else, every access is in `try/catch`, and
  nothing is logged.
- **The hooks**: `useLocalDraft()` is the editor's autosave, for a new connection and a
  stored draft only, with its decisions in pure helpers of `hooks/utils.ts`
  (`isLocalDraftChange`, `localDraftActionOf`, `writeDelayOf`). A published connection's
  edit flow never reads, writes or offers a local draft, and the edit page removes a
  `draft-<id>` record once that connection loads as published. `useLocalDrafts()` lists
  the account's records for the offers on the welcome page, the overview and the
  first-connection flow (`components/LocalDraftsOffer/`), and refreshes on `storage` events
  from other tabs.
- **`?local=`**: the create routes (`/form-connections/new`, `/get-started`) name the flow's
  local draft in the search parameter `local` (`LOCAL_DRAFT_PARAM`). A fresh flow writes its
  new key there with `replace`, on the same route, so the wizard stays mounted. A URL whose
  key has a record opens from it; a search parameter survives the sign-in round trip after an
  expired session, which router state doesn't. "Resume" on an offer leads there too. A
  `draft-<id>` key without a record goes to the draft's edit route. On
  `/form-connections/:id/edit`, a draft's local draft that differs from the stored draft
  brings the "Restore" or "Discard" question before the editor mounts; an equal one is
  removed silently.
- **Writing and flushing**: after the first change, while the content differs from what the
  flow started with (the empty flow, or the stored draft as loaded), the record is written at
  once and then at most once per `LOCAL_DRAFT_WRITE_INTERVAL_MS` (1 s), the last change
  always. Mounting writes nothing, and a change back to the starting point removes the
  record; a stored draft's record resumed through `?local=` has no starting point the flow
  knows, so only `forget()` removes it. Pending writes are flushed on `pagehide`, on
  `visibilitychange` to hidden, on unmount or a new flow key, and before the sign-out
  warning (`flushPendingLocalDrafts()`); `localStorage` writes synchronously, so the flush
  completes before the page goes. A successful save or publish, "Reload" and "Open the
  connection" call `forget()`, which removes the record. If another tab removes the record
  while this flow holds unsaved work, the flow writes it again at once.
- **Expiry, account and sign-out**: a record without a change for 30 days
  (`LOCAL_DRAFT_MAX_AGE_MS`) is removed when the account's records are listed or read.
  Records belong to the signed-in username: the flow writes and the offers list only that
  account's. "Log out" in `UserMenu` flushes, lists the account's records and, if there are
  any, warns with "Log out and discard unsaved work?" (`SignOutDialog`, 005-S7); confirming
  removes them (`store.removeAll()`) and closes the account (`store.close()`), so that an
  editor's flush on unmount can't bring one back until the account signs in again
  (`reopen()` in `useLocalDraftStore`). An expired session (a `401`) keeps them.
  Spec 008's Q8 (e) replaced that dialog inside a flow: with unsaved work the editor asks
  "Save before you log out?" (see [frontend](#frontend), "The header pills and leaving a
  flow") and then calls `UserMenu`'s `logOut(onCancelled?)`. The old dialog stays as the one
  exception to Q8 (e) (spec 008 #67, decided 2026-11-09): outside a flow, "Log out" with
  local drafts on the device opens it, and in a flow `logOut()` opens it after the editor's
  question when the account still has other records (its "Cancel" calls `onCancelled`).
  `UserMenu`'s dialog, `logOut(onCancelled?)`, `SignOutDialog.tsx`, `SIGN_OUT_COPY` and
  `signOutNamesOf` stay.
- **Known limit** (research R11): another tab of the same account, in which the team member
  goes on editing after logging out elsewhere, writes its record again until its next API
  call signs it out. The record is then offered at the next sign-in.
- **Never personas, findings or citizen data**: a record holds the connection's set-up only,
  not the open variant tab, the rule editor's position, personas or findings. Nothing in
  `utils/localDrafts/` or its hooks logs (no `console.*`) or calls the API.

### Agent access and the MCP server (spec 007)

Team members connect LLM agents on their own machines (Claude Code, Cursor, Codex) to the
middleware through an MCP server, give each one an access level, and approve what it may not do
alone. The decisions are research R1 to R20 in `specs/007-agent-mcp-server/`, the tables and
states its [data-model.md](../specs/007-agent-mcp-server/data-model.md), the shapes its
`contracts/` (`mcp-tools.md`, `oauth.md`, `management-api.md`, `ui-screens.md`,
`guidance.md`).

- **Topology** (research R2, R3): `mcp/` is a Node service, `@connection-portal/mcp`, in a
  container of its own (`mcp`, port 3100). It has no database: every tool call goes to the
  backend's management API at `BACKEND_URL`, with the agent's own bearer token. In production,
  nginx is the only public entry and has three locations for agents:

  | Location | Goes to | What |
  |---|---|---|
  | `= /mcp` | `mcp:3100` | The MCP endpoint, every method, unbuffered, with a 600 s read timeout (a stream may stay open while a tool waits for an approval) |
  | `^~ /.well-known/oauth-protected-resource` | `mcp:3100` | The protected resource metadata (RFC 9728), in the root and the path form (`…/oauth-protected-resource/mcp`) |
  | `= /.well-known/oauth-authorization-server` | `backend:3000` | The authorization server metadata (RFC 8414) |

  The OAuth endpoints themselves live under `/api/oauth/`, which `/api/` already forwards, and
  the consent page is the SPA's `/authorize`. In development there is no nginx: the MCP server
  listens on `http://localhost:3100` (`/mcp`, its metadata and `/health`), the backend on 3000,
  the SPA on 5173. The MCP endpoint serves protocol 2026-07-28 statelessly and 2025-era clients
  (2025-11-25, 2025-06-18, 2025-03-26) in sessions (`Mcp-Session-Id`) that live in memory, are
  bound to the SHA-256 of the bearer that opened them and close after 30 idle minutes, so the
  server runs as **one replica**. The SDK is `@modelcontextprotocol/server` 2.4.0 with
  `@modelcontextprotocol/node` 2.1.2 and `zod` 4, pinned to exact versions.
- **The backend is the OAuth 2.1 authorization server** (research R4; `routers/oauth.py`,
  `services/oauth.py`, the metadata in `main.py`), the MCP server the protected resource. A
  client identifies itself with a Client ID Metadata Document (an `https://` `client_id` the
  backend fetches and caches for 24 hours) or, as a fallback, by dynamic registration
  (`POST /api/oauth/register`, no secret). The authorization endpoint is
  `{PORTAL_URL}/authorize`, the consent page, which calls `POST /api/oauth/authorize` with the
  cookie; the code lives 5 minutes, PKCE is `S256` only, and every token is bound to the
  resource `MCP_URL`. `POST /api/oauth/token` issues access tokens (`cp_at_`,
  `AGENT_ACCESS_TOKEN_MINUTES`) and refresh tokens (`cp_rt_`, `AGENT_CONNECTION_IDLE_DAYS`),
  rotated at every use; a retired refresh token used again revokes the agent connection.
  Personal access tokens (`cp_pat_`, research R6) are created on the user page, with an expiry
  of at most `AGENT_TOKEN_MAX_DAYS`, for clients without browser sign-in. The tables
  (`oauth_clients`, `oauth_codes`, `agent_authorizations`, `agent_tokens`) hold the SHA-256 of
  every code and token, never the secret. The OAuth endpoints answer RFC 6749 and RFC 7591
  bodies, not the `{data}` envelope (constitution, Principle I).
- **The bearer principal** (research R5; `services/auth.py`): `get_current_principal` reads an
  `Authorization: Bearer` header (an unexpired access or personal access token) or, without
  one, the cookie session, and answers a `Principal { user, authorization }`, whose
  `authorization` is `None` for the browser. It touches the authorization's `last_used_at` at
  most once a minute. `require_level('drafts')` refuses a bearer below that level with
  `403 insufficient_access` and `needs_access_level`; `require_browser_session` refuses every
  bearer with `403 browser_only` ("This action is done in Konnekt."), on the
  endpoints that agents reach only through approval requests, `PUT /api/form-connections/{id}`,
  the user page's and the approval page's endpoints and `/api/auth/*`. Spec 010 adds
  `PUT …/{id}/start-date` (agents ask with `set_start_date`), and
  `POST /api/form-connections/example`, `POST /api/form-connections/deletions` and its restore,
  which no tool offers (FR-068). `get_current_user` stays the cookie-only dependency. The
  table of who may call what is in the spec's `contracts/management-api.md`. `/api/connect/`
  is unchanged.
- **Three access levels**, one value per agent connection or token (`access_level`), each
  including the one before:

  | Level | UI name | Allows |
  |---|---|---|
  | `read` | Read only | Every read, `check_rules`, `test_applicants`, `get_guide` |
  | `drafts` | Read and edit drafts | Also every change to a draft, and approval requests to publish or delete a draft |
  | `manage` | Read, edit drafts and manage live connections | Also approval requests to deactivate, reactivate, change the start date of (`set_start_date`, spec 010) or delete a published connection |

  No level changes a published connection's content. The level is read from the row at every
  call, so a change on the user page applies from the agent's next call; tokens carry none.
  The MCP server asks `GET /api/agent/me` once per request and refuses a tool above the level
  before any work, with a message that names the level; the backend's check is the safety
  net. The tool `request_access(level)` answers the MCP request with HTTP `403` and
  `WWW-Authenticate: Bearer error="insufficient_scope"`, on which the client runs the
  authorization again and the consent page preselects that level (step-up).
- **The user page's endpoints** (research R7; `routers/agent_access.py`,
  `services/agent_access.py`, browser only): `GET /api/agent-access` lists the account's agent
  connections and tokens, `PUT …/{id}` changes a level, `DELETE …/{id}` revokes,
  `POST /api/agent-access/tokens` creates a personal access token and answers it once.
  Revoking and lowering a level cancel the authorization's waiting approval requests first
  (`revoked`, `access_changed`). An agent principal may create `AGENT_DRAFTS_PER_HOUR` drafts in
  a fixed one-hour window kept on its authorization (research R17); the next answers `429
  rate_limited` with the time it may again, in Germany's time. Saves don't count, and browser
  sessions aren't limited.
- **Search** (research R9): `GET /api/form-connections/search?q=&status=&cursor=` answers a page
  of at most 25 connections (`limit`) that aren't deleted, matched on name and description, newest change
  first, with a keyset cursor (`search_form_connections()`). Its `status` filter takes the four
  states of spec 010 (`STATE_CONDITIONS`): `scheduled` is its own, and `deactivated` no longer
  matches a scheduled connection.
- **Approval requests** (research R12; `routers/approval_requests.py`, `services/approvals.py`,
  the table `approval_requests`): an agent asks with `POST /api/approval-requests` for one of
  `publish`, `delete_draft` (level `drafts`), `deactivate`, `reactivate`, `set_start_date`
  (spec 010) or `delete` (level `manage`). Spec 010 adds a `start_date` (research R9,
  data-model §7): with `publish` and `reactivate` the connection is scheduled for it, null
  meaning at once; with `set_start_date` it is the new date, null meaning now; another action
  with one fails the body's validation. A date not after today answers `400
  invalid_start_date` before the connection is read, and the date is checked again under the
  row lock. `reactivate` refuses a scheduled connection, `set_start_date` a draft, a
  deactivated connection, a live one with "now" and the date it already has (`409
  not_allowed`); `deactivate` and `delete` accept a scheduled one. The action's preconditions
  are checked without writing (for `publish`,
  `drafts.check_publishable()`: publishing's checks with publishing's messages), a waiting
  request for the same connection and action becomes `replaced` under the row lock, and the new
  one is `waiting` for `APPROVAL_REQUEST_MINUTES`, with a snapshot of what it was made for (the
  draft's version, or the connection's `is_active` and, since spec 010, its `start_date` as
  `was_start_date`) and the agent's name as `requested_by`. Its
  link is `{PORTAL_URL}/approvals/{id}`. States:

  ```text
  waiting ──approve ok──▶ done
          ──approve fails (EUDIPLO)──▶ waiting, with failed_at and error_id ("Try again")
          ──decline──▶ declined
          ──a newer request, same connection and action──▶ replaced
          ──revoke / lower the agent's level──▶ cancelled (revoked, access_changed; stored)
          ──the connection or draft is deleted──▶ cancelled (connection_deleted, draft_deleted; stored)
          ──expires_at passes──▶ expired (computed)
          ──the connection moved on, its asked date came, or the agent's access ended──▶ cancelled (computed)
  ```

  Staleness is computed at every read and again under the row lock at approval; the save
  paths never write it. Only a deletion stores it: `_mark_deleted()` sets the connection's
  waiting requests to `cancelled` with `draft_deleted` or `connection_deleted` (spec 010,
  `approvals.cancel_for_deletion()`), so that a restore doesn't bring them back. Computed
  (`_stale_reason()`): a draft whose version moved, that was published or is deleted
  (`draft_deleted`, also while its marked row stays), a connection that is deleted, or whose
  `is_active` or `start_date` is no longer the snapshot's (`connection_changed`: deactivated,
  reactivated, scheduled, became active or its date moved), a requested start date that is no
  longer after today in Germany (`start_date_passed`), or an authorization that is gone (the
  row keeps `authorization_id` null) reads as `cancelled` with its reason. Approving
  (`POST …/{id}/approve`) and declining are for the browser session of the request's team
  member only (`403 not_yours` for another). **Approving runs the existing services, never a
  second path**: `drafts.publish_stored_draft()`, which publishes the stored draft through
  `create_revision()` with its `DraftGuard` and the asked start date, `drafts.delete_draft()`,
  and `form_connections.deactivate_form_connection()`, `activate_form_connection()` (with the
  asked date), `set_start_date()` and `delete_form_connection()` with the request's snapshot as
  `expected` (`StatusSnapshot(was_active, was_start_date)`). The activity entry's person is the
  approver with the asking agent (`approved`). A deletion an approval runs has no deletion id
  and can't be restored. An `EudiploError` leaves the request waiting with the failure's
  `error_id`. The tool
  `request_approval` returns the link at once and, for a client that declared URL-mode
  elicitation, also asks the client to open it; `check_approval` reads the outcome. A request
  that ended or expired is deleted by the worker a day later.
- **Variant identifiers and links** (research R10, R11): every variant has a UUID from the
  moment it is added, drafts included (see [Rules and branches](#rules-and-branches-spec-002)),
  so links name the same thing before and after publishing:

  ```text
  connection:  {PORTAL_URL}/form-connections/{connectionId}
  variant:     {PORTAL_URL}/form-connections/{connectionId}/edit?step=rules&variant={variantId}
  item:        …&variant={variantId}&item={rule-n | group-n}
  approval:    {PORTAL_URL}/approvals/{requestId}
  ```

  A link holds no name and no content. The MCP server builds them from `PORTAL_URL`
  (`mcp/src/links.ts`) and accepts them, an id or a name wherever a tool takes a connection,
  variant or item (`mcp/src/resolve.ts`); a link of another origin is refused. The browser
  builds them from `window.location.origin` ("Copy link" in the rules step), and
  `FormConnectionEdit` opens them.
- **Editing by agents** (research R8): every draft-changing tool runs the read-apply-save loop
  of `mcp/src/draftEdit.ts`: read the connection, refuse a published one, apply one change with
  `rules/src/edits.ts` (see [Rules and branches](#rules-and-branches-spec-002)) to the draft
  as stored, and save the whole content with the version read; on `409 draft_changed` the
  change is applied again to the newer draft, up to 3 attempts. Nothing is kept between calls.
  What the editor's forms limit, the tools check on their input: a target is resolved against
  the catalog (`mcp/src/resolve.ts`), and a condition's operator must be one of the data's
  kind, as the rule editor's check menu offers only those (`mcp/src/tools/items.ts`, with the
  field's operators in the refusal). A rule's new data keeps or drops its condition through
  `withTarget()` in `rules/src/conditions.ts`, which the rule editor uses too; a tool that
  drops one says so in its answer.
- **Checks and tests for agents** (research R14, R15): `check_rules` builds each variant's
  checked tree as the editor does and runs `checkBranch()` in a `node:worker_threads` worker
  (`mcp/src/checksWorker.ts`, built to `dist/checksWorker.js` beside `dist/main.js`) with the
  editor's budgets from `rules/src/checks/constants.ts`; a variant that doesn't finish comes
  back as not checked completely. Run from the sources (`npm run dev`, Vitest), the checks run
  on the main thread with the same deadline. Each finding carries the items involved, why it
  holds and `resolutionOf()`'s text. `test_applicants` checks each fictitious citizen's
  values against the variant's persona fields (`mcp/src/applicants.ts`) and evaluates them with
  `rules/src/evaluation.ts`, on today in Germany or a given day. Findings, citizens and
  results are never stored, sent on or logged.
- **The 26 tools** (`mcp/src/tools/`; spec 007's 24 and spec 010's `get_activity` and
  `move_document`): reading `search_connections`, `get_connection`, `get_activity`,
  `get_variant`, `get_item` (`read.ts`), `get_catalog`, `search_values` (`catalog.ts`),
  `check_rules`, `test_applicants` (`checks.ts`) and `get_guide`; changing drafts
  `create_draft`, `update_connection`, `set_document`, `move_document`, `add_variant`,
  `update_variant`, `delete_variant` (`drafts.ts`), `add_rule`, `update_item`, `delete_item`,
  `reset_item`, `copy_rule`, `group_items` (`items.ts`); and `request_approval`,
  `check_approval` (`approvals.ts`) and `request_access` (`access.ts`).
- **What spec 010 gives agents** (the spec's `contracts/mcp-tools.md`; research R9, R10): a
  connection's `status` is the API's `state` (`connectionStateOf()` in `mcp/src/views.ts`
  reads it), so `scheduled` stands beside draft, live and deactivated; `search_connections`
  and `get_connection` also answer the dates (`published_at`, `active_since`,
  `deactivated_since`, the `start_date` of a scheduled one), a draft's `step` and the example's
  mark, and a scheduled connection's URLs come with the note that they answer "unavailable"
  until its day, 00:00 in Germany. A start date is a day in Germany, `YYYY-MM-DD` in every
  MCP text: `request_approval` takes `start_date` (a date or `'now'`) for `publish`,
  `reactivate` and the new `set_start_date`, checks it before the backend does, and words
  `what_happens` with the date; `check_approval` answers the asked date and the reason
  `start_date_passed`. The **snapshot** an approval request keeps (`was_active`,
  `was_start_date`) makes a request cancelled once the status it was made for moved.
  `get_activity` reads the Activity card's entries, 50 a page, each with the card's English
  sentence, the team member and the agent. `move_document` moves a document to a position
  with `moveDocument()` of `rules/src/edits.ts`, and `set_document` adds a document at the end
  and keeps the others' places. `get_catalog` answers each data item's `group` and a
  document's `groups`, in English and in the panel's order. No tool restores a deletion,
  deletes several connections, creates the example or chooses a whole data group (FR-068):
  those are a person's actions in Konnekt, and the backend refuses a bearer there.
- **Guidance from one source** (research R16; the spec's `contracts/guidance.md`):
  `mcp/plugin/` holds the server instructions (`instructions.md`), the eight skills
  (`skills/<topic>/SKILL.md`) and the Claude Code plugin's `.claude-plugin/plugin.json` and
  `.mcp.json`; the repository's `.claude-plugin/marketplace.json` lists it. `mcp/src/guidance.ts`
  embeds the files at build time (`import.meta.glob` with `?raw`, which is why development
  runs through `vite-node`) and serves them three ways: as the instructions every client gets
  when it connects, through the protocol's Skills extension (`skills/list`, `skills/get`,
  `skill://<topic>/SKILL.md`), and through the `get_guide` tool. The production image has no
  `plugin/` folder: the skills are in the bundle. `mcp/src/guidance.test.ts` is the gate: every
  registered tool appears in a skill, every skill has its frontmatter, the instructions name
  the levels and actions, so `npm test` fails when a tool changes without its guidance.
- **Logging** (research R18): the MCP server logs one JSON line per request (method, tool,
  status, duration) and fixed error descriptions, only through `mcp/src/log.ts` (`no-console`
  everywhere else in `mcp/`, and in `rules/src/` and `api-types/src/`), never arguments,
  results, tokens or claims. The client chooses the method and the tool name, so the line
  shows `other` for a method that isn't a method name's shape and `unknown` for a tool the
  server doesn't have. The backend logs ids and counts only, never a token, code, client
  metadata, citizen, finding or rule content; the token endpoint's refusals are logged as
  their error code. The OAuth endpoints read no query, so both access logs, uvicorn's
  (`redact_references()` in `app/main.py`) and nginx's (`$redacted_request_uri`), show
  `/api/oauth/…?<redacted>` in place of any query sent there. The search's and the activity's
  keyset cursors (base64 of `<updated_at>|<id>` and of `<occurred_at>|<position>|<id>`) do
  appear in uvicorn's access line as the query string, as the search's has since spec 007:
  they hold times and ids only, never a name or content, and were kept so by the user's
  decision (spec 010, design-notes §4.2 T084 (2)). The activity itself is never logged.

### Languages (spec 009)

The whole website speaks English and German: the team member switches with the "DE | EN" pill in
the header, and every text follows at once, the server's messages and the rules' sentences
included. The decisions are research R1 to R13 in `specs/009-language-toggle/`, the shapes in its
`data-model.md` and `contracts/` (`language-switch.md`, `api-language.md`, `rules-texts.md`), the
German words in its `contracts/glossary.md`. The languages add no endpoint, table, setting or
dependency, and no response field: a `label` or `message` is a string in the requested language.

- **Two languages, English by default**: `rules/src/language.ts` holds `Language` (`'en' |
  'de'`), `LANGUAGES`, `DEFAULT_LANGUAGE` (`'en'`), `languageNames` (each language's own name)
  and `isLanguage()`; `frontend/` and `mcp/` import it as `@connection-portal/rules/language`.
  The backend's `Language` in `app/language.py` is defined on its own; the `Accept-Language`
  header is the contract between them.
- **The choice** (R7): `components/LanguageProvider/` holds the language and is the third code
  that touches `localStorage` (see [Local drafts](#local-drafts-spec-005)): one key,
  `connection-portal:language:v1` (`LANGUAGE_STORAGE_KEY`), read before the first render in
  `useState`'s initial state, so that no screen shows another language first. A stored `en` or
  `de` wins; without one (a first visit, another value, a blocked or cleared storage) the
  browser's `navigator.language` decides: `de` and any `de-*` give German, everything else
  English (`resolveLanguage()` in `utils/language/`, pure, with its test). `setLanguage()` stores
  the choice (in `try/catch`: a blocked storage keeps it for the visit), and a `storage` event
  from another tab is followed (`languageFromStorageEvent()`). A layout effect sets
  `<html lang>` before paint (`index.html` keeps `lang="en"` as the static default) and hands the
  language to `setRequestLanguage()` in `api/client.ts`, so that `apiFetch` sends it as
  `Accept-Language` on every call without React. The provider sits above `CurrentUserProvider`
  in `main.tsx` and renders the kit's `KernContextProvider` with `KERN_TRANSLATIONS[language]`.
  Components read it with `useLanguage()` (`hooks/useLanguage.ts`). Links carry no language,
  and nothing about it is stored on the server or logged.
- **The switch** (R2, `contracts/language-switch.md`): `components/LanguageSwitch/`, a `group`
  labelled "Language" / "Sprache" with two buttons, "DE" and "EN", named "Deutsch" and
  "English" in their own `lang`, the current one `aria-current="true"`. It sits in `TopBar`'s
  right group, before the account pill, so every layout that renders `TopBar` shows it, signed
  out too. Pressing the other button calls `setLanguage()` and nothing else: no navigation, no
  request, no save, and nothing re-keys on the language, so the wizard's step, open dialogs,
  the rule editor's values and the scroll position stay. The group carries
  `data-language-switch`, and a popup that holds typed input and closes on a press outside it
  (the documents' search card, the rule editor's pickers, the inline rename, `ValuesPicker`)
  ignores a press on the switch through `isLanguageSwitchTarget()`
  (`LanguageSwitch/utils.ts`); a plain menu still closes. The deviations from the Figma node
  are D1–D4 of the spec's `design-notes.md` §1.1.
- **Copy tables** (R1): every text the website shows lives in a `defineTexts(en, de)` table in
  the `constants.ts` next to its component or page (the root `constants.ts` holds
  `CONNECTION_STEP_LABELS` and `KERN_TRANSLATIONS`). `defineTexts` types `de` as `NoInfer<T>`, so
  `T` comes from the English column alone and a German column that lacks a key or adds one
  fails `tsc`. A component reads its column with `useCopy(TABLE)`; a pure helper that builds
  text takes `language` and indexes the table itself. Template functions carry each language's
  own word order and plural forms. Content is never in a table: names, descriptions, saved
  messages, usernames and identifiers show as they are. Dates and times whose wording follows
  the language have a formatter per language (R5); the fixed numeric formats stay as they
  were. `frontend/src/copy.test.ts` checks every table of a `constants.ts` under `src/`
  (the same keys and kinds in both columns, no empty text, a German text that differs from the
  English one unless it is on the allowlist of words equal in both).
- **The catalog in the current language** (R6): `useDocumentTypes()` and `useOptionSets()` keep
  one list per language, fetch the current language's first and the other's in the background
  (`apiFetch`'s `language` option), and report `'loaded'` once a list has been on screen,
  showing the other language's list until the new one arrives, so a switch never swaps an open
  editor, a typed search or the personas for a loader.
- **The rules package** (R4, `contracts/rules-texts.md`): `RuleContext.language` (optional) is
  the language the composers that take a context use (`statementOf`, `proposedMessage`,
  `ruleProblem`, `resultViewOf` …); the composers without a context take a trailing `language`
  (`findingMessages.ts`'s, `nameProblem`, `labelOf`, `formatDate` …). Both default to English,
  so the MCP server, which never passes one, gets English. The texts are `defineTexts` tables in
  the module or a sibling `<module>Texts.ts` (`checks/findingTexts.ts`, which
  `checks/findingMessages.ts` composes from); `rules/src/copy.test.ts` checks them as the
  frontend's test does. Stored names ("Standard", "Rule 01", "Group 01") stay English (FR-007).
  Callers branch on a problem's `code`, never its message (R10; see
  [Rules and branches](#rules-and-branches-spec-002)). The editor counts a stored message as
  the untouched proposal if it equals `proposedMessage()` in any language, so the proposal
  follows a switch and a saved message stays.
- **The backend** (R6, `contracts/api-language.md`): `app/language.py`, a leaf module, holds
  `Text(en, de)`, `language_of(header)` (the first tag's primary subtag `de` gives German,
  anything else English; `q` weights aren't read), `language_of_scope()`, the `ContextVar`
  `request_language`, `current_language()` and `resolve_text()`. `LanguageMiddleware` in
  `main.py`, pure ASGI, sets `request_language` for every HTTP request from `Accept-Language`,
  or to English for every path under `/api/connect/`, and resets it after the answer. Services
  raise `HTTPException` with a `Text` as the detail's `message`, and `errors.py` resolves it
  (see [Error Handling](#error-handling)); a template formats both columns at the raise.
  The rules' validation messages are in `app/services/rules_texts.py`, a leaf that imports only
  `app.language`, so that the fixture script can import it. The catalog's and the option
  sets' items carry `label_de` beside `label`, and `label_of()` (`app/catalog.py`,
  `app/option_sets.py`) gives the current language's for `GET /api/document-types`,
  `GET /api/option-sets` and the documents of a connection (`documents_view()`); the access
  levels' names and the approval requests' outcome texts follow the language too.
- **What stays English**: `/api/connect/` in full (FR-017: the integration answers to
  serviceBW), everything sent to EUDIPLO (the DCQL builder, the evaluator, the worker and
  serviceBW's delivery read `label` and the keys), the MCP server (it sends no header and passes
  no language), `ApiResponse.message` (the success messages, which the frontend discards), the
  OAuth RFC bodies of `/api/oauth/register` and `/api/oauth/token`, the `error` codes and
  `error_id`s, stored data, the account CLI and the logs. Neither side logs the header, the
  language or a `Text` (FR-018).
- **The parity fixture** (R8): the rules step's mirrored validation messages
  (`RULES_MESSAGES`, `CONDITION_PROBLEM_MESSAGES`, `EDIT_MESSAGES.unknownVariant` in
  `rules/src/constants.ts`) must equal the server's word for word in both languages.
  `uv run python -m scripts.export_check_fixtures` in `backend/` also writes
  `rules/src/fixtures/server-messages.json` from `rules_texts.py`, one case per message with
  sample parameters; `rules/src/validation.test.ts` renders the same cases from the TS tables in
  both languages, and `--check` (run by `tests/unit/test_check_fixtures.py`) fails when the file
  is stale. It is generated: never edit it by hand. `tests/unit/test_texts.py` checks that every
  `Text` in `app/` has two non-empty, different columns.

### The connection PDF (spec 011)

The details of a published connection and of a stored draft have "Download PDF" in the Summary
card's header and, beside it, the connection's **version**. One click fetches the connection as
stored and saves a tagged A4 PDF of its details in the website's language, made entirely in the
browser. The decisions are research R1 to R14 in `specs/011-connection-pdf/`, the shapes in its
`data-model.md` and `contracts/` (`api-version.md`, `pdf-worker.md`, `pdf-document.md`), the
decisions taken while building it in its `design-notes.md` §8.2 (D1 to D12). The PDF adds no
endpoint, table or setting; it adds one dependency, `pdfkit` 0.20.2, and five font files.

- **The version** (R6, `contracts/api-version.md`): `version_fingerprint`, such as
  `62D0-715F-01D1`, the first 12 hex digits, upper case in groups of four, of the SHA-256 of a
  canonical JSON of the content: the id, name and description, the documents in the answer's
  (the team's) order with their field keys, and the variants with their rules and groups, the
  conditions in their publishable form (`publishable_condition()` in `services/rules.py`, which
  `_clean_condition()` returns too, so that a draft published unchanged keeps its version). No
  status, URL, counter, time, label or language. It is computed only by `version_fingerprint()`
  in `app/services/versions.py`, for every answer and never stored, which `_view()` and
  `draft_view()` call: so `FormConnection` and `FormConnectionDraft` carry it in every answer
  (the details, the writes, an approval request's preview), and `FormConnectionSummary` does
  not. The frontend and the MCP server only read it: `get_connection` shows it as "Version …,
  as the details page and the PDF show it" (R12), and the MCP's texts call a draft's save
  number (`draft.version`) "save {n}" (D11). The UI never calls the save number a version.
- **The button**: `pages/FormConnectionDetail/PdfDownload.tsx`, in the strip under the Summary's
  header row through `DetailAccordion`'s `strip` slot: "Version <code>" and KERN's secondary
  button, compact (32px), its busy
  label "Creating PDF…" (`aria-disabled`), its own polite live region ("Creating the PDF…",
  "PDF saved.") and `PdfFailure`'s alert with the server's message or "Check your connection and
  try again.", a 5xx's error ID and "Try again".
- **The run** (R9, R13, `contracts/pdf-worker.md`): `hooks/useConnectionPdf.ts`.
  - **Where it lives** (D5): `pages/FormConnectionDetail/index.tsx` calls it beside
    `useFormConnection`, above both details, so that a run survives the swap from
    `DraftDetails` to `ConnectionDetails` when its fetch finds the draft published meanwhile;
    `state` and `download` go down as one prop. The page hands it no option sets or catalog:
    the first run fetches them in the run's language, and later runs reuse the hook's copy.
  - **The steps**: `download()` captures the language and the moment, which hold for the run;
    fetches the connection again (`getFormConnection(id, { language })`, FR-005) and hands it
    to the page, which replaces the shown connection only when `isShownConnection()` finds it
    different (D10); takes the option sets and, for a draft, the catalog; builds the content
    model on the main thread (`connectionPdfModelOf()`; the model's, file name's and texts'
    modules load with dynamic `import()` during the fetch, so the main bundle stays small);
    posts it to the worker; and saves the bytes it answers as a `Blob` through an object URL and
    a detached anchor's `download`, with `fileNameOf(model)`.
  - **The states**: `idle`, `fetching`, `rendering`, `failed` (`pdfDownloadReducer` in
    `hooks/utils.ts`). A click while busy does nothing (FR-003). A 401 signs out, a 404 shows
    "Page not found", any other failure ends in `failed` with no file (FR-004). The watchdog
    (`PDF_WATCHDOG_MS`, 120 s) fails a run the worker never answers. A failed fetch keeps the
    worker; the worker's own failure, `error`, `messageerror` or the watchdog terminate it, and
    the next try starts a new one. Unmounting terminates the worker and ignores late answers.
  - **The worker**: `frontend/src/workers/pdf.ts`, a module worker (`worker: { format: 'es' }`
    in `vite.config.ts`, R2), started on first use and kept for later runs on the page. On its
    first run it loads PDFKit's browser build and `workers/pdfFonts.ts` (the five TTFs' `?url`
    imports) with dynamic `import()`, fetches the fonts and keeps them; a failed load is tried
    again on the next run. It calls `renderConnectionPdf()` and posts `rendered` with the bytes
    transferred, or `failed` with no reason. None of it is in the main bundle or loaded before
    the first click.
  - **The page stays responsive** (D10): the Summary's body is `RulesSummaryBody`, a `memo`
    component that doesn't take the run's state, so a run's changes render only the header
    (`PdfDownload`, `PdfFailure`), not the largest connection's 20 variants of 200 items.
- **The pure modules** (R3): `frontend/src/utils/connectionPdf/`, every module with its
  `*.test.ts` and no browser API: `model.ts` (everything the PDF says, in its language, from
  the connection, the option sets and the catalog; the counts from `utils/connectionSummary.ts`,
  which the details' Summary uses too), `gaps.ts` (a draft's gaps: everything publishing would
  refuse, through `publishProblems()` of `rules/src/validation.ts`), `blocks.ts`, `paginate.ts`,
  `wrapUrl.ts` (`urlLines()`: a URL breaks only after "/"), `fileName.ts`, `render.ts`,
  `constants.ts` (`PDF_TEXTS` as `defineTexts(en, de)`, the layout, styles and colours),
  `types.ts` (the shapes and our own declaration of the PDFKit calls we use, D1) and
  `testData.ts` (the test connections A to E). `render.ts` receives PDFKit's constructor and
  the fonts' bytes: the worker passes the browser build, the Node smoke test in
  `render.test.ts` the Node build and the same TTFs.
- **Measured equals drawn** (R11): `layoutOf()` in `blocks.ts` is the one function that
  computes where a block's texts and shapes go. `blocksOf()` calls it for each block's height,
  through a `Measure` over PDFKit's `heightOfString` and `widthOfString` with the drawing's
  options, and `render.ts` calls it again to draw, so the paginator's heights are the drawn
  ones. Faded text is struck through by PDFKit's own `strike`, per drawn line (D3).
- **Pagination** (R4, `paginate.ts`, ported from the prototype): the blocks are placed before
  anything is drawn, so the page count is known for "Page n of N". A block never splits; a chain
  (`keepWithNext`) keeps a heading with what follows and breaks inside only where a block would
  run past the page; a unit that fits on a fresh page but not on the rest of this one moves
  there whole, and a taller one flows and splits between its blocks; a gap is dropped at a
  page's top. A rule taller than a page arrives already cut at value boundaries (FR-027), and
  long lists (a draft's gaps, the result links) are a block per entry. Every page's band says the
  name, the connection ID, a draft's "Draft · Not live" pill, the version and the date; its
  bottom "Page n of N" and, from page 2, the place: "3 Rules per variant › Variant Taxi
  (continued)". A place that doesn't fit its box cuts only the variant's name with "…"
  (`placeLabelOf()` with `cutToFit()`, given the drawing's own width test, D9), so the section
  and "(continued)" stay whole. A draft gets a "DRAFT" watermark.
- **Tagging** (R5): PDF/UA-1. `Document` › `Sect` with `H1`–`H6`, `P`, `L`/`LI`/`LBody`, and
  the details box as a `Table`; frames, bars, pills' shapes, chips, the band, the bottom and the
  watermark are artifacts; `/Lang` (`en-GB`, `de-DE`), the title shown, and an outline with the
  sections and the variants. PDFKit's PDF/UA mode writes an incomplete `CIDSet`, which fails
  veraPDF, so `withoutCidSet()` in `render.ts` finalises each font with the subset level hidden:
  the one function that touches PDFKit's internals, which is why `pdfkit` is pinned exactly. The
  smoke test fails if a `/CIDSet` comes back or `pdfuaid:part` goes.
- **The fonts** (R7): Fira Sans Regular, Medium and SemiBold and Fira Mono Regular and Medium as
  TTFs in `frontend/src/assets/fonts/`, with `OFL.txt`: KERN's WOFF2 files break fontkit's
  subsetting and KERN has no Fira Mono. Vite fingerprints them as assets; PDFKit subsets them per
  document. `frontend/nginx.conf`'s `gzip_types` includes `font/ttf` (about 1.7 MB raw,
  0.75 MB compressed, on the first click only).
- **Never stored, sent or logged** (FR-041, FR-042): the run makes only the requests the page
  makes anyway (the connection, and the option sets and catalog when not yet fetched), the
  worker only its own chunks and the five fonts, the same for every connection; the file exists
  as a `Blob` until the browser saves it. The model holds no finding, persona or citizen data,
  and a draft's no URL. No `console.*` in `utils/connectionPdf/`, `workers/pdf.ts` or
  `useConnectionPdf` (ESLint's `no-console` for these paths), the worker's errors are handled so
  that the browser doesn't log them, and `versions.py` logs nothing. Only the worker and the
  hook touch browser APIs.
- **The body limit**: saving a connection at the product's limits needs nginx's larger body
  limit on `/api/` (D12), see [Frontend container (production
  nginx)](#frontend-container-production-nginx).

### Background worker

`app/services/worker.py` runs a daemon thread, started and stopped by the FastAPI
lifespan when `WORKER_ENABLED` is true. Every 2 seconds it runs the registered
steps, which are plain functions that open their own `SessionLocal()` sessions and
keep transactions short. A failing step is logged by exception type and code
location only, never its message, and the next step still runs. Outbound calls go
to a pool of 8 threads through `dispatch(key, call)`, so the loop never waits for
them, and a key that is still in flight isn't dispatched twice. A key is a name plus
an internal id, never a request reference. A step is a plain function without
arguments in the `STEPS` tuple, in the order below. Tests set `WORKER_ENABLED=false`
and call the steps directly.

Implemented steps: first the scheduled starts (spec 010), then those of research R7 in spec
001's folder, in its order, then those of agents' access (spec 007), and last the deletions
made final (spec 010). The steps of specs 007 and 010 log counts and ids only.

1. **Activate scheduled connections** (`activate_scheduled_connections`, spec 010, research
   R2): `activate_due_connections()` with today in Germany locks the published, not deleted
   connections whose `start_date` is on or before today, `FOR UPDATE SKIP LOCKED` in id order,
   and makes each live in one flush (`is_active`, no `start_date`, `activated_at` at 00:00 of
   its date in Germany, also after a downtime), recording `became_active` without a person;
   one commit per cycle. A row that a status change holds is skipped and taken by the next
   cycle, and PostgreSQL re-checks the conditions on the newest version, so a date moved,
   deactivated, deleted or started "Now" meanwhile is left alone. It runs first, ahead of the
   sync's wait for EUDIPLO, and calls nothing outside the database (the configuration exists
   since publishing). The activation moves `updated_at`. It is the only code that activates
   on a date.
2. **Sync**: one `GET /api/session` per page of sessions updated since the cursor,
   which is the latest `updatedAt` seen less 5 seconds. It applies each outcome to
   its pending request and ignores sessions it doesn't know, such as those of other
   environments in the shared tenant. The cursor lives in memory; after a start it
   begins at the oldest pending request. Without a pending request, EUDIPLO isn't
   called.
3. **Expire**: the last check of each pending request past its `expires_at`, in
   the pool. An answer given in time still counts; otherwise the request becomes
   `expired`.
4. **Cancel**: the open requests of deactivated, scheduled or deleted form connections
   become `unavailable` (the step reads `is_active`, which a scheduled connection has
   false). Deactivating, scheduling and deleting already do this; the step catches a
   request that a trigger inserted afterwards.
5. **Delete EUDIPLO sessions**, with any documents in them: after any final status
   other than `completed`, when a pull's 60-second repeat window ends, and for
   documents never delivered 30 minutes less a minute after the citizen shared. A
   `404` counts as deleted; another failure is tried again in the next cycle.
6. **Re-sync configurations**, once after each start: a published form connection
   whose current configuration, built again with the current trust list, request
   lifetime and catalog, has a different hash gets a new revision with the same
   documents; its actor is `SYSTEM`, and as nothing in the content changes it records no
   activity. Drafts
   are skipped, in the step's query and in `resync_config()`: nothing is set up with
   EUDIPLO for a draft (spec 005). The checks run in the pool, and a failed one is tried
   again in the next cycle.
7. **Delete unused EUDIPLO configurations**: those of revisions that a later one
   replaced, or whose form connection was deleted at or before
   `deletions.restore_cutoff()`, that is longer ago than `DELETION_UNDO_SECONDS` (spec 010),
   once no request on them still has an EUDIPLO session. `delete_unused_config()` checks the
   restore time again under the connection's row lock, which a restore takes too, before it
   releases the lock and calls EUDIPLO: a connection restored meanwhile keeps its
   configurations, and a restore that comes after the check finds the time over and is
   refused. A `404` counts as deleted. A revision that a draft's publish in flight has
   reserved is never one of them, since a draft's `current_revision` is null.
8. **Delete expired sign-in sessions.**
9. **Delete request records** `REQUEST_RECORD_RETENTION_SECONDS` after the request
   ended.
10. **Delete expired authorization codes**, used or not, after their 5 minutes.
11. **Delete expired agent tokens**: access tokens past their expiry, and refresh tokens
    past theirs or replaced more than a day ago (until then, a replaced one used again still
    finds its row and revokes its agent connection).
12. **Delete idle agent connections**: an agent connection without an unexpired, unreplaced
    refresh token can't be renewed, because it was unused for `AGENT_CONNECTION_IDLE_DAYS`.
    Its tokens go with it; its waiting approval requests then read as cancelled.
13. **Delete expired personal access tokens**, past the expiry chosen at creation.
14. **Delete unused OAuth clients**: dynamically registered clients older than an hour that
    no agent connection or authorization code uses. Clients of metadata documents stay, as
    their cache.
15. **Delete old approval requests** a day after they ended or expired; their approval page
    then answers `404`.
16. **Finish deletions** (`finish_deletions`, spec 010, research R5): for the rows deleted at
    or before `deletions.restore_cutoff()`, the same clock as step 7's, it deletes their
    activity entries and the rows of deleted drafts (with any revision a publish in flight
    had reserved): what a deletion was before spec 010. A deleted published connection keeps
    its row for good. A deletion that an approval request ran has no deletion id and can't be
    restored, yet waits the same time. It works in batches of at most 100 rows
    (`FINISH_BATCH_SIZE`), each locked `FOR UPDATE SKIP LOCKED` and committed, and the draft
    rows' delete checks its conditions again.

Steps 12 to 14 lock the rows they delete (`skip_locked`) and check their conditions again
in the deleting statement, so that, for example, a consent that renews an agent connection at
the same moment keeps it. Steps 1 and 16 skip a row another transaction holds the same way,
and a later cycle takes it. The steps that act on a deletion (7 and 16) wait for
`deletions.restore_cutoff()` and check it again under the row lock a restore takes. The
clock seams are `worker._now()` and `deletions._now()`, which the tests move.

The production image runs one uvicorn process, so there is one worker thread; row
locks keep the steps correct if that changes.

### serviceBW's connection URLs

`app/routers/connect.py` serves the URLs that serviceBW calls
(`specs/001-servicebw-eudi-middleware/contracts/integration-api.md`, and for the
branches and the evaluation `specs/002-connection-rules/contracts/integration-api.md`),
and `app/services/document_requests.py` holds their logic:

- **Drafts** (spec 005, research R8): a draft's URLs answer `409 unavailable`, exactly
  as a deactivated connection's, so serviceBW can't tell them apart, and the check comes
  before anything reads a revision (`_usable_form_connection()`). A deleted draft's URLs
  answer `404`, as when deleting removed its row: since spec 010 its row stays, marked
  deleted, until the worker finishes the deletion after `DELETION_UNDO_SECONDS`, and
  `_usable_form_connection()` answers `404` for an unpublished row with `deleted_at`, also
  while the draft can still be restored. Neither calls EUDIPLO.
- **Scheduled connections** (spec 010, FR-004, FR-075): a scheduled connection's trigger and
  pull URLs answer `409 unavailable` with the message "This form connection is deactivated
  or deleted", word for word a deactivated connection's answer, since it is a published
  connection whose `is_active` is false; nothing new under `/api/connect/`. The worker's
  first step makes it live at 00:00 of its date in Germany, and the URLs work from then on,
  on the configuration made when it was published. A restored connection answers as it
  did before its deletion. The documents and their fields are delivered in catalog order,
  whatever order the team stored (FR-051).
- **Trigger**, `POST /api/connect/{id}/requests`: creates a EUDIPLO request
  (`POST /api/verifier/offer`) on the form connection's current revision, and
  answers with the same-device wallet link, a QR code of the link for another
  device (`segno`, PNG data URI), an unguessable reference and the expiry time.
  EUDIPLO knows the request only by its internal id. The request also records the
  current rule set. One trigger URL serves every branch.
- **Pull**, `GET /api/connect/{id}/requests/{reference}`: the main branch's pull URL.
  The status and, once the request is completed, the documents, reduced to exactly
  the configured fields (`services/documents.py`), with the `evaluation` of the main
  branch's rules. They are read from EUDIPLO at the time of the pull and never
  stored. The first pull that returns them counts as the delivery, and pulls within
  the next 60 seconds get them again. A pending request past its expiry gets its
  last check from the pull itself.
- **A branch's pull**, `GET /api/connect/{id}/branches/{branch_id}/requests/{reference}`:
  the pull URL of every other branch, with the same status and documents and that
  branch's evaluation. The delivery belongs to the request, not the branch: the first
  delivery through any pull URL starts the repeat window for all of them. Its checks
  run in this order:
  1. unknown form connection, or a deleted draft: `404`;
  2. deactivated, scheduled or deleted form connection, or a draft: `409 unavailable`;
  3. unknown branch, another form connection's, or the main branch (whose pull URL is
     the one above): `404`;
  4. deleted branch: `409 unavailable`, for good;
  5. unknown reference, or another form connection's: `404`;
  6. a branch that the request's rule set doesn't have, because it was added after the
     trigger: `409 branch_added_later`, without status or documents;
  7. otherwise the status, the documents and the branch's evaluation.
- **The evaluation** (`evaluation` in the pull answer: the branch, `met`, a result per
  rule and group, and the messages for the citizen) is `null` whenever `documents` is,
  and contains no field value. `_deliver` computes it after extracting the documents
  and before it counts the delivery, so if it fails, the pull answers `500` with an
  `error_id`, nothing is consumed and serviceBW can pull again.
- **No sign-in**: the network restricts these URLs instead. The production nginx
  forwards `/api/connect/` only from `SERVICEBW_ALLOWED_CIDRS` and answers `403` to
  everyone else (see [Production Deployment](#production-deployment-coolify)).
- **References stay out of the logs**: a filter on uvicorn's access logger and
  nginx's access log format show `/requests/<reference>` instead, also on a branch's
  pull URL (a test pins it), nginx logs only critical errors for `/api/connect/`, and
  the engine hides the parameters of SQL errors (`hide_parameters=True`). Neither the
  documents nor the evaluation are logged.
- **Status changes** lock the request row and check the status again
  (`apply_status`), so that of a pull and the worker, only the first change takes
  effect. No transaction is held while EUDIPLO answers: a pull reads the documents
  first and then re-checks under the lock before it counts the delivery.

## Patterns

### API Response Format

**Success responses**:
```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

**Error responses**:
```json
{
  "error": "Error type",
  "message": "Human-readable error description",
  "error_id": "UUID, on 5xx answers only"
}
```

A `5xx` answer never describes its cause: no setting, component or exception text
reaches the client. Its message is generic, and `error_id` names the log line that
holds the details. The UI shows the ID, so that a user can pass it on to an
administrator, who finds the line with `docker compose logs backend | grep <id>`.

### Error Handling

**Backend**: `register_exception_handlers` in `backend/app/errors.py` installs three
handlers on the app:

| Exception | Status | Behaviour |
|-----------|--------|-----------|
| `HTTPException` | as raised | Passes a `{error, message}` dict detail (and its `error_id`) through, its `message` resolved if it is a `Text`; otherwise wraps it |
| `RequestValidationError` | **400** | Returns a generic message, `INVALID_PAYLOAD_MESSAGE` (FastAPI's default would be 422 with field details) |
| `Exception` | 500 | Generic message, `INTERNAL_ERROR_MESSAGE`, and an `error_id`, in every environment; the log line under that ID has the method, the route's template and the error's type and code location |

```python
# Route handler pattern — raise, don't catch
raise HTTPException(
    status_code=404,
    detail={"error": "Not found", "message": "Form connection not found"},
)
```

`log_server_error(error, description)` in the same module creates the `error_id`
of a `5xx` answer: it logs one ERROR line, `Error <id>: <description> (<type> in
<function> (<file>:<line>))`, and returns the ID. `http_error_for()` and the
catch-all handler use it, and so should any other `5xx` answer. The line never
holds an exception's message, a setting's value, a request reference or the URL:
it uses `describe_error()` and the route's template. The app configures no logging
of its own, so these lines reach stderr through Python's last-resort handler,
without a time or level prefix. `errors.py` imports nothing from the app but the
leaf `app/language.py`, so that the services and the worker can all import
`describe_error()` and `log_server_error()` from it without an import cycle.

**Messages in the request's language** (spec 009, see
[Languages](#languages-spec-009)): a service may raise with a `Text(en=..., de=...)` as
the detail's `message`, a template formatting both columns at the raise, and the
`HTTPException` handler resolves it with `resolve_text()` in the language the
`LanguageMiddleware` set; a plain string passes through, so a third-party
`HTTPException` still works. `INTERNAL_ERROR_MESSAGE` and `INVALID_PAYLOAD_MESSAGE`
are `Text`s too. Starlette runs the catch-all handler outside every middleware, after
the request's language has been reset, so it reads the language from the request
again (`language_of_scope()`, the middleware's rule). The `error` code and the
`error_id` never change with the language, and a `Text` never reaches a log line, a
stored column or an `ApiResponse.message`. A place that catches an `HTTPException` to
reuse its detail resolves the `Text` there (`resolve_text()` in
`services/approvals.py`).

**`APP_ENV` must be set to something other than `development` in production**:
development drops the session cookie's `Secure` flag and fills in a default
`CONNECTION_BASE_URL`.

**Frontend**: the `ApiError` class in `src/api/client.ts` wraps HTTP errors with
status and response data. `errorNoticeOf(error, fallback)` turns a failure into
what a page shows, the API's message and `error_id` (an `ErrorNotice`), and the
shared `ErrorNoticeText` renders it, the error ID on a line of its own. A page passes
failures through `useSignOutOnUnauthorized()` first: a `401` means the session
expired, so the app signs out and the route guard asks for a sign-in that returns to
the page.

```typescript
class ApiError extends Error {
  constructor(status: number, data: ApiErrorResponse) {
    super(data.message);
    this.name = 'ApiError';
  }
}
```

### Database Conventions

- Primary keys: UUID4 as a `String(36)`, generated in Python. `app/models.py`
  declares the shared columns once, as the annotated types `UuidPk`, `CreatedAt`
  and `UpdatedAt`
- Timestamps: `created_at` / `updated_at`, both `DateTime(timezone=True)` with `server_default=func.now()`
- Column and table names: `snake_case` (`published_at`, `form_connections`)
- Unique constraints: `unique=True` on `mapped_column`
- Optional fields: `Mapped[str | None]`, which SQLAlchemy maps to a nullable column
- Indexes on every column used for lookups, plus partial indexes
  (`Index(..., postgresql_where=...)`) for the worker's scans
- Migrations are generated with `alembic revision --autogenerate` and must be
  reviewed before committing — autogenerate does not detect every change.
  `alembic/env.py` imports `app.models`, because autogenerate only sees imported
  models

The tables and their rules are described in
[data-model.md](../specs/001-servicebw-eudi-middleware/data-model.md), and those of
the rules and branches in
[spec 002's data-model.md](../specs/002-connection-rules/data-model.md), and the drafts
in [spec 005's data-model.md](../specs/005-connection-drafts/data-model.md), and agents'
access and approval requests in
[spec 007's data-model.md](../specs/007-agent-mcp-server/data-model.md), and the start date,
the status dates, the activity, the deletion marks, the document order and the example in
[spec 010's data-model.md](../specs/010-revamp-backend-gaps/data-model.md). A rule set's
tree and a draft's content are one JSONB column each, since they are always read and
written whole. Autogenerate emits no CHECK constraint, partial unique index or backfill, so
the drafts migration and spec 007's migration (`uq_agent_authorizations_oauth_client`, the
variant ids in drafts) add them by hand, as does spec 010's first one
(`ck_form_connections_start_date`, `ix_form_connections_start_date` and the status dates'
backfill). Where a change must leave `updated_at` as it is (a deletion and its restore),
`flag_modified(row, 'updated_at')` puts the current value into the UPDATE, so that the
column's `onupdate` doesn't move it. No table holds a citizen's documents, an
evaluation, a finding, a test citizen or a token's secret.

## Environment Variables

### Backend

Defined as fields on `Settings` in `backend/app/config.py`. A variable not
declared there is ignored (`extra='ignore'`).

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string, must use `postgresql+psycopg://` | `postgresql+psycopg://postgres:postgres@localhost:5432/template_db` |
| `PORT` | Server port | `3000` |
| `CORS_ORIGIN` | Allowed frontend origin (single origin) | `http://localhost:5173` |
| `APP_ENV` | Set to `production` outside development | `development` |
| `CONNECTION_BASE_URL` | Base URL that serviceBW uses to reach the middleware; the connection URLs are built from it | `http://localhost:3000` in development; required elsewhere, with `https://` unless `ALLOW_PLAIN_HTTP=true` |
| `EUDIPLO_URL` | EUDIPLO base URL, without `/api` | empty (EUDIPLO calls answer `503`) |
| `EUDIPLO_CLIENT_ID` / `EUDIPLO_CLIENT_SECRET` | API client with `presentation:request` + `presentation:manage`, no allow-list | empty (`503`) |
| `EUDIPLO_TRUST_LIST_ID` | Trust list used for issuer trust in every credential query | empty (saving a form connection answers `503`) |
| `REQUEST_LIFETIME_SECONDS` | Expiry of a document request | `600` |
| `DOCUMENT_RETENTION_SECONDS` | Longest time shared documents stay in EUDIPLO | `1800` |
| `PULL_REPEAT_WINDOW_SECONDS` | How long repeated pulls return the same documents | `60` |
| `REQUEST_RECORD_RETENTION_SECONDS` | How long a request record is kept after the request ended | `604800` |
| `ALLOW_PLAIN_HTTP` | Allows `http://` for `CONNECTION_BASE_URL` outside development (closed networks only) | `false` |
| `WORKER_ENABLED` | Runs the background worker thread | `true` |
| `LOGIN_SESSION_HOURS` | How long a DO.IT sign-in lasts | `8` |
| `PORTAL_URL` | Public origin of the management interface: links and the OAuth authorization endpoint (`{PORTAL_URL}/authorize`) are built from it | `http://localhost:5173` in development; `CONNECTION_BASE_URL` otherwise |
| `MCP_URL` | Public URL of the MCP endpoint, the resource indicator every agent token is bound to | `http://localhost:3100/mcp` in development; `{CONNECTION_BASE_URL}/mcp` otherwise |
| `OAUTH_ISSUER` | Issuer of the OAuth authorization server | `CONNECTION_BASE_URL` |
| `AGENT_ACCESS_TOKEN_MINUTES` | Lifetime of an agent's access token | `60` |
| `AGENT_CONNECTION_IDLE_DAYS` | Lifetime of a refresh token: an agent connection unused this long ends | `30` |
| `AGENT_TOKEN_MAX_DAYS` | Longest expiry of a personal access token | `90` |
| `APPROVAL_REQUEST_MINUTES` | How long an approval link is valid | `10` |
| `AGENT_DRAFTS_PER_HOUR` | Drafts one agent connection or token may create per hour | `20` |
| `DELETION_UNDO_SECONDS` | How long the team member who deleted a connection or draft can take the deletion back ("Undo"); afterwards the worker deletes its configurations, its activity and a draft's row. `0` switches restoring off: every "Undo" answers `409 not_restorable` | `300` |

The three URLs are resolved by `resolve_agent_urls`, after the check of
`CONNECTION_BASE_URL`; trailing slashes are removed. In the Coolify setup all three live on
the one public domain, so `docker-compose.prod.yml` sets them from `CONNECTION_BASE_URL`.

The developer script `scripts/issue_test_credentials` reads `EUDIPLO_URL`,
`EUDIPLO_TRUST_LIST_ID` and its own issuer client, `EUDIPLO_ISSUER_CLIENT_ID` and
`EUDIPLO_ISSUER_CLIENT_SECRET` (roles `issuance:manage` + `issuance:offer`), from the same
`.env` with a settings class of its own. `Settings` doesn't declare the issuer client: the
middleware has no issuance role (research R2).

### MCP server

Read once at start by `mcp/src/config.ts`. Outside production (`NODE_ENV` not `production`)
the URLs have development defaults; in production a missing one stops the server with a log
line that names the variable. A value that isn't a URL, or a `PORT` that isn't a port number,
stops it in any environment. Trailing slashes are removed.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the server listens on | `3100` |
| `BACKEND_URL` | The backend's internal address, which every tool call goes to | `http://localhost:3000` (compose: `http://backend:3000`) |
| `PORTAL_URL` | Public origin of the management interface, which links are built from; the backend's `PORTAL_URL` | `http://localhost:5173` |
| `MCP_URL` | Public URL of the MCP endpoint, the `resource` of its protected resource metadata; the backend's `MCP_URL` | `http://localhost:3100/mcp` |
| `OAUTH_ISSUER` | The authorization server its metadata names; the backend's `OAUTH_ISSUER` | `http://localhost:3000` |

`PORTAL_URL`, `MCP_URL` and `OAUTH_ISSUER` must match the backend's, since tokens are bound to
`MCP_URL` and links must open the right Konnekt installation. `mcp/.env.example` lists them; the
compose files pass them as `environment:`, and `npm run dev -w mcp` reads them from the shell.

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL (local development only; unset in production, where the app calls the relative `/api` path) | `/api` |

`VITE_API_URL` is inlined by Vite at build time. The production image does not
set it, so the bundle calls its own origin and nginx forwards the request — the
same image works for any domain, which is what makes preview deployments
possible.

### Frontend container (production nginx)

Read at container start, not at build time, so one image serves every environment.

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_HOST` | Host name of the backend, which nginx forwards `/api/` to; rendered into `nginx.conf` by the image's envsubst templating | `backend` |
| `SERVICEBW_ALLOWED_CIDRS` | Comma-separated address ranges that may call `/api/connect/` | empty: `/api/connect/` answers `403` to everyone |
| `TRUSTED_PROXY_CIDRS` | Comma-separated address ranges of the proxy in front of nginx (Traefik), whose `X-Forwarded-For` gives the client's address | empty: the connecting address counts |
| `MCP_HOST` | Host name of the MCP server, which nginx forwards `/mcp` and `/.well-known/oauth-protected-resource` to; rendered like `BACKEND_HOST` | `mcp` (`${SERVICE_NAME_MCP}` in Coolify) |

`frontend/nginx/40-servicebw-access.sh`, which the nginx image runs from
`/docker-entrypoint.d/`, writes the two lists into `/etc/nginx/servicebw-allow.conf`
(`allow` rules, then `deny all`) and `/etc/nginx/real-ip.conf` (`set_real_ip_from`,
`real_ip_header X-Forwarded-For`, `real_ip_recursive on`). An entry with anything
but an address or a range stops the container.

`location /api/` accepts request bodies of up to 4 MB (`client_max_body_size 4m`):
a connection at the product's limits (spec 011, FR-045) saves a body of about 1.56 MB,
which nginx's default of 1 MB would refuse with `413`.

## Docker Development

The `docker-compose.yml` orchestrates four services:

1. **postgres**: PostgreSQL 18 (`postgres:18-alpine`) with health checks, published on host port **5435**
2. **backend**: FastAPI via uvicorn `--reload`, depends on postgres, exposes port 3000
3. **frontend**: Vite dev server, depends on backend, exposes port 5173
4. **mcp**: the MCP server through `vite-node` (`mcp/Dockerfile.dev`, `npm run dev -w mcp`),
   depends on backend, exposes port 3100, with `BACKEND_URL=http://backend:3000` and the
   development URLs; it mounts `mcp/src/`, `mcp/plugin/`, `api-types/` and `rules/`.
   `vite-node` doesn't watch, so a change to the sources or the skills takes effect when the
   container restarts (`docker compose restart mcp`)

Every image builds with the repository root as context, so the root
`.dockerignore` is the only one Docker reads. Volumes enable hot reload by
mounting source directories. The backend container runs
`alembic upgrade head` on start, and reads `backend/.env` through `env_file`
when it exists (it holds the EUDIPLO credentials); the values under
`environment:` in the compose file take precedence.

## Production Deployment (Coolify)

Production uses `docker-compose.prod.yml`, deployed as a **single Coolify
resource**. The topology differs from local dev in one important way: the
frontend's nginx is the only publicly reachable service and acts as the API
gateway.

```
                 https://my-team.dpschool.app
                            │
                            ▼
                 ┌──────────────────────────┐
                 │  frontend (nginx)        │
                 │  /      → SPA files      │
                 │  /api/connect/* → proxy, │
                 │    allow-listed only     │
                 │  /api/* → proxy ─────────┼───▶ backend:3000 ───▶ postgres:5432
                 │  /.well-known/oauth-     │      (internal)        (internal)
                 │   authorization-server ──┼───▶ backend:3000
                 │  /mcp, /.well-known/     │          ▲   │
                 │   oauth-protected-       │          │   └──▶ EUDIPLO (outbound HTTPS)
                 │   resource → proxy ──────┼───▶ mcp:3100
                 └──────────────────────────┘      (internal; calls the backend
                                                    at BACKEND_URL)
```

Consequences of this design:

- The backend needs `CONNECTION_BASE_URL` (an `https://` URL) and the four
  `EUDIPLO_*` variables in the Coolify environment; it refuses to start without
  `CONNECTION_BASE_URL`. Previews need it too, because they also run with
  `APP_ENV=production`
- The MCP server is public at `https://<domain>/mcp`, through the same nginx. The compose
  file derives `PORTAL_URL`, `MCP_URL` and `OAUTH_ISSUER` of the backend and the `mcp`
  service from `CONNECTION_BASE_URL`, and the `mcp` service runs with `NODE_ENV=production`,
  so a missing URL stops it. It reaches the backend at
  `http://${SERVICE_NAME_BACKEND}:3000`, and nginx reaches it through `MCP_HOST`
  (`${SERVICE_NAME_MCP}`). It runs as one replica, since 2025-era MCP sessions live in its
  memory; its health check is `GET /health`. A preview has its own MCP endpoint on its own
  domain
- The UI must be served over HTTPS (Coolify's Traefik): the session cookie is
  `Secure` outside development
- This nginx is the only public entry point, so it also restricts serviceBW's
  connection URLs: `/api/connect/` is forwarded only from `SERVICEBW_ALLOWED_CIDRS`,
  with the client's address taken from `X-Forwarded-For` when the request comes from
  `TRUSTED_PROXY_CIDRS` (Traefik). Every deployment of the image, previews
  included, is closed until the list is set. Its access log shows
  `/requests/<reference>` instead of the reference

- The production frontend bundle is built **without** `VITE_API_URL`; it calls
  the relative `/api` path on its own origin
- CORS never triggers in production (same origin); the backend's `CORS_ORIGIN`
  setting only matters for local dev, where Vite (5173) calls the backend
  (3000) cross-origin
- Backend and postgres publish no host ports and have no domains — they are
  reachable only on the compose network
- `SERVICE_PASSWORD_POSTGRES`, `SERVICE_FQDN_FRONTEND` and `SERVICE_NAME_*` in
  the compose file are Coolify magic variables, generated per environment —
  including per preview deployment, so each PR preview gets its own
  credentials and domain
- Preview deployments rename compose services (`postgres` → `postgres-pr-<id>`),
  so services must not hardcode each other's hostnames: the backend reaches the
  database via `${SERVICE_NAME_POSTGRES}` and nginx reaches the backend via the
  `BACKEND_HOST` env var (`${SERVICE_NAME_BACKEND}`), rendered into
  `nginx.conf` at container start by the nginx image's envsubst templating
- Database data lives in the `postgres-data` named volume; Coolify suffixes it
  per PR, so previews get isolated, empty databases (schema is created by the
  migration run on backend startup)

See the Deployment section of `README.md` for the setup steps and the
tradeoffs of running PostgreSQL inside the compose stack.
