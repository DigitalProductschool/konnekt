import type { WizardStepState } from './types';

/**
 * A step's state: finished below `reached`, current at `current`, otherwise to do. The wizard
 * finishes every step before the current one (`reached` = `current`); a draft's details show
 * Publish as current with only the steps the draft reached finished.
 */
export function stepStateOf(index: number, current: number, reached: number): WizardStepState {
  if (index === current) {
    return 'current';
  }
  return index < reached ? 'done' : 'todo';
}
