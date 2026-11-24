import type { DocumentField } from '@konnekt/api-types/document-types';
import type {
  BranchInput,
  FormConnectionDraft,
  GroupItem,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';
import { rule } from '@konnekt/rules/testData';
import { describe, expect, it } from 'vitest';

import type { LocalDraftContent, LocalDraftRecord } from '../../utils/localDrafts/types';
import {
  draftFlowReducer,
  initialDraftFlowState,
  initialStepOf,
  linkTargetOf,
  reloadedOf,
  restoreChoiceOf,
  scheduledStartOf,
  storedContentOf,
  withoutLinkParams,
} from './utils';

const DRAFT: FormConnectionDraft = {
  status: 'draft',
  state: 'draft',
  id: 'draft-1',
  name: 'Passenger transport licence',
  description: '',
  documents: [],
  branches: [],
  next_rule_number: 1,
  next_group_number: 1,
  step: 'documents',
  version: 2,
  version_fingerprint: '62D0-715F-01D1',
  created_at: '2026-11-04T10:00:00Z',
  updated_at: '2026-11-04T10:30:00Z',
  last_activity: null,
  example: null,
};

describe('initialStepOf', () => {
  it('opens the documents when the router state asks for them', () => {
    expect(initialStepOf({ step: 'documents' })).toBe('documents');
  });

  it('opens the rules when the router state asks for them', () => {
    expect(initialStepOf({ step: 'rules' })).toBe('rules');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty state', {}],
    ['the connection step', { step: 'connection' }],
    ['the test step, which only a draft opens at', { step: 'test' }],
    ['an unknown step', { step: 'publish' }],
  ])('opens the connection for %s', (_name, state) => {
    expect(initialStepOf(state)).toBe('connection');
  });

  it.each([
    ['connection', 'connection'],
    ['documents', 'documents'],
    ['rules', 'rules'],
    ['test', 'test'],
  ] as const)("opens a draft at the %s step its details' progress asked for", (step, expected) => {
    expect(initialStepOf({ step }, DRAFT)).toBe(expected);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty state', {}],
    ['an unknown step', { step: 'publish' }],
  ])('opens a draft at the step it was saved in for %s', (_name, state) => {
    expect(initialStepOf(state, DRAFT)).toBe('documents');
    expect(initialStepOf(state, { ...DRAFT, step: 'test' })).toBe('test');
  });

  it("opens a link's rules step, which wins over the router state (spec 007, S5)", () => {
    expect(initialStepOf({ step: 'documents' }, undefined, 'rules')).toBe('rules');
    expect(initialStepOf(null, undefined, 'rules')).toBe('rules');
    expect(initialStepOf({ step: 'documents' }, DRAFT, 'rules')).toBe('rules');
    expect(initialStepOf(null, { ...DRAFT, step: 'test' }, 'rules')).toBe('rules');
  });

  it('keeps the router state without a step in the URL', () => {
    expect(initialStepOf({ step: 'documents' }, undefined, null)).toBe('documents');
    expect(initialStepOf({ step: 'test' }, DRAFT, null)).toBe('test');
  });
});

function group(number: number, items: RuleTreeItem[]): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name: `Group 0${number}`,
    mark: null,
    operator: 'and',
    message: null,
    items,
  };
}

