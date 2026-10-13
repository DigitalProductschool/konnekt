# Bug Verification: Four UI fixes: hover tooltips, steady picker buttons, fixed wizard frame, no serviceBW in the UI

- **Slug**: ui-fixes-batch
- **Tested**: 2026-10-13
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

None of the four symptoms reproduces any more. The assessment's reproduction (steps 1–6) was run in a
browser against the real backend, and every check of its "Tests to add or update" list passes. B1:
the bubbles open on hover, close when the mouse leaves, and a click doesn't pin them. B2: one 99 px
width in all states, and no flicker. B3: header, progress, title, list and footer stay put while
only the field cards scroll. B4: no "serviceBW" anywhere on the detail page. A control run of the
same checks on the pre-fix code (`git archive HEAD`) reproduces all four bugs, with the
assessment's numbers. No regressions were found. Lint, format, type-check and build pass.

## Checks Performed

Setup:

- **Backend**: the real FastAPI app from this worktree (routers, services, auth, CORS), run with
  uvicorn on :3000. Its database was a throwaway Postgres 17 cluster in the session's scratchpad
  (:55432), migrated with `alembic upgrade head`. Only EUDIPLO's HTTP transport was replaced, with
  the repo's own `tests/fake_eudiplo.py`, the way `tests/conftest.py` installs it.
  `WORKER_ENABLED=false`. The shared Postgres instances on this machine (:5432, and the Docker one
  on :5435) were not touched.
