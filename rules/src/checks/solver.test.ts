import type { Combinator } from '@konnekt/api-types/form-connections';
import { beforeAll, describe, expect, it } from 'vitest';

import { evaluateBranch, type EvaluatedItem } from '../evaluation';
import { dayNumber } from './calendar';
import { LAST_DAY } from './constants';
import { allOf, isLiteral, negate } from './literals';
import { createSolverMemo, feasibleDaysOf, satisfiable, type SolverOptions } from './solver';
import {
  BRANCH,
  checkedBranchOf,
  FROM_TODAY,
  type GeneratedBranch,
  LATER_DAYS,
  type Oracle,
  ORACLE_CONTEXT,
  ORACLE_TODAY_DAY,
  oracleOf,
  randomBranch,
  withSeed,
} from './testOracle';
import type {
  CheckedBranch,
  CheckedItem,
  DateUnit,
  DayRange,
  EnumOp,
  EnumValue,
  FixedDateOp,
  Formula,
  FromNowOp,
  Literal,
  LiteralTest,
  NumberOp,
  TextOp,
  Variable,
  Verdict,
  YearsAgoOp,
} from './types';

// Hand-built formulas

/** The day of the spec's edge cases */
const TODAY = dayNumber('2026-10-28');

/** Today alone, as the conflicts and the unmeetable branch ask (research R4) */
const TODAY_ONLY: DayRange = { from: TODAY, to: TODAY };

/** Every day from today on, as the redundancy and always-met questions ask (research R4) */
const TODAY_ON: DayRange = { from: TODAY, to: LAST_DAY };

/** The days after today: whether a finding holds only for today (FR-008) */
const AFTER_TODAY: DayRange = { from: TODAY + 1, to: LAST_DAY };

function variable(key: string, kind: Variable['kind'], values: EnumValue[] = [], multiple = false) {
  return { key, kind, multiple, values };
}

const HEIGHT = variable('mdl.height', 'number');
const SEX = variable('pid.sex', 'enum', [1, 2, 9]);
const CLASSES = variable('mdl.driving_privileges.classes', 'enum', ['a', 'b', 'c'], true);
const NAME = variable('pid.family_name', 'text');
const BIRTH = variable('pid.birthdate', 'date');
const EXPIRY = variable('pid.date_of_expiry', 'date');

const VARIABLES: Record<string, Variable> = Object.fromEntries(
  [HEIGHT, SEX, CLASSES, NAME, BIRTH, EXPIRY].map((each) => [each.key, each])
);

function literal(on: Variable, test: LiteralTest): Literal {
  return { variable: on.key, test, negated: false };
}

const height = (op: NumberOp, value: number) => literal(HEIGHT, { kind: 'number', op, value });
const sex = (op: EnumOp, ...values: EnumValue[]) => literal(SEX, { kind: 'enum', op, values });
const classes = (op: EnumOp, ...values: EnumValue[]) =>
  literal(CLASSES, { kind: 'enum', op, values });
/** A text test; ignoring letter case, the text is given case-folded, as literals.ts gives it */
const name = (op: TextOp, text: string, matchCase: boolean) =>
  literal(NAME, { kind: 'text', op, text, matchCase });
const fixed = (on: Variable, op: FixedDateOp, date: string) =>
  literal(on, { kind: 'date', op, date: dayNumber(date) });
const yearsAgo = (on: Variable, op: YearsAgoOp, count: number) =>
  literal(on, { kind: 'date', op, count, unit: 'years' });
const fromNow = (on: Variable, op: FromNowOp, count: number, unit: DateUnit) =>
  literal(on, { kind: 'date', op, count, unit });

/**
 * A text field mixing letter-case settings with "contains": no text contains "Stutt" without
 * "stutt" in its folding, which the text theory can't prove (research R7's corner)
 */
const UNKNOWN_TEXT: Formula = {
  and: [name('contains', 'Stutt', true), name('not_contains', 'stutt', false)],
};

/** EC "Whole numbers": no whole number is greater than 2 and less than 3 */
const NO_HEIGHT: Formula = { and: [height('gt', 2), height('lt', 3)] };

/** EC-7: "after 1 Jan 2010" and "at least 21 years old", met from 2 Jan 2031 on */
const ADULT_BORN_LATE: Formula = {
  and: [fixed(BIRTH, 'after', '2010-01-01'), yearsAgo(BIRTH, 'at_least_years_ago', 21)],
};

/** Valid for a year from the day of sharing but expiring before 2029: met until 31 Dec 2027 */
const VALID_UNTIL_2029: Formula = {
  and: [fromNow(EXPIRY, 'at_least_from_now', 1, 'years'), fixed(EXPIRY, 'before', '2029-01-01')],
};

/** As `VALID_UNTIL_2029`, expiring before 2033: met until 31 Dec 2031 */
const VALID_UNTIL_2033: Formula = {
  and: [fromNow(EXPIRY, 'at_least_from_now', 1, 'years'), fixed(EXPIRY, 'before', '2033-01-01')],
};

