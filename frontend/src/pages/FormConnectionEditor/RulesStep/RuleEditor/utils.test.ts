import { resolveTarget } from '@connection-portal/rules/conditions';
import { CONTEXT, MDL, PID, target } from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import { matchesSearch } from '../../../../components/ValuesPicker/utils';
import type { MissingControlInput } from './types';
import { checkSections, dataSections, hintsOf, missingControl } from './utils';

const COMPLETE: MissingControlInput = {
  document: 'pid',
  target: { document_type: 'pid', field: 'birthdate', part: null, licence_class: null },
  unrequested: false,
  partMissing: false,
  condition: { operator: 'at_least_years_ago', years: 21 },
  conditionComplete: true,
  valuesInput: false,
  message: 'You must be at least 21 years old.',
};

describe('missingControl', () => {
  it('names nothing for a complete rule', () => {
    expect(missingControl(COMPLETE)).toBeNull();
  });

  it('names the first picker without its choice, in the order of the editor', () => {
    const empty = { ...COMPLETE, target: null, condition: null, conditionComplete: false };
    expect(missingControl({ ...empty, document: null })).toBe('document');
    expect(missingControl(empty)).toBe('data');
    expect(missingControl({ ...COMPLETE, partMissing: true, condition: null })).toBe('part');
    expect(missingControl({ ...COMPLETE, condition: null, conditionComplete: false })).toBe(
      'check'
    );
  });

  it('names the data picker for data that is no longer requested', () => {
    expect(missingControl({ ...COMPLETE, unrequested: true })).toBe('data');
  });

  it('names the value field, or the values picker of a check on a value set', () => {
    expect(missingControl({ ...COMPLETE, conditionComplete: false })).toBe('value');
    expect(missingControl({ ...COMPLETE, conditionComplete: false, valuesInput: true })).toBe(
      'values'
    );
  });

  it('names the message last, also when it is only spaces', () => {
    expect(missingControl({ ...COMPLETE, message: '  ' })).toBe('message');
  });
});

describe('hintsOf', () => {
  const TODAY = '2026-10-25';
  const resolved = (document: string, field: string, part: string | null = null) => {
    const found = resolveTarget(target(document, field, part), CONTEXT.documents);
    if (!found) {
      throw new Error(`${document}.${field} isn't in the test catalog`);
    }
    return found;
  };

  it('asks for the part of a field made of parts (U32)', () => {
    expect(hintsOf(resolved('pid', 'place_of_birth'), null, TODAY)).toEqual([
      'Place of birth has parts. Choose the part to check.',
    ]);
  });

  // F34 (CLAR 2026-11-07 #25): the Date of birth takes the other dates' hint
  it('gives every date, the Date of birth too, F34’s hint', () => {
    expect(hintsOf(resolved('pid', 'birthdate'), null, TODAY)).toEqual([
      'Check the time since or until this date, or compare it with a fixed date.',
    ]);
    expect(hintsOf(resolved('pid', 'date_of_expiry'), null, TODAY)).toEqual([
      'Check the time since or until this date, or compare it with a fixed date.',
    ]);
  });

  it('says that citizens who turn N on the day of sharing count (U11)', () => {
    const hints = hintsOf(
      resolved('pid', 'birthdate'),
      { operator: 'at_least_years_ago', years: 21 },
      TODAY
    );
    expect(hints).toContain('Citizens who turn 21 that day count.');
    expect(
      hintsOf(resolved('pid', 'birthdate'), { operator: 'less_than_years_ago', years: 21 }, TODAY)
    ).not.toContain('Citizens who turn 21 that day count.');
    expect(
      hintsOf(
        resolved('pid', 'date_of_issuance'),
        { operator: 'at_least_years_ago', years: 2 },
        TODAY
      )
    ).not.toContain('Citizens who turn 2 that day count.');
  });
});

describe('date of birth in the rule editor (B7)', () => {
  const dataLabels = (document: typeof PID) =>
    dataSections(document).flatMap((section) => section.choices.map((choice) => choice.label));

  it('names the date of birth as an age in the data menu, for the PID and the mDL', () => {
    expect(dataLabels(PID)).toContain('Date of birth (Age)');
    expect(dataLabels(MDL)).toContain('Date of birth (Age)');
    expect(dataLabels(PID)).not.toContain('Date of birth');
  });

  it('finds it in the data menu’s search by "age" and by "birth"', () => {
    const found = (search: string) =>
      dataLabels(PID).filter((label) => matchesSearch(label, search));
    expect(found('age')).toContain('Date of birth (Age)');
    expect(found('birth')).toContain('Date of birth (Age)');
  });

  // F34 (cosmetic 9) and CLAR 2026-11-08 #63: every date, the Date of birth too, offers "Time
  // ago", "Time from now" and "Fixed date"
  it('offers every date, the Date of birth too, "Time ago", "Time from now" and "Fixed date"', () => {
    expect(checkSections('date').map((section) => section.heading)).toEqual([
      'Time ago',
      'Time from now',
      'Fixed date',
    ]);
  });

  it('keeps "date of birth" in the missing-value note', () => {
    const resolved = resolveTarget(target('pid', 'birthdate'), CONTEXT.documents);
    if (!resolved) {
      throw new Error('pid.birthdate isn’t in the test catalog');
    }
    const hints = hintsOf(resolved, { operator: 'before', date: '2000-01-01' }, '2026-10-25');
    expect(hints.some((hint) => hint.includes('If the date of birth is missing'))).toBe(true);
    expect(hints.join(' ')).not.toContain('(Age)');
  });
});
