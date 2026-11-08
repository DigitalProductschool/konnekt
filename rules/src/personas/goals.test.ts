import type { BranchInput } from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { changeItem, newBranch } from '../branches';
import { buildCheckedBranch } from '../checks/checkedTree';
import { negate } from '../checks/literals';
import { createSolverMemo, type SolverOptions } from '../checks/solver';
import type {
  CheckedBranch,
  CheckedItem,
  Formula,
  Literal,
  LiteralTest,
  Variable,
} from '../checks/types';
import { CONTEXT, mainBranch, rule, target } from '../testData';
import {
  branchClassesOf,
  branchFormulaOf,
  canonicalKeyOf,
  compareScores,
  goalsOf,
  itemFormulasOf,
  itemKeysOf,
  type PersonaOutcome,
  realizableVectors,
  scoreOf,
  targetKeyOf,
  targetsOf,
  vectorOf,
} from './goals';
import type { BranchClass, OutcomeVector, Score, Target } from './types';

const TODAY = '2026-11-01';

/** A clock that never reaches the deadline */
const NO_DEADLINE = { deadline: Number.POSITIVE_INFINITY, now: () => 0 };

function must<T>(value: T | null): T {
  if (value === null) {
    throw new Error('expected a result');
  }
  return value;
}

// The spec's example (quickstart §3, "Passenger transport licence"): Standard requires an
// applicant who is at least 21, lives in Stuttgart, holds class B and has held it for at least 2
// years; Ambulance, based on it, lowers the age to 19 (Rule 01)
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

function checkedOf(branch: BranchInput, key: string): CheckedBranch {
  return buildCheckedBranch({ ...branch, key }, CONTEXT, TODAY);
}

const EXAMPLE = [checkedOf(STANDARD, 'standard'), checkedOf(AMBULANCE, 'ambulance')];

// Hand-built checked branches

function variable(key: string, kind: Variable['kind']): Variable {
  return { key, kind, multiple: false, values: [] };
}

function literal(on: Variable, test: LiteralTest): Literal {
  return { variable: on.key, test, negated: false };
}

const HEIGHT = variable('mdl.height', 'number');
const WEIGHT = variable('mdl.weight', 'number');
const NAME = variable('pid.family_name', 'text');

const height = (op: 'gt' | 'lt', value: number) => literal(HEIGHT, { kind: 'number', op, value });
const weight = (op: 'gt' | 'lt', value: number) => literal(WEIGHT, { kind: 'number', op, value });

/**
 * A family name that contains "Stutt" with its letter case and doesn't contain "stutt" ignoring
 * it: the text theory's corner, which the solver answers 'unknown' (solver.test.ts)
 */
const UNKNOWN_TEXT: Formula = {
  and: [
    literal(NAME, { kind: 'text', op: 'contains', text: 'Stutt', matchCase: true }),
    literal(NAME, { kind: 'text', op: 'not_contains', text: 'stutt', matchCase: false }),
  ],
};

/**
 * A family name that contains "J" with its letter case and doesn't contain "j" ignoring it: the
 * corner again, but met by "J" with U+030C, whose folding is ǰ (textTheory.test.ts)
 */
const J_CORNER: Formula = {
  and: [
    literal(NAME, { kind: 'text', op: 'contains', text: 'J', matchCase: true }),
    literal(NAME, { kind: 'text', op: 'not_contains', text: 'j', matchCase: false }),
  ],
};

/** A family name that is "J" with U+030C, which meets `J_CORNER` */
const IS_J_CARON: Formula = literal(NAME, {
  kind: 'text',
  op: 'eq',
  text: 'J\u{30c}',
  matchCase: true,
});

let ids = 0;

function ruleItem(formula: Formula): CheckedItem {
  ids += 1;
  return { type: 'rule', id: `rule-${ids}`, formula };
}

function checked(
  branchKey: string,
  items: CheckedItem[],
  variables: Variable[] = [HEIGHT, WEIGHT, NAME],
  operator: 'and' | 'or' = 'and'
): CheckedBranch {
  return {
    branchKey,
    operator,
    items,
    leftOut: [],
    variables: Object.fromEntries(variables.map((each) => [each.key, each])),
    today: TODAY,
    fingerprint: branchKey,
  };
}

function solverOf(
  variables: Variable[] = [HEIGHT, WEIGHT, NAME],
  clock = NO_DEADLINE
): SolverOptions {
  return {
    ...clock,
    variables: Object.fromEntries(variables.map((each) => [each.key, each])),
    memo: createSolverMemo(),
  };
}