/** Options with a clock that never reaches the deadline, unless given others */
function optionsOf(overrides: Partial<SolverOptions> = {}): SolverOptions {
  return {
    deadline: Number.POSITIVE_INFINITY,
    now: () => 0,
    variables: VARIABLES,
    memo: createSolverMemo(),
    ...overrides,
  };
}

function verdictOf(formula: Formula, days: DayRange = TODAY_ONLY): Verdict {
  return satisfiable(formula, days, optionsOf());
}

function range(from: string, to: string): DayRange {
  return { from: dayNumber(from), to: dayNumber(to) };
}

/**
 * The pigeonhole principle: each of `pigeons` sits in one of `holes` holes (an enum of the
 * holes), and no hole holds two. Unsat for more pigeons than holes, and hard for a tableau
 */
function pigeonholes(pigeons: number, holes: number) {
  const holeValues = Array.from({ length: holes }, (_, index) => index + 1);
  const variables: Variable[] = Array.from({ length: pigeons }, (_, index) =>
    variable(`pigeon.${index + 1}`, 'enum', holeValues)
  );
  const elsewhere = (pigeon: Variable, hole: number) =>
    literal(pigeon, { kind: 'enum', op: 'none_of', values: [hole] });
  const pairs: Formula[] = [];
  variables.forEach((first, index) =>
    variables
      .slice(index + 1)
      .forEach((second) =>
        holeValues.forEach((hole) =>
          pairs.push({ or: [elsewhere(first, hole), elsewhere(second, hole)] })
        )
      )
  );
  return {
    formula: { and: pairs },
    variables: Object.fromEntries(variables.map((each) => [each.key, each])),
  };
}

