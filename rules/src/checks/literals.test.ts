import type { Condition, RuleTarget } from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { OPERATORS } from '../constants';
import { CONTEXT, OPTION_SETS, PID, target } from '../testData';
import { dayNumber, monthsAfter, yearsAfter } from './calendar';
import { enumHolds } from './enumTheory';
import vectors from './fixtures/evaluator-vectors.json';
import {
  allOf,
  anyOf,
  isLiteral,
  type LiteralContext,
  negate,
  type RuleFormula,
  ruleFormula,
  simplify,
  variableKey,
} from './literals';
import { numberHolds } from './numberTheory';
import { normalisedText } from './text';
import type {
  DateTest,
  EnumValue,
  Formula,
  Literal,
  LiteralTest,
  TextTest,
  Variable,
} from './types';

/** A `rule_outcomes` vector: a rule, the delivered value, the day of sharing and the outcome */
interface OutcomeVector {
  condition: Condition;
  description: string;
  kind: string;
  option_set: string | null;
  outcome: string;
  target: RuleTarget;
  today: string;
  value: unknown;
}

/** An entry of `driving_privileges`, as the vectors deliver it */
type PrivilegeEntry = Record<string, unknown>;

const OUTCOMES = (vectors.rule_outcomes as OutcomeVector[]).filter(
  (vector) => vector.outcome !== 'not_checked'
);

const FAMILY_NAME_KEY = 'pid.family_name';
const COUNTRIES: EnumValue[] = ['de', 'at', 'fr'];
const CLASSES: EnumValue[] = ['a', 'b', 'be', 'c'];
const CLASSES_KEY = 'mdl.driving_privileges.classes';

/** The rule's formula with the test data's documents and value sets */
function formulaOf(
  ruleTarget: RuleTarget | null,
  condition: Condition | null,
  context: LiteralContext = CONTEXT
): RuleFormula | null {
  return ruleFormula({ target: ruleTarget, condition }, context);
}

/** A literal, by default as a rule's: a rule never sets `negated` */
function literal(variable: string, test: LiteralTest, negated = false): Literal {
  return { variable, test, negated };
}

/** The variable of a kind other than enum */
function plain(key: string, kind: Variable['kind']): Variable {
  return { key, kind, multiple: false, values: [] };
}

/** One operator of `OPERATORS`, a rule with it, and the test its literal must have */
interface OperatorCase {
  kind: keyof typeof OPERATORS;
  operator: string;
  target: RuleTarget;
  condition: Condition;
  test: LiteralTest;
}

const HEIGHT = target('mdl', 'height');
const LOCALITY = target('pid', 'address_locality');
const EXPIRY = target('pid', 'date_of_expiry');
const BIRTHDATE = target('pid', 'birthdate');

