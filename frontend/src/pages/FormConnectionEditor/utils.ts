import { ApiError, errorNoticeOf } from '../../api/client';
import type { ErrorNotice } from '../../types/api';
import type { DocumentType } from '../../types/document-types';
import type {
  BranchInput,
  FormConnection,
  FormConnectionCreate,
  RequestedDocument,
} from '../../types/form-connections';
import { sameValue } from '../../utils/rules/branches';
import { dialogLineOf } from '../../utils/rules/checks/findingMessages';
import type { BranchCheck, FindingTone, RuleChecks } from '../../utils/rules/checks/types';
import { countRules } from '../../utils/rules/tree';
import { rulesCheckingData } from '../../utils/rules/validation';
import {
  EDITOR_COPY,
  ELEMENT_IDS,
  INITIAL_EDITOR_STATE,
  NAME_MAX_LENGTH,
  PUBLISH_COPY,
  REMOVE_DATA_COPY,
  RULES_CHANGED_ERROR,
  SERVICEBW_FORM_MAX_LENGTH,
  VALIDATION_MESSAGES,
} from './constants';
import { RULES_COPY } from './RulesStep/constants';
import type { RulesBranch, RulesState } from './RulesStep/types';
import type {
  EditorAction,
  EditorErrors,
  EditorMode,
  EditorState,
  EditorStep,
  FindingLine,
  PendingRemoval,
  RemovedDataRule,
} from './types';

/** The wizard's first state: empty, or the connection to edit with its documents. */
export function initialEditorState({
  formConnection,
  initialStep,
}: {
  formConnection?: FormConnection;
  initialStep: EditorStep;
}): EditorState {
  if (!formConnection) {
    return { ...INITIAL_EDITOR_STATE, step: initialStep };
  }
  return {
    ...INITIAL_EDITOR_STATE,
    step: initialStep,
    name: formConnection.name,
    servicebwForm: formConnection.servicebw_form,
    documents: formConnection.documents.map((document) => ({
      document_type: document.document_type,
      fields: document.fields.map((field) => field.key),
    })),
  };
}

/** The page title of a step: the heading, its hint and the tab title. */
export function pageTitleOf(step: EditorStep, mode: EditorMode): { title: string; hint: string } {
  if (step === 'rules') {
    return { title: RULES_COPY.title, hint: RULES_COPY.hint };
  }
  if (step === 'documents') {
    return {
      title: mode === 'edit' ? EDITOR_COPY.editDocumentsTitle : EDITOR_COPY.documentsTitle,
      hint: EDITOR_COPY.documentsHint,
    };
  }
  switch (mode) {
    case 'edit':
      return { title: EDITOR_COPY.editConnectionTitle, hint: EDITOR_COPY.editConnectionHint };
    case 'first':
      return { title: EDITOR_COPY.firstConnectionTitle, hint: EDITOR_COPY.connectionHint };
    case 'create':
      return { title: EDITOR_COPY.connectionTitle, hint: EDITOR_COPY.connectionHint };
  }
}

/**
 * The header's title: the name as typed once there is one to show, otherwise what is being
 * made, or the edited connection's saved name.
 */
export function headerTitleOf(state: EditorState, formConnection?: FormConnection): string {
  const name = state.name.trim();
  if (formConnection) {
    return name || formConnection.name;
  }
  return state.step !== 'connection' && name ? name : EDITOR_COPY.headerTitle;
}

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

/** The change a removal makes, once it is confirmed or needs no question. */
export function removalAction(removal: PendingRemoval): EditorAction {
  switch (removal.type) {
    case 'document':
      return { type: 'removeDocument', documentType: removal.documentType, label: removal.label };
    case 'field':
      return {
        type: 'setField',
        documentType: removal.documentType,
        field: removal.field,
        selected: false,
      };
    case 'allFields':
      return { type: 'setAllFields', documentType: removal.documentType, fields: [] };
  }
}

/**
 * The rules, in every branch, that check the data a removal takes away (FR-029): a document's
 * rules, a field's, or for "All data" those of the fields still selected. Rules on data the
 * connection already doesn't request are flagged by the Rules step (F11) and not named again.
 */
