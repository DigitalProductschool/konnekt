// The Node smoke test of the drawing (research R14): PDFKit's Node build, the committed TTFs
// inlined by Vite, `compress: false` so that the raw bytes can be read, and `recordingDocument()`
// for what each page draws. The assertions hold per page and per kind, never for a fixed page count
import PDFKit from 'pdfkit';
import { beforeAll, describe, expect, it } from 'vitest';

import { BRANCH_MARK_COPY } from '../../components/BranchMark/constants';
import { CONNECTOR_COPY } from '../../components/Connector/constants';
import { JOIN_OVERLAP } from './blocks';
import { PDF_COLOURS, PDF_LAYOUT, PDF_STYLES, PDF_TEXTS } from './constants';
import { connectionPdfModelOf } from './model';
import { recordingDocument, renderConnectionPdf } from './render';
import {
  largestConnection,
  SAMPLE_DOCUMENT_TYPES,
  SAMPLE_DRAFT,
  SAMPLE_DRAFT_GAPS,
  SAMPLE_OPTION_SETS,
  SAMPLE_PUBLISHED,
} from './testData';
import type {
  ConnectionPdfModel,
  PdfFont,
  PdfFonts,
  PdfItem,
  PdfKitConstructor,
  PdfKitOptions,
  PdfRecording,
  RecordedElement,
  RecordedShape,
  RecordedText,
  TextStyle,
} from './types';

// pdfkit 0.20 ships no types; D1
const PDFDocument = PDFKit as PdfKitConstructor;

const FONT_FILES: Record<PdfFont, string> = {
  regular: 'FiraSans-Regular.ttf',
  medium: 'FiraSans-Medium.ttf',
  semiBold: 'FiraSans-SemiBold.ttf',
  mono: 'FiraMono-Regular.ttf',
  monoMedium: 'FiraMono-Medium.ttf',
};

// The committed TTFs as data URLs, inlined by Vite (`?inline`): no Node API, so the app's program,
// which types only `vite/client`, needs none of Node's types for this test
const FONT_URLS = import.meta.glob<string>('../../assets/fonts/*.ttf', {
  query: '?inline',
  import: 'default',
  eager: true,
});

