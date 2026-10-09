import type { CurrentUserAction, CurrentUserState } from './types';

export function currentUserReducer(
  _state: CurrentUserState,
  action: CurrentUserAction
): CurrentUserState {
  switch (action.type) {
    case 'signedIn':
      return { status: 'signedIn', user: action.user };
    case 'signedOut':
      return { status: 'signedOut', user: null };
  }
}
