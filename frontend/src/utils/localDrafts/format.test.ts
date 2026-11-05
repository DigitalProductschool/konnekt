import { describe, expect, it } from 'vitest';

import type { GroupItem, RuleItem } from '../../types/form-connections';
import { parseRecord, serializeRecord } from './format';
import { flowKeyOfDraft, newFlowKey } from './keys';
import type { LocalDraftRecord } from './types';

const NEW_KEY = newFlowKey('0b6f3c1e-5d2a-4c8e-9f10-7a3b2c1d4e5f');
const DRAFT_ID = 'c4e2a9b1-7f3d-4e6a-8b5c-1d2e3f4a5b6c';
const DRAFT_KEY = flowKeyOfDraft(DRAFT_ID);

const RULE: RuleItem = {
  type: 'rule',
  id: 'rule-2',
  name: 'Adult',
  mark: null,
  target: { document_type: 'pid', field: 'birth_date', part: null, licence_class: null },
  condition: { operator: 'at_least_years_ago', years: 18 },
  message: 'You must be 18 or older.',
};

const OPEN_RULE: RuleItem = { ...RULE, id: 'rule-3', name: '', target: null, condition: null };

const GROUP: GroupItem = {
  type: 'group',
  id: 'group-1',
  name: 'Residence',
  mark: null,
  operator: 'or',
  message: null,
  items: [RULE, { ...RULE, id: 'rule-1' }, { ...OPEN_RULE }],
};

/** A valid record of a stored draft with nested groups */
function draftRecord(): LocalDraftRecord {
  return {
    format: 2,
    flowKey: DRAFT_KEY,
    draftId: DRAFT_ID,
    draftVersion: 3,
    changedAt: '2026-11-04T09:30:00.000Z',
    step: 'rules',
    content: {
      name: 'Parking permit',
      description: 'F-123',
      documents: [{ document_type: 'pid', fields: ['given_name', 'birth_date'] }],
      branches: [
        {
          id: 'b1',
          name: 'Standard',
          description: null,
          origin: 'main',
          operator: 'and',
          operator_mark: null,
          items: [RULE, { ...GROUP, items: [...GROUP.items, { ...GROUP, id: 'group-2' }] }],
        },
        {
          id: null,
          name: 'Students',
          description: 'For students',
          origin: 'based',
          operator: 'or',
          operator_mark: 'changed',
          items: [],
        },
      ],
      numberingBase: { rule: 3, group: 2 },
      counters: { rule: 4, group: 3 },
    },
  };
}

