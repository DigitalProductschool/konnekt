# Bug Verification: New visuals: eight pictures replace the four illustrations, the sign-in page is rebuilt on a blue surface, the not-found page is redrawn

- **Slug**: new-visuals
- **Tested**: 2026-11-21
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md (committed as `320728d`, "fix(frontend): apply the new visuals (bug
  new-visuals)"; the working tree was clean)
- **Result**: partial

## Summary

The symptom no longer reproduces. All five places in the assessment's reproduction show the
new visuals and layouts, checked in the running app on the production bundle in Chromium and in
Firefox, in English and German, from 1440 down to 160 px. Lint, format, the three test suites
and the build pass. The eight pictures are lossless and identical to their sources. The result
is **partial**, not verified, for two reasons. First, the production nginx image was not checked
(it needs a network pull). Second, the 24 px rule between text and picture is missed in the
status bands by up to 5 px. That happens in more places than `fix.md` reports, English included,
and by more than the ~2 px that Decisions 5 accepted.

The previous illustrations are replaced by the new visuals. No screenshot was saved in this
record or in the repository.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction 1: sign-in and forgot password | Browser on the built bundle, `/login` and `/forgot-password`, page widths 1440, 1400, 1280, 1125, 1124, 1021, 1020, 768, 320 and 160, heights 768, 900 and 1080 (and 600 and 460 for scrolling), en and de | pass | The blue surface, the chain at 346 / −191 (306 from 1125 to 1400, 266 from 1021 to 1124, hidden below 1021), the white logo, the 56 px `h1`, the 20 px tagline, no Konnekt pill, the card 144 from the right and its centre 15 px low. See B1 below |
| Reproduction 2: welcome card | `/` with an empty list served by the browser alone (`page.route`; the database was not changed), windows 1455, 1115, 1039, 1015, 915, 783, 768, 767, 335 and 175, en and de | pass | 1120 × 296 at 160, 152; padding 36/301/36/48; the picture 480 × 320 at the card's top right, clipped; column 760 |
| Reproduction 3: documents step, no document | `/form-connections/new` → "Choose documents", widths 1440, 768, 320 and 160, en and de | pass | The folder at 162 × 161, centred, 8 px to the title; at 160 its own box cuts it to 118 |
| Reproduction 4: status bands | The four local connections (active, scheduled for 01.12.2026, deactivated, the example draft), widths 1440, 1024, 768, 320 and 160 plus a sweep of windows 768–880 in 2 px steps, en and de | pass, rule shortfall | One picture per state at 591, 0, 241 × 320 in its clip layer, padding right 200, hidden below a 768 px window. The 24 px rule is missed in places: see "The 24 px rule in the bands" |
| Reproduction 5: not found | `/form-connections/<unknown>`, `…/edit` and `/approvals/<unknown>`, windows 1455, 1039, 768, 767, 335 and 175, en and de | pass | One card with the title as the only `h1`; 1120 × 296 at y 96 on `/edit` and `/approvals`; on the 832 details column, a 429 px column; the picture 392 × 296 at the top right |
| Draft's ⋯ | Keyboard and pointer, en and de, at 1440 and 160 | pass | "Delete draft" is the menu's one entry and opens the existing dialog; "Keep connection" and Escape return the focus to the ⋯; the menu is on top and not clipped (V6) |
| Keyboard on the blue surface | The first Tab on `/login` | pass | The "DE" segment; ring `#0b1220` 4 px, offset 2, once its 150 ms colour transition has run |
| Not-found title focus | `h1.focus()` on each not-found route | pass | It takes the focus from script with no ring (`tabIndex={-1}`, `outline-none`), as `PageTitle` did. Neither moves the focus on load (the old `NotFound` passed `PageTitle` no ref) |
| Firefox | `playwright-core` 1.64 from the npx cache with the installed Firefox build 1553 (Firefox 156), a script in the session's scratchpad; the sign-in sweep, the bands, the draft's ⋯, not-found, the empty panel, the welcome card | pass | Every number within 3 px of Chromium's. The Playwright MCP Firefox server wants build 1578, which isn't installed |
| Pictures (section A) | Decode each `.webp` with Pillow and compare it with its source (`renders/<name>@2x.png`; the sign-in chain against the recipe's Lanczos resample, white, alpha only) | pass | All eight are VP8L (lossless), alpha identical in every pixel and colour identical in every visible pixel, each ≤ 1,500,000 bytes; `logo-white.svg` byte-identical to its source |
| Fixed size, no CSS effects | Computed styles of every picture and its ancestors, both browsers | pass | Rendered at the `width` and `height` attributes; no filter, opacity, transform, rotate or blend mode; `alt=""` and `aria-hidden="true"` on all eight (the logo has `alt="Konnekt"`, as decided) |
| New / updated tests | `npx vitest run src/assets/illustrations.test.ts src/components/TopBar/utils.test.ts --reporter=verbose` (in `frontend/`) | pass | 2 files, 5 tests |
| Regression suite | `npm test` (root) | pass | rules 46 files / 2678 tests, frontend 48 / 2018, mcp 15 / 513 |
| Lint / format | `npm run lint`, `npm run format:check` (root) | pass | |
| Build | `npm run build` (root) | pass | The eight `.webp` files in `dist/assets/` with hashed names, no `.png`; the chunk-size warning is about the JavaScript and was there before |
| Old names | `grep -rnE "login-art\|wallet-star\|published-art" frontend/ docs/ CLAUDE.md README.md` (without `node_modules` and `dist`) | pass | Nothing |
| Unused assets | Spec 008's loop (design-notes §7) | pass, with a caveat | Prints nothing, but see Residual Risks: it can no longer catch an unused picture |
| Production image | `Content-Type: image/webp` and the cache header from the built nginx image | skipped | `nginx:1.31.9-alpine` isn't present locally and pulling it needs the network. Static check only: `webp` is in the long-cache rule, and the server block doesn't override `types` |
| Backend (Ruff, mypy, pytest) | not applicable | skipped | The fix changes no backend file |
| 200 % zoom | | not-run | The equivalent CSS widths (640 and 160 px) were checked instead |
| Safari / WebKit | | not-run | Not part of the assessment's plan |

The app ran from the production bundle (`vite build` with `VITE_API_URL=http://localhost:3000`
into the scratchpad, served by `vite preview`), not the dev server. That way the built CSS
order, which decides whether `max-w-none!` and `h-…!` beat KERN's unlayered `img` rule, is the
one users get. The backend ran on the stopped `new-visuals-postgres-1` container with the tests'
fake EUDIPLO and a new local account, `bugtest`. The page reserves a 15 px scrollbar gutter in
Chromium, so the window was 15 px wider than each page width. Media-query thresholds (`md`)
were tested at exact window widths.

## Output Excerpts

```
chain-band-active        WEBP RGBA 482x640     558,274 B VP8L=True alpha=True colour=True OK
…
chain-login-white        WEBP RGBA 3104x3104 1,182,646 B VP8L=True alpha=True colour=True OK
ALL OK
```

```
 Test Files  46 passed (46)      Tests  2678 passed (2678)   # rules
 Test Files  48 passed (48)      Tests  2018 passed (2018)   # frontend
 Test Files  15 passed (15)      Tests  513 passed (513)     # mcp
```

### B1 Sign-in, page width 1440 × 900 (Chromium 156; Firefox 156 the same)

| Element | Expected | Measured |
|---|---|---|
| Surface | `#1D56F0` | `rgb(29, 86, 240)` |
| Chain | 1552² at 346, −191 | 346, −191, 1552 × 1552, from a 3104² file |
| Logo, `h1`, tagline | 202 × 60 at x 120; 42 to the `h1`; Fira Sans 500 56/67.2 white, two lines; 16 to the tagline, 400 20/24 white | the same; lines 373.3 and 293.3 wide |
| Header | language switch only | "DE / EN", no Konnekt pill |
| Card | 440 wide, 144 from the right, centre 15 below the window's | the same at heights 768, 900 and 1080 |
| Text → chain | ≥ 24 | en 78.7 at 1440 and 38.7 from 1021 to 1400; de 101.9 and 61.9 |

The text-to-chain distances here are measured as the assessment defines them: to the chain's
first visible pixel in the same rows as the line. `fix.md` gives 15 px less (63.7 at 1440, 23.7
from 1125 to 1400), apparently to the chain's leftmost visible pixel in any row. Both readings
keep the text clear of the chain. The scrolled header is `rgb(29, 86, 240)` and transparent
again at the top. Below 1021 the layout stacks, with no chain, at 40/48 and 18/24. At 160 the
logo is 144 × 42.8. Nothing scrolls sideways at any width.

### The 24 px rule in the bands

At the drawn 832 px band, the measurements equal `fix.md`'s: English 69.6 (active), 25.4
(scheduled), 228.2 (deactivated) and 90.8 (draft); German 31.8, 33.1, 63.8 and **19.4** (draft).

The sweep over every band width from 721 to 832 px (windows 768–880) finds more shortfalls than
`fix.md`'s four cells at 736:

| Smallest distance | active | scheduled | deactivated | draft |
|---|---|---|---|---|
| English | 20.6 (window 778) | 19.8 (804) | 117.2 | 19.2 (780) |
| German | 19.1 (806) | 19.0 (824) | 44.8 | 19.1 (832) |

Under 24 px at 4 (en active) to 10 (de active) of the 57 sampled widths per band; text never
touches the chain (minimum 19.0). It follows from the decided 200 px padding: the chain's
visible pixels begin about 60 px into its 241 px box in some rows, and a line that fills its
column ends 41 px into the box.

## Residual Risks

- **The 24 px rule in the bands** (above): up to 5 px short, in both languages, at the drawn
  832 width (German draft) and at most widths between 721 and 832. Decisions 5 accepted
  "about 2 px" for the German draft line only. `fix.md` asks the reporter to re-confirm; this
  sweep widens what they are asked to accept. About 205 px of padding would clear the German
  draft line at 832 (`fix.md`); the narrower bands would need more, or the text column could
  wrap against the chain's real outline.
- **Production image not checked**: `Content-Type: image/webp` and `Cache-Control: public,
  immutable` are unverified in the built nginx image. Stock nginx's `mime.types` maps `webp`,
  and the template doesn't override `types`.
- **Spec 008's "assets nobody imports" loop no longer catches an unused picture**: it greps
  `frontend/src` for each file name, and `assets/illustrations.test.ts` names every file in the
  folder. Before the fix the loop would have printed `unused: favicon.svg`, which only
  `index.html` references. Each new picture does have a real importer outside the test (checked
  separately), but a future unused one would go unnoticed. Excluding `*.test.ts` from the loop's
  grep would restore it.
- **Not in `fix.md`'s change list**: the commit also sets `check-added-large-files` in
  `.pre-commit-config.yaml` to `--maxkb=1500` (1,536,000 bytes), which the pictures need. The
  binding 1,500,000-byte limit is the new test's.
- `fix.md` says "Nothing is committed"; the fix is in fact committed as `320728d`. This report
  verifies that commit.
- Carried from `fix.md`, not re-checked here: the stacked sign-in layout still downloads the
  1.18 MB chain it hides.
- Not covered: Safari/WebKit, 200 % zoom as such, real EUDIPLO (the bands' states came from the
  fake one, which doesn't affect the pictures).
- Aside, pre-existing and outside this record: in `frontend/nginx.conf`, the static-asset
  `location` has its own `add_header`. By nginx's inheritance rule, the server-level security
  headers (`X-Content-Type-Options`, `X-Frame-Options`, …) are therefore not sent on assets.
  This is unverified in the image.
- Left on this machine: the stopped container `new-visuals-postgres-1` and its volume, now also
  holding the local account `bugtest`. `docker compose -p new-visuals down -v` removes them. The
  Playwright Chromium profile still holds a signed-in session for that account.

## Recommendation

Hold, then close. The symptom is gone end to end in Chromium and Firefox, and nothing
regressed. Two items keep the record open. First, the reporter re-confirms Decisions 5 (the
200 px band padding) against the measured shortfall of up to 5 px, English included, or the
padding changes. Second, the nginx image check runs where the base image can be pulled. Neither
calls for `/speckit-bug-assess` again unless the reporter rejects the shortfall.
