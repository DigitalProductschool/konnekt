import type { OptionSet } from '@connection-portal/api-types/option-sets';
import type { GenerationRun, Persona, PersonaField } from '@connection-portal/rules/personas/types';
import { ageOn, dataRowsOf } from '@connection-portal/rules/personas/values';
import { mainBranch } from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import type { RulesBranch } from '../RulesStep/types';
import {
  ageDraftKey,
  ageTextOf,
  createsAll,
  dataRowTextOf,
  dateOfBirthForAge,
  documentGroupsOf,
  draftsReducer,
  entryTextOf,
  formatDisplayDate,
  NAME_DRAFT_KEY,
  nameProblem,
  orderedValues,
  parseDisplayDate,
  parseEntry,
  parseWholeNumber,
  pickerReducer,
  runStatusTextOf,
  selectedBranchOf,
  valueTextOf,
} from './utils';

describe('formatDisplayDate', () => {
  it('writes YYYY-MM-DD as dd.mm.yyyy', () => {
    expect(formatDisplayDate('2007-07-08')).toBe('08.07.2007');
    expect(formatDisplayDate('2026-11-01')).toBe('01.11.2026');
    expect(formatDisplayDate('0001-01-01')).toBe('01.01.0001');
  });

  it('leaves anything else unchanged', () => {
    expect(formatDisplayDate('')).toBe('');
    expect(formatDisplayDate('08.07.2007')).toBe('08.07.2007');
    expect(formatDisplayDate('2007-7-8')).toBe('2007-7-8');
    expect(formatDisplayDate('2007-07-08T00:00')).toBe('2007-07-08T00:00');
  });
});

describe('selectedBranchOf', () => {
  const standard: RulesBranch = { ...mainBranch(), key: 'main' };
  const ambulance: RulesBranch = { ...mainBranch([]), key: 'b1', name: 'Ambulance' };
  const branches = [standard, ambulance];

  it('finds the selected variant', () => {
    expect(selectedBranchOf(branches, 'b1')).toBe(ambulance);
  });

  it('falls back to the first variant without a selection or for one that is gone', () => {
    expect(selectedBranchOf(branches, null)).toBe(standard);
    expect(selectedBranchOf(branches, 'deleted')).toBe(standard);
  });
});

/** A persona field of `kind`; the key's prefix is the document */
function field(
  key: string,
  kind: PersonaField['kind'],
  extra: Partial<PersonaField> = {}
): PersonaField {
  const [documentType, name] = key.split('.');
  return {
    key,
    documentType,
    documentLabel: documentType === 'pid' ? 'Personal ID' : 'Driving licence',
    label: name,
    field: name,
    part: null,
    licenceClass: null,
    kind,
    optionSet: null,
    multiple: false,
    dateOfBirth: false,
    ...extra,
  };
}

describe('documentGroupsOf', () => {
  it('groups the fields by document, keeping their order', () => {
    const birth = field('pid.birthdate', 'date');
    const classes = field('mdl.driving_privileges.classes', 'enum');
    const city = field('pid.address_locality', 'text');
    const issueB = field('mdl.driving_privileges.issue_date#B', 'date', { licenceClass: 'B' });
    expect(documentGroupsOf([birth, classes, city, issueB])).toEqual([
      { documentType: 'pid', documentLabel: 'Personal ID', fields: [birth, city] },
      { documentType: 'mdl', documentLabel: 'Driving licence', fields: [classes, issueB] },
    ]);
  });

  it('gives no group without fields', () => {
    expect(documentGroupsOf([])).toEqual([]);
  });
});

