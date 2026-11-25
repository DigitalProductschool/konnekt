# Data model: English–German language toggle

**Phase 1 output of `/speckit-plan`** | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md) |
**Research**: [research.md](research.md)

No table, column, schema or API shape changes: the backend's responses keep their fields (a
`label` or a `message` is a string in the requested language), `api-types/` is untouched, and
nothing about the language is stored on the server or logged (FR-018). This file therefore models
the **values the frontend, the rules package and the backend pass around** for this feature, and
the **records this feature keeps in its own documents**.

## 1. Values in the code

### Language

The spec's "Language" entity: one of the two languages the website speaks.

| Field | Type | Rule |
|---|---|---|
| `code` | `'en' \| 'de'` (TS `Language` in `rules/src/language.ts`; Python `Language` in `backend/app/language.py`) | exactly two values (FR-002); the default is `'en'` on both sides (`DEFAULT_LANGUAGE`) |
| `label` | `'EN' \| 'DE'` | the switch's visible label |
| `name` | `'English' \| 'Deutsch'` | the language's own name, the switch's accessible name (FR-011); `languageNames[code]` |
| `locale` | `'en-GB' \| 'de-DE'` | the `Intl` locale of the language's formatters (R5); not a type of its own, the formatter tables are keyed by `code` |

The TS and Python types are defined independently (no shared build step); both have two values,
and the header is the contract between them ([contracts/api-language.md](contracts/api-language.md)).

### Language choice

The spec's "Language choice": the language a browser last chose; absent on a browser that never
chose. Kept by the browser, not by an account.

| Field | Type | Rule |
|---|---|---|
| `stored` | `'en' \| 'de' \| null` | `localStorage['konnekt:language:v1']`; any other value, a missing key, a blocked storage or a cleared storage (`storage` event with `key === null`) count as `null` (spec, Edge Cases; FR-008) |
| `browserPreference` | `string \| null` | `navigator.language` read once at start; `de`, `de-AT`, `de-CH`, `de-LI` and any `de-*` resolve to German, everything else to English (FR-008) |
| `current` | `Language` | `resolveLanguage(stored, browserPreference)`: `stored` when set, else the browser's rule; held in `LanguageProvider`'s state, read with `useLanguage()`; it is the only language a screen ever renders with (FR-009) |

**Transitions**: `setLanguage(next)` on the switch → `current = next`, `stored = next` (written in
`try/catch`; a failed write keeps `current` for the visit), `document.documentElement.lang =
next`, `setRequestLanguage(next)` for `apiFetch`; a `storage` event for the key from another tab
→ `current = isLanguage(newValue) ? newValue : resolveLanguage(null, browserPreference)`. Nothing
else changes state: no navigation, no request, no save (FR-003). Links carry no language (FR-009).

### Copy table

The spec's "Copy": a text the website shows, in both languages, with the place it comes from.
In the code, copy is grouped into tables.

| Field | Type | Rule |
|---|---|---|
| `en` | `T` | spec 008's copy, word for word (FR-014); `T` is an object of strings and template functions, inferred from this column |
| `de` | `T` | the German, written from the glossary ([contracts/glossary.md](contracts/glossary.md)); typed as `T`, so a missing or extra key fails `tsc` (FR-004) |

`defineTexts(en, de)` builds the table (`Record<Language, T>`); `useCopy(table)` returns
`table[current]` in a component; a pure helper takes `language` and indexes the table itself.
Template functions carry the language's own structure (word order, inflection, plural forms), so
that composed sentences are grammatical in each language (FR-006). The **source** of a table is
its location: the website's own copy in `frontend/src/**/constants.ts`, the design system's
seven texts in `KERN_TRANSLATIONS`, the rules logic's texts in `rules/src/**`. Content (names,
descriptions, saved messages, usernames, agents' requests, identifiers) is never in a table
(FR-007).

**Validation** (`copy.test.ts`, R8): for every table, the same keys in both columns, the same
kind per key (string or function), and `de !== en` for strings unless the string is in the
allowlist of words equal in both languages.

