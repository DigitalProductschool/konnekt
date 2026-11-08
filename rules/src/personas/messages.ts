// The persona texts that depend on data (specs/004-rule-test-personas, research R13;
// contracts/personas.md "messages.ts"; contracts/ui-screens.md "Copy"; design-notes.md §1–§9).
// This module is the only place where they are written; fixed copy sits in `TestStep/constants.ts`.
// Every function is pure.
//
// Conventions (design-notes.md §1): apostrophes are typographic (’); chips and announcements use
// the full name, every other text the first name (§1.1); a possessive is always ’s (§1.1); lists
// read "Mia, Anna and Yusuf", without a serial comma, in the chips' order.
//
// Bundle (research R9, R16): this module is in the main bundle, so it never imports
// `checks/checkedTree.ts`, `checks/literals.ts`, `checks/text.ts`, `evaluation.ts`,
// `personas/fields.ts` or `personas/results.ts`, not even through another module.
import { listOf } from '../checks/findingMessages';
import type { Persona } from './types';

/** What the texts need of a persona: its name */
type Named = Pick<Persona, 'name'>;

/** A question before generating anew (design-notes.md §7) */
export interface ConfirmText {
  title: string;
  body: string;
}

// Names (design-notes.md §1.1)

/** The name, trimmed, up to its first space: "Mia Schulz" gives "Mia", "Anna-Lena" itself */
export function firstName(persona: Named): string {
  return persona.name.trim().split(/\s/, 1)[0];
}

/** Always ’s, also after an s: "Mia’s", "Jonas’s" (design-notes.md §1.1) */
export function possessiveOf(name: string): string {
  return `${name}’s`;
}

/** First names in the given order (the chips'), as a list: "Mia, Anna and Yusuf" */
function firstNamesOf(personas: readonly Named[]): string {
  return listOf(personas.map(firstName));
}

// Dates (spec 008 FR-024, C6): dd.mm.yyyy, as the Test 1 frames write them

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
export function testDayLineOf(today: string): string {
  return `Tested as if shared today, ${displayDateOf(today)}.`;
}

// Citizens row (FR-015; design-notes.md §3.1)

/** A chip's accessible name: "Mia Schulz: meets the rules of Standard" */
export function chipNameOf(persona: Named, branchName: string, meets: boolean): string {
  return `${persona.name}: ${meets ? 'meets' : 'doesn’t meet'} the rules of ${branchName}`;
}

// Persona panel (FR-004, FR-007; design-notes.md §4)

/** The panel's heading: "Mia’s data" */
export function dataHeadingOf(persona: Named): string {
  return `${possessiveOf(firstName(persona))} data`;
}

/**
 * An expiry date's value (spec 008 FR-024, U65 7057:59084): "Valid until 19.08.2040" for
 * `date` as `YYYY-MM-DD`. A date of birth shows no age (FR-024: "08.07.2007")
 */
export function validUntilOf(date: string): string {
  return `Valid until ${displayDateOf(date)}`;
}

/**
 * A row of licence classes held since one issue date (spec 008 FR-024, U65 7057:59186): "B, BE
 * since 02.05.2010" for `classes` "B, BE" and `since` as `YYYY-MM-DD`; the classes alone without
 * an issue date
 */
export function classesSinceOf(classes: string, since: string | null): string {
  return since === null ? classes : `${classes} since ${displayDateOf(since)}`;
}

/** The hidden text before a failing value, at its dot (K1; design-notes.md §4.2) */
export const failingValueHiddenText = 'Fails a rule:';

/** The hidden text after a changed value, in place of the visible "· edited" (K2; §4.2) */
export const editedHiddenText = ', edited';

// Results (FR-015, W10; design-notes.md §6)

/**
 * The results' heading (spec 008 FR-024, U65 7057:58811): "Result: meets the rules" for 0,
 * otherwise "Result: doesn’t meet 1 rule", "Result: doesn’t meet 2 rules". `unmetRules` is the
 * number of rules the persona doesn't meet, as `resultViewOf()` counts them (V4)
 */
export function resultHeadingOf(unmetRules: number): string {
  if (unmetRules === 0) {
    return 'Result: meets the rules';
  }
  return `Result: doesn’t meet ${unmetRules} rule${unmetRules === 1 ? '' : 's'}`;
}

/** The list's heading for a variant the persona meets: "Rules Mia meets" (F3, F14) */
export function meetsHeadingOf(persona: Named): string {
  return `Rules ${firstName(persona)} meets`;
}

/** The message column's heading: "Message Mia reads" */
export function messageColumnOf(persona: Named): string {
  return `Message ${firstName(persona)} reads`;
}

/** A variant without rules (U06; EC "A branch without rules") */
export function noRulesNoteOf(branchName: string): string {
  return (
    `${branchName} has no rules yet, so every citizen meets it. ` +
    'Add rules in the Rules step to test them.'
  );
}

// Questions before generating anew (FR-012, W9; design-notes.md §7)

/** "Generate again" for a persona with changes */
export function confirmOneOf(persona: Named): ConfirmText {
  const name = firstName(persona);
  return {
    title: `Generate new data for ${name}?`,
    body:
      `Your changes to ${possessiveOf(name)} data will be replaced. ` +
      'The other two citizens stay as they are.',
  };
}

/** "Generate all again", naming every persona with changes, in the chips' order */
export function confirmAllOf(changed: readonly Named[]): ConfirmText {
  const names = listOf(changed.map((persona) => possessiveOf(firstName(persona))));
  return {
    title: 'Generate new data for all citizens?',
    body: `Your changes to ${names} data will be replaced.`,
  };
}

// Loading status (FR-004, FR-012, FR-020; design-notes.md §8)

/** A run whose three slots are all free: first open, "Generate all again", "Try again" */
export const creatingAllText = 'Creating 3 sample citizens…';

/** A run for one persona: "Creating new data for Mia…" */
export function creatingOneOf(persona: Named): string {
  return runStatusOf([persona], []);
}

/**
 * The status of a run (design-notes.md §8), from its free slots' personas (`created`) and its
 * filled slots' personas (`added`), each in the chips' order: "Creating new data for Mia and
 * Anna…", "Adding new data for Mia…", "Creating new data for Yusuf. Adding new data for Mia…";
 * `creatingAllText` when all three are free; '' without a slot to generate
 */
export function runStatusOf(created: readonly Named[], added: readonly Named[]): string {
  if (created.length === 3 && added.length === 0) {
    return creatingAllText;
  }
  const parts = [
    ...(created.length > 0 ? [`Creating new data for ${firstNamesOf(created)}`] : []),
    ...(added.length > 0 ? [`Adding new data for ${firstNamesOf(added)}`] : []),
  ];
  return parts.length === 0 ? '' : `${parts.join('. ')}…`;
}

// Failure and announcements (FR-013, FR-017; design-notes.md §9)

/** The failure's hint (F7): "publish" for a new connection, "save" when editing one */
export function failureHintOf(editing: boolean): string {
  return `Try again, or ${editing ? 'save' : 'publish'} without testing.`;
}

/** "Mia Schulz now meets the rules of Standard." (FR-017) */
export function nowMeetsOf(persona: Named, branchName: string): string {
  return `${persona.name} now meets the rules of ${branchName}.`;
}

/** "Mia Schulz no longer meets the rules of Standard." (FR-017) */
export function noLongerMeetsOf(persona: Named, branchName: string): string {
  return `${persona.name} no longer meets the rules of ${branchName}.`;
}
