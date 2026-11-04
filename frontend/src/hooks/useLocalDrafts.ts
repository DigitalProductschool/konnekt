import { useCallback, useEffect, useMemo, useState } from 'react';

import { parseStorageKey } from '../utils/localDrafts/keys';
import type { LocalDraftRecord } from '../utils/localDrafts/types';
import { useLocalDraftStore } from './useLocalDraftStore';

/**
 * The signed-in account's local drafts on this device, newest first, for the offers on the
 * overview and the first-connection screen (contracts/local-drafts.md `useLocalDrafts`; FR-016,
 * FR-018).
 *
 * `exceptFlowKey` leaves out the flow's own record on `/get-started`. The list refreshes on
 * `storage` events of the account's keys, so a draft written or discarded in another tab appears
 * or goes, and after `discard`, which removes one record (the caller has asked first). A discard
 * refreshes every instance in this tab, not only the caller's: `storage` events reach only the
 * other tabs, so the instances share a module-level set of listeners, which `discard` notifies
 * (the overview's count of the hint and its offer hold one instance each). Without a
 * username or a storage (FR-021) the list is empty. Reading the list removes the account's
 * expired and invalid records (`store.list`).
 */
// Every mounted instance's refresh, notified after a discard in this tab
const discardListeners = new Set<() => void>();

export function useLocalDrafts(exceptFlowKey?: string): {
  drafts: LocalDraftRecord[];
  discard(flowKey: string): void;
} {
  const { store, username } = useLocalDraftStore();
  // Bumped whenever the stored records may have changed
  const [version, setVersion] = useState(0);

  useEffect(() => {
    function refresh() {
      setVersion((current) => current + 1);
    }
    discardListeners.add(refresh);
    return () => {
      discardListeners.delete(refresh);
    };
  }, []);

  useEffect(() => {
    if (!store.available || username === null) {
      return;
    }
    function handleStorage(event: StorageEvent) {
      // `key` is null when another tab cleared the storage
      if (event.key === null || parseStorageKey(event.key)?.username === username) {
        setVersion((current) => current + 1);
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [store, username]);

  const drafts = useMemo(() => {
    if (!store.available || username === null) {
      return [];
    }
    return store.list(username).filter((record) => record.flowKey !== exceptFlowKey);
    // `version` is the signal to read the storage again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, username, exceptFlowKey, version]);

  const discard = useCallback(
    (flowKey: string) => {
      if (username === null) {
        return;
      }
      store.remove(username, flowKey);
      // The caller's instance included
      discardListeners.forEach((refresh) => refresh());
    },
    [store, username]
  );

  return { drafts, discard };
}
