# Feature Specification: Download a connection's details as a PDF

**Feature Branch**: `pdf-summary` (the worktree's branch; feature directory
`specs/011-connection-pdf/`; no branch was created for this feature)

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Download a connection's details as a PDF (short name:
connection-pdf). Assume specs 008 (KERN revamp) and 009 (language toggle) are implemented. This
builds the 'Download PDF' that spec 008 deferred […]. Team members share a connection's PDF before
it goes live, so colleagues can check its documents, data items and rules per variant. They also
keep or hand over a published connection's PDF, with the links to add to serviceBW. A printout
must be traceable: every page says which connection and which version it shows, and anyone can
tell whether a copy is still current." (the full description, with its ten points and what is out
of scope, is the source of every requirement below)

## Context

Spec 008 ported the redesigned management UI and deferred the "Download PDF" button the design
draws on the details: `specs/008-kern-revamp-redesign/deferred.md`, group A, item Q37 (b). Figma
("Middleware – V5", file `s8mU9oJDq3411e8bxMjQO9`) draws it as a secondary button with a download
icon in the header of the details' Summary card (`6396:48196`, `6809:46423`), and on a draft's
details too (U93 #10). Its final frame (`7603:61494`, read 2026-11-18 for bug v5-ui-fixes (B3))
moves the button, with the version beside it, into a strip under the card's header row
(Clarifications, 2026-11-18). Spec 002's clarifications (2026-10-24) left the PDF export for a
spec of its own. This feature builds it.

It supersedes:

- **002-S6.9** as far as it leaves the PDF out of the details;
- **spec 008's F53** and the "offer no PDF" of its FR-048 and FR-049 (tasks T078 and T081:
  "no PDF").

Everything else of specs 008 and 009 is the baseline and is taken as complete: the details page
with its status band, its Links and Summary accordions, the draft's details, the website's two
languages and their glossary. Spec 010, implemented after this spec was first written, is part of
the baseline too: the scheduled state with its start date, the status dates, the activity, the
documents' order and the example (Clarifications, 2026-11-12).

A working prototype is kept in `prototype/`. It is a sketch, not the implementation: this spec
describes behaviour, not the prototype's code. Its two PDFs `published-ids-top.pdf` and
`draft-ids-top.pdf` (written by `node make.mjs` after `npm install` in that folder, and not
committed) are the **agreed layout and English wording**. The `*-bottom.pdf` files are the
rejected alternative, which put the identifiers at the bottom of the page and the location at the
top.

## Clarifications

### Session 2026-11-09

- Q: If the connection changed after the details page was opened (a colleague saved it, published
  the draft or deactivated it), what does the PDF show? → A: The connection as stored when
  "Download PDF" is activated; if that differs from what the page shows, the page shows it too, so
  that the page, the file, the "as of" status and the version agree (FR-005).
- Q: What does a draft's "To finish before publishing (n)" box list? → A: Everything publishing
  the draft would refuse, in the create flow's words, not only the incomplete rules the prototype
  lists (FR-010).
- Q: Where does the details page show the version, which no Figma frame draws? → A: In the
  Summary card's header, beside "Download PDF", visible whether the Summary is open or closed, on
  the published and the draft details (FR-032).

### Session 2026-11-12

Spec 010 was implemented after this spec was written; these answers align the two.

- Q: What does the PDF of a scheduled connection show (spec 010: published, not live until its
  start date)? → A: "Scheduled" with "as of <date and time of the download>" and its start date;
  its links are printed, with a sentence that they answer "unavailable" until the start date. The
  start date is not content: it never changes the version (FR-007, FR-012, FR-029).
- Q: Is the order of the requested documents (spec 010) content? → A: Yes. The PDF lists the
  documents in the team's order, as the Summary does, and the version is derived from that order,
  so a save that only reorders them changes the version although it creates no revision (FR-014,
  FR-029).
- Q: Does the example draft (spec 010) get a PDF? → A: Yes, as any stored draft, without a mark
  of its own; that a draft is the example never changes the version (FR-001, FR-029).

### Session 2026-11-18 (bug fixes)

