import type { ErrorNotice } from '@connection-portal/api-types/api';
import type {
  ActivityActor,
  ActivityEntry,
  ActivityPage,
  BranchInput,
  ConnectionState,
  Deletion,
  FormConnection,
  FormConnectionOrDraft,
  RequestedDocument,
  RequestedDocumentView,
} from '@connection-portal/api-types/form-connections';
import type {
  DetailLocationState,
  OverviewLocationState,
} from '@connection-portal/api-types/routing';
import type { RuleChecks } from '@connection-portal/rules/checks/types';
import { formatDate } from '@connection-portal/rules/dates';
import type { Language } from '@connection-portal/rules/language';
import { countRules } from '@connection-portal/rules/tree';

import { ApiError, errorNoticeOf } from '../../api/client';
import type { ActiveFrom } from '../../components/ActiveFromChoice/types';
import { startDateOf } from '../../components/ActiveFromChoice/utils';
import { summaryNumbersOf } from '../../utils/connectionSummary';
import { EDIT_ENTRY_DIALOG_COPY } from '../FormConnectionEdit/constants';
import { PUBLISH_DIALOG_COPY } from '../FormConnectionEditor/constants';
import type { BannerItem, RulesBranch } from '../FormConnectionEditor/RulesStep/types';
import type { FindingLine } from '../FormConnectionEditor/types';
import { findingLinesOf } from '../FormConnectionEditor/utils';
import { DELETE_CONNECTION_COPY } from '../FormConnectionList/constants';
import { deleteDialogCopyOf, formatRowDate } from '../FormConnectionList/utils';
import {
  ACTIVITY_COPY,
  CONNECTION_DETAIL_COPY,
  INITIAL_ACTIONS_STATE,
  SAVED_TIME_FORMATS,
  START_TIME,
} from './constants';
import type {
  ActionDialog,
  ActionDialogCopy,
  ActionsAction,
  ActionsState,
  ActivityCardAction,
  ActivityCardState,
  ActivityRequest,
  Arrival,
  ConfirmedAction,
  ConnectionMenuEntry,
  DatePillSource,
  DeleteDraftFailure,
  DetailAccordionName,
  DraftDeleteAction,
  DraftDeleteState,
  LinkCardLink,
  ReactivatePlan,
  ReactivateSummary,
  RunningAction,
  StartDatePlan,
  StatusBandTone,
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

/**
 * The page's dialogs and the calls they run (S15, S17). Opening one clears the last failure and
 * sets its "Active from" (C2): "Change start date" opens with the connection's choice
 * (`startDateChoiceOf()`), any other with "Now" and an empty field. The choice and the text stay
 * through a call and its failure, so that "Try again" repeats them (FR-014, W8); a refused date
 * shows the field's error, which goes when the choice or the text changes or a call starts.
 */
export function actionsReducer(state: ActionsState, action: ActionsAction): ActionsState {
  switch (action.type) {
    case 'openDialog':
      return {
        ...state,
        dialog: action.dialog,
        dialogOpen: true,
        error: null,
        noAnswer: false,
        activeFrom: action.activeFrom ?? 'now',
        startDateText: action.startDateText ?? '',
        dateError: false,
      };
    case 'closeDialog':
      return state.running ? state : { ...state, dialogOpen: false, error: null, noAnswer: false };
    case 'start':
      // A retry takes the old message away, so that a new failure is announced again; the date it
      // sends passed the check, so the field's error goes too
      return { ...state, running: action.action, error: null, noAnswer: false, dateError: false };
    case 'succeeded':
      return {
        ...state,
        dialogOpen: false,
        running: null,
        toast: { id: (state.toast?.id ?? 0) + 1, kind: 'success', message: action.message },
      };
    case 'failed':
      // A dialog stays open and shows the message where the user is looking
      return { ...state, running: null, error: action.error, noAnswer: action.noAnswer ?? false };
    case 'chooseActiveFrom':
      return { ...state, activeFrom: action.choice, dateError: false };
    case 'typeStartDate':
      return { ...state, startDateText: action.text, dateError: false };
    case 'dateRefused':
      // The dialog again without a failure, with the field's error (FR-003, W1)
      return {
        ...state,
        running: null,
        error: null,
        noAnswer: false,
        dateError: true,
        dateRefusals: state.dateRefusals + 1,
      };
    case 'dismissToast':
      return { ...state, toast: null };
  }
}

/**
 * "Change start date"'s first choice (S15; FR-008, FR-009): a scheduled connection's "On a date"
 * with its start date as the field shows it, `DD.MM.YYYY` (FR-020); an active one's "Now" with
 * an empty field
 */
export function startDateChoiceOf(
  formConnection: Pick<FormConnection, 'state' | 'start_date'>
): Pick<ActionsState, 'activeFrom' | 'startDateText'> {
  if (formConnection.state === 'scheduled' && formConnection.start_date) {
    return { activeFrom: 'date', startDateText: formatDate(formConnection.start_date) };
  }
  return { activeFrom: 'now', startDateText: '' };
}

/**
 * "Now (active since 23.10.2026, 14:32)" for an active connection (FR-009; U87 6396:48860), its
 * time as the date pill writes it; none for a scheduled one, whose radio reads "Now"
 */
export function startDateNowLabelOf(
  formConnection: Pick<FormConnection, 'state' | 'activated_at' | 'published_at'>,
  language: Language
): string | undefined {
  const since = formConnection.activated_at ?? formConnection.published_at;
  if (formConnection.state !== 'live' || !since) {
    return undefined;
  }
  return CONNECTION_DETAIL_COPY[language].nowActiveSince(dateTimeOf(since, language));
}

/**
 * The hint under "Active from" (FR-009, F10): with "On a date", an active connection's requests in
 * progress are cancelled; none otherwise
 */
export function startDateHintOf(
  state: FormConnection['state'],
  activeFrom: ActiveFrom,
  language: Language
): string | undefined {
  return state === 'live' && activeFrom === 'date'
    ? CONNECTION_DETAIL_COPY[language].startDateHint
    : undefined;
}

/**
 * What "Save date" does (S15; FR-003, FR-008, FR-009): "Now" sends null for a scheduled
 * connection, which becomes active at once, and nothing for an active one, which stays as it is;
 * "On a date" refuses a day that isn't after `today` (today in Germany), sends nothing for a
 * scheduled connection's own date, and sends the day otherwise
 */
export function startDatePlanOf(
  formConnection: Pick<FormConnection, 'state' | 'start_date'>,
  activeFrom: ActiveFrom,
  text: string,
  today: string
): StartDatePlan {
  if (activeFrom === 'now') {
    return formConnection.state === 'live'
      ? { kind: 'unchanged' }
      : { kind: 'send', startDate: null };
  }
  const result = startDateOf(text, today);
  if (!result.ok) {
    return { kind: 'refused' };
  }
  if (formConnection.state === 'scheduled' && result.date === formConnection.start_date) {
    return { kind: 'unchanged' };
  }
  return { kind: 'send', startDate: result.date };
}

/**
 * No answer came (FR-014, F2, W8): a network failure, or a `5xx` without the API's envelope
 * (nginx's `502` or `503`), which has no error ID; a `5xx` with its error ID is an answer
 */
export function isNoAnswer(error: unknown): boolean {
  return !(error instanceof ApiError) || (error.status >= 500 && !error.data.error_id);
}

/**
 * The ⋯ menu's entries by the connection's state (S15; FR-008, FR-009; U88 6417:31045): a
 * scheduled and an active connection "Change start date", "Deactivate", then, after the divider,
 * "Delete connection"; a deactivated one "Delete connection" alone (its band holds "Activate
 * again"). A draft's band has no ⋯ (`DraftDetails`).
 */
export function connectionMenuOf(state: FormConnection['state']): ConnectionMenuEntry[] {
  switch (state) {
    case 'live':
    case 'scheduled':
      return ['startDate', 'deactivate', 'delete'];
    case 'deactivated':
      return ['delete'];
  }
}

/** The confirmation a dialog of the page is, or null for "Change start date", which isn't one */
export function confirmationOf(dialog: ActionDialog): ConfirmedAction | null {
  return dialog === 'startDate' ? null : dialog;
}

/**
 * A confirmation's texts and look (S17): deleting with the overview's one delete dialog, its body
 * by the connection's state (FR-029c; U14, U90; a scheduled one's FR-010, U14 6872:45929), in
 * danger red; deactivating with F13's body and "Keep active" (U88 6417:31206), a scheduled
 * connection with copy.md §2's sentence and "Keep scheduled" (FR-012, W5); reactivating with its
 * summary in the wide dialog (U89 7173:52959), "Activate" with "Now" and "Schedule" /
 * "Scheduling…" with "On a date" (FR-011, W4).
 */
export function dialogCopyOf(
  action: ConfirmedAction,
  formConnection: Pick<FormConnection, 'name' | 'status' | 'is_active' | 'state' | 'start_date'>,
  language: Language,
  activeFrom: ActiveFrom = 'now'
): ActionDialogCopy {
  const copy = CONNECTION_DETAIL_COPY[language];
  const scheduledStart =
    formConnection.state === 'scheduled' && formConnection.start_date
      ? formatDate(formConnection.start_date, language)
      : null;
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
        text: scheduledStart ? copy.deactivateScheduledText(scheduledStart) : copy.deactivateText,
        confirmLabel: copy.deactivate,
        cancelLabel: scheduledStart ? copy.keepScheduled : copy.keepActive,
        busyLabel: copy.deactivating,
        errorTitle: copy.deactivateError,
        danger: false,
        wide: false,
      };
    case 'activate':
      return {
        title: copy.activateTitle,
        text: copy.activateText,
        confirmLabel: activeFrom === 'date' ? copy.schedule : copy.activate,
        cancelLabel: copy.cancel,
        busyLabel: activeFrom === 'date' ? copy.scheduling : copy.activating,
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

/**
 * What "Activate" or "Schedule" does (S17; FR-003, FR-011): "Now" activates at once (null); "On a
 * date" refuses a day that isn't after `today` (today in Germany) and sends the day otherwise
 */
export function reactivatePlanOf(
  activeFrom: ActiveFrom,
  text: string,
  today: string
): ReactivatePlan {
  if (activeFrom === 'now') {
    return { kind: 'send', startDate: null };
  }
  const result = startDateOf(text, today);
  return result.ok ? { kind: 'send', startDate: result.date } : { kind: 'refused' };
}

/** The hint under "Active from" when reactivating (FR-011, copy.md §2): with "On a date" only */
export function reactivateHintOf(activeFrom: ActiveFrom, language: Language): string | undefined {
  return activeFrom === 'date' ? CONNECTION_DETAIL_COPY[language].activateDateHint : undefined;
}

/**
 * The details' edit entry question (S17, F48; U87 6396:49030): "Edit “<name>”?" with the design's
 * body, or for a scheduled connection "Edit this scheduled connection?" and that saved changes
 * become active on its start date (spec 010; FR-013, W7)
 */
export function editEntryCopyOf(
  formConnection: Pick<FormConnection, 'name' | 'state' | 'start_date'>,
  language: Language
): { title: string; text: string; cancel: string; confirm: string } {
  const copy = EDIT_ENTRY_DIALOG_COPY[language];
  const { cancel, confirm } = copy;
  if (formConnection.state === 'scheduled' && formConnection.start_date) {
    return {
      title: copy.scheduledTitle,
      text: copy.scheduledText(formatDate(formConnection.start_date, language)),
      cancel,
      confirm,
    };
  }
  return { title: copy.title(formConnection.name), text: copy.text, cancel, confirm };
}

/** The API's message, with the error ID of a 5xx answer, or "Nothing changed. …". */
export function actionErrorNotice(error: unknown, language: Language) {
  return errorNoticeOf(error, CONNECTION_DETAIL_COPY[language].actionErrorText);
}

/**
 * The toast after an action that keeps the connection; after "Save date" "Start date saved.", also
 * when "Now" made the connection active (FR-008, W3; copy.md §2); after reactivating on a date,
 * `scheduledFor` the answered start date (YYYY-MM-DD), "Connection scheduled for 01.12.2026."
 * (FR-011, W4)
 */
export function successMessageOf(
  action: Exclude<RunningAction, 'delete'>,
  language: Language,
  scheduledFor: string | null = null
): string {
  const copy = CONNECTION_DETAIL_COPY[language];
  switch (action) {
    case 'deactivate':
      return copy.deactivated;
    case 'activate':
      return scheduledFor ? copy.scheduledFor(formatDate(scheduledFor, language)) : copy.activated;
    case 'startDate':
      return copy.startDateSaved;
  }
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
 * The accordion open on arrival (FR-046, F50; spec 010 FR-022, F40): Links right after publishing
 * (U80), also after "Schedule", which arrives as a publish does (S15; U94 7246:53289), and after
 * the edit flow's "Save" (E4 U99 6730:39754); otherwise the Summary, as from the overview's "View"
 * (U91, U94 7246:52715), which passes no state of its own.
 */
export function initialAccordionOf(arrival: Arrival): DetailAccordionName {
  return arrival === null ? 'summary' : 'links';
}

/**
 * One card open at a time (FR-046, FR-022): opening Links, Summary or Activity closes the one that
 * was open; its own toggle closes it.
 */
export function toggleAccordion(
  open: DetailAccordionName | null,
  name: DetailAccordionName
): DetailAccordionName | null {
  return open === name ? null : name;
}

/**
 * The classes of a details card's body (FR-046, V6). It clips only while closed or moving, and
 * then it is also `relative` (bug published-sticky-bar): `overflow: hidden` clips an absolutely
 * positioned descendant only when the clip lies on that descendant's containing-block chain. The
 * cards' visually hidden texts (`sr-only`, `kern-sr-only`, the variant tabs' list) are
 * `absolute`, and without a positioned body their containing block is `WizardLayout`'s content
 * box: they escape the clip, sit below the closed card at their unclipped positions and lengthen
 * the page past the sticky footer, leaving blank space under it. Open and settled, the body is
 * neither clipped nor positioned, so a tooltip or the full URL's bubble still reaches past the
 * card and a popup placed `full` still spans the content box.
 */
export function accordionBodyClassesOf(clipped: boolean): string {
  return clipped ? 'relative min-h-0 overflow-hidden' : 'min-h-0';
}

/**
 * The closed rules card's counts (Figma 10.11, B8): every variant, Standard included, and every
 * distinct rule once. A based variant keeps the main branch's identifiers for inherited rules
 * (data-model.md), so summing the variants would count them twice; a rule a variant removes
 * still counts, in Standard. Grouped rules count one by one, groups don't.
 */
export function rulesCountsOf(branches: Pick<BranchInput, 'items'>[], language: Language): string {
  const { variants, rules } = summaryNumbersOf([], branches);
  return CONNECTION_DETAIL_COPY[language].rulesCounts(variants, rules);
}

/**
 * The Summary accordion's counts (FR-046 (i); U82 6396:48195): "2 documents · 9 data items · 3
 * variants · 4 rules", every requested field counted once and the rules as `rulesCountsOf()`
 * counts them, from `summaryNumbersOf()`, which the PDF counts with too (spec 011, FR-008).
 */
export function summaryCountsOf(
  documents: Pick<RequestedDocumentView, 'fields'>[],
  branches: Pick<BranchInput, 'items'>[],
  language: Language
): string {
  const numbers = summaryNumbersOf(documents, branches);
  const copy = CONNECTION_DETAIL_COPY[language];
  return copy.summaryCounts(
    numbers.documents,
    numbers.dataItems,
    copy.rulesCounts(numbers.variants, numbers.rules)
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
 * The draft band's date pill (U93 7362:54712, FR-049): the draft's last save as the overview writes
 * dates and the 24-hour time in the browser's time zone, "Edited 03.10.2026, 14:32" (design-notes
 * §3 "Dates").
 */
export function editedLineOf(updatedAt: string, language: Language): string {
  return CONNECTION_DETAIL_COPY[language].edited(dateTimeOf(updatedAt, language));
}

/** "23.10.2026, 14:32": an instant from the API, the time in the browser's time zone (FR-020) */
function dateTimeOf(timestamp: string, language: Language): string {
  return `${formatRowDate(timestamp)}, ${SAVED_TIME_FORMATS[language].format(new Date(timestamp))}`;
}

/**
 * An activity entry's date and time, "23.10.2026, 14:32" (U86 6396:48529; FR-020), as the date
 * pill writes its instants
 */
export function activityDateTimeOf(entry: Pick<ActivityEntry, 'at'>, language: Language): string {
  return dateTimeOf(entry.at, language);
}

/**
 * What happened, one sentence per kind (FR-025; copy.md §3, W10): the drawn "Created",
 * "Documents changed", "Variant added: <name>", "Rules changed in <variant>", "Published",
 * "Deactivated", and the undrawn ones in their style; a variant's kinds with its name (the new
 * name for a rename), "Scheduled for <date>" and "Start date changed to <date>" with the start
 * date written as stored (a day in Germany, `DD.MM.YYYY`, never through `Date`), or "Start date
 * changed to now" without one
 */
export function activityEventOf(
  entry: Pick<ActivityEntry, 'kind' | 'variant' | 'start_date'>,
  language: Language
): string {
  const copy = ACTIVITY_COPY[language];
  const variant = entry.variant ?? '';
  const startDate = entry.start_date ? formatDate(entry.start_date, language) : null;
  switch (entry.kind) {
    case 'created':
      return copy.created;
    case 'renamed':
      return copy.renamed;
    case 'description_changed':
      return copy.descriptionChanged;
    case 'documents_changed':
      return copy.documentsChanged;
    case 'variant_added':
      return copy.variantAdded(variant);
    case 'variant_removed':
      return copy.variantRemoved(variant);
    case 'variant_renamed':
      return copy.variantRenamed(variant);
    case 'rules_changed':
      return copy.rulesChanged(variant);
    case 'published':
      return copy.published;
    case 'scheduled':
      // A `scheduled` entry always has its date (data-model §2.2)
      return copy.scheduled(startDate ?? '');
    case 'start_date_changed':
      return startDate ? copy.startDateChanged(startDate) : copy.startDateChangedToNow;
    case 'became_active':
      return copy.becameActive;
    case 'deactivated':
      return copy.deactivatedEvent;
    case 'reactivated':
      return copy.reactivated;
    case 'deleted':
      return copy.deleted;
    case 'restored':
      return copy.restored;
  }
}

/**
 * Who did it (FR-027; copy.md §3): the team member's name; "<name> with <agent>" for an agent's
 * change; "<name>, asked by <agent>" for what a team member approved; null for what the middleware
 * did by itself and for backfilled entries (FR-032)
 */
export function activityPersonOf(actor: ActivityActor | null, language: Language): string | null {
  if (!actor) {
    return null;
  }
  const copy = ACTIVITY_COPY[language];
  if (actor.agent === null) {
    return actor.name;
  }
  return actor.approved
    ? copy.personAskedBy(actor.name, actor.agent)
    : copy.personWithAgent(actor.name, actor.agent);
}

/**
 * The closed card's line (FR-024, FR-032; data-model §2.5): "Last edited by <person> · <date>,
 * <time>"; while the connection is deactivated and the entry is its deactivation, "Deactivated by
 * <person> · …"; without a person the time alone, "Last edited · …" / "Deactivated · …". Null for a
 * connection without entries
 */
export function activityClosedLineOf(
  lastActivity: ActivityEntry | null,
  state: ConnectionState,
  language: Language
): string | null {
  if (!lastActivity) {
    return null;
  }
  const copy = ACTIVITY_COPY[language];
  const person = activityPersonOf(lastActivity.actor, language);
  const dateTime = activityDateTimeOf(lastActivity, language);
  if (state === 'deactivated' && lastActivity.kind === 'deactivated') {
    return person ? copy.deactivatedBy(person, dateTime) : copy.deactivated(dateTime);
  }
  return person ? copy.lastEditedBy(person, dateTime) : copy.lastEdited(dateTime);
}

/**
 * The Activity card's list (S15; FR-022, FR-023): the first page when the card first opens, the
 * next when the list's end comes into view, down to the oldest entry; a failure keeps the pages
 * loaded before it, and "Try again" asks for the page that failed. An answer that arrives in a
 * state that didn't ask for it changes nothing; `reset` forgets the pages, so that the list loads
 * again from the newest entry
 */
export function activityCardReducer(
  state: ActivityCardState,
  action: ActivityCardAction
): ActivityCardState {
  switch (action.type) {
    case 'load':
      return state.kind === 'closed' ? { kind: 'loading' } : state;
    case 'loadMore':
      return state.kind === 'loaded' && nextCursorOf(state.pages) !== null
        ? { kind: 'loadingMore', pages: state.pages }
        : state;
    case 'retry':
      if (state.kind !== 'failed') {
        return state;
      }
      return state.pages.length === 0
        ? { kind: 'loading' }
        : { kind: 'loadingMore', pages: state.pages };
    case 'pageLoaded':
      switch (state.kind) {
        case 'loading':
          return { kind: 'loaded', pages: [action.page] };
        case 'loadingMore':
          return { kind: 'loaded', pages: [...state.pages, action.page] };
        default:
          return state;
      }
    case 'pageFailed':
      switch (state.kind) {
        case 'loading':
          return { kind: 'failed', pages: [], error: action.error };
        case 'loadingMore':
          return { kind: 'failed', pages: state.pages, error: action.error };
        default:
          return state;
      }
    case 'reset':
      return { kind: 'closed' };
  }
}

/** The cursor of the page after the last one loaded; null on the oldest page or before any */
function nextCursorOf(pages: ActivityPage[]): string | null {
  return pages.at(-1)?.next_cursor ?? null;
}

/** The entries loaded so far, newest first */
export function activityEntriesOf(state: ActivityCardState): ActivityEntry[] {
  return 'pages' in state ? state.pages.flatMap((page) => page.items) : [];
}

/** The page the card is loading: the first (cursor null) or the next; null while it isn't */
export function activityRequestOf(state: ActivityCardState): ActivityRequest {
  switch (state.kind) {
    case 'loading':
      return { cursor: null };
    case 'loadingMore':
      return { cursor: nextCursorOf(state.pages) };
    default:
      return null;
  }
}

/** Whether an older page is there to load when the list's end comes into view */
export function hasOlderActivity(state: ActivityCardState): boolean {
  return state.kind === 'loaded' && nextCursorOf(state.pages) !== null;
}

/** What the card announces (S15): the first page's or an older page's loading, or nothing */
export function activityStatusOf(state: ActivityCardState, language: Language): string {
  const copy = ACTIVITY_COPY[language];
  switch (state.kind) {
    case 'loading':
      return copy.loading;
    case 'loadingMore':
      return copy.loadingMore;
    default:
      return '';
  }
}

/**
 * The status band of a published connection by its state (C1, S15): green "Your connection is
 * active", blue "Your connection is scheduled" (U94 7355:60677), grey "Connection deactivated".
 */
export function statusBandOf(
  state: FormConnection['state'],
  language: Language
): { tone: StatusBandTone; title: string; text: string } {
  const copy = CONNECTION_DETAIL_COPY[language];
  switch (state) {
    case 'live':
      return { tone: 'active', title: copy.activeTitle, text: copy.activeText };
    case 'scheduled':
      return { tone: 'scheduled', title: copy.scheduledTitle, text: copy.scheduledText };
    case 'deactivated':
      return { tone: 'deactivated', title: copy.deactivatedTitle, text: copy.deactivatedText };
  }
}

/**
 * The date pill's line by the connection's state (FR-015, FR-020, data-model §1.4; C1): "Active
 * since 23.10.2026, 14:32" while live, "Active from 01.12.2026, 00:00" while scheduled,
 * "Deactivated since 24.10.2026, 10:05" while deactivated, and a draft's "Edited 03.10.2026,
 * 14:32"; in the given language ("Aktiv seit", "Aktiv ab", "Deaktiviert seit", "Bearbeitet"). The
 * start date is a day in Germany sent as YYYY-MM-DD and written as it is, never through `Date`,
 * so that it reads the same for every team member. The pill is never empty (FR-021): a live
 * connection that was never recorded as activated reads its publication, a deactivated one
 * without its time its last change, and a scheduled one without its date "Edited <date>, <time>"
 */
export function datePillOf(connection: DatePillSource, language: Language): string {
  const copy = CONNECTION_DETAIL_COPY[language];
  switch (connection.state) {
    case 'live': {
      const since = connection.activated_at ?? connection.published_at;
      return since
        ? copy.activeSince(dateTimeOf(since, language))
        : editedLineOf(connection.updated_at, language);
    }
    case 'scheduled':
      return connection.start_date
        ? copy.activeFrom(`${formatDate(connection.start_date, language)}, ${START_TIME}`)
        : editedLineOf(connection.updated_at, language);
    case 'deactivated':
      return copy.deactivatedSince(
        dateTimeOf(connection.deactivated_at ?? connection.updated_at, language)
      );
    case 'draft':
      return editedLineOf(connection.updated_at, language);
  }
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

/**
 * What the details hand the overview after a deletion (spec 010, FR-033; S4 "After a deletion"):
 * the deleted connection's or draft's name for the toast "“<name>” deleted." and the deletion's
 * id for its "Undo"
 */
export function overviewStateAfterDeletion(
  name: string,
  deletion: Deletion
): OverviewLocationState {
  return { deleted: { names: [name], deletionId: deletion.id } };
}

/**
 * Whether a PDF run's fetched connection is the one the details show, field for field (spec
 * 011, T050; design-notes 8.2 D10). The page then keeps what it shows, so that the largest
 * connection's Summary doesn't render again for an unchanged answer (FR-003); a changed one
 * replaces it (FR-005). Both come from the same endpoint, so their keys are in the same order
 */
export function isShownConnection(
  shown: FormConnectionOrDraft | null,
  fetched: FormConnectionOrDraft
): boolean {
  return shown !== null && JSON.stringify(shown) === JSON.stringify(fetched);
}
