# Bug Assessment: New visuals: eight pictures replace the four illustrations, the sign-in page is rebuilt on a blue surface, the not-found page is redrawn

- **Slug**: new-visuals
- **Created**: 2026-11-21
- **Source**: pasted text, plus the URL
  `https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V5?node-id=7741-61917&m=dev`
  (host `www.figma.com`, not on the safe list; read with the Figma MCP, through Opus subagents
  only, at the reporter's explicit request, so `confirmed-by-user`). The page's notes are
  addressed to "developers and their AI": they are the design's rules, quoted below as design
  data, as the reporter asked. Nothing else on the page was instruction-like.
- **Verdict**: valid. The code shows the previous illustrations and the previous sign-in and
  not-found layouts in every place the report names. Grounded in the code and in Figma; not
  reproduced in a running app (this checkout has no `node_modules`, and no dev server was
  started).
- **Severity**: low. Frontend only: pictures, layout and one stylesheet-level concern (text on
  the new blue surface). No backend, API, stored data or security impact.

The previous illustrations are replaced by the new visuals. This record covers the eight
pictures (A), the sign-in pages (B1), the status band (B2), the welcome card (B3), the documents
step's empty panel (B4) and the not-found card (B5). The motion from sign-in to the welcome page
(the page's note 3, `7760:105888` / `7760:105890`) is out of scope: it is the follow-up record
**`login-welcome-motion`**.

## Report (verbatim or summarized)

> The designer replaced the app's illustrations, rebuilt the sign-in page and redrew the
> not-found page. Bring the frontend in line with the Figma page "New visuals" […]. Read its
> notes first (7760:105881, 7760:105884, 7760:105887) and its image bank (7760:105837). Follow
> docs/FIGMA-WORKFLOW.md. Look at Figma only through Opus subagents.
>
> The pictures are already downloaded to /home/debian/new-visuals-assets/: renders/<name>@2x.png
> (transparent 2x files with crop, rotation, opacity and colour baked in, rebuilt from the
> originals; use these, unless exports/ exists), renders/<name>@1x.png (Figma's exact 1x
> exports, the reference), <name>.png (the original uploads; only chain-login-white is used as
> it is, 4000 x 4000, shown at 1552 x 1552), logo-white.svg and logo-white-mark.svg. Never use
> CSS filters or rotation on the pictures. Each picture must end up under about 300 KB (spec
> 008, research V3) […]: propose how, and compare the result with the original before deciding.
>
> A first look found the following; verify it, don't trust it: [no token changed; eight pictures
> replace the four; the sign-in surface, hero, logo and chain; the status band's picture box;
> the welcome card's picture box; the folder at 162 x 161; the not-found card with its title
> inside; "y 152" against y 96; stale comments in NotFound].
>
> Rules for this record: when it is fixed, login-art@2x.png, wallet-star@2x.png,
> published-art@2x.png and published-art-grey@2x.png are deleted and nothing imports them. Save
> no screenshot that shows the old pictures, in the record or anywhere in the repository;
> "before" states are described in words. The record says that the previous illustrations are
> replaced by the new visuals and nothing about why. The motion from sign-in to the welcome page
> is out of scope: name it as the follow-up record login-welcome-motion. Do not commit.

During the assessment the reporter added: if the pictures come out too compressed, the size
limit can be raised. Section A first answered this with numbers (lossy files under 300 KB with
no visible loss). The reporter then decided (2026-11-21): **the pictures are stored lossless,
each at most 1.5 MB**; "Delete draft" goes into a ⋯ menu on the draft's date pill, as on the
published pages; and every open question takes this record's recommendation (see Decisions).

The page's rules, from its notes (verbatim, `7760:105884` "1 · Rules for every visual"):

> • Use the exported PNGs from this page (frames named asset/…, export @1x and @2x). Colour,
> opacity, rotation and crop are baked in. Never rebuild them with CSS filters, blend modes or
> rotation.
> • Visuals have a fixed size in px. They never scale with the text, the container or the
> viewport. Only the container clips them (overflow: hidden).
> • Text never overlaps a visual. When text would touch it, the text wraps to a new line. The
> visual stays where it is.
> • Keep at least 24 px between text and a visual.
> • All visuals are decorative: alt="" and aria-hidden="true". Never put information only in a
> picture.
> • New visuals come in at 2× their display size or more (the login chain is 4000 px for 1552 px).

Placement (verbatim, `7760:105887` "2 · Placement per screen"):

> • Status band (Published, View, Draft view, 832 px wide): picture box 241 px wide, pinned
> top-right, full band height, overflow hidden. Image anchored top-left at natural size (asset
> 241 × 320). Band padding right 200 px: text ends 24 px or more before the visible chain and
> wraps there. The band grows with the text; the picture never moves. Active → chain-band-active
> · Draft → chain-band-draft · Scheduled → chain-band-scheduled · Deactivated → chain-band-broken.
> • Welcome card (1120 wide): chain-welcome-card pinned top-right of the card, card clips
> (radius 12). Text column max 760 px.
> • Log in: blue full-screen background. chain-login-white at 1552 px, pinned top-right (right
> −458, top −191 at 1440 × 900). Login card on top, pinned right; headline block pinned left.
> Headline block 120 px from the left, login card 144 px from the right.
> • Documents empty state: folder-empty-documents, 162 × 161, centred above the title.
> • Page not found (error card, same layout as the Welcome card, 1120 × 296): chain-error-broken
> in a picture box 392 × 296, pinned top-right, full card height, overflow hidden. Image at
> natural size. Text column 560 px; text ends 24 px or more before the visible chain.

Note 4 (`7771:78645`) lists the page's screens and ends: "Every old EUDI Wallet star from 🔗 Flow
is replaced here. Flow itself is unchanged."

### The first look, checked

| First-look claim | Result |
|---|---|
| No design token changed | **Holds for the variables**: every colour, radius, shadow, spacing and type variable on the page's frames equals `index.css` (the two known AA overrides aside, design-notes §1.5). **But four raw values are new**: the hero headline is Fira Sans Medium **56 px** (line height auto) and the tagline Regular **20 px**, with no text style; the bands' right padding is **200** and the two cards' vertical padding **36**, unbound. The hero's word "Konnekt" is set in Geist (already open item 15 of spec 008); `logo-white.svg` carries it as outlines, so no font is needed |
| Eight pictures replace the four | **Verified.** Eight asset frames, six source images (active/draft and band-broken/error-broken share a source). No old picture is left on the page |
| Sign-in: solid #1D56F0, white texts, logo 201 × 60, chain 1552² at 346 / −191 | **Verified**, with additions: the fill is not bound to a variable (its value is `action-default`); the header draws **no Konnekt pill** on these frames, only the language switch; the card is **144** from the right (code: 153) and its centre is **15 px below** the window's centre in every state; the headline has a hard line break |
| Status band: box 241 wide, band-high, "anchored top-left" | **Corrected**: the *box* is pinned top-**right** (x 591 of 832); the *image* sits at the box's top-left at natural size (241 × 320), so a band shows the asset's top 192–216 rows. The band's right padding is 200 (code: 215) |
| Welcome card: box 480 × 320 top-right of 1120 × 296, clipped | **Verified**; the card cuts the asset's bottom 24 px. Also: card padding 36 / 48 (code: 48), text block 760 wide (code: 578), card height 296 |
| Empty documents: folder 162 × 161, centred | **Verified.** The asset's caption says 16 px to the title; the frame's auto-layout gap is **8** (as the code has) |
| Not-found: title in the card as h1; card 1120 × 296, padding 36/48; column 560, 8 px; picture box 392 × 296 top right | **Verified**, with one correction: the content is centred in a fixed 296 px card (text block at y 72 = 36 + 36), not padded by 72 |
| "y 152" against y 96 | **Found**: the dev annotation on the frame's "Surface" layer (`7786:63040`) was copied from the Welcome frame ("x 160, y 152"). The card is at y 96, which is where the component's first element lands today |
| NotFound's comments are out of date | **Verified** (list under Suspected Code Paths) |

## Symptom

Six places show the previous illustrations and layouts where the design now draws the new
visuals:

- **Sign-in and forgot-password** (`/login`, `/forgot-password`): a light blue page with a
  gradient, a 331 × 617 picture pinned to the left edge, a dark headline and a muted tagline
  beside it, the white Konnekt pill in the header, the card 153 px from the right edge.
  Expected: a solid `#1D56F0` surface that clips a white 1552 px chain at its top right; the
  white logo with the word, the white headline (56 px) and tagline (20 px) 120 px from the left;
  no Konnekt pill in the header; the card 144 px from the right.
- **Status band** (`/form-connections/:id`, published and draft): one colour or grey picture,
  217 × 129, at the band's bottom right, the same art for active and scheduled, and for
  deactivated and draft. Expected: one picture per state in a 241 px box at the band's top
  right, as high as the band.
- **Welcome card** (`/` without connections): a 200 × 193 picture centred at the card's right,
  the card padded 48 all round, its text at most 578 wide. Expected: the chain in a 480 × 320 box
  at the card's top right, clipped by the card; padding 36 / 48; text up to 760.
- **Documents step, no document**: a 128 × 123 picture above "No documents yet". Expected: the
  folder at 162 × 161.
- **Not found** (an unknown connection or approval): the title as a page heading above a card
  that holds a sentence, the action and the 200 × 193 picture. Expected: one card, 296 high, with
  the title (the page's h1), the sentence and the action in a 560 px column, and the broken chain
  in a 392 × 296 box at its top right.

## Reproduction

Not run (see Verdict); each step follows from the code.

1. Sign out and open `/login`, then "Forgot password?": the previous picture, colours and header
   pill (`AuthLayout`, `AuthIntro`).
2. Sign in with no connection or draft: the welcome card with the previous picture
   (`WelcomePage.tsx`).
3. "Create connection", go to the Documents step without adding a document: the previous
   picture in the dashed panel (`EmptyPanel.tsx`).
4. Open a published connection in each state (active, scheduled, deactivated) and a draft's
   details: the previous band pictures (`StatusBand.tsx`, `STATUS_BAND_TONES`).
5. Open `/form-connections/<unknown id>`, `/form-connections/<unknown id>/edit` or
   `/approvals/<unknown id>`: the previous not-found layout (`NotFound`). An unknown *route*
   redirects to `/` (`App.tsx:87`, spec 008 S22) and never shows this page.

"Before" states are described in words only: no screenshot that shows the previous pictures is
saved, in this record or anywhere in the repository. `/speckit-bug-fix` and `/speckit-bug-test`
keep to that.

## Suspected Code Paths

All under `frontend/src/` unless a path starts elsewhere.

**The files to delete** (`assets/illustrations/`), and their only importers:

- `login-art@2x.png` — `components/AuthLayout/AuthIntro.tsx:1`
- `wallet-star@2x.png` — `pages/FormConnectionList/WelcomePage.tsx:5`,
  `pages/FormConnectionEditor/DocumentsStep/EmptyPanel.tsx:1`, `components/NotFound/index.tsx:3`
- `published-art@2x.png`, `published-art-grey@2x.png` —
  `pages/FormConnectionDetail/constants.ts:8-9`

`logo.svg` (the header's blue mark) and `favicon.svg` stay.

**B1 Sign-in**

- `components/AuthLayout/constants.ts:19-20` (`AUTH_PAGE_BACKGROUND_CLASSES`): the hued page and
  its gradient. `:31-38`: the widths (990 / 1234 / 1374), `pr-153`, the art's slide.
- `components/AuthLayout/AuthIntro.tsx:17-25`: the 331 × 617 picture, the `w-342` text column,
  `text-kern-adaptive-2x-large` (40/48) in `layout-text-default`, the tagline in
  `text-kern-static-large` (18/24) muted.
- `components/AuthLayout/index.tsx:21-27`: the frame; `TopBar signedOut`.
- `components/TopBar/index.tsx:39-59`: the Konnekt pill, white when `signedOut`.
  `components/TopBar/utils.ts` (`headerBackgroundClasses`): the header area turns **white** once
  the page has scrolled, which on the blue surface would be a white bar.
- `pages/Login/index.tsx`, `pages/ForgotPassword/index.tsx`: both render inside `AuthLayout`;
  their cards (`LoginCard.tsx`, `ForgotPasswordCard.tsx`) match the frames and don't change.

**B2 Status band**

- `pages/FormConnectionDetail/StatusBand.tsx:75`: `md:pr-215`. `:77-86`: the clip layer and the
  217 × 129 image at `right-0 bottom-0`. `:113-120`: a draft's `mainAction` ("Delete draft"),
  absolute at `md:top-24 md:right-32`.
- `pages/FormConnectionDetail/constants.ts:490-519` (`STATUS_BAND_TONES`): two pictures for four
  tones. `types.ts:246-247`: `picture`, "at the bottom right, in colour or grey".
- `pages/FormConnectionDetail/DraftDetails.tsx:128-133`: passes "Delete draft" as `mainAction`.

**B3 Welcome card**: `pages/FormConnectionList/WelcomePage.tsx:92` (`p-24 md:p-48`, `gap-48`),
`:94` (`max-w-578`), `:125-128` (the picture in the flex row).

**B4 Documents step**: `pages/FormConnectionEditor/DocumentsStep/EmptyPanel.tsx:17`
(`h-123! w-128 object-cover`), and its comment `:5-9`.

**B5 Not found**

- `components/NotFound/index.tsx:22` (`PageTitle` above the card), `:23-37` (the card, the
  sentence at `max-w-578`, the picture). Its comment `:9-17` is out of date in every clause
  ("as the design's empty state", "the page title as the one heading", "48px padding and gap",
  "the wallet star at 200 × 193"), and so is `constants.ts:3-7` ("The design draws no not-found
  page"; the strings themselves equal the frame's).
- Where it renders: `components/FormConnectionLoadState/index.tsx:83` (in `WizardLayout`: the
  **832** details column for `/form-connections/<id>`, the 1120 column with a footer for
  `/edit`) and `pages/Approval/index.tsx:99-100` (in `AppLayout`, 1120).

**Elsewhere**

- `frontend/nginx.conf:126`: the long-cache rule lists `png|jpg|…|svg`, not `webp`.
- Documents that describe the previous pictures or layouts: `docs/ARCHITECTURE.md:231` ("L1: the
  login art and the card") and `:373-377` (the Konnekt pill on every layout);
  `specs/008-kern-revamp-redesign/design-notes.md:141-144` (the asset table), `:228`
  (`AuthLayout`), `:247` and `:287` (`NotFound`, the "Empty state" pattern), `:1649`, `:1760`,
  `:4622` ("the design draws no not-found page"), `:4681`, `:4717` (F56's placement);
  `specs/008-kern-revamp-redesign/research.md:108-111`, `:423` (V3);
  `specs/008-kern-revamp-redesign/plan.md:164`.

## Root Cause Hypothesis

The Figma page "⛓️ New visuals" (`7741:61917`, image bank dated 21.11.2026) draws these screens
with new pictures and new layouts, and the frontend still implements the frames they replace
(spec 008's U10, U11, U20, U80–U94 and the frameless S22). Nothing is broken in the code: it
matches the earlier frames. Confidence: high. All 34 detail frames, the six sign-in frames, the
welcome, documents and not-found frames were checked node by node; the 1x exports laid over the
frames' screenshots match at offset 0, 0 for every picture.

## Proposed Remediation

**Preferred**: replace the pictures and rebuild the five places as the frames draw them, in the
order A, B4, B2, B3, B5, B1 (smallest first; B1 last because it touches the shared header).
`/speckit-bug-fix` follows `docs/FIGMA-WORKFLOW.md` §3–§4 per node, with the node ids below.

### A. The pictures

Source: `/home/debian/new-visuals-assets/renders/<name>@2x.png` for seven pictures and
`chain-login-white.png` for the sign-in chain. No `exports/` directory exists today; if it
appears before the fix, run the same recipe on the designer's 2x exports instead.

The top-level `<name>.png` files are the raw image fills (their hashes equal Figma's): green
where the design shows grey, opaque, uncropped, unrotated. Figma applies colour (image filters),
opacity, rotation and crop on the layers, so only the `renders/` files carry them. Never use the
raw files, except `chain-login-white.png`, which has none of these. This is also why CSS filters,
blend modes or rotation are not an option.

**Decided (2026-11-21): lossless, each file at most 1.5 MB** (1,500,000 bytes). This replaces
spec 008's "about 300 KB" (research V3) for these pictures. The files are **lossless WebP**:

| Picture | Source | File | Bytes | Against its source |
|---|---|---|---|---|
| chain-band-active | 482 × 640, 786,903 | `chain-band-active@2x.webp` | 558,274 | identical |
| chain-band-scheduled | 482 × 640, 766,405 | `chain-band-scheduled@2x.webp` | 591,640 | identical |
| chain-band-draft | 482 × 640, 790,002 | `chain-band-draft@2x.webp` | 412,154 | identical |
| chain-band-broken | 482 × 640, 496,506 | `chain-band-broken@2x.webp` | 227,452 | identical |
| chain-error-broken | 784 × 592, 651,006 | `chain-error-broken@2x.webp` | 303,894 | identical |
| chain-welcome-card | 960 × 640, 871,471 | `chain-welcome-card@2x.webp` | 687,074 | identical |
| folder-empty-documents | 324 × 322, 187,102 | `folder-empty-documents@2x.webp` | 86,382 | identical |
| chain-login-white | 4000 × 4000, 3,333,021 | `chain-login-white@2x.webp`, 3104 × 3104 | 1,182,646 | resampled to 2× of the drawn 1552 px, then stored without loss |

"Identical" was checked on the decoded files (Pillow 13.0.0): the alpha channel is the same in
every pixel and the colour is the same in every visible pixel. Together 4.05 MB, from 7.9 MB.

- **Why WebP and not PNG**: both are lossless. The same pixels as PNG (oxipng level 6, Zopfli)
  weigh 119–798 KB for the seven renders (3.62 MB against 2.87 MB), and the sign-in chain at
  3104 px is 1,501,204 bytes, over the limit. Every browser the build targets (Vite 8's default:
  Chrome 111, Edge 111, Firefox 114, Safari 16.4) shows lossless WebP with alpha.
- **The sign-in chain is the one file that is resampled**: 4000 → 3104 px (Lanczos), exactly 2×
  of the size it is drawn at, as rule 6 asks ("2× their display size or more"); no lossy codec
  touches it. The untouched 4000 px original as lossless WebP is 1,528,496 bytes (1.46 MiB),
  over 1.5 MB, and decodes to 64 MB in the browser against 38.5 MB. If the original's pixels are
  wanted unchanged, that file is the alternative, with the limit read as 1.5 MiB.
- **The seven renders are rebuilt, not exported**: they differ from Figma's own exports by
  37–45 dB (dot positions by fractions of a pixel). Lossless here means lossless against the
  `renders/` files.
- For the record, the lossy route measured first: 256-colour PNGs of the seven renders are
  51–219 KB at 45–54 dB against their sources (0.5 dB or less against Figma's 1× exports), and
  the sign-in chain as AVIF quality 80 is 236 KB at 56 dB; neither is used.

The recipe (run once, outside the project; no project dependency, as spec 008's T004 did):

```python
# uv run --no-project --with pillow --with numpy python -I recipe.py SRC OUT
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
src, out = sys.argv[1], sys.argv[2]


def store(im, name):
    im.save(f"{out}/{name}@2x.webp", lossless=True, quality=100, method=6)


for name in (
    "chain-band-active",
    "chain-band-scheduled",
    "chain-band-draft",
    "chain-band-broken",
    "chain-error-broken",
    "chain-welcome-card",
    "folder-empty-documents",
):
    store(Image.open(f"{src}/renders/{name}@2x.png").convert("RGBA"), name)
im = (
    Image.open(f"{src}/chain-login-white.png")
    .convert("RGBA")
    .resize((3104, 3104), Image.LANCZOS)
)
a = np.asarray(im).copy()
a[..., :3] = 255  # white everywhere, alpha only
store(Image.fromarray(a, "RGBA"), "chain-login-white")
```

The fix decodes each stored file and compares it with its source as above before it deletes
anything.

Also add `logo-white.svg` (202 × 60, the mark and the outlined word) to
`assets/illustrations/`. `logo-white-mark.svg` is not needed by this record and is not added
(no asset without an importer).

Every picture is an `<img>` with `alt=""` and `aria-hidden="true"`, `width` and `height` set to
its display size, a fixed pixel size in classes (mind KERN's `img { height: auto; max-width:
100% }`: `max-w-none`, and `h-…!` where KERN wins, as `EmptyPanel` does today), and no
transform, filter or opacity class. Only its container clips it.

### B1. Sign-in and forgot-password (`7741:61919`; states `7771:69071`, `69113`, `69166`, `69220`, `69274`)

As drawn at 1440 × 900:

| Element | Figma | Today |
|---|---|---|
| Surface (`7741:61920`) | solid `#1D56F0` (unbound; the value of `action-default`), full window, clips | hued page with a gradient |
| Chain (`7756:105819`) | 1552 × 1552 at left 346 / top −191 (right −458), under everything else | 331 × 617 picture at the left edge |
| Hero (`7741:61945`) | 373 wide, 120 from the left; its visible content spans y 311–587 | text column 342 wide at x 391 |
| Logo (`7741:61960`) | 201 × 60, white mark 36.97 and the word; 42 px above the headline | none (the header pill holds the logo) |
| Headline (`7741:61958`) | Fira Sans Medium 56 px, line height auto (67.2), white (`layout-text-inverse`), two lines | 40/48, `layout-text-default` |
| Tagline (`7741:61959`) | Fira Sans Regular 20/24, white, 16 px under the headline | 18/24, muted |
| Header (`7741:61944`) | only the language switch; no Konnekt pill | white Konnekt pill and the switch |
| Card (`7741:61931`) | 440 wide, 144 from the right; its centre 15 px below the window's centre in every state (217, 161 and 345 for heights 496, 609 and 240) | 153 from the right, centred |
| Card content, alert, forgot-password card, toast | as built | same |

Build: `AuthLayout` becomes the blue surface (`bg-kern-action-default`); the chain sits in a
clip layer of its own (`absolute inset-0 overflow-hidden`, as `StatusBand`'s picture layer, V6)
so that the sticky header keeps working, since `overflow: hidden` on the page's root would
stop it; `AuthIntro` renders the logo (`<img src={logoWhite} alt={APP_NAME}>`: the word is
outlines now, so the image names the product), the `h1` and the tagline in
`text-kern-layout-text-inverse`; `TopBar`'s `signedOut` variant drops the Konnekt pill and, once
the page has scrolled, backs the header area with the surface's blue instead of white.

The hidden "Legal links" layer (`7741:61969`, in the reference frame only) is not built.

**Proposed for what is not drawn** (only 1440 × 900 exists). Widths are the page's width, the
scrollbar gutter excluded, as the layout's container queries count today:

| Page width | Layout |
|---|---|
| from 1400 px | As drawn: hero 120 from the left, card 144 from the right, chain pinned to the top right (right −458, top −191). On wider windows the space between hero and card grows |
| 1125–1399 px | The same margins. The chain stops following the right edge and holds at left 306 px, so that its first visible pixel (x 211 of the 1552 box) stays 24 px right of the hero column (120 + 373 + 24 = 517). The surface clips what leaves the window. One rule: `left: max(100% − 1094px, 306px)` |
| 1021–1124 px | Hero and card 80 px from the edges (80 + 373 + 48 + 440 + 80 = 1021), at least 48 px apart; the chain at left 266 px by the same rule |
| below 1021 px | Stacked as today: logo, headline and tagline above the card, one column of at most 440 px, centred, 16 px side padding. The chain is not shown: it would lie under the white text (rule 3), where white on its brightest dots is 2.0:1. The headline and tagline keep today's sizes there (40/48 and 18/24) |
| below 320 px (`narrow:`, e.g. 320 px at 200 % zoom) | The stacked layout; the logo shrinks to the column's width (`max-w-full`); long words break (the narrow block of `index.css`) |

- **Heights**: the hero is centred in the window, as today (at 900 that is 1 px below the
  frame's fixed y). The card is centred 15 px lower, as every state draws it. Where the content
  is taller than the window the page scrolls and the header stays, on blue.
- **200 % zoom** of a 1280 px window is 640 CSS px: the stacked layout.
- **German** (measured with the repo's Fira Sans): "Mit der EUDI-Wallet verbinden" takes three
  lines at 56 px in the 373 px column (the widest, "EUDI-Wallet", 302 px), the tagline two lines
  at 20 px (334 px). The hero grows from 276 to 368 px and stays centred; its text ends at
  x 454, left of the English headline's 493, so the distance to the chain only grows. Stacked, at
  40 px, the headline takes two lines in 440 px and three in a 320 px window. The English
  headline fills its column to the pixel ("Connect to the", 372 of 373 px): the fix checks that
  it still breaks after "the" in the browser, without a hard break in the copy.
- **Focus ring on blue**: the only focusable elements on the surface are the language switch's
  segments (the card is white). KERN's ring colour `#0b1220` is 3.25:1 on `#1D56F0`, 6.5–9.5:1
  over the chain's dots and 17:1 on the switch's pill: it passes WCAG 1.4.11's 3:1 everywhere.
  A white ring would be 5.8:1 on the blue but 2.0:1 over the chain, so the ring stays as it is.
  White text on `#1D56F0` is 5.77:1 (AA).

### B2. Status band (`7741:62072` active, `7741:62360` draft, `7741:62685` scheduled, `7741:62796` deactivated; all 34 bands agree)

- The picture: a 241 px wide box at the band's top right, as high as the band, clipping; inside
  it the 241 × 320 asset at the top left at natural size. `STATUS_BAND_TONES` gets four pictures:
  active → `chain-band-active`, scheduled → `chain-band-scheduled`, draft → `chain-band-draft`,
  deactivated → `chain-band-broken`. The existing clip layer stays (V6: nothing clips the ⋯
  menu); the image moves from `right-0 bottom-0` to the box's top left.
- The band's right padding: 200 from `md` (today 215), so the text column is 552 px in the 832
  band. Heights follow from the content, as today (192, 208, 216 at 1440).
- Below 768 px the picture is not shown and the padding is today's (unchanged; not drawn).
- Two bands have a fixed text width (501 in `7741:62077`, 497 in `7771:68049`) with nothing
  beside them and identical pixels: leftovers, not built.
- The two draft frames disagree on the icon circle (`#1d56f0` in `7741:62364`, `#0284c7` in
  `7771:68046`); the code's `feedback-info` at its AA value stays (design-notes §1.5).

**"Delete draft"** (F56, built without a frame) is still not drawn. At `md:top-24 md:right-32` it
would now lie on the chain. **Decided (2026-11-21)**: the draft's date pill gets the ⋯ menu the
published pages have, and "Delete draft" is its one entry:

- `DraftDetails.tsx` passes `actions={<ActionMenu label={copy.draftActions} actions={…} />}` to
  `StatusBand`, as `ConnectionDetails.tsx:337` does, with one `MenuAction`: `copy.deleteDraft`,
  `DELETE_ICON`, `danger: true`, opening the existing delete dialog (`openDialog`). The dialog,
  its texts and `delete_draft()` behind it don't change.
- New copy `draftActions`, the ⋯ button's name: "Draft actions" / "Aktionen für den Entwurf"
  (after `connectionActions`, "Connection actions" / "Aktionen für die Anbindung").
- The pill is then the 48 px one with the ⋯ (`DATE_PILL_CLASSES.withActions`), not the 40 px
  one the draft frames draw, so the draft band is 216 high at 1440, not 208. This difference
  from the frames (`7741:62360`, `7771:68042`) is the decision's; the verification table lists
  it as such.
- `mainAction` has no user left: the prop, its markup (`StatusBand.tsx:113-120`) and its type go.
- Focus: choosing the entry gives the focus back to the ⋯ before the dialog opens
  (`ActionMenu`'s `choose`), so "Cancel" returns there; after the deletion the page leaves, as
  today.
- Measured: the German pill with its ⋯ ends at about x 344; the chain begins at x 604 in those
  rows.

Text against the chain, measured for the copy as it is (column 552; the smallest distance from a
line's end to the chain's first visible pixel in the same rows): English active 71 px, scheduled
28, deactivated 222, draft 92; German active 35, scheduled 36, deactivated 59, **draft 22**.
The German draft sub-line is 2 px short of the rule's 24 (Decisions, 5).

### B3. Welcome card (`7741:61982` content, `7741:61974` surface; the same under the dialog in `7771:68915`)

- The picture: `chain-welcome-card`, 480 × 320, at the card's top right in a clip layer with the
  card's radius; the card cuts its bottom 24 px at 296.
- The card: padding 36 top and bottom, 48 left and right; at least 296 high, growing with its
  content. The picture leaves the flex row, so `gap-48` goes.
- The text block: at most 760 px wide (today 578), so the English sentence takes one line.
- Proposed for narrower cards and longer text: from `md` the card reserves the picture's visible
  width plus 24 px at its right (480 − 203 + 24 = 301 px), so the text column is
  `min(760, card − 48 − 301)` and wraps before the chain; at 1120 that is the drawn 760 (the
  chain begins 35 px after it). Below 768 px the picture is not shown and the padding is 24, as
  today. German: the sentence takes two lines at 760 (53 px from the chain) and the card is 320
  high, the asset's height.
- "Start with an example" in the frame stays "Start from an example" (F24).

### B4. Documents step, empty panel (`7741:62060`; the same in A2–A4)

`folder-empty-documents` at 162 × 161 (`h-161! w-162`), in place of the 128 × 123 picture. The
8 px gap, the texts, the dashed border and the radius match and stay. The frame has no panel
padding (its texts don't wrap); the code's `px-24 py-40` stays, so that long German text keeps
its distance from the border.

### B5. Not found (`7786:63039`; card `7786:63047`, surface `7786:63040`)

- No `PageTitle` above the card. The card's first element is the title, the page's one `h1`, in
  the same style as today (heading/x-large, 32/40, `kern-heading-x-large py-0!`), focusable from
  script as `PageTitle`'s is.
- The card: `layout-background-hued`, radius 12, padding 36 / 48, at least 296 high with its
  content centred vertically; no flex gap.
- The column: at most 560 px; title, 8 px, the sentence (16/24, muted), 32 px, the primary
  action with its forward arrow (unchanged).
- The picture: `chain-error-broken`, 392 × 296, in a clip layer at the card's top right.
- The English copy equals the frame's. Both comments (`index.tsx:9-17`, `constants.ts:3-7`) are
  rewritten to cite `7786:63039`.

**Proposed for what is not drawn** (only English at 1440):

- **German**: "Seite nicht gefunden" is 301 px, one line. The sentence takes two lines at 560
  (the column is then 176 high, within the 224 px the card's padding leaves). The card must
  never clip its text: its height is a minimum, not the frame's fixed 296.
- **Narrower cards**: from `md` the card reserves the picture's visible width plus 24 px at its
  right (392 − 61 + 24 = 355 px), so the column is `min(560, card − 48 − 355)`. At 1120 that is
  the drawn 560 (the chain begins 181 px after it). On the details route the page's column is
  **832**, where the drawn 560 column would run 168 px into the picture box: there the column is
  429 px, and the German title (301) and both sentences (two lines) fit.
- **Below 768 px**: the picture is not shown and the padding is 24, as today.
- **Below 320 px**: the title wraps ("Seite nicht / gefunden"), as every heading does there.
- The frame's "y 152" annotation is a copy from the Welcome frame; nothing is built from it. On
  `/form-connections/<id>/edit` the footer's "Home" link stays (not on the frame; out of scope).

### Files likely to change

- `frontend/src/assets/illustrations/`: add the eight `.webp` pictures and `logo-white.svg`;
  delete
  `login-art@2x.png`, `wallet-star@2x.png`, `published-art@2x.png`, `published-art-grey@2x.png`
- `frontend/src/components/AuthLayout/index.tsx`, `AuthIntro.tsx`, `constants.ts`
- `frontend/src/components/TopBar/index.tsx`, `utils.ts` (and `types.ts` if the scrolled
  background takes the variant)
- `frontend/src/pages/FormConnectionDetail/StatusBand.tsx`, `constants.ts` (the four pictures,
  `draftActions` in both languages), `types.ts` (`picture`'s comment, no `mainAction`),
  `DraftDetails.tsx` (the ⋯ menu)
- `frontend/src/pages/FormConnectionList/WelcomePage.tsx`
- `frontend/src/pages/FormConnectionEditor/DocumentsStep/EmptyPanel.tsx`
- `frontend/src/components/NotFound/index.tsx`, `constants.ts`
- `frontend/src/index.css` (`@theme`: the hero's two type sizes)
- `frontend/nginx.conf` (`webp` in the long-cache rule)
- `docs/ARCHITECTURE.md` (L1, the header on signed-out screens, the band, the not-found card),
  `docs/KERN-DESIGN-SYSTEM.md` §3.1 (the two new `@theme` tokens), `CLAUDE.md` (one line: the
  visuals' rules, pointing to ARCHITECTURE)
- `specs/008-kern-revamp-redesign/design-notes.md` (the asset table, the `AuthLayout`,
  `NotFound` and "Empty state" rows, F56's placement: now the draft pill's ⋯), `research.md` (R1
  "Icons and images"; V3: lossless, at most 1.5 MB each), `plan.md:164`: each says that the previous illustrations are replaced by the new visuals
  and points to this record; nothing about why

### Tests to add or update

- A Node test beside the assets (`assets/illustrations/illustrations.test.ts`): every file in
  the folder is at most 1,500,000 bytes; the eight pictures and `logo-white.svg` exist; the four
  deleted names don't.
- No unit test covers these components (the tests run in Node, without a DOM). The check is
  `docs/FIGMA-WORKFLOW.md` §4 per node at 1440 × 900 (window 1455 for the gutter), with the
  numeric table, in English and German; then each proposed layout: sign-in at 1400, 1280, 1125,
  1021, 1020, 768, 320 and 160 px and at 768 and 1080 px height; the band, the welcome card and
  the not-found card at 1440, 1024, 768, 767 and 320; not-found also on the 832 details column;
  Chromium and Firefox. For every text next to a picture: the measured distance to the picture's
  first visible pixel, at least 24 px.
- Keyboard: the focus ring on the language switch over the blue surface; the title of the
  not-found card takes the focus where the page title did.
- `grep -rE "login-art|wallet-star|published-art" frontend/ docs/ CLAUDE.md README.md` finds
  nothing; spec 008's "assets nobody imports" loop (design-notes §7) prints nothing.
- The production image: `Content-Type: image/webp` and the long cache header for the pictures.
- The draft's ⋯: opens with the keyboard and the pointer, "Delete draft" opens the dialog,
  "Cancel" returns the focus to the ⋯, the menu is not clipped by the band (V6), in both
  languages and below 320 px (W16).
- `npm run lint && npm test && npm run build` at the root.

## Risks & Considerations

- **Two type sizes without a KERN name**: 56 px and 20 px exist in KERN only as primitives
  (`--kern-font-size-56`, `--kern-font-size-20`), not in the semantic scale the overlay sets.
  They become `@theme` tokens (Decisions, 1).
- **WebP on the server**: nginx must answer `Content-Type: image/webp`
  (`X-Content-Type-Options: nosniff` is set) and the long-cache rule must name `webp`; the fix
  checks both in the built image.
- **Weight**: a detail page loads one band picture (227–592 KB), the welcome page 687 KB, the
  sign-in page 1.18 MB, each once and then from the cache (hashed file names, one year). The
  pictures are decorative: the pages are complete before they arrive.
- **`overflow: hidden` and the sticky header**: clip the pictures in layers of their own, not on
  the page's root or on a card that holds a menu or a focus ring.
- **The header on blue**: `headerBackgroundClasses()` is shared by every layout; the change must
  touch only the signed-out variant (bug `scroll-flash-under-navbar` fixed its timing).
- **The Konnekt pill leaves the signed-out header**: the product name is then carried by the
  hero's logo image (`alt`), not by text. The tab title still names the product.
- **F56 moves**: "Delete draft" goes from a visible button to an entry of the draft pill's ⋯;
  spec 008's design notes and its verification rows (`:1753`, `:4681`, `:4717`) and
  `figma-audit/report.md`'s F56 row change with it.
- **The 832 details column**: the not-found card is drawn for 1120 only; the layout in B5 is
  what keeps text and picture apart there.
- **The designer's own 2× exports**, if delivered to `exports/`, replace the rebuilt renders
  through the same recipe.
- **Out of scope, seen on the frames**: the wrong-credentials frame marks only the username and
  without a red line (F16 decided both fields); the "Forgot password?" link's box is the full
  row; the hidden legal links; the Welcome frame's invisible sign-in layers (they belong to
  `login-welcome-motion`, whose note asks for a rotating, scaling chain, which rule 1 forbids
  in CSS: that record decides).
- Nothing is committed by this record.

## Open Questions

None. The reporter decided all of them on 2026-11-21:

### Decisions

1. **The hero's type sizes**: the 56 px headline (line height 1.2) and the 20/24 tagline become
   two `@theme` tokens in `index.css` (`CLAUDE.md`, "KERN Revamp"), documented in
   `docs/KERN-DESIGN-SYSTEM.md` §3.1.
2. **The sign-in card's height**: built as drawn, its centre 15 px below the window's centre in
   every state; the hero is centred.
3. **The sign-in layouts that no frame draws**: as B1's table (the chain holds at left 306 px
   from 1125 to 1399 px, 80 px margins from 1021 to 1124 px, stacked without the chain and with
   today's text sizes below 1021 px).
4. **"Delete draft"**: an entry of a ⋯ menu on the draft's date pill, as the published pages
   have it (B2). This replaces the placement this record first proposed (beside the pill) and
   F56's (the band's right end).
5. **The band's right padding**: 200 px, as drawn, for every band. The fix measures the German
   draft sub-line in the browser and records the distance to the chain; the 2 px this record
   estimates it to be short of 24 are accepted.
6. **Below 768 px** the band, the welcome card and the not-found card show no picture, as today.
7. **Folder to title**: 8 px, the frame's gap, not the caption's 16.
8. **The pictures**: lossless WebP, each at most 1.5 MB (section A).
