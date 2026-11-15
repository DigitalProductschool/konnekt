import type { EditorStep } from '@connection-portal/api-types/form-connections';
import { namesOf } from '@connection-portal/rules/checks/findingMessages';
import type { LiteralContext } from '@connection-portal/rules/checks/literals';
import type {
  BranchCheck,
  ChangeCause,
  ItemNames,
  RunAction,
  RunBranch,
  WorkerMessage,
} from '@connection-portal/rules/checks/types';
import type { Language } from '@connection-portal/rules/language';

import type { PdfDownloadAction, PdfDownloadState } from '../utils/connectionPdf/types';
import { sameContent } from '../utils/localDrafts/content';
import type { LocalDraftContent } from '../utils/localDrafts/types';
import type {
  CatalogByLanguage,
  CatalogCacheAction,
  CatalogCacheState,
  CatalogView,
  CheckableBranch,
  CheckedTreeModule,
  DocumentTypesAction,
  DocumentTypesState,
  FormConnectionAction,
  FormConnectionState,
  OptionSetsAction,
  OptionSetsState,
  SentChange,
} from './types';

// useDocumentTypes() and useOptionSets() (spec 009, research R6, V9): the catalog's lists cached
// per language

/** No list yet. Never changed, so that a memo on the list keeps its identity */
const NO_ITEMS: never[] = [];

/** The website's other language */
export function otherLanguageOf(language: Language): Language {
  return language === 'en' ? 'de' : 'en';
}

/** The state before the first answer: the current language's list is loading */
export function initialCatalogCacheState<T>(language: Language): CatalogCacheState<T> {
  return { language, status: 'loading', attempt: 0, loaded: {}, prefetchFailed: false };
}

/**
 * The cache of a catalog list. A switch shows the new language's list at once when it is cached
 * and loads it otherwise, except on the failed state, which it keeps (its retry loads the new
 * language); an answer is kept for its language whichever is current; a failure of the current
 * language's fetch fails it, which the hooks show only while no list has been on screen
 * (`catalogViewOf()`), and the other language's (the background fetch) is silent until the next
 * switch; a retry loads the current language's list again
 */
export function catalogCacheReducer<T>(
  state: CatalogCacheState<T>,
  action: CatalogCacheAction<T>
): CatalogCacheState<T> {
  switch (action.type) {
    case 'language':
      if (action.language === state.language) {
        return state;
      }
      return {
        ...state,
        language: action.language,
        status: state.loaded[action.language]
          ? 'loaded'
          : catalogViewOf(state).status === 'failed'
            ? 'failed'
            : 'loading',
        prefetchFailed: false,
      };
    case 'loaded':
      return {
        ...state,
        status: action.language === state.language ? 'loaded' : state.status,
        loaded: { ...state.loaded, [action.language]: action.items },
      };
    case 'failed':
      return action.language === state.language
        ? { ...state, status: 'failed' }
        : { ...state, prefetchFailed: true };
    case 'retry':
      return { ...state, status: 'loading', attempt: state.attempt + 1 };
  }
}

/**
 * The current language's list, or while it loads the other language's; empty before the first
 * answer and after a failure of the current language. The hooks hand on `catalogViewOf()`, which
 * also keeps the other language's list after that failure
 */
export function catalogListOf<T>(state: CatalogCacheState<T>): T[] {
  const current = state.loaded[state.language];
  if (current) {
    return current;
  }
  return state.status === 'loading'
    ? (state.loaded[otherLanguageOf(state.language)] ?? NO_ITEMS)
    : NO_ITEMS;
}

/**
 * What the hooks report (spec 009, FR-003, Edge Cases "a text already shown keeps until
 * replaced"): once a list has been on screen, `'loaded'` in every timing of a switch, with the
 * current language's list when it is there and the other language's until then. A failed fetch of
 * the current language is then silent: the other language's labels stay until the next switch
 * fetches it again. Before any list, the current language's fetch: loading, loaded or failed with
 * its retry, as before the feature
 */
export function catalogViewOf<T>(state: CatalogCacheState<T>): CatalogView<T> {
  const shown = state.loaded[state.language] ?? state.loaded[otherLanguageOf(state.language)];
  return shown ? { status: 'loaded', items: shown } : { status: state.status, items: NO_ITEMS };
}

