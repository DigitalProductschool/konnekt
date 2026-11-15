# Bug Assessment: the overview's description tooltip is cut off by the rows' scroll box

- **Slug**: connection-tooltip-clipped
- **Created**: 2026-11-15
- **Source**: pasted text. It contained no URL, so nothing was fetched.
- **Verdict**: valid. I reproduced it in Chromium 156 against the running dev server (5173),
  with the API mocked, and measured it. A prototype of the preferred fix, applied in the live
  DOM, showed the whole bubble. Screenshots are in this folder (see Reproduction).
- **Severity**: medium
  - The tooltip exists to show a cut description in full (spec 008 FR-051 (35), FR-052; spec
    010 kept it as built). When the list is short, it shows only a strip: 32 of 424 px with one
    row, and 89 of 424 px on the first of two rows. For sighted users, mouse and keyboard
    alike, the full text is then unreadable on the overview.
  - When it opens downwards, it also adds a scrollbar to the rows, although every row fits.
  - A short list is the normal state for a new team, and a description may be up to 500
    characters (`DESCRIPTION_MAX_LENGTH`), about 15 lines in the 280 px bubble.
  - No data is at risk, and there is a workaround: "View" opens the details, which show the full
    description. Screen readers already get the full text, because the `<p>` holds all of it and
    is only cut visually. That is why this is not rated high.
  - I could not date it. `git` does not work in this worktree (its `.git` points to another
    machine's path). From the code, it has existed since the rows started scrolling inside the
    card (U12), with the bubble positioned inside them.

## Report (verbatim or summarized)

> With a small number of connection, if one of them has a very long description, the hover is
> inside the connections frame that is very small and is always cut out. Also you would need to
> scroll but at the same time there are no connection. The over should be on top the connections
> block and expand on the page

In short: on the overview with few connections, the tooltip of a long description stays inside
the list card and is cut off. The list also becomes scrollable although there is nothing to
scroll to. The expected result is a tooltip drawn over the list card that can extend over the
rest of the page.

## Symptom

The tooltip ("bubble") is positioned `absolute` inside the row. The rows' `<ul>` scrolls
(`overflow-y: auto`), and the list card hides its overflow. The `<ul>` is only as tall as its
rows, 80 px per row, so any part of the bubble outside it is cut off. When the bubble opens
downwards, it also enlarges the `<ul>`'s scrollable area, which then shows a scrollbar. When it
opens upwards, the part above the `<ul>` is simply lost.

**Expected**: the whole bubble shows, drawn over the card and the page around it, below the
description where it fits and above it otherwise. The list gets no scrollbar.

Measured at 1280 × 900 with a 620-character description (bubble 280 × 424 px):

| List | Row hovered | Placement chosen | `<ul>` height | `<ul>` scrollHeight while open | Bubble visible | Free window space below the card |
|---|---|---|---|---|---|---|
| 1 connection | 1st (only) | `start`, **up** | 80 | 80 | **32 of 424 px** | 534 px |
| 2 connections | 1st | `start`, down | 161 | **496** (scrollbar) | **89 of 424 px** | 453 px |
| 3 connections | 3rd (last) | `start`, **up** | 242 | 242 | 194 of 424 px | 372 px |

In each case the window had enough room below the card for the whole bubble.

## Reproduction

I set this up without a backend. Playwright (`context.route` on paths starting with `/api/`)
answered with the `{data, message}` envelope:

- `/api/auth/me` returned `{ username: 'tester' }`.
- `/api/form-connections` returned one to three published, `live` connections. One of them has
  a description of 620 characters (two copies of a 310-character sentence about a parking
  permit); the others have "Short one" and "Short too".

No database was used, and nothing was saved.

1. Open `/` at 1280 × 900. With connections listed, the overview shows.
2. Point at the cut description of "Resident parking permit" (or give its name keyboard focus).
3. The bubble opens and is cut off at the rows' edge. With two rows and the first one hovered,
   the rows also get a scrollbar.

Screenshots:

- `assess-1280-two-rows-first.png`: the report's case. Three lines show, the rest is cut off at
  the card's bottom edge.
- `assess-1280-one-row.png`: it opens upwards, and only a 32 px strip shows inside the row.
- `assess-1280-three-rows-last.png`: it opens upwards from the last row and is cut off at the
  top of the rows.
- `assess-1280-prototype-top-layer.png`: the prototype of the preferred fix (see below). The
  whole bubble (424 px) shows over the card and the page, and the rows have no scrollbar.

## Suspected Code Paths

- `frontend/src/pages/FormConnectionList/FormConnectionRow.tsx:150`: the bubble is
  `absolute z-40` inside `RowDescription`'s wrapper (`:143`, `relative` while open beside the
  description). It is therefore a positioned descendant of the rows' scroll box, and `z-40`
  cannot lift it out of a box that clips.