Decided by Figma's final frame for the Summary card, which the reporter of
`.specify/bugs/v5-ui-fixes` calls final (B3; "Middleware – V5", `7603:61494`).

- Q: Where do the version and "Download PDF" sit, now that a frame draws the version? → A: In a
  strip of their own inside the Summary card, under its header row (the heading with its counts,
  and the toggle), open or closed, on the published and the draft details: the version at the
  strip's left, the button at its right. "Download PDF" is a compact secondary button, 32 px high,
  with the download glyph and a 14 px label. The version's code is semibold, no longer medium.
  This supersedes the 2026-11-09 answer's place in the header row: the version stays beside the
  button, open or closed, on both details, but in the strip under the row (FR-001, FR-032).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download a published connection's details (Priority: P1)

A team member of DO.IT opens the details of a published connection, scheduled, active or
deactivated, to hand it over to a colleague or to keep it. In the Summary card, under its header
row, they activate
"Download PDF". The button shows that the file is being made, and a moment later the browser
saves it as "<connection name>_<version>.pdf". The PDF holds everything a colleague needs to add
the connection to serviceBW and to understand it: page 1 with the name, description, status and a
box of details; then "1 Links for your service" with the request link and each variant's result
link; "2 Documents and data items"; and "3 Rules per variant", each variant's rules and groups as
the details' Summary shows them.

**Why this priority**: it is the feature. A published connection's PDF is what team members hand
over, and the draft's PDF (P2) differs from it only in what a draft lacks or adds.

**Independent Test**: can be fully tested by downloading the PDF of an active and of a
deactivated connection with several variants, among them one based on Standard with changed,
added and removed items, and comparing the file with the details page and with the agreed layout
`prototype/published-ids-top.pdf`.

**Acceptance Scenarios**:

1. **Given** the details of an active connection with three variants, **When** the team member
   activates "Download PDF", **Then** the button shows it is busy, a file named
   "<connection name>_<version>.pdf" is saved without any further step, and its page 1 reads
   "Connection details", the name, the description, "Active" with "as of <date of the download>",
   the details box and the note on checking that the copy is current.
2. **Given** that PDF, **When** the team member reads "1 Links for your service", **Then** it
   shows the request link and, labelled with each variant's name in the details' order, each
   variant's result link, every link printed in full, with what each link is for and what
   {reference} means.
3. **Given** a deactivated connection, **When** its PDF is downloaded, **Then** page 1 reads
   "Deactivated" with "as of <date of the download>", and the links section adds that the links
   answer "unavailable" until the connection is activated again.
4. **Given** a variant based on Standard in which a rule was changed, a group added and a rule
   removed, **When** the team member reads that variant in the PDF, **Then** the items carry
   "Changed here", "Added here" and "Removed here" in words, the removed rule is struck through and
   faded, and a black-and-white printout shows the same.
5. **Given** any page of the PDF, **When** it is read on its own, **Then** its top names the
   connection, its connection ID, the version and the date and time of the download, and its
   bottom says where the page is ("3 Rules per variant › Variant Taxi (continued)") and
   "Page n of N".
6. **Given** the network fails while the file is being made, **When** making it fails, **Then**
   the page says so, offers to try again and saves no file; trying again once the network is back
   saves the file.
7. **Given** a scheduled connection whose start date is 01.12.2026, **When** its PDF is
   downloaded, **Then** page 1 reads "Scheduled" with "as of <date of the download>" and "starts on
   01.12.2026", and the links section shows the links and adds that they answer "unavailable"
   until the connection starts on that day.

---

### User Story 2 - Share a draft for review before it goes live (Priority: P2)

A team member has stored a draft and wants colleagues to check its documents, data items and
rules before it is published. On the draft's details they activate "Download PDF" and get
"<connection name>_draft_<version>.pdf". The PDF reads "Connection details · Draft for review" and
"Draft · Not live yet", carries a faint diagonal "DRAFT" on every page, and shows no URL anywhere:
where the links would be, it says they are created when the connection is published and active,
and which links publishing will create. When the draft still has gaps, a box on page 1 lists what
must be finished before publishing, and every incomplete rule reads as far as it goes and says
what is missing.

