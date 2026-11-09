import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  EditorStep,
  FormConnection,
  RequestedDocument,
} from '@connection-portal/api-types/form-connections';
import type { FindingTone, RuleChecks } from '@connection-portal/rules/checks/types';
import type { Ref } from 'react';

import type { ToastContent } from '../../components/Toast/types';
import type { LocalDraftContent, LocalDraftRecord } from '../../utils/localDrafts/types';
import type { LinkNoticeKind, RulesBranch, RulesState } from './RulesStep/types';

/**
 * Where the flow's content comes from (research R12): a new connection, a stored draft, or a
 * published connection, whose edit flow stays as it is (FR-026). A new connection and a stored
 * draft carry their flow key, which names their local draft (`new-<uuid>` or `draft-<id>`; R10).
 * A published connection has none, since it never has a local draft (FR-014)
 */
export type EditorOrigin =
  /** /form-connections/new and /get-started */
  | { kind: 'new'; flowKey: string }
  /** A stored draft, at the version the flow opened (or last saved) */
  | { kind: 'draft'; draftId: string; draftVersion: number; flowKey: string }
  /** The connection to edit, at /form-connections/:id/edit */
  | { kind: 'published'; formConnection: FormConnection };

/**
 * What `/form-connections/new?local=<flowKey>` opens (contracts/local-drafts.md "Rules for
 * callers" 1; R10)
 */
export type EditorEntry =
  /** No or an invalid `?local=`: a fresh flow under a new flow key */
  | { kind: 'fresh' }
  /** The account's record of that key: the flow resumes from it */
  | { kind: 'local'; record: LocalDraftRecord }
  /** A `draft-<id>` key without a record: the stored draft's edit route */
  | { kind: 'missingDraft'; draftId: string }
  /** A `new-` key without a record: an empty flow under that key */
  | { kind: 'empty'; flowKey: string };

/**
 * A flow the editor opens, decided once when the page mounts (R10, R12; data-model.md section 6),
 * from `startOfEntry()` or `startOfOrigin()`
 */
export interface EditorFlow {
  kind: 'open';
  origin: EditorOrigin;
  /** The reducers' starting states */
  initialStates: { editor: EditorState; rules: RulesState };
  /**
   * What is already safe elsewhere, so that the local draft holds only unsaved work: the empty
   * flow for a new connection, the stored draft as loaded on its edit route, and null for a stored
   * draft's record resumed through `?local=`, or a published connection. Never the record's own
   * content
   */
  baseline: LocalDraftContent | null;
  /** A fresh flow's key, which the page writes into the URL as `?local=`; null otherwise */
  urlFlowKey: string | null;
}

/**
 * How the page opens: a flow, or, for a `draft-<id>` key without a record, the stored draft's
 * edit route instead (contracts/local-drafts.md "Rules for callers" 1)
 */
export type EditorStart = EditorFlow | { kind: 'missingDraft'; draftId: string };

/**
 * The variant, rule or group an opened link names (spec 007, S5; FR-030, FR-031), as the edit page
 * resolved it against the content it loaded (`linkTargetOf()`)
 */
export interface EditorLinkProps {
  /** The variant whose tab opens; null for none, or for a variant that isn't there */
  initialVariant?: string | null;
  /** The rule or group in that variant brought into view and focused; null for none */
  initialItem?: string | null;
  /** What the link names that isn't there, which the rules step's notice says */
  linkNotice?: LinkNoticeKind | null;
  /**
   * Called once the team member moves from what the link opened to another step or variant: the
   * edit page then takes the link out of the address
   */
  onLinkLeft?: () => void;
}

/** The wizard itself, once the page has decided what it opens */
export interface ConnectionWizardProps extends EditorLinkProps {
  flow: EditorFlow;
  firstConnection: boolean;
  onReload?: () => void;
  reloaded: boolean;
}

/** A refused or failed draft save (data-model.md section 7; S1.5) */
export interface DraftSaveError {
  notice: ErrorNotice;
  /** "Try again" shows: only after a network failure or a `5xx` */
  retryable: boolean;
}

/**
 * A draft save or publish refused because another team member saved, published or deleted the
 * draft meanwhile (data-model.md section 7; S2; R6), from `conflictOf()`
 */
export interface DraftConflict {
  kind: 'draft_changed' | 'draft_published' | 'draft_deleted';
  /** What "Replace their changes" resends */
  during: 'save' | 'publish';
  /** The server's message, or the deleted text */
  message: string;
}

