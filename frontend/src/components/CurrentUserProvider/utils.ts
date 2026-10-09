import type { CurrentUserAction, CurrentUserState } from './types';

export function currentUserReducer(
  _state: CurrentUserState,
  action: CurrentUserAction
): CurrentUserState {
  switch (action.type) {
    case 'signedIn':
      return { status: 'signedIn', user: action.user, loggedOut: false };
    case 'signedOut':
      return { status: 'signedOut', user: null, loggedOut: false };
    case 'loggedOut':
      return { status: 'signedOut', user: null, loggedOut: true };
  }
}
