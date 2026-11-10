import { useCopy } from '../../../hooks/useLanguage';
import { RULES_STEP_COPY } from './constants';
import type { AddRuleButtonProps } from './types';

/** Figma "Rules/Add actions" (U12 6350:42848): the dashed "Add rule" at the end of the list. */
export default function AddRuleButton({ id, onAddRule }: AddRuleButtonProps) {
  const copy = useCopy(RULES_STEP_COPY);
  return (
    <div className="px-24 pt-8 pb-16">
      <button
        id={id}
        type="button"
        onClick={onAddRule}
        className="rounded-kern-default border-kern-action-default bg-kern-layout-background-default text-kern-static-small text-kern-action-default hover:bg-kern-neutral-025 focus-visible:outline-kern-action-focus-default flex cursor-pointer items-center gap-4 border border-dashed px-16 py-8 leading-(--kern-typography-line-height-medium-static) font-semibold focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        <span
          aria-hidden="true"
          className="kern-icon kern-icon--add kern-icon--small bg-kern-action-default!"
        />
        {copy.addRule}
      </button>
    </div>
  );
}
