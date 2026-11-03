import { describe, expect, it } from 'vitest';

import type { BranchInput, RuleItem } from '../../../types/form-connections';
import { dayNumber } from '../checks/calendar';
import type { KeyedBranch } from '../checks/checkedTree';
import { negate, ruleFormula } from '../checks/literals';
import type { Formula } from '../checks/types';
import { evaluateBranch } from '../evaluation';
import { CONTEXT, mainBranch, rule, target } from '../testData';
import { applicantOf } from './applicant';
import { checkedBranchesOf, personaFieldsOf } from './fields';
import { branchClassesOf, branchFormulaOf } from './goals';
import {
  substituteBranch,
  substituteBranches,
  substitutedClassFormulas,
  substitutedItemFormulas,
  substituteRule,
  type Substitution,
} from './substitute';
import type { Persona, PersonaValue } from './types';

const TODAY = '2026-11-01';
const SHARED_ON = dayNumber(TODAY);

const BIRTHDATE = 'pid.birthdate';
const CITY_KEY = 'pid.address_locality';
const CLASSES = 'mdl.driving_privileges.classes';
const ISSUE_B = 'mdl.driving_privileges.issue_date#B';

// Standard's rules of the spec's example: at least 21, lives in Stuttgart, holds class B and has
// held it for at least 2 years
const AGE = rule(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 });
const CITY = rule(2, target('pid', 'address_locality'), {
  operator: 'equal_to',
  value: 'Stuttgart',
  match_case: false,
});
const CLASS_B = rule(3, target('mdl', 'driving_privileges', 'classes'), {
  operator: 'includes_one_of',
  values: ['B'],
});
const HELD_B = rule(4, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
  operator: 'at_least_years_ago',
  years: 2,
});
const RULES = [AGE, CITY, CLASS_B, HELD_B];

function keyed(branch: BranchInput, key: string): BranchInput & KeyedBranch {
  return { ...branch, key };
}

const STANDARD = keyed(mainBranch(RULES), 'standard');
const FIELDS = personaFieldsOf([STANDARD], CONTEXT);

function substitution(fixed: Record<string, PersonaValue>): Substitution {
  return { fixed, fields: FIELDS, context: CONTEXT, sharedOn: SHARED_ON };
}

/** A rule's checked formula, which substitution takes as given */
function formulaOf(each: RuleItem): Formula {
  const read = ruleFormula(each, CONTEXT);
  if (read === null) {
    throw new Error('the rule has no formula');
  }
  return read.formula;
}

/** `held(K)` and the date's literal of a licence class's date rule */
function partsOf(each: RuleItem): [Formula, Formula] {
  const formula = formulaOf(each);
  if (typeof formula === 'boolean' || !('and' in formula)) {
    throw new Error('not a licence class date');
  }
  return [formula.and[0], formula.and[1]];
}

function substituted(each: RuleItem, fixed: Record<string, PersonaValue>): Formula {
  return substituteRule(each, formulaOf(each), substitution(fixed));
}

describe('a rule whose values are all fixed', () => {
  it('becomes true when the evaluator says it is met', () => {
    expect(substituted(AGE, { [BIRTHDATE]: '1990-05-17' })).toBe(true);
    expect(substituted(CITY, { [CITY_KEY]: 'stuttgart' })).toBe(true);
    expect(substituted(CLASS_B, { [CLASSES]: ['C', 'B'] })).toBe(true);
  });

  it('becomes false when it is not met', () => {
    expect(substituted(AGE, { [BIRTHDATE]: '2010-05-17' })).toBe(false);
    expect(substituted(CITY, { [CITY_KEY]: 'Esslingen' })).toBe(false);
    expect(substituted(CLASS_B, { [CLASSES]: ['C'] })).toBe(false);
  });

  it('becomes false when the value is empty, which counts as not met', () => {
    expect(substituted(AGE, { [BIRTHDATE]: null })).toBe(false);
    expect(substituted(CITY, { [CITY_KEY]: '' })).toBe(false);
    expect(substituted(CLASS_B, { [CLASSES]: [] })).toBe(false);
  });

  it('makes ¬X true for a rule X on an empty value, as the evaluation counts it', () => {
    const empty = substituted(AGE, { [BIRTHDATE]: null });
    expect(empty).toBe(false);
    expect(negate(empty)).toBe(true);
    // Negating the formula first would leave a literal that an empty date doesn't meet
    expect(negate(formulaOf(AGE))).toMatchObject({ negated: true });
    // A failed rule is not met either, so its negation is true as well
    expect(negate(substituted(AGE, { [BIRTHDATE]: '2010-05-17' }))).toBe(true);
    expect(negate(substituted(AGE, { [BIRTHDATE]: '1990-05-17' }))).toBe(false);
  });

  it('counts a hidden value as fixed', () => {
    // The persona's own value for a field that is no longer checked changes nothing
    expect(substituted(AGE, { [BIRTHDATE]: '2010-05-17', 'pid.family_name': 'Muster' })).toBe(
      false
    );
    // A hidden date of a class not held: the rule is not met whatever the date is
    const held = substituted(HELD_B, { [CLASSES]: ['C'], [ISSUE_B]: '2001-01-01' });
    expect(held).toBe(false);
  });
});

