import type { DocumentField } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { addRuleToBranch, changeItem, newBranch, removeItem } from '../branches';
import { buildCheckedBranch, type KeyedBranch } from '../checks/checkedTree';
import { CONTEXT, mainBranch, OPTION_SETS, PID, rule, target } from '../testData';
import type { RuleContext } from '../types';
import { checkedBranchesOf, personaFieldsOf } from './fields';
import type { PersonaField } from './types';

const TODAY = '2026-11-01';

function must<T>(value: T | null): T {
  if (value === null) {
    throw new Error('expected a result');
  }
  return value;
}

function keyed(branch: BranchInput, key: string): BranchInput & KeyedBranch {
  return { ...branch, key };
}

function group(number: number, items: RuleTreeItem[]): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name: `Group ${String(number).padStart(2, '0')}`,
    mark: null,
    operator: 'and',
    message: null,
    items,
  };
}

function keysOf(fields: PersonaField[]): string[] {
  return fields.map((field) => field.key);
}

// The spec's example (US1): Standard requires an applicant who is at least 21, lives in Stuttgart,
// holds class B and has held it for at least 2 years; Ambulance, based on it, lowers the age to 19
const AGE = rule(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 });
const CITY = rule(2, target('pid', 'address_locality'), {
  operator: 'equal_to',
  value: 'Stuttgart',
});
const CLASS_B = rule(3, target('mdl', 'driving_privileges', 'classes'), {
  operator: 'includes_one_of',
  values: ['B'],
});
const HELD_B = rule(4, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
  operator: 'at_least_years_ago',
  years: 2,
});
const STANDARD = mainBranch([AGE, CITY, CLASS_B, HELD_B]);
const AMBULANCE = must(
  changeItem(STANDARD, newBranch(STANDARD, 'based', 'Ambulance', null), {
    ...AGE,
    condition: { operator: 'at_least_years_ago', years: 19 },
  })
);
const EXAMPLE = [keyed(STANDARD, 'branch-1'), keyed(AMBULANCE, 'branch-2')];

