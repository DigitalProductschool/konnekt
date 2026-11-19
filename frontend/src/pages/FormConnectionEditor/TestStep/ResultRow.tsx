import { outcomeNameOf } from '@connection-portal/rules/personas/messages';

import { RULE_ROW_COPY } from '../../../components/RuleRow/constants';
import RuleMessage from '../../../components/RuleRow/RuleMessage';
import RuleSentence from '../../../components/RuleRow/RuleSentence';
import { useLanguage } from '../../../hooks/useLanguage';
import {
  MEMBER_INDENT,
  RESULT_NAME_COLOURS,
  RESULT_STATUS_ICONS,
  TEST_STEP_COPY,
} from './constants';
import MemberRows from './MemberRows';
import type { ResultRowProps } from './types';
import { resultStatementOf } from './utils';

/**
 * One result row (S8.6; FR-015, W10; test-results-v5 R2, R3; V5 "Rules/Rule row" in frame 1
 * 7599:55832, frame 15 7599:57665, "Long rules" 7644:65780): 12px across and 8px down, a 1px
 * decorative divider under it, no tint (the frames draw none, also on failing rows). The status
 * icon in a 20 × 24 box, 8px, then a column 2px apart:
 * - the item's name in label/default, red when not met, green when met, in the default colour when
 *   it couldn't be checked, with its status after it: "Not met" and "Met" as hidden text, as the
 *   icon and the colour show them; "Couldn’t be checked" in small muted text, since nothing else
 *   says that the data was missing (the frames draw none: spec 004 F8 kept);
 * - its statement as the rules step words it: `RuleSentence`, or a group's "All rules must be met"
 *   / "At least one rule must be met" (`resultStatementOf()`);
 * - "Message for citizens:" with its message, met or not, as the rules step shows it under the
 *   item (`RuleMessage`, hanging beside its label in a wide card). A rule in a group whose message
 *   citizens read instead says so, as on the rules step (F32); a group without a message, or a
 *   sub-group inside a group with one, shows no line.
 *
 * A reported group's members follow it, indented by 28px per level, so that a member's icon sits
 * under its group's name (W10). No success message under a met variant (F41)
 */
export default function ResultRow({ row, depth }: ResultRowProps) {
  const { language } = useLanguage();
  const copy = TEST_STEP_COPY[language];
  const message =
    row.messageGroup !== null
      ? row.type === 'rule'
        ? RULE_ROW_COPY[language].notShownInGroup(row.messageGroup)
        : null
      : row.message;
  return (
    <li>
      <div
        className={`flex items-start gap-8 border-b border-(--kern-color-decorative-border-default) py-8 pr-12 ${MEMBER_INDENT[Math.min(depth, MEMBER_INDENT.length - 1)]}`}
      >
        <span aria-hidden="true" className="flex h-24 w-20 shrink-0 items-center justify-center">
          <span className={`kern-icon ${RESULT_STATUS_ICONS[row.status]} kern-icon--small`} />
        </span>
        {/*
         * The statement's parts (`RuleSentence`) may break inside a word that is wider than the
         * column, as a German catalog label is at 320 px ("Personalausweis", spec 009 R9)
         */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 [&_p>span]:min-w-0 [&_p>span]:break-words">
          <p className="text-kern-static-medium flex flex-wrap items-baseline gap-x-8 leading-(--kern-typography-line-height-medium-static)">
            <span className={`${RESULT_NAME_COLOURS[row.status]} font-semibold break-words`}>
              {row.name}
            </span>
            {row.status === 'not_checked' ? (
              <span className="text-kern-static-small text-kern-layout-text-muted">
                {outcomeNameOf(row.status, language)}
              </span>
            ) : (
              <span className="sr-only">
                {row.status === 'met' ? copy.met : outcomeNameOf(row.status, language)}
              </span>
            )}
          </p>
          {row.parts ? (
            <RuleSentence parts={row.parts} text={row.statement} />
          ) : (
            <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
              {resultStatementOf(row, language)}
            </p>
          )}
          {message !== null && <RuleMessage message={message} hanging />}
        </div>
      </div>
      <MemberRows members={row.members} depth={depth + 1} />
    </li>
  );
}
