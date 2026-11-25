import type { GroupItem, RuleItem } from '@konnekt/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { initialRulesState } from '../../pages/FormConnectionEditor/RulesStep/utils';
import { initialEditorState, localContentOf } from '../../pages/FormConnectionEditor/utils';
import { displayNameOf, emptyContent, sameContent } from './content';
import type { LocalDraftContent } from './types';

function rule(id: string, name = 'Adult'): RuleItem {
  return {
    type: 'rule',
    id,
    name,
    mark: null,
    target: { document_type: 'pid', field: 'birth_date', part: null, licence_class: null },
    condition: { operator: 'older_than', years: 18 },
    message: 'You must be an adult.',
  };
}

/** A group with a sub-group, written in the type's key order */
function nestedGroup(): GroupItem {
  return {
    type: 'group',
    id: 'group-1',
    name: 'Outer',
    mark: null,
    operator: 'or',
    message: null,
    items: [
      rule('rule-1'),
      {
        type: 'group',
        id: 'group-2',
        name: 'Inner',
        mark: null,
        operator: 'and',
        message: 'Inner message',
        items: [rule('rule-2', 'First'), rule('rule-3', 'Second')],
      },
    ],
  };
}

/** The same group as `nestedGroup()`, every object's keys in reverse order */
function nestedGroupReordered(): GroupItem {
  return {
    items: [
      {
        message: 'You must be an adult.',
        condition: { years: 18, operator: 'older_than' },
        target: { licence_class: null, part: null, field: 'birth_date', document_type: 'pid' },
        mark: null,
        name: 'Adult',
        id: 'rule-1',
        type: 'rule',
      },
      {
        items: [
          {
            message: 'You must be an adult.',
            condition: { years: 18, operator: 'older_than' },
            target: { licence_class: null, part: null, field: 'birth_date', document_type: 'pid' },
            mark: null,
            name: 'First',
            id: 'rule-2',
            type: 'rule',
          },
          {
            message: 'You must be an adult.',
            condition: { years: 18, operator: 'older_than' },
            target: { licence_class: null, part: null, field: 'birth_date', document_type: 'pid' },
            mark: null,
            name: 'Second',
            id: 'rule-3',
            type: 'rule',
          },
        ],
        message: 'Inner message',
        operator: 'and',
        mark: null,
        name: 'Inner',
        id: 'group-2',
        type: 'group',
      },
    ],
    message: null,
    operator: 'or',
    mark: null,
    name: 'Outer',
    id: 'group-1',
    type: 'group',
  };
}

function contentWith(items: LocalDraftContent['branches'][number]['items']): LocalDraftContent {
  const content = emptyContent();
  return {
    ...content,
    name: 'Parking permit',
    description: 'F-1',
    documents: [{ document_type: 'pid', fields: ['birth_date', 'family_name'] }],
    branches: [{ ...content.branches[0], items }],
    counters: { rule: 4, group: 3 },
  };
}

describe('emptyContent', () => {
  it('is the content of a fresh create flow, as the editor gives it', () => {
    const editor = initialEditorState({ initialStep: 'connection' });
    const rules = initialRulesState();
    expect(emptyContent(rules.branches[0].key)).toEqual(localContentOf(editor, rules));
  });

  it('has no name, description or documents, and the main variant alone, numbered from 1', () => {
    expect(emptyContent()).toEqual({
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
    });
  });

  it('carries the id of the flow’s main variant, none by default (spec 007, R10)', () => {
    const id = 'c8a2f1e0-1b2c-4d3e-8f40-5a6b7c8d9e0f';
    expect(emptyContent(id)).toEqual({
      ...emptyContent(),
      branches: [{ ...emptyContent().branches[0], id }],
    });
  });

  it('gives a new object every time', () => {
    const first = emptyContent();
    first.branches[0].items.push(rule('rule-1'));
    first.counters.rule = 2;
    expect(emptyContent().branches[0].items).toEqual([]);
    expect(emptyContent().counters).toEqual({ rule: 1, group: 1 });
  });
});

