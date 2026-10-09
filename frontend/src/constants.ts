// As in the Figma design, which doesn't name the product yet
export const APP_NAME = 'Product name';

export const ROUTES = {
  login: '/login',
  forgotPassword: '/forgot-password',
  overview: '/',
  newFormConnection: '/form-connections/new',
  formConnection: '/form-connections/:id',
  editFormConnection: '/form-connections/:id/edit',
} as const;

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
