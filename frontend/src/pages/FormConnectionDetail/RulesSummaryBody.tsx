import { memo, useId } from 'react';

import { useLanguage } from '../../hooks/useLanguage';
import { CONNECTION_DETAIL_COPY } from './constants';
import DocumentsSummary from './DocumentsSummary';
import RulesSummaryContent from './RulesSummaryContent';
import type { RulesSummaryBodyProps } from './types';

/**
 * The Summary's open part (S15): the documents part, a 1px line in action blue at 30 %, then
 * "Rules" with the variants as tabs and the findings (`RulesSummaryContent`), 24px apart.
 *
 * Memoised, and it doesn't take the page's download (spec 011, T050; design-notes 8.2 D10): a
 * run's state changes (busy, rendering, saved) render only the header's `PdfDownload`, not the
 * largest connection's 20 variants of 200 items again (FR-003, SC-001). Its props are the
 * connection's `branches` and `documents` and the memoised `context` and `checkDocuments`, so it
 * renders again only when the shown connection or the language changes
 */
function RulesSummaryBody({
  branches,
  documents,
  draft,
  context,
  checkDocuments,
}: RulesSummaryBodyProps) {
  const rulesTitleId = useId();
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];

  return (
    <div className="flex flex-col gap-24 px-24 pb-24">
      <DocumentsSummary documents={documents} draft={draft} />
      {/* U82 6396:48221: decorative, between the two parts */}
      <div aria-hidden="true" className="bg-kern-action-default h-px opacity-30" />
      <section aria-labelledby={rulesTitleId} className="flex flex-col gap-24">
        <h3
          id={rulesTitleId}
          className="text-kern-static-medium text-kern-action-default leading-(--kern-typography-line-height-medium-static) font-semibold"
        >
          {copy.rulesTitle}
        </h3>
        <RulesSummaryContent
          branches={branches}
          context={context}
          checkDocuments={checkDocuments}
        />
      </section>
    </div>
  );
}

export default memo(RulesSummaryBody);
