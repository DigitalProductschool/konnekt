import type {
  AccessLevelInfo,
  AgentAccessItem,
  AgentAccessList,
} from '@connection-portal/api-types/agent-access';
import { describe, expect, it } from 'vitest';

import { ACCOUNT_COPY, INITIAL_ACCOUNT_STATE, INITIAL_TOKEN_FORM } from './constants';
import type { AccountState } from './types';
import { accountReducer, levelNameOf, nameOf, relativeLastUseOf, rowTextsOf } from './utils';

// Midday, so that the dates are the same in every time zone the tests may run in
const NOW = new Date('2026-11-06T12:00:00Z');

function agent(changes: Partial<AgentAccessItem> = {}): AgentAccessItem {
  return {
    id: 'agent-1',
    kind: 'oauth',
    client_name: 'Claude Code',
    name: null,
    access_level: 'read',
    created_at: '2026-10-05T12:00:00Z',
    expires_at: null,
    last_used_at: null,
    ...changes,
  };
}

function token(changes: Partial<AgentAccessItem> = {}): AgentAccessItem {
  return {
    id: 'token-1',
    kind: 'token',
    client_name: null,
    name: 'CI agent',
    access_level: 'drafts',
    created_at: '2026-11-01T12:00:00Z',
    expires_at: '2026-12-01T12:00:00Z',
    last_used_at: '2026-11-06T11:55:00Z',
    ...changes,
  };
}

const LEVELS: AccessLevelInfo[] = [
  { level: 'read', name: 'Read only', allows: '…' },
  { level: 'drafts', name: 'Read and edit drafts', allows: '…' },
  {
    level: 'manage',
    name: 'Read, edit drafts and manage live connections',
    allows: '…',
  },
];

function loaded(items: AgentAccessItem[]): AccountState {
  const list: AgentAccessList = { items, levels: LEVELS };
  return accountReducer(INITIAL_ACCOUNT_STATE, { type: 'loaded', list, now: NOW });
}

describe('relativeLastUseOf', () => {
  it('says "just now" within a minute, and for a time ahead of now', () => {
    expect(relativeLastUseOf('2026-11-06T11:59:30Z', NOW)).toBe('just now');
    expect(relativeLastUseOf('2026-11-06T12:00:10Z', NOW)).toBe('just now');
  });

  it('counts minutes, then hours', () => {
    expect(relativeLastUseOf('2026-11-06T11:55:00Z', NOW)).toBe('5 minutes ago');
    expect(relativeLastUseOf('2026-11-06T11:59:00Z', NOW)).toBe('1 minute ago');
    expect(relativeLastUseOf('2026-11-06T09:00:00Z', NOW)).toBe('3 hours ago');
  });

  it('counts days, the first one as yesterday', () => {
    expect(relativeLastUseOf('2026-11-05T10:00:00Z', NOW)).toBe('yesterday');
    expect(relativeLastUseOf('2026-10-25T12:00:00Z', NOW)).toBe('12 days ago');
  });

  it('gives the date from 30 days on', () => {
    expect(relativeLastUseOf('2026-10-07T12:00:00Z', NOW)).toBe('7 Oct 2026');
  });
});

describe('nameOf', () => {
  it('names an agent connection by its client and a token by its name', () => {
    expect(nameOf(agent())).toBe('Claude Code');
    expect(nameOf(token())).toBe('CI agent');
  });

  it('names one without a name', () => {
    expect(nameOf(agent({ client_name: null }))).toBe(ACCOUNT_COPY.unnamedAgent);
    expect(nameOf(token({ name: '  ' }))).toBe(ACCOUNT_COPY.unnamedToken);
  });
});

describe('levelNameOf', () => {
  it('uses the full names, from the API or the consent page', () => {
    expect(levelNameOf('drafts', LEVELS)).toBe('Read and edit drafts');
    expect(levelNameOf('manage', [])).toBe('Read, edit drafts and manage live connections');
    expect(levelNameOf('read')).toBe('Read only');
  });
});

describe('rowTextsOf', () => {
  it('says when an agent connected and that it was never used', () => {
    expect(rowTextsOf(agent(), NOW, LEVELS)).toEqual({
      name: 'Claude Code',
      level: 'Read only',
      since: { prefix: 'Connected', date: '5 Oct 2026', datetime: '2026-10-05T12:00:00Z' },
      expires: null,
      lastUse: null,
    });
  });

  it('says when a token was created, expires and was last used', () => {
    expect(rowTextsOf(token(), NOW)).toEqual({
      name: 'CI agent',
      level: 'Read and edit drafts',
      since: { prefix: 'Created', date: '1 Nov 2026', datetime: '2026-11-01T12:00:00Z' },
      expires: { prefix: 'Expires', date: '1 Dec 2026', datetime: '2026-12-01T12:00:00Z' },
      lastUse: { prefix: 'Last used', date: '5 minutes ago', datetime: '2026-11-06T11:55:00Z' },
    });
  });
});