describe('satisfiable()', () => {
  it('answers true, false, a literal, and an empty range of days', () => {
    expect(verdictOf(true)).toBe('sat');
    expect(verdictOf(false)).toBe('unsat');
    expect(verdictOf(height('gt', 2))).toBe('sat');
    expect(verdictOf({ and: [] })).toBe('sat');
    expect(verdictOf({ or: [] })).toBe('unsat');
    expect(verdictOf(true, { from: TODAY, to: TODAY - 1 })).toBe('unsat');
  });

  it('refutes what the theories refute: EC "Whole numbers", "Adjacent dates", an enum', () => {
    expect(verdictOf(NO_HEIGHT)).toBe('unsat');
    expect(verdictOf({ and: [height('gt', 2), height('lt', 4)] })).toBe('sat');
    const adjacent = {
      and: [fixed(BIRTH, 'before', '2030-01-01'), fixed(BIRTH, 'after', '2029-12-31')],
    };
    expect(verdictOf(adjacent, TODAY_ON)).toBe('unsat');
    // EC "An enum rule with every value": "none of" every value can't be met, and "one of" every
    // value is met by everyone, so its negation can't be met
    expect(verdictOf(sex('none_of', 1, 2, 9))).toBe('unsat');
    expect(verdictOf(negate(classes('one_of', 'a', 'b', 'c')))).toBe('unsat');
    // EC "Fields with several values": two classes together, but not two codes of one value
    expect(verdictOf({ and: [classes('one_of', 'a'), classes('one_of', 'b')] })).toBe('sat');
    expect(verdictOf({ and: [sex('one_of', 1), sex('one_of', 2)] })).toBe('unsat');
  });

  it('branches over the children of an OR, and backtracks', () => {
    expect(verdictOf({ and: [{ or: [height('gt', 4), height('lt', 1)] }, height('gt', 2)] })).toBe(
      'sat'
    );
    const twoWays = { or: [height('lt', 1), height('gt', 7)] };
    expect(verdictOf({ and: [twoWays, height('gt', 2), height('lt', 6)] })).toBe('unsat');
    // Each choice of the first OR is refuted only by the second
    const nested = {
      and: [
        {
          or: [
            { and: [height('gt', 1), sex('one_of', 1)] },
            { and: [height('lt', 1), sex('one_of', 2)] },
          ],
        },
        {
          or: [
            { and: [height('gt', 5), sex('one_of', 2)] },
            { and: [height('eq', 0), sex('one_of', 1)] },
          ],
        },
      ],
    };
    expect(verdictOf(nested)).toBe('unsat');
    expect(verdictOf({ or: [nested, { and: [height('eq', 3), sex('one_of', 9)] }] })).toBe('sat');
  });

  it('refutes more pigeons than holes, and seats as many', () => {
    const tight = pigeonholes(4, 4);
    expect(satisfiable(tight.formula, TODAY_ONLY, optionsOf({ variables: tight.variables }))).toBe(
      'sat'
    );
    const crowded = pigeonholes(5, 4);
    expect(
      satisfiable(crowded.formula, TODAY_ONLY, optionsOf({ variables: crowded.variables }))
    ).toBe('unsat');
  });

  it('drops the children that contradict the chosen literals before it branches', () => {
    const options = optionsOf();
    const formula = {
      and: [
        height('gt', 3),
        { or: [height('eq', 5), height('eq', 6), height('eq', 7), height('eq', 8)] },
        { or: [height('lt', 1), height('lt', 2)] },
      ],
    };
    expect(satisfiable(formula, TODAY_ONLY, options)).toBe('unsat');
    // The second OR has no child left at the first step, before any branching
    expect(options.memo?.stats.nodes).toBe(1);
  });

  it('skips an OR that a chosen literal already satisfies', () => {
    const options = optionsOf();
    expect(
      satisfiable(
        { and: [height('gt', 2), { or: [height('gt', 2), UNKNOWN_TEXT] }] },
        TODAY_ONLY,
        options
      )
    ).toBe('sat');
    // Only the height was decided: the OR's text was never looked at
    expect(options.memo?.stats.decisions).toBe(1);
  });

  it('refutes a literal beside its complement without asking the theory', () => {
    const options = optionsOf();
    const formula = {
      and: [
        name('eq', 'Stuttgart', true),
        { or: [negate(name('eq', 'Stuttgart', true)), name('contains', 'x', true)] },
      ],
    };
    expect(satisfiable(formula, TODAY_ONLY, options)).toBe('unsat');
    // "is equal to", then "is equal to" with "contains": the complement needs no theory
    expect(options.memo?.stats.decisions).toBe(2);
    expect(verdictOf({ and: [height('gt', 2), negate(height('gt', 2))] })).toBe('unsat');
    expect(
      verdictOf({ or: [UNKNOWN_TEXT, { or: [height('gt', 2), negate(height('gt', 2))] }] })
    ).toBe('sat');
  });

  it("answers 'unknown' only where the text theory can't decide, and lets what decides decide", () => {
    expect(verdictOf(UNKNOWN_TEXT)).toBe('unknown');
    // An OR is met as soon as one child is met, and refuted only when every child is refuted
    expect(verdictOf({ or: [UNKNOWN_TEXT, height('gt', 2)] })).toBe('sat');
    expect(verdictOf({ or: [UNKNOWN_TEXT, name('eq', 'x', true)] })).toBe('sat');
    expect(verdictOf({ or: [UNKNOWN_TEXT, NO_HEIGHT] })).toBe('unknown');
    // An AND is refuted as soon as one part is, and met only when every part is
    expect(verdictOf({ and: [UNKNOWN_TEXT, NO_HEIGHT] })).toBe('unsat');
    expect(verdictOf({ and: [UNKNOWN_TEXT, { or: [NO_HEIGHT, sex('none_of', 1, 2, 9)] }] })).toBe(
      'unsat'
    );
    expect(verdictOf({ and: [UNKNOWN_TEXT, height('gt', 2)] })).toBe('unknown');
    // More literals on the text can decide it: "is equal to" fixes the text
    expect(verdictOf({ and: [UNKNOWN_TEXT, name('eq', 'Stuttgart', true)] })).toBe('unsat');
    expect(verdictOf({ and: [UNKNOWN_TEXT, { or: [name('eq', 'Stutt', true), NO_HEIGHT] }] })).toBe(
      'unsat'
    );
  });

  it('solves the parts of a conjunction that share no variable on their own', () => {
    const options = optionsOf();
    const formula = {
      and: [
        height('gt', 2),
        height('lt', 5),
        sex('one_of', 1, 2),
        { or: [name('eq', 'a', true), name('eq', 'b', true)] },
        { or: [height('eq', 3), sex('one_of', 9)] },
      ],
    };
    expect(satisfiable(formula, TODAY_ONLY, options)).toBe('sat');
    // The height and the sex share the last OR; the name is apart
    expect(options.memo?.stats.parts).toBe(2);
    // A part that an earlier question had comes from the memo
    expect(satisfiable({ and: [formula, classes('one_of', 'a')] }, TODAY_ONLY, options)).toBe(
      'sat'
    );
    expect(options.memo?.stats.parts).toBe(5);
    expect(options.memo?.stats.partHits).toBe(2);
  });

  it('keeps the dates counted from the day of sharing in one part over days, apart on one day', () => {
    // Each can be met on some day from today, but not on the same day
    expect(verdictOf(ADULT_BORN_LATE, TODAY_ON)).toBe('sat');
    expect(verdictOf(VALID_UNTIL_2029, TODAY_ON)).toBe('sat');
    const options = optionsOf();
    expect(satisfiable({ and: [ADULT_BORN_LATE, VALID_UNTIL_2029] }, TODAY_ON, options)).toBe(
      'unsat'
    );
    expect(options.memo?.stats.parts).toBe(1);
    expect(verdictOf({ and: [ADULT_BORN_LATE, VALID_UNTIL_2033] }, TODAY_ON)).toBe('sat');
    // On one day, the day is given, so the two variables are independent parts
    const oneDay = optionsOf();
    const day = range('2031-06-01', '2031-06-01');
    expect(satisfiable({ and: [ADULT_BORN_LATE, VALID_UNTIL_2033] }, day, oneDay)).toBe('sat');
    expect(oneDay.memo?.stats.parts).toBe(2);
  });

  it("meets 'after 1 Jan 2010' and 'at least 21 years old' from 2 Jan 2031 on only (EC-7)", () => {
    expect(verdictOf(ADULT_BORN_LATE, TODAY_ONLY)).toBe('unsat');
    expect(verdictOf(ADULT_BORN_LATE, AFTER_TODAY)).toBe('sat');
    expect(verdictOf(ADULT_BORN_LATE, TODAY_ON)).toBe('sat');
    expect(verdictOf(ADULT_BORN_LATE, range('2026-10-28', '2031-01-01'))).toBe('unsat');
    expect(verdictOf(ADULT_BORN_LATE, range('2031-01-02', '2031-01-02'))).toBe('sat');
    // In a level combined with AND, with a rule on another field
    const branch = { and: [ADULT_BORN_LATE, height('gt', 150), sex('one_of', 1)] };
    expect(verdictOf(branch, TODAY_ONLY)).toBe('unsat');
    expect(verdictOf(branch, AFTER_TODAY)).toBe('sat');
  });

  it("keeps 'before 1 Jan 2010' beside 'at least 18 years old': it adds nothing today only (EC-7)", () => {
    // Redundant in a level combined with AND when nobody meets the other rule and fails it
    const question = {
      and: [
        yearsAgo(BIRTH, 'at_least_years_ago', 18),
        negate(fixed(BIRTH, 'before', '2010-01-01')),
      ],
    };
    expect(verdictOf(question, TODAY_ONLY)).toBe('unsat');
    expect(verdictOf(question, TODAY_ON)).toBe('sat');
  });
});

