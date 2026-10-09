import type { ReactNode } from 'react';

import type { SignInStatus } from '../../hooks/types';
import type { UserView } from '../../types/auth';

export interface CurrentUserProviderProps {
  children: ReactNode;
}

export interface CurrentUserState {
  status: SignInStatus;
  user: UserView | null;
  loggedOut: boolean;
}

export type CurrentUserAction =
  { type: 'signedIn'; user: UserView } | { type: 'signedOut' } | { type: 'loggedOut' };
