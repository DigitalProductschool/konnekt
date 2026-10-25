import { describe, expect, it } from 'vitest';

import type { DocumentType } from '../../types/document-types';
import type { Condition } from '../../types/form-connections';
import {
  changeOperator,
  conditionProblem,
  isComplete,
  kindOfTarget,
  newCondition,
  operatorDefinition,
  operatorsFor,
  optionsOf,
  requestedRuleDocuments,
  resolveTarget,
  ruleDocumentsOf,
  suffixOf,
} from './conditions';
import { CONTEXT, MDL, OPTION_SETS, PID, target } from './testData';
import type { ConditionKind } from './types';

const DOCUMENTS = CONTEXT.documents;

function definition(operator: string, kind: ConditionKind) {
  const found = operatorDefinition(operator, kind);
  if (!found) {
    throw new Error(`No ${operator} for ${kind}`);
  }
  return found;
}

describe('operatorsFor', () => {
  it.each<[ConditionKind, string[]]>([
    ['number', ['is greater than', 'is less than', 'is equal to', 'is not equal to']],
    ['text', ['is equal to', 'is not equal to', 'contains', 'doesn’t contain']],
    ['enum', ['includes one of', 'includes none of']],
    [
      'date',
      [
        'is before',
        'is after',
        'is',
        'is at least',
        'is less than',
        'is exactly',
        'is at least',
        'is less than',
      ],
    ],
  ])('words the %s operators as FR-003 does', (kind, labels) => {
    expect(operatorsFor(kind).map((entry) => entry.label)).toEqual(labels);
  });

  it('names the API’s operators', () => {
    expect(operatorsFor('date').map((entry) => entry.operator)).toEqual([
      'before',
      'after',
      'on',
      'at_least_years_ago',
      'less_than_years_ago',
      'exactly_years_ago',
      'at_least_from_now',
      'less_than_from_now',
    ]);
    expect(operatorsFor('text').map((entry) => entry.operator)).toEqual([
      'equal_to',
      'not_equal_to',
      'contains',
      'not_contains',
    ]);
  });

  it('puts the date operators in the picker’s sections (F3)', () => {
    expect(operatorsFor('date').map((entry) => entry.section)).toEqual([
      'date',
      'date',
      'date',
      'time_ago',
      'time_ago',
      'time_ago',
      'time_from_now',
      'time_from_now',
    ]);
  });

  it('looks operators up by kind, so numbers and text keep their own equal_to', () => {
    expect(definition('equal_to', 'number').input).toBe('number');
    expect(definition('equal_to', 'text').input).toBe('text');
    expect(operatorDefinition('contains', 'number')).toBeUndefined();
  });
});

describe('suffixOf', () => {
  it('says "years old" only on the Date of birth (F1)', () => {
    const atLeast = definition('at_least_years_ago', 'date');
    expect(suffixOf(atLeast, true)).toBe('years old');
    expect(suffixOf(atLeast, false)).toBe('years ago');
    expect(suffixOf(atLeast, true, 1)).toBe('year old');
    expect(suffixOf(atLeast, false, 1)).toBe('year ago');
  });

  it('says "from now" on from-now conditions, without "left" (F2)', () => {
    expect(suffixOf(definition('less_than_from_now', 'date'), true)).toBe('from now');
  });

  it('has none for the other operators', () => {
    expect(suffixOf(definition('before', 'date'), true)).toBeNull();
    expect(suffixOf(definition('equal_to', 'text'), false)).toBeNull();
  });
});

describe('kindOfTarget', () => {
  it.each([
    ['the Date of birth', target('pid', 'birthdate'), 'date'],
    ['a text field', target('pid', 'address_locality'), 'text'],
    ['a number field', target('mdl', 'height'), 'number'],
    ['an enum field', target('pid', 'nationalities'), 'enum'],
    ['the place of birth’s country', target('pid', 'place_of_birth', 'country'), 'enum'],
    ['the place of birth’s city or town', target('pid', 'place_of_birth', 'locality'), 'text'],
    ['the classes held', target('mdl', 'driving_privileges', 'classes'), 'enum'],
    ['a class’s issue date', target('mdl', 'driving_privileges', 'issue_date', 'B'), 'date'],
  ])('is the kind of %s', (_name, ruleTarget, kind) => {
    expect(kindOfTarget(ruleTarget, DOCUMENTS)).toBe(kind);
  });

  it.each([
    ['no target', null],
    ['an image', target('pid', 'picture')],
    ['a field made of parts without its part', target('mdl', 'driving_privileges')],
    ['an unknown part', target('mdl', 'driving_privileges', 'codes')],
    ['an unknown field', target('pid', 'shoe_size')],
    ['an unknown document', target('passport', 'birthdate')],
  ])('is null for %s', (_name, ruleTarget) => {
    expect(kindOfTarget(ruleTarget, DOCUMENTS)).toBeNull();
  });
});

