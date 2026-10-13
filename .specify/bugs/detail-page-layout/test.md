# Bug Verification: The details page follows Figma "22 Published"

- **Slug**: detail-page-layout
- **Tested**: 2026-10-13
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The bug no longer reproduces. Publishing through the wizard, or opening a connection from the
overview, lands on a page in the wizard's frame:
- the header carries the name, the "Live" badge and the form ID;
- the progress shows all three steps done;
- the 900 px links card sits at y = 176;
- a fixed footer offers "Home" and "Create new connection".

The page matches frames `2080:8271` and `2080:8406` at 1440 px. No regressions were found in the
create wizard, which shares `WizardLayout`. The only open point is a known, accepted one: on
phones, "Create new connection" wraps onto two lines.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction, step 1 (publish) | Wizard at 1455 × 900: name and form ID, Continue, add PID, "All data", Publish, "Confirm and publish" | pass | Lands on `/form-connections/c1`, router state cleared, focus on h2 "Your connection is live", ring tick and "Published" shown |
| Reproduction, step 3 (measurements vs `2080:8271`) | `getBoundingClientRect` on the page's elements | pass | Logo 160, separator 301.9 (302), title 318.9 (319), meta ending 1200 and menu at 1216, progress 160/104 1120×40, card 270/176 900×578, footer 0/820 1440×80, content 160 1120 wide. Badge at 538.3 (Figma 537), 1.4 px off because the name renders wider |
| Reproduction, "View" from the overview | `/` → the row's link to `/form-connections/c1` | pass | Same frame; card titled "Links for your form", no tick; one `h1` (the name, in the header) |
| Frame `2080:8406` (link copied) | Real mouse click on the first "Copy link", focus emulated | pass | "Copied" button at x = 975, 129 wide (as in Figma). "Link copied" announced, clipboard holds the request URL. The first attempt without focus emulation failed with `NotAllowedError` from the headless browser, not the app |
| Visual comparison | Screenshots compared with Figma's `get_screenshot` of 2080:8271 and 2080:8406 | pass | Only intended differences: "Form ID PK-30051" for "Live since …", "Home" for "Edit documents", and the stub's URLs |
| Footer actions | Click "Create new connection", Back, "Home" | pass | Opens `/form-connections/new` ("Create a connection"); Back returns to the details; "Home" opens the overview ("Your connections") |
| Header and footer stay put (`split:`) | 1455 × 900, scroll the body by 400 px | pass | Header y 0, progress y 104 and footer y 820 unchanged, card at y −224, window scrollY 0 |
| Header and footer stay put (below `split:`) | 1024 × 600, scroll by 300 px | pass | Header 0 and footer 520 fixed; the progress scrolls away (y −196), as designed |
| Heading outline / a11y | DOM read after publishing | pass | h1 name → h2 "Your connection is live" → h3 Request/Result link → h2 Documents → h3 per document. Steps read "Connection, done", "Documents, done", "Publish, done" |
| State: loading | Stub delays the connection by 6 s | pass | Same frame and footer, no title, badge, meta or progress; loader centred (y 466); tab title "Loading the connection…" |
| State: not found | `/form-connections/missing` (404) | pass | E1 centred with its own `h1` "Page not found"; footer present |
| State: failed + "Try again" | Stub fails the next 2 loads (StrictMode fetches twice), then "Try again" | pass | Shows the h1 "Couldn’t load the connection", then after "Try again" the loaded page with header h1, "Live" badge and progress |
| 375 × 800 | Load the details | pass (with known note) | No horizontal scroll (document 360 = body). Header: logo, name truncated to 93 px, user menu; badge and meta hidden. "Home" shows only its icon. "Create new connection" wraps to 2 lines (66 px tall) inside the 80 px bar, which the assessment accepts ("fit or wrap") |
| Regression: create wizard | `/form-connections/new` at 1455 × 900, steps 1 and 2 | pass | Progress y 104, `h1` y 176, form y 296. Header title is a `span` ("New connection", then the form name). Step 2 reads "Connection, done" |
| Regression: sticky document picker | 1455 × 700, both documents added, body scrolled by 500 px | pass | Picker stays at y = 296. `max-height` 244 px = `100cqh − 40px` of the 284 px content box, as before |
| Lint | `npm run lint` | pass | exit 0, no findings |
| Format | `npm run format:check` | pass | "All matched files use Prettier code style!" |
| Type check | `npx tsc -b` | pass | exit 0 |
| Build | `npm run build` | pass | "✓ built". Its one warning (`vite.config.ts` loaded as CommonJS) predates the fix; that file wasn't touched |
| Unit / component tests | n/a | not-run | The frontend has no test runner (`package.json` has no `test` script) and the fix added none, as the assessment planned |
| Backend tests | `uv run pytest` | skipped | The backend isn't touched by the fix, and there's no backend `.env` or `_test` database in this checkout |

## Output Excerpts

```text
# After "Confirm and publish"
"path": "/form-connections/c1", "routerState": null, "focused": ["H2", "Your connection is live"],
"progress": [160, 104, 1120, 40], "card": [270, 176, 900, 578], "footer": [0, 820, 1440, 80],
"h1s": [["Passenger transport licence", "in header"]], "pageTitleGone": true

# Frame 2080:8406
{"buttons":[["Copied",975,370,129,48],["Copy link",957,512,147,48]],"status":["Link copied"],
 "clipboard":"https://connect.example.org/api/connect/c1/start"}

# Try again
{"before":["Couldn’t load the connection",false],"after":["Passenger transport licence"],"progress":true,"badge":"Live"}
```

## Residual Risks

- **Stubbed API**: the checks ran against a stub of `/api` (scratchpad, not in the repo), not the
  real backend and EUDIPLO. The fix is presentational and keeps the API types, so the risk is low.
  A quick look with a real published connection is still worthwhile.
- **One browser engine**: everything ran in headless Chromium 155 on Linux. Not checked:
  - Firefox and Safari;
  - real phones, whose overlay scrollbars leave no gutter: 375 px would then give 343 px, enough
    for both footer buttons on one line;
  - an actual screen reader (only the DOM's headings and texts were read).
- **Footer wrap on phones**: "Create new connection" takes two lines at 375 px and below. It's
  accepted by the assessment and noted in `fix.md`'s follow-ups.
- **No automated regression guard**: the layout is pinned by the docs (CLAUDE.md, design-notes
  §7) and this report, not by tests. Later work on T073, T074 or T091 must keep the frame.
- **No diff review**: git doesn't work in this checkout (`.git` points to a path on another
  machine), so the changes were checked file by file, not as a diff.

## Recommendation

Close the bug. The original symptom no longer reproduces, the page matches frames 22 and 23
(`2080:8271`, `2080:8406`) within text-rendering tolerance, and the create wizard, which shares
the layout, behaves as before. Before merging, open one real connection against the real backend
as a sanity check, and decide whether the phone footer should use a shorter label (follow-up in
`fix.md`).
