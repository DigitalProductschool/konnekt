import { useCallback } from 'react';

import { ApiError } from '../api/client';
import { useCurrentUser } from './useCurrentUser';

/**
 * Returns a check for failed API calls: a 401 means the session has expired, so the app
 * signs out, and the route guard asks for a sign-in that returns to the same page. The
 * check answers whether it handled the error.
 */
export function useSignOutOnUnauthorized(): (error: unknown) => boolean {
  const { signOut } = useCurrentUser();
  return useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        void signOut();
        return true;
      }
      return false;
    },
    [signOut]
  );
}