describe('feasibleDaysOf()', () => {
  it('gives the days on which a formula can be met (EC-7)', () => {
    const options = optionsOf();
    expect(feasibleDaysOf(ADULT_BORN_LATE, TODAY_ON, options)).toEqual([
      range('2031-01-02', '9999-12-31'),
    ]);
    expect(feasibleDaysOf(ADULT_BORN_LATE, TODAY_ONLY, options)).toEqual([]);
    const question = {
      and: [
        yearsAgo(BIRTH, 'at_least_years_ago', 18),
        negate(fixed(BIRTH, 'before', '2010-01-01')),
      ],
    };
    expect(feasibleDaysOf(question, TODAY_ON, options)).toEqual([
      range('2028-01-01', '9999-12-31'),
    ]);
    expect(feasibleDaysOf(VALID_UNTIL_2029, TODAY_ON, options)).toEqual([
      range('2026-10-28', '2027-12-31'),
    ]);
  });

  it('intersects the days of the variables, and joins the days of the alternatives', () => {
    const options = optionsOf();
    expect(feasibleDaysOf({ and: [ADULT_BORN_LATE, VALID_UNTIL_2033] }, TODAY_ON, options)).toEqual(
      [range('2031-01-02', '2031-12-31')]
    );
    expect(feasibleDaysOf({ and: [ADULT_BORN_LATE, VALID_UNTIL_2029] }, TODAY_ON, options)).toEqual(
      []
    );
    expect(feasibleDaysOf({ or: [ADULT_BORN_LATE, VALID_UNTIL_2029] }, TODAY_ON, options)).toEqual([
      range('2026-10-28', '2027-12-31'),
      range('2031-01-02', '9999-12-31'),
    ]);
    expect(feasibleDaysOf({ or: [ADULT_BORN_LATE, VALID_UNTIL_2033] }, TODAY_ON, options)).toEqual([
      range('2026-10-28', '9999-12-31'),
    ]);
    // Without a date counted from the day of sharing: every day or none
    expect(feasibleDaysOf(height('gt', 2), TODAY_ON, options)).toEqual([TODAY_ON]);
    expect(feasibleDaysOf(NO_HEIGHT, TODAY_ON, options)).toEqual([]);
    expect(feasibleDaysOf(true, { from: TODAY, to: TODAY - 1 }, options)).toEqual([]);
  });

  it("answers 'unknown' when the text theory can't decide for days no certain answer covers", () => {
    const options = optionsOf();
    expect(feasibleDaysOf({ and: [UNKNOWN_TEXT, ADULT_BORN_LATE] }, TODAY_ON, options)).toBe(
      'unknown'
    );
    expect(feasibleDaysOf({ or: [UNKNOWN_TEXT, ADULT_BORN_LATE] }, TODAY_ON, options)).toBe(
      'unknown'
    );
    expect(satisfiable({ or: [UNKNOWN_TEXT, ADULT_BORN_LATE] }, TODAY_ON, options)).toBe('sat');
    // Where the certain days cover every day, the unknown text doesn't matter
    expect(feasibleDaysOf({ or: [UNKNOWN_TEXT, height('gt', 2)] }, TODAY_ON, options)).toEqual([
      TODAY_ON,
    ]);
  });
});

