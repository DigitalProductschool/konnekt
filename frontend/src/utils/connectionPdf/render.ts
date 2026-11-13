// The connection PDF's drawing (contracts/pdf-worker.md sections 3 and 4; contracts/pdf-document.md
// sections 1 and 4; research R5, R11, R14): the document with its properties, the five fonts, the
// `Measure`, the blocks placed by `paginate()`, each drawn through its `layoutOf()` geometry inside
// the structure tree, the band and the bottom of every page, and the outline. Pure: it receives
// PDFKit's constructor (the browser build in the worker, the Node build in the smoke test) and the
// fonts' bytes, imports PDFKit's types only and touches no browser API; nothing is stored, sent or
// logged (FR-041, FR-042)
import type { Language } from '@connection-portal/rules/language';

import { CONNECTION_DETAIL_COPY } from '../../pages/FormConnectionDetail/constants';
import { blocksOf, layoutOf, reachOf } from './blocks';
import { PDF_COLOURS, PDF_LAYOUT, PDF_STYLES, PDF_TEXTS } from './constants';
import { paginate, placeLabelOf } from './paginate';
import type {
  ArtifactType,
  Block,
  BlockLayout,
  ConnectionPdfModel,
  LayoutPart,
  Measure,
  PdfBookmark,
  PdfFont,
  PdfKitConstructor,
  PdfKitDocument,
  PdfKitEmbeddedFont,
  PdfKitInfo,
  PdfKitOptions,
  PdfKitOutline,
  PdfKitStructChild,
  PdfKitStructOptions,
  PdfKitStructureElement,
  PdfKitTextOptions,
  PdfRecording,
  PdfRenderOptions,
  PlacedRect,
  PlacedShape,
  PlacedText,
  RecordedElement,
  RecordedOutlineItem,
  RecordedPage,
  RecordedRole,
  RecordedShape,
  StrokeStyle,
  StructNode,
  StructType,
  TextRole,
  TextSpan,
  TextStyle,
} from './types';

const L = PDF_LAYOUT;
const S = PDF_STYLES;
const C = PDF_COLOURS;
const BODY_WIDTH = L.body.width;

/** The five fonts, registered under their `PdfFont` names (contracts/pdf-document.md section 1) */
const FONTS: readonly PdfFont[] = ['regular', 'medium', 'semiBold', 'mono', 'monoMedium'];

/** The document's `/Lang` per language */
const LANG: Record<Language, string> = { en: 'en-GB', de: 'de-DE' };

/** The document's `Author` and `Creator` (design-notes 5, item 10) */
const PRODUCT = 'Konnekt';

/** Any one line: a line's height depends on the font's metrics and size only */
const LINE_PROBE = 'X';

const ELLIPSIS = '…';

/** The band, the bottom and the watermark: decoration that repeats on every page */
const PAGINATION: TextRole = { kind: 'artifact', type: 'Pagination' };

// ---------------------------------------------------------------------------------------------
// The document

/** The properties of contracts/pdf-document.md section 4: no custom keys, nothing about who */
function propertiesOf(model: ConnectionPdfModel): PdfKitInfo {
  const texts = PDF_TEXTS[model.language];
  const draft = model.kind === 'draft';
  return {
    Title: draft ? texts.titleDraft(model.name) : texts.title(model.name),
    // The same in both languages: the version is read from them (T039)
    Subject: `Connection ${model.id}, version ${model.version}`,
    Keywords: `connection ${model.id}; version ${model.version}${draft ? '; draft' : ''}`,
    Author: PRODUCT,
    Creator: PRODUCT,
  };
}

/** A4, PDF 1.7, tagged PDF/UA with the title shown, no default font; pages added by `render` */
function documentOptionsOf(model: ConnectionPdfModel): PdfKitOptions {
  return {
    size: 'A4',
    // The body's margins are applied by the drawing; PDFKit's own would move its page break
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: false,
    pdfVersion: '1.7',
    subset: 'PDF/UA',
    tagged: true,
    displayTitle: true,
    lang: LANG[model.language],
    // The browser build has no Helvetica and would throw opening it (spike)
    font: null,
    info: propertiesOf(model),
  };
}