describe('a rule with none of its values fixed', () => {
  it('keeps its formula', () => {
    expect(substituted(AGE, {})).toEqual(formulaOf(AGE));
    expect(substituted(CITY, { [BIRTHDATE]: '1990-05-17' })).toEqual(formulaOf(CITY));
    expect(substituted(HELD_B, { [BIRTHDATE]: '1990-05-17' })).toEqual(formulaOf(HELD_B));
  });
});

describe("class K's date with the classes fixed and the date free", () => {
  const [, dateLiteral] = partsOf(HELD_B);

  it('becomes false when the classes are empty', () => {
    expect(substituted(HELD_B, { [CLASSES]: [] })).toBe(false);
    expect(substituted(HELD_B, { [CLASSES]: null })).toBe(false);
  });

  it('becomes false when the classes lack K', () => {
    expect(substituted(HELD_B, { [CLASSES]: ['C', 'AM'] })).toBe(false);
  });

  it("becomes the date's literal when the classes include K", () => {
    expect(substituted(HELD_B, { [CLASSES]: ['B'] })).toEqual(dateLiteral);
    expect(substituted(HELD_B, { [CLASSES]: ['C', 'B'] })).toEqual(dateLiteral);
  });
});

describe("class K's date with the date fixed and the classes free", () => {
  const [held] = partsOf(HELD_B);

  it('becomes false when the date is empty', () => {
    expect(substituted(HELD_B, { [ISSUE_B]: null })).toBe(false);
    expect(substituted(HELD_B, { [ISSUE_B]: '' })).toBe(false);
  });

  it('becomes held(K) when the date meets the condition', () => {
    expect(substituted(HELD_B, { [ISSUE_B]: '2015-03-01' })).toEqual(held);
  });

  it('becomes false when the date fails the condition, whatever the classes', () => {
    expect(substituted(HELD_B, { [ISSUE_B]: '2026-01-01' })).toBe(false);
  });
});

describe("class K's date with both fixed", () => {
  it('is the evaluator outcome', () => {
    const met = { [CLASSES]: ['B'], [ISSUE_B]: '2015-03-01' };
    expect(substituted(HELD_B, met)).toBe(true);
    expect(substituted(HELD_B, { ...met, [ISSUE_B]: '2026-01-01' })).toBe(false);
    expect(substituted(HELD_B, { ...met, [ISSUE_B]: null })).toBe(false);
    expect(substituted(HELD_B, { ...met, [CLASSES]: ['C'] })).toBe(false);
  });
});

