# Bug Verification: "Group with other rules" breaks onto two centred lines in the rule's ⋯ menu

- **Slug**: group-option-alignment
- **Tested**: 2026-10-27
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The original symptom is gone. I checked this end to end in the real Rules step of the create
wizard, with a signed-in user and the backend running. On a wide window, every row of the rule,
inherited-rule, group and variant menus sits on one line at x = 45 in a 40 px row, and "Reset to"
followed by a one-word variant name wraps left-aligned inside the menu. The static checks pass.

The wider menu causes one **regression at 320 px**. For a rule inside a group, the 248 px menu no
longer fits beside its ⋯, though the old 220 px menu did. It falls back to the `full` placement,
and that path is broken for rules because of an existing bug: the menu opens **18 px wide**, with
a few letters per line (`test-320-nested-rule-menu.png`).

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), rule menu | Rules step of the create wizard, Chromium 1455 × 900, two rules on one level, ⋯ of Rule 01 | pass | "Group with other rules": 40 px, 1 line, x = 45, `text-align: left`. Menu is 248 px |
| Inherited rule's menu | Variant "Students" based on the main variant, ⋯ of the inherited Rule 01 | pass | "Remove from this variant": 40 px, 1 line, x = 45, right edge 228.6 |
| Long main variant name | Main variant renamed "Landesverwaltungsstandardvariante", Rule 01 changed in "Students" | pass | "Reset to …": 88 px, 3 lines, all at x = 45, right edge 228 (inside 231), `scrollWidth` = `clientWidth` = 230 (was 304 / 202), icon beside the first line (17 / 10) |
| Group menu with an error message | Rule 01 and 02 grouped, error message added, ⋯ of Group 01 | pass | "Remove error message": 40 px, 1 line, x = 45, right edge 211.6 |
| Variant menu (`BranchMenu`) | ⋯ of "Students" | pass | 248 px, `right-0`, rows 40 px |
| Font | `document.fonts.check('600 16px "Fira Sans"')` | pass | true. The 16 px against Figma's 14 px is "KERN 2.8 vs Revamp" (design-notes §9) |
| Placement at 200 % zoom (728 px window) | Rule, group and variant menus | pass | All open with `right-0` at 248 px, no horizontal scrolling (`scrollWidth` 713 = body width) |
| Placement at 320 px, top-level rule and group | ⋯ of a rule in the main variant, ⋯ of Group 01 | pass | Rule: `right-0`, 248 px, left edge 24. Group: `inset-x-16`, 239 px, rows 40 px |
| Placement at 320 px, **rule inside a group** | ⋯ of Rule 01 / Rule 02 inside Group 01 | **fail** | `inset-x-16`, but the menu is **18 px wide**: rows up to 928 px tall, a few letters per line. From 360 px on it opens with `end` at 248 px and works |
| Formatting | `npx prettier --check` on `RuleMenuItem.tsx`, `constants.ts` | pass | |
| Lint | `npm run lint` | pass | no findings |
| Type-check + build | `npm run build` (`tsc -b && vite build`) | pass | only the existing chunk-size warning |
| Unit tests | `npm test` | pass | 16 files, 518 tests |
| New / updated tests | – | not-run | none were added; layout only, and Vitest has no DOM (as planned in the assessment) |

Setup: the dev server on 5173 calls the relative `/api`, which isn't proxied locally. So the
browser forwarded `/api/*` to a backend started on port 3000 (`WORKER_ENABLED=false`, no
EUDIPLO). That backend ran against a scratch database, `bugtest_db`, with a test user. The backend
was stopped and the database dropped afterwards. Nothing was saved or published, and `template_db`
was not touched.

## Output Excerpts

```
Test Files  16 passed (16)
     Tests  518 passed (518)
✓ built in 1.09s
```

Rule menu in the variant, 1455 × 900 (px from the menu's left edge):

```
Group with other rules                      | h 40 | lines 1 | x 45 | right 209.5 | icon 17/10 | left | sw 230/230
Reset to Landesverwaltungsstandardvariante  | h 88 | lines 3 | x 45 | right 228.0 | icon 17/10 | left | sw 230/230
Remove from this variant                    | h 40 | lines 1 | x 45 | right 228.6 | icon 17/10 | left | sw 230/230
```

The regression. Window 320 px wide (`clientWidth` 305). The ⋯ of a rule inside a group has its
right edge at x = 248:

```
popupPlacement 'end' fits if  right − width ≥ 16:   248 − 220 = 28 → end (before the fix)
                                                    248 − 248 =  0 → full (after the fix)
full → menu: absolute inset-x-16, containing block DIV.relative W32 → menu width 18
```

The containing block is the wrapper in `RuleListItem.tsx:81`,
`popupWrapperClass(copying ? copyPlacement : null)`. It stays `relative` unless the copy popover
is open. So `ActionMenu` switches its own wrapper to `static`, but `inset-x-16` still measures
against this 32 px box instead of the rules card. `GroupListItem` has no such wrapper, so the group
menu spans the card correctly.

Screenshots in this folder:

- `test-rule-menu.png`: rule menu
- `test-inherited-rule-menu.png`: inherited rule's menu
- `test-reset-long-name.png`: "Reset to" with a long variant name
- `test-group-menu.png`: group menu
- `test-320-nested-rule-menu.png`: the regression
- `test-320-top-level-rule-menu.png`: a top-level rule at 320 px

## Residual Risks

- **The rule menu's `full` placement is broken.** Before the fix this happened only where 220 px
  didn't fit either, for example a rule in a sub-group on a narrow screen (not tested). The fix
  moves the limit by 28 px. Rules inside a group on a window of about 308–335 px now hit it too,
  including the 320 px reflow case (WCAG 1.4.10). `wrap-anywhere` also changes how it fails:
  words used to spill out of the 18 px box, and now the menu breaks them letter by letter into
  very tall rows.
- I didn't test rules in a sub-group (one level deeper). Their ⋯ sits further left, so they
  switch to `full` at wider windows.
- I checked the create wizard's Rules step only, not "Edit rules" on a saved connection's
  details. It's the same component (`RulesStep`), but a different route.
- The menu's corner radius is 4 px (`rounded-kern-default` in KERN 2.8), against Figma's 8 px.
  That is "KERN 2.8 vs Revamp", unrelated to this bug, and not changed.
- Only tested in Chromium on Linux.

## Recommendation

Hold. The reported symptom is fixed and verified end to end, but the 248 px width breaks the
menu of a rule inside a group at 320 px, through an existing bug in `RuleListItem.tsx:81`. Before
closing, fix that wrapper so the ⋯ menu's `full` placement is also positioned from the rules
card. For example, make the wrapper `static` while the action menu is open in `full`, as
`ActionMenu` already does for its own wrapper, or drop the extra positioned box. Then repeat the
320 px check for rules in a group and in a sub-group. You can record this as a follow-up in
`fix.md` and finish it with `/speckit-bug-fix`, or open it as its own bug with
`/speckit-bug-assess`. Either way, the 248 px decision itself still holds.