/** A case for every operator of every kind, with values as the evaluator reads them */
const OPERATOR_CASES: OperatorCase[] = [
  {
    kind: 'number',
    operator: 'greater_than',
    target: HEIGHT,
    condition: { operator: 'greater_than', value: 20.5 },
    test: { kind: 'number', op: 'gt', value: 20.5 },
  },
  {
    kind: 'number',
    operator: 'less_than',
    target: HEIGHT,
    condition: { operator: 'less_than', value: 0 },
    test: { kind: 'number', op: 'lt', value: 0 },
  },
  {
    kind: 'number',
    operator: 'equal_to',
    target: HEIGHT,
    condition: { operator: 'equal_to', value: 180 },
    test: { kind: 'number', op: 'eq', value: 180 },
  },
  {
    kind: 'number',
    operator: 'not_equal_to',
    target: HEIGHT,
    condition: { operator: 'not_equal_to', value: -3.25 },
    test: { kind: 'number', op: 'ne', value: -3.25 },
  },
  {
    kind: 'text',
    operator: 'equal_to',
    target: LOCALITY,
    condition: { operator: 'equal_to', value: ' Stuttgart\u0085', match_case: true },
    test: { kind: 'text', op: 'eq', text: 'Stuttgart', matchCase: true },
  },
  {
    kind: 'text',
    operator: 'not_equal_to',
    target: LOCALITY,
    condition: { operator: 'not_equal_to', value: 'KO\u0308LN', match_case: false },
    test: { kind: 'text', op: 'ne', text: 'k\u00f6ln', matchCase: false },
  },
  {
    kind: 'text',
    operator: 'contains',
    target: LOCALITY,
    condition: { operator: 'contains', value: 'STRA\u1e9eE', match_case: false },
    test: { kind: 'text', op: 'contains', text: 'strasse', matchCase: false },
  },
  {
    kind: 'text',
    operator: 'not_contains',
    target: LOCALITY,
    condition: { operator: 'not_contains', value: 'Gart' },
    test: { kind: 'text', op: 'not_contains', text: 'gart', matchCase: false },
  },
  {
    kind: 'enum',
    operator: 'includes_one_of',
    target: target('pid', 'nationalities'),
    condition: { operator: 'includes_one_of', values: ['DE', 'AT'] },
    test: { kind: 'enum', op: 'one_of', values: ['de', 'at'] },
  },
  {
    kind: 'enum',
    operator: 'includes_none_of',
    target: target('pid', 'sex'),
    condition: { operator: 'includes_none_of', values: [0, 2] },
    test: { kind: 'enum', op: 'none_of', values: [0, 2] },
  },
  {
    kind: 'date',
    operator: 'before',
    target: EXPIRY,
    condition: { operator: 'before', date: '2030-01-01' },
    test: { kind: 'date', op: 'before', date: 741078 },
  },
  {
    kind: 'date',
    operator: 'after',
    target: EXPIRY,
    condition: { operator: 'after', date: '0001-01-01' },
    test: { kind: 'date', op: 'after', date: 1 },
  },
  {
    kind: 'date',
    operator: 'on',
    target: EXPIRY,
    condition: { operator: 'on', date: '9999-12-31' },
    test: { kind: 'date', op: 'on', date: 3652059 },
  },
  {
    kind: 'date',
    operator: 'at_least_years_ago',
    target: BIRTHDATE,
    condition: { operator: 'at_least_years_ago', years: 18 },
    test: { kind: 'date', op: 'at_least_years_ago', count: 18, unit: 'years' },
  },
  {
    kind: 'date',
    operator: 'less_than_years_ago',
    target: BIRTHDATE,
    condition: { operator: 'less_than_years_ago', years: 1 },
    test: { kind: 'date', op: 'less_than_years_ago', count: 1, unit: 'years' },
  },
  {
    kind: 'date',
    operator: 'exactly_years_ago',
    target: BIRTHDATE,
    condition: { operator: 'exactly_years_ago', years: 21 },
    test: { kind: 'date', op: 'exactly_years_ago', count: 21, unit: 'years' },
  },
  {
    kind: 'date',
    operator: 'at_least_from_now',
    target: EXPIRY,
    condition: { operator: 'at_least_from_now', amount: 6, unit: 'months' },
    test: { kind: 'date', op: 'at_least_from_now', count: 6, unit: 'months' },
  },
  {
    kind: 'date',
    operator: 'less_than_from_now',
    target: EXPIRY,
    condition: { operator: 'less_than_from_now', amount: 2, unit: 'years' },
    test: { kind: 'date', op: 'less_than_from_now', count: 2, unit: 'years' },
  },
];

/** "Driving licence – Licence class B – Issue date is at least 2 years ago" */
const CLASS_B_ISSUE = formulaOf(target('mdl', 'driving_privileges', 'issue_date', 'B'), {
  operator: 'at_least_years_ago',
  years: 2,
});

const HELD_B = literal(CLASSES_KEY, { kind: 'enum', op: 'one_of', values: ['b'] });
const B_ISSUED = literal('mdl.driving_privileges.issue_date#B', {
  kind: 'date',
  op: 'at_least_years_ago',
  count: 2,
  unit: 'years',
});

const LICENCE_CLASSES: Variable = {
  key: CLASSES_KEY,
  kind: 'enum',
  multiple: true,
  values: CLASSES,
};

const A = literal('mdl.height', { kind: 'number', op: 'gt', value: 170 });
const B = literal('pid.family_name', {
  kind: 'text',
  op: 'eq',
  text: 'm\u00fcller',
  matchCase: false,
});
const C = literal('pid.sex', { kind: 'enum', op: 'one_of', values: [1] }, true);

/** Formulas of every shape, nested, with both booleans */
const FORMULAS: Formula[] = [
  true,
  false,
  A,
  C,
  { and: [] },
  { or: [] },
  { and: [HELD_B, B_ISSUED] },
  { or: [{ and: [A, B] }, C, true] },
  { and: [{ or: [A, false, { and: [B, C] }] }, { or: [] }] },
];