**Why this priority**: reviewing before going live is the first reason the team asked for the
PDF, but it reuses everything of P1 and adds the draft's differences.

**Independent Test**: can be fully tested by downloading the PDF of a stored draft with an
incomplete rule (no check chosen), a rule without a message for citizens and several variants,
and comparing it with the draft's details and with the agreed layout
`prototype/draft-ids-top.pdf`.

**Acceptance Scenarios**:

1. **Given** the details of a stored draft, **When** the team member activates "Download PDF",
   **Then** a file named "<connection name>_draft_<version>.pdf" is saved, every page carries
   "Draft · Not live" at the top and the faint diagonal "DRAFT", and no page contains a URL.
2. **Given** that PDF, **When** the team member reads page 1, **Then** it shows "Connection details
   · Draft for review", "Draft · Not live yet", and in the details box the connection ID, the
   version, "Last saved" with the date and time of the draft's last save and its save number
   ("draft save 7"), the date and time of the download and the counts.
3. **Given** a draft with two incomplete rules, **When** its PDF is made, **Then** page 1 shows
   "To finish before publishing (2)" listing both gaps in the create flow's words, and in
   "3 Rules per variant" each of the two rules reads as far as it goes, followed by "Not complete:
   Choose a check." or "Not complete: Write the message for citizens.".
4. **Given** a draft without gaps, **When** its PDF is made, **Then** no "To finish before
   publishing" box appears.
5. **Given** a draft with the variants Standard, Taxi and Hire car, **When** the team member reads
   "1 Links for your service", **Then** it reads "Created when the connection is published and
   active." and that publishing will create one request link for all variants and a result link
   for each variant: Standard, Taxi and Hire car.

---

### User Story 3 - Tell whether a printout is current (Priority: P2)

A colleague holds a printout, or a single page of it, and wants to know whether it still shows
the connection as it is. Every page names the connection, its connection ID and its version, a
short code of twelve characters such as "62D0-715F-01D1". The connection's details page shows the
current version. If the two are the same, the printout shows the current content; if they
differ, the printout is out of date. A draft's review PDF stays valid after publishing: a draft
published unchanged keeps the version its review PDF showed, so the team can check that what went
live is what was reviewed.

**Why this priority**: traceability is half of why the PDF exists. It needs the PDF of P1 or P2
to be useful, and it can be tested on its own once one of them exists.

