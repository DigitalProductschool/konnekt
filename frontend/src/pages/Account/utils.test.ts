import type {
  AccessLevelInfo,
  AgentAccessItem,
  AgentAccessList,
} from '@connection-portal/api-types/agent-access';
import { describe, expect, it } from 'vitest';

import { ACCOUNT_COPY, INITIAL_ACCOUNT_STATE, INITIAL_TOKEN_FORM } from './constants';
import type { AccountState } from './types';
import {
  accountReducer,
  formatDateTime,
  levelNameOf,
  nameOf,
  relativeLastUseOf,
  rowTextsOf,
} from './utils';

// Midday, so that the dates are the same in every time zone the tests may run in
const NOW = new Date('2026-11-06T12:00:00Z');

/**
 * A time in the browser's time zone, which the rows' dates are written in (cosmetic 3,
 * design-notes §3 "Dates": "05.10.2026, 12:00")
 */
function localTime(year: number, month: number, day: number, hour: number, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function agent(changes: Partial<AgentAccessItem> = {}): AgentAccessItem {
  return {
    id: 'agent-1',
    kind: 'oauth',
    client_name: 'Claude Code',
    name: null,
    access_level: 'read',
    created_at: localTime(2026, 10, 5, 12),
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
    created_at: localTime(2026, 11, 1, 9, 5),
    expires_at: localTime(2026, 12, 1, 0, 0),
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
    expect(relativeLastUseOf('2026-11-06T11:59:30Z', NOW, 'en')).toBe('just now');
    expect(relativeLastUseOf('2026-11-06T12:00:10Z', NOW, 'en')).toBe('just now');
  });

  it('counts minutes, then hours', () => {
    expect(relativeLastUseOf('2026-11-06T11:55:00Z', NOW, 'en')).toBe('5 minutes ago');
    expect(relativeLastUseOf('2026-11-06T11:59:00Z', NOW, 'en')).toBe('1 minute ago');
    expect(relativeLastUseOf('2026-11-06T09:00:00Z', NOW, 'en')).toBe('3 hours ago');
  });

  it('counts days, the first one as yesterday', () => {
    expect(relativeLastUseOf('2026-11-05T10:00:00Z', NOW, 'en')).toBe('yesterday');
    expect(relativeLastUseOf('2026-10-25T12:00:00Z', NOW, 'en')).toBe('12 days ago');
  });

  it('gives the date and time from 30 days on', () => {
    expect(relativeLastUseOf(localTime(2026, 10, 6, 12), NOW, 'en')).toBe('06.10.2026, 12:00');
  });

  it('words the same times in German', () => {
    expect(relativeLastUseOf('2026-11-06T11:59:30Z', NOW, 'de')).toBe('gerade eben');
    expect(relativeLastUseOf('2026-11-06T11:55:00Z', NOW, 'de')).toBe('vor 5 Minuten');
    expect(relativeLastUseOf('2026-11-06T11:59:00Z', NOW, 'de')).toBe('vor 1 Minute');
    expect(relativeLastUseOf('2026-11-06T09:00:00Z', NOW, 'de')).toBe('vor 3 Stunden');
    expect(relativeLastUseOf('2026-11-05T10:00:00Z', NOW, 'de')).toBe('gestern');
    expect(relativeLastUseOf('2026-10-25T12:00:00Z', NOW, 'de')).toBe('vor 12 Tagen');
    expect(relativeLastUseOf(localTime(2026, 10, 6, 12), NOW, 'de')).toBe('06.10.2026, 12:00');
  });
});

describe('formatDateTime', () => {
  it('writes the date as dd.mm.yyyy with the 24-hour time, padded, midnight as 00', () => {
    expect(formatDateTime(localTime(2026, 10, 5, 14, 32), 'en')).toBe('05.10.2026, 14:32');
    expect(formatDateTime(localTime(2026, 1, 9, 0, 0), 'en')).toBe('09.01.2026, 00:00');
    expect(formatDateTime(localTime(2026, 10, 5, 14, 32), 'de')).toBe('05.10.2026, 14:32');
    expect(formatDateTime(localTime(2026, 1, 9, 0, 0), 'de')).toBe('09.01.2026, 00:00');
  });
});

describe('nameOf', () => {
  it('names an agent connection by its client and a token by its name', () => {
    expect(nameOf(agent(), 'en')).toBe('Claude Code');
    expect(nameOf(token(), 'en')).toBe('CI agent');
  });

  it('names one without a name', () => {
    expect(nameOf(agent({ client_name: null }), 'en')).toBe(ACCOUNT_COPY.en.unnamedAgent);
    expect(nameOf(token({ name: '  ' }), 'en')).toBe(ACCOUNT_COPY.en.unnamedToken);
    expect(nameOf(agent({ client_name: null }), 'de')).toBe('Unbenannter Agent');
    expect(nameOf(token({ name: '  ' }), 'de')).toBe('Unbenanntes Token');
    expect(nameOf(agent(), 'de')).toBe('Claude Code');
  });
});

