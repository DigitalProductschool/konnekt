import { createContext, useContext } from 'react';

import type { CurrentUserContextValue } from './types';

export const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

/** The signed-in user and the sign-in actions, from the CurrentUserProvider above. */
export function useCurrentUser(): CurrentUserContextValue {
  const value = useContext(CurrentUserContext);
  if (value === null) {
    throw new Error('useCurrentUser needs a CurrentUserProvider');
  }
  return value;
}
