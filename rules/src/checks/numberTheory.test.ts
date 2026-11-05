import { describe, expect, it } from 'vitest';

import vectors from './fixtures/evaluator-vectors.json';
import { decideNumber, numberHolds, numberTheory } from './numberTheory';
import type { Literal, NumberOp, NumberTest, Variable, Verdict } from './types';

/** The part of a `rule_outcomes` vector that a number literal replays */
interface OutcomeVector {
  condition: { operator: string; value?: number | string };
  description: string;
  kind: string;
  outcome: string;
  value: unknown;
}

/** The API's number operators as the literals' tests, as `literals.ts` maps them */
const OPS: Record<string, NumberOp> = {
  greater_than: 'gt',
  less_than: 'lt',
  equal_to: 'eq',
  not_equal_to: 'ne',
};

const NUMBER_OUTCOMES = (vectors.rule_outcomes as OutcomeVector[]).filter(
  (vector) => vector.kind === 'number' && vector.outcome !== 'not_checked'
);

/** "Driving licence – Age in years", the field of the edge cases */
const AGE: Variable = { key: 'mdl.age_in_years', kind: 'number', multiple: false, values: [] };

/** 2026-10-28 as a day number, which the number theory doesn't read */
const TODAY = 739917;

function literal(op: NumberOp, value: number, negated = false): Literal<NumberTest> {
  return { variable: AGE.key, test: { kind: 'number', op, value }, negated };
}

const gt = (value: number) => literal('gt', value);
const lt = (value: number) => literal('lt', value);
const eq = (value: number) => literal('eq', value);
const ne = (value: number) => literal('ne', value);

/** The literal's negation: the same test with `negated` flipped */
function not(of: Literal<NumberTest>): Literal<NumberTest> {
  return { ...of, negated: !of.negated };
}

function meetsAll(literals: Literal<NumberTest>[], value: number): boolean {
  return literals.every((each) => numberHolds(each, value));
}

/** The verdict, once a witness is checked: a whole number from 0 that meets every literal */
function verdictOf(literals: Literal<NumberTest>[]): Verdict {
  const answer = decideNumber(literals);
  if (answer.verdict === 'sat') {
    expect(Number.isInteger(answer.witness) && answer.witness >= 0).toBe(true);
    expect(meetsAll(literals, answer.witness)).toBe(true);
  }
  return answer.verdict;
}

/** The witness, or null when the literals can't be met */
function witnessOf(literals: Literal<NumberTest>[]): number | null {
  const answer = decideNumber(literals);
  return answer.verdict === 'sat' ? answer.witness : null;
}

/** A seeded generator of numbers in [0, 1) (mulberry32), so that a failure can be replayed */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function numberOf(value: unknown): number {
  if (typeof value !== 'number') {
    throw new Error(`Not a number: ${String(value)}`);
  }
  return value;
}

