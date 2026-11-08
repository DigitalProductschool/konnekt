import { describe, expect, it } from 'vitest';

import { CLOSED } from './constants';
import {
  bubbleFirst,
  bubblePlacementClass,
  disabledStillClasses,
  iconClasses,
  isOpen,
  tooltipReducer,
} from './utils';

describe('tooltipReducer', () => {
  it('opens while hovered, focused or tapped, and closes when none holds', () => {
    const hovered = tooltipReducer(CLOSED, { type: 'hover', value: true });
    expect(isOpen(hovered)).toBe(true);
    const focused = tooltipReducer(hovered, { type: 'focus', value: true });
    const left = tooltipReducer(focused, { type: 'hover', value: false });
    expect(isOpen(left)).toBe(true);
    expect(isOpen(tooltipReducer(left, { type: 'focus', value: false }))).toBe(false);
  });

  it('toggles on a tap, and losing the focus closes what a tap opened', () => {
    const tapped = tooltipReducer(CLOSED, { type: 'tap' });
    expect(isOpen(tapped)).toBe(true);
    expect(isOpen(tooltipReducer(tapped, { type: 'tap' }))).toBe(false);
    expect(isOpen(tooltipReducer(tapped, { type: 'focus', value: false }))).toBe(false);
  });

  it('closes on Escape or a tap elsewhere and keeps the last placement', () => {
    const placed = tooltipReducer(
      { ...CLOSED, hovered: true, focused: true, tapped: true },
      { type: 'place', placement: { side: 'end', direction: 'up' } }
    );
    const closed = tooltipReducer(placed, { type: 'close' });
    expect(isOpen(closed)).toBe(false);
    expect(closed.placement).toEqual({ side: 'end', direction: 'up' });
  });
});

describe('bubblePlacementClass', () => {
  it('puts the bubble 8px below or above its trigger, 8px past an ⓘ and flush with a button', () => {
    expect(bubblePlacementClass('icon', { side: 'start', direction: 'down' })).toContain(
      'top-full -left-8 pt-8 w-280'
    );
    expect(bubblePlacementClass('icon', { side: 'end', direction: 'up' })).toContain(
      'bottom-full -right-8 pb-8 w-280'
    );
    expect(bubblePlacementClass('button', { side: 'start', direction: 'down' })).toContain(
      'top-full left-0 pt-8'
    );
    expect(bubblePlacementClass('button', { side: 'end', direction: 'up' })).toContain(
      'bottom-full right-0 pb-8'
    );
  });

  it('spans the page across the gutters when neither side fits', () => {
    expect(bubblePlacementClass('icon', { side: 'full', direction: 'down' })).toBe(
      'inset-x-16 pt-8'
    );
    expect(bubblePlacementClass('button', { side: 'full', direction: 'up' })).toBe(
      'inset-x-16 pb-8 -translate-y-full'
    );
  });
});

describe('bubbleFirst', () => {
  it('puts the bubble before its trigger only when it opens up', () => {
    expect(bubbleFirst({ side: 'full', direction: 'up' })).toBe(true);
    expect(bubbleFirst({ side: 'full', direction: 'down' })).toBe(false);
  });
});

describe('iconClasses', () => {
  it('colours KERN’s info icon by its tone (build note 35)', () => {
    expect(iconClasses(undefined, 'muted')).toBe('kern-icon--info bg-kern-layout-text-muted!');
    expect(iconClasses(undefined, 'info')).toBe('kern-icon--info bg-kern-feedback-info!');
    expect(iconClasses(undefined, 'action')).toBe('kern-icon--info bg-kern-action-default!');
  });

  it('keeps a given icon as it is', () => {
    expect(iconClasses('kern-icon--warning bg-kern-feedback-warning!', 'action')).toBe(
      'kern-icon--warning bg-kern-feedback-warning!'
    );
  });
});

describe('disabledStillClasses', () => {
  it('keeps a primary button blue and the others clear on hover and press', () => {
    expect(disabledStillClasses('kern-btn kern-btn--primary ml-auto')).toBe(
      'hover:bg-kern-action-default! active:bg-kern-action-default!'
    );
    expect(disabledStillClasses('kern-btn kern-btn--secondary')).toBe(
      'hover:bg-transparent! active:bg-transparent!'
    );
    expect(disabledStillClasses('kern-btn kern-btn--primary-like')).toBe(
      'hover:bg-transparent! active:bg-transparent!'
    );
  });
});