### Rule context (rules package)

`RuleContext` (`rules/src/types.ts`) gains one optional field.

| Field | Type | Rule |
|---|---|---|
| `documents` | `RuleDocument[]` | unchanged: the catalog as the API delivered it, already in the requested language (R6) |
| `optionSets` | `OptionSet[]` | unchanged, same |
| `language` | `Language` (optional, default `'en'`) | the language the composers use; the frontend sets it from `useLanguage()`; the MCP server never sets it |

Composers without a context take a trailing `language: Language = 'en'`
([contracts/rules-texts.md](contracts/rules-texts.md)).

### Rules problem (rules package)

`RulesProblem` and the condition problems gain a stable code (R10).

| Field | Type | Rule |
|---|---|---|
| `code` | the key of the message in `RULES_MESSAGES` / `CONDITION_PROBLEM_MESSAGES` / `EDIT_MESSAGES` (`'chooseData'`, `'noMessage'`, …) | new; callers branch on it, never on `message` |
| `message` | `string` | unchanged in meaning: the text in the context's language |
| `branchIndex`, `itemId` | unchanged | |

### Server text (backend)

`Text` in `backend/app/language.py`: a message in both languages, resolved at the edge.

| Field | Type | Rule |
|---|---|---|
| `en` | `str` | spec 008's message, word for word |
| `de` | `str` | the German, from the glossary; non-empty and different from `en` (a unit test) |

`Text.resolve(language) -> str`. Templates format both columns at raise time
(`Text(en=f'…{name}…', de=f'…{name}…')`). A `Text` is only ever the `message` of an
`HTTPException`'s detail, or a catalog label; the exception handlers in `errors.py` resolve it
with `current_language()`; it never reaches a log line, a stored column, an `ApiResponse.message`
or an RFC body (V3).

### Request language (backend)

| Field | Type | Rule |
|---|---|---|
| `request_language` | `ContextVar[Language]`, default `'en'` | set by the language middleware from `Accept-Language` (`language_of(header)`: the first tag's primary subtag `de` → `'de'`, else `'en'`), or to `'en'` for every path under `/api/connect/` whatever the header says (FR-017); read with `current_language()`; never logged |

### Catalog label (backend)

`CatalogDocumentType`, `CatalogField`, `CatalogPart` and `Option` gain `label_de: str` beside
`label: str` (English). `label_of(item) -> str` returns the column of `current_language()`.
Routers and `documents_view()` use `label_of`; the DCQL builder, the evaluator, the worker and
serviceBW's delivery keep `label` (English) and the keys. Keys, order and kinds never change with
the language (FR-005).

## 2. Records kept in the feature's documents

### Glossary entry ([contracts/glossary.md](contracts/glossary.md))

| Field | Rule |
|---|---|
| `english` | spec 008's term or sentence, word for word |
| `german` | the one translation, used by every source of copy |
| `notes` | the short form for tight places, examples, where it applies |

A term missing from the glossary is added there in the task that needs it, never translated ad
hoc. The team's review changes the glossary first, then the code; the log is design-notes §3.

### Switch verification row (design-notes §2)

As spec 008's tables: `node` (`7341:101654`), `state` (signed out, signed in, in a connection,
scrolled; and below `md`), `element`, `property`, `figma`, `actual`, `result` (`match` or the
deviation it cites: the AA fix, the ink token, the hover decision).

### German walk row (design-notes §2)

One row per screen of spec 008's contract (S1–S22) × width (1440; 320 px at 200 %): `screen`,
`state`, `width`, `english text left` (must be none but content and identifiers), `layout`
(no clip, no overlap, no horizontal scroll), `result`, `fix` (the R9 step applied, if any).

### Review correction (design-notes §3)

`date`, `where` (screen or module), `english`, `german before`, `german after`, `glossary
changed?`, `applied in` (the file). SC-006: every correction applied before release.
