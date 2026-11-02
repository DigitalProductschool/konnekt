import { describe, expect, it } from 'vitest';

import {
  dayNumber,
  isDayNumber,
  isoDate,
  monthsAfter,
  parseDayNumber,
  yearsAfter,
  yearsAgoThreshold,
} from './calendar';
import { FIRST_DATE, FIRST_DAY, LAST_DATE, LAST_DAY } from './constants';
import vectors from './fixtures/evaluator-vectors.json';

/** A `day_numbers` vector: Python's `date.toordinal()` of `day` */
interface DayNumberVector {
  day: string;
  description: string;
  number: number;
}

/** A `years_after` vector: Python's `years_after(day, years)` */
interface YearsAfterVector {
  day: string;
  description: string;
  result: string;
  years: number;
}

/** A `months_after` vector: Python's `months_after(day, months)` */
interface MonthsAfterVector {
  day: string;
  description: string;
  months: number;
  result: string;
}

/** The part of a `rule_outcomes` vector that the years-ago thresholds can replay */
interface OutcomeVector {
  condition: { operator: string; years?: number };
  description: string;
  kind: string;
  outcome: string;
  today: string;
  value: unknown;
}

const DAY_NUMBERS = vectors.day_numbers as DayNumberVector[];
const YEARS_AFTER = vectors.years_after as YearsAfterVector[];
const MONTHS_AFTER = vectors.months_after as MonthsAfterVector[];
const OUTCOMES = vectors.rule_outcomes as OutcomeVector[];

/** The counts of research R6's measurement */
const MEASURED_YEARS = [1, 2, 21];

/** Every day number from `from` to `to`, both included */
function days(from: string, to: string): number[] {
  const result: number[] = [];
  const last = dayNumber(to);
  for (let day = dayNumber(from); day <= last; day += 1) {
    result.push(day);
  }
  return result;
}

/** Every `step`-th day of the calendar from its first day, and its last day */
function everyNthDay(step: number): number[] {
  const result: number[] = [];
  for (let day = FIRST_DAY; day < LAST_DAY; day += step) {
    result.push(day);
  }
  return [...result, LAST_DAY];
}

/** Days in ascending order, each once */
function sorted(...samples: number[][]): number[] {
  return [...new Set(samples.flat())].sort((a, b) => a - b);
}

/**
 * The sample of research R6's measurement: whole stretches around leap days, month ends, the
 * calendar's first years and its last 23 years, where the clamp starts for N = 21, and a day every
 * 997 days in between
 */
const SAMPLE = sorted(
  days(FIRST_DATE, '0003-12-31'),
  days('0099-12-01', '0100-03-31'),
  days('1899-12-01', '1900-03-31'),
  days('1999-12-01', '2000-03-31'),
  days('2023-12-01', '2024-03-31'),
  days('2026-01-01', '2026-12-31'),
  days('2099-12-01', '2100-03-31'),
  days('9976-12-01', LAST_DATE),
  everyNthDay(997)
);

/**
 * Days for the brute-force threshold: where the first date becomes 1, 2, 18 and 21 years old,
 * around 29 February, the calendar's last days, and a sparse stride
 */
const THRESHOLD_SAMPLE = sorted(
  days(FIRST_DATE, '0001-01-03'),
  days('0001-12-30', '0002-01-02'),
  days('0002-12-30', '0003-01-02'),
  days('0018-12-30', '0019-01-02'),
  days('0021-12-30', '0022-01-02'),
  days('2024-02-26', '2024-03-02'),
  days('2026-02-26', '2026-03-02'),
  days('2028-02-26', '2028-03-02'),
  days('2100-02-26', '2100-03-02'),
  days('9998-12-29', '9999-01-02'),
  days('9999-12-28', LAST_DATE),
  everyNthDay(99991)
);

/**
 * L_N(d) by its definition: the latest date whose N-th anniversary falls on or before d, or 0.
 * An anniversary is never before its date (checked below), so no date after d qualifies
 */
function thresholdByDefinition(day: number, years: number): number {
  for (let date = day; date >= FIRST_DAY; date -= 1) {
    if (yearsAfter(date, years) <= day) {
      return date;
    }
  }
  return FIRST_DAY - 1;
}

