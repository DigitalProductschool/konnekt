// The calendar arithmetic of the backend's evaluator (research R7, FR-012), for the rule editor's
// example (F4): dates are ISO strings, 'YYYY-MM-DD', counted in whole calendar days
import type { Condition } from '@connection-portal/api-types/form-connections';

import {
  GERMAN_TIME_ZONE,
  ISO_DATE_PATTERN,
  MONTH_ABBREVIATIONS,
  RELATION_WORDS,
} from './constants';
import type { CalendarDate, DateBoundary } from './types';

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parse(value: unknown): CalendarDate | null {
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
  return { year, month, day };
}

function format({ year, month, day }: CalendarDate): string {
  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
}

function required(value: string): CalendarDate {
  const date = parse(value);
  if (!date) {
    throw new RangeError(`Not a date: ${value}`);
  }
  return date;
}

/** Whether a number of years or months is complete: a whole number of at least 1 (FR-003). */
export function isWholeCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/** Whether a value is a date as the API writes it: 'YYYY-MM-DD', and one the calendar has. */
export function isValidIsoDate(value: unknown): value is string {
  return parse(value) !== null;
}

/** A date's day, month or year, at the day; where the month has no such day, the 1st after. */
function dayOrFirstAfter(year: number, month: number, day: number): CalendarDate {
  if (day <= daysInMonth(year, month)) {
    return { year, month, day };
  }
  return month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 };
}

/** The N-th anniversary of a date: the same day N years later, or 1 March for 29 February. */
export function anniversary(date: string, years: number): string {
  const { year, month, day } = required(date);
  return format(dayOrFirstAfter(year + years, month, day));
}

/** N months after a date: the same day of the month, or the 1st of the following month. */
export function addMonths(date: string, months: number): string {
  const { year, month, day } = required(date);
  const index = year * 12 + (month - 1) + months;
  return format(dayOrFirstAfter(Math.floor(index / 12), (index % 12) + 1, day));
}

/** The day after a date. */
export function nextDay(date: string): string {
  const { year, month, day } = required(date);
  return format(dayOrFirstAfter(year, month, day + 1));
}

/**
 * The latest date whose N-th anniversary falls on or before `day`: "at least N years ago" holds
 * up to it. It is the same day N years earlier, or 28 February where 29 February doesn't exist.
 */
export function latestDateYearsBefore(day: string, years: number): string {
  const { year, month, day: dayOfMonth } = required(day);
  const earlier = year - years;
  return format({ year: earlier, month, day: Math.min(dayOfMonth, daysInMonth(earlier, month)) });
}

/** The calendar date in Germany at a moment, as the evaluator counts the day of sharing. */
export function todayInGermany(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: GERMAN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The design's date format: "23 Oct 2005". */
export function formatDate(date: string): string {
  const { year, month, day } = required(date);
  return `${day} ${MONTH_ABBREVIATIONS[month - 1]} ${year}`;
}

/**
 * The dates a complete date condition means on `day`, or null for a condition that isn't a
 * complete date condition. "At least 21 years old" on 23 Oct 2026 means on or before 23 Oct 2005.
 */
export function boundaryOf(condition: Condition, day: string): DateBoundary | null {
  const years = isWholeCount(condition.years) ? condition.years : null;
  const amount = isWholeCount(condition.amount) ? condition.amount : null;
  switch (condition.operator) {
    case 'before':
    case 'after':
    case 'on':
      return isValidIsoDate(condition.date)
        ? { relation: condition.operator, date: condition.date }
        : null;
    case 'at_least_years_ago':
      return years ? { relation: 'on_or_before', date: latestDateYearsBefore(day, years) } : null;
    case 'less_than_years_ago':
      return years ? { relation: 'after', date: latestDateYearsBefore(day, years) } : null;
    case 'exactly_years_ago':
      return years
        ? {
            relation: 'between',
            from: nextDay(latestDateYearsBefore(day, years + 1)),
            to: latestDateYearsBefore(day, years),
          }
        : null;
    case 'at_least_from_now':
    case 'less_than_from_now': {
      if (!amount || (condition.unit !== 'years' && condition.unit !== 'months')) {
        return null;
      }
      const date = addMonths(day, condition.unit === 'years' ? amount * 12 : amount);
      return {
        relation: condition.operator === 'at_least_from_now' ? 'on_or_after' : 'before',
        date,
      };
    }
    default:
      return null;
  }
}

/**
 * A boundary in words, for the example after "Today (23 Oct 2026) this means: ". On the Date of
 * birth it starts with "born": "born on or before 23 Oct 2005".
 */
export function boundaryPhrase(boundary: DateBoundary, dateOfBirth: boolean): string {
  const phrase =
    boundary.relation === 'between'
      ? `between ${formatDate(boundary.from)} and ${formatDate(boundary.to)}`
      : `${RELATION_WORDS[boundary.relation]} ${formatDate(boundary.date)}`;
  return dateOfBirth ? `born ${phrase}` : phrase;
}
