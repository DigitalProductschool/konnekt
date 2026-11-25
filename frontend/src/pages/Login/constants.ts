import { defineTexts } from '@konnekt/rules/language';

import type { LoginFormState } from './types';

/** The sign-in screen's copy (G§2 "sign in / sign out / log in", "forgot password") */
export const LOGIN_COPY = defineTexts(
  {
    pageTitle: 'Log in',
    cardTitle: 'Log in',
    username: 'Username',
    password: 'Password',
    showPassword: 'Show password',
    forgotPassword: 'Forgot password?',
    submit: 'Log in',
    // While the request runs (W2, FR-008): the design draws no busy state
    submitting: 'Logging in…',
    secureNote: 'Your login is encrypted',
    /*
     * The server's 401 message (C5, FR-023a: "Username or password is wrong. Check both and try
     * again."), split as the design's alert writes it: the first sentence bold (U10 6401:28435)
     */
    invalidCredentialsTitle: 'Username or password is wrong.',
    invalidCredentialsText: 'Check both and try again.',
    // Any other failure: the title, and the server's message with its error ID or this text
    signInFailedTitle: 'Logging in failed.',
    signInFailedText: 'Try again in a moment.',
    // The toast after "Log out" (FR-051 (30), U10 7128:74220)
    loggedOut: 'You’re logged out.',
  },
  {
    pageTitle: 'Anmelden',
    cardTitle: 'Anmelden',
    username: 'Benutzername',
    password: 'Passwort',
    showPassword: 'Passwort anzeigen',
    forgotPassword: 'Passwort vergessen?',
    submit: 'Anmelden',
    submitting: 'Anmeldung läuft …',
    secureNote: 'Ihre Anmeldung ist verschlüsselt',
    // The server's German 401 message (`backend/app/routers/auth.py`), split the same way
    invalidCredentialsTitle: 'Benutzername oder Passwort ist falsch.',
    invalidCredentialsText: 'Überprüfen Sie beides und versuchen Sie es erneut.',
    signInFailedTitle: 'Die Anmeldung ist fehlgeschlagen.',
    signInFailedText: 'Versuchen Sie es in einem Moment erneut.',
    loggedOut: 'Sie sind abgemeldet.',
  }
);

export const INITIAL_LOGIN_FORM: LoginFormState = {
  username: '',
  password: '',
  showPassword: false,
  submitting: false,
  failure: null,
  failedAttempts: 0,
};
