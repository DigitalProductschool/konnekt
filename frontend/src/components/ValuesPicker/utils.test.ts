import { describe, expect, it } from 'vitest';

import { valuesMenuHeight } from './utils';

// The menu's height before it opens decides whether it opens down or up (T020, T027); the sums
// follow VALUES_MENU_METRICS: a frame of 18, parts 2 apart
describe('valuesMenuHeight', () => {
  it('adds the search field, the class rows 2 apart and the "Done" row', () => {
    // 18 + 40 + (4 × 44 + 3 × 2) + 48 + 2 gaps of 2
    expect(valuesMenuHeight(4, true, true, false)).toBe(292);
  });

  it('adds the value list with its padding, the divider and the footer', () => {
    // 18 + (3 × 28 + 8) + 1 + 36 + 48 + 3 gaps of 2
    expect(valuesMenuHeight(3, false, false, true)).toBe(201);
  });

  it('keeps the frame and the "Done" row with no options', () => {
    // 18 + 0 + 48 + 1 gap of 2
    expect(valuesMenuHeight(0, true, false, false)).toBe(68);
  });

  it('grows with every option', () => {
    expect(valuesMenuHeight(11, true, true, true)).toBeGreaterThan(
      valuesMenuHeight(10, true, true, true)
    );
  });
});
