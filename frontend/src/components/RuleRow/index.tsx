import { statementOf, statementPartsOf } from '../../utils/rules/statements';
import ProblemNote from './ProblemNote';
import RuleMessage from './RuleMessage';
import RuleName from './RuleName';
import RuleSentence from './RuleSentence';
import type { RuleRowProps } from './types';

/**
 * Figma "Rules/Rule row" (U12 6350:41102, S2, S6): a saved rule, read-only, with its name, its
 * statement in FR-005's words (F1, F5, F8) and its error message. The Rules step adds its ⋯ menu
 * and inline renaming; the details show the identifier (W1). A rule kept incomplete reads as far
 * as it goes. With a problem, the row is outlined in red with the message under it (U27
 * 6197:10704; F11).
 */
export default function RuleRow({
  id,
  rule,
  context,
  nameSlot,
  showIdentifier = false,
  flag,
  actions,
}: RuleRowProps) {
  const parts = statementPartsOf(rule, context);
  const text =
    statementOf(rule, context)?.text ?? (parts ? `${parts.document} – ${parts.data}` : '');
  const message = rule.message.trim();
  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      className={`focus-visible:outline-kern-action-focus-default focus-visible:outline-4 focus-visible:-outline-offset-4 ${flag ? 'px-8' : ''}`}
    >
      <div
        className={
          flag
            ? 'rounded-kern-default border-kern-feedback-danger bg-kern-layout-background-default overflow-hidden border'
            : undefined
        }
      >
        <div className="flex items-start gap-16 py-8 pr-16 pl-24">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {nameSlot ?? (
              <RuleName name={rule.name} identifier={showIdentifier ? rule.id : undefined} />
            )}
            {parts && <RuleSentence parts={parts} text={text} />}
            {message && <RuleMessage message={message} />}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-8">{actions}</div>}
        </div>
        {flag && <ProblemNote message={flag} />}
      </div>
    </div>
  );
}
