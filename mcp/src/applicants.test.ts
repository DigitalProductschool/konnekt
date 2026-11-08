import type { BranchInput } from '@connection-portal/api-types/form-connections';
import { parseDayNumber } from '@connection-portal/rules/checks/calendar';
import { evaluateBranch } from '@connection-portal/rules/evaluation';
import { applicantOf } from '@connection-portal/rules/personas/applicant';
import { personaFieldsOf } from '@connection-portal/rules/personas/fields';
import type { Persona, PersonaValue } from '@connection-portal/rules/personas/types';
import { MDL, OPTION_SETS, PID, rule, target } from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import { APPLICANT_MESSAGES, checkApplicant, toApplicant } from './applicants';
import { type ApplicantField, applicantFieldsOf, type ToolRuleContext } from './views';

// A variant that checks a field of every kind: the age (a date), the city (text), the height (a
// number), the sex (a single value of a set), the nationalities (several values), the place of
// birth's town (a part), the licence classes and class B's issue date
const AGE = rule(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 });
const CITY = rule(2, target('pid', 'address_locality'), {
  operator: 'equal_to',
  value: 'Stuttgart',
});
const HEIGHT = rule(3, target('mdl', 'height'), { operator: 'greater_than', value: 150 });
const SEX = rule(4, target('pid', 'sex'), { operator: 'includes_one_of', values: [2] });
const NATIONALITY = rule(5, target('pid', 'nationalities'), {
  operator: 'includes_one_of',
  values: ['DE'],
});
const BORN_IN = rule(6, target('pid', 'place_of_birth', 'locality'), {
  operator: 'equal_to',
  value: 'Stuttgart',
});
const CLASS_B = rule(7, target('mdl', 'driving_privileges', 'classes'), {
  operator: 'includes_one_of',
  values: ['B'],
});
const HELD_B = rule(8, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
  operator: 'at_least_years_ago',
  years: 2,
});

const VARIANT: BranchInput = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Standard',
  description: null,
  origin: 'main',
  operator: 'and',
  operator_mark: null,
  items: [AGE, CITY, HEIGHT, SEX, NATIONALITY, BORN_IN, CLASS_B, HELD_B],
};

const CONTEXT: ToolRuleContext = {
  documents: [PID, MDL],
  allDocuments: [PID, MDL],
  optionSets: OPTION_SETS,
};

const FIELDS: ApplicantField[] = applicantFieldsOf(VARIANT, CONTEXT);

const VALUES: Record<string, PersonaValue> = {
  'pid.birthdate': '1990-05-17',
  'pid.address_locality': 'Stuttgart',
  'pid.sex': 2,
  'pid.nationalities': ['DE', 'AT'],
  'pid.place_of_birth.locality': 'Stuttgart',
  'mdl.height': 172.5,
  'mdl.driving_privileges.classes': ['B', 'C'],
  'mdl.driving_privileges.issue_date#B': '2015-03-01',
};

const SHARED_ON = parseDayNumber('2026-11-01') as number;

/** Checks Anna's values, the first citizen of the call */
function check(values: Record<string, unknown>): string | null {
  return checkApplicant(FIELDS, { name: 'Anna', values }, OPTION_SETS, 1);
}

describe('the citizen fields of the fixture', () => {
  it('cover every kind, a part and a licence class’s date', () => {
    expect(FIELDS.map((field) => [field.key, field.kind, field.multiple])).toEqual([
      ['pid.birthdate', 'date', false],
      ['pid.place_of_birth.locality', 'text', false],
      ['pid.nationalities', 'enum', true],
      ['pid.address_locality', 'text', false],
      ['pid.sex', 'enum', false],
      ['mdl.driving_privileges.classes', 'enum', true],
      ['mdl.driving_privileges.issue_date#B', 'date', false],
      ['mdl.height', 'number', false],
    ]);
  });
});

