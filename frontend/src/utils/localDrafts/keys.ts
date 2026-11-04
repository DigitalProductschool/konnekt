// The storage keys and flow keys of local drafts (specs/005-connection-drafts/contracts/
// local-drafts.md "Format"; research R9, R10)
import { LOCAL_DRAFT_PREFIX } from './constants';

const NEW_PREFIX = 'new-';
const DRAFT_PREFIX = 'draft-';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The key of an account's record: `connection-portal:local-draft:v1:<username>:<flowKey>` */
export function storageKeyOf(username: string, flowKey: string): string {
  return `${LOCAL_DRAFT_PREFIX}${username}:${flowKey}`;
}

/** The flow key of a create flow that was never saved, from `crypto.randomUUID()` */
export function newFlowKey(uuid: string): string {
  return `${NEW_PREFIX}${uuid}`;
}

/** The flow key of a stored draft */
export function flowKeyOfDraft(draftId: string): string {
  return `${DRAFT_PREFIX}${draftId}`;
}

/** The stored draft's id in a `draft-<id>` flow key; null for any other value */
export function draftIdOfFlowKey(flowKey: string): string | null {
  if (!flowKey.startsWith(DRAFT_PREFIX)) {
    return null;
  }
  const id = flowKey.slice(DRAFT_PREFIX.length);
  return UUID.test(id) ? id : null;
}

/** Whether a value is `new-<uuid>` or `draft-<uuid>` */
export function isFlowKey(value: string): boolean {
  if (value.startsWith(NEW_PREFIX)) {
    return UUID.test(value.slice(NEW_PREFIX.length));
  }
  return draftIdOfFlowKey(value) !== null;
}

/**
 * Reads a storage key back, for listing; null for another app's key or a malformed one. A
 * username may contain `:` but a flow key never does, so the key splits at its last `:`
 */
export function parseStorageKey(key: string): { username: string; flowKey: string } | null {
  if (!key.startsWith(LOCAL_DRAFT_PREFIX)) {
    return null;
  }
  const rest = key.slice(LOCAL_DRAFT_PREFIX.length);
  const split = rest.lastIndexOf(':');
  if (split <= 0) {
    return null;
  }
  const username = rest.slice(0, split);
  const flowKey = rest.slice(split + 1);
  return isFlowKey(flowKey) ? { username, flowKey } : null;
}

/**
 * The flow key of a key in the account's part of the storage, valid or not; null for any other
 * key, including those of an account whose username starts with this one and a `:`
 */
export function accountFlowKeyOf(key: string, username: string): string | null {
  const accountPrefix = storageKeyOf(username, '');
  if (username === '' || !key.startsWith(accountPrefix)) {
    return null;
  }
  const flowKey = key.slice(accountPrefix.length);
  return flowKey.includes(':') ? null : flowKey;
}
