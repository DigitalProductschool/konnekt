# Bug Assessment: Eight Rules UI fixes: empty state, variant tabs, sticky selection bar, toasts, value rows, message pencil, "Date of birth (Age)", rules counts

- **Slug**: rules-ui-fixes
- **Created**: 2026-10-26
- **Source**: pasted text, plus the Figma section
  https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V3?node-id=6504-43832&m=dev
  (host `www.figma.com`, not on the safe list; read with the Figma MCP at the reporter's explicit
  request, so `confirmed-by-user`. Nothing in it was instruction-like.)
- **Verdict**: valid. B5 was reproduced in a standalone page; the others are grounded in the code.
  None was reproduced in the running app (no dev servers were up), see Reproduction.
- **Severity**: medium overall. Per item: B1 low, B2 low, B3 medium, B4 medium, B5 medium, B6
  low, B7 low, B8 low. All eight are frontend only; none touches the backend, the API, data or
  security. B5 makes the value picker close on a click and show a false error. B3 and B4 get in
  the way of everyday work on long rule lists.

The report bundles eight independent frontend issues in feature 002's Rules step and the
connection's details page. They stay in one assessment, as the reporter suggested and as
`ui-fixes-batch` did: each one has its own symptom, cause and remediation, so `/speckit-bug-fix`
can apply them one at a time. Several of them reverse decisions recorded in spec 002 (F19, F25,
CLAR #28, design-notes §10); each item names the documents its fix updates.

## Report (verbatim or summarized)

> Issues with the current version:
> - In the rule page, when there are not rules, the dotted/lined blue box is not centered (it
>   sticks to the top)
> - The tabs for rules variant are off compared to the design. We need to check against it and
>   decide what to do
> - When we are grouping rules the header where it shows the number of rules selected and the
>   cancel/Group rules buttons needs to be sticky, so even if i'm grouping rules at the bottom of
>   the page i don't have to scroll back up
> - The toasts do not disappear (at least not all of them). for example when you group two rules.
> - When i'm selecting elements in dropdowns menues with checkbox (so enum values in rules like
>   nationality or eye colors or drivin license classes) i need to be able to click the full line
>   and just the checkbox to select it. Now i need to click specifically the checkbox.
> - I can't modify error messages for rules. Is this normal?
> - The fields in the rules that says "Date of birth" should be renamed to "Date of birth (Age)".
>   Only in the rules, not in the documents
> - In the summary page, where also the links are, the summary of the rules when it's close
>   should show the number of rules that are added and the number of variants
>
> […] Look at figma, but at the same time the design uses a modification of kern that is more
> rounded and has a black narbar. WE DON'T DO THOSE, we just check the design of the issues that
> i reported and we fix those. Ignore everything else because the new design is not yet in the
> repo.

The Figma section "👩‍🔧 updated screen fixes" (6504:43832) holds the new design fixes. Its frames
cover B1 (1.1 6504:43833), B2 (11.1–11.7), B3 (12.1 6524:38299, 12.2 6524:38489, note
6524:38720), B4 (the toast in 11.6 6523:37941) and B8 (the collapsed Summary card in 10.11
6530:40675). No frame shows B5, B6 or B7. Its other frames (⋯ menu contents per context, the
overview, new icons, the connection ⋯ menu, "Variant · <name>" labels on result links) match none
of the reported issues and are out of scope. Screenshots of every node used here are in the
session's scratchpad `figma/` folder (they are not part of the repo).

Decisions taken with the reporter on 2026-10-26, before this assessment was written:

- **Slug**: `rules-ui-fixes`, one assessment for all eight items.
- **B1**: the box sits centred in a card that hugs it, as in Figma 1.1 (24px on every side). The
  card does not stretch to the window's height.
- **B2**: alignment fixes only. "Rename" keeps opening the "Edit variant" dialog, which also edits
  the description; Figma's inline rename (11.3, 11.4) is not built.
