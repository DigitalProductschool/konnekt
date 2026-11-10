import { defineTexts } from '@connection-portal/rules/language';

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
    text: 'Bitten Sie Ihre Administratorin oder Ihren Administrator, es zurückzusetzen. Kommen Sie danach zurück und melden Sie sich an.',
    backToLogin: 'Zurück zur Anmeldung',
  }
);
