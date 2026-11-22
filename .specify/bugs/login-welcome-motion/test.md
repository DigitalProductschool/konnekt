# Bug Verification: The motion from sign-in to the welcome page

- **Slug**: login-welcome-motion
- **Tested**: 2026-11-22
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md (committed as `1b29911`, "fix(frontend): add the sign-in motion")
- **Result**: verified

## Summary

The symptom is gone. A successful sign-in no longer swaps the sign-in page out in one step. The
800 ms motion into the welcome card runs as the confirmed timetable says, and the 200 ms
cross-fade runs everywhere else. This was checked frame by frame on a **production build** in
**Chromium and Firefox 156**. `fix.md` covered only Chromium on the dev server, so the browser
gap it left open is now closed. Lint, all test suites and the build pass. No regression was
found. Not run: a real screen reader, Safari/WebKit, a GPU and true browser zoom (see Residual
Risks).

## Checks Performed

All browser checks ran against `vite build` (with `VITE_API_URL=http://localhost:3000`) served by
`vite preview` on :5173, a local backend (`WORKER_ENABLED=false`, EUDIPLO unset) and the fix's
own throwaway Postgres container (`login-welcome-motion-postgres-1`, invented accounts
`emptyuser` / `fulluser`). The probe is my own. It samples every frame with
`requestAnimationFrame` and compares each frame with the value the timetable gives at the
surface animation's own `currentTime`. The cubic-bézier curves are computed in the probe, and
every comparison uses measured boxes, not the assessment's table.

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), Chromium | Assessment steps 1–4 at 1440 × 900: sign in with no memory of the account and with the memory "no connections" | pass | Full motion both times. With no memory the sign-in page holds 50 ms over the loading page and the motion starts 23 ms after the list arrives. With "no connections" it starts 61 ms after the success. The loading page never shows |
| Reproduction (post-fix), Firefox 156 | The same | pass | Same behaviour |
| Timetable, frame by frame | Clip, radius, colour, chain centre and size, and 8 opacity groups at every frame | pass | Chromium: max error 0.001 px clip, 0 px chain, ≤ 0.5/255 colour, 0.000 on every opacity. Firefox: ≤ 0.02 px clip, ≤ 0.05 px chain, ≤ 0.51/255 colour, 0.000 opacities. All `signin-*` animations share one start time (skew 0) |
| Values at 0/200/400/600/800 ms | Read from the same runs | pass | Chromium (1425 px layer, gutter): chain centre and size 1107,585,1552 → 1113.9,548.3,1428.3 → 1133.7,442.8,1072.8 → 1153.5,337.4,717.6 → 1160.4,300.7,593.7. End clip `152 / 152.5 / 452 / 152.5`, radius 12, colour `rgb(242,245,251)`. Firefox (no gutter in headless): end clip exactly Figma's `152 / 160 / 452 / 160` |
| Card's picture hand-over | Box of the travelling copy vs the card's own picture at the end | pass | Within 0.01 px when the last frame is at 800 ms (otherwise ≤ 0.7 px at 783 ms) |
| Visuals rule (no transform, filter, rotation or opacity on an `<img>`) | Computed style of every `<img>` at every frame | pass | 0 violations in every run. The travel wrapper's `rotate` stays `none` (P1) |
| Last frame = page after reload | Screenshot 1 s after the motion vs after `reload()` | pass | **0 differing pixels** (1440 × 900) in Chromium and in Firefox |
| First frame = held sign-in page | List request held, screenshot during the hold vs every animation paused at T0 | pass | Chromium: 19,203 px (1.48 %) differ, max 34/255, none above 64, box 166–1409 × 16–714. Same numbers as `fix.md` (anti-aliasing). Firefox: 1 pixel, 5/255 |
| Frozen frames, viewed | Paused at 240 / 400 / 640 ms (Chromium), 400 ms (Firefox) | pass | 240: sign-in texts gone, nothing of the welcome page yet. 400: header and title above the half-blue surface, chains cross-fading, chain clipped by the surface in both browsers. 640: content fading in above the tint |
| Reduced motion | `emulateMedia({ reducedMotion: 'reduce' })` | pass | `signin-out` on the layer is the only animation (no `page-in`). Layer gone after 218–249 ms. Focus on the `h1` |
| Wrong password | Submit a wrong password | pass | No layer. The alert "Username or password is wrong…". Focus on "Log in", path `/login`, the username kept |
| Return to a requested route (P6) | Open `/account` signed out, then sign in | pass | Cross-fade at the success (hold 0), lands on `/account`, focus on the document as before |
| Account with connections (P6) | Memory "has connections"; no memory | pass | Cross-fade, "Your connections" focused at T0, both browsers |
| Wrong memory | Memory "no connections", list holds a draft | pass | Motion starts and ends 36–43 ms later when the overview arrives; the overview's `h1` takes the focus |
| Loading (P5) | List delayed 300 ms / 3 s; 500; 401 | pass | 300 ms: held 379–382 ms, then the full motion. 3 s: held 1000–1025 ms, cross-fade to the loading page, welcome `h1` focused when it arrived. 500: cross-fade into the error state, "Your connections" focused. 401: the kept page dropped and a fresh `/login` (empty username, "Log in") |
| Window sizes (P4) | 1280 × 720, German, the local-drafts offer, 1020/1021/1035/1036 px wide, 1024 × 768 | pass | The full motion follows every measured card: German bottom inset 428, offer top inset 266 (not run by `fix.md`), 1280 × 720 end `152/72.5/272`. The 1021 px threshold is the page width: Chromium full from 1036 px windows (15 px gutter), Firefox from 1021. So 1024 × 768 cross-fades in Chromium and runs the full motion in Firefox, as P4 says |
| Scrolled sign-in page; 200 % zoom | 1440 × 520 scrolled 120; 720 × 450 viewport | pass | Cross-fade; the layer keeps the scroll offset (120, or 468 where Playwright scrolled to the button), no jump |
| Keyboard, pointer, resize during the motion | Tab at the start; click "Create connection" at 250 ms; resize at 200 ms | pass | Tab reaches "Create connection" while the motion runs. The click is caught (path stays `/`). A resize ends the motion at once (layer gone after 230–270 ms) |
| Accessibility tree during the motion (P7) | `locator('body').ariaSnapshot()` at T0, both browsers | pass | Only the destination is exposed: banner, one `h1` "Welcome to Konnekt", the card. Nothing from the sign-in page. The layer has `aria-hidden="true"` and its content `inert` in every frame; the destination is never inert |
| Sign out, sign in again | User menu → Log out → forgot-password and back → sign in | pass | Fresh `/login` with the "You're logged out." toast, no layer, empty field. The second sign-in runs the motion again (818–856 ms) and focuses the `h1` |
| Not slower | Times from the login response, production build | pass | Keyboard: the `h1` has the focus 38–88 ms after the answer (T0). Pointer free 851–930 ms after it for the full motion and 257–301 ms for the cross-fade, as P7 decided (the layer holds only the pointer). No pre-fix baseline was measured |
| Frame rate | Frame gaps during the run | pass (headless) | Chromium 52–58 fps, longest gap 27–41 ms; with the CPU throttled 4× 48 fps, longest 93 ms (at the start's commit), timetable still exact. Firefox (software rendering) 36–57 fps, longest 58–88 ms |
| Console | Both browsers, all runs | pass | Only the expected 401s of `/api/auth/me` while signed out, the wrong password's 401 and my injected 500. One Chromium warning, "preloaded but not used", for the welcome picture (Residual Risks) |
| New tests | `npx vitest run src/components/SignInMotion/utils.test.ts --reporter=verbose` (in `frontend/`) | pass | 23 / 23 |
| Regression suite | `npm test` (root) | pass | Clean run: rules 46 files / 2678 tests, frontend 49 / 2041, mcp 15 / 513. A first run alongside `npm run lint` failed 2 timing-budget tests in `rules/src/personas/performance.test.ts` (1551 ms against 1500). `rules/` isn't touched by the fix; alone, and in the clean root run, they pass |
| Lint / format | `npm run lint`; `npm run format:check -w frontend` | pass | No warnings; Prettier clean |
| Build / type-check | `npm run build` (root; `tsc -b && vite build`) | pass | The five `@keyframes signin-*` are in the built CSS. The "chunks larger than 500 kB" warning was there before |
| Backend | — | skipped | The fix changes no backend file (`git show --stat 1b29911`) |
| Real screen reader, Safari/WebKit, GPU frame rate, true browser zoom | — | not-run | No screen reader or WebKit here; headless only; zoom emulated by a 720 × 450 viewport |

## Output Excerpts

```text
# Chromium, production build, memory "no connections", per-frame errors against the timetable
kind=card  runMs=855  loginToT0=76  focusVsT0=0  exitAria=["true"] exitInert=[true]
maxErr {inset:0.001, round:0, bg:0.499, chain:0, clockSkew:0, op:{hero:0,slot:0,signHeader:0,white:0,copy:0,header:0,title:0,content:0}}
at 800 ms: inset [152,152.5,452,152.5] round 12 bg [242,245,251] chain [1160.4,300.7,593.7]

# Firefox 156, the same
kind=card  run=805  maxErr inset=0.016 bg=0.493 chain=0.041 opMax=0  endInset=[152,160,452,160]

# Last frame vs reload / first frame vs held page
Chromium endVsReload {differing: 0}      holdVsT0 {differing: 19203, share: 1.482, maxChannelDiff: 34, over64: 0}
Firefox  endVsReload {differing: 0}      holdVsT0 {differing: 1, maxChannelDiff: 5}

# Root tests, clean run
Test Files 46 passed (46) / Tests 2678 passed (2678)     # rules
Test Files 49 passed (49) / Tests 2041 passed (2041)     # frontend
Test Files 15 passed (15) / Tests  513 passed (513)      # mcp
```

## Residual Risks

- **The welcome picture is preloaded without being used** on a first sign-in on a device (no
  memory) for an account that has connections. The hold requests `chain-welcome-card@2x.webp`
  and the overview comes instead. Firefox (fresh profile) downloaded 687,374 bytes that never
  showed, and Chromium logs "preloaded but not used". It happens once per device: afterwards the
  memory says "has connections" and nothing is preloaded. On a slow connection it competes with
  the list request during the hold. This follows the assessment's P5 ("the copy is requested at
  the success"), which `fix.md` Deviation 3 already narrowed. Not a failure; a candidate for a
  follow-up if bandwidth matters.
- **Chromium's hand-over frame** differs by up to 34/255 on 1.5 % of the pixels, the
  anti-aliasing `fix.md` already reported. Firefox shows none. Whether it's visible on a real
  display wasn't judged beyond the frozen frames.
- **Not exercised:** a real screen reader (the accessibility tree and focus were checked
  instead), Safari/WebKit (no WebKit build here), a GPU (all runs were headless), true browser
  zoom (emulated by the viewport) and a pre-fix timing baseline. Firefox ran through the cached
  Playwright 1.64 (Firefox 156): the Firefox MCP wanted a build that isn't installed, and
  nothing was downloaded.
- **The dev server** (React strict mode) was not re-run here; `fix.md` covered it in Chromium.
- **A click during the motion** is caught as P7 decided, but it moves the focus from the `h1` to
  the document, as a click on any non-focusable element does. That's expected browser behaviour,
  noted only for the screen-reader review.

## Recommendation

Close the bug. The fix is verified end-to-end: the assessment's reproduction no longer shows the
one-step swap in Chromium or Firefox on a production build, every confirmed decision (P1–P8)
holds frame by frame, and lint, tests and build pass. Before release, a real screen reader pass
and a look in Safari would cover what this run could not. The unused preload on a first sign-in
with connections could become a small follow-up.
