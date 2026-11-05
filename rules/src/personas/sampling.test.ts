import { describe, expect, it } from 'vitest';

import { dayNumber, parseDayNumber, yearsAfter, yearsAgoThreshold } from '../checks/calendar';
import { dateTheory } from '../checks/dateTheory';
import { enumTheory } from '../checks/enumTheory';
import { numberTheory } from '../checks/numberTheory';
import { normalisedText } from '../checks/text';
import { textTheory } from '../checks/textTheory';
import type {
  DateTest,
  EnumTest,
  EnumValue,
  Literal,
  LiteralTest,
  NumberTest,
  TextTest,
  TheoryAnswer,
  Variable,
} from '../checks/types';
import { OPTION_SETS } from '../testData';
import {
  MAX_AGE,
  MAX_EXPIRY_YEARS_AHEAD,
  MAX_HEIGHT_CM,
  MAX_ISSUE_YEARS_AGO,
  MIN_AGE,
  MIN_EXPIRY_YEARS_AGO,
  MIN_HEIGHT_CM,
} from './constants';
import { plausibilityLiteralsOf } from './models';
import { createRandom } from './random';
import { HOME_TOWNS } from './samples';
import { sampleValues, type SamplingInput } from './sampling';
import type { Model, PersonaField, PersonaValue } from './types';
import { ageOn } from './values';

const TODAY = '2026-11-02';
const TODAY_DAY = dayNumber(TODAY);

// Persona fields and their variables, as `personaFieldsOf()` and `buildCheckedBranch()` give them
// for the catalog (testData's value sets: countries DE, AT, FR; sex 0, 1, 2; classes A, B, BE, C)

const SET_KEYS: Record<string, EnumValue[]> = {
  countries: ['de', 'at', 'fr'],
  sex: [0, 1, 2],
  licence_classes: ['a', 'b', 'be', 'c'],
};

const SET_CODES: Record<string, (string | number)[]> = Object.fromEntries(
  OPTION_SETS.map((set) => [set.key, set.options.map((option) => option.value)])
);

