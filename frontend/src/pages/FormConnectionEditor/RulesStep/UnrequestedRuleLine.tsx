import { RULES_COPY } from './constants';
import type { UnrequestedRuleLineProps } from './types';

/**
 * One rule of the problems banner (F11), on a line of its own. A block span, not a paragraph:
 * `KernAlert` puts its content in a `<p>`, which can't hold another.
 */
export default function UnrequestedRuleLine({ ruleName, branchName }: UnrequestedRuleLineProps) {
  return (
    <span className="block">{RULES_COPY.unrequestedText(ruleName.trim(), branchName.trim())}</span>
  );
}
