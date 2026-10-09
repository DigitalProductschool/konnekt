import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { getMe, login, logout } from '../../api/auth';
import { CurrentUserContext } from '../../hooks/useCurrentUser';
import type { LoginRequest } from '../../types/auth';
import { INITIAL_STATE } from './constants';
import type { CurrentUserProviderProps } from './types';
import { currentUserReducer } from './utils';

/** Holds the sign-in state: asks the backend once who is signed in. */
export default function CurrentUserProvider({ children }: CurrentUserProviderProps) {
  const [state, dispatch] = useReducer(currentUserReducer, INITIAL_STATE);

  useEffect(() => {
    let ignore = false;
    // A 401 means no session; any other failure leaves the app signed out as well
    getMe()
      .then((user) => {
        if (!ignore) dispatch({ type: 'signedIn', user });
      })
      .catch(() => {
        if (!ignore) dispatch({ type: 'signedOut' });
      });
    return () => {
      ignore = true;
    };
  }, []);

  const signIn = useCallback(async (credentials: LoginRequest) => {
    const user = await login(credentials);
    dispatch({ type: 'signedIn', user });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // An expired session is gone anyway; the app signs out regardless
    }
    // The route guard then sends the user to the sign-in screen
    dispatch({ type: 'signedOut' });
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