export interface FormConnectionEditorPageProps extends EditorLinkProps {
  /** Opened at /get-started while no connection exists: step 1 is the first connection's */
  firstConnection?: boolean;
  /**
   * Where the content comes from, such as a stored draft on its edit route. Left out, the page is
   * a create route (/form-connections/new, /get-started): it reads `?local=` and resumes the
   * account's local draft of that key, or starts a new connection under a new flow key (R10)
   */
  origin?: EditorOrigin;
  /** The reducers' starting states, such as a stored draft's (`initialStatesFromDraft()`) */
  initialStates?: { editor: EditorState; rules: RulesState };
  /**
   * With `origin`: what is already safe elsewhere, when it isn't `initialStates`' content (which
   * it is by default). "Restore changes" opens the editor from the local draft
   * (`initialStatesFromLocal()`) and passes the stored draft as loaded: the record goes when the
   * content comes back to the stored draft, never when it comes back to the restored changes,
   * which exist only on the device (data-model.md section 6). Never the record's own content
   */
  baseline?: LocalDraftContent;
  /** The step the wizard opens at; the rules step for a link (S5), with `EditorLinkProps` */
  initialStep?: EditorStep;
  /**
   * When editing: fetches the connection again and opens the wizard anew at the Rules step,
   * dropping the unsaved changes (W9). For a stored draft on its edit route, a conflict's
   * "Reload": fetches the draft again and opens it at its stored step (S2); without it, the flow
   * opens the draft's edit route
   */
  onReload?: () => void;
  /**
   * Opened anew, by `onReload` or after the restore question of a stored draft (S5): the focus
   * starts on the page title
   */
  reloaded?: boolean;
}

/** What the wizard does: make a connection, the first one, or edit one */
export type EditorMode = 'create' | 'first' | 'edit';

/** Moved to the API types, as drafts store it; re-exported for the editor's imports */
export type { EditorStep };

/**
 * The rules step's button to go on (spec 004, S2; W2; FR-001): "Test rules" while any branch has
 * a rule or a rule editor is open, "Publish without rules" ("Save without rules") otherwise
 */
export type RulesNextAction = 'test' | 'publishWithoutRules';

/** Validation messages, each shown next to what it is about */
export interface EditorErrors {
  name?: string;
  description?: string;
  /** No document was added */
  documents?: string;
  /** By document type: a document without a selected field */
  fields?: Record<string, string>;
}

/**
 * Data that rules check, about to stop being requested (FR-029; F18): the documents step names
 * those rules first, and the change applies once the team member confirms it
 */
export type PendingRemoval =
  /** Removing a document; `label` is the document's */
  | { type: 'document'; documentType: string; label: string }
  /** Deselecting one field; `label` is the field's */
  | { type: 'field'; documentType: string; field: string; label: string }
  /** Deselecting every field through "All data"; `label` is the document's */
  | { type: 'allFields'; documentType: string; label: string }
  /**
   * "Remove it" on the note of data the catalog dropped (S8; W10): every item at once; `label`
   * names them all, from `droppedRemovalOf()`
   */
  | { type: 'dropped'; items: DroppedData[]; label: string };

/**
 * A document type, or a field of a known one, that the flow requests and the catalog no longer
 * offers (S8; FR-003 edge case), from `droppedDataOf()`
 */
export interface DroppedData {
  documentType: string;
  /** The field's key; null when the catalog lacks the whole document type */
  field: string | null;
  /** "Personal ID – Eye colour", or a whole document's key, as the catalog has no label for it */
  label: string;
}

/** A rule that a pending removal names, with its branch: "Rule 01 in Standard" */
export interface RemovedDataRule {
  key: string;
  ruleName: string;
  branchName: string;
}

export interface EditorState {
  step: EditorStep;
  name: string;
  description: string;
  /** The documents added so far, in catalog order, with the keys of their selected fields */
  documents: RequestedDocument[];
  errors: EditorErrors;
  /** The API's message after publishing failed, with the error ID of a 5xx answer */
  publishError: ErrorNotice | null;
  /** The failure was `409 rules_changed`: another team member saved the rules meanwhile (W9) */
  rulesChanged: boolean;
  dialogOpen: boolean;
  publishing: boolean;
  /** The last removed document, with its selection, which Undo brings back */
  removed: RequestedDocument | null;
  /** Data that rules check, waiting for the team member to confirm its removal (FR-029) */
  pendingRemoval: PendingRemoval | null;
  toast: ToastContent | null;
  /** "Save and exit" in progress */
  savingDraft: boolean;
  /**
   * A refused or failed draft save, which the page shows as the failed save's toast (FR-033)
   * until the step changes, a save starts again or the toast is dismissed
   */
  draftError: DraftSaveError | null;
  /** The dialog after a refused draft save or publish (S2; R6); `rulesChanged` stays for edits */
  conflict: DraftConflict | null;
}

