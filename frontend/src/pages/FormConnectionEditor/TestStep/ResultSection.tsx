import { noticeText } from '@connection-portal/rules/checks/findingMessages';
import { noRulesNoteOf } from '@connection-portal/rules/personas/messages';

import ResultTable from './ResultTable';
import type { ResultSectionProps } from './types';

/**
 * The selected persona's results for the shown variant (S8.6; F3, F6, F14, W10; FR-014, FR-015,
 * FR-018; Figma "Result" 7057:58809): white, 1px border, 8px radius, 16px padding, 8px gaps,
 * filling the width beside the data card.
 * - For a variant that no applicant can meet, spec 003's notice "No applicant can meet the rules
 *   of Standard." first, in the findings banner's warning look (F6; no frame).
 * - The heading (U01 7057:58811, U07 7058:61454), title/small in a 48px row: "Result: meets the
 *   rules" or the count of reported items (W10).
 * - The rows (`ResultTable`), or, for a variant without rules, Figma's note (U06 7057:61658).
 *
 * The card is a container, so that the table can ask how wide it is (`ResultTable`; quickstart V9:
 * at 320px nothing is cut off).
 */
export default function ResultSection({ view, branch, check }: ResultSectionProps) {
  const notice = check?.notice?.kind === 'none_can_meet' ? check.notice : null;
  return (
    <div className="rounded-kern-large bg-kern-layout-background-default @container flex min-w-0 flex-1 flex-col gap-8 border border-(--kern-color-decorative-border-default) p-16">
      {notice && (
        <div className="rounded-kern-default bg-kern-feedback-warning-background border-kern-feedback-warning flex items-start gap-8 border py-8 pr-8 pl-16">
          <span
            aria-hidden="true"
            className="kern-icon kern-icon--warning bg-kern-feedback-warning! kern-icon--small mt-2 shrink-0"
          />
          <p className="text-kern-static-small text-kern-layout-text-default min-w-px flex-1 leading-(--kern-typography-line-height-medium-static) break-words">
            {noticeText(notice, branch.name)}
          </p>
        </div>
      )}
      {view && (
        <>
          <div className="flex min-h-48 items-center">
            <h2 className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words">
              {view.heading}
            </h2>
          </div>
          {view.rows.length === 0 ? (
            <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
              {noRulesNoteOf(branch.name)}
            </p>
          ) : (
            <ResultTable view={view} />
          )}
        </>
      )}
    </div>
  );
}
