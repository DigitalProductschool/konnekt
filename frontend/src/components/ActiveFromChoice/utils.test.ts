import { describe, expect, it } from 'vitest';

import { startDateOf } from './utils';

const TODAY = '2026-11-11';
const REFUSED = { ok: false, error: 'invalid_start_date' };

describe('startDateOf: the start date typed into "Active from" (FR-003, C2)', () => {
  it('refuses an empty field, also one of spaces only', () => {
    expect(startDateOf('', TODAY)).toEqual(REFUSED);
    expect(startDateOf('   ', TODAY)).toEqual(REFUSED);
  });

  it('refuses today', () => {
    expect(startDateOf('11.11.2026', TODAY)).toEqual(REFUSED);
  });

  it('refuses a past day', () => {
    expect(startDateOf('10.11.2026', TODAY)).toEqual(REFUSED);
    expect(startDateOf('01.12.2025', TODAY)).toEqual(REFUSED);
  });

  it('refuses a day the calendar does not have', () => {
    expect(startDateOf('31.02.2027', TODAY)).toEqual(REFUSED);
    expect(startDateOf('29.02.2027', TODAY)).toEqual(REFUSED);
    expect(startDateOf('00.12.2026', TODAY)).toEqual(REFUSED);
    expect(startDateOf('01.13.2026', TODAY)).toEqual(REFUSED);
  });

  it('refuses what is no date', () => {
    expect(startDateOf('abc', TODAY)).toEqual(REFUSED);
    expect(startDateOf('2026-12-01', TODAY)).toEqual(REFUSED);
    expect(startDateOf('01.12.26', TODAY)).toEqual(REFUSED);
    expect(startDateOf('01/12/2026', TODAY)).toEqual(REFUSED);
    expect(startDateOf('001.12.2026', TODAY)).toEqual(REFUSED);
    expect(startDateOf('01.12.2026x', TODAY)).toEqual(REFUSED);
  });

  it('answers a day after today as YYYY-MM-DD', () => {
    expect(startDateOf('12.11.2026', TODAY)).toEqual({ ok: true, date: '2026-11-12' });
    expect(startDateOf('01.12.2026', TODAY)).toEqual({ ok: true, date: '2026-12-01' });
    expect(startDateOf('29.02.2028', TODAY)).toEqual({ ok: true, date: '2028-02-29' });
  });

  it('takes a single-digit day and month, and ignores surrounding spaces', () => {
    expect(startDateOf('1.12.2026', TODAY)).toEqual({ ok: true, date: '2026-12-01' });
    expect(startDateOf('5.1.2027', TODAY)).toEqual({ ok: true, date: '2027-01-05' });
    expect(startDateOf('15.1.2027', TODAY)).toEqual({ ok: true, date: '2027-01-15' });
    expect(startDateOf(' 01.12.2026 ', TODAY)).toEqual({ ok: true, date: '2026-12-01' });
  });

  it('compares with the today it is given, across a year end', () => {
    expect(startDateOf('01.01.2027', '2026-12-31')).toEqual({ ok: true, date: '2027-01-01' });
    expect(startDateOf('31.12.2026', '2026-12-31')).toEqual(REFUSED);
  });
});
