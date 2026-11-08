import type { Combinator } from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { dayNumber, isoDate } from '../checks/calendar';
import { dateTheory } from '../checks/dateTheory';
import { enumTheory } from '../checks/enumTheory';
import { isLiteral, negate } from '../checks/literals';
import { numberTheory } from '../checks/numberTheory';
import { createSolverMemo, satisfiable } from '../checks/solver';
import { checkedBranchOf, ORACLE_TODAY, randomBranch, withSeed } from '../checks/testOracle';
import { textTheory } from '../checks/textTheory';
import type {
  CheckedItem,
  DateTest,
  EnumTest,
  EnumValue,
  Formula,
  Literal,
  LiteralTest,
  NumberTest,
  TextTest,
  TheoryAnswer,
  Variable,
} from '../checks/types';
import { MAX_AGE, MIN_AGE } from './constants';
import { modelOf, type ModelOptions, plausibilityLiteralsOf } from './models';
import { createRandom } from './random';
import type { Model, PersonaField } from './types';
import { ageOn } from './values';

// Hand-built variables and literals

const TODAY = '2026-11-02';
const TODAY_DAY = dayNumber(TODAY);

function variable(key: string, kind: Variable['kind'], values: EnumValue[] = [], multiple = false) {
  return { key, kind, multiple, values };
}

const HEIGHT = variable('mdl.height', 'number');
const SEX = variable('pid.sex', 'enum', [1, 2, 9]);
const CLASSES = variable('mdl.driving_privileges.classes', 'enum', ['a', 'b', 'c'], true);
const NAME = variable('pid.family_name', 'text');
const BIRTH = variable('pid.birthdate', 'date');
const MDL_BIRTH = variable('mdl.birth_date', 'date');
const AGE = variable('mdl.age_in_years', 'number');
const BIRTH_YEAR = variable('mdl.age_birth_year', 'number');
const EXPIRY = variable('pid.date_of_expiry', 'date');

const VARIABLES: Record<string, Variable> = Object.fromEntries(
  [HEIGHT, SEX, CLASSES, NAME, BIRTH, MDL_BIRTH, AGE, BIRTH_YEAR, EXPIRY].map((each) => [
    each.key,
    each,
  ])
);

function literal(on: Variable, test: LiteralTest): Literal {
  return { variable: on.key, test, negated: false };
}

const height = (op: NumberTest['op'], value: number) =>
  literal(HEIGHT, { kind: 'number', op, value });
const age = (op: NumberTest['op'], value: number) => literal(AGE, { kind: 'number', op, value });
const sex = (op: EnumTest['op'], ...values: EnumValue[]) =>
  literal(SEX, { kind: 'enum', op, values });
const classes = (op: EnumTest['op'], ...values: EnumValue[]) =>
  literal(CLASSES, { kind: 'enum', op, values });
const name = (op: TextTest['op'], text: string, matchCase: boolean) =>
  literal(NAME, { kind: 'text', op, text, matchCase });
const before = (on: Variable, date: string) =>
  literal(on, { kind: 'date', op: 'before', date: dayNumber(date) });
const yearsAgo = (on: Variable, op: 'at_least_years_ago' | 'less_than_years_ago', count: number) =>
  literal(on, { kind: 'date', op, count, unit: 'years' });

/** A persona field of the catalog, as `personaFieldsOf()` gives it */
function field(on: Variable, dateOfBirth = false): PersonaField {
  const [documentType, key] = on.key.split('.');
  return {
    key: on.key,
    documentType,
    documentLabel: documentType,
    label: key,
    field: key,
    part: null,
    licenceClass: null,
    kind: on.kind,
    optionSet: null,
    multiple: on.multiple,
    dateOfBirth,
  };
}

const FIELDS: PersonaField[] = [
  field(BIRTH, true),
  field(MDL_BIRTH, true),
  field(AGE),
  field(BIRTH_YEAR),
  field(HEIGHT),
  field(EXPIRY),
];

const PLAUSIBLE = plausibilityLiteralsOf(FIELDS, VARIABLES, TODAY);

/** Options with a clock that never reaches the deadline, unless given others */
function optionsOf(seed: number, overrides: Partial<ModelOptions> = {}): ModelOptions {
  return {
    deadline: Number.POSITIVE_INFINITY,
    now: () => 0,
    variables: VARIABLES,
    memo: createSolverMemo(),
    today: TODAY,
    random: createRandom(seed),
    ...overrides,
  };
}

// The theories, by the variable's kind

type Value = number | string | readonly EnumValue[];

function holds(each: Literal, value: Value, day: number): boolean {
  const { test } = each;
  switch (test.kind) {
    case 'number':
      return numberTheory.holds({ ...each, test }, value as number, day);
    case 'enum':
      return enumTheory.holds({ ...each, test }, value as readonly EnumValue[], day);
    case 'text':
      return textTheory.holds({ ...each, test }, value as string, day);
    case 'date':
      return dateTheory.holds({ ...each, test }, value as number, day);
  }
}

