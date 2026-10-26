import { describe, expect, it } from 'vitest';

import type {
  Branch,
  BranchInput,
  FormConnection,
  GroupItem,
  Mark,
  RuleTreeItem,
} from '../../types/form-connections';
import { mainBranch, rule } from '../../utils/rules/testData';
import { resultLinksOf, rulesCountsOf } from './utils';

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

function marked<T extends RuleTreeItem>(item: T, mark: Mark | null): T {
  return { ...item, mark };
}

function group(number: number, items: RuleTreeItem[]): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name: `Group 0${number}`,
    mark: null,
    operator: 'or',
    message: null,
    items,
  };
}

function variant(origin: BranchInput['origin'], items: RuleTreeItem[]): BranchInput {
  return { ...mainBranch(items), name: 'Ambulance', origin };
}

describe('rulesCountsOf (Figma 10.11, B8)', () => {
  it('counts Standard as a variant, and no rules as 0 rules', () => {
    expect(rulesCountsOf([mainBranch([])])).toBe('1 variant · 0 rules');
  });

  it('uses the singular for one rule', () => {
    expect(rulesCountsOf([mainBranch([rule(1, null, null)])])).toBe('1 variant · 1 rule');
  });

  it('counts the rules in groups and sub-groups one by one, not the groups', () => {
    const items = [
      rule(1, null, null),
      group(1, [rule(2, null, null), group(2, [rule(3, null, null), rule(4, null, null)])]),
    ];
    expect(rulesCountsOf([mainBranch(items)])).toBe('1 variant · 4 rules');
  });

  it('counts a rule that variants inherit, change or remove once, and their own rules too', () => {
    const standard = [rule(1, null, null), rule(2, null, null), rule(3, null, null)];
    const ambulance = variant('based', [
      rule(1, null, null),
      marked(rule(2, null, null), 'changed'),
      marked(rule(3, null, null), 'removed'),
      marked(rule(4, null, null), 'added'),
    ]);
    const taxi = variant('empty', [rule(5, null, null), rule(6, null, null)]);
    expect(rulesCountsOf([mainBranch(standard), ambulance, taxi])).toBe('3 variants · 6 rules');
  });

  it('skips a rule that only a removed item holds', () => {
    const removedGroup = marked(group(1, [rule(1, null, null), rule(2, null, null)]), 'removed');
    const items = [removedGroup, marked(rule(3, null, null), 'removed'), rule(4, null, null)];
    expect(rulesCountsOf([variant('empty', items)])).toBe('1 variant · 1 rule');
  });
});
