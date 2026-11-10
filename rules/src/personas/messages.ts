// The persona texts that depend on data (specs/004-rule-test-personas, research R13;
// contracts/personas.md "messages.ts"; contracts/ui-screens.md "Copy"; design-notes.md §1–§9).
// This module is the only place where they are written; fixed copy sits in `TestStep/constants.ts`.
// Every function is pure. Every text exists in English and German (spec 009, research R4;
// glossary §2, §3): the strings and templates sit in `PERSONA_TEXTS`, each export takes a trailing
// `language` (English by default, as the MCP server never passes one), and the personas' names and
// the variants' names are inserted unchanged. Dates are `dd.mm.yyyy` in both languages (FR-012).
//
// Conventions (design-notes.md §1): apostrophes are typographic (’); chips and announcements use
// the full name, every other text the first name (§1.1); a possessive is always ’s (§1.1); lists
// read "Mia, Anna and Yusuf", without a serial comma, in the chips' order. German has no
// genitive of a name: the possessive is "von Mia" after its noun ("Daten von Mia"), and a list
// reads "Mia, Anna und Yusuf".
//
// Bundle (research R9, R16): this module is in the main bundle, so it never imports
// `checks/checkedTree.ts`, `checks/literals.ts`, `checks/text.ts`, `evaluation.ts`,
// `personas/fields.ts` or `personas/results.ts`, not even through another module.
import { listOf } from '../checks/findingMessages';
import { DEFAULT_LANGUAGE, defineTexts, type Language } from '../language';
import type { Persona } from './types';

/** What the texts need of a persona: its name */
type Named = Pick<Persona, 'name'>;

/** A question before generating anew (design-notes.md §7) */
export interface ConfirmText {
  title: string;
  body: string;
}

/** A word's forms by count: `one` for 1, `other` for any other count */
interface PluralForms {
  one: string;
  other: string;
}

/** The outcomes a result row names in words: a met row shows none */
export type NamedOutcome = 'not_met' | 'not_checked';

/** The persona texts of one language */
export interface PersonaTexts {
  /** A name's possessive: "Mia’s" before the noun, "von Mia" after it */
  possessive: (name: string) => string;
  testDayLine: (date: string) => string;
  chipName: (name: string, branchName: string, meets: boolean) => string;
  /** The panel's heading, from the first name's possessive */
  dataHeading: (possessive: string) => string;
  validUntil: (date: string) => string;
  classesSince: (classes: string, date: string) => string;
  failingValueHidden: string;
  editedHidden: string;
  /** The result's heading for a met variant */
  resultMeets: string;
  /** The result's heading for a variant not met, with the count and its noun */
  resultDoesNotMeet: (count: number, rules: string) => string;
  rule: PluralForms;
  meetsHeading: (firstName: string) => string;
  messageColumn: (firstName: string) => string;
  noRulesNote: (branchName: string) => string;
  confirmOneTitle: (firstName: string) => string;
  /** The question for one persona, from the first name's possessive */
  confirmOneBody: (possessive: string) => string;
  confirmAllTitle: string;
  /** The question for every persona with changes, from their first names, in the chips' order */
  confirmAllBody: (firstNames: readonly string[]) => string;
  creatingAll: string;
  /** A run's part for the free slots, from their first names as a list */
  creating: (names: string) => string;
  /** A run's part for the filled slots, from their first names as a list */
  adding: (names: string) => string;
  /** Joins a run's parts and ends the status */
  runStatus: (parts: readonly string[]) => string;
  failureHint: (editing: boolean) => string;
  nowMeets: (name: string, branchName: string) => string;
  noLongerMeets: (name: string, branchName: string) => string;
  outcomes: Record<NamedOutcome, string>;
}

/** The English possessive, always ’s */
const englishPossessive = (name: string): string => `${name}’s`;

/**
 * The persona texts in both languages (spec 009, R4; glossary §2 "sample citizen", "meets",
 * "message", "today in Germany", §3 "persona chips", "Result", "Rules Mia meets"). The English
 * column is spec 004's and spec 008's copy, word for word (FR-014)
 */