- `frontend/src/pages/FormConnectionList/constants.ts:425`: `ROWS_CLASSES = 'min-h-80
  overflow-y-auto'` on the `<ul>` (`index.tsx:642`). This is the clipping box. With
  `overflow-y: auto`, `overflow-x` computes to `auto` too, so the bubble is cut on every side.
  Its height is the rows' height whenever they fit.
- `frontend/src/pages/FormConnectionList/constants.ts:421`: `LIST_CARD_CLASSES` has
  `overflow-hidden` (`index.tsx:633`). This is a second clipping box around the first. Making
  only the `<ul>` visible would not be enough.
- `frontend/src/pages/FormConnectionList/FormConnectionRow.tsx:69-75`: `placementFrom(...,
  TOOLTIP_HEIGHT)` chooses up or down. `boundsOf()` (`utils/popupPlacement.ts:174`, the loop at
  `:191`) stops at the first ancestor that clips, which is the `<ul>`. So the free space it
  measures is the space inside the rows, not in the window. With one row (80 px), 88 px fits
  neither below nor above, and it takes the larger side, which is up.
- `frontend/src/components/InfoTooltip/constants.ts:34`: `TOOLTIP_HEIGHT = 88`, three lines.
  This is right for the ⓘ tooltips it was made for, but a description of up to 500 characters
  runs to about 15 lines (about 380 px). So even in a long list the direction is chosen for a
  bubble four times smaller than the real one.
- `frontend/src/components/InfoTooltip/constants.ts:62` (`TOOLTIP_PLACEMENTS.button`): the
  class sets. `full` is `inset-x-16` against the nearest positioned box, which for this row is
  the `<li>` (`ROW_CLASSES.row`, `constants.ts:464`, is `relative`), so it is inside the clip
  too.

## Root Cause Hypothesis

The bubble is rendered and positioned inside the rows' scroll box. The overview's rows scroll
inside the list card (U12), so the `<ul>` has `overflow-y: auto` and the card has
`overflow: hidden`. No `z-index` can draw an absolutely positioned descendant outside those
boxes. When the list is short, the scroll box is only as tall as its rows, so a description
bubble taller than the remaining rows is always cut off. When it opens downwards, it also
becomes scrollable overflow, which shows the spurious scrollbar. The direction logic makes it
worse: it measures against the clipping `<ul>`, and it assumes an 88 px bubble. **Confidence:
high.** I measured all of this, and the prototype that takes the bubble out of the clip (the top
layer) fixes all three cases.

## Proposed Remediation

**Preferred: show the bubble in the top layer, anchored to the description with CSS anchor
positioning.**

1. Make the bubble (`FormConnectionRow.tsx:148-153`) a `popover="manual"` element. Show it
   with `showPopover()` and hide it with `hidePopover()` from an effect on `open`, instead of
   toggling `flex` / `hidden`. The top layer is drawn above every box, so the `<ul>` and the
   card no longer clip it. It also no longer counts as the `<ul>`'s overflow, so the
   scrollbar goes away. It is also drawn above the fixed footer bar (`z-15`) and the header,
   which is what the report asks for ("expand on the page").
