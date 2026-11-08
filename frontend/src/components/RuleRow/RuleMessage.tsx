import { RULE_ROW_COPY, SMALL_TEXT } from './constants';
import type { RuleMessageProps } from './types';

/**
 * Figma "Rules/Error message" (6092:3506): what the citizen reads when the rule isn't met, after
 * "Message for citizens:" in `label/small` muted, 8px apart, in `body/small` (C2). It wraps
 * under its label on a narrow row.
 */
export default function RuleMessage({ message }: RuleMessageProps) {
  return (
    <p className={`${SMALL_TEXT} text-kern-layout-text-default break-words`}>
      <span className="text-kern-layout-text-muted mr-8 font-semibold">
        {RULE_ROW_COPY.messageLabel}
      </span>
      {message}
    </p>
  );
}
