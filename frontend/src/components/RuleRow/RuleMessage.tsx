import { useCopy } from '../../hooks/useLanguage';
import { HANGING_MESSAGE, RULE_ROW_COPY, SMALL_TEXT } from './constants';
import type { RuleMessageProps } from './types';

/**
 * Figma "Rules/Error message" (6092:3506): what the citizen reads when the rule isn't met, after
 * "Message for citizens:" in `label/small` muted, 8px apart, in `body/small` (C2). It wraps
 * under its label on a narrow row. `hanging` (the test step's result rows; V5 "Long rules"
 * 7644:65780) keeps the label on one line and wraps the message beside it where the container is
 * wide enough (`HANGING_MESSAGE`).
 */
export default function RuleMessage({ message, hanging = false }: RuleMessageProps) {
  const copy = useCopy(RULE_ROW_COPY);
  return (
    <p
      className={`${SMALL_TEXT} text-kern-layout-text-default break-words ${hanging ? HANGING_MESSAGE.line : ''}`}
    >
      <span
        className={`text-kern-layout-text-muted mr-8 font-semibold ${hanging ? HANGING_MESSAGE.label : ''}`}
      >
        {copy.messageLabel}
      </span>
      {hanging ? <span className={HANGING_MESSAGE.message}>{message}</span> : message}
    </p>
  );
}