2. In the DOM, the bubble stays a child of the wrapper. So `onPointerEnter` /
   `onPointerLeave` on the wrapper, the outside-press check (`wrapperRef.current.contains`),
   and Escape work unchanged. I checked this in the prototype: the bubble stays open while the
   pointer moves from the description into it, outside the card, and closes when the pointer
   leaves both (WCAG 1.4.13 "hoverable").
3. Position it with Tailwind's arbitrary properties, not inline styles. The wrapper names the
   anchor (`[anchor-name:--row-description]`). The row scopes the name
   (`[anchor-scope:--row-description]` on the `<li>`), so that two open bubbles (one hovered,
   one with keyboard focus) each find their own row. The bubble uses
   `[position-anchor:--row-description]` with `top-[anchor(bottom)]` and
   `left-[anchor(left)]`, plus `pt-8` for the gap as now. It needs a reset of the UA's popover
   styles (`m-0 border-0 bg-transparent p-0 overflow-visible`, `inset: auto`), and keeps
   `w-280 max-w-[calc(100vw-32px)]`.
4. **Direction**: `[position-try-fallbacks:flip-block]`, so that it opens above when the window
   has no room below. This replaces the guess based on `TOOLTIP_HEIGHT` with the bubble's real
   height. The browser re-evaluates it on scroll and resize.
5. **Side**: keep `placementFrom()` for `start` / `end` / `full`. It measures the window's width
   only, so it remains correct. Map it to class sets for the top layer (`left-[anchor(left)]`,
   `right-[anchor(right)]`, or `inset-x-16` for `full`), in `FormConnectionList/constants.ts`
   or as a new `topLayer` entry beside `TOOLTIP_PLACEMENTS`. Don't pass `TOOLTIP_HEIGHT` any
   more, or pass the direction through only as the initial preference. Remove the wrapper's
   `popupWrapperClass()`, which is not needed once the bubble is out of the flow.

The prototype measured for this assessment used the same properties as inline styles to validate
the idea: popover, anchor name, `top: anchor(bottom)`, `left: anchor(left)`, `flip-block`. The fix
must express them as classes (CLAUDE.md "Styling", "Popups").

**Alternatives**:

- *Remove the clipping while the rows fit*: if `ul.scrollHeight <= ul.clientHeight` at open,
  switch the `<ul>` and the card to `overflow-visible` until the bubble closes. This stays inside
  the current popup convention, but it is fragile. The card's rounded corners then need the
  header to round its own top corners. It also does nothing for a long list whose rows scroll:
  there the bubble is still cut at the box's edge, or, opening down, scrolls the box. And it
  flips layout properties while the pointer is over the row. I don't recommend it.
- *Portal to `document.body` with `position: fixed`*: a portal escapes the clip too, but it
  needs the measured coordinates as CSS custom properties, which the "Popups" rule forbids
  ("never with inline coordinates"). It also breaks the hover continuity (2): the bubble is no
  longer inside the wrapper, so leaving the wrapper for the bubble closes it, unless the
  pointer handling is rewritten. This is more code for the same result.
- *Cap the bubble's height (`max-h` with scrolling inside)*: this does not fix the clip on its
  own, and a scrolling tooltip is awkward to read. It may still be useful as a safeguard in a
  very short window (see Risks).

**Files likely to change**:

- `frontend/src/pages/FormConnectionList/FormConnectionRow.tsx` (`RowDescription`: popover,
  show/hide effect, classes; no `TOOLTIP_HEIGHT`, no `popupWrapperClass`)