describe('valueTextOf', () => {
  const TODAY = '2026-11-01';
  const OPTION_SETS: OptionSet[] = [
    {
      key: 'licence_classes',
      options: ['AM', 'B', 'BE', 'C1'].map((code) => ({
        value: code,
        label: code,
        description: null,
      })),
    },
    {
      key: 'countries',
      options: [
        { value: 'DE', label: 'German', description: null },
        { value: 'IT', label: 'Italian', description: null },
      ],
    },
    {
      key: 'sex',
      options: [
        { value: 1, label: 'Female', description: null },
        { value: 2, label: 'Male', description: null },
      ],
    },
  ];
  const birth = field('pid.birthdate', 'date', { dateOfBirth: true });
  const expiry = field('mdl.expiry_date', 'date');
  const idExpiry = field('pid.date_of_expiry', 'date');
  const issue = field('mdl.issue_date', 'date');
  const expiryB = field('mdl.driving_privileges.expiry_date#B', 'date', {
    part: 'expiry_date',
    licenceClass: 'B',
  });
  const classes = field('mdl.driving_privileges.classes', 'enum', {
    optionSet: 'licence_classes',
    multiple: true,
  });
  const nationalities = field('pid.nationalities', 'enum', {
    optionSet: 'countries',
    multiple: true,
  });
  const sex = field('pid.sex', 'enum', { optionSet: 'sex' });
  const city = field('pid.address_locality', 'text');
  const points = field('mdl.penalty_points', 'number');

  it('writes an empty value of any kind as "Not shared"', () => {
    for (const entry of [birth, classes, city, points]) {
      expect(valueTextOf(entry, null, OPTION_SETS, TODAY)).toBe('Not shared');
      expect(valueTextOf(entry, '', OPTION_SETS, TODAY)).toBe('Not shared');
      expect(valueTextOf(entry, [], OPTION_SETS, TODAY)).toBe('Not shared');
      expect(valueTextOf(entry, undefined, OPTION_SETS, TODAY)).toBe('Not shared');
    }
  });

  it('writes a date as dd.mm.yyyy, a date of birth without its age (spec 008 FR-024)', () => {
    expect(valueTextOf(issue, '2010-05-02', OPTION_SETS, TODAY)).toBe('02.05.2010');
    expect(valueTextOf(birth, '2007-07-08', OPTION_SETS, TODAY)).toBe('08.07.2007');
    expect(valueTextOf(birth, '2030-01-01', OPTION_SETS, TODAY)).toBe('01.01.2030');
  });

  it('writes an expiry date as "Valid until <date>" (spec 008 FR-024, U65 7057:59084)', () => {
    expect(valueTextOf(expiry, '2040-08-19', OPTION_SETS, TODAY)).toBe('Valid until 19.08.2040');
    expect(valueTextOf(idExpiry, '2031-02-28', OPTION_SETS, TODAY)).toBe('Valid until 28.02.2031');
    expect(valueTextOf(expiryB, '2030-05-01', OPTION_SETS, TODAY)).toBe('Valid until 01.05.2030');
  });

  it('writes enums by their labels, several in the value set’s order (F11)', () => {
    expect(valueTextOf(classes, ['BE', 'B'], OPTION_SETS, TODAY)).toBe('B, BE');
    expect(valueTextOf(nationalities, ['IT', 'DE'], OPTION_SETS, TODAY)).toBe('German, Italian');
    expect(valueTextOf(nationalities, 'DE', OPTION_SETS, TODAY)).toBe('German');
    expect(valueTextOf(sex, 2, OPTION_SETS, TODAY)).toBe('Male');
  });

  it('writes a value outside its set as it is, after the others', () => {
    expect(valueTextOf(nationalities, ['XX', 'IT'], OPTION_SETS, TODAY)).toBe('Italian, XX');
    expect(valueTextOf(sex, 9, [], TODAY)).toBe('9');
  });

  it('writes text and numbers as stored', () => {
    expect(valueTextOf(city, 'Stuttgart', OPTION_SETS, TODAY)).toBe('Stuttgart');
    expect(valueTextOf(points, 3, OPTION_SETS, TODAY)).toBe('3');
    expect(valueTextOf(points, 0, OPTION_SETS, TODAY)).toBe('0');
  });
});

