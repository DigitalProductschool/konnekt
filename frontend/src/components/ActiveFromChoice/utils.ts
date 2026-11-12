import { isValidIsoDate } from '@connection-portal/rules/dates';

import { START_DATE_PATTERN } from './constants';
import type { StartDateResult } from './types';

/**
 * The start date typed as `DD.MM.YYYY` or `D.M.YYYY` (surrounding spaces ignored; FR-003, C2) as
 * `YYYY-MM-DD`, if the calendar has that day and it is after `today` (`YYYY-MM-DD`, today in
 * Germany, `useTodayInGermany()`); an empty field, today, a past day or anything that is no date
 * gives the field's error, which the server's `400 invalid_start_date` gives too
 */
export function startDateOf(text: string, today: string): StartDateResult {
  const match = START_DATE_PATTERN.exec(text.trim());
  if (match) {
    const [, day, month, year] = match;
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    // ISO days compare as strings
    if (isValidIsoDate(date) && date > today) {
      return { ok: true, date };
    }
  }
  return { ok: false, error: 'invalid_start_date' };
}
