# Bug Fix: The Test step's result card in the V5 design: the test date under the title, rule rows worded as the Rules step's with coloured names, and every rule's "Message for citizens:"

- **Slug**: test-results-v5
- **Fixed**: 2026-11-19
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The Test step's result card now follows the V5 preview (section `7599:55726`): the test date
moved from above the variant tabs into the card's head, under "Result: …", without a full stop
(R1); the table became a list without a head whose rows show the status icon, the name coloured
by its outcome, the Rules step's sentence and no visible "Not met" (R2); and every row, met or
not, ends with the Rules step's "Message for citizens:" line (R3). The five open questions were
settled by the assessment's defaults (see "Decisions on the open questions").

## Decisions on the open questions

The verdict is `valid`, so the command doesn't stop on them; each default is recorded here and in
spec 008's new clarifications.

| # | Question | Applied |
|---|---|---|
| 1 | Tint | As drawn: no fill on any row, members included. Only the 1px bottom divider |
| 2 | Icons | KERN's ◆ / ✓ / ? kept; the Material person_off / how_to_reg ("Preview candidate, not approved") not adopted, so the chips are unchanged too |
| 3 | "Couldn't be checked" | Spec 004 F8 kept: the ? icon in muted, the name in the default text colour, and "Couldn't be checked" as visible small muted text after the name on its line. Frame 3 drawing it as not met is taken as a Figma error |
| 4 | Members of a group with its own message | A rule member shows the Rules step's "Not shown while this rule is in <group>. Citizens see the group message instead."; a sub-group member inside such a group shows no message line (that sentence speaks of "this rule") |
| 5 | The no-rules note | Kept, under the new head with the date |

## Changes