function ofKind<T extends LiteralTest>(
  literals: readonly Literal[],
  kind: T['kind']
): Literal<T>[] {
  return literals.filter((each) => each.test.kind === kind) as Literal<T>[];
}

function decide(on: Variable, literals: readonly Literal[], day: number): TheoryAnswer<Value> {
  switch (on.kind) {
    case 'number':
      return numberTheory.decide(ofKind<NumberTest>(literals, 'number'), on, day);
    case 'enum':
      return enumTheory.decide(ofKind<EnumTest>(literals, 'enum'), on, day);
    case 'text':
      return textTheory.decide(ofKind<TextTest>(literals, 'text'), on, day);
    case 'date':
      return dateTheory.decide(ofKind<DateTest>(literals, 'date'), on, day);
  }
}

/** Whether the values meet the formula on `day`, judged literal by literal with `holds()` */
function meets(formula: Formula, values: Record<string, Value>, day: number): boolean {
  if (typeof formula === 'boolean') {
    return formula;
  }
  if (isLiteral(formula)) {
    return holds(formula, values[formula.variable], day);
  }
  return 'and' in formula
    ? formula.and.every((each) => meets(each, values, day))
    : formula.or.some((each) => meets(each, values, day));
}

/** Every enum value of the variable, or every non-empty set of them when it holds several */
function enumCandidates(on: Variable): (readonly EnumValue[])[] {
  if (!on.multiple) {
    return on.values.map((value) => [value]);
  }
  const sets: EnumValue[][] = [];
  for (let mask = 1; mask < 2 ** on.values.length; mask += 1) {
    sets.push(on.values.filter((_, index) => (mask & (2 ** index)) !== 0));
  }
  return sets;
}

/**
 * Values of the variable to try besides the theory's witness: a range of numbers, every enum
 * value, a few texts, and dates around the day
 */
function candidatesOf(on: Variable, day: number, random: ReturnType<typeof createRandom>): Value[] {
  switch (on.kind) {
    case 'number':
      return Array.from({ length: 12 }, (_, index) => index);
    case 'enum':
      return enumCandidates(on);
    case 'text':
      return ['a', 'A', 'b', 'ß', 'ab', 'Ab', 'ba', 'xyz', 'aß'];
    case 'date':
      return Array.from({ length: 40 }, () => day + random.int(-40000, 20000));
  }
}

/**
 * Checks that values meeting every literal of the model meet the formula: the theories'
 * witnesses, and random picks among other values that meet the model's literals of their variable
 */
function expectModelMeets(
  formula: Formula,
  model: Model,
  variables: Record<string, Variable>,
  day: number,
  seed: number
): void {
  const random = createRandom(seed);
  const choices: Record<string, Value[]> = {};
  for (const on of Object.values(variables)) {
    const literals = model[on.key] ?? [];
    const answer = decide(on, literals, day);
    expect(answer.verdict, on.key).toBe('sat');
    if (answer.verdict !== 'sat') {
      return;
    }
    const others = candidatesOf(on, day, random).filter((value) =>
      literals.every((each) => holds(each, value, day))
    );
    choices[on.key] = [answer.witness, ...others];
  }
  const witnesses = Object.fromEntries(
    Object.entries(choices).map(([key, values]) => [key, values[0]])
  );
  expect(meets(formula, witnesses, day)).toBe(true);
  for (let round = 0; round < 10; round += 1) {
    const picked = Object.fromEntries(
      Object.entries(choices).map(([key, values]) => [key, random.pick(values)])
    );
    expect(meets(formula, picked, day)).toBe(true);
  }
}

/** The keys of a model's literals, to compare the choices of two models */
function choiceOf(model: Model | null): string {
  return JSON.stringify(model);
}

// Formulas of the oracle's random branches

function levelOf(operator: Combinator, members: Formula[]): Formula {
  return operator === 'and' ? { and: members } : { or: members };
}

function formulaOf(item: CheckedItem): Formula {
  return item.type === 'rule' ? item.formula : levelOf(item.operator, item.items.map(formulaOf));
}

/** Whether a text variable mixes letter-case settings with "contains": the solver's corner */
function mixesCaseWithContains(formula: Formula): boolean {
  const literals: Literal[] = [];
  const collect = (each: Formula): void => {
    if (typeof each === 'boolean') {
      return;
    }
    if (isLiteral(each)) {
      literals.push(each);
      return;
    }
    ('and' in each ? each.and : each.or).forEach(collect);
  };
  collect(formula);
  const text = literals.flatMap((each) => (each.test.kind === 'text' ? [each.test] : []));
  const settings = new Set(text.map((test) => test.matchCase));
  return (
    settings.size > 1 && text.some((test) => test.op === 'contains' || test.op === 'not_contains')
  );
}