- **Frontend**: the Vite dev server on :5173 with `VITE_API_URL=http://localhost:3000`.
- **Browser**: system Chromium 155 driven by `playwright-core` 1.55 (scripts in the scratchpad, not
  committed). Classic 15 px scrollbars: Playwright's `--hide-scrollbars` was removed, and the body
  is 1440 px in a 1455 px window, as `CLAUDE.md` prescribes. Fira Sans loaded
  (`document.fonts.check` true).

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction B1, step 1 (post-fix) | Sign in, `/form-connections/new`, "Form name" and "Form ID" (i): hover, 1 px walk onto the bubble, leave, hover + Escape, click, keyboard (Shift+Tab, Escape, Enter, Tab), touch at 390×844 (tap, tap, tap elsewhere) | pass | 51/51 behavioural checks. Hover shows the bubble, leaving hides it, and a click doesn't pin it (after a click and moving away it's hidden, with the button still focused). It stays open across the gap onto the bubble. Escape hides it until the mouse re-enters. Keyboard focus shows it, Tab away hides it. Tap toggles it on touch. Moving from one (i) to the other leaves only the second open. `role="tooltip"`; the CDP AX tree gives the button the bubble's text as its description while hidden. `aria-expanded`/`aria-controls` are gone. The run printed 4 more "FAIL" lines: console messages for the expected `401` of the signed-out `/api/auth/me` probe on `/login`, which the helper then classed as expected. |
| Reproduction B1, detail page (post-fix) | Hover, then click and leave, on "About the request link" and "About the result link", after publishing, from the overview, after a reload | pass | Each case shows on hover and hides on leave after a click |
| Reproduction B2 (post-fix) | Step 2, both documents. Box widths of "+ Add", "✓ Added", "Remove" (hover) and "Remove" (keyboard `:focus-visible`), natural widths from clones without the fixed width, then the pointer entering 1 px at a time across the left 12 px, 6 frames at each position | pass | 18/18. All states 99 px; natural widths 82.5 / 98.9 / 89.8, so 99 is the widest state rounded up. The left edge stays at 344 on hover. `:hover` holds on every frame at x+1…x+12. "Personal ID" and "Driving licence" stay on one line (24 px) in every state. |
| Reproduction B3, wizard (post-fix) | Step 1 and step 2 with both documents at 1455×900: wheel 700 px over the cards, then 500 px over the document list. Card layout, alignment, toast, validation focus, publish dialog. 1300/1197/1190/1100 px wide, 1455×600 with "Coming to the wallet" open, 390×844 | pass | 30/30. Header 0, progress 104, `h1` 176, list 296 and footer 820–900 stay put; the first card goes from 296 to −404. The wheel over the list scrolls the cards by exactly 500 px. `window.scrollY` stays 0 and the window can't scroll. Cards are 800 px with 3 fields per row. Edges are aligned at 160/1280 (1455), 82.5/1202.5 (1300) and 31/1151 (1197). The toast sits 24 px above the bar and on top of the cards; Undo works. Validation focuses `document-pid-all` at y = 407, between the head (232) and the bar (820). The dialog is `:modal`. At 1455×600 the head scrolls away, the list docks at 64–480 (40 px above the bar) and scrolls itself (520 / 414 px). At 390×844 the header is at 0 and the bar at 764–844 on both steps. The step change focuses the single `h1` "Add documents". |
| Reproduction B3, signed-in screens (post-fix) | Detail page at 1455×500 (scrolls by 1364 px), overview at 1455×360 | pass | Top bar at 0 after scrolling (`position: sticky`, `z-index: 30`, `elementFromPoint` hits the header). `scrollIntoView` puts "Result link" at 64. Tab onto each "Copy link" from 20 px behind the bar lands it at 64. The user menu opens above the content. |
| Reproduction B4 (post-fix) | Publish through the real UI and API (both documents, "All data"), then the detail page right after publishing, opened from the overview, and after a reload | pass | "serviceBW" is in neither `innerText` nor `textContent` (which includes the hidden tooltip texts), nor in `innerText` with each bubble open. The "Result link" card has no line under the link: its only `<p>` is CopyableUrl's empty `kern-sr-only` region, as in the "Request link" card. Both bubbles read "Your form management system calls this link…". The overview and wizard step 1 have no "serviceBW" either. |
| First-connection route | First sign-in with no connection; `/get-started` after one exists | pass | Lands on `/get-started` with one `h1` "Create your first connection", tab title "Create your first connection – Product name". With a connection, `/get-started` goes to the overview ("Your connections"), whose top bar is sticky. |
| Control: pre-fix code | `git archive HEAD frontend` into the scratchpad, same backend, same scripts (plus small B1/B3/B4 probes, since the old markup has no tooltip/scroll container to address) | pass (bugs reproduce) | B1: hover shows nothing, a click opens it, and it stays after moving away. B2: 82.5 / 98.9 / 89.8 px, the left edge moves 344.1 → 353.2 on hover, and at x+1 `:hover` flips on every frame (the flicker the assessment predicted). B3: after 700 px the header is at −700, progress −596, `h1` −524, list −404; the footer stays at 820 (already sticky, as the assessment said). The detail page's header is at −800. B4: the hint line is present, and "serviceBW" appears twice with the request bubble open. |
| New / updated tests | none | not-run | The fix added no tests: the frontend has no test runner, and the assessment ruled one out of scope. The browser checks above stand in for them. |
| Lint | `npm run lint` | pass | exit 0 |
| Format | `npm run format:check` | pass | "All matched files use Prettier code style!" |
| Type-check | `npx tsc -b` | pass | exit 0 |
| Build | `npx vite build --outDir <scratchpad>/dist` | pass | Built in 1.5 s, outside the worktree, so no `frontend/dist` was created |
| Leftovers | `grep` for `InfoToggletip`/`toggletip`, `resultLinkHint`, `service.?bw` (case-insensitive, without the `servicebw_form` identifiers) in `frontend/src`, `index.html`, `CLAUDE.md`, `docs`, `README.md`, `specs` | pass | Only a history note in `InfoTooltip`'s doc comment, and "serviceBW" only in the code comment at `FormConnectionDetail/index.tsx:18`, which the reporter allows |
| Diff hygiene | `git diff --check`; trailing whitespace and final newline of the new `InfoTooltip/` files | pass | Clean. Nothing under `backend/` changed. |
| Backend tests | `uv run pytest` | skipped | The fix changes no backend file (`git status` lists none) |
| Pre-commit | `uv run pre-commit run --all-files` | skipped | Its prettier and eslint hooks run with `--write`/`--fix` and could change files, which this command must not do. Their read-only equivalents (prettier `--check`, eslint, `git diff --check`) passed; the ruff hooks cover only the unchanged backend. |

