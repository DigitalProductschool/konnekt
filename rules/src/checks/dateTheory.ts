// The date theory (specs/003-rule-consistency-checks, FR-007, FR-008; research R6): whether the
// literals of one date variable can be met together, on one day of sharing and over a range of
// days.
//
// A citizen's value is a day from 0001-01-01 to 9999-12-31, as a day number (`calendar.ts`).
// On the day of sharing d, each literal is a set of dates, written here half-open as [from, to),
// where END, the day after 9999-12-31, ends a set that reaches the calendar's last day:
// - "before c" is [1, c), "after c" is [c + 1, END) and "on c" is [c, c + 1): strict comparisons;
// - "at least N years ago" is v ≤ L_N(d), so [1, L_N(d) + 1); "less than" is [L_N(d) + 1, END);
//   "exactly" is L_{N+1}(d) < v ≤ L_N(d), so [L_{N+1}(d) + 1, L_N(d) + 1), with L_N
//   `yearsAgoThreshold()`;
// - "at least N years/months from now" is v ≥ A(d), so [A(d), END), and "less than" is
//   [1, A(d)), with A `yearsAfter(d, N)` or `monthsAfter(d, N)`;
// - a negated literal takes the complement: a hole in the dates of the others.
// The literals can be met when the intersection of the sets, without the holes, isn't empty. A
// sweep over the holes in the order of their starts finds its earliest date, the witness.
//
// Over a range of days of sharing, the cuts of `feasibleDays()` are complete. The sweep only
// compares endpoints, so it answers alike on two days whose endpoints are in the same order. The
// endpoints are constants (1, END, and the ends c and c + 1 of the fixed dates' sets) and
// thresholds (L_N(d) + 1 and A(d)), which never decrease as d grows. So a threshold e and a
// constant k change their order (<, =, >) only on the first day with e ≥ k and on the first day
// with e ≥ k + 1. Two thresholds, with counts from 1, keep their order on every day before
// 9999-12-31, except where one of them reaches a bound:
// - L_M < L_N for M > N once L_N ≥ 1, and both are 0 while no date is N years old: they change
//   on the first day with L_N + 1 ≥ 2;
// - L_N(d) < d < A(d), so L_N + 1 < A on every such day;
// - A of m months is before A of more months, since a later month gives a later date, until it
//   is 9999-12-31, and equal from then on: they change on the first day with A ≥ 9999-12-31. A
//   count of years is 12 times as many months: `yearsAfter(d, N) = monthsAfter(d, 12N)`.
// On 9999-12-31 itself, every L_N and every A is 9999-12-31. So the range is cut on the first day
// on which a threshold reaches k or k + 1, for every k among the constants and 9999-12-31, and on
// 9999-12-31. Between two cuts every pair of endpoints keeps its order, so the first day of each
// piece decides it. dateTheory.test.ts compares the pieces with every day of windows around
// today, a 29 February, the calendar's first years and its last days
import { monthsAfter, yearsAfter, yearsAgoThreshold } from './calendar';
import { FIRST_DAY, LAST_DAY } from './constants';
import type {
  DateTest,
  DayRange,
  FromNowTest,
  Literal,
  RelativeDateTest,
  Theory,
  TheoryAnswer,
  UnsatAnswer,
  Variable,
} from './types';

/** The day after 9999-12-31: the end of a half-open set of days that reaches the last day */
const END = LAST_DAY + 1;

const UNSAT: UnsatAnswer = { verdict: 'unsat' };

/** A literal's dates on one day of sharing: [from, to), or every date outside it when `outside` */
interface DaySet {
  from: number;
  to: number;
  outside: boolean;
}

/** An endpoint that moves with the day of sharing, L_N(d) + 1 or A(d): it never decreases */
type Threshold = (day: number) => number;

/**
 * Whether a citizen whose date is `value` and who shares on `day` (both day numbers) meets the
 * literal, by the comparisons of `_date_holds()` in backend/app/services/evaluation.py, with
 * `negated` flipping the outcome
 */
