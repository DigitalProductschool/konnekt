import type { FormConnection, RuleTreeItem } from '@connection-portal/api-types/form-connections';
import type { Language } from '@connection-portal/rules/language';
import { describe, expect, it } from 'vitest';

import { BRANCH_MARK_COPY } from '../../components/BranchMark/constants';
import { STATUS_PILL_COPY } from '../../components/ConnectionStatusBadge/constants';
import { CONNECTOR_COPY } from '../../components/Connector/constants';
import { RULE_ROW_COPY } from '../../components/RuleRow/constants';
import { CONNECTION_DETAIL_COPY } from '../../pages/FormConnectionDetail/constants';
import { blocksOf, layoutOf, RESULT_LINKS_UNIT } from './blocks';
import { PDF_COLOURS, PDF_LAYOUT, PDF_STYLES, PDF_TEXTS } from './constants';
import { connectionPdfModelOf } from './model';
import { paginate, placeLabelOf } from './paginate';
import {
  largestConnection,
  SAMPLE_DOCUMENT_TYPES,
  SAMPLE_OPTION_SETS,
  SAMPLE_PUBLISHED,
} from './testData';
import type {
  Block,
  BlockKind,
  BlockLayout,
  ConnectionPdfModel,
  DocumentContent,
  LinkContent,
  Measure,
  Page,
  PdfGroup,
  PdfItem,
  PdfRule,
  PdfVariant,
  PlacedRect,
  PlacedText,
  PlaceLabelTexts,
  RuleContent,
  RuleContinuationContent,
  StatusContent,
  TextStyle,
} from './types';
import { urlLines } from './wrapUrl';

const LANGUAGES: Language[] = ['en', 'de'];
const BODY = PDF_LAYOUT.body;

/** 16:45 in Germany on 09.11.2026 (CET) */
const NOW = new Date('2026-11-09T15:45:00Z');
const GENERATED = '09.11.2026, 16:45';

/** A character is half its size wide */
const CHARACTER_WIDTH = 0.5;

/**
 * The stub of PDFKit's measuring: width = characters × a constant (scaled by the size), height =
 * the lines a greedy cut at `width` gives × the size's line height with its gap
 */
const measure: Measure = {
  width: (text: string, style: TextStyle) => [...text].length * style.size * CHARACTER_WIDTH,
  height: (text: string, style: TextStyle, width: number) =>
    Math.max(1, Math.ceil(measure.width(text, style) / width)) *
    style.size *
    (1.2 + PDF_LAYOUT.lineGapFactor),
};

function modelOf(connection: FormConnection, language: Language = 'en'): ConnectionPdfModel {
  return connectionPdfModelOf(
    connection,
    { optionSets: SAMPLE_OPTION_SETS[language], documentTypes: SAMPLE_DOCUMENT_TYPES[language] },
    { language, now: NOW }
  );
}

/** B: A deactivated */
const B: FormConnection = { ...SAMPLE_PUBLISHED, state: 'deactivated', is_active: false };

/** F: A scheduled to start on 01.12.2026 */
const F: FormConnection = {
  ...SAMPLE_PUBLISHED,
  state: 'scheduled',
  is_active: false,
  start_date: '2026-12-01',
  activated_at: null,
};

const CONNECTIONS: [string, FormConnection][] = [
  ['A', SAMPLE_PUBLISHED],
  ['B', B],
  ['F', F],
];

/** A's model with `count` result links, "Variant 1" to "Variant <count>" */
function withResultLinks(count: number): ConnectionPdfModel {
  const model = modelOf(SAMPLE_PUBLISHED);
  const results = Array.from({ length: count }, (_, index) => ({
    variant: `Variant ${index + 1}`,
    url: `https://connect.example.org/api/connect/${model.id}/variant-${index + 1}/requests/{reference}`,
  }));
  return { ...model, links: { request: model.links!.request, results } };
}

/** Section 2's blocks, its heading first */
function sectionTwoOf(blocks: Block[]): Block[] {
  return blocks.filter((block) => block.place.section === 2);
}

function kindsOf(blocks: Block[]): BlockKind[] {
  return blocks.map((block) => block.content.kind);
}

function textsOf(layout: BlockLayout): PlacedText[] {
  return layout.parts.filter((part): part is PlacedText => part.kind === 'text');
}

/** A placed text's words, its spans joined */
function wordsOf(text: PlacedText): string {
  return text.spans.map((span) => span.text).join('');
}

/** The key of the element a tagged text sits in; null for an artifact */
function leafOf(text: PlacedText): string | null {
  return text.role.kind === 'tag' ? text.role.path[text.role.path.length - 1].key : null;
}

const PAGE_ONE: BlockKind[] = ['title', 'status', 'details', 'note'];
const LINKS: BlockKind[] = ['sectionHeading', 'linkHeading', 'link', 'linkHeading'];
const HEADINGS: BlockKind[] = [
  'title',
  'sectionHeading',
  'linkHeading',
  'variantHeader',
  'groupHeader',
];

/** A's Standard: rule-1, rule-2, group-1 (rule-3, rule-4), rule-5 */
const STANDARD: BlockKind[] = [
  'variantHeader',
  'rule',
  'connector',
  'rule',
  'connector',
  'groupHeader',
  'rule',
  'connector',
  'rule',
  'groupEnd',
  'connector',
  'rule',
];

/** A's Taxi: Standard's, rule-6 and group-2 (rule-7, group-3 (rule-8, rule-9)) */
const TAXI: BlockKind[] = [
  ...STANDARD,
  'connector',
  'rule',
  'connector',
  'groupHeader',
  'rule',
  'connector',
  'groupHeader',
  'rule',
  'connector',
  'rule',
  'groupEnd',
  'groupEnd',
];

/** A's Hire car: rule-10 to rule-12 */
const HIRE_CAR: BlockKind[] = ['variantHeader', 'rule', 'connector', 'rule', 'connector', 'rule'];

/** The bottom's words in English */
const PLACE_TEXTS: PlaceLabelTexts = {
  sections: { 1: 'Links for your service', 2: 'Documents and data items', 3: 'Rules per variant' },
  variant: (name: string) => `Variant ${name}`,
  continued: '(continued)',
};

