import { useId } from 'react';

import Connector from '../../components/Connector';
import { DETAIL_COPY } from './constants';
import SummaryItem from './SummaryItem';
import type { SummaryBranchProps } from './types';

/**
 * One variant's rules, read-only, in the layout of the Rules step (F26): its name, then its rules
 * card with its rules and groups and the AND or OR between them, or that it has none.
 */
export default function SummaryBranch({ branch, context }: SummaryBranchProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <h3
        id={headingId}
        className="text-kern-static-small text-kern-action-default leading-(--kern-typography-line-height-medium-static) font-semibold"
      >
        {branch.name}
      </h3>
      {branch.items.length === 0 ? (
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {DETAIL_COPY.noRules}
        </p>
      ) : (
        <ol className="rounded-kern-large bg-kern-layout-background-default border border-(--kern-color-decorative-border-default)">
          {branch.items.map((item, index) => (
            <li key={item.id}>
              {index > 0 && <Connector operator={branch.operator} />}
              <SummaryItem item={item} context={context} depth={0} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
