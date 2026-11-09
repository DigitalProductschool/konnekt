import { RULE_ROW_COPY, SMALL_TEXT } from './constants';
import type { RuleNameProps } from './types';

/**
 * Figma "Rules/Rule row" › "Name row" (6083:3455): the rule's name in `label/small` (14/24, 600)
 * in the action blue, and on the details its identifier 8px after it in `body/small` muted
 * ("rule-7", F35; the design draws no identifier).
 */
export default function RuleName({ name, identifier }: RuleNameProps) {
  return (
    <p className={`${SMALL_TEXT} flex flex-wrap items-center gap-x-8`}>
      <span className="text-kern-action-default font-semibold break-words">{name}</span>
      {identifier && (
        <span className="text-kern-layout-text-muted">
          <span className="sr-only">{RULE_ROW_COPY.identifier} </span>
          {identifier}
        </span>
      )}
    </p>
  );
}
