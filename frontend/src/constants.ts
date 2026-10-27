// The middleware's temporary name, as in the Figma design (2026-10-13)
export const APP_NAME = 'Connection Portal';

export const ROUTES = {
  login: '/login',
  forgotPassword: '/forgot-password',
  overview: '/',
  // Where a sign-in without a requested route lands: the wizard until a connection exists
  firstConnection: '/get-started',
  newFormConnection: '/form-connections/new',
  formConnection: '/form-connections/:id',
  editFormConnection: '/form-connections/:id/edit',
} as const;

// The create wizard's steps (Figma "App/Progress"; the Rules step's label from U11 6348:40212).
// The details screen shows them all done
export const CONNECTION_STEPS = ['Connection', 'Documents', 'Rules', 'Publish'] as const;

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
