import { ApiError, errorNoticeOf } from '../../api/client';
import type { ErrorNotice } from '../../types/api';
import type { DocumentType } from '../../types/document-types';
import type {
  BranchInput,
  DraftCreate,
  FormConnection,
  FormConnectionCreate,
  FormConnectionDraft,
  NumberingBase,
  RequestedDocument,
  RequestedDocumentView,
  RuleItem,
} from '../../types/form-connections';
import { emptyContent } from '../../utils/localDrafts/content';
import { draftIdOfFlowKey, isFlowKey, newFlowKey } from '../../utils/localDrafts/keys';
import type { LocalDraftContent, LocalDraftRecord } from '../../utils/localDrafts/types';
import { sameValue } from '../../utils/rules/branches';
import { dialogLineOf } from '../../utils/rules/checks/findingMessages';
import type { BranchCheck, FindingTone, RuleChecks } from '../../utils/rules/checks/types';
import { countRules, flattenItems, hasAnyRule } from '../../utils/rules/tree';
import type { RulesProblem } from '../../utils/rules/types';
import { rulesCheckingData } from '../../utils/rules/validation';
import {
  DRAFT_CHANGED_ERROR,
  DRAFT_COPY,
  DRAFT_PUBLISHED_ERROR,
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
import { MAIN_BRANCH_KEY, RULES_COPY } from './RulesStep/constants';
import type { RulesBranch, RulesState } from './RulesStep/types';
import { initialRulesState, newBranchKey, rulesReducer } from './RulesStep/utils';
import type {
  DraftConflict,
  DraftSaveError,
  DroppedData,
  EditorAction,
  EditorEntry,
  EditorErrors,
  EditorFlow,
  EditorMode,
  EditorOrigin,
  EditorStart,
  EditorState,
  EditorStep,
  FindingLine,
  FormConnectionEditorPageProps,
  PendingRemoval,
  RemovedDataRule,
  RulesNextAction,
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
    documents: requestedDocumentsOf(formConnection.documents),
  };
}

/** The API's documents as the editor holds them: by key, with the keys of their fields. */
function requestedDocumentsOf(documents: RequestedDocumentView[]): RequestedDocument[] {
  return documents.map((document) => ({
    document_type: document.document_type,
    fields: document.fields.map((field) => field.key),
  }));
}

/** The page title of a step: the heading, its hint and the tab title. */
export function pageTitleOf(step: EditorStep, mode: EditorMode): { title: string; hint: string } {
  if (step === 'test') {
    return { title: EDITOR_COPY.testRules, hint: EDITOR_COPY.testRulesHint };
  }
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
 * The rules step's button to go on (spec 004, S2; W2; FR-001): "Test rules" while any branch has
 * a rule or a rule editor is open, since a rule being edited counts as a rule (spec 002, FR-006),
 * and "Publish without rules" otherwise, which skips the test step. Once the answer to "Save
 * changes to Rule 01?" discards the first rule, it is `'publishWithoutRules'` again (EC "The
 * first rule discarded").
 */
export function rulesNextActionOf(
  rules: Pick<RulesState, 'branches' | 'editing'>
): RulesNextAction {
  return rules.editing !== null || hasAnyRule(rules.branches) ? 'test' : 'publishWithoutRules';
}

/**
 * Where a problem of publishing's pre-checks leads, when it refuses "Publish", "Save" or "Test
 * rules" (spec 002, FR-006; spec 004, FR-002; W3): the branch it names, to open, or null when it
 * names none; and the elements that take the focus, the first one present: the rule or group it
 * names, then the rules step's message.
 */
export function problemPlaceOf(
  branches: readonly RulesBranch[],
  problem: RulesProblem
): { branchKey: string | null; focusIds: string[] } {
  const branch = problem.branchIndex === null ? undefined : branches[problem.branchIndex];
  const itemIds = branch && problem.itemId ? [ELEMENT_IDS.rule(branch.key, problem.itemId)] : [];
  return { branchKey: branch?.key ?? null, focusIds: [...itemIds, ELEMENT_IDS.rulesProblem] };
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
    case 'dropped':
      return { type: 'removeDropped', items: removal.items };
  }
}

