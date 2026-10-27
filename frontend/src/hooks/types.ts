import type { LoginRequest, UserView } from '../types/auth';
import type { DocumentType } from '../types/document-types';
import type { FormConnection } from '../types/form-connections';
import type { OptionSet } from '../types/option-sets';

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

/** One form connection from GET /api/form-connections/:id, as a page loads it */
export type FormConnectionState =
  | { status: 'loading'; attempt: number }
  | { status: 'notFound'; attempt: number }
  | { status: 'failed'; attempt: number }
  | { status: 'loaded'; attempt: number; formConnection: FormConnection };

export type FormConnectionAction =
  | { type: 'loaded'; formConnection: FormConnection }
  | { type: 'notFound' }
  | { type: 'failed' }
  | { type: 'retry' };