describe('linkTargetOf (spec 007, S5; FR-030, FR-031)', () => {
  const MAIN = '5d1f9a2b-3c4e-4f60-8a7b-9c0d1e2f3a4b';
  const AMBULANCE = '7e2a0b3c-4d5f-4a61-9b8c-0d1e2f3a4b5c';
  const BRANCHES: Pick<BranchInput, 'id' | 'items'>[] = [
    { id: MAIN, items: [rule(1, null, null), group(1, [rule(2, null, null)])] },
    { id: AMBULANCE, items: [rule(3, null, null)] },
  ];

  function params(query: string): URLSearchParams {
    return new URLSearchParams(query);
  }

  it("opens a rule's variant and the rule", () => {
    expect(linkTargetOf(params(`step=rules&variant=${AMBULANCE}&item=rule-3`), BRANCHES)).toEqual({
      variantId: AMBULANCE,
      itemId: 'rule-3',
      notice: null,
    });
  });

  it('finds a group, and a rule in a group', () => {
    expect(linkTargetOf(params(`step=rules&variant=${MAIN}&item=group-1`), BRANCHES)).toEqual({
      variantId: MAIN,
      itemId: 'group-1',
      notice: null,
    });
    expect(linkTargetOf(params(`step=rules&variant=${MAIN}&item=rule-2`), BRANCHES).itemId).toBe(
      'rule-2'
    );
  });

  it("opens a variant's link without an item", () => {
    expect(linkTargetOf(params(`step=rules&variant=${AMBULANCE}`), BRANCHES)).toEqual({
      variantId: AMBULANCE,
      itemId: null,
      notice: null,
    });
  });

  it('says that the variant no longer exists, and opens nothing in its place', () => {
    const gone = '9f8e7d6c-5b4a-4321-8fed-cba987654321';
    expect(linkTargetOf(params(`step=rules&variant=${gone}&item=rule-1`), BRANCHES)).toEqual({
      variantId: null,
      itemId: null,
      notice: 'variant',
    });
  });

  it('says that the rule or group no longer exists, and shows the variant', () => {
    expect(linkTargetOf(params(`step=rules&variant=${MAIN}&item=rule-3`), BRANCHES)).toEqual({
      variantId: MAIN,
      itemId: null,
      notice: 'item',
    });
    expect(linkTargetOf(params(`step=rules&variant=${MAIN}&item=group-4`), BRANCHES)).toEqual({
      variantId: MAIN,
      itemId: null,
      notice: 'item',
    });
  });

  it('names nothing without step=rules or a variant', () => {
    const none = { variantId: null, itemId: null, notice: null };
    expect(linkTargetOf(params(''), BRANCHES)).toEqual(none);
    expect(linkTargetOf(params(`variant=${MAIN}&item=rule-1`), BRANCHES)).toEqual(none);
    expect(linkTargetOf(params(`step=documents&variant=${MAIN}`), BRANCHES)).toEqual(none);
    expect(linkTargetOf(params('step=rules&item=rule-1'), BRANCHES)).toEqual(none);
  });

  it('matches no variant without an id, such as one added but not yet saved', () => {
    expect(
      linkTargetOf(params(`step=rules&variant=${MAIN}`), [{ id: null, items: [] }]).notice
    ).toBe('variant');
  });
});

describe('withoutLinkParams (spec 007, S5)', () => {
  it("takes the link's step, variant and item out, and keeps any other parameter", () => {
    const params = new URLSearchParams('step=rules&variant=v-1&item=rule-2&other=kept');
    expect(withoutLinkParams(params).toString()).toBe('other=kept');
  });

  it('leaves the parameters it was given unchanged', () => {
    const params = new URLSearchParams('step=rules&variant=v-1');
    withoutLinkParams(params);
    expect(params.toString()).toBe('step=rules&variant=v-1');
  });
});

describe('reloadedOf (spec 005, S2)', () => {
  it("is true after a draft conflict's Reload from a resumed local draft", () => {
    expect(reloadedOf({ reloaded: true })).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty state', {}],
    ['a step only', { step: 'rules' }],
    ['reloaded false', { reloaded: false }],
    ['a reloaded that is not a boolean', { reloaded: 'yes' }],
  ])('is false for %s', (_name, state) => {
    expect(reloadedOf(state)).toBe(false);
  });
});

