import { describe, expect, it } from 'vitest';

import type { FormConnectionDraft } from '../../types/form-connections';
import { initialStepOf } from './utils';

const DRAFT: FormConnectionDraft = {
  status: 'draft',
  id: 'draft-1',
  name: 'Passenger transport licence',
  servicebw_form: '',
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
