import { ApiError, errorNoticeOf } from '../../api/client';
import { LOGIN_COPY } from './constants';
import type { LoginFormAction, LoginFormState, SignInFailure } from './types';

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
        failure: action.failure,
        failedAttempts: state.failedAttempts + 1,
      };
  }
}

/**
 * Why signing in failed: a 401 is a wrong username or password, never saying which of the two;
 * anything else keeps the server's message and its error ID (FR-008)
 */
export function signInFailureOf(error: unknown): SignInFailure {
  if (error instanceof ApiError && error.status === 401) {
    return { kind: 'credentials' };
  }
  return { kind: 'failed', notice: errorNoticeOf(error, LOGIN_COPY.signInFailedText) };
}
