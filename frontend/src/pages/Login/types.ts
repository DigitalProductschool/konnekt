import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { ChangeEvent } from 'react';

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  /** Marks the field invalid after a wrong username or password (F16) */
  invalid: boolean;
  /** The id of the alert that says why, while the field is invalid */
  describedBy?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleVisible: () => void;
}

/**
 * Why the last sign-in failed: a wrong username or password (401), or anything else, with the
 * server's message and, after a 5xx, its error ID
 */
export type SignInFailure = { kind: 'credentials' } | { kind: 'failed'; notice: ErrorNotice };

export interface LoginFormState {
  username: string;
  password: string;
  showPassword: boolean;
  submitting: boolean;
  failure: SignInFailure | null;
  /** Counts failures, so that the same message is announced again */
  failedAttempts: number;
}

export type LoginFormAction =
  | { type: 'changeUsername'; value: string }
  | { type: 'changePassword'; value: string }
  | { type: 'toggleShowPassword' }
  | { type: 'submit' }
  | { type: 'fail'; failure: SignInFailure };

export interface SignInAlertProps {
  id: string;
  failure: SignInFailure;
}