/** A text's line gap, the same when measuring and when drawing (`PDF_LAYOUT.lineGapFactor`) */
function lineGapOf(style: TextStyle): number {
  return style.size * L.lineGapFactor;
}

/** PDFKit's measuring, with the options the drawing uses, so that measured equals drawn (R11) */
function measureOf(doc: PdfKitDocument): Measure {
  return {
    height(text, style, width) {
      doc.font(style.font, style.size);
      return doc.heightOfString(text, { width, lineGap: lineGapOf(style) });
    },
    width(text, style) {
      doc.font(style.font, style.size);
      return doc.widthOfString(text);
    },
  };
}

/**
 * The `CIDSet` workaround (research R5), the one place that touches PDFKit's private
 * `_fontFamilies`: PDFKit's PDF/UA mode writes a `CIDSet` built from the glyphs used only, which
 * misses the components that composite glyphs pull into the subset (veraPDF 7.21.4.2). PDF/UA-1
 * doesn't require one, so each font is finalised with the document's subset level hidden; the
 * `pdfuaid:part` is still written. Called once, right before `end()`
 */
export function withoutCidSet(doc: PdfKitDocument): void {
  const fonts = new Set<PdfKitEmbeddedFont>(Object.values(doc._fontFamilies));
  for (const font of fonts) {
    const finalize = font.finalize.bind(font);
    font.finalize = () => {
      const level = doc.subset;
      doc.subset = 0;
      try {
        finalize();
      } finally {
        doc.subset = level;
      }
    };
  }
}

// ---------------------------------------------------------------------------------------------
// The structure tree (contracts/pdf-document.md section 4)

interface TreeElement {
  node: StructNode;
  element: PdfKitStructureElement;
}

interface StructureTree {
  /**
   * The element a tagged text goes into, the last of `path`. Each element of the path is created
   * on first use, under the one before it (the `Document` for the first), and reused by every
   * later path that names its key, across texts and blocks (`StructNode`): so each element is
   * created once, and its children (elements and marked content) are in drawing order, which is
   * the reading order
   */
  leafOf(path: readonly StructNode[]): TreeElement;
  /** Ends the `Document` and with it every element, once everything is drawn */
  end(): void;
}

