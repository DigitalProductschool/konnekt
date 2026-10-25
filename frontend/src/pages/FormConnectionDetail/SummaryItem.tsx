import GroupFrame from '../../components/GroupFrame';
import RuleRow from '../../components/RuleRow';
import type { SummaryItemProps } from './types';

/**
 * A rule or group of a variant on the details, read-only, with its identifier next to its name
 * (W1). A group shows through the Rules step's frame, with its AND or OR between its members and
 * its own message (F26).
 */
export default function SummaryItem({ item, context, depth }: SummaryItemProps) {
  if (item.type === 'rule') {
    return <RuleRow rule={item} context={context} showIdentifier />;
  }
  return (
    <GroupFrame
      group={item}
      subGroup={depth > 0}
      showIdentifier
      members={item.items.map((member) => ({
        key: member.id,
        node: <SummaryItem item={member} context={context} depth={depth + 1} />,
      }))}
    />
  );
}
