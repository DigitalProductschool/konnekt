import { useId } from 'react';

import type { RuleItem } from '../../types/form-connections';
import { DETAIL_COPY } from './constants';
import SummaryRuleItem from './SummaryRuleItem';
import type { SummaryBranchProps } from './types';

/**
 * One variant's rules, read-only, in the layout of the Rules step (F26): its name, then its rules
 * card with the AND or OR between them, or that it has none.
 */
export default function SummaryBranch({ branch, context }: SummaryBranchProps) {
  const headingId = useId();
  // A connection saved by the Rules step holds rules only until groups can be formed (FR-008)
  const rules = branch.items.filter((item): item is RuleItem => item.type === 'rule');
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <h3
        id={headingId}
        className="text-kern-static-small text-kern-action-default leading-(--kern-typography-line-height-medium-static) font-semibold"
      >
        {branch.name}
      </h3>
      {rules.length === 0 ? (
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {DETAIL_COPY.noRules}
        </p>
      ) : (
        <ol className="rounded-kern-large bg-kern-layout-background-default border border-(--kern-color-decorative-border-default)">
          {rules.map((rule, index) => (
            <SummaryRuleItem
              key={rule.id}
              rule={rule}
              context={context}
              operator={branch.operator}
              first={index === 0}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