/** The fields a document requests, in its order. */
function fieldsOf(documents: RequestedDocument[], documentType: string): string[] {
  return documents.find((document) => document.document_type === documentType)?.fields ?? [];
}

/**
 * Whether a removal takes away the data a rule checks: a whole document's requested fields, or
 * one field; for "All data", those still selected. Data already not requested doesn't count.
 */
function removalTakes(
  removal: PendingRemoval,
  target: { document_type: string; field: string },
  documents: RequestedDocument[]
): boolean {
  if (removal.type === 'dropped') {
    return removal.items.some((item) =>
      removalTakes(
        item.field === null
          ? { type: 'document', documentType: item.documentType, label: item.label }
          : {
              type: 'field',
              documentType: item.documentType,
              field: item.field,
              label: item.label,
            },
        target,
        documents
      )
    );
  }
  if (target.document_type !== removal.documentType) {
    return false;
  }
  return removal.type === 'field'
    ? target.field === removal.field
    : fieldsOf(documents, removal.documentType).includes(target.field);
}

/**
 * The rules, in every branch, that check the data a removal takes away (FR-029): a document's
 * rules, a field's, or for "All data" those of the fields still selected; for the data the
 * catalog dropped (S8), those of every dropped document and field, each rule once, in branch and
 * tree order. Rules on data the connection already doesn't request are flagged by the Rules step
 * (F11) and not named again.
 */
