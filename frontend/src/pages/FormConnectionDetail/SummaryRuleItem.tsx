import Connector from '../../components/Connector';
import RuleRow from '../../components/RuleRow';
import type { SummaryRuleItemProps } from './types';

/** A rule of a variant on the details, after its level's AND or OR (F26), with its identifier. */
export default function SummaryRuleItem({ rule, context, operator, first }: SummaryRuleItemProps) {
  return (
    <li>
      {!first && <Connector operator={operator} />}
      <RuleRow rule={rule} context={context} showIdentifier />
    </li>
  );
}
