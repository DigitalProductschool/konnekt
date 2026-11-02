// Day numbers and the evaluator's calendar arithmetic (specs/003-rule-consistency-checks, FR-007;
// research R6). A day number is a proleptic Gregorian ordinal, as Python's `date.toordinal()`
// gives it: 0001-01-01 is 1 (`FIRST_DAY`) and 9999-12-31 is 3652059 (`LAST_DAY`). `yearsAfter()`
// and `monthsAfter()` are `years_after()` and `months_after()` of
// backend/app/services/evaluation.py, the clamp of `_calendar_day()` at 9999 included, which
// dates.ts doesn't do; `yearsAgoThreshold()` is L_N(d), the threshold of "N years ago". Python's
// vectors in fixtures/evaluator-vectors.json pin them (research R13).
//
// Every function is pure and takes constant time, so the date theory can binary-search over days
// with them. Each threshold never decreases as the day grows
import { ISO_DATE_PATTERN } from '../constants';
import { daysInMonth, isLeapYear } from '../dates';
import type { CalendarDate } from '../types';
import { FIRST_DAY, LAST_DAY } from './constants';

/** The calendar's last year, Python's `MAXYEAR` */
const LAST_YEAR = 9999;

/** Days in 400 years, in 100 years whose last isn't a leap year, in 4 years, and in a year */
const DAYS_IN_400_YEARS = 146097;
const DAYS_IN_100_YEARS = 36524;
const DAYS_IN_4_YEARS = 1461;
const DAYS_IN_YEAR = 365;

/** Days before each month (1 to 12) in a year without 29 February; index 0 is unused */
const DAYS_BEFORE_MONTH: readonly number[] = [
  0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334,
];

/** The day number of a date the calendar has: Python's `_ymd2ord()` */
function ordinal(year: number, month: number, day: number): number {
  const yearsBefore = year - 1;
  const leapDay = month > 2 && isLeapYear(year) ? 1 : 0;
  return (
    yearsBefore * DAYS_IN_YEAR +
    Math.floor(yearsBefore / 4) -
    Math.floor(yearsBefore / 100) +
    Math.floor(yearsBefore / 400) +
    DAYS_BEFORE_MONTH[month] +
    leapDay +
    day
  );
}

/** The date of a day number: Python's `_ord2ymd()` */
function dateOf(dayNumber: number): CalendarDate {
  let rest = dayNumber - 1;
  const cycles400 = Math.floor(rest / DAYS_IN_400_YEARS);
  rest -= cycles400 * DAYS_IN_400_YEARS;
  const cycles100 = Math.floor(rest / DAYS_IN_100_YEARS);
  rest -= cycles100 * DAYS_IN_100_YEARS;
  const cycles4 = Math.floor(rest / DAYS_IN_4_YEARS);
  rest -= cycles4 * DAYS_IN_4_YEARS;
  const years = Math.floor(rest / DAYS_IN_YEAR);
  rest -= years * DAYS_IN_YEAR;
  const year = cycles400 * 400 + cycles100 * 100 + cycles4 * 4 + years + 1;
  if (years === 4 || cycles100 === 4) {
    // The last day of a 4-year or a 400-year cycle, a leap year's 366th day
    return { year: year - 1, month: 12, day: 31 };
  }
  // `rest` is now the day of the year, from 0. The estimate is the month or the one after it
  let month = (rest + 50) >> 5;
  let daysBefore = DAYS_BEFORE_MONTH[month] + (month > 2 && isLeapYear(year) ? 1 : 0);
  if (daysBefore > rest) {
    month -= 1;
    daysBefore -= daysInMonth(year, month);
  }
  return { year, month, day: rest - daysBefore + 1 };
}

/**
 * `_calendar_day()`: the day number of `day` in `year` and `month`, the 1st of the next month
 * where the month has no such day, and 9999-12-31 beyond the calendar's last year. The month is
 * never December when it has no such day, since `day` is a day of some month
 */
function calendarDay(year: number, month: number, day: number): number {
  if (year > LAST_YEAR) {
    return LAST_DAY;
  }
  if (day > daysInMonth(year, month)) {
    return ordinal(year, month + 1, 1);
  }
  return ordinal(year, month, day);
}

function requireDay(day: number): void {
  if (!isDayNumber(day)) {
    throw new RangeError(`Not a day number: ${day}`);
  }
}

function requireCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`Not a whole number from 0: ${count}`);
  }
}

/** Whether a value is a day number the evaluator can read: a whole number from 1 to 3652059 */
export function isDayNumber(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= FIRST_DAY && value <= LAST_DAY
  );
}

