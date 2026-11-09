# Feature Specification: English–German language toggle for the whole website

**Feature Branch**: `009-language-toggle` (feature directory `specs/009-language-toggle/`; no git
branch was created, the worktree's repository is not reachable from this machine)

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "We need a english-german language toggle switch to change the
language in the whole website. Assume specs 008 are complete. We don't have figma frames nor copy
text for german, we will not have them. We only have the figma frame for the language switch
button"

## Context

The management UI speaks one language, English: spec 001's accessibility contract fixes "one
English UI" (001-S7.9), and spec 008, which ported the redesigned UI, found a "DE / EN" switch in
the header of every redesigned frame and deferred it as item F6 ("No switch: one English UI",
`specs/008-kern-revamp-redesign/deferred.md`, group C), because it needs the server's, the rules'
and the findings' copy in a second language. This feature builds that switch and the German
language behind it. It supersedes 001-S7.9's "one English UI" and spec 008's F6 decision; spec
008's screens, header and behaviour are otherwise the baseline and are taken as complete.

What exists and what does not:

- **The design of the switch exists**: the Figma frame of the language switch button, and the
  header frames of spec 008 that place the "DE / EN" pill in the header (Figma "Middleware – V5",
  file `s8mU9oJDq3411e8bxMjQO9`, for example `6699:44242`, `6699:45201`, `6699:45323`,
  `6701:39367`, `6731:39823`). The user shares the frame's URL when planning starts.
- **No German frames exist and none will come**: the German screens keep the English frames'
  layout, with German text in it.
- **No German copy exists and none will come**: the German texts are written as part of this
  feature, from the English copy, and reviewed by the team in the running app.

The website's texts come from four places, and all four show on the screens:

| Where the text comes from | Examples |
|---|---|
| The website's own copy | headings, labels, buttons, menus, tooltips, empty states, dialogs, toasts, page titles, screen-reader-only texts, the design system's built-in texts ("Loading…", "Optional", "Close") |
| The server | error messages and validation messages shown as notices, the catalog's document and field labels ("Driving licence", "Personal ID", "Date of birth"), the option sets' labels (countries, sex, licence classes, eye colours) |
| The rules logic | the sentence of a rule ("Nationality includes one of Germany"), the citizen message the rule editor proposes ("You need to be at least 21 years old."), the findings of the rule checks, the test personas' texts and outcomes |
| The team members and their agents | connection names and descriptions, variant names, rule values typed as text, the citizen messages they saved, usernames, agents' names and requests |

The first three are the website's copy and follow the language. The fourth is content and never
changes with the language.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch the language from any screen (Priority: P1)

A team member of DO.IT opens the website, in whichever language it is in, and wants it in the
other one. In the header of every screen, next to the pills that are there today, sits the
language switch the design draws, showing "DE" and "EN". One activation switches the whole screen
to the other language, at once, without reloading, without leaving the screen and without losing
anything typed, selected or opened. This works signed out (sign in, forgot password), signed in
(overview, welcome page, the create and edit wizard with all of its steps and the rule editor, the
details, the account page) and on the pages agents' links open (the consent page, an approval
request), as well as on the not-found page.

**Why this priority**: it is the feature. Without the switch and a complete German UI nothing else
in this spec has value.