describe('personaFieldsOf', () => {
  it('gives the example exactly its four fields (US1-AS1), and no family name (US2-AS6)', () => {
    const fields = personaFieldsOf(EXAMPLE, CONTEXT);
    expect(fields).toEqual<PersonaField[]>([
      {
        key: 'pid.birthdate',
        documentType: 'pid',
        documentLabel: 'Personal ID',
        label: 'Date of birth (Age)',
        field: 'birthdate',
        part: null,
        licenceClass: null,
        kind: 'date',
        optionSet: null,
        multiple: false,
        dateOfBirth: true,
      },
      {
        key: 'pid.address_locality',
        documentType: 'pid',
        documentLabel: 'Personal ID',
        label: 'City or town',
        field: 'address_locality',
        part: null,
        licenceClass: null,
        kind: 'text',
        optionSet: null,
        multiple: false,
        dateOfBirth: false,
      },
      {
        key: 'mdl.driving_privileges.classes',
        documentType: 'mdl',
        documentLabel: 'Driving licence',
        label: 'Licence classes',
        field: 'driving_privileges',
        part: 'classes',
        licenceClass: null,
        kind: 'enum',
        optionSet: 'licence_classes',
        multiple: true,
        dateOfBirth: false,
      },
      {
        key: 'mdl.driving_privileges.issue_date#B',
        documentType: 'mdl',
        documentLabel: 'Driving licence',
        label: 'Licence class B – Issue date',
        field: 'driving_privileges',
        part: 'issue_date',
        licenceClass: 'B',
        kind: 'date',
        optionSet: null,
        multiple: false,
        dateOfBirth: false,
      },
    ]);
    expect(keysOf(fields)).not.toContain('pid.family_name');
  });

  it('keeps the data of a rule removed in a based branch while the main branch checks it', () => {
    const removed = must(removeItem(STANDARD, AMBULANCE, 'rule-2'));
    const both = personaFieldsOf(
      [keyed(STANDARD, 'branch-1'), keyed(removed, 'branch-2')],
      CONTEXT
    );
    expect(keysOf(both)).toContain('pid.address_locality');
    // In the based branch alone, the removed rule counts nowhere
    expect(keysOf(personaFieldsOf([keyed(removed, 'branch-2')], CONTEXT))).toEqual([
      'pid.birthdate',
      'mdl.driving_privileges.classes',
      'mdl.driving_privileges.issue_date#B',
    ]);
  });

  it('gives the union of the branches: data only one branch checks is a field', () => {
    const sex = rule(5, target('pid', 'sex'), { operator: 'includes_one_of', values: [2] });
    const withSex = must(addRuleToBranch(AMBULANCE, sex));
    const fields = personaFieldsOf(
      [keyed(STANDARD, 'branch-1'), keyed(withSex, 'branch-2')],
      CONTEXT
    );
    expect(keysOf(fields)).toEqual([
      'pid.birthdate',
      'pid.address_locality',
      'pid.sex',
      'mdl.driving_privileges.classes',
      'mdl.driving_privileges.issue_date#B',
    ]);
  });

  it('brings "Licence classes" with a class date alone', () => {
    const expiry = rule(1, target('mdl', 'driving_privileges', 'expiry_date', 'BE'), {
      operator: 'at_least_from_now',
      amount: 6,
      unit: 'months',
    });
    const fields = personaFieldsOf([keyed(mainBranch([expiry]), 'branch-1')], CONTEXT);
    expect(fields.map(({ key, label }) => [key, label])).toEqual([
      ['mdl.driving_privileges.classes', 'Licence classes'],
      ['mdl.driving_privileges.expiry_date#BE', 'Licence class BE – Expiry date'],
    ]);
  });

  it('makes given and family name fields of their own when rules check them (W12)', () => {
    const givenName: DocumentField = {
      key: 'given_name',
      label: 'Given name',
      kind: 'text',
      option_set: null,
      date_of_birth: false,
      parts: null,
      multiple_values: false,
    };
    const context: RuleContext = {
      documents: [{ ...PID, fields: [givenName, ...PID.fields] }],
      optionSets: OPTION_SETS,
    };
    const rules = [
      rule(1, target('pid', 'family_name'), { operator: 'not_equal_to', value: 'Muster' }),
      rule(2, target('pid', 'given_name'), { operator: 'contains', value: 'a' }),
    ];
    const fields = personaFieldsOf([keyed(mainBranch(rules), 'branch-1')], context);
    expect(fields.map(({ key, label, documentLabel }) => [key, label, documentLabel])).toEqual([
      ['pid.given_name', 'Given name', 'Personal ID'],
      ['pid.family_name', 'Family name', 'Personal ID'],
    ]);
  });

  it('marks nationalities and classes as multiple, and other enums as single', () => {
    const rules = [
      rule(1, target('pid', 'nationalities'), { operator: 'includes_one_of', values: ['DE'] }),
      rule(2, target('pid', 'address_country'), { operator: 'includes_one_of', values: ['DE'] }),
      CLASS_B,
    ];
    const fields = personaFieldsOf([keyed(mainBranch(rules), 'branch-1')], CONTEXT);
    expect(fields.map(({ key, multiple, optionSet }) => [key, multiple, optionSet])).toEqual([
      ['pid.nationalities', true, 'countries'],
      ['pid.address_country', false, 'countries'],
      ['mdl.driving_privileges.classes', true, 'licence_classes'],
    ]);
  });

  it('orders by document, field and part, with class dates after the classes in set order', () => {
    const date = (number: number, part: string, code: string): RuleItem =>
      rule(number, target('mdl', 'driving_privileges', part, code), {
        operator: 'at_least_years_ago',
        years: 1,
      });
    const rules = [
      date(1, 'expiry_date', 'C'),
      rule(2, target('mdl', 'height'), { operator: 'greater_than', value: 150 }),
      date(3, 'expiry_date', 'B'),
      date(4, 'issue_date', 'C'),
      rule(5, target('mdl', 'birth_date'), { operator: 'at_least_years_ago', years: 18 }),
      date(6, 'issue_date', 'B'),
      date(7, 'expiry_date', 'A'),
      rule(8, target('pid', 'sex'), { operator: 'includes_one_of', values: [1] }),
      rule(9, target('pid', 'place_of_birth', 'locality'), { operator: 'contains', value: 'S' }),
      rule(10, target('pid', 'place_of_birth', 'country'), {
        operator: 'includes_one_of',
        values: ['DE'],
      }),
      rule(11, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 18 }),
    ];
    const fields = personaFieldsOf([keyed(mainBranch(rules), 'branch-1')], CONTEXT);
    expect(fields.map(({ key, label }) => [key, label])).toEqual([
      ['pid.birthdate', 'Date of birth (Age)'],
      ['pid.place_of_birth.country', 'Place of birth – Country'],
      ['pid.place_of_birth.locality', 'Place of birth – City or town'],
      ['pid.sex', 'Sex'],
      ['mdl.birth_date', 'Date of birth (Age)'],
      ['mdl.driving_privileges.classes', 'Licence classes'],
      ['mdl.driving_privileges.expiry_date#A', 'Licence class A – Expiry date'],
      ['mdl.driving_privileges.issue_date#B', 'Licence class B – Issue date'],
      ['mdl.driving_privileges.expiry_date#B', 'Licence class B – Expiry date'],
      ['mdl.driving_privileges.issue_date#C', 'Licence class C – Issue date'],
      ['mdl.driving_privileges.expiry_date#C', 'Licence class C – Expiry date'],
      ['mdl.height', 'Height (cm)'],
    ]);
  });

  it('adds no field for a rule that the checked tree leaves out', () => {
    const rules: RuleTreeItem[] = [
      rule(1, target('pid', 'sex'), { operator: 'includes_one_of', values: [] }),
      rule(2, target('pid', 'picture'), { operator: 'equal_to', value: 'x' }),
      rule(3, null, null),
      rule(4, target('pid', 'family_name'), null),
      rule(5, target('xyz', 'field'), { operator: 'equal_to', value: 'x' }),
      rule(6, target('mdl', 'driving_privileges', 'issue_date', 'Z'), {
        operator: 'at_least_years_ago',
        years: 1,
      }),
      rule(7, target('pid', 'place_of_birth'), { operator: 'equal_to', value: 'x' }),
    ];
    const branch = keyed(mainBranch(rules), 'branch-1');
    expect(buildCheckedBranch(branch, CONTEXT, TODAY).leftOut).toHaveLength(rules.length);
    expect(personaFieldsOf([branch], CONTEXT)).toEqual([]);
  });

  it('is total: no branches, empty groups, and value sets not loaded', () => {
    expect(personaFieldsOf([], CONTEXT)).toEqual([]);
    const odd = keyed(mainBranch([group(1, []), group(2, [group(3, [AGE])])]), 'branch-1');
    expect(keysOf(personaFieldsOf([odd], CONTEXT))).toEqual(['pid.birthdate']);
    const noSets: RuleContext = { documents: CONTEXT.documents, optionSets: [] };
    expect(keysOf(personaFieldsOf(EXAMPLE, noSets))).toEqual([
      'pid.birthdate',
      'pid.address_locality',
    ]);
    expect(personaFieldsOf(EXAMPLE, { documents: [], optionSets: OPTION_SETS })).toEqual([]);
  });
});

