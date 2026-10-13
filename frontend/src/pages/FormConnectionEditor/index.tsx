import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { flushSync } from 'react-dom';
import { generatePath, useNavigate } from 'react-router';

import { createFormConnection } from '../../api/form-connections';
import PageTitle from '../../components/PageTitle';
import Toast from '../../components/Toast';
import WizardLayout from '../../components/WizardLayout';
import WizardProgress from '../../components/WizardProgress';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import type { DocumentType } from '../../types/document-types';
import type { DetailLocationState } from '../../types/routing';
import ConnectionStep from './ConnectionStep';
import { EDITOR_COPY, ELEMENT_IDS, INITIAL_EDITOR_STATE, STEPS } from './constants';
import DocumentsStep from './DocumentsStep';
import EditorFooter from './EditorFooter';
import PublishDialog from './PublishDialog';
import type { EditorErrors, FormConnectionEditorPageProps } from './types';
import {
  createPayload,
  editorReducer,
  firstInvalidElementId,
  hasErrors,
  publishErrorNotice,
  publishSummary,
  validateConnection,
  validateDocuments,
} from './utils';

/**
 * The create screen at /form-connections/new: a wizard with the form's details and the
 * documents. Everything stays in the browser until "Publish", which creates the connection
 * with one call (the API has no drafts) and opens its details. The first-connection screen
 * at /get-started is the same wizard, with its own heading for step 1.
 */
export default function FormConnectionEditorPage({
  firstConnection = false,
}: FormConnectionEditorPageProps) {
  const [state, dispatch] = useReducer(editorReducer, INITIAL_EDITOR_STATE);
  const { status: catalogStatus, documentTypes, retry } = useDocumentTypes();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(state.step);
  const catalogOrder = useMemo(() => documentTypes.map((type) => type.key), [documentTypes]);
  const onDocuments = state.step === 'documents';
  const pageTitle = onDocuments
    ? EDITOR_COPY.documentsTitle
    : firstConnection
      ? EDITOR_COPY.firstConnectionTitle
      : EDITOR_COPY.connectionTitle;

  useDocumentTitle(pageTitle);

  // A new step replaces the content, so the focus moves to its heading
  useEffect(() => {
    if (shownStep.current !== state.step) {
      shownStep.current = state.step;
      titleRef.current?.focus();
    }
  }, [state.step]);

  const dismissToast = useCallback(() => dispatch({ type: 'dismissToast' }), []);

  /** Shows the messages, then moves the focus to the first problem. */
  function refuse(errors: EditorErrors) {
    flushSync(() => dispatch({ type: 'showErrors', errors }));
    const id = firstInvalidElementId(errors, state.documents, documentTypes);
    if (id) {
      document.getElementById(id)?.focus();
    }
  }

  function handleContinue() {
    const errors = validateConnection(state.name, state.servicebwForm);
    if (hasErrors(errors)) {
      refuse(errors);
      return;
    }
    dispatch({ type: 'goToStep', step: 'documents' });
  }

  function handlePublish() {
    const errors = validateDocuments(state.documents, documentTypes);
    if (hasErrors(errors)) {
      refuse(errors);
      return;
    }
    dispatch({ type: 'openDialog' });
  }

  async function handleConfirm() {
    dispatch({ type: 'publish' });
    try {
      const created = await createFormConnection(createPayload(state));
      const locationState: DetailLocationState = { published: true };
      navigate(generatePath(ROUTES.formConnection, { id: created.id }), { state: locationState });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatch({ type: 'publishFailed', error: publishErrorNotice(error) });
      }
    }
  }

  function handleRemove(documentType: DocumentType) {
    dispatch({ type: 'removeDocument', documentType: documentType.key, label: documentType.label });
  }

  function handleUndo() {
    const restored = state.removed?.document_type;
    flushSync(() => dispatch({ type: 'undoRemove', catalogOrder }));
    // The toast and its button are gone; the focus goes to the restored document
    if (restored) {
      document.getElementById(ELEMENT_IDS.pickerButton(restored))?.focus();
    }
  }

  return (
    <WizardLayout
      title={onDocuments && state.name.trim() ? state.name.trim() : EDITOR_COPY.headerTitle}
      head={
        <>
          <WizardProgress
            steps={STEPS}
            current={onDocuments ? 1 : 0}
            onSelect={() => dispatch({ type: 'goToStep', step: 'connection' })}
          />
          <PageTitle
            ref={titleRef}
            title={pageTitle}
            hint={onDocuments ? EDITOR_COPY.documentsHint : EDITOR_COPY.connectionHint}
          />
        </>
      }
      footer={
        <EditorFooter
          step={state.step}
          publishing={state.publishing}
          onBack={() => dispatch({ type: 'goToStep', step: 'connection' })}
          onPublish={handlePublish}
        />
      }
      overlay={
        <>
          <PublishDialog
            open={state.dialogOpen}
            summary={publishSummary(state.documents, documentTypes)}
            publishing={state.publishing}
            onCancel={() => dispatch({ type: 'closeDialog' })}
            onConfirm={handleConfirm}
          />
          <Toast toast={state.toast} onAction={handleUndo} onDismiss={dismissToast} />
        </>
      }
    >
      {onDocuments ? (
        <DocumentsStep
          catalogStatus={catalogStatus}
          documentTypes={documentTypes}
          documents={state.documents}
          errors={state.errors}
          publishError={state.publishError}
          onRetryCatalog={retry}
          onAdd={(documentType) =>
            dispatch({ type: 'addDocument', documentType: documentType.key, catalogOrder })
          }
          onRemove={handleRemove}
          onSetField={(documentType, field, selected) =>
            dispatch({ type: 'setField', documentType, field, selected })
          }
          onSetAllFields={(documentType, fields) =>
            dispatch({ type: 'setAllFields', documentType, fields })
          }
        />
      ) : (
        <ConnectionStep
          name={state.name}
          servicebwForm={state.servicebwForm}
          errors={state.errors}
          onChangeName={(value) => dispatch({ type: 'changeName', value })}
          onChangeServicebwForm={(value) => dispatch({ type: 'changeServicebwForm', value })}
          onSubmit={handleContinue}
        />
      )}
    </WizardLayout>
  );
}