describe('restoreChoiceOf (contracts/local-drafts.md "Rules for callers" 2; FR-016)', () => {
  function field(key: string): DocumentField {
    return {
      key,
      label: key,
      kind: 'text',
      option_set: null,
      date_of_birth: false,
      parts: null,
      multiple_values: false,
    };
  }

  /** A stored draft's variants have ids (spec 007, research R10) */
  const MAIN: BranchInput = {
    id: '5d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6',
    name: 'Standard',
    description: null,
    origin: 'main',
    operator: 'and',
    operator_mark: null,
    items: [
      {
        type: 'rule',
        id: 'rule-1',
        name: 'Rule 01',
        mark: null,
        target: { document_type: 'pid', field: 'birthdate', part: null, licence_class: null },
        condition: { operator: 'at_least_years_ago', years: 21 },
        message: 'You must be at least 21.',
      },
    ],
  };

  const STORED: FormConnectionDraft = {
    ...DRAFT,
    description: 'PT-1',
    documents: [{ document_type: 'pid', label: 'Personal ID', fields: [field('birthdate')] }],
    branches: [MAIN],
    next_rule_number: 2,
    next_group_number: 1,
  };

  /** The stored draft's content, written out as the record holds it */
  const STORED_CONTENT: LocalDraftContent = {
    name: 'Passenger transport licence',
    description: 'PT-1',
    documents: [{ document_type: 'pid', fields: ['birthdate'] }],
    branches: [MAIN],
    numberingBase: { rule: 2, group: 1 },
    counters: { rule: 2, group: 1 },
  };

  function recordOf(content: LocalDraftContent): LocalDraftRecord {
    return {
      format: 2,
      flowKey: 'draft-draft-1',
      draftId: 'draft-1',
      draftVersion: 2,
      changedAt: '2026-11-04T14:32:00Z',
      step: 'rules',
      content,
    };
  }

  /** The same value with every object's keys in the reverse order */
  function reversedKeys<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((item: unknown) => reversedKeys(item)) as T;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value)
          .reverse()
          .map(([key, item]) => [key, reversedKeys(item)])
      ) as T;
    }
    return value;
  }

  it('is the stored draft as the editor opens it', () => {
    expect(storedContentOf(STORED)).toEqual(STORED_CONTENT);
  });

  it('has nothing to restore without a record', () => {
    expect(restoreChoiceOf(null, STORED)).toBe('none');
  });

  it("finds the stored draft's own content the same", () => {
    expect(restoreChoiceOf(recordOf(STORED_CONTENT), STORED)).toBe('same');
  });

  it('finds the same content written in a different key order the same', () => {
    const reordered = reversedKeys(STORED_CONTENT);
    expect(Object.keys(reordered)[0]).toBe('counters');
    expect(restoreChoiceOf(recordOf(reordered), STORED)).toBe('same');
  });

  it("ignores the record's step, version and time, which aren't content", () => {
    const record = {
      ...recordOf(STORED_CONTENT),
      step: 'connection' as const,
      draftVersion: 1,
      changedAt: '2026-10-01T08:00:00Z',
    };
    expect(restoreChoiceOf(record, STORED)).toBe('same');
  });

  it.each<[string, Partial<LocalDraftContent>]>([
    ['the name', { name: 'Taxi licence' }],
    ['the description', { description: 'PT-2' }],
    ['the documents', { documents: [{ document_type: 'pid', fields: [] }] }],
    ['the rules', { branches: [{ ...MAIN, items: [] }] }],
    ['a variant', { branches: [MAIN, { ...MAIN, name: 'Taxi', origin: 'empty', items: [] }] }],
    ['the counters', { counters: { rule: 3, group: 1 } }],
    ['the numbering base', { numberingBase: { rule: 1, group: 1 } }],
  ])('asks when the record changes %s', (_name, change) => {
    expect(restoreChoiceOf(recordOf({ ...STORED_CONTENT, ...change }), STORED)).toBe('ask');
  });

  it('finds a record saved before variants had ids the same, unless it holds changes', () => {
    const withoutIds = { ...STORED_CONTENT, branches: [{ ...MAIN, id: null }] };
    expect(restoreChoiceOf(recordOf(withoutIds), STORED)).toBe('same');
    const changed = { ...withoutIds, branches: [{ ...MAIN, id: null, items: [] }] };
    expect(restoreChoiceOf(recordOf(changed), STORED)).toBe('ask');
  });

  it("asks when the record holds changes to a draft that changed since, as it can't tell", () => {
    const changed = { ...STORED, name: 'Renamed elsewhere', version: 3 };
    expect(restoreChoiceOf(recordOf(STORED_CONTENT), changed)).toBe('ask');
  });
});

describe('the restore question (S5)', () => {
  const RECORD: LocalDraftRecord = {
    format: 2,
    flowKey: 'draft-draft-1',
    draftId: 'draft-1',
    draftVersion: 2,
    changedAt: '2026-11-04T14:32:00Z',
    step: 'rules',
    content: {
      name: 'Passenger transport licence',
      description: '',
      documents: [],
      branches: [],
      numberingBase: { rule: 1, group: 1 },
      counters: { rule: 1, group: 1 },
    },
  };

  it('asks only about a record with changes', () => {
    expect(initialDraftFlowState(RECORD, 'ask')).toEqual({ kind: 'asking', record: RECORD });
    expect(initialDraftFlowState(RECORD, 'same')).toEqual({ kind: 'open', restored: null });
    expect(initialDraftFlowState(null, 'none')).toEqual({ kind: 'open', restored: null });
  });

  it('opens the record\'s changes on "Restore changes"', () => {
    const asking = initialDraftFlowState(RECORD, 'ask');
    expect(draftFlowReducer(asking, { type: 'restore' })).toEqual({
      kind: 'open',
      restored: RECORD,
    });
  });

  it('opens the stored draft on "Discard them"', () => {
    const asking = initialDraftFlowState(RECORD, 'ask');
    expect(draftFlowReducer(asking, { type: 'discard' })).toEqual({ kind: 'open', restored: null });
  });

  it('keeps an open flow as it is', () => {
    const open = { kind: 'open', restored: RECORD } as const;
    expect(draftFlowReducer(open, { type: 'discard' })).toBe(open);
  });
});

describe('scheduledStartOf', () => {
  it('answers the start date of a scheduled connection', () => {
    expect(scheduledStartOf({ state: 'scheduled', start_date: '2026-12-01' })).toBe('2026-12-01');
  });

  it('answers null for an active or deactivated connection, and without one', () => {
    expect(scheduledStartOf({ state: 'live', start_date: null })).toBeNull();
    expect(scheduledStartOf({ state: 'deactivated', start_date: null })).toBeNull();
    expect(scheduledStartOf(undefined)).toBeNull();
  });
});
