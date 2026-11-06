# Brief: porting the redesigned UI (KERN Revamp) — plan of record

**Written**: 2026-11-06, in the planning chat. **Status**: pass A in progress: `spec.md` written,
this file moved here from `specs/redesign-brief.md` and the tooling edits of §4 done, all on
2026-11-06 (the kit's two mapper runs are driven by `/figma-audit kit <file link>`), and
`/speckit-clarify` answered three questions (defer for F items beyond the frontend, AA contrast
fixes, what a verification table covers). **Pass A is complete; pass B is next**, in a new chat
with the agents reloaded.
It is the record every chat and both machines can read until pass C's `plan.md` and `tasks.md`
absorb it; after that it is history.

This is the operating plan for a change that no single chat can carry: every screen and every
component gets the designer's new layout, styling and wording, the old design is removed, and the
app's flow, routes, reducers and API stay. The work runs as a speckit feature (008) because the
feature directory drives `/figma-audit` and `/speckit-implement`, the task agents already know
`docs/FIGMA-WORKFLOW.md`, and the checkboxes of `tasks.md` are the only state that survives between
chats.

## 1. Inputs

| Input | Where |
|---|---|
| New UI, every screen | Figma file `s8mU9oJDq3411e8bxMjQO9` ("Middleware – V5"), page/root node `6263:12360`. Same file and root as spec 002's audit, redrawn since; spec 002's `figma-audit/units.md` is history, not a map |
| KERN Revamp | Figma file `xqEw2Om11uKfESdRgTfuVe` ("KERN – Revamp – Design Kit"): the designer's own rework of KERN. **No npm package exists** (`@kern-ux/native` latest 2.8.2, 2026-09-23) |
| Current behaviour | specs 001–007: each `contracts/ui-screens.md`, the Clarifications of each `spec.md` |
| Current code | `frontend/src/` (about 32k lines: `pages/` 23k of which the editor 16k, `components/` 36 folders, one `index.css`) |

The Figma links are too large to open in a main context: only Opus subagents read Figma.

## 2. Decisions (taken 2026-11-06)

1. **Governance.** The new Figma decides layout, styling **and wording**: the designer and the PM
   rewrote the copy, and it is ported word for word. Specs 001–007 decide behaviour. The design
   drifts from them in two ways, and each item is decided in `/speckit-clarify` after the audit:
   features the design draws that the app lacks (adopt as a requirement of spec 008, defer, or
   drop), and screens the design lacks, spec 007's consent, user and approval pages among them
   (build the spec's behaviour without frames, from the new components and patterns: W# items).
2. **KERN strategy.** Keep `@kern-ux/native` 2.8.2, the React kit and the Tailwind theme. The
   Revamp's token values go into **one overlay block** in `index.css` under KERN's own variable
   names (the kit binds KERN's names), so the Tailwind theme and `kern.css` pick them up. For each
   component, pass C decides and records in `design-notes.md`: KERN class kept with the overlay,
   KERN class plus a CSS override, or own markup with Tailwind. This reverses the decision of
   2026-10-25 ("map by name, keep KERN 2.8's values", `docs/FIGMA-WORKFLOW.md`, design-notes 002 §9):
   the Revamp values are now the target, and "KERN 2.8 vs Revamp" is no longer a reason to leave a
   difference.
3. **Scope.** Frontend only. Backend, `rules/`, `api-types/` and `mcp/` change only where the design
   rewrites copy that they provide (validation and error messages, rule statements, the findings'
   texts, the KERN kit's translations), and each such item is listed and decided in pass C, not
   ported silently. A concept rename in the copy (connection, variant, Standard, rule, group,
   document) is a pass-C decision too, because it ripples into the MCP guidance and API messages.
4. **Parity.** Every state of every screen keeps working: loading, error, empty, disabled, keyboard
   focus rings, 320 px at 200 % zoom (WCAG 1.4.10), light only, one `h1` per page, the popup
   placement rules. The wizard's structure (steps, reducers, local drafts) and all routes stay.
5. **Done** means: every unit's visual-verification table is clean, nothing of the old design
   remains (tokens, assets, CSS overrides, doc rules), and `npm run lint`, `npm test`,
   `npm run build` pass. Vitest cannot test styling, so the verification tables in
   `design-notes.md` are the evidence.
6. **Merge.** The whole redesign lands at once from `new-design`. Merging per flow would ship a
   half-old, half-new app.
7. **Git in this checkout** is read-only: the worktree pointer names another machine, and the
   checkout is mirrored by rsync. Use
   `GIT_DIR=/home/debian/batch27-faro/worktrees/new-design GIT_WORK_TREE=/home/debian/batch27-faro/new-design`
   for `status`, `log`, `diff`. Never commit, rebase, repair or switch; only moving and deleting
   files is allowed. The user commits on the other machine.
8. **Agents and models.** The project's agents are pinned to Opus 5.5 (`.claude/agents/*.md`), so
   every pass that reads Figma runs on Opus whatever the session's model; Claude still says which
   agents a step needs before spawning them. Pass A, C, H and most of I need no agent.

## 3. The passes

One chat per pass (pass G: one per flow). Each chat starts by reading this brief, CLAUDE.md and the
feature's `tasks.md`.

| Pass | Chat and commands | Agents | Produces |
|---|---|---|---|
| **A. Specify** | `/speckit-specify` with §5; tooling edits of §4; `/speckit-clarify` for the spec's own gaps only (drift waits for the audit) | none | `specs/008-…/spec.md` with a governance section, stories per flow and the baseline list; `.specify/feature.json` |
| **B. Inventory** | `/figma-audit <UI page URL>` (tree map → the user scopes the units → unit audits, 3 in parallel → reconcile). Then the kit, from its file link alone: `figma-tree-mapper` starts at the document root `0:0`, lists the pages (one component per page), the user scopes them, and one `get_metadata` per in-scope page goes into `figma-audit/kit/`; `get_variable_defs` runs on the first frame of each in-scope page (a page itself is refused) into `figma-audit/kit/variables.md` | Opus: tree-mapper, unit-auditor, reconciler | `units.md`, `units/*.md` with inventories, `report.md`; kit component sets with variants; the token table |
| **C. Decide and plan** | `/speckit-clarify` on `report.md` "Clarify questions" (drift, missing screens, renames, copy from outside the frontend); `/figma-audit remap`; `/speckit-plan`; `/speckit-tasks`; `/speckit-analyze` | none | `research.md` (R1 KERN strategy, R2 copy sources, R3 verification), `contracts/ui-screens.md` (S# per screen with node ids, F#/W#), `design-notes.md` (token map, component decision table), `plan.md` with "Rules for /speckit-tasks", `tasks.md` in the phase order D–I |
| **D. Foundations** | `/speckit-implement` phases 1–2 | Opus task agents (few calls) | the overlay block, `@theme` changes, fonts if changed, icons and illustrations from the design, `docs/KERN-DESIGN-SYSTEM.md` addendum |
| **E. Shared components** | `/speckit-implement` phase 3, 1–2 chats | Opus task agents, 3 in parallel | the 36 `components/` folders, rebuilt in place under their names, each through the per-node loop of `docs/FIGMA-WORKFLOW.md`, verification tables in `design-notes.md` |
| **F. Layouts** | `/speckit-implement` phase 4 | Opus task agents | AppLayout, TopBar, UserMenu, WizardLayout, WizardProgress, AuthLayout, dialogs, toasts, NotFound |
| **G. Flows** | `/speckit-implement` one phase per chat: G1 sign-in, forgot password, overview, first connection · G2 editor steps connection and documents · G3 rules step, rule editor, test step (2–3 chats) · G4 publish step, details, edit · G5 account, consent, approval (W# items) | Opus task agents | the pages, verified per node |
| **H. Removal** | `/speckit-implement` phase: a grep checklist of the old design (unused `@theme` tokens and shadows, the `:root` adaptive-type pins, superseded CSS overrides, unused assets, the "KERN 2.8 vs Revamp" rule, spec 002's deviation references in the docs) | none | nothing of the old design left; `npm run build` |
| **I. Verify and close** | screenshots of every route × state at the frame width and at 320 px / 200 % zoom (Playwright); accessibility review as design-notes 002 §10; `/speckit-converge`; the docs checklist (ARCHITECTURE "frontend", CLAUDE.md UI rules, KERN doc, FIGMA-WORKFLOW); PR text | none (Playwright needs no Figma) | the closing report in `design-notes.md`; the user commits and opens the PR |

Sizing, to budget calls and chats: about 50 units, 90–100 tasks, roughly 200 Figma calls in pass B
and 300 across D–G (design context plus screenshot per node). Figma's per-minute limit caps the
parallel agents at 3.

## 4. Tooling edits (pass A)

- `.claude/agents/spec-requirements-indexer.md`: also index the contract files that `spec.md` lists
  under a **"Behaviour baseline"** heading (specs 001–007's `contracts/ui-screens.md`), with IDs
  prefixed by the spec number (`001-S3`, `002-FR-019`), so the unit auditors can map the new frames
  against the current behaviour instead of reporting everything as Figma-only.
- `.claude/agents/figma-audit-reconciler.md`: `RULE wording` does not apply when the spec's
  governance section says Figma decides wording; a wording difference is then "copy to port", FYI,
  not a conflict.
- `docs/FIGMA-WORKFLOW.md`: the "KERN 2.8 vs Revamp" rule becomes history for spec 008 (decision 2
  above); the Revamp value is the target.
- `.claude/agents/figma-tree-mapper.md`: accept a file link without node-id. Start with `get_metadata` on `0:0` (the document root, which lists the pages and their top-level frames; fallback: `use_figma` with a one-line script that lists `figma.root.children`), make every page one unit with the page's name, stop for scoping, then one `get_metadata` per IN page. Record per unit the first frame's node id, for `get_variable_defs`, which refuses pages.
- `.claude/agents/*.md` are pinned to `model: claude-opus-5-5` (done 2026-11-06, all eight agents), so a Fable session never reads Figma through them; reload the agents after a change to these files.

## 5. The `/speckit-specify` description

Paste this after `/speckit-specify` in a new chat:

> Port the redesigned UI into the frontend and remove the old design. The designer redrew every
> screen and every component in Figma "Middleware – V5" (file s8mU9oJDq3411e8bxMjQO9, page node
> 6263:12360) on a reworked KERN, "KERN Revamp", whose components live in the Figma Design Kit
> xqEw2Om11uKfESdRgTfuVe. There is no npm package for it: KERN 2.8's packages stay and the Revamp's
> tokens and component anatomy are applied on top of them. The app's flow does not change: the same
> routes, the same wizard steps, the same reducers, the same API. What changes is the layout, the
> styling and the wording of every screen and component, all three from the new Figma file; the
> design's copy, written by the designer and the PM, replaces the current copy word for word.
> Behaviour stays as specs 001–007 define it (their contracts/ui-screens.md are the behaviour
> baseline), except where the design drifts: it draws a few features the app does not have, and it
> does not draw spec 007's screens (the consent page, the user page, the approval page). Each drift
> item is found by the Figma audit and decided in clarify: adopt it as a requirement of this spec,
> build the spec's behaviour without frames from the new components, or drop it. Out of scope:
> backend, rules package, MCP server and api-types, except copy they provide that the design
> rewrites (validation and error messages, rule statements, findings, the KERN kit's translations),
> which is listed and decided, never ported silently; a renamed concept is decided the same way.
> Every state of every screen keeps working: loading, error, empty, disabled, keyboard focus,
> 320 px at 200 % zoom, light only, one h1 per page. Done means: every unit's visual verification
> table is clean, no old-design token, asset, CSS override or doc rule remains, and lint, test and
> build pass. Keep the spec short: the user stories are the flows, each checkable against its
> frames on its own: (1) sign-in, forgot password, overview and first connection; (2) the create
> wizard's connection and documents steps; (3) the rules step, the rule editor and the test step;
> (4) the publish step, the details and editing; (5) the account, consent and approval pages. The
> plan of record for the passes is brief.md in this feature's directory, moved there from
> specs/redesign-brief.md as the first step after this spec is created.

## 6. Risks and open points

- **The Design Kit is one page per component** (button, card, accordion, divider, …). The file
  link is enough once the tree mapper accepts one (§4); should `0:0` be refused by the server
  and `use_figma` be unavailable, fall back to "copy link to selection" per page.
- **The editor is half the frontend** (16k lines): G3 is the long pole and may take three chats.
- **Copy outside the frontend**: if the design rewrites validation messages, that touches
  `backend/`, `rules/src/validation.ts` (word for word with the server) and the MCP guidance. Decide
  in C, don't discover in G.
- **Rate limits**: an auditor returning `RATE_LIMIT` stops the fan-out; `/figma-audit resume`
  continues later.
- **Spec 002's audit files** name the same Figma file; their node ids are stale after the redraw.
  Pass H updates the doc references, the files themselves stay as history.
