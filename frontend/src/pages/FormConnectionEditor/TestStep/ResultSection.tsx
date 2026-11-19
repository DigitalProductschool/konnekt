import { noRulesNoteOf } from '@connection-portal/rules/personas/messages';
import { useId } from 'react';

import { useLanguage } from '../../../hooks/useLanguage';
import CardScrollArea from './CardScrollArea';
import ResultList from './ResultList';
import TestDayLine from './TestDayLine';
import type { ResultSectionProps } from './types';

/**
 * The selected persona's results for the shown variant (S8.6; F3, F14, W10; FR-014, FR-015,
 * FR-018; Figma "Result" 7057:58809, U71 7058:61454): white, 1px border, 8px radius, 16px padding,
 * 8px gaps, filling the width beside the data card and the panel's height (U65 7057:58766).
 * - The head (V5 "Title + tested date" 7599:61799 in 7599:55810), 48px, two lines without a gap:
 *   the heading in title/small, "Result: meets the rules" or the count of reported items (W10),
 *   then the test day in body/small muted, "Tested as if shared today, 19.11.2026"
 *   (`TestDayLine`; test-results-v5 R1, which moves it here from above the variant tabs). It grows
 *   when either wraps. Nothing above it: a variant that no citizen can meet says so on its tab
 *   only (CLAR #50, FR-041e; 004-S8.6.1's line dropped).
 * - The rows (`ResultList`), or, for a variant without rules, Figma's note (U70 7057:61658):
 *   "School transport has no rules yet, so every citizen meets it. Add rules in the Rules step to
 *   test them." (`noRulesNoteOf()`), without the frame's success box (F41), under the same head.
 *
 * Where the wizard pins its step header and the cards sit side by side, the card is as high as the
 * panel and its rows scroll under the head that stays put (`CardScrollArea`; spec 008 FR-043 as
 * clarified on 2026-11-18, V5 frame 15 7599:57632, reversing CLAR #31 (c)).
 *
 * The card is a container, so that a row's message can ask how wide it is (`RuleMessage`'s
 * hanging layout; quickstart V9: at 320px nothing is cut off).
 */
export default function ResultSection({ view, branch, today }: ResultSectionProps) {
  const { language } = useLanguage();
  const headingId = useId();
  return (
    <div className="rounded-kern-default bg-kern-layout-background-default @container flex min-w-0 flex-1 flex-col gap-8 border border-(--kern-color-decorative-border-default) p-16">
      {view && (
        <>
          <div className="flex min-h-48 flex-col justify-center">
            <h2
              id={headingId}
              className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words"
            >
              {view.heading}
            </h2>
            <TestDayLine today={today} />
          </div>
          <CardScrollArea labelledBy={headingId}>
            {view.rows.length === 0 ? (
              <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
                {noRulesNoteOf(branch.name, language)}
              </p>
            ) : (
              <ResultList rows={view.rows} />
            )}
          </CardScrollArea>
        </>
      )}
    </div>
  );
}
