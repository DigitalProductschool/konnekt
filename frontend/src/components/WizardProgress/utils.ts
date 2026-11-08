import { LAST_STEP } from './constants';
import type { WizardStepState } from './types';

/**
 * A step's state: before the current one done, the current one current, after it to do. The
 * progress bar draws done and current in action blue and to do in the decorative border colour.
 */
export function stepStateOf(index: number, current: number): WizardStepState {
  if (index === current) {
    return 'current';
  }
  return index < current ? 'done' : 'todo';
}

/**
 * Whether there is a step line: only on one of the steps. The details pass the index past the
 * last step, since Publish is a dialog, and show no step line (FR-025).
 */
export function hasStepLine(current: number, total: number): boolean {
  return current >= 0 && current < total;
}

/** "Step 2 of 4": the line's text before the segments and the progress bar's name (FR-025). */
export function stepCountOf(current: number, total: number): string {
  return `Step ${current + 1} of ${total}`;
}

/** "Next: Documents" after the segments, or "Last step" on the last step (FR-025). */
export function nextLabelOf(steps: readonly string[], current: number): string {
  const next = steps[current + 1];
  return next === undefined ? LAST_STEP : `Next: ${next}`;
}