function classOf(formula: Formula, key = canonicalKeyOf(formula)): BranchClass {
  return { key, formula, branchKeys: [key] };
}

function goalsOfTargets(targets: readonly Target[]): number[] {
  return targets.map((each) => each.goal);
}

/** Every choice of three vectors, with repeats, in order */
function triples<T>(list: readonly T[]): T[][] {
  return list.flatMap((a) => list.flatMap((b) => list.map((c) => [a, b, c])));
}

function outcome(vector: OutcomeVector, items: Record<string, boolean> = {}): PersonaOutcome {
  return { vector, items };
}

describe('the spec’s example (research R6)', () => {
  const goals = goalsOf(EXAMPLE, TODAY, NO_DEADLINE);

  it('has two classes, Standard and Ambulance', () => {
    expect(goals.classes.map((each) => each.branchKeys)).toEqual([['standard'], ['ambulance']]);
  });

  it('gives exactly (meet, meet), (fail, meet) and (fail, fail) for (Standard, Ambulance)', () => {
    expect(goals.vectors).toEqual([
      [true, true],
      [false, true],
      [false, false],
    ]);
  });

  it('targets meeting and failing each variant, and telling them apart', () => {
    expect(goals.targets.filter((each) => each.goal < 4)).toEqual<Target[]>([
      { goal: 1, type: 'meet', classIndex: 0 },
      { goal: 1, type: 'meet', classIndex: 1 },
      { goal: 2, type: 'fail', classIndex: 0 },
      { goal: 2, type: 'fail', classIndex: 1 },
      { goal: 3, type: 'differ', a: 0, b: 1 },
    ]);
  });

  it('targets meeting and failing each of the five distinct rules once (goal 4)', () => {
    // Rule 01 at 21 and at 19 differ; Rules 02 to 04 are inherited, so one pair of targets each
    expect(goals.items).toHaveLength(5);
    const itemTargets = goals.targets.filter((each) => each.goal === 4);
    expect(itemTargets).toHaveLength(10);
    expect(new Set(itemTargets.map(targetKeyOf)).size).toBe(10);
  });

  it('reaches goals 1 to 3 only with all three vectors together (US1-AS3)', () => {
    const best: Score = [2, 2, 1, 0];
    for (const chosen of triples(goals.vectors)) {
      const score = scoreOf(
        goals.targets,
        chosen.map((vector) => outcome(vector))
      );
      const distinct = new Set(chosen.map((vector) => JSON.stringify(vector))).size;
      expect(compareScores(score, best) === 0).toBe(distinct === 3);
      expect(compareScores(score, best)).toBeLessThanOrEqual(0);
    }
  });

  it('keys the items so that the evaluator’s results map to goal 4', () => {
    const [standard, ambulance] = EXAMPLE.map(itemKeysOf);
    expect(Object.keys(standard)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
    expect(standard['rule-1']).not.toBe(ambulance['rule-1']);
    for (const id of ['rule-2', 'rule-3', 'rule-4']) {
      expect(standard[id]).toBe(ambulance[id]);
    }
    expect(goals.items.map((each) => each.key)).toEqual([
      standard['rule-1'],
      standard['rule-2'],
      standard['rule-3'],
      standard['rule-4'],
      ambulance['rule-1'],
    ]);
  });

  it('gives a known persona’s vector from its results by branch', () => {
    expect(vectorOf(goals.classes, { standard: false, ambulance: true })).toEqual([false, true]);
  });
});

describe('branch classes', () => {
  it('puts identical branches into one class, in tab order', () => {
    const unchanged = checkedOf(newBranch(STANDARD, 'based', 'Copy', null), 'copy');
    const classes = branchClassesOf([EXAMPLE[0], EXAMPLE[1], unchanged]);
    expect(classes.map((each) => each.branchKeys)).toEqual([['standard', 'copy'], ['ambulance']]);
    const goals = goalsOf([EXAMPLE[0], unchanged], TODAY, NO_DEADLINE);
    expect(goals.vectors).toEqual([[true], [false]]);
    expect(goals.targets.some((each) => each.goal === 3)).toBe(false);
  });

  it('tells branches apart by formula, not by item ids, order or nesting', () => {
    const tall = height('gt', 180);
    const light = weight('lt', 70);
    const keys = [
      checked('a', [ruleItem(tall), ruleItem(light)]),
      checked('b', [ruleItem(light), ruleItem(tall)]),
      checked('c', [
        ruleItem(tall),
        {
          type: 'group',
          id: 'group-1',
          operator: 'and',
          items: [ruleItem(light), ruleItem(light)],
        },
      ]),
      checked('d', [ruleItem(tall), ruleItem(light)], undefined, 'or'),
    ].map((each) => canonicalKeyOf(branchFormulaOf(each)));
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).toBe(keys[0]);
    expect(keys[3]).not.toBe(keys[0]);
    expect(canonicalKeyOf({ or: [tall] })).toBe(canonicalKeyOf(tall));
    expect(canonicalKeyOf({ and: [true, tall] })).toBe(canonicalKeyOf(tall));
    expect(canonicalKeyOf(negate(tall))).not.toBe(canonicalKeyOf(tall));
  });

  it('makes a branch without items always met', () => {
    expect(branchFormulaOf(checked('empty', []))).toBe(true);
  });
});