describe('the deadline', () => {
  it("answers 'unknown' once the deadline has passed, and keeps no such answer", () => {
    const { formula, variables } = pigeonholes(5, 4);
    const memo = createSolverMemo();
    const late = { deadline: 10, now: () => 10, variables, memo };
    expect(satisfiable(formula, TODAY_ONLY, late)).toBe('unknown');
    expect(feasibleDaysOf(formula, TODAY_ON, late)).toBe('unknown');
    // With time, the same memo answers the question, rather than the deadline's 'unknown'
    const inTime = { deadline: 10, now: () => 0, variables, memo };
    expect(satisfiable(formula, TODAY_ONLY, inTime)).toBe('unsat');
    expect(memo.stats.questionHits).toBe(0);
    // A certain answer is kept, and given even past the deadline
    expect(satisfiable(formula, TODAY_ONLY, late)).toBe('unsat');
    expect(memo.stats.questionHits).toBe(1);
  });

  it('reads the clock often enough to stop at the first reading past the deadline', () => {
    const { formula, variables } = pigeonholes(8, 7);
    let readings = 0;
    const now = () => {
      readings += 1;
      return readings;
    };
    const memo = createSolverMemo();
    expect(satisfiable(formula, TODAY_ONLY, { deadline: 5, now, variables, memo })).toBe('unknown');
    expect(readings).toBe(5);
    // Between two readings, the search takes a bounded number of steps
    expect(memo.stats.nodes + memo.stats.decisions).toBeLessThan(5 * 32 + 32);
  });

  it("keeps an 'unknown' of the text theory, which no time changes", () => {
    const memo = createSolverMemo();
    const options = optionsOf({ memo });
    expect(satisfiable(UNKNOWN_TEXT, TODAY_ONLY, options)).toBe('unknown');
    expect(satisfiable(UNKNOWN_TEXT, TODAY_ONLY, options)).toBe('unknown');
    expect(memo.stats.questionHits).toBe(1);
  });
});

describe('the memo', () => {
  it('answers a question asked again, also when it is built from new objects', () => {
    const memo = createSolverMemo();
    const options = optionsOf({ memo });
    const build = (): Formula => ({
      and: [height('gt', 2), { or: [sex('one_of', 1), name('eq', 'x', true)] }],
    });
    expect(satisfiable(build(), TODAY_ONLY, options)).toBe('sat');
    expect(memo.stats.questionHits).toBe(0);
    expect(satisfiable(build(), TODAY_ONLY, options)).toBe('sat');
    expect(memo.stats.questionHits).toBe(1);
    // The same conjuncts in another order, and nested ANDs, are the same question
    const reordered: Formula = {
      and: [{ or: [name('eq', 'x', true), sex('one_of', 1)] }, { and: [true, height('gt', 2)] }],
    };
    expect(satisfiable(reordered, TODAY_ONLY, options)).toBe('sat');
    expect(memo.stats.questionHits).toBe(2);
    // Other days are another question, whose two parts don't depend on the day: both are kept
    expect(memo.stats.partHits).toBe(0);
    expect(satisfiable(build(), TODAY_ON, options)).toBe('sat');
    expect(memo.stats.questionHits).toBe(2);
    expect(memo.stats.partHits).toBe(2);
    expect(memo.stats.questions).toBe(4);
  });

  it('keeps the parts that depend on the day by their days', () => {
    const memo = createSolverMemo();
    const options = optionsOf({ memo });
    expect(satisfiable({ and: [ADULT_BORN_LATE, height('gt', 2)] }, TODAY_ONLY, options)).toBe(
      'unsat'
    );
    expect(satisfiable({ and: [ADULT_BORN_LATE, height('gt', 3)] }, AFTER_TODAY, options)).toBe(
      'sat'
    );
    expect(memo.stats.partHits).toBe(0);
    expect(satisfiable({ and: [ADULT_BORN_LATE, height('gt', 3)] }, TODAY_ONLY, options)).toBe(
      'unsat'
    );
    expect(memo.stats.partHits).toBe(2);
  });

  it("serves one checked branch's variables, and only memos it made", () => {
    const memo = createSolverMemo();
    satisfiable(height('gt', 2), TODAY_ONLY, optionsOf({ memo }));
    expect(() =>
      satisfiable(height('gt', 2), TODAY_ONLY, optionsOf({ memo, variables: { ...VARIABLES } }))
    ).toThrow(/one checked branch/);
    const stats = createSolverMemo().stats;
    expect(() => satisfiable(true, TODAY_ONLY, optionsOf({ memo: { stats } }))).toThrow(
      /createSolverMemo/
    );
  });

  it('refuses a literal on a variable it lacks, or of another kind', () => {
    expect(() =>
      verdictOf(
        literal(variable('pid.nationality', 'enum'), { kind: 'enum', op: 'one_of', values: [1] })
      )
    ).toThrow(/no variable pid.nationality/);
    expect(() =>
      verdictOf(literal(HEIGHT, { kind: 'text', op: 'eq', text: 'a', matchCase: true }))
    ).toThrow(/text test on the number variable/);
  });
});

