import { RULE_ROW_COPY } from './constants';
import type { RuleMessageProps } from './types';

/** Figma "Rules/Error message": what the applicant reads when the rule isn't met. */
export default function RuleMessage({ message }: RuleMessageProps) {
  return (
    <p className="text-kern-static-small text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static)">
      <span className="text-kern-layout-text-muted mr-8 font-semibold">
        {RULE_ROW_COPY.messageLabel}
      </span>
      {message}
    </p>
  );
}
