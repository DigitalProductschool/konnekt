import { RULES_COPY } from './constants';
import type { UnrequestedRuleLineProps } from './types';

/** One rule of the problems banner (F11). */
export default function UnrequestedRuleLine({ ruleName, branchName }: UnrequestedRuleLineProps) {
  return <p>{RULES_COPY.unrequestedText(ruleName.trim(), branchName.trim())}</p>;
}
