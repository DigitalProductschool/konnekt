import { DETAIL_COPY } from './constants';
import SummaryDocument from './SummaryDocument';
import type { DocumentsSummaryProps } from './types';

/** The configuration summary, which the design has no frame for: the requested documents. */
export default function DocumentsSummary({ documents }: DocumentsSummaryProps) {
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
      <ul>
        {documents.map((document) => (
          <SummaryDocument key={document.document_type} document={document} />
        ))}
      </ul>
    </section>
  );
}
