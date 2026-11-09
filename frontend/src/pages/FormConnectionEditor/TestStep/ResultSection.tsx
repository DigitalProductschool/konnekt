import { noRulesNoteOf } from '@connection-portal/rules/personas/messages';

import ResultTable from './ResultTable';
import type { ResultSectionProps } from './types';

/**
 * The selected persona's results for the shown variant (S8.6; F3, F14, W10; FR-014, FR-015,
 * FR-018; Figma "Result" 7057:58809, U71 7058:61454): white, 1px border, 8px radius, 16px padding,
 * 8px gaps, filling the width beside the data card and the panel's height (U65 7057:58766).
 * - The heading (U01 7057:58811, U07 7058:61454), title/small in a 48px row: "Result: meets the
 *   rules" or the count of reported items (W10). Nothing above it: a variant that no citizen can
 *   meet says so on its tab only (CLAR #50, FR-041e; 004-S8.6.1's line dropped).
 * - The rows (`ResultTable`), or, for a variant without rules, Figma's note (U70 7057:61658):
 *   "School transport has no rules yet, so every citizen meets it. Add rules in the Rules step to
 *   test them." (`noRulesNoteOf()`), without the frame's success box (F41).
 *
 * The card is a container, so that the table can ask how wide it is (`ResultTable`; quickstart V9:
 * at 320px nothing is cut off).
 */
export default function ResultSection({ view, branch }: ResultSectionProps) {
  return (
    <div className="rounded-kern-default bg-kern-layout-background-default @container flex min-w-0 flex-1 flex-col gap-8 border border-(--kern-color-decorative-border-default) p-16">
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
