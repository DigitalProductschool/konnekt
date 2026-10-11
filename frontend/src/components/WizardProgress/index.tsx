import { PROGRESS_LABEL } from './constants';
import type { WizardProgressProps, WizardStepState } from './types';
import WizardStep from './WizardStep';

function stateOf(index: number, current: number): WizardStepState {
  if (index < current) {
    return 'done';
  }
  return index === current ? 'current' : 'todo';
}

/**
 * Figma "App/Progress" (style B): the step names over bars, with a tick for finished
 * steps, which lead back to them.
 */
export default function WizardProgress({ steps, current, onSelect }: WizardProgressProps) {
  return (
    <nav aria-label={PROGRESS_LABEL}>
      <ol className="flex h-40 items-start gap-8">
        {steps.map((label, index) => (
          <WizardStep
            key={label}
            label={label}
            number={index + 1}
            state={stateOf(index, current)}
            onSelect={index < current && onSelect ? () => onSelect(index) : undefined}
          />
        ))}
      </ol>
    </nav>
  );
}