export function rulesCheckingRemoval(
  removal: PendingRemoval,
  branches: RulesBranch[],
  documents: RequestedDocument[]
): RemovedDataRule[] {
  const selected =
    documents.find((document) => document.document_type === removal.documentType)?.fields ?? [];
  const found =
    removal.type === 'field'
      ? rulesCheckingData(branches, removal.documentType, removal.field)
      : rulesCheckingData(branches, removal.documentType).filter(
          ({ rule }) => rule.target !== null && selected.includes(rule.target.field)
        );
  return found.map(({ branchIndex, rule }) => ({
    key: `${branches[branchIndex].key}-${rule.id}`,
    ruleName: rule.name.trim(),
    branchName: branches[branchIndex].name.trim(),
  }));
}

/**
 * The removal dialog's words for a removal that names `count` rules (U10; F18): a document's
 * removal or a field's deselection, as designed, or "All data" unticked. In the edit flow the
 * rules need changing "before you save". Empty while no removal waits.
 */
export function removalCopyOf(
  removal: PendingRemoval | null,
  count: number,
  editing: boolean
): { title: string; text: string; after: string; confirmLabel: string } {
  if (!removal) {
    return { title: '', text: '', after: '', confirmLabel: '' };
  }
  if (removal.type === 'document') {
    return {
      title: REMOVE_DATA_COPY.documentTitle(removal.label),
      text: REMOVE_DATA_COPY.documentText(count),
      after: REMOVE_DATA_COPY.documentAfter(count, editing),
      confirmLabel: REMOVE_DATA_COPY.removeDocument,
    };
  }
  return {
    title:
      removal.type === 'field'
        ? REMOVE_DATA_COPY.fieldTitle(removal.label)
        : REMOVE_DATA_COPY.allFieldsTitle(removal.label),
    text:
      removal.type === 'field'
        ? REMOVE_DATA_COPY.fieldText(count)
        : REMOVE_DATA_COPY.allFieldsText(count),
    after: REMOVE_DATA_COPY.fieldAfter(count, editing),
    confirmLabel: REMOVE_DATA_COPY.stopRequesting,
  };
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
    // Leaving a step drops its toast and the toast's Undo (B4)
    case 'goToStep':
      return {
        ...state,
        step: action.step,
        errors: {},
        publishError: null,
        rulesChanged: false,
        removed: null,
        toast: null,
      };
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
    case 'askRemoval':
      return { ...state, pendingRemoval: action.removal };
    case 'cancelRemoval':
      return { ...state, pendingRemoval: null };
    case 'confirmRemoval': {
      // The data goes as it would have without rules; the rules stay, and refuse publishing
      // and saving while they remain (FR-006)
      const { pendingRemoval } = state;
      const closed = { ...state, pendingRemoval: null };
      return pendingRemoval ? editorReducer(closed, removalAction(pendingRemoval)) : closed;
    }
    case 'openDialog':
      return { ...state, dialogOpen: true, publishError: null, rulesChanged: false };
    case 'closeDialog':
      return state.publishing
        ? state
        : { ...state, dialogOpen: false, publishError: null, rulesChanged: false };
    case 'publish':
      // A retry takes the old message away, so that a new failure is announced again
      return { ...state, publishing: true, publishError: null, rulesChanged: false };
    case 'publishFailed':
      // The dialog stays open and shows the message where the user is looking: on the page,
      // it would be above the scrolled-to cards (bug publish-error-offscreen)
      return {
        ...state,
        publishing: false,
        publishError: action.error,
        rulesChanged: action.rulesChanged,
      };
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

/** A field's label, such as "Date of birth", for the removal dialog's title (F18). */
export function fieldLabelOf(
  documentType: string,
  field: string,
  documentTypes: DocumentType[]
): string {
  return (
    documentTypes
      .find((type) => type.key === documentType)
      ?.fields.find((entry) => entry.key === field)?.label ?? field
  );
}

/** The publish dialog's documents: "Personal ID · 7 data items", one line each (U33). */
export function documentLines(
  documents: RequestedDocument[],
  documentTypes: DocumentType[]
): string[] {
  return documents.map((document) =>
    PUBLISH_COPY.documentLine(
      labelOf(document.document_type, documentTypes),
      document.fields.length
    )
  );
}

/**
 * The publish dialog's rules: one line per branch in tab order, "Standard · 2 rules", counting
 * the rules that apply in it (design-notes.md §6); "No rules" when publishing without them.
 */
export function ruleLines(rules: RulesState, withoutRules: boolean): string[] {
  if (withoutRules) {
    return [PUBLISH_COPY.noRules];
  }
  return rules.branches.map((branch) =>
    PUBLISH_COPY.ruleLine(branch.name.trim(), countRules(branch.items))
  );
}

/** Branches as the API takes them, without the step's keys or the API's pull URLs. */
function branchInputs(branches: BranchInput[]): BranchInput[] {
  return branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    description: branch.description,
    origin: branch.origin,
    operator: branch.operator,
    operator_mark: branch.operator_mark,
    items: branch.items,
  }));
}

