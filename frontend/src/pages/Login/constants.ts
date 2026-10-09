import scheduleIcon from '../../assets/icons/schedule.svg';
import taskAltIcon from '../../assets/icons/task-alt.svg';
import verifiedUserIcon from '../../assets/icons/verified-user.svg';
import type { Benefit, LoginFormState } from './types';

export const LOGIN_COPY = {
  pageTitle: 'Log in',
  headline: 'Connect your forms to the EUDI Wallet',
  lead: 'Applicants share verified data from their wallet instead of uploading documents.',
  cardTitle: 'Log in',
  cardSubtitle: 'Use your work account.',
  username: 'Username',
  password: 'Password',
  showPassword: 'Show password',
  // Shown on two lines, one sentence each
  forgotPassword: 'Forgot your password?',
  forgotPasswordHelp: 'Ask an administrator to reset it.',
  submit: 'Log in',
  secureNote: 'Your sign-in is encrypted',
  invalidCredentials: 'Invalid username or password',
  signInFailed: 'Signing in failed. Try again in a moment.',
  loggedOutTitle: 'You’re logged out',
  loggedOutText: 'Log in again to continue setting up your forms.',
};

export const BENEFITS: Benefit[] = [
  { icon: verifiedUserIcon, title: 'Verified data, no uploads' },
  { icon: taskAltIcon, title: 'Only the data each form needs' },
  { icon: scheduleIcon, title: 'Live in minutes' },
];

export const INITIAL_LOGIN_FORM: LoginFormState = {
  username: '',
  password: '',
  showPassword: false,
  submitting: false,
  error: null,
  failedAttempts: 0,
};