/** A base64 data URL's bytes */
function bytesOfDataUrl(url: string): Uint8Array {
  const binary = atob(url.slice(url.indexOf(',') + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function fontsOf(): PdfFonts {
  const read = (file: string) => bytesOfDataUrl(FONT_URLS[`../../assets/fonts/${file}`]);
  return {
    regular: read(FONT_FILES.regular),
    medium: read(FONT_FILES.medium),
    semiBold: read(FONT_FILES.semiBold),
    mono: read(FONT_FILES.mono),
    monoMedium: read(FONT_FILES.monoMedium),
  };
}

const FONTS = fontsOf();

/** 16:45 in Germany on 09.11.2026 (CET) */
const NOW = new Date('2026-11-09T15:45:00Z');

/** A connection's model as the hook builds it in English: a draft's with the catalog (D5) */
function modelOf(connection: Parameters<typeof connectionPdfModelOf>[0]): ConnectionPdfModel {
  return connectionPdfModelOf(
    connection,
    {
      optionSets: SAMPLE_OPTION_SETS.en,
      documentTypes: connection.status === 'draft' ? SAMPLE_DOCUMENT_TYPES.en : null,
    },
    { language: 'en', now: NOW }
  );
}

/** A as the hook builds it in English */
function modelOfA(name?: string): ConnectionPdfModel {
  return modelOf(name === undefined ? SAMPLE_PUBLISHED : { ...SAMPLE_PUBLISHED, name });
}

/** PDFKit's document with `compress: false`, so that the dictionaries and the XMP read as bytes */
function uncompressed(Base: PdfKitConstructor): PdfKitConstructor {
  return class extends Base {
    constructor(options?: PdfKitOptions) {
      super({ ...options, compress: false });
    }
  };
}

interface Rendered {
  /** The raw bytes as latin-1 text */
  raw: string;
  recording: PdfRecording;
}

/** Renders through the recording wrapper; uncompressed with the raw bytes unless `raw` is false */
async function render(model: ConnectionPdfModel, { raw = true } = {}): Promise<Rendered> {
  const recorder = recordingDocument(raw ? uncompressed(PDFDocument) : PDFDocument);
  const bytes = await renderConnectionPdf(model, {
    PDFDocument: recorder.PDFDocument,
    fonts: FONTS,
  });
  return {
    raw: raw ? new TextDecoder('latin1').decode(bytes) : '',
    recording: recorder.recording,
  };
}

/** The texts drawn as `Pagination` artifacts on a page */
function paginationTexts(texts: readonly RecordedText[]): RecordedText[] {
  return texts.filter((text) => text.role?.kind === 'artifact' && text.role.type === 'Pagination');
}

/** The elements of a type anywhere under `elements`, in order */
function elementsOfType(elements: readonly RecordedElement[], type: string): RecordedElement[] {
  return elements.flatMap((element) => [
    ...(element.type === type ? [element] : []),
    ...elementsOfType(
      element.children.filter((child): child is RecordedElement => 'type' in child),
      type
    ),
  ]);
}

/** An element's child elements, in order */
function childElementsOf(element: RecordedElement): RecordedElement[] {
  return element.children.filter((child): child is RecordedElement => 'type' in child);
}

/** The texts drawn into an element's own marked content, in order */
function recordedTextsOf(element: RecordedElement, recording: PdfRecording): RecordedText[] {
  return element.children.flatMap((child) =>
    'type' in child
      ? []
      : recording.pages[child.page - 1].texts.filter(
          (text) => text.role?.kind === 'tag' && text.role.mcid === child.mcid
        )
  );
}

/** The texts drawn into an element's own marked content, joined */
function textsOfElement(element: RecordedElement, recording: PdfRecording): string {
  return recordedTextsOf(element, recording)
    .map((text) => text.text)
    .join('');
}

/** The elements of the given types anywhere under `elements`, in document order */
function elementsOfTypes(
  elements: readonly RecordedElement[],
  types: readonly string[]
): RecordedElement[] {
  return elements.flatMap((element) => [
    ...(types.includes(element.type) ? [element] : []),
    ...elementsOfTypes(childElementsOf(element), types),
  ]);
}

/** The shapes drawn in the marked content of a tagged text */
function shapesInTextsTag(text: RecordedText, recording: PdfRecording): RecordedShape[] {
  const { role } = text;
  if (role?.kind !== 'tag') return [];
  return recording.pages[text.page - 1].shapes.filter(
    (shape) => shape.role?.kind === 'tag' && shape.role.mcid === role.mcid
  );
}

/**
 * Every shape is an artifact, but for PDFKit's strike lines (design-notes 8.2 D3): a horizontal
 * line in the marked content of a struck text, in its colour. Collected, not asserted shape by
 * shape: E draws some hundred thousand
 */
function expectShapesArtifactsOrStrikes(recording: PdfRecording): void {
  const failures: string[] = [];
  recording.pages.forEach((page, index) => {
    for (const shape of page.shapes) {
      const { role } = shape;
      if (role?.kind === 'artifact') continue;
      const struck =
        role?.kind === 'tag' &&
        page.texts.some(
          (text) =>
            text.strike &&
            text.role?.kind === 'tag' &&
            text.role.mcid === role.mcid &&
            text.colour === shape.stroke
        );
      if (shape.kind !== 'path' || shape.height !== 0 || shape.fill !== null || !struck) {
        failures.push(`page ${index + 1}: ${shape.kind} at ${shape.x}, ${shape.y}`);
      }
    }
  });
  expect(failures).toEqual([]);
}

/**
 * The seams a viewer may draw (T037a): per page, two filled rects of one colour edge to edge (one's
 * bottom the other's top) where no shape painted after both spans the edge across their shared
 * columns. Anti-aliasing each edge on its own leaves a light hairline there
 */
function seamsOf(recording: PdfRecording): string[] {
  const seams: string[] = [];
  recording.pages.forEach((page, index) => {
    const rects = page.shapes.filter(
      (shape) => shape.kind === 'rect' && shape.fill !== null && shape.height > 0
    );
    rects.forEach((a, i) => {
      rects.forEach((b, j) => {
        if (i === j || a.fill !== b.fill || Math.abs(a.y + a.height - b.y) > 1e-6) return;
        const left = Math.max(a.x, b.x);
        const right = Math.min(a.x + a.width, b.x + b.width);
        if (right - left < 0.01) return;
        const edge = b.y;
        const covers = rects
          .slice(Math.max(i, j) + 1)
          .filter((c) => c.y <= edge - 0.5 && c.y + c.height >= edge + 0.5)
          .map((c) => [c.x, c.x + c.width] as const)
          .sort((m, n) => m[0] - n[0]);
        let reached = left;
        for (const [from, to] of covers)
          if (from <= reached + 1e-6) reached = Math.max(reached, to);
        if (reached < right - 1e-6) {
          seams.push(`page ${index + 1}: ${a.fill} at y ${edge.toFixed(2)}, x ${left.toFixed(2)}`);
        }
      });
    });
  });
  return seams;
}

/**
 * A one-line text struck through as D3 says: PDFKit's line in the text's own marked content, in
 * its colour, as wide as its words, through the middle of its line (half PDFKit's line height
 * below the line's top: 0.6 × the size in Fira Sans)
 */
function expectStruck(text: RecordedText, recording: PdfRecording): void {
  expect(text.strike, text.text).toBe(true);
  const lines = shapesInTextsTag(text, recording).filter(
    (shape) => Math.abs(shape.width - text.advance) < 0.01
  );
  expect(lines, text.text).toHaveLength(1);
  const [line] = lines;
  expect(line.kind).toBe('path');
  expect(line.height).toBe(0);
  expect(line.stroke).toBe(text.colour);
  // A span after the message's label starts where the label ends
  expect(line.x).toBeGreaterThanOrEqual(text.x - 1e-6);
  expect(line.y).toBeCloseTo(text.y + 0.6 * text.size, 1);
}

/** A level's items and their members, depth first: the Summary's order, with their depth */
function itemsInOrder(items: readonly PdfItem[], depth = 0): { item: PdfItem; depth: number }[] {
  return items.flatMap((item) => [
    { item, depth },
    ...(item.type === 'group' ? itemsInOrder(item.items, depth + 1) : []),
  ]);
}

/** The AND/OR chips between a level's items and its groups' members */
function connectorCountOf(items: readonly PdfItem[]): number {
  return items.reduce(
    (sum, item) => sum + (item.type === 'group' ? connectorCountOf(item.items) : 0),
    Math.max(0, items.length - 1)
  );
}

/** The bottom's place label on each page: a `Pagination` text in the label's face on its line */
function placeLabelsOf(recording: PdfRecording): RecordedText[][] {
  const bottomY = PDF_LAYOUT.bottom.ruleY + PDF_LAYOUT.bottom.textGap;
  return recording.pages.map((page) =>
    paginationTexts(page.texts).filter(
      (text) => text.y === bottomY && text.font === PDF_STYLES.bottomLabel.font
    )
  );
}

/** A, published, and the drafts C (with Hire car's two gaps) and D (without gaps), in English */
const DOCUMENTS: [string, ConnectionPdfModel][] = [
  ['A', modelOfA()],
  ['C', modelOf(SAMPLE_DRAFT_GAPS)],
  ['D', modelOf(SAMPLE_DRAFT)],
];

describe.each(DOCUMENTS)('renderConnectionPdf, %s in English', (_name, model) => {
  const draft = model.kind === 'draft';
  let rendered: Rendered;

  beforeAll(async () => {
    rendered = await render(model);
  });

  it('writes a tagged PDF/UA document with its language, title and outline, and no CIDSet', () => {
    const { raw } = rendered;
    expect(raw.startsWith('%PDF-1.7')).toBe(true);
    expect(raw).toContain('/Lang (en-GB)');
    expect(raw).toContain('/StructTreeRoot');
    expect(raw).toContain('/MarkInfo');
    expect(raw).toContain('/DisplayDocTitle true');
    expect(raw).toContain('/Outlines');
    expect(raw).toContain('pdfuaid:part');
    expect(raw).not.toContain('/CIDSet');
  });

  it('sets the properties of contracts/pdf-document.md section 4 and no custom key', () => {
    const info = rendered.recording.options?.info;
    expect(info).toEqual({
      Title: draft ? PDF_TEXTS.en.titleDraft(model.name) : PDF_TEXTS.en.title(model.name),
      Subject: `Connection ${model.id}, version ${model.version}`,
      Keywords: `connection ${model.id}; version ${model.version}${draft ? '; draft' : ''}`,
      Author: 'Konnekt',
      Creator: 'Konnekt',
    });
    expect(rendered.recording.options).toMatchObject({
      size: 'A4',
      pdfVersion: '1.7',
      subset: 'PDF/UA',
      tagged: true,
      displayTitle: true,
      lang: 'en-GB',
      font: null,
    });
  });

  it('carries the ID, the version and "Page n of N" on every page, as Pagination artifacts', () => {
    const { pages } = rendered.recording;
    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((page, index) => {
      const band = paginationTexts(page.texts).map((text) => text.text);
      expect(band).toContain(PDF_TEXTS.en.idLine(model.id));
      expect(band).toContain(PDF_TEXTS.en.versionLine(model.version));
      expect(band).toContain(PDF_TEXTS.en.page(index + 1, pages.length));
    });
  });

  it('draws no text and no shape outside a tag or an artifact', () => {
    for (const page of rendered.recording.pages) {
      expect(page.texts.filter((text) => text.role === null)).toEqual([]);
      expect(page.shapes.filter((shape) => shape.role === null)).toEqual([]);
    }
  });

  it('draws every shape as an artifact, but for the strike lines in a struck text’s tag (D3)', () => {
    expectShapesArtifactsOrStrikes(rendered.recording);
  });

  it('joins the fills that continue one another without a seam: group bars, the gaps box (T037a)', () => {
    expect(seamsOf(rendered.recording)).toEqual([]);
  });

  it('names the page’s place at the bottom from page 2 on, and none on page 1', () => {
    const [first, ...rest] = placeLabelsOf(rendered.recording);
    expect(first).toEqual([]);
    for (const labels of rest) expect(labels).toHaveLength(1);
  });

  it('builds the structure tree: Document, a Sect per part, the H1, the details table', () => {
    const { structure } = rendered.recording;
    expect(structure.map((element) => element.type)).toEqual(['Document']);
    const parts = structure[0].children;
    expect(parts.every((child) => 'type' in child && child.type === 'Sect')).toBe(true);
    const [h1] = elementsOfType(structure, 'H1');
    expect(elementsOfType(structure, 'H1')).toHaveLength(1);
    expect(textsOfElement(h1, rendered.recording)).toBe(model.name);
    const headers = elementsOfType(structure, 'TH');
    expect(headers.length).toBeGreaterThan(0);
    expect(headers.every((header) => header.scope === 'Row')).toBe(true);
    const rows = elementsOfType(structure, 'TR');
    expect(rows.length).toBe(headers.length);
    expect(
      rows.map((row) => row.children.map((cell) => ('type' in cell ? cell.type : 'content')))
    ).toEqual(rows.map(() => ['TH', 'TD']));
  });

  it('lists the data items, and a draft’s gaps, as L › LI › LBody', () => {
    const lists = elementsOfType(rendered.recording.structure, 'L');
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) {
      for (const item of list.children) {
        expect('type' in item && item.type).toBe('LI');
        if ('type' in item) {
          expect(item.children.map((child) => 'type' in child && child.type)).toEqual(['LBody']);
        }
      }
    }
  });

  it('points an outline entry to the page where each section starts', () => {
    const { outline, pages } = rendered.recording;
    expect(outline.length).toBeGreaterThanOrEqual(2);
    expect(outline.map((item) => item.title).slice(0, 2)).toEqual([
      '1 Links for your service',
      `2 ${PDF_TEXTS.en.section2}`,
    ]);
    for (const item of outline) {
      const title = item.title.replace(/^\d /, '');
      const page = pages[item.page - 1];
      const heading = page.texts.find(
        (text) => text.role?.kind === 'tag' && text.role.type === 'H2' && text.text === title
      );
      expect(heading, item.title).toBeDefined();
    }
  });
});

describe('renderConnectionPdf, A with a 100-character name', () => {
  const name =
    `${'Wohnberechtigungsschein für Studierende der Universität Stuttgart '.repeat(2)}`.slice(
      0,
      100
    );
  const model = modelOfA(name);
  let rendered: Rendered;

  beforeAll(async () => {
    rendered = await render(model);
  });

  it('cuts the name in the band to one line ending in "…", no wider than its box', () => {
    const boxWidth = PDF_LAYOUT.body.width * PDF_LAYOUT.band.nameWidthShare;
    const { pages } = rendered.recording;
    expect(name).toHaveLength(100);
    pages.forEach((page) => {
      const cut = paginationTexts(page.texts).filter((text) => text.text.endsWith('…'));
      expect(cut).toHaveLength(1);
      const [band] = cut;
      expect(name.startsWith(band.text.slice(0, -1))).toBe(true);
      expect(band.text).not.toContain('\n');
      expect(band.width).toBeNull();
      expect(band.advance).toBeLessThanOrEqual(boxWidth);
      expect(band.font).toBe(PDF_STYLES.bandName.font);
    });
  });

  it('keeps the name in full in page 1’s H1 and in the Title', () => {
    const [h1] = elementsOfType(rendered.recording.structure, 'H1');
    expect(textsOfElement(h1, rendered.recording)).toBe(name);
    expect(rendered.recording.options?.info?.Title).toBe(PDF_TEXTS.en.title(name));
  });
});

describe('renderConnectionPdf, A’s section 3 in English', () => {
  const model = modelOfA();
  const texts = PDF_TEXTS.en;
  let rendered: Rendered;

  beforeAll(async () => {
    rendered = await render(model);
  });

  /** Section 3's `Sect`: the one whose `H2` names it */
  const sectionThree = (): RecordedElement => {
    const sections = childElementsOf(rendered.recording.structure[0]).filter((sect) =>
      childElementsOf(sect).some(
        (child) =>
          child.type === 'H2' && textsOfElement(child, rendered.recording).endsWith(texts.section3)
      )
    );
    expect(sections).toHaveLength(1);
    return sections[0];
  };

  it('says "Changed here", "Added here" and "Removed here" in words, each a Span', () => {
    const spans = elementsOfType(rendered.recording.structure, 'Span').map((span) =>
      textsOfElement(span, rendered.recording)
    );
    expect(spans).toEqual(expect.arrayContaining(['Changed here', 'Added here', 'Removed here']));
  });

  it('gives each variant a Sect with its H3, origin and AND/OR in words, in the details’ order', () => {
    const variants = childElementsOf(sectionThree()).filter((child) => child.type === 'Sect');
    expect(variants).toHaveLength(model.variants.length);
    variants.forEach((sect, index) => {
      const variant = model.variants[index];
      const [title, ...rest] = childElementsOf(sect);
      expect(title.type).toBe('H3');
      expect(textsOfElement(title, rendered.recording)).toBe(texts.variant(variant.name));
      const paragraphs = rest
        .filter((child) => child.type === 'P')
        .map((paragraph) => textsOfElement(paragraph, rendered.recording));
      expect(paragraphs).toContain(
        { main: texts.originMain, based: texts.originBased, empty: texts.originEmpty }[
          variant.origin
        ]
      );
      const { descriptions, labels } = CONNECTOR_COPY.en;
      expect(paragraphs).toContain(
        `${descriptions[variant.operator]} (${labels[variant.operator]})`
      );
      // One Div per item at the variant's level, after the header's texts
      expect(rest.filter((child) => child.type === 'Div')).toHaveLength(variant.items.length);
    });
  });

  it('draws each rule’s and group’s identifier in the Summary’s order, its heading at its depth holding identifier and name', () => {
    const expected = model.variants.flatMap((variant) => itemsInOrder(variant.items));
    const headings = elementsOfTypes(rendered.recording.structure, ['H4', 'H5', 'H6']);
    expect(headings.map((heading) => textsOfElement(heading, rendered.recording))).toEqual(
      expected.map(({ item }) => `${item.id} ${item.name}`)
    );
    expect(headings.map((heading) => heading.type)).toEqual(
      expected.map(({ depth }) => `H${Math.min(6, 4 + depth)}`)
    );
    // In drawing order too, page by page: the identifiers in the identifier's face
    const identifiers = rendered.recording.pages.flatMap((page) =>
      page.texts
        .filter(
          (text) =>
            text.role?.kind === 'tag' &&
            ['H4', 'H5', 'H6'].includes(text.role.type) &&
            text.font === PDF_STYLES.itemId.font
        )
        .map((text) => text.text.trimEnd())
    );
    expect(identifiers).toEqual(expected.map(({ item }) => item.id));
  });

  it('nests a group’s members in its Div, after its header and before its own message', () => {
    const groups = elementsOfType(rendered.recording.structure, 'Div').filter((div) =>
      textsOfElement(childElementsOf(div)[0], rendered.recording).startsWith('group-')
    );
    const expected = model.variants
      .flatMap((variant) => itemsInOrder(variant.items))
      .flatMap(({ item }) => (item.type === 'group' ? [item] : []));
    expect(groups).toHaveLength(expected.length);
    groups.forEach((group, index) => {
      const { items, message } = expected[index];
      const children = childElementsOf(group);
      expect(children[0].type).toMatch(/^H[456]$/);
      expect(children.slice(1).map((child) => child.type)).toEqual([
        ...(children[1].type === 'Span' ? ['Span'] : []),
        'P',
        ...items.map(() => 'Div'),
        ...(message ? ['P'] : []),
      ]);
      const combines = children.find((child) => child.type === 'P');
      expect(combines && textsOfElement(combines, rendered.recording)).toMatch(/^Group · /);
      if (message) {
        expect(textsOfElement(children[children.length - 1], rendered.recording)).toBe(
          `Message for citizens: ${message}`
        );
      }
    });
  });

  it('draws the AND/OR chips’ words as artifacts only, one per chip', () => {
    const { labels } = CONNECTOR_COPY.en;
    const words = [labels.and, labels.or];
    const drawn = rendered.recording.pages.flatMap((page) =>
      page.texts.filter((text) => words.includes(text.text))
    );
    expect(
      drawn.every((text) => text.role?.kind === 'artifact' && text.role.type === 'Layout')
    ).toBe(true);
    expect(drawn).toHaveLength(
      model.variants.reduce((sum, variant) => sum + connectorCountOf(variant.items), 0)
    );
  });

  it('strikes the removed rule’s name, statement and message through, muted; not its identifier, badge or label (D3)', () => {
    const { recording } = rendered;
    const removed = elementsOfType(recording.structure, 'Div').filter((div) =>
      childElementsOf(div).some(
        (child) =>
          child.type === 'Span' && textsOfElement(child, recording) === BRANCH_MARK_COPY.en.removed
      )
    );
    // Taxi's rule-5
    expect(removed).toHaveLength(1);
    const [heading, badge, statement, message] = childElementsOf(removed[0]);
    const [identifier, name] = recordedTextsOf(heading, recording);
    expect(identifier.strike).toBe(false);
    expect(shapesInTextsTag(identifier, recording)).toEqual([]);
    expectStruck(name, recording);
    for (const text of recordedTextsOf(badge, recording)) expect(text.strike).toBe(false);
    const statementTexts = recordedTextsOf(statement, recording);
    expect(statementTexts.length).toBeGreaterThan(1);
    for (const text of statementTexts) expectStruck(text, recording);
    const [label, words] = recordedTextsOf(message, recording);
    expect(label.strike).toBe(false);
    expectStruck(words, recording);
    const struck = [name, ...statementTexts, words];
    for (const text of struck) expect(text.colour).toBe(PDF_COLOURS.muted);
    // Nothing else in A is struck through
    const allStruck = recording.pages.flatMap((page) => page.texts.filter((text) => text.strike));
    expect(allStruck).toHaveLength(struck.length);
  });
});

/** PDFKit's width of `text` in a style, measured with the committed fonts */
function widthIn(text: string, style: TextStyle): number {
  const doc = new PDFDocument({ autoFirstPage: false, font: null });
  doc.registerFont(style.font, FONTS[style.font]);
  doc.font(style.font, style.size);
  return doc.widthOfString(text);
}

describe('renderConnectionPdf, the tagged text of A’s headings (contracts/pdf-document.md section 4)', () => {
  const model = modelOfA();
  let rendered: Rendered;

  beforeAll(async () => {
    rendered = await render(model, { raw: false });
  });

  /** A heading's texts, in drawing order, and what they read joined */
  const headingsOf = (types: readonly string[]) =>
    elementsOfTypes(rendered.recording.structure, types).map((element) => ({
      texts: recordedTextsOf(element, rendered.recording),
      reads: textsOfElement(element, rendered.recording),
    }));

  it('reads each heading with single spaces: "3 Rules per variant", "Variant Taxi", "rule-1 Minimum age"', () => {
    const reads = headingsOf(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']).map(({ reads }) => reads);
    expect(reads.filter((text) => /\s{2}|^\s|\s$/.test(text))).toEqual([]);
    expect(reads).toEqual(
      expect.arrayContaining([
        '1 Links for your service',
        '2 Documents and data items',
        '3 Rules per variant',
        'Personal ID 7 data items',
        'Variant Standard',
        'Variant Taxi',
        'rule-1 Minimum age',
        'group-1 Licence held long enough',
      ])
    );
  });

  it('draws the gaps as before: the second part where the first part and its separator end', () => {
    const layout = PDF_LAYOUT;
    const [section] = headingsOf(['H2']);
    const [number, title] = section.texts;
    expect(title.x).toBeCloseTo(
      number.x + widthIn(`1${layout.section.numberSeparator}`, PDF_STYLES.sectionNumber),
      6
    );
    const variant = headingsOf(['H3']).find(({ reads }) => reads === 'Variant Taxi')!;
    const [word, name] = variant.texts;
    expect(name.x).toBeCloseTo(
      word.x + widthIn(`Variant${layout.variant.wordSeparator}`, PDF_STYLES.variantWord),
      6
    );
    const document = headingsOf(['H3']).find(({ reads }) => reads.startsWith('Personal ID'))!;
    const [documentName, count] = document.texts;
    expect(count.x).toBeCloseTo(
      documentName.x +
        widthIn('Personal ID', PDF_STYLES.documentName) +
        widthIn(layout.document.countSeparator, PDF_STYLES.documentCount),
      6
    );
    const rule = headingsOf(['H4']).find(({ reads }) => reads === 'rule-1 Minimum age')!;
    const [identifier, ruleName] = rule.texts;
    expect(ruleName.x).toBeCloseTo(
      identifier.x + widthIn('rule-1', PDF_STYLES.itemId) + layout.rule.idExtraWidth,
      6
    );
    for (const [first, second] of [
      [number, title],
      [word, name],
      [documentName, count],
    ]) {
      expect(second.y).toBe(first.y);
    }
  });
});

/** E renders in about 8 s in Node alone (T025); the margin covers a loaded machine */
const LARGEST_TIMEOUT_MS = 120_000;

describe('renderConnectionPdf, the largest connection (E)', () => {
  const model = modelOf(largestConnection());
  let rendered: Rendered;

  beforeAll(async () => {
    rendered = await render(model, { raw: false });
  }, LARGEST_TIMEOUT_MS);

  it('carries the ID, the version and "Page n of N" on every page, and a place from page 2 on', () => {
    const { pages } = rendered.recording;
    expect(pages.length).toBeGreaterThan(model.variants.length);
    const missing: number[] = [];
    pages.forEach((page, index) => {
      const band = paginationTexts(page.texts).map((text) => text.text);
      const carries =
        band.includes(PDF_TEXTS.en.idLine(model.id)) &&
        band.includes(PDF_TEXTS.en.versionLine(model.version)) &&
        band.includes(PDF_TEXTS.en.page(index + 1, pages.length));
      if (!carries) missing.push(index + 1);
    });
    expect(missing).toEqual([]);
    const [first, ...rest] = placeLabelsOf(rendered.recording);
    expect(first).toEqual([]);
    expect(rest.filter((labels) => labels.length !== 1)).toEqual([]);
  });

  it('draws no text outside a tag or an artifact, and every shape as an artifact or a strike line', () => {
    const untagged = rendered.recording.pages.flatMap((page) =>
      page.texts.filter((text) => text.role === null)
    );
    expect(untagged).toEqual([]);
    expectShapesArtifactsOrStrikes(rendered.recording);
  });

  it('continues a rule taller than a page in its own Div and statement P on the next page', () => {
    const { recording } = rendered;
    const pagesOf = (element: RecordedElement) =>
      new Set(element.children.flatMap((child) => ('type' in child ? [] : [child.page])));
    const cut = elementsOfType(recording.structure, 'Div').filter((div) =>
      childElementsOf(div).some((child) => child.type === 'P' && pagesOf(child).size > 1)
    );
    // Each variant's tall rule (blocks.test.ts)
    expect(cut.length).toBeGreaterThanOrEqual(model.variants.length);
    for (const div of cut) {
      const [heading, ...rest] = childElementsOf(div)
        .map((child) => child.type)
        .filter((type) => type !== 'Span');
      expect(heading).toMatch(/^H[456]$/);
      // One statement and, when the rule has one, one message: the pieces share them
      expect([['P'], ['P', 'P']]).toContainEqual(rest);
    }
  });

  it('mutes and strikes the "Group · …" line of every removed or dissolved group, and of no other (FR-017)', () => {
    const groups = model.variants
      .flatMap((variant) => itemsInOrder(variant.items))
      .flatMap(({ item }) => (item.type === 'group' ? [item] : []));
    const faded = groups.filter((group) => group.faded).length;
    expect(faded).toBeGreaterThan(0);
    const lines = rendered.recording.pages.flatMap((page) =>
      page.texts.filter((text) => text.role?.kind === 'tag' && text.text.startsWith('Group · '))
    );
    expect(lines).toHaveLength(groups.length);
    const struck = lines.filter((text) => text.strike);
    expect(struck).toHaveLength(faded);
    expect(new Set(struck.map((text) => text.colour))).toEqual(new Set([PDF_COLOURS.muted]));
    expect(new Set(lines.filter((text) => !text.strike).map((text) => text.colour))).toEqual(
      new Set([PDF_COLOURS.accent])
    );
  });

  it('joins its group bars without a seam on every page (T037a)', () => {
    expect(seamsOf(rendered.recording)).toEqual([]);
  });

  it('lists every variant in the outline under section 3', () => {
    const [, , rules] = rendered.recording.outline;
    expect(rules.children.map((item) => item.title)).toEqual(
      model.variants.map((variant) => PDF_TEXTS.en.variant(variant.name))
    );
  });
});

/** The texts of a page drawn as `Pagination` artifacts whose words are `text` */
function paginationTextsReading(page: { texts: RecordedText[] }, text: string): RecordedText[] {
  return paginationTexts(page.texts).filter((recorded) => recorded.text === text);
}

describe.each([
  ['C', SAMPLE_DRAFT_GAPS],
  ['D', SAMPLE_DRAFT],
] as const)('renderConnectionPdf, the draft %s in English', (name, connection) => {
  const model = modelOf(connection);
  const texts = PDF_TEXTS.en;
  let rendered: Rendered;

  beforeAll(async () => {
    rendered = await render(model, { raw: false });
  });

  it('holds no URL: no recorded text of any page, no property and no outline entry (FR-013)', () => {
    const { recording } = rendered;
    const drawn = recording.pages.flatMap((page) => page.texts.map((text) => text.text));
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.filter((text) => /http/i.test(text) || text.includes('/api/connect'))).toEqual([]);
    const said = [
      ...Object.values(recording.options?.info ?? {}).map(String),
      ...recording.outline.flatMap((item) => [item.title, ...item.children.map((c) => c.title)]),
    ];
    expect(said.filter((text) => /http/i.test(text) || text.includes('/api/connect'))).toEqual([]);
  });

  it('carries the "Draft · Not live" pill in the band of every page, left of the version (FR-020)', () => {
    const pill = texts.draftNotLive.toUpperCase();
    expect(pill).toBe('DRAFT · NOT LIVE');
    rendered.recording.pages.forEach((page, index) => {
      const [word, ...others] = paginationTextsReading(page, pill);
      expect(others, `page ${index + 1}`).toEqual([]);
      expect(word, `page ${index + 1}`).toBeDefined();
      expect(word).toMatchObject({ colour: PDF_COLOURS.white, opacity: 1 });
      const shapes = page.shapes.filter(
        (shape) =>
          shape.fill === PDF_COLOURS.draft &&
          shape.role?.kind === 'artifact' &&
          shape.role.type === 'Pagination'
      );
      expect(shapes).toHaveLength(1);
      const [shape] = shapes;
      // The word inside its pill, the pill left of the version, the name cut before the pill
      expect(word.x).toBe(shape.x);
      expect(word.width).toBe(shape.width);
      expect(word.advance).toBeLessThan(shape.width);
      const [version] = paginationTextsReading(page, texts.versionLine(model.version));
      expect(version.colour).toBe(PDF_COLOURS.draft);
      const versionLeft = version.x + (version.width ?? 0) - version.advance;
      expect(shape.x + shape.width).toBeCloseTo(
        versionLeft - PDF_LAYOUT.band.draftPill.gapToVersion,
        6
      );
      const nameText = paginationTexts(page.texts).find(
        (text) => text.font === PDF_STYLES.bandName.font && text.size === PDF_STYLES.bandName.size
      );
      expect(nameText!.x + nameText!.advance).toBeLessThan(shape.x);
    });
  });

  it('draws the faint "DRAFT" last on every page, a Pagination artifact at 6 % (FR-022, FR-037)', () => {
    const style = PDF_STYLES.watermark;
    rendered.recording.pages.forEach((page, index) => {
      const marks = page.texts.filter((text) => text.text === texts.watermark);
      expect(marks, `page ${index + 1}`).toHaveLength(1);
      const [mark] = marks;
      expect(page.texts.at(-1)).toBe(mark);
      expect(mark).toMatchObject({
        font: style.font,
        size: style.size,
        colour: PDF_COLOURS.watermark,
        opacity: PDF_COLOURS.watermarkOpacity,
        strike: false,
        role: { kind: 'artifact', type: 'Pagination' },
      });
      // Centred on the page (the position before the rotation about the page's centre)
      expect(mark.x + mark.advance / 2).toBeCloseTo(PDF_LAYOUT.page.width / 2, 6);
      expect(mark.y).toBe(PDF_LAYOUT.page.height / 2 + PDF_LAYOUT.watermark.offsetY);
      // The opacity goes no further than the watermark
      for (const text of page.texts) if (text !== mark) expect(text.opacity).toBe(1);
      for (const shape of page.shapes) expect(shape.opacity).toBe(1);
    });
  });

  it('lists the gaps on page 1 as the box’s H2, sentence and L, or has no such box (FR-010)', () => {
    const { recording } = rendered;
    const title = texts.gapsTitle(model.gaps.length);
    const headings = elementsOfType(recording.structure, 'H2').filter((heading) =>
      textsOfElement(heading, recording).startsWith('To finish before publishing')
    );
    if (name === 'D') {
      expect(model.gaps).toEqual([]);
      expect(headings).toEqual([]);
      const drawn = recording.pages.flatMap((page) => page.texts.map((text) => text.text));
      expect(drawn.some((text) => text.startsWith('To finish before publishing'))).toBe(false);
      return;
    }
    expect(headings).toHaveLength(1);
    expect(textsOfElement(headings[0], recording)).toBe(title);
    const sect = childElementsOf(recording.structure[0]).find((part) =>
      childElementsOf(part).includes(headings[0])
    )!;
    // The page's second part, after page 1's
    expect(childElementsOf(recording.structure[0]).indexOf(sect)).toBe(1);
    const [heading, lead, list, ...rest] = childElementsOf(sect);
    expect([heading.type, lead.type, list.type, rest]).toEqual(['H2', 'P', 'L', []]);
    expect(textsOfElement(lead, recording)).toBe(texts.gapsLead);
    const items = childElementsOf(list);
    expect(items.map((item) => item.type)).toEqual(['LI', 'LI']);
    expect(items.map((item) => textsOfElement(childElementsOf(item)[0], recording))).toEqual([
      'Licence class B in Hire car has no error message.',
      'Licence still valid in Hire car: choose a check.',
    ]);
    // All on page 1
    for (const element of [heading, lead, ...items.map((item) => childElementsOf(item)[0])]) {
      for (const text of recordedTextsOf(element, recording)) expect(text.page).toBe(1);
    }
    // No outline entry for the box
    expect(recording.outline.map((item) => item.title)).not.toContain(title);
  });

  it('draws the gaps box as one box on page 1: each gap’s bar and strip reach over the join (T037a)', () => {
    const [first] = rendered.recording.pages;
    const bars = first.shapes.filter(
      (shape) => shape.kind === 'rect' && shape.fill === PDF_COLOURS.warning
    );
    const strips = first.shapes.filter(
      (shape) =>
        shape.kind === 'rect' &&
        shape.fill === PDF_COLOURS.warningBackground &&
        shape.x === PDF_LAYOUT.body.x + PDF_LAYOUT.gaps.barWidth
    );
    if (name === 'D') {
      expect([...bars, ...strips]).toEqual([]);
      return;
    }
    // The heading's bar, then one per gap, each from JOIN_OVERLAP above the slice before's end
    expect(bars).toHaveLength(3);
    for (const [index, bar] of bars.entries()) {
      if (index === 0) continue;
      const before = bars[index - 1];
      expect(bar.y).toBeCloseTo(before.y + before.height - JOIN_OVERLAP, 6);
      expect(bar.x).toBe(PDF_LAYOUT.body.x);
    }
    // A strip of the fill right of each gap's bar, across the join
    expect(strips).toHaveLength(2);
    for (const [index, strip] of strips.entries()) {
      const join = bars[index].y + bars[index].height;
      expect(strip.y).toBeCloseTo(join - JOIN_OVERLAP, 6);
      expect(strip.height).toBeCloseTo(2 * JOIN_OVERLAP, 6);
    }
    // Nothing of the box above its heading's top
    const box = first.shapes.filter(
      (shape) => shape.fill === PDF_COLOURS.warning || shape.fill === PDF_COLOURS.warningBackground
    );
    expect(Math.min(...box.map((shape) => shape.y))).toBe(bars[0].y);
  });

  it('ends each incomplete rule with "Not complete: …" in its Div, after what it has (FR-018)', () => {
    const { recording } = rendered;
    const notes = elementsOfType(recording.structure, 'P').filter((paragraph) =>
      textsOfElement(paragraph, recording).startsWith('Not complete:')
    );
    const marks = recording.pages.flatMap((page) => page.texts.filter((text) => text.text === '!'));
    if (name === 'D') {
      expect(notes).toEqual([]);
      expect(marks).toEqual([]);
      return;
    }
    expect(notes.map((note) => textsOfElement(note, recording))).toEqual([
      'Not complete: Write the message for citizens.',
      'Not complete: Choose a check.',
    ]);
    for (const note of notes) {
      const [text] = recordedTextsOf(note, recording);
      expect(text.colour).toBe(PDF_COLOURS.warning);
      const div = elementsOfType(recording.structure, 'Div').find((candidate) =>
        childElementsOf(candidate).includes(note)
      )!;
      const children = childElementsOf(div);
      expect(children.at(-1)).toBe(note);
      // rule-11: heading and statement; rule-12: heading and its subject alone
      expect(children.map((child) => child.type)).toEqual(['H4', 'P', 'P']);
    }
    expect(
      textsOfElement(
        childElementsOf(
          elementsOfType(recording.structure, 'Div').find((div) =>
            childElementsOf(div).includes(notes[1])
          )!
        )[1],
        recording
      )
    ).toBe('Driving licence · Expiry date');
    // The "!" before each, in its circle: artifacts
    expect(marks).toHaveLength(2);
    for (const mark of marks) expect(mark.role).toEqual({ kind: 'artifact', type: 'Layout' });
  });
});

describe('renderConnectionPdf, a draft with 80 gaps (T037a)', () => {
  const base = modelOf(SAMPLE_DRAFT_GAPS);
  const model: ConnectionPdfModel = {
    ...base,
    gaps: Array.from({ length: 80 }, (_, index) => ({
      ...base.gaps[0],
      text: `Rule ${index + 1} in Variant ${index % 7}: choose a check.`,
    })),
  };
  let rendered: Rendered;

  beforeAll(async () => {
    rendered = await render(model, { raw: false });
  });

  it('continues the box at the top of the next pages, with nothing drawn above it, and no seam', () => {
    // The box's rects: its fills and bars start at the body's left edge or right of the bar (an
    // incomplete rule's "Not complete" mark, in the warning colour too, sits inside its card)
    const lefts = [PDF_LAYOUT.body.x, PDF_LAYOUT.body.x + PDF_LAYOUT.gaps.barWidth];
    const boxes = rendered.recording.pages
      .map((page) =>
        page.shapes.filter(
          (shape) =>
            shape.kind === 'rect' &&
            lefts.includes(shape.x) &&
            (shape.fill === PDF_COLOURS.warning || shape.fill === PDF_COLOURS.warningBackground)
        )
      )
      .filter((shapes) => shapes.length > 0);
    expect(boxes.length).toBeGreaterThan(2);
    for (const shapes of boxes.slice(1)) {
      expect(Math.min(...shapes.map((shape) => shape.y))).toBe(PDF_LAYOUT.body.y);
    }
    for (const shapes of boxes) {
      const bottom = Math.max(...shapes.map((shape) => shape.y + shape.height));
      expect(bottom).toBeLessThanOrEqual(PDF_LAYOUT.body.y + PDF_LAYOUT.body.height + 1e-6);
    }
    expect(seamsOf(rendered.recording)).toEqual([]);
  });
});
