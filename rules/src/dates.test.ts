import { describe, expect, it } from 'vitest';

import {
  addMonths,
  anniversary,
  boundaryOf,
  boundaryPhrase,
  countOf,
  formatDate,
  isValidIsoDate,
  isWholeCount,
  latestDateYearsBefore,
  nextDay,
  todayInGermany,
} from './dates';

/** Every day from `from` to `to`, both included. */
function days(from: string, to: string): string[] {
  const result: string[] = [];
  for (let day = from; day <= to; day = nextDay(day)) {
    result.push(day);
  }
  return result;
}

/** The days from 20 February to 5 March of each year: around 29 February. */
function aroundLeapDay(...years: number[]): string[] {
  return years.flatMap((year) => days(`${year}-02-20`, `${year}-03-05`));
}

describe('the design example (F4)', () => {
  it('on 23.10.2026, "at least 21 years old" means born on or before 23.10.2005', () => {
    const boundary = boundaryOf({ operator: 'at_least_years_ago', years: 21 }, '2026-10-23');
    expect(boundary).toEqual({ relation: 'on_or_before', date: '2005-10-23' });
    expect(boundary && boundaryPhrase(boundary, true)).toBe('born on or before 23.10.2005');
  });

  it('leaves out "born" on other dates', () => {
    const boundary = boundaryOf({ operator: 'at_least_years_ago', years: 2 }, '2026-10-23');
    expect(boundary && boundaryPhrase(boundary, false)).toBe('on or before 23.10.2024');
  });

  it('words the example in German (glossary G§3 `RELATION_WORDS`)', () => {
    const born = boundaryOf({ operator: 'at_least_years_ago', years: 21 }, '2026-10-23');
    expect(born && boundaryPhrase(born, true, 'de')).toBe('geboren am oder vor dem 23.10.2005');
    const issued = boundaryOf({ operator: 'at_least_years_ago', years: 2 }, '2026-10-23');
    expect(issued && boundaryPhrase(issued, false, 'de')).toBe('am oder vor dem 23.10.2024');
  });
});

describe('anniversary', () => {
  it('is the same day N years later', () => {
    expect(anniversary('2005-10-23', 21)).toBe('2026-10-23');
  });

  it('falls on 1 March for 29 February in years without it', () => {
    expect(anniversary('2004-02-29', 1)).toBe('2005-03-01');
    expect(anniversary('2004-02-29', 21)).toBe('2025-03-01');
  });

  it('stays on 29 February in leap years', () => {
    expect(anniversary('2004-02-29', 4)).toBe('2008-02-29');
  });
});

describe('addMonths', () => {
  it('takes the 1st of the following month where the day doesn’t exist', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-03-01');
    expect(addMonths('2024-01-31', 1)).toBe('2024-03-01');
    expect(addMonths('2026-01-30', 1)).toBe('2026-03-01');
    expect(addMonths('2026-11-30', 3)).toBe('2027-03-01');
    expect(addMonths('2026-03-31', 1)).toBe('2026-05-01');
  });

  it('keeps the day where it exists, across years', () => {
    expect(addMonths('2026-01-28', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-29', 1)).toBe('2024-02-29');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-10-23', 6)).toBe('2027-04-23');
    expect(addMonths('2026-10-23', 24)).toBe('2028-10-23');
  });
});

