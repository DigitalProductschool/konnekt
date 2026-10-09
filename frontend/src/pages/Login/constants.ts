import type { LoginFormState } from './types';

export const LOGIN_COPY = {
  pageTitle: 'Log in',
  cardTitle: 'Log in',
  username: 'Username',
  password: 'Password',
  showPassword: 'Show password',
  forgotPassword: 'Forgot password?',
  submit: 'Log in',
  secureNote: 'Your sign-in is encrypted',
  invalidCredentials: 'Invalid username or password',
  signInFailed: 'Signing in failed. Try again in a moment.',
};

export const INITIAL_LOGIN_FORM: LoginFormState = {
  username: '',
  password: '',
  showPassword: false,
  submitting: false,
  error: null,
  failedAttempts: 0,
};