**Independent Test**: can be fully tested by downloading a connection's PDF, comparing the
version with the details page, then changing one thing at a time (a name, a description, a data
item, the documents' order, a rule's value, a message, a variant's AND/OR, a mark) and checking
that the version changes, and changing nothing that is content (status, start date, language, a
re-save without changes, the time) and checking that it does not.

**Acceptance Scenarios**:

1. **Given** a PDF downloaded a week ago and a connection unchanged since, **When** a colleague
   compares the PDF's version with the one on the details page, **Then** they are the same.
2. **Given** a connection whose rule's message was edited after the PDF was downloaded, **When**
   the colleague compares, **Then** the versions differ.
3. **Given** a connection that was deactivated and activated again, **When** its PDF is
   downloaded again, **Then** the version is the one it had before.
4. **Given** the same connection downloaded once in English and once in German, **When** the two
   files are compared, **Then** they show the same version.
5. **Given** a draft whose review PDF shows version "1A79-536D-D067", **When** it is published
   without any change, **Then** the published connection's details and its PDF show
   "1A79-536D-D067".
6. **Given** a PDF, **When** the team member looks at its file name and its document properties,
   **Then** both contain the version.

---

### User Story 4 - Read the PDF in one's language and with assistive technology (Priority: P3)

A team member who chose German on the website gets the PDF in German: its headings, labels and
notes, the rule statements, the documents' and data items' names, the AND/OR wording, the marks
and the placeholders. What team members entered (names, descriptions, messages for citizens)
stays as entered. A team member who uses a screen reader opens the PDF and hears its title,
headings, lists and the details box as a table, in reading order, without the repeated top and
bottom of each page and without the watermark.

**Why this priority**: the PDF is usable without it in the language most team members use, but
the website speaks two languages (spec 009) and the product's accessibility bar applies to what
it hands out.

**Independent Test**: can be fully tested by downloading the same connection in English and in
German and checking every text that is not content, and by checking the PDF with a PDF/UA-1
validator and a screen reader.

**Acceptance Scenarios**:

1. **Given** the website in German, **When** the team member downloads a connection's PDF,
   **Then** every text of the PDF that is not content is German, using spec 009's glossary, and
   the rule statements read as the Summary reads them in German.
2. **Given** the website in English, **When** a date is shown in the PDF, **Then** it reads
   "09.11.2026, 16:45", in Germany's time, as it does in German.
3. **Given** a screen reader, **When** the PDF is opened, **Then** it announces the document's
   title and language, moves by headings through the sections, variants, documents, rules and
   groups, reads the details box as a table and the data items as lists, and does not read the
   top and bottom of each page or the watermark.

---

### Edge Cases

- **The connection changed since the page was opened** (another team member saved it, published
  the draft, deactivated it or changed its start date, or it went live on its start date): the
  PDF shows the connection as stored when "Download PDF" was
  activated, and the page updates to show the same: the new content and version, the new
  status, or, for a draft published meanwhile, the published connection's details (FR-005). The
  file is then named and made as for what is stored now.
- **The connection was deleted** since the page was opened: no file is saved, and the page says
  so as the details do when a connection no longer exists.
- **The language is switched while the file is being made**: the file is in the language chosen
  when "Download PDF" was activated.
- **The team member leaves the page while the file is being made**: making it stops, and no file
  is saved afterwards.
- **A second activation while busy** starts nothing: one file per activation.
- **A name with characters a file name can't hold** (such as `/`, `\`, `:`, `*`, `?`, `"`, `<`,
  `>`, `|`): those characters are replaced in the file name only, and the PDF shows the name as
  entered. A name too long for a file name is shortened in the file name; the version and ".pdf"
  are never cut.
- **A name too long for one line at the top of a page** is cut with "…" there; page 1's title,
  the document's title and the file name show it in full (the file name as far as allowed).
