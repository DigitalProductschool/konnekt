import { describe, expect, it } from 'vitest';

import type { Persona, PersonaField, PersonaValue } from './types';
import {
  ageOn,
  changedKeys,
  dataRowsOf,
  isEmptyValue,
  isExpiryDate,
  shownFieldsOf,
} from './values';

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

describe('isExpiryDate (spec 008 FR-024)', () => {
  it('recognises the documents’ expiry dates and a licence class’s', () => {
    expect(isExpiryDate({ key: 'mdl.expiry_date', part: null })).toBe(true);
    expect(isExpiryDate({ key: 'pid.date_of_expiry', part: null })).toBe(true);
    expect(
      isExpiryDate({ key: 'mdl.driving_privileges.expiry_date#BE', part: 'expiry_date' })
    ).toBe(true);
  });

  it('leaves every other date out', () => {
    expect(isExpiryDate({ key: 'pid.birthdate', part: null })).toBe(false);
    expect(isExpiryDate({ key: 'mdl.issue_date', part: null })).toBe(false);
    expect(isExpiryDate({ key: 'mdl.driving_privileges.issue_date#B', part: 'issue_date' })).toBe(
      false
    );
  });
});

describe('dataRowsOf (spec 008 FR-024, CLAR #46; U65 7057:58772, 7057:59186)', () => {
  /** A class's date, with its part as `personaFieldsOf()` gives it */
  const classDate = (part: 'issue_date' | 'expiry_date', code: string): PersonaField => ({
    ...field(`mdl.driving_privileges.${part}#${code}`, code),
    part,
  });
  const BIRTH = field('pid.birthdate');
  const ISSUE_B2 = classDate('issue_date', 'B');
  const ISSUE_BE = classDate('issue_date', 'BE');
  const ISSUE_C1 = classDate('issue_date', 'C1');
  const EXPIRY_B = classDate('expiry_date', 'B');
  const EXPIRY = field('mdl.expiry_date');
  const ALL = [BIRTH, CLASSES, ISSUE_B2, ISSUE_BE, ISSUE_C1, EXPIRY_B, EXPIRY];
  const single = (entry: PersonaField) => ({
    field: entry,
    keys: [entry.key],
    classes: null,
    since: null,
  });

  it('puts the classes of one issue date in one row: "B, BE since 02.05.2010" (Anna)', () => {
    const anna = persona({
      [BIRTH.key]: '1992-03-14',
      [CLASSES.key]: ['B', 'BE'],
      [ISSUE_B2.key]: '2010-05-02',
      [ISSUE_BE.key]: '2010-05-02',
      [EXPIRY.key]: '2035-05-01',
    });
    expect(dataRowsOf(anna, [BIRTH, CLASSES, ISSUE_B2, ISSUE_BE, EXPIRY])).toEqual([
      single(BIRTH),
      {
        field: CLASSES,
        keys: [CLASSES.key, ISSUE_B2.key, ISSUE_BE.key],
        classes: ['B', 'BE'],
        since: '2010-05-02',
      },
      single(EXPIRY),
    ]);
  });

  it('gives one row per issue date, in the order of their first class', () => {
    const values = {
      [CLASSES.key]: ['B', 'BE', 'C1'],
      [ISSUE_B2.key]: '2010-05-02',
      [ISSUE_BE.key]: '2018-01-15',
      [ISSUE_C1.key]: '2010-05-02',
      [EXPIRY_B.key]: '2030-05-01',
    };
    expect(dataRowsOf(persona(values), ALL)).toEqual([
      single(BIRTH),
      {
        field: CLASSES,
        keys: [CLASSES.key, ISSUE_B2.key, ISSUE_C1.key],
        classes: ['B', 'C1'],
        since: '2010-05-02',
      },
      { field: CLASSES, keys: [CLASSES.key, ISSUE_BE.key], classes: ['BE'], since: '2018-01-15' },
      single(EXPIRY_B),
      single(EXPIRY),
    ]);
  });

  it('puts the classes without a shown issue date in one row without a date', () => {
    // B's date is checked but empty, AM's is no field
    const values = {
      [CLASSES.key]: ['AM', 'B', 'BE'],
      [ISSUE_B2.key]: null,
      [ISSUE_BE.key]: '2018-01-15',
    };
    expect(dataRowsOf(persona(values), [CLASSES, ISSUE_B2, ISSUE_BE])).toEqual([
      { field: CLASSES, keys: [CLASSES.key, ISSUE_B2.key], classes: ['AM', 'B'], since: null },
      { field: CLASSES, keys: [CLASSES.key, ISSUE_BE.key], classes: ['BE'], since: '2018-01-15' },
    ]);
  });

  it('gives one row without classes, and none for the hidden dates', () => {
    const values = { [CLASSES.key]: [], [ISSUE_B2.key]: '2010-05-02' };
    expect(dataRowsOf(persona(values), [CLASSES, ISSUE_B2])).toEqual([
      { field: CLASSES, keys: [CLASSES.key], classes: [], since: null },
    ]);
  });

  it('keeps an issue date’s own row without "Licence classes" among the fields', () => {
    const values = { [CLASSES.key]: ['B'], [ISSUE_B2.key]: '2010-05-02' };
    expect(dataRowsOf(persona(values), [ISSUE_B2])).toEqual([single(ISSUE_B2)]);
  });
});