describe('blocksOf: the order of kinds', () => {
  it.each(CONNECTIONS.flatMap(([name, connection]) => LANGUAGES.map((l) => [name, connection, l])))(
    '%s in %s: page 1, the links with one result link per variant, the documents, the rules',
    (_name, connection, language) => {
      const blocks = blocksOf(modelOf(connection as FormConnection, language as Language), measure);
      expect(kindsOf(blocks)).toEqual([
        ...PAGE_ONE,
        ...LINKS,
        // Standard, Taxi and Hire car
        'link',
        'link',
        'link',
        'sectionHeading',
        // Two documents
        'document',
        'document',
        'sectionHeading',
        ...STANDARD,
        ...TAXI,
        ...HIRE_CAR,
      ]);
    }
  );

  it('A: the status reads "Active" as of the moment, with no notice under the links’ lead', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED), measure);
    expect(blocks[1].content).toMatchObject({
      status: 'active',
      label: 'Active',
      note: `as of ${GENERATED}`,
    });
    expect(blocks[4].content).toMatchObject({
      title: CONNECTION_DETAIL_COPY.en.linksTitle,
      lead: CONNECTION_DETAIL_COPY.en.linksLead,
      notice: null,
    });
  });

  it.each(LANGUAGES)('B: "Deactivated", and the links answer "unavailable" (FR-012, %s)', (l) => {
    const blocks = blocksOf(modelOf(B, l), measure);
    expect(blocks[1].content).toMatchObject({
      status: 'deactivated',
      label: STATUS_PILL_COPY[l].deactivated,
      note: PDF_TEXTS[l].asOf(GENERATED),
    });
    expect(blocks[4].content).toMatchObject({ notice: PDF_TEXTS[l].deactivatedLinks });
  });

  it.each(LANGUAGES)(
    'F: "Scheduled" with its start date, in the status and the links (%s)',
    (l) => {
      const texts = PDF_TEXTS[l];
      const blocks = blocksOf(modelOf(F, l), measure);
      expect(blocks[1].content).toMatchObject({
        status: 'scheduled',
        label: STATUS_PILL_COPY[l].scheduled,
        note: `${texts.asOf(GENERATED)} · ${texts.startsOn('01.12.2026')}`,
      });
      expect(blocks[4].content).toMatchObject({ notice: texts.scheduledLinks('01.12.2026') });
    }
  );

  it('the details table: ID, version, generated "(Germany)", contents as the Summary counts', () => {
    const model = modelOf(SAMPLE_PUBLISHED);
    const details = blocksOf(model, measure)[2].content;
    const copy = CONNECTION_DETAIL_COPY.en;
    expect(details).toMatchObject({
      kind: 'details',
      draft: false,
      rows: [
        { label: 'Connection ID', value: model.id, valueKind: 'id' },
        { label: 'Version', value: 'FA7E-47BB-5368', valueKind: 'version' },
        { label: 'Generated', value: `${GENERATED} (Germany)`, valueKind: 'text' },
        {
          label: 'Contents',
          value: copy.summaryCounts(2, 12, copy.rulesCounts(3, 12)),
          valueKind: 'text',
        },
      ],
    });
    expect(details.kind === 'details' && details.rows[3].value).toBe(
      '2 documents · 12 data items · 3 variants · 12 rules'
    );
  });

  it('page 1: the eyebrow, the name in full, the description and the note of FR-009', () => {
    const model = modelOf(SAMPLE_PUBLISHED);
    const [title, , , note] = blocksOf(model, measure);
    expect(title.content).toMatchObject({
      eyebrow: 'Connection details',
      name: model.name,
      description: model.description,
      draft: false,
    });
    expect(note.content).toMatchObject({ kind: 'note', text: PDF_TEXTS.en.checkNote });
  });

  it('a connection without a description has no description line', () => {
    const model = { ...modelOf(SAMPLE_PUBLISHED), description: null };
    const [title] = blocksOf(model, measure);
    expect(textsOf(layoutOf(title.content, measure)).map(leafOf)).toEqual([
      'title/eyebrow',
      'title/name',
    ]);
  });

  it('the links reuse the details page’s texts, the result links adding the {reference} sentence', () => {
    const copy = CONNECTION_DETAIL_COPY.de;
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED, 'de'), measure);
    expect(blocks[5].content).toMatchObject({
      step: 1,
      title: copy.requestLink,
      paragraphs: [copy.requestLinkInfo],
    });
    expect(blocks[7].content).toMatchObject({
      step: 2,
      title: PDF_TEXTS.de.resultLinks,
      paragraphs: [copy.resultLinkInfo, PDF_TEXTS.de.referenceNote],
    });
    expect(blocks.slice(8, 11).map((block) => (block.content as LinkContent).label)).toEqual([
      'Variante · Standard',
      'Variante · Taxi',
      'Variante · Hire car',
    ]);
  });
});

describe('blocksOf: chains, units, places and the outline', () => {
  const models: [string, ConnectionPdfModel][] = [
    ...CONNECTIONS.map(([name, connection]): [string, ConnectionPdfModel] => [
      name,
      modelOf(connection),
    ]),
    ['twenty result links', withResultLinks(20)],
    ['no documents', { ...modelOf(SAMPLE_PUBLISHED), documents: [] }],
  ];

  it.each(models)('%s: every heading is chained, and never the last of a chain', (_name, model) => {
    const blocks = blocksOf(model, measure);
    blocks.forEach((block, index) => {
      if (HEADINGS.includes(block.content.kind)) {
        expect(block.keepWithNext).toBe(true);
      }
      if (block.keepWithNext) {
        // A chained block has a block after it, and the chain ends in one that isn't a heading
        expect(index).toBeLessThan(blocks.length - 1);
      }
    });
    expect(blocks.at(-1)!.keepWithNext).toBe(false);
  });

  it.each(models)('%s: no page but the last ends with a chained block', (_name, model) => {
    const blocks = blocksOf(model, measure);
    const pages = paginate(blocks, BODY.height);
    for (const page of pages.slice(0, -1)) {
      expect(blocks[page[page.length - 1].index].keepWithNext).toBe(false);
    }
  });

  it('twenty result links form one unit of twenty blocks, each its label and URL', () => {
    const model = withResultLinks(20);
    const blocks = blocksOf(model, measure);
    const unit = blocks.filter((block) => block.unitOf.includes(RESULT_LINKS_UNIT));
    expect(unit).toHaveLength(20);
    expect(unit.map((block) => block.content.kind)).toEqual(Array(20).fill('link'));
    expect(unit.map((block) => (block.content as LinkContent).label)).toEqual(
      model.links!.results.map((result) => `Variant · ${result.variant}`)
    );
    expect(unit.map((block) => (block.content as LinkContent).url)).toEqual(
      model.links!.results.map((result) => result.url)
    );
    // The first opens the unit; the heading before it is chained to it, outside the unit
    expect(blocks.filter((block) => block.startsUnits.includes(RESULT_LINKS_UNIT))).toEqual([
      unit[0],
    ]);
    const first = blocks.indexOf(unit[0]);
    expect(blocks[first - 1].content.kind).toBe('linkHeading');
    expect(blocks[first - 1].keepWithNext).toBe(true);
    // They follow one another
    expect(blocks.slice(first, first + 20)).toEqual(unit);
  });

  it('A’s result links move with their heading to the next page when this one can’t hold them', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED), measure);
    const heading = blocks.findIndex((block) => block.content.key === 'section-1/results');
    const unit = blocks.slice(heading + 1, heading + 4);
    expect(unit.every((block) => block.unitOf.includes(RESULT_LINKS_UNIT))).toBe(true);
    const unitHeight = unit.reduce((sum, block) => sum + block.gapBefore + block.height, 0);
    // A filler that leaves room for the heading and half the links
    const filler: Block = {
      ...blocks[0],
      keepWithNext: false,
      height: BODY.height - blocks[heading].height - unitHeight / 2,
    };
    const pages = paginate([filler, ...blocks.slice(heading)], BODY.height);
    expect(pages[0].map(({ index }) => index)).toEqual([0]);
    expect(pages[1].map(({ index }) => index).slice(0, 4)).toEqual([1, 2, 3, 4]);
  });

  it('page 1 is outside the sections; each section’s and variant’s heading opens it and its outline entry', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED), measure);
    for (const block of blocks.slice(0, 4)) {
      expect(block.place).toEqual({ section: null, variant: null, opens: null });
      expect(block.bookmark).toBeNull();
    }
    let number: 1 | 2 | 3 | null = null;
    let variant: string | null = null;
    blocks.forEach((block, index) => {
      if (index < 4) return;
      const { content } = block;
      if (content.kind === 'sectionHeading') {
        number = content.number;
        variant = null;
      }
      if (content.kind === 'variantHeader') variant = content.name;
      const opens =
        content.kind === 'sectionHeading'
          ? 'section'
          : content.kind === 'variantHeader'
            ? 'variant'
            : null;
      expect(block.place).toEqual({ section: number, variant, opens });
      expect(block.bookmark !== null).toBe(opens !== null);
    });
    expect(blocks.flatMap((block) => (block.bookmark ? [block.bookmark] : []))).toEqual([
      { title: '1 Links for your service', level: 1 },
      { title: '2 Documents and data items', level: 1 },
      { title: '3 Rules per variant', level: 1 },
      { title: 'Variant Standard', level: 2 },
      { title: 'Variant Taxi', level: 2 },
      { title: 'Variant Hire car', level: 2 },
    ]);
  });

  it('the outline entries in German', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED, 'de'), measure);
    expect(blocks.flatMap((block) => (block.bookmark ? [block.bookmark.title] : []))).toEqual([
      '1 Links für Ihren Dienst',
      '2 Dokumente und Felder',
      '3 Regeln je Variante',
      'Variante Standard',
      'Variante Taxi',
      'Variante Hire car',
    ]);
  });

  it('a page that starts inside section 1 is labelled "(continued)"', () => {
    const blocks = blocksOf(withResultLinks(20), measure);
    const pages = paginate(blocks, BODY.height);
    expect(pages.length).toBeGreaterThan(1);
    const labels = pages.map((page) => placeLabelOf(page, blocks, PLACE_TEXTS));
    expect(labels[0]).toBeNull();
    expect(labels[1]).toBe('1 Links for your service (continued)');
  });
});

