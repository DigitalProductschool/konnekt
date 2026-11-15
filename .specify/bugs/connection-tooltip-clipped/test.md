# Bug Verification: the overview's description tooltip is cut off by the rows' scroll box

- **Slug**: connection-tooltip-clipped
- **Tested**: 2026-11-15
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md (commit `e81373f`, working tree clean)
- **Result**: partial

## Summary

The reported bug is fixed. In Chromium 156 and Firefox 159 the whole bubble now shows, drawn over
the card and the page, with 1, 2 and 3 rows and in a scrolling list of 20. The rows no longer get
a scrollbar while it is open. A negative control (the old in-card path, forced) still reproduces
the bug with the same measurement, so the checks do detect it. Lint, all test suites and the build
pass.

The result is **partial**, not verified, because the fix introduced one small defect, in
Firefox only. A bubble opened by keyboard focus stays drawn after the arrow keys scroll its
description out of the rows. It then floats over the page's heading, away from its description.
Chromium hides it. Safari / WebKit was not checked.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), Chromium 156.0.8078.79 and Firefox 159.0 | `.playwright-mcp/verify-layouts.js` (git-ignored): this worktree's dev server on 5181, API mocked by `context.route` as in the assessment, a 500-character description (the real maximum) and also 620 | pass | 1, 2 and 3 rows, 20 rows (long first / last), 320 × 700, 640 × 450: whole bubble (160 of 160 sample points hit it), and `ul.scrollHeight === ul.clientHeight` whenever the rows fit. Same numbers in both browsers |
| Negative control (pre-fix behaviour) | `.playwright-mcp/verify-control.js`: `CSS.supports('anchor-scope', …)` forced to false in an init script, so the row takes the fallback path | pass (bug reproduces there, as expected) | 1 row 16/160 visible, 2 rows 40/160 and `scrollHeight` 448 vs 161 (the spurious scrollbar), 3 rows 80/160. No `popover`, the previous `absolute z-40 …` classes. Confirms that the measurement catches the bug and that the fallback is the old bubble |
| Interactions | `.playwright-mcp/verify-interactions.js`, both browsers | pass | Hover from the description into the part of the bubble below the card (y 714, card ends at 448) keeps it open; leaving both closes it. Escape closes it. Tab onto the name opens it, Tab on to "View" closes it. A press elsewhere closes it. Scrolling the rows by 120 px moves bubble and description by −120 together. Two bubbles at once (hover on row 5, keyboard on row 0) each sit at their own description (`anchor-scope`). The Delete dialog by mouse, keyboard and tap: dialog open, no popover open |
| Touch | same script, a `hasTouch: true` context, `locator.tap()` | pass | Tap opens (below, whole), a second tap closes, a tap elsewhere closes, a tap on Delete closes it and opens the dialog |
| Short description | same as the reproduction | pass | "Short one" hovered: no bubble |
| Description scrolled out of the rows | `.playwright-mcp/verify-detached.js`: 20 rows, keyboard focus on the long row's name, ArrowDown × 12 | **fail in Firefox**, pass in Chromium | The arrow keys scroll the rows while the focus stays on the name. Chromium stops drawing the bubble once its description has left the rows. Firefox keeps it at y −83…293, over the heading and the card's header (`test-firefox-detached-after-arrow-scroll.png`). Setting `position-visibility: anchors-visible` in the live DOM did not change Firefox's behaviour |
| Very short window | 320 × 360 | known limit (fix.md) | The bubble (376 px) is taller than the window and is cut off at the bottom: 48 of 160 points visible in Chromium, 56 in Firefox, the rest off screen |
| Console | Playwright console logs for all runs | pass | No errors or warnings. Only React DevTools notices and Firefox's dev-mode `[TIMESTAMP]` marks |
| New / updated tests | `npx vitest run src/pages/FormConnectionList/utils.test.ts src/utils/popupPlacement.test.ts` (in `frontend/`) | pass | 134 passed, of which 8 are the new `rowBubbleClass` / `supportsAnchoredPopups` cases |
| Regression suite | `npm test` (root) | pass | rules 2675/2675, frontend 1979/1979, mcp 513/513. The rules timing test that flaked during the fix passed this time |
| Lint / format | `npm run lint`, `npm run format:check` (root) | pass | Clean in all four packages |
| Type-check and build | `npm run build` (root) | pass | Only the existing chunk-size warning. The built CSS keeps `@position-try --row-description-top{top:0}`, every anchor property and `:popover-open`, and `.inset-auto` comes before `.inset-x-16` / `.top-[anchor(bottom)]` / `.left-[anchor(left)]` |
| Safari / WebKit | none | not-run | No WebKit build on this machine |
| Backend | none | skipped | The fix touches no backend file |

