import type { UserView } from '@konnekt/api-types/auth';
import type { ReactNode } from 'react';

import type { SignInStatus } from '../../hooks/types';

export interface CurrentUserProviderProps {
  children: ReactNode;
}

export interface CurrentUserState {
  status: SignInStatus;
  user: UserView | null;
}

export type CurrentUserAction = { type: 'signedIn'; user: UserView } | { type: 'signedOut' };