## Output Excerpts

```
B2 (post-fix) document-picker-pid: +Add 99 (natural 82.5) | Added 99 (natural 98.9) | Remove hover 99 (natural 89.8) | Remove focus 99
B2 (pre-fix)  document-picker-pid: +Add 82.47 | Added 98.91 | Remove hover 89.84 | Remove focus 89.84
B2 (pre-fix)  flicker at x+1: hover true/false/true/false/true/false, left 353.16/344.09/…

B3 (post-fix) before : {"header":0,"progress":104,"h1":176,"picker":296,"card":296,"footer":[820,900]}
B3 (post-fix) after  : {"header":0,"progress":104,"h1":176,"picker":296,"card":-404,"footer":[820,900]}
B3 (pre-fix)  after  : {"scrollY":700,"header":-700,"progress":-596,"h1":-524,"picker":-404,"card":-404,"footer":820}

B4 (post-fix) "Result link" card: "2\nResult link\nAbout the result link\nhttp://localhost:3000/api/connect/<id>/requests/{reference}\nCopy link"
B4 (pre-fix)  hint line present: true; "serviceBW" with the request bubble open: 2

b1: 51 behavioural checks passed (+4 expected 401 console lines) · b2: 18/18 · b3: 30/30 · b4: 52/52
```

Four checks first failed because of mistakes in the test scripts, not in the app, and were rerun after
fixing the scripts. In each case the evidence showed the app behaving correctly:

- **List-wheel check (b3)**: the scroll area has 826 px of travel. After the first 700 px, the
  wheel over the list could only move the last 126 px. The script now resets to the top first.
- **Hint-line check (b4)**: it counted CopyableUrl's empty `kern-sr-only` `<p>`.
- **Scroll checks (b4)**: they measured during `html`'s `scroll-behavior: smooth` animation. The
  scripts now scroll instantly.
- **Focus check (b4)**: it tried to reach the page's last focusable element with Shift+Tab. It now
  tabs onto the button from the one before.

## Residual Risks

- **EUDIPLO**: answered by the repo's test fake, not a real instance. The four bugs are
  frontend-only and the publish flow ran through the real API and database, so this doesn't affect
  the result.
- **Browser coverage**: Chromium on Linux only. Not tested:
  - Firefox and Safari: the tooltip's keyboard path relies on `matches(':focus-visible')` in the
    focus handler.
  - Overlay scrollbars on macOS and phones.
  - A real touch device: touch was emulated.
  - A real screen reader: the description was checked in Chromium's accessibility tree.
- **Narrow desktop windows (fix.md, deviation 4)**:
  - Between 1182 and 1196 px the document list is 7.5 px left of the header's and footer's column
    (measured: 20 vs. 27.5 at 1190 px).
  - At 1100 px the cards end 15 px before the footer column (1054 vs. 1069).
  - Only with classic scrollbars.
- **Not addressed by this fix (fix.md "Follow-ups")**: an Escape in the same frame as the hover
  isn't caught. On a 390 px phone the "Form name" bubble runs past the right edge, and the avatar
  is squeezed. KERN's empty 15 px `html` gutter shows on the wizard.
- **No automated regression tests**: the frontend still has no test runner, and the Playwright
  scripts of this check live in the session's scratchpad.
- **Design notes**: §6 has one new line over 100 characters ("…`role="tooltip"`). The footer note
  says only"). The file already had ten such lines, so this is cosmetic.

## Recommendation

Close the bug: verified end-to-end. The assessment's reproduction was run in a browser against the
real backend, and all four symptoms are gone with no regressions. A control run on the pre-fix code
shows that the same checks catch each bug. Consider the fix.md follow-ups, the phone bubble overflow
and a Vitest setup for `tooltipReducer` and the picker width, as separate items.
