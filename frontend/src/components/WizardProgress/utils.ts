import type { Language } from '@connection-portal/rules/language';

import { WIZARD_PROGRESS_COPY } from './constants';
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

/**
 * "Step 2 of 4" ("Schritt 2 von 4"): the line's text before the segments and the progress bar's
 * name (FR-025).
 */
export function stepCountOf(current: number, total: number, language: Language): string {
  return WIZARD_PROGRESS_COPY[language].stepCount(current + 1, total);
}

/**
 * "Next: Documents" ("Weiter: Dokumente") after the segments, or "Last step" ("Letzter Schritt")
 * on the last step (FR-025). `labels` are the steps' names in the same language.
 */
export function nextLabelOf(
  labels: readonly string[],
  current: number,
  language: Language
): string {
  const copy = WIZARD_PROGRESS_COPY[language];
  const next = labels[current + 1];
  return next === undefined ? copy.lastStep : copy.next(next);
}
