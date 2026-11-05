import { describe, expect, it } from 'vitest';

import type { DocumentField } from '../../types/document-types';
import type { BranchInput, FormConnectionDraft } from '../../types/form-connections';
import type { LocalDraftContent, LocalDraftRecord } from '../../utils/localDrafts/types';
import {
  draftFlowReducer,
  initialDraftFlowState,
  initialStepOf,
  reloadedOf,
  restoreChoiceOf,
  storedContentOf,
} from './utils';

const DRAFT: FormConnectionDraft = {
  status: 'draft',
  id: 'draft-1',
  name: 'Passenger transport licence',
  description: '',
  documents: [],
  branches: [],
  next_rule_number: 1,
  next_group_number: 1,
  step: 'documents',
  version: 2,
  created_at: '2026-11-04T10:00:00Z',
  updated_at: '2026-11-04T10:30:00Z',
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

  const MAIN: BranchInput = {
    id: null,
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
