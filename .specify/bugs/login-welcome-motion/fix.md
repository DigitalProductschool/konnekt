# Bug Fix: The motion from sign-in to the welcome page

- **Slug**: login-welcome-motion
- **Fixed**: 2026-11-22
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

A successful sign-in no longer replaces the sign-in page in one step. The same page stays mounted
over its destination and leaves by one of two motions:

- **The full motion** into the welcome card (Figma "New visuals" note 3). The card's clip layer
  is the surface: blue over the window, it shrinks onto the card while it turns to the tint. The
  white chain travels inside it and cross-fades into the card's picture. The sign-in texts fade
  out and the welcome header, title and content fade in, on the confirmed timetable.
- **A 200 ms cross-fade** everywhere else, and under reduced motion.

This is the assessment's preferred remediation (the own overlay, P8), with all eight confirmed
decisions. No dependency was added and nothing is committed: this checkout's `.git` points to
another machine, and git was read only through `GIT_DIR`.

## Changes

All paths are under `frontend/src/` unless they start elsewhere.

| File | Change | Notes |
|---|---|---|
| `components/SignInMotion/index.tsx` | added | `SignInMotionProvider`. It holds the reducer and reads the signed-in state in the render that changes it, so the success and a sign-out never wait for an effect. It owns the refs to the chain and the exit layer. |
| `components/SignInMotion/ExitLayer.tsx` | added | `SignInExitLayer`. Two elements that never change: an outer one that takes the pointer (`fixed inset-0 z-50`, `aria-hidden`) and an inner one that is `inert`. At rest both are `contents`. |
| `components/SignInMotion/ChainTravel.tsx` | added | The travelling wrapper with the white chain and a copy of `chain-welcome-card`; transform and opacities on the wrappers only. |
| `components/SignInMotion/constants.ts`, `types.ts`, `utils.ts` | added | Class sets, durations, `CHAIN_END` (112.09 / 148.67 / 593.75), property names. Pure: `signInMotionReducer`, `motionKindOf`, `boxIn`, `surfaceInsetsOf`, `chainTravelOf`, `motionPropertiesOf`. |
| `components/SignInMotion/utils.test.ts` | added test | 23 cases (below). |
| `hooks/useSignInMotion.ts` | added | The context and the only code that touches the browser for the motion: `matchMedia`, measuring, `style.setProperty`, `scrollTop`, timers, `animationend`, `resize`, `preload`. |
| `App.tsx` | modified | The provider. Two `<Routes>`: the signed-in tree renders `null` for `/login` and `/forgot-password`; the signed-out tree has `location={held ?? location}` and `key={generation}`. |
| `components/RequireSignedOut/index.tsx` | modified | While the page leaves it keeps its children and renders one `Navigate` beside them, in a structure that doesn't remount them. |
| `pages/Login/LoginCard.tsx` | modified | Arms the motion at the submit and disarms it on a failure; also disarms when the card unmounts before the answer. |
| `pages/Login/index.tsx` | modified | No "You're logged out." toast and no tab title while the page leaves. |
| `hooks/useDocumentTitle.ts` | modified (scope expanded) | `null` leaves the title alone (Deviations 5). |
| `components/AuthLayout/index.tsx`, `AuthIntro.tsx`, `types.ts` | modified | Registers the chain's ref. In the full motion: blue → transparent, the chain `invisible`, header and hero fade out, the card slot fades out and drops 12 px. `AuthIntro` takes a `className`. |
| `components/TopBar/index.tsx`, `types.ts` | modified (scope expanded) | Optional `className` on the header, for the fades. |
| `components/PageTitle/index.tsx`, `types.ts` | modified (scope expanded) | Optional `className` on the title block, for the fade-in. |
| `components/AppLayout/index.tsx`, `types.ts` | modified | `isolate` and the header's fade-in during the full motion. `main` becomes `PageMain`, which decides once at its mount whether to fade in, so there's no `page-in` under the leaving page and no late restart. |
| `pages/FormConnectionList/WelcomePage.tsx` | modified | Card and surface refs. During the full motion the clip layer is the surface, the card's own background and picture wait, and title and content fade in. |
| `pages/FormConnectionList/index.tsx` | modified | `useSignInDestination(view, titleRef)`; the local-drafts offer fades in with the title. |
| `index.css` | modified | `@theme`: `--duration-signin` (800 ms), `--duration-signin-fade` (200 ms), nine `--animate-signin-*` tokens as fractions of the clock, and five `from`-only keyframes. |
| `docs/ARCHITECTURE.md` | modified | Layouts (the second `<Routes>`), a "The sign-in motion" bullet, the visuals' exception. |
| `specs/008-kern-revamp-redesign/design-notes.md` | modified | §4: two rows, the reduced-motion exception, and a note on the motion with the reason against View Transitions. |
| `docs/KERN-DESIGN-SYSTEM.md` | modified | §3.1: the two duration tokens and the `.motion` exception. |
| `CLAUDE.md` | modified | The visuals rule's exception, and one rule for the sign-in motion. |