export type EditorAction =
  | { type: 'changeName'; value: string }
  | { type: 'changeDescription'; value: string }
  | { type: 'showErrors'; errors: EditorErrors }
  | { type: 'goToStep'; step: EditorStep }
  | { type: 'addDocument'; documentType: string; catalogOrder: string[] }
  | { type: 'removeDocument'; documentType: string; label: string }
  | { type: 'undoRemove'; catalogOrder: string[] }
  | { type: 'dismissToast' }
  | { type: 'setField'; documentType: string; field: string; selected: boolean }
  | { type: 'setAllFields'; documentType: string; fields: string[] }
  | { type: 'askRemoval'; removal: PendingRemoval }
  | { type: 'cancelRemoval' }
  | { type: 'confirmRemoval' }
  /** Stops requesting every dropped document type and field at once (S8) */
  | { type: 'removeDropped'; items: DroppedData[] }
  | { type: 'openDialog' }
  | { type: 'closeDialog' }
  | { type: 'publish' }
  | { type: 'publishFailed'; error: ErrorNotice; rulesChanged: boolean }
  /** "Save and exit" starts storing the draft */
  | { type: 'saveDraft' }
  | { type: 'saveDraftFailed'; error: DraftSaveError }
  /** A draft save or publish met another team member's save: the conflict dialog opens (S2) */
  | { type: 'draftConflict'; conflict: DraftConflict }
  /** The conflict dialog's "Cancel", or its answer starting */
  | { type: 'closeConflict' };

export interface ConnectionStepProps {
  name: string;
  /**
   * The edit flow of a published connection (U98 6731:39821): the card's hint and its note say
   * that changes take effect once saved, instead of the draft's note
   */
  editing: boolean;
  description: string;
  errors: EditorErrors;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onSubmit: () => void;
}

export interface DocumentsStepProps {
  catalogStatus: 'loading' | 'loaded' | 'failed';
  documentTypes: DocumentType[];
  documents: RequestedDocument[];
  errors: EditorErrors;
  /**
   * The data the catalog dropped (S8): the note above the picker shows while there is any. Empty
   * in the published edit flow, which stays as it is (FR-026)
   */
  dropped: DroppedData[];
  /** The note, which takes the focus when the flow moved to this step for it (S8) */
  droppedNoteRef: Ref<HTMLElement>;
  /** The note's "Remove it" */
  onRemoveDropped: () => void;
  onRetryCatalog: () => void;
  onAdd: (documentType: DocumentType) => void;
  onRemove: (documentType: DocumentType) => void;
  onSetField: (documentType: string, field: string, selected: boolean) => void;
  onSetAllFields: (documentType: string, fields: string[]) => void;
}

export interface DocumentPickerProps {
  documentTypes: DocumentType[];
  documents: RequestedDocument[];
  /** The id of the "Add at least one document." message, while it is shown */
  errorId?: string;
  onAdd: (documentType: DocumentType) => void;
  onRemove: (documentType: DocumentType) => void;
}

export interface DocumentPickerItemProps {
  documentType: DocumentType;
  added: boolean;
  describedBy?: string;
  onAdd: () => void;
  onRemove: () => void;
}

export interface UpcomingDocumentItemProps {
  name: string;
}

export interface DocumentCardProps {
  documentType: DocumentType;
  selected: string[];
  error?: string;
  onSetField: (field: string, selected: boolean) => void;
  onSetAllFields: (fields: string[]) => void;
}

export interface FieldChecklistProps {
  documentType: DocumentType;
  selected: string[];
  /** The id of the document's validation message, while it is shown */
  errorId?: string;
  onSetField: (field: string, selected: boolean) => void;
  onSetAllFields: (fields: string[]) => void;
}

