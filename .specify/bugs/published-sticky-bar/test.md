# Bug Verification: the details page's sticky footer stops sticking, with blank space under it

- **Slug**: published-sticky-bar
- **Tested**: 2026-11-15
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug no longer reproduces. I ran the assessment's reproduction in Chromium and Firefox,
against this worktree's frontend with the fix (dev server on 5174) and, as a control, against the
`pdf-summary` worktree without it (5173). On the control, the page could still be scrolled past
its content, by 269 to 1920 px. With the fix that extra range was 0 in every state, on all three
pages that use the accordion. The footer stayed at the window's bottom. Tooltips, the full URL's
bubble, the animation and `inert` behave as before. Lint, build and every test pass. One
unrelated timing test failed once under load, then passed three times when rerun.

## Checks Performed

The API was mocked with Playwright routes (the assessment's example connection, optionally with
12 rules per variant, and 45 activity entries). "Extra scroll" is `scrollHeight` minus the larger
of `<html>`'s height and the window's height. It equals the blank space under the footer at the
end of the page.

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction, control (no fix) | `runner.js` against 5173, Chromium and Firefox | reproduces | Exactly the assessment's numbers: Links open 1543/1167 (376 px), Activity open with 12 rules 2698/1194 (1504 px), Summary after the Activity was loaded 1733/1446 (287 px) |
| Reproduction (post-fix): published, Summary → Links → Activity → Summary → Links, 1440 × 900 | `runner.js` against 5174, Chromium and Firefox | pass | 0 extra scroll in every state, footer bottom = 900 |
| Post-fix: 12 rules per variant, Activity / Summary / Links | the same | pass | Control: 1504, 287 and 1920 px. Fixed: 0, 0 and 0 |
| Post-fix: 768 × 800 | the same | pass | Control: 376 px (Links), 287 px (Summary). Fixed: 0 |
| Post-fix: window under 480 px tall (1024 × 440, footer static) | the same | pass | Control: 376 and 287 px past the static footer. Fixed: 0. The footer is `static` there, as intended |
| Post-fix: arrival after Publish / Save (`location.state` `published` / `saved`, Links open) | `history.replaceState` + reload, Chromium | pass | Control: 1920 px with no click, more than the 900 px window. Fixed: 0. The assessment had only derived this case from the code |
| Post-fix: reduced motion | `emulateMedia({ reducedMotion: 'reduce' })`, Chromium | pass | Control: 1920 / 1504 / 287 px. Fixed: 0 |
| Post-fix: stored draft's details (Summary, Activity) | `runner.js` `mode: 'draft'`, Chromium and Firefox | pass | Control: 1302 px (Activity open, 12 rules) and 287 px. Fixed: 0 |
| Post-fix: Approval page, Summary closed | `runner.js` `mode: 'approval'`, Chromium and Firefox | pass | Control: 269 px (example), 1757 px (12 rules). Fixed: 0 |
| Regression: ⓘ tooltip reaches past the open Links body | `regress.js`, 560 × 640, Chromium and Firefox | pass | Opens upwards and reaches 94 px above the body. That part is painted (`elementFromPoint`). Same as the control |
| Regression: full URL's bubble reaches past the open Links body | the same | pass | URL cut, the bubble reaches 40 px above the body and is painted there. Same as the control. Screenshot `after-url-bubble-past-body.png` |
| Regression: animation | the same | pass | 60 ms after the click the rows are mid-transition (~470 px of 790), and both moving bodies are `relative min-h-0 overflow-hidden`. Once settled, the open one is exactly `min-h-0` |
| Regression: closed body stays inert | the same | pass | `inert` is set, and `.focus()` on "About the request link" inside the closed Links leaves the focus where it was |
| Regression: Summary's hidden statements read when open | the same (Playwright `ariaSnapshot`) | pass | 6 `sr-only` / `kern-sr-only` texts, and the statement "… at least 21 years …" is in the accessibility tree |
| Console | the Playwright console logs of both browsers | pass | No error and no warning (only React DevTools info and Firefox's dev timing marks) |
| New tests | `npx vitest run src/pages/FormConnectionDetail/utils.test.ts -t accordionBodyClassesOf` | pass | 2 passed |
| Regression suite | `npm test` (root) | pass (after rerun) | frontend 46 files / 1992 tests and mcp 15 / 513 passed. rules: 1 failed, `personas/performance.test.ts`'s 1.5 s budget (1528 ms). That run shared the CPU with two dev servers and the browser, and the package wasn't touched. Rerun alone, twice → 7/7. `npm test -w rules` → 46 files / 2675 tests passed |
| Lint | `npm run lint` (root) | pass | exit 0 |
| Type-check + build | `npm run build` (root, `tsc -b && vite build`) | pass | exit 0, Vite's usual chunk-size warning |
| Formatting | `npx prettier --check` on the three changed source files | pass | |
| Safari / WebKit | not available in this environment | not-run | |

Scripts (gitignored): `.playwright-mcp/test-sticky/runner.js` (mocks, navigation, clicks, the
measurement at the page's end), `regress.js` (tooltip, URL bubble, animation, `inert`, screen
reader) and `fixture.json` (the assessment's example).

## Output Excerpts

```text
Chromium 1440×900, example connection        control (5173)           fix (5174)
arrival (Summary open)                       doc 1446/1446  white 0   doc 1446/1446  white 0
after "View links"                           doc 1543/1167  white 376 doc 1167/1167  white 0
after "View summary" (Activity was loaded)   doc 1733/1446  white 287 doc 1446/1446  white 0

12 rules per variant
after "View activity"                        doc 2698/1194  white 1504 doc 1194/1194 white 0
after "View links"                           doc 3087/1167  white 1920 doc 1167/1167 white 0
arrival after Publish (Links open)           doc 3087/1167  white 1920 doc 1167/1167 white 0
Approval page, Summary hidden                doc 2657/900   +1757      doc 900/900   +0
```

```text
Firefox 159, six cases (published example, 12 rules, 768×800, 1024×440, draft, Approval):
control 287–1920 px of extra scroll wherever Chromium had it, the same numbers; fix 0 in every state
```

```text
rules › src/personas/performance.test.ts › generates for three different 50-item branches within 1.5 s
AssertionError: ms per run: 1528, 1396, 1372, 1137: expected 1528.218017578125 to be less than or equal to 1500
(rerun alone ×2: Tests 7 passed (7); npm test -w rules: Tests 2675 passed (2675))
```

Screenshots in this folder: `after-links-open-scrolled-to-end.png` (the footer at the window's
bottom, no blank space, compare `before-links-open-scrolled-to-end.png`),
`after-activity-open-scrolled-to-end.png` (12 rules, Activity open, compare
`before-activity-open-scrolled-to-end.png`) and `after-url-bubble-past-body.png`.

## Residual Risks

- Safari / WebKit wasn't tested. The fix relies on the CSS containing-block rule, which Chromium and
  Firefox both follow here, so I expect the same in WebKit.
- The API was mocked and the frontend ran on Vite's dev server, not the production build behind
  nginx. The build passes, and the fix is a Tailwind utility (`relative`) that the app uses
  elsewhere already.
- The screen-reader check used Playwright's accessibility snapshot, not a real screen reader.
- Only English was tested. German texts are longer, but the mechanism doesn't depend on text length.
- The `personas/performance.test.ts` timing budget can fail on a loaded machine. That isn't caused
  by this fix, but CI could hit it too.
- Elsewhere in the app, a non-positioned `overflow: hidden` box may still hold `sr-only` text
  (fix.md, "Follow-ups"). I didn't audit for it.

## Recommendation

Close the bug. It was verified end to end in Chromium and Firefox. The reproduction was run before
and after the fix, on the published details, the stored draft's details and the Approval page,
with the example and with 12 rules per variant, at three window sizes, after Publish or Save, and
with reduced motion. Nothing regressed. This also settles the assessment's open question: the draft
details and the Approval page were affected (up to 1302 and 1757 px) and are fixed too.