describe('layoutOf', () => {
  const all = CONNECTIONS.flatMap(([name, connection]) =>
    LANGUAGES.map((language): [string, Block[]] => [
      `${name} in ${language}`,
      blocksOf(modelOf(connection, language), measure),
    ])
  );

  it.each(all)('%s: every part lies inside its block and the body’s width', (_name, blocks) => {
    for (const block of blocks) {
      const layout = layoutOf(block.content, measure);
      expect(layout.height).toBe(block.height);
      for (const part of layout.parts) {
        const [left, top, right, bottom] =
          part.kind === 'circle'
            ? [
                part.cx - part.radius,
                part.cy - part.radius,
                part.cx + part.radius,
                part.cy + part.radius,
              ]
            : part.kind === 'line'
              ? [part.x1, part.y1, part.x2, part.y2]
              : [part.x, part.y, part.x + part.width, part.y + part.height];
        expect(left).toBeGreaterThanOrEqual(0);
        expect(top).toBeGreaterThanOrEqual(0);
        expect(right).toBeLessThanOrEqual(BODY.width + 1e-9);
        expect(bottom).toBeLessThanOrEqual(layout.height + 1e-9);
      }
    }
  });

  it.each(all)('%s: every text is tagged in its part’s Sect, or an artifact', (_name, blocks) => {
    const sects = new Set<string>();
    const variantSects = new Set<string>();
    for (const block of blocks) {
      const { content } = block;
      for (const text of textsOf(layoutOf(content, measure))) {
        if (text.role.kind === 'artifact') {
          // Only the step numbers and the AND/OR chips, which the headings and lines say in words
          expect(['linkHeading', 'connector']).toContain(content.kind);
          expect(text.role.type).toBe('Layout');
          continue;
        }
        const { path } = text.role;
        expect(path.slice(0, content.within.length)).toEqual(content.within);
        const [sect] = path;
        expect(sect.type).toBe('Sect');
        sects.add(sect.key);
        const rest = path.slice(content.within.length);
        expect(rest.length).toBeGreaterThan(0);
        // The elements a block creates are named after it; in section 3 after the variant's
        // Sect or the item's Div they go into, which a cut rule's pieces share
        const section3 = content.within.length > 1 && content.within[0].key === 'section-3';
        const owner = section3 ? content.within.at(-1)!.key : content.key;
        for (const node of rest) expect(node.key.startsWith(`${owner}/`)).toBe(true);
        if (section3) {
          expect(content.within[1].type).toBe('Sect');
          variantSects.add(content.within[1].key);
        }
      }
    }
    expect([...sects]).toEqual(['page-1', 'section-1', 'section-2', 'section-3']);
    expect([...variantSects]).toEqual([
      'section-3/variant-0',
      'section-3/variant-1',
      'section-3/variant-2',
    ]);
  });

  it.each(all)('%s: every shape is an artifact', (_name, blocks) => {
    for (const block of blocks) {
      for (const part of layoutOf(block.content, measure).parts) {
        if (part.kind !== 'text') expect(part.artifact).toBe('Layout');
      }
    }
  });

  it('the content keys are unique', () => {
    const keys = blocksOf(withResultLinks(20), measure).map((block) => block.content.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives the same geometry each time, for measuring and for drawing alike', () => {
    for (const block of blocksOf(modelOf(F, 'de'), measure)) {
      expect(layoutOf(block.content, measure)).toEqual(layoutOf(block.content, measure));
    }
  });

  it.each([
    ['en', 'CONNECTION DETAILS'],
    ['de', 'DETAILS DER ANBINDUNG'],
  ] as const)('draws the eyebrow in capitals, the name as the H1 (%s)', (language, eyebrow) => {
    const [title] = blocksOf(modelOf(SAMPLE_PUBLISHED, language), measure);
    const [first, name] = textsOf(layoutOf(title.content, measure));
    expect(wordsOf(first)).toBe(eyebrow);
    expect(first.lines).toBe('one');
    expect(wordsOf(name)).toBe(SAMPLE_PUBLISHED.name);
    expect(name.role.kind === 'tag' && name.role.path.at(-1)!.type).toBe('H1');
  });

  it('a long name wraps in full and pushes the description down', () => {
    const model = modelOf(SAMPLE_PUBLISHED);
    const short = blocksOf(model, measure)[0];
    const long = blocksOf({ ...model, name: 'N'.repeat(200) }, measure)[0];
    const [, name, description] = textsOf(layoutOf(long.content, measure));
    expect(wordsOf(name)).toBe('N'.repeat(200));
    expect(name.lines).toBe('wrap');
    expect(description.y).toBe(name.y + name.height + PDF_LAYOUT.title.nameGap);
    expect(long.height).toBeGreaterThan(short.height);
  });

  it('the status: the pill’s shape and dot are artifacts, its word and note are text', () => {
    for (const [connection, hollow] of [
      [SAMPLE_PUBLISHED, false],
      [F, true],
    ] as const) {
      const status = blocksOf(modelOf(connection), measure)[1].content as StatusContent;
      const { parts } = layoutOf(status, measure);
      expect(parts.map((part) => part.kind)).toEqual(['rect', 'circle', 'text', 'text']);
      const dot = parts[1];
      expect(dot.kind === 'circle' && dot.fill === null).toBe(hollow);
      expect(textsOf({ height: 0, parts }).map(wordsOf)).toEqual([status.label, status.note]);
    }
  });

  it('the details table: a row per line, its key a TH with scope Row, its value a TD', () => {
    const details = blocksOf(modelOf(SAMPLE_PUBLISHED), measure)[2];
    const texts = textsOf(layoutOf(details.content, measure));
    expect(texts).toHaveLength(8);
    texts.forEach((text, index) => {
      const path = text.role.kind === 'tag' ? text.role.path : [];
      expect(path.map((node) => node.type)).toEqual([
        'Sect',
        'Table',
        'TR',
        index % 2 === 0 ? 'TH' : 'TD',
      ]);
      if (index % 2 === 0) expect(path[3].scope).toBe('Row');
    });
    // Four rows of 19 pt and the box's padding
    expect(details.height).toBe(4 * PDF_LAYOUT.details.rowHeight + PDF_LAYOUT.details.paddingY);
  });

  it('a link’s label and URL share a block, the URL in lines broken only after "/"', () => {
    const url = `https://connect.example.org/${'segment/'.repeat(30)}{reference}`;
    const model = withResultLinks(1);
    const blocks = blocksOf(
      { ...model, links: { ...model.links!, results: [{ variant: 'Taxi', url }] } },
      measure
    );
    const linkBlocks = blocks.filter((block) => block.content.kind === 'link');
    const result = linkBlocks.at(-1)!;
    const texts = textsOf(layoutOf(result.content, measure));
    expect(wordsOf(texts[0])).toBe('Variant · Taxi');
    const lines = texts.slice(1);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map(wordsOf).join('')).toBe(url);
    expect(lines.slice(0, -1).every((line) => wordsOf(line).endsWith('/'))).toBe(true);
    // One P for all the URL's lines, each line drawn as it was cut
    expect(new Set(lines.map(leafOf))).toEqual(new Set([`${result.content.key}/url`]));
    expect(lines.every((line) => line.lines === 'one')).toBe(true);
    const urlWidth = BODY.width - PDF_LAYOUT.links.indent - 2 * PDF_LAYOUT.links.urlPaddingX;
    expect(lines.map(wordsOf)).toEqual(
      urlLines(url, urlWidth, (text) => measure.width(text, lines[0].spans[0].style))
    );
    // No other block holds the URL
    for (const block of blocks) {
      if (block === result) continue;
      const words = textsOf(layoutOf(block.content, measure)).map(wordsOf).join('');
      expect(words.includes('segment/segment/')).toBe(false);
    }
  });

  it('the request link’s URL has no label', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED), measure);
    const request = blocks[6];
    expect(request.content).toMatchObject({ kind: 'link', label: null });
    const texts = textsOf(layoutOf(request.content, measure));
    expect(texts.map(wordsOf).join('')).toBe(SAMPLE_PUBLISHED.trigger_url);
  });

  it('a document: its name with the count as one H3, its data items an L, left column first', () => {
    const items = ['One', 'Two', 'Three', 'Four', 'Five'];
    const model = {
      ...modelOf(SAMPLE_PUBLISHED),
      documents: [{ name: 'Personal ID', dataItems: items }],
    };
    const document = sectionTwoOf(blocksOf(model, measure)).at(-1)!;
    expect(document.content).toMatchObject({
      kind: 'document',
      count: '5 data items',
      placeholder: null,
    });
    const texts = textsOf(layoutOf(document.content, measure));
    // One space in the tagged text, the separator's gap in the drawing (T026)
    const [name, count] = texts;
    expect([name, count].map(wordsOf).join('')).toBe('Personal ID 5 data items');
    expect(leafOf(name)).toBe(`${document.content.key}/name`);
    expect(leafOf(count)).toBe(`${document.content.key}/name`);
    expect(count.y).toBe(name.y);
    expect(count.x).toBe(
      name.x +
        measure.width('Personal ID', PDF_STYLES.documentName) +
        measure.width(PDF_LAYOUT.document.countSeparator, PDF_STYLES.documentCount)
    );
    const bodies = texts.slice(2);
    expect(bodies.map(wordsOf)).toEqual(items);
    for (const body of bodies) {
      const path = body.role.kind === 'tag' ? body.role.path : [];
      expect(path.map((node) => node.type)).toEqual(['Sect', 'L', 'LI', 'LBody']);
    }
    // Three on the left, two on the right, side by side
    const left = bodies[0].x;
    expect(bodies.map((body) => body.x === left)).toEqual([true, true, true, false, false]);
    expect(bodies[3].y).toBe(bodies[0].y);
    expect(bodies[3].x).toBeGreaterThan(left);
  });

  it('a document whose name and count don’t fit on one line puts the count below', () => {
    const name = 'Document '.repeat(20).trim();
    const model = { ...modelOf(SAMPLE_PUBLISHED), documents: [{ name, dataItems: ['One'] }] };
    const document = sectionTwoOf(blocksOf(model, measure)).at(-1)!;
    const [heading, count, item] = textsOf(layoutOf(document.content, measure));
    expect(wordsOf(heading)).toBe(`${name} `);
    expect(wordsOf(count)).toBe('1 data item');
    expect(leafOf(count)).toBe(leafOf(heading));
    expect(count.y).toBe(heading.y + heading.height);
    expect(item.y).toBeGreaterThanOrEqual(count.y + count.height);
  });

  it.each(LANGUAGES)('a document with no data items shows the placeholder (%s)', (language) => {
    const model = {
      ...modelOf(SAMPLE_PUBLISHED, language),
      documents: [{ name: 'Personal ID', dataItems: [] }],
    };
    const document = sectionTwoOf(blocksOf(model, measure)).at(-1)!;
    const placeholder = CONNECTION_DETAIL_COPY[language].noDataYet;
    expect(document.content).toMatchObject({ kind: 'document', placeholder });
    expect((document.content as DocumentContent).count).toBe(
      CONNECTION_DETAIL_COPY[language].items(0)
    );
    const texts = textsOf(layoutOf(document.content, measure));
    expect(texts.map(wordsOf)).toContain(placeholder);
    expect(
      texts.some((text) => text.role.kind === 'tag' && text.role.path.some((n) => n.type === 'L'))
    ).toBe(false);
  });

  it.each(LANGUAGES)('no documents: section 2 says "No documents yet" (%s)', (language) => {
    const model = { ...modelOf(SAMPLE_PUBLISHED, language), documents: [] };
    const blocks = sectionTwoOf(blocksOf(model, measure));
    expect(kindsOf(blocks)).toEqual(['sectionHeading', 'placeholder']);
    expect(blocks.at(-1)!.content).toMatchObject({
      text: CONNECTION_DETAIL_COPY[language].noDocumentsYet,
      depth: 0,
    });
    expect(blocks.at(-1)!.place).toEqual({ section: 2, variant: null, opens: null });
  });
});