function field(
  key: string,
  kind: PersonaField['kind'],
  extra: Partial<PersonaField> = {}
): PersonaField {
  const [documentType, rest] = key.split('.', 2);
  const [fieldKey] = rest.split(/[.#]/);
  return {
    key,
    documentType,
    documentLabel: documentType,
    label: key,
    field: fieldKey,
    part: null,
    licenceClass: null,
    kind,
    optionSet: null,
    multiple: false,
    dateOfBirth: false,
    ...extra,
  };
}

function classDate(part: 'issue_date' | 'expiry_date', licenceClass: string): PersonaField {
  return field(`mdl.driving_privileges.${part}#${licenceClass}`, 'date', {
    part,
    licenceClass,
  });
}

const FIELDS: PersonaField[] = [
  field('pid.family_name', 'text'),
  field('pid.given_name', 'text'),
  field('pid.birthdate', 'date', { dateOfBirth: true }),
  field('pid.nationalities', 'enum', { optionSet: 'countries', multiple: true }),
  field('pid.address_postal_code', 'text'),
  field('pid.address_locality', 'text'),
  field('pid.address_country', 'enum', { optionSet: 'countries' }),
  field('pid.sex', 'enum', { optionSet: 'sex' }),
  field('pid.date_of_issuance', 'date'),
  field('pid.date_of_expiry', 'date'),
  field('mdl.family_name', 'text'),
  field('mdl.given_name', 'text'),
  field('mdl.birth_date', 'date', { dateOfBirth: true }),
  field('mdl.issue_date', 'date'),
  field('mdl.expiry_date', 'date'),
  field('mdl.driving_privileges.classes', 'enum', {
    part: 'classes',
    optionSet: 'licence_classes',
    multiple: true,
  }),
  classDate('issue_date', 'B'),
  classDate('expiry_date', 'B'),
  classDate('issue_date', 'C'),
  classDate('expiry_date', 'C'),
  field('mdl.height', 'number'),
  field('mdl.weight', 'number'),
  field('mdl.age_in_years', 'number'),
  field('mdl.age_birth_year', 'number'),
  field('mdl.resident_city', 'text'),
  field('mdl.resident_country', 'enum', { optionSet: 'countries' }),
  field('mdl.nationality', 'enum', { optionSet: 'countries' }),
];

const BY_KEY: Record<string, PersonaField> = Object.fromEntries(
  FIELDS.map((each) => [each.key, each])
);

const VARIABLES: Record<string, Variable> = Object.fromEntries(
  FIELDS.map((each) => [
    each.key,
    {
      key: each.key,
      kind: each.kind,
      multiple: each.multiple,
      values: each.optionSet === null ? [] : SET_KEYS[each.optionSet],
    },
  ])
);

const PLAUSIBLE = plausibilityLiteralsOf(FIELDS, VARIABLES, TODAY);

function sample(seed: number, model: Model = {}, extra: Partial<SamplingInput> = {}) {
  return sampleValues({
    fields: FIELDS,
    variables: VARIABLES,
    optionSets: OPTION_SETS,
    model,
    name: 'Mia Schulz',
    today: TODAY,
    random: createRandom(seed),
    ...extra,
  });
}

// Literals, with texts and enum values as `literals.ts` gives them

function literal(key: string, test: LiteralTest, negated = false): Literal {
  return { variable: key, test, negated };
}

const number = (key: string, op: NumberTest['op'], value: number, negated = false) =>
  literal(key, { kind: 'number', op, value }, negated);
const text = (key: string, op: TextTest['op'], value: string, matchCase = false) =>
  literal(key, { kind: 'text', op, text: normalisedText(value, matchCase), matchCase });
const oneOf = (key: string, ...values: EnumValue[]) =>
  literal(key, { kind: 'enum', op: 'one_of', values });
const noneOf = (key: string, ...values: EnumValue[]) =>
  literal(key, { kind: 'enum', op: 'none_of', values });
const on = (key: string, date: string) =>
  literal(key, { kind: 'date', op: 'on', date: dayNumber(date) });
const fixedDate = (key: string, op: 'before' | 'after', date: string, negated = false) =>
  literal(key, { kind: 'date', op, date: dayNumber(date) }, negated);
const yearsAgo = (
  key: string,
  op: 'at_least_years_ago' | 'less_than_years_ago' | 'exactly_years_ago',
  count: number,
  negated = false
) => literal(key, { kind: 'date', op, count, unit: 'years' }, negated);
const fromNow = (
  key: string,
  op: 'at_least_from_now' | 'less_than_from_now',
  count: number,
  unit: 'years' | 'months',
  negated = false
) => literal(key, { kind: 'date', op, count, unit }, negated);

function modelOf(literals: readonly Literal[]): Model {
  const model: Model = {};
  for (const each of literals) {
    (model[each.variable] ??= []).push(each);
  }
  return model;
}

// The theories, as the evaluator compares

function enumKeys(value: PersonaValue): EnumValue[] {
  const items = Array.isArray(value) ? value : value === null ? [] : [value];
  return items.map((item) => (typeof item === 'number' ? item : normalisedText(item, false)));
}

function holds(each: Literal, value: PersonaValue): boolean {
  const { test } = each;
  switch (test.kind) {
    case 'number':
      return typeof value === 'number' && numberTheory.holds({ ...each, test }, value, TODAY_DAY);
    case 'text':
      return typeof value === 'string' && textTheory.holds({ ...each, test }, value, TODAY_DAY);
    case 'date': {
      const day = parseDayNumber(value);
      return day !== null && dateTheory.holds({ ...each, test }, day, TODAY_DAY);
    }
    case 'enum':
      return enumTheory.holds({ ...each, test }, enumKeys(value), TODAY_DAY);
  }
}

function decide(variable: Variable, literals: readonly Literal[]): TheoryAnswer<unknown> {
  switch (variable.kind) {
    case 'number':
      return numberTheory.decide(literals as Literal<NumberTest>[], variable, TODAY_DAY);
    case 'text':
      return textTheory.decide(literals as Literal<TextTest>[], variable, TODAY_DAY);
    case 'date':
      return dateTheory.decide(literals as Literal<DateTest>[], variable, TODAY_DAY);
    case 'enum':
      return enumTheory.decide(literals as Literal<EnumTest>[], variable, TODAY_DAY);
  }
}

function meetsModel(values: Record<string, PersonaValue>, model: Model): boolean {
  return Object.entries(model).every(([key, literals]) =>
    literals.every((each) => holds(each, values[key]))
  );
}

/** Whether a value is of its field's kind, as the evaluator and the editor read it */
function isOfKind(each: PersonaField, value: PersonaValue | undefined): boolean {
  switch (each.kind) {
    case 'number':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0;
    case 'text':
      return typeof value === 'string' && value.trim() !== '';
    case 'date':
      return parseDayNumber(value) !== null;
    case 'enum': {
      const codes = SET_CODES[each.optionSet ?? ''] ?? [];
      if (!each.multiple) {
        return value !== null && !Array.isArray(value) && codes.includes(value as string | number);
      }
      if (!Array.isArray(value) || value.length === 0) {
        return false;
      }
      const indices = value.map((code) => codes.indexOf(code));
      return indices.every((index, at) => index >= 0 && (at === 0 || index > indices[at - 1]));
    }
  }
}

const SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/** The date `years` years before today, the threshold L_N(today) */
const threshold = (years: number) => yearsAgoThreshold(TODAY_DAY, years);

describe('sampleValues: kinds', () => {
  it('gives every field a value of its kind, class dates included (W4)', () => {
    for (const seed of SEEDS) {
      const values = sample(seed);
      expect(Object.keys(values).sort()).toEqual(FIELDS.map((each) => each.key).sort());
      for (const each of FIELDS) {
        expect(isOfKind(each, values[each.key]), `${each.key} = ${String(values[each.key])}`).toBe(
          true
        );
      }
    }
  });

  it('gives class dates for a class the persona doesn’t hold (W4)', () => {
    const model = modelOf([noneOf('mdl.driving_privileges.classes', 'c')]);
    for (const seed of SEEDS.slice(0, 20)) {
      const values = sample(seed, model);
      expect(values['mdl.driving_privileges.classes']).not.toContain('C');
      expect(parseDayNumber(values['mdl.driving_privileges.issue_date#C'])).not.toBeNull();
      expect(parseDayNumber(values['mdl.driving_privileges.expiry_date#C'])).not.toBeNull();
    }
  });

  it('gives an empty value for an enum whose value set isn’t loaded, and others as usual', () => {
    const values = sample(1, {}, { optionSets: [] });
    expect(values['pid.sex']).toBeNull();
    expect(values['pid.nationalities']).toEqual([]);
    expect(values['mdl.driving_privileges.classes']).toEqual([]);
    expect(isOfKind(BY_KEY['mdl.height'], values['mdl.height'])).toBe(true);
  });

  it('gives equal values for equal seeds, and other values for other seeds', () => {
    expect(sample(7)).toEqual(sample(7));
    const distinct = new Set(SEEDS.slice(0, 20).map((seed) => JSON.stringify(sample(seed))));
    expect(distinct.size).toBe(20);
  });
});

describe('sampleValues: agreement (FR-010, EC "Fields that describe the same fact")', () => {
  it('makes the fields of each pair agree, and age and year follow the date of birth', () => {
    for (const seed of SEEDS) {
      const values = sample(seed);
      expect(values['mdl.birth_date']).toBe(values['pid.birthdate']);
      expect(values['mdl.age_in_years']).toBe(ageOn(values['mdl.birth_date'], TODAY));
      expect(values['mdl.age_birth_year']).toBe(
        Number(String(values['mdl.birth_date']).slice(0, 4))
      );
      expect(values['mdl.resident_city']).toBe(values['pid.address_locality']);
      expect(values['mdl.resident_country']).toBe(values['pid.address_country']);
      expect(values['pid.nationalities']).toContain(values['mdl.nationality']);
    }
  });

  it('takes the given and family name from the persona’s name (FR-009, W12)', () => {
    const values = sample(3, {}, { name: 'Yusuf Demir' });
    expect(values['pid.given_name']).toBe('Yusuf');
    expect(values['mdl.given_name']).toBe('Yusuf');
    expect(values['pid.family_name']).toBe('Demir');
    expect(values['mdl.family_name']).toBe('Demir');
  });

  it('takes a name field from the literals when the name doesn’t meet them (EC "Names")', () => {
    const model = modelOf([text('pid.given_name', 'eq', 'Max')]);
    const values = sample(3, model, { name: 'Mia Schulz' });
    expect(values['pid.given_name']).toBe('Max');
    expect(values['pid.family_name']).toBe('Schulz');
  });

  it('gives a town’s postal code with the town', () => {
    const towns = new Map(HOME_TOWNS.map((town) => [town.town, town.postalCode]));
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed);
      expect(towns.get(String(values['pid.address_locality']))).toBe(
        values['pid.address_postal_code']
      );
    }
  });

  it('lets the second document agree with the first one’s narrow literals', () => {
    const model = modelOf([yearsAgo('mdl.birth_date', 'at_least_years_ago', 70)]);
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, model);
      expect(meetsModel(values, model)).toBe(true);
      expect(values['pid.birthdate']).toBe(values['mdl.birth_date']);
    }
  });
});

