import { DETAIL_COPY } from './constants';
import SummaryDocument from './SummaryDocument';
import type { DocumentsSummaryProps } from './types';

/**
 * The configuration summary, which the design has no frame for: the requested documents. A
 * draft's may have none yet, or a document without fields (S6).
 */
export default function DocumentsSummary({ documents, draft = false }: DocumentsSummaryProps) {
  return (
    <section
      aria-labelledby="documents-title"
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default border"
    >
      <div className="border-kern-neutral-100 flex flex-col gap-2 border-b px-24 pt-24 pb-20">
        <h2
          id="documents-title"
          className="text-kern-adaptive-medium text-kern-layout-text-default font-semibold"
        >
          {DETAIL_COPY.documentsTitle}
        </h2>
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {DETAIL_COPY.documentsHint}
        </p>
      </div>
      {draft && documents.length === 0 ? (
        <p className="text-kern-static-medium text-kern-layout-text-muted px-24 py-16">
          {DETAIL_COPY.noDocumentsYet}
        </p>
      ) : (
        <ul>
          {documents.map((document) => (
            <SummaryDocument key={document.document_type} document={document} draft={draft} />
          ))}
        </ul>
      )}
    </section>
  );
}
