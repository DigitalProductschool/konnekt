# Bug Fix: New visuals: eight pictures replace the four illustrations, the sign-in page is rebuilt on a blue surface, the not-found page is redrawn

- **Slug**: new-visuals
- **Fixed**: 2026-11-21
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The previous illustrations are replaced by the new visuals. Eight lossless WebP pictures and the
white logo were added, and the four previous PNGs were deleted. The five places are rebuilt as the
"⛓️ New visuals" frames draw them (A, then B4, B2, B3, B5, B1): the documents step's empty
panel, the status band with one picture per state (a draft's "Delete draft" is now in a ⋯ on its
date pill), the welcome card, the not-found card with its title as the page's `h1`, and the
sign-in pages on the blue surface with the white chain. The motion from sign-in to the welcome
page is the follow-up record **`login-welcome-motion`**. Nothing is committed (this checkout's
`.git` points to a worktree on another machine, so git can't run here anyway).

## Changes

All paths under `frontend/src/` unless they start elsewhere.

| File | Change | Notes |
|---|---|---|
| `assets/illustrations/chain-band-active@2x.webp`, `chain-band-scheduled@2x.webp`, `chain-band-draft@2x.webp`, `chain-band-broken@2x.webp`, `chain-error-broken@2x.webp`, `chain-welcome-card@2x.webp`, `folder-empty-documents@2x.webp`, `chain-login-white@2x.webp` | added | the assessment's recipe, byte for byte its sizes (table below) |
| `assets/illustrations/logo-white.svg` | added | from `<downloaded-assets>/`, unchanged (202 × 60) |
| `assets/illustrations/login-art@2x.png`, `wallet-star@2x.png`, `published-art@2x.png`, `published-art-grey@2x.png` | removed | as the record requires; nothing imports them |
| `assets/illustrations.test.ts` | added test | the 1.5 MB limit, and the folder's exact contents |
| `pages/FormConnectionEditor/DocumentsStep/EmptyPanel.tsx` | modified | B4: the folder at 162 × 161 in a clip box of its own |
| `pages/FormConnectionDetail/StatusBand.tsx` | modified | B2: `md:pr-200`; the picture 241 × 320 at the band's top right; `mainAction` and its markup removed |
| `pages/FormConnectionDetail/constants.ts` | modified | four pictures in `STATUS_BAND_TONES`; `draftActions` "Draft actions" / "Aktionen für den Entwurf"; comments |
| `pages/FormConnectionDetail/types.ts` | modified | `picture`'s comment; `mainAction` removed; `actions` now also the draft's |
| `pages/FormConnectionDetail/DraftDetails.tsx` | modified | `actions={<ActionMenu label={copy.draftActions} …>}` with "Delete draft" (`DELETE_ICON`, danger) opening the existing dialog |
| `pages/FormConnectionList/WelcomePage.tsx` | modified | B3: padding 36 / 48 (right 301 from `md`), `md:min-h-296`, column `max-w-760`, the chain in a clip layer; steps row per language |
| `pages/FormConnectionList/constants.ts`, `types.ts` | modified (scope expanded) | `WELCOME_STEPS_ROW` and `WelcomeStepsRowClasses` (Deviations 4) |
| `components/NotFound/index.tsx` | rewritten | B5: one card, title as `h1`, column ≤ 560, chain 392 × 296 in a clip layer |
| `components/NotFound/constants.ts` | modified | comment cites `7786:63039`; strings unchanged |
| `components/AuthLayout/index.tsx`, `AuthIntro.tsx`, `constants.ts` | rewritten | B1: blue surface, chain layer, hero (logo, `h1`, tagline), the widths of the proposed table |
| `components/TopBar/index.tsx`, `types.ts`, `utils.ts` | modified | new `brandSurface` prop: no Konnekt pill, scrolled header area blue (Deviations 1) |
| `components/TopBar/utils.test.ts` | updated test | the blue header area on the sign-in surface |
| `index.css` | modified | `@theme`: `--text-hero-headline` (KERN's `--kern-font-size-56`, 1.2), `--text-hero-tagline` (`--kern-font-size-20`, 24 px) |
| `frontend/nginx.conf` | modified | `webp` in the long-cache rule |
| `docs/ARCHITECTURE.md` | modified | L1; the header on the blue surface; "The visuals" (new bullet); the band's picture and the draft's ⋯ |
| `docs/KERN-DESIGN-SYSTEM.md` | modified | §3.1: the two hero tokens |
| `CLAUDE.md` | modified | one "Visuals" rule pointing to ARCHITECTURE |
| `specs/008-kern-revamp-redesign/design-notes.md` | modified | a table of the new files after T004's; notes on the `AuthLayout`, `NotFound`, "Empty state" rows, the verification rows and F56's decision: the previous illustrations are replaced by the new visuals, pointing to this record |
| `specs/008-kern-revamp-redesign/research.md`, `plan.md` | modified | R1, V3 (lossless, at most 1.5 MB each), the plan's tree |
| `specs/008-kern-revamp-redesign/figma-audit/report.md` | modified | F56's row: the draft pill's ⋯ |

### The pictures (section A)

Built with the assessment's recipe (`uv run --no-project --with pillow --with numpy python -I`,
Pillow 13.0.0, outside the project). Each stored file was then decoded and compared with its
source before anything was deleted:

| File | Pixels | Bytes | Against its source |
|---|---|---|---|
| `chain-band-active@2x.webp` | 482 × 640 | 558,274 | alpha identical, visible colour identical |
| `chain-band-scheduled@2x.webp` | 482 × 640 | 591,640 | identical |
| `chain-band-draft@2x.webp` | 482 × 640 | 412,154 | identical |
| `chain-band-broken@2x.webp` | 482 × 640 | 227,452 | identical |
| `chain-error-broken@2x.webp` | 784 × 592 | 303,894 | identical |
| `chain-welcome-card@2x.webp` | 960 × 640 | 687,074 | identical |
| `folder-empty-documents@2x.webp` | 324 × 322 | 86,382 | identical |
| `chain-login-white@2x.webp` | 3104 × 3104 | 1,182,646 | identical to the recipe's Lanczos resample (white, alpha only) |

## Diff Highlights

```tsx
// StatusBand.tsx: the picture's box is its own width, at the band's top right
<section className={`… p-16 sm:p-32 md:pr-200`}>
  <div aria-hidden="true" className="rounded-kern-large pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
    <img src={look.picture} alt="" aria-hidden="true" width={241} height={320}
      className="absolute top-0 right-0 h-320! w-241 max-w-none!" />
```

```ts
// AuthLayout/constants.ts: the chain follows the right edge from 1400 px, then holds
'absolute -top-191 left-[max(100%-1094px,266px)] h-1552! w-1552 max-w-none! @min-[1125px]:left-[max(100%-1094px,306px)]'
```

```ts
// TopBar/utils.ts
export function headerBackgroundClasses(scrolled: boolean, brandSurface = false): string {
  if (!scrolled) return 'transition-colors duration-(--duration-colour)';
  return brandSurface ? 'bg-kern-action-default' : 'bg-kern-layout-background-default';
}
```

## Tests Added or Updated

- `frontend/src/assets/illustrations.test.ts`
  - "keeps every file at 1.5 MB or less": every file in `illustrations/`.
  - "holds the eight new pictures, the white logo, the favicon and the header logo, nothing
    else": the folder's exact list, so the deleted files can't come back unnoticed. It never
    names them, so the old-name grep stays empty.
- `frontend/src/components/TopBar/utils.test.ts` › "turns the blue surface's blue on the sign-in
  screens, at once, never white": the scrolled header area on the sign-in pages is
  `bg-kern-action-default` with no transition, and is transparent at the top as elsewhere.

## Local Verification

- Commands run:
  - The recipe and a decode check → "ALL OK", sizes as above.
  - `npm run lint` at the root → passes.
  - `npm test` at the root → rules 46 files / 2678 tests, frontend 48 / 2018, mcp 15 / 513, all
    passing.
  - `npm run build` at the root → passes; the eight `.webp` files are in `dist/assets/` with
    hashed names, and no `.png` is left. The "chunks larger than 500 kB" warning is about the
    JavaScript chunks and was there before.
  - `npm run format:check` → passes.
  - `grep -rnE "login-art|wallet-star|published-art" frontend/ docs/ CLAUDE.md README.md`
    (`node_modules` and `dist` excluded) → nothing.
  - Spec 008's "assets nobody imports" loop (design-notes §7) → prints nothing.
- **Browser** (Chromium through Playwright). The dev server ran against a local backend on a
  fresh `postgres:18-alpine` container (`docker compose -p new-visuals up postgres`), with the
  tests' fake EUDIPLO installed by a throwaway launcher in the session's scratchpad, not in the
  repository. The data was a test account and four invented connections (active, scheduled for
  01.12.2026, deactivated, and the example draft). The window was 15 px wider than each width
  for the scrollbar gutter. Fonts: `document.fonts.check('500 56px "Fira Sans"')` and
  `('400 20px "Fira Sans"')` are true. The screenshots were compared with the Figma screenshots'
  descriptions (read through an Opus subagent). They showed only the new visuals and were
  deleted afterwards; no screenshot is in the record or in the repository.

### B1 Sign-in (`7741:61919`), 1440 × 900

| Element | Property | Figma | Actual |
|---|---|---|---|
| Surface | background | `#1D56F0` | `rgb(29, 86, 240)` |
| Chain | box | 1552 × 1552 at 346, −191 | 346, −191, 1552 × 1552; opacity 1, no transform, no filter |
| Logo | box | 201.13 × 60 at x 120 | 202 × 60 at x 120 (the SVG's own size; Deviations 8) |
| Logo → headline | gap | 42 | 42 |
| Headline | font | Fira Sans 500 56, line height auto (67.2), white | 500 56px / 67.2px, `rgb(255, 255, 255)`, letter spacing normal |
| Headline | lines | "Connect to the" / "EUDI Wallet" | the same two lines (373.3 / 293.3 px wide) |
| Headline → tagline | gap | 16 | 16 |
| Tagline | font | 400 20/24, white | 400 20px / 24px, white; 346.1 wide (Figma 345: text rendering) |
| Hero | visible span | y 311–587 | y 311.8–588.2 (centred, Decisions 2) |
| Header | content | the language switch only | the spacer and the switch, no Konnekt pill |
| Card | box | 440 wide at 856, 217, 496 high | 856, 217, 440 × 496; 144 from the right; centre 465 |

Other widths (page width), English and German:

| Page width | Chain left | Hero x / card right | Hero ↔ card | Text → chain's first visible pixel | Sideways scroll |
|---|---|---|---|---|---|
| 1440 | 346 | 120 / 144 | 363 | en 63.7, de 99.4 | none |
| 1400, 1280, 1125 | 306 | 120 / 144 | 323, 203, 48 | en 23.7, de 59.4 | none |
| 1124, 1021 | 266 | 80 / 80 | 151, 48 | en 23.7, de 59.4 | none |
| 1020, 768 | hidden | stacked, centred, 440 | — | — | none |
| 320 | hidden | stacked, 16 px sides, card 288 | — | — | none |
| 160 | hidden | stacked; logo 144 × 42.8 (in proportion), headline wraps | — | — | none |

- English "23.7" is measured to the headline's advance box, which "Connect to the" fills to
  373.3 px. The "e" ends a few pixels before its advance, so the ink keeps 24 px.
- Stacked: headline 40/48 and tagline 18/24 (today's sizes). The German headline is 3 lines at
  56 px side by side, 2 lines at 440 and 3 at 320 when stacked.
- Heights: the card's centre is 15 px below the window's at 768, 900 and 1080 (399, 465, 555). At
  460 px the header is not sticky and the chain stays behind the switch (`-z-10`).
- Scrolled: the header area is `rgb(29, 86, 240)`, and transparent again at the top.
- Keyboard: the first Tab lands on the "DE" segment. Its ring at rest is `#0b1220`, 4 px wide,
  2 px off. It reaches 2 px past the pill onto the blue (3.25:1) and lies on the pill otherwise.
- Sign-in with the test account works and leads to the welcome page.

### B2 Status band (`7741:62072`, `7741:62685`, `7741:62796`, `7741:62360`), 1440

| Band | Size | Padding | Picture (in the band) | File |
|---|---|---|---|---|
| active | 832 × 192 (de 216) | 32 200 32 32 | 591, 0, 241 × 320, clipped | `chain-band-active@2x.webp` |
| scheduled | 832 × 216 | 32 200 32 32 | 591, 0, 241 × 320 | `chain-band-scheduled@2x.webp` |
| deactivated | 832 × 192 (de 216) | 32 200 32 32 | 591, 0, 241 × 320 | `chain-band-broken@2x.webp` |
| draft | 832 × 216 (Figma 208: the ⋯ pill, Decisions 4) | 32 200 32 32 | 591, 0, 241 × 320 | `chain-band-draft@2x.webp` |

The smallest distance from a line's end to the chain's first visible pixel in the same rows,
read from the picture's alpha channel:

| | active | scheduled | deactivated | draft |
|---|---|---|---|---|
| English, 832 band | 69.6 | 25.4 | 228.2 | 90.8 |
| German, 832 band | 31.8 | 33.1 | 63.8 | **19.4** |
| English, 736 band (768 window) | 25.6 | 23.5 | — | 22.2 |
| German, 736 band (768 window) | **19.1** | 29.3 | — | 58.3 |

- The German draft sub-line is 19.4 px from the chain. Decisions 5 accepted a shortfall of about
  2 px; it is 4.6. The narrower 736 px bands, which no frame draws, also come under 24 in four
  cells. All of this follows from the decided 200 px padding (see Follow-ups).
- Below a 768 px window the picture is hidden. Nothing scrolls sideways at 1024, 768, 320 or 160.
- The draft's ⋯ ("Draft actions" / "Aktionen für den Entwurf"):
  - It opens with Enter and with a click, and focus goes to its one entry, "Delete draft" /
    "Entwurf löschen".
  - The menu (220 × 58) is on top and not clipped by the band (V6).
  - Choosing the entry opens the delete dialog ("Delete “…”?", "Keep connection" / "Delete
    connection"); "Keep connection" returns the focus to the ⋯.
  - At 160 px the menu fits the window and is on top (W16).

### B3 Welcome card (`7741:61982`, `7741:61974`), 1440

| Element | Property | Figma | Actual |
|---|---|---|---|
| Card | box | 1120 × 296 at x 160, y 152 | 160, 152, 1120 × 296 |
| Card | padding / radius / background | 36 / 48, 12, `#F2F5FB` | 36 301 36 48 (right: the chain's room), 12px, `rgb(242, 245, 251)` |
| Picture | box | 480 × 320 at the top right, cut by the card | 800, 152, 480 × 320, clip layer `overflow: hidden`, radius 12 |
| Column | box | 760 × 224 | 760 × 224 at 208, 188 |
| Gaps | heading → sentence → steps → buttons | 8, 32, 32 | 8, 32, 32 |
| Sentence | lines (en) | 1 | 1, ending 35 px before the chain |

Text → chain at other widths (window):

| | 1440 | 1100 | 1024 | 1000 | 900 | 768 |
|---|---|---|---|---|---|---|
| English | 35 | 24 | 24 | 25 | 76 | 44 |
| German | 31 | 63 | 79 | 55 | 68 | 39 |

At 320 and 160 the picture is hidden and the card has 24 px padding. Nothing scrolls sideways.

### B4 Documents step's empty panel (`7741:62060`), 1440

| Element | Property | Figma | Actual |
|---|---|---|---|
| Folder | size | 162 × 161 | 162 × 161, centred (offset 0) |
| Folder → title, title → sentence | gap | 8, 8 | 8, 8 |
| Title | text | "No documents yet" | the same |
| Sentence | size | 14/24 | 14px / 24px |
| Panel | border, radius, width | 1 dashed `#E1E6F0`, 12, 832 | dashed 1px `rgb(225, 230, 240)`, 12px, 832 |
| Panel | height | 560 | 572: the existing window-height rule from `lg` (`PANEL_HEIGHT_CLASSES`), not part of this record |

At 768, 320 and 160 the folder stays 162 × 161. At 160 its box clips it to 118 px, centred, and
nothing scrolls sideways.

### B5 Not found (`7786:63039`)

| Element | Property | Figma | Actual (1440, `/edit` and `/approvals/…`) |
|---|---|---|---|
| Card | box | 1120 × 296 at y 96 | 160, 96, 1120 × 296 |
| Card | padding, radius | 36 / 48, 12 | 36 355 36 48 (right: the chain's room), 12 |
| Column | box | 560 × 152 at y 72 | 560 × 152 at y 72 |
| Title | style | heading/x-large 32/40 Medium | 32px / 40px 500; the page's only `h1` |
| Gaps | title → sentence → button | 8, 32 | 8, 32 |
| Picture | box | 392 × 296 at the top right | 728, 0, 392 × 296, clipped |

- The details route (`/form-connections/<unknown>`, 832 column) has a 429 px column, as
  proposed.
- German: one-line title, two-line sentence, the card stays 296.
- Text → chain: at least 92 px on every route and width with a picture (1440, 1024, 768).
- At 320 and 160 the picture is hidden. Nothing scrolls sideways.

### Not run

- **Firefox**: Playwright's Firefox isn't installed here, and installing it needs a download.
- **The production image**: the `Content-Type: image/webp` and cache-header check needs the
  nginx image built. Its base image isn't present locally, and pulling it needs the network.
  nginx's stock `mime.types`, which the image's main config includes, maps `webp` to
  `image/webp`. This isn't verified in the built image.
- 200 % zoom as such: the layouts at 640 and 160 CSS px were checked instead.

## Deviations from Assessment

1. **`TopBar` gets a new prop, `brandSurface`, instead of changing `signedOut`.** `signedOut` has a
   second user the assessment didn't list: the "loading your workspace" page after sign-in
   (`pages/FormConnectionList/index.tsx:85`, a white page with the white Konnekt pill). The New
   visuals page doesn't draw it. Dropping the pill there would have changed a screen outside
   this record (its transition belongs to `login-welcome-motion`). `AuthLayout` renders
   `<TopBar brandSurface />`; the loader is unchanged.
2. **`max-w-none!` instead of `max-w-none`.** KERN's unlayered
   `img { max-width: 100%; height: auto }` beats the layered utility. Without the `!`, the
   chain was squeezed to 1440 × 1552, and the folder would shrink in a narrow panel. All five
   pictures with a fixed size use `max-w-none!` and `h-…!`.
3. **The headline may reach 2 px past its column** (`@min-[1021px]:-mr-2`). In Chromium, Fira
   Sans sets "Connect to the" at 373.3 px, not the assessment's 372. In the 373 px column "the"
   wrapped, giving three lines. The hero box stays 373, so no width in B1's table moves. There
   is still no hard break in the copy.
4. **The welcome steps' row threshold is per language** (`WELCOME_STEPS_ROW`; this expands scope
   to `pages/FormConnectionList/constants.ts` and `types.ts`). The German row is 772 px wide. In
   the narrower columns that the 301 px reserve now makes, it ran past its column into the
   chain (−23 px at 1024). In the old layout it ran into the 48 px gap instead. English keeps
   today's 640 px. German sits in a row only at the full 760 px column, where it ends 31 px
   before the chain, and stacks below that.
5. **The test sits at `assets/illustrations.test.ts`**, beside the folder rather than in it. It
   pins the folder's exact contents instead of naming the four deleted files. In the folder,
   spec 008's "assets nobody imports" loop listed it, and naming the files kept the old-name
   grep from being empty. The test adds `/// <reference types="node" />`, because the app's
   tsconfig loads only Vite's types.
6. **The folder has a clip box of its own** (`EmptyPanel`). The panel has a fixed height from
   `lg`, so clipping the panel itself could cut long text. The box cuts only the picture, in
   panels narrower than 162 px (rule 2).
7. **The sign-in chain sits behind everything with `isolate` and `-z-10`**, not just by painting
   order. From 1021 px wide and under 480 px tall the header isn't sticky, so its `z-30` wouldn't
   apply, and the chain would paint over the language switch.
8. **The logo is shown at 202 × 60**, the SVG's own size. Figma's layer is 201.13 × 60; drawing
   the 202-wide file at 201 would scale it.

The assessment's proposals held everywhere else, including the band picture at the box's top
left. It is built as `top-0 right-0` of the band's clip layer, which is the same place because
the box is exactly the picture's width.

## Follow-ups

- **Decisions 5, re-confirm**: the German draft sub-line is 19.4 px from the chain (accepted at
  "about 2 px short", measured 4.6 short). The narrower 736 px bands come to 19.1–23.5 in four
  cells. A right padding of about 205 px would clear the German draft line at 832. The reporter
  decides whether 200 stays.
- `/speckit-bug-test slug=new-visuals`: Firefox, and the built nginx image (`Content-Type:
  image/webp`, `Cache-Control: public, immutable`).
- The follow-up record **`login-welcome-motion`** (the page's note 3, `7760:105888` /
  `7760:105890`).
- The stacked sign-in layout (below 1021 px) hides the chain, but the browser still downloads it
  (1.18 MB), since an `<img>` in a `display: none` box is still fetched. A `<picture>` with a
  width media query, or `loading="lazy"`, would skip it on small screens. This is outside this
  record.
- Left on this machine: the stopped container `new-visuals-postgres-1` and its volume
  `new-visuals_postgres-data`, holding the local test account and the four invented connections.
  Remove them with `docker compose -p new-visuals down -v` when no longer needed.