/**
 * The language to fetch in the background: the other one, once the current language's list is
 * there, unless it is cached or its fetch failed since the last switch; null otherwise
 */
export function prefetchLanguageOf<T>(state: CatalogCacheState<T>): Language | null {
  const other = otherLanguageOf(state.language);
  return state.status === 'loaded' && !state.prefetchFailed && state.loaded[other] === undefined
    ? other
    : null;
}

/** The language whose list to fetch now, the current one while it loads; null otherwise */
export function fetchLanguageOf<T>(state: CatalogCacheState<T>): Language | null {
  return state.status === 'loading' ? state.language : null;
}

export const documentTypesReducer: (
  state: DocumentTypesState,
  action: DocumentTypesAction
) => DocumentTypesState = catalogCacheReducer;

export const optionSetsReducer: (
  state: OptionSetsState,
  action: OptionSetsAction
) => OptionSetsState = catalogCacheReducer;

export const INITIAL_FORM_CONNECTION_STATE: FormConnectionState = { status: 'loading', attempt: 0 };

/**
 * The `loaded` state holds a published connection or a draft, as the API answered it. A failed
 * refetch for the language alone (`refresh`) keeps it (spec 009, research R6)
 */
export function formConnectionReducer(
  state: FormConnectionState,
  action: FormConnectionAction
): FormConnectionState {
  switch (action.type) {
    case 'loaded':
      return { status: 'loaded', attempt: state.attempt, formConnection: action.formConnection };
    case 'notFound':
      return action.refresh && state.status === 'loaded'
        ? state
        : { status: 'notFound', attempt: state.attempt };
    case 'failed':
      return action.refresh && state.status === 'loaded'
        ? state
        : { status: 'failed', attempt: state.attempt, notice: action.notice };
    case 'retry':
      return { status: 'loading', attempt: state.attempt + 1 };
  }
}

// useConnectionPdf() (specs/011-connection-pdf, data-model section 6, research R13): what it
// decides without React

export const INITIAL_PDF_DOWNLOAD_STATE: PdfDownloadState = { status: 'idle', announcement: null };

/** Whether the download is busy: its fetch or its worker runs (FR-003) */
function isBusy(
  state: PdfDownloadState
): state is Extract<PdfDownloadState, { status: 'fetching' | 'rendering' }> {
  return state.status === 'fetching' || state.status === 'rendering';
}

/**
 * The download's state (data-model section 6): `start` leaves idle or failed for fetching and
 * does nothing while busy (FR-003, one file per activation); `fetched` moves the current run to
 * rendering; `gone` and `signedOut` end its fetch in idle, `rendered` its rendering with "PDF
 * saved.", and `failed` either with its notice. An action of another run than the current one,
 * or one that doesn't fit the current step, changes nothing
 */
export function pdfDownloadReducer(
  state: PdfDownloadState,
  action: PdfDownloadAction
): PdfDownloadState {
  if (action.type === 'start') {
    return isBusy(state)
      ? state
      : { status: 'fetching', runId: action.runId, announcement: 'creating' };
  }
  if (!isBusy(state) || state.runId !== action.runId) {
    return state;
  }
  switch (action.type) {
    case 'fetched':
      return state.status === 'fetching'
        ? { status: 'rendering', runId: action.runId, announcement: 'creating' }
        : state;
    case 'gone':
    case 'signedOut':
      return state.status === 'fetching' ? { status: 'idle', announcement: null } : state;
    case 'rendered':
      return state.status === 'rendering' ? { status: 'idle', announcement: 'saved' } : state;
    case 'failed':
      return { status: 'failed', notice: action.notice, announcement: null };
  }
}

/**
 * The first of `caches` that holds the list in `language`, or null when none does (the run then
 * fetches it): the list of exactly that language, never the other one's
 */
export function cachedListOf<T>(
  language: Language,
  ...caches: (CatalogByLanguage<T> | undefined)[]
): T[] | null {
  for (const cache of caches) {
    const list = cache?.[language];
    if (list) {
      return list;
    }
  }
  return null;
}

// useRuleChecks() (specs/003-rule-consistency-checks, research R10): what it does without React

/**
 * Every branch as a change hands it to the run state, in tab order: its key and current name, its
 * current names (`namesOf()`) and its checked tree, built on the main thread with today in Germany
 */
