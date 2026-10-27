import { describe, expect, it } from 'vitest';

import { initialStepOf } from './utils';

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
    ['an unknown step', { step: 'publish' }],
  ])('opens the connection for %s', (_name, state) => {
    expect(initialStepOf(state)).toBe('connection');
  });
});
