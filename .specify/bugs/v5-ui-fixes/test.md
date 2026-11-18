# Bug Verification: Eight V5 UI fixes (step 1 widths, per-card scrolling, version strip, document ⋯, date mask, no "No findings." ⓘ, 2px input ring, no "Cancel" on log-out)

- **Slug**: v5-ui-fixes
- **Tested**: 2026-11-18
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

None of the eight symptoms reproduces any more. I checked them in the running app, in Chromium
and Firefox. Lint, tests and build pass.

Two small differences from what the assessment expected remain:

- **B3**: "Download PDF" is 34px high, not 32. The strip is therefore 46, not 44, and the closed
  Summary card is 144, not Figma's 142.
- **B4**: a single document's ⋯ menu opens with a divider above its only entry, "Remove
  document". The fix introduced this.

Some checks couldn't run here: Safari and Android, VoiceOver and NVDA, real browser zoom, and the
scrollbar's look. So the result is **partial**, not verified.

## Setup

- **Stack**: the real backend (`app.main`) on 3000 and Vite on 5173 (`VITE_API_URL=http://localhost:3000`).
  - The backend ran through a scratchpad launcher. It installed the tests' in-memory
    `FakeEudiplo` (`backend/tests/fake_eudiplo.py`) and turned the worker off.
  - The database was the compose `postgres` container on 5435 (`alembic upgrade head`).
  - A local account `verifier` was created with `app.cli create-user`.
  - No repository file was changed; no `.env` was written.
- **Data**:
  - The example ("Start from an example"): edited, given a variant "Rental cars" with no
    description, then **published** through the UI, which the fake EUDIPLO allows.
  - A draft "Many rules (12)": POSTed to `/api/form-connections/drafts`, with its body built from
    `app.example`.
  - A new connection "B4 single document".