export function dateHolds(literal: Literal<DateTest>, value: number, day: number): boolean {
  const { test } = literal;
  let met: boolean;
  switch (test.op) {
    case 'before':
      met = value < test.date;
      break;
    case 'after':
      met = value > test.date;
      break;
    case 'on':
      met = value === test.date;
      break;
    case 'at_least_years_ago':
      met = day >= yearsAfter(value, test.count);
      break;
    case 'less_than_years_ago':
      met = day < yearsAfter(value, test.count);
      break;
    case 'exactly_years_ago':
      met = yearsAfter(value, test.count) <= day && day < yearsAfter(value, test.count + 1);
      break;
    case 'at_least_from_now':
      met = value >= fromNow(test, day);
      break;
    case 'less_than_from_now':
      met = value < fromNow(test, day);
      break;
  }
  return met !== literal.negated;
}

/**
 * Whether one date meets every literal for a citizen who shares on `day`, with the earliest
 * such date as the witness. The variable isn't read: every date variable has the calendar's days.
 * Never `'unknown'`
 */
export function decideDate(
  literals: readonly Literal<DateTest>[],
  _variable: Variable,
  day: number
): TheoryAnswer<number> {
  const witness = firstDate(literals, day);
  return witness === null ? UNSAT : { verdict: 'sat', witness };
}

/**
 * The days of sharing within `days` on which one date meets every literal, as sorted, disjoint
 * and non-adjacent `DayRange`s, both ends included; empty when there are none or `days` is empty
 * (`from` after `to`). The ends of `days` are day numbers. Without a test counted from the day of
 * sharing, the answer is every day of `days` or none. Otherwise the range is cut where the
 * literals' thresholds meet the fixed dates or the calendar's bounds (see above). One binary
 * search per threshold finds those days, so the time grows with the logarithm of the range's
 * length, times the number of cuts
 */
export function feasibleDays(literals: readonly Literal<DateTest>[], days: DayRange): DayRange[] {
  const { from, to } = days;
  if (from > to) {
    return [];
  }
  const thresholds = new Map<string, Threshold>();
  const constants = new Set<number>([FIRST_DAY, LAST_DAY, END]);
  for (const literal of literals) {
    addEndpoints(literal.test, thresholds, constants);
  }
  if (thresholds.size === 0) {
    return firstDate(literals, from) === null ? [] : [{ from, to }];
  }
  const starts = new Set<number>([from]);
  if (from < LAST_DAY && LAST_DAY <= to) {
    starts.add(LAST_DAY);
  }
  const targets = [...new Set([...constants].flatMap((constant) => [constant, constant + 1]))].sort(
    (a, b) => a - b
  );
  for (const threshold of thresholds.values()) {
    const first = threshold(from);
    const last = threshold(to);
    const reached = targets.filter((target) => first < target && target <= last);
    addFirstDays(threshold, reached, 0, reached.length, from, to, starts);
  }
  const pieces = [...starts].sort((a, b) => a - b);
  const result: DayRange[] = [];
  pieces.forEach((start, index) => {
    if (firstDate(literals, start) === null) {
      return;
    }
    const end = index + 1 < pieces.length ? pieces[index + 1] - 1 : to;
    const previous = result[result.length - 1];
    if (previous !== undefined && previous.to === start - 1) {
      previous.to = end;
    } else {
      result.push({ from: start, to: end });
    }
  });
  return result;
}

/**
 * Whether a date's test is counted from the day of sharing ("years ago", "from now"), so that the
 * days on which a variable's literals can be met depend on it
 */
export function isRelativeDateTest(test: DateTest): test is RelativeDateTest {
  return test.op !== 'before' && test.op !== 'after' && test.op !== 'on';
}

/** The date theory, for the solver (`Theory`) */
export const dateTheory: Theory<DateTest, number> = {
  holds: dateHolds,
  decide: decideDate,
};

/** A(d) of a "from now" test: its count of years or months after the day of sharing */
function fromNow(test: FromNowTest, day: number): number {
  return test.unit === 'years' ? yearsAfter(day, test.count) : monthsAfter(day, test.count);
}