describe('accountReducer', () => {
  it('keeps the list, the levels and when it loaded', () => {
    const state = loaded([agent()]);
    expect(state.status).toBe('loaded');
    expect(state.items).toHaveLength(1);
    expect(state.levels).toBe(LEVELS);
    expect(state.now).toBe(NOW);
  });

  it('opens "Change access level" with the current level, and changes it', () => {
    const item = agent({ access_level: 'drafts' });
    let state = accountReducer(loaded([item]), { type: 'levelDialogOpened', item });
    expect(state.dialog).toEqual({ type: 'level', item, level: 'drafts' });
    state = accountReducer(state, { type: 'levelChosen', level: 'manage' });
    state = accountReducer(state, { type: 'submitted' });
    expect(state.busy).toBe(true);
    const changed = { ...item, access_level: 'manage' as const };
    state = accountReducer(state, { type: 'levelChanged', item: changed });
    expect(state.items).toEqual([changed]);
    expect(state.dialog).toBeNull();
    expect(state.busy).toBe(false);
    expect(state.toast).toEqual({ id: 1, message: ACCOUNT_COPY.levelChanged });
  });

  it('keeps a dialog open while its request runs, and shows why it failed', () => {
    const item = agent();
    let state = accountReducer(loaded([item]), { type: 'revokeDialogOpened', item });
    state = accountReducer(state, { type: 'submitted' });
    expect(accountReducer(state, { type: 'dialogClosed' })).toBe(state);
    expect(accountReducer(state, { type: 'createDialogOpened' })).toBe(state);
    state = accountReducer(state, { type: 'failed', error: { message: 'Not found' } });
    expect(state.busy).toBe(false);
    expect(state.error).toEqual({ message: 'Not found' });
    state = accountReducer(state, { type: 'dialogClosed' });
    expect(state.dialog).toBeNull();
    expect(state.error).toBeNull();
  });

  it('removes a revoked row and counts the toasts', () => {
    const first = agent();
    const second = token();
    let state = loaded([first, second]);
    state = accountReducer(state, { type: 'revokeDialogOpened', item: first });
    state = accountReducer(state, { type: 'revoked', id: first.id });
    expect(state.items).toEqual([second]);
    expect(state.toast).toEqual({ id: 1, message: ACCOUNT_COPY.revoked });
    state = accountReducer(state, { type: 'toastDismissed' });
    state = accountReducer(state, { type: 'revoked', id: second.id });
    expect(state.toast?.id).toBe(2);
  });

  it('fills the token form and clears the name error as the name changes', () => {
    let state = accountReducer(loaded([]), { type: 'createDialogOpened' });
    expect(state.dialog).toEqual({ type: 'createToken', form: INITIAL_TOKEN_FORM });
    state = accountReducer(state, { type: 'tokenNameRefused', error: 'Enter a name' });
    state = accountReducer(state, { type: 'tokenFormChanged', changes: { days: 90 } });
    state = accountReducer(state, { type: 'levelChosen', level: 'drafts' });
    expect(state.dialog).toEqual({
      type: 'createToken',
      form: { name: '', level: 'drafts', days: 90, nameError: 'Enter a name' },
    });
    state = accountReducer(state, { type: 'tokenFormChanged', changes: { name: 'CI' } });
    expect(state.dialog).toEqual({
      type: 'createToken',
      form: { name: 'CI', level: 'drafts', days: 90, nameError: null },
    });
  });

  it('lists a created token first and keeps its secret only in the dialog, without a toast', () => {
    const created = token({ id: 'token-2', name: 'New' });
    let state = accountReducer(loaded([agent()]), { type: 'createDialogOpened' });
    state = accountReducer(state, { type: 'submitted' });
    state = accountReducer(state, {
      type: 'tokenCreated',
      created: { item: created, token: 'cp_secret' },
    });
    expect(state.items[0]).toBe(created);
    expect(state.dialog).toEqual({ type: 'tokenCreated', name: 'New', token: 'cp_secret' });
    expect(state.toast).toBeNull();
    state = accountReducer(state, { type: 'dialogClosed' });
    expect(state.dialog).toBeNull();
    expect(JSON.stringify(state)).not.toContain('cp_secret');
  });
});
