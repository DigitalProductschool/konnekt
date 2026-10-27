import { RULE_ROW_COPY } from './constants';
import type { RuleNameProps } from './types';

/** The rule's name in Figma's blue label, and on the details its identifier (W1). */
export default function RuleName({ name, identifier }: RuleNameProps) {
  return (
    <p className="text-kern-static-small flex flex-wrap items-center gap-x-8 leading-(--kern-typography-line-height-medium-static)">
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
