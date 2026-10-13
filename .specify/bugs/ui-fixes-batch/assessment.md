# Bug Assessment: Four UI fixes: hover tooltips, steady picker buttons, fixed wizard frame, no serviceBW in the UI

- **Slug**: ui-fixes-batch
- **Created**: 2026-10-12
- **Source**: pasted text (no URL)
- **Verdict**: valid (all four items are grounded in the code; none was reproduced in a running app,
  see Reproduction)
- **Severity**: medium overall. Per item: B1 low, B2 low, B3 medium, B4 medium. No item loses data,
  touches the backend or has a security impact. B3 makes long field lists hard to work with, because
  the document list scrolls out of view. B4 shows a third party's product name on every connection's
  detail page, which the reporter rules out for the frontend.

The report bundles four independent frontend issues. They stay in one assessment, as the reporter
suggested: each one is small, and B1 and B3 both change how the info bubbles behave inside the wizard
frame. Each issue below has its own symptom, cause and remediation, so `/speckit-bug-fix` can apply
them one at a time.

## Report (verbatim or summarized)

> There are multiple bugs in the UI that needs a fix. […]
>
> - The info ('i') buttons in the webUI should be triggered when the mouse hovers them, not click
>   them. Now they have to be cliked and they stay open until you click somewhere else. They need to
>   be displayed only on hover and as soon as the mouse move away, they have to be gone.
> - In the 'Add documents' page (form-connections/new), the button add/remove change length based on
>   the state. I know this is how figma designed it, but pick the longest length among all of the
>   possible state (probably is the remove one) so they don't change.
> - Also in the 'Add documents' page, at the moment, when you scroll everything moves. I want that
>   only the documents fields on the right moves, so header, documents list on the left and also
>   footer with back/pulish they should be sticky/fixed and not move. This applies also to later
>   screens. Header and footer should not move!
> - When a connection is published, in the result page (also when viewing an already created
>   connection) we have references to serviceBW both in the info buttons and in a line below the
>   second link. Altough it is ok to keep the serviceBW references in the repo, it not ok to show
>   them in the frontend. Remove the line below the second link. For the infor buttons rephrase it in
>   order to remove the reference but keep the same meaning.

Clarifications answered on 2026-10-12, before this assessment was written:

- **Slug**: `ui-fixes-batch`, one assessment for all four items.
- **Scroll model for "Add documents"**: only the right column (the field cards) scrolls. The header,
  the progress bar, the "Add documents" title, the document list on the left and the footer all stay
  put. Where the columns stack (below 1024 px), the content between the fixed header and footer
  scrolls as one.

## Symptom

- **B1 Info bubbles open on click.** The (i) buttons next to "Form name", "Form ID", "Request link"
  and "Result link" open their bubble on click. It stays open until the next click elsewhere, a
  second click on the button, or Escape. Expected: the bubble shows while the mouse is over the (i)
  and disappears as soon as the mouse leaves.
- **B2 Picker buttons change width.** In "Available in the wallet", a document's button is "+ Add",
  "✓ Added" once added, and "Remove" while hovered or focused, and each state has a different width.
  Expected: one width for all three states, the widest one.
- **B3 Everything scrolls.** On "Add documents" the header, the progress bar, the title and the
  document list all scroll out of view with the page. Expected: only the field cards on the right
  scroll. The header and the action bar stay fixed on every wizard step and on the later screens.
- **B4 serviceBW in the UI.** The connection's detail page, after publishing and when opening an
  existing connection, names serviceBW in both (i) bubbles and in the line under "Result link".
  Expected: no serviceBW in anything the UI shows. The line goes, and the two bubbles keep their
  meaning without the name.

## Reproduction

1. Start the database and backend as the README describes, and run `npm install && npm run dev` in
   `frontend/` (this worktree has no `node_modules` yet). Create an account with
   `uv run python -m app.cli create-user <name>` and sign in.
2. **B1**: open `/form-connections/new`. Move the mouse over the (i) next to "Form name": nothing
   happens. Click it: the bubble opens. Move the mouse away: it stays. Click elsewhere: it closes.