export const PERSONA_TEXTS = defineTexts<PersonaTexts>(
  {
    possessive: englishPossessive,
    testDayLine: (date) => `Tested as if shared today, ${date}.`,
    chipName: (name, branchName, meets) =>
      `${name}: ${meets ? 'meets' : 'doesn’t meet'} the rules of ${branchName}`,
    dataHeading: (possessive) => `${possessive} data`,
    validUntil: (date) => `Valid until ${date}`,
    classesSince: (classes, date) => `${classes} since ${date}`,
    failingValueHidden: 'Fails a rule:',
    editedHidden: ', edited',
    resultMeets: 'Result: meets the rules',
    resultDoesNotMeet: (count, rules) => `Result: doesn’t meet ${count} ${rules}`,
    rule: { one: 'rule', other: 'rules' },
    meetsHeading: (firstName) => `Rules ${firstName} meets`,
    messageColumn: (firstName) => `Message ${firstName} reads`,
    noRulesNote: (branchName) =>
      `${branchName} has no rules yet, so every citizen meets it. ` +
      'Add rules in the Rules step to test them.',
    confirmOneTitle: (firstName) => `Generate new data for ${firstName}?`,
    confirmOneBody: (possessive) =>
      `Your changes to ${possessive} data will be replaced. ` +
      'The other two citizens stay as they are.',
    confirmAllTitle: 'Generate new data for all citizens?',
    confirmAllBody: (firstNames) =>
      `Your changes to ${listOf(firstNames.map(englishPossessive))} data will be replaced.`,
    creatingAll: 'Creating 3 sample citizens…',
    creating: (names) => `Creating new data for ${names}`,
    adding: (names) => `Adding new data for ${names}`,
    runStatus: (parts) => `${parts.join('. ')}…`,
    failureHint: (editing) => `Try again, or ${editing ? 'save' : 'publish'} without testing.`,
    nowMeets: (name, branchName) => `${name} now meets the rules of ${branchName}.`,
    noLongerMeets: (name, branchName) => `${name} no longer meets the rules of ${branchName}.`,
    outcomes: { not_met: 'Not met', not_checked: 'Couldn’t be checked' },
  },
  {
    possessive: (name) => `von ${name}`,
    testDayLine: (date) => `Getestet, als würden die Daten heute geteilt: ${date}.`,
    chipName: (name, branchName, meets) =>
      `${name}: erfüllt die Regeln von ${branchName}${meets ? '' : ' nicht'}`,
    dataHeading: (possessive) => `Daten ${possessive}`,
    validUntil: (date) => `Gültig bis ${date}`,
    classesSince: (classes, date) => `${classes} seit ${date}`,
    failingValueHidden: 'Erfüllt eine Regel nicht:',
    editedHidden: ', bearbeitet',
    resultMeets: 'Ergebnis: erfüllt alle Regeln',
    resultDoesNotMeet: (count, rules) => `Ergebnis: erfüllt ${count} ${rules} nicht`,
    rule: { one: 'Regel', other: 'Regeln' },
    meetsHeading: (firstName) => `Regeln, die ${firstName} erfüllt`,
    messageColumn: (firstName) => `Nachricht für ${firstName}`,
    noRulesNote: (branchName) =>
      `${branchName} hat noch keine Regeln und wird daher von allen erfüllt. ` +
      'Fügen Sie im Schritt „Regeln“ Regeln hinzu, um sie zu testen.',
    confirmOneTitle: (firstName) => `Neue Daten für ${firstName} erstellen?`,
    confirmOneBody: (possessive) =>
      `Ihre Änderungen an den Daten ${possessive} werden ersetzt. ` +
      'Die beiden anderen Beispielpersonen bleiben unverändert.',
    confirmAllTitle: 'Neue Daten für alle Beispielpersonen erstellen?',
    confirmAllBody: (firstNames) =>
      `Ihre Änderungen an den Daten von ${listOf(firstNames, 'and', 'de')} werden ersetzt.`,
    creatingAll: '3 Beispielpersonen werden erstellt …',
    creating: (names) => `Neue Daten für ${names} werden erstellt`,
    adding: (names) => `Neue Daten für ${names} werden ergänzt`,
    runStatus: (parts) => `${parts.join('. ')} …`,
    failureHint: (editing) =>
      `Versuchen Sie es erneut oder ${editing ? 'speichern' : 'veröffentlichen'} Sie, ` +
      'ohne zu testen.',
    nowMeets: (name, branchName) => `${name} erfüllt jetzt die Regeln von ${branchName}.`,
    noLongerMeets: (name, branchName) => `${name} erfüllt die Regeln von ${branchName} nicht mehr.`,
    outcomes: { not_met: 'Nicht erfüllt', not_checked: 'Konnte nicht geprüft werden' },
  }
);