// Against the oracle (SC-001; research R13)

/** The seeds of the generated branches compared with the oracle */
const SEEDS = 1000;

/**
 * How long the survey of every seed may take: about 4 seconds alone, more while the other test
 * files run beside it, so more than Vitest's 5 seconds per test
 */
const SURVEY_TIMEOUT_MS = 60000;

/** Today alone, for the generated branches */
const ORACLE_TODAY_ONLY: DayRange = { from: ORACLE_TODAY_DAY, to: ORACLE_TODAY_DAY };

/** The questions compared with the oracle, by what they ask (research R4) */
type Question =
  | 'branch today'
  | 'branch on a later day'
  | 'branch from today'
  | "branch's days from today"
  | 'every citizen meets the branch'
  | 'items together today'
  | 'items together on a later day'
  | "items' days from today"
  | 'item always met'
  | 'item redundant'
  | 'items meet, an item fails, today'
  | 'items meet, an item fails, from today';

const QUESTIONS: readonly Question[] = [
  'branch today',
  'branch on a later day',
  'branch from today',
  "branch's days from today",
  'every citizen meets the branch',
  'items together today',
  'items together on a later day',
  "items' days from today",
  'item always met',
  'item redundant',
  'items meet, an item fails, today',
  'items meet, an item fails, from today',
];

/** How often the oracle answered yes and no to a question, and where the solver disagreed */
interface Comparisons {
  yes: number;
  no: number;
  wrong: string[];
}

/** What the comparisons over every seed found, read once */
interface Survey {
  /** Per question: how often the oracle answered yes and no, and the disagreements */
  byQuestion: Map<Question, Comparisons>;
  /** The solver's 'unknown' answers, and those where no text field mixes letter case with "contains" */
  unknown: number;
  unexplained: string[];
  /** Every question asked */
  asked: number;
}

/** An item of a checked tree, with the items around it that research R4's questions read */
interface Placed {
  item: CheckedItem;
  /** Its level's combination */
  operator: Combinator;
  /** A(X): the siblings along the path to the top level, at levels combined with AND */
  context: CheckedItem[];
  /** O(X): the same at levels combined with OR */
  alternatives: CheckedItem[];
  /** Whether it is the top level's only item, which deleting leaves no rules */
  alone: boolean;
}

/** The items of a checked tree, top-down in display order, as the oracle's `itemIds` */
function placedItems(checked: CheckedBranch): Placed[] {
  const placed: Placed[] = [];
  const visit = (
    items: readonly CheckedItem[],
    operator: Combinator,
    context: CheckedItem[],
    alternatives: CheckedItem[],
    top: boolean
  ): void => {
    for (const item of items) {
      const siblings = items.filter((other) => other !== item);
      const ownContext = operator === 'and' ? [...context, ...siblings] : context;
      const ownAlternatives = operator === 'or' ? [...alternatives, ...siblings] : alternatives;
      placed.push({
        item,
        operator,
        context: ownContext,
        alternatives: ownAlternatives,
        alone: top && items.length === 1,
      });
      if (item.type === 'group') {
        visit(item.items, item.operator, ownContext, ownAlternatives, false);
      }
    }
  };
  visit(checked.items, checked.operator, [], [], true);
  return placed;
}

/** An item's formula: a rule's own, or its group's level over its items' formulas */
function formulaOf(item: CheckedItem, cache: Map<string, Formula>): Formula {
  let formula = cache.get(item.id);
  if (formula === undefined) {
    formula =
      item.type === 'rule'
        ? item.formula
        : levelOf(
            item.operator,
            item.items.map((member) => formulaOf(member, cache))
          );
    cache.set(item.id, formula);
  }
  return formula;
}

function levelOf(operator: Combinator, members: Formula[]): Formula {
  return operator === 'and' ? { and: members } : { or: members };
}

/** The literals of a formula */
function literalsIn(formula: Formula): Literal[] {
  if (typeof formula === 'boolean') {
    return [];
  }
  if (isLiteral(formula)) {
    return [formula];
  }
  return ('and' in formula ? formula.and : formula.or).flatMap(literalsIn);
}

/**
 * Whether a text variable of the formula mixes letter-case settings with "contains" or "doesn't
 * contain" conditions: the only place where the text theory, and so the solver, may answer
 * 'unknown' (research R7)
 */
