import { ApiError } from '../../api/client';
import { ROUTES } from '../../constants';
import { LOGIN_COPY } from './constants';
import type { LoginFormAction, LoginFormState } from './types';

export function loginFormReducer(state: LoginFormState, action: LoginFormAction): LoginFormState {
  switch (action.type) {
    case 'changeUsername':
      return { ...state, username: action.value };
    case 'changePassword':
      return { ...state, password: action.value };
    case 'toggleShowPassword':
      return { ...state, showPassword: !state.showPassword };
    case 'submit':
      return { ...state, submitting: true };
    case 'fail':
      return {
        ...state,
        submitting: false,
        error: action.message,
        failedAttempts: state.failedAttempts + 1,
      };
  }
}

/** The message for a failed sign-in; it never says which of the two inputs was wrong. */
export function signInErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return LOGIN_COPY.invalidCredentials;
  }
  return LOGIN_COPY.signInFailed;
}

/** Where to go after signing in: the route that sent the user here, or the overview. */
export function redirectTarget(locationState: unknown): string {
  if (typeof locationState !== 'object' || locationState === null) {
    return ROUTES.overview;
  }
  const { from } = locationState as { from?: Partial<Record<string, unknown>> };
  if (typeof from?.pathname !== 'string' || from.pathname === ROUTES.login) {
    return ROUTES.overview;
  }
  const search = typeof from.search === 'string' ? from.search : '';
  const hash = typeof from.hash === 'string' ? from.hash : '';
  return `${from.pathname}${search}${hash}`;
}