describe('realizable vectors and targets', () => {
  it('gives an unmeetable branch no goal-1 target (EC)', () => {
    // EC "Whole numbers": no whole number is greater than 2 and less than 3
    const branches = [checked('none', [ruleItem(height('gt', 2)), ruleItem(height('lt', 3))])];
    const goals = goalsOf(branches, TODAY, NO_DEADLINE);
    expect(goals.vectors).toEqual([[false]]);
    expect(goalsOfTargets(goals.targets)).not.toContain(1);
    expect(goalsOfTargets(goals.targets)).toContain(2);
  });

  it('gives an always-met branch no goal-2 target (EC)', () => {
    for (const branch of [
      checked('empty', []),
      checked('every', [ruleItem(height('gt', 2)), ruleItem(height('lt', 3))], undefined, 'or'),
    ]) {
      const goals = goalsOf([branch], TODAY, NO_DEADLINE);
      expect(goals.vectors).toEqual([[true]]);
      expect(goalsOfTargets(goals.targets).filter((goal) => goal < 4)).toEqual([1]);
    }
  });

  it('leaves out items that every applicant meets or none does', () => {
    const always = { or: [height('gt', 2), height('lt', 3)] };
    const never = { and: [weight('gt', 2), weight('lt', 3)] };
    const branch = checked('mixed', [
      ruleItem(height('gt', 180)),
      ruleItem(always),
      ruleItem(never),
    ]);
    expect(itemFormulasOf([branch], TODAY, solverOf())).toEqual([
      { key: canonicalKeyOf(height('gt', 180)), formula: height('gt', 180) },
    ]);
  });

  it("doesn't count 'unknown' as realizable", () => {
    const classes = [classOf(UNKNOWN_TEXT)];
    // The negation is met by any name without "Stutt"; the formula itself is the text corner
    expect(realizableVectors(classes, TODAY, solverOf())).toEqual([[false]]);
    const branch = checked('text', [ruleItem(UNKNOWN_TEXT)]);
    expect(itemFormulasOf([branch], TODAY, solverOf())).toEqual([]);
  });

  it("searches below an 'unknown' prefix: every vector of up to three classes", () => {
    // Meeting the corner alone is 'unknown', but with "is equal to J̌" the theory checks that one
    // text, which meets both (J with U+030C, textTheory.test.ts)
    const classes = [classOf(J_CORNER), classOf(IS_J_CARON)];
    expect(realizableVectors(classes, TODAY, solverOf())).toEqual([
      [true, true],
      [false, false],
    ]);
  });

  it("asks at most 14 questions below 'unknown' prefixes, and searches the rest in full", () => {
    // The corner, four classes on variables of their own, and "is equal to J̌": every vector that
    // meets the corner is 'unknown' until the last class. Below it the search asks 14 questions
    // (meet before fail) and finds three vectors; the 16 that fail the corner are all found
    const numbers = Array.from({ length: 4 }, (_, index) => variable(`n.x${index}`, 'number'));
    const classes = [
      classOf(J_CORNER),
      ...numbers.map((each) => classOf(literal(each, { kind: 'number', op: 'gt', value: 5 }))),
      classOf(IS_J_CARON),
    ];
    const vectors = realizableVectors(classes, TODAY, solverOf([NAME, ...numbers]));
    expect(vectors.filter((vector) => vector[0])).toEqual([
      [true, true, true, true, true, true],
      [true, true, true, true, false, true],
      [true, true, true, false, true, true],
    ]);
    const failing = vectors.filter((vector) => !vector[0]);
    expect(failing).toHaveLength(16);
    expect(failing.every((vector) => !vector[5])).toBe(true);
  });

  it("doesn't count a passed deadline as realizable", () => {
    const late = { deadline: 10, now: () => 10 };
    const goals = goalsOf(EXAMPLE, TODAY, late);
    expect(goals.vectors).toEqual([]);
    expect(goals.items).toEqual([]);
    expect(goals.targets).toEqual([]);
  });

  it('gives the empty vector without classes', () => {
    expect(realizableVectors([], TODAY, solverOf())).toEqual([[]]);
  });

  it('beyond MAX_VECTORS, finds a vector for each target that can be reached', () => {
    // Ten classes: x0 … x8 > 5 each on its own variable, and "x0 > 5 or x9 > 5", which anyone who
    // meets the first class meets. 768 vectors are realizable; the search stops at the 257th: the
    // first 256 meet the first class, so the last too, and the 257th meets the last class as well,
    // so only the fallback finds a vector that fails it
    const numbers = Array.from({ length: 10 }, (_, index) => variable(`n.x${index}`, 'number'));
    const above = (index: number): Formula =>
      literal(numbers[index], { kind: 'number', op: 'gt', value: 5 });
    const classes = [
      ...Array.from({ length: 9 }, (_, index) => classOf(above(index))),
      classOf({ or: [above(0), above(9)] }),
    ];
    const valid = (vector: OutcomeVector) => !(vector[0] && !vector[9]);
    const all: OutcomeVector[] = Array.from({ length: 1 << 10 }, (_, bits) =>
      Array.from({ length: 10 }, (__, index) => (bits & (1 << index)) !== 0)
    ).filter(valid);
    expect(all).toHaveLength(768);

    const vectors = realizableVectors(classes, TODAY, solverOf(numbers));
    expect(vectors.length).toBeLessThan(all.length);
    expect(vectors.every(valid)).toBe(true);
    expect(vectors.some((vector) => !vector[9])).toBe(true);
    const keys = (from: readonly OutcomeVector[]) =>
      targetsOf(classes, from, []).map(targetKeyOf).sort();
    expect(keys(vectors)).toEqual(keys(all));
  });
});

