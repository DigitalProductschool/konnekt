import { describe, expect, it } from 'vitest';

import { nextMenuIndex } from './menuNavigation';

describe('nextMenuIndex', () => {
  it('moves down and up, wrapping around', () => {
    expect(nextMenuIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextMenuIndex('ArrowDown', 2, 3)).toBe(0);
    expect(nextMenuIndex('ArrowUp', 0, 3)).toBe(2);
    expect(nextMenuIndex('ArrowUp', 2, 3)).toBe(1);
  });

  it('goes to the first or last item, and to the first when none has the focus', () => {
    expect(nextMenuIndex('Home', 2, 3)).toBe(0);
    expect(nextMenuIndex('End', 0, 3)).toBe(2);
    expect(nextMenuIndex('ArrowDown', -1, 3)).toBe(0);
  });
});
