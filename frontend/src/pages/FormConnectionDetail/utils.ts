import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  FormConnection,
  RequestedDocument,
  RequestedDocumentView,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { DetailLocationState } from '@connection-portal/api-types/routing';
import type { RuleChecks } from '@connection-portal/rules/checks/types';
import { ruleDocumentsOf } from '@connection-portal/rules/conditions';
import type { Language } from '@connection-portal/rules/language';
import { countRules } from '@connection-portal/rules/tree';
import type { RuleDocument } from '@connection-portal/rules/types';

import { ApiError, errorNoticeOf } from '../../api/client';
import { PUBLISH_DIALOG_COPY } from '../FormConnectionEditor/constants';
import type { BannerItem, RulesBranch } from '../FormConnectionEditor/RulesStep/types';
import type { FindingLine } from '../FormConnectionEditor/types';
import { findingLinesOf } from '../FormConnectionEditor/utils';
import { DELETE_CONNECTION_COPY } from '../FormConnectionList/constants';
import { deleteDialogCopyOf, formatRowDate } from '../FormConnectionList/utils';
import { CONNECTION_DETAIL_COPY, INITIAL_ACTIONS_STATE, SAVED_TIME_FORMATS } from './constants';
import type {
  ActionDialogCopy,
  ActionsAction,
  ActionsState,
  Arrival,
  ConfirmedAction,
  DeleteDraftFailure,
  DetailAccordionName,
  DraftDeleteAction,
  DraftDeleteState,
  LinkCardLink,
  ReactivateSummary,
  StatusAction,
} from './types';

export function arrivalOf(state: unknown): Arrival {
  const locationState = state as DetailLocationState | null;
  if (locationState?.published) return 'published';
  if (locationState?.saved) return 'saved';
  return null;
}

/** The first state: after saving an edit, a success toast confirms it (FR-051 (42)). */
export function initialActionsState(arrival: Arrival, language: Language): ActionsState {
  const message = CONNECTION_DETAIL_COPY[language].saved;
  return {
    ...INITIAL_ACTIONS_STATE,
    toast: arrival === 'saved' ? { id: 1, kind: 'success', message } : null,
  };
}

export function actionsReducer(state: ActionsState, action: ActionsAction): ActionsState {
  switch (action.type) {
    case 'openDialog':
      return { ...state, dialog: action.dialog, dialogOpen: true, error: null };
    case 'closeDialog':
      return state.running ? state : { ...state, dialogOpen: false, error: null };
    case 'start':
      // A retry takes the old message away, so that a new failure is announced again
      return { ...state, running: action.action, error: null };
    case 'succeeded':
      return {
        ...state,
        dialogOpen: false,
        running: null,
        toast: { id: (state.toast?.id ?? 0) + 1, kind: 'success', message: action.message },
      };
    case 'failed':
      // A dialog stays open and shows the message where the user is looking
      return { ...state, running: null, error: action.error };
    case 'dismissToast':
      return { ...state, toast: null };
  }
}

/**
 * A confirmation's texts and look (S17): deleting with the overview's one delete dialog, its body
 * by the connection's state (FR-029c; U14, U90), in danger red; deactivating with F13's body and
 * "Keep active" (U88 6417:31206); reactivating with its summary in the wide dialog (U89
 * 7173:52959).
 */
export function dialogCopyOf(
  action: ConfirmedAction,
  formConnection: Pick<FormConnection, 'name' | 'status' | 'is_active'>,
  language: Language
): ActionDialogCopy {
  const copy = CONNECTION_DETAIL_COPY[language];
  switch (action) {
    case 'delete': {
      const deleteCopy = DELETE_CONNECTION_COPY[language];
      return {
        ...deleteDialogCopyOf(formConnection, language),
        confirmLabel: deleteCopy.confirm,
        cancelLabel: deleteCopy.cancel,
        busyLabel: deleteCopy.busy,
        errorTitle: deleteCopy.errorTitle,
        danger: true,
        wide: false,
      };
    }
    case 'deactivate':
      return {
        title: copy.deactivateTitle,
        text: copy.deactivateText,
        confirmLabel: copy.deactivate,
        cancelLabel: copy.keepActive,
        busyLabel: copy.deactivating,
        errorTitle: copy.deactivateError,
        danger: false,
        wide: false,
      };
    case 'activate':
      return {
        title: copy.activateTitle,
        text: copy.activateText,
        confirmLabel: copy.activate,
        cancelLabel: copy.cancel,
        busyLabel: copy.activating,
        errorTitle: copy.activateError,
        danger: false,
        wide: true,
      };
  }
}

/**
 * The reactivate dialog's summary (FR-051 (40); U89 7173:52959), as the publish dialog writes
 * it: "Personal ID · 7 data items" per document, "Standard · 2 rules" per variant in tab order.
 */
