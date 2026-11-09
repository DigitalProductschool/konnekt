import { shownItems } from '@connection-portal/rules/tree';

import GroupFrame from '../../components/GroupFrame';
import RuleRow from '../../components/RuleRow';
import type { SummaryItemProps } from './types';

/**
 * A rule or group of a variant on the details, read-only, with its identifier "rule-7" next to its
 * name (F35) and no menus (T024: the empty actions column keeps its 32px, U82). A group shows
 * through the Rules step's frame, with its AND or OR between its members and its own message
 * (F26). In a variant based on Standard, each shows its mark; a removed group,
 * or one dissolved there, shows as removed with what it holds faded (FR-023, F13, F26).
 */
export default function SummaryItem({
  item,
  context,
  depth,
  based,
  dissolved = false,
  faded = false,
}: SummaryItemProps) {
  const mark = based ? item.mark : null;
  if (item.type === 'rule') {
    return <RuleRow rule={item} context={context} showIdentifier mark={mark} faded={faded} />;
  }
  const inactive = dissolved || item.mark === 'removed';
  return (
    <GroupFrame
      group={item}
      subGroup={depth > 0}
      showIdentifier
      mark={mark}
      inactive={inactive}
      faded={faded}
      members={shownItems(item.items, based && !inactive && !faded).map((entry) => ({
        key: entry.item.id,
        node: (
          <SummaryItem
            item={entry.item}
            context={context}
            depth={depth + 1}
            based={based}
            dissolved={entry.dissolved}
            faded={faded || inactive}
          />
        ),
      }))}
    />
  );
}
