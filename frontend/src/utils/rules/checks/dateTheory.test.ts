import { describe, expect, it } from 'vitest';

import { dayNumber, isoDate, monthsAfter, yearsAfter, yearsAgoThreshold } from './calendar';
import { FIRST_DAY, LAST_DAY } from './constants';
import { dateHolds, dateTheory, decideDate, feasibleDays, isRelativeDateTest } from './dateTheory';
import vectors from './fixtures/evaluator-vectors.json';
import type {
  DateTest,
  DateUnit,
  DayRange,
  FixedDateOp,
  FixedDateTest,
  FromNowOp,
  Literal,
  RelativeDateTest,
  Variable,
  Verdict,
  YearsAgoOp,
} from './types';

/** The part of a `rule_outcomes` vector that a date literal replays */
interface OutcomeVector {
  condition: { operator: string; date?: string; years?: number; amount?: number; unit?: string };
  description: string;
  kind: string;
  outcome: string;
  target: { part: string | null; licence_class: string | null };
  today: string;
  value: unknown;
}

const DATE_OUTCOMES = (vectors.rule_outcomes as OutcomeVector[]).filter(
  (vector) => vector.kind === 'date' && vector.outcome !== 'not_checked'
);

/** "Personal ID – Date of birth", the field of the edge cases */
const BIRTH: Variable = { key: 'pid.birthdate', kind: 'date', multiple: false, values: [] };

/** The day of the edge cases */
const TODAY = dayNumber('2026-10-28');

/** The range of the questions that hold on every day from today on (research R4) */
const FROM_TODAY: DayRange = { from: TODAY, to: LAST_DAY };

/** Every day the evaluator can read */
const CALENDAR: DayRange = { from: FIRST_DAY, to: LAST_DAY };

function literal(test: DateTest, negated = false): Literal<DateTest> {
  return { variable: BIRTH.key, test, negated };
}

const before = (date: string) => literal({ kind: 'date', op: 'before', date: dayNumber(date) });
const after = (date: string) => literal({ kind: 'date', op: 'after', date: dayNumber(date) });
const on = (date: string) => literal({ kind: 'date', op: 'on', date: dayNumber(date) });
const atLeastYearsAgo = (count: number) =>
  literal({ kind: 'date', op: 'at_least_years_ago', count, unit: 'years' });
const lessThanYearsAgo = (count: number) =>
  literal({ kind: 'date', op: 'less_than_years_ago', count, unit: 'years' });
const exactlyYearsAgo = (count: number) =>
  literal({ kind: 'date', op: 'exactly_years_ago', count, unit: 'years' });
const atLeastFromNow = (count: number, unit: DateUnit) =>
  literal({ kind: 'date', op: 'at_least_from_now', count, unit });
const lessThanFromNow = (count: number, unit: DateUnit) =>
  literal({ kind: 'date', op: 'less_than_from_now', count, unit });

/** The literal's negation: the same test with `negated` flipped */
function not(of: Literal<DateTest>): Literal<DateTest> {
  return { ...of, negated: !of.negated };
}

function meetsAll(literals: readonly Literal<DateTest>[], value: number, day: number): boolean {
  return literals.every((each) => dateHolds(each, value, day));
}

/** The verdict on `day`, once a witness is checked: a date that meets every literal */
function verdictOf(literals: readonly Literal<DateTest>[], day: number): Verdict {
  const answer = decideDate(literals, BIRTH, day);
  if (answer.verdict === 'sat') {
    const { witness } = answer;
    const context = `${isoDate(day)}: ${JSON.stringify(literals)}`;
    expect(witness >= FIRST_DAY && witness <= LAST_DAY, context).toBe(true);
    expect(meetsAll(literals, witness, day), context).toBe(true);
  }
  return answer.verdict;
}

/** The witness on `day` as a date, or null when the literals can't be met */
function witnessOf(literals: readonly Literal<DateTest>[], day: number): string | null {
  const answer = decideDate(literals, BIRTH, day);
  return answer.verdict === 'sat' ? isoDate(answer.witness) : null;
}

/** The days of `feasibleDays()` as pairs of dates, so that a failure reads as dates */
function feasibleDates(literals: readonly Literal<DateTest>[], days: DayRange): string[][] {
  return feasibleDays(literals, days).map((range) => [isoDate(range.from), isoDate(range.to)]);
}

