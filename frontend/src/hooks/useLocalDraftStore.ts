import { useEffect, useRef } from 'react';

import { createLocalDraftStore, type LocalDraftStore } from '../utils/localDrafts/store';
import type { StorageLike } from '../utils/localDrafts/types';
import { useCurrentUser } from './useCurrentUser';

let sharedStore: LocalDraftStore | null = null;

/**
 * The one store of the page, created at first use. Reaching `window.localStorage` can throw
 * (blocked storage, some private windows): local drafts are then unavailable, silently (FR-021)
 */
function sharedLocalDraftStore(): LocalDraftStore {
  if (sharedStore === null) {
    let storage: StorageLike | null = null;
    try {
      storage = window.localStorage ?? null;
    } catch {
      storage = null;
    }
    sharedStore = createLocalDraftStore(storage, () => new Date());
  }
  return sharedStore;
}

/**
 * The local draft store and the signed-in account's username (contracts/local-drafts.md
 * "Hooks"; FR-019, FR-021).
 *
 * This is the only code that touches `window.localStorage`: every other module of the local
 * drafts takes a `StorageLike`, so it stays testable in Node, and every caller shares this one
 * store, so the accounts that `close()` refused at sign-out stay refused for the autosave's
 * flush on unmount too. When the account signs in, the hook reopens it.
 *
 * Nothing here removes a record: an expired session (a 401) signs out without touching the
 * account's local drafts, which are offered again at the next sign-in (FR-019). Only "Log out"
 * in `UserMenu`, after its warning, discards them.
 */
export function useLocalDraftStore(): { store: LocalDraftStore; username: string | null } {
  const { user } = useCurrentUser();
  const username = user?.username ?? null;
  const store = sharedLocalDraftStore();
  // The username this hook last saw; null at mount, so a hook mounted after the sign-in reopens
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (username !== null && username !== previous.current) {
      store.reopen(username);
    }
    previous.current = username;
  }, [store, username]);

  return { store, username };
}
