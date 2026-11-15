# Design notes: the connection PDF

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Two kinds of design are involved:
- **The button** has Figma frames and follows `docs/FIGMA-WORKFLOW.md` in its task: "Middleware
  – V5" (`s8mU9oJDq3411e8bxMjQO9`), nodes `6396:48196` (the button) and `6809:46423` (the
  published details with the Summary card), and the draft's details (U93 #10). The decisions
  that spec 008 recorded for these frames stay in force (`specs/008-kern-revamp-redesign/
  design-notes.md`, F53 is what this feature lifts).
- **The PDF** has no Figma frame. Its reference is the prototype's agreed layout,
  `prototype/published-ids-top.pdf` and `prototype/draft-ids-top.pdf` (the `*-bottom.pdf` files
  are the rejected alternative), adjusted by the spec and by §4 and §5 below.

## 1. What the frames show (read during planning, 2026-11-09)

- `6396:48196`: "Download PDF", a KERN **secondary** button (white, action-blue border and label)
  with a download glyph before the label, 177 × 48 px: the regular size, not `kern-btn--small`.
- `6809:46423`: the Summary card's header row holds, left, "Summary" and its counts ("2 documents
  · 9 data items · 3 variants · 4 rules"); right, "Download PDF" and then the tertiary "View
  summary ⌄" toggle, vertically centred. The same header shows whether the Summary is open or
  closed.
- The glyph is the asset `get_design_context` returns for `6396:48196`, saved in
  `frontend/src/assets/icons/` (FIGMA-WORKFLOW §3.5: never substituted); KERN's `kern-icon`
  classes only if the asset is KERN's own download icon.

## 2. The Summary card's header (published and draft details)

`DetailAccordion` gets an optional `actions` slot, rendered between the heading block and the
toggle; only the Summary passes it. The slot holds, in this order:

```text
┌ Summary ───────────────────────────────────────────────────────────────────────────┐
│ Summary                          Version 62D0-715F-01D1  [⤓ Download PDF]  View summary ⌄ │
│ 2 documents · 9 data items · 3 variants · 4 rules                                  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**The version** (FR-032; the spec's clarification of 2026-11-09 placed it beside the button; no
frame draws it, so this is the proposal):
- Text "Version 62D0-715F-01D1", one line, `whitespace-nowrap`, left of the button with KERN's
  8 px gap: "Version" in `text-kern-static-small` and `text-kern-layout-text-muted`, the code in
  the page's Fira Sans, medium weight, `tabular-nums`, in the default text colour, so a reader
  compares it character by character with a printout. Not `font-kern-mono`: KERN 2.8.2 ships no
  Fira Mono file (spike), so that class falls back to the system's monospace. (Option, not
  taken: an `@font-face` "Fira Mono" in `index.css` on the committed `FiraMono-Regular.ttf`,
  which browsers would load only where the class is used, would print the code as the PDF does.)
- Plain text, not a control and not a tooltip; screen readers read it in place, after the
  counts. No copy button (the details' copy buttons are for links).
- Shown open or closed, on the published (scheduled, active and deactivated) and the draft
  details; the
  value comes from the loaded connection and changes when the page loads a newer one (FR-005).
- Rejected places: in the counts line (it would read as one more count, and the clarification
  put it beside the button); in the status band (not where a reader looks when comparing with the
  PDF the button makes); under the button (a second line in a header that is otherwise one row).

**Narrow screens** (320 px at 200 %, spec 008's rule for the header): the row wraps; the slot
moves under the heading block as its own row (version, then the button) and the toggle stays
last; nothing overlaps. The button keeps its full label but drops the glyph, and the label
wraps between words ("Download / PDF") or at the German soft hyphen ("PDF / herunter- /
laden"), so the button grows taller than 48 px (66 and 90), as spec 008's narrow rule lets
pills grow (D8; it said "keeps its full label and 48 px height", which no label fits in the
110–125 px row at 16 px). The version wraps before the button, never inside the code.

## 3. States without frames (build from KERN patterns, as spec 008's W# items)

| State | What shows | Assistive technology |
|---|---|---|
| Idle | "Download PDF" with the glyph | a button |
| Busy (fetching and rendering) | label "Creating PDF…", the glyph kept (on a narrow window hidden in every state, D8), `aria-disabled="true"`, clicks ignored (the pattern of `ConfirmDialog`'s busy button); the rest of the page responds (FR-003) | the polite live region says "Creating the PDF…" once |
| Saved | back to idle; the browser's own download indicator shows the file | the live region says "PDF saved." |
| Failed | a KERN danger alert inside the Summary card, under the header row, full width, open or closed: title "Couldn’t create the PDF", the text `ErrorNoticeText` gives (the server's message with a 5xx's error id, or "Check your connection and try again."), and a secondary "Try again" button that starts a new run (FR-004); it disappears when a run starts | the alert's `role="alert"` |
| Gone (404 at activation) | the details' not-found state, as `FormConnectionLoadState` shows it | as today |

The announcements go to a polite `role="status"` region of the button's own, present from mount,
as each `CopyableUrl` has one for "Link copied": the details page has no shared region (§8.1).
Copy goes into `CONNECTION_DETAIL_COPY` (plan.md's `DETAIL_COPY`, §8.1) in
`pages/FormConnectionDetail/constants.ts` as `defineTexts(en, de)` (spec 009): `downloadPdf`,
`creatingPdf`, `creatingPdfAnnouncement`, `pdfSaved`, `pdfFailedTitle`, `pdfFailedText`,
`version(code)`; "Try again" reuses `CONNECTION_DETAIL_COPY.retry` ("Erneut versuchen"). German
proposals: "PDF herunterladen", "PDF wird erstellt …", "Das PDF wird erstellt …", "PDF
gespeichert.", "Das PDF konnte nicht erstellt werden", "Prüfen Sie Ihre Internetverbindung und
versuchen Sie es erneut." (the code's German for the same English, `rulesErrorText`; D2),
"Version {code}".

## 4. The PDF's colours: KERN's tokens and contrast (FR-039)

The prototype's hues are replaced by the app's tokens (the KERN Revamp values of
`frontend/src/index.css`), so the PDF looks like the details page. Contrast against the
background each text sits on:

| Role | Prototype | PDF (token) | Text on background | Ratio |
|---|---|---|---|---|
| Text | `#171A2B` | `#0B1220` layout-text-default | on white | 18.7 |
| Muted text | `#585C6E` | `#4A5468` layout-text-muted | on white / on `#F2F5FB` band | 7.6 / 7.0 |
| Accent (section numbers, rules, AND/OR words, step numbers) | `#0B4F9E` | `#1D56F0` action-default | on white / on `#EEF3FE` action-tint | 5.8 / 5.2 |
| Top band, details box | `#EEF3FA` | `#F2F5FB` layout-background-hued | muted text on it | 7.0 |
| Active pill | `#16683A` on `#E5F3EA` | `#1D7A2E` on `#EAF7E6` (feedback-success) | | 4.9 |
| Deactivated pill | `#5F6270` on `#F2F3F6` | `#4A5468` on `#EFF1F4`, dot `#8C94A1` (ConnectionStatusBadge) | | 6.7 |
| Scheduled pill (spec 010; not in the prototype) | none | as the Active pill, with a hollow dot (ConnectionStatusBadge) | | 4.9 |
| Draft pill, draft accents, dashed box | `#05669E`, dot `#0284C7`, `#E3F1FB` | `#05669E`, dot `#0284C7`, `#E0F2FE` (ConnectionStatusBadge, feedback-info-background) | | 5.4 |
| "Draft · Not live" pill in the band | white on `#0284C7` (**4.1, fails**) | white on `#05669E` | | 6.2 |
| Marks "Changed here", "Added here" | purple `#6B2D8F`, teal `#0D6B6B` | `#8A22B5` on `#F8F1FC` (BranchMark: variant-changed and variant-new share it; the words tell them apart) | | 6.4 |
| Mark "Removed here", removed card | `#5F6270` on `#F2F3F6` | `#4A5468` on `#EEF1F6` (feedback-default) | | 6.7 |
| Removed text (struck through, "faded") | `#8A8D9B` (**3.0, fails**) | `#4A5468` muted, struck through | on `#EEF1F6` | 6.7 |
| Faded AND/OR chip | `#8A8D9B` on `#F2F3F6` (**3.0**, artifact) | `#4A5468` on `#EEF1F6` | | 6.7 |
| Gaps box | `#8A4500` on `#FFF5E6`, bar `#D98A1C` | `#9A4A00` on `#FFF4E0` (feedback-warning), bar the same hue | | 5.8 |
| Lines, frames | `#D3D6E0` | `#D0D5DD` card-divider, `#E1E6F0` decorative-border | (no text) | |
| Watermark | `#0284C7` at 6 % | the same | exempt (FR-039); body text under it stays above 15:1, the accent on `#EEF1F6` at 4.67 at worst (T043, §7.4) | |

"Faded" therefore means the muted colour plus the strike-through and the "Removed here" badge,
not a light grey: a light grey that keeps 4.5:1 on the removed tint can't be told from the muted
text anyway. All values are written into `utils/connectionPdf/constants.ts` as hex with the
token's name beside each, since the worker can't read CSS.

## 5. Differences from the prototype (intended)

1. Colours as §4, which also fixes the two contrast failures.
2. "To finish before publishing" lists everything publishing would refuse (FR-010, the spec's
   clarification), each gap its own block; its sentence says "parts", not "rules".
3. The rule's "Not complete" note uses the create flow's instruction for every kind of problem,
   not only "Choose a check." and "Write the message for citizens.".
4. A deactivated connection's links section adds the "unavailable" sentence (FR-012).
5. The request link's and the result link's explanations are the details page's texts
   (`DETAIL_COPY.requestLinkInfo`, `resultLinkInfo`), with the PDF's {reference} sentence after
   the latter; the prototype paraphrased them.
6. Headings hold the identifier and the name together ("rule-7 Minimum age"), so moving by
   headings names both.
7. URLs break only after "/" (`urlLines()`), never at a hyphen of a UUID.
8. A rule taller than a page continues on the next page between values; the prototype had no
   such case.
9. The outline (bookmarks) of FR-038, which the prototype lacked.
10. The document's `Author` and `Creator` are the product's name, "Konnekt".
11. Page 1's eyebrow, the top band, the bottom and the watermark are translated in German
    (contracts/pdf-document.md §5); the prototype was English only.
12. The eyebrow keeps its capitals but loses its 1 pt letter spacing, which made copied and
    extracted text read "C O N N E C T I O N D E TA I L S" (spike).
13. The document properties have no custom keys (the prototype wrote `ConnectionId`,
    `ConnectionVersion`, `ConnectionStatus`): Subject and Keywords carry the ID and the version,
    and readers show those.
14. A scheduled connection (spec 010), which the prototype doesn't have: the "Scheduled" pill
    with "as of <generated> · starts on <start date>", and the links section's sentence that the
    links answer "unavailable" until that day (FR-007, FR-012).
15. Sections 2 and 3 say what the Summary says (FR-014, FR-016): A is the prototype's sample as
    the app stores it (`testData.ts`), so the data items have the catalog's labels in catalog
    order, the statements are composed by `rules/src/` with each value a chip, and an added
    group's members are marked; the prototype's `data.mjs` wrote them by hand. A statement's
    words are centred on its chips' line, which makes a rule card with values 0.9 pt taller than
    the prototype's (T026).
16. A document's right column of data items keeps the frame's 12 pt padding, as the left one
    does, so it starts 6 pt further left than the prototype's, whose right column ran its text to
    2 pt from the frame (T026).
17. A section's title and a variant's name that wrap do so in their own column, after the number
    or the word "Variant", so that the tagged text reads with one space ("3 Rules per variant",
    "Variant Taxi") while the drawing keeps the prototype's gap; the prototype, whose names are
    short, would have wrapped them back to the left edge (T026; in A nothing wraps, in E 19 of 20
    variant names of 100 characters do, in both languages, and no section title).
18. A draft's gaps box is 2 pt taller than the prototype's: both draw its sentence 32 pt below
    the box's top, but the prototype counts 30 pt for it, so its box ends 2 pt before its own
    bottom padding. Ours is measured as drawn (R11), so what follows on page 1 sits 2 pt lower
    (T037; added by the coordinator 2026-11-13).

## 6. How it is verified

- The button: FIGMA-WORKFLOW §4 at 1440 px (numeric check against `get_design_context`) and the
  narrow check at 320 px / 200 %; the busy, failed and saved states by stubbing the requests.
- The PDF: compared page by page with the prototype's PDFs for the same sample (layout and
  English wording), in a PDF reader at 100 % and printed in black and white (marks, statuses,
  AND/OR and removed items readable without colour); quickstart.md lists the steps.

## 7. Verification

### 7.1 The button, per node

**T032, 2026-11-12**, Chromium (Playwright MCP, headless), the dev SPA against the seeded stack
(A and C of §8.3).
- **How it was measured**: a 1455 × 1167 window, so the body is 1440 wide (FIGMA-WORKFLOW §4
  step 1); fonts checked with `document.fonts.check` (600 16px, 400 14px, 500 14px "Fira Sans":
  all true); one script measures `getBoundingClientRect` and `getComputedStyle`.
- **What it was compared with**: `get_design_context` for `6396:48196` (the button) and
  `6809:46487`. The latter is the Summary header of `6809:46423` (P7b, closed). The user decided
  (T031) to measure only that header node, so P7b's ⓘ tooltip stays out of the comparison. The
  open frame P9 (`6396:47966`, header `6396:48192`) has the same geometry.
- **The narrow check** stands for a 320 px window at 200 %: 160 CSS px, less the scrollbar's
  7.5 CSS px. It was emulated with a 167 px viewport, whose 15 px gutter leaves a 152 px body.
  The browser's own 200 % zoom was not used (it is under "Needs a person").
- **The script and its files**: `011/T032/measure.js` in the chat's scratchpad, with the
  screenshots `app-<state>.png` and the Figma renders `figma-6396-48196.png` and
  `figma-6809-46487.png`.