function range(from: string, to: string): DayRange {
  return { from: dayNumber(from), to: dayNumber(to) };
}

/** The days of `days` on which `feasible` holds, as sorted, disjoint, non-adjacent ranges */
function rangesWhere(days: DayRange, feasible: (day: number) => boolean): DayRange[] {
  const result: DayRange[] = [];
  for (let day = days.from; day <= days.to; day += 1) {
    if (!feasible(day)) {
      continue;
    }
    const previous = result[result.length - 1];
    if (previous !== undefined && previous.to === day - 1) {
      previous.to = day;
    } else {
      result.push({ from: day, to: day });
    }
  }
  return result;
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

describe('decideDate, on one day', () => {
  it('meets no literals with the calendar’s first day', () => {
    expect(decideDate([], BIRTH, TODAY)).toEqual({ verdict: 'sat', witness: FIRST_DAY });
  });

  it('can’t meet "before 1 Jan 2030" and "after 31 Dec 2029" together (EC "Adjacent dates")', () => {
    expect(verdictOf([before('2030-01-01'), after('2029-12-31')], TODAY)).toBe('unsat');
    expect(feasibleDays([before('2030-01-01'), after('2029-12-31')], CALENDAR)).toEqual([]);
    expect(witnessOf([before('2030-01-01'), after('2029-12-30')], TODAY)).toBe('2029-12-31');
  });

  it('compares with a fixed date strictly', () => {
    expect(witnessOf([after('2029-12-31')], TODAY)).toBe('2030-01-01');
    expect(witnessOf([on('2030-01-01')], TODAY)).toBe('2030-01-01');
    expect(verdictOf([on('2030-01-01'), before('2030-01-01')], TODAY)).toBe('unsat');
    expect(verdictOf([on('2030-01-01'), after('2030-01-01')], TODAY)).toBe('unsat');
    expect(verdictOf([before('0001-01-01')], TODAY)).toBe('unsat');
    expect(verdictOf([after('9999-12-31')], TODAY)).toBe('unsat');
  });

  it('counts "years ago" with the thresholds L_N of the day of sharing', () => {
    // 18 today: born on or before 2008-10-28
    expect(witnessOf([atLeastYearsAgo(18), after('2008-10-27')], TODAY)).toBe('2008-10-28');
    expect(verdictOf([atLeastYearsAgo(18), after('2008-10-28')], TODAY)).toBe('unsat');
    expect(witnessOf([lessThanYearsAgo(18)], TODAY)).toBe('2008-10-29');
    // Exactly 21: born from 2004-10-29 to 2005-10-28
    expect(witnessOf([exactlyYearsAgo(21)], TODAY)).toBe('2004-10-29');
    expect(verdictOf([exactlyYearsAgo(21), after('2005-10-28')], TODAY)).toBe('unsat');
    expect(verdictOf([exactlyYearsAgo(21), before('2004-10-29')], TODAY)).toBe('unsat');
  });

  it('counts "from now" from the day of sharing, in years or months', () => {
    expect(witnessOf([atLeastFromNow(6, 'months')], TODAY)).toBe('2027-04-28');
    expect(verdictOf([atLeastFromNow(6, 'months'), before('2027-04-28')], TODAY)).toBe('unsat');
    expect(witnessOf([not(lessThanFromNow(1, 'years'))], TODAY)).toBe('2027-10-28');
    // A month from 31 January is 1 March
    const january31 = dayNumber('2026-01-31');
    expect(witnessOf([atLeastFromNow(1, 'months')], january31)).toBe('2026-03-01');
  });

  it('can’t meet a literal together with its negation', () => {
    const each = [
      before('2030-01-01'),
      after('2030-01-01'),
      on('2030-01-01'),
      atLeastYearsAgo(18),
      lessThanYearsAgo(18),
      exactlyYearsAgo(21),
      atLeastFromNow(6, 'months'),
      lessThanFromNow(1, 'years'),
    ];
    for (const test of each) {
      expect(verdictOf([test, not(test)], TODAY), JSON.stringify(test)).toBe('unsat');
      expect(feasibleDays([test, not(test)], CALENDAR), JSON.stringify(test)).toEqual([]);
    }
  });

  it('moves past the holes of negated literals, in any order', () => {
    const literals = [
      after('2029-12-31'),
      not(on('2030-01-02')),
      not(on('2030-01-01')),
      not(exactlyYearsAgo(1)),
    ];
    // Today, the holes are 2030-01-01, 2030-01-02, and 2024-10-29 to 2025-10-28 (exactly 1 year)
    expect(witnessOf(literals, TODAY)).toBe('2030-01-03');
    expect(verdictOf([...literals, before('2030-01-03')], TODAY)).toBe('unsat');
    // On 2031-01-02, exactly 1 year ago runs from 2029-01-03 to 2030-01-02, over the other holes
    expect(witnessOf(literals, dayNumber('2031-01-02'))).toBe('2030-01-03');
    expect(witnessOf(literals, dayNumber('2031-01-05'))).toBe('2030-01-06');
  });

  it('is the solver’s date theory', () => {
    const literals = [after('2010-01-01'), atLeastYearsAgo(21)];
    expect(dateTheory.decide(literals, BIRTH, TODAY)).toEqual({ verdict: 'unsat' });
    const later = dayNumber('2031-01-02');
    expect(dateTheory.decide(literals, BIRTH, later)).toEqual({
      verdict: 'sat',
      witness: dayNumber('2010-01-02'),
    });
    expect(dateTheory.holds(atLeastYearsAgo(21), dayNumber('2010-01-02'), later)).toBe(true);
    expect(dateTheory.holds(atLeastYearsAgo(21), dayNumber('2010-01-02'), later - 1)).toBe(false);
  });
});

describe('feasibleDays, over a range of days', () => {
  it('answers every day or none without a test counted from the day of sharing', () => {
    expect(feasibleDays([before('2030-01-01')], FROM_TODAY)).toEqual([FROM_TODAY]);
    expect(feasibleDays([before('2030-01-01'), after('2029-12-31')], FROM_TODAY)).toEqual([]);
    expect(feasibleDays([], FROM_TODAY)).toEqual([FROM_TODAY]);
  });

  it('answers nothing for an empty range', () => {
    expect(feasibleDays([], { from: TODAY, to: TODAY - 1 })).toEqual([]);
    expect(feasibleDays([atLeastYearsAgo(18)], { from: TODAY, to: TODAY - 1 })).toEqual([]);
  });

  it('holds "at least 12 months from now" and "at least 1 year from now" for the same dates', () => {
    const months = atLeastFromNow(12, 'months');
    const year = atLeastFromNow(1, 'years');
    for (const days of [FROM_TODAY, CALENDAR]) {
      expect(feasibleDays([months, not(year)], days)).toEqual([]);
      expect(feasibleDays([not(months), year], days)).toEqual([]);
    }
    // Unlike 13 months, which differ from 1 year until both reach 9999-12-31
    const thirteen = atLeastFromNow(13, 'months');
    expect(feasibleDates([not(thirteen), year], FROM_TODAY)).toEqual([
      ['2026-10-28', '9998-12-30'],
    ]);
    expect(feasibleDays([thirteen, not(year)], FROM_TODAY)).toEqual([]);
  });

  it('holds "less than 24 months from now" and "less than 2 years from now" alike', () => {
    const months = lessThanFromNow(24, 'months');
    const years = lessThanFromNow(2, 'years');
    expect(feasibleDays([months, not(years)], CALENDAR)).toEqual([]);
    expect(feasibleDays([not(months), years], CALENDAR)).toEqual([]);
  });

  it('lets "exactly 21 years old" imply "at least 18 years old" (EC "Years and months")', () => {
    expect(feasibleDays([exactlyYearsAgo(21), not(atLeastYearsAgo(18))], FROM_TODAY)).toEqual([]);
    expect(feasibleDays([exactlyYearsAgo(21), not(atLeastYearsAgo(18))], CALENDAR)).toEqual([]);
    // Not the other way round
    expect(verdictOf([atLeastYearsAgo(18), not(exactlyYearsAgo(21))], TODAY)).toBe('sat');
  });

  it('meets "after 1 Jan 2010" and "at least 21 years old" from 2 Jan 2031 on (EC-7)', () => {
    const literals = [after('2010-01-01'), atLeastYearsAgo(21)];
    expect(verdictOf(literals, TODAY)).toBe('unsat');
    expect(verdictOf(literals, dayNumber('2031-01-01'))).toBe('unsat');
    expect(witnessOf(literals, dayNumber('2031-01-02'))).toBe('2010-01-02');
    expect(feasibleDates(literals, FROM_TODAY)).toEqual([['2031-01-02', '9999-12-31']]);
    expect(feasibleDays(literals, { from: TODAY, to: TODAY })).toEqual([]);
  });

  it('meets "at least 18 years old" without "before 1 Jan 2010" from 1 Jan 2028 on', () => {
    // Whether "before 1 Jan 2010" adds nothing to "at least 18 years old" (EC-7's second case)
    const literals = [atLeastYearsAgo(18), not(before('2010-01-01'))];
    expect(verdictOf(literals, TODAY)).toBe('unsat');
    expect(verdictOf(literals, dayNumber('2027-12-31'))).toBe('unsat');
    expect(witnessOf(literals, dayNumber('2028-01-01'))).toBe('2010-01-01');
    expect(feasibleDates(literals, FROM_TODAY)).toEqual([['2028-01-01', '9999-12-31']]);
  });

  it('cuts a range where a "from now" threshold passes a fixed date, on either side', () => {
    // At least 6 months from now and before 1 Jan 2030: while 6 months from now is in 2029
    const sixMonths = [atLeastFromNow(6, 'months'), before('2030-01-01')];
    expect(feasibleDates(sixMonths, FROM_TODAY)).toEqual([['2026-10-28', '2029-06-30']]);
    // Less than 1 month from now and after 1 Jan 2030: once a month from now is after 2030-01-02
    const oneMonth = [lessThanFromNow(1, 'months'), after('2030-01-01')];
    expect(feasibleDates(oneMonth, FROM_TODAY)).toEqual([['2029-12-03', '9999-12-31']]);
  });

  it('keeps the day of sharing’s range: its ends and pieces', () => {
    const literals = [after('2010-01-01'), atLeastYearsAgo(21)];
    expect(feasibleDates(literals, range('2031-01-01', '2031-01-03'))).toEqual([
      ['2031-01-02', '2031-01-03'],
    ]);
    expect(feasibleDates(literals, range('2031-01-02', '2031-01-02'))).toEqual([
      ['2031-01-02', '2031-01-02'],
    ]);
    // Exactly 18 years old and born in 2010: born after L_19(d), up to L_18(d)
    const born2010 = [exactlyYearsAgo(18), after('2009-12-31'), before('2011-01-01')];
    expect(feasibleDates(born2010, FROM_TODAY)).toEqual([['2028-01-01', '2029-12-30']]);
    const bornBefore2010 = [exactlyYearsAgo(18), before('2010-01-01')];
    expect(feasibleDates(bornBefore2010, FROM_TODAY)).toEqual([['2026-10-28', '2028-12-30']]);
    // Two pieces: not exactly 1 year old, born from 1 to 10 Jan 2030. The hole covers those
    // days from 2031-01-10 to 2031-12-31, and on 9999-12-31 nobody is exactly 1 year old
    const twoPieces = [not(exactlyYearsAgo(1)), after('2029-12-31'), before('2030-01-11')];
    expect(feasibleDates(twoPieces, FROM_TODAY)).toEqual([
      ['2026-10-28', '2031-01-09'],
      ['2032-01-01', '9999-12-31'],
    ]);
  });

  describe('the calendar’s first years, where no date is yet N years old', () => {
    it('can’t meet "at least 1 year ago" before 0002-01-01', () => {
      expect(verdictOf([atLeastYearsAgo(1)], dayNumber('0001-12-31'))).toBe('unsat');
      expect(witnessOf([atLeastYearsAgo(1)], dayNumber('0002-01-01'))).toBe('0001-01-01');
      expect(feasibleDates([atLeastYearsAgo(1)], range('0001-01-01', '0003-01-01'))).toEqual([
        ['0002-01-01', '0003-01-01'],
      ]);
    });

    it('meets "less than N years ago" with every date while no date is N years old', () => {
      expect(verdictOf([not(lessThanYearsAgo(2))], dayNumber('0002-12-31'))).toBe('unsat');
      expect(witnessOf([not(lessThanYearsAgo(2))], dayNumber('0003-01-01'))).toBe('0001-01-01');
      expect(feasibleDates([lessThanYearsAgo(2), on('0001-01-01')], CALENDAR)).toEqual([
        ['0001-01-01', '0002-12-31'],
      ]);
    });
  });

  describe('the calendar’s last day, 9999-12-31', () => {
    const last = LAST_DAY;

    it('meets "at least N years ago" with every date, and "less than" or "exactly" with none', () => {
      expect(witnessOf([atLeastYearsAgo(1), on('9999-12-31')], last)).toBe('9999-12-31');
      expect(witnessOf([atLeastYearsAgo(5000), after('9999-12-30')], last)).toBe('9999-12-31');
      expect(verdictOf([lessThanYearsAgo(1)], last)).toBe('unsat');
      expect(verdictOf([exactlyYearsAgo(1)], last)).toBe('unsat');
      expect(verdictOf([not(atLeastYearsAgo(3))], last)).toBe('unsat');
      expect(witnessOf([not(exactlyYearsAgo(3))], last)).toBe('0001-01-01');
    });

    it('is a piece of its own', () => {
      const days = range('9999-01-01', '9999-12-31');
      expect(feasibleDates([lessThanYearsAgo(1)], days)).toEqual([['9999-01-01', '9999-12-30']]);
      expect(feasibleDates([exactlyYearsAgo(2)], days)).toEqual([['9999-01-01', '9999-12-30']]);
      expect(feasibleDates([atLeastYearsAgo(1), after('9999-06-01')], days)).toEqual([
        ['9999-12-31', '9999-12-31'],
      ]);
      // From 9999-12-30 on, a date after 9998-12-29 can be a year old
      expect(feasibleDates([atLeastYearsAgo(1), after('9998-12-29')], days)).toEqual([
        ['9999-12-30', '9999-12-31'],
      ]);
    });

    it('takes "from now" beyond the calendar for its last day', () => {
      // A year from now is 9999-12-31 from 9998-12-31 on, and nothing comes before it
      const yearAhead = [atLeastFromNow(1, 'years'), before('9999-12-31')];
      expect(feasibleDates(yearAhead, range('9998-01-01', '9999-12-31'))).toEqual([
        ['9998-01-01', '9998-12-30'],
      ]);
      expect(feasibleDays([lessThanFromNow(1, 'months'), after('9999-12-30')], CALENDAR)).toEqual(
        []
      );
      expect(witnessOf([atLeastFromNow(8000, 'years')], TODAY)).toBe('9999-12-31');
      expect(witnessOf([not(atLeastFromNow(8000, 'years')), after('9999-12-29')], TODAY)).toBe(
        '9999-12-30'
      );
    });

    it('lets two "from now" thresholds meet once the smaller reaches 9999-12-31', () => {
      // 1 and 2 months from now: between them until 1 month from now is 9999-12-31
      const between = [atLeastFromNow(1, 'months'), lessThanFromNow(2, 'months')];
      expect(feasibleDates(between, range('9999-09-01', '9999-12-31'))).toEqual([
        ['9999-09-01', '9999-11-30'],
      ]);
      // Before a year from now, but at least 13 months from now: never
      const apart = [not(atLeastFromNow(1, 'years')), atLeastFromNow(13, 'months')];
      expect(feasibleDays(apart, CALENDAR)).toEqual([]);
    });
  });
});

/**
 * Days of sharing and the counts of the tests counted from them, for the seeded comparisons:
 * around today, around a 29 February, and at both ends of the calendar, where the thresholds
 * start at 0 or end at 9999-12-31
 */
interface Window {
  name: string;
  days: DayRange;
  /** Counts of "years ago" */
  years: number[];
  /** Counts of "from now" */
  ahead: { count: number; unit: DateUnit }[];
}

const AHEAD: Window['ahead'] = [
  { count: 1, unit: 'months' },
  { count: 2, unit: 'months' },
  { count: 12, unit: 'months' },
  { count: 13, unit: 'months' },
  { count: 1, unit: 'years' },
];

const FIXED_OPS: FixedDateOp[] = ['before', 'after', 'on'];
const YEARS_AGO_OPS: YearsAgoOp[] = [
  'at_least_years_ago',
  'less_than_years_ago',
  'exactly_years_ago',
];
const FROM_NOW_OPS: FromNowOp[] = ['at_least_from_now', 'less_than_from_now'];

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** A test counted from the day of sharing, with one of the window's counts */
function randomRelative(random: () => number, window: Window): RelativeDateTest {
  if (random() * (window.years.length + window.ahead.length) < window.years.length) {
    const count = pick(random, window.years);
    return { kind: 'date', op: pick(random, YEARS_AGO_OPS), count, unit: 'years' };
  }
  return { kind: 'date', op: pick(random, FROM_NOW_OPS), ...pick(random, window.ahead) };
}

/** A threshold of the test on `day`: L_N(d), for "exactly" also L_{N+1}(d), or A(d) */
function someThreshold(random: () => number, test: RelativeDateTest, day: number): number {
  switch (test.op) {
    case 'at_least_years_ago':
    case 'less_than_years_ago':
      return yearsAgoThreshold(day, test.count);
    case 'exactly_years_ago':
      return yearsAgoThreshold(day, test.count + Math.floor(random() * 2));
    case 'at_least_from_now':
    case 'less_than_from_now':
      return test.unit === 'years' ? yearsAfter(day, test.count) : monthsAfter(day, test.count);
  }
}

/** A day of the window */
function someDay(random: () => number, window: Window): number {
  return window.days.from + Math.floor(random() * (window.days.to - window.days.from + 1));
}

/** A day number within a day of `date`, within the calendar */
function near(random: () => number, date: number): number {
  return Math.min(LAST_DAY, Math.max(FIRST_DAY, date + Math.floor(random() * 3) - 1));
}

/**
 * Not exactly N years ago, but within a band of fixed dates that the hole passes within the
 * window, so that the literals can be met before and after it: an answer in several pieces
 */
function randomBand(random: () => number, window: Window): Literal<DateTest>[] {
  const count = pick(random, window.years);
  const low = near(random, yearsAgoThreshold(someDay(random, window), count + 1));
  const high = near(random, yearsAgoThreshold(someDay(random, window), count) + 1);
  return [
    literal({ kind: 'date', op: 'exactly_years_ago', count, unit: 'years' }, true),
    literal({ kind: 'date', op: 'after', date: low }),
    literal({ kind: 'date', op: 'before', date: high }),
  ];
}

/**
 * Mostly one or two tests counted from the day of sharing, with the window's counts, and one to
 * three fixed dates, each within a day of one of their thresholds on some day of the window, so
 * that the thresholds pass them within it. Each literal is negated with a chance of 0.3. One set
 * in five is a band (`randomBand()`) instead
 */
function randomLiterals(random: () => number, window: Window): Literal<DateTest>[] {
  if (random() < 0.2) {
    return randomBand(random, window);
  }
  const relativeCount = random() < 0.1 ? 0 : 1 + Math.floor(random() * 2);
  const relative = Array.from({ length: relativeCount }, () => randomRelative(random, window));
  const fixed = Array.from({ length: 1 + Math.floor(random() * 3) }, (): FixedDateTest => {
    const day = someDay(random, window);
    const threshold =
      relative.length > 0 ? someThreshold(random, pick(random, relative), day) : day;
    return { kind: 'date', op: pick(random, FIXED_OPS), date: near(random, threshold) };
  });
  const tests: DateTest[] = [...relative, ...fixed];
  for (let index = tests.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [tests[index], tests[other]] = [tests[other], tests[index]];
  }
  return tests.map((test) => literal(test, random() < 0.3));
}

/**
 * The dates whose outcomes stand for every date, for an enumeration over `days`. Every literal
 * changes its outcome only at its fixed date and the day after, or at its thresholds: L_N(d) + 1
 * for "years ago" (L_{N+1}(d) + 1 too for "exactly"), as `calendar.test.ts` checks against their
 * definition, and A(d) for "from now", which never decrease as d grows. The dates before the
 * earliest of these, and those from the latest on, each have the same outcomes
 */
function datesToEnumerate(literals: readonly Literal<DateTest>[], days: DayRange): DayRange {
  const changes: number[] = [];
  for (const { test } of literals) {
    switch (test.op) {
      case 'before':
      case 'after':
      case 'on':
        changes.push(test.date, test.date + 1);
        break;
      case 'at_least_years_ago':
      case 'less_than_years_ago':
        changes.push(
          yearsAgoThreshold(days.from, test.count) + 1,
          yearsAgoThreshold(days.to, test.count) + 1
        );
        break;
      case 'exactly_years_ago':
        changes.push(
          yearsAgoThreshold(days.from, test.count + 1) + 1,
          yearsAgoThreshold(days.to, test.count) + 1
        );
        break;
      case 'at_least_from_now':
      case 'less_than_from_now': {
        const ahead = test.unit === 'years' ? yearsAfter : monthsAfter;
        changes.push(ahead(days.from, test.count), ahead(days.to, test.count));
        break;
      }
    }
  }
  if (changes.length === 0) {
    return { from: FIRST_DAY, to: FIRST_DAY };
  }
  return {
    from: Math.max(FIRST_DAY, Math.min(...changes) - 1),
    to: Math.min(LAST_DAY, Math.max(...changes)),
  };
}

/** Whether a date meets every literal on `day`, found by trying each date of `dates` */
function metByEnumeration(
  literals: readonly Literal<DateTest>[],
  day: number,
  dates: DayRange
): boolean {
  for (let value = dates.from; value <= dates.to; value += 1) {
    if (meetsAll(literals, value, day)) {
      return true;
    }
  }
  return false;
}

/** Windows of up to two months, for the enumeration of every day and every date */
const SMALL_WINDOWS: Window[] = [
  { name: 'today', days: range('2026-10-28', '2026-12-28'), years: [1, 2], ahead: AHEAD },
  { name: '29 February', days: range('2028-01-25', '2028-03-05'), years: [1, 4], ahead: AHEAD },
  { name: 'the first years', days: range('0001-12-01', '0002-01-31'), years: [1, 2], ahead: AHEAD },
  { name: 'the last year', days: range('9998-11-15', '9999-01-15'), years: [1], ahead: AHEAD },
  { name: 'the last days', days: range('9999-11-01', '9999-12-31'), years: [1, 2], ahead: AHEAD },
];

/** Windows of years, for the comparison of the pieces with a decision on each day */
const LARGE_WINDOWS: Window[] = [
  { name: 'today', days: range('2026-10-28', '2029-03-31'), years: [1, 2, 18], ahead: AHEAD },
  { name: 'the first years', days: range('0001-01-01', '0004-03-31'), years: [1, 2], ahead: AHEAD },
  { name: 'the last years', days: range('9997-01-01', '9999-12-31'), years: [1, 2], ahead: AHEAD },
];

describe('seeded literal sets, against the evaluator’s comparisons', () => {
  it.each(SMALL_WINDOWS)('equal an enumeration of every day and every date: $name', (window) => {
    const random = seeded(window.days.from);
    for (let run = 0; run < 60; run += 1) {
      const literals = randomLiterals(random, window);
      const dates = datesToEnumerate(literals, window.days);
      const expected = rangesWhere(window.days, (day) => metByEnumeration(literals, day, dates));
      const context = `run ${run}: ${JSON.stringify(literals)}`;
      expect(feasibleDays(literals, window.days), context).toEqual(expected);
    }
  });

  it.each(LARGE_WINDOWS)(
    'equal a decision on every day of the range, and of a part of it: $name',
    (window) => {
      const random = seeded(window.days.to);
      const { from, to } = window.days;
      for (let run = 0; run < 150; run += 1) {
        const literals = randomLiterals(random, window);
        const context = `run ${run}: ${JSON.stringify(literals)}`;
        // The decision of each day, with the days whose witness doesn't meet every literal
        const feasible = new Map<number, boolean>();
        const wrongWitnesses: string[] = [];
        for (let day = from; day <= to; day += 1) {
          const answer = decideDate(literals, BIRTH, day);
          feasible.set(day, answer.verdict === 'sat');
          if (answer.verdict === 'sat' && !meetsAll(literals, answer.witness, day)) {
            wrongWitnesses.push(isoDate(day));
          }
        }
        expect(wrongWitnesses, context).toEqual([]);
        expect(feasibleDays(literals, window.days), context).toEqual(
          rangesWhere(window.days, (day) => feasible.get(day) === true)
        );
        const start = from + Math.floor(random() * (to - from + 1));
        const part = { from: start, to: start + Math.floor(random() * (to - start + 1)) };
        expect(feasibleDays(literals, part), `${context}, ${JSON.stringify(part)}`).toEqual(
          rangesWhere(part, (day) => feasible.get(day) === true)
        );
      }
    }
  );
});

describe('isRelativeDateTest', () => {
  it('tells the tests counted from the day of sharing', () => {
    expect(isRelativeDateTest(before('2030-01-01').test)).toBe(false);
    expect(isRelativeDateTest(on('2030-01-01').test)).toBe(false);
    expect(isRelativeDateTest(after('2030-01-01').test)).toBe(false);
    expect(isRelativeDateTest(atLeastYearsAgo(18).test)).toBe(true);
    expect(isRelativeDateTest(exactlyYearsAgo(18).test)).toBe(true);
    expect(isRelativeDateTest(lessThanFromNow(1, 'months').test)).toBe(true);
  });
});

/** A whole number of a vector's condition */
function countOf(value: number | undefined): number {
  if (value === undefined) {
    throw new Error('A condition without its count');
  }
  return value;
}

/** The vector's condition as a literal's test, as `literals.ts` maps it */
function testOf(condition: OutcomeVector['condition']): DateTest {
  const { operator } = condition;
  switch (operator) {
    case 'before':
    case 'after':
    case 'on':
      return { kind: 'date', op: operator, date: dayNumber(condition.date ?? '') };
    case 'at_least_years_ago':
    case 'less_than_years_ago':
    case 'exactly_years_ago':
      return { kind: 'date', op: operator, count: countOf(condition.years), unit: 'years' };
    case 'at_least_from_now':
    case 'less_than_from_now':
      if (condition.unit !== 'years' && condition.unit !== 'months') {
        throw new Error(`Not a unit: ${String(condition.unit)}`);
      }
      return { kind: 'date', op: operator, count: countOf(condition.amount), unit: condition.unit };
  }
  throw new Error(`Not a date operator: ${operator}`);
}

/**
 * The date the rule reads (`_value_of()`), or null for a licence class that isn't held. A class's
 * rule is `held(K) ∧ c(date_K)`, and `literals.ts` adds `held(K)` (T016), so the date theory only
 * sees the dates of held classes. The vectors' class codes are ASCII, where Python's `strip()`
 * and `casefold()` are `trim()` and `toLowerCase()`
 */
function deliveredDate(vector: OutcomeVector): number | null {
  const { part, licence_class: licenceClass } = vector.target;
  if (licenceClass === null || part === null) {
    return dayNumber(String(vector.value));
  }
  const wanted = licenceClass.trim().toLowerCase();
  const entry = (vector.value as Record<string, unknown>[]).find(
    (each) => String(each.vehicle_category_code).trim().toLowerCase() === wanted
  );
  return entry === undefined ? null : dayNumber(String(entry[part]));
}

describe('dateHolds, the membership test', () => {
  it('has date vectors to replay, of held and of not held classes', () => {
    expect(DATE_OUTCOMES.length).toBeGreaterThan(0);
    expect(DATE_OUTCOMES.some((vector) => deliveredDate(vector) === null)).toBe(true);
  });

  it.each(DATE_OUTCOMES)('agrees with the evaluator: $description', (vector) => {
    const value = deliveredDate(vector);
    if (value === null) {
      // `held(K)` fails, whatever the condition
      expect(vector.outcome).toBe('not_met');
      return;
    }
    const test = literal(testOf(vector.condition));
    const today = dayNumber(vector.today);
    expect(dateHolds(test, value, today)).toBe(vector.outcome === 'met');
    expect(dateHolds(not(test), value, today)).toBe(vector.outcome !== 'met');
    // And the theory's sets of one day agree with it
    expect(verdictOf([test, on(isoDate(value))], today)).toBe(
      vector.outcome === 'met' ? 'sat' : 'unsat'
    );
    expect(verdictOf([not(test), on(isoDate(value))], today)).toBe(
      vector.outcome === 'met' ? 'unsat' : 'sat'
    );
  });
});
