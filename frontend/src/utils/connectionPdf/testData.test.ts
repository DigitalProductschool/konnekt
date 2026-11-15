import type {
  BranchInput,
  FormConnection,
  FormConnectionDraft,
  RuleItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { flattenItems } from '@connection-portal/rules/tree';
import { firstProblem, publishProblems } from '@connection-portal/rules/validation';
import { describe, expect, it } from 'vitest';

import { summaryNumbersOf } from '../connectionSummary';
import {
  documentViewsOf,
  largestConnection,
  SAMPLE_DOCUMENT_TYPES,
  SAMPLE_DRAFT,
  SAMPLE_DRAFT_GAPS,
  SAMPLE_OPTION_SETS,
  SAMPLE_PUBLISHED,
  sampleRuleContext,
  SEED_BODIES,
} from './testData';

const LARGEST = largestConnection();

const ALL: [string, FormConnection | FormConnectionDraft][] = [
  ['A', SAMPLE_PUBLISHED],
  ['C', SAMPLE_DRAFT_GAPS],
  ['D', SAMPLE_DRAFT],
  ['E', LARGEST],
];

function rulesOf(items: RuleTreeItem[]): RuleItem[] {
  return flattenItems(items).filter((item): item is RuleItem => item.type === 'rule');
}

describe('the test connections pass validation as quickstart §0 describes them', () => {
  it.each([
    ['A', SAMPLE_PUBLISHED],
    ['D', SAMPLE_DRAFT],
    ['E', LARGEST],
  ] as const)('%s has nothing that refuses publishing, in both languages', (_, connection) => {
    for (const language of ['en', 'de'] as const) {
      const context = sampleRuleContext(connection, language);
      expect(firstProblem(connection.branches, context)).toBeNull();
      expect(publishProblems(connection.branches, context)).toEqual([]);
    }
  });

  it("C has exactly its two gaps: Hire car's rule-11 without a message, rule-12 without a check", () => {
    const problems = publishProblems(
      SAMPLE_DRAFT_GAPS.branches,
      sampleRuleContext(SAMPLE_DRAFT_GAPS)
    );

    expect(problems).toEqual([
      {
        code: 'noMessage',
        message: 'Licence class B in Hire car has no error message.',
        branchIndex: 2,
        itemId: 'rule-11',
      },
      {
        code: 'choose_check',
        message: 'Licence still valid in Hire car: choose a check.',
        branchIndex: 2,
        itemId: 'rule-12',
      },
    ]);
    expect(firstProblem(SAMPLE_DRAFT_GAPS.branches, sampleRuleContext(SAMPLE_DRAFT_GAPS))).toEqual(
      problems[0]
    );
  });

  it('D is C with its two gaps filled, and A as a draft', () => {
    expect(SAMPLE_DRAFT.branches.slice(0, 2)).toEqual(SAMPLE_DRAFT_GAPS.branches.slice(0, 2));
    expect(SAMPLE_DRAFT.branches).toEqual(
      SAMPLE_PUBLISHED.branches.map(({ is_main: _main, pull_url: _url, ...branch }) => branch)
    );
    expect(SAMPLE_DRAFT.version_fingerprint).toBe(SAMPLE_PUBLISHED.version_fingerprint);
  });
});

describe('A, the prototype sample', () => {
  it('counts 2 documents, 12 data items, 3 variants and 12 rules', () => {
    expect(summaryNumbersOf(SAMPLE_PUBLISHED.documents, SAMPLE_PUBLISHED.branches)).toEqual({
      documents: 2,
      dataItems: 12,
      variants: 3,
      rules: 12,
    });
  });

  it("matches the backend's sample: ids, the version and the variants' marks", () => {
    expect(SAMPLE_PUBLISHED.id).toBe('3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71');
    expect(SAMPLE_PUBLISHED.branches.map((branch) => branch.id)).toEqual([
      '5d0b8f6e-2c4a-4e1b-9f3d-7a6c5b4e3d2c',
      '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
      '9e8d7c6b-5a49-4382-a716-05f4e3d2c1b0',
    ]);
    expect(SAMPLE_PUBLISHED.version_fingerprint).toBe('FA7E-47BB-5368');
    expect(SAMPLE_DRAFT_GAPS.version_fingerprint).toBe('3D3C-F9EA-5FE0');
    const taxi = flattenItems(SAMPLE_PUBLISHED.branches[1].items);
    expect(taxi.map((item) => [item.id, item.mark])).toEqual([
      ['rule-1', 'changed'],
      ['rule-2', null],
      ['group-1', null],
      ['rule-3', null],
      ['rule-4', null],
      ['rule-5', 'removed'],
      ['rule-6', 'added'],
      ['group-2', 'added'],
      ['rule-7', 'added'],
      ['group-3', 'added'],
      ['rule-8', 'added'],
      ['rule-9', 'added'],
    ]);
  });

  it("carries the server's URLs, one per variant, a draft none", () => {
    expect(SAMPLE_PUBLISHED.trigger_url).toMatch(/^https:\/\/.+\/requests$/);
    expect(SAMPLE_PUBLISHED.branches.map((branch) => branch.pull_url)).toEqual([
      SAMPLE_PUBLISHED.pull_url,
      `https://connect.stuttgart.example/api/connect/${SAMPLE_PUBLISHED.id}/branches/0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f/requests/{reference}`,
      `https://connect.stuttgart.example/api/connect/${SAMPLE_PUBLISHED.id}/branches/9e8d7c6b-5a49-4382-a716-05f4e3d2c1b0/requests/{reference}`,
    ]);
    for (const draft of [SAMPLE_DRAFT_GAPS, SAMPLE_DRAFT]) {
      expect(JSON.stringify(draft)).not.toContain('http');
    }
  });
});

describe('E, the largest connection (FR-045)', () => {
  it('has 20 variants of 200 rules, groups and sub-groups, removed ones included', () => {
    expect(LARGEST.branches).toHaveLength(20);
    for (const branch of LARGEST.branches) {
      expect(flattenItems(branch.items)).toHaveLength(200);
    }
    const based = LARGEST.branches.slice(1).flatMap((branch) => flattenItems(branch.items));
    expect(based.some((item) => item.type === 'rule' && item.mark === 'removed')).toBe(true);
    expect(based.some((item) => item.type === 'group' && item.mark === 'removed')).toBe(true);
    expect(based.some((item) => item.mark === 'changed')).toBe(true);
    expect(summaryNumbersOf(LARGEST.documents, LARGEST.branches)).toEqual({
      documents: 2,
      dataItems: 12,
      variants: 20,
      rules: 164,
    });
  });

  it('has names of 100 and messages and descriptions of 500 characters, never more', () => {
    const items = LARGEST.branches.flatMap((branch) => flattenItems(branch.items));
    const names = [...items.map((item) => item.name), ...LARGEST.branches.map((b) => b.name)];
    const texts = [
      ...items.map((item) => item.message ?? ''),
      ...LARGEST.branches.map((branch) => branch.description ?? ''),
    ];
    expect(Math.max(...names.map((name) => name.length))).toBe(100);
    expect(Math.max(...texts.map((text) => text.length))).toBe(500);
    expect([...names, ...texts].every((text) => text === text.trim())).toBe(true);
    expect(LARGEST.name).toHaveLength(200);
    expect(LARGEST.description).toHaveLength(500);
  });

  it('holds a rule on nationality with all 249 countries inside a sub-group', () => {
    const countries = SAMPLE_OPTION_SETS.en.find((set) => set.key === 'countries')?.options ?? [];
    expect(countries).toHaveLength(249);
    for (const branch of LARGEST.branches) {
      const [, groupOne] = branch.items;
      const subGroup = groupOne.type === 'group' ? groupOne.items.at(-1) : undefined;
      const nationality = subGroup?.type === 'group' ? subGroup.items[0] : undefined;
      expect(nationality?.type === 'rule' && nationality.target?.field).toBe('nationalities');
      expect(nationality?.type === 'rule' && nationality.condition?.values).toEqual(
        countries.map((option) => option.value)
      );
    }
  });
});

describe('the context', () => {
  it('has the same catalog keys, kinds and values in English and German', () => {
    const shape = (types: typeof SAMPLE_DOCUMENT_TYPES.en) =>
      types.map((type) => [type.key, type.fields.map((field) => [field.key, field.kind])]);
    expect(shape(SAMPLE_DOCUMENT_TYPES.de)).toEqual(shape(SAMPLE_DOCUMENT_TYPES.en));
    const values = (sets: typeof SAMPLE_OPTION_SETS.en) =>
      sets.map((set) => [set.key, set.options.map((option) => option.value)]);
    expect(values(SAMPLE_OPTION_SETS.de)).toEqual(values(SAMPLE_OPTION_SETS.en));
    expect(SAMPLE_DOCUMENT_TYPES.de.map((type) => type.label)).toEqual([
      'Personalausweis',
      'Führerschein',
    ]);
  });

  it("labels the requested documents as the answer does, in either language, keys the catalog doesn't know by themselves", () => {
    const german = documentViewsOf(
      [{ document_type: 'pid', fields: ['birthdate', 'retired_field'] }],
      'de'
    );
    expect(german[0].label).toBe('Personalausweis');
    expect(german[0].fields.map((field) => [field.label, field.kind, field.group])).toEqual([
      ['Geburtsdatum', 'date', null],
      ['retired_field', 'image', null],
    ]);
    expect(SAMPLE_PUBLISHED.documents.map((document) => document.label)).toEqual([
      'Personal ID',
      'Driving licence',
    ]);
  });

  it('gives validation the requested documents with only their requested fields', () => {
    const context = sampleRuleContext(SAMPLE_PUBLISHED, 'de');
    expect(context.language).toBe('de');
    expect(context.documents.map((document) => document.fields.length)).toEqual([7, 5]);
    expect(context.optionSets).toBe(SAMPLE_OPTION_SETS.de);
  });
});

describe('SEED_BODIES', () => {
  const sent = (branches: BranchInput[]) => branches.map((branch) => ({ ...branch, id: null }));

  it("posts A and E to publish and C and D as drafts, with each fixture's content", () => {
    expect(SEED_BODIES.A.path).toBe('/api/form-connections');
    expect(SEED_BODIES.E.path).toBe('/api/form-connections');
    expect(SEED_BODIES.C.path).toBe('/api/form-connections/drafts');
    expect(SEED_BODIES.D.path).toBe('/api/form-connections/drafts');
    for (const [seed, connection] of [
      [SEED_BODIES.A, SAMPLE_PUBLISHED],
      [SEED_BODIES.C, SAMPLE_DRAFT_GAPS],
      [SEED_BODIES.D, SAMPLE_DRAFT],
      [SEED_BODIES.E, LARGEST],
    ] as const) {
      expect(seed.body.name).toBe(connection.name);
      expect(seed.body.documents).toEqual(
        connection.documents.map((document) => ({
          document_type: document.document_type,
          fields: document.fields.map((field) => field.key),
        }))
      );
      expect(seed.body.rules?.branches).toEqual(
        sent(
          connection.branches.map(
            ({ id, name, description, origin, operator, operator_mark, items }) => ({
              id,
              name,
              description,
              origin,
              operator,
              operator_mark,
              items,
            })
          )
        )
      );
      expect(seed.body.rules?.numbering_base).toEqual({ rule: 1, group: 1 });
    }
    expect(SEED_BODIES.A.body.rules?.base_version).toBeNull();
    expect(SEED_BODIES.C.body.step).toBe('rules');
    expect('start_date' in SEED_BODIES.A.body).toBe(false);
  });

  it("E's body holds 20 variants of 164 rules each", () => {
    const items = SEED_BODIES.E.body.rules?.branches.flatMap((branch) => rulesOf(branch.items));
    expect(items).toHaveLength(20 * 164);
  });
});

describe('privacy (FR-041)', () => {
  /** Every key the API's shapes of a connection, its catalog and the bodies may have */
  const API_KEYS = new Set([
    // FormConnection, FormConnectionDraft and the bodies
    'status',
    'state',
    'id',
    'name',
    'description',
    'is_active',
    'documents',
    'trigger_url',
    'pull_url',
    'branches',
    'rule_set_version',
    'version_fingerprint',
    'next_rule_number',
    'next_group_number',
    'created_at',
    'updated_at',
    'published_at',
    'activated_at',
    'deactivated_at',
    'start_date',
    'last_activity',
    'step',
    'version',
    'example',
    'rules',
    'numbering_base',
    'base_version',
    'rule',
    'group',
    'path',
    'body',
    // Documents and the catalog
    'document_type',
    'label',
    'fields',
    'key',
    'kind',
    'option_set',
    'date_of_birth',
    'parts',
    'per_licence_class',
    'multiple_values',
    'field_groups',
    'options',
    'value',
    // Branches, rules and groups
    'is_main',
    'origin',
    'operator',
    'operator_mark',
    'items',
    'type',
    'mark',
    'target',
    'condition',
    'message',
    'part',
    'field',
    'licence_class',
    'match_case',
    'values',
    'date',
    'years',
    'amount',
    'unit',
  ]);

  function keysOf(value: unknown, keys = new Set<string>()): Set<string> {
    if (Array.isArray(value)) {
      value.forEach((entry) => keysOf(entry, keys));
    } else if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        keys.add(key);
        keysOf(entry, keys);
      }
    }
    return keys;
  }

  it('no fixture holds a finding, a persona or citizen data: only the API shapes', () => {
    const fixtures = [
      ...ALL.map(([, connection]) => connection),
      SAMPLE_DOCUMENT_TYPES,
      SAMPLE_OPTION_SETS,
      SEED_BODIES,
    ];
    const extra = [...keysOf(fixtures)].filter(
      (key) => !API_KEYS.has(key) && !['en', 'de', 'A', 'C', 'D', 'E'].includes(key)
    );
    expect(extra).toEqual([]);
    // Whole words: "Personal ID" is the catalog's
    const words = JSON.stringify(fixtures).match(/\b(findings?|personas?|claims)\b/gi);
    expect(words).toBeNull();
  });
});