Files the assessment listed that were not changed:

- `components/AuthLayout/constants.ts` and `pages/FormConnectionList/constants.ts`: the motion's
  class sets live in `components/SignInMotion/constants.ts`, beside each other.
- `main.tsx`: the provider sits inside `App.tsx`.

## Diff Highlights

```tsx
// RequireSignedOut: one Navigate; the children keep their place, so the leaving page is the same page
if (signedIn && exit === null) return <Navigate to={redirectTarget(location.state)} replace />;
return (<>{children}{signedIn && <Navigate to={redirectTarget(location.state)} replace />}</>);
```

```ts
// The surface while the full motion runs: resting style = end state, keyframes `from` only
'pointer-events-none fixed inset-0 -z-10 block overflow-hidden bg-kern-layout-background-hued [clip-path:inset(var(--signin-inset-top)_…_round_var(--kern-metric-border-radius-large))] motion animate-signin-surface'
// @keyframes signin-surface { from { clip-path: inset(0 round 0); background-color: var(--kern-color-action-default) } }
```

```ts
// Every box in the exit layer's coordinates; not the root's clientWidth (Deviations 1)
const layerBox = layer.getBoundingClientRect();
const cardBox = boxIn(card.getBoundingClientRect(), layerBox);
const insets = surfaceInsetsOf(layerBox, cardBox);
const travel = chainTravelOf(boxIn(chainBox, layerBox), cardBox);
```

## Tests Added or Updated

All in `frontend/src/components/SignInMotion/utils.test.ts`, run in Node.

- **`signInMotionReducer`** (10 cases):
  - arms with the page, its destination and its scroll offset;
  - a failure disarms without counting the generation;
  - a success to the homepage holds;
  - a success to a requested route cross-fades at once (P6);
  - `start` runs the given kind, and the hold's end cross-fades (P5);
  - an end, and a sign-out while holding or running, count the generation up, so the kept page is
    dropped;
  - every action that doesn't fit the phase returns the same state, so effects that run twice are
    harmless;
  - it can be armed again after an end.
- **`motionKindOf`** (4 cases): `card` only into the welcome card, with a chain, without reduced
  motion, not scrolled; `fade` for the overview, `other`, reduced motion, no chain, or scrolled.
- **`boxIn`** (1 case): a box in the layer's coordinates.
- **`surfaceInsetsOf`** (4 cases):
  - the frame's 152 / 160 / 452 / 160 at 1440 × 900;
  - the layer, not the root: a 1455 px layer gives 175 on the right;
  - a German card (bottom 428), and a card pushed down to 260;
  - a negative bottom inset where the card reaches under the window.
- **`chainTravelOf`** (3 cases):
  - Figma's end at 1440 × 900: centre 1167.91, 300.67; scale 0.38257; x 45.91, y −284.33;
  - the copy's corners land on the card's picture box (800, 152, 480 × 320) at its natural size;
  - a moved card in a 1280 px window: still tied to the card's top right, and the size never
    follows the card.
- **`motionPropertiesOf`** (1 case): exactly the 15 custom properties, as px, with the scale as
  a number.

## Local Verification

### Commands

- `npm ci --offline` at the root, from the local npm cache (no network). 373 packages: React
  19.2.8, React Router 7.18.4.
- `npm run lint` at the root: passes.
- `npm test` at the root: everything passes.
  - rules: 46 files, 2678 tests;
  - frontend: 49 files, 2041 tests (48 / 2018 in `new-visuals`: +1 file, +23 tests);
  - mcp: 15 files, 513 tests.
- `npm run build` at the root: passes.
  - The built CSS holds the five `@keyframes signin-*`, `--duration-signin`,
    `--duration-signin-fade` and the custom-property classes.
  - The "chunks larger than 500 kB" warning was there before.