export interface FieldCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface PublishDialogProps {
  open: boolean;
  /** Saves changes to an existing connection rather than publishing a new one */
  editing: boolean;
  /** Opened from the documents step, skipping the rules: "Publish without rules?" (U36) */
  withoutRules: boolean;
  /** One line per document: "Personal ID · 7 data items" */
  documentLines: string[];
  /** One line per branch: "Standard · 2 rules" */
  ruleLines: string[];
  /** The rules step's branches, in tab order, for the findings' lines (spec 003, S5; W10) */
  branches: readonly RulesBranch[];
  /** The latest checks per branch key, from `useRuleChecks()` */
  checks: RuleChecks['byBranch'];
  publishing: boolean;
  /** Why the last attempt failed, shown in the dialog until it closes or publishing starts */
  error: ErrorNotice | null;
  /** The last attempt met rules another team member saved meanwhile (W9) */
  rulesChanged: boolean;
  /** "Check rules again", or "Add rules" when publishing without rules */
  onCancel: () => void;
  /** The close button and Escape */
  onClose: () => void;
  onConfirm: () => void;
  /** "Reload", after `rulesChanged` */
  onReload: () => void;
  /**
   * "Replace their changes", after `rulesChanged` (the same save, replacing their rules) or
   * `draft_changed` (the same publish with `replace: true`)
   */
  onReplace: () => void;
  /**
   * The last publish of a draft met another team member's save (S2): the dialog shows its
   * message and buttons in place of "Publish"
   */
  conflict: DraftConflict | null;
  /** "Open the connection", after `draft_published` */
  onOpenConnection: () => void;
  /** "Save as new draft", after `draft_deleted` */
  onSaveAsNew: () => void;
}

export interface DraftConflictDialogProps {
  /** The conflict after "Save and exit"; the dialog is open while there is one */
  conflict: DraftConflict | null;
  /** An answer, such as "Replace their changes", is running */
  busy: boolean;
  /** "Reload", after `draft_changed` */
  onReload: () => void;
  /** "Replace their changes", after `draft_changed`: the same save with `replace: true` */
  onReplace: () => void;
  /** "Open the connection", after `draft_published` */
  onOpenConnection: () => void;
  /** "Save as new draft", after `draft_deleted` */
  onSaveAsNew: () => void;
  /** "Cancel" and Escape: the team member stays in the flow with their work */
  onCancel: () => void;
}

