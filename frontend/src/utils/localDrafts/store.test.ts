import { describe, expect, it, vi } from 'vitest';

import { LOCAL_DRAFT_MAX_AGE_MS, LOCAL_DRAFT_PREFIX } from './constants';
import { serializeRecord } from './format';
import { flowKeyOfDraft, newFlowKey, storageKeyOf } from './keys';
import { createLocalDraftStore, flushPendingLocalDrafts, registerFlush } from './store';
import { BlockedStorage, FullStorage, MemoryStorage } from './testStorage';
import type { LocalDraftRecord } from './types';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const FLOW_A = newFlowKey('0b6f3c1e-5d2a-4c8e-9f10-7a3b2c1d4e5f');
const FLOW_B = newFlowKey('1b6f3c1e-5d2a-4c8e-9f10-7a3b2c1d4e5f');
const DRAFT_ID = 'c4e2a9b1-7f3d-4e6a-8b5c-1d2e3f4a5b6c';
const FLOW_DRAFT = flowKeyOfDraft(DRAFT_ID);

/** A valid record of `flowKey`, last changed `ageMs` before NOW */
function recordOf(flowKey: string, ageMs = 0, name = 'Parking permit'): LocalDraftRecord {
  const draftId = flowKey === FLOW_DRAFT ? DRAFT_ID : null;
  return {
    format: 2,
    flowKey,
    draftId,
    draftVersion: draftId === null ? null : 2,
    changedAt: new Date(NOW.getTime() - ageMs).toISOString(),
    step: 'documents',
    content: {
      name,
      description: '',
      documents: [],
      branches: [
        {
          id: null,
          name: 'Standard',
          description: null,
          origin: 'main',
          operator: 'and',
          operator_mark: null,
          items: [],
        },
      ],
      numberingBase: { rule: 1, group: 1 },
      counters: { rule: 1, group: 1 },
    },
  };
}

/** The JSON of a format-1 record, holding `servicebwForm` as the app wrote it before spec 006 */
function formatOneEntryOf(flowKey: string): string {
  const { content, ...record } = recordOf(flowKey);
  const { description, ...rest } = content;
  return JSON.stringify({
    ...record,
    format: 1,
    content: { ...rest, servicebwForm: description },
  });
}

/** A store over a fresh in-memory storage, with NOW as the time */
function setUp(storage = new MemoryStorage()) {
  return { storage, store: createLocalDraftStore(storage, () => NOW) };
}

describe('writing and reading', () => {
  it('reads back what it wrote, under the documented key', () => {
    const { storage, store } = setUp();
    const record = recordOf(FLOW_DRAFT);
    expect(store.available).toBe(true);
    expect(store.write('alice', record)).toBe(true);
    expect(storage.getItem(storageKeyOf('alice', FLOW_DRAFT))).toBe(serializeRecord(record));
    expect(store.read('alice', FLOW_DRAFT)).toEqual(record);
    expect(store.read('alice', FLOW_A)).toBeNull();
  });

  it('lists the records newest first', () => {
    const { store } = setUp();
    store.write('alice', recordOf(FLOW_A, 3 * DAY_MS));
    store.write('alice', recordOf(FLOW_DRAFT, 1 * DAY_MS));
    store.write('alice', recordOf(FLOW_B, 2 * DAY_MS));
    expect(store.list('alice').map((record) => record.flowKey)).toEqual([
      FLOW_DRAFT,
      FLOW_B,
      FLOW_A,
    ]);
  });

  it('replaces the record of the same flow', () => {
    const { store } = setUp();
    store.write('alice', recordOf(FLOW_A, 0, 'First'));
    store.write('alice', recordOf(FLOW_A, 0, 'Second'));
    expect(store.list('alice').map((record) => record.content.name)).toEqual(['Second']);
  });

  it('removes one record', () => {
    const { store } = setUp();
    store.write('alice', recordOf(FLOW_A));
    store.write('alice', recordOf(FLOW_B));
    store.remove('alice', FLOW_A);
    expect(store.read('alice', FLOW_A)).toBeNull();
    expect(store.list('alice').map((record) => record.flowKey)).toEqual([FLOW_B]);
  });

  it('refuses a record whose flow key is not one', () => {
    const { storage, store } = setUp();
    expect(store.write('alice', { ...recordOf(FLOW_A), flowKey: 'garbage' })).toBe(false);
    expect(store.write('', recordOf(FLOW_A))).toBe(false);
    expect(storage.length).toBe(0);
  });
});

