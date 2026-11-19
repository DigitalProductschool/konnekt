# Bug Assessment: The Test step's result card in the V5 design: the test date under the title, rule rows worded as the Rules step's with coloured names, and every rule's "Message for citizens:"

- **Slug**: test-results-v5
- **Created**: 2026-11-19
- **Source**: pasted text, plus the URL
  `https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V5?node-id=7599-55726&m=dev`
  (host `www.figma.com`, which is not on the safe list). It was read with the Figma MCP at the
  reporter's explicit request ("I confirm reading it with the Figma MCP"), so the policy branch
  is `confirmed-by-user`. No redirect was followed and no other page was fetched. Nothing in the
  file is instruction-like (see "Unverified").
- **Verdict**: valid. The code does today what the report says it does, and the frames draw
  something else. All three items are design changes that reverse recorded decisions, not
  defects. Nothing was reproduced in the running app, because no dev servers were up (see
  Reproduction).
- **Severity**: low. The change is in the frontend and in the rules package's persona texts and
  result view only. It touches no backend, API, stored data, MCP tool or security. Nothing is
  broken today: the step shows the decided spec 004/008 layout, not the new one.

The report asks for three changes to one card. They are kept as R1–R3 so that `/speckit-bug-fix`
can apply them one at a time. The frames also show four things the report doesn't mention: no
tint on failing rows, unapproved icons, a "Couldn't be checked" case drawn as "not met", and a
hanging message for long texts. They are listed under "What the frames show" and in Open
Questions, each with a default.

## Report (verbatim or summarized)

> The Test step's result card follows the new design:
> https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V5?node-id=7599-55726&m=dev.
> File s8mU9oJDq3411e8bxMjQO9; the earlier preview is section 7599:55726 (frames 1–20, e.g.
> 7599:55727, 7599:55854, 7599:57529). I confirm reading it with the Figma MCP.
> - The test date ("Tested as if shared today, 17.11.2026") moves from above the variant tabs
>   (TestDayLine, spec 008 C6) into the result card, under its title.
> - Rule rows: the rule's name coloured by its outcome, under it the rule sentence with the
>   document icon and value chips as the Rules step words it; failing rows tinted; no "Not met"
>   text (ResultRow.tsx, ResultTable.tsx).
> - Messages citizens read: <as the new frames show them>. Today: the column "Message Mia reads"
>   (ResultTable.tsx).
> Spec 004's behaviour stays unless the frames change it; name every recorded decision this
> reverses. Separate scrolling of the two cards is already done in v5-ui-fixes (B2).
>
> A correction to my earlier table: the grey ⓘ is FR-041b, not FR-042b. The first prompt has it
> right.

**On the correction.** Spec 008's requirements index has FR-041b, "the grey ⓘ 'No findings.'"
(`figma-audit/requirements.md:150`, removed by v5-ui-fixes B6), and FR-042b, "the Edit data
dialog's 'Cancel' and 'Save and test'" (`:155`). Every bug record already cites FR-041b for the
grey ⓘ (`.specify/bugs/v5-ui-fixes/assessment.md:60`, `:328`, `:386`). Nothing under
`.specify/bugs/` cites FR-042b, so no file needs the correction. This assessment doesn't touch
the ⓘ.

### What the frames show

