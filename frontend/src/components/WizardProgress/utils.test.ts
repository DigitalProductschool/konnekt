import { describe, expect, it } from 'vitest';

import { stepStateOf } from './utils';

// The four steps (FR-025): Publish is a dialog, not a step
const STEPS = [0, 1, 2, 3];

function statesOf(current: number, reached: number) {
  return STEPS.map((index) => stepStateOf(index, current, reached));
}

describe('stepStateOf', () => {
  it('finishes every step before the current one in the wizard (reached = current)', () => {
    expect(statesOf(2, 2)).toEqual(['done', 'done', 'current', 'todo']);
    expect(statesOf(0, 0)).toEqual(['current', 'todo', 'todo', 'todo']);
    expect(statesOf(3, 3)).toEqual(['done', 'done', 'done', 'current']);
  });

  it('finishes every step of a published connection', () => {
    expect(statesOf(4, 4)).toEqual(['done', 'done', 'done', 'done']);
  });

  it('leaves the steps a draft hasn’t reached to do, with no step current', () => {
    expect(statesOf(4, 1)).toEqual(['done', 'todo', 'todo', 'todo']);
    expect(statesOf(4, 2)).toEqual(['done', 'done', 'todo', 'todo']);
    expect(statesOf(4, 4)).toEqual(['done', 'done', 'done', 'done']);
  });
});