- **B4**: every toast times out after 6s (Figma's toast component: "Toast at the bottom centre,
  6 s"), paused while the pointer or the focus is on it. In the Rules step, Ctrl/Cmd+Z also
  undoes. Leaving a step clears its toasts.
- **B6**: the reporter can edit a rule's message by clicking its text, but tried the pencil on its
  right, which does nothing. The pencil must put the focus into the message.
- **B7, B8**: the defaults proposed in the session stand (no objection): "(Age)" wherever the rules
  UI names the field, but not inside messages or the server's wording; the counts read
  "3 variants · 6 rules", with Standard counted as a variant and every distinct rule once.

## Symptom

- **B1 Empty state at the top.** A variant without rules shows the dashed "No rules yet" box
  touching the card's top border, with 24px beside and below it. Expected: 24px on every side, so
  the box sits centred in the card (Figma 1.1).
- **B2 Variant tabs off.** The open tab's black underline stops before its ⋯, and "Add variant"'s
  label sits 2px off the line of the tab labels. Expected (Figma "Rules/Variant tab · fixes"
  6529:39174, "Add variant · aligned" 6542:39560): the underline spans the whole tab, ⋯ included,
  and "Add variant"'s label is on the same line as the tab labels.
- **B3 Selection bar scrolls away.** In select mode ("⋯ › Group with other rules") the bar with
  "N rules selected", Cancel and "Group rules" stays at the top of the rules card, so a user
  ticking rules further down has to scroll back to group them. Expected (note 6524:38720): the bar
  pins under the wizard's sticky head once the card's top scrolls past, and unpins when the user
  scrolls back up.
- **B4 Toasts stay.** Toasts with an action ("Undo" after deleting, grouping or ungrouping, "Show"
  after copying) never time out; they stay until the next change to the rules, and come back when
  the user returns to the step. Expected: every toast leaves after 6s.
- **B5 Value rows not clickable.** In the value picker of an enum rule (nationality, eye colour,
  driving licence classes), a click on the option's text closes the menu without ticking it and
  shows "Select at least one option."; only a click on the box itself ticks it. Expected: the whole
  row ticks the option, and the menu stays open.
- **B6 Message pencil does nothing.** The rule editor's error message, and a group's message in
  the list, show a pencil on their right; clicking it does nothing, so the message looks
  read-only. Clicking the text works. Expected: the pencil puts the focus into the message, ready
  to type.
- **B7 "Date of birth".** The rules UI names the field "Date of birth", as the documents step does.
  Expected: "Date of birth (Age)" in the rules only.
- **B8 No counts on the collapsed rules card.** On the details page, the closed "Rules" card shows
  only its title and buttons. Expected: the number of variants and rules, e.g.
  "3 variants · 6 rules" (Figma 10.11, 6530:40737).

## Reproduction

Not reproduced in the running app: no dev servers were up during the assessment, and these steps
come from the code and the report. B5 was reproduced in a standalone Chromium page that copies
`ValuesPicker`'s blur logic (scratchpad `label-blur.html`, `label-blur-fixed.html`, not part of
the repo).

1. **B1**: sign in, create a connection and add documents, open the Rules step with no rules: the
   dashed box touches the card's top border.
2. **B2**: on the Rules step, add a variant, open it: its underline ends before the ⋯. Compare the
   baseline of "Add variant" with the tab labels' (2px apart).
3. **B3**: add 15+ rules, ⋯ on one › "Group with other rules", scroll down and tick a rule: the
   bar with "Group rules" has scrolled out of view.
4. **B4**: group two rules: the "grouped" toast with "Undo" stays until the next change. Leave the
   step and come back: it is shown again.
5. **B5**: add a rule on Nationality, open the values menu, click a country's name: the menu closes,
   nothing is ticked, "Select at least one option." appears. Repro page log: `focusout
   related=null`, then the close; with the `relatedTarget &&` guard the option is ticked.
6. **B6**: open a rule's editor (⋯ › Edit rule) with a message, click the pencil at the field's
   right end: nothing happens. Same with a group's message in the list.
7. **B7**: add a rule, open the data menu: the PID's and the mDL's "Date of birth".
8. **B8**: open a published connection with rules: the closed Rules card shows no counts.

## Suspected Code Paths

All paths are under `frontend/src/` unless stated otherwise.

### B1 Empty state

- `pages/FormConnectionEditor/RulesStep/RulesEmptyState.tsx:10` — the wrapper is `px-24 pb-24`,
  with no top padding; its comment says "without space above it, as in U11 6348:40214", which the
  new frame 1.1 replaces (Empty wrap 6504:43840: padding 24 on all sides, hug height).
