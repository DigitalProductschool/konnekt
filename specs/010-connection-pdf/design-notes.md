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
- Shown open or closed, on the published (active and deactivated) and the draft details; the
  value comes from the loaded connection and changes when the page loads a newer one (FR-005).
- Rejected places: in the counts line (it would read as one more count, and the clarification
  put it beside the button); in the status band (not where a reader looks when comparing with the
  PDF the button makes); under the button (a second line in a header that is otherwise one row).

**Narrow screens** (320 px at 200 %, spec 008's rule for the header): the row wraps; the slot
moves under the heading block as its own row (version, then the button) and the toggle stays
last; nothing overlaps and the button keeps its full label and 48 px height. The version wraps
before the button, never inside the code.

## 3. States without frames (build from KERN patterns, as spec 008's W# items)

| State | What shows | Assistive technology |
|---|---|---|
| Idle | "Download PDF" with the glyph | a button |
| Busy (fetching and rendering) | label "Creating PDF…", the glyph kept, `aria-disabled="true"`, clicks ignored (the pattern of `ConfirmDialog`'s busy button); the rest of the page responds (FR-003) | the polite live region says "Creating the PDF…" once |
| Saved | back to idle; the browser's own download indicator shows the file | the live region says "PDF saved." |
| Failed | a KERN danger alert inside the Summary card, under the header row, full width, open or closed: title "Couldn’t create the PDF", the text `ErrorNoticeText` gives (the server's message with a 5xx's error id, or "Check your connection and try again."), and a secondary "Try again" button that starts a new run (FR-004); it disappears when a run starts | the alert's `role="alert"` |
| Gone (404 at activation) | the details' not-found state, as `FormConnectionLoadState` shows it | as today |

The live region is the one the details page uses for "Link copied" (no second region). Copy goes
into `DETAIL_COPY` in `pages/FormConnectionDetail/constants.ts` as `defineTexts(en, de)` (spec
009): `downloadPdf`, `creatingPdf`, `creatingPdfAnnouncement`, `pdfSaved`, `pdfFailedTitle`,
`pdfFailedText`, `version(code)`; "Try again" reuses `DETAIL_COPY.retry`. German proposals:
"PDF herunterladen", "PDF wird erstellt …", "Das PDF wird erstellt …", "PDF gespeichert.",
"Das PDF konnte nicht erstellt werden", "Prüfen Sie Ihre Verbindung und versuchen Sie es
erneut.", "Version {code}".

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
| Draft pill, draft accents, dashed box | `#05669E`, dot `#0284C7`, `#E3F1FB` | `#05669E`, dot `#0284C7`, `#E0F2FE` (ConnectionStatusBadge, feedback-info-background) | | 5.4 |
| "Draft · Not live" pill in the band | white on `#0284C7` (**4.1, fails**) | white on `#05669E` | | 6.2 |
| Marks "Changed here", "Added here" | purple `#6B2D8F`, teal `#0D6B6B` | `#8A22B5` on `#F8F1FC` (BranchMark: variant-changed and variant-new share it; the words tell them apart) | | 6.4 |
| Mark "Removed here", removed card | `#5F6270` on `#F2F3F6` | `#4A5468` on `#EEF1F6` (feedback-default) | | 6.7 |
| Removed text (struck through, "faded") | `#8A8D9B` (**3.0, fails**) | `#4A5468` muted, struck through | on `#EEF1F6` | 6.7 |
| Faded AND/OR chip | `#8A8D9B` on `#F2F3F6` (**3.0**, artifact) | `#4A5468` on `#EEF1F6` | | 6.7 |
| Gaps box | `#8A4500` on `#FFF5E6`, bar `#D98A1C` | `#9A4A00` on `#FFF4E0` (feedback-warning), bar the same hue | | 5.8 |
| Lines, frames | `#D3D6E0` | `#D0D5DD` card-divider, `#E1E6F0` decorative-border | (no text) | |
| Watermark | `#0284C7` at 6 % | the same | exempt (FR-039); text under it stays above 15:1 | |

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

## 6. How it is verified

- The button: FIGMA-WORKFLOW §4 at 1440 px (numeric check against `get_design_context`) and the
  narrow check at 320 px / 200 %; the busy, failed and saved states by stubbing the requests.
- The PDF: compared page by page with the prototype's PDFs for the same sample (layout and
  English wording), in a PDF reader at 100 % and printed in black and white (marks, statuses,
  AND/OR and removed items readable without colour); quickstart.md lists the steps.