describe('the score', () => {
  const tall = { key: 'tall', formula: height('gt', 180) };
  const classes = [classOf(height('gt', 180)), classOf(weight('lt', 70))];
  const targets = targetsOf(
    classes,
    [
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ],
    [tall]
  );

  it('counts covered targets per goal', () => {
    expect(goalsOfTargets(targets)).toEqual([1, 1, 2, 2, 3, 4, 4]);
    expect(scoreOf(targets, [])).toEqual([0, 0, 0, 0]);
    expect(scoreOf(targets, [outcome([true, true], { tall: true })])).toEqual([2, 0, 0, 1]);
    expect(
      scoreOf(targets, [outcome([true, false], { tall: true }), outcome([false, true])])
    ).toEqual([2, 2, 1, 1]);
    expect(
      scoreOf(targets, [
        outcome([true, false], { tall: true }),
        outcome([false, true], { tall: false }),
      ])
    ).toEqual([2, 2, 1, 2]);
  });

  it('compares goal by goal, never trading a goal for a later one (FR-011)', () => {
    expect(compareScores([1, 0, 0, 0], [0, 9, 9, 9])).toBeGreaterThan(0);
    expect(compareScores([2, 1, 0, 0], [2, 0, 5, 5])).toBeGreaterThan(0);
    expect(compareScores([2, 2, 0, 9], [2, 2, 1, 0])).toBeLessThan(0);
    expect(compareScores([2, 2, 1, 3], [2, 2, 1, 3])).toBe(0);
    const sorted: Score[] = [
      [0, 9, 9, 9],
      [2, 2, 1, 0],
      [2, 2, 0, 9],
      [1, 0, 0, 0],
    ];
    sorted.sort((a, b) => compareScores(b, a));
    expect(sorted).toEqual([
      [2, 2, 1, 0],
      [2, 2, 0, 9],
      [1, 0, 0, 0],
      [0, 9, 9, 9],
    ]);
  });

  it('gives each target its own key', () => {
    expect(new Set(targets.map(targetKeyOf)).size).toBe(targets.length);
  });
});