describe('levelNameOf', () => {
  it('uses the full names, from the API or the consent page', () => {
    expect(levelNameOf('drafts', 'en', LEVELS)).toBe('Read and edit drafts');
    expect(levelNameOf('manage', 'en', [])).toBe('Read, edit drafts and manage live connections');
    expect(levelNameOf('read', 'en')).toBe('Read only');
    expect(levelNameOf('manage', 'de', [])).toBe(
      'Lesen, Entwürfe bearbeiten und aktive Anbindungen verwalten'
    );
    expect(levelNameOf('read', 'de')).toBe('Nur lesen');
    // The API's levels win: they come in the language they were asked in
    expect(levelNameOf('drafts', 'de', LEVELS)).toBe('Read and edit drafts');
  });
});

describe('rowTextsOf', () => {
  it('says when an agent connected and that it was never used', () => {
    expect(rowTextsOf(agent(), NOW, 'en', LEVELS)).toEqual({
      name: 'Claude Code',
      level: 'Read only',
      since: { prefix: 'Connected', date: '05.10.2026, 12:00', datetime: agent().created_at },
      expires: null,
      lastUse: null,
    });
  });

  it('says when a token was created, expires and was last used', () => {
    expect(rowTextsOf(token(), NOW, 'en')).toEqual({
      name: 'CI agent',
      level: 'Read and edit drafts',
      since: { prefix: 'Created', date: '01.11.2026, 09:05', datetime: token().created_at },
      expires: { prefix: 'Expires', date: '01.12.2026, 00:00', datetime: token().expires_at },
      lastUse: { prefix: 'Last used', date: '5 minutes ago', datetime: '2026-11-06T11:55:00Z' },
    });
  });

  it('says the same in German', () => {
    expect(rowTextsOf(token(), NOW, 'de')).toEqual({
      name: 'CI agent',
      level: 'Lesen und Entwürfe bearbeiten',
      since: { prefix: 'Erstellt am', date: '01.11.2026, 09:05', datetime: token().created_at },
      expires: { prefix: 'Gültig bis', date: '01.12.2026, 00:00', datetime: token().expires_at },
      lastUse: {
        prefix: 'Zuletzt verwendet',
        date: 'vor 5 Minuten',
        datetime: '2026-11-06T11:55:00Z',
      },
    });
    expect(rowTextsOf(agent(), NOW, 'de').since.prefix).toBe('Verbunden am');
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

  it('takes the levels’ words again after a switch, keeping the rest', () => {
    const before = accountReducer(loaded([agent()]), {
      type: 'levelDialogOpened',
      item: agent(),
    });
    const german: AccessLevelInfo[] = [{ level: 'read', name: 'Nur lesen', allows: '…' }];
    const after = accountReducer(before, { type: 'levelsLoaded', levels: german });
    expect(after).toEqual({ ...before, levels: german });
  });

  it('words a toast in the language of the moment', () => {
    const item = agent();
    let state = accountReducer(loaded([item]), { type: 'revokeDialogOpened', item });
    state = accountReducer(state, { type: 'revoked', id: item.id, language: 'de' });
    expect(state.toast).toEqual({ id: 1, message: 'Zugriff widerrufen.' });
  });

  it('opens "Change access level" with the current level, and changes it', () => {
    const item = agent({ access_level: 'drafts' });
    let state = accountReducer(loaded([item]), { type: 'levelDialogOpened', item });
    expect(state.dialog).toEqual({ type: 'level', item, level: 'drafts' });
    state = accountReducer(state, { type: 'levelChosen', level: 'manage' });
    state = accountReducer(state, { type: 'submitted' });
    expect(state.busy).toBe(true);
    const changed = { ...item, access_level: 'manage' as const };
    state = accountReducer(state, { type: 'levelChanged', item: changed, language: 'en' });
    expect(state.items).toEqual([changed]);
    expect(state.dialog).toBeNull();
    expect(state.busy).toBe(false);
    expect(state.toast).toEqual({ id: 1, kind: 'success', message: ACCOUNT_COPY.en.levelChanged });
  });

  it.each(['en', 'de'] as const)(
    'styles the toasts by their action, not their text (%s)',
    (language) => {
      const item = agent();
      const changed = accountReducer(loaded([item]), { type: 'levelChanged', item, language });
      expect(changed.toast?.kind).toBe('success');
      const revoked = accountReducer(loaded([item]), { type: 'revoked', id: item.id, language });
      expect(revoked.toast).not.toHaveProperty('kind');
    }
  );

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
    state = accountReducer(state, { type: 'revoked', id: first.id, language: 'en' });
    expect(state.items).toEqual([second]);
    expect(state.toast).toEqual({ id: 1, message: ACCOUNT_COPY.en.revoked });
    state = accountReducer(state, { type: 'toastDismissed' });
    state = accountReducer(state, { type: 'revoked', id: second.id, language: 'en' });
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
      language: 'en',
    });
    expect(state.items[0]).toBe(created);
    expect(state.dialog).toEqual({ type: 'tokenCreated', name: 'New', token: 'cp_secret' });
    expect(state.toast).toBeNull();
    state = accountReducer(state, { type: 'dialogClosed' });
    expect(state.dialog).toBeNull();
    expect(JSON.stringify(state)).not.toContain('cp_secret');
  });
});
