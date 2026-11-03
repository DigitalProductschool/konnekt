import { describe, expect, it } from 'vitest';

import type { Persona, PersonaField, PersonaValue } from './types';
import { ageOn, changedKeys, isEmptyValue, shownFieldsOf } from './values';

/** A persona field; only the key, the document and the class matter here */
function field(key: string, licenceClass: string | null = null): PersonaField {
  const [documentType, name] = key.split('.');
  return {
    key,
    documentType,
    documentLabel: documentType === 'pid' ? 'Personal ID' : 'Driving licence',
    label: key,
    field: name,
    part: null,
    licenceClass,
    kind: licenceClass === null ? 'text' : 'date',
    optionSet: null,
    multiple: false,
    dateOfBirth: false,
  };
}

const CITY = field('pid.address_locality');
const NATIONALITIES = field('pid.nationalities');
const CLASSES = field('mdl.driving_privileges.classes');
const ISSUE_B = field('mdl.driving_privileges.issue_date#B', 'B');
const EXPIRY_BE = field('mdl.driving_privileges.expiry_date#BE', 'BE');
const FIELDS = [CITY, NATIONALITIES, CLASSES, ISSUE_B, EXPIRY_BE];

function persona(
  values: Record<string, PersonaValue>,
  generated: Record<string, PersonaValue> = values
): Persona {
  return { id: 'persona-1', name: 'Mia Berger', values, generated, status: 'ready' };
}

describe('isEmptyValue', () => {
  it('counts null, an empty text and an empty list as empty', () => {
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue('')).toBe(true);
    expect(isEmptyValue([])).toBe(true);
  });

  it('counts every other value as given', () => {
    expect(isEmptyValue(0)).toBe(false);
    expect(isEmptyValue(' ')).toBe(false);
    expect(isEmptyValue('Stuttgart')).toBe(false);
    expect(isEmptyValue(['B'])).toBe(false);
  });
});

describe('ageOn', () => {
  it('gives the new age on the birthday itself', () => {
    expect(ageOn('2005-11-02', '2026-11-02')).toBe(21);
    expect(ageOn('2005-11-03', '2026-11-02')).toBe(20);
    expect(ageOn('2005-11-01', '2026-11-02')).toBe(21);
  });

  it('gives 0 for a date of birth today or within the last year', () => {
    expect(ageOn('2026-11-02', '2026-11-02')).toBe(0);
    expect(ageOn('2025-11-03', '2026-11-02')).toBe(0);
  });

  it('reaches the next age on 1 March for 29 February in years without it', () => {
    expect(ageOn('2004-02-29', '2025-02-28')).toBe(20);
    expect(ageOn('2004-02-29', '2025-03-01')).toBe(21);
    // In a leap year, 29 February itself
    expect(ageOn('2004-02-29', '2028-02-28')).toBe(23);
    expect(ageOn('2004-02-29', '2028-02-29')).toBe(24);
  });

  it('gives a negative number for a date of birth in the future', () => {
    expect(ageOn('2026-11-03', '2026-11-02')).toBe(-1);
    expect(ageOn('2027-11-02', '2026-11-02')).toBe(-1);
    expect(ageOn('2027-11-03', '2026-11-02')).toBe(-2);
    expect(ageOn('2030-01-01', '2026-11-02')).toBe(-4);
    expect(ageOn('2028-02-29', '2027-02-28')).toBe(-2);
    expect(ageOn('2028-02-29', '2027-03-01')).toBe(-1);
  });

  it('gives null for an empty value or one that isn’t a date', () => {
    expect(ageOn(null, '2026-11-02')).toBeNull();
    expect(ageOn('', '2026-11-02')).toBeNull();
    expect(ageOn(undefined, '2026-11-02')).toBeNull();
    expect(ageOn('2026-02-30', '2026-11-02')).toBeNull();
    expect(ageOn(21, '2026-11-02')).toBeNull();
  });
});

describe('shownFieldsOf', () => {
  it('shows a class date only while the persona holds its class', () => {
    const issueB = '2015-04-01';
    const expiryBe = '2030-04-01';
    const values = {
      [CLASSES.key]: ['B'],
      [ISSUE_B.key]: issueB,
      [EXPIRY_BE.key]: expiryBe,
    };
    expect(shownFieldsOf(persona(values), FIELDS)).toEqual([CITY, NATIONALITIES, CLASSES, ISSUE_B]);
    expect(shownFieldsOf(persona({ ...values, [CLASSES.key]: ['B', 'BE'] }), FIELDS)).toEqual(
      FIELDS
    );
    expect(shownFieldsOf(persona({ ...values, [CLASSES.key]: ['BE'] }), FIELDS)).toEqual([
      CITY,
      NATIONALITIES,
      CLASSES,
      EXPIRY_BE,
    ]);
  });

  it('hides every class date without classes', () => {
    const shown = [CITY, NATIONALITIES, CLASSES];
    expect(shownFieldsOf(persona({ [CLASSES.key]: [] }), FIELDS)).toEqual(shown);
    expect(shownFieldsOf(persona({ [CLASSES.key]: null }), FIELDS)).toEqual(shown);
    expect(shownFieldsOf(persona({}), FIELDS)).toEqual(shown);
  });
});

describe('changedKeys', () => {
  const generated: Record<string, PersonaValue> = {
    [CITY.key]: 'Stuttgart',
    [NATIONALITIES.key]: ['DE', 'IT'],
    [CLASSES.key]: ['B', 'BE'],
    [ISSUE_B.key]: '2015-04-01',
    [EXPIRY_BE.key]: '2030-04-01',
    'pid.family_name': 'Berger',
  };

  it('gives nothing for the values as generated', () => {
    expect(changedKeys(persona(generated), FIELDS)).toEqual([]);
  });

  it('gives the changed fields, in field order', () => {
    const values = { ...generated, [ISSUE_B.key]: '2016-04-01', [CITY.key]: 'Ulm' };
    expect(changedKeys(persona(values, generated), FIELDS)).toEqual([CITY.key, ISSUE_B.key]);
  });

  it('counts a list in another order as changed, as sameValue() compares', () => {
    const values = { ...generated, [NATIONALITIES.key]: ['IT', 'DE'] };
    expect(changedKeys(persona(values, generated), FIELDS)).toEqual([NATIONALITIES.key]);
  });

  it('counts an empty text against null as changed, as sameValue() compares', () => {
    expect(
      changedKeys(persona({ ...generated, [CITY.key]: '' }, { ...generated, [CITY.key]: null }), [
        CITY,
      ])
    ).toEqual([CITY.key]);
  });

  it('counts an absent value as null', () => {
    const { [CITY.key]: _city, ...rest } = generated;
    expect(changedKeys(persona(rest, { ...rest, [CITY.key]: null }), [CITY])).toEqual([]);
  });

  it('never counts hidden values', () => {
    // BE no longer held: its expiry date is hidden; the family name is no field
    const values = {
      ...generated,
      [CLASSES.key]: ['B'],
      [EXPIRY_BE.key]: '2031-01-01',
      'pid.family_name': 'Kaya',
    };
    expect(changedKeys(persona(values, generated), FIELDS)).toEqual([CLASSES.key]);
  });
});
