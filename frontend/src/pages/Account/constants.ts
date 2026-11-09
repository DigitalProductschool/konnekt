import type { CopyTexts } from '../../components/CopyableUrl/types';
import type { AccountState, TokenForm } from './types';

// The user page's copy (specs/007-agent-mcp-server/contracts/ui-screens.md S2)
export const ACCOUNT_COPY = {
  title: 'Your account',
  signedInAs: (username: string) => `Signed in as ${username}.`,
  loading: 'Loading your agent access…',
  loadFailedTitle: 'Your agent access couldn’t be loaded',
  // A failure without the API's message, such as no network (§3 "Error state of a page")
  loadFailed: 'Check your connection and try again.',
  backToList: 'Go to connections',

  agentsHeading: 'Connected agents',
  agentsEmpty: 'No agent is connected yet.',
  agentsEmptyLink: 'Add Konnekt’s MCP server to your agent',
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
  done: 'Done',
};

/**
 * Where the empty "Connected agents" section leads: the README's section on installing the plugin
 * and connecting other MCP clients (contracts/guidance.md "Installing (README)")
 */
export const MCP_README_URL =
  'https://github.com/DigitalProductschool/batch27-faro#installing-the-plugin';

/**
 * What the token's field announces after each copy (FR-048); its button reads "Copy" and
 * "✓ Copied" for 2 s, `CopyableUrl`'s field texts
 */
export const TOKEN_COPY_TEXTS: Partial<CopyTexts> = {
  announced: 'Token copied',
  failed: 'Copying didn’t work. The token is selected, so you can copy it yourself.',
};

/**
 * The toasts that report a finished save in green (`success`, the Figma toast's "saved"); the
 * others, such as "Access revoked." (removed), are the neutral ink toast (design-notes §3 "Toast")
 */
export const SUCCESS_TOASTS: ReadonlySet<string> = new Set([ACCOUNT_COPY.levelChanged]);

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

/**
 * A section's list (S20; W16, the rule rows' list with a ⋯ per row, U55): the overview's list
 * card (U11 6699:44252: white, 1px decorative border, radius 12, no shadow), but nothing clips
 * it, so that a row's menu can open over the rows below and past the card (V6)
 */
export const LIST_CARD_CLASSES =
  'rounded-kern-large bg-kern-layout-background-default flex flex-col border border-(--kern-color-decorative-border-default)';

/**
 * A row (the rule rows' anatomy, U30 6348:40889: the texts in a column, 4 apart, the 32px ⋯ at
 * the top right, 16 between them; 16 24 as the overview's rows), a 1px line above every row but
 * the first; 16 at the left below 640px
 */
export const ROW_CLASSES =
  'flex items-start gap-16 border-(--kern-color-decorative-border-default) py-16 pr-16 pl-16 not-first:border-t sm:pl-24';

/**
 * A section without items (§3 "Empty state" inside a page with its own h1): the light blue card
 * (`layout-background-hued`, radius 12) with the one sentence in body/default muted; padding 24
 * (the pattern's narrow padding: a section's card, no picture, no action of its own: "Create
 * token" stays beside the heading). The sentence takes the card's width: the pattern's 578px
 * measure would break the agents' sentence before its last word
 */
export const EMPTY_CARD_CLASSES =
  'rounded-kern-large bg-kern-layout-background-hued text-kern-static-medium text-kern-layout-text-muted p-24 leading-(--kern-typography-line-height-medium-static)';
