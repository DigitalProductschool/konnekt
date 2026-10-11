import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import FeedbackLoader from '../../components/FeedbackLoader';
import FormErrorMessage from '../../components/FormErrorMessage';
import PageTitle from '../../components/PageTitle';
import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import DocumentCard from './DocumentCard';
import DocumentPicker from './DocumentPicker';
import EmptySetup from './EmptySetup';
import type { DocumentsStepProps } from './types';

/**
 * Step 2 (Figma "03–06 Documents"): the wallet documents on the left, and on the right the
 * added ones with the fields to request.
 */
export default function DocumentsStep({
  catalogStatus,
  documentTypes,
  documents,
  errors,
  publishError,
  titleRef,
  onRetryCatalog,
  onAdd,
  onRemove,
  onSetField,
  onSetAllFields,
}: DocumentsStepProps) {
  return (
    <>
      <PageTitle
        ref={titleRef}
        title={EDITOR_COPY.documentsTitle}
        hint={EDITOR_COPY.documentsHint}
      />

      {publishError && (
        <KernAlert variant="danger" title={EDITOR_COPY.publishErrorTitle}>
          {publishError}
        </KernAlert>
      )}

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
              return (
                documentType && (
                  <DocumentCard
                    key={document.document_type}
                    documentType={documentType}
                    selected={document.fields}
                    error={errors.fields?.[document.document_type]}
                    onSetField={(field, selected) =>
                      onSetField(document.document_type, field, selected)
                    }
                    onSetAllFields={(fields) => onSetAllFields(document.document_type, fields)}
                  />
                )
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
