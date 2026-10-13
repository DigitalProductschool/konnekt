# Bug Verification: "Connection Portal" name and a left-aligned header brand on every page

- **Slug**: product-name-header
- **Tested**: 2026-10-13
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Neither symptom reproduces. Every screen now reads "Connection Portal", in the header and in the tab
title. The header's mark sits at x = 32, the name at x = 56 and the user menu at 1344–1408 on
every screen at 1440 px, which matches the fixed Figma exactly. The wizard's body and footer stay
on the centred 1120 px column, and build, lint and format checks still pass. The documents step
was not opened separately (see Residual Risks).

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), brand position | Vite dev server against a mock of the API, headless Chromium 155 driven over CDP, at a 1455 × 900 window (body 1440 px, as CLAUDE.md prescribes), `getBoundingClientRect` and `getComputedStyle` on the header | pass | `/login`, `/forgot-password`, `/`, `/get-started` (no connections), `/form-connections/new` and `/form-connections/:id` all show header padding 32px/32px, row x = 32 with no `max-width`, mark x = 32, y = 23.5 (16 × 16), name x = 56, y = 19.5 (131.2 × 24). Before the fix the wizard and details row was `mx-auto max-w-1120` (x = 160) |
| Wizard and details header against Figma | Same run | pass | Separator x = 203.2, title x = 220.2, user menu x = 1344 (64 × 36, y = 13.5), ending at 1408. Figma `2131:4385`/`2131:4628`: 203 / 220 / 1344, w 64, y 13.5 |
| Name text | Same run, and visual comparison of the header screenshots with Figma `2131:4628` and `2131:4385` | pass | Brand text "Connection Portal" on every screen; `document.fonts.check('600 16px "Fira Sans"')` is true. Screenshots match Figma's order and alignment: brand, separator, title, "Live" badge, then meta and the user menu at the right |
| Tab titles | `document.title` on each screen | pass | "Log in – Connection Portal", "Forgot password – …", "Your connections – …", "Create your first connection – …", "Create a connection – …", "Passenger transport licence – …" |
| Static `<title>` | `frontend/index.html` | pass | `<title>Connection Portal</title>` |
| Wide window | Details screen at a 1920 px body | pass | Brand stays at x = 32, user menu ends at 1888 (32 px from the right edge), as on the overview |
| Phone width | Details and new-connection screens at 375 px (body 360) | pass | Header padding 16px; mark x = 16, name x = 40; title truncated ("Passen…", 63.8 px); row ends at 344, with no overflow |
| Regression: wizard body and footer columns | `main .max-w-1120` positions on `/form-connections/new` and `/form-connections/:id` | pass | Head, step and footer columns are all x = 160, w = 1120, so they are unchanged and still line up with each other |
| Leftover strings | `grep -rn "Product name" frontend/src frontend/index.html` | pass | No matches. Backend, `docs/` and README have none either. `specs/` still says "Product name", as the report asked |
| Type-check and build | `npm run build` (`tsc -b && vite build`) | pass | `✓ built in 1.30s`. `tsc` would reject any remaining `width=` prop on `TopBar` |
| Lint | `npm run lint` | pass | Exit 0, no findings |
| Format | `npm run format:check` | pass | "All matched files use Prettier code style!" |
| Automated tests | none | not-run | The frontend has no test runner, and the fix added no tests (see fix.md) |
| Documents step header (`03`+) | none | not-run | It needs a filled connection step. It is rendered by the same `WizardLayout`/`TopBar` as the measured first step, with only the title text differing |

The mock API (`/api/auth/me`, `/api/form-connections`, `/api/form-connections/c1` and
`/api/document-types`), the CDP scripts and the screenshots live in the session scratchpad, not
in the repo. No source file was modified, and the servers were stopped afterwards.

## Output Excerpts

```text
{"case": "new-connection", "title": "Create a connection – Connection Portal", "bodyWidth": 1440,
 "header": {"paddingLeft": "32px", "paddingRight": "32px"}, "row": {"x": 32, "maxWidth": "none"},
 "mark": {"x": 32, "y": 23.5, "w": 16}, "name": {"x": 56, "y": 19.5, "w": 131.2, "text": "Connection Portal"},
 "separator": {"x": 203.2}, "headerTitle": {"x": 220.2, "text": "New connection", "tag": "SPAN"},
 "userMenu": {"x": 1344, "y": 13.5, "w": 64, "h": 36, "right": 1408}}
{"case": "details", "title": "Passenger transport licence – Connection Portal",
 "mark": {"x": 32}, "name": {"x": 56}, "headerTitle": {"x": 220.2, "tag": "H1"}, "userMenu": {"x": 1344, "right": 1408}}
/form-connections/new [{"x": 160, "w": 1120, "top": 104}, {"x": 160, "w": 1120, "top": 296}, {"x": 160, "w": 1120, "top": 821}]
```

## Residual Risks

- **Mocked backend**: the screens ran against a mock of the API, not the real FastAPI backend and
  database. Only the response shapes matter to the header, and they follow `src/types/`.
- **Documents step not opened**: its header uses the same component path as the measured screens,
  with only the title text differing, so the risk is low.
- **Headless Chromium on Linux only**: there was no cross-browser check. The change only removes
  classes, so browser-specific differences are unlikely.
- **Pre-existing, outside this fix**: at 375 px the user menu's avatar is squeezed (the trigger is
  44 px wide instead of 64) when the details title is long. The row below `sm` lays out the same
  as before the fix, because `px-16` and a full-width row applied there in both of the old
  modes, so the fix did not cause this. It could be a separate bug.
- **Docs drift**: `specs/001-servicebw-eudi-middleware/design-notes.md` §3 still describes the
  wizard header on the 1120 px column with `width="column"`. It was left as is by default (see
  fix.md "Follow-ups").

## Recommendation

Close the bug. It is verified end-to-end in a running frontend on every affected route. Both
symptoms are gone, the measurements match the fixed Figma at 0 px tolerance, and the wizard's
body and footer columns are unchanged. Optionally, update `design-notes.md` §3 and §7 for the
header, and file the narrow-screen avatar squeeze separately.
