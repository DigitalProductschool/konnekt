import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { LoginRequest, UserView } from '@connection-portal/api-types/auth';
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type { FormConnectionOrDraft } from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import type { buildCheckedBranch, KeyedBranch } from '@connection-portal/rules/checks/checkedTree';
import type { RunBranch } from '@connection-portal/rules/checks/types';

export interface DocumentTypesState {
  status: 'loading' | 'loaded' | 'failed';
  /** Counts the loads; a retry starts the next one */
  attempt: number;
  documentTypes: DocumentType[];
}

export type DocumentTypesAction =
  { type: 'loaded'; documentTypes: DocumentType[] } | { type: 'failed' } | { type: 'retry' };

export interface OptionSetsState {
  status: 'loading' | 'loaded' | 'failed';
  /** Counts the loads; a retry starts the next one */
  attempt: number;
  optionSets: OptionSet[];
}

export type OptionSetsAction =
  { type: 'loaded'; optionSets: OptionSet[] } | { type: 'failed' } | { type: 'retry' };

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

export type FormConnectionAction =
  | { type: 'loaded'; formConnection: FormConnectionOrDraft }
  | { type: 'notFound' }
  | { type: 'failed'; notice: ErrorNotice | null }
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
