// Values from a model (specs/004-rule-test-personas, research R7 "Values", "Class dates", "Names";
// data-model.md "Persona field", "Persona value"; FR-009, FR-010, EC "Fields that describe the
// same fact", EC "Unlikely values"): `sampleValues()` gives a persona a value for every persona
// field, so that every literal of the slot's model holds on it.
//
// For each field, candidates are tried in order of preference, and the first one that meets every
// literal of the model on the field's variable wins, as judged by the theory's `holds()` (spec
// 003's theories, the evaluator's comparisons):
// 1. agreement: with the pairs of `constants.ts` (a second date of birth, "Age in years" and "Year
//    of birth" from the date of birth, a city, postal code, region, country or nationality from
//    its counterpart) and the given and family name from the persona's name (W12);
// 2. order: no issue date before the date of birth, no expiry date before the issue date of the
//    same document or class. The plausible ranges keep it, and a first pass over the candidates
//    prefers those that keep it, and those that let the fields still to come agree;
// 3. plausible random values by field (`samples.ts`, `constants.ts`), first from the plausible
//    range, then from the part of it that the model's literals leave;
// 4. boundary values of the model's literals: each constant and its neighbours, each date
//    threshold for today and the days next to it;
// 5. the theory's `decide()` witness, so that a value always exists.
//
// Fixed values (kept and filled slots) are never changed, and the other fields agree with them.
// Class dates get a value whether or not the class is held (W4). Every value is of its field's
// kind (`PersonaValue`). Pure: every random choice comes from the `Random` passed in. The module
// reaches `checks/text.ts`, so it runs in the worker only (tasks.md, "Bundle")
import type { Option, OptionSet } from '@connection-portal/api-types/option-sets';

import {
  dayNumber,
  isoDate,
  monthsAfter,
  parseDayNumber,
  yearsAfter,
  yearsAgoThreshold,
} from '../checks/calendar';
import { FIRST_DAY, LAST_DAY } from '../checks/constants';
import { dateTheory } from '../checks/dateTheory';
import { enumTheory } from '../checks/enumTheory';
import { numberTheory } from '../checks/numberTheory';
import { normalisedText } from '../checks/text';
import { textTheory } from '../checks/textTheory';
import type { DateTest, EnumValue, Literal, TheoryAnswer, Variable } from '../checks/types';
import {
  AGREEING_FIELDS,
  FROM_DATE_OF_BIRTH,
  FROM_NAME,
  HEIGHT_FIELD,
  MAX_AGE,
  MAX_EXPIRY_YEARS_AHEAD,
  MAX_HEIGHT_CM,
  MAX_ISSUE_YEARS_AGO,
  MAX_WEIGHT_KG,
  MIN_AGE,
  MIN_EXPIRY_YEARS_AGO,
  MIN_HEIGHT_CM,
  MIN_WEIGHT_KG,
  WEIGHT_FIELD,
} from './constants';
import type { Random } from './random';
import {
  FAMILY_NAMES,
  GIVEN_NAMES,
  HOME_TOWNS,
  makeSampleContext,
  type SampleContext,
  sampleFor,
} from './samples';
import type { Model, PersonaField, PersonaValue } from './types';
import { ageOn, isEmptyValue } from './values';

/** What `sampleValues()` reads */
export interface SamplingInput {
  /** The persona fields (`personaFieldsOf()`), in display order: a value comes back for each */
  fields: readonly PersonaField[];
  /**
   * The run's variables by key (`mergedVariablesOf()`), for the theories' witnesses. A field
   * without a variable gets one built from the field and its value set
   */
  variables: Readonly<Record<string, Variable>>;
  /** The value sets (`RuleContext.optionSets`): an enum's values are its options' values */
  optionSets: readonly OptionSet[];
  /**
   * The slot's model (`modelOf()`): per variable key, the literals its value must meet. `{}` for
   * the fallback without planning, which gives plausible values only
   */
  model: Model;
  /** The persona's name ("Mia Schulz"): the given and family name fields follow it (FR-009) */
  name: string;
  /** `YYYY-MM-DD`, the calendar date in Germany */
  today: string;
  random: Random;
  /**
   * Values that stay as they are (a kept slot's, a filled slot's present ones), hidden ones
   * included: they come back unchanged for the fields among `fields`, and the other fields agree
   * with them
   */
  fixed?: Readonly<Record<string, PersonaValue>>;
}

/** How a field's value relates to the others, which decides the order fields are sampled in */
type Role = 'birth' | 'derived' | 'issue' | 'expiry' | 'other';

/** The order in which the roles are sampled: each one's sources come before it */
const ROLE_ORDER: readonly Role[] = ['birth', 'derived', 'issue', 'expiry', 'other'];

/**
 * The fields that hold an expiry date, and the field of the same document or class that holds its
 * issue date: `pid.date_of_expiry` → `pid.date_of_issuance`, `mdl.expiry_date` →
 * `mdl.issue_date`, `mdl.driving_privileges.expiry_date#B` → `…issue_date#B`
 */
