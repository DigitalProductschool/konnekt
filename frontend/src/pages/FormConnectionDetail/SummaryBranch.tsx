import { shownItems } from '@connection-portal/rules/tree';
import { useId } from 'react';

import BranchName from '../../components/BranchName';
import Connector from '../../components/Connector';
import { DETAIL_COPY } from './constants';
import SummaryItem from './SummaryItem';
import type { SummaryBranchProps } from './types';

/**
 * One variant's rules, read-only, in the layout of the Rules step (F26): its name with the (i)
 * of its description (F31), then its rules card with its rules and groups and the AND or OR
 * between them, or that it has none. A variant based on Standard shows its marks and removed
 * items, a group dissolved there as removed, and a switched top-level AND/OR (FR-023, W4). A
 * draft's variant may hold incomplete rules, which read as far as they go, as in the Rules step;
 * no variant shows its pull URL here (spec 005, S6).
 */
export default function SummaryBranch({ branch, context }: SummaryBranchProps) {
  const headingId = useId();
  const based = branch.origin === 'based';
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <BranchName name={branch.name} description={branch.description}>
        <h3
          id={headingId}
          className="text-kern-static-small text-kern-action-default leading-(--kern-typography-line-height-medium-static) font-semibold"
        >
          {branch.name}
        </h3>
      </BranchName>
      {branch.items.length === 0 ? (
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {DETAIL_COPY.noRules}
        </p>
      ) : (
        <ol className="rounded-kern-large bg-kern-layout-background-default border border-(--kern-color-decorative-border-default)">
          {shownItems(branch.items, based).map(({ item, dissolved }, index) => (
            <li key={item.id}>
              {index > 0 && (
                <Connector
                  operator={branch.operator}
                  mark={index === 1 && based ? branch.operator_mark : null}
                  faded={dissolved || item.mark === 'removed'}
                />
              )}
              <SummaryItem
                item={item}
                context={context}
                depth={0}
                based={based}
                dissolved={dissolved}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
