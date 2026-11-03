import { describe, expect, it } from 'vitest';

import type { Persona } from '../utils/rules/personas/types';
import { lacksUnrequestedValue } from './usePersonas';

const FIELDS = [{ key: 'a' }, { key: 'b' }];

/** A persona with these values, for the fields' sake only */
const withValues = (values: Persona['values']): Pick<Persona, 'values'> => ({ values });

describe('lacksUnrequestedValue', () => {
  it('is false without personas', () => {
    expect(lacksUnrequestedValue(null, FIELDS, null)).toBe(false);
  });

  it('is false when every persona has a value, even an empty one, for every field', () => {
    const personas = [withValues({ a: 1, b: null }), withValues({ a: 'x', b: [] })];
    expect(lacksUnrequestedValue(personas, FIELDS, new Set())).toBe(false);
  });

  it('is true when a persona lacks a field that the last request lacked', () => {
    const personas = [withValues({ a: 1, b: 2 }), withValues({ a: 1 })];
    expect(lacksUnrequestedValue(personas, FIELDS, new Set(['a']))).toBe(true);
  });

  it('is true before any request was posted', () => {
    expect(lacksUnrequestedValue([withValues({ a: 1 })], FIELDS, null)).toBe(true);
  });

  it('is false when the worker was asked for the field and left it out', () => {
    const personas = [withValues({ a: 1 })];
    expect(lacksUnrequestedValue(personas, FIELDS, new Set(['a', 'b']))).toBe(false);
  });
});
