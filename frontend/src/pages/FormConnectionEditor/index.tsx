import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  DetailLocationState,
  EditLocationState,
  OverviewLocationState,
} from '@connection-portal/api-types/routing';
import { requestedRuleDocuments } from '@connection-portal/rules/conditions';
import { droppedDataOf } from '@connection-portal/rules/dropped';
import { firstProblem } from '@connection-portal/rules/validation';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { generatePath, Navigate, useNavigate, useSearchParams } from 'react-router';

import {
  createDraft,
  createFormConnection,
  publishDraft,
  saveDraft,
  updateFormConnection,
} from '../../api/form-connections';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import LocalDraftsOffer from '../../components/LocalDraftsOffer';
import PageTitle from '../../components/PageTitle';
import Toast from '../../components/Toast';
import WizardLayout from '../../components/WizardLayout';
import WizardProgress from '../../components/WizardProgress';
import { CONNECTION_STEPS, ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import { useLocalDraft } from '../../hooks/useLocalDraft';
import { useLocalDraftStore } from '../../hooks/useLocalDraftStore';
import { useOptionSets } from '../../hooks/useOptionSets';
import { usePersonas } from '../../hooks/usePersonas';
import { useRuleChecks } from '../../hooks/useRuleChecks';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { useUndoShortcut } from '../../hooks/useUndoShortcut';
import { LOCAL_DRAFT_PARAM } from '../../utils/localDrafts/constants';
import ConnectionStep from './ConnectionStep';
import { DRAFT_COPY, EDITOR_COPY, ELEMENT_IDS, STEP_ORDER } from './constants';
import DocumentsStep from './DocumentsStep';
import DraftConflictDialog from './DraftConflictDialog';
import EditorFooter from './EditorFooter';
import FindingsAnnouncer from './FindingsAnnouncer';
import PublishDialog from './PublishDialog';
import RemoveDataDialog from './RemoveDataDialog';
import RulesStep from './RulesStep';
import RulesDialogs from './RulesStep/RulesDialogs';
import type { LeaveEditorAction, RulesCatalog, RulesState } from './RulesStep/types';
import { focusSoon, hasUnsavedChanges, neighbourOf, rulesReducer } from './RulesStep/utils';
import SaveDraftAlert from './SaveDraftAlert';
import TestStep from './TestStep';
import type {
  ConnectionWizardProps,
  DraftConflict,
  EditorErrors,
  EditorStart,
  FormConnectionEditorPageProps,
  PendingRemoval,
} from './types';
import {
  conflictOf,
  createPayload,
  documentLines,
  draftNameErrors,
  draftPayload,
  draftSaveErrorOf,
  droppedRemovalOf,
  editorReducer,
  entryOf,
  fieldLabelOf,
  firstBranchWithFindings,
  firstInvalidElementId,
  hasErrors,
  headerTitleOf,
  isRulesChanged,
  labelOf,
  localContentOf,
  pageTitleOf,
  problemPlaceOf,
  publishErrorNotice,
  removalAction,
  ruleLines,
  rulesCheckingRemoval,
  rulesNextActionOf,
  startOfEntry,
  startOfOrigin,
  stepForDroppedData,
  validateConnection,
  validateDocuments,
} from './utils';

/**
 * The connection wizard: the form's details, the documents, the rules and the test step. Rules
 * are published or saved from the test step, which "Test rules" opens through publishing's
 * checks (spec 004, FR-001 to FR-003). Where its content comes from is its origin (spec 005,
 * research R12):
 * - `new`, at /form-connections/new and at /get-started (the first-connection screen, with its
 *   own heading for step 1): the wizard starts empty, or from the local draft it resumes.
 *   "Publish" creates the connection with its rules in one call and opens its details.
 * - `draft`, a stored draft: the wizard starts from the draft's content (`initialStates`), or
 *   from its local draft resumed through `?local=`, and shows the "Draft" badge (S0). "Publish" publishes the draft through its own endpoint, at the
 *   version the wizard opened, and opens the connection's details.
 * - `published`, at /form-connections/:id/edit: the wizard edits the connection as before
 *   (FR-026). "Save" changes it with one call, and changes apply to new requests only (FR-005,
 *   FR-028). If another team member saved the rules after the wizard loaded them, the team member
 *   reloads the connection or replaces their rules (W9).
 *
 * A new connection and a stored draft offer "Save and exit" on every step (S1; FR-001): an open
 * rule editor with changes asks "Save changes to Rule 01?" first, and closing that question
 * cancels (FR-012). A missing or too long name sends the team member to step 1 and stores
 * nothing. Otherwise the flow is stored as a draft, with its step, and the overview confirms it
 * (W1). A failed save keeps the team member in the flow with their work, and says why above the
 * step's content (FR-013; W3).
 *
 * Two team members on one stored draft (S2; FR-022 to FR-024; R6): a save or a publish that meets
 * another team member's save, publish or deletion of the draft is refused before anything is
 * stored. After "Save and exit" the conflict dialog says so, and after publishing the publish
 * dialog does, in place of "Publish":
 * - "Reload" drops the local draft and the unsaved work: on the edit route the page fetches the
 *   draft again and opens it at its stored step, with the focus on the page title; a draft
 *   resumed through `?local=` opens its edit route instead.
 * - "Replace their changes" sends the same save or publish over their changes; another conflict
 *   shows in its place.
 * - "Open the connection", after it was published, drops the local draft and opens its details.
 * - "Save as new draft", after it was deleted, stores the work as a new draft, drops the old local
 *   draft, and the overview confirms it as after "Save and exit".
 * - "Cancel" closes the dialog, and the work stays in the flow and in the local draft.
 *
 * An answer that fails otherwise shows as its save's alert or in the publish dialog, as any
 * failed save or publish does.
 *
 * Local drafts (FR-014 to FR-018; R9, R10): a new connection and a stored draft keep their unsaved
 * work on this device, in the signed-in account's local draft of their flow key (`new-<uuid>` or
 * `draft-<id>`), written within a second of a change and on leaving the page. It holds only what
 * isn't safe elsewhere: it goes when the work comes back to the baseline (the empty flow, or the
 * stored draft as loaded on its edit route), and after a successful "Save and exit" or publish.
 * A stored draft's local draft resumed through `?local=` has no baseline, as that flow doesn't
 * read the stored draft, so only a save or a publish removes it. Leaving the flow otherwise, or a
 * failed save, keeps it. The published edit flow never has one.
 * - The create routes name their flow in the URL, as `?local=<flow key>`, read once when the page
 *   mounts. A key with the account's local draft resumes it at its step, a stored draft's under
 *   its own origin, with the "Draft" badge; a `draft-<id>` key without one opens the stored
 *   draft's edit route; a `new-` key without one starts empty under that key. Without a valid
 *   key, the flow gets a new one and writes it into the URL, replacing the history entry without
 *   remounting, so that a reload or the sign-in after an expired session comes back to the work.
 * - With an `origin`, such as a stored draft on its edit route, the page doesn't read `?local=`.
 *
 * Data the catalog no longer offers is listed in a note on the documents step, with "Remove it"
 * (S8; W10). A flow that opens at another step moves there once per opening, as soon as the
 * catalog has loaded, and the note takes the focus. "Save and exit" and publishing are refused
 * with the server's message while such data remains. The published edit flow has no such note,
 * as it stays as it is (FR-026).
 */
export default function FormConnectionEditorPage({
  firstConnection = false,
  origin,
  initialStates,
  initialStep = 'connection',
  baseline,
  onReload,
  reloaded = false,
}: FormConnectionEditorPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { store, username } = useLocalDraftStore();
  // Read once, the URL and the record included: what the flow opens, its origin and its baseline
  // stay as they started, also when the fresh flow's key enters the URL (R10)
  const [start] = useState<EditorStart>(() => {
    if (origin) {
      return startOfOrigin({ origin, initialStates, initialStep, baseline });
    }
    const param = searchParams.get(LOCAL_DRAFT_PARAM);
    // Nobody signed in can't happen behind RequireSignIn; it would read as no record
    const record = param !== null && username !== null ? store.read(username, param) : null;
    return startOfEntry(entryOf(param, record), () => crypto.randomUUID(), initialStep);
  });
  const urlWritten = useRef(false);

  // A fresh flow names its key in the URL, in place of the current history entry. The route
  // stays the same, so the wizard stays mounted with its state (R10, R16)
  useEffect(() => {
    if (start.kind === 'open' && start.urlFlowKey !== null && !urlWritten.current) {
      urlWritten.current = true;
      setSearchParams({ [LOCAL_DRAFT_PARAM]: start.urlFlowKey }, { replace: true });
    }
  }, [start, setSearchParams]);

  if (start.kind === 'missingDraft') {
    return <Navigate to={generatePath(ROUTES.editFormConnection, { id: start.draftId })} replace />;
  }
  return (
    <ConnectionWizard
      flow={start}
      firstConnection={firstConnection}
      onReload={onReload}
      reloaded={reloaded}
    />
  );
}

/** The wizard of the flow the page opened, with its autosave into the local draft. */
function ConnectionWizard({ flow, firstConnection, onReload, reloaded }: ConnectionWizardProps) {
  const { origin } = flow;
  // The connection being edited, only for the published origin (FR-026)
  const formConnection = origin.kind === 'published' ? origin.formConnection : undefined;
  const [state, dispatch] = useReducer(editorReducer, flow.initialStates.editor);
  const [rules, dispatchRules] = useReducer(rulesReducer, flow.initialStates.rules);
  const editing = origin.kind === 'published';
  // The flow's local draft, for a new connection and a stored draft only (FR-014). Its content is
  // what "Save and exit" would store now (R9)
  const flowKey = origin.kind === 'published' ? null : origin.flowKey;
  const localContent = useMemo(() => localContentOf(state, rules), [state, rules]);
  const { forget } = useLocalDraft({
    // A published connection's flow writes nothing, so its key is never used
    flowKey: flowKey ?? '',
    draftId: origin.kind === 'draft' ? origin.draftId : null,
    draftVersion: origin.kind === 'draft' ? origin.draftVersion : null,
    baseline: flow.baseline,
    content: localContent,
    step: state.step,
    enabled: flowKey !== null,
  });
  const { status: catalogStatus, documentTypes, retry } = useDocumentTypes();
  const { status: optionSetsStatus, optionSets, retry: retryOptionSets } = useOptionSets();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(state.step);
  const droppedNoteRef = useRef<HTMLElement>(null);
  // Whether this opening has looked for dropped data once the catalog loaded (S8)
  const droppedChecked = useRef(false);
  // The flow moved to the documents step for dropped data: the note takes the focus there (S8)
  const focusDroppedNote = useRef(false);
  const catalogOrder = useMemo(() => documentTypes.map((type) => type.key), [documentTypes]);
  // Data the catalog dropped, once it has loaded; never in the published edit flow (FR-026)
  const dropped = useMemo(
    () =>
      catalogStatus === 'loaded' && !editing ? droppedDataOf(state.documents, documentTypes) : [],
    [catalogStatus, editing, state.documents, documentTypes]
  );
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
  // A conflict shows where it was met: after "Save and exit" in its own dialog, after publishing
  // in the publish dialog (S2)
  const saveConflict = state.conflict?.during === 'save' ? state.conflict : null;
  const publishConflict = state.conflict?.during === 'publish' ? state.conflict : null;
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

  // Once per opening, when the catalog has loaded: a flow that opened elsewhere with dropped data
  // moves to the documents step, so that the note is seen before a save is refused (S0, S8)
  useEffect(() => {
    if (droppedChecked.current || catalogStatus !== 'loaded') {
      return;
    }
    droppedChecked.current = true;
    const step = stepForDroppedData(state.step, dropped);
    if (step !== null) {
      focusDroppedNote.current = true;
      dispatch({ type: 'goToStep', step });
    }
  }, [catalogStatus, dropped, state.step]);

  // After the step change above has focused the page title, the note takes the focus (S8)
  useEffect(() => {
    if (focusDroppedNote.current && state.step === 'documents') {
      focusDroppedNote.current = false;
      droppedNoteRef.current?.focus();
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
    const errors = validateConnection(state.name, state.description);
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
    // The flow is being stored as a draft: publishing as well would make a second connection
    if (state.savingDraft) {
      return;
    }
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
      case 'saveAndExit':
        void saveDraftAndExit(current);
        return;
    }
  }

  /**
   * "Save and exit", or the alert's "Try again": through the rule editor's question first, whose
   * either answer goes on with the save, and closing it cancels the save (S1; FR-012).
   */
  function handleSaveAndExit() {
    if (state.savingDraft || state.publishing) {
      return;
    }
    leaveEditor({ type: 'saveAndExit' });
  }

  /**
   * Stores the flow as a draft, with the rules as they are now and the step, then opens the
   * overview, which confirms it (S1; R12; W1). A missing or too long name opens step 1, shows its
   * message under "Form name" and focuses the field, and nothing is stored (S1.2). A failure
   * keeps the team member in the flow with their work, and the alert above the step says why
   * (FR-013; W3). Another team member's save, publish or deletion of the stored draft opens the
   * conflict dialog instead (S2). `replace`, its "Replace their changes", sends the same save over
   * their changes.
   */
  async function saveDraftAndExit(current: RulesState, replace = false) {
    const errors = draftNameErrors(state.name);
    if (hasErrors(errors)) {
      if (state.step !== 'connection') {
        flushSync(() => dispatch({ type: 'goToStep', step: 'connection' }));
      }
      refuse(errors);
      return;
    }
    dispatch({ type: 'saveDraft' });
    const payload = draftPayload(localContentOf(state, current), state.step);
    try {
      if (origin.kind === 'draft') {
        await saveDraft(origin.draftId, { ...payload, version: origin.draftVersion, replace });
      } else {
        await createDraft(payload);
      }
      exitWithSavedDraft(payload.name);
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }
      const conflict = conflictOf(error, origin, 'save');
      if (conflict) {
        dispatch({ type: 'draftConflict', conflict });
        return;
      }
      showDraftSaveFailure(error);
    }
  }

  /** A stored draft: the local draft has no unsaved work left (FR-018), and the overview says so. */
  function exitWithSavedDraft(name: string) {
    forget();
    const locationState: OverviewLocationState = { draftSaved: name };
    navigate(ROUTES.overview, { state: locationState });
  }

  /**
   * A failed draft save, also an answer of the conflict dialog: the dialog closes first, returning
   * the focus to "Save and exit", and then the alert above the step takes it (S1.5).
   */
  function showDraftSaveFailure(error: unknown) {
    if (state.conflict) {
      flushSync(() => dispatch({ type: 'closeConflict' }));
    }
    // A new object each time, so that the alert takes the focus again
    dispatch({ type: 'saveDraftFailed', error: draftSaveErrorOf(error) });
  }

  /** A failed publish, also an answer of a conflict in the publish dialog, which shows why. */
  function showPublishFailure(error: unknown) {
    if (state.conflict) {
      dispatch({ type: 'closeConflict' });
    }
    dispatch({
      type: 'publishFailed',
      error: publishErrorNotice(error, editing),
      rulesChanged: isRulesChanged(error),
    });
  }

  /**
   * A conflict's "Reload" (S2; R6), after `draft_changed`: the unsaved work goes with the local
   * draft. On the edit route, the page fetches the draft again and opens it at its stored step;
   * a draft resumed through `?local=` opens its edit route, which does the same. After spec 002's
   * `rules_changed`, the published connection's reload is as before (W9).
   */
  function handleReload() {
    if (origin.kind !== 'draft') {
      onReload?.();
      return;
    }
    forget();
    if (onReload) {
      onReload();
      return;
    }
    // The edit route then starts with the focus on its page title, as its own reload does
    const locationState: EditLocationState = { reloaded: true };
    navigate(generatePath(ROUTES.editFormConnection, { id: origin.draftId }), {
      replace: true,
      state: locationState,
    });
  }

  /** A conflict's "Open the connection", after `draft_published` (S2; FR-023). */
  function handleOpenConnection() {
    if (origin.kind !== 'draft') {
      return;
    }
    // The connection is published, and its edit flow has no local draft (rule 3)
    forget();
    navigate(generatePath(ROUTES.formConnection, { id: origin.draftId }));
  }

  /**
   * A conflict's "Save as new draft", after `draft_deleted` (S2; FR-024): the work becomes a new
   * draft, the old flow's local draft goes, and the overview confirms it as after "Save and exit".
   * A failure shows as the save's or the publish's own failure, which the conflict started from.
   */
  async function handleSaveAsNew(during: DraftConflict['during']) {
    dispatch({ type: during === 'save' ? 'saveDraft' : 'publish' });
    const payload = draftPayload(localContentOf(state, rules), state.step);
    try {
      await createDraft(payload);
      exitWithSavedDraft(payload.name);
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }
      if (during === 'save') {
        showDraftSaveFailure(error);
      } else {
        showPublishFailure(error);
      }
    }
  }

  /** "Cancel", Escape and the close button: the team member stays in the flow with their work. */
  function handleCloseConflict() {
    if (!state.savingDraft && !state.publishing) {
      dispatch({ type: 'closeConflict' });
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

  /**
   * Publishes or saves; `replace` saves over the rules another team member saved meanwhile, or,
   * for a stored draft, publishes over the draft they saved (S2). Another team member's save,
   * publish or deletion of the stored draft shows as a conflict in the dialog.
   */
  async function handleConfirm(replace = false) {
    dispatch({ type: 'publish' });
    try {
      // Editing sends the name and the documents, which create no revision when unchanged, and
      // the rules only when they changed (FR-028). A stored draft is published at the version
      // the flow opened (R12)
      const payload = createPayload(state, rules, { loaded: formConnection, replace });
      const saved =
        origin.kind === 'draft'
          ? await publishDraft(origin.draftId, {
              ...createPayload(state, rules),
              version: origin.draftVersion,
              replace,
            })
          : formConnection
            ? await updateFormConnection(formConnection.id, payload)
            : await createFormConnection(payload);
      // Published: the local draft has no unsaved work left (FR-018)
      if (!editing) {
        forget();
      }
      const locationState: DetailLocationState = editing ? { saved: true } : { published: true };
      navigate(generatePath(ROUTES.formConnection, { id: saved.id }), { state: locationState });
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }
      const conflict = conflictOf(error, origin, 'publish');
      if (conflict) {
        dispatch({ type: 'draftConflict', conflict });
        return;
      }
      showPublishFailure(error);
    }
  }

  /**
   * The publish dialog's close button and Escape, and its "Cancel" after a conflict: the dialog
   * closes, and the conflict with it, so that it doesn't show at the next opening.
   */
  function handleCloseDialog() {
    if (state.publishing) {
      return;
    }
    dispatch({ type: 'closeDialog' });
    dispatch({ type: 'closeConflict' });
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

  /**
   * The note's "Remove it" (S8): every dropped item at once, after the removal dialog when rules
   * check any of it. The note goes, so the focus moves to the page title.
   */
  function handleRemoveDropped() {
    flushSync(() => removeOrAsk(droppedRemovalOf(dropped)));
    // Removed without a question: the note has gone with its button
    if (!droppedNoteRef.current) {
      titleRef.current?.focus();
    }
  }

  /** Confirms the removal dialog; after the note's removal, the note has gone with its button. */
  function handleConfirmRemoval() {
    const fromNote = state.pendingRemoval?.type === 'dropped';
    dispatch({ type: 'confirmRemoval' });
    if (fromNote) {
      // After the dialog has closed, which returns the focus to a button that is gone
      requestAnimationFrame(() => titleRef.current?.focus());
    }
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
            description={state.description}
            errors={state.errors}
            onChangeName={(value) => dispatch({ type: 'changeName', value })}
            onChangeDescription={(value) => dispatch({ type: 'changeDescription', value })}
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
            dropped={dropped}
            droppedNoteRef={droppedNoteRef}
            onRemoveDropped={handleRemoveDropped}
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
      badge={origin.kind === 'draft' ? <ConnectionStatusBadge isActive draft /> : undefined}
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
          canSaveDraft={origin.kind !== 'published'}
          savingDraft={state.savingDraft}
          onSaveAndExit={handleSaveAndExit}
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
            onClose={handleCloseDialog}
            onConfirm={() => handleConfirm()}
            onReload={handleReload}
            onReplace={() => handleConfirm(true)}
            conflict={publishConflict}
            onOpenConnection={handleOpenConnection}
            onSaveAsNew={() => void handleSaveAsNew('publish')}
          />
          {/* Always rendered: closing it, not unmounting it, returns the focus to "Save and exit" */}
          <DraftConflictDialog
            conflict={saveConflict}
            busy={state.savingDraft}
            onReload={handleReload}
            onReplace={() => void saveDraftAndExit(rules, true)}
            onOpenConnection={handleOpenConnection}
            onSaveAsNew={() => void handleSaveAsNew('save')}
            onCancel={handleCloseConflict}
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
            onConfirm={handleConfirmRemoval}
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
          {/* "Save and exit" in progress (S1.3): always in the page, so that its text is read */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {state.savingDraft ? DRAFT_COPY.savingStatus : ''}
          </div>
        </>
      }
    >
      {/* Under the page title, above the step's content (S1.5; W3) */}
      <SaveDraftAlert
        error={state.draftError}
        retrying={state.savingDraft}
        onRetry={handleSaveAndExit}
      />
      {/* On /get-started, the unsaved work on this device except this flow's own (S4; FR-016) */}
      {firstConnection && state.step === 'connection' && (
        <LocalDraftsOffer exceptFlowKey={flowKey ?? undefined} emptyFocusRef={titleRef} />
      )}
      {renderStep()}
    </WizardLayout>
  );
}