/** The day number of a date by JavaScript's own proleptic Gregorian calendar */
function dayNumberByDate(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const moment = new Date(0);
  // setUTCFullYear, unlike Date.UTC, reads the years 0 to 99 as they are
  moment.setUTCFullYear(year, month - 1, day);
  return moment.getTime() / 86_400_000 + dayNumber('1970-01-01');
}

/** The days of `sample` on which `holds` fails, as dates, so that a failure names them */
function failures(sample: number[], holds: (day: number) => boolean): string[] {
  return sample.filter((day) => !holds(day)).map(isoDate);
}

describe('day numbers', () => {
  it.each(DAY_NUMBERS)('$day is $number ($description)', ({ day, number }) => {
    expect(dayNumber(day)).toBe(number);
    expect(isoDate(number)).toBe(day);
  });

  it('runs from FIRST_DAY to LAST_DAY', () => {
    expect(dayNumber(FIRST_DATE)).toBe(FIRST_DAY);
    expect(dayNumber(LAST_DATE)).toBe(LAST_DAY);
  });

  it('has as many numbers as the calendar has dates', () => {
    // The days of the years 1 to 9999
    expect(LAST_DAY).toBe(
      9999 * 365 + Math.floor(9999 / 4) - Math.floor(9999 / 100) + Math.floor(9999 / 400)
    );
  });

  it("agrees with JavaScript's calendar on every day of the sample, and back", () => {
    expect(
      failures(SAMPLE, (day) => {
        const date = isoDate(day);
        return dayNumber(date) === day && dayNumberByDate(date) === day;
      })
    ).toEqual([]);
  });

  it("follows JavaScript's calendar day by day through a whole 400-year cycle, and back", () => {
    // 1601 to 2000 holds every case of the conversion: each kind of year, and the cycles' ends
    const moment = new Date(0);
    moment.setUTCFullYear(1601, 0, 1);
    const wrong: string[] = [];
    const last = dayNumber('2000-12-31');
    for (let day = dayNumber('1601-01-01'); day <= last; day += 1) {
      const date = isoDate(day);
      // Built by hand, as toISOString() would double the test's time. The years have 4 digits
      const month = moment.getUTCMonth() + 1;
      const dayOfMonth = moment.getUTCDate();
      const expected = `${moment.getUTCFullYear()}-${month < 10 ? '0' : ''}${month}-${
        dayOfMonth < 10 ? '0' : ''
      }${dayOfMonth}`;
      if (date !== expected || dayNumber(date) !== day) {
        wrong.push(date);
      }
      moment.setUTCDate(dayOfMonth + 1);
    }
    expect(wrong).toEqual([]);
  });

  it('reads only dates of the calendar written as YYYY-MM-DD', () => {
    expect(parseDayNumber('2026-10-28')).toBe(739917);
    for (const value of [
      '2026-02-29',
      '2026-02-30',
      '2026-04-31',
      '2026-13-01',
      '2026-00-10',
      '2026-10-00',
      '0000-12-31',
      '10000-01-01',
      '2026-1-28',
      ' 2026-10-28',
      '2026-10-28T00:00:00Z',
      '',
      739917,
      null,
    ]) {
      expect(parseDayNumber(value)).toBeNull();
    }
    expect(() => dayNumber('2026-02-29')).toThrow(RangeError);
  });

  it('turns only day numbers into dates', () => {
    expect(isDayNumber(FIRST_DAY)).toBe(true);
    expect(isDayNumber(LAST_DAY)).toBe(true);
    for (const value of [0, LAST_DAY + 1, 1.5, Number.NaN, '1']) {
      expect(isDayNumber(value)).toBe(false);
    }
    expect(() => isoDate(0)).toThrow(RangeError);
    expect(() => isoDate(LAST_DAY + 1)).toThrow(RangeError);
  });
});

