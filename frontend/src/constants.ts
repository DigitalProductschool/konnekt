import { defineTexts } from '@connection-portal/rules/language';

// The product's name, in every screen and tab title (KERN Revamp design; spec 008, FR-019)
export const APP_NAME = 'Konnekt';

export const ROUTES = {
  login: '/login',
  forgotPassword: '/forgot-password',
  overview: '/',
  // The first connection's wizard, opened by the welcome page's "Create connection" (T042)
  firstConnection: '/get-started',
  newFormConnection: '/form-connections/new',
  formConnection: '/form-connections/:id',
  editFormConnection: '/form-connections/:id/edit',
  // Spec 007: the OAuth consent page, the user page and an approval request
  authorize: '/authorize',
  account: '/account',
  approval: '/approvals/:id',
} as const;

// The wizard's four steps ("Step n of 4"; spec 008, FR-025, Q7), by their keys, in order: the
// editor's `step` values and the React keys of the step line (spec 009, R10). Publish is a dialog
// opened from the test step, not a step. The details screen shows them all done
export const CONNECTION_STEPS = ['connection', 'documents', 'rules', 'test'] as const;

export type ConnectionStepKey = (typeof CONNECTION_STEPS)[number];

// The steps' names in each language (glossary G§2 "wizard steps")
export const CONNECTION_STEP_LABELS = defineTexts<Record<ConnectionStepKey, string>>(
  { connection: 'Connection', documents: 'Documents', rules: 'Rules', test: 'Test' },
  { connection: 'Anbindung', documents: 'Dokumente', rules: 'Regeln', test: 'Test' }
);

// The KERN React kit's built-in texts in each language (spec 009, R1): the English column is the
// UI's English, the German one follows the glossary (G§2 "optional", "loading", "close", "the
// kit's field texts")
export const KERN_TRANSLATIONS = defineTexts(
  {
    optional: 'Optional',
    pleaseCheckYourInput: 'Please check your input.',
    day: 'Day',
    month: 'Month',
    year: 'Year',
    loading: 'Loading…',
    closeDialog: 'Close',
  },
  {
    optional: 'optional',
    pleaseCheckYourInput: 'Bitte überprüfen Sie Ihre Eingabe.',
    day: 'Tag',
    month: 'Monat',
    year: 'Jahr',
    loading: 'Wird geladen …',
    closeDialog: 'Schließen',
  }
);

/**
 * How long a status region that has just appeared stays empty before it shows its text, so that
 * screen readers know the region before its text changes and announce it (as live-region
 * libraries do, about 100 ms)
 */
export const LIVE_REGION_DELAY_MS = 100;