describe('checkedBranchesOf', () => {
  it('gives every branch in tab order with its checked tree for today', () => {
    const branches = checkedBranchesOf(EXAMPLE, CONTEXT, TODAY);
    expect(branches.map(({ checked }) => checked)).toEqual(
      EXAMPLE.map((branch) => buildCheckedBranch(branch, CONTEXT, TODAY))
    );
    expect(branches.map(({ checked }) => [checked.branchKey, checked.today])).toEqual([
      ['branch-1', TODAY],
      ['branch-2', TODAY],
    ]);
  });

  it('gives the rules of each checked tree by id, as that branch has them', () => {
    const [standard, ambulance] = checkedBranchesOf(EXAMPLE, CONTEXT, TODAY);
    expect(standard.rules).toEqual({
      'rule-1': AGE,
      'rule-2': CITY,
      'rule-3': CLASS_B,
      'rule-4': HELD_B,
    });
    expect(Object.keys(ambulance.rules)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
    expect(ambulance.rules['rule-1'].condition).toEqual({
      operator: 'at_least_years_ago',
      years: 19,
    });
  });

  it('leaves out removed rules, rules with problems, and keeps the rules in groups', () => {
    const incomplete = rule(5, target('pid', 'sex'), { operator: 'includes_one_of', values: [] });
    const main = mainBranch([AGE, group(1, [CITY, CLASS_B]), incomplete]);
    const removed = must(removeItem(main, newBranch(main, 'based', 'Ambulance', null), 'rule-1'));
    const [first, second] = checkedBranchesOf(
      [keyed(main, 'branch-1'), keyed(removed, 'branch-2')],
      CONTEXT,
      TODAY
    );
    expect(Object.keys(first.rules)).toEqual(['rule-1', 'rule-2', 'rule-3']);
    expect(Object.keys(second.rules)).toEqual(['rule-2', 'rule-3']);
    expect(checkedBranchesOf([keyed(mainBranch([]), 'branch-1')], CONTEXT, TODAY)[0].rules).toEqual(
      {}
    );
  });
});
