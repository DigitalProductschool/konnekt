import type {
  BranchInput,
  FormConnection,
  FormConnectionDraft,
  FormConnectionOrDraft,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';
import { ruleDocumentsOf } from '@konnekt/rules/conditions';
import type { Language } from '@konnekt/rules/language';
import { statementOf } from '@konnekt/rules/statements';
import { flattenItems } from '@konnekt/rules/tree';
import { describe, expect, it } from 'vitest';

import { draftRuleDocumentsOf, summaryNumbersOf } from '../connectionSummary';
import { connectionPdfModelOf, type PdfModelContext } from './model';
import {
  documentViewsOf,
  largestConnection,
  SAMPLE_DOCUMENT_TYPES,
  SAMPLE_DRAFT,
  SAMPLE_DRAFT_GAPS,
  SAMPLE_OPTION_SETS,
  SAMPLE_PUBLISHED,
} from './testData';
import type { ConnectionPdfModel, PdfItem, PdfRule, PdfStatement, PdfVariant } from './types';

const LANGUAGES: Language[] = ['en', 'de'];

/** 16:45 in Germany on 09.11.2026 (CET) */
const NOW = new Date('2026-11-09T15:45:00Z');

/** What the hook hands over in `language`: the option sets and the catalog */
function contextIn(language: Language): PdfModelContext {
  return {
    optionSets: SAMPLE_OPTION_SETS[language],
    documentTypes: SAMPLE_DOCUMENT_TYPES[language],
  };
}

function modelOf(
  connection: FormConnectionOrDraft,
  language: Language = 'en',
  now: Date = NOW
): ConnectionPdfModel {
  return connectionPdfModelOf(connection, contextIn(language), { language, now });
}

/** The connection as an answer in `language` labels its documents */
function answeredIn<T extends FormConnectionOrDraft>(connection: T, language: Language): T {
  const requested = connection.documents.map((document) => ({
    document_type: document.document_type,
    fields: document.fields.map((field) => field.key),
  }));
  return { ...structuredClone(connection), documents: documentViewsOf(requested, language) };
}

/** F: A scheduled to start on 01.12.2026 */
function scheduled(): FormConnection {
  return {
    ...structuredClone(SAMPLE_PUBLISHED),
    state: 'scheduled',
    is_active: false,
    start_date: '2026-12-01',
    activated_at: null,
  };
}

/** B: A deactivated */
function deactivated(): FormConnection {
  return {
    ...structuredClone(SAMPLE_PUBLISHED),
    state: 'deactivated',
    is_active: false,
    deactivated_at: '2026-11-05T09:00:00Z',
  };
}

function variantOf(model: ConnectionPdfModel, name: string): PdfVariant {
  const found = model.variants.find((variant) => variant.name === name);
  if (!found) {
    throw new Error(`no variant ${name}`);
  }
  return found;
}

/** Every item of a model's tree, depth first in reading order */
function flatten(items: PdfItem[]): PdfItem[] {
  return items.flatMap((item) => (item.type === 'group' ? [item, ...flatten(item.items)] : [item]));
}

function pdfRuleOf(variant: PdfVariant, id: string): PdfRule {
  const found = flatten(variant.items).find((item) => item.id === id);
  if (found?.type !== 'rule') {
    throw new Error(`no rule ${id}`);
  }
  return found;
}

/** A sketch of the items: id, mark, faded, and a group's members */
type Shape = [string, PdfItem['mark'], boolean, Shape[]?];

function shapeOf(items: PdfItem[]): Shape[] {
  return items.map((item) =>
    item.type === 'group'
      ? [item.id, item.mark, item.faded, shapeOf(item.items)]
      : [item.id, item.mark, item.faded]
  );
}

/** The statement read as one sentence, as `statementOf()` writes it */
function joined(statement: PdfStatement): string {
  const sentence = `${statement.subject} ${statement.words} ${statement.values.join(', ')}`;
  return statement.tail ? `${sentence}, ${statement.tail}` : sentence;
}

function itemIn(items: RuleTreeItem[], id: string): RuleTreeItem {
  const found = flattenItems(items).find((item) => item.id === id);
  if (!found) {
    throw new Error(`no item ${id}`);
  }
  return found;
}

function ruleIn(branch: BranchInput, id: string): RuleItem {
  const found = itemIn(branch.items, id);
  if (found.type !== 'rule') {
    throw new Error(`${id} is no rule`);
  }
  return found;
}

function groupIn(branch: BranchInput, id: string): GroupItem {
  const found = itemIn(branch.items, id);
  if (found.type !== 'group') {
    throw new Error(`${id} is no group`);
  }
  return found;
}

describe('connectionPdfModelOf: A, published and active', () => {
  const model = modelOf(SAMPLE_PUBLISHED);

  it('holds page 1 as the answer has it, in English', () => {
    expect(model).toMatchObject({
      language: 'en',
      kind: 'published',
      status: 'active',
      startDate: null,
      id: '3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71',
      name: 'Taxi and private hire driver licence',
      description: SAMPLE_PUBLISHED.description,
      version: 'FA7E-47BB-5368',
      generatedAt: '09.11.2026, 16:45',
      lastSaved: null,
      counts: { documents: 2, dataItems: 12, variants: 3, rules: 12 },
      gaps: [],
      linksToCreate: null,
    });
  });

  it('holds the request link and each variant’s result link in the details’ order', () => {
    expect(model.links).toEqual({
      request: SAMPLE_PUBLISHED.trigger_url,
      results: SAMPLE_PUBLISHED.branches.map((branch) => ({
        variant: branch.name,
        url: branch.pull_url,
      })),
    });
    expect(model.links?.results.map((link) => link.variant)).toEqual([
      'Standard',
      'Taxi',
      'Hire car',
    ]);
  });

  it('lists the documents in the answer’s order with the answer’s labels', () => {
    expect(model.documents).toEqual([
      {
        name: 'Personal ID',
        dataItems: [
          'Family name',
          'Given name',
          'Date of birth',
          'Place of birth',
          'Nationality',
          'City or town',
          'Country of residence',
        ],
      },
      {
        name: 'Driving licence',
        dataItems: [
          'Issue date',
          'Expiry date',
          'Issuing authority',
          'Licence number',
          'Licence classes',
        ],
      },
    ]);
    const reversed = { ...SAMPLE_PUBLISHED, documents: [...SAMPLE_PUBLISHED.documents].reverse() };
    expect(modelOf(reversed).documents.map((document) => document.name)).toEqual([
      'Driving licence',
      'Personal ID',
    ]);
  });

  it('shows the variants in the details’ order with their kind, description and AND/OR', () => {
    expect(
      model.variants.map(({ name, origin, description, operator, operatorChanged }) => ({
        name,
        origin,
        description,
        operator,
        operatorChanged,
      }))
    ).toEqual([
      {
        name: 'Standard',
        origin: 'main',
        description: null,
        operator: 'and',
        operatorChanged: false,
      },
      {
        name: 'Taxi',
        origin: 'based',
        description:
          'For taxi drivers licensed in Stuttgart: local residence and a higher minimum age.',
        operator: 'and',
        operatorChanged: false,
      },
      {
        name: 'Hire car',
        origin: 'empty',
        description: 'Private hire vehicles (Mietwagen): no residence rule, any EU licence.',
        operator: 'and',
        operatorChanged: false,
      },
    ]);
  });

  it('shows the items in the Summary’s order and nesting with Taxi’s marks', () => {
    expect(shapeOf(variantOf(model, 'Standard').items)).toEqual([
      ['rule-1', null, false],
      ['rule-2', null, false],
      [
        'group-1',
        null,
        false,
        [
          ['rule-3', null, false],
          ['rule-4', null, false],
        ],
      ],
      ['rule-5', null, false],
    ]);
    expect(shapeOf(variantOf(model, 'Taxi').items)).toEqual([
      ['rule-1', 'changed', false],
      ['rule-2', null, false],
      [
        'group-1',
        null,
        false,
        [
          ['rule-3', null, false],
          ['rule-4', null, false],
        ],
      ],
      ['rule-5', 'removed', true],
      ['rule-6', 'added', false],
      [
        'group-2',
        'added',
        false,
        [
          ['rule-7', 'added', false],
          [
            'group-3',
            'added',
            false,
            [
              ['rule-8', 'added', false],
              ['rule-9', 'added', false],
            ],
          ],
        ],
      ],
    ]);
    expect(shapeOf(variantOf(model, 'Hire car').items)).toEqual([
      ['rule-10', null, false],
      ['rule-11', null, false],
      ['rule-12', null, false],
    ]);
  });

  it('splits the statements with their values apart, and keeps messages as entered', () => {
    const taxi = variantOf(model, 'Taxi');
    expect(pdfRuleOf(taxi, 'rule-1')).toEqual({
      type: 'rule',
      id: 'rule-1',
      name: 'Minimum age',
      mark: 'changed',
      faded: false,
      statement: {
        subject: 'Personal ID · Date of birth (Age)',
        words: 'is at least',
        values: ['23 years old'],
        tail: null,
      },
      message: 'You must be at least 23 years old to drive a taxi.',
      missing: null,
    });
    expect(pdfRuleOf(taxi, 'rule-6').statement).toEqual({
      subject: 'Personal ID · City or town',
      words: 'is equal to',
      values: ['"Stuttgart"'],
      tail: 'ignoring letter case',
    });
    const euNationality = pdfRuleOf(taxi, 'rule-8').statement;
    expect(euNationality?.values).toHaveLength(27);
    expect(euNationality?.values.slice(0, 3)).toEqual(['Austria', 'Belgium', 'Bulgaria']);
    const group = flatten(taxi.items).find((item) => item.id === 'group-2');
    expect(group).toMatchObject({
      type: 'group',
      name: 'Nationality or residence',
      operator: 'or',
      message: 'You need German nationality, or an EU nationality and an address in Germany.',
    });
    expect(flatten(taxi.items).find((item) => item.id === 'group-3')).toMatchObject({
      message: null,
    });
  });

  it('gives no rule of a published connection a "Not complete"', () => {
    for (const variant of model.variants) {
      for (const item of flatten(variant.items)) {
        if (item.type === 'rule') {
          expect(item.missing).toBeNull();
        }
      }
    }
  });
});

describe('the statements', () => {
  it.each(LANGUAGES)(
    'read, joined, as statementOf() with the details’ context, for every complete rule of A (%s)',
    (language) => {
      const connection = answeredIn(SAMPLE_PUBLISHED, language);
      const model = modelOf(connection, language);
      const context = {
        documents: ruleDocumentsOf(connection.documents),
        optionSets: SAMPLE_OPTION_SETS[language],
        language,
      };
      let compared = 0;
      connection.branches.forEach((branch, index) => {
        for (const item of flattenItems(branch.items)) {
          if (item.type !== 'rule') {
            continue;
          }
          const expected = statementOf(item, context);
          const statement = pdfRuleOf(model.variants[index], item.id).statement;
          expect(expected).not.toBeNull();
          expect(statement).not.toBeNull();
          if (expected && statement) {
            expect(joined(statement)).toBe(expected.text);
            compared += 1;
          }
        }
      });
      // Standard 5, Taxi 9 (rule-5 removed included), Hire car 3
      expect(compared).toBe(17);
    }
  );

  it('read, joined, as statementOf() with the catalog, for every rule of C with a check (de)', () => {
    const connection = answeredIn(SAMPLE_DRAFT_GAPS, 'de');
    const model = modelOf(connection, 'de');
    const context = {
      documents: draftRuleDocumentsOf(connection.documents, SAMPLE_DOCUMENT_TYPES.de),
      optionSets: SAMPLE_OPTION_SETS.de,
      language: 'de' as const,
    };
    const unchecked: string[] = [];
    let compared = 0;
    connection.branches.forEach((branch, index) => {
      for (const item of flattenItems(branch.items)) {
        if (item.type !== 'rule') {
          continue;
        }
        const expected = statementOf(item, context);
        const statement = pdfRuleOf(model.variants[index], item.id).statement;
        if (!expected) {
          unchecked.push(item.id);
          continue;
        }
        expect(statement).not.toBeNull();
        if (statement) {
          expect(joined(statement)).toBe(expected.text);
          compared += 1;
        }
      }
    });
    // Hire car's rule-12 has no check yet: only its subject, in German too
    expect(unchecked).toEqual(['rule-12']);
    expect(compared).toBe(16);
    const english = pdfRuleOf(variantOf(modelOf(SAMPLE_DRAFT_GAPS), 'Hire car'), 'rule-12');
    const german = pdfRuleOf(variantOf(model, 'Hire car'), 'rule-12');
    expect(german.statement?.words).toBeNull();
    expect(german.statement?.subject).not.toBe(english.statement?.subject);
  });

  it('are in the language of the model, with the value sets’ labels', () => {
    const model = modelOf(answeredIn(SAMPLE_PUBLISHED, 'de'), 'de');
    const taxi = variantOf(model, 'Taxi');
    expect(pdfRuleOf(taxi, 'rule-7').statement).toEqual({
      subject: 'Personalausweis · Staatsangehörigkeit',
      words: 'enthält eines von',
      values: ['Deutschland'],
      tail: null,
    });
    expect(pdfRuleOf(taxi, 'rule-6').statement).toMatchObject({
      values: ['„Stuttgart“'],
      tail: 'Groß-/Kleinschreibung ignoriert',
    });
  });

  it('read a draft’s rules on data it doesn’t request as the details do (the catalog)', () => {
    const draft = structuredClone(SAMPLE_DRAFT);
    // Driving licence's expiry date no longer requested: rule-5 and rule-12 still read
    draft.documents[1].fields = draft.documents[1].fields.filter(
      (field) => field.key !== 'expiry_date'
    );
    const model = modelOf(draft);
    const context = {
      documents: draftRuleDocumentsOf(draft.documents, SAMPLE_DOCUMENT_TYPES.en),
      optionSets: SAMPLE_OPTION_SETS.en,
      language: 'en' as const,
    };
    const statement = pdfRuleOf(variantOf(model, 'Hire car'), 'rule-12').statement;
    const expected = statementOf(ruleIn(draft.branches[2], 'rule-12'), context);
    expect(statement && joined(statement)).toBe(expected?.text);
    expect(statement?.subject).toBe('Driving licence · Expiry date');
    // …and say what publishing needs
    expect(pdfRuleOf(variantOf(model, 'Hire car'), 'rule-12').missing).toBe(
      'Add the data again in Documents, or edit or delete the rule.'
    );
  });

  it('are null when the target can’t be resolved, and only the subject while incomplete', () => {
    const draft = structuredClone(SAMPLE_DRAFT);
    const hireCar = draft.branches[2];
    ruleIn(hireCar, 'rule-10').target = {
      document_type: 'unknown_document',
      field: 'unknown_field',
      part: null,
      licence_class: null,
    };
    ruleIn(hireCar, 'rule-11').target = null;
    ruleIn(hireCar, 'rule-12').condition = { operator: 'after' };
    const variant = variantOf(modelOf(draft), 'Hire car');
    expect(pdfRuleOf(variant, 'rule-10').statement).toBeNull();
    expect(pdfRuleOf(variant, 'rule-11').statement).toBeNull();
    expect(pdfRuleOf(variant, 'rule-12').statement).toEqual({
      subject: 'Driving licence · Expiry date',
      words: null,
      values: [],
      tail: null,
    });
  });
});

describe('F, scheduled, and B, deactivated', () => {
  it.each(LANGUAGES)('F reads "scheduled" with its start date as dd.mm.yyyy (%s)', (language) => {
    const model = modelOf(scheduled(), language);
    expect(model.status).toBe('scheduled');
    expect(model.startDate).toBe('01.12.2026');
    expect(model.links?.request).toBe(SAMPLE_PUBLISHED.trigger_url);
  });

  it('B reads "deactivated", without a start date, and keeps its links', () => {
    const model = modelOf(deactivated());
    expect(model.status).toBe('deactivated');
    expect(model.startDate).toBeNull();
    expect(model.links?.results).toHaveLength(3);
  });

  it('a start date outside a scheduled connection is not shown', () => {
    expect(modelOf({ ...SAMPLE_PUBLISHED, start_date: '2026-12-01' }).startDate).toBeNull();
  });
});

describe('C and D, drafts', () => {
  const gaps = modelOf(SAMPLE_DRAFT_GAPS);
  const complete = modelOf(SAMPLE_DRAFT);

  it('C holds the draft’s page 1, its two gaps and the links to be created, in English', () => {
    expect(gaps).toMatchObject({
      language: 'en',
      kind: 'draft',
      status: 'draft',
      startDate: null,
      version: '3D3C-F9EA-5FE0',
      generatedAt: '09.11.2026, 16:45',
      lastSaved: { at: '09.11.2026, 14:10', saveNumber: 7 },
      counts: { documents: 2, dataItems: 12, variants: 3, rules: 12 },
      gaps: [
        { text: 'Licence class B in Hire car has no error message.' },
        { text: 'Licence still valid in Hire car: choose a check.' },
      ],
      links: null,
      linksToCreate: ['Standard', 'Taxi', 'Hire car'],
    });
  });

  it('C’s two rules say what is missing, and read as far as they go', () => {
    const hireCar = variantOf(gaps, 'Hire car');
    expect(pdfRuleOf(hireCar, 'rule-11')).toMatchObject({
      message: '',
      missing: 'Write the message for citizens.',
      statement: { words: 'includes one of', values: ['B'] },
    });
    expect(pdfRuleOf(hireCar, 'rule-12')).toMatchObject({
      message: '',
      missing: 'Choose a check.',
      statement: {
        subject: 'Driving licence · Expiry date',
        words: null,
        values: [],
        tail: null,
      },
    });
    const others = gaps.variants
      .flatMap((variant) => flatten(variant.items))
      .filter((item) => item.type === 'rule' && item.missing !== null)
      .map((item) => item.id);
    expect(others).toEqual(['rule-11', 'rule-12']);
  });

  it('C’s gaps and "Not complete" texts are in German in a German model', () => {
    const model = modelOf(answeredIn(SAMPLE_DRAFT_GAPS, 'de'), 'de');
    expect(model.gaps.map((gap) => gap.text)).toEqual([
      'Licence class B in Hire car hat keine Fehlermeldung.',
      'Licence still valid in Hire car: Wählen Sie eine Prüfung aus.',
    ]);
    expect(pdfRuleOf(variantOf(model, 'Hire car'), 'rule-12').missing).toBe(
      'Wählen Sie eine Prüfung aus.'
    );
    expect(model.lastSaved).toEqual({ at: '09.11.2026, 14:10', saveNumber: 7 });
  });

  it('D has no gaps and no "Not complete", save number 8 and A’s version', () => {
    expect(complete.gaps).toEqual([]);
    expect(complete.lastSaved).toEqual({ at: '09.11.2026, 16:40', saveNumber: 8 });
    expect(complete.version).toBe('FA7E-47BB-5368');
    const missing = complete.variants
      .flatMap((variant) => flatten(variant.items))
      .filter((item) => item.type === 'rule' && item.missing !== null);
    expect(missing).toEqual([]);
    // The same content as A: the same documents and variants
    const published = modelOf(SAMPLE_PUBLISHED);
    expect(complete.documents).toEqual(published.documents);
    expect(complete.variants).toEqual(published.variants);
  });

  it.each([
    ['C', SAMPLE_DRAFT_GAPS],
    ['D', SAMPLE_DRAFT],
  ])('%s’s model holds no URL of any kind (FR-013)', (_name, draft) => {
    for (const language of LANGUAGES) {
      const serialised = JSON.stringify(modelOf(answeredIn(draft, language), language));
      expect(serialised).not.toMatch(/http/i);
      expect(serialised).not.toContain('{reference}');
      expect(serialised).not.toContain('/api/connect');
    }
  });

  it('a draft without the catalog still builds, from the answer’s documents', () => {
    const model = connectionPdfModelOf(
      SAMPLE_DRAFT_GAPS,
      { optionSets: SAMPLE_OPTION_SETS.en, documentTypes: null },
      { language: 'en', now: NOW }
    );
    expect(model.gaps).toEqual(gaps.gaps);
    expect(model.variants).toEqual(gaps.variants);
  });
});

/** The texts a person typed, from every variant and item of a model, in reading order */
function enteredTextsOf(model: ConnectionPdfModel): unknown[] {
  return [
    model.id,
    model.name,
    model.description,
    model.version,
    ...model.variants.flatMap((variant) => [
      variant.name,
      variant.description,
      ...flatten(variant.items).map((item) => [item.id, item.name, item.message]),
    ]),
  ];
}

describe('A and C in German (FR-034, FR-035)', () => {
  const CASES = [
    ['A', SAMPLE_PUBLISHED],
    ['C', SAMPLE_DRAFT_GAPS],
  ] as const;

  it.each(CASES)(
    '%s names its documents and data items with the German catalog’s labels',
    (_name, connection) => {
      const german = modelOf(answeredIn(connection, 'de'), 'de');
      const english = modelOf(connection);
      const catalog = SAMPLE_DOCUMENT_TYPES.de;
      expect(german.documents).toEqual(
        connection.documents.map((document) => {
          const known = catalog.find((entry) => entry.key === document.document_type)!;
          return {
            name: known.label,
            dataItems: document.fields.map(
              (field) => known.fields.find((entry) => entry.key === field.key)!.label
            ),
          };
        })
      );
      // Not the English labels: every document's name differs, and most data items' do
      german.documents.forEach((document, index) => {
        expect(document.name).not.toBe(english.documents[index].name);
      });
      const sameItems = german.documents
        .flatMap((document) => document.dataItems)
        .filter((item, index) => item === english.documents.flatMap((d) => d.dataItems)[index]);
      expect(sameItems).toEqual([]);
    }
  );

  it.each(CASES)('%s keeps names, descriptions and messages as entered', (_name, connection) => {
    const german = modelOf(answeredIn(connection, 'de'), 'de');
    const english = modelOf(connection);
    expect(enteredTextsOf(german)).toEqual(enteredTextsOf(english));
    expect(german).toMatchObject({
      language: 'de',
      id: connection.id,
      name: connection.name,
      description: connection.description,
    });
    expect(german.variants.map((variant) => variant.name)).toEqual(
      connection.branches.map((branch) => branch.name)
    );
    const taxi = connection.branches[1];
    expect(pdfRuleOf(variantOf(german, 'Taxi'), 'rule-1').message).toBe(
      ruleIn(taxi, 'rule-1').message
    );
    expect(
      flatten(variantOf(german, 'Taxi').items).find((item) => item.id === 'group-2')
    ).toMatchObject({
      name: groupIn(taxi, 'group-2').name,
      message: groupIn(taxi, 'group-2').message,
    });
  });

  it.each(CASES)(
    '%s keeps a value typed as text as entered, in the German quotes',
    (_name, connection) => {
      const entered = ruleIn(connection.branches[1], 'rule-6').condition?.value;
      expect(typeof entered).toBe('string');
      const german = pdfRuleOf(
        variantOf(modelOf(answeredIn(connection, 'de'), 'de'), 'Taxi'),
        'rule-6'
      );
      const english = pdfRuleOf(variantOf(modelOf(connection), 'Taxi'), 'rule-6');
      expect(german.statement?.values).toHaveLength(1);
      // The same characters between the quotes, which are the language's
      const unquoted = (value: string | undefined) => value?.slice(1, -1);
      expect(unquoted(german.statement?.values[0])).toBe(entered);
      expect(unquoted(english.statement?.values[0])).toBe(entered);
      expect(german.statement?.values[0]).not.toBe(english.statement?.values[0]);
    }
  );

  it.each(CASES)(
    '%s’s generatedAt and lastSaved.at are the English strings',
    (_name, connection) => {
      const german = modelOf(answeredIn(connection, 'de'), 'de');
      const english = modelOf(connection);
      expect(german.generatedAt).toBe(english.generatedAt);
      expect(german.generatedAt).toBe('09.11.2026, 16:45');
      expect(german.lastSaved).toEqual(english.lastSaved);
      expect(german.lastSaved?.at).toBe(
        connection.status === 'draft' ? '09.11.2026, 14:10' : undefined
      );
      expect(german.startDate).toBe(english.startDate);
    }
  );
});

describe('"Not complete" on a based variant’s copies', () => {
  it('an inherited unchanged rule reads Standard’s, a removed one none, a changed one its own', () => {
    const draft = structuredClone(SAMPLE_DRAFT);
    const [standard, taxi] = draft.branches;
    // Standard's rule-2 and rule-5 lose their message; Taxi inherits rule-2 and removes rule-5
    for (const branch of [standard, taxi]) {
      ruleIn(branch, 'rule-2').message = '';
      ruleIn(branch, 'rule-5').message = '';
    }
    // Taxi's changed rule-1 loses its check
    ruleIn(taxi, 'rule-1').condition = null;
    const model = modelOf(draft);
    expect(model.gaps.map((gap) => gap.text)).toEqual([
      'Licence class B in Standard has no error message.',
      'Licence still valid in Standard has no error message.',
      'Minimum age in Taxi: choose a check.',
    ]);
    const standardModel = variantOf(model, 'Standard');
    const taxiModel = variantOf(model, 'Taxi');
    expect(pdfRuleOf(standardModel, 'rule-2').missing).toBe('Write the message for citizens.');
    expect(pdfRuleOf(standardModel, 'rule-5').missing).toBe('Write the message for citizens.');
    expect(pdfRuleOf(standardModel, 'rule-1').missing).toBeNull();
    expect(pdfRuleOf(taxiModel, 'rule-2').missing).toBe('Write the message for citizens.');
    expect(pdfRuleOf(taxiModel, 'rule-5').missing).toBeNull();
    expect(pdfRuleOf(taxiModel, 'rule-1').missing).toBe('Choose a check.');
  });

  it('a variant without a name keeps its rules’ texts, which the gap list leaves out', () => {
    const draft = structuredClone(SAMPLE_DRAFT_GAPS);
    draft.branches[2].name = '';
    const model = modelOf(draft);
    expect(model.gaps.map((gap) => gap.text)).toEqual(['Enter a name for every variant.']);
    const hireCar = model.variants[2];
    expect(pdfRuleOf(hireCar, 'rule-11').missing).toBe('Write the message for citizens.');
    expect(pdfRuleOf(hireCar, 'rule-12').missing).toBe('Choose a check.');
  });

  it('a rule whose only problem is its name has none: the gap list names it', () => {
    const draft = structuredClone(SAMPLE_DRAFT);
    ruleIn(draft.branches[2], 'rule-10').name = '';
    const model = modelOf(draft);
    expect(model.gaps).toHaveLength(1);
    expect(pdfRuleOf(model.variants[2], 'rule-10')).toMatchObject({ name: '', missing: null });
  });
});

describe('marks, faded and dissolved items, as the Summary shows them', () => {
  it('an inherited group with one member left is dissolved: the member before it, the group removed', () => {
    const connection = structuredClone(SAMPLE_PUBLISHED);
    const taxi = connection.branches[1];
    ruleIn(taxi, 'rule-4').mark = 'removed';
    expect(shapeOf(variantOf(modelOf(connection), 'Taxi').items).slice(0, 5)).toEqual([
      ['rule-1', 'changed', false],
      ['rule-2', null, false],
      ['rule-3', null, false],
      ['group-1', 'removed', true, [['rule-4', 'removed', true]]],
      ['rule-5', 'removed', true],
    ]);
  });

  it('a removed group fades its members, which keep their own marks and never dissolve', () => {
    const connection = structuredClone(SAMPLE_PUBLISHED);
    const taxi = connection.branches[1];
    groupIn(taxi, 'group-1').mark = 'removed';
    ruleIn(taxi, 'rule-4').mark = 'removed';
    groupIn(taxi, 'group-2').mark = 'removed';
    ruleIn(taxi, 'rule-7').mark = null;
    groupIn(taxi, 'group-3').mark = null;
    ruleIn(taxi, 'rule-9').mark = 'removed';
    const items = variantOf(modelOf(connection), 'Taxi').items;
    expect(shapeOf(items)).toEqual([
      ['rule-1', 'changed', false],
      ['rule-2', null, false],
      [
        'group-1',
        'removed',
        true,
        [
          ['rule-3', null, true],
          ['rule-4', 'removed', true],
        ],
      ],
      ['rule-5', 'removed', true],
      ['rule-6', 'added', false],
      [
        'group-2',
        'removed',
        true,
        [
          ['rule-7', null, true],
          [
            'group-3',
            null,
            true,
            [
              ['rule-8', 'added', true],
              ['rule-9', 'removed', true],
            ],
          ],
        ],
      ],
    ]);
  });

  it('shows a switched top-level AND/OR only in a based variant', () => {
    const connection = structuredClone(SAMPLE_PUBLISHED);
    connection.branches[1].operator = 'or';
    connection.branches[1].operator_mark = 'changed';
    connection.branches[2].operator_mark = 'changed';
    const model = modelOf(connection);
    expect(model.variants.map((variant) => [variant.operator, variant.operatorChanged])).toEqual([
      ['and', false],
      ['or', true],
      ['and', false],
    ]);
  });

  it('shows no marks outside a based variant', () => {
    const connection = structuredClone(SAMPLE_PUBLISHED);
    ruleIn(connection.branches[2], 'rule-10').mark = 'changed';
    const rule = pdfRuleOf(variantOf(modelOf(connection), 'Hire car'), 'rule-10');
    expect(rule).toMatchObject({ mark: null, faded: false });
  });
});

describe('empty parts', () => {
  it('a draft without description, documents or rules reads as the Summary’s placeholders', () => {
    const draft: FormConnectionDraft = {
      ...structuredClone(SAMPLE_DRAFT),
      name: '',
      description: '   ',
      documents: [],
      branches: [
        {
          id: 'b6a1e7d2-1c3f-4b5a-8d9e-0f1a2b3c4d5e',
          name: 'Standard',
          description: '',
          origin: 'main',
          operator: 'and',
          operator_mark: null,
          items: [],
        },
      ],
    };
    const model = modelOf(draft);
    expect(model).toMatchObject({
      name: '',
      description: null,
      documents: [],
      counts: { documents: 0, dataItems: 0, variants: 1, rules: 0 },
      gaps: [{ text: 'Enter a name for the connection.' }, { text: 'Add at least one document.' }],
      linksToCreate: ['Standard'],
    });
    expect(model.variants).toEqual([
      {
        name: 'Standard',
        origin: 'main',
        description: null,
        operator: 'and',
        operatorChanged: false,
        items: [],
      },
    ]);
  });

  it('a document without data items has none, and a variant without rules none', () => {
    const draft = structuredClone(SAMPLE_DRAFT);
    draft.documents[1].fields = [];
    draft.branches[2].items = [];
    const model = modelOf(draft);
    expect(model.documents[1]).toEqual({ name: 'Driving licence', dataItems: [] });
    expect(model.counts).toEqual(summaryNumbersOf(draft.documents, draft.branches));
    expect(variantOf(model, 'Hire car').items).toEqual([]);
    expect(model.gaps[0].text).toBe(
      'Driving licence: Choose at least one data item, or remove this document.'
    );
  });

  it('a rule or group without a name or message reads as it is; a blank group message is none', () => {
    const connection = structuredClone(SAMPLE_PUBLISHED);
    const standard = connection.branches[0];
    ruleIn(standard, 'rule-1').name = '';
    ruleIn(standard, 'rule-1').message = '  You must be 21.  ';
    ruleIn(standard, 'rule-2').message = '   ';
    groupIn(standard, 'group-1').name = '';
    groupIn(standard, 'group-1').message = '  ';
    const variant = variantOf(modelOf(connection), 'Standard');
    expect(pdfRuleOf(variant, 'rule-1')).toMatchObject({ name: '', message: 'You must be 21.' });
    expect(pdfRuleOf(variant, 'rule-2').message).toBe('');
    expect(variant.items[2]).toMatchObject({ type: 'group', name: '', message: null });
  });

  it('never throws on a draft without variants or with broken rules', () => {
    const draft = structuredClone(SAMPLE_DRAFT_GAPS);
    draft.branches = [];
    expect(() => modelOf(draft)).not.toThrow();
    expect(modelOf(draft).variants).toEqual([]);
    const broken = structuredClone(SAMPLE_DRAFT_GAPS);
    ruleIn(broken.branches[0], 'rule-1').condition = { operator: 'no_such_operator' };
    ruleIn(broken.branches[0], 'rule-2').target = {
      document_type: 'mdl',
      field: 'driving_privileges',
      part: 'issue_date',
      licence_class: null,
    };
    expect(() => modelOf(broken)).not.toThrow();
    const draftWithBadTime = { ...structuredClone(SAMPLE_DRAFT), updated_at: 'not a time' };
    expect(modelOf(draftWithBadTime).lastSaved).toEqual({ at: '', saveNumber: 8 });
  });
});

describe('a document the catalog no longer has', () => {
  it('reads by its key, and its fields by theirs', () => {
    const documents = documentViewsOf([
      { document_type: 'pid', fields: ['family_name', 'retired_field'] },
      { document_type: 'retired_document', fields: ['old_field'] },
    ]);
    const connection: FormConnection = { ...structuredClone(SAMPLE_PUBLISHED), documents };
    expect(modelOf(connection).documents).toEqual([
      { name: 'Personal ID', dataItems: ['Family name', 'retired_field'] },
      { name: 'retired_document', dataItems: ['old_field'] },
    ]);
    const draft: FormConnectionDraft = { ...structuredClone(SAMPLE_DRAFT), documents };
    expect(modelOf(draft).documents).toEqual(modelOf(connection).documents);
  });
});

describe('the counts', () => {
  it.each([
    ['A', SAMPLE_PUBLISHED],
    ['C', SAMPLE_DRAFT_GAPS],
    ['D', SAMPLE_DRAFT],
    ['E', largestConnection()],
  ])('equal the Summary’s for %s', (_name, connection) => {
    expect(modelOf(connection).counts).toEqual(
      summaryNumbersOf(connection.documents, connection.branches)
    );
  });
});

describe('dates and times in Germany’s time (FR-035)', () => {
  it.each([
    // Winter (CET, UTC+1): just before and after midnight
    ['2026-11-09T22:59:00Z', '09.11.2026, 23:59'],
    ['2026-11-09T23:00:00Z', '10.11.2026, 00:00'],
    // Summer (CEST, UTC+2): just before and after midnight
    ['2026-07-01T21:59:00Z', '01.07.2026, 23:59'],
    ['2026-07-01T22:00:00Z', '02.07.2026, 00:00'],
    // 29.03.2026: 02:00 CET becomes 03:00 CEST
    ['2026-03-29T00:59:00Z', '29.03.2026, 01:59'],
    ['2026-03-29T01:00:00Z', '29.03.2026, 03:00'],
    // 25.10.2026: 03:00 CEST becomes 02:00 CET
    ['2026-10-25T00:59:00Z', '25.10.2026, 02:59'],
    ['2026-10-25T01:00:00Z', '25.10.2026, 02:00'],
    // A new year begins in Germany an hour before it does in UTC
    ['2026-12-31T23:30:00Z', '01.01.2027, 00:30'],
  ])('%s reads %s in both languages', (instant, expected) => {
    for (const language of LANGUAGES) {
      expect(modelOf(SAMPLE_PUBLISHED, language, new Date(instant)).generatedAt).toBe(expected);
      const draft = { ...structuredClone(SAMPLE_DRAFT), updated_at: instant };
      expect(modelOf(draft, language).lastSaved?.at).toBe(expected);
    }
  });
});

describe('the model is plain data', () => {
  it.each([
    ['A', SAMPLE_PUBLISHED],
    ['C', SAMPLE_DRAFT_GAPS],
    ['D', SAMPLE_DRAFT],
    ['F', scheduled()],
    ['E', largestConnection()],
  ])('%s’s model survives structuredClone unchanged', (_name, connection) => {
    const model = modelOf(connection);
    expect(structuredClone(model)).toEqual(model);
    expect(JSON.parse(JSON.stringify(model))).toEqual(model);
  });

  it('shares no array with the answer, so the worker’s copy is all it needs', () => {
    const connection = structuredClone(SAMPLE_PUBLISHED);
    const model = modelOf(connection);
    const before = structuredClone(model);
    ruleIn(connection.branches[1], 'rule-8').condition?.values?.push('XX');
    connection.documents[0].fields.pop();
    expect(model).toEqual(before);
  });
});