// ---------------------------------------------------------------------------------------------
// Section 3

/** A's model with `variants` in place of its own */
function withVariants(variants: PdfVariant[], language: Language = 'en'): ConnectionPdfModel {
  return { ...modelOf(SAMPLE_PUBLISHED, language), variants };
}

function ruleOf(id: string, overrides: Partial<PdfRule> = {}): PdfRule {
  return {
    type: 'rule',
    id,
    name: `Name of ${id}`,
    mark: null,
    faded: false,
    statement: {
      subject: 'Personal ID · Nationality',
      words: 'includes one of',
      values: ['Germany', 'France'],
      tail: null,
    },
    message: `The message of ${id}.`,
    missing: null,
    ...overrides,
  };
}

function groupOf(id: string, items: PdfItem[], overrides: Partial<PdfGroup> = {}): PdfGroup {
  return {
    type: 'group',
    id,
    name: `Name of ${id}`,
    mark: null,
    faded: false,
    operator: 'or',
    message: `The message of ${id}.`,
    items,
    ...overrides,
  };
}

function variantOf(items: PdfItem[], overrides: Partial<PdfVariant> = {}): PdfVariant {
  return {
    name: 'Standard',
    origin: 'main',
    description: null,
    operator: 'and',
    operatorChanged: false,
    items,
    ...overrides,
  };
}

