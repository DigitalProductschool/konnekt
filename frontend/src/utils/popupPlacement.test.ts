import { describe, expect, it } from 'vitest';

import { popupPlacement, popupWrapperClass } from './popupPlacement';

describe('popupPlacement', () => {
  it('keeps the preferred side where the popup fits', () => {
    expect(popupPlacement({ left: 100, right: 132 }, 1280, 220, 'start')).toBe('start');
    expect(popupPlacement({ left: 900, right: 932 }, 1280, 300, 'end')).toBe('end');
  });

  it('opens to the other side where the preferred one would leave the window', () => {
    // The first variant tab's ⋯ near the left edge: its menu opened to the left, off the window
    expect(popupPlacement({ left: 160, right: 192 }, 1280, 220, 'end')).toBe('start');
    // A connector near the right edge
    expect(popupPlacement({ left: 1100, right: 1150 }, 1280, 300, 'start')).toBe('end');
  });

  it('keeps the gutter on the side the popup opens to', () => {
    expect(popupPlacement({ left: 100, right: 132 }, 400, 284, 'start')).toBe('start');
    expect(popupPlacement({ left: 100, right: 132 }, 400, 285, 'start')).toBe('full');
    expect(popupPlacement({ left: 300, right: 332 }, 400, 316, 'end')).toBe('end');
    expect(popupPlacement({ left: 300, right: 332 }, 400, 317, 'end')).toBe('full');
  });

  it('spans the window when neither side fits, as at 320px wide', () => {
    expect(popupPlacement({ left: 50, right: 120 }, 320, 300, 'start')).toBe('full');
    expect(popupPlacement({ left: 240, right: 272 }, 320, 300, 'end')).toBe('full');
  });

  it('counts the overhang past the control, such as a tooltip arrow pointing at its icon', () => {
    // The bubble starts 8px left of the icon
    expect(popupPlacement({ left: 8, right: 32 }, 1280, 320, 'start', 8)).toBe('start');
    expect(popupPlacement({ left: 4, right: 28 }, 1280, 320, 'start', 8)).toBe('full');
    expect(popupPlacement({ left: 1000, right: 1024 }, 1280, 320, 'start', 8)).toBe('end');
  });
});

describe('popupWrapperClass', () => {
  it('lets a popup across the page be positioned from the box around its wrapper', () => {
    expect(popupWrapperClass('full')).toBe('static');
    expect(popupWrapperClass('start')).toBe('relative');
    expect(popupWrapperClass(null)).toBe('relative');
  });
});