describe('latestDateYearsBefore', () => {
  it('is the same day N years earlier', () => {
    expect(latestDateYearsBefore('2026-10-23', 21)).toBe('2005-10-23');
    expect(latestDateYearsBefore('2025-03-01', 21)).toBe('2004-03-01');
  });

  it('is 28 February where 29 February doesn’t exist', () => {
    expect(latestDateYearsBefore('2024-02-29', 21)).toBe('2003-02-28');
    expect(latestDateYearsBefore('2024-02-29', 20)).toBe('2004-02-29');
  });

  it('agrees with the anniversary for every day around 29 February', () => {
    const mismatches: string[] = [];
    for (const day of aroundLeapDay(2023, 2024, 2025)) {
      for (const date of aroundLeapDay(2003, 2004, 2005)) {
        for (const years of [19, 20, 21]) {
          const atLeast = anniversary(date, years) <= day;
          if (atLeast !== date <= latestDateYearsBefore(day, years)) {
            mismatches.push(`${date} + ${years} on ${day}`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe('boundaryOf', () => {
  it('reads "is less than N years old" as born after the boundary', () => {
    expect(boundaryOf({ operator: 'less_than_years_ago', years: 21 }, '2026-10-23')).toEqual({
      relation: 'after',
      date: '2005-10-23',
    });
  });

  it('reads "is exactly N years" from the N-th anniversary to the day before the next', () => {
    const boundary = boundaryOf({ operator: 'exactly_years_ago', years: 21 }, '2026-10-23');
    expect(boundary).toEqual({ relation: 'between', from: '2004-10-24', to: '2005-10-23' });
    expect(boundary && boundaryPhrase(boundary, true)).toBe(
      'born between 24.10.2004 and 23.10.2005'
    );
    expect(boundary && boundaryPhrase(boundary, true, 'de')).toBe(
      'geboren zwischen dem 24.10.2004 und dem 23.10.2005'
    );
  });

  it('matches "is exactly" with the anniversaries around 29 February', () => {
    const mismatches: string[] = [];
    for (const day of aroundLeapDay(2024, 2025)) {
      const boundary = boundaryOf({ operator: 'exactly_years_ago', years: 20 }, day);
      if (boundary?.relation !== 'between') {
        throw new Error('expected a range');
      }
      for (const date of aroundLeapDay(2003, 2004, 2005)) {
        const exactly = anniversary(date, 20) <= day && day < anniversary(date, 21);
        if (exactly !== (boundary.from <= date && date <= boundary.to)) {
          mismatches.push(`${date} on ${day}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('counts from-now conditions forward, with months at the end of a month', () => {
    expect(
      boundaryOf({ operator: 'at_least_from_now', amount: 1, unit: 'months' }, '2026-01-31')
    ).toEqual({ relation: 'on_or_after', date: '2026-03-01' });
    expect(
      boundaryOf({ operator: 'less_than_from_now', amount: 2, unit: 'years' }, '2024-02-29')
    ).toEqual({ relation: 'before', date: '2026-03-01' });
  });

  it('keeps a fixed date as it is, before and after being strict', () => {
    const day = '2026-10-23';
    expect(boundaryOf({ operator: 'before', date: '2020-01-01' }, day)).toEqual({
      relation: 'before',
      date: '2020-01-01',
    });
    expect(boundaryOf({ operator: 'after', date: '2020-01-01' }, day)).toEqual({
      relation: 'after',
      date: '2020-01-01',
    });
    const on = boundaryOf({ operator: 'on', date: '2020-01-01' }, day);
    expect(on && boundaryPhrase(on, false)).toBe('on 01.01.2020');
    expect(on && boundaryPhrase(on, false, 'de')).toBe('am 01.01.2020');
    const after = boundaryOf({ operator: 'less_than_years_ago', years: 21 }, day);
    expect(after && boundaryPhrase(after, true, 'de')).toBe('geboren nach dem 23.10.2005');
  });

  it.each([
    ['no years', { operator: 'at_least_years_ago', years: null }],
    ['0 years', { operator: 'at_least_years_ago', years: 0 }],
    ['1.5 years', { operator: 'exactly_years_ago', years: 1.5 }],
    ['no unit', { operator: 'at_least_from_now', amount: 6, unit: null }],
    ['an invalid date', { operator: 'before', date: '2023-02-29' }],
    ['another kind', { operator: 'equal_to', value: 3 }],
  ])('has none for %s', (_name, condition) => {
    expect(boundaryOf(condition, '2026-10-23')).toBeNull();
  });
});

describe('formatDate', () => {
  it('writes the design’s format, the day without a leading zero', () => {
    expect(formatDate('2005-10-23')).toBe('23.10.2005');
    expect(formatDate('2020-01-01')).toBe('01.01.2020');
    expect(formatDate('2027-09-09')).toBe('09.09.2027');
  });

  it('writes German dates the same way, dd.mm.yyyy (glossary G§1 "Dates", research R5)', () => {
    expect(formatDate('2005-10-23', 'de')).toBe('23.10.2005');
    expect(formatDate('2027-09-09', 'de')).toBe('09.09.2027');
  });
});

describe('countOf', () => {
  it('writes one and other forms in English', () => {
    expect(countOf(1, 'years')).toBe('1 year');
    expect(countOf(2, 'years')).toBe('2 years');
    expect(countOf(1, 'months')).toBe('1 month');
    expect(countOf(6, 'months')).toBe('6 months');
  });

  it('writes one and other forms in German, and the dative after "seit" and "in"', () => {
    expect(countOf(1, 'years', 'de')).toBe('1 Jahr');
    expect(countOf(2, 'years', 'de')).toBe('2 Jahre');
    expect(countOf(1, 'months', 'de')).toBe('1 Monat');
    expect(countOf(6, 'months', 'de')).toBe('6 Monate');
    expect(countOf(2, 'years', 'de', true)).toBe('2 Jahren');
    expect(countOf(1, 'years', 'de', true)).toBe('1 Jahr');
    expect(countOf(3, 'months', 'de', true)).toBe('3 Monaten');
  });
});

describe('isValidIsoDate', () => {
  it.each(['2024-02-29', '2026-12-31', '0001-01-01'])('accepts %s', (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each([
    '2023-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-1-01',
    '20260101',
    '2026-10-23T00:00:00Z',
    '',
    null,
    20260101,
  ])('refuses %s', (value) => {
    expect(isValidIsoDate(value)).toBe(false);
  });
});

describe('isWholeCount', () => {
  it.each([
    [1, true],
    [21, true],
    [2.0, true],
    [0, false],
    [-1, false],
    [1.5, false],
    [Number.NaN, false],
    ['2', false],
    [null, false],
  ])('%s → %s', (value, expected) => {
    expect(isWholeCount(value)).toBe(expected);
  });
});

describe('todayInGermany', () => {
  it('is already the next day at 23:30 UTC in summer and in winter', () => {
    expect(todayInGermany(new Date('2026-10-22T22:30:00Z'))).toBe('2026-10-23');
    expect(todayInGermany(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
  });

  it('is still the same day before midnight in Germany', () => {
    expect(todayInGermany(new Date('2026-10-23T21:59:00Z'))).toBe('2026-10-23');
  });
});