/** A valid record of a new connection */
function newRecord(): LocalDraftRecord {
  return {
    format: 2,
    flowKey: NEW_KEY,
    draftId: null,
    draftVersion: null,
    changedAt: '2026-11-04T09:30:00.000+01:00',
    step: 'connection',
    content: {
      name: '',
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

/** The draft record serialised, with `edit` applied to a plain copy first */
function rawWith(edit: (record: Record<string, unknown>) => void): string {
  const record = JSON.parse(serializeRecord(draftRecord())) as Record<string, unknown>;
  edit(record);
  return JSON.stringify(record);
}

/** The record's content as a plain object, for edits */
function contentIn(record: Record<string, unknown>): Record<string, unknown> {
  return record.content as Record<string, unknown>;
}

/** The main branch of a plain copy */
function mainIn(record: Record<string, unknown>): Record<string, unknown> {
  return (contentIn(record).branches as Record<string, unknown>[])[0];
}

/** The group at the main branch's second position, of a plain copy */
function groupIn(record: Record<string, unknown>): Record<string, unknown> {
  return (mainIn(record).items as Record<string, unknown>[])[1];
}

describe('valid records', () => {
  it('round-trips a stored draft', () => {
    const record = draftRecord();
    expect(parseRecord(serializeRecord(record), DRAFT_KEY)).toEqual(record);
  });

  it('round-trips a new connection', () => {
    const record = newRecord();
    expect(parseRecord(serializeRecord(record), NEW_KEY)).toEqual(record);
  });

  it('serialises as JSON', () => {
    const record = draftRecord();
    expect(serializeRecord(record)).toBe(JSON.stringify(record));
  });

  it('drops unknown fields at the record and content levels', () => {
    const raw = rawWith((record) => {
      record.extra = true;
      contentIn(record).personas = [{ name: 'Alice' }];
    });
    const parsed = parseRecord(raw, DRAFT_KEY);
    expect(parsed).toEqual(draftRecord());
    expect(parsed).not.toHaveProperty('extra');
    expect(parsed?.content).not.toHaveProperty('personas');
  });

  it('accepts a rule whose target and condition are not yet set', () => {
    const raw = rawWith((record) => {
      mainIn(record).items = [OPEN_RULE];
    });
    expect(parseRecord(raw, DRAFT_KEY)?.content.branches[0].items).toEqual([OPEN_RULE]);
  });
});

describe('invalid records', () => {
  it.each([
    ['empty', ''],
    ['not JSON', '{format: 1}'],
    ['truncated', serializeRecord(draftRecord()).slice(0, -1)],
    ['null', 'null'],
    ['a number', '1'],
    ['a string', '"record"'],
    ['an array', '[]'],
  ])('rejects %s', (_label, raw) => {
    expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
  });

  it('rejects another format', () => {
    for (const format of [1, 3, 0, '2', null]) {
      expect(
        parseRecord(
          rawWith((record) => (record.format = format)),
          DRAFT_KEY
        )
      ).toBeNull();
    }
    expect(
      parseRecord(
        rawWith((record) => delete record.format),
        DRAFT_KEY
      )
    ).toBeNull();
  });

  it('rejects a format-1 record with the form ID, without converting it', () => {
    const raw = rawWith((record) => {
      record.format = 1;
      contentIn(record).servicebwForm = 'F-123';
      delete contentIn(record).description;
    });
    expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
  });

  it('rejects a format-2 record with the form ID instead of a description', () => {
    const raw = rawWith((record) => {
      contentIn(record).servicebwForm = 'F-123';
      delete contentIn(record).description;
    });
    expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
  });

  it("rejects a flow key that doesn't match the key's", () => {
    const raw = serializeRecord(draftRecord());
    expect(parseRecord(raw, NEW_KEY)).toBeNull();
    expect(parseRecord(raw, flowKeyOfDraft('d4e2a9b1-7f3d-4e6a-8b5c-1d2e3f4a5b6c'))).toBeNull();
    expect(
      parseRecord(
        rawWith((record) => (record.flowKey = NEW_KEY)),
        DRAFT_KEY
      )
    ).toBeNull();
  });

  it('rejects a key that is not a flow key, even when the record repeats it', () => {
    for (const flowKey of ['', 'new-', 'draft-', 'garbage']) {
      const raw = rawWith((record) => (record.flowKey = flowKey));
      expect(parseRecord(raw, flowKey)).toBeNull();
    }
  });

  it("rejects a draftId that doesn't fit the flow key", () => {
    for (const draftId of [null, 'other', 3, undefined]) {
      expect(
        parseRecord(
          rawWith((record) => (record.draftId = draftId)),
          DRAFT_KEY
        )
      ).toBeNull();
    }
    const withId = JSON.stringify({ ...newRecord(), draftId: DRAFT_ID });
    expect(parseRecord(withId, NEW_KEY)).toBeNull();
  });

  it('rejects a draftVersion that is not a number or null', () => {
    for (const draftVersion of ['3', 1.5, true, {}, undefined]) {
      const raw = rawWith((record) => (record.draftVersion = draftVersion));
      expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
    }
    expect(
      parseRecord(
        rawWith((record) => (record.draftVersion = null)),
        DRAFT_KEY
      )
    ).not.toBeNull();
  });

  it('rejects a changedAt that is not a date', () => {
    for (const changedAt of ['yesterday', '', 1730000000000, null]) {
      const raw = rawWith((record) => (record.changedAt = changedAt));
      expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
    }
  });

  it('rejects a step that is not one of the four', () => {
    for (const step of ['publish', 'Rules', '', 2, null]) {
      expect(
        parseRecord(
          rawWith((record) => (record.step = step)),
          DRAFT_KEY
        )
      ).toBeNull();
    }
    for (const step of ['connection', 'documents', 'rules', 'test']) {
      expect(
        parseRecord(
          rawWith((record) => (record.step = step)),
          DRAFT_KEY
        )?.step
      ).toBe(step);
    }
  });

  it('rejects a content of the wrong type or without a field', () => {
    for (const content of [null, [], 'content', 1]) {
      expect(
        parseRecord(
          rawWith((record) => (record.content = content)),
          DRAFT_KEY
        )
      ).toBeNull();
    }
    for (const field of [
      'name',
      'description',
      'documents',
      'branches',
      'numberingBase',
      'counters',
    ]) {
      const raw = rawWith((record) => delete contentIn(record)[field]);
      expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
    }
  });

  it.each<[string, (content: Record<string, unknown>) => void]>([
    ['a name that is not text', (content) => (content.name = null)],
    ['a description that is not text', (content) => (content.description = 7)],
    ['documents that are not a list', (content) => (content.documents = {})],
    ['a document that is not an object', (content) => (content.documents = ['pid'])],
    ['a document without a type', (content) => (content.documents = [{ fields: ['given_name'] }])],
    [
      'fields that are not a list',
      (content) => (content.documents = [{ document_type: 'pid', fields: 'given_name' }]),
    ],
    [
      'a field that is not text',
      (content) => (content.documents = [{ document_type: 'pid', fields: [1] }]),
    ],
    ['branches that are not a list', (content) => (content.branches = null)],
    ['a numbering base without group', (content) => (content.numberingBase = { rule: 1 })],
    ['counters that are not numbers', (content) => (content.counters = { rule: '1', group: 1 })],
    ['counters that are a list', (content) => (content.counters = [1, 1])],
  ])('rejects %s', (_label, edit) => {
    expect(
      parseRecord(
        rawWith((record) => edit(contentIn(record))),
        DRAFT_KEY
      )
    ).toBeNull();
  });

  it.each<[string, (branch: Record<string, unknown>) => void]>([
    ['without a name', (branch) => delete branch.name],
    ['with another origin', (branch) => (branch.origin = 'copied')],
    ['without an origin', (branch) => delete branch.origin],
    ['with another operator', (branch) => (branch.operator = 'xor')],
    ['with items that are not a list', (branch) => (branch.items = {})],
    ['with an item that is not an object', (branch) => (branch.items = ['rule-1'])],
  ])('rejects a branch %s', (_label, edit) => {
    expect(
      parseRecord(
        rawWith((record) => edit(mainIn(record))),
        DRAFT_KEY
      )
    ).toBeNull();
  });

  it('rejects a branch that is not an object', () => {
    const raw = rawWith((record) => (contentIn(record).branches = ['Standard']));
    expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
  });

  it.each<[string, (rule: Record<string, unknown>) => void]>([
    ['without a type', (rule) => delete rule.type],
    ['of another type', (rule) => (rule.type = 'condition')],
    ['without an id', (rule) => delete rule.id],
    ['with an id that is not text', (rule) => (rule.id = 2)],
    ['without a name', (rule) => delete rule.name],
    ['with a target that is not an object', (rule) => (rule.target = 'pid.birth_date')],
    ['with a target that is a list', (rule) => (rule.target = [])],
    ['without a target', (rule) => delete rule.target],
    ['with a condition that is not an object', (rule) => (rule.condition = 'adult')],
    ['without a condition', (rule) => delete rule.condition],
  ])('rejects a top-level rule %s', (_label, edit) => {
    const raw = rawWith((record) => edit((mainIn(record).items as Record<string, unknown>[])[0]));
    expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
  });

  it.each<[string, (group: Record<string, unknown>) => void]>([
    ['without a type', (group) => delete group.type],
    ['without an operator', (group) => delete group.operator],
    ['with another operator', (group) => (group.operator = 'nand')],
    ['without items', (group) => delete group.items],
    ['with items that are not a list', (group) => (group.items = 'rule-1')],
  ])('rejects a group %s', (_label, edit) => {
    expect(
      parseRecord(
        rawWith((record) => edit(groupIn(record))),
        DRAFT_KEY
      )
    ).toBeNull();
  });

  it('rejects a broken item deep in the tree', () => {
    const raw = rawWith((record) => {
      const subGroup = (groupIn(record).items as Record<string, unknown>[])[3];
      delete (subGroup.items as Record<string, unknown>[])[2].type;
    });
    expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
  });

  it('rejects __proto__ keys at every level', () => {
    const record = serializeRecord(draftRecord());
    const atTop = record.replace('{"format"', '{"__proto__":{"polluted":true},"format"');
    const inContent = record.replace('"content":{', '"content":{"__proto__":{},');
    const inRule = record.replace('"type":"rule"', '"__proto__":null,"type":"rule"');
    for (const raw of [atTop, inContent, inRule]) {
      expect(raw).not.toBe(record);
      expect(parseRecord(raw, DRAFT_KEY)).toBeNull();
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('no input throws', () => {
  it.each([
    ['deeply nested arrays', `${'['.repeat(100000)}${']'.repeat(100000)}`],
    [
      'a deeply nested group',
      serializeRecord(draftRecord()).replace(
        '"items":[]',
        `"items":${'[{"type":"group","id":"group-1","name":"","operator":"and","items":'.repeat(20000)}[]${'}]'.repeat(20000)}`
      ),
    ],
    ['a value of another type', 42 as unknown as string],
    ['undefined', undefined as unknown as string],
  ])('%s', (_label, raw) => {
    expect(() => parseRecord(raw, DRAFT_KEY)).not.toThrow();
  });
});
