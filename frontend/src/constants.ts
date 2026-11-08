// The product's name, in every screen and tab title (KERN Revamp design; spec 008, FR-019)
export const APP_NAME = 'Konnekt';

export const ROUTES = {
  login: '/login',
  forgotPassword: '/forgot-password',
  overview: '/',
  // Where a sign-in without a requested route lands: the wizard until a connection exists
  firstConnection: '/get-started',
  newFormConnection: '/form-connections/new',
  formConnection: '/form-connections/:id',
  editFormConnection: '/form-connections/:id/edit',
  // Spec 007: the OAuth consent page, the user page and an approval request
  authorize: '/authorize',
  account: '/account',
  approval: '/approvals/:id',
} as const;

// The wizard's four steps ("Step n of 4"; spec 008, FR-025, Q7). Publish is a dialog opened from
// the test step, not a step. The details screen shows them all done
export const CONNECTION_STEPS = ['Connection', 'Documents', 'Rules', 'Test'] as const;

// The KERN React kit's built-in texts, in the UI's language (its defaults are German)
export const KERN_TRANSLATIONS = {
  optional: 'Optional',
  pleaseCheckYourInput: 'Please check your input.',
  day: 'Day',
  month: 'Month',
  year: 'Year',
  loading: 'Loading…',
  closeDialog: 'Close',
};

/**
 * How long a status region that has just appeared stays empty before it shows its text, so that
 * screen readers know the region before its text changes and announce it (as live-region
 * libraries do, about 100 ms)
 */
export const LIVE_REGION_DELAY_MS = 100;