- **Empty parts**: no description (the connection's or a variant's) leaves the line out; a draft
  without documents, a document without data items and a variant without rules show the Summary's
  placeholders ("No documents yet"; "No rules. Anyone who shares the requested documents can
  apply."); a rule or group without a name or message reads as the Summary shows it.
- **A document or data item the catalog no longer has** is shown as the Summary shows it (by its
  key).
- **A based variant that switched its top-level AND/OR** shows the switched AND/OR with "Changed
  here"; a group removed in a based variant is struck through and faded with its members.
- **A rule taller than a page** (a value list of every country, a very long message) is the one
  block that may continue on the next page, between lines, because it cannot fit on any page.
- **A group taller than a page** splits between its members; its header stays with its first
  member, its own message stays with its last member, and the next page says "(continued)".
- **Twenty variants**: their result links may not fit on one page; they then split between two
  links, never inside one, and the next page says "(continued)".
- **Two files with the same version can differ in wording**: in the language, in the catalog's
  labels if the catalog renamed a document or data item, and in the date of the download. They
  never differ in content.
- **A connection edited and then edited back** to the same content shows the same version again.
  A version is a fingerprint, not a counter: it tells whether two copies match, not which is
  newer; the details page is the reference.
- **Copying a link from the PDF**: every link is printed in full, without added hyphens, and
  breaks only after a "/" (a part between two "/" wider than a line, which today's links don't
  have, breaks at the line's end). Some PDF readers put a line break into copied text that spans
  lines; the details page's copy buttons stay the exact source of the links.
- **Characters KERN's typeface doesn't have** (Chinese, Japanese or Korean script, emoji) in a
  name, description or message: the PDF is still made, and shows the typeface's box for a missing
  character in their place; the file name keeps them. Such a file is outside FR-040's target and
  FR-045's limits. DO.IT's names and messages are German or European, which the typeface covers.
- **Printing in black and white**: statuses, marks, AND/OR and removed items stay readable,
  because none of them is shown by colour alone.
- **Midnight and daylight saving time**: the date and time of the download and of the draft's
  last save are Germany's (CET or CEST), whatever the team member's computer is set to.
- **A narrow screen** (320 px at 200 % zoom): the button and the version follow spec 008's narrow
  rules in the strip under the Summary card's header row, wrap rather than overlap (the button
  under the version), and the button stays usable.

## Requirements *(mandatory)*

### Functional Requirements

**Downloading**

- **FR-001**: The details of a published connection (scheduled, active or deactivated) and the
  details of a stored draft, the example draft included, MUST offer "Download PDF" as a compact
  secondary button with a download icon in the Summary card, in a strip under its header row, as
  Figma's final frame draws it (`7603:61494`; Clarifications 2026-11-18; first drawn in the
  header row, `6396:48196`, `6809:46423`; the draft's details U93 #10), whether the Summary is
  open or closed. Every signed-in team member who can open the details MUST be able to use it.
- **FR-002**: One activation MUST make the file and save it, with no further step: no dialog, no
  preview, no choice of options.
- **FR-003**: While the file is being made, the button MUST show that it is busy, to sight and to
  assistive technology, and MUST NOT start a second file; the rest of the page MUST keep
  responding.
- **FR-004**: When the file can't be made, the page MUST say so with the details' error notice
  (with its error id when the server gave one), MUST offer to try again, and MUST NOT save a file,
  complete or partial.
- **FR-005**: The PDF MUST describe the connection as it is stored at the moment "Download PDF" is
  activated. When that differs from what the page shows (its content, its status or start date,
  or a draft published meanwhile), the page MUST show the stored state too, so that the page, the
  file, the "as of" status and the version agree.
- **FR-006**: "Download PDF" MUST NOT be offered for local drafts, in the create and edit flow or
  on the approval page.

**Page 1**

- **FR-007**: Page 1 MUST show, in this order: "Connection details" (a draft's: "Connection
  details · Draft for review"); the connection's name as the document's main heading; its
  description when it has one; and its status: "Active" or "Deactivated" with "as of <date and
  time of the download>"; "Scheduled" with "as of <date and time of the download>" and its start
  date ("starts on 01.12.2026"); or for a draft "Draft" with "Not live yet".
- **FR-008**: Below the status, a details box MUST show: the connection ID; the version; for a
  draft, "Last saved" with the date and time of its last save and its save number ("draft save
  7"); the date and time of the download, marked as Germany's time; and the contents, counted as
  the Summary counts them ("2 documents · 12 data items · 3 variants · 12 rules": Standard counts
  as a variant, every distinct rule counts once, groups don't count; spec 002's clarification of
  2026-10-25).
- **FR-009**: Below the box, a short note MUST say how to check that the copy is current: every
  page names the connection and this version, and the details page shows the current one; if
  they differ, the copy is out of date. A draft's note MUST add that it isn't live, that its links
  are created when it is published, and that published unchanged it keeps this version.
- **FR-010**: When a draft has gaps, page 1 MUST show a box "To finish before publishing (n)"
  listing everything in the draft's content that publishing would refuse (spec 005, FR-004 and
  FR-009), among them
  incomplete rules, rules without a message for citizens, no documents, a document without data
  items, rules on data that isn't requested, and missing or duplicate names, each in the create
  flow's words and naming its rule and variant where it belongs to one, with a sentence saying
  the draft can be reviewed as it is but published only once they are finished. Without gaps, the
  box MUST NOT appear. The box MUST NOT contain the rule checks' findings. Publishing's two
  checks that aren't about content a team member can finish (the rules' identifiers against the
  draft's counters, and a variant's id that is already in use) are not gaps.

**1 Links for your service**

- **FR-011**: For a published connection, the section MUST show the request link, with what it is
  for and that there is one for all variants, then the result links, one per variant, each
  labelled "Variant · <name>" in the details' order (Standard first), with what they are for and
  that the service replaces {reference} with the reference the request link returned. Every link
  MUST be printed in full, without added hyphens, breaking only after a "/"; only a part
  between two "/" that is wider than a line on its own MAY break at the line's end.
- **FR-012**: For a deactivated connection, the section MUST add that its links answer
  "unavailable" until the connection is activated again. For a scheduled connection, it MUST add
  that its links can already be added to the service and answer "unavailable" until the
  connection starts on its start date.
- **FR-013**: For a draft, the PDF MUST NOT contain any URL of the connection, anywhere (spec 005,
  FR-006). The section MUST instead read "Created when the connection is published and active."
  and name the links publishing will create: one request link for all variants and a result link
  for each variant, by the variants' names.

**2 Documents and data items**

- **FR-014**: The section MUST list each requested document in the Summary's order (the order
  the team gave the documents, spec 010) with the
  number of its data items and their names, as the Summary names them. A draft without documents
  and a document without data items MUST show the Summary's placeholders ("No documents yet").

