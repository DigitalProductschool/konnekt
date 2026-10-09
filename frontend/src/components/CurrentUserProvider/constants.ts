import type { CurrentUserState } from './types';

// Until GET /api/auth/me answers, the app doesn't know whether a session exists
export const INITIAL_STATE: CurrentUserState = { status: 'loading', user: null, loggedOut: false };
