// The applicants of `test_applicants` (research R15; data-model §9; FR-034): each one's values
// checked against the variant's applicant fields as the test step's editor takes them, and turned
// into the evaluator's `Applicant` as the test step does for a persona (`applicantOf()`). Pure: no
// value, applicant or refusal is stored or logged here (FR-035), and a refusal names the field and
// the kind it expects, never the value given
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import { LICENCE_CLASSES_SET } from '@connection-portal/rules/constants';
import { isValidIsoDate } from '@connection-portal/rules/dates';
import type { Applicant } from '@connection-portal/rules/evaluation';
import { applicantOf } from '@connection-portal/rules/personas/applicant';
import type { Persona, PersonaField, PersonaValue } from '@connection-portal/rules/personas/types';

import type { ApplicantField } from './views';

/** One applicant as `test_applicants` takes it: an optional name, and values by field key */
export interface TestApplicant {
  name?: string;
  values: Readonly<Record<string, unknown>>;
}

export const APPLICANT_MESSAGES = {
  /** "Applicant 'Anna'", or "Applicant 2" by its 1-based position for one without a name */
  applicant: (name: string | undefined, position: number) =>
    name !== undefined && name.trim() !== '' ? `Applicant '${name}'` : `Applicant ${position}`,
  /** A value that doesn't fit its field's kind: `expected` is one of the `expected*` texts */
  doesNotFit: (who: string, key: string, expected: string) =>
    `${who}: '${key}' expects ${expected}.`,
  unknownKey: (who: string, key: string, known: readonly string[]) =>
    `${who}: the variant's rules don't check '${key}'. ` +
    (known.length > 0 ? `They check: ${known.join(', ')}.` : 'They check no data.'),
  expectedNumber: 'a number',
  expectedText: 'a text',
  expectedValue: (set: string) => `one of the values of ${set}`,
  expectedValues: (set: string) => `a list of the values of ${set}`,
  expectedDate: 'a date as YYYY-MM-DD',
  expectedLicenceClasses: 'a list of licence classes',
} as const;

/** What an enum's refusal names when its field has no value set (the catalog always gives one) */
const ITS_VALUE_SET = 'its value set';

/**
 * The first refusal of an applicant's values, or null when every value fits (FR-034). The values
 * are checked in the order given:
 * - a key that isn't one of `fields`' is refused with the known keys, in `fields`' order;
 * - a value is checked against its field's kind as the test step's editor takes it: a finite
 *   number; a non-empty text; a value of the value set, or a list of them for a field that takes
 *   several; a `YYYY-MM-DD` date the calendar has; a list of class codes for the licence classes.
 *   An enum whose value set isn't in `optionSets` takes any text or number.
 * - `null`, and an empty list where a list is expected, stand for a document that doesn't give
 *   the value, as a key left out does: the evaluation reads it as missing data.
 *
 * `position` is the applicant's 1-based place in the call, which names an applicant without a
 * name. Returns the message rather than throwing, so that the tool checks every applicant before
 * evaluating any and answers the first refusal as the tool error `validation`
 */
export function checkApplicant(
  fields: readonly ApplicantField[],
  applicant: TestApplicant,
  optionSets: readonly OptionSet[],
  position: number
): string | null {
  const who = APPLICANT_MESSAGES.applicant(applicant.name, position);
  for (const [key, value] of Object.entries(applicant.values)) {
    const field = fields.find((entry) => entry.key === key);
    if (!field) {
      return APPLICANT_MESSAGES.unknownKey(
        who,
        key,
        fields.map((entry) => entry.key)
      );
    }
    const expected = value === null ? null : refusedKindOf(field, value, optionSets);
    if (expected !== null) {
      return APPLICANT_MESSAGES.doesNotFit(who, key, expected);
    }
  }
  return null;
}

/**
 * The evaluator's `Applicant` for values that `checkApplicant()` accepted, built by
 * `applicantOf()` as the test step builds it for a persona with these values: by document type,
 * the place of birth's parts as one object, one `driving_privileges` entry per class held with
 * that class's dates, and no entry for a key left out, `null`, `''` or `[]`. Keys that aren't
 * `fields`' are ignored
 */
export function toApplicant(
  fields: readonly ApplicantField[],
  values: Readonly<Record<string, unknown>>
): Applicant {
  const persona: Persona = {
    id: 'persona-1',
    name: '',
    values: values as Record<string, PersonaValue>,
    generated: {},
    status: 'ready',
  };
  return applicantOf(persona, fields.map(personaFieldOf));
}

/** The text of what `field` expects when `value` (not null) doesn't fit it, or null when it does */
function refusedKindOf(
  field: ApplicantField,
  value: unknown,
  optionSets: readonly OptionSet[]
): string | null {
  switch (field.kind) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? null
        : APPLICANT_MESSAGES.expectedNumber;
    case 'text':
      return typeof value === 'string' && value !== '' ? null : APPLICANT_MESSAGES.expectedText;
    case 'date':
      return isValidIsoDate(value) ? null : APPLICANT_MESSAGES.expectedDate;
    case 'enum':
      return refusedEnumKindOf(field, value, optionSets);
  }
}

function refusedEnumKindOf(
  field: ApplicantField,
  value: unknown,
  optionSets: readonly OptionSet[]
): string | null {
  const setKey = field.option_set;
  const set = optionSets.find((entry) => entry.key === setKey);
  const isOption = (entry: unknown): boolean =>
    set
      ? set.options.some((option) => option.value === entry)
      : typeof entry === 'string' || typeof entry === 'number';
  if (!field.multiple) {
    return isOption(value) ? null : APPLICANT_MESSAGES.expectedValue(setKey ?? ITS_VALUE_SET);
  }
  if (Array.isArray(value) && value.every(isOption)) {
    return null;
  }
  return setKey === LICENCE_CLASSES_SET
    ? APPLICANT_MESSAGES.expectedLicenceClasses
    : APPLICANT_MESSAGES.expectedValues(setKey ?? ITS_VALUE_SET);
}

/**
 * The persona field `applicantOf()` reads for an applicant field: its document type, field, part
 * and class, from the variable key (`variableKey()`: `document_type.field[.part][#class]`, whose
 * document type and field keys have no dots), and the rest as `get_variant` lists it
 */
function personaFieldOf(field: ApplicantField): PersonaField {
  const [path] = field.key.split('#');
  const [documentType, fieldKey, ...part] = path.split('.');
  return {
    key: field.key,
    documentType,
    documentLabel: '',
    label: field.label,
    field: fieldKey,
    part: part.length > 0 ? part.join('.') : null,
    licenceClass: field.licence_class ?? null,
    kind: field.kind,
    optionSet: field.option_set ?? null,
    multiple: field.multiple,
    dateOfBirth: false,
  };
}
