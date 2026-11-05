import { PROGRESS_LABEL } from './constants';
import type { WizardProgressProps } from './types';
import { stepStateOf } from './utils';
import WizardStep from './WizardStep';

/**
 * Figma "App/Progress" (style B): the step names over bars, with a tick for finished
 * steps, which lead back to them.
 */
export default function WizardProgress({
  steps,
  current,
  reached = current,
  onSelect,
}: WizardProgressProps) {
  return (
    <nav aria-label={PROGRESS_LABEL}>
      <ol className="flex items-start gap-8 sm:h-40">
        {steps.map((label, index) => (
          <WizardStep
            key={label}
            label={label}
            number={index + 1}
            state={stepStateOf(index, current, reached)}
            onSelect={index < reached && onSelect ? () => onSelect(index) : undefined}
          />
        ))}
      </ol>
    </nav>
  );
}