describe('a branch', () => {
  const [branch] = checkedBranchesOf([STANDARD], CONTEXT, TODAY);

  it('keeps its shape and ids, and changes only the rules whose values are fixed', () => {
    const out = substituteBranch(branch, substitution({ [CITY_KEY]: 'Stuttgart' }));
    expect(out.items.map((item) => item.id)).toEqual(branch.checked.items.map((item) => item.id));
    expect(out.operator).toBe(branch.checked.operator);
    const formulas = out.items.map((item) => (item.type === 'rule' ? item.formula : null));
    expect(formulas[1]).toBe(true);
    expect(formulas[0]).toEqual(formulaOf(AGE));
    expect(formulas[3]).toEqual(formulaOf(HELD_B));
    // The unsubstituted tree is left as it was
    expect(branch.checked.items[1]).toMatchObject({ formula: formulaOf(CITY) });
  });

  it('is the evaluator verdict when every value is fixed', () => {
    const personas: Record<string, PersonaValue>[] = [
      {
        [BIRTHDATE]: '1990-05-17',
        [CITY_KEY]: 'Stuttgart',
        [CLASSES]: ['B'],
        [ISSUE_B]: '2015-03-01',
      },
      {
        [BIRTHDATE]: '1990-05-17',
        [CITY_KEY]: 'Ulm',
        [CLASSES]: ['B'],
        [ISSUE_B]: '2015-03-01',
      },
      { [BIRTHDATE]: null, [CITY_KEY]: 'Stuttgart', [CLASSES]: [], [ISSUE_B]: null },
      {
        [BIRTHDATE]: '1990-05-17',
        [CITY_KEY]: 'Stuttgart',
        [CLASSES]: ['C'],
        [ISSUE_B]: '2015-03-01',
      },
    ];
    for (const values of personas) {
      const persona: Persona = {
        id: 'persona-1',
        name: '',
        values,
        generated: {},
        status: 'ready',
      };
      const verdict = evaluateBranch(
        { origin: 'main', operator: 'and', items: RULES },
        applicantOf(persona, FIELDS),
        SHARED_ON,
        CONTEXT
      ).met;
      const formula = branchFormulaOf(substituteBranch(branch, substitution(values)));
      const children = (formula as { and: Formula[] }).and;
      expect(children.every((child) => typeof child === 'boolean')).toBe(true);
      expect(children.every(Boolean)).toBe(verdict);
    }
  });

  it('keeps a group as a group', () => {
    const group: BranchInput['items'] = [
      AGE,
      {
        type: 'group',
        id: 'group-1',
        name: 'Place',
        mark: null,
        operator: 'or',
        message: null,
        items: [CITY, CLASS_B],
      },
    ];
    const grouped = keyed(mainBranch(group), 'grouped');
    const [input] = checkedBranchesOf([grouped], CONTEXT, TODAY);
    const out = substituteBranch(input, substitution({ [CITY_KEY]: 'Ulm' }));
    const outGroup = out.items[1];
    expect(outGroup).toMatchObject({ type: 'group', id: 'group-1', operator: 'or' });
    expect(branchFormulaOf(out)).toEqual({
      and: [formulaOf(AGE), { or: [false, formulaOf(CLASS_B)] }],
    });
  });

  it('throws when the request lacks a rule', () => {
    expect(() =>
      substituteBranch({ checked: branch.checked, rules: {} }, substitution({}))
    ).toThrow('rule-1');
  });
});

describe('the classes and items of substituted branches', () => {
  const YOUNGER: RuleItem = { ...AGE, condition: { operator: 'at_least_years_ago', years: 19 } };
  const AMBULANCE = keyed(mainBranch([YOUNGER, CITY]), 'ambulance');
  const inputs = checkedBranchesOf([STANDARD, AMBULANCE], CONTEXT, TODAY);
  const original = inputs.map((input) => input.checked);

  it("gives each class's substituted formula, in the classes' order", () => {
    const classes = branchClassesOf(original);
    expect(classes).toHaveLength(2);
    const out = substituteBranches(inputs, substitution({ [CITY_KEY]: 'Stuttgart' }));
    const formulas = substitutedClassFormulas(classes, out);
    expect(formulas[0]).toEqual(branchFormulaOf(out[0]));
    expect(formulas[1]).toEqual(branchFormulaOf(out[1]));
    expect(formulas[1]).toEqual({ and: [formulaOf(YOUNGER), true] });
  });

  it('keys the items by the unsubstituted items, one formula for items that are the same', () => {
    const out = substituteBranches(inputs, substitution({ [CITY_KEY]: 'Stuttgart' }));
    const formulas = substitutedItemFormulas(original, out);
    const keys = [...formulas.keys()];
    // Standard's four rules, Ambulance's age rule; its city rule is Standard's
    expect(keys).toHaveLength(5);
    expect(formulas.get(keys[1])).toBe(true);
    expect(formulas.get(keys[0])).toEqual(formulaOf(AGE));
  });
});
