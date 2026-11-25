import type { ErrorNotice } from '@konnekt/api-types/api';
import type { Language } from '@konnekt/rules/language';
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
 * server's message and, after a 5xx, its error ID. The 401's alert is the server's message, so
 * it keeps the attempt's `language` until the next attempt, as the notice keeps the server's
 * text (spec 009, the spec's edge case "A notice from the server", quickstart V1 step 2)
 */
export type SignInFailure =
  { kind: 'credentials'; language: Language } | { kind: 'failed'; notice: ErrorNotice };

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
