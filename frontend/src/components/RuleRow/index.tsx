import { statementOf, statementPartsOf } from '@connection-portal/rules/statements';

import BranchMark from '../BranchMark';
import { BRANCH_MARK_TINTS, INACTIVE_OPACITY } from '../BranchMark/constants';
import FindingNote from '../FindingNote';
import { FINDING_LOOKS, FINDING_NOTE_ID_SUFFIX } from '../FindingNote/constants';
import { ROW_FRAME } from './constants';
import ProblemNote from './ProblemNote';
import RuleMessage from './RuleMessage';
import RuleName from './RuleName';
import RuleSentence from './RuleSentence';
import type { RuleRowProps } from './types';

/**
 * Figma "Rules/Rule row" (6083:3453; U30 6348:40889, U43 6168:7017, U82 6650:37780): a saved
 * rule with its name, its statement in the design's form "<document> · <data> <check> <values>"
 * (C3) with the symbol and value chips, and "Message for citizens:" with its message (C2). The
 * rules step passes the ⋯ menu and inline renaming; the details pass none and show the
 * identifier ("rule-7", F35), where the empty actions column keeps its 32px as U82 draws it. A
 * rule kept incomplete reads as far as it goes.
 *
 * States: with a problem, the row sits in a red outline with the note under it (U44 6171:7487, U27
 * 6197:10704); with a finding of spec 003, in the finding's outline with its note (F4), and a
 * problem wins over a finding (W11). In a variant based on Standard, its mark shows left of the ⋯
 * (FR-023): a changed or added rule is tinted; a removed one keeps its mark and ⋯ while its name,
 * statement and message fade to 40 % and the statement and message are struck through (U47
 * 6185:8570); the message line and a "Changed here" mark stay (F36, FR-040). A member of a removed
 * or dissolved group (`faded`; a dissolved group shows as removed) fades and strikes its content
 * the same way (U47 6185:41168) and keeps its mark: the group fades no box around its members
 * (T025, V6). In select mode the step passes the rule's checkbox (U36 6344:53557); the selected row
 * itself is drawn unchanged. A linked rule shows no link icon (002-S4.31, CLAR 2026-11-07 #24 (b)).
 * A flagged row that takes the focus, after a refused Publish, is described by its problem. Nothing
 * in the row clips or transforms, so the ⋯ menu opens over it (V6).
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
  selectBox,
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
    ? 'border border-kern-feedback-danger'
    : shownFinding
      ? `border ${FINDING_LOOKS[shownFinding.kind].outline}`
      : '';
  const frame = [ROW_FRAME, tint || 'bg-kern-layout-background-default', outline].join(' ');
  const inactive = removed || faded;
  const struck = inactive ? 'line-through' : undefined;
  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-describedby={problemId ?? findingId}
      className={`focus-visible:outline-kern-action-focus-default focus-visible:outline-4 focus-visible:-outline-offset-4 ${framed ? 'px-8' : ''}`}
    >
      {selectBox}
      <div className={framed ? frame : undefined}>
        <div className="flex items-start gap-16 py-8 pr-16 pl-24">
          <div className={`flex min-w-0 flex-1 flex-col gap-4 ${inactive ? INACTIVE_OPACITY : ''}`}>
            {nameSlot ?? (
              <RuleName name={rule.name} identifier={showIdentifier ? rule.id : undefined} />
            )}
            {parts && (
              <div className={struck}>
                <RuleSentence parts={parts} text={text} />
              </div>
            )}
            {message && (
              <div className={struck}>
                <RuleMessage message={message} />
              </div>
            )}
          </div>
          <div className="flex min-h-32 min-w-32 shrink-0 items-center justify-end gap-8">
            {mark && <BranchMark mark={mark} />}
            {actions}
          </div>
        </div>
        {flag && <ProblemNote id={problemId} message={flag} />}
        {shownFinding && (
          <FindingNote id={findingId} kind={shownFinding.kind} text={shownFinding.text} />
        )}
      </div>
    </div>
  );
}
