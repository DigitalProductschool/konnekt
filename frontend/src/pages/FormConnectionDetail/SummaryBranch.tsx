import { shownItems } from '@connection-portal/rules/tree';

import Connector from '../../components/Connector';
import { useCopy } from '../../hooks/useLanguage';
import { CONNECTION_DETAIL_COPY } from './constants';
import SummaryItem from './SummaryItem';
import type { SummaryBranchProps } from './types';

/**
 * The open variant tab's panel in the Summary (FR-046 (h); U82 6650:37779 "Rule list · read
 * only"): its rules and groups, read-only, in the Rules step's card (white, 1px
 * `decorative-border`, radius 12), with the AND or OR between them as the read-only connector, no
 * chevron (T023), and no menus or "+ Add rule" (U03 #25–#27); or that it has none. A variant based
 * on Standard shows its marks ("Changed here", "Added here") and removed items, a group dissolved
 * there as removed, and a switched top-level AND/OR (FR-023, W4). A draft's variant may hold
 * incomplete rules, which read as far as they go, as in the Rules step (spec 005, S6).
 */
export default function SummaryBranch({ branch, context, panelId, tabId }: SummaryBranchProps) {
  const based = branch.origin === 'based';
  const copy = useCopy(CONNECTION_DETAIL_COPY);
  return (
    <div id={panelId} role="tabpanel" aria-labelledby={tabId}>
      {branch.items.length === 0 ? (
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {copy.noRules}
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
    </div>
  );
}
