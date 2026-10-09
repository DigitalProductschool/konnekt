import { ApiError } from '../../api/client';
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