describe('accounts', () => {
  it('keeps two accounts apart', () => {
    const { store } = setUp();
    store.write('alice', recordOf(FLOW_A, 0, 'Alice’s'));
    store.write('bob', recordOf(FLOW_A, 0, 'Bob’s'));
    store.write('bob', recordOf(FLOW_B));
    expect(store.list('alice').map((record) => record.content.name)).toEqual(['Alice’s']);
    expect(store.read('bob', FLOW_A)?.content.name).toBe('Bob’s');
    store.remove('alice', FLOW_A);
    expect(store.read('bob', FLOW_A)).not.toBeNull();
    expect(store.removeAll('bob')).toBe(2);
    expect(store.list('alice')).toHaveLength(0);
    expect(store.list('bob')).toHaveLength(0);
  });

  it('keeps apart a username that starts with another one and a colon', () => {
    const { store } = setUp();
    store.write('alice', recordOf(FLOW_A));
    store.write('alice:x', recordOf(FLOW_B));
    expect(store.list('alice').map((record) => record.flowKey)).toEqual([FLOW_A]);
    expect(store.list('alice:x').map((record) => record.flowKey)).toEqual([FLOW_B]);
    expect(store.removeAll('alice')).toBe(1);
    expect(store.list('alice:x')).toHaveLength(1);
  });
});

describe('expiry', () => {
  it('lists a record until it is 30 days old, and removes it then', () => {
    const { storage, store } = setUp();
    store.write('alice', recordOf(FLOW_A, LOCAL_DRAFT_MAX_AGE_MS - 1));
    store.write('alice', recordOf(FLOW_B, LOCAL_DRAFT_MAX_AGE_MS));
    store.write('alice', recordOf(FLOW_DRAFT, 45 * DAY_MS));
    expect(store.list('alice').map((record) => record.flowKey)).toEqual([FLOW_A]);
    expect(storage.length).toBe(1);
  });

  it('removes an expired record when it is read', () => {
    const { storage } = setUp();
    const later = createLocalDraftStore(storage, () => new Date(NOW.getTime() + 31 * DAY_MS));
    const store = createLocalDraftStore(storage, () => NOW);
    store.write('alice', recordOf(FLOW_A));
    expect(store.read('alice', FLOW_A)).not.toBeNull();
    expect(later.read('alice', FLOW_A)).toBeNull();
    expect(storage.length).toBe(0);
  });

  it("doesn't expire a record changed in the future of this device's clock", () => {
    const { store } = setUp();
    store.write('alice', recordOf(FLOW_A, -DAY_MS));
    expect(store.list('alice')).toHaveLength(1);
  });
});

describe('invalid records', () => {
  it("removes the account's invalid entries on list", () => {
    const { storage, store } = setUp();
    store.write('alice', recordOf(FLOW_A));
    storage.setItem(storageKeyOf('alice', FLOW_B), '{broken');
    storage.setItem(storageKeyOf('alice', FLOW_DRAFT), serializeRecord(recordOf(FLOW_B)));
    storage.setItem(`${LOCAL_DRAFT_PREFIX}alice:garbage`, serializeRecord(recordOf(FLOW_A)));
    storage.setItem(`${LOCAL_DRAFT_PREFIX}alice:`, '{}');
    expect(store.list('alice').map((record) => record.flowKey)).toEqual([FLOW_A]);
    expect([...storage.entries.keys()]).toEqual([storageKeyOf('alice', FLOW_A)]);
  });

  it('removes an invalid entry on read', () => {
    const { storage, store } = setUp();
    storage.setItem(storageKeyOf('alice', FLOW_A), JSON.stringify({ format: 3 }));
    expect(store.read('alice', FLOW_A)).toBeNull();
    expect(storage.length).toBe(0);
  });

  it('skips and removes a format-1 entry on list', () => {
    const { storage, store } = setUp();
    const record = recordOf(FLOW_A);
    storage.setItem(storageKeyOf('alice', FLOW_A), serializeRecord(record));
    storage.setItem(storageKeyOf('alice', FLOW_B), formatOneEntryOf(FLOW_B));
    expect(store.list('alice')).toEqual([record]);
    expect(storage.getItem(storageKeyOf('alice', FLOW_B))).toBeNull();
    expect(storage.getItem(storageKeyOf('alice', FLOW_A))).toBe(serializeRecord(record));
    expect(storage.length).toBe(1);
  });

  it('removes a format-1 entry on read', () => {
    const { storage, store } = setUp();
    storage.setItem(storageKeyOf('alice', FLOW_A), formatOneEntryOf(FLOW_A));
    expect(store.read('alice', FLOW_A)).toBeNull();
    expect(storage.length).toBe(0);
  });

  it("leaves other apps' keys and other accounts' invalid entries alone", () => {
    const { storage, store } = setUp();
    const others = [
      ['theme', 'light'],
      [`connection-portal:local-draft:v2:alice:${FLOW_A}`, '{}'],
      [`connection-portal:other:alice:${FLOW_A}`, '{}'],
      [`alice:${FLOW_A}`, '{}'],
      [storageKeyOf('bob', FLOW_A), '{broken'],
      [storageKeyOf('alice:bob', FLOW_A), '{broken'],
    ];
    for (const [key, value] of others) {
      storage.setItem(key, value);
    }
    store.write('alice', recordOf(FLOW_A));
    expect(store.list('alice')).toHaveLength(1);
    expect(store.removeAll('alice')).toBe(1);
    expect([...storage.entries]).toEqual(others);
  });
});

