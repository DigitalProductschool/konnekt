// The number theory (specs/003-rule-consistency-checks, FR-007; research R3, R6): whether the
// literals of one number variable can be met together.
//
// A citizen's value is a whole number from 0 (ISO/IEC 18013-5 encodes the number fields as
// `uint`). `_number_holds()` in backend/app/services/evaluation.py compares it as a float, so the
// values are the whole doubles from 0: every whole number below 2^53, and every double from there
// on. A variable's literals give an interval of them, minus a finite set of excluded values.
// "Greater than c" sets the lower bound to ⌊c⌋ + 1, "less than c" the upper bound to ⌈c⌉ − 1
// (from 2^53 on, the next and the previous double), "equal to c" needs a whole number c, and "not
// equal to c" excludes a whole number c. A negated literal takes the complement: ≤ for >, ≥ for <,
// ≠ for =. The literals can be met when the interval holds more values than it excludes, and the
// smallest value that isn't excluded is the witness
import type { Literal, NumberOp, NumberTest, Theory, TheoryAnswer, UnsatAnswer } from './types';

/** A literal's comparison with `negated` applied: `le` and `ge` are ≤ and ≥ */
type Comparison = NumberOp | 'le' | 'ge';

/** The complement of each comparison of a rule */
const COMPLEMENT: Record<NumberOp, Comparison> = { gt: 'le', lt: 'ge', eq: 'ne', ne: 'eq' };

/** 2^53: below it, whole numbers are 1 apart. From it on, every double is whole, 2 or more apart */
const WHOLE_DOUBLES_FROM = 2 ** 53;

/** The value no other value is greater than: the upper bound without "less than" */
const LARGEST = Number.MAX_VALUE;

/** The upper bound of an interval without values */
const NONE_BELOW = -1;

const UNSAT: UnsatAnswer = { verdict: 'unsat' };

/** Whether `value` meets the literal, as the evaluator compares, with `negated` flipping it */
export function numberHolds(literal: Literal<NumberTest>, value: number): boolean {
  const limit = literal.test.value;
  let met: boolean;
  switch (literal.test.op) {
    case 'gt':
      met = value > limit;
      break;
    case 'lt':
      met = value < limit;
      break;
    case 'eq':
      met = value === limit;
      break;
    case 'ne':
      met = value !== limit;
      break;
  }
  return met !== literal.negated;
}

/**
 * Whether one whole number from 0 meets every literal, with the smallest such number as the
 * witness. Never `'unknown'`
 */
export function decideNumber(literals: readonly Literal<NumberTest>[]): TheoryAnswer<number> {
  let low = 0;
  let high = LARGEST;
  for (const literal of literals) {
    const limit = literal.test.value;
    switch (comparisonOf(literal)) {
      case 'gt':
        low = Math.max(low, wholeAbove(limit));
        break;
      case 'ge':
        low = Math.max(low, wholeAtLeast(limit));
        break;
      case 'lt':
        high = Math.min(high, wholeBelow(limit));
        break;
      case 'le':
        high = Math.min(high, wholeAtMost(limit));
        break;
      case 'eq':
        if (!isWhole(limit)) {
          return UNSAT;
        }
        low = Math.max(low, limit);
        high = Math.min(high, limit);
        break;
      case 'ne':
        break;
    }
  }
  // The smallest value from `low` that no "not equal to" excludes. Each pass moves past the
  // excluded values in the literals' order, so a pass that moves nothing ends the search
  let value = low;
  let moved = true;
  while (moved && value <= high) {
    moved = false;
    for (const literal of literals) {
      if (literal.test.value === value && comparisonOf(literal) === 'ne') {
        value = nextWhole(value);
        moved = true;
      }
    }
  }
  return value <= high ? { verdict: 'sat', witness: value } : UNSAT;
}

/** The number theory, for the solver (`Theory`) */
export const numberTheory: Theory<NumberTest, number> = {
  holds: numberHolds,
  decide: decideNumber,
};

/** The literal's comparison, the complement of its test's when it is negated */
function comparisonOf(literal: Literal<NumberTest>): Comparison {
  return literal.negated ? COMPLEMENT[literal.test.op] : literal.test.op;
}

/** Whether `value` is a value a citizen can have: a whole double from 0 */
function isWhole(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/** The smallest value greater than `limit`: ⌊limit⌋ + 1, or 0 */
function wholeAbove(limit: number): number {
  return limit < 0 ? 0 : nextWhole(Math.floor(limit));
}

/** The smallest value from `limit` on: ⌈limit⌉, or 0 */
function wholeAtLeast(limit: number): number {
  return limit <= 0 ? 0 : Math.ceil(limit);
}

/** The largest value less than `limit`: ⌈limit⌉ − 1, or `NONE_BELOW` */
function wholeBelow(limit: number): number {
  return limit <= 0 ? NONE_BELOW : previousWhole(Math.ceil(limit));
}

/** The largest value up to `limit`: ⌊limit⌋, or `NONE_BELOW` */
function wholeAtMost(limit: number): number {
  return limit < 0 ? NONE_BELOW : Math.floor(limit);
}

/**
 * The next whole double after the whole double `value`: `value + 1` below 2^53, else the next
 * double. From 2^53 on, the gap is a power of two, and the first power of two that changes
 * `value` rounds to the next double. After `Number.MAX_VALUE` it is `Infinity`, which is above
 * every upper bound. A rule's value is finite (`isComplete()`), so the guard only keeps the loop
 * from running forever
 */
function nextWhole(value: number): number {
  if (value < WHOLE_DOUBLES_FROM) {
    return value + 1;
  }
  if (!Number.isFinite(value)) {
    return value;
  }
  let step = 2;
  while (value + step === value) {
    step *= 2;
  }
  return value + step;
}

/**
 * The whole double before the whole double `value`: `value − 1` up to 2^53, else the double
 * before, found as in `nextWhole()`
 */
function previousWhole(value: number): number {
  if (value <= WHOLE_DOUBLES_FROM) {
    return value - 1;
  }
  if (!Number.isFinite(value)) {
    return value;
  }
  let step = 2;
  while (value - step === value) {
    step *= 2;
  }
  return value - step;
}