- **Browsers**: Playwright Chromium (headless) and Firefox 159.
  - 200% zoom was emulated as half the CSS viewport (727 × 450). Playwright has no browser zoom.
  - Screenshots: `figma/test-*.png` beside this file (git-ignored, like the Figma ones).

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| B1 reproduction (step 1 widths) | Step 1 at 1455 × 900, empty name + "Choose documents", 320 × 800, 727 × 450; Chromium + Firefox | pass | Name input 1070 × 48, textarea 1070 × 120 in the 1120 card (x 185 = 160 + 1 + 24). Error state: the wrapper and danger bar are 1070. No `.max-w-726` in the DOM. 320: fields 223 in the 273 card, no horizontal scroll. |
| B2 reproduction (per-card scrolling) | Test step, 12-rule draft and example, at 1455 × 900, 1455 × 600, 1024, 1023, **992, 991**, 320, 727 × 450; Chromium + Firefox | pass | Pinned and ≥ 992: the panel and the page don't scroll. Each card is 16 + 48 head + 8 + scroll area + 16. Areas 392 / 642 (rows 376 / 626 + 16 padding). The data area doesn't overflow when the data fits; the result area scrolls (1843 in 265). At 991 the cards stack and the panel scrolls (2194 in 387). At 1455 × 600, 320 and 727 × 450 the page scrolls. The page height never grew past the viewport while pinned. See "Breakpoint" below. |
| B2 keyboard and a11y | Tab from "Generate again", arrows, End, PageDown | pass | Two tab stops: `region` "Simon's data" and `region` "Result: doesn't meet 12 rules", named by their headings (accessibility tree). 4px ring, offset 2, `:focus-visible`. Arrows / End / PageDown scroll the area; `window.scrollY` stays 0. Screen readers themselves not run. |
| B3 reproduction (Summary strip) | Draft details and **published** details, EN + DE, at 832 (1455 wide) and 640 (687 wide), open and closed, 320, 727 × 450; Chromium + Firefox | pass, with a 2px difference | Header row 782 × 52 at (24, 16) inside the border. The strip sits 12 under it (`#f2f5fb`, radius 8) and shows open and closed. "Version" at 16 from the strip's left, 14/24, muted, 400. The code is 600, `tabular-nums`, default colour. The button is 156 wide (DE 184), 6 from the top, 8 from the right. DE 640 stays on one row. Open: the body's first line is 8 into the body, 24 under the strip, and the toggle reads "Hide summary". 320 wraps with no horizontal scroll. **The button is 34 high, the strip 46 and the closed card 144** (Figma 32 / 44 / 142). The PDF downloaded (62 KB). |
| B4 reproduction (document ⋯) | Example (2 docs) and new connection (1 doc, then removals) | pass, with a new defect | No trash on any row. ⋯ on every row, named "Actions for <document>". First row: "Move down" + "Remove document"; last: "Move up" + "Remove document". The removal is red (`#c4271c`) with `kern-icon--delete`. "Keep document" and Escape return focus to the row's ⋯. After a confirmed removal the focus goes to the shown document's item, after the last to "Add document". Error look: the 24px `kern-icon--danger` sits right before the ⋯, `aria-hidden`, "1 document needs data". Row 40. **A single document's menu shows a separator before "Remove document"** (see Residual Risks). |
| B5 reproduction (date mask) | Edit data, "Date of birth" and "Class B since", real key events; Chromium (clipboard paste) + Firefox (`insertText`) | pass | Every row of the assessment's table, with the caret: `0`, `08`, `08.0`, `08.07`, `08.07.2` … `08.07.2007`. A 9th digit is dropped. A paste of `08072007` or `08.07.2007` gives `08.07.2007`. `08` + `.` gives `08.`. `08.07.` + Backspace gives `08.07`. `08.\|07.2007` + Backspace gives `0\|.07.2007`, then `9` gives `09.07.2007`. `08\|.07.2007` + Delete gives `08.\|7.2007`. A middle edit gives `08.1.2007`, then `08.12.2007`. Clearing works. ISO and `abc` stay as typed, with the error. A valid date clears the error and sets the age (19). "Age today" isn't masked. Both browsers matched. |
| B6 reproduction (no "No findings." ⓘ) | Rules step, new variant "Rental cars" with no description | pass | No "About Rental cars" button. The ⋯ starts 4px after the name (533 → 537), unselected and with its menu open. Tab row 38. "Ambulance" (with a description) keeps its ⓘ. The Test step's tab has no ⓘ either. |
| B7 reproduction (2px input ring) | Focused fields, computed `outline-width` | pass | 2px: connection name, description, its error state (red), variant name, list search, "Find a document" (`MenuSearchField`), Edit data fields, rule rename input, rule value input, the message field's box, the "Valid for" select (`kern-form-input__select`). Kept: checkbox 3px, buttons 4px. `GroupMessage` and the `ValuesPicker` field trigger were checked in the source only (`outline-2`; the remaining `outline-4` are the name button and the button-shaped trigger). Error ring `#c4271c`: 5.21:1 against `#fef1f0`, 5.75:1 against white. |
| B8 reproduction (log-out dialog) | Unsaved change, then account menu → "Log out"; EN + DE; 1455, 320, 727 × 450; Chromium + Firefox | pass | 480 × 232; "Log out anyway" (secondary) and "Save and log out" (primary), 200 × 48 at (32, 152) and (248, 152). No "Cancel". Escape and × close it, focus back on "Signed in as verifier", still signed in. 320: stacked full width. DE: 480 × 272, because "Speichern und abmelden" wraps to two lines (buttons 64 high; not drawn in Figma). |
| New / updated tests | `npx vitest run …/TestStep/utils.test.ts …/DocumentsStep/utils.test.ts -t "dateEntryOf\|documentMenuOf\|moveTargetsOf"` (frontend/) | pass | 2 files, 20 tests passed (171 skipped by the filter). |
| Regression suite | `npm test` (root) | pass (after one rerun) | First run: rules 1 failed / 2674. That was `personas/performance.test.ts`, a 1.5 s time budget (1632 ms), while Docker, uv and Vite were starting. `npm test -w rules` rerun: 2675 / 2675. Frontend 2010 / 2010, mcp 513 / 513. The fix doesn't touch `rules/`. |
| Lint / type-check | `npm run lint` (root) | pass | All four workspaces, exit 0. |
| Build | `npm run build` (root) | pass | Exit 0. |
| Backend checks | — | skipped | No backend change in the fix. The backend logged no warning or error during the session. |
| Safari / Android caret (B5), VoiceOver / NVDA (B2) | — | not-run | No such browsers or screen readers here. |
| Approval page keeps no strip (B3) | — | not-run | Needs an agent approval request. `pages/Approval/PublishSummary.tsx` passes neither `version` nor `pdf` (source). |

## Output Excerpts

