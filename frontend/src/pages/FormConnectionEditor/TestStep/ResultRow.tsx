import RuleSentence from '../../../components/RuleRow/RuleSentence';
import { MEMBER_INDENT, RESULT_STATUS_LOOKS, TEST_STEP_COPY } from './constants';
import MemberRows from './MemberRows';
import type { ResultRowProps } from './types';
import { resultStatementOf } from './utils';

/**
 * One result row (S8.6; F8, F14, W10; FR-015; spec 008 F42, FR-043, C3; Figma rows of U65
 * 7057:58825, 7057:59239): the status icon, 12px, then the item's name, its statement (spec 008
 * keeps it, F42, where the frames draw none) as the rules step words it, `RuleSentence` with "·"
 * after the document (C3), or a group's "All rules must be met" / "At least one rule must be met"
 * (`resultStatementOf()`), and, unless met, its status "Not met" or "Couldn’t be checked" as text
 * (F42); then, with a message column, its message, or "–" in muted text. A reported row is tinted
 * in the danger background, 10px above and below, its name in label/default; the other rows have
 * 8px and body/default names. A met row's check icon has hidden text in place of a status. A
 * reported group's members follow it, indented by 32px per level and tinted like it (W10). 1px
 * decorative divider under each row. No success message under a met variant (F41)
 */
export default function ResultRow({ row, depth, messageColumn }: ResultRowProps) {
  const look = RESULT_STATUS_LOOKS[row.status];
  const tinted = row.reported || depth > 0;
  const padding = tinted ? 'py-10' : 'py-8';
  return (
    <>
      <tr
        className={`border-b border-(--kern-color-decorative-border-default) ${tinted ? 'bg-kern-feedback-danger-background' : ''}`}
      >
        <td className={`${padding} pl-8 align-top ${messageColumn ? '' : 'pr-8'}`}>
          <div
            className={`flex items-start gap-12 ${MEMBER_INDENT[Math.min(depth, MEMBER_INDENT.length - 1)]}`}
          >
            <span
              aria-hidden="true"
              className={`kern-icon ${look.icon} kern-icon--small shrink-0`}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <p
                className={`text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) break-words ${row.reported ? 'font-semibold' : ''}`}
              >
                {row.name}
              </p>
              {row.parts ? (
                <RuleSentence parts={row.parts} text={row.statement} />
              ) : (
                <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
                  {resultStatementOf(row)}
                </p>
              )}
              {look.text ? (
                <p className="text-kern-static-small text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static)">
                  {look.text}
                </p>
              ) : (
                <p className="sr-only">{TEST_STEP_COPY.met}</p>
              )}
            </div>
          </div>
        </td>
        {messageColumn && (
          <td
            className={`${padding} text-kern-static-small pr-8 pl-12 align-top leading-(--kern-typography-line-height-medium-static) break-words ${row.message ? 'text-kern-layout-text-default' : 'text-kern-layout-text-muted'}`}
          >
            {row.message ?? TEST_STEP_COPY.noMessage}
          </td>
        )}
      </tr>
      <MemberRows members={row.members} depth={depth + 1} messageColumn={messageColumn} />
    </>
  );
}