/** Whether a citizen with `values` (by variable key), who shares on `day`, meets `formula` */
function met(formula: Formula, values: ReadonlyMap<string, unknown>, day: number): boolean {
  if (typeof formula === 'boolean') {
    return formula;
  }
  if ('and' in formula) {
    return formula.and.every((member) => met(member, values, day));
  }
  if ('or' in formula) {
    return formula.or.some((member) => met(member, values, day));
  }
  if (!values.has(formula.variable)) {
    throw new Error(`The citizen has no value for ${formula.variable}`);
  }
  return literalHolds(formula, values.get(formula.variable), day);
}

/** A literal's membership test, by the theories where they exist, else as the evaluator compares */
function literalHolds(of: Literal, value: unknown, day: number): boolean {
  const { test } = of;
  switch (test.kind) {
    case 'number':
      return numberHolds({ ...of, test }, value as number);
    case 'enum':
      return enumHolds({ ...of, test }, value as EnumValue[]);
    case 'text':
      return textHolds({ ...of, test }, value as string);
    case 'date':
      return dateHolds({ ...of, test }, value as number, day);
  }
}

/** `_text_holds()` on the citizen's text, against the literal's normalised text */
function textHolds(of: Literal<TextTest>, value: string): boolean {
  const text = normalisedText(value, of.test.matchCase);
  const expected = of.test.text;
  const holds = {
    eq: text === expected,
    ne: text !== expected,
    contains: text.includes(expected),
    not_contains: !text.includes(expected),
  }[of.test.op];
  return holds !== of.negated;
}

/** `_date_holds()` on the citizen's date and the day of sharing, both day numbers */
function dateHolds(of: Literal<DateTest>, value: number, day: number): boolean {
  const { test } = of;
  let holds: boolean;
  switch (test.op) {
    case 'before':
      holds = value < test.date;
      break;
    case 'after':
      holds = value > test.date;
      break;
    case 'on':
      holds = value === test.date;
      break;
    case 'at_least_years_ago':
      holds = day >= yearsAfter(value, test.count);
      break;
    case 'less_than_years_ago':
      holds = day < yearsAfter(value, test.count);
      break;
    case 'exactly_years_ago':
      holds = yearsAfter(value, test.count) <= day && day < yearsAfter(value, test.count + 1);
      break;
    case 'at_least_from_now':
    case 'less_than_from_now': {
      const threshold =
        test.unit === 'years' ? yearsAfter(day, test.count) : monthsAfter(day, test.count);
      holds = test.op === 'at_least_from_now' ? value >= threshold : value < threshold;
      break;
    }
  }
  return holds !== of.negated;
}

/**
 * The keys of delivered enum values as `_enum_key()` reads them. The vectors' values are printable
 * ASCII, where Python's `strip()` and `casefold()` are `trim()` and `toLowerCase()`
 */
function keysOf(items: readonly unknown[], asCodes: boolean): EnumValue[] {
  return items.flatMap((item): EnumValue[] => {
    if (typeof item === 'number') {
      return asCodes && Number.isInteger(item) ? [item] : [];
    }
    if (typeof item !== 'string') {
      return [];
    }
    const text = item.trim();
    if (asCodes) {
      return /^\d+$/.test(text) ? [Number(text)] : [];
    }
    return text === '' ? [] : [text.toLowerCase()];
  });
}

/**
 * The citizen of a vector: each variable's value as the evaluator reads it from the delivered
 * value (`_value_of()`). A class's date has a value only when the licence lists the class
 */
function applicantOf(vector: OutcomeVector, variables: Variable[]): Map<string, unknown> {
  const { part, licence_class: licenceClass } = vector.target;
  const values = new Map<string, unknown>();
  for (const variable of variables) {
    if (variable.key === CLASSES_KEY || licenceClass !== null) {
      const entries = vector.value as PrivilegeEntry[];
      if (variable.kind === 'enum') {
        const codes = entries.map((entry) => entry.vehicle_category_code);
        values.set(variable.key, keysOf(codes, false));
        continue;
      }
      const entry = entries.find(
        (each) =>
          String(each.vehicle_category_code).trim().toLowerCase() ===
          String(licenceClass).toLowerCase()
      );
      if (entry) {
        values.set(variable.key, dayNumber(String(entry[String(part)])));
      }
      continue;
    }
    const delivered = part === null ? vector.value : (vector.value as PrivilegeEntry)[part];
    if (variable.kind === 'enum') {
      const asCodes = variable.values.every((value) => typeof value === 'number');
      const items = Array.isArray(delivered) ? delivered : [delivered];
      values.set(variable.key, keysOf(items, asCodes));
    } else if (variable.kind === 'date') {
      values.set(variable.key, dayNumber(String(delivered)));
    } else {
      values.set(variable.key, delivered);
    }
  }
  return values;
}

