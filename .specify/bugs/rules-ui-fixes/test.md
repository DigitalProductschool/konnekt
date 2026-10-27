# Bug Verification: Eight Rules UI fixes (B1–B8)

- **Slug**: rules-ui-fixes
- **Tested**: 2026-10-26
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

None of the eight symptoms reproduces in Chromium. Each item's reproduction from the assessment
was run in the real frontend (Vite dev server on `:5173`) with the API mocked in the browser,
since no backend was running. The unit tests, the type check, lint and format are all clean.
The result is **partial**, not verified, for three reasons:

- Firefox could not be driven: Playwright can't launch the stock system Firefox. Firefox
  checks were asked for B2, B3, B5 and B6.
- Nothing was run against a real backend.
- A few of the sub-checks listed in fix.md were not run (see Residual Risks).

The checks were split across four parallel sub-agents (B1–B3, B4, B5–B6, B7–B8). Each wrote its
own Playwright script and ran it in its own Chromium instance.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Unit tests | `npm test` (vitest run) | pass | 16 files, 517 tests, including the new `stickyPin`, `undoShortcut`, `rulesCountsOf`, `ruleFieldLabel` and B4/B7 cases |
| Type check | `npx tsc -b --noEmit` | pass | no errors |
| Lint | `npm run lint` | pass | whole frontend, clean |
| Format | `npm run format:check` | pass | all files match Prettier |
| B1 reproduction | Rules step, empty variant; measure the dashed box against the card | pass | 24/24/24/24 px at 1455×900 and 727×450 (200 % zoom) |
| B2 reproduction | Open variant tab; underline vs tab and ⋯; "Add variant" label vs tab labels | pass | the underline runs from the tab's left edge to the ⋯'s right edge, 2px, black. Label centres level (322/322, 239/239), 22px above the line, tab 38px tall. Standard and based variant |
| B3 reproduction | 18 rules, select mode, scroll 400 / 1000 / end / back | pass | pinned: bar top = scroller top (296 at 1455×900, 109 at 727×450), radius 0, 1px inset line. Back at the top: resting, 7px corners. In the based variant the link strip scrolls away and the bar pins |
| B4 reproduction | Delete / group / ungroup / copy / documents removal; real waits | pass | all toasts present at 5.0s, gone by 6.5–6.6s. Hover and focus pause (present at 7.5s). Ctrl+Z after the toast restores the change (page focus and ⋯ focus). The shortcut is ignored in the rename field and the group message, with a dialog or the editor open, and after a later change. No toast after leaving and re-entering a step |
| B5 reproduction | Nationality value picker; real mouse clicks | pass | a click on the text ticks the option and the menu stays open; a second click unticks it. Box click, search-then-row and a filtered row all tick. Escape, Tab, Shift+Tab and a click outside close the menu |
| B6 reproduction | Pencil / padding / label / text clicks in the rule editor and a group's message | pass | pencil: focus, caret at the end (37/37), typing appends. A click in the text puts the caret where clicked. No new tab stop. A right-click does nothing. The read-only group message on the details page doesn't react |
| B7 reproduction | Data menu (PID and mDL), search, chosen data, rows, delete dialog, details, documents step, proposed messages | pass | "Date of birth (Age)" everywhere in the rules, and "age" finds it. The documents step and the messages keep "Date of birth" / "date of birth" |
| B8 reproduction | Details page, closed Rules card; fixture with expected "3 variants · 6 rules" | pass | text matches at 1455×900 and 320×640. Muted colour, line height 24, no gap under the title. Hidden while open, shown again after "Hide summary". No horizontal scroll at 320 (305 ≤ 320) |
| Firefox (B2, B3, B5, B6) | `firefox.launch({ executablePath: '/usr/bin/firefox' })` | not-run | stock Firefox 157 without Playwright's Juggler protocol exits at once; no Playwright Firefox build is installed |
| Real backend | — | not-run | `:8000` did not answer; every check used a mocked API |

## Output Excerpts

```
 Test Files  16 passed (16)
      Tests  517 passed (517)
EXIT tsc 0 · EXIT lint 0 · All matched files use Prettier code style!
```

- B4: `Group toast "…are now Group 01. Undo": present at 5.0s, gone at 6.6s`; `hover: still
  present at 7.5s`.
- B5: `click option text → checked=[GE], menu open`.
- B6: `pencil click → activeElement TEXTAREA, selection 37/37 = length`.
- B8: `"3 variants · 6 rules"`, colour `oklch(0.4661 0.0574 276.44)` = `--kern-color-layout-text-muted`.

## Deviations from Figma (not mismatches)

- B8 hint font size: 16px against Figma's 14px (Figma 10.11 6530:40737). The hint uses
  `text-kern-static-small`, which is 16px in KERN 2.8 (`--kern-typography-font-size-small-static`,
  `kern.css:637`). Figma binds the same token at its 14px Revamp value. Per CLAUDE.md and
  design-notes §9 this is **KERN 2.8 vs Revamp**, not a defect.
- B2 tab label size 18 against Figma's 16: KERN 2.8 vs Revamp, already in fix.md.

## Residual Risks

- **Firefox and Safari** were not run for any item. B5 and B6 depend on the order of focus and
  blur events, which is where browsers differ most. The scripts take the browser as an argument,
  so they can run with a Playwright-patched Firefox.
- **Mocked API**: the mocks follow `schemas.py` and the frontend types, and the catalog and
  option sets come from the backend. Saving against a real server wasn't exercised.
- **Not run**:
  - B1 in a based variant without rules (24px under the link strip).
  - B4: focus after an undo, the screen-reader announcement, and Cmd+Z (only Ctrl+Z was pressed).
    The editor-open Ctrl+Z check is indirect.
  - B5: the menu without a search field (fewer than 11 options) after its first step. Escape and
    the other closes weren't run there.
  - B6: the empty message field (dashed placeholder).
  - B7: 320px.
- **B5**: "Select at least one option." stayed visible after ticking. It is the menu's static grey
  footer hint (`ValuesPicker.tsx:193-200`), not the validation error from the bug. The red field
  error staying away wasn't asserted separately. It only appears after the menu closes on an
  empty selection, and that close no longer happens.
- **Side effect**: a sub-agent's `uv run` rebuilt `backend/.venv`, whose interpreter link pointed
  to another machine. It is gitignored, and no tracked file changed.

Scripts, mocks and screenshots are in the session scratchpad, not in the repo:
`/tmp/claude-1000/-home-debian-batch27-faro-rules/7be9f440-2605-48d7-b922-5635ddea8433/scratchpad/`
(`b123/verify.mjs`, `b4/run*.mjs`, `b56/run.mjs`, `b78/b7*.mjs`, `b78/b8.mjs`).

## Recommendation

Close B1–B8 for Chromium: every symptom is gone in the real frontend, and the suites are clean.
Keep the bug open, or file a follow-up, for one Firefox pass over B2, B3, B5 and B6, preferably
against a real backend. B5 and B6 matter most there, since they depend on focus order.
