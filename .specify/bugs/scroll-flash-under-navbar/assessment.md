# Bug Assessment: Scrolled content shows through the header for a moment after a fast scroll from the top

- **Slug**: scroll-flash-under-navbar
- **Created**: 2026-11-18
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

> When we have something to scroll in the page (like a lot of rules or the final summary with
> links, ecc.), if the scroll happens too fast, there is a split second were part of the scrolled
> content is visible in the top part of the page (same higth as the navbar). I feel like this
> happens if the scroll begins from the top. If we are already in the middle of the page it does
> not happen (but not 100% sure). Also this is a split second, if we scroll slow or just wait then
> everything looks normal. Is like the page has a delay to hide things that are scrolling

## Symptom

When a long page (the wizard's rules step, the summary with the links, the overview …) is
scrolled quickly away from its top, the content that scrolls up into the 64px header area (the
strip of the header pills) shows through it for roughly 100 ms, then disappears behind white.
Expected: from the first scrolled frame, nothing that scrolls under the header pills shows
between them.

All three observations in the report match the code and the measurement below:

- **Only from the top**: the header is transparent only while `window.scrollY` is 0. Once the
  page has scrolled, it is already white, so scrolling on from the middle shows nothing.
- **Only when fast**: the header starts turning white when the first scroll event arrives, over
  150 ms. A slow scroll brings content into the strip only after the header is fully white. A
  fast one gets it there while the header is still nearly transparent.
- **"A delay to hide things"**: it is literally a delay: a scroll event, a React render, then a
  150 ms colour transition.

## Reproduction

Reproduced on 2026-11-18 with the Vite dev server (no backend needed) and Playwright (Chrome),
on the sign-in page, which uses the same `TopBar`:

1. Open `/login` in an 800 × 560 window (tall enough that the header is sticky, short enough
   that the page scrolls: `scrollHeight` 816).
2. At `scrollY` 0 the header's background is `rgba(0, 0, 0, 0)` (transparent), with
   `transition: background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1)` (and the other colours).
3. Scroll to 300 at once (`window.scrollTo({ top: 300, behavior: 'instant' })`, which lands at
   256, the end) and read the header's computed background on every animation frame:

   | ms after the scroll | header background (alpha of white) |
   |---|---|
   | 0 (same task) | transparent, no `bg-…` class yet |
   | 2 (first frame) | transparent, no `bg-…` class yet |
   | 6 | class set, alpha 0 (transition starts) |
   | 22 | 0.03 |
   | 39 | 0.18 |
   | 56 | 0.46 |
   | 73 | 0.70 |
   | 89 | 0.84 |
   | 106 | 0.92 |
   | 156 | 1 (white) |

   For the first five frames or so (~70 ms) the content under the header is clearly visible.
   It fades out over the remaining ~80 ms.
4. With the animations slowed 20× (CDP `Animation.setPlaybackRate` 0.05), a screenshot of the
   top 200px shows the login card's top edge and the page's gradient running through the
   header strip between the pills. After the transition, the strip is white and the card is cut
   off at 64px.
5. Scrolling within the page instead (256 → 400 → 120): the header is white on the first frame
   every time, so there is no flash. This confirms the "only from the top" observation.

In the app as reported: open a connection's rules step with many rules (or the summary with the
links, or a long overview list), make sure the page is at the top, then flick the mouse wheel or
trackpad, or press `End` / `Page Down`. Not reproduced on those pages here, because they need the
backend and the database, which aren't running in this environment. They render the same
`TopBar` over the same mechanism, though, so the report's pages are covered.

## Suspected Code Paths

- `frontend/src/components/TopBar/index.tsx:49`: the header's classes. It is
  `transition-colors duration-(--duration-colour)` (150 ms) and gets its white background
  (`bg-kern-layout-background-default`) only when `scrolled` is true. Before that it has no
  background, so whatever scrolls under it (`z-30`, sticky `top-0`) shows between the pills.
- `frontend/src/components/TopBar/index.tsx:156` `useScrolled()`: `scrolled` is React state that
  a passive `scroll` listener updates. The class therefore arrives after the browser has already
  painted the scrolled page: the scroll event fires, React renders and commits, and only then
  does the transition start (a frame or so; the class appeared on the second frame in the
  measurement).
- `frontend/src/index.css:163` `--duration-colour: 150ms`: the length of the fade into white,
  which accounts for most of the visible window.
- `frontend/src/components/AppLayout/index.tsx:21`,
  `frontend/src/components/WizardLayout/index.tsx:131` and
  `frontend/src/pages/FormConnectionList/index.tsx:84`: the signed-in pages (and the homepage
  loader) are white (`bg-kern-layout-background-default`), the same colour the header turns.
  The header's transparency at the top is therefore invisible on them. It only matters when
  something is under it.
- `frontend/src/components/AuthLayout/constants.ts:19` `AUTH_PAGE_BACKGROUND_CLASSES`: the
  signed-out pages' light-blue gradient. This is the one page where the header must be
  transparent at the top (a white band would show over the gradient).
- `frontend/src/components/WizardLayout/constants.ts:22` `STEP_HEADER_CLASSES`: in the wizard,
  the white step header is pinned under the pills (`wizard-pinned:sticky top-64`). Content first
  passes behind it and then reaches the 64px strip, so in the wizard only a scroll longer than
  the step header's height inside the first ~100 ms shows the flash. That fits "if the scroll
  happens too fast".