const EXPIRY_TO_ISSUE: readonly (readonly [RegExp, string])[] = [
  [/(^|\.)date_of_expiry(#|$)/, '$1date_of_issuance$2'],
  [/(^|\.)expiry_date(#|$)/, '$1issue_date$2'],
];

/** The fields that hold an issue date, the counterpart of `EXPIRY_TO_ISSUE` */
const ISSUE_TO_EXPIRY: readonly (readonly [RegExp, string])[] = [
  [/(^|\.)date_of_issuance(#|$)/, '$1date_of_expiry$2'],
  [/(^|\.)issue_date(#|$)/, '$1expiry_date$2'],
];

/** The document type of the driving licence, whose issue dates follow the driving age */
const DRIVING_LICENCE = 'mdl';

/**
 * The earliest age at which a driving licence, or a class of it, is plausibly issued: accompanied
 * driving from 17. Other documents can be issued from birth
 */
const DRIVING_FROM_AGE = 17;

/** The calendar's last year */
const LAST_YEAR = 9999;

/** The plausible range of a number field that `constants.ts` gives none (none in the catalog) */
const OTHER_NUMBER_RANGE: readonly [number, number] = [1, 100];

/** A text for a text field that `samples.ts` has no pool for (none in the catalog) */
const OTHER_TEXT = 'Beispiel';

/** Plausible random draws from a field's plausible range, before the range the literals leave */
const PLAUSIBLE_DRAWS = 4;

/** The index of the plausible values among a field's groups of candidates: the fallback */
const PLAUSIBLE_GROUP = 1;

/** Random draws from the part of the plausible range that the literals leave */
const RANGE_DRAWS = 4;

/** The variable keys of the home town's town and postal code, which belong together */
const TOWN_KEYS: readonly string[] = ['pid.address_locality', 'mdl.resident_city'];
const POSTAL_CODE_KEYS: readonly string[] = ['pid.address_postal_code', 'mdl.resident_postal_code'];

/** An enum's value set, as the theories compare its values */
interface EnumSet {
  /** The options' values, in set order */
  codes: (string | number)[];
  /** A value as the evaluator compares it (`_enum_key()`), or null when it can't be read */
  keyOf: (value: unknown) => EnumValue | null;
  /** The first option's value with this key */
  codeOf: (key: EnumValue) => string | number | undefined;
}

/** What sampling one persona shares across its fields */
interface Sampling {
  input: SamplingInput;
  /** The fields by key */
  fieldsByKey: ReadonlyMap<string, PersonaField>;
  /** The values so far: the fixed ones, then each field as it is sampled */
  values: Record<string, PersonaValue>;
  /** Today's day number */
  day: number;
  context: SampleContext;
  /** The value sets by key, computed once */
  enumSets: Map<string, EnumSet | null>;
}

/**
 * A value for every persona field of `input.fields`, by field key, such that every literal of
 * `input.model` on a field's variable holds on it, whenever the literals can be met: the first
 * candidate that meets them (agreement, then plausible values, then boundary values, then the
 * theory's witness; see above). Fixed values come back unchanged. With an empty model (the
 * fallback), the values are plausible: dates of birth for ages 18 to 80, agreeing fields equal,
 * issue and expiry dates in order. A literal on a variable that isn't a field is ignored.
 *
 * Every value is of its field's kind: a whole number from 0, a text that isn't empty, a
 * `YYYY-MM-DD` date, an option's value for a single-value enum and a list of them, in set order,
 * for one that holds several. An enum whose value set isn't loaded or is empty gets `null` (or
 * `[]`), the only empty values it gives. When the literals of a field can't be met (an
 * inconsistent model, or the text corner's 'unknown'), the field gets its plausible value, and the
 * final evaluation counts what that gives
 */
export function sampleValues(input: SamplingInput): Record<string, PersonaValue> {
  const fixed = input.fixed ?? {};
  const fieldsByKey = new Map(input.fields.map((field) => [field.key, field]));
  const state: Sampling = {
    input,
    fieldsByKey,
    values: { ...fixed },
    day: dayNumber(input.today),
    context: makeSampleContext(input.random, input.name),
    enumSets: new Map(),
  };
  state.context = withHomeTown(state, state.context);
  const free = input.fields.filter((field) => !Object.hasOwn(fixed, field.key));
  for (const role of ROLE_ORDER) {
    for (const field of free) {
      if (roleOf(field) === role) {
        state.values[field.key] = sampleField(field, state);
      }
    }
  }
  const result: Record<string, PersonaValue> = {};
  for (const field of input.fields) {
    result[field.key] = state.values[field.key];
  }
  return result;
}

// One field

/**
 * The first candidate that meets the field's literals; see `sampleValues()`. The candidates are
 * made group by group, in order of preference, and only as far as the first pass needs them: a
 * value that agrees and meets the literals costs no boundary values or witness
 */
function sampleField(field: PersonaField, state: Sampling): PersonaValue {
  const literals = literalsOf(field.key, state);
  const groups: (() => PersonaValue[])[] = [
    () => agreementCandidates(field, state),
    () => plausibleCandidates(field, state),
    () => (roleOf(field) === 'birth' ? birthsFromCompanions(field, state) : []),
    () => rangeCandidates(field, literals, state),
    () => boundaryCandidates(field, literals, state),
    () => witnessCandidates(field, literals, state),
  ];
  const preferred = preferenceOf(field, state);
  const meets = (value: PersonaValue) => meetsAll(field, literals, value, state);
  const candidates: PersonaValue[] = [];
  const seen = new Set<string>();
  let plausible: PersonaValue | undefined;
  for (const [index, group] of groups.entries()) {
    for (const value of group()) {
      const key = JSON.stringify(value);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      if (meets(value) && preferred(value)) {
        return value;
      }
      candidates.push(value);
      if (index === PLAUSIBLE_GROUP && plausible === undefined) {
        plausible = value;
      }
    }
  }
  return candidates.find(meets) ?? plausible ?? candidates[0] ?? emptyOf(field);
}

/** The model's literals on the field's variable */
function literalsOf(key: string, state: Sampling): readonly Literal[] {
  return Object.hasOwn(state.input.model, key) ? state.input.model[key] : [];
}

/** The role of a field: what its value follows */
function roleOf(field: PersonaField): Role {
  if (field.kind === 'date' && field.dateOfBirth) {
    return 'birth';
  }
  if (Object.hasOwn(FROM_DATE_OF_BIRTH, field.key)) {
    return 'derived';
  }
  if (field.kind === 'date') {
    return counterpartOf(field.key, EXPIRY_TO_ISSUE) === null ? 'issue' : 'expiry';
  }
  return 'other';
}

/** The key that a pattern of `pairs` turns `key` into, or null when none matches */
function counterpartOf(key: string, pairs: readonly (readonly [RegExp, string])[]): string | null {
  for (const [pattern, replacement] of pairs) {
    if (pattern.test(key)) {
      return key.replace(pattern, replacement);
    }
  }
  return null;
}

// 1. Agreement

/** The values the field takes to agree with values the persona already has, best first */
function agreementCandidates(field: PersonaField, state: Sampling): PersonaValue[] {
  const candidates: PersonaValue[] = [];
  if (Object.hasOwn(FROM_NAME, field.key)) {
    const part = FROM_NAME[field.key];
    candidates.push(part === 'given' ? state.context.given : state.context.family);
  }
  for (const partner of partnersOf(field.key)) {
    const value = state.values[partner];
    if (!isEmptyValue(value)) {
      candidates.push(...converted(value, field));
    }
  }
  const derived = Object.hasOwn(FROM_DATE_OF_BIRTH, field.key)
    ? FROM_DATE_OF_BIRTH[field.key]
    : null;
  if (derived !== null) {
    for (const birth of birthKeysOf(field, state)) {
      const value = derivedOf(derived, state.values[birth], state.input.today);
      if (value !== null) {
        candidates.push(value);
      }
    }
  }
  if (roleOf(field) === 'birth') {
    candidates.push(...birthsFromDerived(state));
  }
  return candidates.filter((value) => !isEmptyValue(value));
}

/** The fields whose value equals this field's (`AGREEING_FIELDS`) */
function partnersOf(key: string): string[] {
  return AGREEING_FIELDS.flatMap(([first, second]) => {
    if (first === key) {
      return [second];
    }
    return second === key ? [first] : [];
  });
}

/**
 * A partner's value as this field's: a list for a field that holds several values, one value of
 * a list otherwise, each in turn
 */
function converted(value: PersonaValue, field: PersonaField): PersonaValue[] {
  if (field.multiple) {
    return [Array.isArray(value) ? value : [value as string | number]];
  }
  return Array.isArray(value) ? [...value] : [value];
}

/**
 * The keys of the dates of birth a derived field can follow, with a value: the one of the same
 * document first, then the others
 */
function birthKeysOf(field: PersonaField, state: Sampling): string[] {
  const keys = birthKeys(state).filter((key) => parseDayNumber(state.values[key]) !== null);
  const own = keys.filter((key) => key.startsWith(`${field.documentType}.`));
  return [...own, ...keys.filter((key) => !own.includes(key))];
}

/**
 * Every date-of-birth key: the fields' dates of birth and their partners in `AGREEING_FIELDS`, so
 * that a hidden fixed date of birth counts too
 */
function birthKeys(state: Sampling): string[] {
  const keys = new Set<string>();
  for (const field of state.input.fields) {
    if (roleOf(field) === 'birth') {
      keys.add(field.key);
      for (const partner of partnersOf(field.key)) {
        keys.add(partner);
      }
    }
  }
  return [...keys];
}

/** The age that a date of birth gives today, or its year; null for one that gives none */
function derivedOf(
  derived: 'age' | 'year',
  dateOfBirth: PersonaValue | undefined,
  today: string
): number | null {
  if (parseDayNumber(dateOfBirth) === null) {
    return null;
  }
  if (derived === 'year') {
    return Number((dateOfBirth as string).slice(0, 4));
  }
  const age = ageOn(dateOfBirth, today);
  return age === null || age < 0 ? null : age;
}

/**
 * Dates of birth that agree with an "Age in years" or a "Year of birth" the persona already has
 * (a fixed one): a random day that gives that age today, or in that year and not after today
 */
function birthsFromDerived(state: Sampling): PersonaValue[] {
  const candidates: PersonaValue[] = [];
  for (const [key, derived] of Object.entries(FROM_DATE_OF_BIRTH)) {
    const birth = birthFrom(derived, state.values[key], state);
    if (birth !== null) {
      candidates.push(birth);
    }
  }
  return candidates;
}

/**
 * Dates of birth that let the fields still to come agree when their literals are narrow ("Age in
 * years is greater than 90", the other document's "at least 21 years ago"): the other dates of
 * birth's range and boundary values, and dates of birth for the ages and years of "Age in years"
 * and "Year of birth"'s range and boundary values
 */
function birthsFromCompanions(field: PersonaField, state: Sampling): PersonaValue[] {
  const candidates: PersonaValue[] = [];
  const companion = (key: string): [PersonaField, readonly Literal[]] | null => {
    const other = state.fieldsByKey.get(key);
    const literals = literalsOf(key, state);
    return other && !Object.hasOwn(state.values, key) && literals.length > 0
      ? [other, literals]
      : null;
  };
  const valuesOf = (other: PersonaField, literals: readonly Literal[]) => [
    ...rangeCandidates(other, literals, state),
    ...boundaryCandidates(other, literals, state),
  ];
  for (const key of birthKeys(state)) {
    const found = key === field.key ? null : companion(key);
    if (found !== null) {
      candidates.push(...valuesOf(...found));
    }
  }
  for (const [key, derived] of Object.entries(FROM_DATE_OF_BIRTH)) {
    const found = companion(key);
    for (const value of found === null ? [] : valuesOf(...found)) {
      const birth = birthFrom(derived, value, state);
      if (birth !== null) {
        candidates.push(birth);
      }
    }
  }
  return candidates;
}

/**
 * A random date of birth that gives the age `value` today, or that lies in the year `value` and
 * not after today; null for a value that no date of the calendar gives
 */
function birthFrom(
  derived: 'age' | 'year',
  value: PersonaValue | undefined,
  state: Sampling
): PersonaValue {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return null;
  }
  let range: [number, number];
  if (derived === 'age') {
    range = [yearsAgo(state.day, value + 1) + 1, yearsAgo(state.day, value)];
  } else if (value >= 1 && value <= LAST_YEAR) {
    const year = String(value).padStart(4, '0');
    range = [dayNumber(`${year}-01-01`), Math.min(dayNumber(`${year}-12-31`), state.day)];
  } else {
    return null;
  }
  const day = randomDay(state.input.random, range);
  return day === null ? null : isoDate(day);
}

/**
 * What the first pass prefers among the candidates that meet the literals (step 2 and the fields
 * still to come): a date of birth that the other dates of birth, "Age in years" and "Year of
 * birth" still to sample can agree with, and that no issue date comes before; an issue date not
 * before the date of birth nor after its expiry date; an expiry date not before its issue date; a
 * value that its partners still to sample can take
 */
function preferenceOf(field: PersonaField, state: Sampling): (value: PersonaValue) => boolean {
  const checks: ((value: PersonaValue) => boolean)[] = [];
  const pending = (key: string) => state.fieldsByKey.has(key) && !Object.hasOwn(state.values, key);
  for (const partner of partnersOf(field.key)) {
    const partnerField = state.fieldsByKey.get(partner);
    if (partnerField && pending(partner)) {
      const literals = literalsOf(partner, state);
      checks.push((value) =>
        converted(value, partnerField).some((each) => meetsAll(partnerField, literals, each, state))
      );
    }
  }
  const role = roleOf(field);
  if (role === 'birth') {
    for (const key of birthKeys(state)) {
      const other = state.fieldsByKey.get(key);
      if (key !== field.key && other && pending(key)) {
        const literals = literalsOf(key, state);
        checks.push((value) => meetsAll(other, literals, value, state));
      }
    }
    for (const [key, derived] of Object.entries(FROM_DATE_OF_BIRTH)) {
      const other = state.fieldsByKey.get(key);
      if (other && pending(key)) {
        const literals = literalsOf(key, state);
        checks.push((value) => {
          const age = derivedOf(derived, value, state.input.today);
          return age !== null && meetsAll(other, literals, age, state);
        });
      }
    }
    const issues = state.input.fields
      .filter((each) => roleOf(each) === 'issue')
      .map((each) => parseDayNumber(state.values[each.key]))
      .filter((day): day is number => day !== null);
    checks.push((value) => {
      const day = parseDayNumber(value);
      return day !== null && issues.every((issue) => issue >= day);
    });
  } else if (role === 'issue') {
    const birth = birthDayOf(state);
    const expiry = dayOf(counterpartOf(field.key, ISSUE_TO_EXPIRY), state);
    checks.push((value) => {
      const day = parseDayNumber(value);
      return day !== null && (birth === null || day >= birth) && (expiry === null || day <= expiry);
    });
  } else if (role === 'expiry') {
    const issue = dayOf(counterpartOf(field.key, EXPIRY_TO_ISSUE), state);
    checks.push((value) => {
      const day = parseDayNumber(value);
      return day !== null && (issue === null || day >= issue);
    });
  }
  return (value) => checks.every((check) => check(value));
}

/** The day number of the value of `key`, or null when it has none */
function dayOf(key: string | null, state: Sampling): number | null {
  return key === null ? null : parseDayNumber(state.values[key]);
}

/** The persona's date of birth as a day number: the latest of its dates of birth, or null */
function birthDayOf(state: Sampling): number | null {
  const days = birthKeys(state)
    .map((key) => parseDayNumber(state.values[key]))
    .filter((day): day is number => day !== null);
  return days.length === 0 ? null : Math.max(...days);
}

// 3. Plausible random values

/** Plausible random values for the field, the first the most likely */
function plausibleCandidates(field: PersonaField, state: Sampling): PersonaValue[] {
  const { random } = state.input;
  const range = plausibleRange(field, state);
  if (range !== null) {
    const draws: PersonaValue[] = [];
    for (let draw = 0; draw < PLAUSIBLE_DRAWS; draw += 1) {
      const value = randomIn(random, range);
      if (value !== null) {
        draws.push(valueOfNumber(field, value));
      }
    }
    return draws;
  }
  if (field.kind === 'text') {
    const sampled = sampleFor(field.key, random, state.context);
    if (typeof sampled === 'string' && sampled.trim() !== '') {
      return [sampled];
    }
    return [textFallbackOf(field, state)];
  }
  if (field.kind === 'enum') {
    const set = enumSetOf(field, state);
    const codes = set?.codes ?? [];
    const draws: PersonaValue[] = [];
    for (let draw = 0; draw < PLAUSIBLE_DRAWS; draw += 1) {
      draws.push(enumSampleOf(field, codes, state));
    }
    return draws;
  }
  return [];
}

/** A plausible enum value: `sampleFor()`'s, or a random code of the set */
function enumSampleOf(
  field: PersonaField,
  codes: readonly (string | number)[],
  state: Sampling
): PersonaValue {
  const { random } = state.input;
  const sampled = sampleFor(field.key, random, state.context, codes);
  if (sampled !== undefined) {
    if (field.multiple) {
      return inSetOrder(
        Array.isArray(sampled) ? sampled : sampled === null ? [] : [sampled],
        codes
      );
    }
    return Array.isArray(sampled) ? (sampled[0] ?? null) : sampled;
  }
  if (codes.length === 0) {
    return field.multiple ? [] : null;
  }
  const code = random.pick(codes);
  return field.multiple ? [code] : code;
}

/** A text from the name pools for a name field, or a plain text for another */
function textFallbackOf(field: PersonaField, state: Sampling): string {
  const { random } = state.input;
  if (Object.hasOwn(FROM_NAME, field.key)) {
    return FROM_NAME[field.key] === 'given' ? random.pick(GIVEN_NAMES) : random.pick(FAMILY_NAMES);
  }
  return OTHER_TEXT;
}

/**
 * The plausible range of a number field (whole numbers) or a date field (day numbers), both ends
 * included, or null for the other kinds:
 * - dates of birth for ages 18 to 80; "Age in years" from 18 to 80, and "Year of birth" the years
 *   of those dates of birth; height and weight in human ranges;
 * - issue dates in the past, at most 15 years ago, not before the date of birth (a driving
 *   licence's not before the age of 17) nor after their expiry date;
 * - expiry dates from two years ago to fifteen years ahead, not before their issue date.
 * Where the persona's other dates leave none of the range, the range without them
 */
function plausibleRange(field: PersonaField, state: Sampling): [number, number] | null {
  const { day } = state;
  const oldest = yearsAgo(day, MAX_AGE + 1) + 1;
  const youngest = yearsAgo(day, MIN_AGE);
  switch (roleOf(field)) {
    case 'birth':
      return [oldest, youngest];
    case 'derived':
      return FROM_DATE_OF_BIRTH[field.key] === 'age'
        ? [MIN_AGE, MAX_AGE]
        : [yearOf(oldest), yearOf(youngest)];
    case 'issue': {
      const range: [number, number] = [yearsAgo(day, MAX_ISSUE_YEARS_AGO), day - 1];
      const birth = birthDayOf(state);
      const from =
        birth === null
          ? null
          : field.documentType === DRIVING_LICENCE
            ? yearsAfter(birth, DRIVING_FROM_AGE)
            : birth;
      const expiry = dayOf(counterpartOf(field.key, ISSUE_TO_EXPIRY), state);
      return narrowed(range, from, expiry);
    }
    case 'expiry': {
      const range: [number, number] = [
        yearsAgo(day, MIN_EXPIRY_YEARS_AGO),
        yearsAfter(day, MAX_EXPIRY_YEARS_AHEAD),
      ];
      return narrowed(range, dayOf(counterpartOf(field.key, EXPIRY_TO_ISSUE), state), null);
    }
    case 'other':
      if (field.kind !== 'number') {
        return null;
      }
      if (field.key === HEIGHT_FIELD) {
        return [MIN_HEIGHT_CM, MAX_HEIGHT_CM];
      }
      return field.key === WEIGHT_FIELD
        ? [MIN_WEIGHT_KG, MAX_WEIGHT_KG]
        : [OTHER_NUMBER_RANGE[0], OTHER_NUMBER_RANGE[1]];
  }
}

/** The range from `from` and up to `to` where given, or the range itself if that leaves none */
function narrowed(
  range: [number, number],
  from: number | null,
  to: number | null
): [number, number] {
  const low = from === null ? range[0] : Math.max(range[0], from);
  const high = to === null ? range[1] : Math.min(range[1], to);
  return low <= high ? [low, high] : range;
}

/**
 * Random values of a number or date field within its plausible range narrowed to the smallest and
 * largest of its boundary values that meet the literals, so that a narrow range is reached with
 * values that vary ("less than 25 years ago")
 */
function rangeCandidates(
  field: PersonaField,
  literals: readonly Literal[],
  state: Sampling
): PersonaValue[] {
  const range = plausibleRange(field, state);
  if (range === null || literals.length === 0) {
    return [];
  }
  const meeting = boundaryNumbers(field, literals, state).filter((value) =>
    meetsAll(field, literals, valueOfNumber(field, value), state)
  );
  if (meeting.length === 0) {
    return [];
  }
  const low = Math.max(range[0], Math.min(...meeting));
  const high = Math.min(range[1], Math.max(...meeting));
  if (low > high) {
    return [];
  }
  const draws: PersonaValue[] = [];
  for (let draw = 0; draw < RANGE_DRAWS; draw += 1) {
    const value = randomIn(state.input.random, [low, high]);
    if (value !== null) {
      draws.push(valueOfNumber(field, value));
    }
  }
  return draws;
}

/**
 * The persona's home town, kept unless the model's literals on the town or postal code fit
 * another town of the pool better: then a random one of those, so that town, postal code and
 * authority still belong together
 */
function withHomeTown(state: Sampling, context: SampleContext): SampleContext {
  const fits = (town: (typeof HOME_TOWNS)[number]) =>
    [...TOWN_KEYS, ...POSTAL_CODE_KEYS].every((key) => {
      const field = state.fieldsByKey.get(key);
      const value = TOWN_KEYS.includes(key) ? town.town : town.postalCode;
      return !field || meetsAll(field, literalsOf(key, state), value, state);
    });
  if (fits(context.home)) {
    return context;
  }
  const fitting = HOME_TOWNS.filter(fits);
  return fitting.length === 0 ? context : { ...context, home: state.input.random.pick(fitting) };
}

// 4. Boundary values

/** The boundary values of the field's literals, in random order */
function boundaryCandidates(
  field: PersonaField,
  literals: readonly Literal[],
  state: Sampling
): PersonaValue[] {
  const { random } = state.input;
  if (field.kind === 'number' || field.kind === 'date') {
    return random
      .shuffle(boundaryNumbers(field, literals, state))
      .map((value) => valueOfNumber(field, value));
  }
  if (field.kind === 'text') {
    return literals.flatMap((literal) => {
      const { test } = literal;
      if (test.kind !== 'text') {
        return [];
      }
      const wanted =
        (test.op === 'eq' || test.op === 'contains') !== literal.negated ? [test.text] : [];
      return test.matchCase ? wanted : wanted.flatMap((text) => [capitalised(text), text]);
    });
  }
  const set = enumSetOf(field, state);
  if (set === null) {
    return [];
  }
  const plausible = enumSampleOf(field, set.codes, state);
  const candidates: PersonaValue[] = [];
  for (const literal of literals) {
    const { test } = literal;
    if (test.kind !== 'enum' || (test.op === 'one_of') === literal.negated) {
      continue;
    }
    for (const key of test.values) {
      const code = set.codeOf(key);
      if (code === undefined) {
        continue;
      }
      if (field.multiple) {
        const others = Array.isArray(plausible) ? plausible : [];
        candidates.push(inSetOrder([...others, code], set.codes), [code]);
      } else {
        candidates.push(code);
      }
    }
  }
  return candidates;
}

/**
 * The boundary values of a number's or date's literals: each number and its whole neighbours;
 * each fixed date, each threshold for today (`yearsAgoThreshold()`, `yearsAfter()`,
 * `monthsAfter()`) and the days next to it. Whole numbers from 0, or day numbers of the calendar
 */
function boundaryNumbers(
  field: PersonaField,
  literals: readonly Literal[],
  state: Sampling
): number[] {
  const values = new Set<number>();
  const add = (...each: number[]) => each.forEach((value) => values.add(value));
  for (const literal of literals) {
    const { test } = literal;
    if (test.kind === 'number' && field.kind === 'number') {
      add(Math.floor(test.value) - 1, Math.floor(test.value), Math.ceil(test.value));
      add(Math.ceil(test.value) + 1);
    } else if (test.kind === 'date' && field.kind === 'date') {
      for (const threshold of thresholdsOf(test, state.day)) {
        add(threshold - 1, threshold, threshold + 1);
      }
    }
  }
  const valid =
    field.kind === 'number'
      ? (value: number) => Number.isSafeInteger(value) && value >= 0
      : (value: number) => value >= FIRST_DAY && value <= LAST_DAY;
  return [...values].filter(valid);
}

/** A date test's thresholds on `day`: its fixed date, or where its set of dates starts or ends */
function thresholdsOf(test: DateTest, day: number): number[] {
  switch (test.op) {
    case 'before':
    case 'after':
    case 'on':
      return [test.date];
    case 'at_least_years_ago':
    case 'less_than_years_ago':
      return [yearsAgo(day, test.count)];
    case 'exactly_years_ago':
      return [yearsAgo(day, test.count), yearsAgo(day, test.count + 1)];
    case 'at_least_from_now':
    case 'less_than_from_now':
      return [test.unit === 'years' ? yearsAfter(day, test.count) : monthsAfter(day, test.count)];
  }
}

/** A case-folded text with each word's first letter capitalised: "stuttgart" gives "Stuttgart" */
function capitalised(text: string): string {
  return text.replace(
    /(^|[\s-])(\p{Ll})/gu,
    (_, before: string, letter: string) => `${before}${letter.toUpperCase()}`
  );
}

// 5. The theory's witness

/** The value that the field's theory finds for the literals, if they can be met */
function witnessCandidates(
  field: PersonaField,
  literals: readonly Literal[],
  state: Sampling
): PersonaValue[] {
  const variable = variableOf(field, state);
  if (variable === null) {
    return [];
  }
  const ofKind = literals.filter((literal) => literal.test.kind === variable.kind);
  let answer: TheoryAnswer<number | string | readonly EnumValue[]>;
  switch (variable.kind) {
    case 'number':
      answer = numberTheory.decide(narrow(ofKind), variable, state.day);
      break;
    case 'text':
      answer = textTheory.decide(narrow(ofKind), variable, state.day);
      break;
    case 'date':
      answer = dateTheory.decide(narrow(ofKind), variable, state.day);
      break;
    case 'enum':
      answer = enumTheory.decide(narrow(ofKind), variable, state.day);
      break;
  }
  if (answer.verdict !== 'sat') {
    return [];
  }
  const { witness } = answer;
  if (typeof witness === 'number') {
    return [valueOfNumber(field, witness)];
  }
  if (typeof witness === 'string') {
    return [witness];
  }
  const set = enumSetOf(field, state);
  const codes = witness
    .map((key) => set?.codeOf(key))
    .filter((code): code is string | number => code !== undefined);
  if (codes.length === 0) {
    return [];
  }
  return [field.multiple ? inSetOrder(codes, set?.codes ?? codes) : codes[0]];
}

/**
 * The field's variable: the run's, or one built from the field and its value set. Null for a kind
 * no theory decides
 */
function variableOf(field: PersonaField, state: Sampling): Variable | null {
  const known = state.input.variables[field.key];
  if (known !== undefined) {
    return known;
  }
  const values: EnumValue[] = [];
  if (field.kind === 'enum') {
    const set = enumSetOf(field, state);
    for (const code of set?.codes ?? []) {
      const key = set?.keyOf(code) ?? null;
      if (key !== null && !values.includes(key)) {
        values.push(key);
      }
    }
  }
  return { key: field.key, kind: field.kind, multiple: field.multiple, values };
}

/**
 * Literals filtered by the variable's kind, typed for its theory. The model's literals on a
 * variable are of its kind (`literals.ts`), so the filter above keeps them all
 */
function narrow<T extends Literal['test']>(literals: readonly Literal[]): Literal<T>[] {
  return literals as Literal<T>[];
}

// Meeting the literals

/**
 * Whether a value of the field meets every literal, as the theory's `holds()` judges for today. An
 * empty value, or one not of the field's kind, meets none
 */
function meetsAll(
  field: PersonaField,
  literals: readonly Literal[],
  value: PersonaValue,
  state: Sampling
): boolean {
  return literals.every((literal) => meets(field, literal, value, state));
}

function meets(
  field: PersonaField,
  literal: Literal,
  value: PersonaValue,
  state: Sampling
): boolean {
  const { test } = literal;
  switch (test.kind) {
    case 'number':
      return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        numberTheory.holds({ ...literal, test }, value, state.day)
      );
    case 'text':
      return (
        typeof value === 'string' &&
        normalisedText(value, true) !== '' &&
        textTheory.holds({ ...literal, test }, value, state.day)
      );
    case 'date': {
      const day = parseDayNumber(value);
      return day !== null && dateTheory.holds({ ...literal, test }, day, state.day);
    }
    case 'enum': {
      const keys = enumKeysOf(field, value, state);
      return keys.length > 0 && enumTheory.holds({ ...literal, test }, keys, state.day);
    }
  }
}

/** An enum value's keys as the evaluator compares them: a single value as a list of one */
function enumKeysOf(field: PersonaField, value: PersonaValue, state: Sampling): EnumValue[] {
  const set = enumSetOf(field, state);
  const items = Array.isArray(value) ? value : value === null ? [] : [value];
  const keys: EnumValue[] = [];
  for (const item of items) {
    const key = set === null ? fallbackKeyOf(item) : set.keyOf(item);
    if (key !== null && !keys.includes(key)) {
      keys.push(key);
    }
  }
  return keys;
}

/** A key without a loaded value set: a whole number as it is, a text case-folded */
function fallbackKeyOf(item: unknown): EnumValue | null {
  if (typeof item === 'number') {
    return Number.isInteger(item) ? item : null;
  }
  const text = typeof item === 'string' ? normalisedText(item, false) : '';
  return text === '' ? null : text;
}

// Value sets

/** `_DIGITS` of evaluation.py, for codes written as text */
const DIGITS = /^[0-9]+$/;

/** The field's value set, computed once per sampling; null when it isn't loaded */
function enumSetOf(field: PersonaField, state: Sampling): EnumSet | null {
  if (field.optionSet === null) {
    return null;
  }
  let set = state.enumSets.get(field.optionSet);
  if (set === undefined) {
    const options = state.input.optionSets.find((each) => each.key === field.optionSet)?.options;
    set = options ? enumSetFrom(options) : null;
    state.enumSets.set(field.optionSet, set);
  }
  return set;
}

/**
 * A value set as `checks/literals.ts` reads it (`_has_integer_values()`, `_enum_key()`): codes
 * when every option's value is a whole number, else texts case-folded
 */
function enumSetFrom(options: readonly Option[]): EnumSet {
  const asCodes = options.every(
    (option) => typeof option.value === 'number' && Number.isInteger(option.value)
  );
  const keyOf = (item: unknown): EnumValue | null => {
    if (asCodes) {
      if (typeof item === 'number') {
        return Number.isInteger(item) ? item : null;
      }
      const text = typeof item === 'string' ? normalisedText(item, true) : '';
      return DIGITS.test(text) ? Number(text) : null;
    }
    const text = typeof item === 'string' ? normalisedText(item, false) : '';
    return text === '' ? null : text;
  };
  const byKey = new Map<EnumValue, string | number>();
  for (const option of options) {
    const key = keyOf(option.value);
    if (key !== null && !byKey.has(key)) {
      byKey.set(key, option.value);
    }
  }
  return {
    codes: options.map((option) => option.value),
    keyOf,
    codeOf: (key) => byKey.get(key),
  };
}

/** The codes, each once, in the order of `order` (the set's), unknown ones last */
function inSetOrder(
  codes: readonly (string | number)[],
  order: readonly (string | number)[]
): (string | number)[] {
  const unique = [...new Set(codes)];
  const rank = (code: string | number) => {
    const index = order.indexOf(code);
    return index < 0 ? order.length : index;
  };
  return unique.sort((a, b) => rank(a) - rank(b));
}

// Small helpers

/** A number field's whole number, or a date field's `YYYY-MM-DD` of a day number */
function valueOfNumber(field: PersonaField, value: number): PersonaValue {
  return field.kind === 'date' ? isoDate(value) : value;
}

/** The empty value of a field's kind */
function emptyOf(field: PersonaField): PersonaValue {
  return field.kind === 'enum' && field.multiple ? [] : null;
}

/** A random whole number of the range, both ends included, or null for an empty range */
function randomIn(random: Random, [low, high]: readonly [number, number]): number | null {
  return low <= high ? random.int(low, high) : null;
}

/** A random day of the range, clamped to the calendar, or null when that leaves none */
function randomDay(random: Random, [low, high]: readonly [number, number]): number | null {
  return randomIn(random, [Math.max(low, FIRST_DAY), Math.min(high, LAST_DAY)]);
}

/** L_N(day), the threshold of "N years ago" */
function yearsAgo(day: number, years: number): number {
  return yearsAgoThreshold(day, years);
}

/** The year of a day number */
function yearOf(day: number): number {
  return Number(isoDate(day).slice(0, 4));
}