3. Fill in "Form name" and "Form ID", click "Continue".
4. **B2**: in "Available in the wallet", note the width of "+ Add" next to "Personal ID". Click it: the
   button becomes "✓ Added" and gets wider. Hover it: it becomes "Remove" and gets narrower. Moving
   the pointer into the left-most ~9 px of "✓ Added" makes it flicker between the two states (see B2).
5. **B3**: add both documents, so that the field cards are taller than the window (the catalog has
   25 and 31 fields for the two documents), and scroll down. The header, progress bar, title and the document list scroll away.
   The "Back / Publish" bar stays at the bottom (see B3: it is already sticky).
6. **B4**: select at least one field per document, click "Publish", then "Confirm and publish". The
   detail page opens with "Your connection is live". Under "Result link" it says "serviceBW puts the
   request’s reference in place of {reference}.", and the (i) next to each link title opens a bubble
   that starts with "serviceBW calls this link…". Opening the connection from the overview later shows
   the same.

These steps weren't run in a browser during this assessment: the worktree has no `node_modules`, and
the app wasn't started. They follow from the source files listed below. Two facts were checked
outside the app:

- **KERN's CSS** (`@kern-ux/native` 2.8.2, the version in `package.json`, downloaded from npm): it
  sets no `overflow` on `html` or `body`, except `body:has(.kern-dialog[open]) { overflow: hidden }`.
  So nothing breaks `position: sticky`, and the footer's existing `sticky bottom-0` keeps the action
  bar in view.
- **Button widths** (B2): measured in headless Chromium with KERN's own `FiraSans-SemiBold.woff2`
  (`document.fonts.check` true) and the box model of the three states copied from the classes and
  `kern.css`. These are measurements of a reconstruction, not of the running app. The fix measures
  them again in the app.

## Suspected Code Paths

### B1 Info bubbles

- `frontend/src/components/InfoToggletip/index.tsx:51-57`: the (i) is a `<button>` whose `onClick`
  toggles `open`. No pointer or hover handler exists.
- `frontend/src/components/InfoToggletip/index.tsx:27-47`: while open, only a `pointerdown` outside
  the component or Escape closes the bubble.
- `frontend/src/components/InfoToggletip/index.tsx:65-77`: the bubble is a `role="status"` live
  region, rendered only while open (the toggletip pattern). It sits 2 px below the icon
  (`top-[calc(100%+2px)]`, line 69).
- Callers: `frontend/src/pages/FormConnectionEditor/ConnectionStep.tsx:59-61, 75-81` (Form name, Form
  ID) and `frontend/src/pages/FormConnectionDetail/LinkCard.tsx:30` (both links). The component is
  also mentioned in `frontend/src/components/TextField/index.tsx:5` and `TextField/types.ts:9`.
- `specs/001-servicebw-eudi-middleware/design-notes.md:268`: records the "(i) toggletip" decision.

### B2 Picker button width

- `frontend/src/pages/FormConnectionEditor/DocumentPickerItem.tsx:66-79`: "+ Add" is a KERN
  `kern-btn kern-btn--secondary kern-btn--small`: 1 px border, `0 8px` padding, 20 px icon, and the
  label with `4px 8px` padding.
- `frontend/src/pages/FormConnectionEditor/DocumentPickerItem.tsx:33-64`: "✓ Added" / "Remove" is a
  custom button. Its inner span (line 40) is `px-8` and sized by its content: the 20 px check plus
  "Added" (lines 43, 47), or "Remove" without the check (line 53) while hovered or focused.
- Measured widths (Fira Sans SemiBold 16 px):

  | State | Content | Width |
  |---|---|---|
  | `+ Add` | border + 8 + icon 20 + 8 + "Add" + 8 + 8 + border | **82.5 px** |
  | `✓ Added` | 8 + icon 20 + 8 + "Added" + 8 + 8 | **98.9 px** (widest) |
  | `Remove` | 8 + 8 + "Remove" + 8 + 8 | **89.8 px** |

  The widest state is "✓ Added", not "Remove" as the report guessed: its check icon adds 20 px.

### B3 Wizard frame

- `frontend/src/components/WizardLayout/index.tsx:13`: the frame is `min-h-screen` and the window
  scrolls. `TopBar` (line 14) is a plain block, so the header scrolls away.