/** Section 3's blocks, its heading first */
function sectionThreeOf(blocks: Block[]): Block[] {
  return blocks.filter((block) => block.place.section === 3);
}

/** The blocks of the item whose `Div` has the key that ends in `/<index>-<id>` */
function itemBlocksOf(blocks: Block[], id: string): Block[] {
  return blocks.filter((block) => {
    const div = block.content.within.at(-1)!;
    return div.type === 'Div' && div.key.endsWith(`-${id}`) && block.content.kind !== 'connector';
  });
}

/** The text whose words are `words` */
function textOf(layout: BlockLayout, words: string): PlacedText {
  const text = textsOf(layout).find((candidate) => wordsOf(candidate) === words);
  expect(text, words).toBeDefined();
  return text!;
}

/** The type of the element a tagged text sits in */
function leafTypeOf(text: PlacedText): string | null {
  return text.role.kind === 'tag' ? text.role.path[text.role.path.length - 1].type : null;
}

/** The rects that aren't a group's bar */
function framesOf(layout: BlockLayout): PlacedRect[] {
  return layout.parts.filter(
    (part): part is PlacedRect => part.kind === 'rect' && !part.joinsAbove
  );
}

/** The group bars of a block */
function barsOf(layout: BlockLayout): PlacedRect[] {
  return layout.parts.filter((part): part is PlacedRect => part.kind === 'rect' && part.joinsAbove);
}

/** "All rules must be met (AND)" in `language`, from the connector's texts */
function combinesIn(language: Language, operator: 'and' | 'or'): string {
  const copy = CONNECTOR_COPY[language];
  return `${copy.descriptions[operator]} (${copy.labels[operator]})`;
}

/** `text` repeated to exactly `length` characters */
function ofLength(text: string, length: number): string {
  return text.repeat(Math.ceil(length / text.length)).slice(0, length);
}

/** The 249 countries of the value set, in `language` */
function countriesIn(language: Language): string[] {
  return SAMPLE_OPTION_SETS[language]
    .find((set) => set.key === 'countries')!
    .options.map((option) => option.label);
}

