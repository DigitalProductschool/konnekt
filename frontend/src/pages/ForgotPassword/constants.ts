import { defineTexts } from '@konnekt/rules/language';

/** The forgot-password screen's copy (G§2 "forgot password", "administrator") */
export const FORGOT_PASSWORD_COPY = defineTexts(
  {
    pageTitle: 'Forgot password',
    title: 'Forgot your password?',
    text: 'Ask your admin to reset it. Then come back and log in.',
    backToLogin: 'Back to log in',
  },
  {
    pageTitle: 'Passwort vergessen',
    title: 'Passwort vergessen?',
    text: 'Wenden Sie sich bitte an Ihre Administratoren, um das Passwort zurückzusetzen, und versuchen Sie es erneut.',
    backToLogin: 'Zurück zur Anmeldung',
  }
);