- `frontend/src/components/WizardLayout/index.tsx:21`: the footer is already `sticky bottom-0`. KERN
  doesn't break sticky (see Reproduction), so the bar stays in view today. The report lists it among
  the parts that move; after the fix it is fixed in any case.
- `frontend/src/components/WizardLayout/index.tsx:18-19`: progress, title and step content all go
  into one 1120 px column, so the layout can't keep the head still while the body scrolls.
- `frontend/src/pages/FormConnectionEditor/index.tsx:130-134`: the page renders `WizardProgress`;
  `DocumentsStep.tsx:32-36` renders the `PageTitle`.
- `frontend/src/pages/FormConnectionEditor/DocumentsStep.tsx:58-91`: the two columns
  (`lg:flex-row lg:items-start`): the 296 px `DocumentPicker` (`DocumentPicker.tsx:20`) and the
  field cards.
- `frontend/src/pages/FormConnectionEditor/FieldChecklist.tsx:33` and `FieldCheckbox.tsx:7`: three
  236 px fields with 16 px gaps, plus 24 px padding and a 1 px border on each side, need **790 px**.
  The card column is 800 px wide at 1120 px (1120 − 296 − 24). A classic 15 px scrollbar inside that
  column would leave 785 px and push every card to two fields per row (see Risks).
- `frontend/src/components/AppLayout/index.tsx:9-16`: the later screens (the connection's detail page
  after "Publish", the overview, the first-connection loader) use `AppLayout`, whose `TopBar` also
  scrolls away. It has no footer.
- `frontend/src/components/Toast/index.tsx:13`: the toast is `fixed bottom-104` (80 px bar + 24 px).
  It stays correct as long as the bar stays 80 px at the bottom.
- `CLAUDE.md` ("sticky action bar") and `specs/001-servicebw-eudi-middleware/design-notes.md:125-129,
  151-155, 297`: describe the current frame.

### B4 serviceBW copy

- `frontend/src/pages/FormConnectionDetail/constants.ts:17-18` (`requestLinkInfo`) and `:21-22`
  (`resultLinkInfo`): both bubbles start with "serviceBW calls this link…".
- `frontend/src/pages/FormConnectionDetail/constants.ts:23` (`resultLinkHint`), passed in
  `ConnectionLinks.tsx:58`, rendered in `LinkCard.tsx:33-37`: the line under the second link.
- `frontend/src/pages/FormConnectionDetail/constants.ts:26-27` (`webhookHint`) and `:31`
  (`modeHints.pull`): also name serviceBW, but only `WebhookCard.tsx:80, 87` uses them, and nothing
  renders `WebhookCard` today. The design notes' decision of 2026-10-11 takes the card off the page
  until US3, and T091 brings it back unchanged, which would bring these strings back.
- No other user-visible frontend string names serviceBW: a case-insensitive search of `src/`,
  `index.html` and `public/` for `service.?bw`, excluding the `servicebw_form` field and its
  identifiers, finds only these five constants. The `servicebw_form` field appears only in code, and
  the UI labels it "Form ID". No API message the UI displays contains the name. Code comments
  (`FormConnectionDetail/index.tsx:18`) aren't shown, and the reporter allows them.
- `specs/001-servicebw-eudi-middleware/design-notes.md:326-328`: records the hint and the bubbles'
  content.

## Root Cause Hypothesis

All four are deliberate choices in the current implementation, not regressions. Confidence: **high**
for each.

- **B1**: `InfoToggletip` implements the toggletip pattern on purpose: click to toggle, a live region
  that announces the text, closed by a click elsewhere. Nothing reacts to hover.
- **B2**: each state sizes to its own content, and Figma draws them that way. Because the "Remove"
  state is ~9 px narrower than "✓ Added" and the button is right-aligned, the button's left edge
  moves right on hover. A pointer in that strip leaves the button, which turns back into "✓ Added"
  under it, and the states flicker. So B2 is a small hover glitch, not only a cosmetic one.
- **B3**: the wizard is a normal scrolling page. Only the footer is sticky, and there is no scroll
  container for the field cards. `AppLayout` has no fixed header either.
- **B4**: the detail page's copy was written for serviceBW as the reader (design notes §7), and the
  hint line exists only to explain serviceBW's `{reference}` substitution.

## Proposed Remediation

### B1 Show the bubble on hover

