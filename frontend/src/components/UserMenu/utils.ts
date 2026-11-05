import { displayNameOf } from '../../utils/localDrafts/content';
import type { LocalDraftRecord } from '../../utils/localDrafts/types';
import { SIGN_OUT_COPY, SIGN_OUT_MAX_NAMES } from './constants';
import type { UserMenuAction, UserMenuState } from './types';

/** Initials for the avatar: "laura.weber" becomes "LW", "alice" becomes "A". */
export function initialsOf(username: string): string {
  return username
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/**
 * The local drafts' names for the sign-out warning: at most 5, as "a, b and c", and then
 * "a, b, c, d, e and 3 more" (ui-screens.md S7). Empty without records.
 */
export function signOutNamesOf(records: LocalDraftRecord[]): string {
  const names = records.map((record) => displayNameOf(record.content));
  if (names.length <= SIGN_OUT_MAX_NAMES) {
    if (names.length <= 1) {
      return names.join('');
    }
    return `${names.slice(0, -1).join(', ')} ${SIGN_OUT_COPY.and} ${names[names.length - 1]}`;
  }
  const shown = names.slice(0, SIGN_OUT_MAX_NAMES).join(', ');
  return `${shown} ${SIGN_OUT_COPY.more(names.length - SIGN_OUT_MAX_NAMES)}`;
}

/** The menu panel and the sign-out warning */
export function userMenuReducer(state: UserMenuState, action: UserMenuAction): UserMenuState {
  switch (action.type) {
    case 'toggled':
      return { ...state, open: !state.open };
    case 'opened':
      return { ...state, open: true };
    case 'closed':
      return { ...state, open: false };
    case 'signOutAsked':
      return { ...state, open: false, signOutNames: action.names };
    case 'signOutCancelled':
      return state.signingOut ? state : { ...state, signOutNames: null };
    case 'signOutConfirmed':
      return { ...state, signingOut: true };
  }
}