function structureTreeOf(doc: PdfKitDocument): StructureTree {
  const root = doc.struct('Document');
  doc.addStructure(root);
  const byKey = new Map<string, TreeElement>();
  return {
    leafOf(path) {
      let parent = root;
      let leaf: TreeElement | undefined;
      for (const node of path) {
        leaf = byKey.get(node.key);
        if (leaf === undefined) {
          const options: PdfKitStructOptions = node.scope ? { scope: node.scope } : {};
          leaf = { node, element: doc.struct(node.type, options) };
          parent.add(leaf.element);
          byKey.set(node.key, leaf);
        }
        parent = leaf.element;
      }
      if (leaf === undefined) throw new Error('A tagged text needs a structure path');
      return leaf;
    },
    end() {
      root.end();
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Drawing a layout's parts

/** Where a layout's coordinates start on the page */
interface Origin {
  x: number;
  y: number;
}

/**
 * `text`'s longest start that fits `room` with "…" after it, cut between characters, trailing
 * spaces dropped; "…" alone when nothing fits
 */
function cutText(text: string, style: TextStyle, room: number, measure: Measure): string {
  const characters = Array.from(text);
  const cut = (count: number): string =>
    `${characters.slice(0, count).join('').trimEnd()}${ELLIPSIS}`;
  let fits = 0;
  let fails = characters.length;
  while (fails - fits > 1) {
    const middle = Math.floor((fits + fails) / 2);
    if (measure.width(cut(middle), style) <= room) fits = middle;
    else fails = middle;
  }
  return cut(fits);
}

/**
 * A `cut` text's spans: unchanged when they fit `width` on one line; else the spans that fit
 * whole, then the first that doesn't, cut with "…" (`cutText()`), and nothing after it
 */
function cutSpans(spans: readonly TextSpan[], width: number, measure: Measure): TextSpan[] {
  const widths = spans.map((span) => measure.width(span.text, span.style));
  if (widths.reduce((sum, value) => sum + value, 0) <= width) return [...spans];
  const kept: TextSpan[] = [];
  let used = 0;
  for (const [index, span] of spans.entries()) {
    const room = width - used;
    if (widths[index] + measure.width(ELLIPSIS, span.style) <= room) {
      kept.push(span);
      used += widths[index];
      continue;
    }
    kept.push({ text: cutText(span.text, span.style, room, measure), style: span.style });
    break;
  }
  return kept;
}

/**
 * The options of one span's `text()` call. `wrap`: the box's width and the line gap, as
 * `Measure.height` measured it. `one` and `cut`: `lineBreak: false`, with the box's width only
 * when it aligns right or centred (PDFKit wraps any text given a width).
 *
 * `strike`: a faded item's span is struck through by PDFKit, line by line as it wraps, in the
 * span's colour, inside the span's tagged content (design-notes 8.2 D3). Always given, `false`
 * included: PDFKit hands a `continued` span's options on to the next span that leaves one out
 */
function textOptionsOf(part: PlacedText, style: TextStyle, continued: boolean): PdfKitTextOptions {
  const strike = style.strike === true;
  if (part.lines === 'wrap') {
    return { width: part.width, lineGap: lineGapOf(style), align: part.align, continued, strike };
  }
  if (part.align === 'left') return { lineBreak: false, continued, strike };
  return { width: part.width, align: part.align, lineBreak: false, continued, strike };
}

/** A text's spans, one `text()` call each, the later ones continuing the first */
function drawText(doc: PdfKitDocument, part: PlacedText, origin: Origin, measure: Measure): void {
  const spans = part.lines === 'cut' ? cutSpans(part.spans, part.width, measure) : part.spans;
  spans.forEach((span, index) => {
    const continued = index < spans.length - 1;
    doc.font(span.style.font, span.style.size).fillColor(span.style.colour);
    const options = textOptionsOf(part, span.style, continued);
    if (index === 0) doc.text(span.text, origin.x + part.x, origin.y + part.y, options);
    else doc.text(span.text, options);
  });
}

/** Fills and strokes the current path; a dashed stroke's dash is reset afterwards */
function paint(doc: PdfKitDocument, fill: string | null, stroke: StrokeStyle | null): void {
  if (stroke !== null) {
    doc.lineWidth(stroke.width);
    if (stroke.dash !== null) doc.dash(stroke.dash.length, { space: stroke.dash.space });
  }
  if (fill !== null && stroke !== null) doc.fillAndStroke(fill, stroke.colour);
  else if (fill !== null) doc.fill(fill);
  else if (stroke !== null) doc.stroke(stroke.colour);
  if (stroke?.dash) doc.undash();
}

/** How far a rect is drawn reaching up above its block's top, `reachOf()` for the block's place */
type Reach = (rect: PlacedRect) => number;

const NO_REACH: Reach = () => 0;

/**
 * A shape. A rect is drawn reaching up by `reach(rect)`: for one that `joinsAbove`, its block's
 * gap and the overlap into the block above (`reachOf()`) when the block isn't the first on its
 * page, so that a group's bar or a gaps slice joins the one above without a seam
 */
function drawShape(doc: PdfKitDocument, shape: PlacedShape, origin: Origin, reach: Reach): void {
  switch (shape.kind) {
    case 'rect': {
      if (shape.fill === null && shape.stroke === null) return;
      const up = reach(shape);
      const x = origin.x + shape.x;
      const y = origin.y + shape.y - up;
      const height = shape.height + up;
      if (shape.radius > 0) doc.roundedRect(x, y, shape.width, height, shape.radius);
      else doc.rect(x, y, shape.width, height);
      paint(doc, shape.fill, shape.stroke);
      return;
    }
    case 'circle':
      if (shape.fill === null && shape.stroke === null) return;
      doc.circle(origin.x + shape.cx, origin.y + shape.cy, shape.radius);
      paint(doc, shape.fill, shape.stroke);
      return;
    case 'line':
      doc.moveTo(origin.x + shape.x1, origin.y + shape.y1);
      doc.lineTo(origin.x + shape.x2, origin.y + shape.y2);
      paint(doc, null, shape.stroke);
      return;
  }
}

/** The artifact type a part is drawn as, or null for a tagged text */
function artifactTypeOf(part: LayoutPart): ArtifactType | null {
  if (part.kind !== 'text') return part.artifact;
  return part.role.kind === 'artifact' ? part.role.type : null;
}

/**
 * A layout's parts in their order: a tagged text as marked content of the element its path ends
 * in, every shape and artifact text in an artifact (consecutive ones of a type share one)
 */
function drawParts(
  doc: PdfKitDocument,
  parts: readonly LayoutPart[],
  origin: Origin,
  tree: StructureTree,
  measure: Measure,
  reach: Reach = NO_REACH
): void {
  let artifact: ArtifactType | null = null;
  const closeArtifact = (): void => {
    if (artifact === null) return;
    doc.endMarkedContent();
    artifact = null;
  };
  for (const part of parts) {
    const type = artifactTypeOf(part);
    if (type === null && part.kind === 'text' && part.role.kind === 'tag') {
      closeArtifact();
      const leaf = tree.leafOf(part.role.path);
      const content = doc.markStructureContent(leaf.node.type);
      drawText(doc, part, origin, measure);
      doc.endMarkedContent();
      leaf.element.add(content);
      continue;
    }
    if (type === null) continue;
    if (artifact !== type) {
      closeArtifact();
      doc.markContent('Artifact', { type });
      artifact = type;
    }
    if (part.kind === 'text') drawText(doc, part, origin, measure);
    else drawShape(doc, part, origin, reach);
  }
  closeArtifact();
}

// ---------------------------------------------------------------------------------------------
// Every page: the band and the bottom (contracts/pdf-document.md section 2, "Every page")

/** A one-line artifact text of the band or the bottom; x from the body's left, y from the page's top */
function paginationText(
  text: string,
  style: TextStyle,
  box: { x: number; y: number; width: number },
  measure: Measure,
  options: { align?: PlacedText['align']; lines?: PlacedText['lines'] } = {}
): PlacedText {
  return {
    kind: 'text',
    ...box,
    height: measure.height(LINE_PROBE, style, box.width),
    spans: [{ text, style }],
    align: options.align ?? 'left',
    lines: options.lines ?? 'one',
    role: PAGINATION,
  };
}

/**
 * A draft's "Draft · Not live" pill in the band (FR-020), in capitals, white on the draft blue,
 * its right edge `gapToVersion` left of the right-aligned version: its shape and its word, both
 * `Pagination` artifacts like the band
 */
function draftPillOf(model: ConnectionPdfModel, measure: Measure): [PlacedShape, PlacedText] {
  const texts = PDF_TEXTS[model.language];
  const band = L.band;
  const pill = band.draftPill;
  const label = texts.draftNotLive.toUpperCase();
  const width = measure.width(label, S.bandDraftPill) + 2 * pill.paddingX;
  const versionWidth = measure.width(texts.versionLine(model.version), S.bandVersionDraft);
  const x = BODY_WIDTH - band.paddingRight - versionWidth - pill.gapToVersion - width;
  return [
    {
      kind: 'rect',
      artifact: 'Pagination',
      x,
      y: band.y + pill.y,
      width,
      height: pill.height,
      radius: pill.radius,
      fill: C.draft,
      stroke: null,
      joinsAbove: false,
    },
    paginationText(label, S.bandDraftPill, { x, y: band.y + pill.y + pill.textY, width }, measure, {
      align: 'center',
    }),
  ];
}

/**
 * The band (the name on one line cut with "…", "Connection ID <id>", a draft's "Draft · Not live"
 * pill, right-aligned "Version <version>" and "Generated <date>") and the bottom (the rule, the
 * page's place from page 2, "Page n of N"), all `Pagination` artifacts; x from the body's left
 * edge, y from the page's top. A draft's name is cut where the pill begins, so that the two never
 * overlap
 */
function paginationPartsOf(
  model: ConnectionPdfModel,
  page: { number: number; count: number; place: string | null },
  measure: Measure
): LayoutPart[] {
  const texts = PDF_TEXTS[model.language];
  const draft = model.kind === 'draft';
  const band = L.band;
  const bottom = L.bottom;
  const left = band.paddingLeft;
  const right = BODY_WIDTH * band.rightColumnShare;
  const rightWidth = BODY_WIDTH - right - band.paddingRight;
  const textY = bottom.ruleY + bottom.textGap;
  const pill = draft ? draftPillOf(model, measure) : null;
  const nameWidth = Math.min(
    BODY_WIDTH * band.nameWidthShare,
    pill === null ? Infinity : pill[1].x - band.draftPill.gapToVersion - left
  );
  const parts: LayoutPart[] = [
    {
      kind: 'rect',
      artifact: 'Pagination',
      x: 0,
      y: band.y,
      width: BODY_WIDTH,
      height: band.height,
      radius: band.radius,
      fill: draft ? C.draftBackground : C.bandBackground,
      stroke: null,
      joinsAbove: false,
    },
    {
      kind: 'rect',
      artifact: 'Pagination',
      x: 0,
      y: band.y,
      width: band.barWidth,
      height: band.height,
      radius: 0,
      fill: draft ? C.draftDot : C.accent,
      stroke: null,
      joinsAbove: false,
    },
    paginationText(
      model.name,
      S.bandName,
      { x: left, y: band.y + band.firstLineY, width: nameWidth },
      measure,
      { lines: 'cut' }
    ),
    paginationText(
      texts.idLine(model.id),
      S.bandId,
      { x: left, y: band.y + band.secondLineY, width: BODY_WIDTH * band.idWidthShare },
      measure
    ),
    ...(pill ?? []),
    paginationText(
      texts.versionLine(model.version),
      draft ? S.bandVersionDraft : S.bandVersion,
      { x: right, y: band.y + band.firstLineY, width: rightWidth },
      measure,
      { align: 'right' }
    ),
    paginationText(
      texts.generatedLine(model.generatedAt),
      S.bandGenerated,
      { x: right, y: band.y + band.secondLineY, width: rightWidth },
      measure,
      { align: 'right' }
    ),
    {
      kind: 'line',
      artifact: 'Pagination',
      x1: 0,
      y1: bottom.ruleY,
      x2: BODY_WIDTH,
      y2: bottom.ruleY,
      stroke: { colour: C.line, width: bottom.ruleWidth, dash: null },
    },
  ];
  if (page.place !== null) {
    parts.push(
      paginationText(
        page.place,
        S.bottomLabel,
        { x: 0, y: textY, width: BODY_WIDTH * bottom.labelWidthShare },
        measure,
        { lines: 'cut' }
      )
    );
  }
  const pageColumn = BODY_WIDTH * bottom.pageColumnShare;
  parts.push(
    paginationText(
      texts.page(page.number, page.count),
      S.bottomPage,
      { x: pageColumn, y: textY, width: BODY_WIDTH - pageColumn },
      measure,
      { align: 'right' }
    )
  );
  return parts;
}

/**
 * A draft's watermark (FR-022; contracts/pdf-document.md section 2): "DRAFT" in its language,
 * 150 pt SemiBold in the draft blue at 6 % opacity, rotated −38° about the page's centre and
 * centred on it, a `Pagination` artifact. Drawn last, so that the cards' fills don't hide it; the
 * opacity is restored with the graphics state
 */
function drawWatermark(doc: PdfKitDocument, model: ConnectionPdfModel, measure: Measure): void {
  const style = S.watermark;
  const { page, watermark } = L;
  const text = PDF_TEXTS[model.language].watermark;
  doc.markContent('Artifact', { type: 'Pagination' });
  doc.save();
  doc.rotate(watermark.angle, { origin: [page.width / 2, page.height / 2] });
  doc.font(style.font, style.size).fillColor(style.colour).fillOpacity(C.watermarkOpacity);
  // Centred by its measured width, on one line: given a box, PDFKit would break a word wider
  // than the page ("ENTWURF" at 150 pt)
  doc.text(
    text,
    (page.width - measure.width(text, style)) / 2,
    page.height / 2 + watermark.offsetY,
    { lineBreak: false, strike: false }
  );
  doc.restore();
  doc.endMarkedContent();
}

// ---------------------------------------------------------------------------------------------
// The outline (FR-038)

/**
 * Adds a block's bookmark, pointing to the current page at `top`: a section at the top level, a
 * variant under the section before it
 */
function outlineOf(doc: PdfKitDocument): (bookmark: PdfBookmark, top: number) => void {
  let section: PdfKitOutline | null = null;
  return (bookmark, top) => {
    // PDFKit writes /XYZ (page width − left): the page's width puts the view's left edge at 0
    const target = { top, left: L.page.width, zoom: 0 };
    if (bookmark.level === 1 || section === null) {
      const item = doc.outline.addItem(bookmark.title, { ...target, expanded: true });
      if (bookmark.level === 1) section = item;
      return;
    }
    section.addItem(bookmark.title, target);
  };
}

// ---------------------------------------------------------------------------------------------

/** The bytes of a document PDFKit writes, collected from its `data` events until `end` */
function bytesOf(doc: PdfKitDocument): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk) => {
      chunks.push(chunk);
    });
    doc.on('error', reject);
    doc.on('end', () => {
      const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(bytes);
    });
  });
}

