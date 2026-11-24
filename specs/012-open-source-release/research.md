# Research: Publish the repository as open source under the EUPL-1.2

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Five audits read the repository on 2026-11-20, read-only, at commit `9fbce6c` of `opensource`
(identical to `main`): KERN, copied material, dependency licences, secrets and confidentiality,
and a security review. R1 records the licence texts, R2 to R6 the audits, R7 to R11 the
inventories and designs the tasks implement. Each section gives what was checked and how, the
findings, the decision, and what was not checked (FR-042). "User" or "mentor" marks a decision that
person took on 2026-11-20; "proposed" marks a choice made here for the task, which the user may
overrule. The audits' scripts and raw output stay in the session's scratchpad, outside the
repository.

Paths are relative to the root; `path:line` refers to `9fbce6c`; "the tree" is that commit's files,
"the history" every commit on every branch. No secret value, full connection or session id, Figma
file key or email address is written here: identifiers are cut to four characters, people are
named with their address's domain.

**The repository on 2026-11-20**: 1,138 tracked files; 292 commits (251 non-merge, 41 merges made
by GitHub) on 21 branches; no tags or stashes; 94 unreachable commits in the local bare repository.

| Section | Subject | Requirements |
|---|---|---|
| R1 | The licence texts | FR-001, FR-002, FR-004, FR-007 |
| R2 | KERN | FR-019, FR-020 |
| R3 | Third-party material | FR-017, FR-018, FR-034 |
| R4 | Dependency licences and the draft of `NOTICE.md` | FR-020 to FR-023 |
| R5 | Secrets and confidentiality, and the scrub | FR-030 to FR-036 |
| R6 | Security review | FR-027, FR-037, FR-041 |
| R7 | The names | FR-011 to FR-016 |
| R8 | Contributors | FR-008 |
| R9 | REUSE | FR-006 |
| R10 | Public-facing files | FR-024 to FR-026 |
| R11 | How the repository is published, and the handover | FR-043 |

## R1. The licence texts

**Checked**: on 2026-11-20 the Commission's two texts were downloaded and compared with SPDX's
copy, and the German one normalised as the user decided; this record re-computed both files' size
and SHA-256 in the tree the same day. Not from the audits.

| | `LICENSE` (English) | `LICENSE.de` (German) |
|---|---|---|
| Commission's page | `https://interoperable-europe.ec.europa.eu/collection/eupl/eupl-text-eupl-12` | the same page |
| Downloaded from | `https://joinup.ec.europa.eu/sites/default/files/custom-page/attachment/2020-03/EUPL-1.2%20EN.txt`, which redirects to `https://interoperable-europe.ec.europa.eu/sites/default/files/custom-page/attachment/2020-03/EUPL-1.2%20EN.txt` | `https://interoperable-europe.ec.europa.eu/sites/default/files/inline-files/EUPL%20v1_2%20DE.txt` |
| As downloaded | 13,827 bytes, UTF-8, LF, no trailing whitespace | 15,282 bytes, UTF-8 with a byte-order mark, CRLF, trailing spaces on 67 lines; SHA-256 `208705beb6df6c418b821f73b2cf192d9d5c6837a1a59391a261c7abe2fb0dce` |
| In the tree | byte-identical to the download; SHA-256 `6fc9e709ccbfe0d77fbffa2427a983282be2eb88e47b1cdb49f21a83b4d1e665` | normalised: 15,096 bytes, SHA-256 `849b8890a8b53a08b782b77a9b01ee7e7df2e6b0cc2f6b660b8baf3f65b5d67f` |

- SPDX's `EUPL-1.2.txt` differs from the Commission's English text beyond whitespace.
- As downloaded, the German text would be rewritten by the `trailing-whitespace` hook
  (`.pre-commit-config.yaml:12`) on its first commit.
- `license-files` in `backend/pyproject.toml` resolves relative to `backend/` (build backend
  hatchling, `:40-42`), where no `LICENSE` exists today.
- The backend images copy only `backend/pyproject.toml` and `backend/uv.lock` before `uv sync`
  (`backend/Dockerfile:14,17`, `backend/Dockerfile.dev:13,17`), and `uv sync` installs the project
  through hatchling; if hatchling reads the licence file then, the `COPY` must add
  `backend/LICENSE`.
- The Docker build contexts are the root (`docker-compose.yml:22,45,64`,
  `docker-compose.prod.yml:28,80,113`: `context: .`); the root `.dockerignore` excludes neither
  `LICENSE` nor `*.md`, so every image can copy `LICENSE` and `NOTICE.md` (FR-007).

**Decision**:
- `LICENSE` is the Commission's English text, unchanged, already in the tree; it never changes
  (FR-002), and the consent statements attach to it.
- `LICENSE.de` (user): whitespace normalised so that the commit hooks leave it alone: byte-order
  mark removed, CRLF to LF, trailing spaces and tabs removed, one final newline; the 1,945
  whitespace-separated words are identical and in the same order. Already in the tree.
- `LICENSES/EUPL-1.2.txt` and `backend/LICENSE` are byte-identical copies of the root's `LICENSE`;
  `backend/pyproject.toml` gets `license = "EUPL-1.2"` and `license-files = ["LICENSE"]` (FR-004).
- The three production Dockerfiles copy `LICENSE` and `NOTICE.md` from the root context (FR-007).

**Rationale**: the official text unchanged, tied to every consent statement by its checksum; the
German file keeps every word without an exception in the hooks; a copy in `backend/` is the only way
the mentor's `license-files = ["LICENSE"]` resolves inside the project's directory.

**Alternatives considered**: SPDX's text (not the Commission's); the German file as downloaded with
a hook exclusion; `license-files = ["../LICENSE"]` (outside the project's directory); a symbolic
link (lost in some checkouts and archives).

**Not checked**: whether hatchling fails on a `license-files` pattern without a match, and whether
`uv sync` in the images reads the file: not run. The task's first check: `uv build` in `backend/`,
then building both backend images.

## R2. KERN

**Checked**: on 2026-11-20, the packages pinned in `frontend/package.json:19-21`
(`@kern-ux/native` 2.8.2, `@kern-ux-annex/kern-react-kit` 2.40.0,
`@digitalservicebund/kern-ux-tailwind-theme` 4.0.0): the kit's 64 original sources (from its source
map) against the 405 non-test `.ts`/`.tsx` files of `frontend/src/` (55,890 pairs: shared lines,
comments, token 6-grams); `frontend/src/index.css` against `kern.css`, `kern-utilities.css`,
`kern-grid.css`, the kit's stylesheet and the theme, parsed with PostCSS; the SVGs against KERN's
icons; the registry tarballs against `node_modules`.

