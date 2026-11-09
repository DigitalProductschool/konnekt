import { useId } from 'react';

import { DETAIL_COPY } from './constants';
import SummaryDocument from './SummaryDocument';
import type { DocumentsSummaryProps } from './types';

/**
 * The Summary's documents part (S15; U82 6396:48198, U03 #28): "Documents" in action blue
 * (`title/small` 16/24 600), then each requested document 24px apart with its data items as
 * chips. A draft's may have none yet, or a document without fields (S6).
 */
export default function DocumentsSummary({ documents, draft = false }: DocumentsSummaryProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-24">
      <h3
        id={titleId}
        className="text-kern-static-medium text-kern-action-default leading-(--kern-typography-line-height-medium-static) font-semibold"
      >
        {DETAIL_COPY.documentsTitle}
      </h3>
      {draft && documents.length === 0 ? (
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {DETAIL_COPY.noDocumentsYet}
        </p>
      ) : (
        <ul className="flex flex-col gap-24">
          {documents.map((document) => (
            <SummaryDocument key={document.document_type} document={document} draft={draft} />
          ))}
        </ul>
      )}
    </section>
  );
}