describe('variableKey', () => {
  it('names the document type and the field', () => {
    expect(variableKey(target('pid', 'family_name'))).toBe(FAMILY_NAME_KEY);
  });

  it('adds the part of a field made of parts', () => {
    expect(variableKey(target('pid', 'place_of_birth', 'locality'))).toBe(
      'pid.place_of_birth.locality'
    );
    expect(variableKey(target('mdl', 'driving_privileges', 'classes'))).toBe(CLASSES_KEY);
  });

  it('adds the class of a licence class’s date', () => {
    expect(variableKey(target('mdl', 'driving_privileges', 'issue_date', 'B'))).toBe(
      'mdl.driving_privileges.issue_date#B'
    );
    expect(variableKey(target('mdl', 'driving_privileges', 'expiry_date', 'BE'))).toBe(
      'mdl.driving_privileges.expiry_date#BE'
    );
  });
});

describe('ruleFormula', () => {
  describe('every operator of every kind', () => {
    it('has a case for each operator of OPERATORS, and no other', () => {
      const covered = OPERATOR_CASES.map(({ kind, operator }) => `${kind}.${operator}`);
      const operators = Object.values(OPERATORS).flatMap((definitions) =>
        definitions.map(({ kind, operator }) => `${kind}.${operator}`)
      );
      expect(covered).toEqual(operators);
    });

    it.each(OPERATOR_CASES)('turns $kind $operator into one literal', (each) => {
      const result = formulaOf(each.target, each.condition);
      expect(result?.formula).toEqual(literal(variableKey(each.target), each.test));
      expect(result?.variables).toHaveLength(1);
      expect(result?.variables[0].key).toBe(variableKey(each.target));
      expect(result?.variables[0].kind).toBe(each.kind);
    });
  });

  describe('numbers', () => {
    it('keeps the number as given, decimals and signs included', () => {
      const result = formulaOf(HEIGHT, { operator: 'greater_than', value: 1e-7 });
      expect(result?.formula).toEqual(
        literal('mdl.height', { kind: 'number', op: 'gt', value: 1e-7 })
      );
    });
  });

  describe('texts', () => {
    it('normalises the rule’s text as _normalised_text() does, for both letter-case settings', () => {
      const text = (value: string, matchCase: boolean | null) =>
        formulaOf(LOCALITY, { operator: 'equal_to', value, match_case: matchCase })?.formula;
      expect(text(' Ko\u0308ln ', true)).toEqual(
        literal('pid.address_locality', {
          kind: 'text',
          op: 'eq',
          text: 'K\u00f6ln',
          matchCase: true,
        })
      );
      expect(text('STRA\u1e9eE', false)).toEqual(
        literal('pid.address_locality', {
          kind: 'text',
          op: 'eq',
          text: 'strasse',
          matchCase: false,
        })
      );
      expect(text('Stra\u00dfe', true)).toEqual(
        literal('pid.address_locality', {
          kind: 'text',
          op: 'eq',
          text: 'Stra\u00dfe',
          matchCase: true,
        })
      );
    });

    it('ignores letter case when match_case is null or missing, as bool(None) does', () => {
      expect(
        formulaOf(LOCALITY, { operator: 'contains', value: 'A', match_case: null })?.formula
      ).toEqual(
        literal('pid.address_locality', {
          kind: 'text',
          op: 'contains',
          text: 'a',
          matchCase: false,
        })
      );
    });

    it('keeps U+FEFF, which Python doesn’t strip', () => {
      expect(formulaOf(LOCALITY, { operator: 'equal_to', value: '\ufeff' })?.formula).toEqual(
        literal('pid.address_locality', {
          kind: 'text',
          op: 'eq',
          text: '\ufeff',
          matchCase: false,
        })
      );
    });
  });

  describe('enums', () => {
    it('folds texts, reads codes as integers, and keeps each key once, in the rule’s order', () => {
      const nationalities = target('pid', 'nationalities');
      const sex = target('pid', 'sex');
      expect(
        formulaOf(nationalities, {
          operator: 'includes_one_of',
          values: ['AT', ' de ', 'DE', 'at'],
        })?.formula
      ).toEqual(literal('pid.nationalities', { kind: 'enum', op: 'one_of', values: ['at', 'de'] }));
      expect(
        formulaOf(sex, { operator: 'includes_one_of', values: [2, ' 1 ', '2', 1.5, 'x'] })?.formula
      ).toEqual(literal('pid.sex', { kind: 'enum', op: 'one_of', values: [2, 1] }));
    });

    it('takes kind, multiple and the set’s keys from the catalog and the value sets', () => {
      const variableOf = (ruleTarget: RuleTarget, values: (string | number)[]) =>
        formulaOf(ruleTarget, { operator: 'includes_one_of', values })?.variables;
      expect(variableOf(target('pid', 'nationalities'), ['DE'])).toEqual([
        { key: 'pid.nationalities', kind: 'enum', multiple: true, values: COUNTRIES },
      ]);
      expect(variableOf(target('mdl', 'nationality'), ['DE'])).toEqual([
        { key: 'mdl.nationality', kind: 'enum', multiple: false, values: COUNTRIES },
      ]);
      expect(variableOf(target('pid', 'place_of_birth', 'country'), ['DE'])).toEqual([
        { key: 'pid.place_of_birth.country', kind: 'enum', multiple: false, values: COUNTRIES },
      ]);
      expect(variableOf(target('mdl', 'driving_privileges', 'classes'), ['B'])).toEqual([
        LICENCE_CLASSES,
      ]);
      expect(variableOf(target('pid', 'sex'), [1])).toEqual([
        { key: 'pid.sex', kind: 'enum', multiple: false, values: [0, 1, 2] },
      ]);
      expect(variableOf(target('mdl', 'eye_colour'), ['blue'])).toEqual([
        { key: 'mdl.eye_colour', kind: 'enum', multiple: false, values: ['blue', 'green'] },
      ]);
    });

    it('reads multiple from the field’s multiple_values', () => {
      const single: LiteralContext = {
        documents: [
          {
            ...PID,
            fields: PID.fields.map((field) => ({ ...field, multiple_values: false })),
          },
        ],
        optionSets: OPTION_SETS,
      };
      expect(
        formulaOf(
          target('pid', 'nationalities'),
          { operator: 'includes_one_of', values: ['DE'] },
          single
        )?.variables[0].multiple
      ).toBe(false);
    });

    it('gives a variable of the same key the same content in every rule', () => {
      const first = formulaOf(target('pid', 'nationalities'), {
        operator: 'includes_one_of',
        values: ['DE'],
      });
      const second = formulaOf(target('pid', 'nationalities'), {
        operator: 'includes_none_of',
        values: ['FR'],
      });
      expect(first?.variables).toEqual(second?.variables);
    });
  });

  describe('the variables of the other kinds', () => {
    it.each([
      [LOCALITY, { operator: 'contains', value: 'a' }, plain('pid.address_locality', 'text')],
      [HEIGHT, { operator: 'less_than', value: 3 }, plain('mdl.height', 'number')],
      [BIRTHDATE, { operator: 'exactly_years_ago', years: 3 }, plain('pid.birthdate', 'date')],
      [
        target('pid', 'place_of_birth', 'locality'),
        { operator: 'equal_to', value: 'Wien' },
        plain('pid.place_of_birth.locality', 'text'),
      ],
    ] as [RuleTarget, Condition, Variable][])(
      'has no values and holds one value: %j',
      (ruleTarget, condition, variable) => {
        expect(formulaOf(ruleTarget, condition)?.variables).toEqual([variable]);
      }
    );
  });

  describe('a licence class’s date', () => {
    it('is held(K) ∧ c(date_K), with the variables of both', () => {
      expect(CLASS_B_ISSUE).toEqual({
        formula: { and: [HELD_B, B_ISSUED] },
        variables: [LICENCE_CLASSES, plain('mdl.driving_privileges.issue_date#B', 'date')],
      });
    });

    it('takes held(K) to be the rule "Licence classes includes one of K"', () => {
      const classes = formulaOf(target('mdl', 'driving_privileges', 'classes'), {
        operator: 'includes_one_of',
        values: ['B'],
      });
      expect(classes?.formula).toEqual(HELD_B);
      expect(classes?.variables).toEqual([LICENCE_CLASSES]);
    });

    it('has its own variable for each class and each date', () => {
      const expiry = formulaOf(target('mdl', 'driving_privileges', 'expiry_date', 'BE'), {
        operator: 'before',
        date: '2035-02-28',
      });
      expect(expiry?.formula).toEqual({
        and: [
          literal(CLASSES_KEY, { kind: 'enum', op: 'one_of', values: ['be'] }),
          literal('mdl.driving_privileges.expiry_date#BE', {
            kind: 'date',
            op: 'before',
            date: dayNumber('2035-02-28'),
          }),
        ],
      });
    });

    it('negates to ¬held(K) ∨ ¬c(date_K)', () => {
      const formula = CLASS_B_ISSUE?.formula ?? true;
      const negation = negate(formula);
      expect(negation).toEqual({
        or: [
          { ...HELD_B, negated: true },
          { ...B_ISSUED, negated: true },
        ],
      });
      expect(negate(negation)).toEqual(formula);
    });

    it('is met only by a licence that lists the class, and its negation by any other', () => {
      const formula = CLASS_B_ISSUE?.formula ?? true;
      const today = dayNumber('2026-10-28');
      const issued = dayNumber('2020-03-01');
      const holding = new Map<string, unknown>([
        [CLASSES_KEY, ['b', 'be']],
        ['mdl.driving_privileges.issue_date#B', issued],
      ]);
      const without = new Map<string, unknown>([[CLASSES_KEY, ['be']]]);
      expect(met(formula, holding, today)).toBe(true);
      expect(met(negate(formula), holding, today)).toBe(false);
      expect(met(formula, without, today)).toBe(false);
      expect(met(negate(formula), without, today)).toBe(true);
    });
  });

  describe('a rule without a formula', () => {
    const issueDate = (licenceClass: string | null) =>
      target('mdl', 'driving_privileges', 'issue_date', licenceClass);
    const years = { operator: 'at_least_years_ago', years: 2 };

    it.each([
      ['no target', null, { operator: 'contains', value: 'a' }],
      ['no condition', LOCALITY, null],
      [
        'a document that isn’t requested',
        target('eid', 'family_name'),
        { operator: 'contains', value: 'a' },
      ],
      [
        'a field that isn’t requested',
        target('pid', 'email'),
        { operator: 'contains', value: 'a' },
      ],
      ['an image', target('pid', 'picture'), { operator: 'equal_to', value: 'a' }],
      [
        'a field made of parts without its part',
        target('pid', 'place_of_birth'),
        { operator: 'contains', value: 'a' },
      ],
      [
        'a part its field doesn’t have',
        target('pid', 'place_of_birth', 'street'),
        { operator: 'contains', value: 'a' },
      ],
      [
        'a part on a field without parts',
        target('pid', 'family_name', 'locality'),
        { operator: 'contains', value: 'a' },
      ],
      [
        'a class on a field without parts',
        target('pid', 'family_name', null, 'B'),
        { operator: 'contains', value: 'a' },
      ],
      [
        'a class on a part that isn’t per class',
        target('mdl', 'driving_privileges', 'classes', 'B'),
        { operator: 'includes_one_of', values: ['B'] },
      ],
      ['a class’s date without a class', issueDate(null), years],
      ['a class’s date with an empty class', issueDate(''), years],
      ['a class that isn’t in the set', issueDate('Z'), years],
      ['a class written in another case than the set’s code', issueDate('b'), years],
      ['an operator of another kind', HEIGHT, { operator: 'contains', value: 1 }],
      ['an unknown operator', HEIGHT, { operator: 'at_most', value: 1 }],
      ['an operator named after an object property', HEIGHT, { operator: 'constructor', value: 1 }],
      ['a number written as text', HEIGHT, { operator: 'equal_to', value: '21' }],
      ['no number', HEIGHT, { operator: 'equal_to', value: null }],
      ['a number that isn’t finite', HEIGHT, { operator: 'less_than', value: Infinity }],
      ['NaN', HEIGHT, { operator: 'less_than', value: NaN }],
      ['a text that isn’t a text', LOCALITY, { operator: 'equal_to', value: 21 }],
      ['an empty text', LOCALITY, { operator: 'equal_to', value: '' }],
      [
        'a text of Python’s whitespace only',
        LOCALITY,
        { operator: 'equal_to', value: ' \u0085\u3000 ' },
      ],
      ['no enum values', target('pid', 'sex'), { operator: 'includes_one_of', values: [] }],
      ['null enum values', target('pid', 'sex'), { operator: 'includes_one_of', values: null }],
      [
        'no readable code',
        target('pid', 'sex'),
        { operator: 'includes_one_of', values: [1.5, 'one'] },
      ],
      [
        'a code for a set of texts',
        target('mdl', 'nationality'),
        { operator: 'includes_one_of', values: [1] },
      ],
      [
        'a text that folds to nothing',
        target('mdl', 'nationality'),
        { operator: 'includes_one_of', values: [' '] },
      ],
      ['no date', EXPIRY, { operator: 'before', date: null }],
      ['a date the calendar doesn’t have', EXPIRY, { operator: 'before', date: '2026-02-30' }],
      ['a date with spaces', EXPIRY, { operator: 'before', date: ' 2030-01-01' }],
      ['a date with a time', EXPIRY, { operator: 'before', date: '2030-01-01T00:00:00+01:00' }],
      ['0 years', BIRTHDATE, { operator: 'at_least_years_ago', years: 0 }],
      ['a part of a year', BIRTHDATE, { operator: 'exactly_years_ago', years: 1.5 }],
      ['no years', BIRTHDATE, { operator: 'less_than_years_ago', years: null }],
      ['no unit', EXPIRY, { operator: 'at_least_from_now', amount: 6, unit: null }],
      ['another unit', EXPIRY, { operator: 'at_least_from_now', amount: 6, unit: 'days' }],
      ['an amount of 0', EXPIRY, { operator: 'less_than_from_now', amount: 0, unit: 'months' }],
      ['no amount', EXPIRY, { operator: 'less_than_from_now', amount: null, unit: 'years' }],
    ] as [string, RuleTarget | null, Condition | null][])('%s', (_, ruleTarget, condition) => {
      expect(formulaOf(ruleTarget, condition)).toBeNull();
    });

    it('when the value sets aren’t loaded, for an enum and a licence class’s date only', () => {
      const unloaded: LiteralContext = { documents: CONTEXT.documents, optionSets: [] };
      expect(
        formulaOf(target('pid', 'sex'), { operator: 'includes_one_of', values: [1] }, unloaded)
      ).toBeNull();
      expect(formulaOf(issueDate('B'), years, unloaded)).toBeNull();
      expect(formulaOf(BIRTHDATE, years, unloaded)?.formula).toEqual(
        literal('pid.birthdate', {
          kind: 'date',
          op: 'at_least_years_ago',
          count: 2,
          unit: 'years',
        })
      );
    });

    it('when the value set is empty', () => {
      const empty: LiteralContext = {
        documents: CONTEXT.documents,
        optionSets: [{ key: 'sex', options: [] }],
      };
      expect(
        formulaOf(target('pid', 'sex'), { operator: 'includes_one_of', values: [1] }, empty)
      ).toBeNull();
    });

    it('when a field of the rules state lacks keys, without throwing', () => {
      const partial = { document_type: 'pid', field: 'family_name' } as RuleTarget;
      const malformed = { operator: 'includes_one_of', values: 'DE' } as unknown as Condition;
      expect(formulaOf(partial, { operator: 'contains', value: 'a' })?.formula).toEqual(
        literal(FAMILY_NAME_KEY, { kind: 'text', op: 'contains', text: 'a', matchCase: false })
      );
      expect(formulaOf(target('pid', 'nationalities'), malformed)).toBeNull();
    });
  });

  describe('the evaluator’s vectors', () => {
    it('has rule outcomes of every kind to replay', () => {
      const kinds = new Set(OUTCOMES.map((vector) => vector.kind));
      expect([...kinds].sort()).toEqual(['date', 'enum', 'number', 'text']);
    });

    it.each(OUTCOMES)('agrees with the evaluator: $kind, $description', (vector) => {
      const result = formulaOf(vector.target, vector.condition);
      expect(result).not.toBeNull();
      const formula = result?.formula ?? true;
      const applicant = applicantOf(vector, result?.variables ?? []);
      const day = dayNumber(vector.today);
      expect(met(formula, applicant, day)).toBe(vector.outcome === 'met');
      expect(met(negate(formula), applicant, day)).toBe(vector.outcome !== 'met');
    });
  });
});

