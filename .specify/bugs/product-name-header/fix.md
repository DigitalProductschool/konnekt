# Bug Fix: "Connection Portal" name and a left-aligned header brand on every page

- **Slug**: product-name-header
- **Fixed**: 2026-10-13
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The frontend now calls the middleware "Connection Portal": in the header's brand, in every tab
title and in the static `<title>`. `TopBar` no longer has a column mode, so the wizard, the
first-connection screen and the details page use the same full-width header as the overview and
sign-in screens: 32 px padding from `sm` up, with the logo and name at the far left, as in the
fixed Figma (`33:3`).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/constants.ts` | modified | `APP_NAME = 'Connection Portal'`; the comment now calls it the middleware's temporary name, as in the Figma of 2026-10-13 |
| `frontend/index.html` | modified | `<title>Connection Portal</title>`, the title shown before React sets the page's |
| `frontend/src/components/TopBar/types.ts` | modified | Removed the `width?: 'full' \| 'column'` prop and its doc comment |
| `frontend/src/components/TopBar/index.tsx` | modified | Header always `px-16 sm:px-32`; inner row no longer `mx-auto max-w-1120`; `width` removed from the props; doc comment updated |
| `frontend/src/components/WizardLayout/index.tsx` | modified | Removed `width="column"` from its `TopBar`; the `CENTRED_GUTTERS` comment now explains the gutter by the footer's column only |

## Diff Highlights

```diff
-// As in the Figma design, which doesn't name the product yet
-export const APP_NAME = 'Product name';
+// The middleware's temporary name, as in the Figma design (2026-10-13)
+export const APP_NAME = 'Connection Portal';
```

```diff
-    <header
-      className={`... flex h-64 border-b px-16 ${width === 'full' ? 'sm:px-32' : ''}`}
-    >
-      <div
-        className={`flex w-full min-w-0 items-center gap-16 ${width === 'column' ? 'mx-auto max-w-1120' : ''}`}
-      >
+    <header className="... flex h-64 border-b px-16 sm:px-32">
+      <div className="flex w-full min-w-0 items-center gap-16">
```

```diff
         meta={meta}
-        width="column"
         logoTo={ROUTES.overview}
```

## Tests Added or Updated

- None. The frontend has no test runner (no Vitest or Playwright), as the assessment notes. The
  fix relies on the type checker: `tsc -b` in `npm run build` rejects any remaining `width=`
  prop on `TopBar`. The assessment's browser checks belong to `/speckit-bug-test`.

## Local Verification

- Commands run, in `frontend/`:
  - `npm ci`: installed the dependencies from the lockfile, since `node_modules` was missing. Its
    `prepare` script ran `uv run pre-commit install`, which synced `backend/.venv` and then failed
    because this worktree's `.git` points to a path that doesn't exist on this machine. The script
    ends with `|| exit 0`, so the install still succeeded. `node_modules`, `dist` and
    `backend/.venv` are all git-ignored.
  - `npm run build` passed: `tsc -b` and `vite build` both finished without errors.
  - `npm run lint` (ESLint) passed with no findings.
  - `npm run format:check` (Prettier) reported that all matched files use its style.
  - `grep -rn "Product name" src index.html` found nothing.
  - `grep -rn "width=\"column\"\|width === \|'column'" src` found nothing.
- Manual checks: no browser measurements yet. Neither the dev server nor the backend was running.
  The pixel checks in the assessment ("Tests to add or update": mark x = 32, name x = 56, user
  menu ending at 1408, title at x = 220 on the wizard and details screens, and `document.title`
  ending in "– Connection Portal") are left to `/speckit-bug-test`.

## Deviations from Assessment

- None in the code. The open question about the docs was not answered, so the assessment's
  default applies: `docs/` and `specs/` are untouched, including `design-notes.md` §3, which still
  describes the wizard header on the 1120 px column with `width="column"`.

## Follow-ups

- Decide whether to bring `specs/001-servicebw-eudi-middleware/design-notes.md` §3 ("Wizard
  header … lined up with the wizard's 1120 px column (x = 160). `TopBar` draws it with `title`
  and `width="column"`") and the §7 header line in line with the code. The rename references in
  the docs stay, as the report asked.
- Out of scope (noted in the assessment): Figma's wizard header reads "New Connection" while the
  code says "New connection".

## Docs Update (2026-10-13, after verification)

The user then approved updating the docs. In `specs/001-servicebw-eudi-middleware/`:

- `design-notes.md`:
  - §1: a new decision names the product "Connection Portal" and supersedes the "Product name"
    decision of 2026-10-09.
  - §3: the wizard header is now a full-width decision, with the logo at x = 32, the separator at
    203, the title at 220 and the user menu at 1344. `width="column"` is gone. The scrollbar-gutter
    note now refers to the footer bar instead of the header.
  - §7: the details header is noted as full width since 2026-10-13 (`2131:4628`).
  - The 2026-10-09 decision list now points to the new name.
- `tasks.md`: the manual check selects "Connection Portal" instead of "Product name".

Historical records, such as the T-task wording that records the 2026-10-09 decision, are left as
they are.
