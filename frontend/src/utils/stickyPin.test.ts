import { describe, expect, it } from 'vitest';

import { isPinned } from './stickyPin';

describe('isPinned (B3)', () => {
  it('is false while the sentinel rests on the bar, in view or below it', () => {
    expect(isPinned(120, 120)).toBe(false);
    expect(isPinned(900, 900)).toBe(false);
  });

  it('is false for subpixel rounding between the two', () => {
    expect(isPinned(119.75, 120)).toBe(false);
  });

  it('is true once the sentinel has scrolled on above the bar', () => {
    expect(isPinned(40, 296)).toBe(true);
    expect(isPinned(295, 296)).toBe(true);
  });
});