describe('blocksOf: section 3, rules per variant', () => {
  it.each(LANGUAGES)(
    'a variant’s header: title, origin, description, AND/OR in words (%s)',
    (l) => {
      const texts = PDF_TEXTS[l];
      const headers = blocksOf(modelOf(SAMPLE_PUBLISHED, l), measure).filter(
        (block) => block.content.kind === 'variantHeader'
      );
      expect(headers.map((header) => header.content)).toMatchObject([
        {
          title: texts.variant('Standard'),
          name: 'Standard',
          originLabel: texts.originMain,
          description: null,
          combines: combinesIn(l, 'and'),
          changed: null,
        },
        {
          title: texts.variant('Taxi'),
          originLabel: texts.originBased,
          description:
            'For taxi drivers licensed in Stuttgart: local residence and a higher minimum age.',
        },
        { title: texts.variant('Hire car'), originLabel: texts.originEmpty },
      ]);
      const taxi = headers[1];
      const layout = layoutOf(taxi.content, measure);
      const key = 'section-3/variant-1';
      // "Variant" and the name, one H3 reading with one space; the name where the word and the
      // separator's gap end (T026)
      const [word, name] = textsOf(layout);
      expect(wordsOf(word) + wordsOf(name)).toBe(texts.variant('Taxi'));
      expect(wordsOf(name)).toBe('Taxi');
      expect(name.x).toBe(
        measure.width(
          `${wordsOf(word).trimEnd()}${PDF_LAYOUT.variant.wordSeparator}`,
          PDF_STYLES.variantWord
        )
      );
      for (const title of [word, name]) {
        expect(title.role).toEqual({
          kind: 'tag',
          path: [
            { type: 'Sect', key: 'section-3' },
            { type: 'Sect', key },
            { type: 'H3', key: `${key}/title` },
          ],
        });
      }
      expect(textsOf(layout).map(wordsOf).slice(2)).toEqual([
        texts.originBased,
        (taxi.content as { description: string }).description,
        combinesIn(l, 'and'),
      ]);
      expect(combinesIn('en', 'or')).toBe('At least one rule must be met (OR)');
    }
  );

  it.each(LANGUAGES)(
    '"Changed here" beside the AND/OR when a based variant switched it (%s)',
    (l) => {
      const model = withVariants(
        [
          variantOf([ruleOf('rule-1')]),
          variantOf([ruleOf('rule-1'), ruleOf('rule-2')], {
            name: 'Taxi',
            origin: 'based',
            operator: 'or',
            operatorChanged: true,
          }),
        ],
        l
      );
      const header = blocksOf(model, measure).filter((b) => b.content.kind === 'variantHeader')[1];
      expect(header.content).toMatchObject({
        combines: combinesIn(l, 'or'),
        changed: { mark: 'changed', label: BRANCH_MARK_COPY[l].changed },
      });
      const layout = layoutOf(header.content, measure);
      const combines = textOf(layout, combinesIn(l, 'or'));
      const changed = textOf(layout, BRANCH_MARK_COPY[l].changed);
      // In the line's paragraph, beside its words, its pill an artifact
      expect(leafOf(changed)).toBe(leafOf(combines));
      expect(changed.x).toBeGreaterThan(
        combines.x + measure.width(combinesIn(l, 'or'), S_COMBINES)
      );
      expect(changed.spans[0].style.strike).toBeUndefined();
    }
  );

  it('the nesting levels: H4 at the top, H5 in a group, H6 in a sub-group, each level indented', () => {
    const blocks = sectionThreeOf(blocksOf(modelOf(SAMPLE_PUBLISHED), measure));
    const taxi = blocks.filter((block) => block.place.variant === 'Taxi');
    const levels = taxi.flatMap((block) => {
      const { content } = block;
      if (content.kind !== 'rule' && content.kind !== 'groupHeader') return [];
      const layout = layoutOf(content, measure);
      const heading = textsOf(layout).filter((text) => /^H\d$/.test(leafTypeOf(text) ?? ''));
      // The identifier and the name, one heading reading "rule-1 Minimum age" (T026)
      expect(heading.map(wordsOf)).toEqual([`${content.id} `, content.name]);
      expect(heading.map(leafTypeOf)).toEqual([`H${content.level}`, `H${content.level}`]);
      expect(content.level).toBe(4 + content.depth);
      expect(framesOf(layout)[0].x).toBe(content.depth * PDF_LAYOUT.items.indent);
      expect(barsOf(layout)).toHaveLength(content.depth);
      return [[content.id, content.level]];
    });
    expect(levels).toEqual([
      ['rule-1', 4],
      ['rule-2', 4],
      ['group-1', 4],
      ['rule-3', 5],
      ['rule-4', 5],
      ['rule-5', 4],
      ['rule-6', 4],
      ['group-2', 4],
      ['rule-7', 5],
      ['group-3', 5],
      ['rule-8', 6],
      ['rule-9', 6],
    ]);
  });

  it('a rule: its heading, its mark, its statement with a chip per value, its message', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED), measure);
    const [rule8] = itemBlocksOf(
      blocks.filter((b) => b.place.variant === 'Taxi'),
      'rule-8'
    );
    const content = rule8.content as RuleContent;
    const layout = layoutOf(content, measure);
    const owner = content.within.at(-1)!.key;
    const values = content.statement!.values;
    expect(values).toHaveLength(27);
    expect(textsOf(layout).map(wordsOf)).toEqual([
      'rule-8 ',
      'EU nationality',
      'Added here',
      'Personal ID · Nationality includes one of',
      ...values,
      `${RULE_ROW_COPY.en.messageLabel} You need the nationality of an EU member state.`,
    ]);
    expect(textsOf(layout).map(leafOf)).toEqual([
      `${owner}/heading`,
      `${owner}/heading`,
      `${owner}/mark`,
      ...Array(28).fill(`${owner}/statement`),
      `${owner}/message`,
    ]);
    // A frame per chip, around its word; the card tinted by its mark
    const chips = framesOf(layout).filter(
      (frame) => frame.stroke?.colour === PDF_COLOURS.decorativeBorder
    );
    expect(chips).toHaveLength(27);
    const chipTexts = textsOf(layout).slice(4, 31);
    chipTexts.forEach((text, index) => {
      expect(text.x).toBeGreaterThan(chips[index].x);
      expect(text.x + text.width).toBeLessThan(chips[index].x + chips[index].width);
    });
    expect(framesOf(layout)[0]).toMatchObject({ fill: PDF_COLOURS.markBackground });
    // Shapes before the texts they sit under
    const firstText = layout.parts.findIndex((part) => part.kind === 'text');
    expect(layout.parts.slice(firstText).every((part) => part.kind === 'text')).toBe(true);
  });

  it('chips follow the words on their line when they fit, and wrap from chip to chip', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED), measure);
    const [rule8] = itemBlocksOf(
      blocks.filter((b) => b.place.variant === 'Taxi'),
      'rule-8'
    );
    const texts = textsOf(layoutOf(rule8.content, measure));
    const words = texts[3];
    const chips = texts.slice(4, 31);
    expect(chips[0].x).toBeGreaterThan(words.x + words.width);
    const lines = [...new Set(chips.map((chip) => chip.y))];
    expect(lines.length).toBeGreaterThan(1);
    // Left to right, line by line
    for (let index = 1; index < chips.length; index += 1) {
      const [before, chip] = [chips[index - 1], chips[index]];
      expect(chip.y > before.y || (chip.y === before.y && chip.x > before.x)).toBe(true);
    }
  });

  it('the chains of FR-023 and the units of FR-025 in A', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED), measure);
    expectChainsAndUnits(blocks);
  });

  it('a removed rule is muted and struck through, with "Removed here" in words (FR-017)', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED), measure).filter(
      (b) => b.place.variant === 'Taxi'
    );
    const [rule5] = itemBlocksOf(blocks, 'rule-5');
    const content = rule5.content as RuleContent;
    expect(content).toMatchObject({
      faded: true,
      badge: { mark: 'removed', label: BRANCH_MARK_COPY.en.removed },
    });
    const layout = layoutOf(content, measure);
    expectFaded(layout, content);
    expect(framesOf(layout)[0]).toMatchObject({ fill: PDF_COLOURS.neutralBackground });
    // The AND before it fades with it
    const connector = blocks[blocks.indexOf(rule5) - 1];
    expect(connector.content).toMatchObject({ kind: 'connector', faded: true });
    expect(textsOf(layoutOf(connector.content, measure))[0].spans[0].style).toBe(
      PDF_STYLES.connectorFaded
    );
    // The rule before it is neither
    const [rule2] = itemBlocksOf(blocks, 'rule-2');
    expect(rule2.content).toMatchObject({ faded: false, badge: null });
    for (const text of textsOf(layoutOf(rule2.content, measure))) {
      for (const span of text.spans) expect(span.style.strike).toBeUndefined();
    }
  });

  it('a group that isn’t faded says its AND/OR in the accent colour, not struck through', () => {
    const blocks = blocksOf(modelOf(SAMPLE_PUBLISHED), measure).filter(
      (b) => b.place.variant === 'Standard'
    );
    const [header] = itemBlocksOf(blocks, 'group-1');
    expect(header.content).toMatchObject({ kind: 'groupHeader', faded: false });
    const line = textOf(
      layoutOf(header.content, measure),
      PDF_TEXTS.en.group(combinesIn('en', 'or'))
    );
    expect(line.spans[0].style).toBe(PDF_STYLES.groupCombines);
    expect(line.spans[0].style.strike).toBeUndefined();
  });

  it('an AND/OR connector is its chip’s line, 14 pt as the prototype’s: its word’s line gap adds nothing (T026)', () => {
    const connectors = blocksOf(modelOf(largestConnection()), measure).filter(
      (b) => b.content.kind === 'connector'
    );
    expect(connectors.length).toBeGreaterThan(0);
    const heights = new Set(connectors.map((connector) => connector.height));
    expect([...heights]).toEqual([PDF_LAYOUT.connector.height]);
    // Its word still sits inside it
    const [label] = textsOf(layoutOf(connectors[0].content, measure));
    expect(label.y + label.height).toBeLessThanOrEqual(PDF_LAYOUT.connector.height);
  });

  it.each(['removed', 'dissolved'] as const)(
    'a %s group: "Removed here" on its header, its members faded and struck through',
    (how) => {
      // Taxi's group-1, removed there, or dissolved by removing rule-4 (rule-3 then moves out)
      const branches = SAMPLE_PUBLISHED.branches.map((branch, index) => {
        if (index !== 1) return branch;
        const items = branch.items.map((item): RuleTreeItem => {
          if (item.type !== 'group' || item.id !== 'group-1') return item;
          if (how === 'removed') return { ...item, mark: 'removed' };
          const [rule3, rule4] = item.items;
          return { ...item, items: [rule3, { ...rule4, mark: 'removed' }] };
        });
        return { ...branch, items };
      });
      const blocks = blocksOf(modelOf({ ...SAMPLE_PUBLISHED, branches }), measure).filter(
        (b) => b.place.variant === 'Taxi'
      );
      const group = itemBlocksOf(blocks, 'group-1');
      expect(group.map((block) => block.content.kind)).toEqual(['groupHeader', 'groupEnd']);
      const [header, end] = group;
      expect(header.content).toMatchObject({
        faded: true,
        badge: { mark: 'removed', label: BRANCH_MARK_COPY.en.removed },
      });
      const headerLayout = layoutOf(header.content, measure);
      expect(textOf(headerLayout, 'Licence held long enough').spans[0].style).toBe(
        PDF_STYLES.itemNameFaded
      );
      expect(
        textOf(headerLayout, BRANCH_MARK_COPY.en.removed).spans[0].style.strike
      ).toBeUndefined();
      // Its "Group · <AND/OR in words>" is muted and struck through too (FR-017; T026)
      expect(textOf(headerLayout, PDF_TEXTS.en.group(combinesIn('en', 'or'))).spans[0].style).toBe(
        PDF_STYLES.groupCombinesFaded
      );
      expect(PDF_STYLES.groupCombinesFaded).toMatchObject({
        colour: PDF_COLOURS.muted,
        strike: true,
      });
      // Every member between the header and the end, and the AND/OR between them, fades
      const members = blocks.slice(blocks.indexOf(header) + 1, blocks.indexOf(end));
      expect(members.length).toBeGreaterThan(0);
      for (const member of members) {
        expect(member.content).toMatchObject({ faded: true });
        if (member.content.kind === 'rule') {
          expectFaded(layoutOf(member.content, measure), member.content);
          // A member keeps its own mark: rule-3 has none, rule-4 of the dissolved group is removed
          expect(member.content.badge?.mark ?? null).toBe(how === 'dissolved' ? 'removed' : null);
        }
      }
      const message = textsOf(layoutOf(end.content, measure))[0];
      expect(message.spans.map((span) => span.style)).toEqual([
        PDF_STYLES.messageLabel,
        PDF_STYLES.messageFaded,
      ]);
    }
  );

  it.each(LANGUAGES)('a variant without rules says so, in its unit (FR-019, %s)', (l) => {
    const model = withVariants(
      [variantOf([ruleOf('rule-1')]), variantOf([], { name: 'Empty', origin: 'empty' })],
      l
    );
    const blocks = sectionThreeOf(blocksOf(model, measure));
    const empty = blocks.filter((block) => block.place.variant === 'Empty');
    expect(kindsOf(empty)).toEqual(['variantHeader', 'placeholder']);
    const [header, placeholder] = empty;
    expect(header.keepWithNext).toBe(true);
    expect(placeholder.content).toMatchObject({
      text: CONNECTION_DETAIL_COPY[l].noRules,
      depth: 0,
      within: [
        { type: 'Sect', key: 'section-3' },
        { type: 'Sect', key: 'section-3/variant-1' },
      ],
    });
    expect(placeholder.unitOf).toEqual(['section-3/variant-1']);
    expect(placeholder.place).toEqual({ section: 3, variant: 'Empty', opens: null });
    expect(CONNECTION_DETAIL_COPY.en.noRules).toBe(
      'No rules. Anyone who shares the requested documents can apply.'
    );
  });

  it('an item without a name reads as its identifier, without a message has no message line', () => {
    const model = withVariants([
      variantOf([
        ruleOf('rule-1', { name: '', message: '' }),
        groupOf('group-1', [ruleOf('rule-2'), ruleOf('rule-3')], { name: '', message: null }),
      ]),
    ]);
    const blocks = blocksOf(model, measure);
    const [rule] = itemBlocksOf(blocks, 'rule-1');
    expect(textsOf(layoutOf(rule.content, measure)).map(wordsOf)).toEqual([
      'rule-1',
      'Personal ID · Nationality includes one of',
      'Germany',
      'France',
    ]);
    const [header, end] = itemBlocksOf(blocks, 'group-1');
    expect(textsOf(layoutOf(header.content, measure)).map(wordsOf)).toEqual([
      'group-1',
      PDF_TEXTS.en.group(combinesIn('en', 'or')),
    ]);
    expect(end.content).toMatchObject({ kind: 'groupEnd', message: null });
    expect(end.height).toBe(PDF_LAYOUT.group.endHeight);
  });
});

