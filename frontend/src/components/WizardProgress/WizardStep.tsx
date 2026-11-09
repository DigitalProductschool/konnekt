import {
  COLOUR_TRANSITION,
  LINK_STEP_CLASSES,
  SEGMENT_CLASSES,
  STEP_NAME_CLASSES,
} from './constants';
import type { WizardStepProps } from './types';

/**
 * One step of Figma "Shell/Step line". While creating, the bare segment of the progress bar:
 * action blue up to the current step, the decorative border colour after it. In the edit flow
 * (`labelled`), the segment with the step's name under it, 4 px apart: the current step in
 * action blue, every other one a button ("Shell/Step link": a muted line and an ink name, both
 * blue on hover and while pressed, 150 ms; F25).
 */
export default function WizardStep({ label, state, labelled, onSelect }: WizardStepProps) {
  if (!labelled) {
    return (
      <span
        className={`${SEGMENT_CLASSES} min-w-px flex-1 ${state === 'todo' ? 'bg-(--kern-color-decorative-border-default)' : 'bg-kern-action-default'}`}
      />
    );
  }
  if (state === 'current' || !onSelect) {
    return (
      <li aria-current={state === 'current' ? 'step' : undefined} className={LINK_STEP_CLASSES}>
        <span className="flex flex-col items-start gap-4">
          <span className={`${SEGMENT_CLASSES} bg-kern-action-default`} />
          <span className={`${STEP_NAME_CLASSES} text-kern-action-default`}>{label}</span>
        </span>
      </li>
    );
  }
  return (
    <li className={LINK_STEP_CLASSES}>
      <button
        type="button"
        onClick={onSelect}
        className="group rounded-kern-small focus-visible:outline-kern-action-focus-default flex w-full cursor-pointer flex-col items-start gap-4 text-left focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        <span
          className={`${SEGMENT_CLASSES} ${COLOUR_TRANSITION} bg-kern-layout-text-muted group-hover:bg-kern-action-default group-active:bg-kern-action-default`}
        />
        <span
          className={`${STEP_NAME_CLASSES} ${COLOUR_TRANSITION} text-kern-layout-text-default group-hover:text-kern-action-default group-active:text-kern-action-default`}
        >
          {label}
        </span>
      </button>
    </li>
  );
}
