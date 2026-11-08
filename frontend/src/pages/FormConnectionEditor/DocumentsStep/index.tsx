import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import FeedbackLoader from '../../../components/FeedbackLoader';
import CatalogDroppedNote from '../CatalogDroppedNote';
import { EDITOR_COPY } from '../constants';
import { offeredFieldsOf } from '../utils';
import DocumentDetail from './DocumentDetail';
import DocumentsList from './DocumentsList';
import EmptyPanel from './EmptyPanel';
import type { DocumentsStepProps } from './types';
import { documentsNeedingData, listedDocumentsOf, pagerOf, shownDocumentOf } from './utils';

/**
 * Step 2 (S8; Figma U20, U21; FR-031, research R8), under the step head: a master-detail. On the
 * left the added documents with "Add document" and its search card; on the right the shown
 * document's data items with the pager "Document n of m", or the empty panel while none is
 * added. What it shows (the shown document, the search) is the view the editor holds
 * (`documentsViewReducer`); the documents and their data stay the editor's, in catalog order.
 *
 * The documents "Set rules →" flagged as having no data, while they still have none, show in red
 * (F67, U25 A14): the list's "1 document needs data", their items and the shown one's header.
 *
 * Data the catalog no longer offers (005-S8, W6) is listed in a note above the panels. The panels
 * show only what the catalog offers: a dropped document has no item, and a dropped data item is
 * neither shown nor counted. Ticking "All data items" keeps it, so that it goes only through the
 * note's "Remove it". The step is the box a search card spans where it fits on neither side of
 * its button (R10).
 */
export default function DocumentsStep({
  catalogStatus,
  documentTypes,
  documents,
  dropped,
  droppedNoteRef,
  onRemoveDropped,
  onRetryCatalog,
  view,
  dispatchView,
  onAdd,
  onRemove,
  onSetField,
  onSetAllFields,
}: DocumentsStepProps) {
  if (catalogStatus === 'loading') {
    return <FeedbackLoader label={EDITOR_COPY.loadingCatalog} />;
  }
  if (catalogStatus === 'failed') {
    return (
      <div className="flex flex-col items-start gap-16">
        <KernAlert variant="danger" title={EDITOR_COPY.catalogErrorTitle} className="w-full">
          {EDITOR_COPY.catalogErrorText}
        </KernAlert>
        <button type="button" onClick={onRetryCatalog} className="kern-btn kern-btn--secondary">
          <span className="kern-label">{EDITOR_COPY.retry}</span>
        </button>
      </div>
    );
  }

  const listed = listedDocumentsOf(documents, documentTypes);
  const pager = pagerOf(view.selectedIndex, listed.length);
  const shown = shownDocumentOf(listed, view.selectedIndex);
  // Marked once the dialog about them has closed (U25 A13 draws the step unmarked behind it)
  const needingData = view.needsData.asking
    ? []
    : documentsNeedingData(view.needsData.documentIds, documents, documentTypes);
  const select = (index: number) => dispatchView({ type: 'select', index });

  return (
    <div className="relative flex flex-col gap-24">
      {dropped.length > 0 && (
        <CatalogDroppedNote ref={droppedNoteRef} items={dropped} onRemove={onRemoveDropped} />
      )}
      <div className="flex flex-col gap-24 lg:flex-row lg:items-start">
        <DocumentsList
          documentTypes={documentTypes}
          documents={documents}
          listed={listed}
          shownIndex={pager.index}
          query={view.query}
          needingData={needingData}
          onSearch={(query) => dispatchView({ type: 'search', query })}
          onClearSearch={() => dispatchView({ type: 'clearSearch' })}
          onAdd={onAdd}
          onSelect={select}
          onRemove={onRemove}
        />
        {shown ? (
          <DocumentDetail
            shown={shown}
            pager={pager}
            needsData={needingData.includes(shown.documentType.key)}
            onSelect={select}
            onSetField={(field, selected) => onSetField(shown.documentType.key, field, selected)}
            onSetAllFields={(fields) => {
              // A data item the catalog dropped stays chosen until the note's "Remove it"
              const { document, documentType } = shown;
              const offered = offeredFieldsOf(document.fields, documentType);
              const kept = document.fields.filter((field) => !offered.includes(field));
              onSetAllFields(documentType.key, fields.length > 0 ? [...fields, ...kept] : fields);
            }}
          />
        ) : (
          <EmptyPanel />
        )}
      </div>
    </div>
  );
}
