import type { OptionSet } from '@connection-portal/api-types/option-sets';
import type { Language } from '@connection-portal/rules/language';
import type {
  GenerationRun,
  Persona,
  PersonaField,
  ResultRow,
} from '@connection-portal/rules/personas/types';
import { ageOn, dataRowsOf } from '@connection-portal/rules/personas/values';
import { mainBranch } from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import type { RulesBranch } from '../RulesStep/types';
import {
  ageTextOf,
  changedValuesOf,
  CLOSED_EDIT_DATA,
  createsAll,
  dataRowGroupsOf,
  dataRowLabelOf,
  dataRowTextOf,
  dateEntryOf,
  dateOfBirthForAge,
  documentGroupsOf,
  draftsInLanguage,
  draftsReducer,
  editDataReducer,
  editorLabelOf,
  entryTextOf,
  formatDisplayDate,
  hasEntryError,
  NAME_DRAFT_KEY,
  nameProblem,
  orderedValues,
  parseDisplayDate,
  parseEntry,
  parseWholeNumber,
  pickerReducer,
  resultStatementOf,
  runStatusTextOf,
  savedToastOf,
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
      expect(valueTextOf(entry, null, OPTION_SETS, 'en')).toBe('Not shared');
      expect(valueTextOf(entry, '', OPTION_SETS, 'en')).toBe('Not shared');
      expect(valueTextOf(entry, [], OPTION_SETS, 'en')).toBe('Not shared');
      expect(valueTextOf(entry, undefined, OPTION_SETS, 'en')).toBe('Not shared');
    }
  });

  it('writes a date as dd.mm.yyyy, a date of birth without its age (spec 008 FR-024)', () => {
    expect(valueTextOf(issue, '2010-05-02', OPTION_SETS, 'en')).toBe('02.05.2010');
    expect(valueTextOf(birth, '2007-07-08', OPTION_SETS, 'en')).toBe('08.07.2007');
    expect(valueTextOf(birth, '2030-01-01', OPTION_SETS, 'en')).toBe('01.01.2030');
  });

  it('writes an expiry date as "Valid until <date>" (spec 008 FR-024, U65 7057:59084)', () => {
    expect(valueTextOf(expiry, '2040-08-19', OPTION_SETS, 'en')).toBe('Valid until 19.08.2040');
    expect(valueTextOf(idExpiry, '2031-02-28', OPTION_SETS, 'en')).toBe('Valid until 28.02.2031');
    expect(valueTextOf(expiryB, '2030-05-01', OPTION_SETS, 'en')).toBe('Valid until 01.05.2030');
  });

  it('writes enums by their labels, several in the value set’s order (F11)', () => {
    expect(valueTextOf(classes, ['BE', 'B'], OPTION_SETS, 'en')).toBe('B, BE');
    expect(valueTextOf(nationalities, ['IT', 'DE'], OPTION_SETS, 'en')).toBe('German, Italian');
    expect(valueTextOf(nationalities, 'DE', OPTION_SETS, 'en')).toBe('German');
    expect(valueTextOf(sex, 2, OPTION_SETS, 'en')).toBe('Male');
  });

  it('writes a value outside its set as it is, after the others', () => {
    expect(valueTextOf(nationalities, ['XX', 'IT'], OPTION_SETS, 'en')).toBe('Italian, XX');
    expect(valueTextOf(sex, 9, [], 'en')).toBe('9');
  });

  it('writes an empty value and an expiry date in German, a date as dd.mm.yyyy (spec 009)', () => {
    expect(valueTextOf(birth, null, OPTION_SETS, 'de')).toBe('Nicht abgerufen');
    expect(valueTextOf(classes, [], OPTION_SETS, 'de')).toBe('Nicht abgerufen');
    expect(valueTextOf(expiry, '2040-08-19', OPTION_SETS, 'de')).toBe('Gültig bis 19.08.2040');
    expect(valueTextOf(birth, '2007-07-08', OPTION_SETS, 'de')).toBe('08.07.2007');
    expect(valueTextOf(classes, ['BE', 'B'], OPTION_SETS, 'de')).toBe('B, BE');
  });

  it('writes text and numbers as stored', () => {
    expect(valueTextOf(city, 'Stuttgart', OPTION_SETS, 'en')).toBe('Stuttgart');
    expect(valueTextOf(points, 3, OPTION_SETS, 'en')).toBe('3');
    expect(valueTextOf(points, 0, OPTION_SETS, 'en')).toBe('0');
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
  const textsOf = (values: Persona['values'], language: Language = 'en'): string[] => {
    const subject: Persona = {
      id: 'persona-1',
      name: 'Anna Keller',
      values,
      generated: values,
      status: 'ready',
    };
    return dataRowsOf(subject, fields).map((row) =>
      dataRowTextOf(row, values, OPTION_SETS, language)
    );
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

  it('writes Anna’s data in German, the dates as dd.mm.yyyy (spec 009, FR-012)', () => {
    expect(
      textsOf(
        {
          [birth.key]: '1992-03-14',
          [classes.key]: ['AM', 'B', 'BE'],
          [issueB.key]: '2010-05-02',
          [issueBe.key]: '2010-05-02',
        },
        'de'
      )
    ).toEqual(['14.03.1992', 'AM', 'B, BE seit 02.05.2010', 'Nicht abgerufen']);
  });

  const persona = (values: Persona['values']): Persona => ({
    id: 'persona-1',
    name: 'Mia Schulz',
    values,
    generated: values,
    status: 'ready',
  });

  it('labels the rows as the Test 1 frames do: "Date of birth" without "(Age)" (U66 #14)', () => {
    const rows = dataRowsOf(persona({ [classes.key]: ['B'], [issueB.key]: '2025-08-20' }), [
      { ...birth, label: 'Date of birth (Age)' },
      { ...classes, label: 'Licence classes' },
      issueB,
    ]);
    expect(rows.map((row) => dataRowLabelOf(row, 'en'))).toEqual([
      'Date of birth',
      'Licence classes',
    ]);
  });

  it('keeps any other field’s label', () => {
    const [row] = dataRowsOf(persona({}), [{ ...expiry, label: 'Expiry date' }]);
    expect(dataRowLabelOf(row, 'en')).toBe('Expiry date');
  });

  it('labels the date of birth in German, any other row by its (German) label (spec 009)', () => {
    const rows = dataRowsOf(persona({}), [
      { ...birth, label: 'Alter (Geburtsdatum)' },
      { ...expiry, label: 'Ablaufdatum' },
    ]);
    expect(rows.map((row) => dataRowLabelOf(row, 'de'))).toEqual(['Geburtsdatum', 'Ablaufdatum']);
  });

  it('groups the rows by document in their order, a document’s rows together (F63)', () => {
    const nationality = field('pid.nationalities', 'enum');
    const rows = dataRowsOf(persona({ [classes.key]: ['B', 'BE'], [issueB.key]: '2010-05-02' }), [
      birth,
      classes,
      issueB,
      issueBe,
      nationality,
      expiry,
    ]);
    expect(dataRowGroupsOf(rows).map((group) => group.documentLabel)).toEqual([
      'Personal ID',
      'Driving licence',
    ]);
    expect(dataRowGroupsOf(rows).map((group) => group.rows.map((row) => row.field.key))).toEqual([
      [birth.key, nationality.key],
      [classes.key, classes.key, expiry.key],
    ]);
  });

  it('gives no group without rows', () => {
    expect(dataRowGroupsOf([])).toEqual([]);
  });
});

describe('resultStatementOf (FR-051 (32))', () => {
  it('words a group’s statement as its frame on the rules step', () => {
    expect(resultStatementOf({ type: 'group', statement: 'All of these must be met' }, 'en')).toBe(
      'All rules must be met'
    );
    expect(
      resultStatementOf({ type: 'group', statement: 'At least one of these must be met' }, 'en')
    ).toBe('At least one rule must be met');
  });

  it('keeps a rule’s statement, and a group’s it doesn’t know', () => {
    const statement = 'Personal ID · Date of birth (Age) is at least 21 years old';
    expect(resultStatementOf({ type: 'rule', statement }, 'en')).toBe(statement);
    expect(resultStatementOf({ type: 'rule', statement: 'All of these must be met' }, 'en')).toBe(
      'All of these must be met'
    );
    expect(resultStatementOf({ type: 'group', statement: 'Something else' }, 'en')).toBe(
      'Something else'
    );
  });
});

describe('resultStatementOf in German (spec 009, FR-006)', () => {
  it('words a group’s statement as its German frame, from either language’s statement', () => {
    expect(resultStatementOf({ type: 'group', statement: 'Alle müssen erfüllt sein' }, 'de')).toBe(
      'Alle Regeln müssen erfüllt sein'
    );
    expect(
      resultStatementOf({ type: 'group', statement: 'At least one of these must be met' }, 'de')
    ).toBe('Mindestens eine Regel muss erfüllt sein');
    expect(
      resultStatementOf({ type: 'group', statement: 'Mindestens eine muss erfüllt sein' }, 'en')
    ).toBe('At least one rule must be met');
  });

  it('keeps a rule’s statement as composed', () => {
    const statement = 'Personalausweis · Alter (Geburtsdatum) ist mindestens 21 Jahre alt';
    expect(resultStatementOf({ type: 'rule', statement }, 'de')).toBe(statement);
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
    expect(runStatusTextOf(null, personas, 'en')).toBe('');
    expect(createsAll(null)).toBe(false);
  });

  it('names the personas of a run in the chips’ order (design-notes §8)', () => {
    expect(runStatusTextOf(run(['free', 'free', 'free']), personas, 'en')).toBe(
      'Creating 3 sample citizens…'
    );
    expect(runStatusTextOf(run(['free', 'kept', 'kept']), personas, 'en')).toBe(
      'Creating new data for Mia…'
    );
    expect(runStatusTextOf(run(['kept', 'filled', 'filled']), personas, 'en')).toBe(
      'Adding new data for Anna and Yusuf…'
    );
    expect(runStatusTextOf(run(['filled', 'kept', 'free']), personas, 'en')).toBe(
      'Creating new data for Yusuf. Adding new data for Mia…'
    );
  });

  it('names them in German (spec 009; glossary §2 "sample citizen", §3)', () => {
    expect(runStatusTextOf(run(['free', 'free', 'free']), personas, 'de')).toBe(
      '3 Beispielpersonen werden erstellt …'
    );
    expect(runStatusTextOf(run(['free', 'kept', 'kept']), personas, 'de')).toBe(
      'Neue Daten für Mia werden erstellt …'
    );
    expect(runStatusTextOf(run(['filled', 'kept', 'free']), personas, 'de')).toBe(
      'Neue Daten für Yusuf werden erstellt. Neue Daten für Mia werden ergänzt …'
    );
    expect(runStatusTextOf(null, personas, 'de')).toBe('');
  });

  it('shows frame 18 only for a run that generates all three anew', () => {
    expect(createsAll(run(['free', 'free', 'free']))).toBe(true);
    expect(createsAll(run(['free', 'kept', 'free']))).toBe(false);
    expect(createsAll(run(['filled', 'filled', 'filled']))).toBe(false);
  });
});

describe('dateEntryOf (dots as you type dd.mm.yyyy; bug v5-ui-fixes B5)', () => {
  /** Types `keys` one by one at the end of `start`, as the browser hands each change over */
  function typed(start: string, keys: string): string[] {
    const shown: string[] = [];
    let text = start;
    for (const key of keys) {
      const next = text + key;
      text = dateEntryOf(text, next, next.length).text;
      shown.push(text);
    }
    return shown;
  }

  it('puts in the dots as the digits come', () => {
    expect(typed('', '08072007')).toEqual([
      '0',
      '08',
      '08.0',
      '08.07',
      '08.07.2',
      '08.07.20',
      '08.07.200',
      '08.07.2007',
    ]);
  });

  it('puts the caret after the digit just typed, past a dot the mask added', () => {
    expect(dateEntryOf('08', '080', 3)).toEqual({ text: '08.0', caret: 4 });
    expect(dateEntryOf('08.07', '08.072', 6)).toEqual({ text: '08.07.2', caret: 7 });
  });

  it('drops a 9th digit', () => {
    expect(dateEntryOf('08.07.2007', '08.07.20071', 11)).toEqual({
      text: '08.07.2007',
      caret: 10,
    });
  });

  it('takes a pasted date with or without its dots', () => {
    expect(dateEntryOf('', '08072007', 8)).toEqual({ text: '08.07.2007', caret: 10 });
    expect(dateEntryOf('', '08.07.2007', 10)).toEqual({ text: '08.07.2007', caret: 10 });
  });

  it('keeps a dot typed after the day or the month, and the caret after it', () => {
    expect(dateEntryOf('08', '08.', 3)).toEqual({ text: '08.', caret: 3 });
    expect(dateEntryOf('08.07', '08.07.', 6)).toEqual({ text: '08.07.', caret: 6 });
  });

  it('lets Backspace take a trailing dot without adding it back', () => {
    expect(dateEntryOf('08.07.', '08.07', 5)).toEqual({ text: '08.07', caret: 5 });
    expect(dateEntryOf('08.', '08', 2)).toEqual({ text: '08', caret: 2 });
  });

  it('turns Backspace over a dot into the digit before it, and Delete into the digit after it', () => {
    // 08.|07.2007, Backspace: the browser takes the dot
    expect(dateEntryOf('08.07.2007', '0807.2007', 2, 'backward')).toEqual({
      text: '0.07.2007',
      caret: 1,
    });
    // then 9 at 0|.07.2007
    expect(dateEntryOf('0.07.2007', '09.07.2007', 2)).toEqual({ text: '09.07.2007', caret: 2 });
    // 08|.07.2007, Delete
    expect(dateEntryOf('08.07.2007', '0807.2007', 2, 'forward')).toEqual({
      text: '08.7.2007',
      caret: 3,
    });
  });

  it('treats a deletion that doesn’t say its direction as Backspace', () => {
    expect(dateEntryOf('08.07.2007', '08.072007', 5)).toEqual({ text: '08.0.2007', caret: 4 });
  });

  it('leaves an edit in the middle as typed until the part is complete', () => {
    // 08.07.2007 with "07" selected, then 1, then 2
    expect(dateEntryOf('08.07.2007', '08.1.2007', 4)).toEqual({ text: '08.1.2007', caret: 4 });
    expect(dateEntryOf('08.1.2007', '08.12.2007', 5)).toEqual({ text: '08.12.2007', caret: 5 });
    expect(dateEntryOf('08.07.2007', '081.07.2007', 3)).toEqual({
      text: '081.07.2007',
      caret: 3,
    });
  });

  it('puts the caret past a dot it adds right after it', () => {
    // "08" pasted in front of "07"
    expect(dateEntryOf('07', '0807', 2)).toEqual({ text: '08.07', caret: 3 });
  });

  it('empties the field', () => {
    expect(dateEntryOf('08.07.2007', '', 0)).toEqual({ text: '', caret: 0 });
  });

  it('leaves anything but digits and dots as typed, for the check to refuse', () => {
    expect(dateEntryOf('', '2007-07-08', 10)).toEqual({ text: '2007-07-08', caret: 10 });
    expect(dateEntryOf('', 'abc', 3)).toEqual({ text: 'abc', caret: 3 });
    expect(dateEntryOf('', ' 08072007', 9)).toEqual({ text: ' 08072007', caret: 9 });
    expect(dateEntryOf('08.07.2007', '08.07.2007.', 11)).toEqual({
      text: '08.07.2007.',
      caret: 11,
    });
  });

  it('gives dates that parseDisplayDate takes', () => {
    for (const digits of ['08072007', '29022008', '31122099', '01010001']) {
      const { text } = dateEntryOf('', digits, digits.length);
      expect(text).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      const iso = `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
      expect(parseDisplayDate(text, 'en')).toEqual({ ok: true, value: iso });
    }
    expect(parseDisplayDate(typed('', '08072007').at(-1) ?? '', 'de')).toEqual({
      ok: true,
      value: '2007-07-08',
    });
  });
});

describe('parseDisplayDate', () => {
  it('reads dd.mm.yyyy as YYYY-MM-DD', () => {
    expect(parseDisplayDate('28.02.2007', 'en')).toEqual({ ok: true, value: '2007-02-28' });
    expect(parseDisplayDate(' 08.07.2007 ', 'en')).toEqual({ ok: true, value: '2007-07-08' });
  });

  it('gives null for an empty entry', () => {
    expect(parseDisplayDate('', 'en')).toEqual({ ok: true, value: null });
    expect(parseDisplayDate('  ', 'en')).toEqual({ ok: true, value: null });
  });

  it('knows leap years', () => {
    expect(parseDisplayDate('29.02.2008', 'en')).toEqual({ ok: true, value: '2008-02-29' });
    expect(parseDisplayDate('29.02.2007', 'en')).toEqual({ ok: false, error: expect.any(String) });
    expect(parseDisplayDate('29.02.1900', 'en').ok).toBe(false);
    expect(parseDisplayDate('29.02.2000', 'en').ok).toBe(true);
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
      expect(parseDisplayDate(text, 'en')).toEqual(error);
    }
  });
});

describe('parseWholeNumber', () => {
  it('reads digits', () => {
    expect(parseWholeNumber('25', 'en')).toEqual({ ok: true, value: 25 });
    expect(parseWholeNumber(' 0 ', 'en')).toEqual({ ok: true, value: 0 });
  });

  it('gives null for an empty entry', () => {
    expect(parseWholeNumber('', 'en')).toEqual({ ok: true, value: null });
  });

  it('points out decimals, letters and signs', () => {
    const error = { ok: false, error: 'Enter a whole number, e.g. 25.' };
    for (const text of ['2.5', '12a', 'a', '-3', '1,5', '99999999999999999999']) {
      expect(parseWholeNumber(text, 'en')).toEqual(error);
    }
  });
});

describe('dateOfBirthForAge', () => {
  it('keeps the day and month (US2-AS1: age 20)', () => {
    expect(dateOfBirthForAge(20, '2007-07-08', '2026-11-02', 'en')).toEqual({
      ok: true,
      value: '2006-07-08',
    });
  });

  it('gives the day 21 years before today (US2-AS2)', () => {
    expect(dateOfBirthForAge(21, '2007-11-02', '2026-11-02', 'en')).toEqual({
      ok: true,
      value: '2005-11-02',
    });
  });

  it('goes one year further back when the day and month are still to come this year', () => {
    expect(dateOfBirthForAge(20, '2007-12-24', '2026-11-02', 'en')).toEqual({
      ok: true,
      value: '2005-12-24',
    });
  });

  it('turns a 29 February into 1 March in a year without it', () => {
    expect(dateOfBirthForAge(19, '2008-02-29', '2026-11-02', 'en')).toEqual({
      ok: true,
      value: '2007-03-01',
    });
    expect(dateOfBirthForAge(22, '2008-02-29', '2026-11-02', 'en')).toEqual({
      ok: true,
      value: '2004-02-29',
    });
  });

  it('uses today for an empty or invalid current date', () => {
    expect(dateOfBirthForAge(30, null, '2026-11-02', 'en')).toEqual({
      ok: true,
      value: '1996-11-02',
    });
    expect(dateOfBirthForAge(30, '', '2026-11-02', 'en')).toEqual({
      ok: true,
      value: '1996-11-02',
    });
    expect(dateOfBirthForAge(30, '2007-02-30', '2026-11-02', 'en')).toEqual({
      ok: true,
      value: '1996-11-02',
    });
  });

  it('accepts 200 and rejects an age before year 1', () => {
    expect(dateOfBirthForAge(200, '2007-07-08', '2026-11-02', 'en')).toEqual({
      ok: true,
      value: '1826-07-08',
    });
    expect(dateOfBirthForAge(2026, '2007-07-08', '2026-11-02', 'en').ok).toBe(false);
    expect(dateOfBirthForAge(5000, '2007-07-08', '2026-11-02', 'en')).toEqual({
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
          const result = dateOfBirthForAge(age, current, today, 'en');
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
    expect(nameProblem('', 'en')).toBe('Enter a name.');
    expect(nameProblem('   ', 'en')).toBe('Enter a name.');
    expect(nameProblem(' Mia ', 'en')).toBeNull();
  });
});

describe('the entry errors in German (spec 009)', () => {
  it('words each error in German, the dates as dd.mm.yyyy', () => {
    expect(parseDisplayDate('31.02.2007', 'de')).toEqual({
      ok: false,
      error: 'Geben Sie ein gültiges Datum ein, z. B. 28.02.2007.',
    });
    expect(parseDisplayDate('28.02.2007', 'de')).toEqual({ ok: true, value: '2007-02-28' });
    expect(parseWholeNumber('2.5', 'de')).toEqual({
      ok: false,
      error: 'Geben Sie eine ganze Zahl ein, z. B. 25.',
    });
    expect(dateOfBirthForAge(5000, '2007-07-08', '2026-11-02', 'de')).toEqual({
      ok: false,
      error: 'Geben Sie ein niedrigeres Alter ein, z. B. 25.',
    });
    expect(nameProblem(' ', 'de')).toBe('Geben Sie einen Namen ein.');
    expect(parseEntry('number', 'a', 'de')).toEqual(parseWholeNumber('a', 'de'));
  });

  it('gives the same verdicts in both languages', () => {
    for (const text of ['31.02.2007', '28.02.2007', '', 'abc']) {
      expect(parseDisplayDate(text, 'de').ok).toBe(parseDisplayDate(text, 'en').ok);
    }
    expect(dateOfBirthForAge(30, null, '2026-11-02', 'de')).toEqual(
      dateOfBirthForAge(30, null, '2026-11-02', 'en')
    );
  });
});

describe('draftsInLanguage (spec 009, FR-003)', () => {
  const birth = field('pid.birthdate', 'date', { dateOfBirth: true });
  const points = field('mdl.penalty_points', 'number');
  const city = field('pid.address_locality', 'text');
  const fields = [birth, points, city];
  const values = { [birth.key]: '2007-07-08' };
  const typed = (language: Language) => ({
    [NAME_DRAFT_KEY]: { text: ' ', error: nameProblem(' ', language) },
    [birth.key]: { text: '31.02.2007', error: 'stale' },
    [`age:${birth.key}`]: { text: '5000', error: 'stale' },
    [points.key]: { text: '2.5', error: 'stale' },
    [city.key]: { text: 'Stuttgart', error: null },
  });

  it('words every invalid draft’s error in the language asked for, keeping the texts', () => {
    expect(draftsInLanguage(typed('en'), fields, values, '2026-11-02', 'de')).toEqual({
      [NAME_DRAFT_KEY]: { text: ' ', error: 'Geben Sie einen Namen ein.' },
      [birth.key]: {
        text: '31.02.2007',
        error: 'Geben Sie ein gültiges Datum ein, z. B. 28.02.2007.',
      },
      [`age:${birth.key}`]: {
        text: '5000',
        error: 'Geben Sie ein niedrigeres Alter ein, z. B. 25.',
      },
      [points.key]: { text: '2.5', error: 'Geben Sie eine ganze Zahl ein, z. B. 25.' },
      [city.key]: { text: 'Stuttgart', error: null },
    });
    expect(draftsInLanguage(typed('de'), fields, values, '2026-11-02', 'en')).toEqual({
      [NAME_DRAFT_KEY]: { text: ' ', error: 'Enter a name.' },
      [birth.key]: { text: '31.02.2007', error: 'Enter a date that exists, e.g. 28.02.2007.' },
      [`age:${birth.key}`]: { text: '5000', error: 'Enter a smaller age, e.g. 25.' },
      [points.key]: { text: '2.5', error: 'Enter a whole number, e.g. 25.' },
      [city.key]: { text: 'Stuttgart', error: null },
    });
  });

  it('keeps a valid draft, and the error of a draft whose field it doesn’t know', () => {
    const drafts = {
      [city.key]: { text: 'Stuttgart', error: null },
      unknown: { text: 'x', error: 'kept' },
    };
    expect(draftsInLanguage(drafts, fields, values, '2026-11-02', 'de')).toEqual(drafts);
    expect(hasEntryError(draftsInLanguage(typed('en'), fields, values, '2026-11-02', 'de'))).toBe(
      true
    );
  });
});

describe('draftsReducer', () => {
  it('records and replaces a draft', () => {
    let state = draftsReducer({}, { type: 'edit', key: 'a', text: '31.02', error: 'bad' });
    expect(state).toEqual({ a: { text: '31.02', error: 'bad' } });
    state = draftsReducer(state, { type: 'edit', key: 'a', text: '28.02.2007', error: null });
    expect(state).toEqual({ a: { text: '28.02.2007', error: null } });
  });
});

describe('parseEntry', () => {
  it('commits a text as typed, and an empty one as null', () => {
    expect(parseEntry('text', ' Stuttgart ', 'en')).toEqual({ ok: true, value: ' Stuttgart ' });
    expect(parseEntry('text', '', 'en')).toEqual({ ok: true, value: null });
  });

  it('parses a number and a date as their parsers do', () => {
    expect(parseEntry('number', ' 25 ', 'en')).toEqual({ ok: true, value: 25 });
    expect(parseEntry('number', '2.5', 'en')).toEqual(parseWholeNumber('2.5', 'en'));
    expect(parseEntry('date', '08.07.2007', 'en')).toEqual({ ok: true, value: '2007-07-08' });
    expect(parseEntry('date', '31.02.2007', 'en')).toEqual(parseDisplayDate('31.02.2007', 'en'));
    expect(parseEntry('date', '', 'en')).toEqual({ ok: true, value: null });
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

describe('editDataReducer (spec 008 FR-042)', () => {
  const mia: Persona = {
    id: 'persona-1',
    name: 'Mia Schulz',
    values: { 'pid.birthdate': '2007-07-08', 'mdl.classes': ['B'] },
    generated: { 'pid.birthdate': '2007-07-08', 'mdl.classes': ['B'] },
    status: 'ready',
  };

  it('starts with a copy of the values and the name as the name’s draft', () => {
    const state = editDataReducer(CLOSED_EDIT_DATA, { type: 'start', persona: mia });
    expect(state).toEqual({
      personaId: 'persona-1',
      values: mia.values,
      drafts: { [NAME_DRAFT_KEY]: { text: 'Mia Schulz', error: null } },
    });
    expect(state.values).not.toBe(mia.values);
  });

  it('applies values and drafts to the copy only, and drops them on close', () => {
    let state = editDataReducer(CLOSED_EDIT_DATA, { type: 'start', persona: mia });
    state = editDataReducer(state, { type: 'value', key: 'mdl.classes', value: null });
    state = editDataReducer(state, { type: 'draft', key: 'x', text: '31.02', error: 'bad' });
    expect(state.values['mdl.classes']).toBeNull();
    expect(mia.values['mdl.classes']).toEqual(['B']);
    expect(state.drafts.x).toEqual({ text: '31.02', error: 'bad' });
    expect(hasEntryError(state.drafts)).toBe(true);
    expect(editDataReducer(state, { type: 'close' })).toBe(CLOSED_EDIT_DATA);
  });

  it('has no entry error while every draft is valid', () => {
    expect(hasEntryError({})).toBe(false);
    expect(hasEntryError({ a: { text: '1', error: null } })).toBe(false);
  });
});

describe('changedValuesOf', () => {
  it('keeps the values that differ, an equal list as a new array left out', () => {
    const original = { a: '2007-07-08', b: ['B', 'BE'], c: 'x', d: '2020-01-01' };
    expect(changedValuesOf(original, { ...original })).toEqual({});
    expect(
      changedValuesOf(original, { ...original, a: '2004-07-08', b: ['B', 'BE'], c: null })
    ).toEqual({ a: '2004-07-08', c: null });
  });
});

describe('editorLabelOf (spec 008 F40; U66 7058:60656, 7058:60662)', () => {
  it('names the date of birth and a class’s issue date as the dialog draws them', () => {
    expect(editorLabelOf(field('pid.birthdate', 'date', { dateOfBirth: true }), 'en')).toBe(
      'Date of birth'
    );
    expect(
      editorLabelOf(
        field('mdl.issue_date#B', 'date', { part: 'issue_date', licenceClass: 'B' }),
        'en'
      )
    ).toBe('Class B since');
  });

  it('names them in German (spec 009)', () => {
    expect(editorLabelOf(field('pid.birthdate', 'date', { dateOfBirth: true }), 'de')).toBe(
      'Geburtsdatum'
    );
    expect(
      editorLabelOf(
        field('mdl.issue_date#B', 'date', { part: 'issue_date', licenceClass: 'B' }),
        'de'
      )
    ).toBe('Klasse B seit');
  });

  it('keeps any other label, a class’s expiry date included', () => {
    expect(editorLabelOf(field('pid.nationality', 'enum'), 'en')).toBe('nationality');
    expect(
      editorLabelOf(
        field('mdl.expiry_date#C1', 'date', {
          part: 'expiry_date',
          licenceClass: 'C1',
          label: 'Licence class C1 – Expiry date',
        }),
        'en'
      )
    ).toBe('Licence class C1 – Expiry date');
  });
});

describe('savedToastOf (spec 008 FR-042; U67 7058:61203)', () => {
  const row = (itemId: string, status: ResultRow['status']) => ({
    itemId,
    name: `Rule ${itemId}`,
    status,
  });
  const mia = { name: 'Mia Schulz' };

  it('names the rule the change made met, by the first name', () => {
    expect(
      savedToastOf(
        [row('01', 'not_met'), row('02', 'not_met'), row('03', 'met')],
        [row('02', 'not_met'), row('01', 'met'), row('03', 'met')],
        mia,
        'en'
      )
    ).toBe('Results updated. Mia now meets Rule 01.');
  });

  it('lists several, and those no longer met after them', () => {
    expect(
      savedToastOf(
        [row('01', 'not_met'), row('02', 'not_checked'), row('03', 'met'), row('04', 'met')],
        [row('03', 'not_met'), row('04', 'not_checked'), row('01', 'met'), row('02', 'met')],
        mia,
        'en'
      )
    ).toBe(
      'Results updated. Mia now meets Rule 01 and Rule 02. Mia no longer meets Rule 03 and Rule 04.'
    );
  });

  it('says only "Results updated." when no outcome moved, or for items new or gone', () => {
    expect(savedToastOf([row('01', 'met')], [row('01', 'met'), row('02', 'met')], mia, 'en')).toBe(
      'Results updated.'
    );
    expect(savedToastOf([], [row('01', 'met')], mia, 'en')).toBe('Results updated.');
  });

  it('words the toast in German (spec 009; glossary §2 "meets")', () => {
    expect(
      savedToastOf(
        [row('01', 'not_met'), row('02', 'not_checked'), row('03', 'met'), row('04', 'met')],
        [row('03', 'not_met'), row('04', 'not_checked'), row('01', 'met'), row('02', 'met')],
        mia,
        'de'
      )
    ).toBe(
      'Ergebnisse aktualisiert. Mia erfüllt jetzt Rule 01 und Rule 02. Mia erfüllt Rule 03 und Rule 04 nicht mehr.'
    );
    expect(savedToastOf([row('01', 'met')], [row('01', 'met')], mia, 'de')).toBe(
      'Ergebnisse aktualisiert.'
    );
  });
});
