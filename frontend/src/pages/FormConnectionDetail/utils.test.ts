import { describe, expect, it } from 'vitest';

import type { Branch, FormConnection } from '../../types/form-connections';
import { resultLinksOf } from './utils';

function branch(id: string, name: string, isMain = false): Branch {
  return {
    id,
    name,
    description: isMain ? null : `About ${name}`,
    origin: isMain ? 'main' : 'based',
    operator: 'and',
    operator_mark: null,
    items: [],
    is_main: isMain,
    pull_url: isMain
      ? 'https://connect.example/api/connect/fc/requests/{reference}'
      : `https://connect.example/api/connect/fc/branches/${id}/requests/{reference}`,
  };
}

function connection(branches: Branch[]): FormConnection {
  return {
    id: 'fc',
    name: 'Passenger transport licence',
    servicebw_form: 'PT-1',
    is_active: true,
    documents: [],
    trigger_url: 'https://connect.example/api/connect/fc/requests',
    pull_url: 'https://connect.example/api/connect/fc/requests/{reference}',
    branches,
    rule_set_version: 1,
    next_rule_number: 1,
    next_group_number: 1,
    created_at: '2026-10-25T10:00:00Z',
    updated_at: '2026-10-25T10:00:00Z',
  };
}

describe('resultLinksOf (FR-026; F24, W2)', () => {
  it('shows Standard’s pull URL as spec 001 does, without a label, while it is the only one', () => {
    expect(resultLinksOf(connection([branch('main', 'Standard', true)]))).toEqual([
      {
        key: 'result',
        url: 'https://connect.example/api/connect/fc/requests/{reference}',
        branch: null,
      },
    ]);
  });

  it('labels every variant’s own pull URL, Standard first, from its pull_url', () => {
    const links = resultLinksOf(
      connection([branch('main', 'Standard', true), branch('b-1', 'Ambulance')])
    );
    expect(links.map(({ key, url, branch: labelled }) => [key, url, labelled?.name])).toEqual([
      ['main', 'https://connect.example/api/connect/fc/requests/{reference}', 'Standard'],
      [
        'b-1',
        'https://connect.example/api/connect/fc/branches/b-1/requests/{reference}',
        'Ambulance',
      ],
    ]);
  });
});