/**
 * Draws one page: its band and bottom, then its blocks in order, with their bookmarks, and a
 * draft's watermark last
 */
function drawPage(
  doc: PdfKitDocument,
  model: ConnectionPdfModel,
  page: { blocks: readonly Block[]; placed: { index: number; y: number }[]; number: number },
  context: {
    count: number;
    place: string | null;
    tree: StructureTree;
    measure: Measure;
    bookmark: (bookmark: PdfBookmark, top: number) => void;
  }
): void {
  const { tree, measure } = context;
  doc.addPage();
  drawParts(
    doc,
    paginationPartsOf(
      model,
      { number: page.number, count: context.count, place: context.place },
      measure
    ),
    { x: L.body.x, y: 0 },
    tree,
    measure
  );
  // The layout of the block drawn before on this page, which a rect joining above may reach into
  let above: BlockLayout | null = null;
  page.placed.forEach(({ index, y }) => {
    const block = page.blocks[index];
    const top = L.body.y + y;
    if (block.bookmark !== null) context.bookmark(block.bookmark, top);
    const layout = layoutOf(block.content, measure);
    const before = above;
    const reach: Reach = (rect) => reachOf(rect, block.gapBefore, before);
    drawParts(doc, layout.parts, { x: L.body.x, y: top }, tree, measure, reach);
    above = layout;
  });
  if (model.kind === 'draft') drawWatermark(doc, model, measure);
}