## Output Excerpts

Report's case (2 rows, the first hovered, 500 characters), Chromium, then Firefox:

```text
popoverAttr: manual, where: below, box: [142,358,422,734], ulClient: 161, ulScroll: 161, hits: 160/160
popoverAttr: manual, where: below, box: [149,358,429,734], ulClient: 161, ulScroll: 161, hits: 160/160
```

The same case on the forced fallback path (the old bubble), both browsers:

```text
bubbleClass: absolute z-40 top-full left-0 pt-8 w-280 …, hits: 40/160, ulClient: 161, ulScroll: 448
```

Other cases (both browsers unless stated):

```text
1 row          below      160/160   ul 80/80
3 rows, last   above      160/160   ul 242/242
20 rows, last  above      160/160   (the rows scroll legitimately: 1619 = 20 rows, no extra overflow)
640x450        top=8      160/160   (@position-try --row-description-top)
320x700        above      160/160   Chromium 16..289 inside a 305px fixed box (15px classic scrollbar), Firefox 16..304
```

Firefox, description scrolled out of the rows:

```text
afterArrowDown12: ulScrollTop 684, anchorVisibleInRows false, popoverOpen true, bubbleDrawn true, bubble -83..293
```

Unit tests and suites:

```text
Test Files  2 passed (2)    Tests  134 passed (134)
rules     Tests  2675 passed (2675)
frontend  Tests  1979 passed (1979)
mcp       Tests  513 passed (513)
```

Screenshots in this folder:

- `test-chromium-1280-two-rows-first.png`: the report's case, the whole bubble over the card and
  the page, no scrollbar.
- `test-firefox-1280-one-row.png`: one row, the whole bubble below the card.
- `test-firefox-1280-twenty-rows-last.png`: the last of 20 rows, flipped above.
- `test-firefox-640x450.png`: 1280 × 900 at 200 %, at the window's top.
- `test-chromium-control-fallback-two-rows.png`: the forced fallback, cut off as in the report.
- `test-firefox-detached-after-arrow-scroll.png`: the Firefox defect below.

The bubble's text ends in "A reside" in the screenshots because the 500-character test text is cut
mid-word. The check compared the bubble's text with the description, and they were identical.

## Residual Risks

- **Firefox: a detached bubble after scrolling the rows** (new, low severity). It needs a bubble
  that stays open without the mouse: keyboard focus on the name, or a touch tap. Then the rows
  must scroll until its description leaves them, for example with the arrow keys. The bubble
  then stays over the heading and the card's header. Escape, Tab or a press closes it. Before the
  fix it scrolled away with its row. Chromium already hides it (`position-visibility`). In Firefox
  159, `anchors-visible` set in the live DOM did not hide it, so a CSS class alone may not be
  enough. A fix could close the bubble when its description leaves the rows (an
  `IntersectionObserver` with the `<ul>` as root, or the rows' `scroll` event), or follow the
  Firefox behaviour of `position-visibility` until it hides the bubble.
- **Browsers without anchor positioning** keep the old in-card bubble, so the bug remains there
  by design (fix.md, deviation 1). The control showed that path is unchanged. Which browsers must
  be supported is still the assessment's open question.
- **Safari / WebKit** is unchecked: Popover API, `anchor-scope`, `position-try-fallbacks`,
  `@position-try`.
- **A bubble taller than the window** (320 × 360 with 500 characters) is still cut off. Known and
  documented in fix.md. "View" shows the full text, and screen readers get it from the page.
- The 200 % zoom case was run as a 640 × 450 window in CSS pixels, not with real browser zoom.
- The API was mocked as in the assessment. No backend or real data was used.

## Recommendation

The reported bug can be considered fixed for Chromium and Firefox: verified end to end, with a
negative control, in every layout the assessment listed. Before closing, decide on the Firefox
detached-bubble defect. Either add a small follow-up fix (close the bubble when its description
leaves the rows) and re-run `.playwright-mcp/verify-detached.js`, or accept it as a known
low-severity limit and record it in fix.md. Settle the supported-browser question and check
Safari when a WebKit build is available. No need to rerun `/speckit-bug-assess`: the original
symptom does not reproduce.