export interface RemoveDataDialogProps {
  /** The removal waiting for an answer; the dialog is open while there is one */
  removal: PendingRemoval | null;
  /** The rules it names, in branch and tree order */
  rules: RemovedDataRule[];
  /** Editing a connection: the rules need changing "before you save" */
  editing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export interface RemovedDataRuleItemProps {
  rule: RemovedDataRule;
}

export interface PublishSummaryRowProps {
  label: string;
  values: string[];
  /** A line under the row, between the documents and the rules */
  divided?: boolean;
}

export interface PublishSummaryValueProps {
  value: string;
}

/**
 * A branch's line in the publish and save dialog (spec 003, S5; W10; FR-017, FR-019), from
 * `dialogLineOf()`: the variant's name, a colon, then the package's sentences
 */
export interface FindingLine {
  /** The branch's key */
  key: string;
  text: string;
  /** Warning when the branch has a conflict or no citizen can meet it, info otherwise */
  tone: FindingTone;
}

export interface PublishFindingLineProps {
  line: FindingLine;
}

export interface EditorFooterProps {
  step: EditorStep;
  editing: boolean;
  publishing: boolean;
  /**
   * `rulesNextActionOf()`: `'publishWithoutRules'` while no branch has any rule and no rule editor
   * is open, which the documents and the rules step offer (FR-001; W2); `'test'` otherwise
   */
  rulesNextAction: RulesNextAction;
  /** "Back": the previous step; from the test step, the rules step */
  onBack: () => void;
  /** The documents step's "Set rules →" */
  onAddRules: () => void;
  /**
   * Why "Set rules →" can't be used now, "Add a document first" while no document is added
   * (FR-031; T022's pattern); null or absent: usable
   */
  addRulesExplanation?: string | null;
  /**
   * A rule editor is open: "Test rules" is unusable and explains "Save the rule first" (FR-034,
   * W21)
   */
  ruleOpen: boolean;
  /** Rules are being chosen for a group: "Test rules" explains "Finish grouping first" */
  grouping: boolean;
  /**
   * The first spec 002 problem of the rules in the server's words, such as "Rule 02 in Standard
   * checks data that's no longer requested.", or null: while there is one, "Test rules" is
   * unusable and explains it (FR-034 "in error"; CLAR #66, Implement Q5)
   */
  rulesProblem?: string | null;
  /** The rules step's "Test rules →" (spec 004, S2) */
  onTestRules: () => void;
  /** "… without rules" on the documents and the rules step, or the test step's "Publish" / "Save" */
  onPublish: () => void;
  /** "Save and exit" shows on every step: the origin is `new` or `draft` (FR-001, FR-026) */
  canSaveDraft: boolean;
  /** A draft save is running: "Save and exit" reads "Saving…" and ignores clicks */
  savingDraft: boolean;
  /** "Save and exit" */
  onSaveAndExit: () => void;
  /**
   * The edit flow's "Discard changes" beside "Back" (FR-045, U98 6731:39850), which asks
   * "Discard your changes?" (T083); no button without it
   */
  onDiscard?: () => void;
}

export interface CatalogDroppedNoteProps {
  /** The dropped data, in document order; not empty */
  items: DroppedData[];
  /** "Remove it" */
  onRemove: () => void;
  /** The alert itself, which can take the focus */
  ref?: Ref<HTMLElement>;
}

export interface CatalogDroppedItemProps {
  item: DroppedData;
}

export interface FindingsAnnouncerProps {
  /** The latest change's announcement from `useRuleChecks()`, empty before the first one */
  announcement: string;
}

/**
 * Leaving a flow (FR-026; CLAR 2026-11-07 #8, #47; data-model.md "Leaving a flow"): what the
 * product name, "Your connections" and "Log out" do in the editor, and what each answer of their
 * questions does (`leaveFlowStep()` in leaveFlow.ts)
 */
export type LeaveFlowState =
  | { status: 'idle' }
  /** "Leave this connection?", in a new connection's or a stored draft's flow */
  | { status: 'leaveAsked'; origin: Exclude<EditorOrigin['kind'], 'published'> }
  /** "Save your changes?", in the edit flow of a published connection (#47) */
  | { status: 'saveAsked' }
  /** "Save before you log out?", in any flow with unsaved work */
  | { status: 'logoutAsked'; origin: EditorOrigin['kind'] }
  /**
   * An answer stores the flow: "Save and exit", or the edit flow's save dialog, through the rule
   * editor's question first; `after` follows once it is stored, and a save that ends without
   * storing goes back to `idle`
   */
  | { status: 'saving'; origin: EditorOrigin['kind']; after: 'leave' | 'logout' };

/** What the editor knows when the team member asks to leave or to log out */
export interface LeaveFlowContext {
  origin: EditorOrigin['kind'];
  /** The flow holds work that isn't stored (`hasUnsavedWork()`) */
  unsaved: boolean;
  /** A save or a publish is running: the question waits for it, so the request is ignored */
  busy: boolean;
}

export type LeaveFlowAction =
  /** The product name or "Your connections" */
  | { type: 'askLeave'; context: LeaveFlowContext }
  /** "Log out" in the account menu */
  | { type: 'askLogout'; context: LeaveFlowContext }
  /** The ×, Escape, the scrim, or "Cancel" of the log-out question: the team member stays */
  | { type: 'cancel' }
  /** "Save progress" ("Leave this connection?"), or "Save" ("Save your changes?") */
  | { type: 'saveProgress' }
  /** "Discard connection" ("Leave this connection?"), or "Discard changes" ("Save your changes?") */
  | { type: 'discard' }
  | { type: 'saveAndLogout' }
  | { type: 'logoutAnyway' }
  /** A save stored the flow: from an answer, or from the footer, the conflict dialog or publishing */
  | { type: 'saved' }
  /**
   * A save ended without storing: refused (a missing name, the rules' pre-checks), failed, met a
   * conflict, or its rule question or save dialog was closed
   */
  | { type: 'failed' };

/** What the editor does after a step of the leave model; the model itself only decides */
export type LeaveEffect =
  /** Nothing: a question opened or closed, or the action didn't apply */
  | { type: 'none' }
  /** Leaves to the overview without storing; `forget` drops the flow's local draft first */
  | { type: 'leave'; forget: boolean }
  /**
   * Stores the flow, through "Save changes to Rule 01?" while the rule editor has unsaved changes
   * (Q8 (c)): "Save and exit" for a new connection or a stored draft, the save dialog for a
   * published connection
   */
  | { type: 'store'; via: 'saveAndExit' | 'saveDialog' }
  /**
   * Logs out (UserMenu's `logOut`); `forget` drops the flow's local draft first, so that the
   * local-drafts warning doesn't name it
   */
  | { type: 'logOut'; forget: boolean }
  /** The log-out question closed: the focus goes back to the account pill (F20) */
  | { type: 'focusUserMenu' }
  /** The flow is stored: the save's own exit follows (the overview with its toast, the details) */
  | { type: 'exit' };

/** A step of the leave model: the next state, and what the editor does now */
export interface LeaveFlowStep {
  state: LeaveFlowState;
  effect: LeaveEffect;
}
