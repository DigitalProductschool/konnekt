import { REMOVE_DATA_COPY } from './constants';
import type { RemovedDataRuleItemProps } from './types';

/** One rule that the removal dialog names, with its variant: "Rule 01 in Standard" (F18). */
export default function RemovedDataRuleItem({ rule }: RemovedDataRuleItemProps) {
  return <li>{REMOVE_DATA_COPY.rule(rule.ruleName, rule.branchName)}</li>;
}