export function reactivateSummaryOf(
  formConnection: Pick<FormConnection, 'documents' | 'branches'>,
  language: Language
): ReactivateSummary {
  const copy = PUBLISH_DIALOG_COPY[language];
  return {
    documentLines: formConnection.documents.map((document) =>
      copy.documentLine(document.label, document.fields.length)
    ),
    ruleLines: formConnection.branches.map((branch) =>
      copy.ruleLine(branch.name.trim(), countRules(branch.items))
    ),
  };
}

/** The API's message, with the error ID of a 5xx answer, or "Nothing changed. …". */
export function actionErrorNotice(error: unknown, language: Language) {
  return errorNoticeOf(error, CONNECTION_DETAIL_COPY[language].actionErrorText);
}

/** The toast after an action that keeps the connection. */
export function successMessageOf(
  action: Exclude<StatusAction, 'delete'>,
  language: Language
): string {
  const copy = CONNECTION_DETAIL_COPY[language];
  return action === 'deactivate' ? copy.deactivated : copy.activated;
}

/**
 * The result links: every variant's pull URL from its `pull_url`, never derived from its name
 * (F24), labelled with the variant; with Standard only, its URL unlabelled, as in spec 001 (W2).
 */
export function resultLinksOf(formConnection: FormConnection): LinkCardLink[] {
  const { branches } = formConnection;
  if (branches.length <= 1) {
    return [{ key: 'result', url: branches[0]?.pull_url ?? formConnection.pull_url, branch: null }];
  }
  return branches.map((branch) => ({ key: branch.id, url: branch.pull_url, branch }));
}

/** The Links accordion's counts (FR-052f): "1 request link · 3 result links". */
export function linksCountsOf(formConnection: FormConnection, language: Language): string {
  return CONNECTION_DETAIL_COPY[language].linksCounts(resultLinksOf(formConnection).length);
}

/**
 * The accordion open on arrival (FR-046, F50): Links right after publishing (U80), otherwise
 * the Summary, as from the overview's "View" (U91), which passes no state of its own.
 */
export function initialAccordionOf(arrival: Arrival): DetailAccordionName {
  return arrival === 'published' ? 'links' : 'summary';
}

/** One accordion open at a time (FR-046): opening one closes the other; its toggle closes it. */
export function toggleAccordion(
  open: DetailAccordionName | null,
  name: DetailAccordionName
): DetailAccordionName | null {
  return open === name ? null : name;
}

/** The identifiers of the rules that count in a tree, as `countRules` counts them. */
function countableRuleIds(items: RuleTreeItem[]): string[] {
  return items.flatMap((item) => {
    if (item.mark === 'removed') {
      return [];
    }
    return item.type === 'rule' ? [item.id] : countableRuleIds(item.items);
  });
}

/**
 * The closed rules card's counts (Figma 10.11, B8): every variant, Standard included, and every
 * distinct rule once. A based variant keeps the main branch's identifiers for inherited rules
 * (data-model.md), so summing the variants would count them twice; a rule a variant removes
 * still counts, in Standard. Grouped rules count one by one, groups don't.
 */
export function rulesCountsOf(branches: Pick<BranchInput, 'items'>[], language: Language): string {
  const ruleIds = new Set(branches.flatMap((branch) => countableRuleIds(branch.items)));
  return CONNECTION_DETAIL_COPY[language].rulesCounts(branches.length, ruleIds.size);
}

/**
 * The Summary accordion's counts (FR-046 (i); U82 6396:48195): "2 documents · 9 data items · 3
 * variants · 4 rules", every requested field counted once and the rules as `rulesCountsOf()`
 * counts them.
 */
export function summaryCountsOf(
  documents: Pick<RequestedDocumentView, 'fields'>[],
  branches: Pick<BranchInput, 'items'>[],
  language: Language
): string {
  const dataItems = documents.reduce((count, document) => count + document.fields.length, 0);
  return CONNECTION_DETAIL_COPY[language].summaryCounts(
    documents.length,
    dataItems,
    rulesCountsOf(branches, language)
  );
}

/**
 * The branches as the variant tabs and the rule checks take them (research R7): keyed by their
 * id, or, a draft's without one, by their place, which doesn't change on this read-only page.
 */
export function keyedBranchesOf(branches: BranchInput[]): RulesBranch[] {
  return branches.map((branch, index) => ({ ...branch, key: branch.id ?? `${index}` }));
}

/** The requested documents with the keys of their fields, which the checks' context takes. */
export function requestedDocumentsOf(documents: RequestedDocumentView[]): RequestedDocument[] {
  return documents.map((document) => ({
    document_type: document.document_type,
    fields: document.fields.map((field) => field.key),
  }));
}

/**
 * The findings lines of the published summary (FR-047, CLAR #36; U85 6760:48704, U06 #10: "lists
 * the same lines" as the publish dialog): one per variant with findings, the publish dialog's
 * sentence (C4), warnings first and each kind in tab order (FR-044c), as the read-only rows of
 * `FindingsBannerLine`: the sentence is one plain part, so no name is a link, and no kind text
 * goes before it, since the sentence says what the findings are. A variant not checked yet has none.
 */