- `frontend/src/pages/FormConnectionList/constants.ts` (the bubble's top-layer class sets, the
  row's `anchor-scope`), or `frontend/src/components/InfoTooltip/constants.ts` if the class sets
  belong beside `TOOLTIP_PLACEMENTS`
- `frontend/src/pages/FormConnectionList/utils.ts` and `utils.test.ts`, if the mapping from side
  to classes becomes a helper
- `docs/ARCHITECTURE.md` ("Popups", line 273) and `CLAUDE.md` ("Popups", line 123): a popup
  inside a box that scrolls or clips goes into the top layer and is anchored with CSS anchor
  positioning, still with no inline coordinates. This is a new pattern, so both documents
  change (documentation checklist).

**Tests to add or update**:

- Unit (Vitest, `environment: 'node'`, so pure helpers only): if a helper maps the side to the
  top-layer classes, one case per side (`start`, `end`, `full`), and a check that no class set
  contains a pixel coordinate. No component test exists for the row, and the node environment
  cannot run one.
- Browser verification (`/speckit-bug-test`, Playwright, mocked API as above), in Chromium and
  Firefox:
  - 1, 2 and 3 rows: the whole bubble is visible (its rectangle equals what
    `elementFromPoint` hits), and while it is open, `ul.scrollHeight === ul.clientHeight`.
  - Hover continuity: description → bubble outside the card stays open; leaving both closes
    it. Escape closes it, and so does a press elsewhere.
  - Keyboard: Tab to the row's name opens it, Tab away closes it.
  - Touch emulation: a tap opens it, a second tap closes it.
  - A long list (20 rows) whose rows scroll: the bubble opens below, or above near the bottom,
    and stays whole. Scrolling the rows moves it with its description.
  - 320 px width and 1280 × 900 at 200 % zoom: `full` spans the window less 16 px on each side,
    and there is no horizontal scroll.
  - A short description (fits) shows no bubble, as now.

## Risks & Considerations

- **Browser support**: the Popover API, anchor positioning, `position-try-fallbacks` and
  `anchor-scope` are all supported in Chromium 156 and Firefox 159 (checked here with
  `CSS.supports`). Safari / WebKit was not checked, and the repository states no supported
  browser list (see Open Questions). Without anchor positioning, the bubble would show in the
  top layer at the UA's popover position (centred), so it would need a fallback or a
  `@supports` guard.
- **Very short windows**: if neither side of the description has room for the whole bubble
  (for example a 500-character description in a 320 × 360 window at 200 % zoom), `flip-block`
  keeps the first position and the bubble runs past the window's edge. Top-layer fixed elements
  don't scroll with the page. A `max-h-[calc(100dvh-32px)] overflow-y-auto` safeguard, or
  `position-try-order: most-height`, would cover this. Decide in the fix.
- **Top layer and dialogs**: a bubble in the top layer is drawn above everything else in it,
  except what is added later. The row's buttons open modal `<dialog>`s, and a press closes the
  bubble first (`pointerdown` outside), so they should not overlap. With the keyboard, moving
  the focus from the name to "Delete" closes the bubble before Enter opens the dialog. Verify
  both.
- **Convention**: CLAUDE.md and ARCHITECTURE describe popups as `placementFrom()` class sets
  with no inline coordinates. The fix stays within that (classes, `placementFrom()` for the
  side), but it adds a top-layer variant that the documents must name. Other popups are not
  changed.
- **Same pattern elsewhere**: `boundsOf()` already treats a clipping ancestor as an edge for
  menus, such as the test step's panel. Other `InfoTooltip`s inside boxes that scroll could
  have the same clipping. They are out of scope here and were not checked.
- **Accessibility**: the bubble stays `aria-hidden` (the text is in the page). `popover`
  doesn't change that, and `popover="manual"` does not light-dismiss or move focus, so the
  existing open and close rules stay the only ones.

## Open Questions

- [NEEDS CLARIFICATION: Which browsers must the overview support? Safari / iOS in particular,
  for anchor positioning. If an older Safari is in scope, the fix needs a `@supports` fallback
  (for example the current in-card bubble).]
- [NEEDS CLARIFICATION: In a window too short for the whole bubble on either side, should the
  bubble scroll inside a max height, or may it run past the window's edge?]
- Does the Figma frame for the overview's tooltip (U13 7366:55276) show it over the card's edge?
  It has not been checked. The report's expectation ("on top the connections block and expand
  on the page") is taken as the target.