// Names (design-notes.md §1.1)

/** The name, trimmed, up to its first space: "Mia Schulz" gives "Mia", "Anna-Lena" itself */
export function firstName(persona: Named): string {
  return persona.name.trim().split(/\s/, 1)[0];
}

/**
 * Always ’s, also after an s: "Mia’s", "Jonas’s" (design-notes.md §1.1). German has no genitive
 * of a name here: "von Mia", placed after its noun ("Daten von Mia")
 */
export function possessiveOf(name: string, language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].possessive(name);
}

/** First names in the given order (the chips'), as a list: "Mia, Anna and Yusuf" */
function firstNamesOf(personas: readonly Named[], language: Language): string {
  return listOf(personas.map(firstName), 'and', language);
}

// Dates (spec 008 FR-024, C6): dd.mm.yyyy, as the Test 1 frames write them, in both languages

/** `YYYY-MM-DD` as `dd.mm.yyyy` ("08.07.2007"); anything else unchanged */
export function displayDateOf(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return iso;
  }
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

// The test day (FR-016, W1; spec 008 FR-024)

/** "Tested as if shared today, 01.11.2026." for `today` as `YYYY-MM-DD` */
export function testDayLineOf(today: string, language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].testDayLine(displayDateOf(today));
}

// Citizens row (FR-015; design-notes.md §3.1)

/** A chip's accessible name: "Mia Schulz: meets the rules of Standard" */
export function chipNameOf(
  persona: Named,
  branchName: string,
  meets: boolean,
  language: Language = DEFAULT_LANGUAGE
): string {
  return PERSONA_TEXTS[language].chipName(persona.name, branchName, meets);
}

// Persona panel (FR-004, FR-007; design-notes.md §4)

/** The panel's heading: "Mia’s data" */
export function dataHeadingOf(persona: Named, language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].dataHeading(possessiveOf(firstName(persona), language));
}

/**
 * An expiry date's value (spec 008 FR-024, U65 7057:59084): "Valid until 19.08.2040" for
 * `date` as `YYYY-MM-DD`. A date of birth shows no age (FR-024: "08.07.2007")
 */
export function validUntilOf(date: string, language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].validUntil(displayDateOf(date));
}

/**
 * A row of licence classes held since one issue date (spec 008 FR-024, U65 7057:59186): "B, BE
 * since 02.05.2010" for `classes` "B, BE" and `since` as `YYYY-MM-DD`; the classes alone without
 * an issue date
 */
export function classesSinceOf(
  classes: string,
  since: string | null,
  language: Language = DEFAULT_LANGUAGE
): string {
  return since === null
    ? classes
    : PERSONA_TEXTS[language].classesSince(classes, displayDateOf(since));
}

/** The hidden text before a failing value, at its dot (K1; design-notes.md §4.2): "Fails a rule:" */
export function failingValueHiddenTextOf(language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].failingValueHidden;
}

/** The hidden text after a changed value, in place of the visible "· edited" (K2; §4.2) */
export function editedHiddenTextOf(language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].editedHidden;
}

// Results (FR-015, W10; design-notes.md §6)

/**
 * The results' heading (spec 008 FR-024, U65 7057:58811): "Result: meets the rules" for 0,
 * otherwise "Result: doesn’t meet 1 rule", "Result: doesn’t meet 2 rules". `unmetRules` is the
 * number of rules the persona doesn't meet, as `resultViewOf()` counts them (V4)
 */
export function resultHeadingOf(unmetRules: number, language: Language = DEFAULT_LANGUAGE): string {
  const texts = PERSONA_TEXTS[language];
  if (unmetRules === 0) {
    return texts.resultMeets;
  }
  return texts.resultDoesNotMeet(unmetRules, plural(texts.rule, unmetRules));
}

