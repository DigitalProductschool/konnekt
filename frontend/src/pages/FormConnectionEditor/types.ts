import type { ToastContent } from '../../components/Toast/types';
import type { ErrorNotice } from '../../types/api';
import type { DocumentType } from '../../types/document-types';
import type { FormConnection, RequestedDocument } from '../../types/form-connections';

export interface FormConnectionEditorPageProps {
  /** Opened at /get-started while no connection exists: step 1 is the first connection's */
  firstConnection?: boolean;
  /** The connection to edit, at /form-connections/:id/edit; without it, a new one is made */
  formConnection?: FormConnection;
  /** The step the wizard opens at */
  initialStep?: EditorStep;
  /**
   * When editing: fetches the connection again and opens the wizard anew at the Rules step,
   * dropping the unsaved changes (W9)
   */
  onReload?: () => void;
  /** Opened anew by `onReload`: the focus starts on the page title */
  reloaded?: boolean;
}

/** What the wizard does: make a connection, the first one, or edit one */
export type EditorMode = 'create' | 'first' | 'edit';

export type EditorStep = 'connection' | 'documents' | 'rules';

/** Validation messages, each shown next to what it is about */
export interface EditorErrors {
  name?: string;
  servicebwForm?: string;
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
  | { type: 'allFields'; documentType: string; label: string };

/** A rule that a pending removal names, with its branch: "Rule 01 in Standard" */
export interface RemovedDataRule {
  key: string;
  ruleName: string;
  branchName: string;
}

export interface EditorState {
  step: EditorStep;
  name: string;
  servicebwForm: string;
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
}

export type EditorAction =
  | { type: 'changeName'; value: string }
  | { type: 'changeServicebwForm'; value: string }
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
  | { type: 'openDialog' }
  | { type: 'closeDialog' }
  | { type: 'publish' }
  | { type: 'publishFailed'; error: ErrorNotice; rulesChanged: boolean };

export interface ConnectionStepProps {
  name: string;
  /** The card's closing note */
  note: string;
  servicebwForm: string;
  errors: EditorErrors;
  onChangeName: (value: string) => void;
  onChangeServicebwForm: (value: string) => void;
  onSubmit: () => void;
}

export interface DocumentsStepProps {
  catalogStatus: 'loading' | 'loaded' | 'failed';
  documentTypes: DocumentType[];
  documents: RequestedDocument[];
  errors: EditorErrors;
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
  /** "Replace their changes", after `rulesChanged`: the same save, replacing their rules */
  onReplace: () => void;
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

export interface EditorFooterProps {
  step: EditorStep;
  editing: boolean;
  publishing: boolean;
  /** No branch has any rule and no rule editor is open: publishing is "without rules" (FR-001) */
  withoutRules: boolean;
  onBack: () => void;
  /** The documents step's "Add rules →" */
  onAddRules: () => void;
  /** "Publish" or "Save", or "… without rules" */
  onPublish: () => void;
}

export interface FindingsAnnouncerProps {
  /** The latest change's announcement from `useRuleChecks()`, empty before the first one */
  announcement: string;
}
