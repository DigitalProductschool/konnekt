import type { Language } from '@connection-portal/rules/language';

import { displayNameOf } from '../../utils/localDrafts/content';
import type { LocalDraftRecord } from '../../utils/localDrafts/types';
import { SIGN_OUT_COPY, SIGN_OUT_MAX_NAMES } from './constants';
import type { UserMenuAction, UserMenuState } from './types';

// No initials any more: the account pill shows a person icon and the menu the name (spec 008,
// FR-030, F17; build note 14 "No initials")

/**
 * The local drafts' names for the sign-out warning: at most 5, as "a, b and c", and then
 * "a, b, c, d, e and 3 more" (ui-screens.md S7), in the given language. Empty without records.
 */
export function signOutNamesOf(records: LocalDraftRecord[], language: Language): string {
  const copy = SIGN_OUT_COPY[language];
  const names = records.map((record) => displayNameOf(record.content, language));
  if (names.length <= SIGN_OUT_MAX_NAMES) {
    if (names.length <= 1) {
      return names.join('');
    }
    return `${names.slice(0, -1).join(', ')} ${copy.and} ${names[names.length - 1]}`;
  }
  const shown = names.slice(0, SIGN_OUT_MAX_NAMES).join(', ');
  return `${shown} ${copy.more(names.length - SIGN_OUT_MAX_NAMES)}`;
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
      return { ...state, open: false, signOutRecords: action.records };
    case 'signOutCancelled':
      return state.signingOut ? state : { ...state, signOutRecords: null };
    case 'signOutConfirmed':
      return { ...state, signingOut: true };
  }
}