/** S.combines, the style of a variant's AND/OR line */
const S_COMBINES = PDF_STYLES.combines;

/** A faded rule's texts: muted and struck through but for its identifier, badge and label */
function expectFaded(layout: BlockLayout, content: RuleContent | RuleContinuationContent): void {
  const texts = textsOf(layout);
  for (const text of texts) {
    const words = wordsOf(text);
    if (words.trimEnd() === content.id || words === content.badge?.label) {
      expect(text.spans[0].style.strike).toBeUndefined();
      continue;
    }
    const last = text.spans.at(-1)!.style;
    expect(last.strike).toBe(true);
    expect(last.colour).toBe(PDF_COLOURS.muted);
    if (text.spans.length > 1) expect(text.spans[0].style).toBe(PDF_STYLES.messageLabel);
    // A one-line text's box is its words' width: a strike line can go from x to x + width
    if (text.lines === 'one') expect(text.width).toBe(measure.width(words, last));
  }
}

/**
 * FR-023 and FR-025 over section 3: each variant's header opens its unit and is chained to its
 * first item; a group's header opens its unit, chained to its first member one level deeper; a
 * connector is chained to the item after it, at its depth; a group's last member is chained to
 * the group's closing block; a cut rule's pieces are chained; every block of a variant is in its
 * unit, and every block of a group in the group's
 */
function expectChainsAndUnits(all: Block[]): void {
  const blocks = sectionThreeOf(all);
  expect(blocks[0].content.kind).toBe('sectionHeading');
  expect(blocks[0].keepWithNext).toBe(true);
  expect(blocks[1].content.kind).toBe('variantHeader');
  let variantUnit = '';
  const open: string[] = [];
  blocks.slice(1).forEach((block, offset) => {
    const index = offset + 1;
    const { content } = block;
    const next = blocks[index + 1];
    if (content.kind === 'variantHeader') {
      expect(open).toEqual([]);
      variantUnit = content.within.at(-1)!.key;
      expect(block.startsUnits).toEqual([variantUnit]);
      expect(block.keepWithNext).toBe(true);
    }
    const own = content.kind === 'groupHeader' ? [content.within.at(-1)!.key] : [];
    expect(block.unitOf).toEqual([variantUnit, ...open, ...own]);
    if (content.kind === 'groupHeader') {
      const unit = own[0];
      expect(block.startsUnits).toEqual([unit]);
      expect(block.keepWithNext).toBe(true);
      expect(next.unitOf).toContain(unit);
      if (next.content.kind !== 'groupEnd') {
        expect(['rule', 'groupHeader']).toContain(next.content.kind);
        expect((next.content as { depth: number }).depth).toBe(content.depth + 1);
      }
      open.push(unit);
    }
    if (content.kind === 'connector') {
      expect(block.keepWithNext).toBe(true);
      expect(['rule', 'groupHeader']).toContain(next.content.kind);
      expect((next.content as { depth: number }).depth).toBe(content.depth);
    }
    if (content.kind === 'groupEnd') {
      expect(blocks[index - 1].keepWithNext).toBe(true);
      expect(open.pop()).toBe(content.within.at(-1)!.key);
    }
    if ((content.kind === 'rule' || content.kind === 'ruleContinuation') && content.continues) {
      expect(block.keepWithNext).toBe(true);
      expect(next.content.kind).toBe('ruleContinuation');
    }
  });
  expect(open).toEqual([]);
}