| File | Change | Notes |
|------|--------|-------|
| `rules/src/personas/types.ts` | modified | `ResultRow.message` is the item's stored message on every row; new `ResultRow.messageGroup`; `ResultView.listHeading` and `messageColumn` removed |
| `rules/src/personas/results.ts` | modified | `rowOf()` takes the message from the current item (trimmed, `null` when empty); `reported` passed explicitly; `memberRows()` passes the outermost group with a message down as `messageGroup`; comment updated; `persona` narrowed to `Pick<Persona, 'values'>` |
| `rules/src/personas/messages.ts` | modified | `testDayLine` without the full stop (EN, DE); `meetsHeading`, `messageColumn`, `meetsHeadingOf()`, `messageColumnOf()` removed |
| `rules/src/personas/results.test.ts` | updated, added tests | messages on met rows and members; three new cases (below) |
| `rules/src/personas/messages.test.ts` | updated | date without the full stop; the removed headings' cases dropped |
| `rules/src/personas/scenarios.test.ts` | updated | date wording; met rows carry their message; removed-heading assertions dropped |
| `frontend/src/pages/FormConnectionEditor/TestStep/ResultTable.tsx` → `ResultList.tsx` | replaced | a `<ul>` without a head (the assessment's "Replace `ResultTable.tsx` with a list") |
| `frontend/src/pages/FormConnectionEditor/TestStep/ResultRow.tsx` | rewritten | `<li>`: icon in a 20 × 24 box, `gap-8 px-12 py-8`, bottom divider, no tint; name 16/24 600 coloured by outcome with the status as hidden text (visible for "Couldn't be checked"); `RuleSentence` or the group subtitle; `RuleMessage hanging` |
| `frontend/src/pages/FormConnectionEditor/TestStep/MemberRows.tsx` | modified | members in a nested `<ul>`; no `messageColumn` |
| `frontend/src/pages/FormConnectionEditor/TestStep/ResultSection.tsx` | modified | head is a column: the `h2` (still the scroll area's name), then `TestDayLine`; takes `today` |
| `frontend/src/pages/FormConnectionEditor/TestStep/TestDayLine.tsx` | modified | comment only (its place and wording) |
| `frontend/src/pages/FormConnectionEditor/TestStep/index.tsx` | modified | the line above the tabs removed; `today` passed to `ResultSection`; comments |
| `frontend/src/pages/FormConnectionEditor/TestStep/constants.ts` | modified | `TEST_STEP_COPY.rule` and `noMessage` removed (EN, DE); new `RESULT_NAME_COLOURS`; `MEMBER_INDENT` now the row's whole left padding, 12 + 28 per level; comments |
| `frontend/src/pages/FormConnectionEditor/TestStep/types.ts` | modified | `ResultListProps` replaces `ResultTableProps`; no `messageColumn`; `ResultSectionProps.today` |
| `frontend/src/pages/FormConnectionEditor/TestStep/CardScrollArea.tsx` | modified | comment (`ResultList`) |
| `frontend/src/components/RuleRow/RuleMessage.tsx` | modified | `hanging` option |
| `frontend/src/components/RuleRow/constants.ts` | modified | `notShownInGroup` moved here from `RULES_STEP_COPY` (EN, DE unchanged); `HANGING_MESSAGE` classes |
| `frontend/src/components/RuleRow/types.ts` | modified | `RuleMessageProps.hanging` |
| `frontend/src/pages/FormConnectionEditor/RulesStep/constants.ts` | modified | `notShownInGroup` removed (moved) |
| `frontend/src/pages/FormConnectionEditor/RulesStep/GroupListItem.tsx`, `RulesStep/utils.ts` | modified | read `RULE_ROW_COPY.notShownInGroup` |
| Docs | modified | see "Documentation" below |

## Documentation

The assessment's "Docs" list, done by a delegated docs-only subagent and reviewed here:

- `specs/008-kern-revamp-redesign/spec.md`: a new "Session 2026-11-19 (bug fixes)" with
  Clarifications #1 (R1, with Open Question 5), #2 (R2, with Open Questions 1–3) and #3 (R3,
  with Open Question 4 and the 560px breakpoint), each with Surfaces, Behaviour and wording,
  Supersedes. FR-024 and FR-043 reworded. CLAR 2026-11-07 #31 (b) struck in part. Also amended,
  since R1 supersedes them: #6's Supersedes, #32's regeneration bullet, and the 2026-11-18 #1
  pointer to this bug.
- `figma-audit/report.md`: F42, F45, C6, and the coverage rows that cite them.
- `figma-audit/requirements.md`: FR-024e, FR-043a, 004-S8.1.1, 004-S8.1.2, 004-S8.6.3 to
  004-S8.6.7, 004-ACC.1, plus 004-S8.8.5 (the date during a regeneration).
- `design-notes.md`:
  - "history" notes on the T071, T073 and T074 rows these frames reverse, and on the §1.3 icon
    rows;
  - §2's `RuleRow` and Test step component rows;
  - a new verification section "V5 `7599:55726`" (27 rows). 20 of them are filled with this
    fix's browser measurements; 7 remain "pending" for `/speckit-bug-test`: frames 3 and 9's
    order, frame 15's fill and scroll with 12 rules, a rule's long message, the no-rules note,
    and frames 18 and 20;
  - a §8 History bullet.
- `contracts/ui-screens.md` S13 and `quickstart.md` V6.1, V6.3, V6.4.
- `docs/ARCHITECTURE.md:1139`: the test day is shown under the result's heading.
- Left as history: spec 004's files; spec 008's `research.md:132` and the done tasks T071/T074
  in `tasks.md`, which still quote the old line and table; design-notes' dated run records.
- No `CLAUDE.md` change: no new pattern.

## Diff Highlights

The row's message (rules package):

```ts
// rowOf()
message: messageOf(item),   // the current item's message, trimmed; null for a group without one
messageGroup,               // outermost group with a message around a listed member
reported,                   // from the evaluation's messages, as before
```

The row (frontend), shortened:

```tsx
<li>
  <div className={`flex items-start gap-8 border-b … py-8 pr-12 ${MEMBER_INDENT[depth]}`}>
    <span aria-hidden="true" className="flex h-24 w-20 shrink-0 items-center justify-center">
      <span className={`kern-icon ${RESULT_STATUS_ICONS[row.status]} kern-icon--small`} />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-2 …">
      <p className="… flex flex-wrap items-baseline gap-x-8">
        <span className={`${RESULT_NAME_COLOURS[row.status]} font-semibold`}>{row.name}</span>
        {/* "Couldn’t be checked" visible; "Not met" / "Met" sr-only */}
      </p>
      {row.parts ? <RuleSentence … /> : <p …>{resultStatementOf(row, language)}</p>}
      {message !== null && <RuleMessage message={message} hanging />}
    </div>
  </div>
  <MemberRows members={row.members} depth={depth + 1} />
</li>
```

## Tests Added or Updated

- `rules/src/personas/results.test.ts`
  - `takes the current messages from the branch, so an edited message shows at once`: an edited
    rule message shows trimmed without a new evaluation; a group whose message was removed has
    `null`; the evaluation's own messages are unchanged.
  - `names the group whose message citizens read on the members listed under it`: every member of
    a reported group with a message, the sub-group and its rules included, carries the
    outermost group's trimmed name; the sub-group keeps its own message as data; the top-level
    rows carry none.
  - `names no group on the rules a group without a message reports in its place`.
  - `lists the reported rules first …`: the view has exactly `meets`, `heading`, `rows`,
    `failingFields` (no list heading, no message column).
  - Every outline now expects the item's message on met rows and members.
- `rules/src/personas/messages.test.ts::testDayLineOf …`: EN and DE without the full stop.
- `rules/src/personas/scenarios.test.ts`: US1-AS2 (Mia, Jonas, Anna, German), US1-AS4 (the
  date), the edge cases on removed rules, classes not held and empty classes, US2-AS7 (rename).

## Local Verification

- `npx vitest run src/personas/` in `rules/` → 16 files, 423 tests passed.
- `npm run lint` (root) → clean in all four workspaces.
- `npm run build` (root: typecheck + build) → passed.
- `npm test` (root) → rules 2678, frontend 2012, mcp 513 tests passed; api-types has none.
- `npm run format:check` (root) → clean.
- No backend file changed, so Ruff, mypy and pytest weren't run.
- **In the browser** (Chrome via Playwright; the compose `postgres` container on 5435 with a
  throw-away `faro_verify` database, the backend on 3000, Vite on 5173; all removed afterwards).
  The example draft, Test step, 1455 × 900. Screenshots are in `.playwright-mcp/` (git-ignored):
  `v5-1455-hannah-standard.png`, `v5-1455-aylin-standard.png`, `v5-1455-hannah-not-checked.png`,
  `v5-1455-de.png`, `v5-1024-de.png`, `v5-320-de-card.png`, `v5-1455-group-hannah.png`.

  | Check | Figma (frame 1 `7599:55727`, rows `7599:55832`) | App |
  |---|---|---|
  | Lines with "Tested as if…" on the page | 1, in the card | 1, in the card; none above the tabs |
  | Card content width | 626 | 626 |
  | Head (`7599:55810`) | 626 × 48, title 24 + date 24, no gap | 626 × 48: `h2` 24 at y 427, date 24 at y 451 |
  | Date | "Tested as if shared today, 17.11.2026", 14px, `layout-text-muted` | "Tested as if shared today, 19.11.2026", 14px, rgb(74, 84, 104) |
  | Row | 626 × 99, `px-12 py-8`, `gap-8`, 1px #e1e6f0 bottom, no fill | 626 × 99, `8px 12px`, gap 8, 1px rgb(225, 230, 240), transparent |
  | Icon box / icon | 20 × 24 / 20 | 20 × 24 / 20 × 20, centred (y + 2) |
  | Column gaps | 2 | 2: name 24, sentence 30, message 24 (24 + 2 + 30 + 2 + 24 = 82) |
  | Name, not met | 16/24 600, #c4271c | 16px/24px/600, rgb(196, 39, 28) |
  | Name, met (frame 2) | #1d7a2e | rgb(29, 122, 46), hidden "Met" |
  | Message line | "Message for citizens:" 14/600 muted, 8, message | same, on met rows too; no "Rules Aylin meets", no column, no "–" |

  - "Couldn't be checked" (class B date emptied in Edit data): ? icon, "Rule 02" in
    rgb(11, 18, 32), "Couldn’t be checked" in rgb(74, 84, 104) after it; Rule 01 stays red with
    hidden "Not met".
  - German at 1455: head 48, "Getestet, als würden die Daten heute geteilt: 19.11.2026"; the
    label is 243px and the message hangs beside it at 323px, wrapping under its first word.
  - 1024 and 1023 × 768 (German): the card is 483 / 482px, under the 560px breakpoint, so the
    message flows under its label; no horizontal overflow; the rows scroll in the card (B2).
  - 320 × 640 (German): the head grows to 96 (heading and date wrap), the message flows, nothing
    is cut off, no horizontal page scroll.
  - 727 × 450 (1455 at 200 %): the cards stack, the card is 612px so messages hang, the head is
    48, no horizontal overflow.
  - A group with its own long message (Rules 01 and 02 grouped in the Rules step): the group row
    shows "All rules must be met" and its message hanging over three lines (the "Long rules"
    layout, `7644:65780`); its members are indented 28 (icon x 660 under the group's name at
    660) and say "Not shown while this rule is in Group 01. Citizens see the group message
    instead."; no tint anywhere.
  - Frame 19 ("Generate again" on the selected citizen): while it is busy, no "Tested as if…" on
    the page and no result heading; it comes back with the results.
  - Accessibility tree: `region "Result: …"` › `list` › `listitem` › paragraphs "Group 01 Not
    met", "All rules must be met", "Message for citizens: …", then the nested `list` of members:
    name, status, sentence, message.
  - The no-rules note wasn't shown in the browser (the example has no empty variant). It renders
    under the same head as before, now with the date (`ResultSection`).

## Deviations from Assessment

- **The hanging breakpoint is 560px, not 480px.** The assessment asked to raise it if the
  German message column got too narrow. With "Nachricht für Bürgerinnen und Bürger:" measured
  at 243px, a 480px container would leave the message about 150px; 560 leaves 200px or more at
  the top level. At 1455 the card is 626, so the frames' layout holds there in both languages.
- **`messageGroup` is set on every member under a reported group with a message, but only a rule
  member shows the "Not shown …" sentence.** A sub-group member in such a group shows no message
  line, since the Rules step's sentence speaks of "this rule". No frame draws this case.
- **`resultViewOf()`'s `persona` parameter narrowed** to `Pick<Persona, 'values'>`, since the
  name was only used by the removed headings. Every caller passes a whole persona.
- **Scope**: `CardScrollArea.tsx` (a comment naming `ResultTable`) and `RulesStep/utils.ts`
  (`editorMessageHintOf()` read the moved `notShownInGroup`) changed beyond the assessment's
  file list; both follow from the listed changes.
- The assessment says the `figma/` folder's `.gitignore` keeps the PNGs out of git. There is no
  `.gitignore` in `.specify/bugs/test-results-v5/figma/`, and the root `.gitignore` doesn't cover
  it (see Follow-ups). The screenshots of this fix are in `.playwright-mcp/`, which is ignored.

## Follow-ups

- Tell the designer: the skeleton card of frames 18 and 19 still draws the old two-column rows,
  so the loaded card and its skeleton differ; frame 3 draws "Couldn't be checked" as not met;
  the "Rules/Rule row" description ("Applicant message is only shown in the editor") contradicts
  every frame; frame 2's and frame 15's layer names are stale.
- Decide the person icons once the designer approves them (Open Question 2); they would change
  the chips too.
- Add a `.gitignore` with `*.png` to `.specify/bugs/test-results-v5/figma/` (or remove the
  screenshots) before committing, as the assessment intended.
- Next: `/speckit-bug-test slug=test-results-v5`.
