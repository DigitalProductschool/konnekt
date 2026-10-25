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
import { useOptionSets } from '../../hooks/useOptionSets';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import type { DocumentType } from '../../types/document-types';
import type { DetailLocationState } from '../../types/routing';
import { requestedRuleDocuments } from '../../utils/rules/conditions';
import { hasAnyRule } from '../../utils/rules/tree';
import { firstProblem } from '../../utils/rules/validation';
import ConnectionStep from './ConnectionStep';
import { EDITOR_COPY, ELEMENT_IDS, STEP_ORDER } from './constants';
import DocumentsStep from './DocumentsStep';
import EditorFooter from './EditorFooter';
import PublishDialog from './PublishDialog';
import RulesStep from './RulesStep';
import RulesDialogs from './RulesStep/RulesDialogs';
import type { LeaveEditorAction, RulesCatalog, RulesState } from './RulesStep/types';
import {
  focusSoon,
  hasUnsavedChanges,
  initialRulesState,
  neighbourOf,
  rulesReducer,
} from './RulesStep/utils';
import type { EditorErrors, FormConnectionEditorPageProps } from './types';
import {
  createPayload,
  documentLines,
  editorReducer,
  firstInvalidElementId,
  hasErrors,
  headerTitleOf,
  initialEditorState,
  pageTitleOf,
  publishErrorNotice,
  ruleLines,
  validateConnection,
  validateDocuments,
} from './utils';