| Node | State | Element | Property | Figma | Actual | Result |
|---|---|---|---|---|---|---|
| `6396:48196` | A, Summary open | button | kind, box, border, radius | button-secondary, 177 × 48, 1 `#1d56f0` inside, 8 | `kern-btn kern-btn--secondary` with `px-15!` (KERN draws the border outside its 16), 176.59 × 48, 1px rgb(29, 86, 240), 8px, no fill | match (label text 104.59 for 105) |
| `6396:48196` | A, Summary open | glyph, label | asset, place, type, colour | `icon-download-default` 24 at x16; label padding 8, "Download PDF" label/default 16/24 600 `#1d56f0` | `download-action.svg` (the asset as returned; not KERN 2.8's `kern-icon--download`, another path), 24 × 24 at x16, 8 to the text, 24 from the text to the right edge; 16px/24px 600 rgb(29, 86, 240) | match |
| `6396:48196` | A, Summary closed | button, glyph, label | as above | as above | the same values | match |
| `6396:48196` | C (draft) | button | presence | not drawn (U93 #10, T036) | no button; the version alone | as specified (T036 turns it on) |
| `6396:48196` | A, narrow (152 px body) | button | label, height, sides | full label, 48 (task line) | full label, but the narrow rule's `overflow-wrap: anywhere` breaks "Downlo / ad PDF" in the 110 px row (62 px for the label beside the glyph, "Download" needs about 75), so 110 × 66; `narrow:px-7!`, label 8 4 | deviation, kept: KERN's narrow rule (spec 008 T096); the glyph is the design's, and min-height stays 48 |
| `6809:46487` | A, Summary open | header row | padding, gaps, centring | 24 all round; heading → button 8, button → toggle 8; button and toggle centred in 100 | padding 24; heading → version 8, version → button 8, button → toggle 8, right 24; heading, version, button, glyph and toggle centred (offset 0) | match, with the version added (next rows) |
| `6809:46487` | A, Summary open | header row | height, counts | 100; counts on one line (300 wide) | **124**: the counts wrap to two lines (heading block 282 × 76) | deviation, not drawn: A's counts ("2 documents · 12 data items · 3 variants · 12 rules", about 330) and the version (155.5 + 8) don't fit one 830 row; the heading keeps its row from 200 px on (`basis-200`) and wraps its counts, so that the button and the toggle stay beside it as drawn |
| `6809:46487` | A, Summary open | version | placement, type | not drawn (§2: the proposal; the spec's clarification of 2026-11-09) | left of the button, 8 apart, one line, centred: "Version" 14/24 400 rgb(74, 84, 104); the code 14/24 500 rgb(11, 18, 32) `tabular-nums`, 104.6 wide | deviation the designer hasn't drawn (§2) |
| `6809:46487` | A, Summary open | toggle | box | 144 × 48 instance, 40 visible | 144 × 40 (`kern-btn--small`, spec 008) | match; the 1 px between P9's 144 and P7b's 145 is not part of this task |
| `6809:46487` | A, Summary closed | header row, version, toggle | as above | as above | the same values; toggle 144.56 × 40 ("View summary") | as A open |
| `6809:46487` | C (draft), open | header row, version | padding, gaps, height | 24; 8; 100 | 24; heading → version 8, version → toggle 8, right 24; 100 high, all centred; "Version BD20-E34A-47BC" one line | match; the version is a deviation the designer hasn't drawn (§2) |
| `6809:46487` | A, German (open and closed) | header row | wrap | not drawn | "Zusammenfassung ausblenden" (250) and "PDF herunterladen" (209) leave the heading under 200, so the version, the button and the toggle wrap together under the heading as one group at the right (8 apart, right 24, centred among themselves); 156 high | deviation, not drawn |
| `6809:46487` | A, narrow (152 px body) | header row | order, overlap, scroll | §2: the slot under the heading as its own row, the toggle last; the version wraps before the code, never inside it | heading, then "Version" / "98C8-BFF0-B8E2" (the code `text-nowrap`, 104.6 in the 110 row), then the button, then "Hide summary" last; 0 overlaps, no horizontal scroll, one `h1` | match (the button's label: row above) |

Also checked:
- **390 px window**: the group wraps under the heading, starts at the left and stays in order,
  with no horizontal scroll.
- **The failed state** (a stubbed `500`): the danger alert, `role="alert"`, 782 wide right under
  the header row; "Try again" moves the focus to the busy button, and the retry saves the file.
- **A click on "Download PDF" on A** saved
  `Taxi and private hire driver licence_98C8-BFF0-B8E2.pdf` (`%PDF-1.7`, 87 kB) after
  1.85 s on the dev server with a cold worker. Meanwhile the label read "Creating PDF…" with
  `aria-disabled="true"` and the live region "Creating the PDF…", then "PDF saved.".

- **The bundle** (`npm run build`):
  - The main entry is 932.91 kB (278.86 kB gzip). It loads one shared chunk at start,
    `constants-*.js` (10.89 kB: `rules/`'s language and statement texts, which used to sit in
    the entry). Together that is 943.80 kB, against 935.02 kB before T031: +8.8 kB (the button,
    the hook with its reducer, the inlined glyph).
  - `useConnectionPdf` loads `model.ts`, `fileName.ts` and `connectionPdf/constants.ts`
    dynamically, on the first run (chunks of 4.68, 0.41 and 12.86 kB). Imported statically they
    put about 20 kB into the entry (T032 measured 955.01 kB).

The run's other states, the timings and the second browser are T033's (§7.2).

### 7.2 The details page's states

**T033, 2026-11-13**, the run on A and B (§8.3) in headless Chromium 156 and Firefox 159
(Playwright MCP), a 1455 × 1000 window.
- **The build**: the production build (`VITE_API_URL=http://localhost:3000 npm run build -w
  frontend`, served by `vite preview` on 5173), made after the fix below, against the seeded stack
  (backend on 3000, the fake EUDIPLO). Every timing below is from that build. Two earlier
  Chromium runs on the dev server, one before and one after the fix, are an upper bound only.
- **The script**: `011/T033/sweep.js` in the chat's scratchpad, one `browser_run_code_unsafe`
  call per browser. It measures the click to the `download` event, the requests (the context's
  `request` events, the worker's included), the console, the button's label, `aria-disabled`,
  the live region and the focus (a `MutationObserver` and `focusin` on the page), and the
  longest gap between ticks of a 50 ms `setInterval` on the page.
- **The files**: `chromium-prod.csv` and `firefox-prod.csv` (208 rows each, all pass),
  `*-prod-requests.csv`, `*-prod-summary.json` and the 32 saved files under `dl/`. The dev runs
  and the first Firefox run are in `run1-dev/`, `run2-dev-chromium/` and
  `run3-firefox-offline-unblocked/`.
- **Cited, not re-checked**: the idle layout, open, closed, in German and narrow (§7.1, T032).

| State | What was checked | Chromium (prod) | Firefox (prod) | Result |
|---|---|---|---|---|
| A, 5 clicks (run 1 the first after loading the page) | click → `download` (SC-001) | 953, 591, 511, 546, 442 ms | 867, 665, 629, 564, 655 ms | pass, all under 3 s |
| B (deactivated), 5 clicks (run 1 the first after loading) | click → `download` (SC-001) | 914, 555, 514, 583, 471 ms | 1137, 613, 628, 601, 811 ms | pass |
| every run (16 per browser) | suggested name against `fileNameOf` (FR-044) | `Taxi and private hire driver licence_98C8-BFF0-B8E2.pdf` (A), `…_AA90-6EC5-A5BA.pdf` (B) | the same | pass 32/32 |
| every run | the file: `%PDF`, size, no download failure, no dialog (FR-002) | 87.0–87.4 kB | 87.1–87.5 kB | pass 32/32 |
| every run | busy: label and `aria-disabled` (FR-003) | "Creating PDF…", `true` throughout; then "Download PDF", `false` | the same | pass 32/32 |
| every run | the live region's two texts | "Creating the PDF…", then "PDF saved." | the same | pass 32/32. "PDF saved." stays in the region until the next run replaces it with "Creating the PDF…", so nothing is announced twice |
| every run | focus | on the button from the activation to the end | the same | pass 32/32 |
| every run | longest gap between 50 ms ticks (FR-003, the page responds) | 50–67 ms | 52–66 ms | pass, no long task on the main thread |
| A, double click (`dblclick`), and two `click()`s in one task | downloads, requests | 1 file, 1 GET each | the same | pass |
| A, keyboard | Tab after the counts; Enter; Space (quickstart §5 step 5) | one Tab from the counts reaches the button, Shift+Tab goes back to "View links" (before the counts); Enter and Space each save one file, focus kept | the same | pass |
| A, offline (quickstart §2 step 8) | the alert, "Try again", no file | "Couldn’t create the PDF" / "Check your connection and try again." (no error ID), `role="alert"`, one "Try again"; button idle, focus on it; region "Creating the PDF…", then empty; no file in 3 s | the same | pass |
| A, offline, then online | "Try again" saves | the alert goes, the button busy with the focus on it, one file, 473 ms | the same, 688 ms | pass |
| A, a 500 with the backend's real body (`{error, message, error_id}`, through `page.route`) | the alert's text and error ID (carried from T032) | "Something went wrong on our side. Contact an administrator and give them the error ID." and "Error ID: 7d1f3c2a-…-000000000033"; no file | the same | pass |
| A, after the 500 | "Try again" saves | one file, 490 ms | one file, 631 ms | pass |
| A and B, all states | console | none from the app; the browser's own line for the failures on purpose: `net::ERR_INTERNET_DISCONNECTED` and the 500 | none from the app; Firefox's "Cross-Origin Request Blocked … CORS request did not succeed" for the offline request | pass |

**The requests** (SC-008, FR-042), the same in both browsers:
- **The first run after loading the page** (A #1, B #1): `GET /api/form-connections/{id}`,
  `GET /api/option-sets`, the three model chunks (`model-*.js`, `fileName-*.js`,
  `constants-*.js`, while the GET runs), the worker's two chunks (`pdf-*.js`, `pdfFonts-*.js`),
  `pdfkit.browser-*.js` and the five `.ttf` fonts, each once. Nothing else, nothing foreign, and
  no other request names the connection.
- **Every later run**, the retries after the offline and the 500 included: exactly
  `GET /api/form-connections/{id}`.

**Defects**:
- **Fixed** (`useConnectionPdf.ts`): a failed fetch terminated the worker, so "Try again" started
  a new worker that loaded the worker's chunks, PDFKit and the five fonts again. On the dev
  server before the fix, A's retry after the offline and the retry after the 500 each made 37
  static requests (`run1-dev/`). Now `failRun()` keeps the worker when a fetch failed, and only
  a failure of the worker or the watchdog terminates it (contracts/pdf-worker.md §2, step 7).
  After the fix both retries made only the GET, in the dev run and in both browsers on the build.
- **Firefox and the object URL** (carried from T030): all 16 Firefox downloads were complete
  (`%PDF`, 87 kB, no download failure). The URL is revoked in `setTimeout(…, 0)`, and the delay
  stays as it is.
- **The test harness, not the app**: Firefox's offline mode (`context.setOffline(true)`) leaves
  loopback reachable, so the first Firefox run saved a file "offline"
  (`run3-firefox-offline-unblocked/`). In Firefox the script also aborts the API's requests with
  `internetdisconnected` while offline. The fetch then fails as it does in Chromium.
- **Left, outside this task's files**: `pages/FormConnectionDetail/index.tsx` calls
  `useConnectionPdf` without `optionSets`, although the Summary's `useOptionSets()` has already
  loaded them. So the first run asks for `/api/option-sets` again (rows A-click#1 and B-click#1
  of `*-prod-requests.csv`). This is allowed (contracts/pdf-worker.md §2: "when their cache is
  cold"), names no connection, and later runs use the hook's own copy.

**T037, 2026-11-13**, the draft's details: C's header, the downloads of C and D, "Published
meanwhile" and "Deleted meanwhile" (quickstart §3, §6), in headless Chromium 156 and Firefox 159
(Playwright MCP), a 1455 × 1000 window.
- **The stack**: the dev SPA (5173) against the backend on 3000 (`template_db`, the tests' fake
  EUDIPLO, the worker off), signed in as a local account. The timings below are the dev server's
  (T033's production timings stand for A and B).
- **The scripts**, in the chat's scratchpad:
  - `011/T037/page-sweep.js`, one `browser_run_code_unsafe` call per browser. The password came
    from a one-shot local server, never from the script.
  - `011/T037/files-check.mjs` reads the saved files' text. It uses `pdftext.mjs`, a small
    extractor over the ToUnicode maps of PDFKit's fonts, since this machine has no pdf.js.
  - `011/T037/gaps-server.ts` (vite-node, through the API) checks the gaps against the server.
- **The files**: `chromium-page.csv` and `firefox-page.csv` (134 rows each, all pass),
  `*-page.json` (the measures, the downloads, the console), `files.csv` (80 rows, all pass),
  `gaps-server.csv` (28 rows, all pass), `verapdf.txt`, and the six saved files under `dl/`.
- **The "other tab"**: a second page in the same browser context, which publishes or deletes the
  copy through the API (`POST /{id}/publish` with the stored content, `DELETE /{id}/draft`).
  The editor's publish dialog is not driven.
- **The copies**: fresh copies of D, two per run (§8.3).
- **Cited, not re-checked**: the run's states on A and B (busy, saved, failed, double activation,
  keyboard, offline, timings: T033 above); the header in German and on a narrow window (§7.1).

| State | What was checked | Chromium | Firefox | Result |
|---|---|---|---|---|
| C's header, Summary open and closed | §7.1's measures for A: C against A measured in the same run, and against §7.1's values | the header 124 high, as A's (the same counts, "2 documents · 12 data items · 3 variants · 12 rules", wrap alike). The paddings 24. Heading → version 8, version → button 8, button → toggle 8, right 24. The version, button, toggle and glyph centred (offset 0). The button 176.59 × 48, `kern-btn kern-btn--secondary`, 1px solid rgb(29, 86, 240), radius 8px, no fill. A's glyph, 24 × 24 at x16, 8 to the label and 24 from the label to the right edge. The label 16px/24px 600 rgb(29, 86, 240), "Download PDF". "Version" 14px/24px 400 rgb(74, 84, 104); the code 14/24 500 rgb(11, 18, 32) `tabular-nums`, on one line. The toggle 144 × 40 (144.56 closed). One `h1`, no horizontal scroll | the same, with the button 176.58 and the toggle 143.97 / 144.52 | pass, 54 of 54 per state and browser. C's code is 108.0 wide and A's 104.6 (BD20-E34A-47BC against 98C8-BFF0-B8E2: the figures are tabular, but each letter has its own width), so C's heading block is 3.4 narrower (278.5 against 281.9); the two widths add up to A's |
| C, download from the details | the file name (FR-044), no failure, the live region, the page | `Taxi and private hire driver licence_draft_BD20-E34A-47BC.pdf`, the header's version, in 1.27 s; "PDF saved."; still "This connection is a draft" | the same, in 1.22 s | pass |
| D, download from the details | as C | `…_draft_294E-2CA8-EC64.pdf`, in 1.08 s | the same, in 1.09 s | pass |
| C and D, the files (`files.csv`) | every page's text and the properties | no "http", no "/api/connect" and no "connect" outside "connection", in the pages or in Title, Subject and Keywords (FR-013). "DRAFT" and "DRAFT · NOT LIVE" on all 6 pages. Page 1's eyebrow, "Draft Not live yet" and "Last saved … (draft save 1)". Section 1's two sentences, naming Standard, Taxi and Hire car. The title "Draft – … – Connection details" and the keywords "connection <id>; version <version>; draft". C: "To finish before publishing (2)" with both gaps on page 1, and the two "Not complete: …". D: no gaps box and no "Not complete" | the same | pass, 15 of 15 per file |
| Published meanwhile | tab 1 shows a fresh copy of D; tab 2 publishes it unchanged (200, live); then the download in tab 1 | before the click, tab 1 still shows the draft. After it, "Your connection is active", and the file `…_9136-E998-8D35.pdf` (no "_draft_") in 2.29 s. The header's version equals the API's after publishing and the draft's (published unchanged keeps it). "PDF saved." | the same, `…_2946-92A0-A59F.pdf`, in 1.50 s | pass, 8 of 8 |
| Published meanwhile, the file | its text and properties | no "DRAFT"; the request link and the three result links (`…/api/connect/…`); "Active as of …"; no gaps box; a title without "Draft" and keywords without "draft" | the same | pass, 10 of 10 |
| Deleted meanwhile | tab 1 shows a second fresh copy; tab 2 deletes it (200); then the download in tab 1 | "Page not found" as the only `h1`; no file within 8 s; after the click, one request names the copy: the run's `GET` (404) | the same | pass, 5 of 5 |
| all states | the console | nothing from the app. The browser's own line for the 404 (Chromium). The dev server's lines: `[vite]`, React's DevTools hint and, in Firefox, React 19's dev-build performance tracks (`console.timeStamp`) | the same | pass |
| the six saved files | veraPDF 1.28.1, PDF/UA-1 | 106 rules, 0 failed checks | the same | pass |

**The gaps against the server** (FR-010, R10 "Not gaps"; `gaps-server.ts`):
- **C refused**: the script read C with `GET` and sent the body the editor sends for a stored
  draft to `POST /{id}/publish`: the name, the description, the documents' keys, the branches as
  stored, `numbering_base` from the counters and `version`.
  - The answer was 400 with "Licence class B in Hire car has no error message.". That is the
    first gap on page 1 of the PDF made from the same `GET`.
  - In German (`Accept-Language: de`) the answer was "Licence class B in Hire car hat keine
    Fehlermeldung.", again the German PDF's first gap.
  - With that gap filled in the body only, the answer was 400 with the PDF's second gap, in
    both languages. So the server refuses in the PDF's order.
- **Nothing written**: afterwards C was unchanged. It is still a draft, at save number 1 and
  version BD20-E34A-47BC, with the same `updated_at` and the same last activity.
- **D's copies**: the first four copies had no gaps heading and no gap in their PDFs (made from
  the API's answer, before the runs). All six copies the runs published answered 200, live
  (§8.3).

**Earlier runs** (`run1-*`, `run2-*`), each re-run with fresh copies of D. No app defect:
- **Chromium, run 1**: 5 rows failed on the script's own checks. Two compared the code's width
  with A's, which differs by content, and the console check counted the dev server's lines.
- **Firefox, run 1**: the console check failed on React's `timeStamp` lines and on one dev-server
  module load (`rules/src/checks/literals.ts`) cut off by a navigation.
- **Firefox, run 2**: one row failed. The run before had left the pointer where C's button now
  sat, so the button had KERN's hover tint. Since then the script moves the pointer away before
  it measures. Chromium's final run came before that line, with the same rows.

**T045, 2026-11-15**, the header across languages and widths (quickstart §5 step 5, §6 "Narrow
screen"; §2, §3), report-only, in headless Chromium 156 and Firefox 159 (Playwright MCP).
- **The stack**: the dev SPA (5173) against the backend on 3000 (`template_db`, the tests' fake
  EUDIPLO, the worker off), signed in as `t037`.
- **The widths**: 1440 is a 1455 × 1000 window. The narrow width is §7.1's emulation, a 167 × 500
  window standing for 320 px at 200 %. In it the header is 134 wide in Chromium and 149 in
  Firefox (Chromium keeps a scrollbar gutter), so the controls' row is 110 and 125.
- **The script**: `011/T045/sweep.js` in the chat's scratchpad, one `browser_run_code_unsafe`
  call per browser. The language is set through its `localStorage` key and restored at the end.
  Busy is the run's `GET` held by `page.route`; failed is that `GET` aborted
  (`internetdisconnected`). The focus rows are after a click, after a pointer press on "Try
  again" and after Tab.
- **The files**: `chromium.csv` and `firefox.csv` (362 rows each), `*-summary.txt` and
  `summary-both.txt`, and four screenshots per browser of failing English states
  (`<browser>-A_*.png`). `run1-chromium/` is a first run whose word-break check took the alert's
  title and text for one word.
- **The states**: A open, A closed, B and C, in English and German, at both widths (16). Then busy,
  saved and failed in German at both widths. B and C show the Summary open, as they arrive.
- **Cited, not re-checked**: the run's behaviour (§7.2, T033) and C's English header (§7.2, T037).
  The English header at 1440 and its narrow idle state are re-measured here only beside the new
  states (marked "cited" in the CSV's `origin` column).

| Check | States | Chromium | Firefox | Result |
|---|---|---|---|---|
| horizontal scroll, `h1` count, clipped or off-screen elements, overlaps | all 20 | none, one `h1`, none, none | the same | pass 20/20 |
| button label | all 20 | "Download PDF", "PDF herunterladen", busy "PDF wird erstellt …" | the same | pass 20/20 |
| version: one line, code never broken | all 20 | the code on one line everywhere. Narrow: "Version" / the code (2 lines), wrapping before the code as §2 asks | the same | pass 20/20 |
| contrast: "Version", the code, the button's label | idle and failed | 7.61 (`#4a5468`), 18.72 (`#0b1220`), 5.77 (`#1d56f0`), on white | the same | pass |
| contrast: the busy button's label | busy de, both widths | **3.17** (`#658cf5` on white) | the same | fail (defect 4). After T046: unchanged, 3.17 in both browsers; exempt as an inactive control (D8) |
| contrast: the alert's title and text, "Erneut versuchen" | failed de, both widths | 16.99 (on `#fef1f0`), 18.72, 5.77 | the same | pass |
| button 48 px high, label on one line in its box | 1440 (10 states) | 48, one line | the same | pass 10/10 |
| button 48 px high, label on one line in its box | narrow (10 states) | en 110 × 66 ("Downlo / ad PDF"), de 110 × 90 ("PDF herunte / rladen"), busy de 110 × 114 (4 lines) | en 125 × 66 ("Download / PDF"), de 125 × 90 ("PDF herunterl / aden"), busy de 125 × 66 | fail 10/10 (defect 1). **After T046** (the row now asks for no break inside a word and no overflow, D8): no glyph; en 110 × 66 "Download / PDF", de 110 × 90 "PDF / herunter- / laden", busy de 110 × 66 "PDF wird / erstellt …"; Firefox the same at 125 wide. Pass 10/10 per browser |
| no text broken inside a word | narrow | en: the button's label. de: the label, the heading "Zusammenfass / ung", the toggle "Zusamme / nfassung ausblend / en", the alert's "Internetver / bindung" | en: none. de: as Chromium, at other letters | fail: Chromium 10, Firefox 6 (defects 1, 3). **After T046**: spec 011's elements (version, button, alert, "Erneut versuchen") break inside no word; the button and the alert break at their soft hyphens ("herunter- / laden", "Internet- / verbindung"). The heading and the toggle still break inside "Zusammenfassung" (and "ausblend / en" in Chromium), accepted under spec 008's rule (D8) and reported as information. Pass 20/20 per browser |
| no count split from its noun | A en 1440; narrow | "· 12 / rules" at 1440 (B and C break elsewhere: their codes are wider); narrow: 2 or 3 splits per state in both languages | the same at 1440; narrow 1 or 2 per state | fail 12/12 per browser (defect 2). **After T046**: none in any of the 20 states in either browser; at 1440 A's counts still take two lines, breaking before "12 rules"; narrow, four lines ("2 Dokumente · / 12 Felder · / 3 Varianten · / 12 Regeln"). Pass 20/20 per browser |
| `:focus-visible` | busy, saved, failed de, both widths | after a click on the button, after saving, after the failure, while "Erneut versuchen" is pressed with the pointer and after its click (the focus on the button): no ring. After Tab, to the button and on to "Erneut versuchen": KERN's 4px solid ring | the same | pass 14/14 |
| the live region | busy, saved, failed de, both widths | "Das PDF wird erstellt …", then "PDF gespeichert."; empty after the failure | the same | pass |
| the alert's German texts | failed de, both widths | "Das PDF konnte nicht erstellt werden", "Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.", "Erneut versuchen" | the same | pass |
| FR-006: the create flow's last step with a local draft open | en 1440 | a local draft of D's content, seeded under `t037`, opened at step 4 ("Test rules with sample citizen data"): no element named "Download PDF", no "Version …"; the record removed afterwards | the same | pass |
| FR-006: the edit flow of A | en 1440, steps 1 to 4 (the step line) | none on any step | the same | pass |
| FR-006: the approval page | en 1440 | a request to publish a fresh copy of D, made with a personal access token (level drafts): the Summary card shows, with no "Download PDF" and no "Version …" | the same | pass |
| console | all | only the browser's lines for the aborted requests, and the dev server's lines | the same | pass |

**T032's open rows as measured now** (the decision stays with T046, or the designer where the
layout is theirs):
- **A's counts at 1440, English**: still 124 high. The counts wrap to two lines beside the version
  (heading block 281.9 × 76), and the line breaks between "12" and "rules". B's and C's counts
  wrap too, but break before "12 rules", because their codes are wider. After T046: still 124
  high and two lines (the version's place stays the designer's), but every count breaks before
  "12 rules" (no-break spaces, D8).
- **German at 1440**: still 156 high. The heading takes the row (782 wide, counts on one line).
  The version, the button (208.9 × 48) and the toggle (249.5 / 228.9 × 40) wrap together under
  it, at the right, 8 apart, 24 from the edge. Nothing overlaps.
- **The narrow width**: the order is heading, version (two lines, before the code), button,
  toggle, with no overlap and no horizontal scroll. But the button's label still breaks, open and
  closed: 66 high in English (inside "Download" in Chromium), 90 in German (inside
  "herunterladen" in both browsers), 114 for the busy label in Chromium. This is against §2's
  "keeps its full label and 48 px height". After T046: no glyph, the label wraps only between
  words or at the soft hyphen (66 en, 90 de, 66 busy de, in both browsers), and §2 now says
  so (D8).

**Defects** (for T046; none fixed here):
1. **The narrow button** (rows "button 48 px high", "label width against its box", "no text
   broken inside a word" for `button`/`label`, narrow states). In `PdfDownload.tsx`: the button
   is `max-w-full` with `narrow:px-7!`, in a 110 (125) px row. "Download PDF" with the glyph needs
   about 150, so the label wraps, and spec 008's narrow `overflow-wrap: anywhere` (`index.css`)
   breaks it inside a word. "PDF herunterladen" (`CONNECTION_DETAIL_COPY.downloadPdf`) is longer
   still. This is carried from T032. **After T046: fixed** (the glyph dropped on narrow windows,
   a soft hyphen in `herunter\u00ADladen`, §2 corrected; D8).
2. **A count split from its noun** (row "no count split from its noun"; A en 1440 and every narrow
   state). `summaryCountsOf` (`utils.ts`) builds the counts from
   `CONNECTION_DETAIL_COPY.summaryCounts` / `rulesCounts`, which join each number and noun with a
   plain space. At 1440 the wrap comes from spec 011's version beside the counts
   (`DetailAccordion.tsx`, `basis-200`). This is carried from T032. **After T046: fixed** (a
   no-break space between number and noun in `summaryCounts`, `items` and `rulesCounts`, both
   columns; D8).
3. **German words broken inside at the narrow width** (row "no text broken inside a word", de
   narrow). "Zusammenfassung" in the heading and in the toggle (`DetailAccordion.tsx`, words from
   `CONNECTION_DETAIL_COPY.summaryTitle`, `viewSummary`, `hideSummary`; spec 008's and 009's,
   not spec 011's). "Internetverbindung" in the alert (`PdfFailure` in `PdfDownload.tsx`,
   `pdfFailedText`). The cause is spec 008's `overflow-wrap: anywhere` with words wider than the
   110 (125) px column. Spec 009's order would apply: the glossary's short form first.
   **After T046**: "Internetverbindung" fixed with a soft hyphen in `pdfFailedText` (spec 009's
   R9 step 3); "Zusammenfassung" not changed, accepted under spec 008's narrow rule (D8).
4. **The busy button's contrast** (row "contrast: buttonLabel", busy). KERN's
   `.kern-btn--secondary[aria-disabled=true]` sets an `opacity`, which turns `#1d56f0` into
   `#658cf5` (3.17:1). `PdfDownload.tsx` sets `aria-disabled` while busy, as `ConfirmDialog`'s
   busy button does (§3). WCAG 1.4.3 exempts inactive components. Whether the busy label counts
   as one is for T046 to decide. **After T046: not changed**, exempt (D8).

**T046, 2026-11-15**, the failing rows re-run after the fixes (D8), in headless Chromium 156 and
Firefox 159 (Playwright MCP), on the same stack, account and widths as T045.
- **The script**: `011/T046/sweep.js` in the chat's scratchpad, T045's script cut to the 16 idle
  states and busy, saved and failed in German at both widths (FR-006's pages had no failing row
  and are left out). Changed: the soft hyphen is left out of the texts it compares and counts as
  a hyphenation point; each character's line is read from its last client rect (for the first
  character of a line Chromium also gives one at the previous line's end, which made the first
  runs report "herunter-l / aden" for a button that showed "herunter- / laden"); at the narrow
  width the button's rows ask for no break inside a word and no overflow instead of 48 px and
  one line. New rows: the glyph shown (1440) or hidden (narrow), the button's `aria-label`
  ("PDF herunterladen" in German, none in English and while busy) and the alert's soft hyphen.
- **Results**: 425 rows per browser, 423 pass, 2 fail: the busy label's contrast (3.17), which
  D8 records as exempt. Every other row of T045's table that passed passes again, the focus and
  live-region rows included.
- **The files**: `chromium.csv`, `firefox.csv`, `*-summary.txt`, `*-summary.json`;
  `run1-chromium/` to `run3-chromium/` are the runs before the glyph's `!` and before the
  script's two corrections (the screenshots there show the button as built at each step).

**Data made and removed**:
- A copy of D (`b766d9ac-ae5b-49bd-b0e6-0f3a3f9eb70e`, draft, `DD13-CD62-579B`) made by
  `setup-copy.ts`, then deleted (restorable deletion, 404).
- Per run, a personal access token "T045 sweep <browser>" (level drafts; the secret kept only
  in the run's memory) and an approval request to publish the copy. Each request was declined
  and its token revoked: requests `60f38299-9cde-48f3-a58a-a63e6af6a0b4` (Chromium, run 1),
  `bc82102b-bf30-4e63-9863-5a8f2ca3ce23` (Chromium) and `e029e14d-7b86-4cd5-b98c-9ff2de95cb14`
  (Firefox); tokens `4ccae3b0-…`, `e8fb9ec3-…`, `c4486752-…`. Afterwards the account lists no
  agent access.
- Per run, one local draft in the browser's storage, removed in the same run.

**Needs a person**: the 200 % zoom confirmed once with the browser's own zoom (Phase 8,
"Needs a person"). The narrow width here is emulated with a narrow viewport.

### 7.3 The PDF's pages

**A in English against the prototype's `published-ids-top.pdf`** (T026, 2026-11-12; quickstart §2
step 4). A scratchpad script (`011/T026/sweep.ts`, `npx vite-node` from `frontend/`) renders A
through `recordingDocument()` and the prototype from a wrapped copy of `make.mjs` (the PDFKit
constructor injected, nothing else changed) through the same recorder, and writes one CSV row per
page and text for both (page, text, x, y, size, font, colour, role). Texts are paired per page
for the band and the bottom, and in reading order for the body (longest common subsequence;
where one file splits a text the other draws whole, the parts are joined); positions are compared
where the first glyph starts, and a vertical step (a pair's dy changing from the pair before it)
is attributed to its cause, so that a text moved only by the content above inherits that cause.
Both files have 6 pages, and no text is on a different page. Rows: 274 in A, 222 in the
prototype (counted below only when no A text pairs with them).

| Page | Same | Intended (colour only) | Unsure | Defect before | Defect after |
|---|---|---|---|---|---|
| 1 | 2 | 44 (25) | 0 | 0 | 0 |
| 2 | 0 | 30 (15) | 0 | 0 | 0 |
| 3 | 0 | 53 (19) | 0 | 25 | 0 |
| 4 | 0 | 63 (18) | 0 | 31 | 0 |
| 5 | 0 | 69 (20) | 0 | 8 | 0 |
| 6 | 0 | 33 (17) | 0 | 7 | 0 |

"Same": page, position (within 1 pt), font, size and colour. Only two texts are the same in every
respect, since §5.1 changes nearly every colour; "colour only" counts the texts whose single
difference is §5.1's.

| Intended difference | Source | Rows (pages) |
|---|---|---|
| Colours as §4 (every pair whose colours map) | §5.1 | 209 (1–6) |
| The links' explanations are `DETAIL_COPY`'s, with the {reference} sentence | §5.5 | 4 (1) |
| URLs drawn one line per `urlLines()` line, broken after "/" | §5.7 | 12 (1) |
| A as the app stores it: the catalog's labels and order of data items (with the rows they move), statements from `rules/src/` with values as chips, an added group's members marked "Added here", Hire car's fixed date | §5.15 | 13 (2), 11 (3), 17 (4), 48 (5), 8 (6) |
| A statement's words centred on its chips' line: 0.9 pt per card with values, and the texts below it on the page moved by those steps | §5.15 (T023's note) | 25 (3), 31 (4), 8 (5), 7 (6) |
| The documents' right column keeps the frame's 12 pt padding (6 pt further left) | §5.16 | 1 (2) |
| The version: the backend's `FA7E-47BB-5368`; the prototype hashes its own data shape (`62D0-715F-01D1`) | §8.4 T021, "Fixtures" | 3 (1), 1 on each other page |

Fixes (each re-run with the script; the counts above are after them):

| Defect | CSV rows before | Cause | Fix | Test |
|---|---|---|---|---|
| The AND/OR connector 14.05 pt high instead of 14 (T023's note) | 71 on pages 3–6: every text after a connector moved 0.05 pt more, e.g. page 3 "group-1" dy 1.90 with a step of 0.05 after "AND" | `connectorLayout()` took the block's height from its word's line, line gap included | The word's box is its glyphs, so the block is the chip's 14 pt line | `blocks.test.ts`, "an AND/OR connector is its chip’s line, 14 pt" |
| Headings' tagged text read "1  Links for your service", "Variant  Standard", "Personal ID   7 data items", "rule-1Minimum age" (T025's note; contract §4, R5) | 29 of A's 32 headings (the summary's heading check) | The gap was drawn as spaces inside the text (`numberSeparator`, `wordSeparator`, `countSeparator`), and the identifier and the name were two marked contents without one | The first part ends with one space (the number, "Variant", the document's name, the identifier when a name follows), and the second part is placed where the first part and its separator end: nothing drawn moves (dx 0 against the prototype); §5.17 for a title that wraps | `render.test.ts`, "reads each heading with single spaces" and "draws the gaps as before" |
| A removed or dissolved group's "Group · <AND/OR in words>" in the accent colour, neither muted nor struck (T025's note; FR-017, contract §2) | none in A, which has no removed group; E has 98 such groups | `groupHeaderLayout()` always used `groupCombines` | `PDF_STYLES.groupCombinesFaded` (muted, struck through), used when the group is faded | `blocks.test.ts`, the removed and dissolved group cases and "a group that isn’t faded"; `render.test.ts` (E), "mutes and strikes the “Group · …” line" |

After the fixes: veraPDF's PDF/UA-1 profile passes for A in English and German and for E (106
rules, 0 failed checks each); E has 764 pages and strikes 3,068 texts, each with its line (D3's
2,970 plus the 98 faded groups' lines, one line each), 542 of them over two lines or more.
D3's list of faded styles gains `groupCombinesFaded`.

**C and D in English against the prototype's draft** (T037, 2026-11-13; quickstart §3).
- **The script**: `011/T037/sweep.ts` (`npx vite-node` from `frontend/`), with `causes.ts` beside
  it, rebuilds T026's method above.
- **What it renders**, all at 09.11.2026, 16:45, through `recordingDocument()`:
  - C and D: `SAMPLE_DRAFT_GAPS` and `SAMPLE_DRAFT` from `testData.ts`.
  - C's reference: the prototype's draft, `draftOf(sample)`, from a wrapped copy of `make.mjs`.
    The copy injects the PDFKit constructor, makes the font path absolute and exports in place
    of the last loop. Its file has the 82,242 bytes of `draft-ids-top.pdf`, which
    `node prototype/make.mjs` made in the scratchpad.
  - D's reference: the prototype's completed draft, `completed(draftOf(sample), sample)`. The
    prototype makes no PDF of it.
- **Pairing**: as T026's, with one addition. The script also renders A and
  `published-ids-top.pdf` and pairs them the same way. A C or D pair whose two texts and
  difference (dx, dy, the vertical step, the pairing) equal A's pair is cited "as in A", with
  T026's causes (§5.15–§5.17). So only the draft's own content needs a cause of its own.
- **Counts**: both files have 6 pages, as their references, and no text is on a different page.
  C has 275 texts and its reference 229; D has 272 and its reference 225.

| File | Page | Same | Intended (colour only) | Unsure | Defect |
|---|---|---|---|---|---|
| C | 1 | 4 | 27 (20) | 0 | 0 |
| C | 2 | 2 | 27 (13) | 0 | 0 |
| C | 3 | 6 | 48 (20) | 0 | 0 |
| C | 4 | 6 | 57 (19) | 0 | 0 |
| C | 5 | 2 | 67 (20) | 0 | 0 |
| C | 6 | 3 | 29 (18) | 0 | 0 |
| D | 1 | 5 | 34 (26) | 0 | 0 |
| D | 2 | 2 | 15 (6) | 0 | 0 |
| D | 3 | 6 | 48 (20) | 0 | 0 |
| D | 4 | 6 | 57 (19) | 0 | 0 |
| D | 5 | 2 | 67 (20) | 0 | 0 |
| D | 6 | 3 | 30 (18) | 0 | 0 |

"Same" includes the parts of a text the other file draws whole (C 9, D 9, the statements around
their chips).

| Intended difference | Source | Rows (pages) |
|---|---|---|
| Colours as §4: the draft blue, the band's tint, the pill's `#05669E`, the warning colours of the gaps box and of "Not complete:" | §5.1 | C 202 (1–6), D 200 (1–6) |
| The version: the backend's `3D3C-F9EA-5FE0` and `FA7E-47BB-5368`, where the prototype hashes its own data shape | §8.4 T021, "Fixtures" | C 7, D 7 (2 on page 1, 1 on each other page) |
| Sections 2 and 3 as in A against `published-ids-top.pdf`: the catalog's labels and order, the statements from `rules/src/` with chips, 0.9 pt per card with values, the right column, headings with one space | §7.3 above (T026): §5.15–§5.17 | C 128 (2–6) and 5 moved with them (6); D 134 (1–6) |
| The gaps box's sentence says "parts": it lists everything publishing refuses | §5.2 | C 1 (1) |
| The gaps box is 2 pt taller. Both files draw its sentence 32 pt below the box's top, but the prototype counts only 30 pt (12 and 18), so its box ends 2 pt before its own 10 pt bottom padding. Ours is measured as drawn, so section 1's heading, the dashed box and its two sentences sit 2 pt lower | §5.18 (R11, measured equals drawn) | C 4 (1) |
| A rule without a check reads as the Summary's rule row shows it: "Driving licence · Expiry date", without the prototype's "…" | §5.15 (FR-018, FR-019) | C 1 (6) |
| D's "Last saved": save 8 at 15:40 in `SAMPLE_DRAFT`, where the prototype's completed draft keeps save 7 at 14:10 | `testData.ts` (T018) | D 1 (1) |

Also checked:
- **No URL** (FR-013): no recorded text of C or D holds "http" or "/api/connect", in English or
  German. The files from the page are in §7.2.
- **The gaps**: page 1 of C lists "Licence class B in Hire car has no error message." and
  "Licence still valid in Hire car: choose a check." under "To finish before publishing (2)", the
  prototype's words at its places. D has no gaps box. The two "Not complete: …" lines pair with
  the prototype's (colour only, and moved with A's 0.9 pt step).
- **Page 1's shapes** (C against `draft-ids-top.pdf`, from the recording):
  - The band, its bar and the pill have the same boxes, the pill filled `#05669E` for `#0284C7`
    (§4). The status pill, the details box and the gaps' bullets are at the same places.
  - The gaps box is drawn in slices (the head 371.4–438.4, then one slice per gap) and spans
    371.4–484.8. The prototype draws one rect, 371.4–482.8 (the 2 pt above). Since T037a each
    gap's slice reaches 1 pt (`JOIN_OVERLAP`) into the slice above: its bar from 437.4 and
    455.6, and a strip of the fill right of the bar across each join (437.4–439.4,
    455.6–457.6), so that the slices read as one box with no seam; the box's top, bottom and
    heights are unchanged.
  - The dashed box is 76.4 high in both files, ours 2 pt lower.
- **German page 1 of C** (carried from T036): page 1 ends after the dashed box in both
  languages, and the English one breaks there as the prototype's does. Section 2's heading keeps
  with its first document (FR-025):
  - In English, 164.7 pt are left on page 1, and the heading with "Personal ID" needs 195.0
    (24 + 48.2 + 14 + 108.8).
  - In German, 152.6 pt are left and 209.2 are needed, since the heading's lead takes one more
    line (62.4).
  - This is the prototype's rule, not a defect. D keeps the heading and its first document on
    page 1 in both languages, and its second document starts page 2, as in the prototype.
- **The accepted choices** (compared, not re-decided):
  - The dashed box is two `P`s (D6), as the recording's roles show.
  - The other choices don't occur in C or D, so `blocks.test.ts` and `render.test.ts` (T035,
    T036) stand for them: a page that begins inside the gaps list has no place label, a cut
    incomplete rule is dashed only in its last piece, and the band cuts a long name before the
    pill. In C and D no page begins in the gaps list, no rule is cut and the name fits.
- **veraPDF**: the six files from the page pass PDF/UA-1 (§7.2).
- **No page image** was opened, since no row is unsure or failing.

No defect, so no fix. The script's files: `sweep.csv` (553 rows: 278 for C, 275 for D),
`summary.txt`, `summary.json`, the rendered PDFs under `files/` and the wrapped prototype under
`proto/`.

**The seams at the joins of fills** (T037a, 2026-11-13; found by the coordinator in T038: C's
page 1 from the page, in pdf.js 3.11.174, showed a light hairline across the gaps box's fill and
bar where the heading's slice meets the first gap's and the two gaps' slices meet).
- **Cause**: each block draws its own fills, and where two of one colour only abut, a viewer
  anti-aliases each edge on its own, so the row of pixels on the edge lets the page show through.
  The same held for the group bars, which T026 and T037 compared by their texts only: a member's
  bar reaches up by its gap to the bar above and stopped there (A, C, D and E).
- **Fix**: `reachOf()` in `blocks.ts` gives `render.ts` how far a rect that `joinsAbove` reaches
  up: its block's gap, and 1 pt more (`JOIN_OVERLAP`) where the block above on the same page
  continues it with a square rect of the same fill down to its bottom. A gap's slice joins above
  with its bar and with a 1 pt strip of its fill right of the bar (the strip leaves the bar's
  columns, so the bar's top edge lies over the bar above). A gap that begins a page, and a
  member's bar under its group's tinted header, reach no further than before. Heights, texts and
  tags are unchanged (R11). Tests: `blocks.test.ts` ("joins each gap's slice …", "reaches a
  group's bar …", the 300 gaps' "draws nothing above the box …"), `render.test.ts` (no two fills
  of one colour edge to edge without a shape over the edge, in A, C, D, E and 80 gaps; C's page 1).
- **The pixel check** (`011/T037a/`; `bin/probes.ts` with `npx vite-node` from `frontend/`, then
  `www/probe.html` in the Firefox Playwright MCP, pdf.js 3.11.174 from cdnjs): every place where
  two painted fills meet edge to edge, found in the recording of A, C and a draft with 80 gaps (G,
  3 pages of box) in English and German, and the first 12 such pages of E, sampled at 1.35× and
  4× in the bar's column and the fill's (the lightest of the three pixel rows on the edge against
  the colours drawn on either side and two control rows; 6 the tolerance on the sum of R, G and
  B). G's box is also checked above its top and below its end on each of its three pages (white,
  and nothing of it above the body's top where it continues).

| Join | Files | Before: pass / fail | After: pass / fail |
|---|---|---|---|
| Gaps bar, slice to slice | C en, C de, G en, G de | 39 / 281 | 320 / 0 |
| Gaps fill, slice to slice | C en, C de, G en, G de | 87 / 233 | 320 / 0 |
| Group bar to group bar | A, C en, C de, E | 56 / 282 | 338 / 0 |
| Group bar to a tinted header or end | A, C en, C de, E | 90 / 0 | 90 / 0 |
| Outside G's box: above its top, below its end, on each of its pages | G en, G de | 48 / 0 | 48 / 0 |

  The worst seam before: 203 lighter (sum of RGB) in the gaps bar, 9 in its fill, 34 in a
  group bar. One sample below G's box is the watermark's blue, not the box. The files: `results/`
  (`joins-*.csv`, `pixels-before.csv`, `pixels-after-at-before.csv`, `pixels-after.csv`,
  `summary-*.txt`, `compare.txt`). No page image was needed.
- **T037's sweep** re-run on a copy (`011/T037a/sweep/`): `sweep.csv` and `summary.txt` are
  byte for byte T037's, so no row moved. veraPDF's PDF/UA-1 profile passes C and D in English and
  German (106 rules, 0 failed checks each).

### 7.4 Tags, contrast and veraPDF

**T043, 2026-11-15**, the PDF's structure and contrast (quickstart §5 steps 2–4; R5; FR-036 to
FR-040, FR-043, SC-006), script-first and report-only.
- **The script**: `011/T043/sweep.ts` (`npx vite-node` from `frontend/`). It renders 9 files at
  09.11.2026, 16:45, each twice through `recordingDocument()`: uncompressed for the raw bytes and
  the recording, compressed as the worker ships it for veraPDF.
  - The files: A (`SAMPLE_PUBLISHED`), B (A deactivated, as `model.test.ts`'s `deactivated()`),
    C (`SAMPLE_DRAFT_GAPS`) and D (`SAMPLE_DRAFT`) in English and German, and E
    (`largestConnection()`) in English. The documents are re-labelled in the language, as
    `render.test.ts`'s `modelIn()` does.
  - The recorder is subclassed to give every text and painted shape its drawing order and every
    text its alignment, so that the fill under a text and anything painted over it are known.
  - veraPDF 1.28.1 runs in Docker (`verapdf/cli:v1.28.1 --flavour ua1`, no network).
- **Pages**: A, B, C and D have 6 pages in both languages. E has 764 pages, 39,048 texts and
  36,080 shapes.
- **What it checks**:
  - **Structure**: exactly one `H1`, holding the name, and heading levels that never skip going
    down. Every text sits in a tag or an artifact, and each tagged text's marked content is in
    the tree exactly once.
  - **Artifacts**: every shape is an artifact except D3's strike lines. The band's and the
    bottom's texts are `Pagination` artifacts, and so is the watermark. The body's only artifact
    texts are the AND/OR chips and the marks inside artifact circles.
  - **Tables and lists**: the details table has one `TH` (`scope: Row`) and one `TD` per row.
    The data items and the gaps are `L` › `LI` › `LBody`, counted against the model. A draft's
    links to create are two `P`s (D6).
  - **The outline**: the three sections, and under the third one entry per variant, each
    pointing to the page of its heading.
  - **Properties, from the raw bytes**: `/Lang`, the Info `Title`, `/DisplayDocTitle`,
    `pdfuaid:part`, no `/CIDSet`, `/StructTreeRoot` and `/MarkInfo`. Every font is embedded
    (`FontFile2`) with a `ToUnicode` map, and no base-14 font is used.
  - **Contrast**: every text against the fills painted under it, with the watermark's 6 %
    composited over text and background on every page of a draft (worst case: as if it lay
    under every text). A row is unsure when the background differs within the text's box, and
    fails when something is painted over the text.
  - **Edges**: no text or shape but the watermark within 14.17 pt of a page's edge.
  - **Status**: the status word, tagged, on page 1.
  - **Grey**: on A's pages with marks, the colours reduced to grey, and the meaning checked to
    lie in words and strike-through.

| Check | A en | A de | B en | B de | C en | C de | D en | D de | E en |
|---|---|---|---|---|---|---|---|---|---|
| One `H1`; levels never skip (headings) | 32 | 32 | 32 | 32 | 31 | 31 | 30 | 30 | 4,028 |
| Every text in a tag or artifact (texts) | 274 | 274 | 275 | 275 | 275 | 275 | 272 | 272 | 39,048 |
| Shapes artifacts, but strike lines (strike lines) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3,724 |
| Band, bottom, watermark `Pagination`; chips, step numbers, gaps' "!" the only body artifacts | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| Details table, `TH` `scope: Row` (rows) | 4 | 4 | 4 | 4 | 5 | 5 | 5 | 5 | 4 |
| `L`/`LI`/`LBody` (data items + gaps) | 12 | 12 | 12 | 12 | 12 + 2 | 12 + 2 | 12 | 12 | 12 |
| Links to create as two `P` (D6) | – | – | – | – | pass | pass | pass | pass | – |
| Outline: sections + variants, on their headings' pages | 3 + 3 | 3 + 3 | 3 + 3 | 3 + 3 | 3 + 3 | 3 + 3 | 3 + 3 | 3 + 3 | 3 + 20 |
| `/Lang`, `Title`, `/DisplayDocTitle`, `pdfuaid:part` 1, no `/CIDSet`, tagged | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| Fonts: 5 Type0, each with `FontFile2` and `ToUnicode` | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| Contrast ≥ 4.5 (colour and background pairs) | 42 | 42 | 42 | 42 | 48 | 48 | 43 | 43 | 55 |
| Nothing within 5 mm of an edge | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| veraPDF PDF/UA-1: 106 rules, 0 failed checks | pass | pass | pass | pass | pass | pass | pass | pass | pass |

- **Counts**: 616 CSV rows: 602 pass, 0 fail, 0 unsure, 14 information (A's grey rows and the
  extra file's).
- **The lowest contrasts**:
  - Published: the "Active" pill's word, 4.89 (`#1D7A2E` on `#EAF7E6`; A and E), then the accent
    on the neutral tint, 5.09.
  - Drafts, with the watermark composited: the accent `#1D56F0` on `#EEF1F6`, 4.67 (5.09
    without), on the chip's `#EEF3FE`, 4.76, and on the mark tint `#F8F1FC`, 4.78. §4's "above
    15:1 under the watermark" holds for the body text only; the accent keeps 4.5:1 even in this
    worst case.
  - Faded text (muted, struck): 6.72 on `#EEF1F6`, 6.88 on `#F8F1FC`, 7.61 on white. E strikes
    it in `H4` to `H6` and `P`.
  - Every text lies on one background, and nothing is painted over a text.
- **Grey (A, both languages)**: two pages carry marks, 4 and 5, not three as the task line
  expected. In grey:
  - "Changed here" and "Added here" share `#8A22B5` (→ `#595959`) and differ only in words.
    "Removed here" is `#4A5468` (→ `#545454`), told apart by its words and its item's strike.
  - Page 4's removed rule has 4 struck texts, each with its line. Its identifier, badge and
    message label stay unstruck, as D3 says.
  - The AND/OR chips (artifacts, accent or muted) are said in words on the variant's and the
    groups' lines.
  - Each status is a tagged word on page 1: "Active", "Aktiv", "Deactivated", "Deaktiviert",
    "Draft", "Entwurf".
- **The extra file "申請 🚕 Taxi"** (A renamed; the spec's edge case "Characters KERN's typeface
  doesn't have"):
  - It renders 6 pages without throwing. The Info `Title` (recorded and decoded from the raw
    bytes) and `fileNameOf()` (`申請 🚕 Taxi_FA7E-47BB-5368.pdf`) keep the characters, and the
    `H1`'s tagged text is "申請 🚕 Taxi".
  - veraPDF, as information only: not compliant, 104 rules passed and 2 failed, 14 failed checks
    in all. 7.21.7-2 (7 checks): `ToUnicode` values 0, `U+FEFF` or `U+FFFE`. 7.21.8-1 (7
    checks): references to the `.notdef` glyph. Both come from glyphs Fira doesn't have.
- **Cited, not re-checked**: `render.test.ts`.
  - English A, C and D: "writes a tagged PDF/UA document … no CIDSet", "builds the structure
    tree", "draws no text and no shape outside a tag or an artifact", "draws every shape as an
    artifact, but for the strike lines", "lists the data items, and a draft's gaps, as L › LI ›
    LBody", "points an outline entry to the page where each section starts".
  - German A and C (T042): "declares its language as de-DE and its title in German", and "names
    the sections … from the German tables" for the outline's titles.
  - The script ran the same checks on these files too, and they agree.
- **No defect**, so nothing for T046 from this sweep. No page image was needed (no failing or
  unsure row), and nothing needs a person, since veraPDF ran.
- **The files**: `sweep.csv`, `summary.txt`, `run.log`, the 10 PDFs under `files/` and
  veraPDF's XML reports under `verapdf/`.
- **After T046**: the counts now join number and noun with a no-break space, which the PDF draws
  in the details table's "Contents" row and in each document's "{n} data items" (D8). The same
  script, re-run as `011/T046/pdf/sweep.ts`, gives the same result: every row passes, veraPDF
  ua1 compliant for the 9 files, and the same pages, texts and shapes per file (A to E); only
  the byte counts change slightly (the subsets gain the U+00A0 glyph).

**T044, 2026-11-15**, the PDF's German texts and dates (quickstart §5 step 1; FR-034, FR-035,
SC-005), script-first and report-only.
- **The script**: `011/T044/sweep.ts` (`npx vite-node` from `frontend/`), run under
  `TZ=America/New_York`, `TZ=Asia/Tokyo` and the machine's UTC. It renders A
  (`SAMPLE_PUBLISHED`) and C (`SAMPLE_DRAFT_GAPS`) in English and German at 09.11.2026, 16:45
  through `recordingDocument()`. The German drafts are labelled as the hook's answer with
  `documentViewsOf(requested, 'de')`, as `render.test.ts`' `modelIn()` does.
- **Pairing**: each recorded text is tied to its block, its layout part and its span by replaying
  `blocksOf()`/`paginate()`/`layoutOf()` with PDFKit's measuring. Every recorded text matched its
  span, and the page counts matched. English and German are paired by block key, structure leaf
  and index (the band and the bottom by page and slot).
- **Rows**: 549 pairs, A 274 and C 275, as many as T026's and T037's English counts. Every text
  has a partner, both files have 6 pages in both languages, and no text moves to another page.
  The English wording is §7.3's (T026, T037) and isn't judged again here.

| Check | A pass / fail / unsure (n/a) | C pass / fail / unsure (n/a) | Evidence besides the script |
|---|---|---|---|
| Own texts equal in both languages outside `copy.test.ts`' allowlist | 210 / 0 / 0 (64) | 221 / 0 / 0 (54) | `render.test.ts` "leaves no English own text …" (T042) |
| Content equal across the languages | 64 / 0 / 0 | 54 / 0 / 0 | `model.test.ts` "keeps names, descriptions and messages as entered"; `render.test.ts` "is a German model of the same content" |
| Dates "dd.mm.yyyy, hh:mm", equal in both languages | 9 / 0 / 0 | 8 / 0 / 0 | `model.test.ts` "generatedAt and lastSaved.at are the English strings", "dates and times in Germany's time" |
| German statement equal to the rules package's | 61 / 0 / 0 (17 rules) | 60 / 0 / 0 (17 rules) | `model.test.ts` "the statements" (A 17, C 16 + rule-12) |
| German text within its `layoutOf()` box | 254 / 0 / 0 | 251 / 0 / 0 | none (new here) |
| The same text under New York and Tokyo as under UTC | 274 / 0 / 0 | 275 / 0 / 0 | none (new here) |
| **Row** | **274 / 0 / 0** | **275 / 0 / 0** | |

What each row means:
- **Own texts**: the German texts equal to the English are "Version" and "Version <version>"
  (allowlisted, D2), the section numbers, the "!" artifact before "Nicht vollständig:", and the
  option sets' labels that read the same in both of their sets ("B", "Malta", "Portugal").
  Nothing is left unexplained: each German text is content (A 64, C 54), a date (8, 8), the
  rules package's (44, 46), the German catalog's (12, 12), a German table's own text (41, 53),
  or composed of these (105, 102).
- **Dates**: every date is "09.11.2026, 16:45" or C's "09.11.2026, 14:10" in both languages (the
  band, the status note, the details' rows). The only other date is the day value of Hire car's
  rule-12 in A, "09.11.2026": a rule's value, the same in both languages and in `statementOf()`.
  All 549 texts are the same under all three time zones.
- **Statements**: the drawn pieces of each rule are joined and compared with `statementOf()` with
  the details' context, in the language. C's rule-12 has no check, so its subject is compared
  with `statementPartsOf()`'s ("Führerschein · Ablaufdatum").
- **Widths**: measured with PDFKit's `widthOfString`. The named boxes, German against English:

| Box | German (widest) | Box | English |
|---|---|---|---|
| The band's right group (version, generated) | "Version 3D3C-F9EA-5FE0" 118.8; "Erstellt 09.11.2026, 16:45" 79.3 | 253.0; 196.1 pt from the name, 166.6 from the ID | 118.8; 90.4 |
| The band's draft pill | "ENTWURF · NICHT AKTIV" 79.8 | sized by its word; 14.0 pt to the version, 102.3 from the name | 57.0 |
| The band's ID line | "Anbindungs-ID …" 210.0 | 289.1 | 210.0 |
| The status pill | "Entwurf" 31.9, "Aktiv" 20.7 | the word + 8 pt | 20.6, 25.0 |
| The badges | "Basiert auf Standard" 70.2, "Hier hinzugefügt" 56.3, "Hauptvariante" 48.8, "Eigene Regeln" 47.6, "Hier geändert" 46.9, "Hier entfernt" 44.2 | sized by the word; inside the body, no text overlapped | 64.5, 39.2, 42.4, 34.1, 46.7, 48.8 |
| The details' key column | "Zuletzt gespeichert" 78.6, "Anbindungs-ID" 60.5 | 110 (one line each) | 43.0, 57.0 |
| The bottom's place label | "3 Regeln je Variante › Variante Taxi (Fortsetzung)" 174.3 | 337.3; 261.4 pt from "Seite 5 von 6" | 160.9 |

  Every other one-line text is within its box, and no word of a wrapped text is wider than its
  box. No two texts of a block overlap.
  - 42 headings ("rule-1 ", "group-1 ", …, in both files) draw their trailing space 4.8 pt past
    the identifier's box. That space is the separator from T026's heading fix (§7.3). It draws
    nothing and is the same in English, so these rows count as pass.
- **SC-005** on the German pages (`pages.csv`; T023's `expectChainsAndUnits()` and
  `expectPagesKeepChains()`, copied from `blocks.test.ts` with a collecting `expect`): 0
  failures in A and C, in German and English.
  - No page ends with a heading or inside a chain.
  - Every place label is drawn. Each page that starts inside a section or variant it doesn't open
    says "(Fortsetzung)": A's and C's page 5, "3 Regeln je Variante › Variante Taxi
    (Fortsetzung)".
  - German breaks at the same blocks as English on every page. C's page 1 ends after the dashed
    box, as §7.3 (T037) records.
- **No page image** was needed, since no row fails or is unsure. The script's files: `sweep.csv`
  (549 rows), `pages.csv` (24 pages), `summary.txt`, `summary.json`, `run-*.json` (the three
  time zones) and the four PDFs under `files/`.

No defect, so nothing for T046.

### 7.5 Version, limits, edge cases and privacy

**T039, 2026-11-14**, the version end to end (quickstart §4 steps 1–7, §6 "Changed meanwhile")
on A and a fresh copy of D (§8.3) in headless Chromium 156 (Playwright MCP), a 1455 × 1000
window.
- **The stack**: the dev SPA on 5173 (`VITE_API_URL=http://localhost:3000`) against the backend
  on 3000 (dev database `template_db`, the tests' fake EUDIPLO, the worker off), its code at HEAD,
  signed in as the local account `t037`.
- **The script**: `011/T039/version-sweep.js` in the chat's scratchpad, one
  `browser_run_code_unsafe` call. Every download is saved and its bytes read in the script (as
  latin-1); `Subject` and `Keywords` are read from the Info dictionary, following PDFKit's
  indirect string objects (`/Subject 216 0 R`). Deactivating, activating, the two edits and the
  publish go through the API, the edit as "tab 2" of §6: a `PUT /api/form-connections/{A}` of
  the rules with `rule-12`'s message (Hire car, an empty variant, so nothing propagates) plus
  " (T039 edit)", then the message as before. Tab 1 is A's details, opened before the edit.
- **The files**: `chromium-version.csv` (59 rows, all pass), `chromium-version.json`,
  `summary.txt` (grouped per state and per check) and the 8 saved files under `dl/`. The first
  run (`run1/`) failed only on the script's own check: it read `Subject` and `Keywords` as
  inline strings, found the references and wrote `null` (16 rows); the files themselves held the
  right properties (checked after the run), and the run was repeated with a new copy of D.
- **Cited, not re-checked**: every kind of content change, one by one, in
  `backend/tests/unit/test_versions.py` (`test_each_kind_of_element_changes_the_version`, 30
  kinds, among them the documents' order, a rule's message and the order of a rule's values;
  `test_every_change_gives_a_version_of_its_own`; `test_an_edit_and_its_undo_give_the_same_version`;
  `test_the_version_takes_only_the_content`; `test_labels_and_branch_urls_leave_the_version`;
  `test_a_published_answers_other_fields_leave_the_version`;
  `test_a_drafts_other_fields_leave_the_version`) and in the API tests of T007 and T008:
  `tests/api/test_form_connections.py` (`test_status_changes_and_start_dates_keep_the_version`,
  F's start date changed and cleared included; `test_publishing_on_a_date_keeps_the_drafts_version`;
  `test_an_edit_of_a_rules_message_changes_the_version`;
  `test_a_save_that_only_reorders_the_documents_changes_the_version`, quickstart §4 step 5's
  second half; `test_the_version_is_the_same_in_german`) and
  `tests/api/test_form_connection_drafts.py` (`test_a_draft_published_unchanged_keeps_its_version`,
  `test_saving_a_draft_unchanged_keeps_its_version`,
  `test_reordering_a_drafts_documents_changes_its_version`,
  `test_a_draft_not_in_catalog_order_keeps_its_version_when_published`,
  `test_a_drafts_version_is_the_same_in_german`). The band's "Version …" on every page: the
  smoke test (`render.test.ts`, T024, T025). The PDF listing the documents in the new order
  (step 5): `model.test.ts` ("lists the documents in the answer’s order with the answer’s
  labels", whose reversed answer gives the reversed documents; the coordinator, T040).
- **The drawn content** (the coordinator, T040): the saved files read as text with T037's
  extractor (`011/T040/content.mjs`): every file's six pages each draw its own version in the
  band and no other; "(T039 edit)" is drawn only in the file of `5811-AF23-7955`, not in
  download 1 or in the file edited back. FR-005 holds in the content, not only in the name and
  the properties.

| State | What was checked | Chromium | Result |
|---|---|---|---|
| A, step 1 (EN) | API `published / live / 98C8-BFF0-B8E2`; the header's "Version …" before any click | `98C8-BFF0-B8E2` | pass 2/2 |
| A, downloads 1 and 2 (EN) | header after the click, file name, `Subject`, `Keywords` all `98C8-BFF0-B8E2`; `%PDF`, no failure (FR-031, FR-032, FR-033) | `Taxi and private hire driver licence_98C8-BFF0-B8E2.pdf`, 86 969 bytes both times; `Connection cd98…d476, version 98C8-BFF0-B8E2`; `connection cd98…d476; version 98C8-BFF0-B8E2` | pass 10/10 |
| A, in German (step 2) | the same five checks; `/Lang` | the same name and properties, `de-DE`, 88 594 bytes | pass 6/6 |
| A, deactivated (step 3) | `POST /deactivate` 200 `deactivated`, its answer's version; the five checks on the reloaded details | `98C8-BFF0-B8E2` throughout | pass 7/7 |
| A, activated again (step 3) | `POST /activate` 200 `live`, its answer's version | `98C8-BFF0-B8E2` | pass 2/2 |
| Changed meanwhile (§6, step 4) | tab 1 opened before the edit shows `98C8-BFF0-B8E2`; the `PUT` answers 200 with a new version; tab 1 still shows the old one until the click | `5811-AF23-7955` from the `PUT`; tab 1 `98C8-BFF0-B8E2` before the click | pass 3/3 |
| Changed meanwhile, tab 1 after "Download PDF" (FR-005) | header, file name, `Subject`, `Keywords` the new version; the Summary's Hire car tab shows the edited message | all `5811-AF23-7955`; "… (T039 edit)" shown | pass 6/6 |
| Edited back (step 5) | the `PUT` answers the first version; tab 1 after the click: the five checks | `98C8-BFF0-B8E2` again, the file byte for byte as long as download 1 (86 969) | pass 6/6 |
| D's copy, draft (step 6) | header = API; file name with `_draft_`, `Keywords` ending "; draft" | `931C-A869-BDBF`, `…_draft_931C-A869-BDBF.pdf` | pass 6/6 |
| D's copy, published unchanged (step 6) | `POST /publish` 200 `live` with the draft's version; "Your connection is active"; header before and after the click, file name (no `_draft_`), `Subject`, `Keywords` | `931C-A869-BDBF` throughout, `…_931C-A869-BDBF.pdf` | pass 8/8 |
| Restored | `GET /api/form-connections/{A}`; the language switch | `published / live / 98C8-BFF0-B8E2`; English current | pass 2/2 |

**T049, 2026-11-15**, the remaining edge cases and privacy (quickstart §6 "Language switched
while busy", "Leaving while busy", "Odd name", "Long name", "Privacy"; FR-034, FR-042, FR-044,
SC-008) on A and E (§8.3) in headless Chromium 156 and Firefox 159 (Playwright MCP), a 1455 ×
1000 window.
- **The stack**: the dev SPA on 5173 (`VITE_API_URL=http://localhost:3000`) against the backend
  on 3000 (dev database `template_db`, the tests' fake EUDIPLO, the worker off), its code at
  HEAD, signed in as the local account `t037`. The timings are the dev server's (T033's
  production timings stand, §7.2).
- **The scripts**, in the chat's scratchpad (`011/T049/`):
  - `sweep.js`, one `browser_run_code_unsafe` call per browser, loaded through `helper.mjs`, a
    local server on 127.0.0.1:47049 that hands over the password once, counts the rows of every
    table with `psql`, reads what the backend's log gained, and writes the CSV and the JSON. It
    records every request of the context (the worker's included) and every `download` event.
    A's renames go through the API (`PUT /api/form-connections/{A}` with `{name}`), and the name
    goes back in a `finally`.
  - `files.mjs` reads the saved files: `/Lang`, the Info dictionary's `/Title` (an indirect,
    UTF-16BE string) and the drawn text through T037's ToUnicode extractor (`pdftext.mjs`).
- **The files**: `chromium.csv`, `firefox.csv` (43 rows each), `t049.csv` (both plus the 26 file
  rows, 112 rows, all pass), `summary.txt` (grouped per state and per check), `*.json` (the
  requests, the counts, the log's new bytes) and the 18 saved files under `dl/`. Chromium ran
  three times; the first two runs (`run1-chromium/`, `run2-chromium/`) failed only on the
  script's own checks:
  - run 1 expected E's file name unshortened (E's name has 200 code points and a `:`; the file
    name was right);
  - runs 1 and 2 looked for "PDF herunterladen" without D8's soft hyphen ("herunter­laden").
  The oracle was then written from data-model §7, the soft hyphen stripped before every
  comparison, and Chromium and Firefox ran the same script.
- **Cited, not re-checked**:
  - the double activation and offline (§7.2, T033);
  - published and deleted meanwhile (§7.2, T037);
  - changed meanwhile (§7.5, T039);
  - the narrow screen (§7.2, T045);
  - the band's "…" for a long name (`render.test.ts`, T024: "cuts the name in the band to one
    line ending in "…", no wider than its box"; the files here have a "…" in the band of pages
    2–6, recorded, not judged);
  - the file name's rules one by one (`fileName.test.ts`, among them "keeps 100 code points of a
    200-character name …", "counts emoji as code points …");
  - the requests of the first run after loading the page, on the production build (§7.2,
    T033). On the dev server the first run fetches the modules one by one (51 distinct URLs),
    with only the GET naming the connection.
- **The backend's log**: the backend runs `uvicorn.run(…, log_level='warning')` with stdout and
  stderr in one file. The app configures no logging (no `basicConfig`, and the app doesn't load
  Alembic's `fileConfig`). Its loggers (`app.*`) are therefore at WARNING with no handler, and
  reach the file through Python's `lastResort` handler.
  - **What the log can show**: the app's warnings and errors, and uvicorn's (`uvicorn.error`).
  - **What it can't show**: INFO and DEBUG lines, and uvicorn's access lines (`uvicorn.access`
    at WARNING), so no request line.
  - This was checked by building the same logging configuration in a separate process
    (`uvicorn.config.Config(app, log_level='warning').configure_logging()`), not by restarting
    the backend.
  - **The static check**: `backend/app/` has 65 log calls (42 info, 15 warning, 8 error). None
    names a PDF. One names a "version": `services/rules.py`'s `logger.info('Form connection %s:
    rule set %s saved', …)`, the rule set's save number on a save. That number isn't the
    content's version, and it is logged at INFO. `services/versions.py` logs nothing, and no
    route makes or receives a PDF.
- **Left behind**: the four runs' renames (12 `PUT`s, the renames back included) left one
  `connection_activity` row on A (52 → 53), which the API can't remove. The four sign-ins added
  four `login_sessions` (47 → 51). A ends as before (`published / live / 98C8-BFF0-B8E2`, its
  name restored), and E is unchanged. The site is in English in both browsers (both were in
  German at the start). No test connection was made.

| State | What was checked | Chromium | Firefox | Result |
|---|---|---|---|---|
| E, language switched while busy (FR-034) | "Deutsch" clicked while busy: `html lang` `de`, the button "PDF wird erstellt …" | switched 1947 ms after the click | 1959 ms | pass 2/2 |
| the same, the file | saved (E's 764 pages), its name; `/Lang`; `/Title`; "Page 1 of 764" … "Page 764 of 764" drawn | 10.1 s; `A connection at the product's limits- twenty … and the_8402-3F5B-32B3.pdf` (100 code points, the `:` replaced); `en-GB`; "A connection at the product's limits: … – Connection details" | 14.2 s; the same name, `/Lang`, `/Title` and band | pass 12/12: the file is in the language at activation |
| the same, afterwards | the idle button in German, then back to English | "PDF herunterladen" 146 ms after the file; `en` | 160 ms; `en` | pass 4/4 |
| E, leaving for the overview while busy | "Your connections" clicked while "Creating PDF…" | 2035 ms after the click (the worker's files already requested: the run was in the worker) | 777 ms after the click (the worker not yet started: the run was in the fetch) | pass 2/2 |
| the same | `download` events within 90 s; tabs | 0; 1 | 0; 1 | pass 4/4: nothing saved later |
| Setup | sign-in; A and E at the start | 200; A `published / live / 98C8-BFF0-B8E2`, E `published / live / 8402-3F5B-32B3` | the same | pass 6/6 |
| A, the warm-up download (the first after loading) | saved, its name | 1154 ms | 1268 ms | pass 2/2 |
| A, five downloads with a warm cache (SC-008, FR-042) | each download's requests: one GET of A; no other | exactly `GET /api/form-connections/{A}`, nothing else, 5 of 5 (487–578 ms) | the same (611–788 ms) | pass 20/20 |
| the same | file name, no failure | `Taxi and private hire driver licence_98C8-BFF0-B8E2.pdf` | the same | pass 10/10 |
| around the five downloads | row counts of all 14 tables (`psql`) before and after | unchanged | unchanged | pass 2/2 |
| the same | the backend log's new lines; any naming a PDF or a version | 0 bytes; 0 | 0 bytes; 0 | pass 2/2; the log shows only warnings and errors (above) |
| the same | requests to another host | 0 | 0 | pass 2/2 |
| A renamed to `A/B: "test" <1>?` (FR-044) | `PUT` 200; the header's version = the `PUT`'s; file name | `EFEF-D462-520F`; `A-B- -test- -1--_EFEF-D462-520F.pdf` (each of `/ : " < > ?` replaced) | the same | pass 10/10 |
| the same, the file | `/Title` and page 1 hold the name as entered; `/Lang`; the band | "A/B: "test" <1>? – Connection details"; found on page 1; `en-GB`; "Page 1 of 6" … "Page 6 of 6" | the same | pass 10/10 |
| A renamed to a 200-character name (FR-044) | `PUT` 200 (200 code points); the header's version; file name | `8E71-ED63-BCB1`; the first 100 code points (`Führerschein … Verlängerung ode_8E71-ED63-BCB1.pdf`) | the same | pass 8/8 |
| the same, the file | `/Title` and page 1 hold the full name; `/Lang`; the band | the full 200 characters in both; `en-GB`; "Page n of 6" | the same | pass 10/10 |
| Restored | A: name, status, state, version; E; the site's language | `Taxi and private hire driver licence / published / live / 98C8-BFF0-B8E2`; E `published / live / 8402-3F5B-32B3`; `en` | the same | pass 6/6 |
| every state | console | only React's development entries (`console.timeStamp` tracks, the DevTools hint); none from the app, none naming a PDF or a version | the same | pass |

No defect. Nothing for T050 from T049.

**T048, 2026-11-15**, the limits (quickstart §6 "Limits"; FR-023 to FR-027, FR-045, SC-001,
SC-005): E (§8.3) in Node in English and German, and downloaded from its details in headless
Chromium 156 and Firefox 159 (Playwright MCP), a 1455 × 1000 window.
- **The stack**: the dev SPA on 5173 (`VITE_API_URL=http://localhost:3000`) against the backend
  on 3000 (dev database `template_db`, the tests' fake EUDIPLO, the worker off), its code at HEAD,
  signed in as the local account `t037`. Every browser timing is from the dev server, so it is an
  upper bound (T033 timed on the production build, §7.2). The Node renders ran while T049 drove
  the browsers (load average 0.6 at the start, 2.1 at the end, 8 CPUs).
- **The scripts**, in `011/T048/` of the chat's scratchpad:
  - `sweep.ts` (`npx vite-node` from `frontend/`) renders `largestConnection()` through
    `recordingDocument()` and checks every page against the blocks `paginate()` put on it. It uses
    copies of `expectChainsAndUnits()` and `expectPagesKeepChains()` from `blocks.test.ts`, the
    drawn texts against the blocks' layout spans, the bottom's label as drawn, each variant's
    nationality rule, and every unit (FR-025, FR-026).
  - `page-sweep.js` is one `browser_run_code_unsafe` call per browser. It makes 5 downloads of E:
    runs 1–4 in English (run 1 the first after loading the page) and run 5 in German. For each run
    it records the click to the `download` event, the longest gap between ticks of a 50 ms
    `setInterval` on the page, a wheel scroll and a toggle of "View links" while the button is
    busy, and the saved file: `%PDF`, size, page count, `/Lang` and name.
  - One more Chromium download with a CDP profile and a `longtask` observer (the probe below).
- **The files**:
  - `pages.csv`: 1528 rows, one per language and page, a column per check.
  - `tall-rules.csv` (40 rows), `units.csv` (1482 rows) and `labels.csv` (the bottom's label as
    computed and as drawn).
  - `chromium-page.csv`, `firefox-page.csv`, `*-page.json` and `summary.txt`, grouped per check.
  - The 10 saved files under `dl/`, the Node files under `files/`, and 4 page images under
    `images/` (pdf.js 3.11.174 in the Firefox MCP, from the files Firefox saved).
- **Cited, not re-checked**: E in English in Node, `render.test.ts` ("the largest connection
  (E)": the band on every page, everything tagged or an artifact, the tall rule's Div and P over
  pages, the groups' marks, the outline, no URL) and `blocks.test.ts` ("the largest connection
  (E) over paginate()'s pages", "a rule taller than a page", in both languages). The browser
  run's states and its requests are cited from §7.2 (T033), and the file name and the language at
  activation from T049 above.

| State | What was checked | Node / Chromium | Firefox | Result |
|---|---|---|---|---|
| E in Node, EN and DE | pages (`paginate()` and recorded), blocks; the invariants of `blocks.test.ts` | 764 and 764, 8052 blocks in each language; 0 failures | — | pass |
| the same, every page | blocks whole; only the nationality rule continues; no page ends with a heading or inside a chain; a group's header with its first member, a connector with its item, a group's end with its last member (FR-023, FR-024, FR-027) | 764/764 per language; 20 pages begin with a continuation, each of a nationality rule | — | pass 1528/1528 |
| the same | the label as computed: "(continued)" on every page after a variant's, group's or section's first (FR-025) | 763 labels per language; 399 pages begin inside a group begun earlier | — | pass 1528/1528 |
| the same | the band: ID, version, "Page n of N" / "Seite n von N" | 764/764 per language | — | pass |
| the same | the texts drawn on each page = its blocks' layout spans, in order (nothing drawn on another page) | 764/764 per language | — | pass |
| the same | **the bottom's label as drawn** (FR-021, FR-025, SC-005) | 42 pages (sections 1 and 2, Standard) drawn in full; on 722 the 100-character variant name cuts the label with "…" and "(continued)" / "(Fortsetzung)" isn't drawn | the same in the downloaded files (page images of p. 45) | **fail 1444/1528: defect 1**; fixed by T050, see below |
| E's nationality rule, 20 variants × 2 languages (FR-027) | pieces; values in order; cut between values; each continuation at the top of the next page; the message in the last piece only | 2 pieces each (EN 225 + 24 values, DE 214 + 35); all 249 drawn whole in order; the computed label "(continued)" | — | pass 40/40 (as drawn, the label lacks "(continued)": defect 1) |
| E's units (FR-025, FR-026) | a unit that fits on a page lies on one page | 741 per language, 340 fit, each on one page; the 401 taller ones flow | — | pass 1482/1482 |
| E rendered in Node | time (plain / recorded), size | EN 8.5 s / 9.5 s, 5 837 247 B; DE 8.4 s / 9.8 s, 5 915 964 B; the model about 0.1 s | — | pass (alongside T049) |
| E, 5 downloads (runs 1–4 EN, 5 DE) | click → `download` under 60 s (SC-001) | 7.1, 6.3, 6.5, 6.4, 6.5 s (7.6, 6.8, 7.0, 6.9, 6.7 s from before the click) | 12.1, 8.8, 8.8, 8.5, 8.9 s (12.6, 10.2, 9.3, 9.3, 9.3 s) | pass 10/10 (dev server) |
| the same | the file: `%PDF`, no failure, pages, `/Lang`, size; the name ends `_8402-3F5B-32B3.pdf`, name part ≤ 100 code points | 764 pages; `en-GB` 6 040 723 B, `de-DE` 6 124 991 B | 764 pages; 6 044 603 B, 6 124 988 B | pass 30/30 |
| the same | busy 500 ms after the click; still busy after the scroll and the toggle | `aria-disabled="true"`; busy | the same | pass 20/20 |
| the same | a wheel scroll answered during the run | 38, 38, 27, 36, 25 ms | 602 (run 1), 35, 47, 31, 21 ms | pass 9/10, unsure 1 (Firefox's first run) |
| the same | "View links" toggled during the run (`aria-expanded` false → true by the next frame) | 156, 407, 416, 410, 144 ms | 255, 353, 184, 170, 207 ms | pass 10/10 |
| the same | **longest gap between 50 ms ticks** (FR-003; the script's bound 200 ms) | 440, 449, 451, 472, 432 ms | 414, 382, 409, 393, 435 ms | **fail 10/10 on the dev server: finding 2**; fixed by T050, see below |
| Restored | E `published / live / 8402-3F5B-32B3`; the site in English | the same | the same | pass 4/4 |

**Defect 1, for T050: the bottom's label loses "(continued)" in variants with long names.**
- **The rows**: `pages.csv`, column `labelDrawn`, 722 of 764 pages in each language. For example,
  EN page 43 is computed as "3 Rules per variant › Variant Variant 1 for applicants … see be
  (continued)" and drawn as "3 Rules per variant › Variant Variant 1 for applicants from a district
  of the city and the docu…".
- **The images**: `images/ff-en-p45.png` and `ff-de-p45-bottom.png` show the nationality rule's
  continuation, from "Trinidad and Tobago" on, under a label that ends in "…" and never says
  "(continued)" / "(Fortsetzung)".
- **The file**: `render.ts`, the bottom's `paginationText(page.place, S.bottomLabel, …, { lines:
  'cut' })`.
- **The suspected cause**: `cutSpans()` cuts the label's one span at its end. With a variant name
  at FR-045's 100 characters, the suffix is what falls off. `placeLabelOf()` computes the label
  right, but as drawn the page breaks FR-025 and SC-005.
- **A possible fix**: cut only the variant's name and keep the suffix, either as a span of its own
  or with the label built from parts.

**Finding 2, for T050 to judge: the click re-renders the whole details page.**
- **What the probe saw** (Chromium, one more download): `longtask` entries at −7 ms (588 ms long),
  634 ms (169 ms), 805 ms (89 ms) and 937 ms (132 ms) from the click, and none later during the
  roughly 8 s that the worker renders.
- **The profile**: React's `jsxDEV` with 783 ms of self time and `react-dom` with 306 ms;
  `connectionPdf/model.ts` 4 ms and `useConnectionPdf` 13 ms.
- **In Firefox**: the console logged React's development render marks for every Summary component
  during the runs (`ValueChip` 635 times, `SummaryItem` 192, `Connector` 163, `RuleRow` 131 …).
- **The suspected cause**: `useConnectionPdf` lives in `pages/FormConnectionDetail/index.tsx`, and
  `RulesSummary` takes `pdf` without memoisation. So each state change of the hook (busy, the
  fetched connection, done) renders E's Summary again: 20 variants of 200 items.
- **Unknown**: the production build, which drops `jsxDEV` and React's development checks, wasn't
  measured, since the 5173 server stays the dev one. T050 or a person should measure E's longest
  gap on the build before deciding. A 50 ms tick gap of about 0.45 s is a freeze a person may
  notice, while the scroll (compositor) and the toggle were still answered during the run.
- **The files**: `useConnectionPdf.ts`, `pages/FormConnectionDetail/index.tsx` and
  `RulesSummary.tsx`.

**T050, 2026-11-15**, the fixes of T048's defect 1 and finding 2 (FR-003, FR-021, FR-025, FR-045,
SC-001, SC-005). T049 reported nothing.
- **The stack**: as T048's, with the 5173 server switched for the timings:
  - first the production build (`VITE_API_URL=http://localhost:3000 npm run build -w frontend`,
    served by `vite preview` on 127.0.0.1:5173, as T033 measured);
  - then the dev server again, as it was before.
  - Headless Chromium 156 and Firefox 159 (Playwright MCP), a 1455 × 1000 window, signed in as
    `t037`.
- **The scripts**, in `011/T050/` of the chat's scratchpad:
  - `sweep.ts` is T048's Node sweep with one check changed, `labelDrawn` (below).
  - `page-sweep.js` is T048's browser script with a tag per build and a `longtask` observer
    (Chromium only).
  - `helper.mjs` is T048's helper on port 47050.
  - `T044-rerun/` holds T044's German sweep re-run.
- **Defect 1, what changed**: the bottom's place label is now fitted when the page is placed, and
  only the variant's name is cut (D9).
  - `placeLabelOf()` (`paginate.ts`) takes the drawing's test of one line. A label that fails it
    keeps its section and "(continued)" / "(Fortsetzung)" whole, and the variant's name is cut
    with "…" to the longest start that fits (`cutToFit()`).
  - `render.ts` passes `measure.width(label, S.bottomLabel) <= PLACE_LABEL_WIDTH`. That is the
    width test `cutSpans()` applies when it draws, so the fitted label is drawn as it is (R11).
    `cutText()` now calls `cutToFit()`, the same search as before.
  - The band's name (`render.ts`, the other `lines: 'cut'`) is left as it is. Contract §2 cuts it at
    its end, and nothing follows it.
- **Defect 1, the tests**:
  - `paginate.test.ts`: a 100-character variant name whose page continues ends "… (continued)",
    fits its width, keeps as much of the name as fits, and does the same in German. Also covered:
    a variant's opening label, a label that fits whole, "…" alone, and `cutToFit()` by code
    points.
  - `render.test.ts`: on E, every drawn place label lies within its box, and the cut ones cut only
    the variant's name. Only pages that open a section or a variant lack "(continued)", at most as
    many as the outline's entries. Without the fix the test fails: 722 labels lack it.
- **Finding 2, the bound**: 200 ms for the longest gap between 50 ms ticks. That is INP's "good"
  bound and T048's.
- **Finding 2, the judgement**: the production build first ran without a change for finding 2
  (only D9 in it), and stayed above the bound once. Chromium's runs were within it (93–180 ms).
  Firefox's first run gave 215 ms, and runs 2–5 gave 150–175 ms. So the finding isn't a
  dev-server artefact alone, and T050 fixed it (D10):
  - `RulesSummaryBody` (new) is the Summary's open part, memoised, and doesn't take `pdf`. A
    run's state changes now render only the header's `PdfDownload`.
  - `index.tsx` hands a fetched connection to `replace` only when it differs from the one shown
    (`isShownConnection()` in `utils.ts`, tested in `utils.test.ts`). An unchanged answer no
    longer renders E's Summary again, and a changed one still replaces it (FR-005). On E the
    comparison takes 10–20 ms (1.47 MB of JSON), measured in Chromium.
  - The hook stays in `index.tsx`, and `state` and `download` still go down as one prop (D5).
- **Finding 2, the first run after loading**: Firefox's run 1 stays above the bound (294 ms on the
  build). Run 1 starts the moment the button appears, while the page is still settling after the
  load: E's rule checks come back from their worker and render.
  - **The probe** loads E, waits 3 s or 8 s, then downloads.
  - **Without a click**, the first seconds after the load already show gaps of 96–115 ms in
    Firefox and 103–139 ms in Chromium.
  - **After the wait**, the first download's longest gap is 106 and 99 ms in Firefox, and 92 and
    77 ms in Chromium.
  - So the download's own first run (the module imports, the worker's start, the option sets) is
    within the bound. The excess comes from the overlap with the page's load (spec 003's checks),
    which T050 doesn't change.
- **The production timings of E**, on the fixed build: click → `download`, and the longest gap.

| Run | Chromium | Firefox |
|---|---|---|
| 1, EN, first after loading | 7.0 s; 154 ms | 10.6 s; 294 ms (overlaps the load, above) |
| 2, EN | 7.0 s; 99 ms | 9.0 s; 123 ms |
| 3, EN | 6.4 s; 82 ms | 9.2 s; 76 ms |
| 4, EN | 6.9 s; 127 ms | 9.5 s; 97 ms |
| 5, DE | 7.1 s; 87 ms | 9.9 s; 103 ms |

  For comparison, the build with only D9 gave 6.5–8.6 s with 93–180 ms in Chromium, and 9.0–12.3 s
  with 150–215 ms in Firefox. The build with the memoised body alone gave 81–199 ms and 95–301 ms.
  In that build, Chromium's first run took 20.4 s, an outlier not seen again.
- **The rows replaced** (T048's two failing rows, and the rows a fix could move):

| State | What was checked | Node / Chromium | Firefox | Result |
|---|---|---|---|---|
| E in Node, EN and DE, every page | **the bottom's label as drawn** (FR-021, FR-025, SC-005): whole when it fits its box; otherwise the variant's name cut with "…", the section and the suffix whole, the drawn width ≤ the box, and one more character of the name too wide | per language: 41 whole, 722 with the name cut and "(continued)" / "(Fortsetzung)" kept, page 1 none; e.g. EN p. 385 "3 Rules per variant › Variant Variant 10 for applicants from a district of the city… (continued)", 332.5 of 337.3 pt | — | pass 1528/1528 |
| the same | the other columns of `pages.csv`, `tall-rules.csv`, `units.csv` | as T048: 764 pages and 8052 blocks per language, 0 invariant failures; the tall rules 40/40, units 1482/1482 | — | pass |
| E rendered in Node | time (plain / recorded), size | EN 7.7 s / 9.0 s, 5 844 594 B; DE 8.5 s / 9.8 s, 5 922 542 B | — | pass |
| T044's German widths (§7.4), re-run | the German texts within their `layoutOf()` boxes; the bottom's place label | A 254/0/0, C 251/0/0, as T044; "3 Regeln je Variante › Variante Taxi (Fortsetzung)" 174.3 of 337.3 pt, drawn whole | — | pass (the time-zone runs weren't repeated; T050 doesn't touch dates) |
| E, 5 downloads, build | **longest gap between 50 ms ticks** (FR-003; bound 200 ms) | 154, 99, 82, 127, 87 ms | 294, 123, 76, 97, 103 ms | pass 9/10; Firefox's run 1 is above the bound because it overlaps the page's load (above) |
| the same, build | a wheel scroll answered during the run | 35, 35, 31, 29, 28 ms | 381 (run 1), 38, 36, 33, 36 ms | pass 10/10 |
| the same, build | "View links" toggled during the run | 11, 14, 10, 9, 16 ms | 129, 16, 16, 18, 33 ms (before the fix: 116, 78, 89, 82, 125) | pass 10/10 |
| the same, build | click → `download` under 60 s; the file: `%PDF`, 764 pages, `/Lang`, name; busy, and still busy after the scroll and the toggle | the timings above; as T048 | the same | pass 60/60 |
| E, 5 downloads, dev server | **longest gap between 50 ms ticks** | 448, 138, 150, 181, 133 ms | 579, 162, 150, 132, 124 ms | pass 8/10; run 1 above the bound in both browsers (the dev server's first-run module fetches and the page's load) |
| the same, dev server | a wheel scroll; "View links" toggled | 487, 26, 29, 29, 28 ms; 36, 96, 90, 79, 80 ms | 655 (run 1: unsure), 45, 32, 31, 36 ms; 433, 52, 48, 60, 56 ms | pass 19/20, unsure 1 |
| Restored | E `published / live / 8402-3F5B-32B3`; the site in English | the same | the same | pass 4/4 |

- **Left behind**: the dev server again on 5173, as before. Each browser has one tab on
  `http://localhost:5173/`, in English and signed in. No helper is listening, and `.playwright-mcp/`
  is empty. Eight more sign-ins of `t037` were recorded (one per script run), and E is unchanged.

## 8. Decisions and history

### 8.1 Spec 009's API as built

Looked up on 2026-11-12 (T002) in this checkout, where spec 009 is implemented. Where the name as
built differs from plan.md's, the name as built wins and later task lines are read with this
table; the "for" column names the tasks that must read it.

| Name in plan.md / tasks.md | Name as built | File | For |
|---|---|---|---|
| `Language` | `Language` (`'en' \| 'de'`), with `LANGUAGES`, `DEFAULT_LANGUAGE` (`'en'`) and `isLanguage()`; imported as `@connection-portal/rules/language` | `rules/src/language.ts` | all |
| `defineTexts` | `defineTexts(en, de)`: `de` is typed by `en` (`NoInfer`), so a German column that lacks or adds a key fails `tsc` | `rules/src/language.ts` | T013, T031 |
| `useCopy` | `useCopy(table)`: the table's column in the website's language | `frontend/src/hooks/useLanguage.ts` | T031 |
| `useLanguage` | `useLanguage()` → `{ language, setLanguage }` (`LanguageContextValue`) | `frontend/src/hooks/useLanguage.ts`, `frontend/src/components/LanguageProvider/types.ts` | T030 |
| `RuleContext.language` | `RuleContext.language?: Language`; English when left out | `rules/src/types.ts` | T016, T019, T020 |
| the problems' `code` on `RulesProblem` | `RulesProblem.code: RulesProblemCode` (`RulesMessageKey \| ConditionProblem \| EditMessageKey`), with `message`, `branchIndex`, `itemId` | `rules/src/types.ts` | T016, T019 |
| `ruleProblemOf` | `ruleProblemOf(rule, branchName, context): RuleProblemDetail \| null` (`{ code, message }`); codes `chooseData`, `notRequested`, `unknownPart`, a `ConditionProblem`, `noMessage`, `messageTooLong` | `rules/src/validation.ts` | T016, T019 |
| `firstProblem` | `firstProblem(branches: BranchInput[], context: RuleContext): RulesProblem \| null`; `publishProblems()` goes beside it | `rules/src/validation.ts` | T016 |
| `statementPartsOf`, `statementOf` with a language | `statementOf(rule, context)` and `statementPartsOf(rule, context)`: the language is `context.language`, not a parameter of its own | `rules/src/statements.ts` | T020 |
| `ApiFetchOptions.language` | `ApiFetchOptions.language?: Language`, sent as `Accept-Language` in place of the website's language; the interface is not exported | `frontend/src/api/client.ts` | T030 |
| `getFormConnection(id, { language })` (T030) | `getFormConnection(id)`: **no options**. T030 adds an optional `language` that it passes to `apiFetch` | `frontend/src/api/form-connections.ts` | T030 |
| `getOptionSets(language)`, `getDocumentTypes(language)` | `getOptionSets(language?)`, `getDocumentTypes(language?)` (the website's language when left out) | `frontend/src/api/option-sets.ts`, `frontend/src/api/document-types.ts` | T030 |
| "spec 009's caches" (per language) | **No shared cache.** `useOptionSets()` and `useDocumentTypes()` each keep a `CatalogCacheState` (`loaded` per language) in their own `useReducer`, and return `catalogViewOf(state)`, which shows the *other* language's list until the current one's has arrived. Their `optionSets` / `documentTypes` can therefore be in the wrong language right after a switch | `frontend/src/hooks/useOptionSets.ts`, `useDocumentTypes.ts`, `hooks/utils.ts`, `hooks/types.ts` | T030 |
| `frontend/src/copy.test.ts` | Exists. Glob `import.meta.glob('./**/constants.ts', { eager: true })` from `frontend/src/`, so `utils/connectionPdf/constants.ts` is covered. A table is any export that is a plain object with exactly the keys `en` and `de`. It checks the same keys and kinds in both columns, no empty text, and German ≠ English unless the English is in `EQUAL_IN_BOTH_LANGUAGES` (`Standard`, `Status`, `Details`, `Test`, `DE`, `EN`, `Konnekt`, `Optional`, `optional`, `Link`, `Wallet`, `Agent`, `Name`, `Region`, `serviceBW`, `EUDI Wallet`, `/`, `…`), one character, or punctuation only. Functions are checked by key and kind only | `frontend/src/copy.test.ts` | T013, T031 |
| `DETAIL_COPY` | **`CONNECTION_DETAIL_COPY`** (`defineTexts`). The keys the PDF and the button reuse: `linksTitle`, `linksLead`, `requestLink`, `requestLinkInfo`, `resultLink`, `resultLinkInfo`, `draftLinksText`, `noDocumentsYet`, `noDataYet`, `noRules`, `items(n)`, `summaryCounts(d, i, rulesCounts)`, `rulesCounts(v, r)`, `retry` ("Try again" / "Erneut versuchen"), `rulesErrorText` | `frontend/src/pages/FormConnectionDetail/constants.ts` | T013, T020, T031 |
| `BRANCH_MARK_COPY` | `BRANCH_MARK_COPY` (`defineTexts<Record<Mark, string>>`: `changed`, `added`, `removed`) | `frontend/src/components/BranchMark/constants.ts` | T013, T020 |
| (not in plan.md) other tables with the PDF's texts | `STATUS_PILL_COPY` (`draft`, `scheduled`, `live` = "Active" / "Aktiv", `deactivated`) in `frontend/src/components/ConnectionStatusBadge/constants.ts`; `CONNECTOR_COPY.labels` ("AND" / "UND", "OR" / "ODER") and `.descriptions` ("All rules must be met" / "Alle Regeln müssen erfüllt sein", "At least one rule must be met" / "Mindestens eine Regel muss erfüllt sein") in `frontend/src/components/Connector/constants.ts`; `RULE_ROW_COPY.messageLabel` ("Message for citizens:" / "Nachricht für Bürgerinnen und Bürger:") in `frontend/src/components/RuleRow/constants.ts`; `CONDITION_PROBLEM_MESSAGES` (the create flow's instruction per `ConditionProblem`, "choose a check." / "Wählen Sie eine Prüfung.") in `rules/src/constants.ts` | as named | T013, T019, T020 |
| "Enter a name for the connection." | `VALIDATION_MESSAGES.nameRequired` (with `nameTooLong`, `descriptionTooLong`), the server's `clean_name()` / `clean_description()` word for word in both languages | `frontend/src/pages/FormConnectionEditor/constants.ts` | T019 |
| "Add at least one document." | **Only the server's** `clean_documents()` (German "Fügen Sie mindestens ein Dokument hinzu."); no frontend table has it (the Documents step disables "Set rules →" with `DOCUMENTS_COPY.addDocumentFirst`, "Add a document first", instead) | `backend/app/services/form_connections.py` | T019 |
| "Choose at least one data item, or remove this document." | `DOCUMENTS_COPY.needsDataLine` (German "Wählen Sie mindestens ein Feld aus oder entfernen Sie dieses Dokument."); the server's message for the same gap is "Select at least one field for '{label}'." | `frontend/src/pages/FormConnectionEditor/DocumentsStep/constants.ts` | T019 |
| the polite live region the details page uses for "Link copied" | **No page-level region.** Each `CopyableUrl` renders its own `<p role="status" className="sr-only">` with `COPY_TEXTS.link.announced` ("Link copied" / "Link kopiert"), and `ActivityCard` has its own `role="status"`; a draft's details have no `CopyableUrl` at all. `LIVE_REGION_DELAY_MS` (100 ms, `frontend/src/constants.ts`) is how long a region that has just appeared stays empty | `frontend/src/components/CopyableUrl/index.tsx`, `frontend/src/constants.ts` | T030, T031 |
| (T004) "the block that sets `'no-console': 'error'` for the checks and personas" | The rule is set by the block for `{api-types,rules}/src/**/*.ts` (the checks and personas live in `rules/src/`); no block for `frontend/src/` sets it. T004 adds a block of its own for the three PDF paths | `eslint.config.mjs` | T004 |

What this means for later tasks (the coordinator appends these to their lines as "carried from
T002"):
- **T013**: keys that a table above already has are reused, not added to `PDF_TEXTS`: the statuses
  (`STATUS_PILL_COPY`), the AND/OR chips and the combinator sentences (`CONNECTOR_COPY`, the
  sentence composed as "{description} ({label})"), "Message for citizens:" (`RULE_ROW_COPY`), the
  links' heading (`CONNECTION_DETAIL_COPY.linksTitle`), "{n} data items" (`items`) and the contents
  line (`summaryCounts` with `rulesCounts`). A string key whose German equals its English
  (`version`: "Version") fails `copy.test.ts` unless "Version" is added to
  `EQUAL_IN_BOTH_LANGUAGES` in the same task.
- **T019**: "Add at least one document." needs a key with both columns, from the server's `Text`.
- **T030**: `getFormConnection` gains the `language` option; the option sets and the catalog in the
  captured language are the hooks' lists only when they are in that language: read the list
  cached for that language (widening the hooks to expose it) and fetch only what isn't cached.
- **T031**: `PdfDownload` gets its own polite `role="status"` region, as `CopyableUrl` does, present
  from mount; there is no shared region to reuse.

### 8.2 Decisions (D#)

**D1, how PDFKit is typed** (T003, 2026-11-12; R1, constitution IV). Our own interface, no
second package.
- Checked on 2026-11-12: `pdfkit` 0.20.2's `exports` give `"."` a `node` condition
  (`js/pdfkit.node.mjs` for `import`) and a `default` (`js/pdfkit.browser.mjs`), and no `types`;
  `@types/pdfkit` is at 0.17.7, three minor versions behind, without 0.20's structure and outline
  calls. One specifier, `'pdfkit'`, serves both builds: Vite resolves the browser build for the
  worker, Vitest's `node` environment the Node build for the smoke test.
- `frontend/src/utils/connectionPdf/types.ts` declares `PdfKitDocument` (only the calls and
  properties `render.ts` uses, typed as PDFKit 0.20.2 takes them) and `PdfKitConstructor`
  (`new (options) => PdfKitDocument`). `render()` receives the constructor as an argument.
- Under `strict`, importing a package without types fails `tsc` (TS7016). One ambient declaration,
  `declare module 'pdfkit';` in `frontend/src/utils/connectionPdf/pdfkit.d.ts`, with a comment
  naming D1, makes the import compile. Its default export is untyped, so each of the two imports
  (the worker's dynamic `import('pdfkit')`, the smoke test's) casts it to `PdfKitConstructor`
  where it is imported, with a one-line comment: "pdfkit 0.20 ships no types; D1". Nothing else
  imports `'pdfkit'`, and nothing writes `any`.
- A call `render.ts` needs that the interface lacks is added to the interface, never cast at the
  call. `plan.md` is unchanged: one new package, as planned.

**D2, the German terms the glossary lacked** (T003, 2026-11-12; contracts/pdf-document.md §5,
FR-034). Each proposal was compared with what spec 009's code says for the same English; the code
wins.

| Proposal | What the code says | Settled |
|---|---|---|
| "data item" → "Datenfeld" | "Feld" / "Felder": `CONNECTION_DETAIL_COPY.items` and `summaryCounts`, `DOCUMENTS_COPY` ("6 von 25 Feldern ausgewählt", "Alle Felder"); glossary §2 already has "data item → Feld" (T036 of spec 009) | **Feld** (no glossary change) |
| "Added here" → "Hier hinzugefügt" | `BRANCH_MARK_COPY.de.added`; glossary §2 (T032) | **Hier hinzugefügt**, reused from `BRANCH_MARK_COPY` |
| "Removed here" → "Hier entfernt" | `BRANCH_MARK_COPY.de.removed`; glossary §2 (T032) | **Hier entfernt**, reused from `BRANCH_MARK_COPY` |
| "Not live" → "Nicht veröffentlicht" | "live" is "aktiv": glossary §2 "live connections" → "aktive Anbindungen", "never live" → "nie aktiv" (the draft's delete dialog: "Die Anbindung war nie aktiv"), `Approval`'s "goes live at once" → "wird sofort aktiv". One exception, the publish failure's "Nothing went live." → "Es wurde nichts veröffentlicht." | **nicht aktiv**: "Not live" → "Nicht aktiv", "Not live yet" → "Noch nicht aktiv", "Draft · Not live" → "Entwurf · Nicht aktiv", "it isn’t live" → "er ist nicht aktiv"; added to glossary §2 |
| "version" (the content's fingerprint) → "Version" | no UI text yet; glossary §2 has "revision" → "Version", which no screen shows | **Version**; added to glossary §2 beside "revision". German equals English, so the task that adds a string key "Version" adds the word to `copy.test.ts`'s `EQUAL_IN_BOTH_LANGUAGES` |

Further corrections found by the same comparison (same English in the code, so the code's German
wins; applied to contracts/pdf-document.md §5 and to §3 above):
- "Connection details" is "Details der Anbindung" (the wizard's step 1, glossary §2), not
  "Anbindungsdetails": the eyebrow, the draft's eyebrow and the two titles.
- "result link" is "Ergebnislink" (glossary §2), so "Result links" is "Ergebnislinks", not
  "Ergebnis-Links"; "request link" is "Anfragelink".
- "Documents and data items" is "Dokumente und Felder"; "{n} data items" is
  `CONNECTION_DETAIL_COPY.items` ("{n} Felder", "1 Feld").
- "Message for citizens:" is "Nachricht für Bürgerinnen und Bürger:" (`RULE_ROW_COPY`), not
  "Nachricht an …".
- "Check your connection and try again." is "Prüfen Sie Ihre Internetverbindung und versuchen Sie
  es erneut." (`CONNECTION_DETAIL_COPY.rulesErrorText`), and "Try again" is "Erneut versuchen"
  (`CONNECTION_DETAIL_COPY.retry`).

Not settled here (no code says the same English; T041 reviews them with the rest of the German):
"Connection ID" → "Anbindungs-ID" stays the proposal, although the glossary's pattern for
"connection <noun>" is "<Noun> der Anbindung" ("Name der Anbindung", "URLs der Anbindung"), which
would give "ID der Anbindung".

**D3, how faded text is struck through** (T025, 2026-11-12; FR-017, FR-036, FR-037; R5, R11).
PDFKit's own `strike`, not `PlacedLine` artifacts.
- `render.ts`'s `textOptionsOf()` passes `strike: style.strike === true` with every span (an
  explicit `false` too: PDFKit hands a `continued` span's options on to a later span that leaves
  one out). The faded styles of `PDF_STYLES` (`itemNameFaded`, `statementFaded`,
  `statementValueFaded`, `messageFaded`, and `groupCombinesFaded` for a faded group's
  "Group · …" line, added by T026) carry `strike: true`; the identifier, the badges, the
  message's label and the AND/OR chips never do.
- PDFKit draws the line per drawn line of the span: from where its words start to where they
  end, half its line height below the line's top (0.6 × the size in Fira Sans, through the
  lower-case letters), 0.5 pt thick below 10 pt and 1 pt from 10 pt, in the span's colour (the
  muted `#4A5468`). It is drawn inside the span's tagged content, as a path, not as an artifact.
- Why: a struck text that wraps (a name, a message after its label, a statement wider than a
  line) needs each drawn line's extent, which only PDFKit's line breaking knows; `layoutOf()`
  would have to repeat that breaking to place `PlacedLine`s, and measured would no longer equal
  drawn by construction (R11). The line can't be wrapped in an artifact inside the tag either:
  PDF/UA-1 forbids an artifact inside tagged content (veraPDF 7.1-2). And the strike is not
  decoration (FR-037): it says "removed", together with the "Removed here" badge that says it in
  words (FR-017), so it belongs with the text it strikes. A path in tagged content is read by no
  assistive technology. The prototype and the spike strike the same way.
- Checked: veraPDF's PDF/UA-1 profile passes for A in both languages and E (T025, again after
  T026's fixes); E strikes 3,068 texts (T025's 2,970 and, since T026, its 98 faded groups'
  lines), every one with its line, 542 of them over two lines or more.
  `recordingDocument()` records each text's `strike`, and `render.test.ts` checks that every
  shape is an artifact but for these lines and where the removed rule's lines lie.
- Rejected: `PlacedLine` artifacts from `layoutOf()` (exact for one-line texts only; the wrapped
  ones would need a second line breaker); an artifact nested in the tag (fails PDF/UA-1).

**D4, the version in the Summary's header** (T031, the user, 2026-11-12; FR-032; §2). The code
is 14 px like "Version": one size on the line, told apart by weight (medium, `tabular-nums`) and
colour (the default text against the label's muted). Rejected: 16 px, the body's size. And the
closed header is measured on `6809:46423`'s Summary header node `6809:46487` only, keeping P7b's
ⓘ tooltip out of the comparison (rejected: switching to P7 `6396:47648`, the same geometry).

**D5, where the download's hook lives and what it is given** (T031, T033, accepted by the
coordinator 2026-11-13; FR-005, SC-008; contracts/pdf-worker.md §2).
- `useConnectionPdf` is called in `index.tsx` beside `useFormConnection`, not inside the details'
  tree, so a draft published during a run (which swaps `DraftDetails` for `ConnectionDetails`)
  keeps its run; `state` and `download` go down as one prop.
- The page passes no option sets or catalog: the Summary's `useOptionSets()` lives in
  `RulesSummaryContent`, and a second instance in `index.tsx` would add a request on every page
  load. So the first run after loading the page asks for `GET /api/option-sets` once more (and,
  for a draft, the catalog), which contract §2 allows ("when their cache is cold"); the request
  names no connection, and later runs reuse the hook's own copy.
- The model, file name and PDF texts load with dynamic `import()` during the fetch, keeping the
  main entry within a few kB (T031: 955 kB with static imports).
- A failed fetch (offline, a 5xx) keeps the worker; only the worker's own failure, `error`,
  `messageerror` or the watchdog terminate it (T033: before, "Try again" loaded the worker,
  PDFKit and the fonts again).

**D6, how a draft's links to be created are tagged** (T035, decided by the coordinator
2026-11-13; FR-013, FR-036; contract §2 and its `linksToCreate(list)` row). FR-036 counts "the
links to be created" among the lists, but contract §2 words them as two sentences, the
variants' names joined inside the second ("… a result link for each variant: Standard, Taxi and
Hire car."), so there is no item to tag. The dashed box is tagged as two `P`s, its frame an
artifact. Rejected: an `L` with one `LI` per variant, which would need a layout the contract
doesn't draw. FR-036's mention is read as met by those sentences; T051's converge run keeps
it as decided, not as unbuilt work.

**D7, the German copy's review** (T041, the user in the reviewer's place, 2026-11-15; spec,
Assumptions; contracts/pdf-document.md §5 "to review"; FR-034). The user accepted the German
column as it stands: `PDF_TEXTS` (`frontend/src/utils/connectionPdf/constants.ts`) and the seven
keys spec 011 added to `CONNECTION_DETAIL_COPY` (`downloadPdf`, `creatingPdf`,
`creatingPdfAnnouncement`, `pdfSaved`, `pdfFailedTitle`, `pdfFailedText`, `version`). No German
speaker walked through C's and A's German PDFs from the running app.

| where | english | german before | german after | glossary changed? |
|---|---|---|---|---|
| (none) | | | | no |

- D2's open item is settled as proposed: "Connection ID" stays "Anbindungs-ID" (rejected: "ID der
  Anbindung", the glossary's pattern for "connection <noun>"). The title stays
  "… – Details der Anbindung" (D2).
- `specs/009-language-toggle/contracts/glossary.md` is unchanged. T042 has no corrections to
  apply and only pins the German with tests.

**D8, T045's four defects** (T046, 2026-11-15; §2, §3, §7.2's T045 and T046 blocks; FR-034,
SC-006). Each the smallest change that fixes it, or a reason to leave it:
- **The narrow button (fixed)**. No 16 px label fits a 110–125 px row on one line with the glyph
  (spec 008's narrow block leaves 94–109 px inside the button; "Download PDF" is about 105 px,
  "herunterladen" alone about 105), and the type isn't made smaller. So on a narrow window the
  glyph is hidden (`narrow:hidden!` in `PdfDownload.tsx`: KERN's button styles beat the plain
  utility), which leaves "Download" its line, and the button grows taller as spec 008 lets pills
  grow. German follows spec 009's R9: the glossary has no short form for "herunterladen", the
  element already wraps, and step 3 puts a soft hyphen at the compound's seam (`PDF
  herunter\u00ADladen`); the button takes an `aria-label` without it, as `ConfirmDialog`'s heading
  does (spec 009, V9), so its name stays "PDF herunterladen". Built: 66 px in English, 90 in
  German, 66 for the busy German label, in both browsers. §2's "keeps its full label and 48 px
  height" is corrected to this.
- **A count split from its noun (fixed)**. `summaryCounts`, `items` and `rulesCounts` in
  `CONNECTION_DETAIL_COPY` join each number to its noun with a no-break space (U+00A0), both
  columns, as `STATUS_PILL_COPY.scheduledOn` keeps its "·". The PDF reuses these strings (the
  "Contents" row, the documents' counts), so it draws the U+00A0 too: Fira Sans has the glyph at
  the space's width, PDFKit's line breaker doesn't break at it, and T043's sweep re-run gives
  the same pages, texts, shapes, contrast and veraPDF result (§7.4). The tagged text reads "7 data
  items" with a no-break space. The 1440 header's height and the version's place stay the
  designer's (§7.2, "Needs a person").
- **German words broken inside (fixed for spec 011's alert; accepted for the heading and toggle)**.
  `pdfFailedText` gets a soft hyphen, `Internet\u00ADverbindung`, as the editor's failure texts
  already have it (spec 009's R9 step 3); its visible words stay D2's, equal to
  `rulesErrorText` (which keeps none: its alert wasn't swept). "Zusammenfassung" in the Summary's
  heading and toggle (`summaryTitle`, `viewSummary`, `hideSummary`) belongs to spec 008's and
  009's elements; the glossary has no short form, and a soft hyphen there would also need the
  heading's and toggle's names handled (spec 009, V9). It stays as spec 008's last resort at this
  width, for spec 008/009 to take up if wanted (R9 step 3 would fit it).
- **The busy button's contrast (not changed, exempt)**. Busy, the button is `aria-disabled="true"`
  in KERN's own disabled style, the pattern of `ConfirmDialog`'s busy button (§3), and the live
  region announces the state. WCAG 1.4.3 exempts the text of inactive user-interface components,
  and 3.17:1 is the level spec 008 chose for disabled labels (the 0.68 disabled opacity, T098).

**D9, how the bottom's place label is cut** (T050, 2026-11-15; FR-021, FR-025, FR-045, SC-005;
§7.5's T048 defect 1; R11).
- **The rule**: a label that doesn't fit its box (70 % of the body, 337.3 pt, 8 pt Regular) cuts
  only the variant's name with "…". The section ("3 Rules per variant › Variant") and
  "(continued)" / "(Fortsetzung)" stay whole.
- **How it is built**: `placeLabelOf()` builds the label from its parts. It takes the drawing's
  test of one line as an argument, so `paginate.ts` stays free of PDFKit, and it shortens the name
  with `cutToFit()`, by code points and with trailing spaces dropped, as the band's name is cut.
- **Measured equals drawn**: `render.ts` passes the same width test that `cutSpans()` applies
  when it draws, in the same style and box (`PLACE_LABEL_WIDTH`). A fitted label is therefore
  drawn exactly as computed, and `lines: 'cut'` stays only as a guard.
- **Where it applies**: a label without a variant is never cut, since section labels stay far
  inside the box. On E, "1 Links for your service (continued)" draws 126.7 pt and "1 Links für
  Ihren Dienst (Fortsetzung)" 132.6 pt. T044 measured "2 Documents and data items" at 103.3 pt.
- **Rejected**:
  - Spans of their own for the name and the suffix, with a cut that knows which span may shrink.
    That would add a "shrinkable" flag to `TextSpan` for one text.
  - A smaller size or a second line. The bottom has one 8 pt line beside "Page n of N"
    (contract §2).

**D10, the page's responsiveness during a run** (T050, 2026-11-15; FR-003, SC-001; §7.5's T048
finding 2 and T050).
- **The bound**: the longest gap between 50 ms ticks on the page is at most 200 ms (INP's "good"
  bound), measured on the production build. The dev server's numbers are recorded, not judged:
  React's development build renders several times slower.
- **The fix, the Summary's body**: the body is `RulesSummaryBody`, a `memo` component that
  doesn't take `pdf`. Its props are the connection's `branches` and `documents` and
  `RulesSummary`'s memoised `context` and `checkDocuments`. Only the header (`PdfDownload` and
  `PdfFailure`) reads the run's state.
- **The fix, the fetched connection**: `index.tsx` hands it to `replace` only when
  `isShownConnection()` finds it different from the one shown, compared field for field through
  `JSON.stringify` (10–20 ms on E). A changed connection still replaces the shown one (FR-005,
  §7.5 T039).
- **D5 holds**: the hook stays in `index.tsx`, and `state` and `download` go down as one prop.
- **Rejected**:
  - Comparing only `version_fingerprint` or `updated_at`. The version leaves out the status, the
    labels and the URLs (§7.5, T039), so a draft published meanwhile would keep the draft's
    details.
  - Making `useFormConnection`'s `replace` compare. That would change it for every caller (the
    actions' answers too), where a replaced object is expected.
- **Not covered by the fix**: a click within the first second after the page has loaded E still
  overlaps the page's own settling (the rule checks' results), which spec 003's checks own.
- **Accepted by the coordinator** (T050's UNCERTAIN 1): the two runs above the bound are each the
  first click right after loading E. They are Firefox's 294 ms on the build, and 448 / 579 ms on
  the dev server. Each overlaps the page's load, not the download: with no click, the load alone
  shows 96–139 ms, and a click after 3–8 s gives at most 106 ms. Not a failing row of this
  feature.

**D11, the draft's save number in the MCP's texts** (T051, decided by the coordinator
2026-11-15; R12; carried from T010). Since T010, `get_connection`'s text for a draft has said
"Version 62D0-…, as the details page and the PDF show it." and then "Version 7, last saved …",
and every draft tool's answer says "Saved as draft version 7 …". The "Avoid" list (tasks.md,
Notes) rules out a `version` label on the save number. An agent that reads two "Version"s may
tell a team member the wrong one when they compare a printout. The texts therefore say
"save {n}" (T055). The structured field stays `draft.version`, the API's name, which
`get_connection`'s description and the skill explain.

**D12, nginx's body limit** (T051, the user, 2026-11-15; FR-045; carried from T018). nginx's
default `client_max_body_size` of 1 MB refuses a save of a connection near the product's limits
with `413`: E's body is 1.56 MB. The user chose `client_max_body_size 4m` on `location /api/`
(T056), about 2.5 times E. The limit is outside the PDF; spec 011 found it because E is the first
connection at the limits saved anywhere.

### 8.3 The test connections

**2026-11-12, T028.** Made in one run of `prototype/seed.ts` from `SEED_BODIES`
(`frontend/src/utils/connectionPdf/testData.ts`) against the backend on port 3000 (dev database
`template_db`, the tests' fake EUDIPLO, no worker), signed in as a local dev account:

```bash
# from the repository root; port 3000 directly, not nginx (E's body is about 1.56 MB)
npx vite-node specs/011-connection-pdf/prototype/seed.ts -- http://127.0.0.1:3000 <username> <password>
```

| | What it is | Id | Status / state | Version |
|---|---|---|---|---|
| A | The sample, published (`POST /api/form-connections`) | `cd9843b4-4c54-412f-8852-019b6d6dd476` | published / live | `98C8-BFF0-B8E2` |
| B | A's body again, same name, then `POST /{id}/deactivate` | `e534ee85-4142-4fc3-9543-5e17cef6e0a9` | published / deactivated | `AA90-6EC5-A5BA` |
| C | The sample as a draft with Hire car's two gaps (`POST /api/form-connections/drafts`) | `522c0e79-396b-413d-ab2c-6f3301a4199d` | draft / draft | `BD20-E34A-47BC` |
| D | A draft without gaps (A's content) | `22a34b41-f75f-47ac-99d4-8e70de7846b5` | draft / draft | `294E-2CA8-EC64` |
| E | The connection at the limits (20 variants), published | `3b61a5fe-dcc5-4fe7-bee7-b2d24e125ae3` | published / live | `8402-3F5B-32B3` |

- The versions are those of `GET /api/form-connections/{id}`. They differ from T021's fixture
  values (`FA7E-47BB-5368` for A and D, `3D3C-F9EA-5FE0`, `EDD5-7EDC-E4FD`) and from each other
  (A and B have equal bodies) because the canonical form holds the connection's id
  (`services/versions.py`), and the server gave each a new id.
- Names needn't be unique, so B keeps A's name unchanged (no suffix); the backend refused
  nothing, E included (published with its 20 variants), so no connection stayed a draft against
  the plan.
- F (scheduled, quickstart §0) is not part of `SEED_BODIES` and was not made by `seed.ts`.

**2026-11-13, T034.** F made by the coordinator for quickstart §2 step 6, from a scratchpad
script (not committed): `SEED_BODIES.A.body` with `start_date: '2026-11-20'`, posted to
`POST /api/form-connections` (201). The worker is off, so F stays scheduled.

| | What it is | Id | Status / state | Version |
|---|---|---|---|---|
| F | A copy of A, scheduled to start on 20.11.2026 | `e5c09dca-1843-47ae-9e74-5ebd0fa063e1` | published / scheduled | `610E-B3CA-743B` |

**2026-11-13, T037.** Fresh copies of D for "Published meanwhile" and "Deleted meanwhile"
(§7.2), made by a scratchpad script (`011/T037/seed-copies.ts`, not committed):
- **How**: it posted `SEED_BODIES.D.body` to `POST /api/form-connections/drafts`, signed in as a
  local account. Each copy was a draft at save 1.
- **What became of them**: the runs published one copy each, unchanged, which kept its version,
  and deleted another, a restorable deletion that answers 404.
- **Runs 1 and 2** of each browser failed only on the script's own checks and were run again with
  new copies (§7.2). The status column is as checked afterwards.

| Run | Use | Id | Status / state | Version |
|---|---|---|---|---|
| Chromium, run 1 | published meanwhile | `eaf7de75-1116-45e0-8009-09ba151239bf` | published / live | `A105-E511-2F90` |
| Chromium, run 1 | deleted meanwhile | `adfdd03a-4d4b-4e2e-98e7-18e84b3fed61` | deleted (404) | `F257-C3E7-8CDB` |
| Chromium, run 2 | published meanwhile | `eef596fa-d404-4ed0-9634-25ddab415c24` | published / live | `E7A9-49C1-EEFA` |
| Chromium, run 2 | deleted meanwhile | `ece55f37-3e32-4d7e-b4e3-ef0f88bdb7a7` | deleted (404) | `A6AC-4A01-EC21` |
| Chromium, final | published meanwhile | `3ea1cc21-a413-4489-a147-50cdd0d2ca4f` | published / live | `9136-E998-8D35` |
| Chromium, final | deleted meanwhile | `d11e6581-49b6-419a-ba9b-ac868eeb61ce` | deleted (404) | `ACE5-7C9C-6344` |
| Firefox, run 1 | published meanwhile | `da5b5977-9e3c-4ea1-9cab-1e0d363aad59` | published / live | `8D2D-9763-00C6` |
| Firefox, run 1 | deleted meanwhile | `2dfbaf16-42e1-401b-ae28-12b475c938d6` | deleted (404) | `84DB-447E-B5C2` |
| Firefox, run 2 | published meanwhile | `8bc6b857-4d8b-4dd3-a53c-e82864a1e85a` | published / live | `F6F5-5E64-1365` |
| Firefox, run 2 | deleted meanwhile | `62347be9-1cd6-4e6d-8f16-aa866780da73` | deleted (404) | `61FA-B4A6-6727` |
| Firefox, final | published meanwhile | `ad805eb6-ce09-4db6-8ff3-83404da7f5eb` | published / live | `2946-92A0-A59F` |
| Firefox, final | deleted meanwhile | `b5c5ca5b-e1fb-4fd1-bb38-814c9c8e3266` | deleted (404) | `9A92-E7C4-730E` |

C and D themselves are unchanged: still drafts at their §8.3 versions. Publishing C was refused
with 400 and wrote nothing (§7.2).

**2026-11-14, T039.** Fresh copies of D for quickstart §4 step 6 (§7.5), made by a scratchpad
script (`011/T039/seed-copy.ts`, not committed) that posted `SEED_BODIES.D.body` to
`POST /api/form-connections/drafts` as `t037`; each was a draft at save 1 and was published
unchanged by the sweep, keeping its version. Run 1 failed only on the script's own property
check and was repeated with a new copy (§7.5). A was deactivated, activated and edited twice
through the API and is back at its version (its rule set version is now 5); D itself is
unchanged.

| Run | Use | Id | Status / state | Version |
|---|---|---|---|---|
| Chromium, run 1 | published unchanged | `d234ab7f-0e09-4b31-a8f7-1ddcf5919a79` | published / live | `E878-D7F5-2455` |
| Chromium, final | published unchanged | `dfde962c-a35f-4bd1-92a5-3436466b77b8` | published / live | `931C-A869-BDBF` |

### 8.4 History

**2026-11-12, T001 baseline.** `npm install` and `uv sync` ran on Node 20.19.2 (npm 9.2.0; no
switch to Node 22 was needed), Python 3.13.5 and uv 0.13.0, and changed no tracked file. The
gates were green on the unmodified checkout: lint, tests, build, Ruff (nothing fixed or
reformatted), mypy (95 source files) and pytest.

| Suite | Result |
|---|---|
| `rules/` (Vitest) | 2664 tests passed, 46 files |
| `frontend/` (Vitest) | 1573 tests passed, 36 files |
| `mcp/` (Vitest) | 510 tests passed, 15 files |
| `backend/` (pytest) | 2557 passed, 0 skipped (14 min 8 s) |

The build of `frontend/` (`npm run build -w frontend`, the size quickstart §1 compares against):

| Chunk | Raw | Gzip |
|---|---|---|
| `index-BUwgvwRI.js` (the main entry) | 934.62 kB | 278.94 kB |
| `checks-C766b_cc.js` (worker) | 36.37 kB | not printed |
| `personas-CIJR7rKY.js` (worker) | 70.50 kB | not printed |

On the PATH: `docker` (29.9.2, daemon reachable). Not on the PATH: `verapdf`, `java`, `qpdf`,
`pdftotext`, `pdftoppm`. The PostgreSQL of the tests was started for this run with the repo's
`docker compose up -d postgres` (port 5435), and `template_db_test` was created in it.

**2026-11-12, T005 fonts.** The five TTFs are copied byte for byte from
`@expo-google-fonts/fira-sans` 0.4.1 and `@expo-google-fonts/fira-mono` 0.4.1 (the versions in the
prototype's `package-lock.json`, whose `npm install` left the lockfile unchanged) into
`frontend/src/assets/fonts/`. `OFL.txt` is the packages' `LICENSE_FONT` (the OFL 1.1 text, the
same in both), with both packages' copyright lines at its top: Fira Sans "2012-2015, The Mozilla
Foundation and Telefonica S.A.", Fira Mono "2012-2013, The Mozilla Corporation and Telefonica
S.A.". The largest file is 473160 bytes, under the 500 KB (512000 bytes) of the
`check-added-large-files` hook, which sets no `--maxkb`.

| File | Bytes | SHA-256 |
|---|---|---|
| `FiraSans-Regular.ttf` | 440984 | `3dabf3d48bf4599f95cffd92f99ea426a014d5311f52a5eb5ec3af265e97cd97` |
| `FiraSans-Medium.ttf` | 441384 | `7c2d4961dd4a2dbe3ec9c6a2fc60d7ee21f44dfa7c5c71256b28d15e8af89535` |
| `FiraSans-SemiBold.ttf` | 473160 | `1352f54dafec54419303fd4e55bc4d2aad4379f5105122f78034ddb48499e1d1` |
| `FiraMono-Regular.ttf` | 170204 | `9c1c51abec8b9f7fa24bfb88ebe80b354cc6da9d4036d6bedeaf495d24933e42` |
| `FiraMono-Medium.ttf` | 169056 | `5ebf0b5802814edb228b711b70c02736506bb8bce32da2608dcbf9e0df45798d` |
| `OFL.txt` | 4461 | `4da2f15e9bcb2fc38ce0e9326bebbb904da3377204d4d3d06878cd3f6653c1e0` |

**2026-11-12, T006 checkpoint of the setup.**
- **Gates**: the Node gates are green with `pdfkit` 0.20.2 installed (18 packages added to the
  lockfile, none imported by our code): lint; 2664 / 1573 / 510 tests in `rules/`, `frontend/`,
  `mcp/`; the build, whose main entry is unchanged (934.62 kB, 278.94 kB gzip) and whose two
  workers are still chunks of their own in ES format. Phase 1 changed no backend file, so T001's
  backend gates stand. Twice, while two agents ran the Node gates side by side (load average 8–9),
  the time budgets of `rules/src/personas/performance.test.ts` failed and passed on the rerun:
  parallel Node batches can trip them, so a red run there is re-run alone before it counts.
- **Records**: §8.1 has a row for every name T002 lists, and the as-built differences are carried
  to T004, T013, T019, T030 and T031; §8.2 holds D1 and D2 (the contract's §5, §3 above and spec
  009's glossary corrected); the fonts' sizes and hashes are above (T005).
- **veraPDF**: not on the PATH and no Java (T001), but Docker runs it:
  `docker run --rm --network none -v <dir>:/data:ro verapdf/cli:v1.28.1 --flavour ua1 /data/<file>.pdf`
  (veraPDF 1.28.1, image pulled 2026-11-12). On the prototype's `published-ids-top.pdf` and
  `draft-ids-top.pdf` it fails one rule only, 7.21.4.2 test 2 (font: the incomplete `CIDSet`,
  3 checks; 105 rules passed): the PDFKit bug research R5 names, which the implementation works
  around. So quickstart §5 step 2 runs in the chat.
- **Needs a person**: SC-006's screen-reader walk (quickstart §5 step 3, NVDA with Acrobat or
  another screen reader with a tagged-PDF reader) can't run here. The user was asked on
  2026-11-12 who does it; the answer is pending and goes here.
- **Other**: the tests' PostgreSQL is the container `pdf-summary-postgres-1` that T001 started
  (port 5435). `pdfkit` was moved into alphabetical order in `frontend/package.json` (the
  lockfile is unchanged by it).

**2026-11-12, T011 checkpoint of the version in the API (Phase 2).**
- **`curl`**: the backend ran on the dev database (`template_db`, migrated to head) with the
  tests' fake EUDIPLO (`tests/fake_eudiplo.py`), port 3000, no worker. "Start from an example"
  (`POST /api/form-connections/example`) stored a draft with `version_fingerprint`
  `10F5-92A4-B177` (save number 1), the same with `Accept-Language: de`. Published unchanged
  through `POST /{id}/publish` with the draft's content as the editor sends it, it answered `live`
  with `10F5-92A4-B177`; `GET` in English and German, deactivating and activating kept it. The field
  sits after `description`; both values match `^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$`; the
  overview's list (`FormConnectionSummary`) has no such field. The account `t011` and the
  published example stay in `template_db` (not the tests' database).
- **The canonical form** (T007): the prototype's sample as stored gives `FA7E-47BB-5368`, its
  draft with C's two gaps `3D3C-F9EA-5FE0`, both cross-checked with the prototype's JS
  `canonical()` and pinned in `backend/tests/unit/test_versions.py` (74 tests, among them a guard
  that fails when a field is added to the content's schemas until it is decided). The fixture's
  mapping of the prototype's composed rules to catalog keys and UUIDs is carried to T018.
  `_clean_condition()` now returns `publishable_condition()`; a grid of 4788 condition × target
  cases gave byte-identical stored JSON and refusal messages (English and German) before and after,
  and `test_rules_validation.py` and the API rule tests passed unedited.
- **Gates**: backend: Ruff, format, mypy (97 source files); the full pytest run 2643 passed,
  0 skipped (14 min 15 s, T008's agent, on the final backend files), and the five changed or
  guarding files again at the checkpoint (689 passed). Node: lint, 2664 / 1573 / 513 tests in
  `rules/`, `frontend/`, `mcp/` (513: 3 new cases of T010), the build with the main entry
  unchanged (934.62 kB, 278.94 kB gzip). `rules/src/personas/performance.test.ts` failed once
  on its time budget while pytest ran beside it and passed alone (7 / 7), as T006 noted.
- **Carried**: T010's question whether the MCP's draft text keeps "Version {n}" for the save
  number goes to T051.

**2026-11-12, T021 checkpoint of the pure core (Phase 3).**
- **Gates**: lint; 2675 / 1741 / 513 tests in `rules/`, `frontend/`, `mcp/` (against T011: +11 in
  `rules/`, +168 in `frontend/` in 8 new files); the build, whose main entry is 934.82 kB
  (278.99 kB gzip), 0.2 kB more than T001's after T017's move, since nothing in the app imports
  `utils/connectionPdf/` yet. `rules/src/personas/performance.test.ts` missed its time budget in
  several agents' runs while four suites ran side by side and passed alone each time; the
  checkpoint's run was green throughout.

  | File | Tests |
  |---|---|
  | `rules/src/validation.test.ts` (with `publishProblems`; every `firstProblem` case also checks `publishProblems(...)[0]`) | 191 |
  | `frontend/src/utils/connectionSummary.test.ts` | 7 |
  | `utils/connectionPdf/constants.test.ts` (contrast of every text colour on its backgrounds, the body) | 37 |
  | `utils/connectionPdf/paginate.test.ts` (the pinned bug fails under both broken variants) | 14 |
  | `utils/connectionPdf/wrapUrl.test.ts`, `fileName.test.ts` | 7, 10 |
  | `utils/connectionPdf/testData.test.ts` | 17 |
  | `utils/connectionPdf/gaps.test.ts` | 22 |
  | `utils/connectionPdf/model.test.ts` | 54 |

- **Copy**: `copy.test.ts` checks `PDF_TEXTS` (its three cases for the table); "Version" is in
  `EQUAL_IN_BOTH_LANGUAGES` (T013).
- **Purity**: no `console.*` and no browser API in `utils/connectionPdf/` or
  `utils/connectionSummary.ts` (searched; T004's `no-console` block covers the folder). The
  modules import only `api-types`, `rules`, each other and the editor's copy tables
  (`pages/FormConnectionEditor/constants.ts`, `DocumentsStep/constants.ts`, whose SVG imports are
  URL strings).
- **Fixtures** (T018, checked with scratchpad scripts, not committed): A gives the backend's
  `FA7E-47BB-5368`, C `3D3C-F9EA-5FE0`, D (A's content and ids as a draft) `FA7E-47BB-5368`, E
  `EDD5-7EDC-E4FD`. The server's create checks (`clean_*`, `clean_rules`, `check_first_save`)
  accept A, D and E and refuse C at its first gap. E's create body is 1.56 MB, above nginx's
  default 1 MB `client_max_body_size`, which `frontend/nginx.conf` doesn't set (carried to T028
  and T051).
- **Decisions the agents marked UNCERTAIN, accepted**: T012: an 18th block kind, `linkHeading`
  (① and ② with their explanations); the structure's identity as `key` and `within`;
  `PlacedRect.joinsAbove`; `PlaceLabelTexts` and `LineWidth` as the paginator's and `urlLines()`'
  parameters. T013: `notComplete` is a label beside its text, as `messageLabel`; a sentence of its
  own for `linksToCreate` with one variant; faded items strike the name too; `#EEF1F6` for the URL
  box and the group header. T014: single spaces around "›". T015: the trailing trim applies after a
  cut only ("name." gives `name-_<version>.pdf`); a name of only `-` reads `connection`. T016: a
  wrong number of variants and a missing main variant are both listed, then the list ends; a name
  already taken stays its first owner's. T019: besides `addDocument`, three keys where no table had
  the instruction (`chooseData`, `addDataAgain`, `shortenMessage`), `unknownPart` reads "Choose
  the data to check.", a variant without a name gives only its own gap. T020: a rule a based
  variant inherits unchanged shows Standard's "Not complete", a removed one none; a blank group
  message is none. The German of every new key goes to T041's review.
- **Plan**: T019 also edited `constants.ts`, outside its file list: the key that T002's carried
  note asks for, allowed by the coordinator since no batch ran beside it, and three more under the
  same brief's rule. Every other task kept its level, batch and files.
- **Carried**: notes appended to T020 (done), T023, T024, T025, T028, T030, T035, T042 and T051.

**2026-11-12, T027 checkpoint of the document (Phase 4).**
- **Gates**: lint; 2675 / 1858 / 513 tests in `rules/`, `frontend/`, `mcp/` (against T021: +117 in
  `frontend/`: `blocks.test.ts` 93 and `render.test.ts` 24, both new); the build, whose main
  entry is unchanged at 934.82 kB (278.99 kB gzip), since nothing in the app imports
  `utils/connectionPdf/` yet. `render.test.ts` is green for A (English, and with a 100-character
  name) and for E. `rules/src/personas/performance.test.ts` missed its budget once in T024's
  runs while two agents ran side by side, and passed alone (7 / 7) and in every later run.
- **The file**: A renders in Node in 0.5–0.7 s to 6 pages, E in about 8 s to 764 pages and
  5.8 MB (the spike: 2.5 s; SC-001's limit for E in the browser is T048's). veraPDF 1.28.1's
  PDF/UA-1 profile passes for A in English and German and for E after T026's fixes (106 rules,
  0 failed checks each); the outline has the three sections and, under the third, one entry
  per variant (A: Standard p3, Taxi p4, Hire car p6). §7.3 has no unsure row.
- **Read in the Firefox viewer** (the coordinator, 2026-11-12): Playwright's Firefox downloads a
  PDF instead of showing it, so the pages were drawn with pdf.js 3.11.174 in a scratchpad page.
  A, page 1: the band (name, ID, "Version FA7E-47BB-5368", "Generated 09.11.2026, 16:45"), the
  eyebrow in capitals, the `H1`, the description, "Active" with "as of …", the details table
  (ID, the version larger, "(Germany)", the contents line), the note, "1 Links for your service"
  with both explanations and every URL broken only after "/", "Page 1 of 6" and no place
  label. A, page 4: "Variant Taxi" with "Based on Standard" and its AND in words, "Changed
  here", "Added here", rule-5 struck through and muted with "Removed here", group-1's bar and
  closing message, the AND/OR chips, "3 Rules per variant › Variant Taxi". E, pages 2 and 3:
  the band's name cut with "…", the result links split between links, "1 Links for your service
  (continued)". E, page 42: a 100-character variant name wrapping in its own column after
  "Variant" (§5.17, which no image had checked), and "3 Rules per variant › Variant Standard
  (continued)" for a page that begins inside Standard. Nothing seen contradicts the contract.
- **Decisions the agents marked UNCERTAIN, accepted**:
  - T022: the details row's label is a new key `contents` ("Contents" / "Inhalt"); page 1's draft
    texts (eyebrow, status, "Last saved", the draft's note) are already laid out; the
    result-links unit holds only the link blocks, with "Result links" chained to the first; a
    document's name and count are one `H3`, the count on the next line when they don't fit;
    rows and headings grow by the lines their texts wrap to.
  - T023: **a rule is also cut when the chain leading into it, the rule and the blocks chained
    after it don't fit on one page**, not only when the rule alone is taller than the body.
    This stretches FR-027 ("a single rule taller than a page is the only block that may
    continue") to keep FR-023 and FR-024 (a sub-group's header is never left alone at a page's
    end); it only touches a rule close to a page's height. Further: the members of a removed or
    dissolved group keep their own marks, muted and struck, with "Removed here" on the group's
    header; the chips' words are in the statement's `P`, without a `Span` each; a text of two
    faces is measured in the wider one; a faded group's message is struck too; the word
    "Variant" is the title without the name; item keys hold their index.
  - T024: `renderConnectionPdf()` returns `Promise<Uint8Array>` (carried to T029); an outline
    entry points to its block's top with `/XYZ`, the left passed as the page's width because of
    PDFKit's `pageWidth − left` (carried to T053); the band cuts the name between code points;
    PDFKit's margins are 0. Its `/// <reference types="node" />` in `render.test.ts` was not
    accepted: T025 loads the fonts with `import.meta.glob` (`?inline`) instead, and the app
    program no longer sees Node's globals.
  - T025: D3 (§8.2); `RecordedText.strike`; the order test also checks the groups' identifiers.
  - T026: §5.15–§5.17; the connector word's box is its glyphs, so the connector is 14 pt.
- **Plan**: every task kept its level, wave and batch. Edits outside a line's file list, each
  allowed in the coordinator's brief: T022 and T023 added to `constants.ts` (the key
  `contents`; the chip geometry and `statementValue`, `statementValueFaded`), T023 changed the
  block shapes in `types.ts` (`VariantHeaderContent.name`), T024 added `pdfkit.d.ts` (D1 names
  it) and PDFKit calls and the recording's types to `types.ts`, T025 `RecordedText.strike`.
  T023 and T024 ran side by side with that file split between them; each saw the other's files
  fail `tsc` for a few minutes between saves, and both finished on the same green tree.
- **Carried**: notes appended to T025 and T026 (done), T029, T035, T036, T044 and T053.
- **Needs a person**: open A's PDF once in a real PDF reader (Acrobat Reader or the system's
  viewer) and read page 1, as the phase's Delegation asks; until then T027 stays unchecked. The
  file is rendered by T027's scratchpad run (`011/T027/A-en.pdf`) and by `render.test.ts`'s
  helpers.

**2026-11-13, T034 checkpoint of US1 (Phase 5).**
- **Gates**: lint; 2675 / 1871 / 513 tests in `rules/`, `frontend/`, `mcp/` (against T027: +13 in
  `frontend/`, T030's reducer cases in `hooks/utils.test.ts`); the build. The main entry is
  932.92 kB (278.86 kB gzip) and now preloads one shared chunk, `constants-*.js` (10.89 kB,
  3.40 kB gzip: `rules/`'s language and statement texts that sat in the entry), so together
  about +9 kB raw and +3.3 kB gzip against T001's 934.62 kB (278.94 kB): the button, the hook
  and the glyph. The worker (55 kB), PDFKit (530 kB), the fonts (1.69 MB) and the model's three
  chunks (18 kB) are chunks and assets of their own, loaded on the first run only (§7.2).
- **The stack**: the backend on `template_db` with the tests' fake EUDIPLO (T011's launcher, the
  worker off) and the dev SPA with `VITE_API_URL=http://localhost:3000`; T033 timed on the
  production build. No real EUDIPLO was used: publishing A, B, E and F set up nothing outside
  the backend.
- **The file from the page** (the coordinator, headless Chromium, the dev SPA): A, B and F of
  §8.3 downloaded with one click each, as "Taxi and private hire driver licence_<version>.pdf",
  in about 1.2 s (dev server; T033's production timings are in §7.2), with "Version …" in the
  header matching the file's band. Read with pdf.js 3.11.174 (text of every page; images of A
  pages 1 and 4, F page 1), against quickstart §2:
  - Step 3: the title "Taxi and private hire driver licence – Connection details" with
    `/DisplayDocTitle true`; page 1 with the eyebrow, the name, the description, "Active as of
    13.11.2026, 01:20", the details box (ID, the version larger, "(Germany)", the contents) and
    the note; the request link and the three result links in full, "Variant · Standard" first;
    "2 Documents and data items"; "3 Rules per variant" with Taxi's "Changed here", "Added
    here", "Removed here" and rule-5 struck through and muted.
  - Step 5: every page's band holds the name, the ID, "Version 98C8-BFF0-B8E2" and "Generated
    13.11.2026, 01:20"; "Page n of 6" on every page; place labels from page 2 ("2 Documents and
    data items", "3 Rules per variant › Variant Taxi (continued)" on page 5).
  - Step 6: B reads "Deactivated as of …" and adds "The connection is deactivated: its links
    answer “unavailable” until it is activated again."; F reads "Scheduled as of 13.11.2026,
    01:22 · starts on 20.11.2026" (the Active pill's colours with a hollow dot, §4) and adds
    that its links answer "unavailable" until it starts on 20.11.2026.
  - The bytes: `/Lang (en-GB)`, `/StructTreeRoot`, `/MarkInfo`, `/Outlines` (the three sections,
    and the three variants under the third), `pdfuaid:part`, no `/CIDSet`. veraPDF 1.28.1's
    PDF/UA-1 profile passes A, B and F (106 rules, 0 failed checks each): the first files made
    by PDFKit's browser build that it has checked (Phase 4's came from Node).
- **§7.1 and §7.2**: §7.2 has no open row (T033: every check passes in Chromium and Firefox).
  §7.1 has three open rows, handed to T045 and T046 and, for the version's place, to the
  designer (carried to T045): A's counts wrap beside the version at 1440 px (header 124 px, a
  count split from its noun), the German header wraps under the heading (156 px), and at the
  narrow width the label breaks inside "Download" (66 px high).
- **Decisions the agents marked UNCERTAIN, accepted**:
  - T028: B keeps A's name (names needn't be unique); F was not in `SEED_BODIES` (made here).
  - T029: `render.ts` is a static import of the worker (in the worker's chunk); the export
    `PDF_FONT_URLS`; runs arriving during the first load share it; the fonts' buffers are reused.
  - T030: the optional `optionSets` and `documentTypes` (the hooks' `byLanguage`) with the
    hook's own per-language copy; `pdfFailedText` in `CONNECTION_DETAIL_COPY`, worded in the
    captured language; the language-free `announcement`; a `signedOut` action; `fetched` after
    the context has arrived; the watchdog from the post to the worker; the object URL revoked in
    `setTimeout(…, 0)`, which T033 found safe in Firefox (16 of 16 downloads complete).
  - T031, T032: D4 and D5; a second `notice` slot on `DetailAccordion` and `PdfFailure` beside
    `PdfDownload`; `basis-200` on the heading with the actions and the toggle wrapping as one
    group; "Try again" moving the focus to the button; `px-15!` so the border sits inside the
    drawn 16 px; the code `text-nowrap`; the narrow check emulated with a 167 px Chromium window.
  - T033: a failed fetch keeps the worker (D5); the timing from just before the click to the
    `download` event; "the page responds" as a 50 ms timer whose longest gap stays under 250 ms;
    Firefox's offline mode leaves localhost reachable, so the script also aborts the API's
    requests there.
- **Plan**: every task kept its level, wave and batch. The stack for T028 used the fake EUDIPLO
  in place of a real one (above). T029's build check ran on a scratch build, since nothing
  imported the worker until T031. Edits outside a line's file list, each allowed in the brief
  or reported: T030 widened `api/form-connections.ts`, `useOptionSets.ts`, `useDocumentTypes.ts`
  and the download section of `utils/connectionPdf/types.ts`, and added `pdfFailedText`; T031
  made the hook's three dynamic imports. T032's two Figma questions went to the user before
  anything was built (FIGMA-WORKFLOW §1; D4).
- **Carried**: notes appended to T031 (done), T033 (done), T036 and T045.
- **Needs a person**: the user validates the MVP (T034, which stays unchecked until then);
  T032's narrow check with the browser's own 200 % zoom; T027's look at A's page 1 in a real PDF
  reader; the designer's answer on the version's place in the header; SC-006's screen-reader
  walk (T006).

**2026-11-13, T038 checkpoint of US2 (Phase 6).**
- **Gates**: lint; 2675 / 1948 / 513 tests in `rules/`, `frontend/`, `mcp/` (against T034: +77
  in `frontend/`, T035's and T036's 67 and T037a's 10); the build, the main entry 932.93 kB
  (278.86 kB gzip), unchanged. The worker's chunk grew from about 55 kB to 59.09 kB (the draft's
  drawing).
- **The stack**: as T034's (`template_db`, the tests' fake EUDIPLO from a scratchpad launcher,
  the worker off, the dev SPA), signed in as a local account made for T037. The dev database now
  holds T037's twelve copies of D (§8.3).
- **The file from the page**: C downloaded from its details in headless Firefox (Playwright MCP)
  as "Taxi and private hire driver licence_draft_BD20-E34A-47BC.pdf", after T037a's fix, read as
  text (every page, with T037's extractor) and as images of pages 1 and 6 (pdf.js 3.11.174 at
  1.35× and 4×), against quickstart §3:
  - Step 1: the version and "Download PDF" in C's header (T037, §7.2).
  - Step 2: "DRAFT" and "DRAFT · NOT LIVE" on all six pages; page 1's eyebrow "CONNECTION
    DETAILS · DRAFT FOR REVIEW" (capitals, §5.12), "Draft Not live yet" and "Last saved
    12.11.2026, 23:58 (draft save 1)".
  - Step 3: "To finish before publishing (2)" with "Licence class B in Hire car has no error
    message." and "Licence still valid in Hire car: choose a check."; rule-11 and rule-12 end
    with "Not complete: Write the message for citizens." and "Not complete: Choose a check.", in
    dashed warning frames with the "!".
  - Step 4: no "http", no "/api/connect" and no "connect" outside "connection" on any page;
    section 1 reads "Created when the connection is published and active." and names Standard,
    Taxi and Hire car.
  - Step 5: D has no gaps box (T037's files, §7.2).
  - veraPDF 1.28.1's PDF/UA-1 profile passes the file (106 rules, 0 failed checks).
- **The seams**: the first read, of T037's file, showed a light hairline across the gaps box's
  fill and bar at each slice join, at 1.35× and at 4×. T037's sweep compares texts and shapes, so
  it couldn't see them. The coordinator added T037a (wave 2b), which fixed them and the same seams
  in the group bars, so the published connection's PDF (A, B, E) changes too, by those 1 pt
  overlaps only (§7.3). In the file from the page after the fix, neither the fill nor the bar shows
  a hairline; at 4× the bar's right edge has a faint darker notch at each join (the overlap's
  edge anti-aliased twice), not visible at 1.35×. Accepted.
- **§7.2 and §7.3**: no open row; no unsure row for C and D (T037, T037a).
- **Decisions**: D6 (the coordinator: a draft's links to be created as two `P`s; carried to
  T051) and §5.18 (the gaps box's 2 pt, R11).
- **Decisions the agents marked UNCERTAIN, accepted**:
  - T035, T036: no place label on a page that begins inside the gaps list; only a cut incomplete
    rule's last piece dashed; a draft's band name cut 8 pt before the pill; "Not complete: …" as
    one span; the watermark centred by its measured width, without a text box; the gaps list no
    unit, only its heading chained to the first gap.
  - T037: D's reference is the prototype's `completed(draftOf(sample), sample)`; "the other
    tab" publishes and deletes through the API; C's and D's sections 2 and 3 cited "as in A";
    "Driving licence · Expiry date" without the prototype's "…" (§5.15).
  - T037a: a 1 pt strip of the fill right of the bar, not the whole fill, reaches up; the overlap
    decided at draw time from the block above on the page (`reachOf()`); `JOIN_OVERLAP` 1 pt.
- **Plan**: waves 1 and 2 kept their levels and batches. Added: T037a [high] as wave 2b, the
  checkpoint's defect made a task, as T040 does for Phase 7. Edits outside a line's file list,
  each allowed in the brief or reported: T036 passed the page's `pdf` through `index.tsx` and
  `DraftDetails`' props in `FormConnectionDetail/types.ts` (D5 keeps the hook in `index.tsx`) and
  corrected a comment in `RulesSummary.tsx`; T037a corrected the comment on `joinsAbove` in
  `utils/connectionPdf/types.ts`; the coordinator corrected the comments in `PdfDownload.tsx` and
  on `TextRole`. T037 and T037a used the repository's gitignored `.playwright-mcp/` (the MCP
  writes only there) and left it empty.
- **Carried**: D6 to T051.
- **Needs a person**: SC-007: a colleague who has never opened the website reads C's PDF and says,
  per variant, what is asked for, which rules apply, what a citizen is told and what is left to
  finish (T038 stays unchecked until then). Still open from earlier phases: the user validates the
  MVP (T034); T032's narrow check with the browser's own 200 % zoom; T027's look at A's page 1 in
  a real PDF reader; the designer's answer on the version's place in the header; SC-006's
  screen-reader walk (T006).

**2026-11-14, T040 checkpoint of US3 (Phase 7).**
- **Gates**: no source file changed in this phase. Run anyway on the checkout: lint; 2675 / 1948
  / 513 tests in `rules/`, `frontend/`, `mcp/` (as at T038); the build, the main entry 932.93 kB
  (278.86 kB gzip) and the worker's chunk 59.09 kB, both unchanged. The backend is unchanged
  since Phase 2 and its gates were not re-run.
- **The stack**: as T038's (`template_db`, the tests' fake EUDIPLO, the worker off, the dev SPA
  on 5173), still running from Phase 6's chat; signed in as `t037`.
- **§7.5**: every version row passes (T039: 59 checks in Chromium 156, no fail and no unsure),
  so SC-004 holds as far as a chat can check: the page, the file's name, its `Subject` and
  `Keywords`, and its drawn bands agree; the version stays the same across a second download,
  German, deactivating and activating, and publishing a draft unchanged; an edit changes it on
  the page and in the file after the click in a tab opened before the edit (FR-005), and undoing
  the edit gives the first version again. No defect, so no task was appended.
- **The coordinator's checks**: the API's answers for A, D and D's published copy, and the
  `Subject` of each saved file, read again outside the sweep; the drawn content of the files
  (§7.5, "The drawn content"), which turned T039's check of FR-005 through the properties into a
  check of the content; quickstart §4 step 5's second half cited from `model.test.ts` (§7.5).
- **Decisions the agents marked UNCERTAIN, accepted**: T039 edited `rule-12`'s message (Hire car,
  an empty variant, so nothing propagates to another variant); checked FR-005 through the
  properties and the name (now through the drawn text too, above); made D's copy with a Node
  script before the browser run; made §6's "tab 2" edit through the API, as the brief said.
- **State left behind**: A is published / live at `98C8-BFF0-B8E2` again, its rule set at
  version 5 after T039's two runs of two saves each; D is unchanged; two published copies of D
  added (§8.3).
- **Plan**: T039 [medium] as wave 1 and T040 [lead] as wave 2, as written; no change.
- **Carried**: nothing new.
- **Needs a person**: nothing for Phase 7 (the stack was running). Still open from earlier
  phases: SC-007's reading of C's PDF by a colleague (T038); the user validates the MVP (T034);
  T032's narrow check with the browser's own 200 % zoom; T027's look at A's page 1 in a real
  PDF reader; the designer's answer on the version's place in the header; SC-006's
  screen-reader walk (T006).

**2026-11-15, T047 checkpoint of US4 (Phase 8).**
- **Gates**: lint; 2675 / 1971 / 513 tests in `rules/`, `frontend/`, `mcp/` (+23 in `frontend/`
  against T040, T042's German cases); the build, the main entry 933.06 kB (278.92 kB gzip,
  +0.13 kB: T046's narrow glyph and `aria-label`), the worker's chunk 59.14 kB. Run by the
  coordinator after T046. The backend is unchanged and its gates were not re-run.
- **The stack**: as T040's (`template_db`, the tests' fake EUDIPLO, the worker off, the dev SPA on
  5173), still running; signed in as `t037`.
- **The German copy (T041, D7)**: the user, in the reviewer's place, accepted `PDF_TEXTS`' German
  column and the seven new `CONNECTION_DETAIL_COPY` keys unchanged. No German speaker walked through
  the German PDFs. T042 pinned the German with tests that read the tables (A and C in `model.test.ts`
  and `render.test.ts`).
- **§7.4**: no failing row.
  - T043: the 9 files (A, B, C, D in both languages, E in English) pass every structure,
    artifact, outline, property, font, edge and contrast check (602 rows; the lowest contrast
    4.67, the draft accent under the watermark counted as lying under every text, which corrected
    §4's watermark row). veraPDF 1.28.1's PDF/UA-1 profile, run in Docker, passes all 9 (106 rules,
    0 failed checks), so veraPDF no longer waits for a person.
  - T043's extra file, A named "申請 🚕 Taxi", is information only: it renders, its `Title`, file
    name and H1 keep the characters, and veraPDF fails 7.21.7-2 and 7.21.8-1 for the characters Fira
    lacks.
  - T044: 549 English/German text pairs of A and C pass: own texts, content, dates (also under New
    York's and Tokyo's time), statements, widths in their `layoutOf()` boxes, and SC-005 on the
    German pages.
  - T046 re-ran T043's script after its copy change: the same pages, texts, shapes, contrast and
    veraPDF result.
- **§7.2**: T045 found four defects in the header (20 states and FR-006's three pages per browser).
  T046 fixed three and recorded one as exempt (D8):
  - **Fixed**: the narrow button (glyph hidden, label wraps between words, 66 / 90 px); counts kept
    with their nouns (U+00A0); "Internetverbindung" in the PDF's alert (soft hyphen).
  - **Exempt**: the busy button's 3.17:1, an `aria-disabled` control in KERN's disabled style.
  - The re-run gives 423 of 425 rows passing per browser; the two left are the exempt rows. §2's
    narrow sentence and §3's busy row now say what is built.
- **What the PDF draws differently**: the "Contents" row and the documents' "{n} data items" hold
  a no-break space between number and noun (D8), which keeps a count with its noun in the PDF too.
- **The coordinator's checks**: T046's source diff read (the U+00A0 and U+00AD written as escapes;
  the soft hyphen only in spec 011's two German keys, kept out of the button's name); the gates
  re-run; no helper left listening (T045's and T046's one-shot password server), `.playwright-mcp/`
  empty, no veraPDF container left.
- **Decisions the agents marked UNCERTAIN, accepted**:
  - T042: the rules package's texts in the "fully explained" check taken from the model;
    English strings that also occur in content, or have 2 characters or fewer, skipped in the
    no-English check; `Subject` and `Keywords` English in a German PDF (contract §4).
  - T043: the step numbers inside their circles counted as artifacts; A has two pages with marks,
    not three; the watermark assumed under every draft text.
  - T044: a heading's trailing space measured out; a rule's day value without a time; option-set
    labels equal in both languages passed.
  - T045: personal access tokens made to raise a real approval request (declined, tokens revoked);
    B and C measured open only; the failure state a network abort (the 500 cited from T033).
  - T046: soft hyphens (spec 009's R9 step 3) rather than accepting spec 008's break; U+00A0 in the
    shared copy rather than page-only nowrap spans; "Zusammenfassung" left to spec 008/009; the busy
    contrast exempt.
- **State left behind**: T045 made a copy of D (`b766d9ac-ae5b-49bd-b0e6-0f3a3f9eb70e`, then
  deleted) and three approval requests to publish it (declined), with their tokens revoked; A to F
  are unchanged.
- **Plan**: every wave kept its level and batch. One coordination rule was added for wave 3:
  T043 and T044 stayed off the two Playwright browsers, which T045 drove (a tab of theirs would
  have taken over T045's scripts), and were to list page images for the coordinator instead; none
  was needed. T041 was decided by the user in the reviewer's place, without the walk through the
  German PDFs.
- **Carried**: nothing to a later task of this feature. Outside it: a soft hyphen in
  "Zusammenfassung" (the Summary's heading and toggle, spec 008/009's) if those specs want it.
- **Needs a person** (T047 stays unchecked until then):
  - The screen-reader walk of quickstart §5 step 3 (NVDA with Acrobat Reader).
  - A black-and-white printout of A (quickstart §2 step 7).
  - The narrow width confirmed once with the browser's own 200 % zoom (T045 emulated it).
  - Optional: a German-speaking team member reading C's and A's German PDFs (T041 was the user's
    decision without one).
  - Still open from earlier phases: SC-007's reading of C's PDF by a colleague (T038); the user
    validates the MVP (T034); T027's look at A's page 1 in a real PDF reader; the designer's answer
    on the version's place in the header (the header is still 124 px for A in English and 156 in
    German at 1440).

**2026-11-15, T054 final checkpoint (Phases 9 and 10).**
- **Gates**, run by the coordinator after T053:
  - Node: lint passes; 2675 / 1982 / 513 tests pass in `rules/`, `frontend/`, `mcp/` (+11 in
    `frontend/` against T047: T050's label and `isShownConnection` cases); the build passes.
  - The bundle: the main entry is 933.35 kB (278.96 kB gzip, +0.29 kB: `RulesSummaryBody`, `isShownConnection`), the worker's chunk 59.31 kB.
  - The backend: Ruff, its format check and mypy clean; pytest 2643 passed (14 min). It is unchanged since Phase 2.
  - The first full `npm test` failed on `rules/src/personas/performance.test.ts` ("… within 1.5 s",
    5.3 s) while T053 ran veraPDF in Docker. `rules/` is unchanged by spec 011; re-run on a quiet
    machine, 2675 / 2675 passed (§9.5).
- **The stack**: as T047's (`template_db`, the tests' fake EUDIPLO, the worker off), still
  running; the dev SPA on 5173 was restarted by T050 after its production-build timings (pid
  862600, the same command). A, B, C, D, E and F are as §8.3 lists them. T049's renames of A left
  one activity row.
- **Wave 1** (T048 ∥ T049, report-only):
  - **T049**: 112 rows, all pass in Chromium 156 and Firefox 159: the language at activation,
    leaving while busy, the odd and the long name, and privacy (one GET per warm download, row
    counts unchanged, nothing in the log).
  - **T048**: the limits; E's 764 pages per language keep every chain, unit and split rule.
    - **Defect 1**: the bottom label lost "(continued)" on 722 pages per language (FR-021,
      FR-025).
    - **Finding 2**: the page froze about 0.45 s per download on the dev server (FR-003).
- **Wave 2** (T050): fixed both. D9 cuts only the variant's name in the bottom label: 764 / 764
  per language. D10 memoises the Summary's body and keeps an unchanged fetch: on the build, the
  longest gap is 76–154 ms in Chromium and 76–123 ms in Firefox after the first click. Firefox's
  first click right after the load gave 294 ms, accepted in D10.
  - E saved in 6.4–7.1 s in Chromium and 9.0–10.6 s in Firefox on the build, within SC-001's
    60 s.
  - The coordinator read the diff and reflowed one comment line in `index.tsx`.
- **Wave 3** (T051, `/speckit-converge`): 45 FRs, 8 SCs, the plan's decisions and the constitution's rules checked. Two findings, decided before the run, appended as Phase 10:
  - T055: the MCP's draft texts say "save {n}" (D11).
  - T056: nginx's `client_max_body_size 4m` on `/api/`, agreed by the user (D12).
  - One [medium] agent did both. `nginx -t` couldn't run: there is no nginx image here.
- **Waves 4 and 5**:
  - T052: README, ARCHITECTURE's "The connection PDF (spec 011)", CLAUDE.md's rule and third
    worker, KERN's missing Fira Mono, deferred.md's Q37 (b). CI needs no new check.
  - T053: §9, `pr.md`, and `pdfkit-cidset-issue.md`, whose two upstream bugs it reproduced
    against veraPDF in Docker.
- **Quickstart §1 to §6**: each has its rows in §7 or §8.4: §1 the gates (every checkpoint
  above), §2 §7.3 and T034's read, §3 T037's blocks in §7.2 and §7.3, §4 §7.5's T039, §5 §7.2's
  T045 and T046 and §7.4, §6 §7.2 and §7.5.
- **Decisions the agents marked UNCERTAIN, accepted**:
  - T048: run 5 of each browser a German download; the 200 ms bound; a slow scroll "unsure".
  - T049: the file-name oracle written from data-model §7; the counts taken after signing in.
  - T050: Firefox's first-click overlap (D10); `JSON.stringify`'s field order; `placeLabelOf`'s
    `fits` test; T044's time-zone runs not repeated (no date code changed).
  - T055 and T056: the paragraph's place in ARCHITECTURE; `/api/connect/` keeps nginx's 1 MB (no save bodies).
  - T052: the section's place; the hook's unused options undocumented; the KERN §2 row corrected
    too.
  - T053: items 9–12 of §9.4 held by T054; SC-004's "another computer" argued from R6; FR-041's
    "no finding or persona" cited from the model's types.
- **Plan**: every wave kept its level and batch. Two changes, both for shared resources, not
  levels:
  - **Wave 1 shared the browsers**: T049 drove both browsers first, and T048 rendered in Node and
    then waited for a `BROWSERS_FREE` flag. Its browser part ran after T049's, resumed by the
    coordinator: two agents in one Playwright browser take over each other's tab, and T048's
    timings needed a quiet browser.
  - **Phase 10's two [medium] tasks** ran as one batch, one agent.
- **State left behind**: `.playwright-mcp/` empty (two console logs moved to the scratchpad); no
  helper listening; no veraPDF container.
- **Needs a person** (§9.4 is the full list): E's timing by stopwatch; a save of E through nginx;
  telling the designer; filing `pdfkit-cidset-issue.md`; committing and opening the PR. Still
  open from earlier phases, with their checkpoints: T006, T027, T034, T038, T047.

## 9. Closing report

**T053, 2026-11-15.** The success criteria against the evidence of §7 and §8.4, the deviation the
designer is to be told about, the decisions, and what only a person can do. Phase 9's checkpoint
(T054) follows in §8.4.

### 9.1 The success criteria

| SC | Result | Evidence |
|---|---|---|
| **SC-001** one activation; the sample within 3 s; the limits within 60 s, the page responding | met in the chat; a hand timing of E waits for a person (§9.4) | **A and B** on the production build (§7.2, T033), click → `download`: A 442–953 ms in Chromium 156, 564–867 ms in Firefox 159; B 471–914 ms and 601–1137 ms; a double click and two `click()`s in one task save one file. **E** (764 pages): T048 on the dev server 6.3–7.1 s (Chromium) and 8.5–12.1 s (Firefox), an upper bound (§7.5); T050 on the fixed build 6.4–7.1 s and 9.0–10.6 s (§7.5). **Responding** (FR-003): T050's bound, the longest gap between 50 ms ticks at most 200 ms on the build (D10): 9 of 10 runs within it (Chromium 82–154 ms in all five runs, Firefox 76–123 ms in runs 2–5); Firefox's first click right after loading E gives 294 ms, the overlap with the page's own load that D10 accepts (no click: 96–139 ms; a click after 3–8 s: at most 106 ms). Scroll and "View links" are answered during every run |
| **SC-002** everything the details show, in order and nesting; no finding, persona or draft URL | met for A–F | **§7.3**: A against the prototype (T026, 0 unsure, 0 defects after its fixes), C and D (T037, 0 unsure, 0 defects; T037a's seams fixed); **§8.4**: A, B and F from the page read against quickstart §2 (T034); **§7.5**: E's drawn texts equal its blocks' layout spans on all 764 pages in both languages (T048, T050). **Tests**: `model.test.ts` ("holds the request link and each variant’s result link in the details’ order", "lists the documents in the answer’s order …", "shows the variants in the details’ order …", "shows the items in the Summary’s order and nesting with Taxi’s marks") and `render.test.ts` (A's section 3 in the Summary's order; E and the drafts "hold no URL …"). No URL in C's and D's files from the page (§7.2, T037's `files.csv`); the model's types carry no finding, persona or citizen data (`types.ts`, `model.ts`, `gaps.ts`: FR-041) |
| **SC-003** every page names the connection, ID, version, date; the bottom its place and "Page n of N" | met | **Smoke test** `render.test.ts`: "carries the ID, the version and "Page n of N" on every page, as Pagination artifacts" (A), "names the page’s place at the bottom from page 2 on, and none on page 1", the same for E's 764 pages and in German ("Seite n von N"), "cuts the name in the band to one line ending in "…"". **§7.5**: T048's band check 764/764 per language; T050's drawn place labels 1528/1528 (D9); T049's long and odd names. **§8.4**: T034's read of every page's band (name, ID, version, "Generated …") |
| **SC-004** the version stays when the content stays, and changes with any one element | met | **pytest**: `backend/tests/unit/test_versions.py` (`test_each_kind_of_element_changes_the_version`, 30 kinds; `test_an_edit_and_its_undo_give_the_same_version`; `test_the_version_takes_only_the_content` and the others listed in §7.5) and the API tests of T007 and T008 (`test_status_changes_and_start_dates_keep_the_version`, `test_a_draft_published_unchanged_keeps_its_version`, `test_saving_a_draft_unchanged_keeps_its_version`, `test_the_version_is_the_same_in_german` …). **§7.5, T039**: 59 checks in Chromium, all pass: a second download, German, deactivating and activating, an edit (new version on the page, in the name, the properties and the drawn bands), the edit undone (the first version again), a draft published unchanged. "Another computer" isn't a test of its own: the backend computes the version (R6) and every browser reads it from the same answer |
| **SC-005** no split rule, group header, link or document; no page ending with a heading; "(continued)" | met | **Smoke test and pure tests**: `blocks.test.ts` (the invariants `expectChainsAndUnits()`, `expectPagesKeepChains()`, "a rule taller than a page", E over `paginate()`'s pages in both languages), `paginate.test.ts` (D9's label cases), `render.test.ts` ("keeps "(continued)" in the bottom’s label and cuts only a long variant name with "…" (T050)", "continues a rule taller than a page in its own Div …"). **§7.4**: T044, 0 failures on A's and C's German and English pages. **§7.5**: T048, E 1528/1528 pages for the units, chains and the computed label; the drawn label failed on 722 pages per language (defect 1), fixed by T050 with D9's cut (1528/1528) |
| **SC-006** PDF/UA-1 validator without failure, both languages; a screen-reader walk | validator met; the walk waits for a person | **§7.4, T043**: veraPDF 1.28.1, `--flavour ua1`, 106 rules, 0 failed checks on 9 files (A, B, C, D in English and German, E in English), again after T046 (`011/T046/pdf/sweep.ts`); 602 structure, artifact, outline, property, font, edge and contrast rows pass, the lowest contrast 4.67. Earlier runs: §7.2 (T037: six files from the page), §7.3 (T026, T037a), §8.4 (T034: A, B, F from PDFKit's browser build). `withoutCidSet()` keeps PDFKit's incomplete `CIDSet` out (R5; §9.4 for the upstream report). **Waits**: the screen-reader walk (quickstart §5 step 3) and, optionally, PAC 2024 (§9.4) |
| **SC-007** a colleague reads a draft's PDF alone | waits for a person | prepared by T038 (C's PDF from the page read against quickstart §3, §8.4); the team's reading is §9.4's item |
| **SC-008** no stored record, no extra request naming a connection, no log line | met | **§7.2, T033**: the first run after loading the page makes the GET, `GET /api/option-sets` (D5, names no connection) and the static files of FR-042, each once; every later run exactly the GET. **§7.5, T049**: five warm downloads in each browser, exactly one `GET /api/form-connections/{id}` each, the row counts of all 14 tables unchanged, 0 new bytes in the backend's log, 0 requests to another host; the static check of `backend/app/`'s log calls (none names a PDF; the one "version" is the rule set's save number) |

### 9.2 The deviation for the designer

The version is in the Summary card's header, which the frames don't draw (§2; the spec's
clarification of 2026-11-09 put it beside the button; D4 sets its type).
- **Where**: left of "Download PDF", 8 px apart, on one line: "Version" 14/24 muted, the code
  14/24 medium, `tabular-nums`, default colour. Shown open and closed, on published and draft
  details.
- **What it costs at 1440 px**: the header is 124 px high for A in English, not the frames' 100,
  since the counts wrap to two lines beside the version (since D8 they break before "12 rules").
  In German it is 156 px: the heading takes the row, and the version, the button and the toggle
  wrap under it as one group at the right (§7.1, §7.2's T045). C's header is 124 like A's.
- **On a narrow window** (D8): the slot moves under the heading as its own row; the button hides
  its glyph and wraps its label between words, 66 px high in English and 90 in German.
- **Rejected places** (§2): in the counts line, in the status band, under the button.
- **The question**: does the designer accept this place, or draw another? Until then the version
  stays where it is (§9.4).

### 9.3 The decisions

| D | Decision |
|---|---|
| D1 | PDFKit typed by our own `PdfKitDocument` interface and one `declare module 'pdfkit'`, no `@types/pdfkit` |
| D2 | German terms settled against spec 009's code ("Feld", "nicht aktiv", "Version", "Details der Anbindung" …) |
| D3 | Faded text struck with PDFKit's own `strike`, inside the tag, not as `PlacedLine` artifacts |
| D4 | The header's version 14 px, set apart by weight and colour; the closed header measured on node `6809:46487` |
| D5 | `useConnectionPdf` lives in `index.tsx`; no option sets passed; dynamic imports; a failed fetch keeps the worker |
| D6 | A draft's links to be created tagged as two `P`s, not a list |
| D7 | The German copy accepted as it stands (the user in the reviewer's place) |
| D8 | T045's defects: the narrow button (glyph hidden, wraps between words), no-break spaces in the counts, a soft hyphen in "Internetverbindung" fixed; the busy label's 3.17:1 exempt; "Zusammenfassung" left to specs 008/009 |
| D9 | The bottom's place label cuts only the variant's name with "…", keeping the section and "(continued)" |
| D10 | Responsiveness: a 200 ms bound on the build; the Summary's body memoised, an unchanged fetched connection not replaced; the first-click overlap with the page's load accepted |
| D11 | The MCP's texts call a draft's save number "save", not "version" (T055) |
| D12 | nginx's `client_max_body_size 4m` on `/api/` (T056) |

### 9.4 Waits for a person

Each item names the checkpoint that stays unchecked until it is done. T006, T027, T034, T038 and
T047 are unchecked for these items only; T054 is the final checkpoint.

| # | What | Who and how | Waits |
|---|---|---|---|
| 1 | Validate the MVP: download A's and B's PDF from the details page and read them against quickstart §2 | the user | **T034** |
| 2 | Open A's PDF once in a real PDF reader (Acrobat Reader or the system's viewer) and read page 1 (`011/T027/A-en.pdf`, or a download) | a team member | **T027** |
| 3 | SC-007: a colleague who has never opened the website reads C's PDF and says, per variant, what is asked for, which rules apply, what a citizen is told and what is left to finish | a colleague of the team | **T038** |
| 4 | SC-006's screen-reader walk of one PDF (quickstart §5 step 3: NVDA with Acrobat Reader): title, headings, lists, the details box as a table, nothing of the band, the bottom or the watermark. Asked on 2026-11-12 who does it; the answer is still pending | to be named | **T006**, **T047** |
| 5 | Optional with item 4: PAC 2024 on a Windows machine (R5) | the same person | T047 (optional) |
| 6 | A black-and-white printout of A (quickstart §2 step 7): marks, statuses, AND/OR and removed items readable without colour | a team member | **T047** |
| 7 | The narrow width once with the browser's own 200 % zoom on a 320 px window (T032 and T045 emulated it) | a team member | **T047** (listed since T034) |
| 8 | Optional: a German-speaking team member reads C's and A's German PDFs (D7 was decided without one) | a German speaker | T047 (optional) |
| 9 | E's timing confirmed once by hand in a real Chromium and Firefox: a stopwatch from the click to the saved file (Phase 9's Delegation) | a team member | T054 |
| 10 | A save of E through nginx (`docker compose -f docker-compose.prod.yml`): T056 set the limit, but no nginx image was on this machine to check the configuration | a team member with the production stack | T054 (T056 is done) |
| 11 | Tell the designer about the version's place in the header (§9.2) and record the answer here | the user | T054; the answer is open since T034 |
| 12 | File `pdfkit-cidset-issue.md` with PDFKit (foliojs/pdfkit), after searching its issues for an existing report | a team member with a GitHub account | T054 |
| 13 | Commit the feature and open the pull request with `pr.md` | the user | after T054 |

### 9.5 Observations outside spec 011

- **Two timing tests flaked under load** during Phase 9's gates and passed on the re-run, with no
  change between the runs: `rules/src/personas/performance.test.ts` ("… within 1.5 s", the budget
  T006, T011, T021 and T027 already saw trip while suites ran side by side) and
  `mcp/src/checks.test.ts` ("keeps the results the worker posted …"). Neither file is spec 011's.
  A red run of either is worth re-running alone before it counts.
- **"Zusammenfassung"** in the Summary's heading and toggle breaks inside the word on a narrow
  window (spec 008's last resort). A soft hyphen (spec 009's R9 step 3) would fit; it is spec
  008's and 009's to decide (D8; §8.4, Phase 8).