describe('blocksOf: a rule taller than a page (FR-027)', () => {
  /**
   * The worst case of research R11: a rule on nationality with all 249 countries, a 100-character
   * name and a 500-character message, in a sub-group; `last` puts it after rule-4, so that its
   * group's closing blocks are chained to it
   */
  function tallModel(language: Language, last: boolean): ConnectionPdfModel {
    const tall = ruleOf('rule-5', {
      name: ofLength('Nationality of any country of the world ', 100),
      statement: {
        subject: 'Personal ID · Nationality',
        words: 'includes one of',
        values: countriesIn(language),
        tail: null,
      },
      message: ofLength('You need a nationality that the authority recognises. ', 500),
    });
    const subGroup = groupOf('group-2', last ? [ruleOf('rule-4'), tall] : [tall, ruleOf('rule-4')]);
    return withVariants(
      [variantOf([ruleOf('rule-1'), groupOf('group-1', [ruleOf('rule-3'), subGroup])])],
      language
    );
  }

  it.each(LANGUAGES.flatMap((l) => [[l, false] as const, [l, true] as const]))(
    '%s (last member: %s): pieces none taller than the body, every value in order',
    (language, last) => {
      const blocks = blocksOf(tallModel(language, last), measure);
      const pieces = itemBlocksOf(blocks, 'rule-5');
      expect(pieces.length).toBeGreaterThan(1);
      expect(kindsOf(pieces)).toEqual([
        'rule',
        ...Array(pieces.length - 1).fill('ruleContinuation'),
      ]);
      for (const block of blocks) expect(block.height).toBeLessThanOrEqual(BODY.height);
      const [head, ...rest] = pieces.map((piece) => piece.content) as [
        RuleContent,
        ...RuleContinuationContent[],
      ];
      // In order, each once; the message after the last value, in the last piece only
      const values = [...head.statement!.values, ...rest.flatMap((piece) => piece.values)];
      expect(values).toEqual(countriesIn(language));
      const texts = pieces.flatMap((piece) => textsOf(layoutOf(piece.content, measure)));
      const statement = `${head.within.at(-1)!.key}/statement`;
      expect(
        texts
          .filter((text) => leafOf(text) === statement)
          .map(wordsOf)
          .slice(1)
      ).toEqual(countriesIn(language));
      expect(pieces.map((piece) => (piece.content as RuleContent).message !== null)).toEqual([
        ...Array(pieces.length - 1).fill(false),
        true,
      ]);
      expect(head.name).toHaveLength(100);
      expect(head.level).toBe(6);
      // One Div for all pieces; the pieces chained, the last to the group's end when last
      for (const piece of pieces) expect(piece.content.within).toEqual(head.within);
      expect(pieces.map((piece) => piece.keepWithNext)).toEqual([
        ...Array(pieces.length - 1).fill(true),
        last,
      ]);
      expect(pieces.map((piece) => (piece.content as RuleContent).continues)).toEqual([
        ...Array(pieces.length - 1).fill(true),
        false,
      ]);
      expectChainsAndUnits(blocks);
    }
  );

  it.each(LANGUAGES.flatMap((l) => [[l, false] as const, [l, true] as const]))(
    '%s (last member: %s): the pieces flow over pages, the chains around them kept whole',
    (language, last) => {
      const blocks = blocksOf(tallModel(language, last), measure);
      const pages = paginate(blocks, BODY.height);
      const pageOf = pageIndexesOf(pages);
      const pieces = itemBlocksOf(blocks, 'rule-5').map((piece) => blocks.indexOf(piece));
      // Each piece after the head starts a page
      for (const index of pieces.slice(1)) {
        expect(pageOf.get(index)).toBe(pageOf.get(index - 1)! + 1);
      }
      expectPagesKeepChains(blocks, pages);
    }
  );
});

/** Each block's page */
function pageIndexesOf(pages: Page[]): Map<number, number> {
  const pageOf = new Map<number, number>();
  pages.forEach((page, number) => page.forEach(({ index }) => pageOf.set(index, number)));
  return pageOf;
}

/**
 * SC-005 over `paginate()`'s pages: every block lies whole on its page; no page ends with a
 * heading, or with a chained block but inside a rule cut over pages (FR-024, FR-027); a group's
 * header shares a page with its first member, a connector with the item after it and a group's
 * last member with the group's closing block (FR-023)
 */
function expectPagesKeepChains(blocks: Block[], pages: Page[]): void {
  const pageOf = pageIndexesOf(pages);
  expect(pageOf.size).toBe(blocks.length);
  for (const page of pages) {
    for (const { index, y } of page) {
      expect(y + blocks[index].height).toBeLessThanOrEqual(BODY.height + 1e-9);
    }
  }
  for (const page of pages.slice(0, -1)) {
    const { content, keepWithNext } = blocks[page[page.length - 1].index];
    expect(HEADINGS).not.toContain(content.kind);
    const cut =
      (content.kind === 'rule' || content.kind === 'ruleContinuation') && content.continues;
    expect(keepWithNext && !cut, content.key).toBe(false);
  }
  blocks.forEach((block, index) => {
    const { kind } = block.content;
    if (kind === 'groupHeader' || kind === 'connector') {
      expect(pageOf.get(index + 1), block.content.key).toBe(pageOf.get(index));
    }
    if (kind === 'groupEnd') {
      expect(pageOf.get(index - 1), block.content.key).toBe(pageOf.get(index));
    }
  });
}

describe('the largest connection (E) over paginate()’s pages (FR-045, SC-005)', () => {
  const model = modelOf(largestConnection());
  const blocks = blocksOf(model, measure);
  const pages = paginate(blocks, BODY.height);

  it('has 20 variants of 200 items, each in the outline, and cuts each variant’s tall rule', () => {
    expect(blocks.filter((block) => block.bookmark?.level === 2)).toHaveLength(20);
    expect(
      blocks.filter((block) => block.content.kind === 'ruleContinuation').length
    ).toBeGreaterThanOrEqual(20);
    for (const block of blocks) expect(block.height).toBeLessThanOrEqual(BODY.height);
    const keys = blocks.map((block) => block.content.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps every chain of FR-023 and every unit', () => {
    expectChainsAndUnits(blocks);
  });

  it('no page ends with a heading; headers, connectors and closing blocks stay with their items', () => {
    expectPagesKeepChains(blocks, pages);
  });

  it('every page after a variant’s first names the variant with "(continued)"', () => {
    const firstPageOf = new Map<string, number>();
    let continued = 0;
    pages.forEach((page, number) => {
      for (const { index } of page) {
        const { variant } = blocks[index].place;
        if (variant !== null && !firstPageOf.has(variant)) firstPageOf.set(variant, number);
      }
      const first = blocks[page[0].index];
      const { variant } = first.place;
      if (number === 0 || first.place.section !== 3 || variant === null) return;
      const label = placeLabelOf(page, blocks, PLACE_TEXTS);
      if (firstPageOf.get(variant) === number) {
        // The variant starts here, with its header
        expect(first.content.kind).toBe('variantHeader');
        expect(label).toBe(`3 Rules per variant › Variant ${variant}`);
      } else {
        expect(label).toBe(`3 Rules per variant › Variant ${variant} (continued)`);
        continued += 1;
      }
    });
    expect(firstPageOf.size).toBe(20);
    expect(continued).toBeGreaterThan(pages.length / 2);
  });

  it('places each block under the variant whose unit it is in', () => {
    let variant: string | null = null;
    for (const block of sectionThreeOf(blocks).slice(1)) {
      if (block.content.kind === 'variantHeader') variant = block.content.name;
      expect(block.place.variant).toBe(variant);
    }
  });

  it('lays every block out inside its block and the body’s width', () => {
    // Collected, not asserted part by part: E has some hundred thousand parts
    const outside: string[] = [];
    for (const block of sectionThreeOf(blocks)) {
      const layout = layoutOf(block.content, measure);
      if (layout.height !== block.height) outside.push(`${block.content.key}: height`);
      for (const part of layout.parts) {
        if (part.kind !== 'text' && part.kind !== 'rect') continue;
        const inside =
          part.x >= 0 &&
          part.y >= 0 &&
          part.x + part.width <= BODY.width + 1e-9 &&
          part.y + part.height <= layout.height + 1e-9;
        if (!inside) outside.push(`${block.content.key}: ${part.kind} at ${part.x}, ${part.y}`);
      }
    }
    expect(outside).toEqual([]);
  });
});