/** The list's heading for a variant the persona meets: "Rules Mia meets" (F3, F14) */
export function meetsHeadingOf(persona: Named, language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].meetsHeading(firstName(persona));
}

/** The message column's heading: "Message Mia reads" */
export function messageColumnOf(persona: Named, language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].messageColumn(firstName(persona));
}

/** A row's outcome in words, for a row that isn't met: "Not met", "Couldn’t be checked" */
export function outcomeNameOf(
  outcome: NamedOutcome,
  language: Language = DEFAULT_LANGUAGE
): string {
  return PERSONA_TEXTS[language].outcomes[outcome];
}

/** A variant without rules (U06; EC "A branch without rules") */
export function noRulesNoteOf(branchName: string, language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].noRulesNote(branchName);
}

// Questions before generating anew (FR-012, W9; design-notes.md §7)

/** "Generate again" for a persona with changes */
export function confirmOneOf(persona: Named, language: Language = DEFAULT_LANGUAGE): ConfirmText {
  const texts = PERSONA_TEXTS[language];
  const name = firstName(persona);
  return {
    title: texts.confirmOneTitle(name),
    body: texts.confirmOneBody(possessiveOf(name, language)),
  };
}

/** "Generate all again", naming every persona with changes, in the chips' order */
export function confirmAllOf(
  changed: readonly Named[],
  language: Language = DEFAULT_LANGUAGE
): ConfirmText {
  const texts = PERSONA_TEXTS[language];
  return {
    title: texts.confirmAllTitle,
    body: texts.confirmAllBody(changed.map(firstName)),
  };
}

// Loading status (FR-004, FR-012, FR-020; design-notes.md §8)

/** A run whose three slots are all free: first open, "Generate all again", "Try again" */
export function creatingAllTextOf(language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].creatingAll;
}

/** A run for one persona: "Creating new data for Mia…" */
export function creatingOneOf(persona: Named, language: Language = DEFAULT_LANGUAGE): string {
  return runStatusOf([persona], [], language);
}

/**
 * The status of a run (design-notes.md §8), from its free slots' personas (`created`) and its
 * filled slots' personas (`added`), each in the chips' order: "Creating new data for Mia and
 * Anna…", "Adding new data for Mia…", "Creating new data for Yusuf. Adding new data for Mia…";
 * `creatingAllTextOf()` when all three are free; '' without a slot to generate
 */
export function runStatusOf(
  created: readonly Named[],
  added: readonly Named[],
  language: Language = DEFAULT_LANGUAGE
): string {
  const texts = PERSONA_TEXTS[language];
  if (created.length === 3 && added.length === 0) {
    return texts.creatingAll;
  }
  const parts = [
    ...(created.length > 0 ? [texts.creating(firstNamesOf(created, language))] : []),
    ...(added.length > 0 ? [texts.adding(firstNamesOf(added, language))] : []),
  ];
  return parts.length === 0 ? '' : texts.runStatus(parts);
}

// Failure and announcements (FR-013, FR-017; design-notes.md §9)

/** The failure's hint (F7): "publish" for a new connection, "save" when editing one */
export function failureHintOf(editing: boolean, language: Language = DEFAULT_LANGUAGE): string {
  return PERSONA_TEXTS[language].failureHint(editing);
}

/** "Mia Schulz now meets the rules of Standard." (FR-017) */
export function nowMeetsOf(
  persona: Named,
  branchName: string,
  language: Language = DEFAULT_LANGUAGE
): string {
  return PERSONA_TEXTS[language].nowMeets(persona.name, branchName);
}

/** "Mia Schulz no longer meets the rules of Standard." (FR-017) */
export function noLongerMeetsOf(
  persona: Named,
  branchName: string,
  language: Language = DEFAULT_LANGUAGE
): string {
  return PERSONA_TEXTS[language].noLongerMeets(persona.name, branchName);
}

/** A word's form for `count`: `one` for 1, `other` otherwise */
function plural(forms: PluralForms, count: number): string {
  return count === 1 ? forms.one : forms.other;
}
