import { ApiError } from '../../api/client';
import type { DocumentType } from '../../types/document-types';
import type { FormConnectionCreate, RequestedDocument } from '../../types/form-connections';
import {
  EDITOR_COPY,
  ELEMENT_IDS,
  NAME_MAX_LENGTH,
  SERVICEBW_FORM_MAX_LENGTH,
  VALIDATION_MESSAGES,
} from './constants';
import type { EditorAction, EditorErrors, EditorState } from './types';

/** Keeps documents in catalog order, the order of the API and the cards. */
function inCatalogOrder(documents: RequestedDocument[], catalogOrder: string[]) {
  return [...documents].sort(
    (a, b) => catalogOrder.indexOf(a.document_type) - catalogOrder.indexOf(b.document_type)
  );
}

function withoutFieldError(errors: EditorErrors, documentType: string): EditorErrors {
  if (!errors.fields?.[documentType]) {
    return errors;
  }
  const fields = { ...errors.fields };
  delete fields[documentType];
  return { ...errors, fields };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'changeName':
      return { ...state, name: action.value, errors: { ...state.errors, name: undefined } };
    case 'changeServicebwForm':
      return {
        ...state,
        servicebwForm: action.value,
        errors: { ...state.errors, servicebwForm: undefined },
      };
    case 'showErrors':
      return { ...state, errors: action.errors };
    case 'goToStep':
      return { ...state, step: action.step, errors: {}, publishError: null };
    case 'addDocument': {
      if (state.documents.some((document) => document.document_type === action.documentType)) {
        return state;
      }
      // Adding selects no field: the team member picks only what the form needs
      const added = { document_type: action.documentType, fields: [] };
      return {
        ...state,
        documents: inCatalogOrder([...state.documents, added], action.catalogOrder),
        errors: { ...state.errors, documents: undefined },
      };
    }
    case 'removeDocument': {
      const removed = state.documents.find(
        (document) => document.document_type === action.documentType
      );
      if (!removed) {
        return state;
      }
      return {
        ...state,
        documents: state.documents.filter((document) => document !== removed),
        errors: withoutFieldError(state.errors, action.documentType),
        removed,
        toast: {
          id: (state.toast?.id ?? 0) + 1,
          message: EDITOR_COPY.removed(action.label),
          actionLabel: EDITOR_COPY.undo,
        },
      };
    }
    case 'undoRemove': {
      const { removed } = state;
      if (
        !removed ||
        state.documents.some((document) => document.document_type === removed.document_type)
      ) {
        return { ...state, removed: null, toast: null };
      }
      return {
        ...state,
        documents: inCatalogOrder([...state.documents, removed], action.catalogOrder),
        errors: { ...state.errors, documents: undefined },
        removed: null,
        toast: null,
      };
    }
    case 'dismissToast':
      return { ...state, removed: null, toast: null };
    case 'setField':
      return {
        ...state,
        documents: state.documents.map((document) => {
          if (document.document_type !== action.documentType) {
            return document;
          }
          const fields = document.fields.filter((field) => field !== action.field);
          return { ...document, fields: action.selected ? [...fields, action.field] : fields };
        }),
        errors: action.selected
          ? withoutFieldError(state.errors, action.documentType)
          : state.errors,
      };
    case 'setAllFields':
      return {
        ...state,
        documents: state.documents.map((document) =>
          document.document_type === action.documentType
            ? { ...document, fields: action.fields }
            : document
        ),
        errors:
          action.fields.length > 0
            ? withoutFieldError(state.errors, action.documentType)
            : state.errors,
      };
    case 'openDialog':
      return { ...state, dialogOpen: true, publishError: null };
    case 'closeDialog':
      return state.publishing ? state : { ...state, dialogOpen: false };
    case 'publish':
      return { ...state, publishing: true };
    case 'publishFailed':
      return { ...state, publishing: false, dialogOpen: false, publishError: action.message };
  }
}

/** Step 1: the name and the form ID, with the API's rules and messages. */
export function validateConnection(name: string, servicebwForm: string): EditorErrors {
  const errors: EditorErrors = {};
  const trimmedName = name.trim();
  if (!trimmedName) {
    errors.name = VALIDATION_MESSAGES.nameRequired;
  } else if (trimmedName.length > NAME_MAX_LENGTH) {
    errors.name = VALIDATION_MESSAGES.nameTooLong;
  }
  const trimmedForm = servicebwForm.trim();
  if (!trimmedForm) {
    errors.servicebwForm = VALIDATION_MESSAGES.servicebwFormRequired;
  } else if (trimmedForm.length > SERVICEBW_FORM_MAX_LENGTH) {
    errors.servicebwForm = VALIDATION_MESSAGES.servicebwFormTooLong;
  }
  return errors;
}

/** Step 2: at least one document, and at least one field for each. */
export function validateDocuments(
  documents: RequestedDocument[],
  documentTypes: DocumentType[]
): EditorErrors {
  if (documents.length === 0) {
    return { documents: VALIDATION_MESSAGES.noDocuments };
  }
  const fields: Record<string, string> = {};
  for (const document of documents) {
    if (document.fields.length === 0) {
      fields[document.document_type] = VALIDATION_MESSAGES.noFields(
        labelOf(document.document_type, documentTypes)
      );
    }
  }
  return Object.keys(fields).length > 0 ? { fields } : {};
}

export function hasErrors(errors: EditorErrors): boolean {
  return Boolean(
    errors.name ||
    errors.servicebwForm ||
    errors.documents ||
    Object.keys(errors.fields ?? {}).length > 0
  );
}

/** The element that gets the focus after a refused step: the first one with a problem. */
export function firstInvalidElementId(
  errors: EditorErrors,
  documents: RequestedDocument[],
  documentTypes: DocumentType[]
): string | null {
  if (errors.name) return ELEMENT_IDS.name;
  if (errors.servicebwForm) return ELEMENT_IDS.servicebwForm;
  if (errors.documents && documentTypes.length > 0) {
    return ELEMENT_IDS.pickerButton(documentTypes[0].key);
  }
  const invalid = documents.find((document) => errors.fields?.[document.document_type]);
  return invalid ? ELEMENT_IDS.allData(invalid.document_type) : null;
}

export function labelOf(documentType: string, documentTypes: DocumentType[]): string {
  return documentTypes.find((type) => type.key === documentType)?.label ?? documentType;
}

/** "Applicants will be asked to share Personal ID (7 items) and Driving licence (5 items)." */
export function publishSummary(
  documents: RequestedDocument[],
  documentTypes: DocumentType[]
): string {
  if (documents.length === 0) {
    return '';
  }
  const parts = documents.map((document) => {
    const count = document.fields.length;
    return `${labelOf(document.document_type, documentTypes)} (${count} ${count === 1 ? 'item' : 'items'})`;
  });
  const list =
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `Applicants will be asked to share ${list}. Once you publish, the form goes live with this data.`;
}

export function createPayload(state: EditorState): FormConnectionCreate {
  return {
    name: state.name.trim(),
    servicebw_form: state.servicebwForm.trim(),
    documents: state.documents,
  };
}

/** The API's message, which says what went wrong, or a general one without it. */
export function publishErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.data.message : EDITOR_COPY.publishErrorText;
}
