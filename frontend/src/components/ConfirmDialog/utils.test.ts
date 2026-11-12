import { describe, expect, it } from 'vitest';

import { dialogButtonCountOf } from './utils';

describe('dialogButtonCountOf: the buttons of the dialog footer (P33 dialog-actions)', () => {
  it('counts the confirm button, the cancel button and the secondary action', () => {
    expect(dialogButtonCountOf(true, false, false)).toBe(2);
    expect(dialogButtonCountOf(true, true, false)).toBe(3);
    expect(dialogButtonCountOf(false, true, false)).toBe(2);
    expect(dialogButtonCountOf(false, false, false)).toBe(1);
  });

  it('leaves the hidden confirm button out (design-notes §4.2 T084 (3))', () => {
    expect(dialogButtonCountOf(true, false, true)).toBe(1);
    expect(dialogButtonCountOf(true, true, true)).toBe(2);
  });

  it('keeps a layout for a footer without a button', () => {
    expect(dialogButtonCountOf(false, false, true)).toBe(1);
  });
});