- `:11` — the dashed box (`py-40`) already matches Figma's Empty state 6504:43841.

### B2 Variant tabs

- `pages/FormConnectionEditor/RulesStep/BranchTab.tsx:24-55` — the underline (`span h-2 w-full`)
  is inside the column that holds only the name and its (i); `BranchMenu` (the ⋯) is a sibling of
  that column, so the underline can't reach under it.
- `RulesStep/ActionMenu.tsx:87` — the ⋯ trigger, `size-32`, top-aligned with the tab.
- `RulesStep/BranchTabs.tsx:34-56` — the row (`flex flex-wrap items-end gap-x-24 border-b`) and
  "Add variant" (`kern-btn--tertiary kern-btn--small` plus its (i)). With `items-end` and KERN's
  4px bottom margin on `.kern-btn`, the button's label centre is 24px above the border, the tab
  names' 22px.

### B3 Selection bar

- `pages/FormConnectionEditor/RulesStep/SelectionBar.tsx:15` — `bg-kern-layout-background-hued
  flex flex-wrap items-center gap-8 rounded-t-[7px] px-16 py-8`: no `sticky`, no z-index.
- `RulesStep/index.tsx:211-225` — the bar is a child of the rules card (`relative`), after the
  link strip. No ancestor up to the scroller has overflow, transform or containment, so
  `position: sticky` works there: the scroller is the body at `split:` (`components/WizardLayout/
  index.tsx:52`, `overflow-y-auto`) and the area below it (`:44`). The card is the bar's
  containing block, so it lets go at the card's bottom.
- `RulesStep/SelectBox.tsx:32` — the select boxes are `absolute`, and every `.kern-btn` is
  `position: relative`, so a sticky bar without a z-index is painted under them.
- `components/UserMenu/index.tsx:91` — the user menu is `z-10`; popups (⋯, connector, copy,
  tooltips, pickers) are `z-20`.
- Precedent: `pages/FormConnectionEditor/DocumentPicker.tsx:21` (`lg:sticky lg:top-0`).

### B4 Toasts

- `components/Toast/ToastMessage.tsx:18-26` — `held = holdAction && toast.actionLabel !==
  undefined` skips the 6s timer (`TOAST_DURATION_MS`, `components/Toast/constants.ts`); hover and
  focus pause it (`:30-33`).
- `pages/FormConnectionEditor/index.tsx:497-502` — the Rules step passes `holdAction`.
- `RulesStep/utils.ts:417-427` (`changed()`) — the only place that drops a held toast and its
  `undo`; toasts with "Undo" are set at `:463-481` (deleted), `:755-793` (grouped, ungrouped) and
  with "Show" at `:514-547` (copied).
- `components/Toast/types.ts:12-17` — the doc comment of `holdAction`.
- `specs/002-connection-rules/design-notes.md:508-510` (§10 "Timing") — records the hold, for WCAG
  2.2.1.
- `goToStep` in `pages/FormConnectionEditor/utils.ts` doesn't clear `rules.toast` or
  `state.toast`, so a held toast comes back on return, and the documents step's toast gets a new
  6s.

### B5 Value rows

- `pages/FormConnectionEditor/RulesStep/RuleEditor/ValuesPicker.tsx:102-106` — `handleBlur`
  closes the menu when `relatedTarget` is outside the container, and `contains(null)` is false.
  Pressing the mouse on the label's text (not focusable) blurs the focused checkbox or search
  field with `relatedTarget === null`, so the menu closes on mousedown and the click never lands.
  `closeMenu` also marks the values touched, hence "Select at least one option." (`RuleEditor/
  utils.ts`).
- `RuleEditor/ValueOptionItem.tsx:19-29` — the row is already a full-width `<label>` around the
  `<input>` with `cursor-pointer`; the markup is fine.
- `RulesStep/ChoiceMenu.tsx:94-99`, `RulesStep/CopyPopover.tsx:58-63` — the same handler with the
  guard on a non-null `relatedTarget`; `CopyTargetItem`'s identical rows work.

### B6 Message pencil