describe('resolveTarget', () => {
  it('words only the dates of birth as an age', () => {
    expect(resolveTarget(target('pid', 'birthdate'), DOCUMENTS)?.dateOfBirth).toBe(true);
    expect(resolveTarget(target('mdl', 'birth_date'), DOCUMENTS)?.dateOfBirth).toBe(true);
    expect(resolveTarget(target('mdl', 'issue_date'), DOCUMENTS)?.dateOfBirth).toBe(false);
    expect(
      resolveTarget(target('mdl', 'driving_privileges', 'issue_date', 'B'), DOCUMENTS)?.dateOfBirth
    ).toBe(false);
  });

  it('names the value set of enum fields and parts', () => {
    expect(resolveTarget(target('pid', 'sex'), DOCUMENTS)?.optionSet).toBe('sex');
    expect(
      resolveTarget(target('mdl', 'driving_privileges', 'classes'), DOCUMENTS)?.optionSet
    ).toBe('licence_classes');
    expect(resolveTarget(target('pid', 'birthdate'), DOCUMENTS)?.optionSet).toBeNull();
  });

  it('keeps the licence class of a per-class part only', () => {
    const resolved = resolveTarget(
      target('mdl', 'driving_privileges', 'expiry_date', 'C'),
      DOCUMENTS
    );
    expect(resolved?.part?.key).toBe('expiry_date');
    expect(resolved?.licenceClass).toBe('C');
  });
});

describe('the requested documents', () => {
  const catalog: DocumentType[] = [PID, MDL];

  it('keep the catalog’s order and only the requested fields', () => {
    const documents = requestedRuleDocuments(catalog, [
      { document_type: 'mdl', fields: ['height', 'birth_date'] },
      { document_type: 'pid', fields: ['birthdate'] },
    ]);
    expect(documents.map((document) => document.key)).toEqual(['pid', 'mdl']);
    expect(documents[1].fields.map((field) => field.key)).toEqual(['birth_date', 'height']);
  });

  it('leave out documents that aren’t requested', () => {
    expect(requestedRuleDocuments(catalog, [{ document_type: 'pid', fields: ['sex'] }])).toEqual([
      { key: 'pid', label: 'Personal ID', fields: [PID.fields[7]] },
    ]);
  });

  it('come from a connection’s documents as they are', () => {
    expect(
      ruleDocumentsOf([{ document_type: 'pid', label: 'Personal ID', fields: PID.fields }])
    ).toEqual([PID]);
  });
});

describe('newCondition', () => {
  it('ignores letter case in a new text condition (FR-013)', () => {
    expect(newCondition(definition('contains', 'text'))).toEqual({
      operator: 'contains',
      value: '',
      match_case: false,
    });
  });

  it.each([
    ['greater_than', 'number', { operator: 'greater_than', value: null }],
    ['includes_one_of', 'enum', { operator: 'includes_one_of', values: [] }],
    ['before', 'date', { operator: 'before', date: null }],
    ['exactly_years_ago', 'date', { operator: 'exactly_years_ago', years: null }],
    ['at_least_from_now', 'date', { operator: 'at_least_from_now', amount: null, unit: 'years' }],
  ] as const)('starts %s empty', (operator, kind, expected) => {
    expect(newCondition(definition(operator, kind))).toEqual(expected);
  });
});

describe('changeOperator', () => {
  it('keeps the value another operator of the same input takes', () => {
    expect(
      changeOperator(
        { operator: 'equal_to', value: 'Stuttgart', match_case: true },
        definition('not_contains', 'text')
      )
    ).toEqual({ operator: 'not_contains', value: 'Stuttgart', match_case: true });
    expect(
      changeOperator(
        { operator: 'at_least_years_ago', years: 21 },
        definition('exactly_years_ago', 'date')
      )
    ).toEqual({ operator: 'exactly_years_ago', years: 21 });
    expect(
      changeOperator(
        { operator: 'includes_one_of', values: ['B'] },
        definition('includes_none_of', 'enum')
      )
    ).toEqual({ operator: 'includes_none_of', values: ['B'] });
  });

  it('takes a number of years between years-ago and from-now conditions', () => {
    expect(
      changeOperator(
        { operator: 'at_least_years_ago', years: 2 },
        definition('at_least_from_now', 'date')
      )
    ).toEqual({ operator: 'at_least_from_now', amount: 2, unit: 'years' });
    expect(
      changeOperator(
        { operator: 'at_least_from_now', amount: 6, unit: 'months' },
        definition('at_least_years_ago', 'date')
      )
    ).toEqual({ operator: 'at_least_years_ago', years: null });
  });

  it('starts empty without a condition, or from another input', () => {
    expect(changeOperator(null, definition('before', 'date'))).toEqual({
      operator: 'before',
      date: null,
    });
    expect(
      changeOperator({ operator: 'at_least_years_ago', years: 2 }, definition('on', 'date'))
    ).toEqual({ operator: 'on', date: null });
  });
});

