import { describe, expect, it } from 'vitest';

import { LOCAL_DRAFT_PREFIX } from './constants';
import {
  accountFlowKeyOf,
  draftIdOfFlowKey,
  flowKeyOfDraft,
  isFlowKey,
  newFlowKey,
  parseStorageKey,
  storageKeyOf,
} from './keys';

const UUID = '0b6f3c1e-5d2a-4c8e-9f10-7a3b2c1d4e5f';
const DRAFT_ID = 'c4e2a9b1-7f3d-4e6a-8b5c-1d2e3f4a5b6c';

describe('flow keys', () => {
  it('builds the two forms', () => {
    expect(newFlowKey(UUID)).toBe(`new-${UUID}`);
    expect(flowKeyOfDraft(DRAFT_ID)).toBe(`draft-${DRAFT_ID}`);
  });

  it('accepts both forms', () => {
    expect(isFlowKey(newFlowKey(UUID))).toBe(true);
    expect(isFlowKey(flowKeyOfDraft(DRAFT_ID))).toBe(true);
    expect(isFlowKey(`new-${UUID.toUpperCase()}`)).toBe(true);
  });

  it.each([
    '',
    'new-',
    'draft-',
    UUID,
    `old-${UUID}`,
    `published-${UUID}`,
    `new-${UUID}x`,
    `new-${UUID.slice(1)}`,
    `draft-${DRAFT_ID}:x`,
    `new-new-${UUID}`,
    ` new-${UUID}`,
  ])('rejects %j', (value) => {
    expect(isFlowKey(value)).toBe(false);
  });

  it('reads the draft id back from a draft- key only', () => {
    expect(draftIdOfFlowKey(flowKeyOfDraft(DRAFT_ID))).toBe(DRAFT_ID);
    expect(draftIdOfFlowKey(newFlowKey(UUID))).toBeNull();
    expect(draftIdOfFlowKey('draft-')).toBeNull();
    expect(draftIdOfFlowKey('draft-abc')).toBeNull();
  });
});

describe('storage keys', () => {
  it('has the documented format', () => {
    expect(storageKeyOf('alice', newFlowKey(UUID))).toBe(
      `connection-portal:local-draft:v1:alice:new-${UUID}`
    );
  });

  it('round-trips', () => {
    for (const flowKey of [newFlowKey(UUID), flowKeyOfDraft(DRAFT_ID)]) {
      expect(parseStorageKey(storageKeyOf('alice', flowKey))).toEqual({
        username: 'alice',
        flowKey,
      });
    }
  });

  it('round-trips a username with colons', () => {
    const flowKey = flowKeyOfDraft(DRAFT_ID);
    expect(parseStorageKey(storageKeyOf('team:alice:', flowKey))).toEqual({
      username: 'team:alice:',
      flowKey,
    });
  });

  it.each([
    `${LOCAL_DRAFT_PREFIX}alice:`,
    `${LOCAL_DRAFT_PREFIX}alice:new-`,
    `${LOCAL_DRAFT_PREFIX}alice:draft-`,
    `${LOCAL_DRAFT_PREFIX}alice:garbage`,
    `${LOCAL_DRAFT_PREFIX}:new-${UUID}`,
    `${LOCAL_DRAFT_PREFIX}new-${UUID}`,
    LOCAL_DRAFT_PREFIX,
  ])('rejects the malformed key %j', (key) => {
    expect(parseStorageKey(key)).toBeNull();
  });

  it.each([
    `connection-portal:local-draft:v2:alice:new-${UUID}`,
    `other-app:alice:new-${UUID}`,
    `alice:new-${UUID}`,
    'theme',
    '',
  ])("rejects another app's key %j", (key) => {
    expect(parseStorageKey(key)).toBeNull();
  });
});

describe("an account's keys", () => {
  it("gives the flow key of the account's keys, valid or not", () => {
    expect(accountFlowKeyOf(storageKeyOf('alice', newFlowKey(UUID)), 'alice')).toBe(
      newFlowKey(UUID)
    );
    expect(accountFlowKeyOf(`${LOCAL_DRAFT_PREFIX}alice:garbage`, 'alice')).toBe('garbage');
  });

  it("leaves other accounts' keys alone, also those that start with the username", () => {
    const key = storageKeyOf('alice:bob', newFlowKey(UUID));
    expect(accountFlowKeyOf(key, 'alice')).toBeNull();
    expect(accountFlowKeyOf(key, 'alice:bob')).toBe(newFlowKey(UUID));
    expect(accountFlowKeyOf(storageKeyOf('bob', newFlowKey(UUID)), 'alice')).toBeNull();
    expect(accountFlowKeyOf(storageKeyOf('alicia', newFlowKey(UUID)), 'alice')).toBeNull();
  });

  it("leaves other apps' keys alone", () => {
    expect(accountFlowKeyOf(`other:alice:new-${UUID}`, 'alice')).toBeNull();
    expect(accountFlowKeyOf(storageKeyOf('', newFlowKey(UUID)), '')).toBeNull();
  });
});
