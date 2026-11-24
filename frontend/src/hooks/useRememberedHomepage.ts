import { useEffect, useMemo } from 'react';

import { storageKeyOf } from '../utils/localDrafts/keys';
import type { RememberedHomepage } from './types';
import { useCurrentUser } from './useCurrentUser';

/**
 * The part of the account's key after `<prefix><account>:`. It holds a `:`, so the local drafts'
 * store, which takes every key of the account without one for a draft's (`accountFlowKeyOf`),
 * never lists, removes or counts the flag
 */
const HOMEPAGE_FLAG = 'homepage:has-connections';

const REMEMBERED = 'true';
const NOT_REMEMBERED = 'false';

/** `window.localStorage`, or null where reaching it throws (blocked storage, private windows) */
function browserStorage(): Storage | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The account's flag; null when none is stored, it is malformed or the storage fails */
function readFlag(username: string): boolean | null {
  try {
    const raw = browserStorage()?.getItem(storageKeyOf(username, HOMEPAGE_FLAG)) ?? null;
    if (raw === REMEMBERED) return true;
    if (raw === NOT_REMEMBERED) return false;
    return null;
  } catch {
    return null;
  }
}

/** Stores the account's flag; a full or blocked storage leaves the memory as it was, silently */
function writeFlag(username: string, hasConnections: boolean): void {
  try {
    browserStorage()?.setItem(
      storageKeyOf(username, HOMEPAGE_FLAG),
      hasConnections ? REMEMBERED : NOT_REMEMBERED
    );
  } catch {
    // Quota exceeded or blocked: the next reload shows the loader instead (FR-027)
  }
}

/**
 * The homepage memory of the signed-in account on this device (spec 008, research R6, FR-027):
 * whether its list of connections and drafts held anything when it last loaded, so that "/"
 * shows the right page while the list loads again after a reload, without a flash.
 *
 * `hasConnections` is what the page knows now: null until its list has loaded, then whether the
 * list holds anything. The hook writes it to the account's flag whenever it is known and changes:
 * when the list loads, and when the last connection is deleted from it. `remembered` is read once
 * per account, so the page's own writes don't change it.
 *
 * Besides `useLocalDraftStore`, this is the only code that touches `window.localStorage`. One
 * flag per account (`konnekt:local-draft:v1:<username>:homepage:has-connections`);
 * nothing else is stored, and nothing is logged.
 */
export function useRememberedHomepage(hasConnections: boolean | null): RememberedHomepage {
  const { user } = useCurrentUser();
  const username = user?.username ?? null;
  const remembered = useMemo(
    () => (username === null || username === '' ? null : readFlag(username)),
    [username]
  );

  useEffect(() => {
    if (username !== null && username !== '' && hasConnections !== null) {
      writeFlag(username, hasConnections);
    }
  }, [username, hasConnections]);

  return { remembered };
}
