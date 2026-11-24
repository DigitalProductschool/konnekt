import type { DocumentType } from '@konnekt/api-types/document-types';
import type { RequestedDocument } from '@konnekt/api-types/form-connections';
import type {
  DetailLocationState,
  EditLocationState,
  OverviewLocationState,
} from '@konnekt/api-types/routing';
import { droppedDataOf } from '@konnekt/rules/dropped';
import { rulesCheckingRemoval } from '@konnekt/rules/edits';
import type { Language } from '@konnekt/rules/language';
import { firstProblem } from '@konnekt/rules/validation';
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
import ConfirmDialog from '../../components/ConfirmDialog';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import LocalDraftsOffer from '../../components/LocalDraftsOffer';
import PageTitle from '../../components/PageTitle';
import Toast from '../../components/Toast';
import WizardLayout from '../../components/WizardLayout';
import WizardProgress from '../../components/WizardProgress';
import { CONNECTION_STEPS, ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import { useCopy, useLanguage } from '../../hooks/useLanguage';
import { useLocalDraft } from '../../hooks/useLocalDraft';
import { useLocalDraftStore } from '../../hooks/useLocalDraftStore';
import { useOptionSets } from '../../hooks/useOptionSets';
import { usePersonas } from '../../hooks/usePersonas';
import { useRuleChecks } from '../../hooks/useRuleChecks';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { useTodayInGermany } from '../../hooks/useTodayInGermany';
import { useUndoShortcut } from '../../hooks/useUndoShortcut';
import { LOCAL_DRAFT_PARAM } from '../../utils/localDrafts/constants';
import { scheduledStartOf } from '../FormConnectionEdit/utils';
import ConnectionStep from './ConnectionStep';
import {
  DRAFT_COPY,
  ELEMENT_IDS,
  INITIAL_LEAVE_FLOW_STATE,
  INITIAL_PUBLISH_DIALOG_STATE,
  LEAVE_COPY,
  PUBLISHED_DELAY_MS,
  STEP_ORDER,
} from './constants';
import DocumentsStep from './DocumentsStep';
import {
  DOCUMENTS_COPY,
  DOCUMENTS_STEP_IDS,
  INITIAL_DOCUMENTS_VIEW_STATE,
} from './DocumentsStep/constants';
import { documentsViewReducer } from './DocumentsStep/reducer';
import {
  indexAfterAdding,
  indexAfterRemoval,
  listedDocumentsOf,
  listIdsOf,
  needsDataOf,
  noDataText,
  noDataTitle,
  removalDialogOf,
  removeDocumentsLabel,
  rulesCheckingDocument,
} from './DocumentsStep/utils';
import DraftConflictDialog from './DraftConflictDialog';
import EditorFooter from './EditorFooter';
import FindingsAnnouncer from './FindingsAnnouncer';
import { hasUnsavedWork, leaveFlowStep, saveQuestionTextOf } from './leaveFlow';
import PublishDialog from './PublishDialog';
import RemoveDataDialog from './RemoveDataDialog';
import RulesStep from './RulesStep';
import { LINK_NOTICE_ID } from './RulesStep/constants';
import RulesDialogs from './RulesStep/RulesDialogs';
import type {
  LeaveEditorAction,
  LinkNoticeKind,
  RulesCatalog,
  RulesState,
} from './RulesStep/types';
import {
  focusSoon,
  goToItem,
  hasUnsavedChanges,
  linkNoticeOf,
  neighbourOf,
  rulesReducer,
} from './RulesStep/utils';
import TestStep from './TestStep';
import type {
  ConnectionWizardProps,
  DraftConflict,
  DraftSaveError,
  DroppedData,
  EditorErrors,
  EditorStart,
  FormConnectionEditorPageProps,
  LeaveEffect,
  LeaveFlowAction,
  LeaveFlowContext,
  LeaveFlowState,
  PendingRemoval,
} from './types';
import {
  conflictOf,
  connectionErrorsOf,
  createPayload,
  dataRemovalOf,
  documentIndexOfListIndex,
  documentLines,
  documentsToastOf,
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
  isInvalidStartDate,
  isRulesChanged,
  labelOf,
  localContentOf,
  pageTitleOf,
  problemPlaceOf,
  publishDialogReducer,
  publishErrorNotice,
  publishFailureOf,
  publishStartDateOf,
  removalAction,
  removalInLanguage,
  removedDataRulesOf,
  ruleDocumentsInListOrder,
  ruleLines,
  rulesNextActionOf,
  saveFailureToastOf,
  selectedIndexAfterMove,
  showsExampleLine,
  startOfEntry,
  startOfOrigin,
  stepForDroppedData,
  validateConnection,
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
 * - `published`, at /form-connections/:id/edit (S18): the wizard edits the connection as before
 *   (FR-026), with "Active" (or "Deactivated") in the header (F5) and its step line as links
 *   (F25). "Save" on every step opens "Save changes?" from that step (FR-045), once step 1's
 *   fields, the documents' data and the rules pass their checks; it changes the connection with
 *   one call, changes apply to new requests only (FR-005, FR-028), and the details open with
 *   "Changes saved.". If another team member saved the rules after the wizard loaded them, the
 *   team member reloads the connection or replaces their rules (W9). "Discard changes" goes back
 *   to the details after "Discard your changes?" (`EditorFooter`).
 *
 * A new connection and a stored draft offer "Save and exit" on every step (S1; FR-001): an open
 * rule editor with changes asks "Save changes to Rule 01?" first, and closing that question
 * cancels (FR-012). A missing or too long name sends the team member to step 1 and stores
 * nothing. Otherwise the flow is stored as a draft, with its step, and the overview confirms it
 * with its toast. While it saves, "Save and exit" reads "Saving…" and a polite status says
 * "Saving draft…" (F21, no saving modal). A failed save keeps the team member in the flow with
 * their work, and the toast "Couldn't save. Check your internet connection and try again." says
 * so, with "Try again" and the error ID of a server error, without moving the focus (FR-033,
 * F67; a `400` shows the server's message without "Try again").
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
 * An answer that fails otherwise shows as its save's toast or in the publish dialog, as any
 * failed save or publish does.
 *
 * Leaving (spec 008, FR-026; CLAR 2026-11-07 #8, #47; leaveFlow.ts): in a flow, the product name
 * and "Your connections" ask first. A new connection or a stored draft asks "Leave this
 * connection?": "Save progress" runs "Save and exit" (a missing name sends the team member to step
 * 1 with its message), and "Discard connection" leaves without storing and forgets the flow's
 * local draft. The edit flow of a published connection asks "Save your changes?" while it has
 * unsaved changes: "Save" opens the save dialog, which leaves to the details once saved, and
 * "Discard changes" leaves without saving. "Log out" with unsaved work asks "Save before you log
 * out?": "Save and log out" stores the flow as above and then logs out, "Log out anyway" forgets
 * the local draft and logs out, and the ×, Escape or the scrim return the focus to the account
 * pill (U17 6408:72919 draws no "Cancel"; bug v5-ui-fixes B8). If the account menu's warning about
 * other local drafts then cancels the log-out, the flow ends as without it: a stored flow exits as
 * its save does, a discarded one leaves for the overview. Only an answer that stores asks "Save
 * changes to Rule 01?" first. Closing or reloading the tab with unsaved work gets the browser's
 * "Leave site?". There is no router blocker (research V9): the browser's back button leaves
 * without asking, and the local draft is the safety net (005-S4).
 *
 * Local drafts (FR-014 to FR-018; R9, R10): a new connection and a stored draft keep their unsaved
 * work on this device, in the signed-in account's local draft of their flow key (`new-<uuid>` or
 * `draft-<id>`), written within a second of a change and on leaving the page. It holds only what
 * isn't safe elsewhere: it goes when the work comes back to the baseline (the empty flow, or the
 * stored draft as loaded on its edit route), and after a successful "Save and exit" or publish.
 * A stored draft's local draft resumed through `?local=` has no baseline, as that flow doesn't
 * read the stored draft, so only a save, a publish or a discard removes it. Leaving the flow
 * otherwise (the browser's back button), or a failed save, keeps it. The published edit flow
 * never has one.
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
 *
 * Links (spec 007, S5; FR-030, FR-031): the edit page opens a link's stored draft or published
 * connection at the rules step with `initialVariant` and `initialItem`. Once the rules step has
 * rendered, the variant's tab opens and the item is brought into view and focused (`goToItem()`),
 * or the variant's tab is focused for a variant's link. What the link names that isn't there, also
 * in unsaved changes restored on this device, shows the rules step's notice, which takes the focus;
 * the first variant, or the link's variant, is shown. A link applies once per opening, and stays in
 * the address while its variant is shown in the rules step: moving to another step or variant
 * calls `onLinkLeft`, and the edit page takes it out of the address.
 */
export default function FormConnectionEditorPage({
  firstConnection = false,
  origin,
  initialStates,
  initialStep = 'connection',
  baseline,
  onReload,
  reloaded = false,
  initialVariant = null,
  initialItem = null,
  linkNotice = null,
  onLinkLeft,
  example = null,
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
      initialVariant={initialVariant}
      initialItem={initialItem}
      linkNotice={linkNotice}
      onLinkLeft={onLinkLeft}
      example={example}
    />
  );
}

/**
 * Where the connection just published or saved opens: its details, right after publishing with
 * the Links open (FR-046; the details' `initialAccordionOf()`), after saving with "Changes saved."
 */
function detailsRouteOf(id: string, editing: boolean): [string, { state: DetailLocationState }] {
  const state: DetailLocationState = editing ? { saved: true } : { published: true };
  return [generatePath(ROUTES.formConnection, { id }), { state }];
}

/** The wizard of the flow the page opened, with its autosave into the local draft. */
function ConnectionWizard({
  flow,
  firstConnection,
  onReload,
  reloaded,
  initialVariant = null,
  initialItem = null,
  linkNotice: requestedNotice = null,
  onLinkLeft,
  example = null,
}: ConnectionWizardProps) {
  const { origin } = flow;
  // The connection being edited, only for the published origin (FR-026)
  const formConnection = origin.kind === 'published' ? origin.formConnection : undefined;
  // A scheduled connection's start date, which words the edit flow's texts (spec 010, S18; W6, W7)
  const scheduledStart = scheduledStartOf(formConnection);
  const [state, dispatch] = useReducer(editorReducer, flow.initialStates.editor);
  const [rules, dispatchRules] = useReducer(rulesReducer, flow.initialStates.rules);
  const [publishDialog, dispatchPublishDialog] = useReducer(
    publishDialogReducer,
    INITIAL_PUBLISH_DIALOG_STATE
  );
  // What the documents step shows of the documents (FR-031, research R8): the shown one, the
  // search, the removal its toast can undo. Here, since the footer and the toast are the editor's
  const [documentsView, dispatchView] = useReducer(
    documentsViewReducer,
    INITIAL_DOCUMENTS_VIEW_STATE
  );
  // An opened link's notice (S5; FR-031), checked again against the rules the wizard opens, until
  // it is dismissed
  const [linkNotice, setLinkNotice] = useState<LinkNoticeKind | null>(() =>
    requestedNotice === null && initialVariant !== null
      ? linkNoticeOf(flow.initialStates.rules, initialVariant, initialItem)
      : requestedNotice
  );
  // What the link opens once the rules step has rendered, applied once per opening (S5)
  const linkTarget = useRef(
    initialVariant !== null || linkNotice !== null
      ? {
          variantId: linkNotice === 'variant' ? null : initialVariant,
          itemId: linkNotice === null ? initialItem : null,
          notice: linkNotice,
        }
      : null
  );
  // The variant shown once the link was applied, until the team member moves from it (S5)
  const linkShown = useRef<string | null>(null);
  const editing = origin.kind === 'published';
  // The flow's local draft, for a new connection and a stored draft only (FR-014). Its content is
  // what "Save and exit" would store now (R9)
  const flowKey = origin.kind === 'published' ? null : origin.flowKey;
  // What the rules step's links name (S4; FR-028): the stored draft's or the published
  // connection's id; a new connection has none until it is stored
  const connectionId =
    origin.kind === 'draft'
      ? origin.draftId
      : origin.kind === 'published'
        ? origin.formConnection.id
        : null;
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
  // What is stored, to tell whether the flow holds unsaved work (FR-026): the local draft's
  // baseline, or a published connection's content as loaded
  const [storedContent] = useState(() =>
    origin.kind === 'published'
      ? localContentOf(flow.initialStates.editor, flow.initialStates.rules)
      : flow.baseline
  );
  const unsaved = hasUnsavedWork(origin.kind, localContent, storedContent);
  // The example's banners while the loaded draft is the example, whatever was changed, and its
  // line in the publish dialog while nothing was (spec 010, FR-058 to FR-060); a published
  // connection's flow is never the example (FR-059)
  const isExample = example !== null && origin.kind === 'draft';
  const exampleLine = isExample && showsExampleLine(example, localContent, storedContent);
  // The leave model (leaveFlow.ts): the state renders its question; the ref holds the latest
  // state for the steps that follow a save, after its rule question or its request
  const [leave, setLeave] = useState<LeaveFlowState>(INITIAL_LEAVE_FLOW_STATE);
  const leaveRef = useRef<LeaveFlowState>(INITIAL_LEAVE_FLOW_STATE);
  // UserMenu's log-out and its account pill, from the last "Log out" (UserMenu's `onLogOut`)
  const logOutRef = useRef<{
    logOut: (onCancelled?: () => void) => void;
    trigger: HTMLButtonElement | null;
  } | null>(null);
  // The failed save's toast (FR-033), shown while its failure is the editor's `draftError`: a
  // change of step or a new save takes it away, as does Escape on the toast. Its words are
  // composed as it shows (`saveFailureToastOf()`), so that a switch of the language words it anew
  const [saveFailure, setSaveFailure] = useState<{ error: DraftSaveError; id: number } | null>(
    null
  );
  // Counts the failures, so that each toast is new and announced again
  const saveFailures = useRef(0);
  // The website's language (spec 009): the catalog's labels come in it, the rules' texts compose
  // in it through the context below, and a switch rewords what shows without re-keying anything
  const { language } = useLanguage();
  // Today in Germany, which a start date must come after (spec 010, FR-003)
  const today = useTodayInGermany();
  const draftCopy = useCopy(DRAFT_COPY);
  const leaveCopy = useCopy(LEAVE_COPY);
  const documentsCopy = useCopy(DOCUMENTS_COPY);
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
  // The documents step's list: the documents the catalog offers, in the editor's order (FR-045)
  const listed = useMemo(
    () => listedDocumentsOf(state.documents, documentTypes),
    [state.documents, documentTypes]
  );
  // The documents step's question before a document goes (F72): which document, as the dialog
  // names it; null while none is asked (`removalDialogOf()`: with or without rules)
  const askedDocumentType =
    removalDialogOf(documentsView.confirmRemoval) === null
      ? undefined
      : documentTypes.find((type) => type.key === documentsView.confirmRemoval?.documentId);
  const askedDocumentRemoval: PendingRemoval | null = askedDocumentType
    ? { type: 'document', documentType: askedDocumentType.key, label: askedDocumentType.label }
    : null;
  // The documents "Set rules →" last flagged as having no data, in list order, which the dialog
  // about them names (F67, #55): their keys, kept as they were, so that the dialog's words don't
  // change while it fades out after "Remove 1 document"; their names are the catalog's of the
  // moment, so that they follow a switch of the language while it is open
  const [noDataIds, setNoDataIds] = useState<string[]>([]);
  const noDataNames = noDataIds.map((id) => labelOf(id, documentTypes));
  // The edit flow's "Save" asked about them (not "Set rules →"): "Remove n documents" then goes on
  // to the save dialog
  const saveAfterNoData = useRef(false);
  // Data the catalog dropped, once it has loaded; never in the published edit flow (FR-026)
  const dropped = useMemo(
    () =>
      catalogStatus === 'loaded' && !editing
        ? droppedDataOf(state.documents, documentTypes, language)
        : [],
    [catalogStatus, editing, state.documents, documentTypes, language]
  );
  // The Rules step needs the catalog and the value sets
  const rulesStatus =
    catalogStatus === 'failed' || optionSetsStatus === 'failed'
      ? 'failed'
      : catalogStatus === 'loaded' && optionSetsStatus === 'loaded'
        ? 'loaded'
        : 'loading';
  // A `RuleContext` with the language (spec 009, R4; contracts/rules-texts.md "The language on
  // the context"): a switch rebuilds it, so every text the rules logic composes from it follows,
  // with the catalog's labels in the same language
  const ruleCatalog: RulesCatalog & { language: Language } = useMemo(
    () => ({
      documents: ruleDocumentsInListOrder(documentTypes, state.documents),
      allDocuments: documentTypes,
      optionSets,
      language,
    }),
    [documentTypes, state.documents, optionSets, language]
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
  // "Test rules" is unusable while the rules are in error, and says why in the server's words
  // (FR-034; CLAR #66, Implement Q5); the open editor and grouping explain themselves first
  const rulesProblem = useMemo(
    () =>
      state.step === 'rules' && loadedCatalog && rules.editing === null && rules.selection === null
        ? (firstProblem(rules.branches, loadedCatalog)?.message ?? null)
        : null,
    [state.step, loadedCatalog, rules.editing, rules.selection, rules.branches]
  );
  // A conflict shows where it was met: after "Save and exit" in its own dialog, after publishing
  // in the publish dialog (S2), whose own state holds it
  const saveConflict = state.conflict?.during === 'save' ? state.conflict : null;
  const saveFailureToast =
    saveFailure !== null && saveFailure.error === state.draftError
      ? saveFailureToastOf(saveFailure.error, saveFailure.id, language)
      : null;
  const pageTitle = pageTitleOf(
    state.step,
    editing ? 'edit' : firstConnection ? 'first' : 'create',
    language
  );

  useDocumentTitle(pageTitle.title);

  // Closing or reloading the tab with unsaved work: the browser's own "Leave site?" (FR-026, V9).
  // Only while there is any, so that a flow without it closes silently
  useEffect(() => {
    if (!unsaved) {
      return;
    }
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Browsers before the standard way (Chrome and Edge before 119) need a return value
      event.returnValue = true;
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  // "Published" ("Saved") shows for 0.5 s, then the details open (FR-044d). A timer, not a
  // transition, so it stays under reduced motion (CLAR #33, FR-050); leaving the page first
  // cancels it
  const publishedId = publishDialog.phase === 'published' ? publishDialog.connectionId : null;
  useEffect(() => {
    if (publishedId === null) {
      return;
    }
    const timer = window.setTimeout(
      () => navigate(...detailsRouteOf(publishedId, editing)),
      PUBLISHED_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [publishedId, editing, navigate]);

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
      // The documents' undo toast has gone with the step (`goToStep`), and the search card
      dispatchView({ type: 'expireRemoval' });
      dispatchView({ type: 'clearSearch' });
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

  // An opened link (S5; FR-030), once the rules step has rendered with its rules: its variant's
  // tab opens first; then its item, or else its tab, takes the focus, or the notice does when the
  // link names what isn't there. A flow that opened elsewhere for dropped data (S8) applies it when
  // the rules step first shows
  useEffect(() => {
    const target = linkTarget.current;
    if (target === null || state.step !== 'rules' || rulesStatus !== 'loaded') {
      return;
    }
    if (target.variantId !== null && rules.openBranch !== target.variantId) {
      // Runs again once the variant is shown
      dispatchRules({ type: 'selectBranch', branchKey: target.variantId });
      return;
    }
    linkTarget.current = null;
    linkShown.current = rules.openBranch;
    const { variantId, itemId, notice } = target;
    requestAnimationFrame(() => {
      if (notice !== null) {
        document.getElementById(LINK_NOTICE_ID)?.focus();
      } else if (variantId !== null && itemId !== null) {
        goToItem(variantId, itemId);
      } else if (variantId !== null) {
        document.getElementById(ELEMENT_IDS.branchTab(variantId))?.focus();
      }
    });
  }, [state.step, rulesStatus, rules.openBranch]);

  // Once the team member moves to another step or variant, the link no longer names what is
  // shown, and the edit page takes it out of the address (S5)
  useEffect(() => {
    const shown = linkShown.current;
    if (shown !== null && (state.step !== 'rules' || rules.openBranch !== shown)) {
      linkShown.current = null;
      onLinkLeft?.();
    }
  }, [state.step, rules.openBranch, onLinkLeft]);

  // The step's toast goes: a removed document can no longer come back through it
  const dismissToast = useCallback(() => {
    dispatch({ type: 'dismissToast' });
    dispatchView({ type: 'expireRemoval' });
  }, []);
  const dismissSaveFailure = useCallback(() => setSaveFailure(null), []);
  const dismissRulesToast = useCallback(() => dispatchRules({ type: 'dismissToast' }), []);

  /** Shows the messages, then moves the focus to the first problem (step 1's fields). */
  function refuse(errors: EditorErrors) {
    flushSync(() => dispatch({ type: 'showErrors', errors }));
    const id = firstInvalidElementId(errors);
    if (id) {
      document.getElementById(id)?.focus();
    }
  }

  function handleContinue() {
    const errors = validateConnection(state.name, state.description, language);
    if (hasErrors(errors)) {
      refuse(errors);
      return;
    }
    dispatch({ type: 'goToStep', step: 'documents' });
  }

  /**
   * "Set rules →" (FR-031, F67): unusable with "Add a document first" while no document is added
   * (the footer's `ExplainedButton`); otherwise the documents without data are flagged and "No
   * data selected in 1 document" asks about them (U25 A13), or, with none, the rules step opens
   * and the flags go.
   */
  function handleAddRules() {
    const ids = needsDataOf(state.documents, documentTypes);
    saveAfterNoData.current = false;
    flagNeedsData(ids);
    if (ids.length === 0) {
      dispatch({ type: 'goToStep', step: 'rules' });
    }
  }

  /** Flags the documents without data, and with any asks about them (U25 A13; F67, #55). */
  function flagNeedsData(ids: string[]) {
    dispatchView({ type: 'flagNeedsData', documentIds: ids });
    if (ids.length > 0) {
      setNoDataIds(
        listed
          .filter(({ documentType }) => ids.includes(documentType.key))
          .map(({ documentType }) => documentType.key)
      );
    }
  }

  /**
   * The dialog's "Choose data", its ×, Escape and the scrim: it closes and the team member stays
   * on the documents step with the flagged documents marked (U25 A14), the shown one if it is
   * flagged, else the first flagged one. Its "All data items", which the red line describes,
   * takes the focus from "Set rules →", where the dialog returns it.
   */
  function handleChooseData() {
    const listIds = listIdsOf(listed);
    const after = documentsViewReducer(documentsView, { type: 'chooseData', listIds });
    const shown = listIds[after.selectedIndex];
    flushSync(() => dispatchView({ type: 'chooseData', listIds }));
    requestAnimationFrame(() => {
      if (shown) {
        document.getElementById(ELEMENT_IDS.allData(shown))?.focus();
      }
    });
  }

  /**
   * The dialog's "Remove 1 document" / "Remove <n> documents" (#55): the flagged documents go at
   * once, without an undo toast (`removeDropped`; the dialog was the question). It answers "Set
   * rules →": with documents left, which all have data, the rules step opens, as the baseline's
   * "Remove them and continue" did (#14 (c); #55 changed its label only). With none left the
   * team member stays, the focus on "Add document". Rules that check a removed document stay and
   * are named in the rules step's checks (002-S1.3): its data was deselected through 002-S1.1's
   * dialog already, so no second question is asked. Asked by the edit flow's "Save", it answers
   * "Save" instead: with documents left, the save goes on to its pre-checks and "Save changes?".
   */
  function handleRemoveNeedingData() {
    const flagged = documentsView.needsData.documentIds;
    const items: DroppedData[] = listed
      .filter(({ documentType }) => flagged.includes(documentType.key))
      .map(({ documentType }) => ({
        documentType: documentType.key,
        field: null,
        label: documentType.label,
      }));
    const remaining = state.documents.filter(
      (document) => !flagged.includes(document.document_type)
    );
    const listIds = listIdsOf(listed);
    flushSync(() => {
      dispatch({ type: 'removeDropped', items });
      dispatchView({ type: 'removeNeedsDataDone', listIds });
    });
    if (remaining.length > 0 && needsDataOf(remaining, documentTypes).length === 0) {
      if (saveAfterNoData.current) {
        saveAfterNoData.current = false;
        publishRules(rules, remaining);
        return;
      }
      dispatch({ type: 'goToStep', step: 'rules' });
      return;
    }
    requestAnimationFrame(() => document.getElementById(DOCUMENTS_STEP_IDS.addDocument)?.focus());
  }

  /**
   * Publishing's pre-checks (spec 002, FR-006), with the rules as they are now, which "Test
   * rules" passes too (spec 004, FR-002; W3): a problem refuses with the server's message, shown
   * in the rules step where publishing shows it, opens the branch it names and moves the focus to
   * the rule (F11). Without the catalog, which is loading or failed to load, they would refuse
   * every rule, so the server's checks alone apply then. Whether they pass. `documents`: the
   * requested documents, when they changed since this render (after "Remove n documents").
   */
  function passesPreChecks(current: RulesState, documents = state.documents): boolean {
    const catalog =
      documents === state.documents
        ? ruleCatalog
        : { ...ruleCatalog, documents: ruleDocumentsInListOrder(documentTypes, documents) };
    const problem = rulesStatus === 'loaded' ? firstProblem(current.branches, catalog) : null;
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
   * "Publish" on the test step, "Publish without rules" on the rules step, or the edit flow's
   * "Save" on any step: the pre-checks, then the publish and save dialog from the current step
   * (FR-003, FR-045; O6). The personas' results refuse, delay and ask nothing. Without any rule it
   * asks "Publish without rules?" ("Save without rules?"; 002-S5.6): the documents step no longer
   * offers it (F17), so the question comes with the rules step's "Publish without rules", and
   * with the edit flow's "Save" on a step or from a leave question.
   *
   * The edit flow checks what the steps would have checked first (`passesSaveChecks()`): its
   * steps are links (F25), so the team member may not have gone through them.
   */
  function publishRules(current: RulesState, documents = state.documents) {
    if ((!editing || passesSaveChecks(documents)) && passesPreChecks(current, documents)) {
      dispatch({ type: 'openDialog' });
      dispatchPublishDialog({
        type: 'open',
        from: state.step,
        withoutRules: rulesNextActionOf(current) === 'publishWithoutRules',
      });
      return;
    }
    // The edit flow's "Save" from a leave question stays in the flow, at the problem
    stepLeave({ type: 'failed' });
  }

  /**
   * The edit flow's "Save" (FR-045; FR-026, #47: a validation error keeps the team member in the
   * flow), on the step that holds the problem: step 1's name and description, with their
   * messages and the focus on the first field, as "Choose documents →" does; then the documents
   * without data, flagged with "No data selected in 1 document", as "Set rules →" does (F67,
   * #55), whose "Remove 1 document" goes on with the save. Whether they pass.
   */
  function passesSaveChecks(documents: RequestedDocument[]): boolean {
    const errors = validateConnection(state.name, state.description, language);
    if (hasErrors(errors)) {
      if (state.step !== 'connection') {
        flushSync(() => dispatch({ type: 'goToStep', step: 'connection' }));
      }
      refuse(errors);
      return false;
    }
    const ids = needsDataOf(documents, documentTypes);
    if (ids.length > 0) {
      if (state.step !== 'documents') {
        flushSync(() => dispatch({ type: 'goToStep', step: 'documents' }));
      }
      saveAfterNoData.current = true;
      flagNeedsData(ids);
      return false;
    }
    return true;
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
    if (state.savingDraft || state.publishing) {
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
   * "Save and exit", or the failed save toast's "Try again": through the rule editor's question
   * first, whose either answer goes on with the save, and closing it cancels the save (S1;
   * FR-012).
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
   * keeps the team member in the flow with their work, and the failed save's toast says why
   * (FR-013, FR-033). Another team member's save, publish or deletion of the stored draft opens
   * the conflict dialog instead (S2). `replace`, its "Replace their changes", sends the same save
   * over their changes.
   */
  async function saveDraftAndExit(current: RulesState, replace = false) {
    const errors = draftNameErrors(state.name, language);
    if (hasErrors(errors)) {
      // "Save progress" or "Save and log out" stays in the flow too (FR-026, F18)
      stepLeave({ type: 'failed' });
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
      // A leave question's save stays in the flow, where the failure or the conflict shows
      stepLeave({ type: 'failed' });
      if (handleUnauthorized(error)) {
        return;
      }
      const conflict = conflictOf(error, origin, 'save', language);
      if (conflict) {
        dispatch({ type: 'draftConflict', conflict });
        return;
      }
      showDraftSaveFailure(error);
    }
  }

  /**
   * A stored draft: the local draft has no unsaved work left (FR-018), and the overview says so;
   * after "Save and log out", the team member logs out instead (FR-026).
   */
  function exitWithSavedDraft(name: string) {
    forget();
    const effect = stepLeave({ type: 'saved' });
    const locationState: OverviewLocationState = { draftSaved: name };
    const toOverview = () => navigate(ROUTES.overview, { state: locationState });
    if (effect.type === 'logOut') {
      // The draft is stored: a cancelled log-out exits as "Save and exit" does
      logOutNow(effect.forget, toOverview);
      return;
    }
    toOverview();
  }

  /**
   * A failed draft save, also an answer of the conflict dialog, whose dialog closes first and
   * returns the focus to "Save and exit": the failed save's toast, which replaces the toast
   * shown and leaves the focus where it is (FR-033, F67, W20). A network failure or a `5xx`
   * offers "Try again"; a `400` shows the server's message. Either goes after the toast's
   * 6 seconds (FR-082), and "Save and exit" is still there.
   */
  function showDraftSaveFailure(error: unknown) {
    if (state.conflict) {
      flushSync(() => dispatch({ type: 'closeConflict' }));
    }
    const failure = draftSaveErrorOf(error, language);
    saveFailures.current += 1;
    dispatch({ type: 'saveDraftFailed', error: failure });
    // One toast at a time (research R8): the failure replaces the step's
    dispatch({ type: 'dismissToast' });
    dispatchView({ type: 'expireRemoval' });
    dispatchRules({ type: 'dismissToast' });
    // Negative, so that it never shares an id with the step's toasts in the one region
    setSaveFailure({ error: failure, id: -saveFailures.current });
  }

  /**
   * The failed save's "Try again": the toast goes with its button, so the focus moves to "Save
   * and exit", which reads "Saving…" while the save runs again (FR-033)
   */
  function retrySave() {
    flushSync(() => setSaveFailure(null));
    document.getElementById(ELEMENT_IDS.saveAndExit)?.focus();
    handleSaveAndExit();
  }

  /**
   * A failed publish, also an answer of a conflict in the publish dialog, which shows why: the
   * failure over the summary (F46), or after `409 rules_changed` the conflict (W9)
   */
  function showPublishFailure(error: unknown) {
    if (state.conflict) {
      dispatch({ type: 'closeConflict' });
    }
    dispatch({
      type: 'publishFailed',
      error: publishErrorNotice(error, editing, language),
      rulesChanged: isRulesChanged(error),
    });
    dispatchPublishDialog(
      isRulesChanged(error)
        ? {
            type: 'conflict',
            conflict: { kind: 'rules_changed', message: error.data.message },
          }
        : { type: 'failed', failure: publishFailureOf(error, editing, language) }
    );
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

  /** A step of the leave model (leaveFlow.ts), for a save's outcome: what follows it */
  function stepLeave(action: LeaveFlowAction): LeaveEffect {
    const { state: next, effect } = leaveFlowStep(leaveRef.current, action);
    leaveRef.current = next;
    setLeave(next);
    return effect;
  }

  /**
   * A question or an answer of the leave model: its dialog opens or closes at once, so that the
   * focus can move where the answer leads (step 1's name, the rule question, the account pill),
   * and then the editor does what the model decided.
   */
  function answerLeave(action: LeaveFlowAction) {
    const { state: next, effect } = leaveFlowStep(leaveRef.current, action);
    leaveRef.current = next;
    flushSync(() => setLeave(next));
    switch (effect.type) {
      case 'leave':
        if (effect.forget) {
          forget();
        }
        navigate(ROUTES.overview);
        return;
      case 'store':
        // Through "Save changes to Rule 01?" while the rule has unsaved changes (Q8 (c)); a save
        // that ends without storing reports `failed`
        leaveEditor(effect.via === 'saveAndExit' ? { type: 'saveAndExit' } : { type: 'publish' });
        return;
      case 'logOut':
        // "Log out anyway" has forgotten the flow's local draft: a cancelled log-out leaves the
        // flow, as "Discard connection" does; otherwise the flow stays as it is
        logOutNow(effect.forget, effect.forget ? () => navigate(ROUTES.overview) : undefined);
        return;
      case 'focusUserMenu':
        logOutRef.current?.trigger?.focus();
        return;
      case 'none':
      case 'exit':
        return;
    }
  }

  /** The product name and "Your connections" in the header (TopBar's `onLeave`; FR-026) */
  function handleLeave() {
    answerLeave({ type: 'askLeave', context: leaveContext() });
  }

  /** "Log out" in the account menu (UserMenu's `onLogOut`; FR-026, F20) */
  function handleLogOut(
    logOut: (onCancelled?: () => void) => void,
    trigger: HTMLButtonElement | null
  ) {
    logOutRef.current = { logOut, trigger };
    answerLeave({ type: 'askLogout', context: leaveContext() });
  }

  /** What the leave model decides from: the flow, its unsaved work, a save or publish running */
  function leaveContext(): LeaveFlowContext {
    return { origin: origin.kind, unsaved, busy: state.savingDraft || state.publishing };
  }

  /**
   * Logs out as "Log out" does (UserMenu): the local drafts flushed, the warning if the account
   * still has any on this device, then the sign-in screen with "You're logged out.". The flow's
   * own local draft goes first, when `forgetDraft`, so that the warning doesn't name it (T031).
   * `onCancelled` runs when that warning's "Cancel" keeps the team member signed in.
   */
  function logOutNow(forgetDraft: boolean, onCancelled?: () => void) {
    if (forgetDraft) {
      forget();
    }
    logOutRef.current?.logOut(onCancelled);
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
    const action = keep
      ? ({ type: 'saveRule', language } as const)
      : ({ type: 'closeEditor' } as const);
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
    // "Schedule" with a day that isn't after today publishes nothing and shows the field's error
    // (spec 010, FR-003); "Schedule" stays enabled
    const start = publishStartDateOf(publishDialog, editing, today);
    if (!start.ok) {
      dispatchPublishDialog({ type: 'dateRefused' });
      return;
    }
    // "On a date" sends the day; "Now" sends the body as before (FR-001, FR-002)
    const startDate = start.date === null ? {} : { start_date: start.date };
    dispatch({ type: 'publish' });
    dispatchPublishDialog({ type: 'publish' });
    try {
      // Editing sends the name and the documents, which create no revision when unchanged, and
      // the rules only when they changed (FR-028). A stored draft is published at the version
      // the flow opened (R12)
      const payload = createPayload(state, rules, { loaded: formConnection, replace });
      const saved =
        origin.kind === 'draft'
          ? await publishDraft(origin.draftId, {
              ...createPayload(state, rules),
              ...startDate,
              version: origin.draftVersion,
              replace,
            })
          : formConnection
            ? await updateFormConnection(formConnection.id, payload)
            : await createFormConnection({ ...payload, ...startDate });
      // Published: the local draft has no unsaved work left (FR-018)
      if (!editing) {
        forget();
      }
      // The edit flow's "Save and log out" logs out once saved (FR-026), without "Saved", which
      // says that the details open; a cancelled log-out opens them as the save does
      const effect = stepLeave({ type: 'saved' });
      if (effect.type === 'logOut') {
        dispatchPublishDialog({ type: 'close' });
        logOutNow(effect.forget, () => navigate(...detailsRouteOf(saved.id, editing)));
        return;
      }
      // "Published" ("Saved"), then the details (the effect below; FR-044d)
      dispatchPublishDialog({ type: 'published', connectionId: saved.id });
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }
      const conflict = conflictOf(error, origin, 'publish', language);
      if (conflict) {
        dispatch({ type: 'draftConflict', conflict });
        dispatchPublishDialog({ type: 'conflict', conflict });
        return;
      }
      if (isInvalidStartDate(error)) {
        // The day changed while the dialog was open: nothing was published, and the field shows
        // its error as for a day typed wrong (FR-003, W1)
        dispatch({
          type: 'publishFailed',
          error: publishErrorNotice(error, editing, language),
          rulesChanged: false,
        });
        dispatchPublishDialog({ type: 'dateRefused' });
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
    dispatchPublishDialog({ type: 'close' });
    dispatch({ type: 'closeConflict' });
    // Opened by a leave question's "Save": the team member stays in the flow (FR-026)
    stepLeave({ type: 'failed' });
  }

  /**
   * Deletes the rule or group, then gives the focus to the item after it in its level, or the
   * one before it, or to "Add rule". A deleted variant gives it to the tab to its left.
   */
  function handleConfirmDelete() {
    const { dialog } = rules;
    if (dialog?.type === 'deleteVariant') {
      // The tab to the left opens in the deleted variant's place (FR-051 (33))
      const index = rules.branches.findIndex((branch) => branch.key === dialog.branchKey);
      dispatchRules({ type: 'confirmDelete', language });
      focusSoon(ELEMENT_IDS.branchTab(rules.branches[Math.max(index - 1, 0)].key));
      return;
    }
    if (dialog?.type !== 'deleteRule' && dialog?.type !== 'deleteGroup') {
      return;
    }
    const itemId = dialog.type === 'deleteRule' ? dialog.ruleId : dialog.groupId;
    const neighbour = neighbourOf(rules, dialog.branchKey, itemId);
    dispatchRules({ type: 'confirmDelete', language });
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
      // An undone variant deletion names no item: the focus goes to the variant's tab
      const id = undo.itemId
        ? ELEMENT_IDS.rule(undo.branchKey, undo.itemId)
        : ELEMENT_IDS.branchTab(undo.branchKey);
      document.getElementById(id)?.focus();
    }
  }

  // Undo stays reachable after its toast has gone, until the next change (B4, WCAG 2.2.1); not
  // while a rule is being edited, whose fields have their own undo
  useUndoShortcut(state.step === 'rules' && rules.undo !== null && !rules.editing, undoRules);

  /**
   * "Back to test", opened from the test step, closes the dialog to it (FR-044a; supersedes
   * 004-S5.3). Opened from another step, "Check rules again" closes it and opens the rules step
   * (from step 1 or the documents, after the edit flow's "Save") at the first branch, in tab order, that the dialog lists findings for, or stays on the open branch when
   * none has (FR-017; research R11). "Add rules", after "Publish without rules?", opens the rules
   * step, or stays there. "Reload" after `409 rules_changed` is the dialog's `onReload`, not this.
   */
  function handleDialogCancel() {
    if (state.publishing) {
      return;
    }
    dispatch({ type: 'closeDialog' });
    dispatchPublishDialog({ type: 'close' });
    // Opened by a leave question's "Save": the team member stays in the flow (FR-026)
    stepLeave({ type: 'failed' });
    if (publishDialog.withoutRules) {
      // "Add rules": the rules step, where the dialog may have opened
      if (state.step !== 'rules') {
        dispatch({ type: 'goToStep', step: 'rules' });
      }
      return;
    }
    if (publishDialog.from === 'test') {
      return;
    }
    // From step 1 or the documents (the edit flow's "Save"), the rules are on their own step
    if (state.step !== 'rules') {
      dispatch({ type: 'goToStep', step: 'rules' });
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
  function removeOrAsk(removal: PendingRemoval): boolean {
    if (rulesCheckingRemoval(rules.branches, dataRemovalOf(removal), state.documents).length > 0) {
      dispatch({ type: 'askRemoval', removal });
      return false;
    }
    dispatch(removalAction(removal));
    return true;
  }

  /**
   * A list item's "Remove document" (its ⋯ menu) in the documents step: always asks first (F72),
   * "Keep document" / "Remove document", naming the rules that check the document when there are
   * any (002-S1.1).
   */
  function handleRemove(documentType: DocumentType) {
    dispatchView({
      type: 'askRemoval',
      documentId: documentType.key,
      rules: rulesCheckingDocument(rules.branches, state.documents, documentType),
    });
  }

  /**
   * "Remove document": the editor removes the asked document with its undo toast, the question
   * closes and the next document shows in its place, the previous one at the end (U24 A12). Its
   * ⋯ has gone with it, so the focus goes to the shown document's list item, or to "Add
   * document" once none is left.
   */
  function handleConfirmDocumentRemoval() {
    const asked = documentsView.confirmRemoval;
    const documentType = documentTypes.find((type) => type.key === asked?.documentId);
    if (!asked || !documentType) {
      dispatchView({ type: 'keepDocument' });
      return;
    }
    const listIds = listIdsOf(listed);
    const remaining = listIds.filter((id) => id !== asked.documentId);
    const shown =
      remaining[indexAfterRemoval(listIds, documentsView.selectedIndex, [asked.documentId])];
    flushSync(() => {
      dispatch({
        type: 'removeDocument',
        documentType: documentType.key,
        label: documentType.label,
      });
      dispatchView({ type: 'confirmRemovalDone', listIds });
    });
    // After the dialog has closed, which returns the focus to the ⋯ that has gone
    requestAnimationFrame(() =>
      document
        .getElementById(shown ? DOCUMENTS_STEP_IDS.listItem(shown) : DOCUMENTS_STEP_IDS.addDocument)
        ?.focus()
    );
  }

  /** A pick in the documents step's search card: the document is added and shown (U21 A5). */
  function handleAddDocument(documentType: DocumentType) {
    const listIds = listIdsOf(listed);
    // At the end of the list (FR-045)
    dispatch({ type: 'addDocument', documentType: documentType.key });
    dispatchView({ type: 'select', index: indexAfterAdding(listIds, documentType.key) });
    dispatchView({ type: 'clearSearch' });
  }

  /**
   * Moves a listed document to `toIndex` of the list (FR-046, FR-047; the ⋯ menu's "Move up" and
   * "Move down", and the drag): the editor moves it among its documents, and the open document
   * stays open, the pager counting in the new order. A refused move changes nothing.
   */
  function handleMoveDocument(documentType: string, toIndex: number) {
    const listIds = listIdsOf(listed);
    dispatch({
      type: 'moveDocument',
      documentType,
      toIndex: documentIndexOfListIndex(state.documents, listIds, toIndex),
    });
    dispatchView({
      type: 'select',
      index: selectedIndexAfterMove(listIds, documentsView.selectedIndex, documentType, toIndex),
    });
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
    const restored = state.removed?.document.document_type;
    flushSync(() => {
      dispatch({ type: 'undoRemove' });
      // The document shows again, at the place it had (FR-045)
      dispatchView({ type: 'undoRemoval', listIds: listIdsOf(listed) });
    });
    // The toast and its button are gone; the focus goes to the restored document's list item
    if (restored) {
      document.getElementById(DOCUMENTS_STEP_IDS.listItem(restored))?.focus();
    }
  }

  /**
   * A step of the step line, which leads to it: in the edit flow of a published connection only
   * (F25). The test step opens through the gate of "Test rules" (FR-002). Every other step opens
   * at once, forward too, without the current step's checks: the step line moves between the
   * parts of a connection that is complete, and "Save" checks them all before it asks (FR-045;
   * `passesSaveChecks()`).
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
            editing={editing}
            description={state.description}
            errors={connectionErrorsOf(state.errors, state.name, state.description, language)}
            onChangeName={(value) => dispatch({ type: 'changeName', value })}
            onChangeDescription={(value) => dispatch({ type: 'changeDescription', value })}
            onSubmit={handleContinue}
            scheduledStart={scheduledStart}
            isExample={isExample}
          />
        );
      case 'documents':
        return (
          <DocumentsStep
            catalogStatus={catalogStatus}
            documentTypes={documentTypes}
            documents={state.documents}
            dropped={dropped}
            droppedNoteRef={droppedNoteRef}
            onRemoveDropped={handleRemoveDropped}
            onRetryCatalog={retry}
            view={documentsView}
            dispatchView={dispatchView}
            onAdd={handleAddDocument}
            onRemove={handleRemove}
            onMove={handleMoveDocument}
            onSetField={handleSetField}
            onSetAllFields={handleSetAllFields}
            onClearGroup={removeOrAsk}
            isExample={isExample}
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
            connectionId={connectionId}
            linkNotice={linkNotice}
            onDismissLinkNotice={() => setLinkNotice(null)}
            dispatch={dispatchRules}
            onAddRule={(branchKey, parentId) => leaveEditor({ type: 'add', branchKey, parentId })}
            onEditRule={(branchKey, ruleId) => leaveEditor({ type: 'edit', branchKey, ruleId })}
            onAddData={() => leaveEditor({ type: 'documents' })}
            onSaveRule={() => dispatchRules({ type: 'saveRule', language })}
            onCancelEditor={() => leaveEditor({ type: 'cancel' })}
            isExample={isExample}
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
            saveFailed={saveFailureToast !== null}
            isExample={isExample}
          />
        );
    }
  }

  return (
    <WizardLayout
      title={headerTitleOf(state, language, formConnection, origin.kind === 'draft')}
      badge={
        origin.kind === 'draft' ? (
          <ConnectionStatusBadge state="draft" />
        ) : formConnection ? (
          // "Active" (U98 6731:39823), never "Draft changes" (F5); "Scheduled · <date>" (E6
          // 7114:49835, FR-013) or "Deactivated" when it is
          <ConnectionStatusBadge
            state={formConnection.state}
            startDate={formConnection.start_date}
          />
        ) : undefined
      }
      onLeave={handleLeave}
      onLogOut={handleLogOut}
      head={
        <>
          <WizardProgress
            steps={CONNECTION_STEPS}
            current={STEP_ORDER.indexOf(state.step)}
            onSelect={editing ? selectStep : undefined}
          />
          <PageTitle ref={titleRef} title={pageTitle.title} hint={pageTitle.hint} size="large" />
        </>
      }
      footer={
        <EditorFooter
          step={state.step}
          editing={editing}
          publishing={state.publishing}
          rulesNextAction={rulesNextAction}
          ruleOpen={rules.editing !== null}
          grouping={rules.selection !== null}
          rulesProblem={rulesProblem}
          onBack={goBack}
          onAddRules={handleAddRules}
          addRulesExplanation={state.documents.length === 0 ? documentsCopy.addDocumentFirst : null}
          onTestRules={() => leaveEditor({ type: 'test' })}
          onPublish={handlePublish}
          canSaveDraft={origin.kind !== 'published'}
          savingDraft={state.savingDraft}
          onSaveAndExit={handleSaveAndExit}
          // "Discard your changes?" (T083): back to the details, unchanged (FR-045 (c))
          onDiscard={
            formConnection
              ? () => navigate(generatePath(ROUTES.formConnection, { id: formConnection.id }))
              : undefined
          }
          scheduledStart={scheduledStart}
        />
      }
      overlay={
        <>
          <PublishDialog
            dialog={publishDialog}
            editing={editing}
            documentLines={documentLines(state.documents, documentTypes, language)}
            ruleLines={ruleLines(rules, publishDialog.withoutRules, language)}
            branches={rules.branches}
            checks={ruleChecks.byBranch}
            busy={state.publishing}
            onCancel={handleDialogCancel}
            onClose={handleCloseDialog}
            onConfirm={() => void handleConfirm()}
            onActiveFromChange={(choice) =>
              dispatchPublishDialog({ type: 'chooseActiveFrom', choice })
            }
            onStartDateTextChange={(text) => dispatchPublishDialog({ type: 'typeStartDate', text })}
            onReload={handleReload}
            onReplace={() => void handleConfirm(true)}
            onOpenConnection={handleOpenConnection}
            onSaveAsNew={() => void handleSaveAsNew('publish')}
            exampleLine={exampleLine}
            scheduledStart={scheduledStart}
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
          {/* Leaving the flow (FR-026; leaveFlow.ts): U17 7173:52682, U99 7173:52836 and U17
              6408:72919 with the "Cancel" of F20 */}
          <ConfirmDialog
            open={leave.status === 'leaveAsked'}
            title={leaveCopy.leaveTitle}
            text={leaveCopy.leaveText}
            secondaryLabel={leaveCopy.discardConnection}
            secondaryDanger
            onSecondary={() => answerLeave({ type: 'discard' })}
            confirmLabel={leaveCopy.saveProgress}
            onCancel={() => answerLeave({ type: 'cancel' })}
            onConfirm={() => answerLeave({ type: 'saveProgress' })}
          />
          <ConfirmDialog
            open={leave.status === 'saveAsked'}
            title={leaveCopy.saveTitle}
            text={saveQuestionTextOf(scheduledStart, leaveCopy)}
            secondaryLabel={leaveCopy.discardChanges}
            secondaryDanger
            onSecondary={() => answerLeave({ type: 'discard' })}
            confirmLabel={leaveCopy.save}
            onCancel={() => answerLeave({ type: 'cancel' })}
            onConfirm={() => answerLeave({ type: 'saveProgress' })}
          />
          {/* U17 6408:72919: two buttons side by side; the ×, Escape and the scrim cancel */}
          <ConfirmDialog
            open={leave.status === 'logoutAsked'}
            title={leaveCopy.logoutTitle}
            text={leaveCopy.logoutText}
            secondaryLabel={leaveCopy.logOutAnyway}
            onSecondary={() => answerLeave({ type: 'logoutAnyway' })}
            confirmLabel={leaveCopy.saveAndLogOut}
            onCancel={() => answerLeave({ type: 'cancel' })}
            onConfirm={() => answerLeave({ type: 'saveAndLogout' })}
          />
          <RemoveDataDialog
            removal={
              state.pendingRemoval &&
              removalInLanguage(state.pendingRemoval, documentTypes, language)
            }
            rules={
              state.pendingRemoval
                ? removedDataRulesOf(state.pendingRemoval, rules.branches, state.documents)
                : []
            }
            editing={editing}
            onCancel={() => dispatch({ type: 'cancelRemoval' })}
            onConfirm={handleConfirmRemoval}
          />
          {/* A list item's "Remove document": the documents step's own question (F72) */}
          <RemoveDataDialog
            removal={askedDocumentRemoval}
            rules={documentsView.confirmRemoval?.rules ?? []}
            editing={editing}
            onCancel={() => dispatchView({ type: 'keepDocument' })}
            onConfirm={handleConfirmDocumentRemoval}
          />
          {/* "Set rules →" with documents without data (U25 7299:52174; F67, #55; T035's form) */}
          <ConfirmDialog
            open={documentsView.needsData.asking}
            title={noDataTitle(noDataNames.length, language)}
            text={noDataText(noDataNames, language)}
            secondaryLabel={removeDocumentsLabel(noDataNames.length, language)}
            secondaryDanger
            onSecondary={handleRemoveNeedingData}
            confirmLabel={documentsCopy.chooseData}
            onCancel={handleChooseData}
            onConfirm={handleChooseData}
          />
          <RulesDialogs
            state={rules}
            context={{ documents: ruleCatalog.allDocuments, optionSets, language }}
            editing={editing}
            active={formConnection?.is_active ?? true}
            dispatch={dispatchRules}
            onCancel={() => {
              dispatchRules({ type: 'closeDialog' });
              // Closing "Save changes to Rule 01?" cancels a leave question's save (FR-026)
              stepLeave({ type: 'failed' });
            }}
            onConfirmDelete={handleConfirmDelete}
            onSaveChanges={() => answerSaveChanges(true)}
            onDiscardChanges={() => answerSaveChanges(false)}
          />
          {/* One toast at a time: the failed save's, or the step's (research R8) */}
          {saveFailureToast ? (
            <Toast toast={saveFailureToast} onAction={retrySave} onDismiss={dismissSaveFailure} />
          ) : state.step === 'rules' ? (
            <Toast
              toast={rules.toast}
              onAction={handleRulesToastAction}
              onDismiss={dismissRulesToast}
            />
          ) : (
            <Toast
              toast={documentsToastOf(state.toast, state.removed, documentTypes, language)}
              onAction={handleUndo}
              onDismiss={dismissToast}
            />
          )}
          {/* Outside the steps, so that it stays across a change of step (FR-015) */}
          <FindingsAnnouncer announcement={ruleChecks.announcement} />
          {/* "Save and exit" in progress (S1.3): always in the page, so that its text is read */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {state.savingDraft ? draftCopy.savingStatus : ''}
          </div>
        </>
      }
    >
      {/* On /get-started, the unsaved work on this device except this flow's own (S4; FR-016) */}
      {firstConnection && state.step === 'connection' && (
        <LocalDraftsOffer exceptFlowKey={flowKey ?? undefined} emptyFocusRef={titleRef} />
      )}
      {renderStep()}
    </WizardLayout>
  );
}