function mixesCaseWithContains(formula: Formula): boolean {
  const byVariable = new Map<string, Literal[]>();
  for (const each of literalsIn(formula)) {
    if (each.test.kind === 'text') {
      byVariable.set(each.variable, [...(byVariable.get(each.variable) ?? []), each]);
    }
  }
  return [...byVariable.values()].some((literals) => {
    const settings = new Set(
      literals.map((each) => each.test.kind === 'text' && each.test.matchCase)
    );
    const contains = literals.some(
      (each) =>
        each.test.kind === 'text' &&
        (each.test.op === 'contains' || each.test.op === 'not_contains')
    );
    return settings.size > 1 && contains;
  });
}

/** A seeded random source: mulberry32 */
function randomOf(seed: number): (count: number) => number {
  let state = seed >>> 0;
  return (count) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return Math.floor((((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296) * count);
  };
}

/** Up to `size` items of `items`, drawn without repeats, in their order */
function drawn<T>(items: readonly T[], size: number, random: (count: number) => number): T[] {
  const left = [...items];
  const chosen: T[] = [];
  while (chosen.length < size && left.length > 0) {
    chosen.push(...left.splice(random(left.length), 1));
  }
  return items.filter((item) => chosen.includes(item));
}

/**
 * The items each citizen of the oracle meets, on each day that stands for a stretch of days from
 * today on (`Oracle.days()`), evaluated with ../evaluation.ts: questions about items that some
 * meet and others fail, which the oracle's own helpers don't ask
 */
interface MetTable {
  /** Each stretch of days, and the distinct sets of item ids its citizens meet */
  stretches: { from: number; to: number; met: Set<string>[] }[];
}

function metTableOf(branch: GeneratedBranch, oracle: Oracle): MetTable {
  const days = oracle.days(FROM_TODAY);
  const stretches = days.map((day, index) => {
    const seen = new Map<string, Set<string>>();
    for (const applicant of oracle.applicantsOn(day)) {
      const evaluation = evaluateBranch(branch, applicant, day, ORACLE_CONTEXT);
      const met = new Set<string>(evaluation.met ? [BRANCH] : []);
      const visit = (each: EvaluatedItem): void => {
        if (each.outcome === 'met') {
          met.add(each.item.id);
        }
        each.members.forEach(visit);
      };
      evaluation.items.forEach(visit);
      seen.set([...met].sort().join(','), met);
    }
    const to = index + 1 < days.length ? days[index + 1] - 1 : LAST_DAY;
    return { from: day, to, met: [...seen.values()] };
  });
  return { stretches };
}

/** Whether a citizen meets every item of `meets` and fails `fails` on a day of `days` */
function meetsButFails(table: MetTable, meets: readonly string[], fails: string, days: DayRange) {
  return table.stretches.some(
    (stretch) =>
      stretch.from <= days.to &&
      days.from <= stretch.to &&
      stretch.met.some((met) => meets.every((id) => met.has(id)) && !met.has(fails))
  );
}

/** A question's comparisons in the survey */
function comparisonsOf(result: Survey, question: Question): Comparisons {
  const comparisons = result.byQuestion.get(question);
  if (comparisons === undefined) {
    throw new Error(`No comparisons for "${question}"`);
  }
  return comparisons;
}

let survey: Survey | null = null;

/** The comparisons of the solver with the oracle over every seed, made once */
function surveyed(): Survey {
  if (survey) {
    return survey;
  }
  const result: Survey = {
    byQuestion: new Map(QUESTIONS.map((question) => [question, { yes: 0, no: 0, wrong: [] }])),
    unknown: 0,
    unexplained: [],
    asked: 0,
  };
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    withSeed(seed, () => surveyOne(seed, result));
  }
  survey = result;
  return result;
}

