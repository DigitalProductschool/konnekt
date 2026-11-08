import type { ConsentState } from './types';

// The consent page's copy (contracts/ui-screens.md S1)
export const CONSENT_COPY = {
  pageTitle: 'Allow access',
  /** The heading before the client is known, or when the request isn't valid */
  fallbackTitle: 'Allow access',
  title: (clientName: string) => `Allow access for ${clientName}?`,
  intro: (clientName: string) =>
    `${clientName} wants to act on your behalf in the Connection Portal. Choose what it may do.`,
  levelLegend: 'Access level',
  stepUp: (clientName: string) => `${clientName} is asking for more access than it has.`,
  allow: 'Allow',
  deny: 'Deny',
  goBack: (clientName: string) => `You can go back to ${clientName}.`,
  signedInAs: (username: string) => `Signed in as ${username}.`,
  changeLater: 'You can change or revoke this access later on your',
  userPage: 'user page',
  loading: 'Loading the request…',
  invalidTitle: 'This sign-in request isn’t valid. Start again from your agent.',
  missing: (names: string[]) => `The request is missing ${names.join(', ')}.`,
  responseType: 'The request must ask for an authorization code (response_type=code).',
  loadErrorTitle: 'Couldn’t load this request',
  loadFailed: 'Check your connection and reload the page.',
  sendFailed: 'Couldn’t send your answer. Check your connection and try again.',
};

/** The query parameters the request must carry; `scope` may be absent */
export const REQUIRED_PARAMETERS = [
  'response_type',
  'client_id',
  'redirect_uri',
  'code_challenge',
  'code_challenge_method',
  'state',
  'resource',
] as const;

export const INITIAL_CONSENT_STATE: ConsentState = { status: 'loading' };
