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
import RemoveDataDialog from './RemoveDataDialog';
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
import type { EditorErrors, FormConnectionEditorPageProps, PendingRemoval } from './types';
import {
  createPayload,
  documentLines,
  editorReducer,
  fieldLabelOf,
  firstInvalidElementId,
  hasErrors,
  headerTitleOf,
  initialEditorState,
  isRulesChanged,
  labelOf,
  pageTitleOf,
  publishErrorNotice,
  removalAction,
  ruleLines,
  rulesCheckingRemoval,
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
 * only (FR-005, FR-028). If another team member saved the rules after the wizard loaded them,
 * the team member reloads the connection or replaces their rules (W9).
 */
export default function FormConnectionEditorPage({
  firstConnection = false,
  formConnection,
  initialStep = 'connection',
  onReload,
  reloaded = false,
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

  // After Reload, the dialog that had the focus is gone
  useEffect(() => {
    if (reloaded) {
      titleRef.current?.focus();
    }
  }, [reloaded]);

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
        dispatchRules({ type: 'addRule', branchKey: next.branchKey, parentId: next.parentId });
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

  /** Publishes or saves; `replace` saves over the rules another team member saved meanwhile. */
  async function handleConfirm(replace = false) {
    dispatch({ type: 'publish' });
    try {
      // Editing sends the name and the documents, which create no revision when unchanged, and
      // the rules only when they changed (FR-028)
      const payload = createPayload(state, rules, { loaded: formConnection, replace });
      const saved = formConnection
        ? await updateFormConnection(formConnection.id, payload)
        : await createFormConnection(payload);
      const locationState: DetailLocationState = editing ? { saved: true } : { published: true };
      navigate(generatePath(ROUTES.formConnection, { id: saved.id }), { state: locationState });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatch({
          type: 'publishFailed',
          error: publishErrorNotice(error, editing),
          rulesChanged: isRulesChanged(error),
        });
      }
    }
  }

  /**
   * Deletes the rule or group, then gives the focus to the item after it in its level, or the
   * one before it, or to "Add rule". A deleted variant gives it to Standard's tab.
   */
  function handleConfirmDelete() {
    const { dialog } = rules;
    if (dialog?.type === 'deleteVariant') {
      // Standard opens in the deleted variant's place
      dispatchRules({ type: 'confirmDelete' });
      focusSoon(ELEMENT_IDS.branchTab(rules.branches[0].key));
      return;
    }
    if (dialog?.type !== 'deleteRule' && dialog?.type !== 'deleteGroup') {
      return;
    }
    const itemId = dialog.type === 'deleteRule' ? dialog.ruleId : dialog.groupId;
    const neighbour = neighbourOf(rules, dialog.branchKey, itemId);
    dispatchRules({ type: 'confirmDelete' });
    focusSoon(
      neighbour ? ELEMENT_IDS.rule(dialog.branchKey, neighbour) : '',
      ELEMENT_IDS.addRule(dialog.branchKey)
    );
  }

  /**
   * The toast's action: Undo puts the rules back as they were, with the focus on the item it
   * restores; "Show", after a copy, opens the variant the rule was copied to (F29).
   */
  function handleRulesToastAction() {
    const { undo, showBranch } = rules;
    if (!undo && showBranch) {
      flushSync(() => {
        dispatchRules({ type: 'selectBranch', branchKey: showBranch });
        dispatchRules({ type: 'dismissToast' });
      });
      document.getElementById(ELEMENT_IDS.branchTab(showBranch))?.focus();
      return;
    }
    flushSync(() => dispatchRules({ type: 'undo' }));
    if (undo) {
      document.getElementById(ELEMENT_IDS.rule(undo.branchKey, undo.itemId))?.focus();
    }
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

  /**
   * Removes a document or deselects data, or, when rules in any branch check it, first asks in
   * a dialog that names them (FR-029; F18).
   */
  function removeOrAsk(removal: PendingRemoval) {
    if (rulesCheckingRemoval(removal, rules.branches, state.documents).length > 0) {
      dispatch({ type: 'askRemoval', removal });
      return;
    }
    dispatch(removalAction(removal));
  }

  function handleRemove(documentType: DocumentType) {
    removeOrAsk({ type: 'document', documentType: documentType.key, label: documentType.label });
  }

  function handleSetField(documentType: string, field: string, selected: boolean) {
    if (selected) {
      dispatch({ type: 'setField', documentType, field, selected });
      return;
    }
    removeOrAsk({
      type: 'field',
      documentType,
      field,
      label: fieldLabelOf(documentType, field, documentTypes),
    });
  }

  /** "All data": ticked selects every field; unticked deselects them, asking first (F18). */
  function handleSetAllFields(documentType: string, fields: string[]) {
    if (fields.length > 0) {
      dispatch({ type: 'setAllFields', documentType, fields });
      return;
    }
    removeOrAsk({ type: 'allFields', documentType, label: labelOf(documentType, documentTypes) });
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
            onSetField={handleSetField}
            onSetAllFields={handleSetAllFields}
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
            onAddRule={(branchKey, parentId) => leaveEditor({ type: 'add', branchKey, parentId })}
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
            rulesChanged={state.rulesChanged}
            onCancel={handleDialogCancel}
            onClose={() => dispatch({ type: 'closeDialog' })}
            onConfirm={() => handleConfirm()}
            onReload={() => onReload?.()}
            onReplace={() => handleConfirm(true)}
          />
          <RemoveDataDialog
            removal={state.pendingRemoval}
            rules={
              state.pendingRemoval
                ? rulesCheckingRemoval(state.pendingRemoval, rules.branches, state.documents)
                : []
            }
            editing={editing}
            onCancel={() => dispatch({ type: 'cancelRemoval' })}
            onConfirm={() => dispatch({ type: 'confirmRemoval' })}
          />
          <RulesDialogs
            state={rules}
            context={{ documents: ruleCatalog.allDocuments, optionSets }}
            editing={editing}
            dispatch={dispatchRules}
            onCancel={() => dispatchRules({ type: 'closeDialog' })}
            onConfirmDelete={handleConfirmDelete}
            onSaveChanges={() => answerSaveChanges(true)}
            onDiscardChanges={() => answerSaveChanges(false)}
          />
          {state.step === 'rules' ? (
            <Toast
              toast={rules.toast}
              onAction={handleRulesToastAction}
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