**Preferred**: turn `InfoToggletip` into a hover tooltip that also meets WCAG 1.4.13 (content on
hover or focus):

- **Mouse**: open on `pointerenter` and close on `pointerleave` of the wrapper `<span>`, handling
  `pointerType === 'mouse'` (and `pen`) only. The bubble is a DOM descendant of the wrapper, so the
  pointer can move onto it without closing it, as 1.4.13 requires ("hoverable"). It closes as soon as
  the pointer leaves both the (i) and the bubble. Replace the 2 px offset `top-[calc(100%+2px)]` with
  `top-full pt-2`: it looks the same, and crossing the gap no longer counts as leaving. A mouse click
  doesn't toggle or pin the bubble any more.
- **Keyboard**: open while the button has keyboard focus (`:focus-visible`, checked on `focus`), close
  on `blur`. Without this, keyboard users can't read the text at all. A focus that comes from a mouse
  click doesn't open it, so the bubble closes when the mouse leaves, as the report asks.
- **Escape**: closes the bubble while the pointer or the focus stays on it ("dismissible"). It opens
  again on the next enter or focus.
- **Touch**: has no hover, so a tap keeps toggling the bubble, and a tap elsewhere closes it. Keep the
  current outside-`pointerdown` logic for this case only.
- **ARIA**: switch from the toggletip semantics (`aria-expanded`, `aria-controls`, `role="status"`) to
  a tooltip: the bubble gets `role="tooltip"`, and the button gets `aria-describedby`. Keep the bubble
  in the DOM with `hidden` while closed, so the description is always available to assistive
  technology. It is then read with the button rather than announced.
- **Name**: rename the component to `InfoTooltip`, since it is no longer a toggletip (2 imports, the
  `TextField` comments, design notes). This is optional; the behaviour fix doesn't depend on it.

**Alternative**: CSS only (`group-hover:block`, `group-focus-visible:block`). It's simpler, but
Escape can't dismiss it (fails 1.4.13), and touch devices lose the bubble altogether.

### B2 One width for Add, Added and Remove

**Preferred**: give both buttons the same fixed width, the widest state measured in the running app
(about 99 px, "✓ Added"), and centre their content. Keep it in one constant in
`DocumentPickerItem.tsx`, or its `constants.ts`, as a static Tailwind class (for example `w-100` if
the measurement confirms 98.9 px). Apply it to the "+ Add" `kern-btn`, adding `!` if `kern.css` sets
the width, and to the inner span of "✓ Added" / "Remove" (with `justify-center`). This also ends the
hover flicker from B2's root cause.

The name column still fits. The row is 266 px (296 − 2 border − 16 padding − 12 row padding), so
266 − 40 tile − 2 × 8 gap − 99 leaves 111 px for the name. "Driving licence", the longest label,
measures 107 px. Today it already has the same 111 px in the "✓ Added" state.

**Alternative**: stack all three labels in one grid cell, with the hidden ones `invisible`, so the
button sizes itself to the widest label without a number. It handles future copy changes, but "+ Add"
is a different element (a KERN button) from "✓ Added" / "Remove". Sharing a width across them needs
the trick in both buttons, which makes more markup for two fixed English strings.

### B3 Fixed header, fixed footer, only the field cards scroll

**Preferred**: make the wizard an app shell, and give `AppLayout` a sticky header.

1. **`WizardLayout`**:
   - Make the frame exactly one viewport tall (`h-dvh flex flex-col`) instead of `min-h-screen`, so
     the window never scrolls. The header (`TopBar`) and the 80 px footer are rows that never move;
     the footer no longer needs `sticky`.
   - Split the area between them into a **head** (progress and page title), kept still from `lg` up,
     and a **body** that is the scroll container. Give the layout a slot for the head, or let the
     step pass it, since the page renders the progress and the step the title. Below `lg` the head
     and body scroll together, so that fixed chrome doesn't eat a phone's screen (64 + ~200 + 80 px).
   - Make the body full-width (the 1120 px column centred inside it), so its scrollbar sits at the
     window's right edge, where the page's scrollbar was. That keeps the card column at 800 px, so
     three fields per row still fit, and the wheel works anywhere over the body, including over the
     document list.
