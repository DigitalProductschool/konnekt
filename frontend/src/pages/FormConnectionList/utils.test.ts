import { describe, expect, it } from 'vitest';

import type { FormConnectionSummary } from '../../types/form-connections';
import { LIST_COPY } from './constants';
import { formIdLineOf, hintOf } from './utils';

function summary(overrides: Partial<FormConnectionSummary> = {}): FormConnectionSummary {
  return {
    id: 'c1',
    name: 'Parking permit',
    servicebw_form: '12345',
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

describe('formIdLineOf', () => {
  it('shows the form ID', () => {
    expect(formIdLineOf(summary())).toBe('Form ID 12345');
    expect(formIdLineOf(summary({ status: 'draft' }))).toBe('Form ID 12345');
  });

  it('says "No form ID yet" for an empty form ID', () => {
    expect(formIdLineOf(summary({ status: 'draft', servicebw_form: '' }))).toBe('No form ID yet');
  });
});