```text
npm run lint            → lint exit 0
npm test (1st run)      → rules: Tests 1 failed | 2674 passed (2675)
                          AssertionError: ms per run: 1632, 1017, 1103, 772: expected 1631.58 to be less than or equal to 1500
                          frontend: Tests 2010 passed (2010) · mcp: Tests 513 passed (513)
npm test -w rules       → Test Files 46 passed (46) · Tests 2675 passed (2675)
npm run build           → build exit 0
vitest (fix's tests)    → Test Files 2 passed (2) · Tests 20 passed | 171 skipped (191)
```

Breakpoint: the project's `lg` is **992px**, not 1024. It comes from
`@digitalservicebund/kern-ux-tailwind-theme`, and `docs/KERN-DESIGN-SYSTEM.md:419` says so. The
built CSS has `.lg\:flex-row` under `@media (width >= 992px)`. At 1024 and 1023 both sides
behaved the same (side by side, per-card scrolling). That is correct, not a fault: the
assessment's 1024/1023 pair doesn't straddle the breakpoint. 992 and 991 were checked instead
(table above).

B3 button height (Chromium; Firefox the same):

```text
Download PDF: min-height 32px, height 34px, box-sizing border-box, border 1px, padding 0 11px
  .kern-label: padding 4px 8px, line-height 24px → 32px + 2 × 1px border = 34px
Summary card closed: 16 + 52 + 12 + 46 (6 + 34 + 6) + 16 + 2 = 144   (Figma 7603:61502: 142)
```

B4 single document's menu (accessibility tree and DOM):

```text
- menu "Actions for Personal ID":
  - separator            ← y 9, 1px, rgb(225, 230, 240), nothing above it
  - menuitem "Remove document"
```

`documentMenuOf()` (`DocumentsStep/utils.ts:470-476`) always marks the removal `separated: true`.
`ActionMenu` (`components/ActionMenu/index.tsx:140`) draws the separator whatever the entry's
position. The single-row test (`utils.test.ts:899-900`) checks the labels only.

## Residual Risks

- **B4: stray divider in a single document's menu** (introduced by the fix).
  - The line shows above the lone "Remove document", and screen readers meet a "separator"
    first.
  - The menu's height estimate (`menuHeightOf`) counts it too.
  - Fix: pass `separated: actions.length > 0` in `documentMenuOf()`, or make `ActionMenu` skip a
    separator on the first entry. Add a single-row assertion on `separated`.
- **B3: 2px taller than Figma.** `min-h-32!` sets a minimum; KERN small's label is already 32,
  plus the 1px borders. `fix.md`'s "6 + 32 + 6 = 44" left out the border.
  - Closed card 144 vs 142; strip 46 vs 44; button 34 vs 32.
  - Fix: trim the label's vertical padding to 3px, or set the button's height to 32px.
- **B2: focus ring past the card's right border.** The scroll area reaches 16px into the card's
  right padding, so its 4px ring at offset 2 sits about 5px outside the card's border on the
  right, and inside on the left. Cosmetic.
- **B2: scrollbar look not judged.** Headless Chromium hides scrollbars and Firefox here uses
  overlay ones (0px). The `-mr-16 pr-16` placement with a classic 15px bar (`fix.md`'s
  "the rows lose 15px") wasn't seen.
- **B8 German.** "Speichern und abmelden" wraps in the 200px button (dialog 480 × 272). Figma
  draws English only. The other two-button leave dialogs use the same layout.
- **Not exercised**:
  - Safari and Android keyboards (B5, where `inputType` may be missing);
  - VoiceOver and NVDA (B2 regions);
  - real browser zoom (emulated by viewport);
  - the approval page (B3).
- **PDF first click.** The first "Download PDF" click right after a cold start produced no
  download within 20 s and logged no error. The second produced the file in about 1.5 s. Probably
  Vite compiling the PDF worker on first use; not attributable to this fix (it changed only the
  button's classes), but not proven.
- **Timing flake.** `rules/src/personas/performance.test.ts` can exceed its 1.5 s budget on a
  loaded machine. That's unrelated to this fix, but CI might trip on it too.
- **Repository.** The checkout's `.git` still points to another machine, so the state under test
  couldn't be pinned to a commit.

## Recommendation

Hold, but nearly there. Every reported symptom is gone and nothing regressed outside the fix.
Two follow-ups before closing:

1. Drop the leading separator in a single document's menu (B4), with a unit assertion.
2. Bring "Download PDF" to 32px so the closed Summary card is 142 (B3).

Or record the 2px as an accepted difference in spec 011's design-notes §7.1.

Both are small enough for `/speckit-bug-fix` to apply against this assessment without a new
`/speckit-bug-assess`. If they're accepted, run Safari or VoiceOver checks where available, then
close.
