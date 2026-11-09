import { describe, expect, it } from 'vitest';

import { CONNECTION_STEPS } from '../../constants';
import { hasStepLine, nextLabelOf, stepCountOf, stepStateOf } from './utils';

// FR-025: four steps (Connection, Documents, Rules, Test); Publish is a dialog, not a step
describe('the step line (FR-025)', () => {
  it('has the four steps', () => {
    expect(CONNECTION_STEPS).toEqual(['Connection', 'Documents', 'Rules', 'Test']);
  });

  it('marks the steps before the current one done and the ones after it to do', () => {
    const statesOf = (current: number) =>
      CONNECTION_STEPS.map((_, index) => stepStateOf(index, current));
    expect(statesOf(0)).toEqual(['current', 'todo', 'todo', 'todo']);
    expect(statesOf(2)).toEqual(['done', 'done', 'current', 'todo']);
    expect(statesOf(3)).toEqual(['done', 'done', 'done', 'current']);
  });

  it('counts the steps as "Step n of 4"', () => {
    expect(stepCountOf(0, CONNECTION_STEPS.length)).toBe('Step 1 of 4');
    expect(stepCountOf(3, CONNECTION_STEPS.length)).toBe('Step 4 of 4');
  });

  it('names the next step, and the last step as "Last step"', () => {
    expect(nextLabelOf(CONNECTION_STEPS, 0)).toBe('Next: Documents');
    expect(nextLabelOf(CONNECTION_STEPS, 1)).toBe('Next: Rules');
    expect(nextLabelOf(CONNECTION_STEPS, 2)).toBe('Next: Test');
    expect(nextLabelOf(CONNECTION_STEPS, 3)).toBe('Last step');
  });

  it('shows no step line past the last step (the details)', () => {
    expect(hasStepLine(0, CONNECTION_STEPS.length)).toBe(true);
    expect(hasStepLine(3, CONNECTION_STEPS.length)).toBe(true);
    expect(hasStepLine(4, CONNECTION_STEPS.length)).toBe(false);
    expect(hasStepLine(-1, CONNECTION_STEPS.length)).toBe(false);
  });
});