export function summaryFindingsOf(
  branches: readonly RulesBranch[],
  byBranch: RuleChecks['byBranch'],
  language: Language
): BannerItem[] {
  const lines: FindingLine[] = findingLinesOf(branches, byBranch, language);
  return [...lines]
    .sort((a, b) => Number(b.tone === 'warning') - Number(a.tone === 'warning'))
    .map((line) => ({ key: line.key, tone: line.tone, kindText: null, parts: [line.text] }));
}

/**
 * What a draft's rules summary names (S6): the requested documents as the draft holds them (a type
 * or field the catalog dropped keeps its key as its label), each followed by the catalog's fields
 * it doesn't request, then the catalog's documents it doesn't request. A draft may keep rules on
 * data that isn't requested (FR-004), and the summary names that data as the rules step does,
 * which looks rules up in the whole catalog. Without the catalog, only the requested documents.
 */
export function draftRuleDocumentsOf(
  documents: RequestedDocumentView[],
  documentTypes: DocumentType[]
): RuleDocument[] {
  const requested = ruleDocumentsOf(documents).map((document) => {
    const known = new Set(document.fields.map((field) => field.key));
    const others = documentTypes.find((type) => type.key === document.key)?.fields ?? [];
    return {
      ...document,
      fields: [...document.fields, ...others.filter((field) => !known.has(field.key))],
    };
  });
  const keys = new Set(requested.map((document) => document.key));
  return [...requested, ...documentTypes.filter((type) => !keys.has(type.key))];
}

/**
 * The draft band's date pill (U93 7362:54712, FR-049): the draft's last save as the overview writes
 * dates and the 24-hour time in the browser's time zone, "Edited 03.10.2026, 14:32" (design-notes
 * §3 "Dates").
 */
export function editedLineOf(updatedAt: string, language: Language): string {
  const time = SAVED_TIME_FORMATS[language].format(new Date(updatedAt));
  return CONNECTION_DETAIL_COPY[language].edited(`${formatRowDate(updatedAt)}, ${time}`);
}

/**
 * Why deleting a draft failed (S6): published meanwhile (`409 draft_published`), deleted
 * meanwhile (`404`), or anything else, with the API's message and a 5xx answer's error ID. A
 * `401` signs out before this is asked.
 */
export function deleteDraftErrorOf(error: unknown, language: Language): DeleteDraftFailure {
  const copy = CONNECTION_DETAIL_COPY[language];
  if (error instanceof ApiError && error.status === 409 && error.data.error === 'draft_published') {
    return { kind: 'published', notice: { message: copy.draftPublishedSince } };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { kind: 'deleted', notice: { message: copy.draftAlreadyDeleted } };
  }
  return { kind: 'failed', notice: errorNoticeOf(error, copy.actionErrorText) };
}

/**
 * The notice of a failed draft delete as the dialog shows it (S6): for a draft published or
 * deleted meanwhile the page's own words, in the language of the moment, so that they follow a
 * switch (spec 009); otherwise the notice as it arrived (the API's message, or the fallback).
 */
export function deleteDraftNoticeOf(
  failure: DeleteDraftFailure | null,
  language: Language
): ErrorNotice | null {
  if (!failure) {
    return null;
  }
  const copy = CONNECTION_DETAIL_COPY[language];
  switch (failure.kind) {
    case 'published':
      return { message: copy.draftPublishedSince };
    case 'deleted':
      return { message: copy.draftAlreadyDeleted };
    default:
      return failure.notice;
  }
}

export function draftDeleteReducer(
  state: DraftDeleteState,
  action: DraftDeleteAction
): DraftDeleteState {
  switch (action.type) {
    case 'openDialog':
      return { dialogOpen: true, deleting: false, failure: null };
    case 'closeDialog':
      return state.deleting ? state : { ...state, dialogOpen: false, failure: null };
    case 'start':
      // A retry takes the old message away, so that a new failure is announced again
      return { ...state, deleting: true, failure: null };
    case 'failed':
      return { ...state, deleting: false, failure: action.failure };
  }
}

/**
 * The delete confirmation's error title and the confirm button after a failure: published
 * meanwhile, it opens the connection; deleted meanwhile, the overview; otherwise it retries.
 * Only deleting is in the danger colour.
 */
export function deleteDraftDialogOf(failure: DeleteDraftFailure | null, language: Language) {
  const copy = CONNECTION_DETAIL_COPY[language];
  switch (failure?.kind) {
    case 'published':
      return {
        errorTitle: copy.deleteError,
        retryLabel: copy.openConnection,
        danger: false,
      };
    case 'deleted':
      return {
        errorTitle: copy.deleteError,
        retryLabel: copy.toOverview,
        danger: false,
      };
    default:
      return { errorTitle: copy.deleteError, retryLabel: copy.retry, danger: true };
  }
}
