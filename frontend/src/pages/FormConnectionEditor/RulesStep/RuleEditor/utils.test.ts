import { describe, expect, it } from 'vitest';

import { resolveTarget } from '../../../../utils/rules/conditions';
import { CONTEXT, target } from '../../../../utils/rules/testData';
import type { MissingControlInput } from './types';
import { hintsOf, missingControl } from './utils';

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

  it('gives the Date of birth F3’s hint and every other date U30’s', () => {
    expect(hintsOf(resolved('pid', 'birthdate'), null, TODAY)).toEqual([
      'Check an age, the time from now, or compare the date with a fixed date.',
    ]);
    expect(hintsOf(resolved('pid', 'date_of_expiry'), null, TODAY)).toEqual([
      'Check the time since or until this date, or compare it with a fixed date.',
    ]);
  });

  it('says that applicants who turn N on the day of sharing count (U11)', () => {
    const hints = hintsOf(
      resolved('pid', 'birthdate'),
      { operator: 'at_least_years_ago', years: 21 },
      TODAY
    );
    expect(hints).toContain('Applicants who turn 21 that day count.');
    expect(
      hintsOf(resolved('pid', 'birthdate'), { operator: 'less_than_years_ago', years: 21 }, TODAY)
    ).not.toContain('Applicants who turn 21 that day count.');
    expect(
      hintsOf(
        resolved('pid', 'date_of_issuance'),
        { operator: 'at_least_years_ago', years: 2 },
        TODAY
      )
    ).not.toContain('Applicants who turn 2 that day count.');
  });
});
