# Bug Assessment: The motion from sign-in to the welcome page is not built

- **Slug**: login-welcome-motion
- **Created**: 2026-11-21
- **Source**: pasted text, plus the URL
  `https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V5?node-id=7741-61917&m=dev`
  (host `www.figma.com`, not on the safe list; read with the Figma MCP, through Opus subagents
  only, at the reporter's explicit request, so `confirmed-by-user`). The page's notes are
  addressed to "developers and their AI": they are the design's rules, quoted below as design
  data. Nothing else on the page was instruction-like.
- **Verdict**: valid. The design defines a motion and the code has none: a successful sign-in
  replaces the sign-in page with the next page in one step. Grounded in the code and in Figma;
  not run in a browser (this checkout has no `node_modules`, and no dev server was started).
- **Severity**: low. Frontend only, decorative. No backend, API, stored data or security impact.
  The risk is in the fix, not in the gap: it touches the route guards around sign-in.

Builds on the bug record **`new-visuals`**, which is in the tree (`assessment.md`, `fix.md`,
status "applied": the blue sign-in surface, `chain-login-white@2x.webp`, the welcome card with
`chain-welcome-card@2x.webp`).

Eight points below were proposals for the reporter (P1–P8, collected under Open Questions).
**The reporter confirmed all eight on 2026-11-21**, unchanged. P1 is a finding the report does
not list, and it changes what "98°" means.

## Report (verbatim or summarized)

> Add the motion from sign-in to the welcome page that the Figma page "New visuals" defines.
> It builds on the bug record new-visuals, which must be in the tree; if it is not, stop. […]
> Follow docs/FIGMA-WORKFLOW.md. Look at Figma only through Opus subagents.
>
> The design leaves these open. Propose an answer for each in the assessment and mark it as a
> proposal for me to confirm: [whether the logo flies and the headline drifts; how the fades are
> staggered and when the chain pictures cross-fade; the card's position at other window sizes;
> what happens while the sign-in answer or the welcome page's data is loading; what happens when
> sign-in leads to another page; where the focus is afterwards and what a screen reader hears].
>
> Rules for this record: No new dependency. Compare the browser's View Transitions with an own
> overlay and recommend one; say what happens in a browser without support. Tailwind classes
> only; a measured value may be a CSS custom property. No CSS filter or rotation on a picture
> except the chain's travel itself. Reduced motion gets the 200 ms cross-fade. Sign-in must not
> become slower to use: the page is usable when the motion ends, and a failed sign-in shows its
> error as it does today. Do not commit.

The design's note, as it stands in the file (`7760:105890`; its title is the text `7760:105889`
"3 · Motion: Log in → Welcome", and `7760:105888` is the frame around both):

> Trigger: Log in succeeds. Figma: Smart animate, 800 ms, ease-in-out.
> • The blue full-screen surface shrinks into the Welcome card (to x 160, y 152, 1120 × 296) and
> its colour changes from blue to the card tint.
> • The chain travels with it: from 1552 px, 0° at the top right of Log in to 545 × 594 px, 98°,
> 80 % opacity in the card. It cross-fades from chain-login-white to chain-welcome-card.
> • The login card and headline fade out (the card drops 12 px while fading). The Welcome header,
> title and card content fade in.
> • prefers-reduced-motion: replace with a 200 ms cross-fade.
> • Figma only: Smart animate matches layers by name and parent. Keep "Surface", "Picture ·
> chain" (inside Surface), "Login card", "Hero · headline" and "Konnekt logo" named and nested
> exactly as they are on both frames.

It differs from the report's quote only in typography ("•", "×", "°") and in the fifth bullet,
which the report leaves out.

Three dev annotations speak about the motion:

- Sign-in chain `7756:105819`: "chain-login-white (Image bank). 1552 × 1552 px, 0°, pinned
  top-right (right −458, top −191 at 1440 × 900). Never scale. Smart animate: keep the name
  "Picture · chain" inside "Surface"."
- Welcome surface `7741:61974`: "Surface (Welcome card background). Must sit exactly on the card
  (x 160, y 152, 1120 × card height). It lives outside the card only so Smart animate can morph
  the Log in background into it. **In code, it is simply the card background.**"
- Welcome chain `7741:61975`: "chain-welcome-card (Image bank). Pinned top-right of the card,
  clipped. Never scale with the card. […]"

### The design, read (both frames 1440 × 900; positions in the frame)