**3 Rules per variant**

- **FR-015**: The section MUST show each variant in the details' order, with: its name; what kind
  of variant it is ("Main variant", "Based on Standard", "Own rules"); its description when it has
  one; and its top-level AND/OR in words ("All rules must be met (AND)", "At least one rule must
  be met (OR)"), with "Changed here" when a based variant switched it.
- **FR-016**: Under each variant, the PDF MUST show its rules and groups in the Summary's order
  and nesting, as the details' Summary shows them: for each rule its identifier ("rule-7"), its
  name, its statement and "Message for citizens: <message>"; between items the AND or OR; for
  each group and sub-group its identifier ("group-2"), its name, its AND/OR in words, its members
  and its own message when it has one.
- **FR-017**: In a variant based on Standard, the PDF MUST mark items with "Changed here", "Added
  here" and "Removed here" in words. Removed items MUST be struck through and faded, and MUST
  NOT be told apart by colour alone.
- **FR-018**: An incomplete rule of a draft MUST read as far as it goes and then say what is
  missing, in the create flow's words ("Not complete: Choose a check.", "Not complete: Write the
  message for citizens.").
- **FR-019**: A variant without rules MUST show the Summary's placeholder ("No rules. Anyone who
  shares the requested documents can apply."), and a rule or group without a name or message
  MUST read as the Summary shows it.

**Every page**

- **FR-020**: The top of every page MUST show the connection's name (cut with "…" when it doesn't
  fit on one line), its connection ID, "Version <version>", "Generated <date and time of the
  download>" and, for a draft, "Draft · Not live".
- **FR-021**: The bottom of every page MUST show "Page n of N" and, from page 2 on, where the
  page's content begins: the section ("2 Documents and data items"), in section 3 the variant
  ("3 Rules per variant › Variant Taxi"), and "(continued)" when the page continues a section,
  variant or group begun on an earlier page.
- **FR-022**: Every page of a draft's PDF MUST carry a faint diagonal "DRAFT" behind the content,
  which neither hides nor weakens the content's legibility, on screen or printed: text over the
  watermark MUST still meet FR-039's contrast.

**Page breaks**

- **FR-023**: The PDF MUST NOT split a rule, a group's header (it stays with its first member), a
  link with its label, or a document with its list of data items. A group's own message MUST stay
  with its last member, and the AND or OR between two items MUST stay with the item that follows.
- **FR-024**: A heading MUST NOT be the last thing on a page.
- **FR-025**: A variant or group that fits on one page but not on what is left of the current one
  MUST start on a new page. A longer one MUST split between its items, and the next page MUST say
  "(continued)" (FR-021).
- **FR-026**: The links of section 1 MUST stay on one page when they fit on one page.
- **FR-027**: A single rule taller than a page is the only block that MAY continue on the next
  page, between its lines.

**The version**

- **FR-028**: The version MUST be twelve characters, digits 0–9 and letters A–F, in three groups
  of four separated by hyphens ("62D0-715F-01D1").
- **FR-029**: The version MUST be derived from the connection's content: its connection ID, name
  and description; its requested documents, in the order the team gave them, and their data
  items; each variant's identity, name,
  description, kind and top-level AND/OR with its mark; and each variant's rules and groups with
  their identifiers, names, conditions, messages, order, nesting and marks. It MUST NOT depend on
  the status, a scheduled connection's start date, the language, the wording of labels or
  statements, the URLs, the draft's save number, whether the draft is the example, the date or
  time, or who downloads the file.