2. **`DocumentsStep`, from `lg` up**: make `DocumentPicker` `sticky` at the body's top padding, so it
   never moves while the field cards scroll past. Cap its height at the body's height and give it
   `overflow-y-auto`, for short windows with "Coming to the wallet" open. Step 1 (Connection) uses
   the same frame, with its header and footer fixed too.
3. **`AppLayout`** (the detail page after publishing, the overview, the loader): make the header
   `sticky top-0` with a `z-index` above the page's content (above the bubbles' `z-20`). Put that on
   the layout's own wrapper, not inside `TopBar`, so the signed-out screens (`AuthLayout`, which also
   uses `TopBar`) stay as they are. Add `scroll-padding-top` for the 64 px header (in `index.css`), so
   that keyboard focus and `focus()` never land under it (WCAG 2.4.11).
4. **Docs**: update `CLAUDE.md` ("header with a title, 1120 px column, sticky action bar"), and the
   design notes §3 and §6 with the 2026-10-12 decision (fixed header and footer; on "Add documents"
   only the field cards scroll).

**Alternatives**:

- **Card column as its own scroll container** (`overflow-y-auto` on the right column only). It's
  closer to the words of the report, but a classic scrollbar takes 15 px of the 800 px column and
  drops every card to two fields per row (790 px needed). The wheel over the document list scrolls
  nothing. It needs a negative-margin trick to move the scrollbar out of the column.
- **Page scroll with sticky header and docking list**: less code, but the title and the list move
  ~200 px before the list docks. The reporter ruled this out (answered 2026-10-12).

### B4 No serviceBW in the UI

**Preferred**:

1. Remove the line under "Result link": delete `resultLinkHint` from `constants.ts`, the `hint`
   prop from `ConnectionLinks.tsx:58`, and the then unused `hint` from `LinkCard.tsx` and
   `LinkCardProps` in `types.ts`.
2. Rephrase the two bubbles with the term the UI already uses for that system, "your form management
   system" (`EDITOR_COPY.formIdInfo`: "Copy the ID from your form management system."):
   - `requestLinkInfo`: "Your form management system calls this link to start a request. It answers
     with the wallet link, the QR code and a reference."
   - `resultLinkInfo`: "Your form management system calls this link with the request’s reference.
     It answers with the status and, once the applicant has shared it, the data."
3. Rephrase the two strings of the webhook card now, though nothing renders it yet, so that T091
   doesn't bring serviceBW back:
   - `webhookHint`: "Optional. With an address, your form management system gets every update of a
     request there, including the data, and the result link answers without data."
   - `modeHints.pull`: "Your form management system calls the result link."
4. Update `design-notes.md:326-328` with the decision of 2026-10-12: no hint line, and the bubbles
   name "your form management system". Keep the serviceBW references in code comments, specs and
   docs, which the reporter allows.

**Alternative wording**: "Your form calls this link…". It's shorter and matches the lead "Add both
links to your form", but it's less accurate: the form's system calls the link, not the form.

### Files likely to change

- `frontend/src/components/InfoToggletip/index.tsx`, `types.ts` (or renamed `InfoTooltip/`)
- `frontend/src/pages/FormConnectionEditor/ConnectionStep.tsx` (import, only if renamed)
- `frontend/src/components/TextField/index.tsx`, `types.ts` (comments, only if renamed)
- `frontend/src/pages/FormConnectionEditor/DocumentPickerItem.tsx` (and `constants.ts` for the width)
- `frontend/src/components/WizardLayout/index.tsx`, `types.ts`
- `frontend/src/pages/FormConnectionEditor/index.tsx`, `DocumentsStep.tsx`, `DocumentPicker.tsx`
- `frontend/src/components/AppLayout/index.tsx`
- `frontend/src/index.css` (`scroll-padding-top`)
- `frontend/src/pages/FormConnectionDetail/constants.ts`, `ConnectionLinks.tsx`, `LinkCard.tsx`,
  `types.ts`
- `CLAUDE.md`, `specs/001-servicebw-eudi-middleware/design-notes.md`

### Tests to add or update

The frontend has no test runner (`package.json` has no test script and no Vitest or Jest). Adding one
is out of scope for these fixes, so the checks are the build and lint scripts plus the browser
verification of `CLAUDE.md` ("Figma implementation workflow", step 4):

