// The local draft store over an injected StorageLike (specs/005-connection-drafts/contracts/
// local-drafts.md `createLocalDraftStore`; research R9, R11; FR-015, FR-018, FR-019, FR-021).
// Every storage access is in try/catch: a blocked, full or missing storage makes local drafts
// silently unavailable, and a failing storage reads as empty. The store only ever touches keys
// with this app's prefix and the given account's username
import { LOCAL_DRAFT_MAX_AGE_MS } from './constants';
import { parseRecord, serializeRecord } from './format';
import { accountFlowKeyOf, isFlowKey, storageKeyOf } from './keys';
import type { LocalDraftRecord, StorageLike } from './types';

/** The local drafts of the accounts that use this browser (contracts/local-drafts.md) */
export interface LocalDraftStore {
  /** False without a storage (FR-021): every method is then a no-op */
  available: boolean;
  /** The account's valid, unexpired records, newest first; removes its expired and invalid ones */
  list(username: string): LocalDraftRecord[];
  /** The account's record of a flow; null, and removed, when it is invalid or expired */
  read(username: string, flowKey: string): LocalDraftRecord | null;
  /** Stores the record; false when the storage refuses it or the account is closed */
  write(username: string, record: LocalDraftRecord): boolean;
  remove(username: string, flowKey: string): void;
  /** Removes every entry of the account, for the sign-out discard; how many it removed */
  removeAll(username: string): number;
  /** Refuses the account's writes until `reopen`, so a flush after signing out writes nothing */
  close(username: string): void;
  /** Allows the account's writes again, on sign-in */
  reopen(username: string): void;
}

/** A store over `storage`; `now` gives the time that expiry is measured against */
export function createLocalDraftStore(
  storage: StorageLike | null,
  now: () => Date
): LocalDraftStore {
  const closed = new Set<string>();

  if (storage === null) {
    return {
      available: false,
      list: () => [],
      read: () => null,
      write: () => false,
      remove: () => undefined,
      removeAll: () => 0,
      close: (username) => void closed.add(username),
      reopen: (username) => void closed.delete(username),
    };
  }

  const removeKey = (key: string): boolean => {
    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  };

  const getKey = (key: string): string | null => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };

  /** The flow keys of the account's entries, valid or not, read before anything is removed */
  const accountFlowKeys = (username: string): string[] => {
    const flowKeys: string[] = [];
    let length = 0;
    try {
      length = storage.length;
    } catch {
      return flowKeys;
    }
    for (let index = 0; index < length; index += 1) {
      let key: string | null = null;
      try {
        key = storage.key(index);
      } catch {
        continue;
      }
      const flowKey = key === null ? null : accountFlowKeyOf(key, username);
      if (flowKey !== null) {
        flowKeys.push(flowKey);
      }
    }
    return flowKeys;
  };

  const isExpired = (record: LocalDraftRecord): boolean =>
    now().getTime() - Date.parse(record.changedAt) >= LOCAL_DRAFT_MAX_AGE_MS;

  /** The record under the account's key; removes the entry when it is invalid or expired */
  const readKey = (username: string, flowKey: string): LocalDraftRecord | null => {
    const key = storageKeyOf(username, flowKey);
    const raw = getKey(key);
    if (raw === null) {
      return null;
    }
    const record = parseRecord(raw, flowKey);
    if (record === null || isExpired(record)) {
      removeKey(key);
      return null;
    }
    return record;
  };

  return {
    available: true,

    list(username) {
      if (username === '') {
        return [];
      }
      const records: LocalDraftRecord[] = [];
      for (const flowKey of accountFlowKeys(username)) {
        const record = readKey(username, flowKey);
        if (record !== null) {
          records.push(record);
        }
      }
      return records.sort(
        (first, second) => Date.parse(second.changedAt) - Date.parse(first.changedAt)
      );
    },

    read(username, flowKey) {
      if (username === '' || !isFlowKey(flowKey)) {
        return null;
      }
      return readKey(username, flowKey);
    },

    write(username, record) {
      if (username === '' || closed.has(username) || !isFlowKey(record.flowKey)) {
        return false;
      }
      try {
        storage.setItem(storageKeyOf(username, record.flowKey), serializeRecord(record));
        return true;
      } catch {
        // Quota exceeded or blocked (FR-021)
        return false;
      }
    },

    remove(username, flowKey) {
      if (username !== '' && isFlowKey(flowKey)) {
        removeKey(storageKeyOf(username, flowKey));
      }
    },

    removeAll(username) {
      if (username === '') {
        return 0;
      }
      return accountFlowKeys(username).filter((flowKey) =>
        removeKey(storageKeyOf(username, flowKey))
      ).length;
    },

    close(username) {
      closed.add(username);
    },

    reopen(username) {
      closed.delete(username);
    },
  };
}

// The flushes of the flows that have a pending write. UserMenu calls flushPendingLocalDrafts()
// before it lists the account's records, so the sign-out warning counts the work of the last
// second too (R11)
const flushes = new Set<() => void>();

/** Registers a flow's flush; the returned function unregisters it */
export function registerFlush(flush: () => void): () => void {
  const entry = () => flush();
  flushes.add(entry);
  return () => {
    flushes.delete(entry);
  };
}

/** Calls every registered flush */
export function flushPendingLocalDrafts(): void {
  for (const flush of [...flushes]) {
    flush();
  }
}
