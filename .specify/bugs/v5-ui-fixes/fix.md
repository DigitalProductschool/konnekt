# Bug Fix: Eight V5 UI fixes (step 1 widths, per-card scrolling, version strip, document ⋯, date mask, no "No findings." ⓘ, 2px input ring, no "Cancel" on log-out)

- **Slug**: v5-ui-fixes
- **Fixed**: 2026-11-18
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

All eight items are applied as the assessment proposed, in the frontend only, with the specs
(008, 010, 011) and `docs/ARCHITECTURE.md` updated to match. Lint, the unit tests and the build
pass. Nothing was checked in a browser yet: no dev servers were running. The assessment's
browser checks are the next step (`/speckit-bug-test`).

## Changes

All code paths are under `frontend/src/`.

| File | Change | Notes |
|------|--------|-------|
| `pages/FormConnectionEditor/ConnectionStep.tsx` | modified | B1: the two `max-w-726` wrappers removed, so the fields fill the card's column (V5 `7609:62173`). |
| `pages/FormConnectionEditor/TestStep/CardScrollArea.tsx` | added | B2: a card's rows under its head. `role="region"` named by the card's heading, `tabIndex={0}`. |
| `pages/FormConnectionEditor/TestStep/constants.ts` | modified | B2: `CARD_SCROLL_CLASSES` added; `PANEL_CONTENT_CLASSES` gets `wizard-pinned:lg:min-h-0`; comments rewritten. B5: `DATE_ENTRY_DIGITS`. |
| `pages/FormConnectionEditor/TestStep/PersonaPanel.tsx`, `ResultSection.tsx` | modified | B2: `PersonaData` and `ResultTable` (or the no-rules note) wrapped in `CardScrollArea`. The result heading gets an id (`useId()`). |
| `pages/FormConnectionEditor/TestStep/index.tsx` | modified | B2: comments only (the reversed CLAR #31 (c)). |
| `pages/FormConnectionEditor/TestStep/types.ts` | modified | B2: `CardScrollAreaProps`. B5: `DateEntry`. |
| `pages/FormConnectionDetail/DetailAccordion.tsx` | modified | B3: the `actions` slot becomes `strip`, under the header row. The header is `px-24 py-16` with a strip (`p-24` without). The open body starts 8px lower. |
| `pages/FormConnectionDetail/PdfDownload.tsx` | modified | B3: renders the strip; the code is `font-semibold`; the button is compact. |
| `pages/FormConnectionDetail/constants.ts` | modified | B3: `PDF_STRIP_CLASSES`, `PDF_BUTTON_CLASSES`. |
| `pages/FormConnectionDetail/RulesSummary.tsx`, `types.ts` | modified | B3: passes `strip`; prop and comment renamed. |
| `pages/FormConnectionEditor/DocumentsStep/DocumentListItem.tsx` | modified | B4: trash removed. The ⋯ is on every row, named "Actions for <document>". The error icon sits before the ⋯. |
| `pages/FormConnectionEditor/DocumentsStep/utils.ts` | modified | B4: `documentMenuOf()` added; `moveTargetsOf()` loses `hasMoveMenu`. |
| `pages/FormConnectionEditor/DocumentsStep/constants.ts`, `types.ts` | modified | B4: `documentActionsLabel` (EN/DE) replaces `moveDocumentLabel`; `removeDocumentLabel` removed; `REMOVE_ICON` and `DocumentMenuCopy` added; trash comments updated. |
| `pages/FormConnectionEditor/DocumentsStep/utils.test.ts` | updated test | B4: `moveTargetsOf` updated, `documentMenuOf` added. |
| `pages/FormConnectionEditor/TestStep/utils.ts` | modified | B5: `dateEntryOf()` with the four rules, plus private helpers. |
| `pages/FormConnectionEditor/TestStep/ValueField.tsx` | modified | B5: dates go through `dateEntryOf()`; the caret is restored in `useLayoutEffect`. |
| `pages/FormConnectionEditor/TestStep/utils.test.ts` | added tests | B5: `describe('dateEntryOf')`. |
| `pages/FormConnectionEditor/RulesStep/BranchTab.tsx` | modified | B6: stops passing `noFindingsInfo`; comment updated. |
| `components/BranchName/index.tsx`, `types.ts`, `constants.ts` | modified | B6: `noFindingsInfo` and the `noFindings` copy removed. |
| `pages/FormConnectionEditor/TestStep/VariantTab.tsx` | modified | B6: comment only. |
| `index.css` | modified | B7: `.kern-form-input__input:focus, .kern-form-input__select:focus { outline-width: var(--kern-metric-border-width-default); }` (2px), after KERN's import, beside the other focus overrides. |
| `pages/FormConnectionEditor/RulesStep/ItemName.tsx` (rename input), `RulesStep/RuleEditor/ValueInput.tsx`, `components/MenuSearchField/index.tsx` (menu variant), `components/ValuesPicker/index.tsx` (field trigger) | modified | B7: `focus-visible:outline-4` → `outline-2`. |
| `RulesStep/RuleEditor/MessageField.tsx`, `components/GroupFrame/GroupMessage.tsx` | modified | B7: `has-[:focus-visible]:outline-4` → `outline-2`. |
| `pages/FormConnectionEditor/index.tsx` | modified | B8: `cancelLabel` removed from the log-out dialog; flow comment updated. B4: removal comments. |
| `pages/FormConnectionEditor/constants.ts` | modified | B8: `cancel` removed from `LEAVE_COPY` (EN/DE). |
| `pages/FormConnectionEditor/leaveFlow.ts` | modified | B8: comment only. |
| `docs/ARCHITECTURE.md` | modified | Scope expansion: the `strip` slot (2 places) and the documents ⋯'s "Remove document". |
| `specs/008-kern-revamp-redesign/` | docs | `spec.md` Session 2026-11-18 #1 (B2), #2 (B6) and #3 (B8), with the old CLARs struck and FR-026, FR-041 and FR-043 reworded. Also `figma-audit/report.md`, `figma-audit/requirements.md`, `contracts/ui-screens.md`, `data-model.md`, `quickstart.md`, and `design-notes.md` (B2, B4, B6, B7 and B8 rows, plus a §8 History bullet). |
| `specs/010-revamp-backend-gaps/` | docs | `spec.md` Session 2026-11-18 (B4), with #16 struck and FR-047 and the edge case reworded. Also `design-notes.md` (W13 rows, §4.2, §1), `contracts/ui-screens.md`, `contracts/copy.md` §5, `quickstart.md` V9.4 and `figma-audit/report.md`. |
| `specs/011-connection-pdf/` | docs | `spec.md` Session 2026-11-18 (B3), with FR-001, FR-032, US1 and the narrow edge case reworded. Also `design-notes.md` (§1, §2, §3, a new §7.1 "to verify" table, D4, D8, §9.2, §9.3, §9.4), `quickstart.md`, `contracts/pdf-worker.md`, `plan.md`, a note in `tasks.md`, and `pr.md`. |

## Diff Highlights (optional)

B2: the scroll area, active only where the step header is pinned and the cards are side by side:

```ts
export const CARD_SCROLL_CLASSES =
  'wizard-pinned:lg:min-h-0 wizard-pinned:lg:flex-1 wizard-pinned:lg:overflow-y-auto wizard-pinned:lg:overflow-x-clip wizard-pinned:lg:-mr-16 wizard-pinned:lg:pr-16 rounded-kern-small focus-visible:outline-kern-action-focus-default! relative focus-visible:outline-4! focus-visible:outline-offset-2! [&:focus:not(:focus-visible)]:outline-none!';
```

B3: the strip and the compact button, measured from `I7603:61522;7536:58926` with
`get_design_context`:

```ts
export const PDF_STRIP_CLASSES =
  'bg-kern-layout-background-hued rounded-kern-default flex flex-wrap items-center justify-between gap-8 py-6 pr-8 pl-16';
export const PDF_BUTTON_CLASSES =
  'kern-btn kern-btn--secondary kern-btn--small narrow:px-7! my-0! min-h-32! max-w-full px-11!';
```

B5: `ValueField` masks only dates, and restores the caret only when the masked text differs from
what the browser holds:

```ts
const entry = dateEntryOf(text, typed, event.target.selectionStart ?? typed.length,
  inputType === 'deleteContentForward' ? 'forward' : 'backward');
caretRef.current = entry.text === typed || entry.text === text ? null : entry.caret;
onChange(entry.text);
```

B7:

```css
.kern-form-input__input:focus,
.kern-form-input__select:focus {
  outline-width: var(--kern-metric-border-width-default);
}
```

## Tests Added or Updated

- `TestStep/utils.test.ts`, `describe('dateEntryOf …')`: 13 cases. They cover every row of the
  assessment's table with the caret:
  - typing digit by digit;
  - a 9th digit;
  - pasting with and without dots;
  - a typed dot after the day or the month;
  - Backspace over a trailing dot;
  - Backspace and Delete over an inner dot (then `9` → `09.07.2007`);
  - a deletion without a direction;
  - edits in the middle (`08.1.2007` → `08.12.2007`, `081.07.2007`);
  - the caret past an added dot;
  - clearing;
  - ISO, letters, a leading space and a 4th part left as typed.

  A round trip checks that masked results parse with `parseDisplayDate` (EN and DE).
- `DocumentsStep/utils.test.ts`, `describe('moveTargetsOf …')`: updated for the dropped
  `hasMoveMenu`.
- `DocumentsStep/utils.test.ts`, `describe('documentMenuOf …')`: 5 cases.
  - The entries for the first, middle and last of three rows, and a single row (only "Remove
    document").
  - The removal is red, after the divider, with `kern-icon--delete`; the moves are plain.
  - The callbacks move to the row above or below and remove.
  - The German labels.
- B1, B2, B3, B6, B7 and B8: no unit test, because the frontend's Vitest has no DOM, as the
  assessment says. `leaveFlow.test.ts` still covers the `cancel` answer that the ×, Escape and
  the scrim give.

## Local Verification

- `npm run lint` (root): one `simple-import-sort` error in `DocumentsStep/utils.test.ts`, fixed
  with `eslint --fix`, then clean.
- `npm test` (root): all passed. The three suites ran 46 files / 2675 tests, 46 / 2010 and
  15 / 513.
- `npm run build` (root): passed. The only warning is the chunk-size one, which was already there.
- The built CSS (`frontend/dist/assets/*.css`) has the stacked variants as nested media queries
  (`wizard-pinned:lg:*`), and has `min-h-32!`, `px-11!`, `my-0!`, `outline-2` and the
  `.kern-form-input__input:focus, .kern-form-input__select:focus` rule.
- Figma (MCP, read-only, file `s8mU9oJDq3411e8bxMjQO9`):
  - `get_metadata` on `7603:61521` (EN 832 open), `7603:61522` (the header instance) and
    `7603:61548` (DE 640 open).
  - `get_design_context` on the strip `I7603:61522;7536:58926`.
  - The Figma `icon-download-small` asset was downloaded to the scratchpad and compared with
    `assets/icons/download-action.svg`: same 24px box, the same glyph (4–20) and the same
    #1D56F0.
- No backend change, so no Ruff, mypy or pytest run.
- Not done: any browser check. No dev servers were up, and the stack (backend, the DB on 5435,
  sign-in) wasn't started.

## Deviations from Assessment

- **B3 glyph size**: 24px, not the assessment's "20px glyph (`size-20`)". Figma's design context
  draws `icon-download-small` as a 24px box holding the same 16px glyph as `download-action.svg`,
  so the existing asset stays at `size-24`.
- **B3 button metrics** (the assessment said "measure, don't guess"):
  - The frame has 12px at the sides including the 1px border, so `px-11!` (`narrow:px-7!` stays).
  - KERN small's label padding of 4/8 gives the 32px height.
  - `my-0!` drops KERN small's 4px margins, so the strip is 6 + 32 + 6 = 44.
- **B3 open question resolved**: in `7603:61521` the header is 140 and the body's first line sits
  8px into the body, 24px under the strip. The fix wraps the children in `pt-8` inside the clipped
  body when a strip is present; padding on the body itself would hold the closed card open by
  8px. The open toggle reads "Hide summary" (144 × 48), the existing copy.
- **B3 header row**: the heading block no longer has `basis-200`, as the assessment asked, so it
  behaves like the Links and Activity cards. Long counts make the toggle wrap under the heading
  instead of the counts wrapping. Figma's DE 640 frame keeps one row (header 140).
- **B2 panel overflow**: the panel keeps `wizard-pinned:overflow-y-auto` at every pinned width,
  not `wizard-pinned:max-lg:…`.
  - With loaded cards side by side, the content box is held to the panel's height, so the panel
    never overflows and doesn't scroll, which is the assessment's intent.
  - The class stays as a fallback for the skeleton cards (`min-h-317`) in a short window, which
    would otherwise be clipped by the section's `overflow-clip`.
- **B2 heading ids**: the result heading's id comes from `useId()`, not a new `ELEMENT_IDS`
  entry. `PersonaHead` was not changed, because its heading already had
  `ELEMENT_IDS.personaHeading`.
- **B2 scrollbar**: `-mr-16 pr-16`, as proposed.
  - Overlay scrollbars: the rows keep their width and the bar sits in the card's right padding.
  - Classic 15px scrollbars: the bar sits in the padding and the rows lose 15px.
  - Both are recorded as a difference in the 008 docs.
- **B4 helper**: the entries come from a new pure `documentMenuOf()` (tested). `moveTargetsOf()`
  stays, without `hasMoveMenu`. The menu entry reuses the existing `removeDocument` copy ("Remove
  document" / "Dokument entfernen"), the open question's default.
- **B4 error icon**: it is now a 24px icon directly before the ⋯. It used to sit at the right of
  the trash's 32px box, so its position is the same but the name gains 8px in the error look.
- **Scope expansion**:
  - `docs/ARCHITECTURE.md` described `DetailAccordion`'s `actions` slot in two places and the
    documents ⋯ without the removal. Both are updated, following CLAUDE.md's documentation
    checklist.
  - The doc updates also touched spec files beyond the assessment's list where they stated
    current behaviour (listed in Changes):
    - 008: `data-model.md`, `quickstart.md`, `contracts/ui-screens.md` S12 and S13,
      `figma-audit/requirements.md` FR-026i and FR-026j;
    - 010: `contracts/`, `quickstart.md`, `figma-audit/report.md`;
    - 011: `contracts/pdf-worker.md`, `plan.md`, `tasks.md` (a note), `pr.md`.

## Follow-ups

- Run `/speckit-bug-test slug=v5-ui-fixes`: the assessment's browser checks.
  - Sizes: 1455 × 900, 1455 × 600, 1024 and 1023 wide, 320px, 200% zoom; Chromium and Firefox.
  - B2: each area scrolls with the keyboard; the ring; screen readers name the regions; a persona
    whose data fits shows no bar; the page doesn't scroll under the footer.
  - B3: EN and DE at 832 and 640, open and closed, on the published and the draft details; the
    §7.1 "to verify" table in spec 011's design-notes.
  - B5: the caret in Chromium, Firefox and, if possible, Safari or Android.
  - B6: the tab's height (38) and the ⋯ 4px after a tab without an icon.
  - B7: the error ring's 3:1.
  - B8: 480 × 232 in EN and DE.
- B2: the scroll areas take the focus at every size, as the assessment chose. Below `lg` they
  don't scroll, so the tab stop does nothing there. If that bothers anyone, make them focusable
  only where they scroll (a media-query hook).
- Stale wording left alone:
  - Spec 008 `spec.md` CLAR #14 (b) and `contracts/ui-screens.md` S8 still describe the documents
    step's inline trash. Spec 008's contract never picked up spec 010's documents step.
  - `specs/010-revamp-backend-gaps/figma-audit/requirements.md` FR-047e ("one document, no menu")
    stays stale until the next `/figma-audit` regenerates it.
  - `components/WizardLayout/index.tsx:99` still says "the test step's scrolling panel". That is
    still true below `lg`.
- `docs/ARCHITECTURE.md` already differed from Prettier's output in many unrelated lines. It was
  not reformatted.
- This checkout's `.git` points to another machine's path, so none of this is committed yet.