describe('checkApplicant', () => {
  it('accepts a value of every kind', () => {
    expect(check(VALUES)).toBeNull();
  });

  it('takes a missing key, null and an empty list as missing data', () => {
    expect(check({})).toBeNull();
    expect(check({ 'pid.birthdate': null, 'pid.sex': null, 'mdl.height': null })).toBeNull();
    expect(check({ 'pid.nationalities': [], 'mdl.driving_privileges.classes': [] })).toBeNull();
  });

  it('refuses a date that isn’t YYYY-MM-DD or isn’t in the calendar', () => {
    const refusal = "Citizen 'Anna': 'pid.birthdate' expects a date as YYYY-MM-DD.";
    for (const value of ['17.05.1990', '1990-02-30', '1990-5-17', '', 19900517, ['1990-05-17']]) {
      expect(check({ 'pid.birthdate': value })).toBe(refusal);
    }
  });

  it('refuses a licence class’s date that isn’t a date', () => {
    expect(check({ 'mdl.driving_privileges.issue_date#B': '2015-02-29' })).toBe(
      "Citizen 'Anna': 'mdl.driving_privileges.issue_date#B' expects a date as YYYY-MM-DD."
    );
  });

  it('takes a finite number only', () => {
    expect(check({ 'mdl.height': 0 })).toBeNull();
    expect(check({ 'mdl.height': -3 })).toBeNull();
    const refusal = "Citizen 'Anna': 'mdl.height' expects a number.";
    for (const value of ['172', Number.NaN, Number.POSITIVE_INFINITY, true, [172]]) {
      expect(check({ 'mdl.height': value })).toBe(refusal);
    }
  });

  it('takes a non-empty text only', () => {
    expect(check({ 'pid.address_locality': 'Bad Cannstatt' })).toBeNull();
    const refusal = "Citizen 'Anna': 'pid.address_locality' expects a text.";
    for (const value of ['', 70173, ['Stuttgart'], { city: 'Stuttgart' }]) {
      expect(check({ 'pid.address_locality': value })).toBe(refusal);
    }
    expect(check({ 'pid.place_of_birth.locality': false })).toBe(
      "Citizen 'Anna': 'pid.place_of_birth.locality' expects a text."
    );
  });

  it('takes one value of the value set for a single-value enum', () => {
    expect(check({ 'pid.sex': 1 })).toBeNull();
    const refusal = "Citizen 'Anna': 'pid.sex' expects one of the values of sex.";
    // The value's type counts, as the set compares them
    for (const value of [5, '2', 'Female', [2]]) {
      expect(check({ 'pid.sex': value })).toBe(refusal);
    }
  });

  it('takes a list of values of the value set for an enum that takes several', () => {
    expect(check({ 'pid.nationalities': ['FR'] })).toBeNull();
    const refusal =
      "Citizen 'Anna': 'pid.nationalities' expects a list of the values of countries.";
    for (const value of ['DE', ['DE', 'XX'], [1], 'DE, AT']) {
      expect(check({ 'pid.nationalities': value })).toBe(refusal);
    }
  });

  it('takes a list of class codes for the licence classes', () => {
    expect(check({ 'mdl.driving_privileges.classes': ['A', 'BE'] })).toBeNull();
    const refusal =
      "Citizen 'Anna': 'mdl.driving_privileges.classes' expects a list of licence classes.";
    for (const value of ['B', ['B', 'Z'], ['b'], [{ vehicle_category_code: 'B' }]]) {
      expect(check({ 'mdl.driving_privileges.classes': value })).toBe(refusal);
    }
  });

  it('takes any text or number for an enum whose value set isn’t loaded', () => {
    expect(checkApplicant(FIELDS, { values: { 'pid.sex': 'X' } }, [], 1)).toBeNull();
    expect(checkApplicant(FIELDS, { values: { 'pid.sex': true } }, [], 1)).toBe(
      "Citizen 1: 'pid.sex' expects one of the values of sex."
    );
  });

  it('refuses an unknown key with the known keys', () => {
    expect(check({ 'pid.family_name': 'Muster' })).toBe(
      "Citizen 'Anna': the variant's rules don't check 'pid.family_name'. They check: " +
        'pid.birthdate, pid.place_of_birth.locality, pid.nationalities, pid.address_locality, ' +
        'pid.sex, mdl.driving_privileges.classes, mdl.driving_privileges.issue_date#B, mdl.height.'
    );
    expect(
      checkApplicant(
        [],
        { name: 'Anna', values: { 'pid.birthdate': '1990-05-17' } },
        OPTION_SETS,
        1
      )
    ).toBe("Citizen 'Anna': the variant's rules don't check 'pid.birthdate'. They check no data.");
  });

  it('answers the first refusal in the order of the values', () => {
    expect(check({ 'pid.sex': 1, 'mdl.height': 'tall', 'pid.eye_colour': 'blue' })).toBe(
      "Citizen 'Anna': 'mdl.height' expects a number."
    );
  });

  it('names a citizen without a name by its place in the call', () => {
    expect(checkApplicant(FIELDS, { values: { 'mdl.height': 'tall' } }, OPTION_SETS, 2)).toBe(
      "Citizen 2: 'mdl.height' expects a number."
    );
    expect(
      checkApplicant(FIELDS, { name: '  ', values: { 'mdl.height': 'tall' } }, OPTION_SETS, 3)
    ).toBe("Citizen 3: 'mdl.height' expects a number.");
  });

  it('never repeats the value it refuses', () => {
    const refusal = check({ 'pid.address_locality': 4242 }) ?? '';
    expect(refusal).not.toContain('4242');
    expect(refusal).toBe(
      APPLICANT_MESSAGES.doesNotFit(
        "Citizen 'Anna'",
        'pid.address_locality',
        APPLICANT_MESSAGES.expectedText
      )
    );
  });
});

