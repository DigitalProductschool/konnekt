import type { WizardStepState } from './types';

/**
 * A step's state: finished below `reached`, current at `current`, otherwise to do. The wizard
 * finishes every step before the current one (`reached` = `current`); a draft's details pass
 * `current` past the last step (Publish is a dialog, FR-025), so only the steps the draft reached
 * are finished and none is current.
 */
export function stepStateOf(index: number, current: number, reached: number): WizardStepState {
  if (index === current) {
    return 'current';
  }
  return index < reached ? 'done' : 'todo';
}
