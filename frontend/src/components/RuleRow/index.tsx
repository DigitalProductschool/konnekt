import { statementOf, statementPartsOf } from '@connection-portal/rules/statements';

import BranchMark from '../BranchMark';
import { BRANCH_MARK_TINTS, INACTIVE_OPACITY } from '../BranchMark/constants';
import FindingNote from '../FindingNote';
import { FINDING_LOOKS, FINDING_NOTE_ID_SUFFIX } from '../FindingNote/constants';
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
 * 6197:10704; F11). In a variant based on Standard, its mark shows left of the ⋯ (FR-023): a
 * changed or added rule is tinted (U17 6134:9009, 6134:9064), a removed one faded and struck
 * through (U18 6163:5856). A flagged row that takes the focus, after a refused Publish, is
 * described by its problem. In the Rules step, a rule with a finding of spec 003 is outlined in
 * the finding's colour with its note under it, and described by the note (S2; FR-012; F4; U01
 * 6171:7008, 6171:7022). Its branch mark stays beside it; a problem wins over a finding (W11).
 */
export default function RuleRow({
  id,
  rule,
  context,
  nameSlot,
  showIdentifier = false,
  flag,
  finding = null,
  actions,
  mark = null,
  faded = false,
}: RuleRowProps) {
  const parts = statementPartsOf(rule, context);
  const text =
    statementOf(rule, context)?.text ?? (parts ? `${parts.document} · ${parts.data}` : '');
  const message = rule.message.trim();
  const tint = mark ? BRANCH_MARK_TINTS[mark] : '';
  // A rule with a problem carries no finding (W11)
  const shownFinding = flag ? null : finding;
  const framed = Boolean(flag || tint || shownFinding);
  const removed = mark === 'removed';
  const problemId = flag && id ? `${id}-problem` : undefined;
  const findingId = shownFinding && id ? `${id}${FINDING_NOTE_ID_SUFFIX}` : undefined;
  const outline = flag
    ? 'border-kern-feedback-danger border'
    : shownFinding
      ? `${FINDING_LOOKS[shownFinding.kind].outline} border`
      : '';
  const frame = ['rounded-kern-default', tint || 'bg-kern-layout-background-default', outline].join(
    ' '
  );
  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-describedby={problemId ?? findingId}
      className={`focus-visible:outline-kern-action-focus-default focus-visible:outline-4 focus-visible:-outline-offset-4 ${framed ? 'px-8' : ''}`}
    >
      <div className={framed ? frame : undefined}>
        <div className="flex items-start gap-16 py-8 pr-16 pl-24">
          <div
            className={`flex min-w-0 flex-1 flex-col gap-4 ${removed && !faded ? INACTIVE_OPACITY : ''}`}
          >
            {nameSlot ?? (
              <RuleName name={rule.name} identifier={showIdentifier ? rule.id : undefined} />
            )}
            {parts && (
              <div className={removed ? 'line-through' : undefined}>
                <RuleSentence parts={parts} text={text} />
              </div>
            )}
            {message && (
              <div className={removed ? 'line-through' : undefined}>
                <RuleMessage message={message} />
              </div>
            )}
          </div>
          {(mark || actions) && (
            <div className="flex shrink-0 items-center gap-8">
              {mark && <BranchMark mark={mark} />}
              {actions}
            </div>
          )}
        </div>
        {flag && <ProblemNote id={problemId} message={flag} />}
        {shownFinding && (
          <FindingNote id={findingId} kind={shownFinding.kind} text={shownFinding.text} />
        )}
      </div>
    </div>
  );
}