/** Asks the questions of research R4 about one generated branch, and adds them to the survey */
function surveyOne(seed: number, result: Survey): void {
  const branch = randomBranch(seed);
  const checked = checkedBranchOf(branch);
  const oracle = oracleOf(branch);
  const placed = placedItems(checked);
  expect(placed.map(({ item }) => item.id)).toEqual(oracle.itemIds);
  const options: SolverOptions = {
    deadline: Number.POSITIVE_INFINITY,
    now: () => 0,
    variables: checked.variables,
    memo: createSolverMemo(),
  };
  const cache = new Map<string, Formula>();
  const formula = (item: CheckedItem) => formulaOf(item, cache);
  const random = randomOf(seed);

  /** Compares a verdict with the oracle's yes (sat) or no (unsat) */
  const compare = (question: Question, asked: Formula, verdict: Verdict, expected: boolean) => {
    const entry = comparisonsOf(result, question);
    result.asked += 1;
    entry[expected ? 'yes' : 'no'] += 1;
    if (verdict === 'unknown') {
      result.unknown += 1;
      if (!mixesCaseWithContains(asked)) {
        result.unexplained.push(`seed ${seed}: ${question}`);
      }
    } else if ((verdict === 'sat') !== expected) {
      entry.wrong.push(`seed ${seed}: ${verdict}, the oracle ${expected ? 'sat' : 'unsat'}`);
    }
  };
  const compareDays = (question: Question, asked: Formula, expected: DayRange[]) => {
    const days = feasibleDaysOf(asked, FROM_TODAY, options);
    const verdict: Verdict = days === 'unknown' ? days : days.length > 0 ? 'sat' : 'unsat';
    compare(question, asked, verdict, expected.length > 0);
    if (days !== 'unknown' && JSON.stringify(days) !== JSON.stringify(expected)) {
      comparisonsOf(result, question).wrong.push(
        `seed ${seed}: ${JSON.stringify(days)}, the oracle ${JSON.stringify(expected)}`
      );
    }
  };

  // The whole branch (research R8, steps 1 and 3)
  const whole = levelOf(checked.operator, checked.items.map(formula));
  const ask = (asked: Formula, days: DayRange) => satisfiable(asked, days, options);
  compare(
    'branch today',
    whole,
    ask(whole, ORACLE_TODAY_ONLY),
    oracle.canMeet([BRANCH], ORACLE_TODAY_DAY)
  );
  compare(
    'branch on a later day',
    whole,
    ask(whole, LATER_DAYS),
    oracle.canMeet([BRANCH], LATER_DAYS)
  );
  compare('branch from today', whole, ask(whole, FROM_TODAY), oracle.canMeet([BRANCH], FROM_TODAY));
  compareDays("branch's days from today", whole, oracle.meetDays([BRANCH], FROM_TODAY));
  const everyone = negate(whole);
  compare(
    'every citizen meets the branch',
    everyone,
    ask(everyone, FROM_TODAY),
    !oracle.alwaysMet([BRANCH], FROM_TODAY)
  );

  // Items together, as the conflicts' sets T ∧ X (research R8, step 2)
  const together = drawn(placed, 2 + random(2), random).map(({ item }) => item);
  const ids = together.map((item) => item.id);
  const both = allOf(together.map(formula));
  compare(
    'items together today',
    both,
    ask(both, ORACLE_TODAY_ONLY),
    oracle.canMeet(ids, ORACLE_TODAY_DAY)
  );
  compare(
    'items together on a later day',
    both,
    ask(both, LATER_DAYS),
    oracle.canMeet(ids, LATER_DAYS)
  );
  compareDays("items' days from today", both, oracle.meetDays(ids, FROM_TODAY));

  // An item always met, and redundant in the branch (research R8, step 4)
  const [chosen] = drawn(placed, 1, random);
  const { item } = chosen;
  const fails = negate(formula(item));
  compare(
    'item always met',
    fails,
    ask(fails, FROM_TODAY),
    !oracle.alwaysMet([item.id], FROM_TODAY)
  );
  if (!chosen.alone) {
    const pivotal = allOf([
      ...chosen.context.map(formula),
      ...chosen.alternatives.map((other) => negate(formula(other))),
    ]);
    const changes = allOf([pivotal, chosen.operator === 'and' ? fails : formula(item)]);
    compare(
      'item redundant',
      changes,
      ask(changes, FROM_TODAY),
      oracle.changedOutcome([item.id], FROM_TODAY) !== null
    );
  }

  // Items that some citizen meets while failing another, as the reasons S ⇒ X ask
  if (chosen.context.length > 0) {
    const table = metTableOf(branch, oracle);
    const meets = drawn(chosen.context, 1 + random(2), random);
    const asked = allOf([...meets.map(formula), fails]);
    const meetIds = meets.map((each) => each.id);
    compare(
      'items meet, an item fails, today',
      asked,
      ask(asked, ORACLE_TODAY_ONLY),
      meetsButFails(table, meetIds, item.id, ORACLE_TODAY_ONLY)
    );
    compare(
      'items meet, an item fails, from today',
      asked,
      ask(asked, FROM_TODAY),
      meetsButFails(table, meetIds, item.id, FROM_TODAY)
    );
  }
}

describe(`against the oracle, for ${SEEDS} seeded branches`, () => {
  beforeAll(() => {
    surveyed();
  }, SURVEY_TIMEOUT_MS);

  it.each(QUESTIONS)('answers "%s" as the oracle does', (question) => {
    const entry = comparisonsOf(surveyed(), question);
    expect(entry.wrong).toEqual([]);
    // Both answers occur, so the comparison means something
    expect(entry.yes).toBeGreaterThan(SEEDS / 50);
    expect(entry.no).toBeGreaterThan(SEEDS / 50);
  });

  it('answers \'unknown\' only where a text field mixes letter case with "contains", rarely', () => {
    const { unknown, unexplained, asked } = surveyed();
    expect(unexplained).toEqual([]);
    expect(unknown).toBeLessThan(asked / 100);
  });
});
