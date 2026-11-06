import type { AccountState, CopyStatus, TokenForm } from './types';

// The user page's copy (specs/007-agent-mcp-server/contracts/ui-screens.md S2)
export const ACCOUNT_COPY = {
  title: 'Your account',
  signedInAs: (username: string) => `Signed in as ${username}.`,
  loading: 'Loading your agent access…',
  loadFailedTitle: 'Your agent access couldn’t be loaded',
  loadFailed: 'Your agent access couldn’t be loaded. Reload the page to try again.',

  agentsHeading: 'Connected agents',
  agentsEmpty: 'No agent is connected yet.',
  agentsEmptyLink: 'Add the Connection Portal’s MCP server to your agent',
  agentsEmptyEnd: 'to connect it.',
  tokensHeading: 'Personal access tokens',
  tokensEmpty: 'No personal access token yet.',
  createToken: 'Create token',

  unnamedAgent: 'Unnamed agent',
  unnamedToken: 'Unnamed token',
  connected: 'Connected',
  created: 'Created',
  expires: 'Expires',
  lastUsed: 'Last used',
  neverUsed: 'Never used',
  justNow: 'just now',
  menuLabel: (name: string) => `Actions for ${name}`,
  changeLevel: 'Change access level',
  revoke: 'Revoke',

  cancel: 'Cancel',
  retry: 'Try again',
  accessLevel: 'Access level',

  levelTitle: (name: string) => `Change access level for ${name}`,
  save: 'Save',
  saving: 'Saving…',
  levelFailedTitle: 'The access level couldn’t be changed',
  levelFailed: 'The access level couldn’t be changed. Try again.',
  levelChanged: 'Access level changed. It applies from the agent’s next call.',

  revokeTitle: (name: string) => `Revoke access for ${name}?`,
  revokeText:
    'The agent’s next call will be refused, and its waiting approval requests are cancelled.',
  revoking: 'Revoking…',
  revokeFailedTitle: 'Access couldn’t be revoked',
  revokeFailed: 'Access couldn’t be revoked. Try again.',
  revoked: 'Access revoked.',

  createTitle: 'Create a personal access token',
  createText:
    'An agent that can’t sign in through the browser uses the token instead. It acts on your behalf with the access level you choose.',
  tokenName: 'Name',
  tokenNameMissing: 'Enter a name for the token.',
  validFor: 'Valid for',
  days: (days: number) => `${days} days`,
  creating: 'Creating token…',
  createFailedTitle: 'The token couldn’t be created',
  createFailed: 'The token couldn’t be created. Try again.',

  createdTitle: (name: string) => `Token ${name} created`,
  createdText: 'Copy it now. It won’t be shown again.',
  tokenLabel: 'Your token',
  copy: 'Copy',
  copied: 'Copied',
  done: 'Done',
  close: 'Close',
};

/**
 * Where the empty "Connected agents" section leads: the README's section on installing the plugin
 * and connecting other MCP clients (contracts/guidance.md "Installing (README)")
 */
export const MCP_README_URL =
  'https://github.com/DigitalProductschool/batch27-faro#installing-the-plugin';

// What the token's status region announces after each copy
export const COPY_ANNOUNCEMENTS: Record<CopyStatus, string> = {
  idle: '',
  copied: 'Token copied',
  failed: 'Copying didn’t work. The token is selected, so you can copy it yourself.',
};

// How long the button says "Copied", as CopyableUrl's
export const COPIED_RESET_MS = 3000;

// The token's name, as the API takes it
export const TOKEN_NAME_MAX_LENGTH = 100;

// "Valid for": the API's maximum is 90 days (AGENT_TOKEN_MAX_DAYS)
export const TOKEN_VALIDITY_DAYS = [7, 30, 90] as const;

export const INITIAL_TOKEN_FORM: TokenForm = {
  name: '',
  level: 'read',
  days: 30,
  nameError: null,
};

export const INITIAL_ACCOUNT_STATE: AccountState = {
  status: 'loading',
  loadError: null,
  items: [],
  levels: [],
  now: null,
  dialog: null,
  busy: false,
  error: null,
  toast: null,
  toastCount: 0,
};

// "Last used": minutes, hours, then days up to this many, and the date after that
export const RELATIVE_DAYS_LIMIT = 30;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

// "5 minutes ago", "yesterday", "3 days ago"
export const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
