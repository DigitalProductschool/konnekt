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
import { usePersonas } from '../../hooks/usePersonas';
import { useRuleChecks } from '../../hooks/useRuleChecks';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { useUndoShortcut } from '../../hooks/useUndoShortcut';
import type { DocumentType } from '../../types/document-types';
import type { DetailLocationState } from '../../types/routing';
import { requestedRuleDocuments } from '../../utils/rules/conditions';
import { firstProblem } from '../../utils/rules/validation';
import ConnectionStep from './ConnectionStep';
import { EDITOR_COPY, ELEMENT_IDS, STEP_ORDER } from './constants';
import DocumentsStep from './DocumentsStep';
import EditorFooter from './EditorFooter';
import FindingsAnnouncer from './FindingsAnnouncer';
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
import TestStep from './TestStep';
import type { EditorErrors, FormConnectionEditorPageProps, PendingRemoval } from './types';
import {
  createPayload,
  documentLines,
  editorReducer,
  fieldLabelOf,
  firstBranchWithFindings,
  firstInvalidElementId,
  hasErrors,
  headerTitleOf,
  initialEditorState,
  isRulesChanged,
  labelOf,
  pageTitleOf,
  problemPlaceOf,
  publishErrorNotice,
  removalAction,
  ruleLines,
  rulesCheckingRemoval,
  rulesNextActionOf,
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
 * the team member reloads the connection or replaces their rules (W9). Rules are published or
 * saved from the test step, which "Test rules" opens through publishing's checks (spec 004,
 * FR-001 to FR-003).
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
  // The Rules step needs the catalog and the value sets
  const rulesStatus =
    catalogStatus === 'failed' || optionSetsStatus === 'failed'
      ? 'failed'
      : catalogStatus === 'loaded' && optionSetsStatus === 'loaded'
        ? 'loaded'
        : 'loading';
  const ruleCatalog: RulesCatalog = useMemo(
    () => ({
      documents: requestedRuleDocuments(documentTypes, state.documents),
      allDocuments: documentTypes,
      optionSets,
    }),
    [documentTypes, state.documents, optionSets]
  );
  // The checks of every branch's rules, once the catalog and the value sets are loaded, in the
  // create and the edit flow (FR-011; W14). The rule open in the editor counts as last saved:
  // its draft isn't in the branches (FR-002; W15). Nothing waits for them (FR-016)
  const loadedCatalog = rulesStatus === 'loaded' ? ruleCatalog : null;
  const ruleChecks = useRuleChecks(rules.branches, loadedCatalog, rules.openBranch);
  // The test step's personas live as long as the page: leaving the step and coming back keeps
  // them (spec 004, FR-019). Nothing runs while the step isn't shown
  const personas = usePersonas({
    active: state.step === 'test',
    branches: rules.branches,
    context: loadedCatalog,
    openBranchKey: rules.openBranch,
  });
  // A rule being edited counts as a rule (FR-006)
  const rulesNextAction = rulesNextActionOf(rules);
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

  // A new step replaces the content, so the focus moves to its heading. The Rules step's toast
  // goes when the step is left, and doesn't come back on return (B4)
  useEffect(() => {
    if (shownStep.current !== state.step) {
      shownStep.current = state.step;
      dispatchRules({ type: 'dismissToast' });
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
   * Publishing's pre-checks (spec 002, FR-006), with the rules as they are now, which "Test
   * rules" passes too (spec 004, FR-002; W3): a problem refuses with the server's message, shown
   * in the rules step where publishing shows it, opens the branch it names and moves the focus to
   * the rule (F11). Without the catalog, which is loading or failed to load, they would refuse
   * every rule, so the server's checks alone apply then. Whether they pass.
   */
  function passesPreChecks(current: RulesState): boolean {
    const problem = rulesStatus === 'loaded' ? firstProblem(current.branches, ruleCatalog) : null;
    if (!problem) {
      return true;
    }
    const { branchKey, focusIds } = problemPlaceOf(current.branches, problem);
    flushSync(() => {
      // Only from the test step, when the catalog arrived after "Test rules" let the rules pass
      // unchecked: the message and the rule are in the rules step
      if (state.step !== 'rules') {
        dispatch({ type: 'goToStep', step: 'rules' });
      }
      dispatchRules({ type: 'showProblem', problem });
      if (branchKey !== null) {
        dispatchRules({ type: 'selectBranch', branchKey });
      }
    });
    focusIds
      .map((id) => document.getElementById(id))
      .find((element) => element !== null)
      ?.focus();
    return false;
  }

  /**
   * "Publish" or "Save" with rules, on the test step, or "Publish without rules" on the rules
   * step: the pre-checks, then the publish and save dialog, unchanged (FR-003; O6). The personas'
   * results refuse, delay and ask nothing.
   */
  function publishRules(current: RulesState) {
    if (passesPreChecks(current)) {
      dispatch({ type: 'openDialog' });
    }
  }

  /**
   * "Test rules", after the editor's question (W8): with no rule left, since the answer
   * discarded the first one, the team member stays in the rules step, whose button now reads
   * "Publish without rules" (EC "The first rule discarded"). Otherwise the pre-checks, then the
   * test step (FR-002).
   */
  function testRules(current: RulesState) {
    if (rulesNextActionOf(current) !== 'test') {
      return;
    }
    if (passesPreChecks(current)) {
      dispatch({ type: 'goToStep', step: 'test' });
    }
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
      case 'test':
        testRules(current);
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
    undoRules();
  }

  /** Undo, from the toast or from Ctrl/Cmd+Z, with the focus on the item it restores. */
  function undoRules() {
    const { undo } = rules;
    flushSync(() => dispatchRules({ type: 'undo' }));
    if (undo) {
      document.getElementById(ELEMENT_IDS.rule(undo.branchKey, undo.itemId))?.focus();
    }
  }

  // Undo stays reachable after its toast has gone, until the next change (B4, WCAG 2.2.1); not
  // while a rule is being edited, whose fields have their own undo
  useUndoShortcut(state.step === 'rules' && rules.undo !== null && !rules.editing, undoRules);

  /**
   * "Check rules again" closes the dialog and opens the first branch, in tab order, that the
   * dialog lists findings for, or stays on the open branch when none has (FR-017; research R11).
   * Opened from the test step, it does so in the rules step, whose open branch is then the one it
   * had (spec 004, FR-003; S5; F4). "Add rules", from the documents, opens the rules. "Reload"
   * after `409 rules_changed` is the dialog's `onReload`, not this.
   */
  function handleDialogCancel() {
    if (state.publishing) {
      return;
    }
    dispatch({ type: 'closeDialog' });
    if (state.step === 'documents' || state.step === 'test') {
      dispatch({ type: 'goToStep', step: 'rules' });
    }
    if (state.step === 'documents') {
      return;
    }
    const branchKey = firstBranchWithFindings(rules.branches, ruleChecks.byBranch);
    if (branchKey !== null) {
      dispatchRules({ type: 'selectBranch', branchKey });
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

  /**
   * A finished step of the progress, which leads back to it. Only steps before the current one
   * are offered, and the test step is the last, so it is never one; should it be, it opens
   * through the gate of "Test rules" all the same (FR-002).
   */
  function selectStep(index: number) {
    const step = STEP_ORDER[index];
    if (step === 'test') {
      leaveEditor({ type: 'test' });
      return;
    }
    dispatch({ type: 'goToStep', step });
  }

  function goBack() {
    dispatch({
      type: 'goToStep',
      step: state.step === 'test' ? 'rules' : state.step === 'rules' ? 'documents' : 'connection',
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
            status={rulesStatus}
            onRetry={() => {
              if (catalogStatus === 'failed') retry();
              if (optionSetsStatus === 'failed') retryOptionSets();
            }}
            state={rules}
            catalog={ruleCatalog}
            checks={ruleChecks.byBranch}
            editing={editing}
            dispatch={dispatchRules}
            onAddRule={(branchKey, parentId) => leaveEditor({ type: 'add', branchKey, parentId })}
            onEditRule={(branchKey, ruleId) => leaveEditor({ type: 'edit', branchKey, ruleId })}
            onAddData={() => leaveEditor({ type: 'documents' })}
            onSaveRule={() => dispatchRules({ type: 'saveRule' })}
            onCancelEditor={() => leaveEditor({ type: 'cancel' })}
          />
        );
      case 'test':
        return (
          <TestStep
            personas={personas}
            branches={rules.branches}
            checks={ruleChecks.byBranch}
            context={loadedCatalog}
            contextFailed={rulesStatus === 'failed'}
            editing={editing}
            onRetry={() => {
              if (catalogStatus === 'failed') retry();
              if (optionSetsStatus === 'failed') retryOptionSets();
              if (personas.state.failed) personas.retry();
            }}
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
            onSelect={selectStep}
          />
          <PageTitle ref={titleRef} title={pageTitle.title} hint={pageTitle.hint} />
        </>
      }
      footer={
        <EditorFooter
          step={state.step}
          editing={editing}
          publishing={state.publishing}
          rulesNextAction={rulesNextAction}
          onBack={goBack}
          onAddRules={handleAddRules}
          onTestRules={() => leaveEditor({ type: 'test' })}
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
            branches={rules.branches}
            checks={ruleChecks.byBranch}
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
          {/* Outside the steps, so that it stays across a change of step (FR-015) */}
          <FindingsAnnouncer announcement={ruleChecks.announcement} />
        </>
      }
    >
      {renderStep()}
    </WizardLayout>
  );
}
