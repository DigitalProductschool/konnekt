// The persona's derived values that the main bundle needs (specs/004-rule-test-personas,
// data-model.md "Persona", "Derived"; research R4; FR-005, FR-007, FR-012): whether a value is
// empty, which values differ from their generated ones, which fields the persona shows, and the
// age a date of birth gives. Every function is pure. Bundle rule (research R9, R16): this module
// imports neither `checks/checkedTree.ts`, `checks/text.ts` nor `evaluation.ts`, directly or
// through another module; `branches.ts` and `checks/calendar.ts` reach none of them
import { sameValue } from '../branches';
import { dayNumber, parseDayNumber, yearsAfter } from '../checks/calendar';
import type { Persona, PersonaField, PersonaValue } from './types';

/** The variable key of "Licence classes", whose codes decide which class dates show (FR-005) */
const CLASSES_KEY = 'mdl.driving_privileges.classes';

/** Whether a value is empty: `null`, `''` or `[]`, a document that doesn't give it (FR-006) */
export function isEmptyValue(value: PersonaValue | undefined): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * The fields shown for this persona, in the order of `fields`: every field, except a licence
 * class's date while the persona's "Licence classes" doesn't include its class (FR-005, W4). The
 * hidden date stays in `values`, so that it comes back with the class
 */
export function shownFieldsOf(persona: Persona, fields: readonly PersonaField[]): PersonaField[] {
  const classes = persona.values[CLASSES_KEY];
  const held = Array.isArray(classes) ? classes : [];
  return fields.filter((field) => field.licenceClass === null || held.includes(field.licenceClass));
}

/**
 * The keys of the shown fields whose value differs from the generated one, by `sameValue()`, in
 * the order of `fields` (K2, FR-012). Hidden values, of fields no longer checked or of classes
 * not held, are never counted
 */
export function changedKeys(persona: Persona, fields: readonly PersonaField[]): string[] {
  return shownFieldsOf(persona, fields)
    .map((field) => field.key)
    .filter((key) => !sameValue(persona.values[key], persona.generated[key]));
}

/**
 * The age a date of birth gives on `today` (`YYYY-MM-DD`), as the evaluator counts it: the
 * largest N for which `yearsAfter(dateOfBirth, N)` is on or before today, so that 29 February
 * reaches the next age on 1 March in years without it (FR-007). `null` for an empty value or one
 * that isn't a date. A date of birth after today gives a negative number, the same count taken
 * backwards (design-notes §4.1: "not born yet"). Throws a `RangeError` when `today` isn't a date
 */
export function ageOn(dateOfBirth: PersonaValue | undefined, today: string): number | null {
  const birth = parseDayNumber(dateOfBirth);
  if (birth === null) {
    return null;
  }
  const day = dayNumber(today);
  const [birthYear, birthMonthDay] = splitDate(dateOfBirth as string);
  const [todayYear, todayMonthDay] = splitDate(today);
  const years = todayYear - birthYear;
  if (years >= 0) {
    return yearsAfter(birth, years) <= day ? years : years - 1;
  }
  // Born after today, at least a year ahead: count the same way below 0
  return todayMonthDay >= birthMonthDay ? years : years - 1;
}

/** A `YYYY-MM-DD` date's year, and its month and day as `MM-DD` for comparing */
function splitDate(date: string): [number, string] {
  return [Number(date.slice(0, 4)), date.slice(5)];
}