describe('modelOf', () => {
  it('chooses literals that every value meeting them makes meet the formula', () => {
    const formula: Formula = {
      and: [
        { or: [height('gt', 180), { and: [sex('one_of', 2), height('lt', 160)] }] },
        { or: [classes('one_of', 'b'), name('eq', 'schulz', false)] },
        { or: [before(EXPIRY, '2020-01-01'), yearsAgo(BIRTH, 'at_least_years_ago', 30)] },
      ],
    };
    for (let seed = 1; seed <= 30; seed += 1) {
      const model = modelOf(formula, optionsOf(seed, { plausible: PLAUSIBLE }));
      expect(model).not.toBeNull();
      expectModelMeets(formula, model as Model, VARIABLES, TODAY_DAY, seed);
    }
  });

  it('keeps every literal of an AND, and no variable without literals', () => {
    const model = modelOf({ and: [height('gt', 150), sex('none_of', 9)] }, optionsOf(1));
    expect(model).toEqual({
      [HEIGHT.key]: [height('gt', 150)],
      [SEX.key]: [sex('none_of', 9)],
    });
  });

  it('meets the formulas of random branches and of their negations', () => {
    const today = dayNumber(ORACLE_TODAY);
    let models = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      withSeed(seed, () => {
        const checked = checkedBranchOf(randomBranch(seed));
        const branch = levelOf(checked.operator, checked.items.map(formulaOf));
        const fields = Object.values(checked.variables).map((each) =>
          field(each, each.key === BIRTH.key)
        );
        const plausible = plausibilityLiteralsOf(fields, checked.variables, ORACLE_TODAY);
        for (const formula of [branch, negate(branch)]) {
          const options = {
            ...optionsOf(seed, { variables: checked.variables, today: ORACLE_TODAY, plausible }),
          };
          const verdict = satisfiable(formula, { from: today, to: today }, options);
          const model = modelOf(formula, options);
          if (verdict === 'unsat') {
            expect(model).toBeNull();
            continue;
          }
          if (verdict === 'sat' && !mixesCaseWithContains(formula)) {
            expect(model).not.toBeNull();
          }
          if (model !== null) {
            models += 1;
            expectModelMeets(formula, model, checked.variables, today, seed);
          }
        }
      });
    }
    expect(models).toBeGreaterThan(300);
  });

  it('chooses different OR children for different seeds', () => {
    const formula: Formula = {
      or: [
        height('gt', 100),
        sex('one_of', 1),
        classes('one_of', 'c'),
        before(EXPIRY, '2000-01-01'),
      ],
    };
    const choices = new Set<string>();
    for (let seed = 1; seed <= 20; seed += 1) {
      const model = modelOf(formula, optionsOf(seed));
      expect(Object.keys(model ?? {})).toHaveLength(1);
      choices.add(choiceOf(model));
    }
    expect(choices.size).toBeGreaterThanOrEqual(3);
  });

  it('gives equal models for equal seeds', () => {
    const formula: Formula = {
      and: [
        { or: [height('gt', 100), sex('one_of', 1)] },
        { or: [classes('one_of', 'c'), before(EXPIRY, '2000-01-01')] },
      ],
    };
    for (let seed = 1; seed <= 10; seed += 1) {
      expect(modelOf(formula, optionsOf(seed))).toEqual(modelOf(formula, optionsOf(seed)));
    }
  });

  it('never chooses an OR child that conflicts with the rest', () => {
    const formula: Formula = {
      and: [height('lt', 10), { or: [height('gt', 50), sex('one_of', 1), height('eq', 70)] }],
    };
    for (let seed = 1; seed <= 20; seed += 1) {
      expect(modelOf(formula, optionsOf(seed))).toEqual({
        [HEIGHT.key]: [height('lt', 10)],
        [SEX.key]: [sex('one_of', 1)],
      });
    }
  });

  it('gives null for a formula that no citizen can meet', () => {
    const none: Formula = { and: [height('gt', 2), height('lt', 3)] };
    expect(modelOf(none, optionsOf(1))).toBeNull();
    expect(modelOf(none, optionsOf(1, { plausible: PLAUSIBLE }))).toBeNull();
    expect(modelOf(false, optionsOf(1))).toBeNull();
    expect(
      modelOf({ or: [none, { and: [sex('one_of', 1), sex('none_of', 1)] }] }, optionsOf(1))
    ).toBeNull();
  });

  it("gives null when the solver can't tell", () => {
    // Research R7's text corner: no text contains "Stutt" without "stutt" in its folding
    const corner: Formula = {
      and: [name('contains', 'Stutt', true), name('not_contains', 'stutt', false)],
    };
    expect(modelOf(corner, optionsOf(1))).toBeNull();
    // The deadline has passed
    expect(modelOf(height('gt', 5), optionsOf(1, { deadline: 0, now: () => 1 }))).toBeNull();
  });

  it("chooses another OR child when one of them is the text corner's", () => {
    const corner: Formula = {
      and: [name('contains', 'Stutt', true), name('not_contains', 'stutt', false)],
    };
    for (let seed = 1; seed <= 10; seed += 1) {
      expect(modelOf({ or: [corner, height('gt', 5)] }, optionsOf(seed))).toEqual({
        [HEIGHT.key]: [height('gt', 5)],
      });
    }
  });

  it('gives `true` an empty model, or the plausibility literals', () => {
    expect(modelOf(true, optionsOf(1))).toEqual({});
    const model = modelOf(true, optionsOf(1, { plausible: PLAUSIBLE }));
    expect(Object.values(model ?? {}).flat()).toEqual(PLAUSIBLE);
  });
});

