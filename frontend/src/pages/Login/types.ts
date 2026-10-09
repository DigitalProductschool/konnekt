import type { ChangeEvent } from 'react';

export interface Benefit {
  icon: string;
  title: string;
}

export interface BenefitItemProps {
  benefit: Benefit;
}

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleVisible: () => void;
}

export interface LoginFormState {
  username: string;
  password: string;
  showPassword: boolean;
  submitting: boolean;
  error: string | null;
  /** Counts failures, so that the same message is announced again */
  failedAttempts: number;
}

export type LoginFormAction =
  | { type: 'changeUsername'; value: string }
  | { type: 'changePassword'; value: string }
  | { type: 'toggleShowPassword' }
  | { type: 'submit' }
  | { type: 'fail'; message: string };