describe('negate', () => {
  it('swaps true and false', () => {
    expect(negate(true)).toBe(false);
    expect(negate(false)).toBe(true);
  });

  it('flips a literal’s negated and keeps its test', () => {
    expect(negate(A)).toEqual({ ...A, negated: true });
    expect(negate(C)).toEqual({ ...C, negated: false });
  });

  it('gives the De Morgan dual of AND and OR', () => {
    expect(negate({ or: [{ and: [A, B] }, C, true] })).toEqual({
      and: [{ or: [negate(A), negate(B)] }, negate(C), false],
    });
    expect(negate({ and: [] })).toEqual({ or: [] });
  });

  it.each(FORMULAS)('gives back the formula when applied twice: %j', (formula) => {
    expect(negate(negate(formula))).toEqual(formula);
  });

  it.each(FORMULAS)('leaves the given formula as it is: %j', (formula) => {
    const before = structuredClone(formula);
    negate(formula);
    expect(formula).toEqual(before);
  });

  it('is met exactly when the formula isn’t', () => {
    const values = new Map<string, unknown>([
      ['mdl.height', 180],
      ['pid.family_name', 'M\u00dcLLER'],
      ['pid.sex', [2]],
      [CLASSES_KEY, ['b']],
      ['mdl.driving_privileges.issue_date#B', dayNumber('2020-03-01')],
    ]);
    const day = dayNumber('2026-10-28');
    for (const formula of FORMULAS) {
      expect(met(negate(formula), values, day)).toBe(!met(formula, values, day));
    }
  });
});

