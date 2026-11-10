import { useCopy } from '../../../hooks/useLanguage';
import { RULES_STEP_COPY } from './constants';
import type { RulesEmptyStateProps } from './types';

/**
 * Figma "Rules/Empty state" (U29 6504:43841; component 6093:4289): a branch without rules, with
 * "Add rule" (W5), from the start of the step and in each variant (F26). It sits in the rules card
 * with 24px on every side, the card hugging it (U29 "Empty wrap" 6504:43840; bug rules-ui-fixes
 * B1). The text names Konnekt (C1).
 */
export default function RulesEmptyState({ addRuleId, onAddRule }: RulesEmptyStateProps) {
  const copy = useCopy(RULES_STEP_COPY);
  return (
    <div className="p-24">
      <div className="rounded-kern-default border-kern-action-default flex flex-col items-center gap-8 border border-dashed py-40 text-center">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-kern-adaptive-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-adaptive) font-semibold">
            {copy.emptyTitle}
          </h2>
          <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
            {copy.emptyText}
          </p>
        </div>
        <div className="flex pt-8">
          <button
            id={addRuleId}
            type="button"
            onClick={onAddRule}
            className="kern-btn kern-btn--primary kern-btn--small"
          >
            <span aria-hidden="true" className="kern-icon kern-icon--add kern-icon--small" />
            <span className="kern-label">{copy.addRule}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
