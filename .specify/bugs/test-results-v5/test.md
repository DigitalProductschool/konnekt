# Bug Verification: The Test step's result card in the V5 design: the test date under the title, rule rows worded as the Rules step's with coloured names, and every rule's "Message for citizens:"

- **Slug**: test-results-v5
- **Tested**: 2026-11-19
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

All four of the assessment's reproduction steps were run again in the running app (Chrome via
Playwright, local backend and Vite, a throw-away database). None of the old behaviour shows any
more. The test date now stands only in the result card's head, without a full stop (R1). The rows
form a list without a head: the name is coloured by its outcome, the status is hidden text, and no
row is tinted (R2). Every row, met or not, ends with "Message for citizens:" (R3). The five
open-question defaults behave as recorded in `fix.md`. Lint, every workspace's tests, the build,
Prettier and the fixture check pass, and no regression was found.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction 1, R1 (post-fix) | The example draft, Test step, 1455 × 900; count the "Tested as if…" lines and find where they are | pass | One line, inside the result card under the `h2`; none between the example banner and the variant tabs. "Tested as if shared today, 19.11.2026", no full stop, 14px `rgb(74, 84, 104)` |
| Reproduction 2, R2/R3, citizen not met | Yusuf and Thomas, Standard and Ambulance (frames 1, 10) | pass | No `table`/`thead`/`th`, no "Message … reads", no "–". Row 626 × 99, `8px 12px`, gap 8, 1px `rgb(225, 230, 240)` bottom border, transparent background. Icon box 20 × 24, icon 20 × 20. Name 16/24/600 in `rgb(196, 39, 28)` with hidden "Not met" |
| Reproduction 3, R3, citizen meets | Felix, Standard and Ambulance (frame 2) | pass | Heading "Result: meets the rules"; no "Rules Felix meets"; every row green `rgb(29, 122, 46)`, hidden "Met", and its "Message for citizens: …" |
| Reproduction 4, "Couldn't be checked" | Edit data: expiry date and class B date emptied, Save and test | pass | Rules 06–08: `?` icon in `rgb(74, 84, 104)`, name in the default colour `rgb(11, 18, 32)`, "Couldn’t be checked" visible at 14px muted. Failing rows first (decision 3 applied) |
| Frames 3 / 9: order | Test draft with 12 rules; a citizen fails 03, 05, 06 | pass | Rows 03, 05, 06, then 01, 02, 04, 07–12 |
| Frame 15: 12 rules, card scroll | Same draft, 1455 × 900 | pass | Rows 1260px in a 305px `overflow-y: auto` region under the fixed head; the page doesn't scroll (v5-ui-fixes B2 intact) |
| Long rules: hanging message | Rule 02 with a 213-character message | pass | Message `display: flex`; label 133px `nowrap`; all four message lines start at x 801 (under the first word); row 171px |
| Group with its own message (decision 4) | Variant "Grouped": Group 01 (message) › Rules 13, 14, sub-group Group 02 › 15, 16; Group 03 (no message) | pass | Group 01 shows its message; Rules 13–16 show "Not shown while this rule is in Group 01. Citizens see the group message instead."; Group 02 and Group 03 show no line; members indented 28 per level (icon x 632 → 660 → 688); no tint |
| No-rules note (decision 5) | Variant "School transport" without rules | pass | Head 48 with the date, then "School transport has no rules yet, so every citizen meets it. …" |
| Frame 19: Generate again | MutationObserver while the selected citizen regenerates | pass | `heading:yes dates:1` → `heading:no dates:0` (skeleton) → `heading:yes dates:1` |
| Frame 18: Generate all | Same observer | pass | No heading and no date while all three are created; both return after |
| Frame 20: generation failure | Code read (`TestStep/index.tsx`: `failed ? <GenerationFailed …/> : …`) | not-run | Couldn't force a worker failure in the browser. By the code, the failure branch renders no `ResultSection`, so no date |
| German, widths, zoom | DE at 1455 × 900, 1024 × 768, 1023 × 768, 727 × 450 (1455 at 200 %), 320 × 640 | pass | 1455: "Getestet, als würden die Daten heute geteilt: 19.11.2026", head 48, label 243 with the message hanging at 323. 1024/1023: card 483/482 < 560, message flows under its label. 727 × 450: card 612, hanging. 320: head grows to 96, nothing cut off. No horizontal page scroll anywhere |
| Accessibility tree | `region "Result: …".ariaSnapshot()` | pass | `list` › `listitem` › "Group 01 Not met", statement, "Message for citizens: …", then the nested `list` of members in the same order |
| New / updated tests | `npx vitest run src/personas/` in `rules/` | pass | 16 files, 423 tests. The three new `results.test.ts` cases (`:397`, `:415`, `:442`) and the dateline without a full stop (`messages.test.ts:40`, `:45`) are present |
| Regression suite | `npm test` (root) | pass | rules 2678, frontend 2012, mcp 513 passed; api-types has none |
| Lint / type-check / build | `npm run lint`, `npm run build`, `npm run format:check` (root) | pass | lint exit 0 in all workspaces; typecheck + build exit 0; Prettier clean |
| Generated fixtures | `uv run python -m scripts.export_check_fixtures --check` in `backend/` | pass | exit 0 (no backend file changed, so Ruff, mypy and pytest weren't run) |
| Stale identifiers | `grep` for `listHeading`, `messageColumn`, `meetsHeading`, `ResultTable`, `TEST_STEP_COPY.noMessage` | pass | No hits; the remaining `noMessage` hits are the unrelated validation problem code |

## Output Excerpts

```text
npm test (root)
 rules:    Test Files  46 passed (46)   Tests  2678 passed (2678)
 frontend: Test Files  47 passed (47)   Tests  2012 passed (2012)
 mcp:      Test Files  15 passed (15)   Tests  513 passed (513)
lint exit 0 · build exit 0 (✓ built in 173ms) · "All matched files use Prettier code style!"

rules/ npx vitest run src/personas/
 Test Files  16 passed (16)   Tests  423 passed (423)
```

```text
R1, example draft, 1455 × 900
datesOnPage: [{ text: "Tested as if shared today, 19.11.2026", inCard: true, box: [620, 451, 626, 24] }]
head: [620, 427, 626, 48]   h2: [620, 427, 626, 24]

R2/R3, first row
box [620, 483, 626, 99] · padding 8px 12px · gap 8px · border 1px rgb(225, 230, 240) · bg rgba(0, 0, 0, 0)
name "Rule 01" 16px/24px/600 rgb(196, 39, 28) · status "Not met" [sr-only]
message "Message for citizens: You need to be at least 21 years old."
```

```text
Frame 19 (Generate again): heading:yes dates:1 → heading:no dates:0 → heading:yes dates:1
Frame 18 (Generate all):   heading:no dates:0 (status "Creating 3 sample citizens…") → heading:yes dates:1
```

Screenshots are in `./test-screens/` (git-ignored by this folder's `.gitignore`, `*.png`):
`t01-1455-standard.png`, `t02-1455-12-rules-top.png`, `t03-1455-long-message.png`,
`t04-1455-group-members.png`, `t05-1455-no-rules-note.png`, `t06-1455-not-checked.png`,
`t07-1455-de.png`, `t08-1024-de.png`, `t09-1023-de.png`, `t10-727x450-de.png`,
`t11-320-de.png`, `t11-320-de-card.png`, `t12-320-de-head.png`.

## Residual Risks

- **Before the fix, only by the code.** The assessment couldn't reproduce the bug either (no dev
  servers), and git doesn't work in this checkout (`.git` points to another machine). So there's
  no runtime "before" to compare with: the symptom is judged absent after the fix against the
  assessment's code-derived steps.
- **Frame 20 not rendered.** The failure state was checked only by reading the code.
- **Another citizen's card during one regeneration.** Only the selected citizen's card is ever on
  screen, so "another citizen's card still shows the date" couldn't be observed on its own. It
  follows from the date belonging to each card with a `view`.
- **German at the 560px breakpoint.** Above 560 the German label (243px) leaves the message about
  200px at the top level. Inside a nested member (indent 28/56) the message column is narrower
  still. That's fine at 1455, but the frames draw no German or no member case.
- **Pre-existing behaviour, not caused by this fix.** With only "Couldn't be checked" rows, the
  heading still says "doesn’t meet 3 rules" (`unmetRulesOf()` counts every reported rule). The
  Edit data toast also says "Felix erfüllt Rule 06, Rule 07 und Rule 08 nicht mehr". Neither path
  was touched (the assessment lists both as unaffected). Worth a separate look if it's unwanted.
- **Correction to `fix.md`.** Its deviation and follow-up say the `figma/` screenshots aren't
  ignored. This folder's own `.gitignore` (`*.png`) covers `figma/*.png` and `test-screens/*.png`,
  so that follow-up isn't needed.
- **Spec 008 `design-notes.md` "V5 `7599:55726`".** It still has 7 rows marked "pending" for this
  command: frames 3/9 order, frame 15 fill/scroll, long message, no-rules note, frames 18 and 20.
  This command doesn't edit specs; the values above can fill them (frame 20 only from the code).

## Recommendation

Close the bug: verified end to end in the running app at the frames' size, in German, at the
narrow widths and with the group, empty-variant and "Couldn't be checked" cases the frames don't
draw, and the full lint, test and build suite is green. Before committing: fill the 7 pending
design-notes rows with the measurements above, and drop the `.gitignore` follow-up from
`fix.md`. Pass the designer the follow-ups already listed in `fix.md`: the skeleton's old rows,
frame 3's "Couldn't be checked" drawn as not met, the stale "Rules/Rule row" description and layer
names.