export function rulesCheckingRemoval(
  removal: PendingRemoval,
  branches: RulesBranch[],
  documents: RequestedDocument[]
): RemovedDataRule[] {
  const found =
    removal.type === 'dropped'
      ? branches.flatMap((branch, branchIndex) =>
          flattenItems(branch.items)
            .filter((item): item is RuleItem => item.type === 'rule')
            .filter(({ target }) => target !== null && removalTakes(removal, target, documents))
            .map((rule) => ({ branchIndex, rule }))
        )
      : rulesCheckingData(
          branches,
          removal.documentType,
          removal.type === 'field' ? removal.field : undefined
        ).filter(
          ({ rule }) => rule.target !== null && removalTakes(removal, rule.target, documents)
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
  if (removal.type === 'dropped') {
    // Spec 002's words for data that stops being requested, naming every dropped item
    return {
      title: REMOVE_DATA_COPY.fieldTitle(removal.label),
      text: REMOVE_DATA_COPY.allFieldsText(count),
      after: REMOVE_DATA_COPY.fieldAfter(count, editing),
      confirmLabel: REMOVE_DATA_COPY.stopRequesting,
    };
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
    // Leaving a step drops its toast and the toast's Undo (B4), and a failed draft save's alert
    // (S1.5)
    case 'goToStep':
      return {
        ...state,
        step: action.step,
        errors: {},
        publishError: null,
        rulesChanged: false,
        removed: null,
        toast: null,
        draftError: null,
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
    case 'removeDropped': {
      // Without a toast or Undo: the catalog can't offer the data again (S8)
      const goneTypes = action.items
        .filter((item) => item.field === null)
        .map((item) => item.documentType);
      const documents = state.documents
        .filter((document) => !goneTypes.includes(document.document_type))
        .map((document) => {
          const goneFields = action.items
            .filter((item) => item.documentType === document.document_type)
            .map((item) => item.field);
          return goneFields.length > 0
            ? {
                ...document,
                fields: document.fields.filter((field) => !goneFields.includes(field)),
              }
            : document;
        });
      return {
        ...state,
        documents,
        errors: goneTypes.reduce(withoutFieldError, state.errors),
      };
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
    case 'saveDraft':
      // A retry takes the old alert away, so that a new failure is announced again
      return { ...state, savingDraft: true, draftError: null };
    case 'saveDraftFailed':
      return { ...state, savingDraft: false, draftError: action.error };
    case 'draftConflict':
      // The conflict dialog, or the publish dialog, shows it in place of a message (S2)
      return { ...state, savingDraft: false, publishing: false, conflict: action.conflict };
    case 'closeConflict':
      return { ...state, conflict: null };
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

/**
 * The data the flow requests that the catalog no longer offers (S8; FR-003 edge case), in
 * document order: a document type the catalog lacks is one item, labelled with its key, since
 * the catalog has no label for it any more; a field a known document lacks is "Personal ID –
 * eye_colour", with the field's key. Empty when the catalog offers everything.
 */
export function droppedDataOf(
  documents: RequestedDocument[],
  documentTypes: DocumentType[]
): DroppedData[] {
  return documents.flatMap((document): DroppedData[] => {
    const documentType = documentTypes.find((type) => type.key === document.document_type);
    if (!documentType) {
      return [{ documentType: document.document_type, field: null, label: document.document_type }];
    }
    return document.fields
      .filter((field) => !documentType.fields.some((offered) => offered.key === field))
      .map((field) => ({
        documentType: documentType.key,
        field,
        label: DRAFT_COPY.droppedField(documentType.label, field),
      }));
  });
}

/** The note's "Remove it" (S8): every dropped item at once, named in the removal dialog. */
export function droppedRemovalOf(items: DroppedData[]): PendingRemoval {
  return { type: 'dropped', items, label: items.map((item) => item.label).join(', ') };
}

/**
 * Where a flow that opens with data the catalog dropped goes once the catalog has loaded (S0,
 * S8): the documents step, where the note points the data out, unless it is there already; null
 * without dropped data.
 */
export function stepForDroppedData(step: EditorStep, dropped: DroppedData[]): EditorStep | null {
  return dropped.length > 0 && step !== 'documents' ? 'documents' : null;
}

/**
 * A document card's selected fields (S8): only those the catalog offers, so that "3 of 7 shared"
 * and "All data" leave out a field it dropped, which the note lists.
 */
export function offeredFieldsOf(fields: string[], documentType: DocumentType): string[] {
  return fields.filter((field) => documentType.fields.some((offered) => offered.key === field));
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
 * The conflict a draft's save or publish met (S2; R6; contracts/local-drafts.md): `409
 * draft_changed` or `draft_published` with the server's message, or a `404` while the flow edits a
 * stored draft, which another team member deleted. Anything else, and every failure of a new or a
 * published origin, is null, so the existing handling applies (`rules_changed` among them).
 */
export function conflictOf(
  error: unknown,
  origin: EditorOrigin,
  during: 'save' | 'publish'
): DraftConflict | null {
  if (origin.kind !== 'draft' || !(error instanceof ApiError)) {
    return null;
  }
  if (
    error.status === 409 &&
    (error.data.error === DRAFT_CHANGED_ERROR || error.data.error === DRAFT_PUBLISHED_ERROR)
  ) {
    return { kind: error.data.error, during, message: error.data.message };
  }
  if (error.status === 404) {
    return { kind: 'draft_deleted', during, message: DRAFT_COPY.draftDeletedText };
  }
  return null;
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
 * What "Save and exit" would store at this moment, apart from the step and the version (FR-002,
 * FR-015): the name and the form ID as typed, the documents, and the branches with the counters.
 * A rule open in the rule editor counts as kept, complete or not, as "Save changes" would keep it
 * (R9, FR-012).
 */
export function localContentOf(state: EditorState, rules: RulesState): LocalDraftContent {
  const kept = rules.editing ? rulesReducer(rules, { type: 'saveRule' }) : rules;
  return {
    name: state.name,
    servicebwForm: state.servicebwForm,
    documents: state.documents,
    branches: branchInputs(kept.branches),
    numberingBase: kept.numberingBase,
    counters: kept.counters,
  };
}

/** The body of "Save and exit" (R12): the content, the name and the form ID trimmed, the step. */
export function draftPayload(content: LocalDraftContent, step: EditorStep): DraftCreate {
  return {
    name: content.name.trim(),
    servicebw_form: content.servicebwForm.trim(),
    documents: content.documents,
    rules: { branches: content.branches, numbering_base: content.numberingBase },
    step,
  };
}

/**
 * The step a draft opens at (FR-008; R12): the step it was saved in, except the test step without
 * any rule in any variant, which can't open, and becomes the rules step.
 */
export function openingStepOf(step: EditorStep, rules: RulesState): EditorStep {
  return step === 'test' && !hasAnyRule(rules.branches) ? 'rules' : step;
}

/**
 * The reducers' starting states for a stored draft (R12): its name, form ID and documents, a
 * type or field the catalog dropped included; its variants with the editor's keys (`main` for the
 * main variant, `newBranchKey()` for the others, in order), numbering from the draft's counters,
 * without a rule set; at `step` (the draft's own by default), through `openingStepOf()`.
 */
export function initialStatesFromDraft(
  draft: FormConnectionDraft,
  step: EditorStep = draft.step
): { editor: EditorState; rules: RulesState } {
  const counters = { rule: draft.next_rule_number, group: draft.next_group_number };
  const rules = rulesStateOf(draft.branches, counters, counters);
  const editor: EditorState = {
    ...INITIAL_EDITOR_STATE,
    step: openingStepOf(step, rules),
    name: draft.name,
    servicebwForm: draft.servicebw_form,
    documents: requestedDocumentsOf(draft.documents),
  };
  return { editor, rules };
}

/**
 * The reducers' starting states for a local draft (R10): its content, at its step through
 * `openingStepOf()`; its variants with the editor's keys, as a stored draft's get them. Its
 * counters and numbering base are the record's own, since a flow that was never saved numbers
 * from its start, not from its next numbers.
 */
export function initialStatesFromLocal(record: LocalDraftRecord): {
  editor: EditorState;
  rules: RulesState;
} {
  const { content } = record;
  const rules = rulesStateOf(content.branches, content.counters, content.numberingBase);
  const editor: EditorState = {
    ...INITIAL_EDITOR_STATE,
    step: openingStepOf(record.step, rules),
    name: content.name,
    servicebwForm: content.servicebwForm,
    documents: content.documents,
  };
  return { editor, rules };
}

/**
 * The rules step's starting state for stored or local branches, without a rule set: the main
 * variant keyed `main`, the others `newBranchKey()` in order, the first one open. Without
 * branches, the empty Standard alone.
 */
function rulesStateOf(
  branches: BranchInput[],
  counters: NumberingBase,
  numberingBase: NumberingBase
): RulesState {
  const empty = initialRulesState();
  const keyed = branches.reduce<RulesBranch[]>(
    (done, branch) => [
      ...done,
      { ...branch, key: branch.origin === 'main' ? MAIN_BRANCH_KEY : newBranchKey(done) },
    ],
    []
  );
  return keyed.length > 0
    ? { ...empty, branches: keyed, openBranch: keyed[0].key, counters, numberingBase }
    : { ...empty, counters, numberingBase };
}

/**
 * The origin of a flow resumed from a local draft (R10): the stored draft it belongs to, at the
 * version the flow loaded, or a new connection, under the record's flow key either way.
 */
export function originOfRecord(record: LocalDraftRecord): EditorOrigin {
  if (record.draftId === null) {
    return { kind: 'new', flowKey: record.flowKey };
  }
  return {
    kind: 'draft',
    draftId: record.draftId,
    // A record without the version it loaded is never written; were one read, version 0, which
    // no draft has, makes its save meet the conflict (FR-022) rather than overwrite unseen work
    draftVersion: record.draftVersion ?? 0,
    flowKey: record.flowKey,
  };
}

/**
 * What `/form-connections/new?local=<param>` opens (contracts/local-drafts.md "Rules for callers"
 * 1; R10), `record` being the account's record of that key: a fresh flow without a valid key, the
 * record when there is one, and otherwise the stored draft's edit route for a `draft-<id>` key, or
 * an empty flow under a `new-` key.
 */
export function entryOf(param: string | null, record: LocalDraftRecord | null): EditorEntry {
  if (param === null || !isFlowKey(param)) {
    return { kind: 'fresh' };
  }
  if (record) {
    return { kind: 'local', record };
  }
  const draftId = draftIdOfFlowKey(param);
  return draftId === null ? { kind: 'empty', flowKey: param } : { kind: 'missingDraft', draftId };
}

/**
 * How the create routes, /form-connections/new and /get-started, open (contracts/local-drafts.md
 * "Rules for callers" 1; R10), from `entryOf()`:
 * - a record resumes from its content under its own origin (`originOfRecord()`), a stored
 *   draft's with the "Draft" badge;
 * - an empty flow starts under its key, and a fresh one under a new key from `newUuid()`, which
 *   the page then writes into the URL;
 * - a `draft-<id>` key without a record opens the stored draft's edit route instead.
 *
 * The baseline (data-model.md section 6) is the empty flow for a new connection, fresh or resumed,
 * and none for a stored draft's record, since this flow doesn't read the stored draft. It is never
 * the record's own content: that copy exists only on the device, and a change undone after
 * resuming would remove it.
 */
export function startOfEntry(
  entry: EditorEntry,
  newUuid: () => string,
  initialStep: EditorStep = 'connection'
): EditorStart {
  switch (entry.kind) {
    case 'missingDraft':
      return entry;
    case 'local': {
      const origin = originOfRecord(entry.record);
      return {
        kind: 'open',
        origin,
        initialStates: initialStatesFromLocal(entry.record),
        baseline: origin.kind === 'new' ? emptyContent() : null,
        urlFlowKey: null,
      };
    }
    case 'empty':
      return newConnectionFlow(entry.flowKey, initialStep, false);
    case 'fresh':
      return newConnectionFlow(newFlowKey(newUuid()), initialStep, true);
  }
}

/** An empty new connection under `flowKey`, which a fresh flow writes into the URL. */
function newConnectionFlow(flowKey: string, initialStep: EditorStep, fresh: boolean): EditorFlow {
  return {
    kind: 'open',
    origin: { kind: 'new', flowKey },
    initialStates: { editor: initialEditorState({ initialStep }), rules: initialRulesState() },
    baseline: emptyContent(),
    urlFlowKey: fresh ? flowKey : null,
  };
}

/**
 * How a flow with a given origin opens, such as a stored draft or a published connection on its
 * edit route: from `initialStates`, or else empty or from the published connection at
 * `initialStep`. The baseline (data-model.md section 6) is `baseline` when given, as after
 * "Restore changes", and otherwise the starting states' content for a stored draft, the stored
 * draft as loaded, or the empty flow for a new connection. A published connection has none, as
 * it never has a local draft (FR-014).
 */
export function startOfOrigin({
  origin,
  initialStates,
  initialStep = 'connection',
  baseline,
}: Pick<FormConnectionEditorPageProps, 'initialStates' | 'initialStep' | 'baseline'> & {
  origin: EditorOrigin;
}): EditorFlow {
  const formConnection = origin.kind === 'published' ? origin.formConnection : undefined;
  const states = initialStates ?? {
    editor: initialEditorState({ formConnection, initialStep }),
    rules: initialRulesState(formConnection),
  };
  return {
    kind: 'open',
    origin,
    initialStates: states,
    baseline:
      origin.kind === 'published'
        ? null
        : (baseline ??
          (origin.kind === 'new' ? emptyContent() : localContentOf(states.editor, states.rules))),
    urlFlowKey: null,
  };
}

/**
 * The checks "Save and exit" makes before storing (R12): the name's only, as step 1 makes them,
 * so that a draft never needs a form ID.
 */
export function draftNameErrors(name: string): EditorErrors {
  const errors = validateConnection(name, '');
  return errors.name ? { name: errors.name } : {};
}

/**
 * The alert after a failed "Save and exit" (S1.5; W3; FR-013). A `5xx`, nginx's `502` or `503`
 * without JSON included, or a network failure gets U28's text, the error ID the server sent, and
 * "Try again". Any other answer, such as a `400`, shows the server's message, without "Try again".
 */
export function draftSaveErrorOf(error: unknown): DraftSaveError {
  if (!(error instanceof ApiError) || error.status >= 500) {
    const errorId = error instanceof ApiError ? error.data.error_id : undefined;
    return {
      notice: errorId
        ? { message: DRAFT_COPY.saveNetworkError, error_id: errorId }
        : { message: DRAFT_COPY.saveNetworkError },
      retryable: true,
    };
  }
  return { notice: errorNoticeOf(error, DRAFT_COPY.saveNetworkError), retryable: false };
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