/** The literal's dates on `day`, half-open, with the complement for a negated literal */
function daySet(literal: Literal<DateTest>, day: number): DaySet {
  const { test } = literal;
  let from = FIRST_DAY;
  let to = END;
  switch (test.op) {
    case 'before':
      to = test.date;
      break;
    case 'after':
      from = test.date + 1;
      break;
    case 'on':
      from = test.date;
      to = test.date + 1;
      break;
    case 'at_least_years_ago':
      to = yearsAgoThreshold(day, test.count) + 1;
      break;
    case 'less_than_years_ago':
      from = yearsAgoThreshold(day, test.count) + 1;
      break;
    case 'exactly_years_ago':
      from = yearsAgoThreshold(day, test.count + 1) + 1;
      to = yearsAgoThreshold(day, test.count) + 1;
      break;
    case 'at_least_from_now':
      from = fromNow(test, day);
      break;
    case 'less_than_from_now':
      to = fromNow(test, day);
      break;
  }
  return { from, to, outside: literal.negated };
}

/**
 * The earliest date that meets every literal on `day`, or null. The sets narrow [from, to); the
 * sweep then moves past each hole, in the order of their starts, that holds the date found so far
 */
function firstDate(literals: readonly Literal<DateTest>[], day: number): number | null {
  let from = FIRST_DAY;
  let to = END;
  const holes: DaySet[] = [];
  for (const literal of literals) {
    const set = daySet(literal, day);
    if (!set.outside) {
      from = Math.max(from, set.from);
      to = Math.min(to, set.to);
    } else if (set.from < set.to) {
      holes.push(set);
    }
  }
  if (from >= to) {
    return null;
  }
  holes.sort((a, b) => a.from - b.from);
  let date = from;
  for (const hole of holes) {
    if (hole.from > date) {
      break;
    }
    date = Math.max(date, hole.to);
  }
  return date < to ? date : null;
}

/**
 * Collects a test's endpoints for the cuts of `feasibleDays()`: its thresholds, each once by its
 * kind and count, or the ends of its fixed date's set
 */
function addEndpoints(
  test: DateTest,
  thresholds: Map<string, Threshold>,
  constants: Set<number>
): void {
  const yearsAgo = (count: number) => {
    thresholds.set(`ago:${count}`, (day) => yearsAgoThreshold(day, count) + 1);
  };
  switch (test.op) {
    case 'before':
      constants.add(test.date);
      break;
    case 'after':
      constants.add(test.date + 1);
      break;
    case 'on':
      constants.add(test.date);
      constants.add(test.date + 1);
      break;
    case 'at_least_years_ago':
    case 'less_than_years_ago':
      yearsAgo(test.count);
      break;
    case 'exactly_years_ago':
      yearsAgo(test.count);
      yearsAgo(test.count + 1);
      break;
    case 'at_least_from_now':
    case 'less_than_from_now':
      thresholds.set(`${test.unit}:${test.count}`, (day) => fromNow(test, day));
      break;
  }
}

/**
 * Adds to `starts` the first day of (below, reached] on which `threshold` reaches each target of
 * `targets[start..end)`, which are sorted, above the threshold on `below` and reached on
 * `reached`. A threshold never decreases, so a binary search finds each day. One search serves
 * them all: the targets that the threshold reaches on the middle day are searched on its left,
 * the others on its right, so targets close together share most of their path
 */
function addFirstDays(
  threshold: Threshold,
  targets: readonly number[],
  start: number,
  end: number,
  below: number,
  reached: number,
  starts: Set<number>
): void {
  if (start === end) {
    return;
  }
  if (reached - below === 1) {
    starts.add(reached);
    return;
  }
  const middle = below + Math.floor((reached - below) / 2);
  const value = threshold(middle);
  let split = start;
  while (split < end && targets[split] <= value) {
    split += 1;
  }
  addFirstDays(threshold, targets, start, split, below, middle, starts);
  addFirstDays(threshold, targets, split, end, middle, reached, starts);
}