describe('simplify', () => {
  it('leaves booleans and literals as they are', () => {
    expect(simplify(true)).toBe(true);
    expect(simplify(false)).toBe(false);
    expect(simplify(A)).toBe(A);
  });

  it('takes true out of AND, and is false with a false', () => {
    expect(simplify({ and: [true, A, true, B] })).toEqual({ and: [A, B] });
    expect(simplify({ and: [A, false, B] })).toBe(false);
  });

  it('takes false out of OR, and is true with a true', () => {
    expect(simplify({ or: [false, A, B, false] })).toEqual({ or: [A, B] });
    expect(simplify({ or: [A, true] })).toBe(true);
  });

  it('turns a level with one formula into that formula, and one with none into its unit', () => {
    expect(simplify({ and: [true, A] })).toBe(A);
    expect(simplify({ or: [B] })).toBe(B);
    expect(simplify({ and: [] })).toBe(true);
    expect(simplify({ or: [] })).toBe(false);
    expect(simplify({ and: [true, true] })).toBe(true);
    expect(simplify({ or: [false] })).toBe(false);
  });

  it('works from the innermost level out', () => {
    expect(simplify({ and: [{ or: [false, { and: [true, A] }] }, true, { or: [B, C] }] })).toEqual({
      and: [A, { or: [B, C] }],
    });
    expect(simplify({ or: [{ and: [A, { or: [] }] }, { and: [{ and: [] }, B] }] })).toBe(B);
    expect(simplify({ and: [A, { or: [B, { and: [] }] }] })).toBe(A);
  });

  it.each(FORMULAS)('leaves no boolean inside a level: %j', (formula) => {
    const hasBooleanInside = (each: Formula): boolean =>
      typeof each !== 'boolean' &&
      !isLiteral(each) &&
      ('and' in each ? each.and : each.or).some(
        (member) => typeof member === 'boolean' || hasBooleanInside(member)
      );
    const simplified = simplify(formula);
    expect(hasBooleanInside(simplified)).toBe(false);
  });

  it.each(FORMULAS)('is met exactly when the formula is: %j', (formula) => {
    const day = dayNumber('2026-10-28');
    const applicants = [
      new Map<string, unknown>([
        ['mdl.height', 180],
        ['pid.family_name', 'M\u00fcller'],
        ['pid.sex', [2]],
        [CLASSES_KEY, ['b']],
        ['mdl.driving_privileges.issue_date#B', dayNumber('2020-03-01')],
      ]),
      new Map<string, unknown>([
        ['mdl.height', 150],
        ['pid.family_name', 'Meier'],
        ['pid.sex', [1]],
        [CLASSES_KEY, ['be']],
      ]),
    ];
    for (const applicant of applicants) {
      expect(met(simplify(formula), applicant, day)).toBe(met(formula, applicant, day));
    }
  });
});

describe('allOf and anyOf', () => {
  it('build AND and OR without true and false', () => {
    expect(allOf([A, true, B])).toEqual({ and: [A, B] });
    expect(allOf([A, false])).toBe(false);
    expect(allOf([true])).toBe(true);
    expect(allOf([C])).toBe(C);
    expect(anyOf([A, false, B])).toEqual({ or: [A, B] });
    expect(anyOf([A, true])).toBe(true);
    expect(anyOf([])).toBe(false);
    expect(anyOf([negate(C)])).toEqual(negate(C));
  });

  it('look at the formulas themselves, not inside them', () => {
    expect(allOf([{ or: [true, A] }, B])).toEqual({ and: [{ or: [true, A] }, B] });
  });
});

describe('isLiteral', () => {
  it('tells literals from booleans, AND and OR', () => {
    expect(FORMULAS.map(isLiteral)).toEqual([
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
