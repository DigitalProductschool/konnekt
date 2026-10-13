import { EDITOR_COPY } from './constants';
import DocumentPickerItem from './DocumentPickerItem';
import type { DocumentPickerProps } from './types';
import UpcomingDocuments from './UpcomingDocuments';

/**
 * Figma "Doc/Panel": the catalog's documents, each of which can be added once and removed
 * again, and the documents still to come to the wallet. From 1024 px it sticks to the top of
 * the wizard's scrolling area, and scrolls itself when it is taller than that area.
 */
export default function DocumentPicker({
  documentTypes,
  documents,
  errorId,
  onAdd,
  onRemove,
}: DocumentPickerProps) {
  return (
    <section
      aria-labelledby="document-picker-title"
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex w-full shrink-0 flex-col gap-4 border p-8 lg:sticky lg:top-0 lg:max-h-[calc(100cqh-40px)] lg:w-296 lg:overflow-y-auto"
    >
      <h2
        id="document-picker-title"
        className="text-kern-static-small text-kern-layout-text-muted px-10 pt-8 pb-4 leading-(--kern-typography-line-height-medium-static) font-semibold"
      >
        {EDITOR_COPY.available}
      </h2>
      <ul className="flex flex-col gap-4">
        {documentTypes.map((documentType) => (
          <DocumentPickerItem
            key={documentType.key}
            documentType={documentType}
            added={documents.some((document) => document.document_type === documentType.key)}
            describedBy={errorId}
            onAdd={() => onAdd(documentType)}
            onRemove={() => onRemove(documentType)}
          />
        ))}
      </ul>
      <div aria-hidden="true" className="h-40" />
      <div aria-hidden="true" className="bg-kern-neutral-100 h-1" />
      <UpcomingDocuments />
    </section>
  );
}