/**
 * The day number of a date written exactly as `YYYY-MM-DD`, or null when it isn't one or the
 * calendar doesn't have it, such as 2026-02-30 or 0000-01-01. It doesn't trim
 */
export function parseDayNumber(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return ordinal(year, month, day);
}

/**
 * The day number of a `YYYY-MM-DD` date, as Python's `date.toordinal()`: 0001-01-01 is 1. Throws
 * a `RangeError` for anything else, as `parseDayNumber()` would return null
 */
export function dayNumber(date: string): number {
  const day = parseDayNumber(date);
  if (day === null) {
    throw new RangeError(`Not a date: ${date}`);
  }
  return day;
}

/**
 * The date of a day number as `YYYY-MM-DD`, as Python's `date.fromordinal().isoformat()`. Throws
 * a `RangeError` unless `day` is a day number
 */
export function isoDate(day: number): string {
  requireDay(day);
  const { year, month, day: dayOfMonth } = dateOf(day);
  const pad = (value: number, width: number) => String(value).padStart(width, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(dayOfMonth, 2)}`;
}

/**
 * `years_after()`: the `years`-th anniversary of `day`. The same day of the month `years` later,
 * 1 March for 29 February in a year without one, and 9999-12-31 when the year passes 9999.
 *
 * On the day of sharing d, "at least N years from now" holds for the dates v ≥ yearsAfter(d, N)
 * and "less than" for v < yearsAfter(d, N). It never decreases as `day` grows, it is never before
 * `day`, and it equals `monthsAfter(day, 12 * years)`. Throws a `RangeError` unless `day` is a day
 * number and `years` a whole number from 0
 */
export function yearsAfter(day: number, years: number): number {
  requireDay(day);
  requireCount(years);
  const date = dateOf(day);
  return calendarDay(date.year + years, date.month, date.day);
}

/**
 * `months_after()`: the day `months` months after `day`. The same day of the month, the 1st of
 * the following month where that month has no such day (31 January + 1 month is 1 March), and
 * 9999-12-31 when the year passes 9999.
 *
 * On the day of sharing d, "at least N months from now" holds for the dates
 * v ≥ monthsAfter(d, N) and "less than" for v < monthsAfter(d, N). It never decreases as `day`
 * grows. Throws a `RangeError` unless `day` is a day number and `months` a whole number from 0
 */
export function monthsAfter(day: number, months: number): number {
  requireDay(day);
  requireCount(months);
  const date = dateOf(day);
  const index = date.month - 1 + months;
  return calendarDay(date.year + Math.floor(index / 12), (index % 12) + 1, date.day);
}

/**
 * L_N(d), the threshold of "N years ago" (research R6): the latest date whose `years`-th
 * anniversary (`yearsAfter()`) falls on or before `day`, or `FIRST_DAY - 1` (0) when no date's
 * does. Anniversaries never decrease as the date grows, so the dates whose anniversary falls on
 * or before d are exactly those up to L_N(d). On the day of sharing d, as `_date_holds()` decides:
 * - "at least N years ago" holds for v ≤ L_N(d);
 * - "less than N years ago" holds for v > L_N(d);
 * - "exactly N years ago" holds for L_{N+1}(d) < v ≤ L_N(d).
 *
 * Before 9999-12-31 it is the same day of the month N years earlier, or 28 February where that
 * year has no 29 February. The clamp needs no case of its own in the theory, since L_N has it:
 * from the year 10000 - N on, every N-th anniversary is 9999-12-31, which is after every other
 * day, so it changes nothing before 9999-12-31. On 9999-12-31 itself every date's anniversary
 * falls on or before the day, so L_N(9999-12-31) is 9999-12-31 for every N: "at least" holds for
 * every date, "less than" for none, and "exactly" for none (L_{N+1} and L_N are equal). L_N thus
 * jumps on 9999-12-31 (from 9998-12-30 for N = 1) and is equal for every N there, but it never
 * decreases as `day` grows, so a binary search over the days still finds every change. With 0,
 * the interval [`FIRST_DAY`, L_N(d)] is empty and (L_N(d), `LAST_DAY`] is every date.
 *
 * Throws a `RangeError` unless `day` is a day number and `years` a whole number from 0
 */
export function yearsAgoThreshold(day: number, years: number): number {
  requireDay(day);
  requireCount(years);
  if (day === LAST_DAY) {
    return LAST_DAY;
  }
  const date = dateOf(day);
  const year = date.year - years;
  if (year < 1) {
    return FIRST_DAY - 1;
  }
  return ordinal(year, date.month, Math.min(date.day, daysInMonth(year, date.month)));
}