describe("the evaluator's arithmetic", () => {
  it.each(YEARS_AFTER)(
    '$years years after $day is $result ($description)',
    ({ day, years, result }) => {
      expect(isoDate(yearsAfter(dayNumber(day), years))).toBe(result);
    }
  );

  it.each(MONTHS_AFTER)(
    '$months months after $day is $result ($description)',
    ({ day, months, result }) => {
      expect(isoDate(monthsAfter(dayNumber(day), months))).toBe(result);
    }
  );

  it.each(MEASURED_YEARS)(
    '12 × N months are N years on every day of the sample, N = %i',
    (years) => {
      expect(
        failures(SAMPLE, (day) => monthsAfter(day, 12 * years) === yearsAfter(day, years))
      ).toEqual([]);
    }
  );

  it.each(MEASURED_YEARS)('%i years after a day never decrease as the day grows', (years) => {
    const decreases = SAMPLE.slice(1).filter(
      (day, index) => yearsAfter(SAMPLE[index], years) > yearsAfter(day, years)
    );
    expect(decreases.map(isoDate)).toEqual([]);
  });

  it.each([1, ...MEASURED_YEARS.map((years) => 12 * years)])(
    '%i months after a day never decrease as the day grows',
    (months) => {
      const decreases = SAMPLE.slice(1).filter(
        (day, index) => monthsAfter(SAMPLE[index], months) > monthsAfter(day, months)
      );
      expect(decreases.map(isoDate)).toEqual([]);
    }
  );

  it('never counts to a day before the day it starts from', () => {
    expect(
      failures(SAMPLE, (day) =>
        [0, 1, 2, 21].every(
          (count) => yearsAfter(day, count) >= day && monthsAfter(day, count) >= day
        )
      )
    ).toEqual([]);
  });

  it('counts 0 years or months as the day itself', () => {
    expect(failures(SAMPLE, (day) => yearsAfter(day, 0) === day)).toEqual([]);
    expect(failures(SAMPLE, (day) => monthsAfter(day, 0) === day)).toEqual([]);
  });

  it('takes only day numbers and whole counts from 0', () => {
    expect(() => yearsAfter(0, 1)).toThrow(RangeError);
    expect(() => yearsAfter(LAST_DAY + 1, 1)).toThrow(RangeError);
    expect(() => yearsAfter(FIRST_DAY, -1)).toThrow(RangeError);
    expect(() => monthsAfter(FIRST_DAY, 1.5)).toThrow(RangeError);
    expect(() => yearsAgoThreshold(FIRST_DAY, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('L_N, the threshold of "N years ago"', () => {
  it.each([1, 2, 18, 21])(
    'is the latest date whose N-th anniversary falls on or before the day, N = %i',
    (years) => {
      expect(
        failures(
          THRESHOLD_SAMPLE,
          (day) => yearsAgoThreshold(day, years) === thresholdByDefinition(day, years)
        )
      ).toEqual([]);
    }
  );

  it.each([1, 2, 21])(
    'splits the dates: the N-th anniversary falls on or before the day up to it only, N = %i',
    (years) => {
      // Around the threshold, a date's anniversary is on or before the day exactly when the date
      // is on or before the threshold, as "at least N years ago" decides it
      expect(
        failures(THRESHOLD_SAMPLE, (day) => {
          const threshold = yearsAgoThreshold(day, years);
          const from = Math.max(FIRST_DAY, threshold - 400);
          const to = Math.min(LAST_DAY, threshold + 400);
          for (let date = from; date <= to; date += 1) {
            if (yearsAfter(date, years) <= day !== date <= threshold) {
              return false;
            }
          }
          return true;
        })
      ).toEqual([]);
    }
  );

  it.each(MEASURED_YEARS)('never decreases as the day grows, for %i years', (years) => {
    const decreases = SAMPLE.slice(1).filter(
      (day, index) => yearsAgoThreshold(SAMPLE[index], years) > yearsAgoThreshold(day, years)
    );
    expect(decreases.map(isoDate)).toEqual([]);
  });

  it('is the same day N years earlier, or 28 February for 29 February', () => {
    const threshold = (day: string, years: number) =>
      isoDate(yearsAgoThreshold(dayNumber(day), years));
    expect(threshold('2026-10-28', 18)).toBe('2008-10-28');
    expect(threshold('2026-10-28', 21)).toBe('2005-10-28');
    expect(threshold('2028-02-29', 1)).toBe('2027-02-28');
    expect(threshold('2028-02-29', 4)).toBe('2024-02-29');
    // Someone born on 29 February 2008 is 18 from 1 March 2026 on
    expect(threshold('2026-02-28', 18)).toBe('2008-02-28');
    expect(threshold('2026-03-01', 18)).toBe('2008-03-01');
  });

  it('is 0 while no date is N years old: every date is less than N years ago', () => {
    expect(yearsAgoThreshold(dayNumber('0001-12-31'), 1)).toBe(0);
    expect(isoDate(yearsAgoThreshold(dayNumber('0002-01-01'), 1))).toBe(FIRST_DATE);
    expect(yearsAgoThreshold(dayNumber('0021-12-31'), 21)).toBe(0);
    expect(isoDate(yearsAgoThreshold(dayNumber('0022-01-01'), 21))).toBe(FIRST_DATE);
    expect(yearsAgoThreshold(dayNumber('2026-10-28'), 1_000_000)).toBe(0);
  });

  it("decides the evaluator's years-ago outcomes", () => {
    const yearsAgo = OUTCOMES.filter(
      ({ condition, kind, value }) =>
        kind === 'date' && condition.operator.endsWith('_years_ago') && parseDayNumber(value)
    );
    expect(yearsAgo.length).toBeGreaterThan(10);
    for (const { condition, description, outcome, today, value } of yearsAgo) {
      const date = dayNumber(String(value));
      const years = condition.years ?? 0;
      const threshold = yearsAgoThreshold(dayNumber(today), years);
      const holds: Record<string, boolean> = {
        at_least_years_ago: date <= threshold,
        less_than_years_ago: date > threshold,
        exactly_years_ago:
          yearsAgoThreshold(dayNumber(today), years + 1) < date && date <= threshold,
      };
      expect(holds[condition.operator] ? 'met' : 'not_met', description).toBe(outcome);
    }
  });

  describe('with the clamp at 9999-12-31', () => {
    it('on 9999-12-31, someone born 9999-12-31 is at least 1 year old', () => {
      // The anniversary in 10000 is clamped to 9999-12-31, which falls on or before the day
      expect(yearsAfter(LAST_DAY, 1)).toBe(LAST_DAY);
      expect(yearsAgoThreshold(LAST_DAY, 1)).toBe(LAST_DAY);
    });

    it('on 9999-12-31, every date is at least N years old, for any N', () => {
      for (const years of [0, 1, 2, 21, 7973, 8000, 1_000_000]) {
        expect(yearsAgoThreshold(LAST_DAY, years)).toBe(LAST_DAY);
        expect(thresholdByDefinition(LAST_DAY, years)).toBe(LAST_DAY);
      }
    });

    it('on 9999-12-31, no date is exactly N years old', () => {
      for (const years of [1, 2, 21, 8000]) {
        // L_{N+1} < v ≤ L_N is empty, and the evaluator's own test agrees on every date
        expect(yearsAgoThreshold(LAST_DAY, years + 1)).toBe(yearsAgoThreshold(LAST_DAY, years));
        expect(
          failures(
            SAMPLE,
            (date) =>
              !(yearsAfter(date, years) <= LAST_DAY && LAST_DAY < yearsAfter(date, years + 1))
          )
        ).toEqual([]);
      }
    });

    it('changes nothing before 9999-12-31', () => {
      const dayBefore = dayNumber('9999-12-30');
      expect(isoDate(yearsAgoThreshold(dayBefore, 1))).toBe('9998-12-30');
      // Born on 9999-12-30, the first anniversary is clamped to 9999-12-31: not yet 1 year old
      expect(yearsAfter(dayBefore, 1)).toBe(LAST_DAY);
      expect(dayBefore <= yearsAgoThreshold(dayBefore, 1)).toBe(false);
      // From the year 10000 - N on, the N-th anniversary is 9999-12-31
      expect(isoDate(yearsAgoThreshold(dayBefore, 21))).toBe('9978-12-30');
      expect(yearsAfter(dayNumber('9978-12-31'), 21)).toBe(LAST_DAY);
    });
  });
});