describe('toApplicant', () => {
  it('builds the documents as applicantOf() does for a persona with the same values', () => {
    const persona: Persona = {
      id: 'persona-1',
      name: 'Anna',
      values: VALUES,
      generated: VALUES,
      status: 'ready',
    };
    const personaFields = personaFieldsOf([{ key: 'variant', ...VARIANT }], CONTEXT);
    expect(toApplicant(FIELDS, VALUES)).toEqual(applicantOf(persona, personaFields));
    expect(toApplicant(FIELDS, VALUES)).toEqual({
      pid: {
        birthdate: '1990-05-17',
        place_of_birth: { locality: 'Stuttgart' },
        nationalities: ['DE', 'AT'],
        address_locality: 'Stuttgart',
        sex: 2,
      },
      mdl: {
        driving_privileges: [
          { vehicle_category_code: 'B', issue_date: '2015-03-01' },
          { vehicle_category_code: 'C' },
        ],
        height: 172.5,
      },
    });
  });

  it('leaves out missing data and keys that aren’t fields', () => {
    expect(
      toApplicant(FIELDS, {
        'pid.birthdate': null,
        'pid.nationalities': [],
        'pid.family_name': 'Muster',
        'mdl.driving_privileges.issue_date#B': '2015-03-01',
      })
    ).toEqual({ mdl: { driving_privileges: [] } });
  });

  it('gives the evaluator what it needs to meet every rule, and to miss the class’s date', () => {
    const met = evaluateBranch(VARIANT, toApplicant(FIELDS, VALUES), SHARED_ON, CONTEXT);
    expect(met.met).toBe(true);
    expect(met.items.map((each) => each.outcome)).toEqual(VARIANT.items.map(() => 'met'));
    const withoutDate = { ...VALUES, 'mdl.driving_privileges.issue_date#B': null };
    const missing = evaluateBranch(VARIANT, toApplicant(FIELDS, withoutDate), SHARED_ON, CONTEXT);
    expect(missing.met).toBe(false);
    expect(missing.items.find((each) => each.item.id === 'rule-8')?.outcome).toBe('not_checked');
  });
});
