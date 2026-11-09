# Research: English–German language toggle for the whole website

**Phase 0 output of `/speckit-plan`** | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

This file records each technical decision behind the plan, with the reason for it and the
alternatives that were weighed. Points to confirm while coding are marked **Verify at
implementation** and collected in R13.

**Sources**: the spec (its checklist passed on 2026-11-09, iteration 2), spec 008's plan,
research, design notes and `deferred.md` (item F6), the constitution v1.2.0, `CLAUDE.md`,
`docs/ARCHITECTURE.md`, three surveys of the code on 2026-11-09 (the frontend's copy and
header, the rules package's texts, the backend's texts), and Figma "Middleware – V5"
(`s8mU9oJDq3411e8bxMjQO9`): the header components "Shell/Header · two pills" (`6688:41392`) and
"Shell/Header · in a connection" (`6698:43392`) and the signed-out header of U10 (`6701:39367`),
read on 2026-11-09. The user then shared the header's URL
(`https://www.figma.com/design/s8mU9oJDq3411e8bxMjQO9/Middleware---V5?node-id=6699-44241`): the
"Header area" frame (`6699:44241`, 1440 × 64) holds an instance (`6699:44242`) of "Shell/Header ·
two pills", the same header in every screen and the same as spec 008's. The switch is therefore
the "Pill · Language (globe + DE | EN)" node inside it (`7341:101654`; `7341:101661` in the
connection variant), the frame spec 008's audit cited for F6, and no Figma audit is run for this
feature (the user's decision, 2026-11-09).

## Technical Context: open points and how they were resolved

| Open point | Resolved in |
|---|---|
| How the frontend holds two languages without an i18n library, and how a component reads its copy | R1 |
| What the switch looks like, where it sits, and how it is announced | R2 |
| How the German copy is written and reviewed, and where the glossary lives | R3 |
| How the rules package composes German sentences while the MCP server stays English | R4 |
| How dates and times follow the language | R5 |
| How the backend's labels and messages follow the language without a schema change, and what stays English | R6 |
| How the choice is remembered, resolved on the first visit and applied before the first paint | R7 |
| What the automated tests cover, and how "100 % in both languages" is checked | R8 |
| How the longer German text is kept inside spec 008's quality bar | R9 |
| How the code that matches English texts by equality keeps working | R10 |
| What this checkout can run | R11 |
| In what order the work runs | R12 |
| What still needs a check at implementation | R13 |

No open point blocks the plan.

---

## R1. Frontend strategy: typed copy tables per language, no i18n library

**Decision**: no dependency is added. The frontend keeps spec 008's layout of copy, one
`constants.ts` next to each component or page (34 of the 41 hold copy: about 645 prose strings
and 165 template functions, nothing inline in `.tsx`), and each copy object becomes a **copy
table**, one entry per language:

```ts
// rules/src/language.ts (shared by frontend and mcp)
export type Language = 'en' | 'de';
export const LANGUAGES = ['en', 'de'] as const;
export const DEFAULT_LANGUAGE: Language = 'en';
export const defineTexts = <T>(en: T, de: T): Record<Language, T> => ({ en, de });

// a component's constants.ts
export const USER_MENU_COPY = defineTexts(
  { yourAccount: 'Your account', logOut: 'Log out', signedInAs: 'Signed in as' },
  { yourAccount: 'Ihr Konto', logOut: 'Abmelden', signedInAs: 'Angemeldet als' }
);
```

`defineTexts(en, de)` types `de` as `T`, inferred from `en`, so a German table that lacks a key or
adds one fails `tsc` (constitution III: the gate, not a reviewer, enforces completeness).
Template functions stay functions, one per language, so German word order and inflection live in
the German template, not in a word-swap (FR-006). Components read their table with
`useCopy(USER_MENU_COPY)`, a one-line hook over the language context (`useLanguage()`), and pass
`copy` or `language` down to pure helpers in `utils.ts`, which take `language: Language` where
they build text (`stepCountOf(current, total, language)`). The English column is spec 008's copy,
word for word (FR-014); moving a string into a table changes no English text.

**Rationale**: the copy already sits in typed objects, so the table is the smallest change that
gives two languages; the type checker proves both languages complete (SC-002's "100 %" in part
at compile time); no runtime lookup by string key, no key drift, no new dependency to document
(constitution IV); the rules package uses the same `defineTexts` and `Language`, so one pattern
covers the website and the rules logic; the MCP server imports `Language` and keeps
`DEFAULT_LANGUAGE`.

**Alternatives considered**: `react-i18next` / `i18next` or FormatJS (ICU messages): a dependency
and a build step for typed keys, 1,600 call sites rewritten to string keys, a runtime lookup that
can miss silently, and plural rules the project does not need (German and English both have
one/other, handled in the templates today); a German build (two bundles): a switch would reload
the page (FR-003 forbids it); a translation of the DOM at run time: not a product; keeping
German in separate `constants.de.ts` files: the type link between the two columns is lost, and a
reviewer has to check completeness. Both languages ship in one bundle: about 60–80 kB of text
uncompressed, so no lazy chunk is needed and the switch is instant (SC-001).

**Where the strings are**: `rules/src/language.ts` (new) holds `Language`, `LANGUAGES`,
`DEFAULT_LANGUAGE`, `defineTexts`, `languageNames` ({ en: 'English', de: 'Deutsch' }) and
`isLanguage()`. `frontend/src/hooks/useLanguage.ts` (new) is the context hook, `useCopy()` sits
beside it, `components/LanguageProvider/` (new) owns the state (R7). `frontend/src/constants.ts`
keeps `APP_NAME` and `ROUTES`; `CONNECTION_STEPS` becomes keys (`'connection' | 'documents' |
'rules' | 'test'`, which `WizardProgress` already uses as React keys) with a copy table for their
labels; `KERN_TRANSLATIONS` becomes a table (the kit's own defaults are German, the English column
is today's object) and `main.tsx` passes `KERN_TRANSLATIONS[language]` to `KernContextProvider`
from inside the provider.

## R2. The switch: the design's pill, in the header's right group

**Decision**: a new component `components/LanguageSwitch/` (own markup, option (c) of spec 008's
R1, since KERN has no segmented control), built from the node "Pill · Language (globe + DE | EN)"
(`7341:101654` in `6688:41392`; identical in `6698:43392` and in U10's instance): a 48 px pill,
`rounded-kern-circle`, `bg-kern-layout-background-hued` (`#f2f5fb`), `shadow-card`
(`0 6px 20px rgba(19,21,37,.05), 0 1px 2px rgba(19,21,37,.05)`, the token spec 008 made), `px-4`,
`gap-4`, holding two 40 × 40 segments, `rounded-kern-circle`, each with the label "DE" or "EN" in
`label/small` (Fira Sans 600 14/24). The **current** segment is white (`bg-white`) with
`0 1px 2px rgba(18,20,38,.12)` (a new `@theme` shadow token `shadow-segment`, no KERN name); the
other is transparent. The design's globe layer is hidden in every frame and is not built.

**Colours** (two deviations, recorded in [design-notes.md §1](design-notes.md#1-the-switch) and
told to the designer): the design's inactive label `#6b7380` on `#f2f5fb` is 4.38:1, under AA for
14 px text, so it is fixed to the nearest passing KERN value, `text-kern-layout-text-muted`
(`#4a5468`), by spec 008's AA rule (Clarification 2026-11-06 #2); the current label's `#1f2433`
has no KERN name and is a hair from the ink `#0b1220`, so the ink token is used (the FIGMA
workflow's rule "a value with no KERN name becomes a token" would mint a token for a difference no
one sees; the user can reverse this in Complexity Tracking). **Verify at implementation** (V1):
the exact contrast with the browser's computed colours.

**Placement**: the frames put "Right · language + account" (`7354:60279`, 152 × 48, `gap-4`
between the two pills) after the stretching spacer: the language pill first, then the account
pill, 4 px apart. `TopBar` gets the switch as its own element, rendered in every state: signed in
(before `children`, the account pill), signed out (the same hued pill; U10's instance has the
account pill hidden and the language pill unchanged), in a connection and scrolled. Below `md`
the header keeps W2's rows: row one is the Konnekt pill, the spacer and the right group (switch
and account), the connection pill and the meta take rows of their own; the switch therefore
"keeps its place" (spec, Edge Cases). `AuthLayout`, `AppLayout`, `WizardLayout` and the
`HomepageLoader` all render `TopBar`, so every screen has the switch (FR-001) with no change
beyond `TopBar`; the not-found route is a redirect to the overview in `App.tsx` and `NotFound` is
shown inside the layouts, so it has the switch too.

**Behaviour and semantics** (FR-003, FR-011): `<div role="group" aria-label={copy.language}>`
("Language" / "Sprache") with two `<button type="button">`, each with `lang` set to its language,
`aria-label` the language's own name ("Deutsch", "English": the visible "DE" / "EN" is a prefix of
the name, so the accessible name contains the visible label, WCAG 2.5.3) and `aria-current="true"`
on the current one. Activating the other calls `setLanguage()`; activating the current one does
nothing. No navigation, no form, no request: React re-renders with the other table (FR-003: state,
dialogs, menus, scroll stay). Keyboard: two Tab stops in the header's order, Enter and Space, the
focus ring is `FOCUS_RING_CLASSES` as on the Konnekt pill's link. Hover on the inactive segment:
KERN's hover shade for a transparent control (`hover:bg-kern-action-default/8` as the pill menu of
spec 008 does); no hover frame is drawn, so this is a W-style decision noted in design-notes §1.
Motion: none (the segments swap classes; the colour transition `.motion` 150 ms as the header).

**Rationale**: the design is the only frame that exists (spec, Context); own markup after the
node keeps every value exact; buttons with `aria-current` are the accessible pattern for a
two-state language switch that is not a form control; `lang` on each button makes a screen reader
pronounce "Deutsch" in German and "English" in English, so that a team member who does not read
the current language finds the switch (SC-005).

**Alternatives considered**: one toggle button (`aria-pressed`): hides which language is current
from a screen reader until pressed, and the design draws two segments; links with `?lang=`:
FR-009 forbids a language in links; a `<select>`: not the design; radio buttons: announce
"radio button, 1 of 2", heavier than needed and styling KERN's radio into the pill breaks its
anatomy.

## R3. The German copy: glossary first, then tables, then the team's review

**Decision**: the glossary is [contracts/glossary.md](contracts/glossary.md), written in this
phase (FR-013 requires it before any German copy) with the style rules (Sie, KERN's tone,
neutral forms, German quotes, dates), the product terms, the rules' operator vocabulary and
composed-sentence examples, and the catalog's names. The implementer writes every German string
from the English column and the glossary, in the same task that turns a copy object into a table
(R1), so that no table is ever half-translated. The team reviews the German in the running app
(SC-006) and the corrections are applied to the glossary first, then the code; the review's log is
[design-notes.md §3](design-notes.md#3-the-german-review).

**Rationale**: a glossary applied by every task is the only way four sources of copy agree on
"Anbindung", "Befund" and "Beispielperson"; writing German at the moment a table is made keeps
each task self-contained and testable; the type checker refuses a missing entry, so "100 % in both
languages" (SC-002) does not depend on a final sweep.

**Alternatives considered**: machine translation at run time (forbidden by the spec); a
translation pass after all tables exist (a long period with German tables full of English, and no
test to tell); asking the designer or PM (the spec says none will come).

**Choices the glossary makes that the team may revisit**: "Anbindung" for connection (the UI's
word for a form's connection to the wallet; "Verbindung" reads as a network link), "Befund" for a
finding of the rule checks ("Hinweis" is weaker and already means a hint), "Beispielperson" for a
sample citizen / persona, "Freigabeanfrage" for approval request, "Zugriffsstufe" for access
level, neutral plural forms instead of gendered pairs where a sentence allows ("niemand kann …
erfüllen").

## R4. The rules package: a `language` on the context and the composers; English by default

**Decision**: every function of `rules/src/` that composes text takes the language, and defaults
to English, so that the MCP server, which imports eleven of them (`statementOf`, `noteOf`,
`noticeText`, `resolutionOf`, `namesOf`, `ruleProblem`, `RULES_MESSAGES`, `unrequestedRules`,
`OPERATORS`' labels, `droppedDataOf`, `personaFieldsOf`), keeps answering agents in English
without a change (FR-017; spec: the MCP's guidance stays English). Two forms:

- `RuleContext` (`types.ts:61`) gains `language?: Language` (default `'en'`). Everything that
  already takes a context follows it: `statementOf`, `statementPartsOf`, `proposedMessage`,
  `ruleProblem`, `firstProblem`, `resultViewOf`, `personaFieldsOf`, `droppedDataOf`. The frontend
  builds its context once per language in the editor (`useMemo` over documents, option sets and
  the language), so the German catalog labels (R6) and the German composers arrive together.
- Composers without a context take a trailing `language: Language = 'en'`: `noteOf`, `bannerOf`,
  `countsOf`, `tabLabelOf`, `tabFindingsOf`, `dialogLineOf`, `noticeText`, `kindTextOf`,
  `listOf`, `announcementOf` (both kinds), `nameProblem`, `variantNameProblem`,
  `reservedNameProblem`, `formatDate`, `licenceClassLabel`, `ruleFieldLabel`, `suffixOf`,
  `operatorsFor` / `operatorDefinition` (whose `label` becomes `labelOf(definition, language)`;
  the `label` field stays English for the MCP's `tools/catalog.ts`), and all of
  `personas/messages.ts`. The two reducers that store an announcement string (`checks/runState.ts`
  and `personas/personaState.ts`) get the language in the context their hooks already pass
  (`AnnouncementContext`, `PersonaState`'s input), so the announcement is composed in the language
  of the moment; an announcement already stored is transient (a live region) and is not recomposed
  on a switch.

**Texts**: each module keeps its composer and moves its strings and sentence templates into a
`defineTexts(en, de)` table in the same module (or a sibling `<module>Texts.ts` where the module is
long, as `findingMessages.ts` is at 885 lines): the German entry holds German templates with
German structure, for example `({ years }) => \`Sie müssen mindestens ${years} Jahre alt sein.\``
beside `You need to be at least ${years} years old.`. Where the English composer edits a built
sentence (`conflictWithNotice` slices on the fragment `CONTRADICT`), the fragment comes from the
table so the German composer slices its own fragment; where English appends "s" for a plural
(`count()`, `itemsPhrase`, `resultHeadingOf`), the table gives `one` / `other` forms per word.
`lowerFirst()` stays an English rule and is not applied to German labels (German nouns keep their
capital): the German templates place the label where a capitalised noun fits ("Ihr Geburtsdatum
…"). The fixed vocabulary is the glossary's §3.

**Validation messages mirrored from the server** (`RULES_MESSAGES`, `CONDITION_PROBLEM_MESSAGES`,
`EDIT_MESSAGES.unknownVariant`) exist in both languages on both sides, word for word (CLAUDE.md's
rule extends to German); R8 adds the parity fixture that checks it.

**Rationale**: a default of English keeps every MCP import and test untouched; the context is the
object the frontend already threads through the editor, so the language travels with the catalog
it belongs to; per-language templates are the only way to "read as grammatical German sentences"
(FR-006); keeping the strings in the composing module keeps `rules/src/` pure and each module
testable alone.

**Alternatives considered**: a module-level "current language" in the rules package: hidden state
in a pure package, and the MCP and the browser Worker would share it wrongly; composing the text in
the frontend from structured findings: moves 885 lines of logic out of the package that owns it
and the MCP would need its own copy; a `language` on every function instead of the context: more
signatures to change for the same effect.

## R5. Dates and times: per-language `Intl` formatters, the fixed formats kept

**Decision**: every `Intl` formatter constant becomes a table keyed by language
(`EDITED_DATE_FORMAT[language]`: `en-GB` "5 Oct 2026" / `de-DE` "5. Okt. 2026";
`RELATIVE_TIME_FORMAT`: `en-GB` / `de-DE`; `SAVED_TIME_FORMAT`: the time in both with `h23`),
and the helpers in `utils.ts` take the language. The formats spec 008 fixed for both languages
stay single: `ROW_DATE_FORMAT` and `CHANGED_AT_FORMAT` (`de-DE`, "28.10.2026"), the test step's
`displayDateOf` (dd.mm.yyyy) and `dottedDate`. In the rules package `formatDate(iso, language)`
gives "23 Oct 2005" in English (unchanged, `MONTH_ABBREVIATIONS`) and "23.10.2005" in German (the
convention the glossary fixes, built by string parts like `displayDateOf`, no `Intl`, so the
package stays deterministic in tests). `todayInGermany()` keeps `en-US` `formatToParts`: it
extracts numbers, shows nothing (FR-012: "today in Germany" stays).

**Rationale**: `Intl` is already the tool and is built into every supported browser; keeping the
fixed formats avoids re-deciding spec 008 and spec 004 (FR-012).

**Alternatives considered**: a date library (a dependency for two formats); one German format
everywhere (the English screens would change, against FR-014).

## R6. The backend: `Accept-Language` chooses the texts; shapes, keys and the integration stay

**Decision**: the browser sends `Accept-Language: de` or `en` on every call (`apiFetch`, the one
`fetch` in `src/api/client.ts`, adds the header from the current language). The backend gains
`app/language.py` (a leaf module that imports nothing from the app, so that `errors.py` and every
service can import it): `Language` (`'en' | 'de'`), `language_of(header)` (the first tag's
primary subtag `de` → German, anything else → English), `Text` (a frozen dataclass with `en` and
`de` and `resolve(language)`), and a `ContextVar` `request_language` with `current_language()`.
A small pure-ASGI middleware in `main.py` sets the variable from the header for every request, and
to English for `/api/connect/` whatever the header says (FR-017: the integration answers to
serviceBW, including the delivered documents' `label`s, never change). Starlette runs plain `def`
handlers in a threadpool with the request's context copied, so services read
`current_language()` without a new parameter. **Verify at implementation** (V2): the propagation
into the threadpool with the installed Starlette/anyio, with an API test.

What follows the language:

- **Error messages** (about 101 templates in the `{error, message}` envelope): a message becomes a
  `Text` (`Text(en='Enter a name for the connection.', de='Geben Sie einen Namen für die
  Anbindung ein.')`; templates format both languages at raise time). Services keep raising
  `HTTPException` with a `message` that is a `Text`; the handler in `errors.py` resolves it with
  `current_language()` on the way out, so the envelope is unchanged (constitution I) and the
  `error` code, which the frontend and the MCP branch on, stays English. The generic `400`, the
  `5xx` message and `error_id` line, and EUDIPLO's `http_error_for()` messages follow the same
  path. Where a service catches an `HTTPException` to reuse its `detail` (`approvals.approve`),
  the `Text` is resolved there (V3).
- **The catalog and the option sets**: `CatalogDocumentType`, `CatalogField`, `CatalogPart` and
  `Option` get a `label_de` beside `label` (294 option values, of which 249 countries; 49 catalog
  labels; 17 licence class descriptions); `label_of(item)` returns the current language's. The
  routers `document_types.py` and `option_sets.py` and `documents_view()` (the `label` inside form
  connection and draft responses) use it; the DCQL builder, the evaluator, the worker and
  `services/documents.py` (serviceBW's delivery) keep keys and the English label. The response
  schemas are unchanged: `label` is a string in the requested language, keys and order never change
  (FR-005).
- **Other served texts**: `ACCESS_LEVELS` names and "allows" (served to the consent page and the
  account page), the approval outcome texts (`state_text`), the `insufficient_access` message.

What stays English: `ApiResponse.message` (the frontend discards it; the MCP shows none), the
OAuth RFC bodies (`error_description`, for clients), `/api/connect/` in full, everything to
EUDIPLO (keys only), stored data (the main variant "Standard", the default names "Rule NN", the
rule messages team members saved), the logs (FR-018: nothing about the language is logged; the
header is not in any log line), the account CLI, the MCP server (no header → English).

**Rationale**: a header is the web's way to ask for a language, needs no new endpoint, query or
field, and leaves every response shape as it is (Principle I); resolving at the edge keeps the
services' signatures and the raise-don't-catch pattern; a `ContextVar` carries one value through
code that has no request in hand; `/api/connect/` pinned to English makes FR-017 a one-line rule
rather than a property of every message.

**Alternatives considered**: `?lang=` on every call (links must not carry a language, and every
API module would change); both languages in every response (`label_de` in the schemas: a schema
change on three types and their `api-types` mirrors, the MCP would see new fields, and messages
would double); passing `language` into every service (about 40 signatures, and the places that
build messages without a request would still need a default); translating in the frontend from
error codes (the server's texts carry parameters the client does not have, and the mirror rule
would break).

**The frontend's side**: `useDocumentTypes()` and `useOptionSets()` cache per language and fetch
the other language in the background once the first has loaded (two small static answers), so
that a switch shows German labels at once (SC-001); until the German has arrived the English
labels stay, as a notice already on the screen does (spec, Edge Cases). `useFormConnection()`'s
`documents[].label` is refetched on a switch for the same reason and the step keeps rendering the
loaded connection meanwhile. A server notice already shown keeps its text (spec); the next request
carries the new header.

## R7. The choice: `localStorage`, the browser's language on the first visit, applied before paint

**Decision**: `components/LanguageProvider/` owns the state and is the **third** place allowed to
touch `localStorage` (after `useLocalDraftStore` and `useRememberedHomepage`; `CLAUDE.md`'s rule
is amended). The pure part is `utils/language/`: `resolveLanguage(stored, browserLanguage)`
(a stored `'en'` / `'de'` wins; otherwise `de` when the browser's preferred language's primary
subtag is `de`, for `de-AT`, `de-CH`, `de-LI` too; otherwise `en`; a stored third value counts as
no choice), with its test. The provider reads `window.localStorage` under the key
`connection-portal:language:v1` and `navigator.language` once, synchronously in the initial
state of `useState`, inside `try/catch` (a blocked storage gives the first-visit rule and the
choice lasts for the visit), so the first render is already in the right language (FR-009) and no
screen flashes English. `setLanguage()` updates the state, writes the key (in `try/catch`), and a
`storage` listener follows another tab's choice. A `useLayoutEffect` sets
`document.documentElement.lang` before paint on mount and on every change (FR-010), and
`useDocumentTitle` already re-runs when the title string changes. `index.html` keeps `lang="en"`
as the static default. The provider sits above `KernContextProvider` in `main.tsx` and hands the
current language to `api/client.ts` through `setRequestLanguage()` (a module-level value, so
`apiFetch` needs no React), and to the rules' contexts through `useLanguage()`.

**Rationale**: `localStorage` is per browser, survives visits and signing out, and works signed
out (the spec's assumption: the choice is the browser's); the pure resolver is testable in Node
as the local drafts' modules are; reading in the initial state avoids a second render and a flash;
one hook touching storage keeps the local drafts' rule intact.

**Alternatives considered**: a cookie (sent with every request for no use, and the backend
would read it: the header is cleaner); the account (out of scope); `sessionStorage` (forgets
across tabs and visits); an inline script in `index.html` setting `lang` before React (works, but
the provider's layout effect is before paint too, and keeps all language code in one place);
`navigator.languages` (the full list): the spec asks for the browser's preference, which is the
first entry, and `navigator.language` is it.

## R8. Tests: the type checker, Vitest for the tables and composers, pytest for the header, one parity fixture

**Decision**:

- **Completeness**: `tsc` (both columns typed from the English one, R1). Plus one Vitest test
  `frontend/src/copy.test.ts` that collects every copy table with `import.meta.glob('./**/constants.ts',
  { eager: true })` and asserts for each: the same keys, the same kinds (string / function), and
  `de !== en` for strings unless the string is in a short allowlist of words equal in both
  languages ("Standard", "Status", "Details", "Test", "DE", "EN", "Konnekt", "Optional", "Link",
  "Wallet", "Agent", "Name", …). The same test in `rules/` for its text tables.
- **Composers**: every rules test file that asserts an English sentence gets a German case beside
  it (`messages.test.ts`, `statements.test.ts`, `findingMessages.test.ts`, `personas/*.test.ts`,
  `validation.test.ts`, `dates.test.ts`), with the glossary's sentences; the English assertions
  stay as they are (FR-014).
- **Frontend helpers**: the `utils.test.ts` files that assert English text pass `'en'` and keep
  their strings; a German case is added where a helper composes (the step counter, the list
  joiners, the date helpers).
- **The resolver and the provider's pure parts**: `utils/language/*.test.ts`.
- **Backend (pytest)**: `language_of()` for `de`, `de-AT,de;q=0.9,en;q=0.8`, `en-US`, missing and
  junk headers; an API test per path: a validation error in German with `Accept-Language: de`, the
  catalog and option sets in German with unchanged keys and order, a `5xx` in German with its
  `error_id`, `/api/connect/` in English despite `de`, the MCP's calls (no header) in English; a
  unit test that every `Text` has both columns non-empty and different (the same allowlist idea).
- **The mirror**: `scripts/export_check_fixtures.py` also writes
  `rules/src/fixtures/server-messages.json`, the server's validation messages rendered in both
  languages with fixed sample parameters (noun, name, branch, limits); `validation.test.ts`
  renders the same cases from `RULES_MESSAGES` / `CONDITION_PROBLEM_MESSAGES` and asserts
  equality, and `tests/unit/test_check_fixtures.py` keeps the file current (`--check`). This is the
  first automated check of CLAUDE.md's "word for word" rule.
- **The MCP**: `npm test -w mcp` must pass unchanged (English by default); the fake backend's
  texts stay; the fake's drifted `DRAFT_CHANGED_MESSAGE` is left as is (not this feature's).
- **Visual and manual**: the per-node loop for the switch (one node, four header states) and a
  German walk through spec 008's verification tables (quickstart V1–V9) with the Playwright MCP
  tools: the screenshot matrix in German at 1440 and at 320 px / 200 %, the keyboard run and a
  screen reader pass; the evidence tables in design-notes §2.

**Rationale**: constitution III makes the Node tests the gate, so completeness and the German
composers must be covered there; the backend's tests are a practice but the header is a contract
between the two, so it is tested on both sides; the parity fixture closes a gap the surveys found
(no test compared the two sides).

**Alternatives considered**: DOM tests of the switch (jsdom is not in the stack); snapshot tests
of whole screens (brittle, and the frames are the reference); a backend test that imports the
TypeScript tables (no tool for it; the fixture is the existing pattern).

## R9. Longer German text: the quality bar stays, per screen

**Decision**: no global change to layout; the German walk (R8) checks every screen of spec 008's
tables at 320 px / 200 % and at 1440 in German, and a task fixes what breaks, in this order: the
glossary's short form where a label must stay short (a pill, a chip, a tab), then `break-words`
on the one element that overflows, then, only for a long compound noun in a narrow column, soft
hyphens (`&shy;`) in that string. `hyphens: auto` is not switched on globally: it depends on the
browser's dictionary and changes the English screens' look. Truncation stays where spec 008 cuts
with "…" (the header's name, the row's description). The step header's "Step n of 4" and the
footer's buttons ("Speichern und verlassen") are the known tight spots (V4).

**Rationale**: the spec forbids layout changes beyond the switch (Out of Scope) and demands
spec 008's bar in German (FR-015); fixing per element keeps the English screens untouched.

## R10. Code that compares English texts: compare codes, not strings

**Decision**: four places match a composed text against an English constant and would break in
German: `RulesStep/TreeItem.tsx:51` and `RulesStep/utils.ts:808` (a problem's message against
`RULES_MESSAGES`), `RuleEditor/utils.ts:67` (the stored citizen message against
`proposedMessage()` to know whether the team member edited it), and the MCP's `findings.ts:143`
and `tools/checks.ts:230` (which stay English and keep working, but follow the same change).
`RulesProblem` (`types.ts:167`) and the condition problems gain a stable `code` (the table's key:
`'chooseData'`, `'noMessage'`, …) beside `message`, and the callers branch on `code`. For the
proposed message, the editor keeps a flag "the message is the proposal" and tests it against the
proposal in **both** languages (`LANGUAGES.some(l => message === proposedMessage(rule, { ...ctx,
language: l }))`), so that an untouched proposal follows the switch (US1-AS2) while a saved
message, in whichever language, is shown as saved (US3-AS3, FR-007). `CONNECTION_STEPS` become
keys (R1) because `WizardProgress` uses the labels as React keys and the edit route's `step`
parameter uses the key names already.

**Rationale**: a code is the stable thing; the message is presentation. The MCP's comparisons
are changed too so one pattern holds, even though English alone would have kept them working.

## R11. What this checkout can run

**Decision**: as spec 008's R14: the checkout had no `node_modules` on 2026-11-09, so `npm
install` at the root runs once before `npm run lint && npm test && npm run build`; `backend/.venv`
exists (`uv sync`); Node here is 20.19 while the constitution says 22+ (**V5**: `npm install` and
Vite 8 on Node 20, or `nvm use 22`); git is not reachable (`.git` points to another machine's
worktree), so nothing commits here and the branch `009-language-toggle` exists only as the feature
directory. Figma is read through the MCP tools, few nodes (R2 read three); the browser checks use
the Playwright MCP tools; the backend's tests need the `_test` database of the README.

## R12. Order of work

**Decision** (the phases `/speckit-tasks` turns into tasks; see plan.md "Rules for
`/speckit-tasks`"):

1. **Foundations**: `rules/src/language.ts`, `defineTexts`, the frontend provider, hook, resolver
   and its test, the request header in `apiFetch`, the `lang` attribute, `KERN_TRANSLATIONS` as a
   table, `CONNECTION_STEPS` as keys; the backend's `app/language.py`, the middleware, the
   handler's resolution of `Text`, the catalog's `label_of`, their tests; the glossary review
   with the team (the only step that waits on people).
2. **The switch** in `TopBar`, with the per-node loop (R2) and its table in design-notes §2.
3. **The backend's texts**: the catalog and option sets (German labels), the message `Text`s per
   service, the access levels, the approval texts, the pytest additions, the parity fixture.
4. **The rules package**: `RuleContext.language`, the composers and tables module by module with
   German test cases; `RulesProblem.code`; the mirror on the client side; the MCP's tests still
   green.
5. **The frontend's copy**, screen by screen in spec 008's order (sign-in and forgot password,
   overview and welcome page, the wizard's steps, the rule editor, the test step, the details,
   the account, consent and approval pages, the shared components, the not-found page), each task
   turning the copy files of one screen into tables with the German written from the glossary,
   the helpers taking the language, the date tables, the comparisons of R10.
6. **The German walk**: quickstart V1–V9, the screenshot matrix, the 320 px / 200 % pass, the
   keyboard and screen reader runs, the fixes of R9, the team's review log (SC-006).
7. **Documentation and close**: ARCHITECTURE (a "Languages" section: the provider, the header,
   the tables, the rules' context, the backend's `Text` and middleware, what stays English),
   CLAUDE.md's one-line rules, README (the header, the fixture command), spec 001's 001-S7.9 and
   spec 008's F6 marked as superseded, `/speckit-converge`.

**Rationale**: the foundations make every later task small and independent; the backend and the
rules package come before the screens so that a screen's task sees German labels and sentences
when it checks its frame; the walk needs everything.

## R13. Verify at implementation

| # | Check | Where |
|---|---|---|
| V1 | The switch's computed colours and their contrast on `#f2f5fb` (≥ 4.5:1 for both labels); the shadows match the node | phase 2, design-notes §1 |
| V2 | `current_language()` inside a plain `def` handler equals the header's language (threadpool propagation of the `ContextVar`), on the installed Starlette and anyio | phase 1, an API test |
| V3 | Every place that reads an `HTTPException`'s `detail['message']` in Python (`approvals.approve`, the worker's logs, the tests' helpers) handles a `Text`; no `Text` reaches a log line or a stored column | phase 3 |
| V4 | The German step header, footer buttons, status pills, tabs and chips at 320 px / 200 %: no clipping or horizontal scroll | phase 6 |
| V5 | `npm install` and the gates on Node 20.19, or Node 22 is used | phase 1 |
| V6 | The `storage` event's `key === null` (a cleared storage) is treated as no choice; a third stored value is ignored | phase 1, the resolver's tests |
| V7 | Screen readers (NVDA or Orca) announce the two buttons as "Deutsch" and "English" with the right voice, and the page's language after a switch | phase 6 |
| V8 | A switch during an open rule editor keeps the typed values and an untouched proposal follows the language (R10) | phase 5 |
| V9 | `useDocumentTypes` / `useOptionSets` deliver German labels within one second of a switch, with the prefetch | phase 5 |
| V10 | The `import.meta.glob` test sees every `constants.ts` in Vitest's `node` environment | phase 1 |