describe('sampleValues: fixed values', () => {
  it('never changes a fixed value, and the other fields agree with it', () => {
    const fixed = { 'pid.birthdate': '1950-03-04', 'pid.address_locality': 'Ulm', hidden: 'x' };
    const model = modelOf([yearsAgo('pid.birthdate', 'less_than_years_ago', 30)]);
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, model, { fixed });
      expect(values['pid.birthdate']).toBe('1950-03-04');
      expect(values['mdl.birth_date']).toBe('1950-03-04');
      expect(values['mdl.age_in_years']).toBe(ageOn('1950-03-04', TODAY));
      expect(values['mdl.age_birth_year']).toBe(1950);
      expect(values['mdl.resident_city']).toBe('Ulm');
      expect(values).not.toHaveProperty('hidden');
    }
  });

  it('gives a date of birth that agrees with a fixed age, and keeps a fixed empty value', () => {
    const fixed = { 'mdl.age_in_years': 40, 'pid.family_name': null };
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, {}, { fixed });
      expect(ageOn(values['pid.birthdate'], TODAY)).toBe(40);
      expect(values['pid.family_name']).toBeNull();
      expect(values['mdl.family_name']).toBe('Schulz');
    }
  });
});

describe('sampleValues: order (FR-010)', () => {
  it('gives no issue date before the date of birth, and no expiry date before its issue date', () => {
    const pairs = [
      ['pid.date_of_issuance', 'pid.date_of_expiry'],
      ['mdl.issue_date', 'mdl.expiry_date'],
      ['mdl.driving_privileges.issue_date#B', 'mdl.driving_privileges.expiry_date#B'],
      ['mdl.driving_privileges.issue_date#C', 'mdl.driving_privileges.expiry_date#C'],
    ];
    for (const seed of SEEDS) {
      const values = sample(seed);
      const birth = dayNumber(String(values['pid.birthdate']));
      for (const [issueKey, expiryKey] of pairs) {
        const issue = dayNumber(String(values[issueKey]));
        const expiry = dayNumber(String(values[expiryKey]));
        expect(issue).toBeGreaterThanOrEqual(birth);
        expect(issue).toBeLessThan(TODAY_DAY);
        expect(issue).toBeGreaterThanOrEqual(threshold(MAX_ISSUE_YEARS_AGO));
        expect(expiry).toBeGreaterThanOrEqual(issue);
        expect(expiry).toBeGreaterThanOrEqual(threshold(MIN_EXPIRY_YEARS_AGO));
        expect(expiry).toBeLessThanOrEqual(yearsAfter(TODAY_DAY, MAX_EXPIRY_YEARS_AHEAD));
      }
    }
  });

  it('keeps the order with a fixed issue date, and the literals over the order', () => {
    const fixed = { 'mdl.issue_date': '2020-01-15' };
    const model = modelOf([fixedDate('pid.date_of_expiry', 'before', '2001-01-01')]);
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, model, { fixed });
      expect(String(values['mdl.expiry_date']) >= '2020-01-15').toBe(true);
      expect(String(values['pid.date_of_expiry']) < '2001-01-01').toBe(true);
    }
  });
});

