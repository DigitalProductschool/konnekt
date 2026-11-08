import type { FormConnectionSummary } from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { LIST_COPY } from './constants';
import { descriptionOf, hintOf } from './utils';

function summary(overrides: Partial<FormConnectionSummary> = {}): FormConnectionSummary {
  return {
    id: 'c1',
    name: 'Parking permit',
    description: '12345',
    is_active: true,
    status: 'published',
    updated_at: '2026-11-04T13:32:00Z',
    ...overrides,
  };
}

describe('hintOf', () => {
  it('gives the plain hint without drafts', () => {
    expect(hintOf([])).toBe(LIST_COPY.hint);
    expect(hintOf([summary()])).toBe(LIST_COPY.hint);
    expect(hintOf([summary()], 0)).toBe(LIST_COPY.hint);
  });

  it('points to the drafts while a stored draft is listed', () => {
    expect(hintOf([summary(), summary({ id: 'c2', status: 'draft' })])).toBe(
      'Pick up your draft or connect another form.'
    );
  });

  it('points to the drafts while a local draft is offered', () => {
    expect(hintOf([], 1)).toBe(LIST_COPY.hintWithDrafts);
    expect(hintOf([summary()], 2)).toBe(LIST_COPY.hintWithDrafts);
  });
});

describe('descriptionOf (FR-005)', () => {
  it('returns the description as written, without a prefix', () => {
    expect(descriptionOf(summary())).toBe('12345');
    expect(descriptionOf(summary({ status: 'draft' }))).toBe('12345');
  });

  it('returns null for an empty description', () => {
    expect(descriptionOf(summary({ description: '' }))).toBeNull();
    expect(descriptionOf(summary({ status: 'draft', description: '' }))).toBeNull();
  });
});