export function runBranchesOf(
  branches: readonly CheckableBranch[],
  context: LiteralContext,
  today: string,
  checkedTree: CheckedTreeModule
): RunBranch[] {
  return branches.map((branch) => ({
    branch: { key: branch.key, name: branch.name },
    names: namesOf(branch.items),
    checked: checkedTree.buildCheckedBranch(branch, context, today),
  }));
}

function sameNames(first: ItemNames, second: ItemNames): boolean {
  if (first.size !== second.size) {
    return false;
  }
  const others = [...second];
  return [...first].every(
    ([id, name], index) => others[index][0] === id && others[index][1] === name
  );
}

/**
 * Whether a change gives the run state nothing new: the same language (spec 009: a switch is
 * handed on, so that the announcements of a run in flight follow it; it starts no run, as the
 * fingerprints are the same) and the same branches (`sameRunBranches()`)
 */
export function sameChange(sent: SentChange, next: SentChange): boolean {
  return sent.language === next.language && sameRunBranches(sent.branches, next.branches);
}

/**
 * Whether two lists of branches give the run state nothing new: the same keys in the same order,
 * with the same names, item names and fingerprints. A rename is new, as the notes and the
 * announcements name items by their current names; it starts no run (FR-011)
 */
export function sameRunBranches(
  first: readonly RunBranch[],
  second: readonly RunBranch[]
): boolean {
  return (
    first.length === second.length &&
    first.every((entry, index) => {
      const other = second[index];
      return (
        entry.branch.key === other.branch.key &&
        entry.branch.name === other.branch.name &&
        entry.checked.fingerprint === other.checked.fingerprint &&
        sameNames(entry.names, other.names)
      );
    })
  );
}

/**
 * The cause of a change: `'new_day'` when the day in Germany is another than at the last change,
 * which reruns every branch and announces nothing (FR-015), `'action'` otherwise
 */
export function causeOf(previousToday: string | null, today: string): ChangeCause {
  return previousToday !== null && previousToday !== today ? 'new_day' : 'action';
}

/** The run state's action for a message of the worker */
export function actionOf(message: WorkerMessage): RunAction {
  return message.type === 'result'
    ? { type: 'result', runId: message.runId, check: message.check }
    : { type: 'done', runId: message.runId };
}

/**
 * `RuleChecks.byBranch` for the current branches: the run state's result per key, and null for a
 * branch it doesn't know yet, such as every branch before the first change or one just added
 */
export function byBranchFor(
  branches: readonly CheckableBranch[],
  byBranch: Readonly<Record<string, BranchCheck | null>>
): Record<string, BranchCheck | null> {
  return Object.fromEntries(branches.map(({ key }) => [key, byBranch[key] ?? null]));
}

// useLocalDraft() (specs/005-connection-drafts, contracts/local-drafts.md "useLocalDraft";
// research R9): what it decides without React

/** What a flow's autosave compares: its content and its step */
export interface LocalDraftSnapshot {
  content: LocalDraftContent;
  step: EditorStep;
}

/**
 * Whether the flow changed between two renders: its content, structurally, since the memoised
 * content may get a new identity without a real change, or its step, which the record carries so
 * that a resume reopens there
 */
export function isLocalDraftChange(
  previous: LocalDraftSnapshot,
  next: LocalDraftSnapshot
): boolean {
  return previous.step !== next.step || !sameContent(previous.content, next.content);
}

/**
 * What a change does to the flow's record: `'remove'` when it brings the content back to the
 * baseline, what is already safe elsewhere, and `'write'` otherwise. Without a baseline every
 * change writes, and only `forget()` removes the record (data-model.md, section 6)
 */
export function localDraftActionOf(
  content: LocalDraftContent,
  baseline: LocalDraftContent | null
): 'write' | 'remove' {
  return baseline !== null && sameContent(content, baseline) ? 'remove' : 'write';
}

/**
 * How long a write waits, in milliseconds: 0 for the flow's first write and once `interval` has
 * passed since the last one, and otherwise the rest of the interval (trailing throttle)
 */
export function writeDelayOf(lastWriteAt: number | null, now: number, interval: number): number {
  return lastWriteAt === null ? 0 : Math.max(0, lastWriteAt + interval - now);
}
