import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { LoginRequest, UserView } from '@connection-portal/api-types/auth';
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type { FormConnectionOrDraft } from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import type { buildCheckedBranch, KeyedBranch } from '@connection-portal/rules/checks/checkedTree';
import type { RunBranch } from '@connection-portal/rules/checks/types';
import type { Language } from '@connection-portal/rules/language';

/** Whether a list of the catalog, in the website's language, is there (spec 009, research R6) */
export type CatalogStatus = 'loading' | 'loaded' | 'failed';

/**
 * A list of the catalog that the server answers in the request's language (GET
 * /api/document-types, GET /api/option-sets), cached per language (spec 009, research R6, V9):
 * the current language's list is fetched first, then the other language's in the background, so
 * that a switch shows the other language's labels at once. What the hooks report is
 * `catalogViewOf()`'s
 */
export interface CatalogCacheState<T> {
  /** The website's language the state follows: its list is the one shown once it is there */
  language: Language;
  /** The current language's fetch: `'loaded'` once its answer is there */
  status: CatalogStatus;
  /** Counts the loads; a retry starts the next one */
  attempt: number;
  /** The answers so far, per language */
  loaded: Partial<Record<Language, T[]>>;
  /**
   * The other language's background fetch failed since the last switch: it isn't tried again
   * until the next switch, which fetches the language it lacks first
   */
  prefetchFailed: boolean;
}

/**
 * What a catalog hook reports (spec 009, FR-003): `'loaded'` with a list once one has been on
 * screen, whichever language it is in, so that a switch never replaces the screen with a loader
 * or a failed state; before that, the current language's fetch
 */
export interface CatalogView<T> {
  status: CatalogStatus;
  items: T[];
}

export type CatalogCacheAction<T> =
  | { type: 'language'; language: Language }
  | { type: 'loaded'; language: Language; items: T[] }
  | { type: 'failed'; language: Language }
  | { type: 'retry' };

export type DocumentTypesState = CatalogCacheState<DocumentType>;

export type DocumentTypesAction = CatalogCacheAction<DocumentType>;

export type OptionSetsState = CatalogCacheState<OptionSet>;

export type OptionSetsAction = CatalogCacheAction<OptionSet>;

export type SignInStatus = 'loading' | 'signedIn' | 'signedOut';

export interface CurrentUserContextValue {
  status: SignInStatus;
  user: UserView | null;
  /** Sign in, or throw the API's error. */
  signIn: (credentials: LoginRequest) => Promise<void>;
  /** Log out; the app is signed out afterwards even if the call failed. */
  signOut: () => Promise<void>;
}

/** One form connection or draft from GET /api/form-connections/:id, as a page loads it */
export type FormConnectionState =
  | { status: 'loading'; attempt: number }
  | { status: 'notFound'; attempt: number }
  | {
      status: 'failed';
      attempt: number;
      /** What the server answered, with a 5xx answer's error ID (W2); null when it didn't answer */
      notice: ErrorNotice | null;
    }
  | { status: 'loaded'; attempt: number; formConnection: FormConnectionOrDraft };

/**
 * `refresh`: the answer of a refetch for the language alone (spec 009, research R6), whose failure
 * keeps a loaded connection on screen; the next request tells what has become of it
 */
export type FormConnectionAction =
  | { type: 'loaded'; formConnection: FormConnectionOrDraft }
  | { type: 'notFound'; refresh?: boolean }
  | { type: 'failed'; notice: ErrorNotice | null; refresh?: boolean }
  | { type: 'retry' };

// useRuleChecks() (specs/003-rule-consistency-checks, contracts/rule-checks.md "useRuleChecks")

/**
 * A branch as `useRuleChecks()` reads it: its key, name and what the checks read. The rules step's
 * `RulesBranch` is one
 */
export interface CheckableBranch extends KeyedBranch {
  /** Its current name: "Standard" until the main branch is renamed */
  name: string;
}

/**
 * The part of `checks/checkedTree.ts` the hook uses, once its dynamic `import()` has loaded it.
 * Only its type is imported statically, so the module and the case-folding table it reaches stay
 * out of the main bundle
 */
export interface CheckedTreeModule {
  buildCheckedBranch: typeof buildCheckedBranch;
}

/** The branches the hook last handed to the run state, which an equal change doesn't repeat */
export interface SentChange {
  branches: RunBranch[];
  /** `YYYY-MM-DD`, today in Germany when they were built */
  today: string;
  /** The website's language at the change, which the announcements are composed in (spec 009) */
  language: Language;
}

/** The worker of the current run, one at a time, with its watchdog */
export interface ActiveRun {
  runId: number;
  /** Null when the worker couldn't be created */
  worker: Worker | null;
  /** The watchdog's timer, or null without a worker */
  watchdog: number | null;
}

// useRememberedHomepage() (spec 008, research R6, FR-027)

/** What the homepage "/" shows: the welcome page or the overview "Your connections" */
export type Homepage = 'welcome' | 'overview';

/** The homepage memory of the signed-in account on this device */
export interface RememberedHomepage {
  /**
   * Whether the account had connections or drafts when its list last loaded on this device; null
   * when nothing is remembered (first visit, signed out, blocked storage)
   */
  remembered: boolean | null;
}
