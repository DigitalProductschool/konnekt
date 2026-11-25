import type {
  AccessLevel,
  AccessLevelInfo,
  AgentAccessItem,
} from '@konnekt/api-types/agent-access';
import type { Language } from '@konnekt/rules/language';

import { ACCESS_LEVELS } from '../../components/AccessLevelChoice/constants';
import type { ToastKind } from '../../components/Toast/types';
import { SAVED_TIME_FORMATS } from '../FormConnectionDetail/constants';
import { formatRowDate } from '../FormConnectionList/utils';
import {
  ACCOUNT_COPY,
  DAY_MS,
  HOUR_MS,
  INITIAL_TOKEN_FORM,
  MINUTE_MS,
  RELATIVE_DAYS_LIMIT,
  RELATIVE_TIME_FORMATS,
} from './constants';
import type { AccountAction, AccountState, RowTexts } from './types';

/**
 * A row's date with the 24-hour time of the browser's time zone, "05.10.2026, 14:32" (cosmetic 3,
 * design-notes §3 "Dates": the overview's `formatRowDate`, the time as the draft details add it);
 * the same in both languages
 */
export function formatDateTime(timestamp: string, language: Language): string {
  const time = SAVED_TIME_FORMATS[language].format(new Date(timestamp));
  return `${formatRowDate(timestamp)}, ${time}`;
}

/** The client's name for an agent connection, the token's name for a token (content, FR-007) */
export function nameOf(item: AgentAccessItem, language: Language): string {
  if (item.kind === 'oauth') {
    return item.client_name?.trim() || ACCOUNT_COPY[language].unnamedAgent;
  }
  return item.name?.trim() || ACCOUNT_COPY[language].unnamedToken;
}

/**
 * An access level's full name, from the API's levels (in the language they were asked in) or,
 * without them, the consent page's in `language`
 */
export function levelNameOf(
  level: AccessLevel,
  language: Language,
  levels: AccessLevelInfo[] = ACCESS_LEVELS[language]
): string {
  return (
    levels.find((info) => info.level === level)?.name ??
    ACCESS_LEVELS[language].find((info) => info.level === level)?.name ??
    level
  );
}

/**
 * When an agent last called, counted from `now`: "just now" within a minute, then "5 minutes
 * ago", "3 hours ago", "yesterday", "12 days ago", and from 30 days on the date and time
 * ("06.10.2026, 12:00"). A time after `now`, from a clock that runs ahead, is "just now". In
 * German "gerade eben", "vor 5 Minuten", "vor 3 Stunden", "gestern", "vor 12 Tagen"
 */
export function relativeLastUseOf(lastUsedAt: string, now: Date, language: Language): string {
  const format = RELATIVE_TIME_FORMATS[language];
  const elapsed = now.getTime() - new Date(lastUsedAt).getTime();
  if (elapsed < MINUTE_MS) {
    return ACCOUNT_COPY[language].justNow;
  }
  if (elapsed < HOUR_MS) {
    return format.format(-Math.floor(elapsed / MINUTE_MS), 'minute');
  }
  if (elapsed < DAY_MS) {
    return format.format(-Math.floor(elapsed / HOUR_MS), 'hour');
  }
  const days = Math.floor(elapsed / DAY_MS);
  if (days < RELATIVE_DAYS_LIMIT) {
    return format.format(-days, 'day');
  }
  return formatDateTime(lastUsedAt, language);
}

/**
 * What a row says (S2): the name, the level's name, "Connected {date}" for an agent connection or
 * "Created {date}" and "Expires {date}" for a token, and "Last used {relative}" or, without a
 * use, "Never used" (`lastUse` null). Dates with their time, "05.10.2026, 14:32" (`formatDateTime`)
 */
export function rowTextsOf(
  item: AgentAccessItem,
  now: Date,
  language: Language,
  levels?: AccessLevelInfo[]
): RowTexts {
  const copy = ACCOUNT_COPY[language];
  const token = item.kind === 'token';
  return {
    name: nameOf(item, language),
    level: levelNameOf(item.access_level, language, levels),
    since: {
      prefix: token ? copy.created : copy.connected,
      date: formatDateTime(item.created_at, language),
      datetime: item.created_at,
    },
    expires:
      token && item.expires_at
        ? {
            prefix: copy.expires,
            date: formatDateTime(item.expires_at, language),
            datetime: item.expires_at,
          }
        : null,
    lastUse: item.last_used_at
      ? {
          prefix: copy.lastUsed,
          date: relativeLastUseOf(item.last_used_at, now, language),
          datetime: item.last_used_at,
        }
      : null,
  };
}