- `npm run lint`, `npm run format:check` and `npm run build` (`tsc -b`) pass. The backend is
  untouched, so `uv run pytest` isn't affected.
- **B1**: in the browser, hovering each of the four (i) opens the bubble, and leaving closes it.
  Moving from the (i) onto the bubble keeps it open; Escape closes it while hovered. Tab to an (i)
  opens it, Tab away closes it, and a mouse click doesn't pin it. In touch emulation a tap toggles it.
  The button's accessible description is the bubble's text (DevTools Accessibility pane).
- **B2**: `getBoundingClientRect().width` is equal for "+ Add", "✓ Added" and "Remove" (hover and
  keyboard focus), and equals the widest state. No flicker when the pointer enters from the left
  edge. Neither label wraps.
- **B3** at 1455 × 900 (1440 frame): after scrolling the field cards, the `getBoundingClientRect().top`
  of the header, progress, title, document list and footer is unchanged, and `window.scrollY` stays
  0. Each field card is still 790 px wide with three fields per row. The toast still sits 24 px above
  the bar. Validation focus ("Publish" with nothing selected) scrolls the target into view inside the
  body. At 1455 × 600 with "Coming to the wallet" open, the list scrolls itself. At 390 × 844 the
  header and bar are fixed, and the rest scrolls. On the detail page and the overview the header stays
  at top 0 while scrolling, and a focused "Copy link" is never under it.
- **B4**: on the detail page, after publishing and when opening it later, `document.body.innerText`
  contains no "serviceBW" (case-insensitive) with both bubbles open. The line under "Result link" is
  gone.

## Risks & Considerations

- **B3 is the largest change.** It changes the frame of every wizard step and the header of every
  signed-in screen. Check the first-connection route (`/get-started`), which renders the same wizard,
  and the catalog's loading, error and retry states, which render inside the body.
- **Card width (B3)**: any scroll container narrower than the window with a classic scrollbar costs
  15 px. The card column has only 10 px to spare (800 − 790), so the scrollbar must not sit inside
  it. Overlay scrollbars (macOS, mobile) hide this, so check on Linux Chromium as `CLAUDE.md` does.
- **Short windows (B3)**: a fixed head and footer leave little room on short desktop windows. The
  body must keep a sensible minimum height, and the picker must scroll itself rather than be cut off.
- **Stacking (B3/B1)**: the sticky `AppLayout` header needs a `z-index` above the bubbles (`z-20`).
  The `UserMenu` panel (`z-10`) lives inside the header, so it stays above the page. KERN's dialog
  sets `body { overflow: hidden }` while open, which has no effect on a frame that doesn't scroll the
  window.
- **Accessibility (B1)**: a hover-only bubble would fail WCAG 1.4.13 and lock keyboard and touch users
  out of the text. The proposal keeps keyboard focus, Escape and tap, which doesn't conflict with the
  report's mouse behaviour. Moving from a live region to `aria-describedby` changes how screen readers
  read the text: with the button, instead of as an announcement.
- **Design drift**: B2 and B3 depart from Figma on purpose, as the reporter acknowledges. Record them
  as decisions in `design-notes.md`, so a later visual check against Figma doesn't "fix" them back.
- **Copy (B4)**: the bubbles no longer say who calls the links. "Your form management system" keeps
  the meaning without naming a product. Check the wording with the reporter if the deployment calls
  that system something else.
- No API, migration, performance or security impact. B4 hides a name only in the UI; the API and the
  repository keep theirs, as the reporter allows.

## Open Questions

- [ASSUMED, not asked: keyboard focus and Escape keep working for the (i) bubbles, and a tap toggles
  them on touch screens, which have no hover. The report only describes the mouse.]
- [ASSUMED, not asked: "later screens" means every signed-in screen, so `AppLayout` gets the sticky
  header too, the overview included, since it shares the layout with the detail page. The signed-out
  screens are unchanged.]
- [ASSUMED, not asked: the two unused webhook strings are rephrased now too, so that the webhook card
  doesn't bring serviceBW back when T091 restores it.]
- [ASSUMED, not asked: "your form management system" replaces "serviceBW" in the bubbles, the term the
  editor's Form ID bubble already uses.]