/**
 * Whether the step's branches differ from the ones it loaded. Compared rather than tracked, so
 * that a change undone by hand counts as none.
 */
export function rulesChanged(rules: RulesState, loaded: FormConnection): boolean {
  return !sameValue(branchInputs(rules.branches), branchInputs(loaded.branches));
}

/**
 * The connection to create or, when editing, every field to save; also unchanged ones. The rules
 * go with it: every branch, main branch first, the counters the step numbered new rules from,
 * and the rule set it loaded (research R5, R9). When editing, they go only if they differ from
 * the `loaded` ones, so that a save of the name or the documents alone never meets
 * `409 rules_changed`; `replace` saves over the rules another team member saved meanwhile
 * (FR-028).
 */
export function createPayload(
  state: EditorState,
  rules: RulesState,
  { loaded, replace = false }: { loaded?: FormConnection; replace?: boolean } = {}
): FormConnectionCreate {
  const payload: FormConnectionCreate = {
    name: state.name.trim(),
    servicebw_form: state.servicebwForm.trim(),
    documents: state.documents,
  };
  if (loaded && !rulesChanged(rules, loaded)) {
    return payload;
  }
  return {
    ...payload,
    rules: {
      branches: branchInputs(rules.branches),
      numbering_base: rules.numberingBase,
      base_version: rules.ruleSetVersion,
      replace,
    },
  };
}

/** Whether a save met rules another team member saved after the editor loaded them (W9). */
export function isRulesChanged(error: unknown): error is ApiError {
  return (
    error instanceof ApiError && error.status === 409 && error.data.error === RULES_CHANGED_ERROR
  );
}

/**
 * The API's message, which says what went wrong, with the error ID of a 5xx answer, or a general
 * message without them. After `409 rules_changed`, the message, which names the variants that
 * replacing deletes or brings back, says what Reload and replacing do (W9).
 */
export function publishErrorNotice(error: unknown, editing = false): ErrorNotice {
  if (isRulesChanged(error)) {
    return { message: `${error.data.message} ${PUBLISH_COPY.rulesChangedHint}` };
  }
  return errorNoticeOf(error, editing ? EDITOR_COPY.saveErrorText : EDITOR_COPY.publishErrorText);
}

/**
 * The style of a branch's line in the publish and save dialog (FR-019): warning when the branch
 * has a conflict or no applicant can meet it, info when it has only duplicate, covered or
 * always-met items, or every applicant meets it.
 */
function dialogToneOf(check: BranchCheck): FindingTone {
  const warning =
    check.findings.some((finding) => finding.kind === 'conflicting') ||
    check.notice?.kind === 'none_can_meet';
  return warning ? 'warning' : 'info';
}

/**
 * The findings' lines of the publish and save dialog (spec 003, S5; W10; FR-017, FR-019;
 * US4-AS1, AS2, AS4): one per branch that has a line, in tab order, with `dialogLineOf()`'s text
 * under the name the tab shows, and its style. `branches` are the rules state's, in tab order,
 * Standard first. A branch missing from `byBranch` or never checked yet, without checked rules,
 * or whose only notice is that it couldn't be checked completely, has no line. Empty without
 * findings: the dialog is then as in spec 002.
 *
 * This is the one test of "a branch with findings" for the dialog and for "Check rules again"
 * (`firstBranchWithFindings()`), so that the button always opens a branch the dialog names.
 */
export function findingLinesOf(
  branches: readonly RulesBranch[],
  byBranch: RuleChecks['byBranch']
): FindingLine[] {
  return branches.flatMap((branch) => {
    const check = byBranch[branch.key];
    const text = check ? dialogLineOf(check, branch.name.trim()) : null;
    return check && text !== null ? [{ key: branch.key, text, tone: dialogToneOf(check) }] : [];
  });
}

/**
 * The key of the first branch, in tab order, that has findings, for "Check rules again" (spec 003,
 * S5; W10; FR-017; US4-AS3), or null when none has. A branch has findings when the dialog gives it
 * a line (`findingLinesOf()`), so the button opens the first branch the dialog names.
 */
export function firstBranchWithFindings(
  branches: readonly RulesBranch[],
  byBranch: RuleChecks['byBranch']
): string | null {
  return findingLinesOf(branches, byBranch)[0]?.key ?? null;
}
