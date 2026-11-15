# Bug Assessment: the details page's sticky footer stops sticking, with blank space under it

- **Slug**: published-sticky-bar
- **Created**: 2026-11-15
- **Source**: pasted text. It contained no URL, so nothing was fetched.
- **Verdict**: valid. I reproduced it in Chromium against the running dev server (5173, the
  `pdf-summary` worktree, whose files involved here are identical to this worktree's), with the
  API mocked, and measured it. A prototype of the preferred fix, applied in the live DOM, removed
  the blank space in every case I measured.
- **Severity**: medium
  - It is on the page every published connection opens on, and on the first view after publishing,
    scheduling or saving an edit. Those arrive with Links open and Summary closed
    (`initialAccordionOf()`), which already triggers it.
  - How much blank space there is depends on the closed cards' content: 376 px with the example
    connection (2 rules per variant), and 1504 px, more than a 900 px window, with 12 rules per
    variant and the Activity open. At the end of the page the window can then be entirely white.
  - The footer's "Edit connection" and "Go to connections" stay reachable by scrolling back up.
    No data is at risk, and the page still works. The damage is to the layout and to trust in the
    page, so this is not rated high.
  - It has existed since the accordion started clipping only while closed (commit `dee8576`, spec
    008 phase 8). The Activity card (`61e498e`, spec 010) added a third body that leaks, and the
    bigger a connection's rules, the bigger the gap.

## Report (verbatim or summarized)

> In the published page, the botton row should always be sticky. But when connection links are
> open or the ectivity is open, when scrolling down, the bar is not sticky anymore and there is a
> lot of why space. THis happens when clicking around with the summary and the links

In short: on a published connection's details page, the footer ("Edit connection", "Go to
connections") should always stay at the bottom of the window. With the Links or the Activity
card open, scrolling down makes the footer scroll up with the page, and blank ("white") space
appears under it. It shows up when switching between the Summary and the Links.

## Symptom

The page can be scrolled further than its content. The document is taller than `<html>` by
roughly the height of the closed cards' hidden content. The footer is `position: sticky;
bottom: 0` inside `<main>` (`FOOTER_CLASSES`), so it only sticks while `<main>`'s end is below the
window. In the extra scroll range, `<main>`'s end and the footer move up, and the blank area under
them is the white page background.

Expected: the page ends where its content ends, and the footer stays at the bottom of the window
whichever card is open.

Measured at the end of the page (scrolled to `scrollHeight`), 1440 × 900 unless noted:

| Connection | Cards | Document `scrollHeight` | `<html>` height | Blank space under footer |
|---|---|---|---|---|
| example (2 rules/variant) | Summary open (arrival from "View") | 1446 | 1446 | 0 |
| example | Links open, Summary closed | 1543 | 1167 | 376 px |
| example | Links open, prototype fix applied | 1167 | 1167 | 0 |
| example, 768 × 800 | Links open after the Activity was loaded | 1623 | 1247 | 376 px |
| example, 768 × 800 | the same, prototype fix applied | 1247 | 1247 | 0 |
| example | Summary open, Activity closed after loading | 1733 | 1446 | (287 px of extra scroll) |
| 12 rules/variant | Summary open (arrival) | 2990 | 2990 | 0 |
| 12 rules/variant | Activity open, Summary closed | 2698 | 1194 | 1504 px |
| 12 rules/variant | Activity open, prototype fix applied | 1194 | 1194 | 0 |

With the small example connection, opening the Activity happens not to leak, because the closed
Summary's hidden content ends above the open Activity card. With a realistic number of rules it
does, as the user reports.

## Reproduction

1. Open a published connection's details with "View" from the overview (Summary open). The
   footer sits at the window's bottom.
2. Click "View links" (the Summary closes). Scroll to the end of the page.
3. The footer has scrolled up with the page and blank space fills the rest of the window
   (`before-links-open-scrolled-to-end.png`).
4. Or: with a connection that has many rules, click "View activity" instead and scroll to the end.
   Depending on the rules' size, the whole window can be blank
   (`before-activity-open-scrolled-to-end.png`, 12 rules per variant).
5. Arriving right after "Publish", "Schedule" or the edit flow's "Save" (Links open, Summary
   closed) shows the same at step 3 without any click. I worked this out from the code
   (`initialAccordionOf()`); in the browser I only reproduced the clicked state, which is the same
   state.

Scripts (gitignored, `.playwright-mcp/`): `assess-sticky-setup.js` (mocked API, example
connection, 45 activity entries), `assess-sticky-setup-many.js` (12 rules per variant),
`assess-sticky-measure.js`, `assess-sticky-activity.js`, `assess-sticky-activity-open.js`. The
screenshots are in this folder. Their result-link boxes are empty because the mock leaves out the
variants' `pull_url`, which has nothing to do with this bug. `prototype-links-open-scrolled-to-end.png`
shows the prototype fix: the footer is at the bottom of the window, with no blank space.

Not checked: Firefox and Safari. The behaviour follows the CSS specification (see the root cause
below), so I expect the same there.

## Suspected Code Paths

- `frontend/src/pages/FormConnectionDetail/DetailAccordion.tsx:105`: the body
  `<div className={`min-h-0 ${clipped ? 'overflow-hidden' : ''}`}>`. It hides its overflow while
  closed, but it is not positioned, so it does not clip its absolutely positioned descendants.
- `frontend/src/components/WizardLayout/index.tsx:155`: the content box
  `relative flex flex-1 flex-col px-16 pb-40` is the nearest positioned ancestor. It is
  `relative` on purpose (popups placed `full` span it), and that makes it the containing block of
  every absolutely positioned element in the cards.
- `frontend/src/components/WizardLayout/constants.ts:33` (`FOOTER_CLASSES`): the footer is sticky
  only within `<main>`, so it stops sticking once the page scrolls past `<main>`'s end. It works
  as intended; the extra scroll range is the problem.
- The leaking elements are the visually hidden texts in the closed cards: Tailwind's `sr-only`
  and KERN's `kern-sr-only` are `position: absolute` (1 × 1 px). In the Summary these are the
  rules' statements and "Identifier" labels (`RulesSummaryContent` and below), plus the variant
  tabs' `role="tablist"` `absolute` div. In the Links they are the ⓘ's `kern-sr-only` labels and
  `CopyableUrl`'s `sr-only` status. In the Activity it is the `sr-only` status `<p>` under the
  400 px list (`ActivityCard.tsx`). With the example connection, the lowest one,
  `<p class="sr-only">Driving licence · Licence class B – Issue date is at least 2 years ago</p>`,
  ends at y = 1543, exactly the document's `scrollHeight`.
- The same accordion is used by `DraftDetails.tsx` (a stored draft's details, same layout and
  footer) and by `pages/Approval/PublishSummary.tsx` (`RulesSummary` with its own open state). Both
  are affected the same way when a card is closed.

## Root Cause Hypothesis

Confidence: high (measured, and confirmed by the prototype).

`overflow: hidden` clips an absolutely positioned descendant only if the clipping element lies on
that descendant's containing-block chain, that is, if the clipping element is positioned or sits
inside the descendant's containing block. The closed card body (`min-h-0 overflow-hidden`, in a
`0fr` grid row) is not positioned. The `sr-only` / `kern-sr-only` texts inside it are
`position: absolute`, and their containing block is `WizardLayout`'s `relative` content box, outside
the card. They escape the clip. Each is laid out at its static position within the card's full,
unclipped content height (668 px for the example's Summary). That position lies below the
collapsed card and, for a long enough body, below the end of the page. Since they belong to the
content box's scrollable overflow, they make the document taller than `<html>`. The footer is
sticky only within `<main>`, so in that extra range it scrolls up with the page and leaves the
white background under it. An open card shows no gap because its hidden texts lie inside its own
visible height. The gap appears for whichever card is closed and has content that reaches below
the page end. With Summary and Links that is the Summary (the "clicking around with the summary
and the links" in the report). With a long rule set it is also the Summary while the Activity is
open, and it is the Activity once its list has loaded and the card is closed again.

## Proposed Remediation

**Preferred**: make the card body the containing block while it clips. In `DetailAccordion.tsx`,
change the body's classes to `min-h-0 ${clipped ? 'relative overflow-hidden' : ''}`, with a comment
saying why: the clip has to be the containing block of the positioned texts inside it (`sr-only`,
`kern-sr-only`, the tab list), or they extend the page below the sticky footer. Add the same in a
sentence of the component's docstring. Only while clipped, because the body is closed (and
`inert`) or moving then, with no popup open inside it. Once open and settled, the body is neither
clipped nor positioned, as today. A tooltip or the full URL's bubble can still reach past the card
(V6), and a popup placed `full` still spans `WizardLayout`'s content box. `relative` without a
`z-index` creates no stacking context, and the hidden texts keep their static positions, so
nothing moves visually. Prototyped in the live DOM: the document shrank to exactly `<html>`'s height
in all three measured cases.

**Alternatives**:
- `[contain:paint]` instead of `relative` while clipped. It also makes the body the containing
  block (for fixed descendants too) and clips. It works the same, but it is less idiomatic in this
  code base, and `relative` is enough because no fixed element lives in the cards.
- `relative` on the body at all times. Simpler, but a `full` popup inside an open card would then
  span the card's body instead of the page's content box, which changes its width.
- `content-visibility: hidden` (or unmounting) once a card has finished closing. It also removes
  the leak, but it needs a "closed and settled" state and transition handling for the closing
  animation, and unmounting would lose the Summary's selected tab. Too much for the bug.
- Clipping at the page level (`overflow: clip` or `contain: paint` on `WizardLayout`'s content box
  or on `<main>`): rejected. It would cut off the popups that are meant to reach past an open card.

**Files likely to change**:
- `frontend/src/pages/FormConnectionDetail/DetailAccordion.tsx` (the class, the comment, the
  docstring)
- Optionally `frontend/src/pages/FormConnectionDetail/utils.ts` and `utils.test.ts`, if the body's
  classes move into a small pure helper (for example `accordionBodyClassesOf(clipped)`) so that a
  unit test can lock the pairing of `relative` with `overflow-hidden`
- Optionally `docs/KERN-DESIGN-SYSTEM.md`'s gotchas: an `overflow: hidden` box that should hide
  `sr-only` content must be positioned

**Tests to add or update**:
- Frontend tests run in Vitest's `node` environment (`vite.config.ts`), without a DOM, so the
  layout itself can't be unit-tested. If the helper is extracted: a `utils.test.ts` case where
  clipped gives both `relative` and `overflow-hidden`, and open and settled gives neither.
- Browser verification (for `/speckit-bug-test`), Chromium and Firefox, with the scripts above. At
  the end of the page, `document.documentElement.scrollHeight` equals `<html>`'s height and the
  footer's bottom equals `innerHeight`. Check these states: Links open; Activity open, with 12
  rules per variant; Summary open after the Activity was loaded and closed; a window 768 × 800
  wide; a window under 480 px tall, where the footer is not sticky (no extra scroll range either).
  Also check the draft details (Summary and Activity) and the Approval page with its Summary
  closed.
- Regression checks for what the clip was made for: the open Links card's ⓘ tooltip and the full
  URL's bubble still reach past the card. The open/close animation still runs and the closed body
  stays `inert`. The rules' statements are still read by a screen reader when the Summary is open.

## Risks & Considerations

- The change is one class, applied only while the body clips. When open and settled, the body is
  the same as before.
- A popup inside a card that is open while the card closes: not possible today, since a press on
  the toggle closes the tooltips (outside-pointer handling), and the body turns `inert` at once.
- The same pattern (a non-positioned `overflow: hidden` box around `sr-only` text inside a
  positioned page box) may exist elsewhere in the app. I did not audit for it beyond
  `DetailAccordion`, the only grid-rows collapse in `frontend/src`.
- No API, backend, migration, security or logging impact.

## Open Questions

- None blocking. [NEEDS CLARIFICATION: does the user also see it on a stored draft's details or on
  the approval page? The code says yes. It isn't reported, but the fix covers both.]
