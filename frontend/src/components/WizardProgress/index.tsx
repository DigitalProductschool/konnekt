import { DEFAULT_LANGUAGE } from '@connection-portal/rules/language';

import { CONNECTION_STEP_LABELS } from '../../constants';
import { LINE_TEXT_CLASSES, PROGRESS_LABEL } from './constants';
import type { WizardProgressProps } from './types';
import { hasStepLine, nextLabelOf, stepCountOf, stepStateOf } from './utils';
import WizardStep from './WizardStep';

/**
 * Figma "Shell/Step line" (U02 build notes #1–#4, FR-025), above the step's title. While
 * creating: "Step n of 4", four 4 px segments across the width and "Next: <step>" or "Last
 * step", one 24 px line that is not clickable; the segments are a progress bar named "Step n of
 * 4" whose value reads the step's name. In the edit flow of a published connection (`onSelect`):
 * the four segments with the steps' names under them, each step but the current one a button
 * that leads to it (F25), in a navigation landmark. The details show no step line.
 */
export default function WizardProgress({ steps, current, onSelect }: WizardProgressProps) {
  if (!hasStepLine(current, steps.length)) {
    return null;
  }
  // TODO(009, phase 5): useCopy
  const stepLabels = CONNECTION_STEP_LABELS[DEFAULT_LANGUAGE];
  const labels = steps.map((step) => stepLabels[step]);
  if (onSelect) {
    return (
      <nav aria-label={PROGRESS_LABEL}>
        <ol className="narrow:flex-col narrow:items-stretch narrow:gap-8 flex items-start gap-4">
          {steps.map((step, index) => (
            <WizardStep
              key={step}
              label={stepLabels[step]}
              state={stepStateOf(index, current)}
              labelled
              onSelect={() => onSelect(index)}
            />
          ))}
        </ol>
      </nav>
    );
  }
  const count = stepCountOf(current, steps.length);
  return (
    // Under 320 CSS px the bar takes a row of its own between the two texts (T096)
    <div className="narrow:h-auto narrow:flex-wrap narrow:gap-x-8 narrow:gap-y-4 flex h-24 w-full items-center gap-16">
      {/* The progress bar's name says it, so it is read once */}
      <span aria-hidden="true" className={LINE_TEXT_CLASSES}>
        {count}
      </span>
      <div
        role="progressbar"
        aria-label={count}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
        aria-valuetext={labels[current]}
        className="narrow:basis-full flex h-4 min-w-px flex-1 gap-4"
      >
        {steps.map((step, index) => (
          <WizardStep key={step} label={stepLabels[step]} state={stepStateOf(index, current)} />
        ))}
      </div>
      <span className={LINE_TEXT_CLASSES}>{nextLabelOf(labels, current)}</span>
    </div>
  );
}