## Root Cause Hypothesis

The header area is designed to be transparent at the top of the page and to turn white "once the
page scrolls under it" (U03 #39; spec 008 T031, design-notes line 252: "transparent, white …
150 ms `.motion` once `window.scrollY > 0`"). That switch is driven from JavaScript after the
fact. The browser scrolls and paints first. Then the `scroll` event updates React state, React
re-renders, and the white background fades in over 150 ms (`transition-colors`, FR-050's colour
duration). A fast scroll from `scrollY` 0 moves content into the 64px strip within the first
frames, while the header is still transparent or nearly so. A slow scroll, or a scroll that
starts with the header already white, never shows it. The fade-in, meant as polish, is what
turns a one-frame race into a ~100 ms visible window. Confidence: **high** (measured on the real
component; every detail of the report follows from it).

## Proposed Remediation

**Preferred**: in `TopBar`, make the switch to white instant and keep the fade only for the way
back to transparent:

- Put `transition-colors duration-(--duration-colour)` in the not-scrolled class set only, for
  example `scrolled ? 'bg-kern-layout-background-default' : 'transition-colors
  duration-(--duration-colour)'`. A transition uses the after-change style's
  `transition-property`, so going to white has no transition and becomes white in the frame
  the class lands. Going back to transparent at the top still fades over 150 ms. The fade back
  can't reveal anything, because at `scrollY` 0 nothing is under the header strip any more.
- Keep `.motion` (the reduced-motion rule still turns off the remaining fade).

This removes the ~150 ms window on every layout (sign-in, overview, wizard, details) in one
place. At most the frame or so between the browser's scroll and React's commit remains, during
which content has rarely moved far enough to reach the strip. On the overview the page title
starts 32px below the strip. In the wizard it starts below the step header.

Pull the class choice into a small pure helper in `components/TopBar/utils.ts` (for example
`headerBackgroundClasses(scrolled)`), so that it can be unit-tested in the frontend's `node`
Vitest environment. Update the TopBar doc comment (#39) and the spec 008 design-notes row
(line 252: "white … 150 ms `.motion`") to say white comes in at once and fades out over 150 ms.

**Alternatives**:

- **Opaque header on white pages** (no JS lag at all): give `TopBar` a prop (for example
  `transparentAtTop`, true only from `AuthLayout`), and make the header always
  `bg-kern-layout-background-default` on the signed-in layouts and the homepage loader, whose
  pages are the same white. Visually identical at the top, and it closes even the residual frame
  where users scroll most (rules, summary, overview). The sign-in page would still need the
  preferred change. It also turns design-notes 008 line 1342's recorded check ("top:
  transparent") into "white on white". It can be combined with the preferred fix if the
  residual frame is still noticeable.
- **CSS scroll-driven animation** (`animation-timeline: scroll(root)`, `animation-range: 0 1px`,
  background transparent → white): synchronous with the scroll and needs no state. But the
  team's Firefox needs checking for `animation-timeline` support first, it would need the
  JS path as a fallback under `@supports`, and it is more machinery than the bug warrants.

**Files likely to change**:

- `frontend/src/components/TopBar/index.tsx` (the header's classes, the doc comment on #39)
- `frontend/src/components/TopBar/utils.ts` (new: the class helper)
- `frontend/src/components/TopBar/utils.test.ts` (new)
- `specs/008-kern-revamp-redesign/design-notes.md` (the `TopBar` row and the U03 #39 check
  rows, to record the changed motion)

**Tests to add or update**:

- `utils.test.ts`: the scrolled class set has the white background and no `transition-*`
  class. The not-scrolled set has no background and carries
  `transition-colors duration-(--duration-colour)`.
- Playwright check (as the spec 008 notes record their motion checks; the repo has no browser
  test runner): on `/login` at 800 × 560 and on a long signed-in page (the rules step with many
  rules, or the overview), scroll from 0 and sample the header's computed background every
  frame. It must be white on the first frame that has the class, never partly transparent.
  Then scroll back to 0: the 150 ms fade to transparent still runs, and under `reducedMotion:
  'reduce'` it doesn't.

## Risks & Considerations

- **FR-050 / design-notes §4** ask for 150 ms colour changes. Dropping the fade on the way in is
  a deliberate departure for this one change, because the fade itself causes the defect. It
  needs recording in the design notes so that a later Figma audit doesn't "fix" it back.
- The residual lag (scroll event → React commit, about one frame) remains with the preferred
  fix. If it is still visible on very fast flings, take the opaque-header alternative for the
  white pages. Writing the class straight to the header from the listener (a ref, no React
  state) would shave the React render but not the compositor's lead.
- No API, data, security or migration impact. The change is limited to one component's classes.
- The sticky step header and footer (`WizardLayout`) are opaque already and are not affected.

## Open Questions

- [NEEDS CLARIFICATION: which browser and input the reporter used (mouse wheel, trackpad fling,
  keyboard). This doesn't change the cause, but it decides whether the residual frame of the
  preferred fix is enough or the opaque-header alternative is needed too.]
- [NEEDS CLARIFICATION: whether the design (U03 #39) cares about the fade into white at all, or
  only about the end state. If only the end state matters, the preferred fix is uncontroversial.]
