import { useMemo } from 'react';

import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import { DETAIL_COPY } from '../FormConnectionDetail/constants';
import DocumentsSummary from '../FormConnectionDetail/DocumentsSummary';
import RulesSummaryContent from '../FormConnectionDetail/RulesSummaryContent';
import { draftRuleDocumentsOf } from '../FormConnectionDetail/utils';
import DescriptionLine from './DescriptionLine';
import type { PublishSummaryProps } from './types';

/**
 * The publish step's summary, as the details page shows a draft (S3 "Body", `publish`): the
 * description line, the documents with their fields, and every variant's rules, open, rules on
 * data the draft doesn't request included, which the catalog names as on the details page.
 */
export default function PublishSummary({ draft }: PublishSummaryProps) {
  // Until the catalog loads, or if it fails, the statements name only the requested documents
  const { documentTypes } = useDocumentTypes();
  const context = useMemo(
    () => ({ documents: draftRuleDocumentsOf(draft.documents, documentTypes), optionSets: [] }),
    [draft.documents, documentTypes]
  );

  return (
    <div className="flex flex-col gap-32">
      {draft.description && <DescriptionLine description={draft.description} />}
      <DocumentsSummary documents={draft.documents} draft />
      <section
        aria-labelledby="approval-rules-title"
        className="rounded-kern-large bg-kern-layout-background-default flex flex-col gap-24 border border-(--kern-color-decorative-border-default) p-24"
      >
        <h2
          id="approval-rules-title"
          className="text-kern-adaptive-medium text-kern-layout-text-default font-semibold"
        >
          {DETAIL_COPY.rulesTitle}
        </h2>
        <RulesSummaryContent branches={draft.branches} context={context} />
      </section>
    </div>
  );
}