describe('a failing storage', () => {
  it('gives false on a full storage, without throwing', () => {
    const storage = new FullStorage();
    const store = createLocalDraftStore(storage, () => NOW);
    expect(store.available).toBe(true);
    expect(store.write('alice', recordOf(FLOW_A))).toBe(false);
    expect(store.list('alice')).toEqual([]);
  });

  it('reads as empty when every access throws', () => {
    const store = createLocalDraftStore(new BlockedStorage(), () => NOW);
    expect(store.list('alice')).toEqual([]);
    expect(store.read('alice', FLOW_A)).toBeNull();
    expect(store.write('alice', recordOf(FLOW_A))).toBe(false);
    expect(() => store.remove('alice', FLOW_A)).not.toThrow();
    expect(store.removeAll('alice')).toBe(0);
  });

  it('skips the keys that fail to read', () => {
    const storage = new MemoryStorage();
    const store = createLocalDraftStore(storage, () => NOW);
    store.write('alice', recordOf(FLOW_A));
    store.write('alice', recordOf(FLOW_B));
    const key = storage.key.bind(storage);
    vi.spyOn(storage, 'key').mockImplementation((index) => {
      if (index === 0) {
        throw new Error('blocked');
      }
      return key(index);
    });
    expect(store.list('alice').map((record) => record.flowKey)).toEqual([FLOW_B]);
  });

  it('is unavailable without a storage, and does nothing', () => {
    const store = createLocalDraftStore(null, () => NOW);
    expect(store.available).toBe(false);
    expect(store.write('alice', recordOf(FLOW_A))).toBe(false);
    expect(store.list('alice')).toEqual([]);
    expect(store.read('alice', FLOW_A)).toBeNull();
    expect(store.removeAll('alice')).toBe(0);
    expect(() => {
      store.remove('alice', FLOW_A);
      store.close('alice');
      store.reopen('alice');
    }).not.toThrow();
  });
});

describe('closing an account', () => {
  it('refuses the account’s writes until it is reopened', () => {
    const { store } = setUp();
    store.close('alice');
    expect(store.write('alice', recordOf(FLOW_A))).toBe(false);
    expect(store.write('bob', recordOf(FLOW_A))).toBe(true);
    expect(store.list('alice')).toEqual([]);
    store.reopen('alice');
    expect(store.write('alice', recordOf(FLOW_A))).toBe(true);
    expect(store.list('alice')).toHaveLength(1);
  });

  it('still reads and removes the account’s records while it is closed', () => {
    const { store } = setUp();
    store.write('alice', recordOf(FLOW_A));
    store.close('alice');
    expect(store.read('alice', FLOW_A)).not.toBeNull();
    expect(store.removeAll('alice')).toBe(1);
  });
});

describe('removeAll', () => {
  it('counts the entries it removed, invalid ones included', () => {
    const { storage, store } = setUp();
    expect(store.removeAll('alice')).toBe(0);
    store.write('alice', recordOf(FLOW_A));
    store.write('alice', recordOf(FLOW_B));
    store.write('alice', recordOf(FLOW_DRAFT, 40 * DAY_MS));
    storage.setItem(storageKeyOf('alice', newFlowKey('2b6f3c1e-5d2a-4c8e-9f10-7a3b2c1d4e5f')), '{');
    store.write('bob', recordOf(FLOW_A));
    expect(store.removeAll('alice')).toBe(4);
    expect(store.list('alice')).toEqual([]);
    expect(store.list('bob')).toHaveLength(1);
  });
});

describe('the flush registry', () => {
  it('calls every registered flush until it is unregistered', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unregisterFirst = registerFlush(first);
    const unregisterSecond = registerFlush(second);
    flushPendingLocalDrafts();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    unregisterFirst();
    flushPendingLocalDrafts();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);

    unregisterSecond();
    flushPendingLocalDrafts();
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('keeps a flush registered twice until both are unregistered', () => {
    const flush = vi.fn();
    const unregisterOnce = registerFlush(flush);
    const unregisterTwice = registerFlush(flush);
    unregisterOnce();
    flushPendingLocalDrafts();
    expect(flush).toHaveBeenCalledTimes(1);
    unregisterTwice();
    flushPendingLocalDrafts();
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a registered flush', () => {
    expect(() => flushPendingLocalDrafts()).not.toThrow();
  });
});
