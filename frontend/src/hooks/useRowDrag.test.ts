import { describe, expect, it } from 'vitest';

import { dragCopyWidthOf } from './useRowDrag';

describe('dragCopyWidthOf', () => {
  it('keeps the copy 8 px inside the row as the frames draw it (T059a)', () => {
    // R1: 16 px to the right, 206 px; R2: 48 px to the right of a 230 px row
    expect(dragCopyWidthOf(230, 16)).toBe(206);
    expect(dragCopyWidthOf(230, 48)).toBe(174);
    expect(dragCopyWidthOf(230, 0)).toBe(222);
  });

  it('keeps at most the row’s width while the pointer moves left', () => {
    expect(dragCopyWidthOf(230, -8)).toBe(230);
    expect(dragCopyWidthOf(230, -120)).toBe(230);
  });

  it('never goes below the glyph in its paddings near or past the right edge', () => {
    expect(dragCopyWidthOf(230, 182)).toBe(40);
    expect(dragCopyWidthOf(230, 600)).toBe(40);
    expect(dragCopyWidthOf(111, 100)).toBe(40);
  });
});