describe('sampleValues: plausible values (FR-010, EC "Unlikely values")', () => {
  it('gives ages 18 to 80 and heights in a human range, with and without the plausibility literals', () => {
    for (const model of [{}, modelOf(PLAUSIBLE)]) {
      for (const seed of SEEDS) {
        const values = sample(seed, model);
        const age = ageOn(values['pid.birthdate'], TODAY) ?? -1;
        expect(age).toBeGreaterThanOrEqual(MIN_AGE);
        expect(age).toBeLessThanOrEqual(MAX_AGE);
        expect(values['mdl.height']).toBeGreaterThanOrEqual(MIN_HEIGHT_CM);
        expect(values['mdl.height']).toBeLessThanOrEqual(MAX_HEIGHT_CM);
      }
    }
  });

  it('gives an older persona when the literals ask for "Age in years" over 90', () => {
    const model = modelOf([number('mdl.age_in_years', 'gt', 90)]);
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, model);
      expect(values['mdl.age_in_years']).toBeGreaterThan(90);
      expect(ageOn(values['mdl.birth_date'], TODAY)).toBe(values['mdl.age_in_years']);
      expect(values['pid.birthdate']).toBe(values['mdl.birth_date']);
    }
  });

  it('gives a date of birth at least 90 years ago when the literals ask for it', () => {
    const model = modelOf([yearsAgo('pid.birthdate', 'at_least_years_ago', 90)]);
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, model);
      expect(ageOn(values['pid.birthdate'], TODAY)).toBeGreaterThanOrEqual(90);
      expect(values['mdl.age_in_years']).toBe(ageOn(values['pid.birthdate'], TODAY));
    }
  });
});