describe('dataRowTextOf (spec 008 FR-024, CLAR #46; U65 7057:58772, 7057:59186)', () => {
  const OPTION_SETS: OptionSet[] = [
    {
      key: 'licence_classes',
      options: ['AM', 'B', 'BE', 'C1'].map((code) => ({
        value: code,
        label: code,
        description: null,
      })),
    },
  ];
  const birth = field('pid.birthdate', 'date', { dateOfBirth: true });
  const classes = field('mdl.driving_privileges.classes', 'enum', {
    optionSet: 'licence_classes',
    multiple: true,
  });
  const classDate = (part: string, code: string): PersonaField =>
    field(`mdl.driving_privileges.${part}#${code}`, 'date', { part, licenceClass: code });
  const issueB = classDate('issue_date', 'B');
  const issueBe = classDate('issue_date', 'BE');
  const expiry = field('mdl.expiry_date', 'date');
  const fields = [birth, classes, issueB, issueBe, expiry];
  const textsOf = (values: Persona['values']): string[] => {
    const subject: Persona = {
      id: 'persona-1',
      name: 'Anna Keller',
      values,
      generated: values,
      status: 'ready',
    };
    return dataRowsOf(subject, fields).map((row) => dataRowTextOf(row, values, OPTION_SETS));
  };

  it('writes Anna’s data as the Test 1 frames do', () => {
    expect(
      textsOf({
        [birth.key]: '1992-03-14',
        [classes.key]: ['B', 'BE'],
        [issueB.key]: '2010-05-02',
        [issueBe.key]: '2010-05-02',
        [expiry.key]: '2035-05-01',
      })
    ).toEqual(['14.03.1992', 'B, BE since 02.05.2010', 'Valid until 01.05.2035']);
  });

  it('writes Mia’s data as the Test 1 frames do: no years, no age', () => {
    expect(
      textsOf({
        [birth.key]: '2007-07-08',
        [classes.key]: ['B'],
        [issueB.key]: '2025-08-20',
        [expiry.key]: '2040-08-19',
      })
    ).toEqual(['08.07.2007', 'B since 20.08.2025', 'Valid until 19.08.2040']);
  });

  it('writes one row per issue date, and classes without one alone', () => {
    expect(
      textsOf({
        [classes.key]: ['AM', 'B', 'BE'],
        [issueB.key]: '2010-05-02',
        [issueBe.key]: '2018-01-15',
      })
    ).toEqual(['Not shared', 'AM', 'B since 02.05.2010', 'BE since 15.01.2018', 'Not shared']);
  });

  it('writes no class as "Not shared"', () => {
    expect(textsOf({ [classes.key]: [] })).toEqual(['Not shared', 'Not shared', 'Not shared']);
  });
});

describe('runStatusTextOf and createsAll', () => {
  const persona = (id: Persona['id'], name: string): Persona => ({
    id,
    name,
    values: {},
    generated: {},
    status: 'ready',
  });
  const personas = [
    persona('persona-1', 'Mia Schulz'),
    persona('persona-2', 'Anna Keller'),
    persona('persona-3', 'Yusuf Demir'),
  ];
  const run = (slots: GenerationRun['slots']): GenerationRun => ({ runId: 1, startedAt: 0, slots });

  it('is empty without a run', () => {
    expect(runStatusTextOf(null, personas)).toBe('');
    expect(createsAll(null)).toBe(false);
  });

  it('names the personas of a run in the chips’ order (design-notes §8)', () => {
    expect(runStatusTextOf(run(['free', 'free', 'free']), personas)).toBe(
      'Creating 3 sample citizens…'
    );
    expect(runStatusTextOf(run(['free', 'kept', 'kept']), personas)).toBe(
      'Creating new data for Mia…'
    );
    expect(runStatusTextOf(run(['kept', 'filled', 'filled']), personas)).toBe(
      'Adding new data for Anna and Yusuf…'
    );
    expect(runStatusTextOf(run(['filled', 'kept', 'free']), personas)).toBe(
      'Creating new data for Yusuf. Adding new data for Mia…'
    );
  });

  it('shows frame 18 only for a run that generates all three anew', () => {
    expect(createsAll(run(['free', 'free', 'free']))).toBe(true);
    expect(createsAll(run(['free', 'kept', 'free']))).toBe(false);
    expect(createsAll(run(['filled', 'filled', 'filled']))).toBe(false);
  });
});