**Independent Test**: can be fully tested by opening every screen and every state of the baseline
(spec 008's visual verification tables), activating the switch and checking that no text of the
website remains in the previous language, that the screen is otherwise unchanged, and that
unsaved input, the wizard step, an open dialog or menu and the scroll position survive the switch.

**Acceptance Scenarios**:

1. **Given** the overview in English, **When** the team member activates the switch, **Then** every
   text of the overview is German, the connections' names and descriptions are as they were, the
   switch now offers English, and the page did not reload.
2. **Given** the rules step of the wizard, with a half-filled rule in the open rule editor and a
   finding shown under a group, **When** the team member switches to German, **Then** the editor
   stays open with the typed values, the rule's sentence, the proposed citizen message, the
   finding's text, the step's heading and the buttons are German, and nothing was saved or sent.
3. **Given** the sign-in page, signed out, **When** the team member switches to German, **Then** the
   sign-in page, its validation messages and the forgot-password page are German, and after signing
   in the website is still German.
4. **Given** an error notice from the server on the details page (for example, after a failed
   deactivation), **When** the team member repeats the action with German chosen, **Then** the
   notice's message is German and its error id, if any, is shown as before.
5. **Given** a screen in German, **When** the team member switches back to English, **Then** every
   text is the copy spec 008 ported, word for word.

---

### User Story 2 - The choice is remembered (Priority: P2)

Once a team member has chosen a language, the website keeps it: on the next visit, in a new tab,
after signing out and in again, and when a colleague's link opens a screen. A team member who has
never chosen gets a sensible first language.

**Why this priority**: a switch that forgets its state is used on every visit and soon ignored.
The default decides what most team members see first.

**Independent Test**: can be fully tested by choosing a language, closing the browser, returning,
opening a second tab, signing out and in, and opening a connection's link from an agent's
approval request: the chosen language is shown each time. A fresh browser shows the first-visit
language.

**Acceptance Scenarios**:

1. **Given** German was chosen, **When** the team member closes the browser and returns a day
   later, **Then** the website opens in German.
2. **Given** German was chosen in one tab, **When** the team member opens the website in another
   tab, **Then** that tab is German too.
3. **Given** German was chosen, **When** the team member signs out and signs in again, **Then** the
   website stays German.
4. **Given** a browser that has never chosen, **When** the website opens, **Then** it is in the
   first-visit language defined by FR-008.
5. **Given** a colleague who uses English sends a link to a connection, **When** a team member who
   chose German opens it, **Then** the connection is shown in German: links carry no language.

---

### User Story 3 - Copy from the server and the rules follows the language (Priority: P3)

The texts that the website does not hold itself, but gets from the server or composes from parts,
read as proper German when German is chosen: the documents and fields in the documents step, the
countries and other option values in the rule editor, the sentence of every rule, the citizen
message the editor proposes, the findings of the rule checks, the test personas' names of outcomes
and messages, the dates and relative times, and the server's error and validation messages. The
sentences the website composes read as grammatical German sentences, not as English sentences with
German words.

**Why this priority**: without it the German UI is a patchwork, but the switch itself and the
website's own copy (P1) already carry value while this part is completed per source.

**Independent Test**: can be fully tested by walking the documents step, the rules step with the
rule editor and its findings, the test step with personas, the details' summary and every server
error and validation message in German, and checking each text against the glossary and for
grammar.

**Acceptance Scenarios**:

1. **Given** German is chosen, **When** the documents step lists the catalog, **Then** every
   document type, field and group reads in German, and their order and icons are unchanged.
2. **Given** German is chosen and a rule "Nationality includes one of Germany, Austria", **When**
   it is shown in the rules step, the details and the publish dialog, **Then** its sentence is a
   correct German sentence with German country names, and the saved rule is unchanged.
3. **Given** German is chosen, **When** a condition is completed in the rule editor, **Then** the
   proposed citizen message is German; a citizen message a team member saved earlier, in whichever
   language, is shown as saved.
4. **Given** German is chosen and the rule checks find a contradiction, **When** the finding is
   shown, **Then** its text is German and names the same rules and variants as in English.
5. **Given** German is chosen, **When** a date, a time or a "last edited" relative time is shown,
   **Then** it follows German conventions, except where spec 008 fixed a format (the test step's
   dd.mm.yyyy), which stays in both languages.
6. **Given** German is chosen, **When** the server rejects a request (a validation error, a
   conflict, a `5xx`), **Then** the notice's message is German, with the error id when there is
   one, and the server still says nothing about what went wrong internally.

---

### Edge Cases

- **Content is never translated**: a connection named "Parking permit", a variant named "Students",
  a rule value typed as text, a saved citizen message, a username and an agent's request stay as
  entered in both languages. The main variant's name "Standard" is the same word in both.
- **A notice from the server that is already on the screen** when the language is switched keeps
  its text until the next action replaces or dismisses it; everything the website renders itself
  switches at once.
- **A request in flight** during the switch is neither repeated nor cancelled; its result shows in
  the language chosen when it arrives, as far as it is the website's own copy.
- **Longer German text**: German runs about a third longer. Every screen still works at a width of
  320 px and at 200 % zoom, nothing overlaps or clips, and texts that spec 008 cuts with "…" (the
  connection's name in the header, the description in a row) are cut the same way.
- **The browser's language is a German variant** (Austria, Switzerland, Liechtenstein): it counts
  as German for the first-visit language. Any other language counts as English.
- **The browser blocks remembering** (private mode, cleared site data): the choice lasts for the
  visit, and the first-visit rule applies next time; nothing breaks.
- **Screen readers**: the page declares its language, so a screen reader switches its voice with
  the UI; the switch names the language it switches to in that language ("Deutsch", "English").
- **Pages that are not the app's own**: the integration answers to serviceBW, the requests sent to
  EUDIPLO and what the wallet shows, and the MCP server's tools and skills for agents stay as they
  are, whatever language a team member chose.
- **A screen with no frame below the medium width** follows spec 008's rule for the header (W2):
  the switch keeps its place and the pills take rows of their own.
- **A language the website doesn't have** (a third language requested by the browser or in a
  remembered choice from an older version) is treated as no choice.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The header of every screen (the signed-out screens, every signed-in screen, the
  wizard and its steps, the details, the account page, the consent page, the approval page and the
  not-found page) MUST show the language switch as the Figma frame draws it, labelled "DE" and
  "EN", with the current language marked, in the place the header frames of spec 008 give it.
- **FR-002**: The website MUST offer exactly two languages, English and German.
- **FR-003**: Activating the switch MUST change the language of everything on the screen at once,
  without a reload, without leaving the screen and without losing unsaved input, the wizard's step,
  an open dialog, menu or editor, a selection or the scroll position; it MUST NOT save or send
  anything the team member had not asked to save or send.
- **FR-004**: Every text the website shows MUST exist in both languages: headings, labels,
  buttons, menus, tooltips, placeholders, help texts, empty and loading states, error notices,
  toasts, dialogs, validation messages, status messages for screen readers, screen-reader-only
  texts, page (tab) titles, the not-found page and the switch itself.
- **FR-005**: The copy that comes from the server MUST follow the chosen language: the error and
  validation messages shown as notices (keeping the error id), the catalog's document and field
  labels and groups, and the option sets' labels. The documents' and fields' order, keys and icons
  MUST NOT change with the language.
- **FR-006**: The copy the rules logic composes MUST follow the chosen language: the sentence of a
  rule and of a group, the citizen message the rule editor proposes, the findings' texts, the test
  personas' texts and outcomes, and the announcements of their checks. Composed sentences MUST read
  as grammatical sentences in each language, with the language's own word order and inflection,
  and MUST name the same rules, fields, values and variants as the other language.
- **FR-007**: Content entered by team members or their agents MUST be shown as entered in both
  languages: connection names and descriptions, variant names, rule values typed as text, saved
  citizen messages, usernames, agents' names and requests. Identifiers MUST be shown unchanged:
  URLs, references, keys, error ids, the product name.
- **FR-008**: On a browser that has never chosen a language, the website MUST open in German when
  the browser prefers German (any German variant counts) and in English otherwise; the switch
  then works as on any other visit, and the first explicit choice replaces this rule for that
  browser.
- **FR-009**: The website MUST remember the choice in the browser so that it holds across visits,
  tabs, and signing out and in, and MUST apply it before the first screen is shown, so that no
  screen appears in the other language first. Links MUST NOT carry a language: a link shows each
  team member their own language.
- **FR-010**: The page MUST declare its language to the browser and assistive technology, and the
  declaration MUST change with the switch (this amends 001-S7.9).
- **FR-011**: The switch MUST be operable with the keyboard, MUST show its keyboard focus as the
  other header controls do, and MUST be announced with the language it switches to, named in that
  language ("Deutsch", "English"), so that a team member who does not read the current language can
  find it.
- **FR-012**: Dates, times and relative times MUST follow the chosen language's conventions, and
  the formats spec 008 fixed for both languages (the test step's dd.mm.yyyy; "today in Germany" as
  the test step's reference day) MUST stay as fixed.
- **FR-013**: The German copy MUST address the team member formally ("Sie"), follow the conventions
  of KERN and the public administration, and use one fixed glossary for the product's terms
  (connection, variant, Standard, draft, rule, group, finding, persona, document, field, publish,
  deactivate, approval request, agent, …), applied consistently across all four sources of copy.
  The glossary MUST be recorded in this feature's documents before the German copy is written, and
  reviewed by the team.
- **FR-014**: The English copy MUST stay the copy spec 008 ported, word for word; this feature adds
  a language and changes no English text.
- **FR-015**: Every screen and state MUST keep spec 008's quality bar in German: 320 px at 200 %
  zoom with no horizontal scroll, no clipped or overlapping text, keyboard focus visible, one main
  heading per page, AA contrast, light only.
- **FR-016**: The website's behaviour MUST NOT change: the same routes, steps, states, rules,
  checks and personas; the same decisions as spec 008's baseline; the language changes only what
  is read.
- **FR-017**: What leaves the website MUST NOT change with the language: the integration answers
  to serviceBW, what is sent to EUDIPLO and shown in the wallet, the MCP server's tools, skills and
  answers to agents, and the saved connections, rules and drafts.
- **FR-018**: Nothing about the language choice MUST be logged or reported anywhere; it is a
  display preference of the browser.

### Key Entities

- **Language**: one of the two languages the website speaks, English and German, each with a
  short label on the switch ("EN", "DE"), its own name ("English", "Deutsch") and its conventions
  for dates and times.
- **Language choice**: the language a browser last chose; absent on a browser that never chose.
  Kept by the browser, not by an account; decides the language of every screen that browser opens.
- **Copy**: a text the website shows, in both languages, with the place it comes from (the
  website, the server, the rules logic or the design system) and, for composed sentences, the
  parts it is built from. Distinct from content, which team members and agents enter and which has
  no second language.
- **Glossary**: the fixed translation of each product term, shared by all copy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any screen, a team member switches the language in one activation, and every
  text of the screen is in the chosen language within one second, with no reload and nothing typed,
  selected or opened lost.
- **SC-002**: A walk through every screen and state of spec 008's verification tables in German
  shows no English text other than content and identifiers, and the same walk in English shows no
  German text: 100 % of the website's copy, from all four sources, exists in both languages.
- **SC-003**: The language choice is shown again in 100 % of the cases tested: a new tab, a return
  visit, after signing out and in, and a link opened from a colleague or an agent's request.
- **SC-004**: Every screen passes spec 008's checks in German as it does in English: 320 px at
  200 % zoom without horizontal scroll, no clipped or overlapping text, keyboard operation, one
  main heading, AA contrast.
- **SC-005**: A screen reader user hears the page in the chosen language from the first screen
  on, finds the switch by the name of the other language, and can operate it with the keyboard.
- **SC-006**: The team's review of the German copy in the running app finds no product term used
  against the glossary and no composed sentence (rule, finding, persona) that is not a correct
  German sentence; the review's corrections are applied before release.
- **SC-007**: Every existing automated check of the product still passes, and every behaviour of
  spec 008's baseline is unchanged in both languages.

## Assumptions

- **Two languages only.** English and German; no third language, no language per screen, no
  machine translation at run time: the German texts are part of the product.
- **Spec 008 is complete**: the redesigned header with its pills is in place, and the switch joins
  it as the frames draw it; the English copy is the copy spec 008 ported.
- **The German copy is written in this feature**, by the implementer, from the English copy and the
  glossary, since the designer and the PM provide none, and the team reviews it in the running app.
  No German frames exist: German screens follow the English frames' layout.
- **The switch's design** is the Figma frame the user holds, in "Middleware – V5"
  (`s8mU9oJDq3411e8bxMjQO9`); the user shares its URL when planning starts. Where that frame and
  spec 008's header frames differ, the switch's own frame decides the switch and spec 008's header
  decides the rest.
- **The choice is kept by the browser**, per device, not on the account: it must work before
  signing in, and the team is small and signs in from its own devices. A choice on the account can
  be a later feature.
- **The server, the rules logic and the design system's texts are in scope**, unlike spec 008's
  rule that the design adds nothing outside the frontend: this feature exists to supply what F6
  needed. The MCP server's guidance for agents stays English; agents are not the website.
- **"Today in Germany"** and every other rule of the test step stay as spec 004 and spec 008 fixed
  them; only their wording changes.
- **Dates in English keep spec 008's formats** and German uses the German equivalents; where spec
  008 fixed one format for a place (dd.mm.yyyy), it holds in both languages.
- **The product name "Konnekt" and the main variant's name "Standard"** read the same in both
  languages.
- **The signed-out screens show the switch** as spec 008's header does for signed-out screens
  (white pill, no account pill), so that a team member can choose before signing in.

## Out of Scope

- A language on the account, synced across devices, and a language per team member in the MCP
  server's answers to agents.
- German versions of the MCP server's tools, skills and messages for agents.
- German documentation (README, architecture, specs) and German texts of the account CLI.
- Translating content: connection names, descriptions, variant names, saved citizen messages,
  agents' requests.
- Anything the citizen sees: what serviceBW receives, what EUDIPLO and the wallet show.
- New screens, flows or behaviour; a redesign of the header beyond the switch.