/**
 * The page's toast, each with its own id so that it gets its own timer; `kind` is left out for
 * the neutral toast (R10: the style rests on a code, not on the toast's text)
 */
function withToast(state: AccountState, message: string, kind?: ToastKind): AccountState {
  const toastCount = state.toastCount + 1;
  const toast = kind ? { id: toastCount, kind, message } : { id: toastCount, message };
  return { ...state, toast, toastCount };
}

/** A dialog closes and its request's state goes with it */
function withoutDialog(state: AccountState): AccountState {
  return { ...state, dialog: null, busy: false, error: null };
}

/**
 * The user page's state: the list, the open dialog with its fields, the running request, the
 * dialog's error and the toast. A dialog can't close or open another while its request runs. The
 * token's secret stays in the `tokenCreated` dialog until it closes; the list gets the token
 * without it, and no toast ever holds it. A toast is worded in the language of the moment it
 * appears and keeps it
 */
export function accountReducer(state: AccountState, action: AccountAction): AccountState {
  switch (action.type) {
    case 'loaded':
      return {
        ...state,
        status: 'loaded',
        loadError: null,
        items: action.list.items,
        levels: action.list.levels,
        now: action.now,
      };
    case 'loadFailed':
      return { ...state, status: 'failed', loadError: action.error };
    case 'levelsLoaded':
      return { ...state, levels: action.levels };
    case 'levelDialogOpened':
      return state.busy
        ? state
        : {
            ...state,
            dialog: { type: 'level', item: action.item, level: action.item.access_level },
            error: null,
          };
    case 'revokeDialogOpened':
      return state.busy
        ? state
        : { ...state, dialog: { type: 'revoke', item: action.item }, error: null };
    case 'createDialogOpened':
      return state.busy
        ? state
        : { ...state, dialog: { type: 'createToken', form: INITIAL_TOKEN_FORM }, error: null };
    case 'levelChosen':
      if (state.dialog?.type === 'level') {
        return { ...state, dialog: { ...state.dialog, level: action.level } };
      }
      if (state.dialog?.type === 'createToken') {
        return {
          ...state,
          dialog: { ...state.dialog, form: { ...state.dialog.form, level: action.level } },
        };
      }
      return state;
    case 'tokenFormChanged':
      if (state.dialog?.type !== 'createToken') {
        return state;
      }
      return {
        ...state,
        dialog: {
          ...state.dialog,
          form: {
            ...state.dialog.form,
            ...action.changes,
            nameError: action.changes.name === undefined ? state.dialog.form.nameError : null,
          },
        },
      };
    case 'tokenNameRefused':
      if (state.dialog?.type !== 'createToken') {
        return state;
      }
      return {
        ...state,
        dialog: { ...state.dialog, form: { ...state.dialog.form, nameError: action.error } },
      };
    case 'dialogClosed':
      return state.busy ? state : withoutDialog(state);
    case 'submitted':
      return { ...state, busy: true, error: null };
    case 'failed':
      return { ...state, busy: false, error: action.error };
    case 'levelChanged':
      return withToast(
        {
          ...withoutDialog(state),
          items: state.items.map((item) => (item.id === action.item.id ? action.item : item)),
        },
        ACCOUNT_COPY[action.language].levelChanged,
        // A finished save: the green toast (design-notes §3 "Toast")
        'success'
      );
    case 'revoked':
      return withToast(
        { ...withoutDialog(state), items: state.items.filter((item) => item.id !== action.id) },
        ACCOUNT_COPY[action.language].revoked
      );
    case 'tokenCreated':
      return {
        ...state,
        busy: false,
        error: null,
        // Newest first, as the API lists them
        items: [action.created.item, ...state.items],
        dialog: {
          type: 'tokenCreated',
          name: nameOf(action.created.item, action.language),
          token: action.created.token,
        },
      };
    case 'toastDismissed':
      return { ...state, toast: null };
  }
}