/**
 * The create screen at /form-connections/new: a wizard with the form's details, the documents
 * and the rules. Everything stays in the browser until "Publish", which creates the connection
 * with its rules in one call (the API has no drafts) and opens its details. The first-connection
 * screen at /get-started is the same wizard, with its own heading for step 1. Given a
 * connection, the wizard edits it (/form-connections/:id/edit): it starts with its details,
 * documents and rules, and "Save" changes them with one call. Changes apply to new requests
 * only (FR-005, FR-028).
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
  const [rules, dispatchRules] = useReducer(rulesReducer, formConnection, initialRulesState);
  const editing = formConnection !== undefined;
  const { status: catalogStatus, documentTypes, retry } = useDocumentTypes();
  const { status: optionSetsStatus, optionSets, retry: retryOptionSets } = useOptionSets();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(state.step);
  const catalogOrder = useMemo(() => documentTypes.map((type) => type.key), [documentTypes]);
  const ruleCatalog: RulesCatalog = useMemo(
    () => ({
      documents: requestedRuleDocuments(documentTypes, state.documents),
      allDocuments: documentTypes,
      optionSets,
    }),
    [documentTypes, state.documents, optionSets]
  );
  // A rule being edited counts as a rule (FR-006)
  const withoutRules = !rules.editing && !hasAnyRule(rules.branches);
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
  const dismissRulesToast = useCallback(() => dispatchRules({ type: 'dismissToast' }), []);

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

  /** The documents step's "Add rules →" and "Publish without rules": the documents' checks. */
  function documentsAreValid(): boolean {
    const errors = validateDocuments(state.documents, documentTypes);
    if (hasErrors(errors)) {
      refuse(errors);
      return false;
    }
    return true;
  }

  function handleAddRules() {
    if (documentsAreValid()) {
      dispatch({ type: 'goToStep', step: 'rules' });
    }
  }

  /**
   * Publish or Save on the Rules step, with the rules as they are now: the pre-checks of FR-006
   * refuse with the server's message and move the focus to the rule it names (F11).
   */
  function publishRules(current: RulesState) {
    const problem = firstProblem(current.branches, ruleCatalog);
    if (problem) {
      const branch =
        problem.branchIndex === null ? undefined : current.branches[problem.branchIndex];
      flushSync(() => {
        dispatchRules({ type: 'showProblem', problem });
        if (branch) {
          dispatchRules({ type: 'selectBranch', branchKey: branch.key });
        }
      });
      const target =
        branch && problem.itemId
          ? document.getElementById(ELEMENT_IDS.rule(branch.key, problem.itemId))
          : null;
      (target ?? document.getElementById(ELEMENT_IDS.rulesProblem))?.focus();
      return;
    }
    dispatch({ type: 'openDialog' });
  }

  function handlePublish() {
    if (state.step === 'documents') {
      // "Publish without rules", offered while no branch has any rule (FR-001)
      if (documentsAreValid()) {
        dispatch({ type: 'openDialog' });
      }
      return;
    }
    leaveEditor({ type: 'publish' });
  }

  /** What follows the rule editor's question, or leaving it without one. */
  function continueWith(next: LeaveEditorAction, current: RulesState) {
    switch (next.type) {
      case 'cancel':
        return;
      case 'edit':
        dispatchRules({ type: 'editRule', branchKey: next.branchKey, ruleId: next.ruleId });
        return;
      case 'add':
        dispatchRules({ type: 'addRule', branchKey: next.branchKey });
        return;
      case 'documents':
        dispatch({ type: 'goToStep', step: 'documents' });
        return;
      case 'publish':
        publishRules(current);
        return;
    }
  }

  /**
   * Closes the rule editor for `next`: with unsaved changes, "Save changes to Rule 01?" asks
   * first (F10), and `next` follows the answer.
   */
  function leaveEditor(next: LeaveEditorAction) {
    if (hasUnsavedChanges(rules)) {
      dispatchRules({ type: 'askSaveChanges', next });
      return;
    }
    const closed = rules.editing ? rulesReducer(rules, { type: 'closeEditor' }) : rules;
    if (rules.editing) {
      dispatchRules({ type: 'closeEditor' });
    }
    continueWith(next, closed);
  }

  /** The answer to "Save changes to Rule 01?": keep the rule, complete or not, or drop it. */
  function answerSaveChanges(keep: boolean) {
    const { dialog } = rules;
    if (dialog?.type !== 'saveChanges') {
      return;
    }
    const action = keep ? ({ type: 'saveRule' } as const) : ({ type: 'closeEditor' } as const);
    const after = rulesReducer(rules, action);
    dispatchRules(action);
    continueWith(dialog.next, after);
  }

  async function handleConfirm() {
    dispatch({ type: 'publish' });
    try {
      // Editing sends every field: unchanged documents and rules create no new version
      const payload = createPayload(state, rules);
      const saved = formConnection
        ? await updateFormConnection(formConnection.id, payload)
        : await createFormConnection(payload);
      const locationState: DetailLocationState = editing ? { saved: true } : { published: true };
      navigate(generatePath(ROUTES.formConnection, { id: saved.id }), { state: locationState });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatch({ type: 'publishFailed', error: publishErrorNotice(error, editing) });
      }
    }
  }

  /** Deletes the rule, then gives the focus to the rule after it, or to "Add rule". */
  function handleConfirmDelete() {
    const { dialog } = rules;
    if (dialog?.type !== 'deleteRule') {
      return;
    }
    const neighbour = neighbourOf(rules, dialog.branchKey, dialog.ruleId);
    dispatchRules({ type: 'confirmDelete' });
    focusSoon(
      neighbour ? ELEMENT_IDS.rule(dialog.branchKey, neighbour) : '',
      ELEMENT_IDS.addRule(dialog.branchKey)
    );
  }

  /** "Check rules again" closes the dialog; "Add rules", from the documents, opens the rules. */
  function handleDialogCancel() {
    if (state.publishing) {
      return;
    }
    dispatch({ type: 'closeDialog' });
    if (state.step === 'documents') {
      dispatch({ type: 'goToStep', step: 'rules' });
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

  function goBack() {
    dispatch({
      type: 'goToStep',
      step: state.step === 'rules' ? 'documents' : 'connection',
    });
  }

  function renderStep() {
    switch (state.step) {
      case 'connection':
        return (
          <ConnectionStep
            name={state.name}
            note={editing ? EDITOR_COPY.editNote : EDITOR_COPY.formCardNote}
            servicebwForm={state.servicebwForm}
            errors={state.errors}
            onChangeName={(value) => dispatch({ type: 'changeName', value })}
            onChangeServicebwForm={(value) => dispatch({ type: 'changeServicebwForm', value })}
            onSubmit={handleContinue}
          />
        );
      case 'documents':
        return (
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
        );
      case 'rules':
        return (
          <RulesStep
            status={
              catalogStatus === 'failed' || optionSetsStatus === 'failed'
                ? 'failed'
                : catalogStatus === 'loaded' && optionSetsStatus === 'loaded'
                  ? 'loaded'
                  : 'loading'
            }
            onRetry={() => {
              if (catalogStatus === 'failed') retry();
              if (optionSetsStatus === 'failed') retryOptionSets();
            }}
            state={rules}
            catalog={ruleCatalog}
            editing={editing}
            dispatch={dispatchRules}
            onAddRule={(branchKey) => leaveEditor({ type: 'add', branchKey })}
            onEditRule={(branchKey, ruleId) => leaveEditor({ type: 'edit', branchKey, ruleId })}
            onAddData={() => leaveEditor({ type: 'documents' })}
            onSaveRule={() => dispatchRules({ type: 'saveRule' })}
            onCancelEditor={() => leaveEditor({ type: 'cancel' })}
          />
        );
    }
  }

  return (
    <WizardLayout
      title={headerTitleOf(state, formConnection)}
      head={
        <>
          <WizardProgress
            steps={CONNECTION_STEPS}
            current={STEP_ORDER.indexOf(state.step)}
            onSelect={(index) => dispatch({ type: 'goToStep', step: STEP_ORDER[index] })}
          />
          <PageTitle ref={titleRef} title={pageTitle.title} hint={pageTitle.hint} />
        </>
      }
      footer={
        <EditorFooter
          step={state.step}
          editing={editing}
          publishing={state.publishing}
          withoutRules={withoutRules}
          onBack={goBack}
          onAddRules={handleAddRules}
          onPublish={handlePublish}
        />
      }
      overlay={
        <>
          <PublishDialog
            open={state.dialogOpen}
            editing={editing}
            withoutRules={state.step === 'documents'}
            documentLines={documentLines(state.documents, documentTypes)}
            ruleLines={ruleLines(rules, state.step === 'documents')}
            publishing={state.publishing}
            error={state.publishError}
            onCancel={handleDialogCancel}
            onClose={() => dispatch({ type: 'closeDialog' })}
            onConfirm={handleConfirm}
          />
          <RulesDialogs
            state={rules}
            context={{ documents: ruleCatalog.allDocuments, optionSets }}
            onCancel={() => dispatchRules({ type: 'closeDialog' })}
            onConfirmDelete={handleConfirmDelete}
            onSaveChanges={() => answerSaveChanges(true)}
            onDiscardChanges={() => answerSaveChanges(false)}
          />
          {state.step === 'rules' ? (
            <Toast
              toast={rules.toast}
              onAction={() => dispatchRules({ type: 'undo' })}
              onDismiss={dismissRulesToast}
            />
          ) : (
            <Toast toast={state.toast} onAction={handleUndo} onDismiss={dismissToast} />
          )}
        </>
      }
    >
      {renderStep()}
    </WizardLayout>
  );
}
