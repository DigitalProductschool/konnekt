import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { flushSync } from 'react-dom';
import { generatePath, useNavigate } from 'react-router';

import { createFormConnection, updateFormConnection } from '../../api/form-connections';
import PageTitle from '../../components/PageTitle';
import Toast from '../../components/Toast';
import WizardLayout from '../../components/WizardLayout';
import WizardProgress from '../../components/WizardProgress';
import { CONNECTION_STEPS, ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import type { DocumentType } from '../../types/document-types';
import type { DetailLocationState } from '../../types/routing';
import ConnectionStep from './ConnectionStep';
import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import DocumentsStep from './DocumentsStep';
import EditorFooter from './EditorFooter';
import PublishDialog from './PublishDialog';
import type { EditorErrors, FormConnectionEditorPageProps } from './types';
import {
  createPayload,
  editorReducer,
  firstInvalidElementId,
  hasErrors,
  headerTitleOf,
  initialEditorState,
  pageTitleOf,
  publishErrorNotice,
  publishSummary,
  validateConnection,
  validateDocuments,
} from './utils';

/**
 * The create screen at /form-connections/new: a wizard with the form's details and the
 * documents. Everything stays in the browser until "Publish", which creates the connection
 * with one call (the API has no drafts) and opens its details. The first-connection screen
 * at /get-started is the same wizard, with its own heading for step 1. Given a connection,
 * the wizard edits it (/form-connections/:id/edit): it starts with its details and documents,
 * and "Save" changes them with one call. Changed documents apply to new requests only (FR-005).
 */
export default function FormConnectionEditorPage({
  firstConnection = false,
  formConnection,
  initialStep = 'connection',
}: FormConnectionEditorPageProps) {
  const [state, dispatch] = useReducer(
    editorReducer,
    { formConnection, initialStep },
    initialEditorState
  );
  const editing = formConnection !== undefined;
  const { status: catalogStatus, documentTypes, retry } = useDocumentTypes();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(state.step);
  const catalogOrder = useMemo(() => documentTypes.map((type) => type.key), [documentTypes]);
  const onDocuments = state.step === 'documents';
  const pageTitle = pageTitleOf(
    state.step,
    editing ? 'edit' : firstConnection ? 'first' : 'create'
  );

  useDocumentTitle(pageTitle.title);

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
      // Editing sends every field: unchanged documents create no new revision
      const saved = formConnection
        ? await updateFormConnection(formConnection.id, createPayload(state))
        : await createFormConnection(createPayload(state));
      const locationState: DetailLocationState = editing ? { saved: true } : { published: true };
      navigate(generatePath(ROUTES.formConnection, { id: saved.id }), { state: locationState });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatch({ type: 'publishFailed', error: publishErrorNotice(error, editing) });
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
      title={headerTitleOf(state, formConnection)}
      head={
        <>
          <WizardProgress
            steps={CONNECTION_STEPS}
            current={onDocuments ? 1 : 0}
            onSelect={() => dispatch({ type: 'goToStep', step: 'connection' })}
          />
          <PageTitle ref={titleRef} title={pageTitle.title} hint={pageTitle.hint} />
        </>
      }
      footer={
        <EditorFooter
          step={state.step}
          editing={editing}
          publishing={state.publishing}
          onBack={() => dispatch({ type: 'goToStep', step: 'connection' })}
          onPublish={handlePublish}
        />
      }
      overlay={
        <>
          <PublishDialog
            open={state.dialogOpen}
            editing={editing}
            summary={publishSummary(state.documents, documentTypes, editing)}
            publishing={state.publishing}
            error={state.publishError}
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
          note={editing ? EDITOR_COPY.editNote : EDITOR_COPY.formCardNote}
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