/**
 * The connection's PDF (contracts/pdf-worker.md section 3): creates the document (A4, PDF 1.7,
 * tagged PDF/UA, the title shown, the language, the properties), registers the five fonts, builds
 * the blocks with PDFKit's `Measure` (or the given one) and places them with `paginate()`, then
 * draws page by page: the band and the bottom as `Pagination` artifacts, each block through its
 * `layoutOf()` geometry inside the structure tree, a draft's watermark over it all, and the
 * outline from the blocks' bookmarks.
 * Before `end()`, `withoutCidSet()`. Resolves with the file's bytes; rejects when drawing throws
 */
export function renderConnectionPdf(
  model: ConnectionPdfModel,
  { PDFDocument, fonts, measure: given }: PdfRenderOptions
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(documentOptionsOf(model));
    // Listening before anything is written, so that no chunk is missed in either build
    bytesOf(doc).then(resolve, reject);
    for (const font of FONTS) doc.registerFont(font, fonts[font]);
    const measure = given ?? measureOf(doc);
    const blocks = blocksOf(model, measure);
    const pages = paginate(blocks, L.body.height);
    const texts = PDF_TEXTS[model.language];
    const labels = {
      sections: {
        1: CONNECTION_DETAIL_COPY[model.language].linksTitle,
        2: texts.section2,
        3: texts.section3,
      },
      variant: texts.variant,
      continued: texts.continued,
    };
    const tree = structureTreeOf(doc);
    const bookmark = outlineOf(doc);
    pages.forEach((placed, index) => {
      drawPage(
        doc,
        model,
        { blocks, placed, number: index + 1 },
        {
          count: pages.length,
          place: placeLabelOf(placed, blocks, labels),
          tree,
          measure,
          bookmark,
        }
      );
    });
    tree.end();
    withoutCidSet(doc);
    doc.end();
  });
}

