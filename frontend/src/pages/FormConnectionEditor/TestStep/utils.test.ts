import { describe, expect, it } from 'vitest';

import type { OptionSet } from '../../../types/option-sets';
import type { GenerationRun, Persona, PersonaField } from '../../../utils/rules/personas/types';
import { mainBranch } from '../../../utils/rules/testData';
import type { RulesBranch } from '../RulesStep/types';
import {
  createsAll,
  documentGroupsOf,
  formatDisplayDate,
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

  it('writes a date as dd.mm.yyyy, and a date of birth with its age (F10)', () => {
    expect(valueTextOf(expiry, '2040-08-19', OPTION_SETS, TODAY)).toBe('19.08.2040');
    expect(valueTextOf(birth, '2007-07-08', OPTION_SETS, TODAY)).toBe('08.07.2007 (age 19)');
    expect(valueTextOf(birth, '2026-11-01', OPTION_SETS, TODAY)).toBe('01.11.2026 (age 0)');
    expect(valueTextOf(birth, '2030-01-01', OPTION_SETS, TODAY)).toBe('01.01.2030 (not born yet)');
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
      'Creating 3 sample applicants…'
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