describe('sameContent', () => {
  it('finds two empty contents the same', () => {
    expect(sameContent(emptyContent(), emptyContent())).toBe(true);
  });

  it('ignores key order, also in nested rule trees', () => {
    expect(sameContent(contentWith([nestedGroup()]), contentWith([nestedGroupReordered()]))).toBe(
      true
    );
  });

  it('ignores key order at the top level', () => {
    const content = contentWith([nestedGroup()]);
    const reordered: LocalDraftContent = {
      counters: content.counters,
      numberingBase: content.numberingBase,
      branches: content.branches,
      documents: content.documents,
      description: content.description,
      name: content.name,
    };
    expect(sameContent(content, reordered)).toBe(true);
  });

  it('treats a key holding undefined as a missing key', () => {
    const withUndefined = rule('rule-1');
    withUndefined.condition = { operator: 'older_than', years: 18, value: undefined };
    expect(sameContent(contentWith([rule('rule-1')]), contentWith([withUndefined]))).toBe(true);
    expect(sameContent(contentWith([withUndefined]), contentWith([rule('rule-1')]))).toBe(true);
  });

  it('tells null from a missing key', () => {
    const withNull = rule('rule-1');
    withNull.condition = { operator: 'older_than', years: 18, value: null };
    expect(sameContent(contentWith([rule('rule-1')]), contentWith([withNull]))).toBe(false);
  });

  it('notices a change deep inside a nested group', () => {
    const changed = nestedGroupReordered();
    const inner = changed.items[1] as GroupItem;
    (inner.items[1] as RuleItem).name = 'Changed';
    expect(sameContent(contentWith([nestedGroup()]), contentWith([changed]))).toBe(false);
  });

  it('notices a changed condition value inside a nested group', () => {
    const changed = nestedGroup();
    const inner = changed.items[1] as GroupItem;
    (inner.items[0] as RuleItem).condition = { operator: 'older_than', years: 21 };
    expect(sameContent(contentWith([nestedGroup()]), contentWith([changed]))).toBe(false);
  });

  it('counts the order of array elements', () => {
    expect(
      sameContent(
        contentWith([rule('rule-1'), rule('rule-2')]),
        contentWith([rule('rule-2'), rule('rule-1')])
      )
    ).toBe(false);
    const fields = contentWith([]);
    const swapped: LocalDraftContent = {
      ...fields,
      documents: [{ document_type: 'pid', fields: ['family_name', 'birth_date'] }],
    };
    expect(sameContent(fields, swapped)).toBe(false);
  });

  it('notices an added or removed array element', () => {
    expect(sameContent(contentWith([rule('rule-1')]), contentWith([]))).toBe(false);
    expect(sameContent(contentWith([]), contentWith([rule('rule-1')]))).toBe(false);
  });

  it('notices a changed name, description, numbering base or counter', () => {
    const base = contentWith([]);
    expect(sameContent(base, { ...base, name: 'Other' })).toBe(false);
    expect(sameContent(base, { ...base, description: 'F-2' })).toBe(false);
    expect(sameContent(base, { ...base, numberingBase: { rule: 2, group: 1 } })).toBe(false);
    expect(sameContent(base, { ...base, counters: { rule: 4, group: 4 } })).toBe(false);
  });

  it('notices an added variant', () => {
    const base = contentWith([]);
    const withVariant: LocalDraftContent = {
      ...base,
      branches: [
        ...base.branches,
        { ...base.branches[0], name: 'Variant', origin: 'based', items: [] },
      ],
    };
    expect(sameContent(base, withVariant)).toBe(false);
  });
});

describe('displayNameOf', () => {
  it('gives the trimmed name', () => {
    expect(displayNameOf({ ...emptyContent(), name: '  Parking permit ' })).toBe('Parking permit');
  });

  it('gives "Untitled connection" for an empty or blank name', () => {
    expect(displayNameOf(emptyContent())).toBe('Untitled connection');
    expect(displayNameOf({ ...emptyContent(), name: ' \t ' })).toBe('Untitled connection');
  });

  it('gives "Unbenannte Anbindung" in German, the name as entered otherwise (spec 009)', () => {
    expect(displayNameOf(emptyContent(), 'de')).toBe('Unbenannte Anbindung');
    expect(displayNameOf({ ...emptyContent(), name: '  Parking permit ' }, 'de')).toBe(
      'Parking permit'
    );
  });
});