describe('plausibility', () => {
  it('keeps dates of birth for ages 18 to 80, and "Age in years" and "Year of birth" with them', () => {
    expect(PLAUSIBLE).toEqual([
      yearsAgo(BIRTH, 'at_least_years_ago', MIN_AGE),
      yearsAgo(BIRTH, 'less_than_years_ago', MAX_AGE + 1),
      yearsAgo(MDL_BIRTH, 'at_least_years_ago', MIN_AGE),
      yearsAgo(MDL_BIRTH, 'less_than_years_ago', MAX_AGE + 1),
      age('gt', 17),
      age('lt', 81),
      // Ages 18 to 80 on 2 November 2026: born from 3 November 1945 to 2 November 2008
      literal(BIRTH_YEAR, { kind: 'number', op: 'gt', value: 1944 }),
      literal(BIRTH_YEAR, { kind: 'number', op: 'lt', value: 2009 }),
    ]);
  });

  it('gives a date of birth that the model allows an age from 18 to 80', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const model = modelOf(height('gt', 150), optionsOf(seed, { plausible: PLAUSIBLE }));
      const answer = decide(BIRTH, model?.[BIRTH.key] ?? [], TODAY_DAY);
      expect(answer.verdict).toBe('sat');
      if (answer.verdict === 'sat') {
        const years = ageOn(isoDate(answer.witness as number), TODAY);
        expect(years).toBeGreaterThanOrEqual(MIN_AGE);
        expect(years).toBeLessThanOrEqual(MAX_AGE);
      }
      expect(model?.[AGE.key]).toEqual([age('gt', 17), age('lt', 81)]);
    }
  });

  it('gives way to "at least 90 years old"', () => {
    const formula = yearsAgo(BIRTH, 'at_least_years_ago', 90);
    const model = modelOf(formula, optionsOf(1, { plausible: PLAUSIBLE }));
    // They give way together, since they describe one fact
    expect(model).toEqual({ [BIRTH.key]: [formula] });
    const answer = decide(BIRTH, model?.[BIRTH.key] ?? [], TODAY_DAY);
    expect(answer.verdict).toBe('sat');
    if (answer.verdict === 'sat') {
      expect(ageOn(isoDate(answer.witness as number), TODAY)).toBeGreaterThanOrEqual(90);
    }
  });

  it('keeps the plausibility literals when another OR child allows them', () => {
    const old = age('gt', 90);
    // The other child is plausible: the plausibility literals stay, and the age child is never kept
    for (let seed = 1; seed <= 10; seed += 1) {
      const model = modelOf(
        { or: [old, height('gt', 150)] },
        optionsOf(seed, { plausible: PLAUSIBLE })
      );
      expect(model?.[AGE.key]).toEqual([age('gt', 17), age('lt', 81)]);
      expect(model?.[HEIGHT.key]).toEqual([height('gt', 150)]);
    }
    const model = modelOf(
      { and: [old, height('gt', 150)] },
      optionsOf(1, { plausible: PLAUSIBLE })
    );
    expect(model).toEqual({ [AGE.key]: [old], [HEIGHT.key]: [height('gt', 150)] });
  });

  it('gives no literal to a field the variables lack, or have with another kind', () => {
    const variables = { [BIRTH.key]: BIRTH, [AGE.key]: variable(AGE.key, 'text') };
    expect(plausibilityLiteralsOf(FIELDS, variables, TODAY)).toEqual([
      yearsAgo(BIRTH, 'at_least_years_ago', MIN_AGE),
      yearsAgo(BIRTH, 'less_than_years_ago', MAX_AGE + 1),
    ]);
    // A date field that isn't a date of birth
    expect(plausibilityLiteralsOf([field(EXPIRY)], { [EXPIRY.key]: EXPIRY }, TODAY)).toEqual([]);
  });
});