describe('sampleValues: narrow ranges', () => {
  it('reaches "City or town is equal to Stuttgart", written as the town is', () => {
    const model = modelOf([text('pid.address_locality', 'eq', 'stuttgart')]);
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, model);
      expect(values['pid.address_locality']).toBe('Stuttgart');
      expect(values['mdl.resident_city']).toBe('Stuttgart');
      expect(values['pid.address_postal_code']).toBe('70173');
    }
  });

  it('reaches a town outside the pool, with its first letters capitalised', () => {
    const model = modelOf([text('mdl.resident_city', 'eq', 'bad wimpfen')]);
    const values = sample(1, model);
    expect(values['mdl.resident_city']).toBe('Bad Wimpfen');
  });

  it('reaches an exact date, an exact age and a narrow number range', () => {
    const model = modelOf([
      on('pid.date_of_expiry', '2030-05-17'),
      yearsAgo('mdl.birth_date', 'exactly_years_ago', 30),
      number('mdl.height', 'gt', 195.5),
      number('mdl.height', 'lt', 198),
    ]);
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, model);
      expect(meetsModel(values, model)).toBe(true);
      expect(values['pid.date_of_expiry']).toBe('2030-05-17');
      expect(ageOn(values['mdl.birth_date'], TODAY)).toBe(30);
      expect([196, 197]).toContain(values['mdl.height']);
    }
  });

  it('gives values that vary within a range narrower than the plausible one', () => {
    const model = modelOf([
      ...PLAUSIBLE,
      yearsAgo('pid.birthdate', 'less_than_years_ago', 25),
      fromNow('pid.date_of_expiry', 'less_than_from_now', 3, 'months'),
    ]);
    const ages = new Set<number | null>();
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, model);
      expect(meetsModel(values, model)).toBe(true);
      ages.add(ageOn(values['pid.birthdate'], TODAY));
    }
    expect(ages.size).toBeGreaterThan(3);
  });

  it('adds a held class to a plausible combination, and gives a single enum its value', () => {
    const model = modelOf([
      oneOf('mdl.driving_privileges.classes', 'c'),
      yearsAgo('mdl.driving_privileges.issue_date#C', 'at_least_years_ago', 2),
      oneOf('pid.sex', 0),
      noneOf('pid.address_country', 'de'),
    ]);
    for (const seed of SEEDS.slice(0, 50)) {
      const values = sample(seed, model);
      expect(meetsModel(values, model)).toBe(true);
      expect(values['mdl.driving_privileges.classes']).toContain('C');
      expect(values['pid.sex']).toBe(0);
      expect(values['pid.address_country']).not.toBe('DE');
      expect(
        isOfKind(BY_KEY['mdl.driving_privileges.classes'], values['mdl.driving_privileges.classes'])
      ).toBe(true);
    }
  });
});