- **FR-030**: The same content MUST give the same version, on any computer, in either language
  and at any time; any change of content MUST give a different version, with a chance that two
  different contents share a version too small to matter in practice (twelve hexadecimal
  characters: about 1 in 2.8 × 10¹⁴ for any two contents).
- **FR-031**: A draft published without changes MUST keep the version its review PDF showed.
- **FR-032**: The details page of a published connection and of a stored draft MUST show the
  current version, labelled "Version" and written as in the PDF ("Version 62D0-715F-01D1"), in
  the Summary card, in the strip under its header row, beside "Download PDF" (Clarifications
  2026-11-18), whether the Summary is open or closed, so that a reader can compare it with a
  printout without opening anything.
- **FR-033**: The version MUST also be in the file's document properties and in its file name
  (FR-044).

**Language and dates**

- **FR-034**: The PDF MUST be in the website's language at the moment "Download PDF" is
  activated (spec 009): every text of its own, the rule statements, the documents' and data
  items' names, the AND/OR wording, the marks, the placeholders, the gaps and "Not complete" texts,
  and "Page n of N", using spec 009's glossary. Content (names, descriptions, messages for
  citizens, values typed as text) MUST stay as entered, and the version MUST be the same in both
  languages.
- **FR-035**: Every date and time in the PDF MUST read "dd.mm.yyyy, hh:mm" on a 24-hour clock
  ("09.11.2026, 16:45"), in Germany's time, in both languages. A scheduled connection's start
  date is a day in Germany and MUST read "dd.mm.yyyy" ("01.12.2026").

**Accessibility**

- **FR-036**: The PDF MUST be tagged: a document title that PDF readers show instead of the file
  name, the document's language, headings in a logical order (the name, the sections, the
  variants and documents, the rules and groups), lists (data items, gaps, the links to be created),
  the details box as a table with row headers, and selectable, searchable text in reading order,
  with every character's font embedded.
- **FR-037**: Decorations, the repeated top and bottom of each page and the watermark MUST be
  marked as not part of the content, so that assistive technology does not read them.
- **FR-038**: The PDF's outline (bookmarks) MUST list the sections and, under section 3, the
  variants, so that a reader can jump to them.
- **FR-039**: Text MUST keep a contrast of at least 4.5:1 against its background, faded removed
  items included; the watermark is a decoration and exempt.
- **FR-040**: The PDF MUST target PDF/UA-1 (ISO 14289-1).

**Privacy**

- **FR-041**: The PDF MUST NOT contain the rule checks' findings, test personas or any citizen's
  data.
- **FR-042**: Nothing about a PDF MUST be stored on the server, sent anywhere or logged: no copy
  of the file, no record of who downloaded what, no event for analytics. Loading the website's
  own static files that make the PDF (its code and typeface, the same for every connection and
  every team member) is not such a record.

**File**

- **FR-043**: The file MUST be A4 portrait, in KERN's typeface, and printable on common office
  printers without cutting content: apart from the watermark, nothing is drawn within 5 mm of
  the paper's edges.
- **FR-044**: The file MUST be named "<connection name>_<version>.pdf", and for a draft
  "<connection name>_draft_<version>.pdf", with the replacements and shortening the edge cases
  describe.

**Limits**

- **FR-045**: The PDF MUST be made correctly up to the product's limits: 20 variants and 200
  rules, groups and sub-groups per variant, removed ones included (spec 002), with the longest
  names, descriptions, messages and value lists that saving allows.

### Key Entities

- **Connection PDF**: a file describing one connection or stored draft at one moment, in one
  language: page 1, the three sections, the top and bottom of every page and, for a draft, the
  watermark. Made on request, never stored by the product.
- **Version**: the connection's content fingerprint, twelve characters in three groups. Equal
  content, equal version. Distinct from the draft's save number (which counts saves) and from the
  rule set's internal number (which counts published rule sets); neither is shown as a "version".
- **Gap**: something a draft must finish before it can be published, in the create flow's words,
  belonging to a rule (and its variant) or to the draft as a whole.