// ---------------------------------------------------------------------------------------------
// The recording wrapper (research R14), for the smoke test and the sweeps

/** A shape's bounding box, waiting for the fill or stroke that paints it */
type PendingShape = Pick<RecordedShape, 'kind' | 'x' | 'y' | 'width' | 'height'>;

/**
 * A thin recording wrapper around PDFKit's document: a subclass of `PDFDocument` that draws as it
 * does and records, per page, every text and painted shape with its font, colour, opacity and the
 * marked content it sits in, plus the structure tree, the outline and the document's options
 * (`PdfRecording` in `types.ts`). Pass its `PDFDocument` to `renderConnectionPdf()` and read
 * `recording` once it has resolved. One recording per document
 */
export function recordingDocument(PDFDocument: PdfKitConstructor): {
  PDFDocument: PdfKitConstructor;
  recording: PdfRecording;
} {
  const recording: PdfRecording = { options: null, pages: [], structure: [], outline: [] };
  /** The marked content open on the page, innermost last */
  let markings: RecordedRole[] = [];
  let fontName = '';
  let fontSize = 12;
  let fillColour = '#000000';
  let strokeColour = '#000000';
  let opacity = 1;
  const savedOpacities: number[] = [];
  /** Inside `roundedRect()` or `circle()`, whose own `moveTo()` and `lineTo()` aren't shapes */
  let composite = 0;
  let pending: PendingShape[] = [];
  const elements = new WeakMap<object, RecordedElement>();

  const currentPage = (): RecordedPage => {
    const page = recording.pages.at(-1);
    if (page === undefined) throw new Error('Drawing before the first page');
    return page;
  };
  const roleNow = (): RecordedRole => markings.at(-1) ?? null;
  const paintPending = (fill: string | null, stroke: string | null): void => {
    const page = recording.pages.length;
    for (const shape of pending) {
      currentPage().shapes.push({ ...shape, page, fill, stroke, opacity, role: roleNow() });
    }
    pending = [];
  };
  const recordChild = (parent: RecordedElement, child: PdfKitStructChild): void => {
    if (typeof child === 'function') return;
    if ('refs' in child) {
      for (const { mcid } of child.refs)
        parent.children.push({ page: recording.pages.length, mcid });
      return;
    }
    const element = elements.get(child);
    if (element !== undefined) parent.children.push(element);
  };
  const recordOutline = (outline: PdfKitOutline, into: RecordedOutlineItem[]): void => {
    const addItem = outline.addItem.bind(outline);
    outline.addItem = (title, options) => {
      const item = addItem(title, options);
      const recorded: RecordedOutlineItem = {
        title,
        page: options?.pageNumber !== undefined ? options.pageNumber + 1 : recording.pages.length,
        top: options?.top ?? null,
        children: [],
      };
      into.push(recorded);
      recordOutline(item, recorded.children);
      return item;
    };
  };

  class RecordingDocument extends PDFDocument {
    constructor(options?: PdfKitOptions) {
      super(options);
      recording.options = options ?? null;
      recordOutline(this.outline, recording.outline);
    }

    addPage(options?: Parameters<PdfKitDocument['addPage']>[0]): this {
      // PDFKit closes the open marked content at the page's end and opens it again on the new one
      markings = [];
      recording.pages.push({ texts: [], shapes: [] });
      return super.addPage(options);
    }

    markContent(
      tag: StructType | 'Artifact',
      options?: { type?: ArtifactType; mcid?: number }
    ): this {
      super.markContent(tag, options);
      if (tag === 'Artifact') markings.push({ kind: 'artifact', type: options?.type ?? null });
      else if (options?.mcid !== undefined)
        markings.push({ kind: 'tag', type: tag, mcid: options.mcid });
      else markings.push(null);
      return this;
    }

    endMarkedContent(): this {
      markings.pop();
      return super.endMarkedContent();
    }

    struct(
      type: StructType,
      options?: PdfKitStructOptions,
      children?: PdfKitStructChild | PdfKitStructChild[]
    ): PdfKitStructureElement {
      const element = super.struct(type, options, children);
      const recorded: RecordedElement = { type, scope: options?.scope ?? null, children: [] };
      elements.set(element, recorded);
      const add = element.add.bind(element);
      element.add = (child) => {
        recordChild(recorded, child);
        add(child);
        return element;
      };
      return element;
    }

    addStructure(element: PdfKitStructureElement): this {
      const recorded = elements.get(element);
      if (recorded !== undefined) recording.structure.push(recorded);
      return super.addStructure(element);
    }

    font(name: string, size?: number): this {
      fontName = name;
      return super.font(name, size);
    }

    fontSize(size: number): this {
      fontSize = size;
      return super.fontSize(size);
    }

    fillColor(colour: string, value?: number): this {
      fillColour = colour;
      return super.fillColor(colour, value);
    }

    strokeColor(colour: string, value?: number): this {
      strokeColour = colour;
      return super.strokeColor(colour, value);
    }

    opacity(value: number): this {
      opacity = value;
      return super.opacity(value);
    }

    fillOpacity(value: number): this {
      // `fillColor()` passes its opacity on, undefined when not given, which PDFKit ignores
      if (value !== undefined) opacity = value;
      return super.fillOpacity(value);
    }

    save(): this {
      savedOpacities.push(opacity);
      return super.save();
    }

    restore(): this {
      opacity = savedOpacities.pop() ?? 1;
      return super.restore();
    }

    text(
      text: string,
      xOrOptions?: number | PdfKitTextOptions,
      y?: number,
      options?: PdfKitTextOptions
    ): this {
      const positioned = typeof xOrOptions === 'number';
      const given = positioned ? options : xOrOptions;
      currentPage().texts.push({
        page: recording.pages.length,
        text,
        x: positioned ? xOrOptions : this.x,
        y: positioned && y !== undefined ? y : this.y,
        width: given?.width ?? null,
        advance: this.widthOfString(text),
        font: fontName,
        size: fontSize,
        colour: fillColour,
        opacity,
        strike: given?.strike === true,
        role: roleNow(),
      });
      return positioned ? super.text(text, xOrOptions, y, options) : super.text(text, given);
    }

    rect(x: number, y: number, width: number, height: number): this {
      if (composite === 0) pending.push({ kind: 'rect', x, y, width, height });
      return super.rect(x, y, width, height);
    }

    roundedRect(x: number, y: number, width: number, height: number, radius: number): this {
      if (composite === 0) pending.push({ kind: 'rect', x, y, width, height });
      composite += 1;
      try {
        return super.roundedRect(x, y, width, height, radius);
      } finally {
        composite -= 1;
      }
    }

    circle(x: number, y: number, radius: number): this {
      if (composite === 0) {
        pending.push({
          kind: 'circle',
          x: x - radius,
          y: y - radius,
          width: 2 * radius,
          height: 2 * radius,
        });
      }
      composite += 1;
      try {
        return super.circle(x, y, radius);
      } finally {
        composite -= 1;
      }
    }

    moveTo(x: number, y: number): this {
      if (composite === 0) pending.push({ kind: 'path', x, y, width: 0, height: 0 });
      return super.moveTo(x, y);
    }

    lineTo(x: number, y: number): this {
      const last = pending.at(-1);
      if (composite === 0 && last?.kind === 'path') {
        const left = Math.min(last.x, x);
        const top = Math.min(last.y, y);
        last.width = Math.max(last.x + last.width, x) - left;
        last.height = Math.max(last.y + last.height, y) - top;
        last.x = left;
        last.y = top;
      }
      return super.lineTo(x, y);
    }

    fill(colour?: string): this {
      super.fill(colour);
      paintPending(fillColour, null);
      return this;
    }

    stroke(colour?: string): this {
      super.stroke(colour);
      paintPending(null, strokeColour);
      return this;
    }

    fillAndStroke(fill?: string, stroke?: string): this {
      super.fillAndStroke(fill, stroke);
      paintPending(fillColour, strokeColour);
      return this;
    }
  }

  return { PDFDocument: RecordingDocument, recording };
}
