# Contract: the rules package's texts in two languages

**Requirements**: FR-006, FR-007, FR-012, FR-014, FR-017. **Decisions**: research R1, R4, R5, R8,
R10. **Consumers**: `frontend/` (passes the language), `mcp/` (never passes one: English).

## `rules/src/language.ts` (new)

```ts
export type Language = 'en' | 'de';
export const LANGUAGES: readonly Language[] = ['en', 'de'];
export const DEFAULT_LANGUAGE: Language = 'en';
export const languageNames: Record<Language, string> = { en: 'English', de: 'Deutsch' };
export const isLanguage = (value: unknown): value is Language => …;
export const defineTexts = <T>(en: T, de: T): Record<Language, T> => ({ en, de });
```

Imported by `frontend/` and `mcp/` as `@konnekt/rules/language` (the package's
`./*` export covers it). No other module of `rules/src/` imports anything new.

## The language on the context

`RuleContext` (`types.ts`) gains `language?: Language` (default `'en'`). Every function that takes
a `RuleContext` composes in `ctx.language ?? DEFAULT_LANGUAGE`:

| Function | Module | German example (glossary §3) |
|---|---|---|
| `statementOf`, `statementPartsOf`, `predicateOf`, `predicatePartsOf` | `statements.ts` | "Personalausweis · Alter (Geburtsdatum) ist mindestens 21 Jahre alt" |
| `proposedMessage` | `messages.ts` | "Sie müssen mindestens 21 Jahre alt sein." |
| `ruleProblem`, `firstProblem` | `validation.ts` | "Rule 01 in Standard: Wählen Sie die zu prüfenden Daten aus." |
| `resultViewOf` | `personas/results.ts` | heading "Ergebnis: erfüllt 2 Regeln nicht" |
| `personaFieldsOf` | `personas/fields.ts` | labels from the (German) catalog in the context |
| `droppedDataOf` | `dropped.ts` | `${documentLabel} – ${field}` with the context's labels |

The frontend builds the context once per language and catalog (`useMemo` on documents, option
sets and `language`), so a switch rebuilds it and every composed text follows.

## The language as a trailing parameter

Composers without a context take `language: Language = DEFAULT_LANGUAGE` last:

| Function | Module |
|---|---|
| `noteOf`, `resolutionOf`, `noticeText`, `countsOf`, `bannerOf`, `tabLabelOf`, `tabFindingsOf`, `dialogLineOf`, `kindTextOf`, `listOf`, `textOf`, `announcementOf` | `checks/findingMessages.ts` |
| `announcementsFor` (through `AnnouncementContext.language`) | `checks/announcements.ts`, used by `checks/runState.ts` |
| `nameProblem`, `variantNameProblem`, `reservedNameProblem`, `groupProblem` | `validation.ts` |
| `labelOf(definition, language)` (new; `OperatorDefinition.label` stays the English word for the MCP's `tools/catalog.ts`), `suffixOf` | `conditions.ts`, `constants.ts` |
| `formatDate`, `boundaryPhrase` | `dates.ts` ("23 Oct 2005" / "23.10.2005") |
| `licenceClassLabel`, `ruleFieldLabel` | `statements.ts` ("Licence class B" / "Führerscheinklasse B") |
| `defaultRuleName`, `defaultGroupName`, `nounOf` | `tree.ts`: **unchanged**, English stored names (FR-007); `nounOf` gets a German twin `nounTextOf(noun, language)` for sentences only |
| every export of `personas/messages.ts`; `announcementOf` of `personas/announcements.ts` (through the state's input); `GROUP_SUBTITLES[language]` | `personas/` |
| `RULES_MESSAGES[language]`, `CONDITION_PROBLEM_MESSAGES[language]`, `EDIT_MESSAGES[language]`, `RELATION_WORDS[language]`, `DATE_OF_BIRTH_RULE_LABEL[language]` | `constants.ts` (tables) |

Defaults make every existing call site compile and behave as today; the MCP server passes no
language anywhere.

## Texts as tables

Each module keeps its strings and templates in `defineTexts(en, de)` in the same module, or in a
sibling `<module>Texts.ts` where the module is long (`checks/findingTexts.ts` for
`findingMessages.ts`). The German column holds German templates with German structure:

```ts
const MESSAGE_TEXTS = defineTexts(
  { atLeastYearsOld: (years: number) => `You need to be at least ${years} years old.`, … },
  { atLeastYearsOld: (years: number) => `Sie müssen mindestens ${years} Jahre alt sein.`, … }
);
```

Rules for the German column:

- Plural forms are explicit (`one` / `other` per word), never "append s".
- `lowerFirst()` is English-only; German templates place catalog labels where a capitalised noun
  fits ("Ihr Geburtsdatum …", "Ihre Staatsangehörigkeit …").
- Quoted values use „…“; lists join with ", " and " und " / " oder ".
- Fragments the composer slices on (`CONTRADICT`) come from the table, per language.
- Stored names ("Rule 02", "Standard", variant names) are inserted unchanged.
- `MONTH_ABBREVIATIONS` stay English for `formatDate('en')`; German dates are `dd.mm.yyyy`.

## Codes beside messages (R10)

`RulesProblem` and the condition problems gain `code`, the key of their message in the table.
Callers branch on `code`: `frontend/src/pages/FormConnectionEditor/RulesStep/TreeItem.tsx`,
`RulesStep/utils.ts`, `mcp/src/findings.ts`, `mcp/src/tools/checks.ts`. The editor's "message is
the proposal" check tests the stored message against `proposedMessage()` in every language
(`LANGUAGES.some(…)`), so an untouched proposal follows a switch and a saved message is shown as
saved (FR-007).

## Tests

- Every English sentence assertion stays; a German case is added beside it in the same file,
  with the glossary's sentences: `statements`, `messages`, `validation`, `conditions`, `dates`,
  `dropped`, `checks/findingMessages`, `checks/announcements`, `checks/runState`,
  `personas/messages`, `personas/results`, `personas/announcements`, `personas/personaState`,
  `personas/scenarios`, `checks/scenarios`.
- `rules/src/copy.test.ts`: every table complete and translated (the same allowlist idea as the
  frontend's).
- `validation.test.ts` renders the parity cases of `rules/src/fixtures/server-messages.json` in
  both languages ([api-language.md](api-language.md)).
- `npm test -w mcp` unchanged and green.
- The generated `checks/caseFolding.ts` and `checks/fixtures/evaluator-vectors.json` hold no UI
  copy and are not touched (CLAUDE.md "Never").