| Mentor's claim | Verdict | Evidence |
|---|---|---|
| (a) No KERN component source pasted and edited | **Holds** | Only `KernAlert` (17 files) and `KernContextProvider` (`frontend/src/components/LanguageProvider/index.tsx:2`) are imported. No shared comment in any pair, at most 4 generic shared lines. Highest 6-gram share 24 %: `frontend/src/constants.ts:37-56`, the seven translation keys the kit's type requires (API use); components with kit namesakes 7–12 %. Own components on KERN's documented markup: `Checkbox/index.tsx:30-44`, `TextField/index.tsx:44-72`, `ConfirmDialog/index.tsx:133-228`, `FeedbackLoader/index.tsx:11-21`, `FormErrorMessage/index.tsx:11-14`, five hand-written alerts |
| (b) No rules copied out of `kern.css` | **Holds, with exceptions A to D** | Of the 48 rules of `index.css` (839 lines) that mention KERN (42 overrides, 2 token redefinitions, 4 own selectors reading KERN tokens), none shares a selector and more than one identical declaration with an upstream rule. Nothing from the kit's stylesheet: its 19 CSS-module selectors (`._menubar_7rgwk_1` …) occur nowhere, and the components needing them are not imported |
| (c) No patches | **Holds** | No `patches/`, `*.patch`, `*.diff`, `.npmrc`; no `overrides`, `resolutions`, `patchedDependencies`, `postinstall` or `preinstall` in the five manifests (the root's only lifecycle script is `prepare`); no alias or transform (`frontend/vite.config.ts:6-7`, no `tsconfig` paths); `package-lock.json` resolves all three from `registry.npmjs.org` with sha512 integrity; the downloaded tarballs match it, and `diff -rq` finds no difference to the installed copies (115, 183, 4 files) |

**A. 23 custom properties** in the `:root` overlay, name and value identical to `kern.css`'s
`:root`, repeated after KERN's 768 px switch (`kern.css:697-729`) so that one size holds on every
width (comments `index.css:59,73,93`): `index.css:65` = `kern.css:642`
(`--kern-typography-font-size-x-large-adaptive`); `:68-70` = `:633-635` (line heights medium, large,
x-large adaptive); `:74-87` = `:650-663` line for line (heading display to small and title large and
default, padding top and bottom); `:88-89` = `:644-645` (body default); `:90-91` = `:680-681`
(label default); `:94` = `:609` (`--kern-component-alert-icon-size: var(--kern-32)`).

**B. Six one-declaration rules** restating an upstream declaration under a more specific selector,
each to win a specificity contest its comment describes:

| `index.css` | Project selector | `kern.css` | Declaration restated |
|---|---|---|---|
| 529–531 | `.kern-btn--primary:not(:disabled):not([aria-disabled='true']):active` | 2027–2029 | `background: var(--kern-color-action-state-indicator-shade-active)` |
| 561–563 | `.kern-btn--primary:is(:disabled, [aria-disabled='true']):is(:hover, :active)` | 2030–2033 (also 2005) | `background: var(--kern-color-action-default-contextual)` (upstream adds a fallback) |
| 565–568 | `.kern-btn--secondary:is(…):is(:hover, :active), .kern-btn--tertiary:is(…):is(:hover, :active)` | 2036, 2065 | `background: transparent` |
| 581–585 | `.kern-form-check__radio:focus:not(:focus-visible)` | 2535 | `border: var(--kern-metric-border-width-default) solid var(--kern-color-form-input-border-contextual)` |
| 587–589 | `.kern-form-check__radio:focus:not(:focus-visible):hover` | 2540–2542 | `border: var(--kern-metric-border-width-bold) solid var(--kern-color-form-input-border-contextual)` |
| 726–731 | `@media (forced-colors: active) { .kern-loader.kern-loader--56 }` | 3639–3646 (3641) | `border-color:` the same four `--kern-color-layout-background-*` values |

Seven more declarations coincide by trivial value (`index.css:604, 611, 612, 614, 628, 662, 666`).

**C. Three `color-mix()` formulas** in `.kern-btn--danger` (`index.css:752-766`): upstream's
`…shade-hover`, `…shade-active`, `…tint-hover-opacity` (`kern.css:802-804`, dark scheme; also 870,
936, 1000–1002) with `--kern-color-action-default` swapped for `--kern-color-feedback-danger`, as
the comment at `:747` says. The fourth formula (`:769-773`) and the pressed shade (`:108-112`) are
the project's own.

**D. Nine lines of documentation**: `docs/KERN-DESIGN-SYSTEM.md:249` repeats the button `variant`
union of the kit's `COMPONENTS.md:86`, `:258-265` its `KernIconType` union (`:1537-1544`); the
section names its source (`:227-230`), not the licence. `index.css:5-7` and
`docs/KERN-DESIGN-SYSTEM.md:88-91` tell a reader to add a kit component's own styles before using
it: an instruction to copy from the kit's stylesheet, not followed so far. `.kern-btn--danger` and
`.kern-loader--56` are the project's own classes in KERN's namespace.

| Licence facts | `@kern-ux/native` 2.8.2 | `@kern-ux-annex/kern-react-kit` 2.40.0 | `@digitalservicebund/kern-ux-tailwind-theme` 4.0.0 |
|---|---|---|---|
| `license` field | EUPL-1.2 | EUPL-1.2 | **MIT** |
| Licence file | `LICENSE.md`, the German EUPL 1.2 text, 15,158 bytes | `LICENSE.md`, byte-identical to native's | **none** (4 files: `.keep`, `README.md`, `package.json`, `theme.css`) |
| Copyright holder | **none named** (only the EU's line in the licence text) | **none named** | none in the package; upstream `LICENSE` on `main` (fetched 2026-11-20): `MIT License` / `Copyright (c) 2025 DigitalService` |
| Author, contributors | `Kern-UX`; Tom Marienfeld, Darko Pervan (dataport.de) | OneBitAhead GmbH; Stefan Reimers, Gunnar Thies (onebitahead.com), Axel Wolters (sk.hamburg.de), Mathis Burger, Markus Klein (seitenbau.com) | Joschka de Cuveland (digitalservice.bund.de) |
| Repository | `https://gitlab.opencode.de/kern-ux/kern-ux-plain` | `https://gitlab.opencode.de/kern-ux/community/kern-react-kit` | `https://github.com/digitalservicebund/kern-ux-tailwind-theme` |
| Notes | `README.md:178` "Lizenziert unter der EUPL-1.2"; no licence line in the shipped CSS; ships Fira Sans 4.106 (34 WOFF2; name table: `Digitized data copyright © 2012-2015, The Mozilla Foundation and Telefonica S.A.`, "Open Font License, version 1.1 or later") and Noto Sans 2.003 (4 files, unused; `Copyright 2015 Google Inc.`, OFL 1.1) with **no font licence file**; `index.css:10` imports `fira-sans.css`, so 10 WOFF2 ship without any OFL text | the bundle holds all of **lodash 4.17.23** (MIT, "Copyright OpenJS Foundation and other contributors") and **React's `jsx-runtime`** (MIT, "Copyright (c) Meta Platforms, Inc. and affiliates"), banners stripped, neither declared; `COMPONENTS.md:6` says v2.37.0 | DigitalService's adapter, not a KERN project package; `docs/KERN-DESIGN-SYSTEM.md:38` already says MIT |

**Icons**: no project SVG shares path data with KERN (Figma exports on 24, 20 or 16 unit grids,
KERN's on 960), but 11 draw the glyphs of 6 KERN icons (rasterised 96 × 96, intersection over union
0.955 to 1.000; files in R3). KERN's icons are Google's Material Symbols Rounded: `check`, `edit`,
`home`, `keyboard_arrow_up` are character-identical, `delete` shares 222 characters; KERN's package
does not say so. The files' Figma layer names show they came through KERN's Figma kit.

**Decision** (user): the restatements stay. Each block gets a comment naming the upstream file and
lines, the package version and the licence (for A at its three sub-blocks, for example "values as
in `@kern-ux/native` 2.8.2, `dist/kern.css` lines 609–681, EUPL-1.2"; for B and C at each rule; for
D in the section that names its source), and `NOTICE.md` names them. No working style is rewritten.
Following from it: the sentence at `index.css:5-7` and `docs/KERN-DESIGN-SYSTEM.md:88-91` adds that
a rule taken from the kit's stylesheet needs the same attribution, and `NOTICE.md` lists the theme
under MIT with DigitalService's line and upstream's text, the kit's lodash and JSX runtime, KERN's
Fira Sans under the OFL, and the two own classes.

**Rationale**: KERN and the project share the EUPL-1.2, so attribution suffices; removing A brings
back KERN's 768 px switch, B the contrast failures its comments record (T098), C the danger
button's hover and pressed states. MIT asks that the theme's notice travel with copies.

**Alternatives considered**: rewriting as overrides (A cannot hold KERN's value on every width
without the same text; for B, 581 and 587 could use `border-width` and `border-color`, 726 a custom
property; C could use literal colours); removing (design changes); KERN's mask classes for the 11
icons (not needed once attributed).

**Not checked**: the history (this audit could not run git; R3 searched it for SVG paths and `data:`
URIs, not CSS); the built frontend; `kern-ux.de` and KERN's Storybook; the terms of the Figma "KERN
– Revamp – Design Kit"; other KERN versions; whether restated declarations are protectable.

## R3. Third-party material

**Checked**: on 2026-11-20, every tracked file read and every image viewed; `git blame -M -C` for
the template; `git log --all --diff-filter=A` for assets in the history; SHA-256 against upstream
copies (`@expo-google-fonts/fira-sans`, `fira-mono` 0.4.1; `github/spec-kit` v1.1.1); every SVG
outline against 32,529 glyphs (KERN 2.8.2, `@material-design-icons/svg` 0.14.15,
`@material-symbols/svg-400` 0.49.0, 342 files of `google/material-design-icons`); grep for origin
hints. Verdicts: **clear**, **NOTICE** (attribute in `NOTICE.md`), **replace**.

**Fonts** (`frontend/src/assets/fonts/`; NOTICE). The TTFs reach the build, `OFL.txt` does not;
they stay under the OFL inside the EUPL repository and are embedded as subsets in the app's PDFs.

| Files | Font | Source | Licence, evidence |
|---|---|---|---|
| `FiraSans-Regular.ttf`, `FiraSans-Medium.ttf`, `FiraSans-SemiBold.ttf` | Fira Sans 4.203 | Google Fonts' release through npm `@expo-google-fonts/fira-sans` 0.4.1, byte-identical (SHA-256 `3dabf3d4…`, `7c2d4961…`, `1352f54d…`); not identical to `google/fonts` `main` today | OFL-1.1; `README.md:72-75`, `specs/011-connection-pdf/research.md:213-217`; name table "Digitized data copyright 2012-2016, The Mozilla Foundation and Telefonica S.A.", "Fira Sans is a trademark of The Mozilla Corporation." |
| `FiraMono-Regular.ttf`, `FiraMono-Medium.ttf` | Fira Mono 3.206 | `@expo-google-fonts/fira-mono` 0.4.1, byte-identical (`9c1c51ab…`, `5ebf0b58…`) | OFL-1.1; name table "Digitized data copyright © 2012-2015, The Mozilla Foundation and Telefonica S.A." |
| `OFL.txt` (94 lines) | licence text | Google Fonts' `ofl/firasans/OFL.txt` body with both families' lines | `:1` "Fira Sans: Copyright (c) 2012-2015, The Mozilla Foundation and Telefonica S.A."; `:2` "Fira Mono: Copyright (c) 2012-2013, The Mozilla Corporation and Telefonica S.A."; `:4` "This Font Software is licensed under the SIL Open Font License, Version 1.1."; `:10` "SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007"; no Reserved Font Name; its years differ from the name tables (upstream's difference) |

**Icons** (`frontend/src/assets/icons/`, 48 files): all Figma exports from the team's file
"Middleware – V5" (`specs/008-kern-revamp-redesign/research.md:103-107`, `design-notes.md:131-160`,
`docs/FIGMA-WORKFLOW.md:18`); none is an original drawing. Material Icons and Material Symbols:
Apache-2.0, Google LLC. Scores: share of upstream's points in the file / of the file's in upstream.

| Group | Files | Upstream glyph (score) |
|---|---|---|
| Material Symbols (19) | `document.svg`, `document-action.svg`, `document-danger.svg`, `document-ink.svg`, `document-muted.svg` | Outlined `description` (0.96/1.00) |
| | `driving-licence-action.svg`, `-danger.svg`, `-ink-24.svg`, `-ink.svg`, `-muted.svg` | Outlined `directions_car` (1.00/1.00) |
| | `personal-id-action.svg`, `-danger.svg`, `-ink.svg`, `-muted.svg` | Outlined `badge` (0.98/1.00) |
| | `lock.svg`, `person.svg`, `save.svg`, `science-ink.svg`, `group-brackets.svg` | `lock` (1.00), Outlined `person` (0.95; layer "Icon · person (Material Symbols, outlined)"), Outlined `save` (1.00), `science` (0.96), `data_array` (1.00) |
| Material Icons (13) | `check-filled-white.svg`, `done-white.svg`, `fact-check-ink.svg`, `link.svg`, `link-ink.svg`, `link-off.svg`, `link-off-white.svg`, `public-ink.svg`, `remove-circle-danger.svg`, `rename.svg`, `reset-restore.svg`, `undo.svg`, `warning-amber.svg` | `check_circle` filled, `done`, Outlined `fact_check`, `link` (2), `link_off` (2), `public`, `remove_circle_outline`, `title`, `settings_backup_restore` (1.00/0.82), `undo`, `warning`; the others 1.00/1.00 |
| KERN's icon set (11) | `check-white-small.svg`, `done-action-small.svg`; `delete-white.svg`; `download-action.svg`; `edit-white-small.svg`; `expand-less-action-small.svg`; `expand-more-action-small.svg`, `expand-more-small.svg`, `expand-more-white-small.svg`, `picker-expand.svg`, `picker-expand-open.svg` (byte-identical to `expand-more-action-small.svg`) | KERN 2.8.2 `check`, `delete`, `download`, `edit`, `arrow-up`, `arrow-down` = Material Symbols Rounded `check`/`done`, `delete`, `download`, `edit`, `expand_less`, `expand_more` (1.00/1.00) |
| Changed by the team (5) | `add-link-action.svg`, `copy-to-variant.svg`, `calendar-pencil.svg`, `message-alert.svg`, `ungroup-brackets.svg` | `add_link` scaled 0.996 and moved 1 px; `tab` plus an arrow; a calendar sharing 75 % of `event`'s points with a pencil not from `edit_calendar`; closest `announcement`/`feedback` (0.81); `data_array`'s halves moved apart with a double arrow |

All 48: NOTICE. `specs/008-kern-revamp-redesign/design-notes.md:146` calls `expand-more-small.svg`
an icon KERN lacks; its outline is KERN's `arrow-down`, only the 20 px size is missing. Inline
graphics are clear: the one `data:` URI (`frontend/src/index.css:647`, commit `cc06aeb`) is the
team's, no `.ts`/`.tsx` file ever held an `<svg>` or a path, the PDF draws no glyph paths, and
`backend/app/services/qr.py` generates QR codes with `segno` at run time.

**Illustrations and test images**:

| Path | What it shows | Source | Verdict |
|---|---|---|---|
| `frontend/src/assets/illustrations/login-art@2x.png` (662 × 1234), `wallet-star@2x.png` (400 × 386), `published-art@2x.png`, `published-art-grey@2x.png` (434 × 258) | one artwork: a five-armed star of layered translucent green and blue slabs, whole, halved, cropped and greyed (Figma layers "Picture · EUDI Wallet · star", "… half star", "Picture · active", "Picture · deactivated"); no text, emblem, photograph or logo; on the sign-in page, the welcome page and every status band | a third party's website, which states no licence and no permission for reuse (user; its imprint read 2026-11-20). In the history since `48fb277` (2026-11-08) and every later commit of `main` (91) | third-party brand artwork without stated terms: **replaced** (decision 1) and removed from the history (R11, "The history rewrite") |
| `logo.svg`, `favicon.svg` | six blue squares (`#1D56F0`) on a 3 × 3 grid; the favicon white on a dark browser theme | Figma export from the team's file ("logo for website", `docs/ARCHITECTURE.md:339-341`), no upstream match (best 0.33); the favicon hand-edited from it | clear: the designer's work under her consent (R8) |
| `backend/scripts/issue_test_credentials/portrait.jpg` (210 × 270), `signature.jpg` (360 × 100) | a grey head-and-shoulders silhouette; a wavy line over a straight one; JFIF only, no metadata | generated by the team with an AI image tool (user); added in `f2e2c7f` | clear: no third-party rights known |

**Screenshots** (`.specify/bugs/`, 9 PNGs, each viewed by two audits, no text or time chunks): in
`connection-tooltip-clipped/`: `assess-1280-one-row.png`, `assess-1280-two-rows-first.png`,
`assess-1280-three-rows-last.png`, `assess-1280-prototype-top-layer.png`,
`fix-1280-two-rows-first.png`, `fix-640x450-window-top.png`; in `published-sticky-bar/`:
`before-links-open-scrolled-to-end.png`, `prototype-links-open-scrolled-to-end.png` (the
placeholder `https://middleware.example.org/…`) and `before-activity-open-scrolled-to-end.png`, an
empty white capture. All show only the team's UI with made-up data: no browser chrome, real URL,
token or person.

**Spec Kit** (`github/spec-kit` v1.1.1 per `.specify/init-options.json`; MIT, "Copyright GitHub,
Inc."; committed in `443324a` and `57f50cc`): no MIT text or Spec Kit copyright line in the tree,
only `license: MIT` in `.specify/extensions/bug/extension.yml:10`. No upstream file was edited by
the team; every difference is the installer's substitution.

| Paths | Against v1.1.1 | Verdict |
|---|---|---|
| `.specify/scripts/bash/{common,create-new-feature,resolve-template,setup-plan}.sh`; `check-prerequisites.sh`, `setup-tasks.sh` | identical; 4 and 2 lines substituted | NOTICE |
| `.specify/templates/{constitution,spec}-template.md`; `{checklist,plan,tasks}-template.md` | identical; 4, 7 and 1 lines substituted | NOTICE |
| `.specify/extensions/bug/` (`README.md`, `extension.yml`, `commands/speckit.bug.{assess,fix,test}.md`), `.specify/workflows/speckit/workflow.yml` | identical | NOTICE |
| `.claude/skills/speckit-{analyze,checklist,clarify,constitution,converge,implement,plan,specify,tasks,taskstoissues,bug-assess,bug-fix,bug-test}/SKILL.md` | generated from upstream's commands (front matter and paths differ); hashes equal the install manifest | NOTICE |
| `.specify/init-options.json`, `integration.json`, `extensions.yml`, `extensions/.registry`, `integrations/*.manifest.json`, `workflows/workflow-registry.json`, `.specify/.gitignore` | installer state | clear |
| `.specify/bugs/**`, `specs/001…011/**`, `.claude/agents/*.md`, `.claude/commands/figma-audit.md`, `.claude/scripts/figma-audit-save-report.py`, `.claude-plugin/marketplace.json`, `mcp/plugin/**` | the team's | clear |

**Data sets**:

| Path | What | Source | Verdict |
|---|---|---|---|
| `backend/app/option_sets.py` `_COUNTRIES` (249 rows), copied in `frontend/src/utils/connectionPdf/testData.ts:37-38,346` | codes, English and German names | codes ISO 3166-1 alpha-2; German names written by an agent from the Federal Foreign Office's conventions; **English names' source not recorded** (everyday names: Bolivia, South Korea) | codes and German names clear; English names open (task) |
| `option_sets.py` `_SEX`, `_LICENCE_CLASSES`, `_EYE_COLOURS`, `_HAIR_COLOURS` | code values | PID rulebook v1.7 §2.3, ISO/IEC 5218, ISO/IEC 18013-5, Directive 2006/126/EC; labels the team's (`:301-302,314-316,337-338`) | clear |
| `backend/app/catalog.py` | attribute keys, claim paths, labels | PID rulebook v1.7 (`urn:eudi:pid:1`, `urn:eudi:pid:de:1`), ISO/IEC 18013-5 (`org.iso.18013.5.1`); identifiers only (`:216,403`) | clear |
| `rules/src/personas/samples.ts` | 40 given and family names, 30-odd towns with postal codes and authorities, streets | **no source recorded** (`:1-6,18,62,129`) | open (task) |
| `backend/scripts/issue_test_credentials/person.py` | 14 real Stuttgart streets with postcodes, towns, authorities; names from Faker `de_DE` at run time | **no source recorded** for streets and postcodes (`:1-13,84-150`) | open (task) |
| `backend/app/example.py`, `rules/src/fixtures/example-connection.json`, `specs/011-connection-pdf/prototype/data.mjs` | example connections | the team's | clear |
| `rules/src/checks/caseFolding.ts` | every code point `str.casefold()` changes | generated (`backend/scripts/export_check_fixtures.py:117-120,183`) from Python 3.13, i.e. Unicode 15.1.0's data | NOTICE (Unicode licence) |
| `rules/src/checks/fixtures/evaluator-vectors.json`, `rules/src/fixtures/server-messages.json` | test vectors, messages | generated from the team's code; the vectors hold case-folded strings | clear, with the Unicode entry |

**The template**: commit `9e80d79` "Initial commit" (2026-09-10; author Natalia Barsova,
unternehmertum.de), the "React + FastAPI + PostgreSQL Template … for Digital Product School teams":
56 files, 9,882 lines, no licence file; 45 files are in the tree, 11 only in the history (the four
`TeamMembers` page files, `team_members.py`, `frontend/src/api/team-members.ts`,
`frontend/src/types/api.ts`, `frontend/eslint.config.mjs`, `frontend/package-lock.json`,
`frontend/tsconfig.app.tsbuildinfo`, the Plus Jakarta Sans font). `git blame -M -C` (lower bound):

| Share | Files (template lines / lines today) |
|---|---|
| wholly (16) | `backend/alembic/versions/v0_add_team_members.py` 50/50, `backend/alembic/env.py` 51/52, `backend/alembic.ini` 36/36, `backend/alembic/script.py.mako` 26/26, `backend/.dockerignore` 41/41, `frontend/.dockerignore` 34/34, `backend/Dockerfile.dev` 29/29, `backend/Dockerfile` 27/27, `backend/app/__init__.py` 14/14, `frontend/src/vite-env.d.ts` 9/9, `frontend/.prettierrc` 9/9, `frontend/tsconfig.json` 4/4, `frontend/.prettierignore` 4/4, `frontend/.env.example` 4/4, `backend/app/routers/__init__.py` 1/1, `backend/.python-version` 1/1 |
| mostly | `.dockerignore` 44/52, `backend/pyproject.toml` 55/66, `frontend/tsconfig.node.json` 9/11, `frontend/tsconfig.app.json` 7/9, `frontend/package.json` 38/49, `backend/app/db.py` 21/31 |
| about half or more | `docker-compose.yml` 53/83, `docker-compose.prod.yml` 82/134, `frontend/nginx.conf` 80/135, `.gitignore` 53/91, `.pre-commit-config.yaml` 21/34, `tsconfig.base.json` 13/21, `frontend/index.html` 10/16, `api-types/src/api.ts` 8/14, `.specify/memory/constitution.md` 160/289, `frontend/src/main.tsx` 11/22, `frontend/vite.config.ts` 7/15, `frontend/Dockerfile` 20/44 |
| a third to a tenth | `README.md` 344/949, `frontend/src/api/client.ts` 45/122, `backend/app/errors.py` 41/119, `frontend/Dockerfile.dev` 10/28, `eslint.config.mjs` 36/154, `backend/app/main.py` 33/172, `backend/app/config.py` 21/109, `backend/.env.example` 13/75, `docs/ARCHITECTURE.md` 205/2,165 |
| traces | `CLAUDE.md` 18/275, `backend/app/schemas.py` 21/1,010, `frontend/src/index.css` 5/839, `frontend/src/App.tsx` 4/92, `backend/app/models.py` 2/599, `mcp/Dockerfile` 3/46, `mcp/Dockerfile.dev` 1/26, five routers and two tests (1–3 lines each) |

Alembic's generic template (`env.py`, `script.py.mako`, `alembic.ini`) and create-vite's React
template (`tsconfig.app.json`, `tsconfig.node.json`, `vite-env.d.ts`), both MIT, are configuration
boilerplate inside it: clear.

**Only in the history**: Plus Jakarta Sans Regular, Latin subset
(`frontend/src/fonts/plus-jakarta-sans-v12-latin-regular.woff2`, 11,816 bytes; from the template,
deleted in `814a306` on 2026-10-09; believed OFL-1.1, never with a licence text); `dot-grid.svg`
(the team's pattern) and `success-tick.svg` (Material's "Check"), both deleted in `e80b801`; 15
removed Material icons (`check`, `check-blue-small`, `check-circle`, `document-blue`,
`document-small`, `driving-licence`, `driving-licence-blue`, `expand-more`, `lock-blue`, `logout`,
`personal-id`, `personal-id-blue`, `schedule`, `task-alt`, `verified-user`); `emergency-home.svg`
(KERN `danger` = Material Symbols Rounded `emergency_home`); `expand-less.svg` (Material's shape);
`loader.svg`, `tooltip-arrow.svg`, `dot.svg` (plain shapes); earlier `lock.svg` and `favicon.svg`.
No PDF, archive, office document, video, key or database file was ever committed.

**Pasted text and code** (sampled: quotes, fenced blocks, tables and clause citations in the 147
Markdown files of `docs/` and `specs/`; grep for "adapted from", "ported from", "Copyright", "SPDX"
and the like in the code): no copied third-party code; the only copyright lines are `OFL.txt`'s.

| Path | What | Verdict |
|---|---|---|
| `docs/KERN-DESIGN-SYSTEM.md` | the team's KERN summary with its sources (`:5-6,547-559`); a condensed restatement of the kit's props (`:245-330`); R2's nine lines | clear; KERN in `NOTICE.md` |
| `docs/EUDIPLO.md` | the team's summary of EUDIPLO v9.0.0 (`main` at `1a0c2fa`) and docs.eudiplo.dev in its own words (`:3-5,286-318`) | clear (not compared line by line) |
| `specs/011-connection-pdf/pdfkit-cidset-issue.md` | 11 abridged lines of PDFKit 0.20.2 (MIT, `:79-91`); one sentence of ISO 14289-1:2014 clause 7.21.4.2 as veraPDF words it (`:26-29`), with sources | clear (short quotations) |
| `specs/001-servicebw-eudi-middleware/research.md:259` | 12 words of the PID rulebook's `street_address` definition | clear |
| `specs/*/design-notes.md`, `figma-audit/`, `contracts/copy.md` | node ids, layer names, measurements, the UI copy of the designer and the product manager | clear: both consent (R8) |
| `rules/src/personas/random.ts:20-29`, `rules/src/checks/testOracle.ts:297` | mulberry32 (Tommy Ettinger's, published by him as public domain; not recorded) | clear; courtesy line |

No serviceBW documentation and no table or definition of ISO/IEC 18013-5, ISO/IEC 5218, the PID
rulebook or the ARF is reproduced: only identifiers, code values and clause numbers.

**Decision**:
1. **Star artwork: replaced** (the team with the mentor, 2026-11-21). The designer's new visuals
   take the four files' place: eight pictures (drawn from six bitmaps in the design file's
   image bank), with a rebuilt sign-in page and a redrawn not-found page, built as the bug
   record `.specify/bugs/new-visuals/`. The user states (2026-11-21) that the pictures are
   entirely the designer's own work; Vrinda Pasrija is on the consent list (R8), so they are
   the team's under the EUPL-1.2. With which tool and from what she made them is not recorded
   yet: T014 asks the user and records it here with the files' names. `NOTICE.md` and
   `REUSE.toml` get no exception for the old artwork. The old files are also removed from the
   history before publication (FR-044; R11, "The history rewrite").
2. `portrait.jpg`, `signature.jpg`: clear; `NOTICE.md` records the team's AI-generated origin.
3. The template (mentor): may be published under the EUPL-1.2. Closed.
4. Plus Jakarta Sans (the mentor allowed removing it or treating it like Fira): not in the tree, so
   nothing is removed; `NOTICE.md` names it as a font only in the history, under the SIL Open Font
   License 1.1.
5. Screenshots: keep the eight, delete `before-activity-open-scrolled-to-end.png` (FR-034).
6. Fonts, icons (the five changed ones named as changed, as Apache-2.0 asks), Spec Kit, Unicode
   data, mulberry32 and the references (ISO 3166-1, the Federal Foreign Office's country list,
   ISO/IEC 18013-5, ISO/IEC 5218, the PID rulebook v1.7, Directive 2006/126/EC): `NOTICE.md` (R4)
   and `REUSE.toml` (R9).
7. English country names, name and town pools: open; the task finds and records the source. If
   none is recorded by 2026-11-27, FR-018: replace or remove (proposed for the country names:
   re-derive them from CLDR's English territory names, under the Unicode licence).

**Rationale**: everything with a known source and licence is attributed. The one item without
stated terms is third-party brand artwork and the app's most visible picture; only a written
permission would give it terms, so it is replaced.

**Alternatives considered**: asking the publisher for written permission (the
one route to clear terms; not pursued: it depends on a third party and has no date); keeping it
with a notice and its own block in `REUSE.toml` (a notice gives no licence); dropping the five changed icons (licensed once
attributed).

**Not checked**: dependencies (R4); history versions of text files for pasted text (only SVG paths
and `data:` URIs); `docs/` and `specs/` in full (sampled); `docs/EUDIPLO.md` against upstream; the
history's WOFF2 (identified by name and the template's `@font-face`); today's glyphs only (a
redrawn glyph shows as a partial match); a reverse image search; the licences of KERN's Figma kit
and of the PID rulebook.

## R4. Dependency licences and the draft of `NOTICE.md`

**Checked**: on 2026-11-20 with Node 20.19.2, npm 9.2.0, uv 0.13.0, `license-checker-rseidelsohn`
4.4.2 and 5.0.1, `pip-licenses` 5.5.5; unclear licences by reading the packages' files; the frontend
built into the scratchpad (never into `frontend/dist`); the MCP image's install simulated with npm
9.2.0 and 11.21.3. Node: 411 third-party lock entries, 369 installed; "ships" = reachable from
`frontend/`'s and `mcp/`'s `dependencies` (the lock entries without `dev`). Python: 59 entries, 56
installed; runtime = `uv export --no-dev --locked`.

| Licence | Node ships: lock (114) / installed (72) | Node dev only (297) | Python runtime: lock (37) / installed (35) | Python dev only: lock (22) / installed (21) |
|---|---|---|---|---|
| MIT | 80 / 56 | 258 | 18 / 18 | 16 / 16 |
| MPL-2.0 | 24 / 6 | 0 | 0 | 1 / 1 (`pathspec`) |
| Apache-2.0 | 5 / 5 | 18 | 1 / 0 | 0 |
| ISC | 2 / 2 | 11 | 0 | 0 |
| EUPL-1.2 | 2 / 2 | 0 | 0 | 0 |
| BSD-3-Clause | 1 / 1 | 1 | 12 / 11 | 2 / 1 |
| BSD-2-Clause | 0 | 6 | 0 | 1 / 1 (`pygments`) |
| BlueOak-1.0.0, CC-BY-4.0, Python-2.0 | 0 | 1 each | 0 | 0 |
| LGPL-3.0-only | 0 | 0 | 2 / 2 | 0 |
| MIT AND PSF-2.0 (`greenlet`); MIT OR Apache-2.0 (`uvloop`); MIT-0 (`cffi`) | 0 | 0 | 1 / 1 each | 0 |
| PSF-2.0 | 0 | 0 | 1 / 1 (`typing-extensions`) | 1 / 1 (`distlib`) |
| Apache-2.0 OR BSD-2-Clause (`packaging`) | 0 | 0 | 0 | 1 / 1 |

Of the 114 that "ship": 26 are in the frontend bundle (MIT 23, EUPL-1.2 2, Apache-2.0 1):
`@kern-ux/native`, `@kern-ux-annex/kern-react-kit`, `@digitalservicebund/kern-ux-tailwind-theme`,
`tailwindcss`, `react`, `react-dom`, `scheduler`, `react-router`, `pdfkit`, `fontkit`, `linebreak`,
`png-js`, `fflate`, `@noble/ciphers`, `@noble/hashes`, `@swc/helpers`, `brotli`, `base64-js` (1.5.1,
0.0.8), `clone`, `dfa`, `fast-deep-equal`, `restructure`, `tiny-inflate`, `unicode-properties`,
`unicode-trie`; 6 are the MCP server's runtime (Apache-2.0: `@modelcontextprotocol/server`,
`/node`, `/core`; MIT: `zod`, `hono`, `@hono/node-server`); 82 (40 installed) are build tools,
reachable only because `@tailwindcss/vite` and `tailwindcss` sit under `frontend/package.json`'s
`dependencies`. No GPL or AGPL in any set.

| Not permissive, or not a software licence | Version | Licence | Set | Use |
|---|---|---|---|---|
| `@kern-ux/native` | 2.8.2 | EUPL-1.2 | ships | `kern.css` and `fonts/fira-sans.css` compiled into the build's CSS; 10 WOFF2 copied to `dist/assets/` |
| `@kern-ux-annex/kern-react-kit` | 2.40.0 | EUPL-1.2 | ships | unmodified, minified into the main chunk |
| Fira Sans in `@kern-ux/native` | 4.106 | OFL-1.1 | ships | served to browsers; no licence file in the package |
| Fira Sans, Fira Mono (committed) | 4.203, 3.206 | OFL-1.1 | repository | 5 TTFs reach `dist/assets/`, `OFL.txt` does not |
| `psycopg`, `psycopg-binary` | 3.3.5 | LGPL-3.0-only | Python runtime | loaded unmodified by SQLAlchemy's `postgresql+psycopg` dialect, from PyPI; LGPL text in each wheel's `licenses/LICENSE.txt`; `https://github.com/psycopg/psycopg` |
| `lightningcss` and its platform packages | 1.32.0, 1.33.0 | MPL-2.0 | ships (build tool) | Tailwind's and Vite's CSS transformer, not in the bundle; **installed in the MCP image** |
| `pathspec` | 1.1.1 | MPL-2.0 | Python dev | used by mypy |
| `caniuse-lite` | 1.0.30001810 | CC-BY-4.0 | Node dev | browser data for the linter |

| Content differs from the licence field | What the files say |
|---|---|
| `png-js` 2.0.0 | no field; MIT text, Devon Govett |
| `@modelcontextprotocol/*` | Apache-2.0, moving from MIT: unrelicensed contributions stay MIT, documentation CC-BY-4.0 |
| `brotli` 1.3.3 | MIT, no licence file; six bundled `dec/*.js` carry Google's Apache-2.0 headers (in the bundle) |
| `fontkit` 2.0.4, `dfa` 1.2.0 | MIT, no licence file (fontkit's upstream has one, dfa's none) |
| `pdfkit` 0.20.2 | MIT; ships Adobe's AFM metrics (not in the bundle) and the ICC profile sRGB2014, "Copyright International Color Consortium, 2015" (inlined in the bundle) |
| `uvloop` 0.22.1; `segno` 1.6.6, `nodeenv` 1.10.0; `greenlet` 3.5.5 | dual MIT/Apache-2.0, links libuv (MIT); BSD-3-Clause texts; MIT with PSF-2.0 switching code |
| `psycopg-binary` 3.3.5 (15 bundled libraries; licences from upstream, not read from the wheel) | libpq 18 (PostgreSQL License), OpenSSL 3.5.8 (Apache-2.0), MIT Kerberos 1.15.1 and `libcom_err` 1.42.9 (MIT), OpenLDAP (OLDAP-2.8), Cyrus SASL 2.1.26 (BSD with attribution), PCRE 8.32 (BSD-3-Clause), keyutils 1.5.8 and `libcrypt` (LGPL-2.1-or-later), `libselinux` 2.5 (public domain) |
| `argon2-cffi-bindings` 26.1.0; `pydantic-core` 2.46.5; `ruff` 0.16.5 (dev) | Argon2 reference code (CC0-1.0 or Apache-2.0); 19 ICU4X crates under Unicode-3.0 and `unicode-ident` (Unicode-DFS-2016); three MPL-2.0 crates and one WTFPL |
| `backend` 0.1.0, the four workspace packages | no licence field yet |

Still unresolved: `dfa` and `brotli` have no licence text anywhere; the libraries in
`psycopg-binary` and Argon2 are known from upstream only; `colorama`'s BSD variant (Windows only).

**The MCP image**: `mcp/Dockerfile` runs `npm ci -w mcp --omit=dev` ("only the SDK and zod").
Simulated, not built: it installs 29 packages, the 6 runtime ones plus Vite, rolldown, postcss,
`lightningcss` 1.33.0 and others, which the lockfile does not flag `dev` (Vite is a peer of
`@tailwindcss/vite`). `mcp/dist` bundles only the project's code.

**The built frontend** (only `frontend/dist` reaches the nginx image): two legal comments survive
(`noble-hashes`, `noble-ciphers`) and Tailwind's banner; React's, React DOM's, scheduler's and React
Router's banners and brotli's headers are stripped; nothing for KERN; no notices file, no licence
text. Vite 8.3.5's `build.license` lists only the main chunk's 5 packages. The base images
(`python:3.13-slim`, `node:26-alpine`, `nginx:1.31.9-alpine`, `postgres:18-alpine`, `uv` from
`ghcr.io/astral-sh/uv:0.12.9`) hold GPL and LGPL parts; no image is published.

**Decision**:
- `NOTICE.md` lists every entry above that is not permissive and ends with the sentence that all
  other dependencies **declare** permissive licences, naming them, and the two commands (FR-021).
- The built frontend ships `THIRD-PARTY-NOTICES.txt` from `frontend/public/` (copied to `dist/` as
  is; the folder does not exist yet), generated from the 26 bundled packages' licence files, plus
  lodash 4.17.23, the Fira fonts with the OFL text, the ICC profile and brotli's Apache-2.0 headers
  by hand (FR-023).
- Proposed: move `@tailwindcss/vite` and `tailwindcss` to `devDependencies` if
  `npm ci -w mcp --omit=dev` then installs only the six runtime packages (the task verifies);
  otherwise `NOTICE.md` says that the MCP image as built contains lightningcss.

The regeneration commands, as run (also from an empty environment, `env -i`; no tracked change):

```bash
# from the repository root, after npm install
npx --yes license-checker-rseidelsohn@4.4.2 --start . --excludePrivatePackages --markdown
# from backend/
uv run --locked --with pip-licenses==5.5.5 pip-licenses --format=markdown --with-urls --ignore-packages backend
```

4.4.2, not 5.0.1: 5.0.1 demands Node 24 and npm 11 and warns `EBADENGINE` on the README's Node 20;
both gave the same 369 licences; **4.4.2 was not run on Node 26**, which the CI and the images use.
`--production` fails ("No packages found", hoisted packages); `--summary` prints counts; `--locked`
keeps `uv.lock` untouched, `--with` keeps pip-licenses out of `pyproject.toml`. After the rename
(R7) the second command ignores `konnekt-backend`. Both list what is installed: 42 Node and 3 Python
packages locked for other platforms do not appear.

The draft of `NOTICE.md`: the audit's section 9, corrected by R2 and R3 (the theme is MIT, the TTFs
come from Google Fonts' release, the icons are Material's, bundled parts and the history are named):

```markdown
# Notices
Konnekt is licensed under the EUPL-1.2 (LICENSE). These parts come from others or are under other terms.
## In this repository
| Fira Sans 4.203, Fira Mono 3.206 | frontend/src/assets/fonts/ | OFL-1.1, text in OFL.txt | Google Fonts' release (npm @expo-google-fonts/fira-sans, fira-mono 0.4.1); the copyright lines of OFL.txt:1-2 |
| Material Symbols and Material Icons glyphs | frontend/src/assets/icons/ (48; 11 through KERN's icon set; changed by the team: add-link-action, copy-to-variant, calendar-pencil, message-alert, ungroup-brackets) | Apache-2.0 | Google LLC, https://github.com/google/material-design-icons |
| Restated KERN declarations | frontend/src/index.css (marked at each block), docs/KERN-DESIGN-SYSTEM.md:249,258-265 | EUPL-1.2 | @kern-ux/native 2.8.2, @kern-ux-annex/kern-react-kit 2.40.0 |
| Spec Kit 1.1.1 files | .specify/scripts/, templates/, extensions/bug/, workflows/speckit/, .claude/skills/speckit-*/ | MIT | Copyright GitHub, Inc., https://github.com/github/spec-kit |
| Case-folding table, folded test strings | rules/src/checks/caseFolding.ts, rules/src/checks/fixtures/evaluator-vectors.json | Unicode licence (identifier per R9) | Unicode Character Database 15.1.0 through Python 3.13 |
| Template files | as REUSE.toml lists | EUPL-1.2 | Digital Product School's React + FastAPI + PostgreSQL template |
| Test portrait and signature | backend/scripts/issue_test_credentials/*.jpg | EUPL-1.2 | generated by the team with an AI image tool |
| Only in the history: Plus Jakarta Sans Regular | frontend/src/fonts/ until commit 814a306 | OFL-1.1 | from the template |
References, no text copied: ISO 3166-1; the Federal Foreign Office's country list; ISO/IEC 18013-5; ISO/IEC 5218; the EUDI PID rulebook v1.7; Directive 2006/126/EC. Courtesy: mulberry32 (Tommy Ettinger).
.kern-btn--danger and .kern-loader--56 are this project's classes in KERN's namespace, not KERN's.
## Shipped with the running product
| KERN UX (@kern-ux/native) | 2.8.2 | EUPL-1.2 | styles; https://gitlab.opencode.de/kern-ux/kern-ux-plain |
| KERN React Kit (@kern-ux-annex/kern-react-kit) | 2.40.0 | EUPL-1.2 | components; bundles lodash 4.17.23 (MIT, OpenJS Foundation) and React's JSX runtime (MIT, Meta Platforms); https://gitlab.opencode.de/kern-ux/community/kern-react-kit |
| KERN UX Tailwind theme (@digitalservicebund/kern-ux-tailwind-theme) | 4.0.0 | MIT, Copyright (c) 2025 DigitalService (text from upstream) | https://github.com/digitalservicebund/kern-ux-tailwind-theme |
| Fira Sans (inside @kern-ux/native) | 4.106 | OFL-1.1 | Digitized data copyright © 2012-2015, The Mozilla Foundation and Telefonica S.A. |
| psycopg, psycopg-binary | 3.3.5 | LGPL-3.0-only | used unmodified; the binary wheel bundles libpq, OpenSSL and further libraries under their own licences; https://github.com/psycopg/psycopg |
| inside pdfkit and brotli | | | the sRGB2014 ICC profile (International Color Consortium); brotli's decoder files (Apache-2.0, Google) |
## Used to build and develop it
| lightningcss | 1.32.0, 1.33.0 | MPL-2.0 | https://github.com/parcel-bundler/lightningcss |
| pathspec | 1.1.1 | MPL-2.0 | https://github.com/cpburnz/python-pathspec |
| caniuse-lite | 1.0.30001810 | CC-BY-4.0 | https://github.com/browserslist/caniuse-lite |
All other dependencies declare permissive licences (MIT, MIT-0, ISC, BSD-2-Clause, BSD-3-Clause,
Apache-2.0, BlueOak-1.0.0, PSF-2.0, Python-2.0). Full lists: the two commands above.
serviceBW, EUDI Wallet, KERN and the City of Stuttgart are names of their owners; this project is
not endorsed by them (FR-022).
```

**Rationale**: the closing sentence is true only with "declare": lodash, brotli's files, ruff's and
pydantic-core's crates sit under other terms than their package's field. The notices file covers
what Vite's own option misses.

**Alternatives considered**: Vite's `build.license` (5 packages); keeping legal comments in the
minifier (four banners, nothing else); listing build tools as shipped (nothing of them reaches
users, except in the MCP image as built today).

**Not checked**: real images (the MCP image is a simulation on glibc x64, the backend's from
`uv export`); the base images' content; packages locked for other platforms beyond their field;
licence files word for word (a keyword classifier flagged only the cases above); crates in wheels
without an SBOM, static C libraries in `cffi` and `PyYAML`; tools outside the lockfiles
(pre-commit's hooks, gitleaks, uv, the GitHub Actions); 4.4.2 on Node 26; legal compatibility.

## R5. Secrets and confidentiality, and the scrub

**Checked**: on 2026-11-20, gitleaks v8.30.1 (archive SHA-256 equal to `GITLEAKS_SHA256` in
`.github/workflows/ci.yml:197`; the hook pins the same version), default rules, no allowlist, over
the tree, all branches' history and the unreachable objects; then a manual search of the tree and
of `git log --all -p --cc` (30 MB) for token shapes, `-----BEGIN`, `Authorization`, the agent token
prefixes, every value ever assigned to an upper-case setting, URLs with credentials, cookies, `curl`
lines, UUIDs and long opaque strings; both bug folders with hosted identifiers read in full.

**Results: no credential anywhere.**

| Scope | Result |
|---|---|
| Tree (`gitleaks dir --redact .`, about 16 MB) | no leaks |
| All branches (`gitleaks git --log-opts=--all --redact`, 251 commits, about 20 MB) | no leaks; the 41 merges' combined diffs read separately: only `420c381` (`docs/EUDIPLO.md`) has content of its own, nothing sensitive |
| 94 unreachable commits, 194 blobs (exported, `gitleaks dir`) | no leaks; earlier drafts with the patterns below (hosted hostname 4, Figma URL 9, local paths 26); a push does not send them |
| Manual search | no JWT (one `eyJ`: an npm integrity hash); one made-up PEM in a test (`MIIB{name}`, from `71bfb2d`); agent tokens only placeholders (`cp_at_secret` …); `Authorization: Bearer <token>` only in documentation; database URLs only the development default `postgres:postgres@localhost`, README placeholders and test values with made-up passwords; EUDIPLO settings always empty or `<client-id>`-style; no `.env` ever committed; `.mcp.json` (`2c59c44` to `4296483`) held a Playwright entry, no token; `curl` transcripts use shell variables; the example request reference (starts `q3Vh`) in `specs/001-servicebw-eudi-middleware/contracts/integration-api.md:51,93,106` and `specs/002-connection-rules/contracts/integration-api.md:41` predates the code; no walkthrough password written down; 64-hex strings are checksums; UUIDs in the design notes and tasks of specs 008, 010, 011 come from local throw-away databases |
| Identifiers of the **hosted** instance | a form connection id (a connection id starting `c027`, three times in full, twice shortened; a second shortened, `c224…`) and three EUDIPLO session ids (start `5755`, `7e5a`, `b9df`) in `.specify/bugs/wallet-decline-pending/assessment.md:31,82,126,356,361,362` and `.specify/bugs/mdl-driving-privileges-empty/assessment.md:25`, history `a8c0afe`, `4c9db12`; the tenant's trust-list id `trust-list-test` |

The CI's gitleaks job scans `--log-opts=HEAD` only: a branch is scanned when it is pushed.

**Defaults that ship**: none is a credential or repeats one of the hosted instance.
`backend/app/config.py`: `postgres:postgres@localhost:5432/template_db`, every `eudiplo_*` empty,
no signing key exists, production refuses a missing or plain-HTTP `CONNECTION_BASE_URL`;
`backend/.env.example:20` says "(tenant dps)"; the frontend's and MCP's `.env.example` hold
localhost URLs; `docker-compose.yml` `POSTGRES_PASSWORD: postgres` (development, port 5435);
`docker-compose.prod.yml` takes every secret from the environment, with the user `postgres` and the
database `template_db` fixed; the test-credential script reads its issuer credentials from the
environment; neither `backend/app/cli.py` nor the migrations seed an account.

**Personal data**: authors in R8; 291 commits are signed (key not available). No team member, DPS
or city employee, serviceBW contact or interviewee is named in a file or commit message, except a
local user name in a path (`.specify/bugs/publish-error-offscreen/fix.md:117`, L2). Email addresses
in files are on `example.org`/`.com`/`.net` or test values; walkthrough accounts (`designer`,
`p10-alice`, `tester`, `laura.weber`, "Jonas Brandt" …) are fictitious; personas combine common
names at random (one, "Natalia", is also the template author's first name) with random phone
numbers; `person.py` puts random house numbers on real Stuttgart streets, no real person attached.
Two commit messages on `tmp-german` mention "recorded user tests" (`aa8ff5b`, `8169668`), without
names or results.

**Internal infrastructure** (matches in tracked files, lock files left out):

| Item | `specs/` | `.specify/` | Elsewhere | In the history since |
|---|---|---|---|---|
| Hosted hostnames `md.faro.dpschool.app`, `eudiplo.faro.dpschool.app` | 1 | 9 | — | `814a306` (2026-10-09), 3 commits |
| DPS's deployment domain `my-team.dpschool.app` | 1 | — | `README.md` 3, `docs/` 1 | `9e80d79` (the template) |
| Tenant `dps` | 8 | 3 | `README.md` 3, `docs/` 2, `backend/.env.example` 1, tests 3 | `61f6c6f` (2026-10-07), 5 commits |
| Trust-list id; patched build tag `9.0.0-mdocfix.1` | 1; 4 | 4; — | —; `README.md:769`, `docs/EUDIPLO.md:272` | 2 commits; — |
| Figma file keys (four files; first characters `BZUN`, `s8mU`, `hsxN`, `xqEw`); share token (`t=` starting `Y5Rw`) | 53; — | 16; 2 | `docs/FIGMA-WORKFLOW.md:72` (and once in `CLAUDE.md`'s history) | `d8aaefe` (2026-10-09), the main key in 39 commits |
| `/home/debian/batch27-faro/…`; `/home/samu/…`; `/tmp/claude-1000/…/scratchpad` (5 sessions) | 16; —; 5 | 5; 1; 3 | — | `57f50cc`, `25f40b1`, `5ea3bde`; 8, 1, 6 commits |
| Hosted connection and session ids | — | 9 | — | 2 commits |
| Sibling project `sk-proto-1`, path `batch27-faro-middleware-client/sk-proto-1/…` | 3 | 13 | — | `35fc20e` (2026-10-07), 7 commits |
| Codename "Faro's", database `faro_verify` | — | 2 | — | — |
| The private repository's address | — | — | `frontend/src/pages/Account/constants.ts:145`, compiled into the app | 40 merge messages name `DigitalProductschool/<branch>` |
| Coolify | 18 | 1 | 37 (R10) | — |

Clean: `dpschool.io` in no file; IP addresses only loopback, RFC 1918, link-local and metadata
block-list entries and documentation ranges (`203.0.113.0/24`, `2001:db8::/32`); no real
`SERVICEBW_ALLOWED_CIDRS` range ever; other hostnames only placeholders and public sites; no Slack,
Notion, Miro, Jira, Linear or Google Docs link; no real preview URL.

**Scrub patterns** (PCRE, in this order; counts in the tracked files, lock files left out; I1 and I2
use four-character prefixes and match exactly the 5 and 4 occurrences the audit counted):

```text
H1a  \bmd\.faro\.dpschool\.app\b
H1b  \beudiplo\.faro\.dpschool\.app\b
H2   \bmy-team\.dpschool\.app\b                       (keeps a leading *. or 123.)
T1a  (?<=tenant )`dps`   and   (?<=tenant, )`dps`
T1b  \(tenant dps\)
T1c  'dps'                                           (only on the three test lines below)
T1d  dps, hosted\)
T1e  \|\s*Tenant\s*\|\s*`dps`\s*\|
T2   \btrust-list-test\b
T3   \b9\.0\.0-mdocfix\.1\b
L1   /home/debian/batch27-faro/worktrees/([A-Za-z0-9._-]+)   then   /home/debian/batch27-faro/([A-Za-z0-9._-]+)
L2   /home/samu[^\s`)]*
L3   /tmp/claude-\d+/-home-debian-batch27-faro[A-Za-z0-9-]*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/scratchpad
I1   \bc027[0-9a-f]{4}(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|-?…)|\bc224[0-9a-f]{4}…
I2   \b(?:5755|7e5a|b9df)[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b
S1   batch27-faro-middleware-client/sk-proto-1/   then   \bsk-proto-1\b
S2   github\.com/DigitalProductschool/batch27-faro
S3   \bFaro's\b   and   \bfaro_verify\b
```

| Id | Replacement | Where (file: lines) | Matches | Applied |
|---|---|---|---|---|
| H1a, H1b | `middleware.example.org`, `eudiplo.example.org` | `.specify/bugs/mdl-driving-privileges-empty/assessment.md:269`, `eudiplo-fix-prompt.md:4`; `.specify/bugs/wallet-decline-pending/assessment.md:6 (×2), 23, 33, 64, 141, 145`; `specs/001-servicebw-eudi-middleware/research.md:962` | 3, 7 | yes |
| H2 | `my-team.example.org` | `README.md:884,919,925`; `docs/ARCHITECTURE.md:2103`; `specs/001-servicebw-eudi-middleware/research.md:704` | 5 | yes (R10 rewrites the README and ARCHITECTURE sections anyway) |
| T1a | `` `<tenant>` `` | `.specify/bugs/wallet-decline-pending/assessment.md:64,154,341`; `README.md:678,691,772`; `specs/001-servicebw-eudi-middleware/contracts/eudiplo-usage.md:3`, `plan.md:87`, `quickstart.md:14,307`, `research.md:113,181,1010,1034` | 14 | yes |
| T1b | delete, or `(your tenant)` | `backend/.env.example:20` | 1 | yes |
| T1c | `'test-tenant'`, then run pytest | `backend/tests/fake_eudiplo.py:69,229`; `backend/tests/unit/test_issue_test_credentials.py:413` | 3 | yes |
| T1d | `hosted)` padded to the same width | `docs/ARCHITECTURE.md:21` | 1 | yes |
| T1e | ``Tenant`` row with `` `<tenant>` `` | `docs/EUDIPLO.md:285` | 1 | yes |
| T2 | `<trust-list-id>` | `.specify/bugs/wallet-decline-pending/assessment.md:73,85,90,368`; `specs/001-servicebw-eudi-middleware/research.md:1023` | 5 | proposed: yes (the tenant's list, same class as the tenant) |
| T3 | `a patched 9.0.0 build` | `README.md:769`; `docs/EUDIPLO.md:272`; `specs/001-servicebw-eudi-middleware/research.md:974,1010`; `specs/002-connection-rules/quickstart.md:13`, `research.md:539` | 6 | proposed: in `README.md` and `docs/` only (a build a visitor cannot get) |
| L1 | `<git-dir>/worktrees/\1`, `<checkout>/\1` | `.specify/bugs/draft-view-stepper/test.md:31`; `.specify/bugs/force-light-mode/fix.md:149,150`; `.specify/bugs/password-eye-icon-border/fix.md:148,149`; `specs/008-kern-revamp-redesign/brief.md:65 (×2)`; `specs/009-language-toggle/plan.md:12,13`; `specs/010-revamp-backend-gaps/plan.md:13,14`, `quickstart.md:28,29`, `research.md:430,431`, `tasks.md:12,13,726,727`; `specs/011-connection-pdf/tasks.md:536,537` | 21 | yes |
| L2 | `<checkout>/…` | `.specify/bugs/publish-error-offscreen/fix.md:117` | 1 | yes |
| L3 | `<scratchpad>` | `.specify/bugs/add-variant-hover-tooltip/fix.md:79`; `.specify/bugs/copy-popover-label-click/assessment.md:43`; `.specify/bugs/rules-ui-fixes/test.md:88`; `specs/010-revamp-backend-gaps/design-notes.md:1902 (×2), 1950 (×2)`, `tasks.md:568` | 8 | yes |
| I1 | `<form-connection-id>` | `.specify/bugs/mdl-driving-privileges-empty/assessment.md:25 (×2)`; `.specify/bugs/wallet-decline-pending/assessment.md:31,126,356` | 5 | yes |
| I2 | `<session-id>` | `.specify/bugs/wallet-decline-pending/assessment.md:82, 361 (×2), 362` | 4 | yes |
| S1 | `<form-prototype-repo>/`, then `the form prototype` | `.specify/bugs/mdl-driving-privileges-empty/assessment.md:35,38,204,240`, `fix.md:80,82`, `test.md:58`; `.specify/bugs/password-eye-icon-border/fix.md:57`; `.specify/bugs/wallet-decline-pending/assessment.md:26,46,304,372,373`; `specs/001-servicebw-eudi-middleware/plan.md:3,8`, `spec.md:3` | 16 | the path everywhere (it holds `batch27`, FR-013); proposed: the bare name kept in `specs/001…/spec.md:3`, `plan.md:3,8`, this repository's own old branch name |
| S2 | `github.com/DigitalProductschool/konnekt` | `frontend/src/pages/Account/constants.ts:145` | 1 | yes, by the rename (R7) |
| S3 | `Konnekt's`, `konnekt_verify` | `.specify/bugs/test-results-v5/assessment.md:137`, `fix.md:143` | 2 | proposed: yes |
| S4 | — | `dps-react-python-template` (`docs/ARCHITECTURE.md:85`), "DPS React + FastAPI Template" (`.specify/memory/constitution.md:69`), "Digital Product School" (`README.md:23`) | 3 | no: R7 renames the diagram's root, FR-029 amends the constitution, the README's template credit stays |
| C1 | — | `(?i)\bcoolify\b`, 56 matches in 14 files | 56 | README, `docs/`, the compose file and two comments by R10; kept in `specs/` and `.specify/` as the record of how the project was built |

The audit's Figma patterns (four file keys, any `figma.com/design/` URL, the share token) are
**not applied** (decision below). Cautions: `faro` alone is unsafe (`backend/app/option_sets.py:112`
and `frontend/src/utils/connectionPdf/testData.ts:422` hold "Faroe Islands"), so is `dps` alone
(`dpschool`, the template's names); the generated files and migrations hold none of the patterns;
L1, L3 and S1 run independently of the rename (R7), which must not touch these paths.

**Checks after the scrub**, each printing only allowlisted lines (before it, on 2026-11-20: 14,
27, 20, 14 and 16 lines):

```bash
X='--exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=dist --exclude-dir=012-open-source-release --exclude=package-lock.json --exclude=uv.lock --exclude=.git'
grep -rnIE $X 'dpschool\.(app|io)' .
grep -rnIE $X '/home/(debian|samu)|/tmp/claude-[0-9]+/' .
grep -rnIwE $X 'dps' . | grep -viE 'dps-react|DPS React'
grep -rnIE $X '\bc027[0-9a-f]{4}(-|…)|\bc224[0-9a-f]{4}…|\b(5755|7e5a|b9df)[0-9a-f]{4}-|trust-list-test' .
grep -rnIE $X 'batch27-faro-middleware-client|sk-proto-1' .
```

| Allowlist of the scrub (FR-035) | Reason |
|---|---|
| `specs/012-open-source-release/**` | this spec's own text: the patterns are its worklist |
| The contact address of FR-024 on `dpschool.io` in `README.md`, `SECURITY.md`, `CONTRIBUTING.md` (and `NOTICE.md` if it names it) | the public contact the mentor asked for |
| The four Figma file keys and the share token in `specs/`, `.specify/bugs/`, `docs/FIGMA-WORKFLOW.md:72` | accepted by the user: the files are access-controlled |
| `sk-proto-1` in `specs/001-servicebw-eudi-middleware/spec.md:3`, `plan.md:3,8` | the repository's own old branch name (if the S1 proposal holds) |

**Confidential third-party information**, for a person to judge (FR-036):

| # | Item | Where | Status |
|---|---|---|---|
| 1 | serviceBW: only the team's assumptions ("to be confirmed by DO.IT"); form ids `FS-1`, `PT-1`, `F-123`, `12345` and `FS-20417` (25 lines in `backend/tests/` and specs 006, 008) | `specs/001-servicebw-eudi-middleware/research.md:1048-1075` (R20), `spec.md:404-414` | closed: `FS-20417` is invented, a placeholder from the Figma mock-up reused as a test value; it stays (user) |
| 2 | `https://wallet.stuttgart.de/…` in a test | `frontend/src/utils/connectionPdf/wrapUrl.test.ts:9,19` | closed: invented; it stays (user) |
| 3 | "DO.IT" in 170 lines of 62 files as user and operator; **"DO.IT, City of Stuttgart" as the plugin marketplace's owner**; "Landeshauptstadt Stuttgart" and other real authorities in the personas; the example "Passenger transport licence" | `.claude-plugin/marketplace.json:4`, `README.md`, `specs/**`, `backend/app/example.py`, `rules/src/personas/samples.ts` | closed (user): the marketplace's owner becomes Team Faro, the history is not changed for it; the README and the documentation keep describing DO.IT as the product's users |
| 4 | "**the unreleased KERN Revamp**" in one place, "the designer's own rework of KERN" in another; the app ships its values | `docs/FIGMA-WORKFLOW.md:72`, `specs/008-kern-revamp-redesign/brief.md:27`, `docs/KERN-DESIGN-SYSTEM.md:150` | closed (user, quoting the designer): "We used Kern Design from Figma Community and themed/modified it in our own copy." Not confidential; the wording stays. KERN's file on Figma Community is a source to attribute in `NOTICE.md` with the terms it states (FR-020): the task reads them on the file's Community page |
| 5 | The live deployment: one tenant and API client for all environments, the test trust list in production, the tenant's test issuer trusted, no session logs, a patched build, records kept 7 days | `README.md:691-693,772-774`; `specs/001-servicebw-eudi-middleware/research.md:181,1010,1022-1040`; `.specify/bugs/wallet-decline-pending/assessment.md:80-94,341-343,355-368` | README rewritten (R10); specs and bugs keep them as history; the hosted instance is a handover item |
| 6 | No sign-in rate limit or lockout | `specs/001-servicebw-eudi-middleware/research.md:1044` | fixed by R6 finding 4 |
| 7 | The team's own private sibling project: its test form's behaviour quoted from its contract (§2–§4) | `.specify/bugs/wallet-decline-pending/assessment.md:21-50,304-308,372-373`; `.specify/bugs/mdl-driving-privileges-empty/assessment.md:14-40`, `fix.md:78-82`, `test.md:58` | proposed: the team's own text stays; the path goes (S1) |
| 8 | Usability-test plans (numbers and tasks, no names or results); findings about Paradym 1.20.2 and the EU reference wallet from public source | `specs/001-servicebw-eudi-middleware/quickstart.md:238-250`; the wallet-decline assessment | fine |

**Branches** (all equal their `origin/*` copy; "merged": the tip is an ancestor of `main`):

| Branch | Tip, last commit | Merged | Advice |
|---|---|---|---|
| `main` | `9fbce6c`, 2026-11-19 | — | publish |
| `opensource` | `9fbce6c`, 2026-11-19 | the same commit (local only) | this release's branch; delete after the merge |
| `tmp-german` | `1d27cec`, 2026-11-19 | **no, 4 commits ahead** (`aa8ff5b`, `14a80ec`, `8169668`, `1d27cec`: German wording from user tests, an nginx bump; 26 files) | delete, or merge first if the wording is wanted |
| 18 others | `bug-fix` `f35f1d3` 11-19; `ngnix-cve` `f5c4c07` 11-19; `favicon` `e1c9d92` 11-17; `pdf-summary` `6af4426` 11-15; `ui-fixes` `09d8b97` 11-15; `010-revamp-backend-gaps` `1f94fba` 11-12; `de-lang` `6b502c6` 11-10; `ci` `dc7bf5a` 11-09; `new-design` `9d77b02` 11-09; `mcp` `e916150` 11-06; `formid-to-description` `855a2aa` 11-05; `save-exit` `836181b` 11-05; `rules-tests` `66075fc` 11-03; `rules-check` `52cead8` 11-01; `rules` `ec740cd` 10-27; `figma-audit` `3c66a4f` 10-24; `fix-node` `c5f60a2` 10-23; `phase6-7` `a7ebf2e` 10-19 (all 2026) | yes | delete |

The merges also name branches that no longer exist locally (`fix-decline-wallet-request`, `fix-mdl`,
`light-mode`, `border-password-eye-icon`, `fix-error-message` …); on GitHub they may.

**Only in the history**: 209 paths: 160 early frontend files; `specs/010-connection-pdf/**` (37,
renumbered to 011; the main Figma key 3 times, `/home/debian` paths twice);
`specs/redesign-brief.md` (two Figma keys, paths); `specs/006-agent-mcp-server/` (2);
`contracts/webhook-updates.md` (the example reference); a figma-audit file;
`backend/app/routers/id_verification.py`, `team_members.py`, `backend/scripts/clear_connections.py`;
`.mcp.json`; three build files. None is a secret.

**Decision** (user):
- The history is published with one change: the star artwork is removed from every commit (R3;
  R11, "The history rewrite"). Nothing else is rewritten.
- The pasted connection id is accepted in the history, because that connection is already deleted
  on the hosted instance; it is still replaced in the tree (I1). The sessions expired and were
  deleted on 2026-10-13 (I2).
- The scrub covers `specs/`, `.specify/bugs/`, `README.md`, `docs/`, `backend/.env.example` and the
  test fixtures named, with the patterns and applications of the table.
- **Figma**: the files are access-controlled, so the keys and the share token are accepted and
  **not scrubbed** (spec, Clarifications after the audits; FR-033).
- The author addresses in the history, the template's initial commit included, are accepted.
- The 18 merged branches are deleted (handover). `tmp-german` is left to the user, outside this
  spec.

**Rationale**: no credential exists to rotate; what stays in the history identifies, it does not
open, and each item is made harmless at its source (connection deleted, sessions expired, Figma
files access-controlled) or accepted. Placeholders keep the records readable.

**Alternatives considered**: `git filter-repo --replace-text` with these patterns plus `--mailmap`
(contradicts the decision, changes every hash, drops the signatures, does not reach GitHub's
pull-request refs); deleting `specs/` and `.specify/bugs/` (they record how the project was built).

**Not checked**: what GitHub stores (R11); GitHub's own secret scanning; the hosted instances
(nothing fetched); signature validity; `node_modules/`, `backend/.venv/`; the about 3 MB of specs
and design notes line by line (searched by pattern, hits read).

## R6. Security review

**Checked**: on 2026-11-20, read-only, as a stranger would read the code: every endpoint of the
eight routers, sign-in, sessions, OAuth, approvals, `/api/connect/`, injection, errors and logs, the
MCP server, the SPA, the CI, nginx and Docker. `npm audit` was the only outside request.
"Confirmed": the code path read end to end; "plausible": it rests on something outside the
repository or was not run.

| # | Finding | Severity | Place | Confidence | Fix | Disposition |
|---|---|---|---|---|---|---|
| 1 | Pull-request previews of a public repository run a stranger's code with the shared tenant's EUDIPLO credentials, on a domain under production's | high | `README.md:911-935`, `docker-compose.prod.yml:1-6,40-43`, `backend/app/services/worker.py:131-133`, `backend/app/services/eudiplo.py:213-218` | plausible | switch previews off or detach Coolify's GitHub App; if kept, own EUDIPLO client and tenant | handled externally by the team (user, 2026-11-20) |
| 2 | The tree and the history name the live installation and one of its connection ids | medium | the wallet-decline assessment (`:23,31,82,126,141,361-362`), `specs/001-servicebw-eudi-middleware/research.md:962`, `.specify/bugs/mdl-driving-privileges-empty/`, `backend/.env.example:20`; history from `4c9db12` | confirmed | delete the connection; fix or take down the live installation | R5: tree scrubbed, connection deleted (user), history accepted; the hosted instance: handover |
| 3 | Security headers not sent with the SPA's page and assets: consent and approval can be framed | medium | `frontend/nginx.conf:36-38` (server level), `:126-129`, `:132-134` (locations with their own `add_header`), `:121-123` | confirmed by reading | `add_header_inherit merge;` at server level (nginx 1.29.3 or later; the image is 1.31.9), or the headers in both locations; `Content-Security-Policy: frame-ancestors 'none'` | **fix in this spec, with a test** |
| 4 | Sign-in has no throttle; each attempt costs 64 MiB (Argon2id); 40 parallel attempts hold about 2.5 GB and all cores | medium | `backend/app/routers/auth.py:23-47`, `backend/app/services/auth.py:121,145-164`, `backend/app/schemas.py:60-64`, `frontend/nginx.conf:62-72`; 12-character minimum only in `backend/app/cli.py:49-55` | confirmed | `limit_req` for `/api/auth/login` per address (as `real-ip.conf` resolves it), a delay per username after failures, `max_length` on both fields | **fix in this spec, with tests** |
| 5 | Open client registration stores up to 4 MB per call, unbounded, kept an hour | medium | `backend/app/routers/oauth.py:73-99`, `backend/app/schemas.py:980-987`, `backend/app/services/oauth.py:494-538`, `frontend/nginx.conf:66`, `backend/app/services/worker.py:62,552-582` | confirmed | at most 10 redirect URIs; a few kilobytes and `limit_req` for `/api/oauth/`; a cap on unused registrations | **fix in this spec, with tests** |
| 6 | The consent page shows only the client's self-given name, with the requested level (`manage`) preselected | medium | `frontend/src/pages/Authorize/index.tsx:126-139`, `frontend/src/pages/Authorize/utils.ts:44-49`, `backend/app/services/oauth.py:494-538` | confirmed | show the redirect URI's host and that the client registered itself; preselect "Read only" for a client the account has no connection with | **fix in this spec, with tests** |
| 7 | `/docs`, `/openapi.json` public in production; Swagger's script from `cdn.jsdelivr.net` without integrity on the portal's origin | low | `frontend/nginx.conf:109-118`, `backend/app/main.py:117-122` | confirmed | `docs_url=None, redoc_url=None, openapi_url=None` outside development; remove both locations | `SECURITY.md` |
| 8 | The metadata document fetch reaches internal `https://` addresses (port probing) | low | `backend/app/services/oauth.py:305-356,432-467`, `backend/app/routers/oauth.py:102-121`, `frontend/src/pages/Authorize/index.tsx:79-101` | confirmed | refuse loopback, private, link-local, unique-local addresses after resolving; connect to the checked one | `SECURITY.md` |
| 9 | Redirect URIs refused by a block-list of schemes | low | `backend/app/services/oauth.py:81-83,240-266`, `frontend/src/pages/Authorize/index.tsx:115` | confirmed | allow `https`, loopback `http`, schemes with a dot (RFC 8252 7.1) | `SECURITY.md` |
| 10 | The production image runs as development unless `APP_ENV` is set | low | `backend/app/config.py:25`, `backend/Dockerfile`, `backend/app/services/auth.py:198-199` | confirmed | `ENV APP_ENV=production` in `backend/Dockerfile` | **fix in this spec** |
| 11 | `set-password` leaves agent tokens valid | low | `backend/app/cli.py:81-87` | confirmed | delete `agent_authorizations` too, or say so | `SECURITY.md` |
| 12 | Credentialed CORS from `http://localhost:5173` in production | low | `backend/app/config.py:24`, `backend/app/main.py:130-136`, `docker-compose.prod.yml:30-60` | confirmed | no CORS middleware outside development | `SECURITY.md` |
| 13 | The development compose file publishes PostgreSQL (`postgres:postgres`) and the backend on all interfaces | low | `docker-compose.yml:6,9,25,48,67` | confirmed | `127.0.0.1:` on each published port; the README says the file is for a developer's machine | **fix in this spec** |
| 14 | Backend runs as root; `uv run` syncs again at start (`dev` group included); base images by moving tag | low | `backend/Dockerfile:2,17,27`, `frontend/Dockerfile:1`, `mcp/Dockerfile:2,26` | root, tags confirmed; start plausible | a non-root `USER`; `ENV UV_NO_DEV=1 UV_FROZEN=1` or start `.venv/bin/uvicorn`; images by digest | **the start command: fix in this spec**; root, digests: `SECURITY.md` |
| 15 | The session cookie can be overwritten from a sibling subdomain | low | `backend/app/services/auth.py:30-31,202-212` | plausible | `Path=/` with the `__Host-` prefix | `SECURITY.md` |
| 16 | uvicorn logs unhandled exceptions with their message | info | `backend/app/errors.py:101-119` | — | a `uvicorn.error` filter dropping `exc_info` | `SECURITY.md` |
| 17 | A new approval request replaces every waiting one for the same connection and action, whoever made it | info | `backend/app/services/approvals.py:926-936` | — | — | `SECURITY.md` |
| 18 | An agent can open unlimited MCP sessions (30 idle minutes each) | info | `mcp/src/server.ts:196-216` | — | — | `SECURITY.md` |
| 19 | Pull answers carry no `Cache-Control: no-store` | info | `backend/app/routers/connect.py:39-74` | — | — | `SECURITY.md` |
| 20 | No CSP, HSTS or Referrer-Policy; `server_tokens` on; `X-XSS-Protection` obsolete | info | `frontend/nginx.conf:17-38` | — | — | **`server_tokens off;`: fix in this spec**; `frame-ancestors` with 3; the rest `SECURITY.md` |
| 21 | `README.md:904-905` says any `APP_ENV` but production exposes exception details; the code does not | info | `README.md:904-905` | — | correct the sentence | **fix in this spec** (R10 rewrites it) |
| 22 | CI: `actions/checkout@v7`, `actions/setup-node@v7` on moving major tags | info | `.github/workflows/ci.yml:39,66,109,130,133,153,156,172,175,199` | — | pin by commit, as `setup-uv` is | **fix in this spec** |

**Decision**:
- Findings 3 to 6 block publication and are fixed in this spec with tests, as their own task group:
  an exception to "no behaviour change" that FR-037 provides. A new `429` uses the
  `{error, message}` envelope with `Text(en, de)`; the OAuth endpoints keep their RFC bodies; new
  consent-page copy goes through `defineTexts(en, de)`. The spec's Context and SC-009 name these
  fixes as the changes of behaviour.
- Finding 1 is handled externally by the team (user), outside the repository; not a handover
  action. Finding 2: as R5.
- Fixed in this spec of the low and informational findings: 10, 13, 14 (the start command), 20
  (`server_tokens off;`), 21 and 22. Each is one line of configuration or documentation per place,
  and none changes what a team member, citizen or agent meets in the documented setups: 10, because
  `docker-compose.prod.yml:36` already sets it and development builds `backend/Dockerfile.dev`; 13,
  because the README documents no use of the development stack from another machine (the wallet
  talks to EUDIPLO); 14, because the build already syncs with `--no-dev` (checked by starting the
  production compose file, FR-039); 20, because it only hides nginx's version; 21, a wrong
  sentence; 22, the pinned commit is the code the tag points to today. The others need code and
  tests or change what users see: recorded for `SECURITY.md`.

`SECURITY.md`'s known limitations, in substance:

| # | Limitation |
|---|---|
| 1 | `/api/connect/` has no authentication of its own: triggering needs a network position (nginx's allow-list) and the connection's UUID, pulling also the request's 256-bit reference. The backend on port 3000 checks nothing, so whatever reaches it directly bypasses the allow-list (another container on the network, a published port, the development compose file). Whoever can trigger can show a citizen a genuine request under the city's verifier identity and pull what the citizen shares |
| 2 | The allow-list is as good as two settings: `TRUSTED_PROXY_CIDRS` must hold the proxy's addresses and nothing else (a range including a client lets it name any address in `X-Forwarded-For`); `SERVICEBW_ALLOWED_CIDRS` must never hold the proxy's or Docker's range; a proxy that passes a client's own `X-Forwarded-For` on unchanged defeats it too |
| 3 | No rate limit on triggering: every call creates an EUDIPLO session and a row kept seven days |
| 4 | One permission level for people: every team member, and every agent from "Read only" on, reads every connection with its URLs; every agent from "Read and edit drafts" on changes every draft; accounts only by the CLI; no second factor, no lockout |
| 5 | Agents read what others wrote: names, descriptions and rule messages reach an agent as tool results and can try to steer another member's agent; the approval step stands between that and a published change |
| 6 | An OAuth agent connection has no final expiry while used at least every `AGENT_CONNECTION_IDLE_DAYS` |
| 7 | Request references are stored as they are (`document_requests.reference`); only this nginx and uvicorn redact them in logs; the proxy in front logs what it is configured to |
| 8 | The EUDIPLO client reads every session of its tenant: installations sharing a tenant share that exposure |
| 9 | The application connects to PostgreSQL as the superuser `postgres` |
| 10 | No security updates are planned |
| 11 | Findings 7, 8, 9, 11, 12, 14 (root, digests), 15 to 19 and 20 (the rest), each with its fix |

**Found sound**: no hard-coded credential, seeded account, debug endpoint, signing key or bypass;
Argon2id with rehash and equal cost for unknown usernames; session and agent tokens 256-bit, stored
as SHA-256; cookie `HttpOnly`, `SameSite=Strict`, `Secure` outside development; `require_json` on
every state-changing endpoint; rotating refresh tokens, reuse revokes; PKCE S256, single-use codes
under a row lock, exact redirect match; agents cannot approve, approvals bound to the browser
session and re-checked under the row lock; no path trick around the `/api/connect/` allow-list; SQL
only through the ORM; generic 5xx with an `error_id`; the MCP server resolves the bearer before
reading a body and logs only method, tool, status and duration; no HTML sink in the SPA; the CI
uses `pull_request` only, `contents: read`, no secrets, `persist-credentials: false`,
`npm ci --ignore-scripts` and a checksum for gitleaks (FR-041).

**Dependency vulnerabilities**: `npm audit --omit=dev`: 0. Full `npm audit`: 7 moderate, all one
advisory (GHSA-g3hv-75wg-m249, `minimatch` under `typescript-eslint`), development only. **No
`pip-audit` was run** (its host was not allowed); no advisory against `backend/uv.lock` was known.

**Rationale**: publication makes findings 3 to 6 one-step attacks on any installation; the rest need
a position or a signed-in member, or are the operator's configuration, and are honest to state.

**Alternatives considered**: describing 3 to 6 in `SECURITY.md` instead (FR-037 allows it only with
the mentor's agreement, and each fix is small); fixing every low finding now (more behaviour change
and tests than the deadline allows).

**Not checked**: `pip-audit`; nothing executed (findings 3 and 14 rest on nginx's and uv's
documented behaviour); Coolify, Traefik, EUDIPLO and the live settings;
`services/form_connections.py`, `drafts.py`, `rules.py`, `activity.py`, `deletions.py`, `worker.py`
and the MCP tools read for authorization and injection only; `rules/src/`, the PDF renderer, the
test-credential script, the tests and `specs/` beyond searches; GitHub's side.

## R7. The names

**Checked**: on 2026-11-20 with grep over the tree without `node_modules`, lockfiles and build
output: `connection-portal` is on 763 lines in 328 files; 626 of them are under the four packages'
`src/`, of which 608 are import or `vi.mock` lines of `@connection-portal/api-types` and
`@connection-portal/rules` and 18 the storage keys, their tests and comments, and the server's name.
`template_db` is on 147 lines in 35 files.

| Kind | Where | Decision |
|---|---|---|
| Package names and the workspace's dependency entries | root `package.json:2` (`connection-portal`); `api-types/package.json:2`, `rules/package.json:2,17`, `mcp/package.json:2,16-17`; `frontend/package.json:2` (`community-template-frontend`), `:17-18`; `package-lock.json` | `konnekt`, `@konnekt/api-types`, `@konnekt/rules`, `@konnekt/mcp`, `@konnekt/frontend`; the lockfile regenerated by npm, never edited by hand |
| Import specifiers, `vi.mock` paths, comments naming a module | `frontend/src`, `mcp/src`, `mcp/test`, `rules/src` | renamed by script |
| Build and lint configuration | `mcp/vite.config.ts:18` (`noExternal`), `eslint.config.mjs:108` | renamed |
| The plugin, its marketplace, the MCP server's name | `.claude-plugin/marketplace.json:2,8`, `mcp/plugin/.claude-plugin/plugin.json:2`, `mcp/plugin/.mcp.json:3`, `mcp/src/server.ts:78`, `mcp/plugin/README.md:23,37,42,49-50`, `README.md:828-833`; pinned by `mcp/src/guidance.test.ts:91-112` | `konnekt`; an installed plugin must be reinstalled (FR-016) |
| Browser storage keys | `frontend/src/utils/localDrafts/constants.ts:10` (`connection-portal:local-draft:v1:`), `frontend/src/utils/language/constants.ts:4` (`connection-portal:language:v1`), their tests, the comments and docs quoting them (`docs/ARCHITECTURE.md:1170,1190,1494`, specs 005, 006, 008, 009, 010): 44 lines in 27 files, all reading `connection-portal:` | stay (FR-012); allowlisted |
| Backend project | `backend/pyproject.toml:2,4`: `backend`, "FastAPI backend with PostgreSQL" | `konnekt-backend` with a description of the product; `uv.lock` regenerated by uv |
| Database names | `template_db`, `template_db_test`: `docker-compose.yml`, `docker-compose.prod.yml`, `backend/.env.example`, `backend/app/config.py`, `README.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `.github/workflows/ci.yml:96,106`, 6 bug records, 21 spec files | `konnekt_db`, `konnekt_db_test`; the tests' rule (a name ending in `_test`) unchanged; the step for an existing installation documented (FR-016) |
| The old repository | `frontend/src/pages/Account/constants.ts:145` | `DigitalProductschool/konnekt` |
| Earlier specs and bug records | `specs/001`–`011`, `.specify/bugs/` | renamed by the same script, with a note at the top of `specs/` (FR-014) |
| Alembic migrations | `backend/alembic/versions/` (13 files) | never edited; the read-only grep of 2026-11-20 (`grep -rnE 'connection-portal\|community-template\|template_db\|batch27' backend/alembic/`) finds **nothing**, so no allowlist line; the task repeats it |

Beyond that inventory:
- The README's title is "serviceBW ↔ EUDI Wallet Middleware" (`README.md:1`) and becomes "Konnekt",
  with the line that it is the middleware between serviceBW forms and the EUDI Wallet (FR-011). The
  same title is in `CLAUDE.md:1` (FR-029) and the API's title `backend/app/main.py:118` (shown on
  `/docs`); proposed: both "Konnekt", a display title FR-012 does not protect. The UI already says
  Konnekt (`frontend/src/constants.ts:4`, `frontend/index.html:10`).
- The old repository is named only at `frontend/src/pages/Account/constants.ts:145`; the README and
  the specs do not name it (the README's plugin steps say `<repository>`).
- `CONNECTION_PORTAL_MCP_URL`, the variable the plugin reads (18 lines in 8 files:
  `README.md:818-824,932`, `mcp/plugin/.mcp.json`, `mcp/plugin/README.md`,
  `mcp/src/guidance.test.ts`, four files of `specs/007-agent-mcp-server/`): an environment
  variable's name, so it stays (FR-012); FR-013's search does not match it.
- "Connection Portal", the product's earlier name, spelled out 93 times, only in `specs/` and
  `.specify/bugs/` (the bug record `product-name-header` renamed the product to it); proposed: it
  stays as history, the FR-014 note names it; FR-013's search does not match it.
- `docs/ARCHITECTURE.md:85` (`dps-react-python-template/`) becomes `konnekt/`; `README.md:42` and
  `:851` are rewritten by R10; the constitution's `:69` and `:196` by FR-029.
- No generated file holds an old name (checked), and no tool name in the repository carries Claude
  Code's `mcp__connection-portal__` prefix. The tenant name is scrubbing, not naming (R5).

**The rename script** (one run, nothing else in flight; the plan's phase B):
1. Exclude `backend/alembic/versions/`, the four generated files, `specs/012-open-source-release/`,
   `package-lock.json`, `backend/uv.lock`, `LICENSE`, `LICENSE.de` and binary files.
2. `@connection-portal/` → `@konnekt/`; then `"name": "community-template-frontend"` →
   `"name": "@konnekt/frontend"`.
3. `connection-portal(?!:)` → `konnekt`: the look-ahead leaves exactly the 44 storage-key lines.
4. `template_db` → `konnekt_db` (also `template_db_test` and throw-away names like
   `template_db_010_p6`).
5. `github.com/DigitalProductschool/batch27-faro` → `github.com/DigitalProductschool/konnekt`; no
   other `batch27-faro` rule: the other 27 lines are paths the scrub replaces (R5: L1, L3, S1).
6. By hand: `backend/pyproject.toml`'s name and description, the README's title, `CLAUDE.md:1`, the
   API's title.
7. `npm install`; `uv lock` in `backend/` (no `--upgrade`);
   `uv run python -m scripts.export_check_fixtures --check`.
8. After the scrub, `grep -rnIE 'connection-portal|community-template|template_db|batch27'` over the
   tree prints only the allowlist below.

**An existing installation** (FR-016): PostgreSQL's image creates `POSTGRES_DB` only in an empty
data directory, so an existing volume keeps `template_db` while the new default names a database
that does not exist. The README gives the operator the choice: `ALTER DATABASE template_db RENAME
TO konnekt_db;` with no session connected, or the old name kept through `DATABASE_URL` and
`POSTGRES_DB`. The plugin: remove `connection-portal@connection-portal` and its marketplace, add the
marketplace again, install `konnekt@konnekt`; a user's own permission rules naming
`mcp__connection-portal__…` need the new prefix.

| Allowlist of the old names (FR-013) | Reason |
|---|---|
| `connection-portal:` in the 27 files of the storage-key row (44 lines) | stored identifiers (FR-012): local drafts and the language choice survive |
| `specs/012-open-source-release/**` | this spec's own text |
| The note at the top of `specs/` (FR-014) | it says what the names were |
| The README's paragraph for an existing installation (FR-016) | it names `template_db` and the plugin `connection-portal` |

**Decision**: the table, with the names of the spec's Clarifications (user).

**Rationale**: one name wherever a reader takes it for the product's; no change to what a browser,
a database or a client has stored or sends.

**Alternatives considered**: renaming the storage keys with a browser-side migration (code for no
user benefit, drafts lost in a browser that skips the version); keeping the scope
`@connection-portal` (the old name in every import).

**Not checked**: the rename and its effect on the tests (phase B); whether `uv lock` changes more
than the project's name; users' own Claude Code settings.

## R8. Contributors

**Checked**: on 2026-11-20, the authors, committers and trailers of all 292 commits on all branches
and of the 94 unreachable ones (R5); for people without commits, the user's answer.

| Contributor | Contribution | Evidence |
|---|---|---|
| Samuele Musiani | author of 291 commits, 287 with an address at `teapot.ovh` (personal) and 4 at `dpschool.io` (`d0b2262`, `6f03a3e`, `e4639cc`, `15f4814`, on `main`); committer of 251; two `Signed-off-by` (`db41786`, `08b622a`) | git metadata |
| Digital Product School | the template, commit `9e80d79` (author Natalia Barsova, `unternehmertum.de`) | git metadata; FR-008 counts it through DPS |
| Vrinda Pasrija | designer: designs, UI copy, the logo, the icon compositions, the "KERN Revamp" values, through Figma | user, 2026-11-20 |
| Amber Rafique | product manager: the UI copy with the designer (`specs/008-kern-revamp-redesign/spec.md:10-16`) | user, 2026-11-20 |

The 41 merges are committed by GitHub. No reachable commit carries `Co-authored-by`; the unreachable
commits carry 13 `Co-Authored-By` trailers with Anthropic's no-reply address. Much of the code was
written with an AI coding assistant directed by the committer; the consent statement's "my own
work" holds for it as it is, without a note (user, 2026-11-20).

**Decision**: the consent list is Samuele Musiani, Vrinda Pasrija and Amber Rafique, each posting
the statement on `LICENSE` in the pull request, and DPS for the template, whose agreement the
mentor gave on 2026-11-20 (proposed: the mentor also posts it on the pull request, so that SC-003's
count holds). The author addresses in the history are accepted (user). The copied-material audit's
"287 commits by one team member (two addresses)" is corrected by the secrets audit's 287 + 4.

**Rationale**: FR-008 asks for authors, co-authors and those who contributed without committing;
the designer's and the product manager's work reached the tree through Figma.

**Alternatives considered**: none; the list follows from the history and the user's answer.

**Not checked**: contributors visible only on GitHub (review comments, suggested changes, issues).

## R9. REUSE

**Checked**: on 2026-11-20, from R2 to R4: which files carry other terms and which licence texts
they need. A design; `reuse` was not run.

**Decision** (user): one `REUSE.toml` in the root, no per-file headers; version 1 of the format, a
default block for every file, then blocks with `precedence = "override"` per third-party group:

```toml
version = 1

[[annotations]]
path = "**"
SPDX-FileCopyrightText = "2026 Team Faro, Batch#27, Digital Product School"
SPDX-License-Identifier = "EUPL-1.2"

[[annotations]]  # Fira Sans, Fira Mono and their licence text (R3)
path = ["frontend/src/assets/fonts/*.ttf", "frontend/src/assets/fonts/OFL.txt"]
precedence = "override"
SPDX-FileCopyrightText = ["2012-2015 The Mozilla Foundation and Telefonica S.A.", "2012-2013 The Mozilla Corporation and Telefonica S.A."]
SPDX-License-Identifier = "OFL-1.1"

[[annotations]]  # Material Symbols and Material Icons, 11 through KERN's icon set (R2, R3)
path = "frontend/src/assets/icons/*.svg"
precedence = "override"
SPDX-FileCopyrightText = "Google LLC"
SPDX-License-Identifier = "Apache-2.0"

[[annotations]]  # the five glyphs changed by the team
path = ["frontend/src/assets/icons/add-link-action.svg", "frontend/src/assets/icons/copy-to-variant.svg", "frontend/src/assets/icons/calendar-pencil.svg", "frontend/src/assets/icons/message-alert.svg", "frontend/src/assets/icons/ungroup-brackets.svg"]
precedence = "override"
SPDX-FileCopyrightText = ["Google LLC", "2026 Team Faro, Batch#27, Digital Product School"]
SPDX-License-Identifier = "Apache-2.0"

[[annotations]]  # Spec Kit v1.1.1 (R3)
path = [".specify/scripts/**", ".specify/templates/**", ".specify/extensions/bug/**", ".specify/workflows/speckit/**", ".claude/skills/speckit-*/**"]
precedence = "override"
SPDX-FileCopyrightText = "GitHub, Inc."
SPDX-License-Identifier = "MIT"

[[annotations]]  # Unicode data (R3); identifier to be verified
path = "rules/src/checks/caseFolding.ts"
precedence = "override"
SPDX-FileCopyrightText = ["Unicode, Inc.", "2026 Team Faro, Batch#27, Digital Product School"]
SPDX-License-Identifier = "Unicode-3.0"

[[annotations]]
path = "rules/src/checks/fixtures/evaluator-vectors.json"
precedence = "override"
SPDX-FileCopyrightText = ["2026 Team Faro, Batch#27, Digital Product School", "Unicode, Inc."]
SPDX-License-Identifier = "EUPL-1.2 AND Unicode-3.0"

[[annotations]]  # wholly the template's (R3); EUPL-1.2 by the mentor's confirmation
path = ["backend/alembic/versions/v0_add_team_members.py", "backend/alembic/env.py", "backend/alembic.ini", "backend/alembic/script.py.mako", "backend/.dockerignore", "frontend/.dockerignore", "backend/Dockerfile.dev", "backend/Dockerfile", "backend/app/__init__.py", "frontend/src/vite-env.d.ts", "frontend/.prettierrc", "frontend/tsconfig.json", "frontend/.prettierignore", "frontend/.env.example", "backend/app/routers/__init__.py", "backend/.python-version"]
precedence = "override"
SPDX-FileCopyrightText = "Digital Product School"
SPDX-License-Identifier = "EUPL-1.2"
```

- The template's holder is written as the mentor's confirmation names it. A template file this spec
  changes (the backend Dockerfiles, R1 and R6) names both holders.
- No block for the illustrations: the replacement of the star artwork (R3) is the team's and
  falls under the default block.
- No block for the test images (the team's) or the restated KERN declarations (inside EUPL-1.2
  files; KERN names no holder, so the attribution is the comments and `NOTICE.md`).
- `LICENSES/` holds exactly `EUPL-1.2.txt` (the root's `LICENSE`, R1), `OFL-1.1.txt`,
  `Apache-2.0.txt`, `MIT.txt` and the Unicode licence under its identifier: `reuse lint` flags
  unused licence files.
- The check runs in the CI as a new job (read-only, version pinned as gitleaks is) and is
  documented in the README's "Continuous integration" and `CLAUDE.md`'s commands (CLAUDE.md requires
  both for a new check).

**To be verified by the task, not facts**: the SPDX identifier of the licence of Unicode 15.1.0's
data (believed `Unicode-3.0`); whether `reuse lint` accepts the root's `LICENSE` beside `LICENSES/`,
and `backend/LICENSE`; how `reuse` treats `LICENSE.de`; the current `reuse` version to pin; that the
last matching block wins and how `precedence` meets the default block; how a file with no licence
grant is expressed; that `reuse` finds ignored files through git, which here works only with
`GIT_DIR` and `GIT_WORK_TREE` set (spec, Assumptions); that every file under the Spec Kit paths is
upstream's.

**Rationale**: one file covers about a thousand files, generated files, binaries and migrations
included, and lets a machine answer "whose, under which terms" for every one (SC-001).

**Alternatives considered**: per-file SPDX headers (the mentor's optional step 8); `.reuse/dep5`
(the format `REUSE.toml` replaced).

**Not checked**: `reuse` itself (not installed here); the REUSE specification's current text.

## R10. Public-facing files

**Checked**: on 2026-11-20, the README, `docs/`, the production compose file, the frontend's
Dockerfile and nginx entrypoint, by grep for Coolify, previews, Spec Kit and the template, and by
reading the cited sections.

| File | Lines | What it says today |
|---|---|---|
| `README.md` | 1, 23, 42 | the old title; the credit to the DPS template; "Dependencies added to the template" |
| `README.md` | 120 | `docker-compose.prod.yml # Production and previews (Coolify)` |
| `README.md` | 659–670 | "Frontend container (production nginx)": set "for example in Coolify"; defaults `${SERVICE_NAME_BACKEND}`, `${SERVICE_NAME_MCP}` "in Coolify"; `TRUSTED_PROXY_CIDRS` as "Coolify's Traefik" |
| `README.md` | 678, 691–693, 769, 772–774 | the tenant, the patched build, the live deployment's shared tenant and trust list (R5) |
| `README.md` | 818–824, 932 | `CONNECTION_PORTAL_MCP_URL`; "a preview deployment has its own domain" |
| `README.md` | 849–863 | "Spec-Driven Development with Spec Kit": "This template supports [GitHub Spec Kit]…" and its installation, `uvx --from git+https://github.com/github/spec-kit.git specify init --here` |
| `README.md` | 865–945 | "Deployment / Deploy to Coolify": the resource; Coolify's generated `SERVICE_PASSWORD_POSTGRES` and `SERVICE_FQDN_FRONTEND` (886–887); `my-team.dpschool.app` (884, 919, 925); the wrong `APP_ENV` sentence (904–905); HTTPS from Coolify's Traefik (907); "Enable preview deployments" (911–935) |
| `docs/ARCHITECTURE.md` | 21, 85, 107, 608, 1843, 2015, 2063 | the tenant in the diagram; the template's folder; Coolify in the tree and settings tables; "`SameSite` alone isn't enough, because PR previews…" |
| `docs/ARCHITECTURE.md` | 2095–2165 | "Production Deployment (Coolify)": magic variables (2151), previews renaming services (2155–2161), `my-team.dpschool.app` (2103) |
| `docs/EUDIPLO.md` | 272, 277–289 | the patched build; "This project's deployment": "Hosting: Coolify + Traefik" (283), the tenant (285) |
| `docker-compose.prod.yml` | 1–6, 31–33, 37, 83–84, 86, 91, 94, 118 | comments about Coolify and previews |
| `docker-compose.prod.yml` | 14, 34 | `${SERVICE_PASSWORD_POSTGRES}`, no default |
| `docker-compose.prod.yml` | 85 | `- SERVICE_FQDN_FRONTEND`: a bare declaration only Coolify reads (it makes Coolify write Traefik's routing and TLS labels); no reader in the container |
| `docker-compose.prod.yml` | 34, 87, 95, 119 | `${SERVICE_NAME_POSTGRES:-postgres}`, `${SERVICE_NAME_BACKEND:-backend}`, `${SERVICE_NAME_MCP:-mcp}`: work without Coolify through their defaults |
| `docker-compose.prod.yml` | — | no service publishes a port: Coolify's Traefik reaches nginx on the internal network |
| `frontend/Dockerfile`; `frontend/nginx/40-servicebw-access.sh` | 29; 9 | "Coolify previews get a suffixed backend service name"; "(Coolify's Traefik)" |

**Decision**: a generic Docker Compose deployment behind any HTTPS reverse proxy, with
`SERVICE_PASSWORD_POSTGRES` and `SERVICE_FQDN_FRONTEND` as ordinary, documented variables. Under
FR-012 both keep their names (which also keeps a Coolify installation working): the password is
documented as required; the README says the FQDN variable only matters to a host that reads it.
Proposed for the task: the `SERVICE_NAME_*` indirections become the fixed service names, since the
generic deployment has no previews; the README says how the proxy reaches nginx (a port published
on `127.0.0.1`, or the proxy on the compose network), since the file publishes none; the Spec Kit
installation goes, one sentence with a link to Spec Kit says that `specs/` records how the project
was built (FR-026); the README gains the status banner (FR-024), the copyright notice with a link
to `LICENSE` (FR-005) and the step for an existing installation (FR-016, R7); the template's credit
(`README.md:23`) stays.

**Rationale**: FR-025: a visitor deploys without DPS's infrastructure, and the compose file works
without variables only Coolify provides.

**Alternatives considered**: keeping the Coolify guide as one option (FR-025 forbids it); new
variable names (FR-012).

**Not checked**: the links (FR-040) and a fresh clone (FR-039): phase E.

## R11. How the repository is published, and the handover

**Checked**: on 2026-11-20, what the audits could read: the git objects only. `gh` is not
installed, so nothing GitHub stores for the repository was read.

**Findings**: making `DigitalProductschool/batch27-faro` public also publishes about 170 pull
requests (the merges name #73 to #170) with descriptions, comments and images, the review bot's
output, the Actions runs' logs and artefacts, deployment and environment records (Coolify's GitHub
App writes preview URLs there), webhooks, wiki, Discussions, releases, the names of the
repository's secrets, forks, `refs/pull/*`, and commits force-pushed away but fetchable by hash. The
star artwork's copy in the history stays reachable through `refs/pull/*` whatever is done to the
branches.

**Decision** of 2026-11-20 (user and mentor): the existing repository is renamed to
`DigitalProductschool/konnekt` and made public as it is, with its pull requests and logs; both
accept that this content becomes public unread.

**Reopened on 2026-11-21** by the decision to remove the star artwork from the history (R3,
FR-044), because that removal does not hold in the existing repository (below).

**Decision** of 2026-11-24 (the mentor), which replaces that of 2026-11-20: the rewritten `main`
is pushed into a new repository, `DigitalProductschool/konnekt` (the name is final), and that
one is published. `batch27-faro` is not renamed: it stays private and is archived, and keeps its
pull requests, its logs and the consent statements. Nothing rewritten is pushed to it.

**The history rewrite** (FR-044; T040 writes `history-rewrite.md`):

- What is removed: four objects, one per file, added in `48fb277` and never changed since:
  `27f50dd49ece474eb385266a7f60dcaf507d4d9d` (`login-art@2x.png`),
  `04ddbc085f557cb8139edd25b16946090bcf230d` (`wallet-star@2x.png`),
  `c04e0e40a340dc714f86585586ac4e033c83b921` (`published-art@2x.png`),
  `d932b5ab1c2a697195d8316766595d1f9a237bcc` (`published-art-grey@2x.png`). Two of the nine
  screenshots under `.specify/bugs/` were looked at again on 2026-11-21 and do not show the
  artwork; T040 looks at the other seven.
- Rehearsed on 2026-11-21 on a scratch clone at `9fbce6c`, with git-filter-repo run through
  `uvx` and `--strip-blobs-with-ids`: 293 commits before and after; none of the four objects
  left in any ref; the pack 0.9 MiB smaller; the old remote removed by the tool. The objects are
  named by ID, not by path, so that new files under the old names are kept.
- Every commit got a new hash, also those before `48fb277`: 292 of the 293 commits are signed,
  the tool drops signatures, and a commit's hash covers its signature and its parents. The
  commits are unsigned afterwards. The tool writes the old and new hashes to
  `.git/filter-repo/commit-map` and updates hashes in commit messages, not in files: the hashes
  that the specs and bug records cite stay those of the old history.
- State on 2026-11-24: `main` is at `2d3f0f3` with the new visuals (#172), the sign-in motion
  (#173) and the German copy of the user tests (#174); 301 commits on `main`, 300 of them
  signed. The four objects are still the only versions of the old files; `320728d` deleted the
  files from the tree. The eight new pictures are `.webp` files under other names, and those
  three pull requests added no other picture than these and `logo-white.svg`.
- When: after everything is merged and before anything is public. Done after publication it
  removes nothing from GitHub or from anyone's clone or fork, and it breaks every clone.
- What it does not reach in the existing repository, private or public: the pull request that
  merged `48fb277` keeps the files in its "Files changed", `refs/pull/*` cannot be pushed over,
  and the old commits stay fetchable by hash. GitHub's documentation ("Removing sensitive data
  from a repository", read 2026-11-21): its support "won't remove non-sensitive data".
- Access: the new-repository route needs read access to the existing repository and push access
  to the new, empty one; no forced push and no write access to the existing `main`. The mentor
  can also run the runbook themselves.
- Cost of the new repository: the pull requests, their reviews and the consent statements are
  not in the public repository; the mentor decides whether the statements must be public, in
  which case the pull request with `LICENSE` is opened in the new repository instead, before
  anyone posts.

**Rationale**: it is the only route on which the star artwork is gone from what is published,
and it publishes only what the audits read. Its price: the pull requests, their reviews and the
links to them are not public.

**Alternatives considered**: renaming the existing repository and making it public (the decision
of 2026-11-20), which keeps the pull requests but also the removed files in them; a forced push
of the rewritten history to the existing repository, which does not remove them either.

**Handover** (`handover.md`, in FR-043's order):

| # | Item | Source |
|---|---|---|
| 1 | Rotate what FR-031 names: no credential was found, so nothing; run `gitleaks git --log-opts=--all` once more just before publishing, since the CI scans only what is pushed | R5 |
| 2 | Delete the 18 merged branches, and `opensource` after the merge | R5 |
| 4 | Detach infrastructure, connectors and the review bot (Coolify's pull-request previews are the team's, R6 finding 1) | R11, R6 |
| 5 | Create `DigitalProductschool/konnekt` as a new, empty, private repository with push access for the user; archive `batch27-faro`, which stays private | R11, decision of 2026-11-24 |
| 6 | Protection rules for `main` in the new repository, set after the first push; the CI keeps read-only permissions | R6, FR-041 |
| 7 | Close issues and pull requests as the status banner says | FR-024 |
| 9 | A tag on the published commit | FR-043 |
| 10 | The hosted instance: shut down, or kept with its own tenant and trust list, a strong password on every account and `SERVICEBW_ALLOWED_CIDRS` closed; the history names its hosts and set-up; a redeploy from the new repository meets the database rename (R7) | R5, R6 finding 2 |
| 11 | What `handover.md` puts first: item 5, which the history rewrite needs ("The history rewrite" above), and the one open question, whether the consent statements must be visible in the public repository | FR-044; spec, Assumptions |

**Not checked**: everything listed under Findings.

## Open points

| # | Point | Who | By | Fallback |
|---|---|---|---|---|
| 1 | Closed on 2026-11-24 (the mentor): the rewritten history is published in a new repository (R11). Still open: whether the consent statements must be visible in the public repository | mentor | before the first consent statement | they are posted on the pull request in `batch27-faro`, which stays private |
| 2 | Closed on 2026-11-24 (the mentor): the name `DigitalProductschool/konnekt` is final | | | |
| 5 | The terms of KERN's file on Figma Community, from which the designer derived the design's values (R5, item 4) | task | 2026-11-27 | named in `NOTICE.md` with its source and "terms not stated" |
| 3 | The source of the English country names (`backend/app/option_sets.py`) and of the name and town pools (`rules/src/personas/samples.ts`, `backend/scripts/issue_test_credentials/person.py`) (R3) | task | 2026-11-27 | FR-018: replace or remove (for the country names, re-derive from a list with clear terms) |
| 4 | The consent statements of Samuele Musiani, Vrinda Pasrija and Amber Rafique, and DPS's through the mentor (R8) | team | 2026-11-27 | no merge (FR-010); the mentor and the team decide on the work of anyone who declines |
| 6 | What happens to the hosted instance, whose hosts and set-up the history names (R5, R11) | mentor | at publication | handover item; no task depends on it |