- `pages/FormConnectionEditor/RulesStep/RuleEditor/MessageField.tsx` (end of the component) — the
  pencil is a `span aria-hidden="true"` beside the `<textarea>`, with no handler; the field's
  padding around the textarea is dead too.
- `components/GroupFrame/GroupMessage.tsx:40-43` — the same decorative pencil beside the group's
  textarea (in the `field` branch; the read-only branch is used on the details page).
- For contrast, `RuleEditor/NameRow.tsx:22-28` and `RulesStep/ItemName.tsx:84-88` put their
  pencils inside a button, which works.
- The message itself is editable as intended (FR-004 `specs/002-connection-rules/spec.md:431-434`,
  `contracts/ui-screens.md:100`); the backend stores it verbatim (`backend/app/schemas.py:206`,
  `backend/app/services/rules.py:424-433`).

### B7 "Date of birth"

- The label comes from `backend/app/catalog.py:121` (PID `birthdate`) and `:185` (mDL
  `birth_date`), both `date_of_birth=True`, through `/api/document-types` and
  `FormConnection.documents`.
- Where the rules UI shows it: the data menu's choices and its search
  (`RulesStep/RuleEditor/utils.ts:131-135`), the data picker's chosen value
  (`RuleEditor/index.tsx:252`), the statements (`utils/rules/statements.ts:43-54`,
  `dataOfResolved`), which the rule rows, the details' `SummaryItem.tsx` and the delete dialog
  (`RulesStep/RulesDialogs.tsx:34`) use. The check menu's section heading "Date of birth"
  (`RuleEditor/constants.ts:40`).
- Where it must stay: the missing-value hint (`RuleEditor/utils.ts:338-343`), the proposed message
  of from-now checks (`utils/rules/messages.ts:194-197`), the validation message `unknownPart`
  (`utils/rules/validation.ts:208`, the server's words at `backend/app/services/rules.py:540-542`),
  and the documents delivered to serviceBW (`backend/app/services/documents.py:83`).

### B8 Rules counts

- `pages/FormConnectionDetail/RulesSummary.tsx:36-43` — the title column holds only the h2;
  its comment (`:14-15`) records that the counts aren't built (F25). design-notes §7 says T043 had
  built "1 variant · 5 rules" and T077 removed it.
- The data is already on the page: `formConnection.branches` (`types/form-connections.ts:114`,
  `:138`) carries every branch's item tree.
- `utils/rules/tree.ts:458` (`countRules`) counts the rules inside groups and sub-groups one by
  one, not the groups, and skips removed items; `tree.ts:84` (`flattenItems`).
- `pages/FormConnectionDetail/DocumentsSummary.tsx:19` — the documents card's hint, the style to
  match; `DETAIL_COPY` in `pages/FormConnectionDetail/constants.ts:27` (`items`) is the
  pluralisation pattern.

## Root Cause Hypothesis

- **B1** (high): a deliberate choice from the old frame U11 (no top padding), which the new frame
  1.1 replaces.
- **B2** (high): the underline belongs to the name's column instead of the whole tab, and
  "Add variant" is aligned by its box's bottom edge, which includes KERN's margin, instead of by
  its label.
- **B3** (high): not a broken sticky; the bar was never sticky. F19 (`contracts/ui-screens.md:194`,
  `spec.md:73`) left Figma's sticky wizard bars unbuilt.
- **B4** (high): deliberate (design-notes §10): toasts with an action are held until the next
  change, so that the action can always be reached. Switching variants, opening an editor or a
  menu isn't a change, so the toast stays indefinitely.
- **B5** (high, reproduced): the blur handler treats a blur to nowhere (`relatedTarget === null`),
  which is what a mousedown on non-focusable text causes, as leaving the menu.
- **B6** (high): the pencils are decoration only; the reporter's expectation (and the pencils on
  names) say they are controls.
- **B7** (high): no rules-specific label exists; the rules UI shows the catalog's label, and CLAR
  2026-10-24 #28 (`spec.md:75`) settled on it.
- **B8** (high): not a bug; a missing feature that F25 and the Clarification at `spec.md:72`
  ("counters … No, left for later") deferred.

## Proposed Remediation

### B1 24px around the empty state

