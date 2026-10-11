import type { LoginRequest, UserView } from '../types/auth';
import type { DocumentType } from '../types/document-types';

export interface DocumentTypesState {
  status: 'loading' | 'loaded' | 'failed';
  /** Counts the loads; a retry starts the next one */
  attempt: number;
  documentTypes: DocumentType[];
}

export type DocumentTypesAction =
  { type: 'loaded'; documentTypes: DocumentType[] } | { type: 'failed' } | { type: 'retry' };

export type SignInStatus = 'loading' | 'signedIn' | 'signedOut';

export interface CurrentUserContextValue {
  status: SignInStatus;
  user: UserView | null;
  /** Sign in, or throw the API's error. */
  signIn: (credentials: LoginRequest) => Promise<void>;
  /** Log out; the app is signed out afterwards even if the call failed. */
  signOut: () => Promise<void>;
}