**The prototype** (`7741:61938`, the sign-in card's "Log in" button): on click, navigate to
`7741:61973`, `SMART_ANIMATE`, easing preset `EASE_IN_AND_OUT`, duration 0.8 s. The same reaction
is on `7771:69079` (the "empty" state's button). There are no keyframes and no timeline
(`get_motion_context` is empty for the frames, the trigger and the chain). The preset's curve is
not in the file; Figma documents it as `cubic-bezier(0.42, 0, 0.58, 1)`, which is CSS's
`ease-in-out`.

| Layer | Sign-in `7741:61919` | Welcome `7741:61973` | Paired by Figma |
|---|---|---|---|
| Surface `7741:61920` → `7741:61974` | 0, 0, 1440 × 900, `#1D56F0` (unbound; the value of `action-default`), radius 0, clips | 160, 152, 1120 × 296, `#F2F5FB` (`layout-background-hued`), radius 12, clips | yes |
| Chain `7756:105819` → `7741:61975`, inside the surface | 346, −191, 1552 × 1552, 0°, opacity 1, image `defd81…` (4000 px), centre 1122, 585 | 544.68 × 593.75, turned 97.85° counter-clockwise (CSS `rotate(-97.85deg)`), opacity 0.8, image `c68f7b…` (1254 px, cropped), centre 1167.91, 300.67; clipped by the surface only | yes; the image differs |
| Sign-in card `7741:61931` → `7741:62025` | 856, 217, opacity 1 | 856, 229, opacity 0 (12 px lower) | yes |
| Headline block `7741:61947` → `7741:62012` | 120, 297, 373 × 290, inside two hero frames (`7741:61945` → `7741:61946`) | 111, 329, 373 × 278, opacity 0, a direct child of the frame | **no**: the parents differ |
| Logo `7741:61960` → `7741:62036` | 120, 311, 201.13 × 60, inside the same two hero frames | 32, 20.2, 130.97 × 39 (×0.65), opacity 0, a direct child of the frame | **no** |
| Header `7741:61943` → `7741:61976` | only the language switch, at x 1332 | the Konnekt pill, the switch at x 1272, the account pill | yes; the switch slides 60 px |
| Body `7741:61978` | — | the title (160, 96, 1120 × 40) and the card's content (column at 208, 188, 760 × 224), above the surface | no counterpart: fades in |

What follows from it:

- **The file breaks its own fifth bullet.** The headline and the logo are nested differently on
  the two frames, so Figma's player does not pair them: both dissolve out where they stand. Their
  Welcome copies are at opacity 0, so even a paired logo would shrink towards the header and end
  invisible. The copy matches neither logo: a 24 px mark in `#F2F5FB` with a dark 25.8 px word,
  against the hero's white 37 px mark and the header pill's blue 24 px mark with a 16 px word.
- **Each frame holds one chain layer, and the two hold different pictures.** There is no hidden
  second chain on either frame. "Cross-fades from chain-login-white to chain-welcome-card" means
  the one paired layer changes its image while it moves. How Figma's player shows that (a
  dissolve or a cut) cannot be read from the file.
- **The welcome chain is exactly the asset.** `asset/chain-welcome-card` (`7760:105848`,
  480 × 320) holds the same layer with the same matrix at (111, 459); in the card it is at
  (751, 459) = 640 + 111. Redrawing the layer from the source picture with that matrix
  reproduces Figma's own 1× export (alpha correlation 0.988), so the numbers above are the
  picture the app already shows, pinned at the card's top right.
- **The chain does not turn on screen (P1).** The white picture is stored upright. The welcome
  source is stored lying on its side, and its layer's 97.85° turn is what stands it upright; that
  turn is baked into `chain-welcome-card`. Measured on the two source files: the white chain at
  0° matches the welcome source turned 96–98° counter-clockwise (correlation of the outlines
  0.76, against −0.05 unturned and 0.38 turned the other way). Both frames show the same pose:
  the upper-left link locked into the lower-right one. A literal tween of the layer's rotation
  therefore lays the white chain on its side while it fades, and brings the blue chain up from
  its side: halfway, two chains cross at about 98°.
- **In Figma every unpaired layer dissolves over the full 800 ms**, above the surface: the white
  headline and the card's dark text would overlap at half opacity (x 208–493, y 311–412).

## Symptom

After a successful sign-in the blue sign-in page is replaced at once: by the white loading page
("Loading your connections…") on a device that has not seen the account before, then by the
welcome page, whose main region fades in over 150 ms. Expected: the 800 ms motion of the design's
note, in which the blue surface shrinks into the welcome card and changes to its tint, the chain
travels into the card and becomes the card's chain, the sign-in card and hero fade out, and the
welcome header, title and card content fade in; with reduced motion, a 200 ms cross-fade.

## Reproduction

Not run (see Verdict); each step follows from the code.

1. Sign out. In a browser profile that never signed in with this account (or after clearing the
   site's storage), open `/login` at 1440 × 900.
2. Sign in with an account that has no connection and no draft.
3. Observed: "Log in" reads "Logging in…"; the blue page is replaced in one step by the white
   loading page with the white Konnekt pill, then by the welcome page (150 ms fade of the main
   region). Nothing moves.
4. Sign out and in again on the same device: the device now remembers that the account has no
   connections, so the welcome page replaces the sign-in page directly. Nothing moves either.

## Suspected Code Paths

All under `frontend/src/`.

- `pages/Login/LoginCard.tsx:39-50` (`handleSubmit`): awaits `signIn()`, shows a failure with
  `dispatch({ type: 'fail' })`. Nothing follows a success, so `submitting` stays true and the
  button keeps "Logging in…" (`:109-115`) until the page unmounts.
- `components/CurrentUserProvider/index.tsx:29-32` (`signIn`): `login()`, then
  `dispatch({ type: 'signedIn' })`. This is the design's trigger, "Log in succeeds".
- `components/RequireSignedOut/index.tsx:20-22`: once signed in, the guard renders
  `<Navigate to={redirectTarget(location.state)} replace />`, which unmounts the sign-in page
  with its route. `utils.ts:10-21` (`redirectTarget`): the route that asked for the sign-in, or
  `/`.
- `App.tsx:69-89`: one `<Routes>`; the signed-out screens and the signed-in ones are sibling
  route groups, so they are never mounted together. `main.tsx:13` uses the declarative
  `BrowserRouter`.
- `pages/FormConnectionList/index.tsx:311-320`: which page `/` shows. With no memory of the
  account on the device (`useRememberedHomepage`, `hooks/useRememberedHomepage.ts:64-79`) it is
  `HomepageLoader` (`:81-92`) until the list has loaded (`:329-347`); with the memory "no
  connections" the welcome page shows at once; with "has connections" the overview and its
  skeleton. `:573-585`: the welcome page inside `AppLayout`.
- `pages/FormConnectionList/WelcomePage.tsx:101-116`: the title (`PageTitle`, focusable from
  script) and the card with its clip layer and the chain. That clip layer is the design's
  "Surface" at rest.
- `components/AuthLayout/index.tsx:25-35`, `constants.ts:41-44`: the blue surface (the root's
  `bg-kern-action-default`) and the white chain in its clip layer; the chain shows from a page
  width of 1021 px. `AuthIntro.tsx`: the hero.
- `components/AppLayout/index.tsx:26-29`: `main` is keyed by the path and carries
  `motion animate-page-in`, the only motion a page change has today.
- `index.css:170-176` (`--duration-*`), `:443-450` (the one `.motion` rule that turns every
  transition and animation off under reduced motion).
- Nothing moves the focus after a sign-in: the focused button goes with its page and the focus
  falls to `<body>`. `titleRef` (`pages/FormConnectionList/index.tsx:268`) is focused only after
  a deletion or a restore.

## Root Cause Hypothesis

The motion was never built: the note is new with the Figma page "⛓️ New visuals" (image bank
dated 21.11.2026), and the record `new-visuals` left it to this one. The structure also has no
place for it yet: the sign-in page and its destination are routes of one `<Routes>`, so the page
that should fade out is unmounted in the commit that mounts the page that should fade in, and
the destination's layout (the card's place) is unknown until then, on a first sign-in not until
the list has loaded. Confidence: high.

## Proposed Remediation

### View Transitions or an own overlay

| | Browser View Transitions | Own overlay (recommended) |
|---|---|---|
| The outgoing page | the browser's snapshot: exact, no second mounted page | the sign-in page stays mounted over its destination for the motion |
| The chain clipped by the shrinking surface | only with nested groups (`view-transition-group`), which Chrome and Edge have from 140 and Firefox and Safari did not have when Chrome documented them (September 2025); elsewhere the chain would hang outside the card in flight | yes: the chain is a child of the clipping layer |
| The chain's own path, the staggered fades | hand-written keyframes on `::view-transition-old/new(...)` in plain CSS, with the measured values on `:root` | keyframes in `@theme`, used as classes, with the measured values on the layer |
| "Tailwind classes only" | not met: the pseudo-elements can only be styled in a stylesheet | met |
| React and the router | React 19.2.8 (locked) has no `<ViewTransition>`; `document.startViewTransition` would be called by hand, and since `BrowserRouter` wraps its updates in `startTransition`, the callback has to wait on a promise that the destination resolves | plain state and effects |
| While the list loads | the page is a frozen picture until the callback's promise settles (Chrome gives up after 4 s) | the sign-in page stays live to look at ("Logging in…"), the destination loads under it |
| Use during the motion | none: the document does not take input | the destination is in the accessibility tree and takes the keyboard from the start |
| Reduced motion | simple: the default root cross-fade at 200 ms | the same layer fades for 200 ms |
| A browser without support | Firefox 114–143 and Safari 16.4–17.x are build targets and have no same-document view transitions (Chrome 111, Safari 18, Firefox 144): there the page would change at once, as today | none among the targets: it needs only `clip-path: inset()`, `transform`, `opacity` and the `inert` attribute (Chrome 102, Firefox 112, Safari 15.5). A timer ends the motion, so a browser that never reports the animation's end is left with the plain page |
| Checking it | pseudo-elements; no `getBoundingClientRect` | ordinary elements: a per-frame probe as `docs/FIGMA-WORKFLOW.md` §4 asks |
| Earlier decision | spec 008 V5 decided against it for the page change (design-notes §4) | in line with it |

The browser versions are from web.dev ("Same-document view transitions are now Baseline Newly
available", 16.10.2025), Chrome's "Nested view transition groups" guide (22.09.2025) and
caniuse; whether Firefox or Safari have nested groups by now was not checked further. That
React's `<ViewTransition>` is stable from 19.3 is a search result, not verified.

**Recommended: the own overlay.** The view transition's one real advantage is the free snapshot
of the outgoing page. Against it stand the chain's clipping outside Chromium, the styling rule,
two build targets without support (the targets are Vite 8's defaults, as the record
`new-visuals` lists them) and a frozen page while the list loads.

### Preferred: the sign-in page stays mounted as an exit layer, and the welcome card's own background plays the surface

No new dependency. Three parts work together. Positions are measured, never assumed.

1. **The exit layer.** The signed-out routes move into a `<Routes>` of their own with a
   `location` that can be held (`<Routes location={exit ?? location}>`, React Router's own means
   of showing an earlier location); the main `<Routes>` renders nothing for `/login` and
   `/forgot-password`. After a successful sign-in the navigation happens as today (same target,
   `replace`), and the sign-in page stays mounted over the destination: `fixed inset-0`, above
   the header, `inert` and `aria-hidden`, taking the pointer. It is the very same page instance,
   so its fields, the browser's autofill colours and the busy button stay as they are; nothing is
   copied or cloned. The motion is **armed at submit** and disarmed by a failure, so that no
   ordering between two state updates is relied on.
2. **The surface.** The annotation says it: in code the surface is the card's background. At
   the motion's start the welcome card's clip layer (`WelcomePage.tsx:104-116`) is `fixed`
   over the window, blue, with the white chain where the sign-in page had it; it shrinks onto
   the card by an animated `clip-path: inset(<top> <right> <bottom> <left> round <radius>)`
   while its colour goes to the tint. Its resting style is the end state, as the `.motion`
   contract asks (design-notes §4). A clip, not a scale: a flat colour looks the same, the
   radius stays 12 px, and the chain inside is neither squeezed nor let out. In the same commit
   the sign-in page's own background turns transparent and its chain is hidden, so the hand-over
   is one frame with identical pixels (the same decoded file at the same place).
3. **The texts.** The sign-in card, hero and language switch fade out in the exit layer. The
   welcome header, title and card content are the real elements and fade in **above** the
   surface, as the frame stacks them (Header and Body lie over Surface).

A provider above the routes holds the state (`useReducer`): `idle → armed → holding → running →
idle`, with the kind `card` (the full motion) or `fade` (the 200 ms cross-fade). The homepage
reports its view to it: `welcome` with the card's element, `overview`, or `loading`.

**Measured at the start, once** (a layout effect; values as CSS custom properties on the layer,
`CLAUDE.md` "Styling"): the layer's own box (the viewport without the scrollbar gutter), the
card's box (`getBoundingClientRect()`), and the white chain's box on the sign-in page. From them:

- the clip's four insets: the card's distances from the layer's edges;
- the chain's travel: the centre from where it is to the card's right edge − 112.09 px and the
  card's top + 148.67 px, and the size from 1552 to 593.75 px (×0.38257): Figma's layer centre
  and the size at which its square picture covers the layer.

At 1440 × 900 these are the frame's numbers: insets 152 / 160 / 452 / 160, centre (1122, 585) →
(1167.91, 300.67).

**The chain (P1, decided).** Both pictures ride in one travelling wrapper: the white picture,
and a copy of `chain-welcome-card` placed so that it lands on the card's own picture at its
natural size when the wrapper arrives. The pictures cross-fade while they travel, so there is
never a second chain at another place. The transform and the opacities sit on wrapper
elements, not on the `<img>`s; at rest no picture carries a transform, a filter or an opacity.
**No picture is rotated at all**: the chain keeps the pose both frames show. At the end the
layer returns to its resting classes and the card's own picture stands where the copy stood.
The white chain's ink then lies 12 px left of and 22 px above the blue chain's (centres
(1167.5, 300.3) and (1179.5, 322.5)); they are two drawings of one motif, not one picture.

**The timetable (P3, decided).** One clock, 800 ms from the start T0.

| What | When | Curve |
|---|---|---|
| Surface: clip from the window to the card, radius 0 → 12 px, colour `action-default` → `layout-background-hued` | 0–800 ms | ease-in-out |
| Chain: centre and size | 0–800 ms | ease-in-out |
| Sign-in card: opacity 1 → 0 and 12 px down; hero (logo, headline, tagline) and the sign-in header's language switch: opacity 1 → 0 | 0–240 ms | ease-out |
| Chain pictures: white 1 → 0, `chain-welcome-card` 0 → 1 (its 80 % is baked in) | 240–560 ms | linear |
| Welcome header (its three pills) and title: opacity 0 → 1 | 320–640 ms | ease-out |
| Card content (heading, sentence, steps, buttons): opacity 0 → 1 | 480–800 ms | ease-out |
| The exit layer is removed and the pointer is free | 800 ms | by a timer, not only by the animation's end event |

Why these times:

- **Nothing of the welcome page shows before the sign-in texts are gone.** The white headline
  and the card's dark text share the same place, which Figma's unstaggered dissolve would show
  on top of each other.
- **The sign-in card and hero are gone before the surface's edge reaches them.** At 240 ms the
  surface is still 1380 × 787 at (30, 28); its bottom edge passes the sign-in card's (y 713) at
  about 360 ms.
- **The pictures cross at 400 ms, when the surface is halfway** (`#88A6F6`). Before that the
  white chain reads on the blue; after it the blue chain reads on the tint, where white would
  be invisible.
- **The title starts at 320 ms**, when the surface under it has lightened to `#648BF4`; it is
  full at 640 ms on `#E1E8FA`.
- **The language switch does not slide** the 60 px it moves in Figma. It fades out with the
  sign-in header and in with the welcome header: "nothing slides" on a page change (U06 #94).

For the check, the surface and the chain at 1440 × 900 (`cubic-bezier(0.42, 0, 0.58, 1)`):

| ms | Surface x, y, w × h | Colour | Chain centre | Chain size |
|---|---|---|---|---|
| 0 | 0, 0, 1440 × 900 | `#1d56f0` | 1122.0, 585.0 | 1552.0 |
| 200 | 20.7, 19.6, 1398.7 × 822.0 | `#396bf1` | 1127.9, 548.3 | 1428.2 |
| 400 | 80.0, 76.0, 1280.0 × 598.0 | `#88a6f6` | 1145.0, 442.8 | 1072.9 |
| 600 | 139.3, 132.4, 1161.3 × 374.0 | `#d6e0fa` | 1162.0, 337.4 | 717.5 |
| 800 | 160.0, 152.0, 1120.0 × 296.0 | `#f2f5fb` | 1167.9, 300.7 | 593.8 |

**The logo and the headline (P2, decided).** Both only fade, with the tagline, in the first
240 ms. The logo does not fly to the header and the headline does not drift.

**Other window sizes (P4, decided).** Nothing is computed from 1440 × 900; the three boxes are
measured, so a taller card (German: 320 px), a card pushed down by the local-drafts offer, any
width and any zoom follow by themselves, and the chain's end is tied to the card's top right
corner as the picture is. The full motion runs where both ends exist as drawn: the sign-in page
shows its chain (page width from 1021 px) and is not scrolled. Otherwise the 200 ms cross-fade
runs: on the stacked sign-in layout below 1021 px, which no frame draws and which has no chain,
and when the sign-in page was scrolled. A window resize during the motion ends it at once.

**While something loads (P5, decided).**

- *The sign-in answer*: nothing changes. The button reads "Logging in…" and takes no second
  submit; a failure shows its alert on the card exactly as today. The motion's trigger is the
  success, so nothing moves before it.
- *The welcome page's data*, after the success:

| The device's memory of the account | Today | With the motion |
|---|---|---|
| "no connections" (`remembered === false`) | the welcome page at once | T0 is the success: the card is laid out in the same commit. The list loads meanwhile |
| none (a first sign-in on the device; blocked storage) | the white loading page until the list arrives, then the welcome page | **the sign-in page holds** as it is, "Logging in…", until the list arrives; then the motion (empty list) or the cross-fade (connections). After **1000 ms** without the list: the cross-fade to the loading page, and what follows appears as today, without the motion |
| "has connections" | the overview with its skeleton | the cross-fade (P6) |

  The hold adds no waiting: the list request starts at the success, as today, and the motion
  starts when it would have been shown. The loading page is skipped when the list is in time.
- *The card's picture* (687 KB) may not be loaded yet. The motion never waits for it: the copy
  is requested at the success and is first visible 240 ms after T0; if it is late, it shows
  when it arrives.
- *The list fails*: the overview's error state appears under the cross-fade.
- *The memory was wrong* (it said "no connections", the list holds some): the welcome page gives
  way to the overview as today, and the motion ends at once with it.

**Another destination (P6, decided).** The motion needs the card. When sign-in leads to the
overview (the account has connections), or back to the route that asked for the sign-in
(`from`: a connection, `/account`, `/authorize`, an approval), the sign-in page fades out over
200 ms above the live destination: the reduced-motion variant, for everyone. For a `from` route
there is no hold: the fade starts at the success.

**Reduced motion.** `prefers-reduced-motion: reduce`, read with `matchMedia` at T0, picks the
kind `fade`: the exit layer's opacity goes 1 → 0 in 200 ms over the destination, which is fully
there. Nothing moves, shrinks or travels. This fade is the one motion that stays on under
reduced motion: FR-050 and F62 turn everything else off, and the design's note and this
record's rule decide the exception. So the fading layer does **not** carry `.motion`, and the
full motion's elements do, so that they can never run under reduced motion.

**Focus and screen readers (P7, decided).**

- The exit layer is `inert` and `aria-hidden` from the success on: nothing in the fading page
  is read or reachable. The pictures stay `alt=""` and `aria-hidden`.
- At T0 the focus goes to the destination's `h1` when that is the homepage: "Welcome to
  Konnekt" / "Willkommen bei Konnekt" (`PageTitle` is focusable from script and shows no ring),
  or "Your connections" on the overview. A screen reader says the heading; the tab title has
  changed already. No live region is added: the heading is the announcement, and a second one
  would speak twice.
- The focus moves at the start, not at the end: the destination is not inert, so keyboard and
  screen-reader users have the page at T0, and the next Tab reaches "Create connection". The
  layer holds only the pointer, for 800 ms (200 ms in the cross-fade).
- During a hold the focus is on the document (the inert page gave it up) and nothing is said;
  if the hold ends in the loading page, its "Loading your connections…" is announced as today,
  and the heading takes the focus when the page arrives.
- A `from` route keeps today's behaviour (the focus on the document); making every page take
  the focus after sign-in is outside this record.

**Not slower.** A failed sign-in never touches the motion. After a success the list request
starts as today; the page is usable by keyboard at T0 and by pointer when the motion ends, 800
ms after T0, which a timer guarantees.

### Alternatives

- **View Transitions**: see the table. Worth another look when `view-transition-group` is in
  Firefox and Safari and React's `<ViewTransition>` is in the locked React.
- **One overlay on top that does everything** (the kept sign-in page shrinks, and the welcome
  page is only uncovered): fewer parts, and `WelcomePage` would only lend its box. But the
  welcome title and header could not fade in above the surface as the frame stacks them: they
  would be wiped in by the shrinking edge (the title only between about 460 and 620 ms).
- **A re-rendered copy of the sign-in card** in place of the kept route: no change to `App.tsx`,
  but the copy loses what the browser put on the real fields (autofill colours, the typed
  values unless the password is handed to a second component), which shows in the first frame.
- **Fading the sign-in card before navigating**: no second mounted page, but the surface could
  not move during the first 240 ms, against the note's 800 ms for the surface.

### Files likely to change

All under `frontend/src/` unless a path starts elsewhere.

- `components/SignInMotion/` (new): `index.tsx` (the provider), `constants.ts` (class sets, the
  property names, the durations, the chain's end constants), `types.ts`, `utils.ts` (the
  reducer; `motionKindOf()`; `surfaceInsetsOf()`; `chainTravelOf()`; all pure), `utils.test.ts`
- `hooks/useSignInMotion.ts` (new): the context, `matchMedia`, the measuring and
  `style.setProperty()`; no component touches these browser APIs itself
- `App.tsx`: the signed-out routes in their own `<Routes location>`; nothing for those paths in
  the main one
- `components/RequireSignedOut/index.tsx`: keeps its children while the exit runs; still
  `redirectTarget()` for the one navigation
- `pages/Login/LoginCard.tsx` (arms at submit, disarms on failure), `pages/Login/index.tsx` (no
  "You're logged out." toast in the exit layer)
- `components/AuthLayout/index.tsx`, `constants.ts`: the exit state (fixed, the background and
  chain handed over at T0, the fade classes on hero, card slot and header)
- `pages/FormConnectionList/index.tsx` (reports the view; the heading's focus),
  `WelcomePage.tsx` (the card's ref; its clip layer plays the surface; the fades of title and
  content; the title above the layer), `constants.ts`
- `components/AppLayout/index.tsx`: the header's fade-in on this arrival; no `page-in` fade on
  it
- `index.css`: `@theme` tokens `--duration-signin` (800 ms) and `--duration-signin-fade`
  (200 ms) and the keyframes with their `--animate-*` names
- `docs/ARCHITECTURE.md` ("frontend": the two `<Routes>`, the sign-in motion),
  `specs/008-kern-revamp-redesign/design-notes.md` §4 (the motion's row, the timetable, the
  reduced-motion exception beside FR-050 and F62), `docs/KERN-DESIGN-SYSTEM.md` §3.1 (the new
  tokens), `CLAUDE.md` (one line for the motion, and the visuals' rule: transforms and
  opacities only on the travel's wrappers)

No token of Figma is new: the blue is `action-default`, the tint `layout-background-hued`, the
radius `border-radius-large`. The two durations have no Figma variable; their values are the
note's.

### Tests to add or update

- `components/SignInMotion/utils.test.ts` (Node, as every frontend test):
  - the reducer: armed at submit; a failure disarms; a success holds; `welcome` runs `card`;
    `overview`, a `from` route, reduced motion, a page under 1021 px or a scrolled page run
    `fade`; the hold's 1000 ms ends in `fade`; the end and a sign-out return to `idle`;
  - `surfaceInsetsOf()` and `chainTravelOf()` give the frame's numbers at 1440 × 900 (insets
    152 / 160 / 452 / 160; centre 1167.91, 300.67; scale 0.38257), and follow a moved or taller
    card.
- In the browser (`docs/FIGMA-WORKFLOW.md` §4, Chromium and Firefox, window 1455 × 900 for the
  gutter), with a per-frame probe as spec 008's "Page change" check used:
  - the table above at 0, 200, 400, 600 and 800 ms (the clip's box, the colour, the chain's
    centre and size), ±1 frame; the opacities of the timetable's five groups;
  - the first frame equals the sign-in page and the last equals the welcome page after a
    reload, pixel for pixel;
  - the list delayed by 300 ms (the hold, then the motion), by 3 s (the cross-fade to the
    loading page at 1000 ms) and failing; the memory "no connections" (no hold);
  - an account with connections and a `from` route: the 200 ms cross-fade;
  - `reducedMotion: 'reduce'`: only the 200 ms opacity, nothing else animates;
  - a wrong password: the alert as today, no layer, the fields usable;
  - the focus on the `h1` at T0, Tab reaches "Create connection" during the motion, the exit
    layer `inert` and `aria-hidden`, no click reaches the page before the end;
  - 1280 × 720, 1024 × 768, 1021 and 1020 px wide, German, with the local-drafts offer, a
    scrolled sign-in page, a resize in flight;
  - the time from the sign-in answer to a usable page, with and without the motion; the frame
    rate with the CPU throttled.
- `npm run lint && npm test && npm run build` at the root.

## Risks & Considerations

- **The route guards.** Moving the signed-out routes into their own `<Routes>` touches how
  `/login` mounts, redirects and unmounts. Every exit other than the motion's end (a sign-out,
  a `401` on the list during the hold) must drop the kept page and mount a fresh sign-in page,
  never revive the kept one with its "Logging in…". `RequireSignedOut` must navigate once.
  `<Routes location>` giving its children the held location is React Router's documented
  behaviour; the fix confirms it for 7.18.4 (no `node_modules` here).
- **The password** stays in the kept page's state for up to 1.8 s longer than today (the hold
  and the motion), in an inert layer. It is not copied, stored or logged.
- **The hand-over frame.** The sign-in background turning transparent and the card's layer
  turning blue must land in one commit, or a white frame shows. Both read one state.
- **Stacking.** The fixed layer inside the card must paint under the title and the header and
  over the page's white, and no ancestor may become the containing block of a fixed element (a
  transform, a filter or `@container` on the way up; today there is none).
- **Performance.** An animated clip on a window-sized layer with a 1552 px picture scaling
  inside. The picture is already decoded and only transformed; the clip is a rounded rectangle.
  The fix measures the frame rate, also in Firefox and with the CPU throttled.
- **FR-050 and F62** say reduced motion turns every motion off, and F62 chose "off" over "fades
  only" for the page change. This record keeps one 200 ms fade under reduced motion, by the
  design's note and the reporter's rule; the documents must say so.
- **The visuals' rule** (`CLAUDE.md`: no CSS filter, opacity or rotation on a picture). During
  the travel the two pictures are scaled, moved and cross-faded through their wrappers; at rest
  nothing is on them. With P1 as proposed no picture is rotated even in flight.
- **Figma's file** does not pair the headline and the logo, against its own fifth bullet, and
  its Welcome copies of them match neither logo. If the designer repairs the nesting, the
  prototype will show a moving logo that this record does not build (P2).
- **What cannot be read from Figma**: how the player shows the image change, whether it turns
  the layer about its corner or its centre, and the preset's curve. P1 as proposed needs
  neither of the first two.
- **`/forgot-password`** shares the layout and has no sign-in; it only moves into the new
  `<Routes>`.
- Nothing is committed by this record; it wrote only this file.

## Open Questions

None. The reporter confirmed all eight proposals on 2026-11-21, as they stand:

### Decisions

- **P1. The chain does not turn.** The note says "0° … 98°", and the report allows a rotation
  for the travel. But both frames show the chain upright: the 98° is how the welcome layer
  stands its source up, and it is baked into `chain-welcome-card`. Decided: the chain travels and shrinks in the pose it
  has, and no picture is rotated. The literal reading is the same build with other constants:
  the wrapper turns 97.85° counter-clockwise, the white chain ends on its side as it fades, and
  the blue one rises from its side; halfway the two cross. It would also need a decision the
  file cannot give: the corner or the centre as the pivot.
- **P2. The logo and the headline only fade** (0–240 ms, with the tagline). Figma does not pair
  them, their Welcome copies are invisible, and the header's logo is another drawing in another
  colour. A flying logo would be a further layer that changes size, colour and from outlines to
  text on the way.
- **P3. The timetable**: sign-in texts out in 0–240 ms; the chain pictures cross-fade in
  240–560 ms; the welcome header and title in 320–640 ms; the card content in 480–800 ms; the
  surface and the chain over the whole 800 ms, ease-in-out. The welcome texts fade in above the
  surface, as the frame stacks them. The language switch does not slide.
- **P4. Other window sizes**: every position is measured. The full motion runs from a page
  width of 1021 px with an unscrolled sign-in page; below that, and when scrolled, the 200 ms
  cross-fade. The alternative for narrower pages is a shrinking surface without a chain.
- **P5. Loading**: the sign-in answer as today. Without the device's memory, the sign-in page
  holds until the list arrives, at most 1000 ms; then the cross-fade to the loading page. The
  cap is a judgement; 600 ms would show the loading page sooner on a slow connection, and the
  motion less often.
- **P6. Another destination** (the overview, or the route that asked for the sign-in): the
  200 ms cross-fade for everyone. The alternative is today's cut.
- **P7. Focus and screen reader**: the focus goes to the homepage's `h1` at the motion's start,
  the heading is what a screen reader hears, the destination is usable by keyboard from the
  start and the layer holds only the pointer. The alternative, the page inert until the end,
  makes screen-reader users wait 800 ms for nothing they can see.
- **P8. The approach**: the own overlay with the kept sign-in page and the card's background as
  the surface (above), not View Transitions.
