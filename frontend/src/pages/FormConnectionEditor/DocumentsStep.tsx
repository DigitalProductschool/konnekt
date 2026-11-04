import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import FeedbackLoader from '../../components/FeedbackLoader';
import FormErrorMessage from '../../components/FormErrorMessage';
import CatalogDroppedNote from './CatalogDroppedNote';
import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import DocumentCard from './DocumentCard';
import DocumentPicker from './DocumentPicker';
import EmptySetup from './EmptySetup';
import type { DocumentsStepProps } from './types';
import { offeredFieldsOf } from './utils';

/**
 * Step 2 (Figma "03–06 Documents"), under the page title in the wizard's head: the wallet
 * documents on the left, and on the right the added ones with the fields to request. From
 * 1024 px the list stays put while the field cards scroll past it (decision 2026-10-12).
 *
 * Data the catalog no longer offers (spec 005, S8; W10) is listed in a note above the picker.
 * The cards show only what the catalog offers: a dropped document has no card, and a dropped
 * field is neither shown nor counted. Ticking "All data" keeps it, so that it goes only through
 * the note's "Remove it".
 */
export default function DocumentsStep({
  catalogStatus,
  documentTypes,
  documents,
  errors,
  dropped,
  droppedNoteRef,
  onRemoveDropped,
  onRetryCatalog,
  onAdd,
  onRemove,
  onSetField,
  onSetAllFields,
}: DocumentsStepProps) {
  return (
    <>
      {catalogStatus === 'loading' && <FeedbackLoader label={EDITOR_COPY.loadingCatalog} />}

      {catalogStatus === 'failed' && (
        <div className="flex flex-col items-start gap-16">
          <KernAlert variant="danger" title={EDITOR_COPY.catalogErrorTitle} className="w-full">
            {EDITOR_COPY.catalogErrorText}
          </KernAlert>
          <button type="button" onClick={onRetryCatalog} className="kern-btn kern-btn--secondary">
            <span className="kern-label">{EDITOR_COPY.retry}</span>
          </button>
        </div>
      )}

      {catalogStatus === 'loaded' && dropped.length > 0 && (
        <CatalogDroppedNote ref={droppedNoteRef} items={dropped} onRemove={onRemoveDropped} />
      )}

      {catalogStatus === 'loaded' && (
        <div className="flex flex-col gap-24 lg:flex-row lg:items-start">
          <DocumentPicker
            documentTypes={documentTypes}
            documents={documents}
            errorId={errors.documents ? ELEMENT_IDS.documentsError : undefined}
            onAdd={onAdd}
            onRemove={onRemove}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-12">
            {errors.documents && (
              <FormErrorMessage id={ELEMENT_IDS.documentsError} message={errors.documents} />
            )}
            {documents.length === 0 && <EmptySetup />}
            {documents.map((document) => {
              const documentType = documentTypes.find(
                (type) => type.key === document.document_type
              );
              if (!documentType) {
                return null;
              }
              const offered = offeredFieldsOf(document.fields, documentType);
              const kept = document.fields.filter((field) => !offered.includes(field));
              return (
                <DocumentCard
                  key={document.document_type}
                  documentType={documentType}
                  selected={offered}
                  error={errors.fields?.[document.document_type]}
                  onSetField={(field, selected) =>
                    onSetField(document.document_type, field, selected)
                  }
                  onSetAllFields={(fields) =>
                    onSetAllFields(
                      document.document_type,
                      fields.length > 0 ? [...fields, ...kept] : fields
                    )
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