`RulesEmptyState.tsx:10`: `px-24 pb-24` → `p-24`, and update its comment to cite frame 1.1
(6504:43840). The card keeps hugging its content; nothing in the layout chain changes. Check that
the padding still reads right under the link strip and the switch note of a variant (24px under
them).

### B2 Underline under the whole tab, "Add variant" on the labels' line

- `BranchTab.tsx`: restructure the tab into a column: a row with the name, its (i) and, while
  open, the ⋯ (`BranchMenu`), then the 2px underline at full width under that row. The ⋯ stays a
  separate button after the tab button, not inside it (Figma's decision A: no control inside a
  tab; accessible name "Actions for <variant name>", already `variantMenuLabel`). Keep the 32px
  target without growing the 24px label row (for example a negative vertical margin on the
  trigger), so the tab stays 38px tall: 4 + 24 + 8 + 2.
- `BranchTabs.tsx`: move "Add variant" down so that its label's centre is 22px above the border,
  like the tab names (Figma "Add variant · aligned": a 48px frame with the 40px button placed at
  top 2). Measure it in the browser; don't guess the offset.
- Unchanged, and to list in the verification table as such: the tab labels stay KERN 2.8's
  `static-medium` (18px; Figma's 16px is Revamp, "KERN 2.8 vs Revamp"), the (i) keeps spec 001's
  light bubble (design-notes §4), the open tab stays wider than the others (Figma too), and the
  ⋯ menu stays as built (Rename and Delete; Standard Rename only, which already matches 11.2 and
  11.7). Figma's inline rename (11.3, 11.4) is not built (decision above).

### B3 Sticky selection bar

- `SelectionBar.tsx`: add `sticky top-0 z-1`. The z-index keeps the bar over the select boxes and
  the KERN buttons in the rows, and below the user menu (z-10) and the popups (z-20); a z-10 bar
  later in the DOM was checked in Chromium to paint over the user menu, because
  `container-type: size` makes no stacking context. (Alternative: `isolate` on `WizardLayout:44`
  and z-10.)
- The pinned state follows Figma's "Selection bar · pinned" (6524:38485): square corners and a 1px
  bottom border in `decorative-border-default` (Figma's raw #d0d8e6 is the border-level-1 value);
  the card's own side borders already frame it. Detect the pinned state with an
  `IntersectionObserver` on a 1px sentinel just above the bar, kept in the component's state; the
  resting state stays as built (top corners at 7px, no border).
- In a variant, the link strip stays in the card and scrolls away; only the bar pins (12.2).
- WCAG 2.4.11 (focus not obscured): give the rows and the select boxes that select mode focuses a
  `scroll-mt-*` at least as tall as the bar (64px, more where it wraps at 320px), so that keyboard
  focus never lands under it.

### B4 Every toast leaves after 6s

- `components/Toast/ToastMessage.tsx`, `types.ts`, `index.tsx`: remove `holdAction`. Every toast
  times out after `TOAST_DURATION_MS` (6s), paused while the pointer or the focus is on it, as
  today.
- `pages/FormConnectionEditor/index.tsx:497-502`: stop passing `holdAction`.
- Keep Undo reachable without a time limit: when the toast times out, drop the toast but keep
  `rules.undo` until the next change (`changed()`), and in the Rules step make Ctrl/Cmd+Z undo
  while `rules.undo` is set and the focus is not in a text field (where it keeps the browser's own
  undo). Check whether `dismissToast` currently clears `undo`/`showBranch` and split the two.
- `goToStep` (`pages/FormConnectionEditor/utils.ts`): clear `state.toast` and `rules.toast` when
  the step changes.
- Update design-notes §10 "Timing" and the doc comment at `components/Toast/types.ts:12-17` with
  the new rule and its date.

**Alternatives** (not chosen): longer timeouts for action toasts (10s); keeping the hold with a
close button (not in Figma).

### B5 Close the value menu only when the focus leaves for somewhere else

`ValuesPicker.tsx:102-106`: close only when `relatedTarget` is non-null and outside the container,
as `ChoiceMenu` and `CopyPopover` do. Clicks outside are still handled by the document
`pointerdown` listener (`:57-63`), Escape and Tab still close. Don't add an `onClick` on the row:
the label already toggles, and a second handler would toggle twice. Also check `ValuesPicker`'s
siblings in `RuleEditor/` for the same handler without the guard.

### B6 The pencil focuses the message

- `MessageField.tsx` and `GroupMessage.tsx` (editable branch): a mousedown anywhere in the field's
  box that isn't on the textarea (the pencil, the padding) focuses the textarea and puts the caret
  at the end of the text (`preventDefault`, then `focus()` and `setSelectionRange(length,
  length)`), with a pointer cursor on the pencil. The pencil stays `aria-hidden` and adds no tab
  stop: keyboard users already reach the textarea, and a button that only moves the focus would be
  a redundant control.
- The field then shows its focus ring (`has-[:focus-visible]`; a textarea matches
  `:focus-visible` after a click too), which is what makes it look editable. Verify that in the
  browser.

### B7 "Date of birth (Age)" in the rules only

Add `ruleFieldLabel(field)` (in `utils/rules/`, with its text in `utils/rules/constants.ts`) that
returns "Date of birth (Age)" for a field with `date_of_birth`, and its label otherwise. Use it in
the data menu and its search, the data picker's value, and the statements (`dataOfResolved`), so
the rule rows, the details page and the delete dialog follow. Rename the check menu's section
heading (`RuleEditor/constants.ts:40`) if it names the field (check what it heads first). Leave
`field.label` in messages, hints and validation, so the citizen-facing messages and the server's
words stay as they are; the backend doesn't change.

**Alternative** (not chosen): override the label when the rules catalog is built
(`requestedRuleDocuments`, `ruleDocumentsOf`): it would produce "the date of birth (age) of your
personal ID" in messages and break the server's wording.

### B8 "3 variants · 6 rules" on the closed card

- A pure helper in `pages/FormConnectionDetail/utils.ts` that returns the variant count
  (`branches.length`; Standard counts, as in the tab list and in the removed "1 variant" hint) and
  the rule count: the distinct identifiers of the countable rules (as `countRules` counts them:
  grouped rules one by one, groups and removed items not) across all branches. Inherited rules keep
  the main branch's identifiers (`specs/002-connection-rules/data-model.md:208`), so summing the
  branches would count them twice.
- `DETAIL_COPY`: a pluralised `rulesCounts(variants, rules)` built like `items`, joined with " · "
  (Figma 10.11's separator), e.g. "1 variant · 1 rule", "3 variants · 6 rules", "1 variant · 0
  rules".
- `RulesSummary.tsx`: a `<p>` under the h2, styled like the documents hint
  (`DocumentsSummary.tsx:19`; Figma: Regular 14/24, `layout-text-muted`), shown while the card is
  closed (`hidden={open}`), as the report asks. Update the component's comment.
- Not built (out of scope, as before): "Download PDF" and the activity card.

### Files likely to change

- `frontend/src/pages/FormConnectionEditor/RulesStep/RulesEmptyState.tsx` (B1)
- `frontend/src/pages/FormConnectionEditor/RulesStep/BranchTab.tsx`, `BranchTabs.tsx`, maybe
  `ActionMenu.tsx` (B2)
- `frontend/src/pages/FormConnectionEditor/RulesStep/SelectionBar.tsx`, `SelectBox.tsx`, the rows
  select mode focuses (B3)
- `frontend/src/components/Toast/ToastMessage.tsx`, `index.tsx`, `types.ts`;
  `frontend/src/pages/FormConnectionEditor/index.tsx`, `utils.ts`; `RulesStep/utils.ts`,
  `RulesStep/index.tsx` (Ctrl/Cmd+Z) (B4)
- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/ValuesPicker.tsx` (B5)
- `frontend/src/pages/FormConnectionEditor/RulesStep/RuleEditor/MessageField.tsx`,
  `frontend/src/components/GroupFrame/GroupMessage.tsx` (B6)
- `frontend/src/utils/rules/statements.ts`, `utils/rules/constants.ts`, a new helper in
  `utils/rules/`, `RulesStep/RuleEditor/utils.ts`, `RuleEditor/index.tsx`,
  `RuleEditor/constants.ts` (B7)
- `frontend/src/pages/FormConnectionDetail/RulesSummary.tsx`, `utils.ts`, `constants.ts` (B8)
- Docs: `specs/002-connection-rules/design-notes.md` (§2 empty state, §4 tabs, §5 select mode, §7
  details, §10 toasts, §11), `contracts/ui-screens.md` (F19 at :194, F25 at :305 and :366, F1
  rows at :63, :216, :259, :281, :300), `spec.md` (new dated Clarifications for F19, F25 at :72
  and CLAR #28 at :75; FR-005's example), `figma-audit/report.md` (:64, :127)

### Tests to add or update

The frontend's Vitest setup has no DOM (`frontend/vite.config.ts:8-11`), so B1, B2, B3, B5 and B6
are checked in the browser (see Risks). The others:

- **B4**: `RulesStep/utils.test.ts`: dismissing a toast keeps `undo` until the next change; the
  next change drops it. `FormConnectionEditor/utils.test.ts`: `goToStep` clears both toasts. If
  the timer policy moves into a pure `components/Toast/utils.ts`, a `utils.test.ts` beside it.
- **B7**: `utils/rules/statements.test.ts` (`:22-47`, `:240`, `:312`, `:334`) for the PID and the
  mDL, `RulesStep/utils.test.ts:514-516`, a case for the data menu's sections and search; a test
  that messages and validation still say "date of birth" (`validation.test.ts:280-281` stays).
  `FormConnectionEditor/utils.test.ts:224,292` ("Stop requesting Date of birth?") stay unchanged.
- **B8**: a new `describe` in `pages/FormConnectionDetail/utils.test.ts` with fixtures from
  `utils/rules/testData.ts`: grouped rules, a removed rule, a variant based on Standard with
  inherited, changed and added rules (counted once each), an empty connection, singular forms.

## Risks & Considerations

- **Browser checks.** B1, B2, B3, B5 and B6 have no unit tests. Verify each in the running app
  with the project's Figma workflow (numeric table plus screenshot): at 1455×900 (`split:`),
  1455×600, 320px and 200% zoom. B3 also with the user menu open while the bar is pinned, a long
  variant text that wraps the bar, and keyboard focus moving under it. B5 also in Firefox.
- **B2 tab row wraps.** Long names wrap the tabs; check that the restructured tab still wraps,
  that the underline still spans the whole tab, and that the ⋯ menu still opens under the tab
  (`placementFrom()`).
- **B3 and F19.** F19 ruled out Figma's sticky wizard bars; the sticky selection bar is a new,
  narrower decision. Record it (design-notes §5, `ui-screens.md`), or a later coverage check will
  count it as a breach of F19.
- **B4 and WCAG 2.2.1.** The hold existed so that Undo could always be reached. Ctrl/Cmd+Z and
  keeping `undo` after the toast leaves keep that true; record the reasoning in §10. "Show" after
  a copy has no shortcut; the variant's tab is the way there after 6s.
- **B4 Ctrl/Cmd+Z scope.** Inside text fields the shortcut must keep the browser's own undo.
- **B5 in Safari.** Safari doesn't focus a clicked checkbox, so even a click on the box may close
  the menu there today; the guard fixes both.
- **B7 consistency.** The rule row then says "Date of birth (Age)" while its message (generated or
  written) says "date of birth". That is intended: the message is for the citizen.
- **B8 count semantics.** Distinct identifiers count a rule that a variant changes once, and a
  rule a variant removes still once (it is in Standard). If the reporter expects a sum per variant,
  the helper changes in one place.
- **Out of scope, noted.** Figma also restyles the toast (green "success" type with a check icon,
  280×56, 14/24 text, 32px above the action bar) and adds inline tab rename, new ⋯ menu contents,
  "Download PDF", the activity card and "Variant · <name>" labels on result links. None of these
  was reported; they are left for when the new design comes into the repo.
- **Repository state.** The checkout's `.git` points to another machine's path, so git commands
  fail; the fixes can't be committed until that is repaired.

## Open Questions

- [NEEDS CLARIFICATION: B7 — does the check menu's section heading "Date of birth"
  (`RuleEditor/constants.ts:40`) name the field, and so take "(Age)"? Default: yes if it names the
  field; decide in the fix after looking at it.]
- [NEEDS CLARIFICATION: B8 — "0 rules" or "No rules" for a connection without rules? Default:
  "0 rules", following the `items` pattern.]
