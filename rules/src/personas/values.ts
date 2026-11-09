// The persona's derived values that the main bundle needs (specs/004-rule-test-personas,
// data-model.md "Persona", "Derived"; research R4; FR-005, FR-007, FR-012): whether a value is
// empty, which values differ from their generated ones, which fields the persona shows, and the
// age a date of birth gives, and the data card's rows (spec 008 FR-024). Every function is pure. Bundle rule (research R9, R16): this module
// imports neither `checks/checkedTree.ts`, `checks/text.ts` nor `evaluation.ts`, directly or
// through another module; `branches.ts` and `checks/calendar.ts` reach none of them
import { sameValue } from '../branches';
import { dayNumber, parseDayNumber, yearsAfter } from '../checks/calendar';
import { EXPIRY_DATE_FIELDS } from '../constants';
import type { Persona, PersonaField, PersonaValue } from './types';

/** The variable key of "Licence classes", whose codes decide which class dates show (FR-005) */
const CLASSES_KEY = 'mdl.driving_privileges.classes';

/** The part of a licence class that holds its issue date, whose classes share a row (FR-024) */
const ISSUE_DATE_PART = 'issue_date';

/** The part that holds an expiry date, as `rules/src/messages.ts` recognises one */
const EXPIRY_DATE_PART = 'expiry_date';

/**
 * One row of the data card (spec 008 FR-024; U65 7057:58772, 7057:59186): a field's value, or the
 * licence classes held since one issue date ("B, BE since 02.05.2010"), under the field's label
 */
export interface DataRow {
  /** The field whose label the row shows; "Licence classes" for a row of classes */
  field: PersonaField;
  /** The keys of the values the row shows, for the failing dot (K1) and "· edited" (K2) */
  keys: string[];
  /**
   * A row of classes: the codes held with this issue date, in the order held; `[]` when none is
   * held ("Not shared"). `null` for any other row
   */
  classes: (string | number)[] | null;
  /** The classes' issue date, `YYYY-MM-DD`; `null` where none of theirs is shown */
  since: string | null;
}

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

/**
 * Whether a field holds an expiry date, whose value reads "Valid until <date>" (spec 008 FR-024):
 * the documents' expiry dates and a licence class's
 */
export function isExpiryDate(field: Pick<PersonaField, 'key' | 'part'>): boolean {
  return field.part === EXPIRY_DATE_PART || EXPIRY_DATE_FIELDS.has(field.key);
}

/**
 * The data card's rows (spec 008 FR-024, CLAR #46), in the order of `shownFieldsOf()`: one row per
 * shown field, except that "Licence classes" and the shown issue dates of the classes held become
 * one row per issue date, the classes sharing a date together ("B, BE since 02.05.2010"), the rows
 * in the order of their first class. The classes without a shown issue date (no rule reads it, or
 * it is empty) share one row without a date. A class's expiry date keeps its own row. Without
 * "Licence classes" among the fields, an issue date keeps its own row too
 */
export function dataRowsOf(persona: Persona, fields: readonly PersonaField[]): DataRow[] {
  const shown = shownFieldsOf(persona, fields);
  const classesField = shown.find((field) => field.key === CLASSES_KEY);
  const issueDates = new Map<string, PersonaField>();
  if (classesField) {
    for (const field of shown) {
      if (field.licenceClass !== null && field.part === ISSUE_DATE_PART) {
        issueDates.set(field.licenceClass, field);
      }
    }
  }
  const rows: DataRow[] = [];
  for (const field of shown) {
    if (field === classesField) {
      rows.push(...classRowsOf(persona, field, issueDates));
    } else if (field.licenceClass === null || issueDates.get(field.licenceClass) !== field) {
      rows.push({ field, keys: [field.key], classes: null, since: null });
    }
  }
  return rows;
}

/** The rows of "Licence classes": one per issue date, in the order of their first class */
function classRowsOf(
  persona: Persona,
  classesField: PersonaField,
  issueDates: ReadonlyMap<string, PersonaField>
): DataRow[] {
  const value = persona.values[classesField.key];
  const held = Array.isArray(value) ? value : [];
  if (held.length === 0) {
    return [{ field: classesField, keys: [classesField.key], classes: [], since: null }];
  }
  const bySince = new Map<string | null, { classes: (string | number)[]; keys: string[] }>();
  for (const code of held) {
    const dateField = issueDates.get(String(code));
    const date = dateField ? persona.values[dateField.key] : undefined;
    const since = typeof date === 'string' && parseDayNumber(date) !== null ? date : null;
    const row = bySince.get(since) ?? { classes: [], keys: [classesField.key] };
    bySince.set(since, row);
    row.classes.push(code);
    if (dateField) {
      row.keys.push(dateField.key);
    }
  }
  return [...bySince].map(([since, { classes, keys }]) => ({
    field: classesField,
    keys,
    classes,
    since,
  }));
}