The section is `7599:55726`, "Test · preview: tested date + rule rows (copy of 🔗 Flow › Test ·
1, 17.11.2026)": 21 frames of 1440 × 900, read with `get_metadata`. The rows were read with
`get_design_context` (frame 1's rows `7599:55832` and `7599:55842`, frame 15's `7599:57665`, Long
rules' `7644:65780`) and the head with it too (`7599:55810`). Screenshots are in `figma/` beside
this file, on this machine only: the folder's `.gitignore` keeps every `*.png` out of git.

- **The frames.**
  - Results: 1 `7599:55727` (Mia, Standard, doesn't meet 2), 2 `7599:55854` (Anna meets), 3
    `7599:55980` (Yusuf, no driving licence shared), 8 `7599:56109`, 9 `7599:56241`, 10
    `7599:56371` (Ambulance), and Long rules `7644:65669`, which is new.
  - The same card behind something else: 4 and 5 (Edit data), 6 (toast), 7 (Generate again), 14
    (⚠ on the tab), 15 `7599:57529` (12 rules), 16 and 16b (publish).
  - Loading: 18 `7599:57852` and 19 `7599:58022`. Failure: 20 `7599:58190`.
  - Archived today: "Old · 11/12/13 · School transport", with the reason "archived 19.11.2026:
    a variant always has rules, not all 3 citizens meet them".
  - Screenshots: `figma/f01-frame.png`, `f01-result.png`, `f02-result.png`, `f03-result.png`,
    `f09-result.png`, `f10-result.png`, `f15-result.png`, `long-result.png`, `f18-frame.png`,
    `f19-frame.png`.
- **R1, the test date.** No frame has a line between the step header and the tabs: the
  "Header block" ends at 136 and the "Variant tabs" start at 152 (`7599:55735`). The result head
  `7599:55810` (626 × 48) holds "Title + tested date" `7599:61799` (234 × 48), a column without
  a gap:
  - "Result: doesn't meet 2 rules" in title/small (16/24, 600, `layout-text-default`);
  - under it, `7599:61800`, "Tested as if shared today, 17.11.2026" in body/small (14/24, 400,
    `layout-text-muted`), **without a final full stop**. The code has one ("…, 01.11.2026.").
  - Every frame with results has the same head. The loading frames 18 and 19 draw the old
    skeleton head (one bar) and no date anywhere. Frame 20 draws no result card.
- **R2, the rows** (`7599:55832`, 626 × 99). The old table head (`7599:55827`, "Rule" and
  "Message Mia reads"; "Rules Anna meets" in frame 2, `7599:55953`) is hidden as "Old · Table
  head", so the list has no head. Each row:
  - Row: `px-12 py-8`, `gap-8`, and a 1px bottom border in `decorative-border-default`
    (#e1e6f0). **There's no fill, also on failing rows**: frame 1 Rule 01, frame 15 Rule 07 and
    Long rules Rule 02 have only the border. 8 + 82 + 8 + 1 = 99.
  - Icon: a 20 × 24 box with a 20px icon in it. A failing row has "icon-person_off-small
    (Material)" in danger. A met row has "icon-how_to_reg-small (Material)" in success. Both
    components' Figma descriptions say "Preview candidate, not approved."
  - "Rules/Rule row" instance, a column with **2px** gaps:
    - The name in label/default (16/24, 600), in `feedback-danger` #c4271c when not met and
      `feedback-success-contextual` #1d7a2e when met.
    - The sentence, the Rules step's (`RuleSentence`): the 16px document glyph, "Personal ID ·"
      14 muted, the data 16/600 default, the round symbol chip "≥", the check words 16 muted,
      and the value chips (14/600, 1px border, radius 4, `px-8 py-2`). It wraps with 8 across
      and 4 down.
    - The message line ("Rules/Error message"): "Message for citizens:" (14/24, 600, muted), 8,
      then the message (14/24, 400, default).
  - No status text on any row.
  - In Long rules `7644:65780` (626 × 175), the message wraps **as a hanging column**: the label
    `whitespace-nowrap`, then the message `flex-1` beside it, with its lines aligned under the
    message's first word, not under the label. The sentence wraps "is between [01.01.1990]
    [31.12.2023]" onto a second line.
- **R3, the messages.** Every row shows "Message for citizens: <the rule's message>", **the met
  rows too**:
  - Frame 1: Rule 03, which Mia meets, shows "You need a driving licence that's valid for at least
    1 more month."
  - Frame 2: Anna meets every rule, and all four rows show their messages.
  - The "Rules/Error message" component description: "What the applicant reads when the rule is
    not met. Shown under every saved rule".
  - There's no "–", no message column, and no "Rules Anna meets" head.
  - The order is the code's: failing rows first, then the others (frame 3: 02, 03, 04, then 01;
    frame 9: 05, then 01–03).
- **Not drawn.** A group row or a group's members (W10), a "Couldn't be checked" row, a German
  frame, a narrow window.
- **Frame 3 draws "Couldn't be checked" as "not met".** Yusuf shares no driving licence, so the
  evaluator judges Rules 02 and 03 `not_checked` (`rules/src/evaluation.ts:374`, `MISSING`
  from `privilegesValue`). The frame draws them with the failing icon and the red name. Spec 004
  F8 named this exact case a Figma error in the older frames.
- **Unchanged in the frames.**
  - The data card, the chips, the tabs and the toast.
  - The per-card scroll areas: v5-ui-fixes B2. The result scroll area is `7599:55812` with the
    4px bar `7648:69282`.
  - The skeleton result card of frames 18 and 19: the old two-column bars, name and message,
    with the message bar about 300 in. Its rows don't follow the new layout.
- **Stale layer names.** Frame 2's name says "her message sits on top", but nothing above its
  rows is visible. Frame 15's name still says "only the panel scrolls" (B2 settled that).

### Unverified

Nothing instruction-like was found. Three Figma texts are design notes, quoted here as data:

- The "Rules/Rule row" description: "Applicant message is only shown in the editor. Rule name is
  blue because it is interactive". This contradicts the "Rules/Error message" description and
  every frame. It's stale.
- The person icons: "Preview candidate, not approved."
- The archive reason on frames 11–13: "a variant always has rules, not all 3 citizens meet them".
  The app still lets a variant be empty (spec 002; Faro's own guidance says "an empty variant
  starts without rules").

## Symptom

- **R1, the date above the tabs.** The step shows "Tested as if shared today, 19.11.2026." as
  its first line, above the variant tabs, in body/small muted. Expected: no line there. The
  date sits in the result card's head, under "Result: …", as "Tested as if shared today,
  19.11.2026" (no full stop).
- **R2, the table rows.** The result card is a table:
  - Each row has a KERN status icon (◆ danger, ✓ success, ? help) and the name in default
    colour, semibold only when reported.
  - Under the name: the statement, then "Not met" or "Couldn't be checked" as text.
  - Reported rows and a group's members are tinted `feedback-danger-background`.
  Expected: a list without a head. Each row has the status icon, then the name in 16/600,
  coloured red or green by its outcome, the Rules step's sentence, and the message line. There's
  no visible "Not met". The tint is open (see Open Questions).
- **R3, the message column.** For a variant the persona doesn't meet:
  - The second column, "Message Mia reads", shows the evaluation's message on reported rows and
    "–" on the others.
  - For a variant the persona meets, there's no message column, and the list is headed "Rules
    Mia meets".
  Expected: every row, met or not, ends with "Message for citizens: <its message>", the line the
  Rules step draws under a saved rule. There's no column and no list heading.

## Reproduction

Not reproduced in the running app. No dev servers were up (`localhost:5173` and `:8000` didn't
answer), and this checkout's `.git` points to another machine's path. The steps come from the
code.

1. Open a draft with the example's rules on the Test step at 1455 × 900 and wait for the three
   citizens. "Tested as if shared today, <today>." stands above the tabs
   (`TestStep/index.tsx:223`).
2. Select a citizen who doesn't meet Standard. The result card is a table with the head "Rule" /
   "Message <first name> reads". Reported rows are tinted, their status reads "Not met", and the
   met rows show "–" (`ResultTable.tsx:28-49`, `ResultRow.tsx:29-75`).
3. Select a citizen who meets Standard. The head reads "Rules <first name> meets", and there's
   no message column (`ResultTable.tsx:35`, `results.ts:144-145`).
4. Give a citizen no driving licence ("Not shared"). The licence rules read "Couldn't be
   checked" with the grey ? icon (`constants.ts:188-192`). Frame 3 draws them as not met.

## Suspected Code Paths

All frontend paths are under `frontend/src/pages/FormConnectionEditor/TestStep/` unless stated
otherwise.

### R1 The test date

- `index.tsx:223`: `{shown && <TestDayLine today={today} />}` sits between `ExampleBanner` and
  `VariantTabs`.
  - `today` comes from `usePersonas()` (`:92`).
  - The comment at `:30-47`, `:73-75` describes the line's place and its states.
- `TestDayLine.tsx:6-20`: body/small muted, `testDayLineOf(today, language)`. The comment cites
  FR-016, W1, spec 008 C6 and "the frames draw no test-day line".
- `ResultSection.tsx:34-41`: the head is `flex min-h-48 items-center` with only the `h2`.
  - The `h2`'s id names the scroll area (`CardScrollArea`, B2), so that stays.
  - `ResultSectionProps` (`types.ts:218-223`) has no `today`.
- `rules/src/personas/messages.ts:90`, `:124`: `testDayLine` reads `Tested as if shared today,
  ${date}.` / `Getestet, als würden die Daten heute geteilt: ${date}.`, with the full stop.
  `testDayLineOf()` is at `:195`.
  - Pinned by `rules/src/personas/messages.test.ts:40-48` and `scenarios.test.ts:655-660`.
- `docs/ARCHITECTURE.md:1139`: "shown in the test-day line".

### R2 The rows

- `ResultTable.tsx:22-50`: a `table-fixed` with a `thead` ("Rule" or `listHeading`, and
  `messageColumn`). It uses a 480px container query (`@min-[480px]:w-340`) and stacks below
  320px (`narrow:block`).
- `ResultRow.tsx:22-78`:
  - `tinted = row.reported || depth > 0` gives `bg-kern-feedback-danger-background` and
    `py-10`; otherwise `py-8`.
  - The icon is `RESULT_STATUS_ICONS[row.status]` with `gap-12`.
  - The name is 16/24, default colour, `font-semibold` only when reported.
  - Then `RuleSentence`, or `resultStatementOf()` for a group, then the status: visible
    `outcomeNameOf()`, or `sr-only` "Met" for met rows.
  - The message `td`.
- `MemberRows.tsx`: recursion for a reported group's members. `constants.ts:194-196`
  `MEMBER_INDENT` uses `pl-32` per level (icon 20 + gap 12).
- `constants.ts:185-192` `RESULT_STATUS_ICONS`:
  - `kern-icon--success` in success;
  - `kern-icon--danger` in danger;
  - `kern-icon--help` in muted.
- `components/RuleRow/RuleSentence.tsx`: already the frame's "Sentence" (glyph 16, "Personal ID
  ·" 14 muted, data 16/600, the predicate's chips, `gap-x-8 gap-y-4`). The result rows already
  use it (`row.parts`), so the sentence needs no change.
- `components/RuleRow/RuleName.tsx`: the Rules step's name is 14/24 in action blue. The Test
  frames draw 16/24 red or green, so the result row keeps its own name element.
- `index.css:44-47`:
  - `--kern-color-feedback-success` is #1d7a2e, the frame's `feedback-success-contextual`.
  - `--kern-color-feedback-danger` is #c4271c.
  - Both pass 4.5:1 on white (about 5.4 and 5.7).
- `SkeletonResultRow.tsx`, `constants.ts:218-228`: the skeleton, which the frames don't redraw.

### R3 The messages

- `rules/src/personas/results.ts:108-148` (`resultViewOf`) and `:199-229` (`rowOf`):
  - `message` is the evaluation's message for a reported item and `null` otherwise.
  - `listHeading` is `meetsHeadingOf()` when met.
  - `messageColumn` is `messageColumnOf()` when not met.
  - The comment at `:84-107` records F3, F8, F14 and W10.
- `rules/src/personas/types.ts:269-317`: `ResultRow.message` ("`null` for other rows, which the
  step draws as '–'") and `ResultView.listHeading` / `messageColumn`.
- `rules/src/personas/messages.ts:57-58`, `:101-102`, `:135-136`, `:266-274`: `meetsHeading`,
  `messageColumn` and their exports. Tests: `messages.test.ts:127-134`; `results.test.ts:176-177`,
  `:348-349`, `:372-373`, `:460`; `scenarios.test.ts:505-573`, `:1334`.
- `rules/src/evaluation.ts:319-336` (`messagesOf`):
  - A rule reports its own message.
  - A group reports its own message instead of its members'; without one, it reports its members'
    messages.
  - The evaluator refuses a branch with a rule that fails `firstProblem()`, `noMessage`
    included (`results.ts:48-51`). So every rule the step shows has a message, and only a group
    can have none.
- `components/RuleRow/RuleMessage.tsx`: the Rules step's "Message for citizens:" line
  (`RULE_ROW_COPY.messageLabel`, DE "Nachricht für Bürgerinnen und Bürger:"), inline. A long
  message wraps under its label, not as Long rules' hanging column.
- `RulesStep/GroupListItem.tsx:46-69`, `RulesStep/constants.ts:352-354` (`notShownInGroup`) and
  `RulesStep/utils.ts:573-591` (`messageGroupOf`): on the Rules step, a rule inside a group with
  its own message reads "Not shown while this rule is in <group>. Citizens see the group message
  instead." in place of its message (F32, FR-037).
- `constants.ts:52-54`, `:90-91` (`rule`, `noMessage` "–") become unused. `met` (`:59`, `:92`)
  stays as hidden text.
- Unaffected: the MCP server imports only `personas/applicant`, `personas/fields` and
  `personas/types`. `savedToastOf()` (`TestStep/utils.ts:567-571`) reads only `itemId` and
  `status`. `unmetRulesOf()` (the heading's count) reads `reported`, which stays.

### The recorded decisions this reverses

| | Decision (where) | What it says today | After |
|---|---|---|---|
| R1 | spec 004 FR-016 (`spec.md:513-518`), W1 (`figma-audit/report.md:93`, CLAR 2026-11-01 #4) | "one line directly under the step's intro" | in the result card's head, under the title |
| R1 | spec 004 S8.1.2 (spec 008 `figma-audit/requirements.md:572`) | shown also while one persona is generated anew | shown with the persona's results; a persona being generated anew shows a skeleton card with no date (frame 19). Another persona's card still shows it |
| R1 | spec 008 C6 and FR-024e (`figma-audit/report.md:208`, `requirements.md:61`), the wording in 004-S8.1.1 (`requirements.md:571`) | "Tested as if shared today, 01.11.2026." | no full stop, in English and German; dd.mm.yyyy stays (FR-024) |
| R1 | spec 008 `design-notes.md:3330`, `:3337`, `:3393` ("keeps its place"), `:3655`, `:3856`, `:3873` | the line above the tabs; "the app's are 40 lower" | the app's y values match the frames' |
| R2 | spec 004 FR-015 (`spec.md:503-505`: the status "Not met" or "Couldn't be checked" … "each with its own icon"), S8.6.4 (`requirements.md:612`), F8 (`figma-audit/report.md:82`, CLAR 2026-11-01 #9) | the status as visible text | the status as hidden text; the icon and the name's colour show it. F8's "A rule on an empty value reads 'Couldn't be checked'" is an Open Question |
| R2 | spec 004 ACC.1 (`requirements.md:634`: "statuses are text") | visible status text | hidden status text. The icons still differ in shape, so the outcome isn't shown by colour alone |
| R2 | spec 008 CLAR 2026-11-07 #31 (b) (`spec.md:622-626`), F42 (`figma-audit/report.md:142`), FR-043 and FR-043a (`spec.md:1756-1757`, `report.md:329`) | "keeps … 'Not met' / 'Couldn't be checked' as text … with the design's icon and tint" | no status text; the tint is an Open Question; the statement stays |
| R2 | spec 004 W10 (`figma-audit/report.md:102`), S8.6.5 | a reported group's members are "tinted like it" | follows the tint decision; members stay indented, 28 per level |
| R3 | spec 004 FR-015 (`spec.md:500-507`): "A met rule or group MUST show … a check icon and no message … '–' … no message column"; "the list MUST be headed 'Rules <first name> meets'" | messages only on reported rows; a head for a met variant | every row shows its own message; no column, no list heading |
| R3 | spec 004 S8.6.3, S8.6.6, S8.6.7 (`requirements.md:611`, `:614`, `:615`) | columns "Rule" / "Message Mia reads"; "–"; "Rules Mia meets" | removed; S8.6.7's "no success message" holds (spec 008 CLAR #31 (a), F41) |
| R3 | spec 004 F3 (`figma-audit/report.md:77`, CLAR 2026-11-01 #9, #16) and F14 (`:88`, CLAR #16) | "A met variant has no message and no message column, because the evaluation gives none"; met rows "–" | the line names the rule's message for citizens, not what this citizen reads. Under a met variant it still shows. F3's refusal of the "Your wallet data meets the requirements" box holds |
| R3 | spec 008 F42 (`report.md:142`): "Met rows have the statement and '–'" | "–" | the message |
| R3 | spec 008 `design-notes.md:3363` (the table head row), `:3365`, `:3372`, `:3689` (group rows) | the table | the list |

Unchanged:

- FR-014: what is evaluated and reported.
- The order: reported first, then the other top-level items.
- The heading and its count (FR-024d).
- The members listed only under a reported group (FR-015k).
- The no-rules note (004-S8.6.8).
- The skeleton and failure states (004-S8.8, S8.9).
- The per-card scrolling (v5-ui-fixes B2).

## Root Cause Hypothesis

High confidence. Every item is a deliberate earlier decision that the new V5 frames redraw:

- **R1**: spec 004 W1 added a line the frames lacked, and placed it under the intro. The V5
  preview now draws the date in the result head. The full stop was the app's wording (C6),
  which the frame drops.
- **R2**: spec 004 F8/F42 added visible statuses, because the older frames' rows had neither a
  statement nor a status. The new frames carry the statement themselves, the Rules step's
  sentence, and mark the outcome by the icon and the name's colour.
- **R3**: F3/F14 tied the message to what the evaluation reports. The new frames reuse the
  Rules step's "Message for citizens:" line under every rule. It names the rule's message, which
  the citizen reads when the rule fails.

## Proposed Remediation

Order: R3's model change first (in `rules/`), then R2 and R3's markup, then R1.

### R3 The rule's message on every row (rules package)

- `rules/src/personas/types.ts`:
  - `ResultRow.message` becomes "the item's message for citizens as stored": a rule's message
    (every evaluated rule has one), a group's own message, or `null` for a group without one.
  - Add `messageGroup: string | null`: the name of the outermost group around the row whose own
    message citizens read instead, as the Rules step's `messageGroupOf()` finds it. Only a
    member under a reported group can have one.
  - Remove `ResultView.listHeading` and `messageColumn`.
- `rules/src/personas/results.ts`:
  - `rowOf()` takes the message from the **current** item (`current.get(id) ?? entry.item`), as
    it does for the name and statement, so that an edited message shows at once.
  - `memberRows()` passes the reported group's message group down.
  - `reported` and `unmetRulesOf()` don't change.
  - Update the comment at `:84-107`.
- `rules/src/personas/messages.ts`: remove `meetsHeading`, `messageColumn`, `meetsHeadingOf()`
  and `messageColumnOf()`, and their tests.
- The frontend's row then shows `RuleMessage` (the Rules step's line, `RULE_ROW_COPY`, both
  languages) when `message` is set.
  - A member with a `messageGroup` shows the Rules step's sentence "Not shown while this rule is in
    <group>. Citizens see the group message instead." (Open Question 4). Move
    `notShownInGroup` out of `RULES_STEP_COPY` into a shared table, for example
    `components/RuleRow/constants.ts`, rather than importing one page's copy into another.
  - A group without a message shows no line. Never "–".
- **The long-message layout** (Long rules `7644:65780`): add a `hanging` option to `RuleMessage`.
  - It's a flex row: the label `shrink-0 whitespace-nowrap`, 8, then the message
    `min-w-0 flex-1 break-words`.
  - Use it in the result card from a 480px container (the card is already `@container`). Below
    that, and under `narrow:`, keep the inline flow.
  - The Rules step keeps the inline flow; its frames aren't part of this report.
  - Check the German label, "Nachricht für Bürgerinnen und Bürger:" (about 270px at 14/600),
    beside the message in the 626 column. Raise the breakpoint if the message column gets too
    narrow.

### R2 The rows as a list

- Replace `ResultTable.tsx` with a list, for example `ResultList.tsx`: a `<ul>` without a head,
  with each row an `<li>`.
  - The table existed so that each message was read with its column's name (its comment). The
    visible "Message for citizens:" label now does that.
  - Drop the `thead`, the 480px column width and the `narrow:block` stacking.
- `ResultRow.tsx` (and `MemberRows.tsx`, its members in a nested `<ul>`):
  - Row: `flex items-start gap-8 px-12 py-8`, a 1px bottom border in
    `decorative-border-default`.
  - Icon: a 20 × 24 box (`flex h-24 w-20 items-center justify-center`) holding the 20px icon,
    `aria-hidden`.
  - Content: `flex min-w-0 flex-1 flex-col gap-2`:
    - the name as `<p>` in 16/24 `font-semibold`, in `text-kern-feedback-danger` (not met) or
      `text-kern-feedback-success` (met); "Couldn't be checked" per Open Question 3;
    - then `RuleSentence` (unchanged), or `resultStatementOf()` for a group;
    - then the message line (R3).
  - The status becomes hidden text for every outcome, read right after the name ("Rule 01, Not
    met"). Use `outcomeNameOf()` and `TEST_STEP_COPY.met`, so that a screen reader still hears
    it (004-ACC.1 in its new form).
  - Members: indent 28 per level (`pl-28`, `pl-56`, `pl-84`: icon 20 + gap 8), so that a
    member's icon sits under its group's name. Measure it, because no frame draws it.
  - The tint: drop `bg-kern-feedback-danger-background` and the `py-10` (Open Question 1;
    default as drawn).
  - The icons: keep `RESULT_STATUS_ICONS` (KERN's ◆ / ✓ / ?) unless Open Question 2 approves
    the Material person icons. Those would be two new SVGs in `src/assets/icons/`, as masks
    like `person.svg`, and the chips' `CHIP_ICONS` would change with them, since the frames use
    the same icons there.
- Remove `TEST_STEP_COPY.rule` and `noMessage` (EN/DE) once unused. Update the comments in
  `ResultRow.tsx:10-21`, `ResultTable`, `MemberRows.tsx` and `constants.ts:185-196`.
- The skeleton (`SkeletonResultRow`) stays as frames 18 and 19 draw it (Risks).

### R1 The date in the result head

- `index.tsx`: remove `{shown && <TestDayLine … />}` and pass `today` to `ResultSection`.
  Update the comments (`:30-47`, `:63-75`: the ExampleBanner now stands 16 above the tabs).
- `ResultSection.tsx`: the head becomes a column of two 24px lines in the 48px row: the `h2`
  (unchanged, still the scroll area's name), then the date `<p>` (`TestDayLine`, kept as the
  component and restyled only if needed: 14/24 muted).
  - Show it whenever the card has a `view`: with the no-rules note too, as the archived frames
    11–13 drew it.
  - The skeleton and failure states show none (frames 18–20).
- `rules/src/personas/messages.ts:90`, `:124`: drop the full stop. That gives "Tested as if
  shared today, 19.11.2026" and "Getestet, als würden die Daten heute geteilt: 19.11.2026".
  Update `messages.test.ts:40-48` and `scenarios.test.ts:655-660`.
- `docs/ARCHITECTURE.md:1139`: "shown under the result's heading".

### Docs

- Spec 008 `spec.md`: a new "Session 2026-11-19 (bug fixes)" with one dated Clarification per
  item (R1, R2, R3), each naming its surfaces, behaviour, wording and what it supersedes (the
  table above). Reword FR-024 (the test-day line's place and wording), FR-043 (no status text,
  the tint as decided) and the struck parts of CLAR #31 (b).
- Spec 008 `figma-audit/report.md`: C6, F42.
- Spec 008 `figma-audit/requirements.md`: rows FR-024e, FR-043a, 004-S8.1.1, 004-S8.1.2,
  004-S8.6.3, 004-S8.6.4, 004-S8.6.5, 004-S8.6.6, 004-S8.6.7, 004-ACC.1, each with an "amended
  by" note.
- Spec 008 `design-notes.md`: the rows listed in the table, plus new verification rows for frames
  1, 2, 3, 9, 15 and Long rules, and a §8 History bullet.
- Spec 008 `contracts/ui-screens.md` and `quickstart.md`, where they describe the line or the
  table.
- Spec 004's own files stay as history. Spec 008 already supersedes them item by item, as
  v5-ui-fixes did.
- No `CLAUDE.md` change: no new pattern.

### Files likely to change

- `rules/src/personas/types.ts`, `results.ts`, `messages.ts`; `messages.test.ts`,
  `results.test.ts`, `scenarios.test.ts` (R1, R3)
- `frontend/src/pages/FormConnectionEditor/TestStep/ResultTable.tsx` (→ `ResultList.tsx`),
  `ResultRow.tsx`, `MemberRows.tsx`, `ResultSection.tsx`, `TestDayLine.tsx`, `index.tsx`,
  `constants.ts`, `types.ts` (R1–R3)
- `frontend/src/components/RuleRow/RuleMessage.tsx`, `types.ts`, `constants.ts` (the `hanging`
  option, the shared `notShownInGroup`) and `RulesStep/constants.ts` / `GroupListItem.tsx`
  (read the moved copy) (R3)
- `docs/ARCHITECTURE.md` (R1); specs as listed above

### Tests to add or update

- `rules/src/personas/results.test.ts`:
  - Every row carries its item's message, the met ones too.
  - A reported group with its own message carries it, and its members carry `messageGroup`.
  - A group without a message has `null`, and its reported members carry their own.
  - An edited message shows without a new evaluation (current item).
  - `listHeading` and `messageColumn` are gone; `reported` and the heading's count are unchanged.
- `rules/src/personas/messages.test.ts`: `testDayLineOf()` without the full stop in EN and DE.
  Remove the `meetsHeadingOf` / `messageColumnOf` cases. Keep `outcomeNameOf`.
- `rules/src/personas/scenarios.test.ts:505-573`, `:655-660`, `:1334`: the new expectations.
- The frontend's Vitest has no DOM, so check the rows in the browser with the Figma workflow (a
  numeric table plus a screenshot):
  - frames 1, 2, 3, 9, 15 and Long rules at 1455 × 900;
  - 1024, 1023, 320px and 200% zoom;
  - German;
  - a variant with a group that has its own message (not drawn);
  - a citizen with "Not shared" licence data (frame 3);
  - frame 19 (no date on the regenerating citizen's skeleton, the date on another citizen's
    card);
  - the no-rules note.
- `npm run lint && npm test && npm run build` at the root.

## Risks & Considerations

- **The message means something else now.** "Message Mia reads" listed exactly what serviceBW
  receives. "Message for citizens:" lists each rule's message, and which ones Mia reads follows
  only from the red rows. For a member of a group with its own message, the row would suggest a
  message Mia never reads, unless it says so (Open Question 4). spec 004 SC-006 isn't touched:
  nothing leaves the interface.
- **Taller rows.** A row grows from about 56 to 99px (175 with a long message). Twelve rules
  are about 1200px in a 321px scroll area. The per-card scrolling (B2) and "failing first" keep
  the failing rows on top.
- **Accessibility.**
  - Removing the visible status keeps WCAG 1.4.1 only while the icons differ in shape. KERN's
    ◆ / ✓ / ? do, and the person_off / how_to_reg pair also does.
  - The hidden status keeps the outcome for screen readers.
  - The coloured names pass 4.5:1.
  - Check that the list's semantics (`ul` / `li`) and the reading order (name, status, sentence,
    message) come through in the accessibility tree.
- **The unapproved icons.** The frames' person icons are marked "Preview candidate, not
  approved". Adopting them now would change the chips too and add assets that may be withdrawn.
- **The skeleton no longer matches the rows.** Frames 18 and 19 keep the old two-column bars, so
  the skeleton and the loaded card differ in layout. That's as drawn; tell the designer.
- **The date during one citizen's regeneration.** Today the line stays above the tabs. With the
  date in the card, the regenerating citizen's skeleton card has none (frame 19), while the other
  citizens' cards do.
- **German widths.** "Nachricht für Bürgerinnen und Bürger:" beside the message, and the longer
  German date line ("Getestet, als würden die Daten heute geteilt: 19.11.2026", about 380px) in
  the 48px head: neither is drawn. Check that the head wraps without overflowing, and let it
  grow past 48 if the date wraps.
- **B2's scroll areas.** The redraw keeps `CardScrollArea` and its region name, the `h2`'s id.
  Only the rows inside change, as v5-ui-fixes' risk "B2 and the out-of-scope redraw" asked.
- **Repository state.** The checkout's `.git` points to another machine's path, so git commands
  fail.

## Open Questions

1. [NEEDS CLARIFICATION: **Tint.** The report says "failing rows tinted", but the frames draw no
   fill. Frame 1 Rule 01 `7599:55832`, frame 15 Rule 07 `7599:57665` and Long rules Rule 02
   `7644:65780` have only the 1px bottom border. Did "tinted" mean the red name? Default: as
   drawn, no tint, and members untinted too.]
2. [NEEDS CLARIFICATION: **Icons.** Adopt the Material "person_off" / "how_to_reg" (Figma: "Preview
   candidate, not approved") for the rows, and with them for the chips? Default: keep KERN's ◆ /
   ✓ / ? (spec 008 design-notes `:171-172`) until the designer approves them.]
3. [NEEDS CLARIFICATION: **"Couldn't be checked".** Frame 3 draws Yusuf's rules on an unshared
   licence as not met, which spec 004 F8 rejected. Default: keep F8. The ? icon in muted, the name
   in `layout-text-default`, and "Couldn't be checked" as visible small muted text after the name.
   That's the one status that stays visible, because nothing else says the data was missing.
   Alternatives: hidden as the others, or drawn as not met.]
4. [NEEDS CLARIFICATION: **Members of a group with its own message.** Default: the Rules step's
   "Not shown while this rule is in <group>. Citizens see the group message instead." in place of
   their message. Alternative: no message line on such members.]
5. [NEEDS CLARIFICATION: **The no-rules note.** Frames 11–13 were archived today ("a variant always
   has rules"), but an empty variant still exists in the app. Default: keep the note (004-S8.6.8)
   under the new head with the date.]
