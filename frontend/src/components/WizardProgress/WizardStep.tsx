import checkIcon from '../../assets/icons/check-blue-small.svg';
import { DONE_SUFFIX } from './constants';
import type { WizardStepProps } from './types';

// Truncated from `sm` only: below, the name sits under the circle with the step's full width
const LABEL_CLASSES =
  'text-kern-static-small leading-(--kern-typography-line-height-medium-static) max-w-full text-left wrap-break-word sm:truncate';

/**
 * One step of Figma "App/Progress" (style B): circle, name and bar. Below `sm`, which the
 * design has no frame for, the name goes under the circle, so that it isn't cut off at 320 px
 * (WCAG 1.4.10, decision 2026-10-19).
 */
export default function WizardStep({ label, number, state, onSelect }: WizardStepProps) {
  return (
    <li
      aria-current={state === 'current' ? 'step' : undefined}
      className="flex min-w-0 flex-1 flex-col gap-10"
    >
      <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
        {state === 'done' && (
          <span className="rounded-kern-circle bg-kern-darkblue-050 flex size-24 shrink-0 items-center justify-center">
            <img src={checkIcon} alt="" className="size-16" />
          </span>
        )}
        {state === 'current' && (
          <span className="rounded-kern-circle bg-kern-action-default text-step text-kern-action-on-default flex size-24 shrink-0 items-center justify-center font-semibold">
            {number}
          </span>
        )}
        {state === 'todo' && (
          // The 1.5px border is Figma's; KERN's border widths are 1, 2 and 4px
          <span className="rounded-kern-circle text-step text-kern-layout-text-muted flex size-24 shrink-0 items-center justify-center border-[1.5px] border-(--kern-color-decorative-border-default) font-semibold">
            {number}
          </span>
        )}
        {state === 'done' && onSelect ? (
          <button
            type="button"
            onClick={onSelect}
            className={`${LABEL_CLASSES} text-kern-action-default focus-visible:outline-kern-action-focus-default rounded-kern-small cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-2`}
          >
            {label}
            <span className="kern-sr-only">{DONE_SUFFIX}</span>
          </button>
        ) : (
          <span
            className={`${LABEL_CLASSES} ${state === 'current' ? 'text-kern-layout-text-default font-semibold' : ''} ${state === 'todo' ? 'text-kern-layout-text-muted' : ''} ${state === 'done' ? 'text-kern-action-default' : ''}`}
          >
            {label}
            {state === 'done' && <span className="kern-sr-only">{DONE_SUFFIX}</span>}
          </span>
        )}
      </div>
      <span
        aria-hidden="true"
        className={`rounded-kern-small h-4 w-full ${state === 'todo' ? 'bg-(--kern-color-decorative-border-default)' : 'bg-kern-action-default'}`}
      />
    </li>
  );
}