describe('parseDisplayDate', () => {
  it('reads dd.mm.yyyy as YYYY-MM-DD', () => {
    expect(parseDisplayDate('28.02.2007')).toEqual({ ok: true, value: '2007-02-28' });
    expect(parseDisplayDate(' 08.07.2007 ')).toEqual({ ok: true, value: '2007-07-08' });
  });

  it('gives null for an empty entry', () => {
    expect(parseDisplayDate('')).toEqual({ ok: true, value: null });
    expect(parseDisplayDate('  ')).toEqual({ ok: true, value: null });
  });

  it('knows leap years', () => {
    expect(parseDisplayDate('29.02.2008')).toEqual({ ok: true, value: '2008-02-29' });
    expect(parseDisplayDate('29.02.2007')).toEqual({ ok: false, error: expect.any(String) });
    expect(parseDisplayDate('29.02.1900').ok).toBe(false);
    expect(parseDisplayDate('29.02.2000').ok).toBe(true);
  });

  it('points out dates that do not exist and other text', () => {
    const error = { ok: false, error: 'Enter a date that exists, e.g. 28.02.2007.' };
    for (const text of [
      '31.02.2007',
      '00.01.2007',
      '01.13.2007',
      '01.01.0000',
      '2007-02-28',
      '8.7.2007',
      'abc',
    ]) {
      expect(parseDisplayDate(text)).toEqual(error);
    }
  });
});

describe('parseWholeNumber', () => {
  it('reads digits', () => {
    expect(parseWholeNumber('25')).toEqual({ ok: true, value: 25 });
    expect(parseWholeNumber(' 0 ')).toEqual({ ok: true, value: 0 });
  });

  it('gives null for an empty entry', () => {
    expect(parseWholeNumber('')).toEqual({ ok: true, value: null });
  });

  it('points out decimals, letters and signs', () => {
    const error = { ok: false, error: 'Enter a whole number, e.g. 25.' };
    for (const text of ['2.5', '12a', 'a', '-3', '1,5', '99999999999999999999']) {
      expect(parseWholeNumber(text)).toEqual(error);
    }
  });
});

describe('dateOfBirthForAge', () => {
  it('keeps the day and month (US2-AS1: age 20)', () => {
    expect(dateOfBirthForAge(20, '2007-07-08', '2026-11-02')).toEqual({
      ok: true,
      value: '2006-07-08',
    });
  });

  it('gives the day 21 years before today (US2-AS2)', () => {
    expect(dateOfBirthForAge(21, '2007-11-02', '2026-11-02')).toEqual({
      ok: true,
      value: '2005-11-02',
    });
  });

  it('goes one year further back when the day and month are still to come this year', () => {
    expect(dateOfBirthForAge(20, '2007-12-24', '2026-11-02')).toEqual({
      ok: true,
      value: '2005-12-24',
    });
  });

  it('turns a 29 February into 1 March in a year without it', () => {
    expect(dateOfBirthForAge(19, '2008-02-29', '2026-11-02')).toEqual({
      ok: true,
      value: '2007-03-01',
    });
    expect(dateOfBirthForAge(22, '2008-02-29', '2026-11-02')).toEqual({
      ok: true,
      value: '2004-02-29',
    });
  });

  it('uses today for an empty or invalid current date', () => {
    expect(dateOfBirthForAge(30, null, '2026-11-02')).toEqual({ ok: true, value: '1996-11-02' });
    expect(dateOfBirthForAge(30, '', '2026-11-02')).toEqual({ ok: true, value: '1996-11-02' });
    expect(dateOfBirthForAge(30, '2007-02-30', '2026-11-02')).toEqual({
      ok: true,
      value: '1996-11-02',
    });
  });

  it('accepts 200 and rejects an age before year 1', () => {
    expect(dateOfBirthForAge(200, '2007-07-08', '2026-11-02')).toEqual({
      ok: true,
      value: '1826-07-08',
    });
    expect(dateOfBirthForAge(2026, '2007-07-08', '2026-11-02').ok).toBe(false);
    expect(dateOfBirthForAge(5000, '2007-07-08', '2026-11-02')).toEqual({
      ok: false,
      error: 'Enter a smaller age, e.g. 25.',
    });
  });

  it('gives the age entered, for many ages and days', () => {
    const todays = ['2026-11-02', '2026-02-28', '2024-02-29', '2026-03-01', '2027-01-01'];
    const currents = ['2007-07-08', '2008-02-29', '2007-12-31', '2000-01-01', null];
    for (const today of todays) {
      for (const current of currents) {
        for (let age = 0; age <= 300; age++) {
          const result = dateOfBirthForAge(age, current, today);
          if (result.ok) {
            expect(ageOn(result.value, today)).toBe(age);
          } else {
            expect(Number(today.slice(0, 4)) - age).toBeLessThan(1);
          }
        }
      }
    }
  });
});

