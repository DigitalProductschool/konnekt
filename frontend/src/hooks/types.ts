import type { LoginRequest, UserView } from '../types/auth';

export type SignInStatus = 'loading' | 'signedIn' | 'signedOut';

export interface CurrentUserContextValue {
  status: SignInStatus;
  user: UserView | null;
  /** Sign in, or throw the API's error. */
  signIn: (credentials: LoginRequest) => Promise<void>;
  /** Log out; the app is signed out afterwards even if the call failed. */
  signOut: () => Promise<void>;
}