- **Page location**: what the bottom of a page names: the section, in section 3 the variant, and
  whether the page continues it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A team member gets a connection's PDF from its details in one activation. A
  connection the size of the prototype's sample (2 documents, 3 variants, 12 rules) is saved
  within 3 seconds; a connection at the limits (20 variants of 200 items) within 60 seconds, with
  the page responding throughout.
- **SC-002**: For the test connections (active, deactivated, scheduled, a draft with gaps, a
  draft without,
  a connection at the limits), 100 % of the documents, data items, variants, rules, groups,
  identifiers, marks, messages and (published only) links that the details page shows appear in
  the PDF, in the same order and nesting, and the PDF contains no finding, persona or URL of a
  draft.
- **SC-003**: On 100 % of the pages of every test PDF, the top names the connection, its
  connection ID, the version and the date of the download, and the bottom names the page's place
  and "Page n of N": a reader holding a single page can tell which connection and version it
  shows.
- **SC-004**: In 100 % of the tested cases, the version stays the same when nothing of the
  content changes (a second download, the other language, another computer, deactivating and
  activating, scheduling and changing the start date, a save without changes, publishing a draft
  unchanged) and changes when any one
  element of the content changes (each kind of element of FR-029 tested once).
- **SC-005**: No test PDF splits a rule, a group's header, a link or a document's data items
  (apart from a rule taller than a page), ends a page with a heading, or continues a variant or
  group on a new page without saying "(continued)".
- **SC-006**: A PDF/UA-1 validator reports no failure of its machine-checkable requirements for
  the test PDFs in both languages, and a screen reader walk of one of them reads title, headings,
  lists and the details box as a table in order, and nothing of the page tops, bottoms or the
  watermark.
- **SC-007**: A colleague who has never opened the website can, from a draft's PDF alone, say for
  each variant which documents and data items are asked for, which rules apply, what a citizen is
  told when one isn't met, and what is left to finish; tested with the team on a sample draft.
- **SC-008**: Downloading every kind of PDF leaves no new stored record, no request that names
  or carries a connection other than those the details page makes anyway, and no log line of the
  application about the PDF, checked in the server's logs, the database and the browser's list
  of requests. The only other requests are for the website's static files that make the PDF
  (FR-042), on the first download after the page was loaded.

## Assumptions

- **Specs 008, 009 and 010 are complete**: the details page, its Summary card and its accordions
  are as spec 008 built them and spec 010 extended them (the scheduled state and its start date,
  the status dates, the activity card, the documents' order, the example), and the website speaks
  English and German with spec 009's glossary.
  The German copy of the PDF is written in this feature with that glossary and reviewed by the
  team, as spec 009 does for the website.
- **The agreed layout and English wording** are those of `prototype/published-ids-top.pdf` and
  `prototype/draft-ids-top.pdf`. Where this spec and the prototype differ, this spec wins.
- **The example draft** (spec 010) is a stored draft like any other: it gets the draft's PDF,
  which doesn't say that it is the example.
- **The PDF is a snapshot**: it shows one moment and is never updated; the product keeps no
  history of versions.
- **Who can download**: every signed-in team member who can open the details; no new permission.
  Agents get no PDF (no MCP tool); they see the connection's version where they read a
  connection, so that an agent and a printout can be compared too.
- **The statements, placeholders and "Not complete" texts are the Summary's and the create
  flow's**, in the chosen language, so that the PDF and the screen never word the same rule
  differently.
- **Links are text**, not clickable links: opening a connection URL in a browser is no use to a
  reader, and the request link's address is restricted to the network anyway.
- **"Generated" is the date and time of the download**; who downloaded it is not shown.
- **The details page's other parts don't change**: the version is added to it (FR-032), nothing
  else.

## Out of Scope

- Local drafts: they live in one browser, so nobody can compare a printout against them.
- A PDF from the create and edit flow or from the approval page.
- An MCP tool for the PDF.
- The activity log, the status dates ("Active since", "Deactivated since") and "Generated by". A
  scheduled connection's start date is shown (FR-007).
- The rule checks' findings, test personas and anything a citizen shared.
- Other file formats.
