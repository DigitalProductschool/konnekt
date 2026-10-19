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
}

/** What the wizard does: make a connection, the first one, or edit one */
export type EditorMode = 'create' | 'first' | 'edit';

export type EditorStep = 'connection' | 'documents';

/** Validation messages, each shown next to what it is about */
export interface EditorErrors {
  name?: string;
  servicebwForm?: string;
  /** No document was added */
  documents?: string;
  /** By document type: a document without a selected field */
  fields?: Record<string, string>;
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
  dialogOpen: boolean;
  publishing: boolean;
  /** The last removed document, with its selection, which Undo brings back */
  removed: RequestedDocument | null;
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
  | { type: 'openDialog' }
  | { type: 'closeDialog' }
  | { type: 'publish' }
  | { type: 'publishFailed'; error: ErrorNotice };

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
  /** Which documents and how many items applicants will share */
  summary: string;
  publishing: boolean;
  /** Why the last attempt failed, shown in the dialog until it closes or publishing starts */
  error: ErrorNotice | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export interface EditorFooterProps {
  step: EditorStep;
  editing: boolean;
  publishing: boolean;
  onBack: () => void;
  onPublish: () => void;
}