describe('decideNumber', () => {
  it('meets no literals with 0', () => {
    expect(decideNumber([])).toEqual({ verdict: 'sat', witness: 0 });
  });

  it('can’t meet "greater than 20" and "less than 21" together (EC "Whole numbers")', () => {
    expect(verdictOf([gt(20), lt(21)])).toBe('unsat');
    expect(verdictOf([gt(20)])).toBe('sat');
    expect(verdictOf([lt(21)])).toBe('sat');
    expect(witnessOf([gt(20), lt(22)])).toBe(21);
  });

  it('can’t meet "less than 0", while "less than 0.5" is met by 0 alone', () => {
    expect(verdictOf([lt(0)])).toBe('unsat');
    expect(witnessOf([lt(0.5)])).toBe(0);
    expect(verdictOf([lt(0.5), ne(0)])).toBe('unsat');
  });

  describe('a rule’s value with decimals', () => {
    it('reads "greater than 20.5" as at least 21', () => {
      expect(witnessOf([gt(20.5)])).toBe(21);
      // Nobody meets one and fails the other: they hold for the same values
      expect(verdictOf([gt(20.5), lt(21)])).toBe('unsat');
      expect(verdictOf([not(gt(20.5)), not(lt(21))])).toBe('unsat');
    });

    it('reads "less than 20.5" as at most 20', () => {
      expect(verdictOf([lt(20.5), gt(20)])).toBe('unsat');
      expect(verdictOf([not(lt(20.5)), not(gt(20))])).toBe('unsat');
    });

    it('can’t meet "equal to 20.5"', () => {
      expect(verdictOf([eq(20.5)])).toBe('unsat');
    });

    it('always meets "not equal to 20.5": its negation can’t be met', () => {
      expect(verdictOf([ne(20.5)])).toBe('sat');
      expect(verdictOf([not(ne(20.5))])).toBe('unsat');
    });
  });

  describe('EC "A conflict among more than two rules"', () => {
    const fourRules = [gt(17), lt(20), ne(18), ne(19)];

    it('can’t meet "greater than 17", "less than 20", "not equal to 18" and "to 19" together', () => {
      expect(verdictOf(fourRules)).toBe('unsat');
    });

    it.each([0, 1, 2, 3])('meets the other three without literal %i', (leftOut) => {
      expect(verdictOf(fourRules.filter((_, index) => index !== leftOut))).toBe('sat');
    });
  });

  describe('a negated literal', () => {
    it('takes ≤ for >', () => {
      expect(witnessOf([not(gt(20)), gt(19)])).toBe(20);
      expect(verdictOf([not(gt(20)), gt(20)])).toBe('unsat');
    });

    it('takes ≥ for <', () => {
      expect(witnessOf([not(lt(20))])).toBe(20);
      expect(verdictOf([not(lt(20)), lt(20)])).toBe('unsat');
    });

    it('takes ≠ for =', () => {
      expect(verdictOf([not(eq(3)), gt(2), lt(4)])).toBe('unsat');
      expect(witnessOf([not(eq(0))])).toBe(1);
    });

    it('takes = for ≠', () => {
      expect(witnessOf([not(ne(3))])).toBe(3);
      expect(verdictOf([not(ne(3.5))])).toBe('unsat');
    });

    it.each([gt(3), lt(3), eq(3), ne(3), gt(2.5), lt(0), ne(-1)])(
      'can’t be met together with the literal itself: %o',
      (each) => {
        expect(verdictOf([each, not(each)])).toBe('unsat');
      }
    );
  });

  it('finds the smallest value that no "not equal to" excludes, in any order', () => {
    expect(witnessOf([ne(2), ne(0), ne(1)])).toBe(3);
    expect(witnessOf([gt(4), ne(7), ne(6), ne(5)])).toBe(8);
    expect(verdictOf([gt(4), lt(8), ne(7), ne(5), ne(6)])).toBe('unsat');
  });

  describe('beyond 2^53, where the evaluator’s floats are every double', () => {
    it('takes the next and the previous double for "greater than" and "less than"', () => {
      expect(witnessOf([gt(2 ** 53)])).toBe(2 ** 53 + 2);
      expect(witnessOf([gt(2 ** 53 - 1), lt(2 ** 53 + 2)])).toBe(2 ** 53);
      // The doubles from 2^60 on are 256 apart, those below it 128
      expect(verdictOf([gt(2 ** 60), lt(2 ** 60 + 256)])).toBe('unsat');
      expect(witnessOf([gt(2 ** 60 - 256), lt(2 ** 60)])).toBe(2 ** 60 - 128);
    });

    it('can’t meet values that only fall between doubles', () => {
      // An applicant's 2^53 + 1 compares as 2^53, and 2^53 + 3 as 2^53 + 4 (Python's float())
      expect(verdictOf([gt(2 ** 53), lt(2 ** 53 + 4), ne(2 ** 53 + 2)])).toBe('unsat');
    });

    it('ends with the largest double', () => {
      expect(verdictOf([gt(Number.MAX_VALUE)])).toBe('unsat');
      expect(witnessOf([not(lt(Number.MAX_VALUE))])).toBe(Number.MAX_VALUE);
      expect(verdictOf([not(lt(Number.MAX_VALUE)), ne(Number.MAX_VALUE)])).toBe('unsat');
    });
  });

  it('answers as an enumeration of the values, for 2000 seeded sets of literals', () => {
    // The rules' values lie in [-1, 5] in steps of a half, so 6 and above all behave alike, and 0
    // to 7 stand for every value an applicant can have
    const domain = [0, 1, 2, 3, 4, 5, 6, 7];
    const ops: NumberOp[] = ['gt', 'lt', 'eq', 'ne'];
    const random = seeded(2026);
    for (let run = 0; run < 2000; run += 1) {
      const literals = Array.from({ length: 1 + Math.floor(random() * 5) }, () =>
        literal(
          ops[Math.floor(random() * ops.length)],
          (Math.floor(random() * 13) - 2) / 2,
          random() < 0.3
        )
      );
      const smallest = domain.find((value) => meetsAll(literals, value)) ?? null;
      const context = `run ${run}: ${JSON.stringify(literals)}`;
      expect(verdictOf(literals), context).toBe(smallest === null ? 'unsat' : 'sat');
      expect(witnessOf(literals), context).toBe(smallest);
    }
  });

  it('is the solver’s number theory', () => {
    expect(numberTheory.decide([gt(20), lt(21)], AGE, TODAY)).toEqual({ verdict: 'unsat' });
    expect(numberTheory.decide([gt(20)], AGE, TODAY)).toEqual({ verdict: 'sat', witness: 21 });
    expect(numberTheory.holds(gt(20), 21, TODAY)).toBe(true);
  });
});

describe('numberHolds, the membership test', () => {
  it('has number vectors to replay', () => {
    expect(NUMBER_OUTCOMES.length).toBeGreaterThan(0);
  });

  it.each(NUMBER_OUTCOMES)('agrees with the evaluator: $description', (vector) => {
    const test = literal(OPS[vector.condition.operator], numberOf(vector.condition.value));
    const value = numberOf(vector.value);
    expect(numberHolds(test, value)).toBe(vector.outcome === 'met');
    expect(numberHolds(not(test), value)).toBe(vector.outcome !== 'met');
  });
});
