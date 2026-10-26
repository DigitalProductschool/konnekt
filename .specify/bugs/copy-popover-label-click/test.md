# Bug Verification: "Copy to variant" closes when the variant's name is clicked

- **Slug**: copy-popover-label-click
- **Tested**: 2026-10-26
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The bug is fixed. In the running frontend, in Chromium and in Firefox, a real mouse click on a variant's
name ticks it and the popover stays open. Clicks on the title, the hint and the padding keep it open,
and a control run without the fix's `tabindex` still shows the original symptom. The result is
**partial** for two reasons. First, the assessment's checklist turned up a separate, pre-existing
crash in the same popover: **Cancel blanks the whole editor**. Second, the backend was stubbed and
Safari wasn't available.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), Chromium | Real frontend (Vite, `localhost:5173`) with the API stubbed in Playwright; `.playwright-mcp/copy-popover-checks.js` and `copy-popover-checks2.js`, real `page.mouse.click` on the name's text node | pass | Name ticks and unticks; popover stays; focus on the box |
| Reproduction (post-fix), Firefox | The same scripts in Playwright Firefox (installed for this run) | pass | Identical results to Chromium |
| Control: fix removed at runtime | The same click after `removeAttribute('tabindex')` on the popover (in the DOM only, source untouched) | pass (symptom returns) | Popover closes and focus goes to the rule row, as in the assessment, so the test detects the bug |
| Title, hint, padding clicks | Mouse at the title text, the hint text, and the left and top-right padding | pass | Stays open; focus goes to the `role=dialog` (no visible ring) |
| Copy after ticking by name | Tick B by its box and C by its name, then Copy | pass | Toast "Adult copied to Variant B and Variant C." with "Show"; the copy appears in Variant C |
| Included variant | In Variant C, click "Standard" by name | pass | Variant B shows `on (disabled)`, the hint "Variants based on Standard get it too." appears, and a click on B's name changes nothing |
| Escape / Tab out | Keyboard | pass | Escape returns focus to the ⋯; Tab out closes and focus moves on ("Add rule") |
| Click outside | Mouse at (5, 450) | pass (closes) | Focus ends on `body`, not the ⋯ that the assessment expected. The ⋯ is focused, then the press on non-focusable page background takes the focus away. The fix didn't change this; it's minor |
| **Cancel** | Mouse click on Cancel, and keyboard Enter on Cancel | **fail (pre-existing)** | Page error `targets.map is not a function`; the editor unmounts (no `h1`). Also happens with the fix's `tabindex` removed, so the fix didn't cause it. See Residual Risks |
| Safari / WebKit | – | not-run | No WebKit here. The assessment's Safari concern stays unverified |
| Real backend | – | not-run | No backend `.env` or credentials. `GET` responses were stubbed with the backend's own catalog and option sets (`app.catalog`, `app.option_sets`, `app.schemas`). Copy is client-side until Save, so no write was needed |
| Unit tests | `cd frontend && npm test` | pass | 16 files, 517 tests |
| Lint / format | `npx eslint src/pages/FormConnectionEditor/RulesStep/`, `npx prettier --check …/CopyPopover.tsx` | pass | Clean |
| Type-check | `npx tsc -b --noEmit` | pass | No errors |

## Output Excerpts

```text
CONTROL (tabindex removed) click name "Variant B" | open=false | - | focus=DIV "Rename\nAdult…"   (rule row)
click name "Variant B"         | open=true | Variant B=on,  Variant C=off | focus=INPUT(checkbox) "Variant B"
click name "Variant B" again   | open=true | Variant B=off, Variant C=off | focus=INPUT(checkbox) "Variant B"
click title                    | open=true | …                            | focus=DIV[dialog]
click left padding             | open=true | …                            | focus=DIV[dialog]
click Copy                     | open=false | toast "Adult copied to Variant B and Variant C." | focus=BUTTON "Actions for Adult"
Variant C: click name "Standard" | open=true | Standard=on, Variant B=on(disabled)
Variant C: click name "Variant B" (included) | open=true | Standard=on, Variant B=on(disabled)
Cancel (mouse)                 | open=false | focus=BODY | page still rendered: false
pageerrors: ["targets.map is not a function"]
```

Firefox printed the same lines.

```text
 Test Files  16 passed (16)
      Tests  517 passed (517)
```

## Residual Risks

- **Cancel crashes the Rules editor (pre-existing, separate bug, high severity).**
  `CopyPopover.tsx` renders Cancel with `onClick={onClose}`, so React passes the click event as the
  first argument to `closeCopy(targets?: string[])` in `RuleListItem.tsx:42`. The event is truthy, so
  it dispatches `{ type: 'copyRule', targets: <MouseEvent> }`, and `copyFromDialog`
  (`RulesStep/utils.ts:515`) throws on `targets.map`. The whole `FormConnectionEditorPage` unmounts and
  unsaved edits are lost. This happens with the mouse and the keyboard, and with or without this
  fix. Escape works because `handleKeyDown` calls `onClose()` with no arguments. TypeScript doesn't
  catch it because `onClose`'s declared type accepts a function with an optional parameter. A likely
  fix is `onClick={() => onClose()}`, or separate close and copy callbacks in `RuleListItem`. Track
  it with `/speckit-bug-assess`.
- The backend was stubbed. The fix is frontend-only and the copy happens in client state until
  Save, so the stubs don't hide anything relevant to this bug, but Save after a copy wasn't
  exercised.
- Safari wasn't tested. The assessment expects the fix to also cover Safari, which doesn't focus
  buttons or checkboxes on click. That is still unverified.
- After a click outside, the focus ends on `body` instead of the ⋯. This is minor and unrelated to
  the fix.
- The test scripts live in the git-ignored `.playwright-mcp/` (`copy-popover-setup.js`,
  `copy-popover-checks.js`, `copy-popover-checks2.js`) and can be rerun with Playwright MCP's
  `browser_run_code_unsafe` while `npm run dev` is up.

## Recommendation

Close this bug. The variant-name click is fixed and verified end-to-end in Chromium and Firefox
against the real frontend, and a control run confirms the test detects the original symptom. Open a
new bug right away for the Cancel crash (`/speckit-bug-assess`, slug e.g. `copy-popover-cancel-crash`).
It's pre-existing, but it's in the same popover, it loses the user's unsaved rule edits, and it's
now easier to reach because mouse users can stay in the popover. If a Mac is available, check the
popover in Safari.