describe('nameProblem', () => {
  it('points out an empty name', () => {
    expect(nameProblem('')).toBe('Enter a name.');
    expect(nameProblem('   ')).toBe('Enter a name.');
    expect(nameProblem(' Mia ')).toBeNull();
  });
});

describe('draftsReducer', () => {
  it('records and replaces a draft', () => {
    let state = draftsReducer({}, { type: 'edit', key: 'a', text: '31.02', error: 'bad' });
    expect(state).toEqual({ a: { text: '31.02', error: 'bad' } });
    state = draftsReducer(state, { type: 'edit', key: 'a', text: '28.02.2007', error: null });
    expect(state).toEqual({ a: { text: '28.02.2007', error: null } });
  });

  it('drops the invalid drafts on done', () => {
    let state = draftsReducer({}, { type: 'edit', key: 'a', text: 'x', error: 'bad' });
    state = draftsReducer(state, { type: 'edit', key: NAME_DRAFT_KEY, text: '', error: 'e' });
    state = draftsReducer(state, { type: 'edit', key: ageDraftKey('a'), text: '5', error: null });
    expect(draftsReducer(state, { type: 'done' })).toEqual({
      'age:a': { text: '5', error: null },
    });
  });

  it('empties on reset', () => {
    const state = draftsReducer({}, { type: 'edit', key: 'a', text: 'x', error: null });
    expect(draftsReducer(state, { type: 'reset' })).toEqual({});
  });
});

describe('parseEntry', () => {
  it('commits a text as typed, and an empty one as null', () => {
    expect(parseEntry('text', ' Stuttgart ')).toEqual({ ok: true, value: ' Stuttgart ' });
    expect(parseEntry('text', '')).toEqual({ ok: true, value: null });
  });

  it('parses a number and a date as their parsers do', () => {
    expect(parseEntry('number', ' 25 ')).toEqual({ ok: true, value: 25 });
    expect(parseEntry('number', '2.5')).toEqual(parseWholeNumber('2.5'));
    expect(parseEntry('date', '08.07.2007')).toEqual({ ok: true, value: '2007-07-08' });
    expect(parseEntry('date', '31.02.2007')).toEqual(parseDisplayDate('31.02.2007'));
    expect(parseEntry('date', '')).toEqual({ ok: true, value: null });
  });
});

describe('entryTextOf and ageTextOf', () => {
  it('writes a value as its field takes it', () => {
    expect(entryTextOf('date', '2007-07-08')).toBe('08.07.2007');
    expect(entryTextOf('text', '2007-07-08')).toBe('2007-07-08');
    expect(entryTextOf('number', 3)).toBe('3');
    expect(entryTextOf('text', null)).toBe('');
    expect(entryTextOf('text', undefined)).toBe('');
    expect(entryTextOf('enum', ['B'])).toBe('');
  });

  it('gives the age, and nothing for an empty or future date of birth', () => {
    expect(ageTextOf('2007-07-08', '2026-11-01')).toBe('19');
    expect(ageTextOf('2026-11-01', '2026-11-01')).toBe('0');
    expect(ageTextOf('2030-01-01', '2026-11-01')).toBe('');
    expect(ageTextOf(null, '2026-11-01')).toBe('');
    expect(ageTextOf('', '2026-11-01')).toBe('');
  });
});

describe('orderedValues', () => {
  const choices = ['B', 'BE', 'C1'].map((value) => ({ value, label: value, description: null }));

  it("puts the values in the value set's order, a value outside it last", () => {
    expect(orderedValues(['C1', 'B'], choices)).toEqual(['B', 'C1']);
    expect(orderedValues(['Z', 'BE', 'B'], choices)).toEqual(['B', 'BE', 'Z']);
  });

  it('gives null for none', () => {
    expect(orderedValues([], choices)).toBeNull();
  });
});

describe('pickerReducer', () => {
  it('opens and closes with an empty search, and keeps the search while open', () => {
    const open = pickerReducer({ open: false, search: 'x' }, { type: 'open' });
    expect(open).toEqual({ open: true, search: '' });
    const searched = pickerReducer(open, { type: 'search', text: 'ger' });
    expect(searched).toEqual({ open: true, search: 'ger' });
    expect(pickerReducer(searched, { type: 'close' })).toEqual({ open: false, search: '' });
  });
});