describe('conditionProblem and isComplete', () => {
  const countries = optionsOf(OPTION_SETS, 'countries');

  it.each<[string, Condition, ConditionKind]>([
    ['a number', { operator: 'greater_than', value: 180 }, 'number'],
    ['a negative fraction', { operator: 'not_equal_to', value: -1.5 }, 'number'],
    ['a text', { operator: 'contains', value: ' Stutt ', match_case: false }, 'text'],
    ['one value', { operator: 'includes_one_of', values: ['DE'] }, 'enum'],
    ['several values', { operator: 'includes_none_of', values: ['DE', 'AT'] }, 'enum'],
    ['a date', { operator: 'on', date: '2024-02-29' }, 'date'],
    ['years', { operator: 'exactly_years_ago', years: 1 }, 'date'],
    ['months', { operator: 'less_than_from_now', amount: 6, unit: 'months' }, 'date'],
  ])('accepts %s', (_name, condition, kind) => {
    expect(conditionProblem(condition, kind, kind === 'enum' ? countries : null)).toBeNull();
    expect(isComplete(condition, kind, countries)).toBe(true);
  });

  it.each<[string, Condition | null, ConditionKind, string]>([
    ['no condition', null, 'text', 'choose_check'],
    ['an unknown operator', { operator: 'starts_with', value: 'S' }, 'text', 'choose_check'],
    ['another kind’s operator', { operator: 'contains', value: 'S' }, 'number', 'choose_check'],
    ['no number', { operator: 'less_than', value: null }, 'number', 'enter_number'],
    ['a number as text', { operator: 'less_than', value: '5' }, 'number', 'enter_number'],
    ['an infinite number', { operator: 'less_than', value: Infinity }, 'number', 'enter_number'],
    [
      'spaces only',
      { operator: 'equal_to', value: '   ', match_case: false },
      'text',
      'enter_text',
    ],
    ['a number as text value', { operator: 'equal_to', value: 5 }, 'text', 'enter_text'],
    ['no values', { operator: 'includes_one_of', values: [] }, 'enum', 'choose_value'],
    ['a missing list', { operator: 'includes_one_of' }, 'enum', 'choose_value'],
    ['a value twice', { operator: 'includes_one_of', values: ['DE', 'DE'] }, 'enum', 'value_once'],
    [
      'a value outside the set',
      { operator: 'includes_one_of', values: ['XX'] },
      'enum',
      'values_from_list',
    ],
    ['no date', { operator: 'before', date: null }, 'date', 'enter_date'],
    ['29 Feb of a common year', { operator: 'after', date: '2023-02-29' }, 'date', 'enter_date'],
    ['0 years', { operator: 'at_least_years_ago', years: 0 }, 'date', 'years_at_least_1'],
    ['1.5 years', { operator: 'at_least_years_ago', years: 1.5 }, 'date', 'years_at_least_1'],
    ['no years', { operator: 'less_than_years_ago', years: null }, 'date', 'years_at_least_1'],
    ['no unit', { operator: 'at_least_from_now', amount: 6 }, 'date', 'choose_unit'],
    [
      '0 months',
      { operator: 'at_least_from_now', amount: 0, unit: 'months' },
      'date',
      'amount_at_least_1',
    ],
  ])('refuses %s', (_name, condition, kind, problem) => {
    expect(conditionProblem(condition, kind, countries)).toBe(problem);
    expect(isComplete(condition, kind, countries)).toBe(false);
  });

  it('checks values against the set only once the set is loaded', () => {
    expect(conditionProblem({ operator: 'includes_one_of', values: ['XX'] }, 'enum')).toBeNull();
  });

  it('compares codes as the set has them', () => {
    const sex = optionsOf(OPTION_SETS, 'sex');
    expect(conditionProblem({ operator: 'includes_one_of', values: [2] }, 'enum', sex)).toBeNull();
    expect(conditionProblem({ operator: 'includes_one_of', values: ['2'] }, 'enum', sex)).toBe(
      'values_from_list'
    );
  });

  it('isn’t complete without a kind', () => {
    expect(isComplete({ operator: 'equal_to', value: 'x', match_case: false }, null)).toBe(false);
  });
});
