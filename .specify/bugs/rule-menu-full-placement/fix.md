# Bug Fix: a nested rule's ⋯ menu opens 18 px wide when it spans the rules card

- **Slug**: rule-menu-full-placement
- **Fixed**: 2026-10-27
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

I applied the assessment's preferred fix. `popupWrapperClass()` now makes a popup's wrapper
`relative` only while its popup is open beside its control (`start` / `end`). It is `static`
when the popup is closed (`null`) and when it spans the page (`full`). The "Copy to variant"
wrapper in `RuleListItem` is therefore no longer positioned while its popover is closed. A rule's
⋯ menu in `full` is then positioned from the rules card again, not from that 32 px box.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/utils/popupPlacement.ts` | modified | `popupWrapperClass()`: `'relative'` only for `start` / `end`. Updated the `PopupPlacement` and `popupWrapperClass` doc comments |
| `frontend/src/utils/popupPlacement.test.ts` | updated test | Split the `popupWrapperClass` case into three: `full`, open beside the control, and closed |

`RuleListItem.tsx`, `ActionMenu.tsx`, `Connector` and `InfoTooltip` are unchanged. All of them
already pass `null` while closed.

## Diff Highlights

```ts
export function popupWrapperClass(placement: PopupPlacement | null): string {
  return placement === 'start' || placement === 'end' ? 'relative' : 'static';
}
```

## Tests Added or Updated

- `popupPlacement.test.ts` › `popupWrapperClass` › "lets a popup across the page be positioned
  from the box around its wrapper": `full` → `static`.
- … › "positions the wrapper of a popup open beside its control": `start` and `end` →
  `relative`.
- … › "doesn't let a closed popup's wrapper catch the popup inside it, as a rule's ⋯ menu":
  `null` → `static`. The old helper returned `'relative'` for `null`, so this case fails before
  the fix.

## Local Verification

- `npx vitest run src/utils/popupPlacement.test.ts` → 8 passed
- `npm test` → 16 files, 520 tests passed
- `npm run lint` → clean
- `npx prettier --check` on both files → clean
- `npx tsc -b` → no errors
- Manual checks: none in the browser. The assessment's DOM experiment (wrapper made
  non-positioned → menu at x 33–272, 239 px, 40 px rows) already showed the layout this change
  produces. The full layout verification list is for `/speckit-bug-test`.

## Deviations from Assessment

None.

## Follow-ups

- Run `/speckit-bug-test slug=rule-menu-full-placement` with the assessment's verification list:
  320 / 360 / 728 px, framed rows, group menus, "Copy to variant" on narrow and wide windows,
  connector and tooltip, and the 300–368 px sweep.
- The assessment leaves an optional question open: should the row overflow of a `changed` rule
  in a narrow sub-group ("Changed here" covering the name) get its own slug?