describe('sampleValues: the witness', () => {
  it('falls back on the theory’s witness when no other candidate meets the literals', () => {
    const model = modelOf([
      text('pid.family_name', 'contains', 'ab', true),
      text('pid.family_name', 'contains', 'cd', true),
      oneOf('pid.nationalities', 'at'),
      oneOf('pid.nationalities', 'fr'),
    ]);
    const values = sample(5, model);
    expect(meetsModel(values, model)).toBe(true);
    expect(values['pid.family_name']).toMatch(/ab.*cd|cd.*ab/);
    expect(values['pid.nationalities']).toEqual(expect.arrayContaining(['AT', 'FR']));
  });

  it('meets every set of literals that the theories can meet, with values of their kind', () => {
    const pools: Record<string, Literal[]> = {
      'pid.birthdate': [
        yearsAgo('pid.birthdate', 'at_least_years_ago', 21),
        yearsAgo('pid.birthdate', 'less_than_years_ago', 19),
        yearsAgo('pid.birthdate', 'exactly_years_ago', 45, true),
        fixedDate('pid.birthdate', 'after', '1990-06-30'),
        fixedDate('pid.birthdate', 'before', '1960-01-01', true),
        ...PLAUSIBLE.filter((each) => each.variable === 'pid.birthdate'),
      ],
      'mdl.age_in_years': [
        number('mdl.age_in_years', 'gt', 64),
        number('mdl.age_in_years', 'lt', 30),
        number('mdl.age_in_years', 'eq', 33),
        number('mdl.age_in_years', 'ne', 33),
        number('mdl.age_in_years', 'gt', 120, true),
      ],
      'pid.date_of_expiry': [
        fromNow('pid.date_of_expiry', 'at_least_from_now', 6, 'months'),
        fromNow('pid.date_of_expiry', 'less_than_from_now', 1, 'years', true),
        fixedDate('pid.date_of_expiry', 'before', '2026-01-01'),
        on('pid.date_of_expiry', '2027-02-28'),
      ],
      'mdl.driving_privileges.classes': [
        oneOf('mdl.driving_privileges.classes', 'b'),
        oneOf('mdl.driving_privileges.classes', 'a', 'c'),
        noneOf('mdl.driving_privileges.classes', 'b'),
        noneOf('mdl.driving_privileges.classes', 'be', 'c'),
      ],
      'pid.address_locality': [
        text('pid.address_locality', 'eq', 'karlsruhe'),
        text('pid.address_locality', 'ne', 'Stuttgart'),
        text('pid.address_locality', 'contains', 'heim'),
        text('pid.address_locality', 'not_contains', 'burg', true),
      ],
      'mdl.nationality': [oneOf('mdl.nationality', 'at', 'fr'), noneOf('mdl.nationality', 'fr')],
    };
    let checked = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const random = createRandom(seed * 7919);
      const literals = Object.values(pools).flatMap((pool) =>
        random.next() < 0.5 ? random.shuffle(pool).slice(0, random.int(1, 2)) : []
      );
      const model = modelOf(literals);
      const meetable = Object.entries(model).every(
        ([key, each]) => decide(VARIABLES[key], each).verdict === 'sat'
      );
      if (!meetable) {
        continue;
      }
      checked += 1;
      const values = sample(seed, model);
      expect(meetsModel(values, model), JSON.stringify(literals)).toBe(true);
      for (const each of FIELDS) {
        expect(isOfKind(each, values[each.key])).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('gives a value of its kind when the literals can’t be met', () => {
    const model = modelOf([
      number('mdl.height', 'gt', 200),
      number('mdl.height', 'lt', 100),
      fixedDate('pid.date_of_issuance', 'before', '2000-01-01'),
      fixedDate('pid.date_of_issuance', 'after', '2010-01-01'),
    ]);
    const values = sample(2, model);
    expect(isOfKind(BY_KEY['mdl.height'], values['mdl.height'])).toBe(true);
    expect(isOfKind(BY_KEY['pid.date_of_issuance'], values['pid.date_of_issuance'])).toBe(true);
  });
});