- `npm run format:check -w frontend`: passes.
- React Router 7.18.4's `useRoutesImpl` read in `node_modules`: `<Routes location>` gives its
  children the held location through `LocationContext` (the assessment's open point).

### Browser

**Setup.** Chromium through Playwright, against the Vite dev server and a local backend:

- Postgres 18: `docker compose -p login-welcome-motion up postgres`, a container of its own.
- `WORKER_ENABLED=false`, EUDIPLO unset (drafts never call it). Every setting was passed inline;
  no `.env` file was written.
- Two invented accounts, `emptyuser` and `fulluser`. Connections belong to the team, so "empty
  list" and "has connections" were switched with `clear-connections` and the example draft.
- Each run sampled every frame with `requestAnimationFrame`. The page is 1425 px wide in a
  1440 px window, because kern.css reserves the scrollbar gutter. Hence the card at x 152.5, not
  Figma's 160.

**The full motion against the assessment's table.** All values come from the surface's own
animation clock.

| ms | Surface top / side / bottom inset | Colour (table) | Chain centre, size (table) |
|---|---|---|---|
| 0 | `inset(0)` | `rgb(29, 86, 240)` | 1107, 585, 1552 (start: sign-in chain at 331, −191) |
| 200 | 19.6 / 19.7 / 58.4 | `#396bf1` (`#396bf1`) | 1113.9, 548.3, 1428.2 (y 548.3, 1428.2) |
| 400 | 76.0 / 76.2 / 226.0 | `#87a5f5` (`#88a6f6`) | 1133.7, 442.9, 1073 (442.8, 1072.9) |
| 600 | 132.4 / 132.8 / 393.6 | `#d6e0fa` (`#d6e0fa`) | 1153.5, 337.4, 717.6 (337.4, 717.5) |
| 800 | `inset(152px 152.5px 452px round 12px)` | `rgb(242, 245, 251)` | 1160.4, 300.7, 593.7 (card right − 112.09 = 1160.41, 300.67, 593.75) |

**Opacities, from the same runs.**

- The hero and card slot are gone by 240 ms; the slot ends at `translate: 0 12px`.
- The two chain pictures are 0.97 / 0.03 at 250 ms, 0.50 / 0.50 at 400 and 0 / 1 at 567.
- The header and title go 0.07 at 333 ms → 0.38 at 400 → 1.00 at 633.
- The content goes 0.02 at 483 ms → 0.98 at 767.
- The interpolation is sRGB, as the table assumes.

**First and last frame.**

- **After the motion:** the page after the motion and the same page after a reload: **0
  differing pixels** (1440 × 900).
- **Hand-over:** the hold, and every animation paused at T0: 19,203 pixels (1.5 %) differ, at
  most 34 of 255 per channel, in the box 166–1409 × 16–714. That is the size of an
  anti-aliasing change on the text and the chain once they sit on animation layers. A moved
  chain or text would differ by 150+ (white against blue). See Follow-ups.

**Frames frozen at 240, 400 and 640 ms**, viewed and then deleted:

- 240: the sign-in texts are gone and nothing of the welcome page shows yet.
- 400: the welcome header and title are above the half-blue surface (stacking as the frame
  draws it), and the two chain drawings are mid cross-fade.
- 640: the content is fading in above the tinted card.

**Scenarios.** Hold is the time from the success to the motion's start; run is from the start
until the layer is gone (dev build).

| Scenario | Result |
|---|---|
| No memory, list immediate / after 300 ms | Held 124–136 ms / ~490 ms on "Logging in…" over the loading page, then the full motion; run 820–870 ms. |
| Memory "no connections" | No loading page; the motion starts when the welcome page mounts (~80–100 ms after the success: the navigation in the dev build). |
| No memory, list after 3 s (P5) | Held 1024 ms, a 200 ms cross-fade to the loading page; the welcome page arrived later without motion and its `h1` took the focus. |
| List fails (500) | Cross-fade into the overview's error state; "Your connections" focused. |
| 401 on the list during the hold | The kept page was dropped: a fresh `/login` with "Log in" and an empty username field. |
| Overview, memory "has connections" (P6) | Cross-fade (only `signin-out` runs); `h1` focused. |
| Memory "no connections" but the list has a draft | The motion started and ended 55–60 ms later, when the overview came; the overview's `h1` took the focus (Deviations 4). |
| From `/account` (P6) | Cross-fade at the success (hold 0), lands on `/account`, focus as today. |
| `reducedMotion: 'reduce'` | Cross-fade only: `signin-out` on the layer is the one animation; no `page-in`. |
| Wrong password | No layer, the alert as today, the focus on "Log in", path `/login`. |
| Page 1020 / 1021 px | No chain → cross-fade / full motion, end clip `inset(152px 16px 452px)`. |
| 1280 × 720 | Full motion, end clip `inset(152px 80px 272px)`. |
| German | Card 320 high, end clip bottom 428. |
| Sign-in page scrolled by 120 (520 high) | Cross-fade; the layer kept `scrollTop` 120 (no jump). |
| Resize at ~200 ms | The motion ended at once (layer gone at 245 ms), the welcome page at rest. |
| Tab during the motion | From the focused `h1` to "Create connection". |
| Click on "Create connection" at 250 ms | Caught by the layer; no navigation. |
| Log out, then sign in again in the same tab | `/login` with the toast "You're logged out." and a fresh "Log in"; forgot-password and back work; the second sign-in runs the motion again and focuses the `h1`. |

**Frame rate.** Dev build, headless Chromium without a GPU: about 49 fps (longest gap 67 ms);
with the CPU throttled 4×, about 41 fps (longest gap 250 ms, at the start's commit). This isn't
representative of a production build on a real GPU (Follow-ups).

**Console.** Only the expected 401s of `/api/auth/me` while signed out, and the wrong-password
401. One warning, "preloaded but not used", led to Deviations 3. While I was editing, Vite logged
transient hot-reload errors (an import a moment before its export existed); every run reloads
the page first.

### Not run

- **Firefox**: Playwright's Firefox isn't installed; installing it needs a download.
- **A production build in the browser**, and the frame rate on a GPU.
- **The local-drafts offer above the card**: covered by `surfaceInsetsOf`'s "pushed down" case and
  the measuring, not run in the browser.
- **1024 × 768** (1021 and 1020 px pages were run), **200 % zoom**, and a real screen reader.
  The focus moves and `inert` were checked; `aria-hidden` on the layer is set in the code but
  wasn't read back in the browser.
- Whether Firefox and Safari have nested view-transition groups by now (the assessment's open
  note): not looked up.

## Deviations from Assessment

1. **The layer's box is the exit layer's own box, not the root's `clientWidth`.** kern.css sets
   `scrollbar-gutter: stable`, and in Chromium `document.documentElement.clientWidth` then
   reported 1440 while a `fixed inset-0` box is 1425. The first build used `clientWidth`, and the
   end clip was 15 px off on the right. Every box is now taken in the exit layer's coordinates
   (`boxIn`), as the assessment's "the layer's own box" asks.
2. **The motion ends with its own animation, and a timer 50 ms after its duration.** The
   assessment: "by a timer, not only by the animation's end event". A CSS animation starts a
   frame after the commit, so a timer of exactly 800 ms cut its last ~25 ms (0.5 px of clip, 3 px
   of chain). The pointer is held at most 850 ms (200 + 50 for the cross-fade).
3. **The card's picture is requested during the hold over the loading page, not at every
   success.** With the memory "no connections", the welcome page mounts at once and its own
   `<img>` requests the file; with "has connections", a preload went unused (687 KB, and
   Chrome's "preloaded but not used" warning).
4. **The overview's `h1` takes the focus when the wrong memory turns the welcome page into the
   overview.** This goes beyond P7, which didn't name the case: the focused welcome heading
   vanished and the focus fell to the document. It happens once, and only when nothing else has
   the focus.
5. **Scope additions**:
   - `useDocumentTitle` takes `null`, so the kept sign-in page doesn't retitle the tab if the
     language is switched during the motion (its effect would otherwise run after the
     destination's);
   - `className` on `TopBar`, `PageTitle` and `AuthIntro`, to add the fade classes without
     wrapping elements (a wrapper would remount the header, and with it an open account menu);
   - `PageMainProps` in `AppLayout/types.ts`;
   - two components in the new folder (`ExitLayer.tsx`, `ChainTravel.tsx`).
6. **The exit layer is two elements.** An `inert` element lets the pointer through to what lies
   beneath, so `inert` sits on the inner element and the outer one, not inert, catches the
   click.
7. **The welcome texts sit above the surface by stacking, not by positioning them.** The surface
   is `-z-10` inside `AppLayout`'s `isolate` (added only during the motion). Everything on the
   page paints above it, and nothing paints under it but the page's white.
8. **The local-drafts offer above the welcome title fades in with the title.** The frame doesn't
   draw it.

The proposed remediation held everywhere else, including the timetable, P1 (no picture turns),
the 1021 px threshold and the 1000 ms hold.

## Follow-ups

- `/speckit-bug-test slug=login-welcome-motion`: Firefox, a production build (the frame rate on a
  GPU, and how long it takes from the sign-in answer to a usable page), the local-drafts offer,
  1024 × 768, 200 % zoom, and a screen reader.
- **The hand-over's anti-aliasing**: up to 34 / 255 on 1.5 % of the pixels at T0. If it shows
  on a real display, the remedy would be to put the sign-in hero and card on their own layers
  before the success. Not done: invisible in the frozen frames here, and it would change the
  sign-in page at rest.
- **The probe scripts** stay in the git-ignored `.playwright-mcp/` (`probe.js`, `scenarios.js`,
  `frames.js`, `fps.js`, `freeze.js`). They take their options from `page.__probeOptions` /
  `page.__scenarios`. The screenshots were deleted.
- **Left on this machine**: the stopped container `login-welcome-motion-postgres-1` and its
  volume, holding the two invented accounts. Remove them with
  `docker compose -p login-welcome-motion down -v`. `frontend/dist/` (ignored) is from the build
  check.
