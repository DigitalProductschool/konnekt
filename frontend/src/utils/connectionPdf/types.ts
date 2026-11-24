// The connection PDF's shapes (specs/011-connection-pdf/data-model.md, sections 2 and 4 to 6;
// research R3, R11; design-notes 8.2 D1). Types only: the module is pure and holds no value, so
// every other module of `utils/connectionPdf/`, the worker and the hook import it with
// `import type`. Nothing here is stored, sent or logged (FR-041, FR-042)
import type { ErrorNotice } from '@konnekt/api-types/api';
import type { BranchInput, Combinator, Mark } from '@konnekt/api-types/form-connections';
import type { Language } from '@konnekt/rules/language';

// ---------------------------------------------------------------------------------------------
// The content model (data-model section 2): everything the PDF says, already in its language,
// built once on the main thread and posted to the worker. Plain data, so it survives
// `postMessage`'s structured clone; no finding, persona or citizen data, no URL for a draft

/** The status page 1 shows, as of the moment the file was made; a published one's `state` */
export type PdfStatus = 'scheduled' | 'active' | 'deactivated' | 'draft';

export interface ConnectionPdfModel {
  /** Spec 009's 'en' | 'de': the PDF's /Lang and its texts */
  language: Language;
  kind: 'published' | 'draft';
  /** A published one's `state` (spec 010; `live` reads 'active'), or 'draft' */
  status: PdfStatus;
  /** "01.12.2026", a scheduled connection's start date (FR-035); else null */
  startDate: string | null;
  /** The connection ID */
  id: string;
  /** As entered (FR-034) */
  name: string;
  /** Null when empty (the line is left out) */
  description: string | null;
  /** `version_fingerprint`, as the API sends it */
  version: string;
  /** "09.11.2026, 16:45", Germany's time (FR-035) */
  generatedAt: string;
  /** A draft's `updated_at` (formatted like `generatedAt`) and `version`; null when published */
  lastSaved: { at: string; saveNumber: number } | null;
  counts: { documents: number; dataItems: number; variants: number; rules: number };
  /** A draft's; [] for a published connection */
  gaps: PdfGap[];
  /** A published connection's; null for a draft (FR-013) */
  links: PdfLinks | null;
  /** A draft's: the variants' names in order; null otherwise */
  linksToCreate: string[] | null;
  /** The Summary's order */
  documents: PdfDocument[];
  /** The details' order, Standard first */
  variants: PdfVariant[];
}

export interface PdfLinks {
  /** `trigger_url` */
  request: string;
  /** Each branch's `pull_url`, in the variants' order */
  results: { variant: string; url: string }[];
}

export interface PdfDocument {
  /** The catalog's label in the language, or its key */
  name: string;
  /** The fields' labels, or their keys; [] → the placeholder */
  dataItems: string[];
}

export interface PdfVariant {
  name: string;
  origin: BranchInput['origin'];
  description: string | null;
  operator: Combinator;
  /** A based variant switched its top-level AND/OR */
  operatorChanged: boolean;
  /** [] → "No rules. Anyone who shares …" */
  items: PdfItem[];
}

export type PdfItem = PdfRule | PdfGroup;

export interface PdfRule {
  type: 'rule';
  /** "rule-7" */
  id: string;
  name: string;
  /** Only in a based variant */
  mark: Mark | null;
  /** Removed, or inside a removed or dissolved group */
  faded: boolean;
  /** Null when the target can't be resolved */
  statement: PdfStatement | null;
  /** Trimmed; '' → no "Message for citizens" line */
  message: string;
  /** A draft's "Choose a check." (after "Not complete: ") */
  missing: string | null;
}

export interface PdfStatement {
  /** "Personal ID · Date of birth (Age)" */
  subject: string;
  /** "is at least"; null while the condition is incomplete */
  words: string | null;
  /** The chips' texts, kept apart so that a long list can split */
  values: string[];
  /** "ignoring letter case" */
  tail: string | null;
}

export interface PdfGroup {
  type: 'group';
  /** "group-2" */
  id: string;
  name: string;
  mark: Mark | null;
  /** Removed or dissolved, or inside one */
  faded: boolean;
  operator: Combinator;
  /** The group's own message */
  message: string | null;
  items: PdfItem[];
}

export interface PdfGap {
  /** The create flow's words, naming rule and variant */
  text: string;
}

// ---------------------------------------------------------------------------------------------
// Type: the five fonts and a text's look (contracts/pdf-document.md section 1)

/**
 * The five committed fonts, by the names `render.ts` registers them under: Fira Sans Regular,
 * Medium and SemiBold, Fira Mono Regular and Medium
 */
export type PdfFont = 'regular' | 'medium' | 'semiBold' | 'mono' | 'monoMedium';

/** A font's bytes: fetched `ArrayBuffer`s in the worker, decoded data URLs in the smoke test */
export type PdfFontBytes = ArrayBuffer | Uint8Array;

/** The five fonts' bytes, one per registered name */
export type PdfFonts = Record<PdfFont, PdfFontBytes>;

/** "#RRGGBB", upper case; `PDF_COLOURS` names each with its KERN token */
export type HexColour = string;

/**
 * How a text looks. The line gap follows from the size (`PDF_LAYOUT`'s factor), the same when
 * measuring and when drawing, so it is not a field of its own
 */
export interface TextStyle {
  font: PdfFont;
  /** Points */
  size: number;
  colour: HexColour;
  /** Struck through: removed items and the members of a removed or dissolved group (FR-017) */
  strike?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Blocks and pages (data-model section 4; research R4, R11)

/** Measuring through PDFKit, with the options the drawing uses, so that measured equals drawn */
export interface Measure {
  /** Height of text wrapped at `width`, as PDFKit's heightOfString gives it */
  height(text: string, style: TextStyle, width: number): number;
  /** Width of one line of text, as PDFKit's widthOfString gives it */
  width(text: string, style: TextStyle): number;
}

/** The width of one line in one fixed style: `(text) => measure.width(text, style)` (`urlLines()`) */
export type LineWidth = (text: string) => number;

/** An entry of the outline (FR-038): the three sections at level 1, each variant at level 2 */
export interface PdfBookmark {
  title: string;
  level: 1 | 2;
}

/** The unit the paginator places; never split (a rule taller than a page is split beforehand) */
export interface Block {
  height: number;
  /** Dropped at the top of a page */
  gapBefore: number;
  /** Headings, a group's header, AND/OR, a group's last member */
  keepWithNext: boolean;
  /** Units this block opens (a variant, a group, the result links) */
  startsUnits: string[];
  /** Units this block belongs to */
  unitOf: string[];
  /** Where the block is, for the bottom of its page */
  place: PagePlace;
  /** The outline entry it opens (FR-038) */
  bookmark: PdfBookmark | null;
  /** What to draw; plain data, laid out by `layoutOf()` */
  content: BlockContent;
}

export interface PagePlace {
  /** Null on page 1's title blocks and the gaps */
  section: 1 | 2 | 3 | null;
  /** In section 3: the variant's name */
  variant: string | null;
  /** This block starts it, so no "(continued)" */
  opens: 'section' | 'variant' | null;
}

/** `paginate()`'s result for one page: its blocks' indexes and their tops in the body */
export type Page = { index: number; y: number }[];

/**
 * The words `placeLabelOf()` builds a page's bottom label from (FR-021), taken by the caller
 * from the copy tables of the PDF's language: "3 Rules per variant › Variant Taxi (continued)"
 */
export interface PlaceLabelTexts {
  /** Each section's title, without its number */
  sections: Record<1 | 2 | 3, string>;
  /** "Variant Taxi" */
  variant: (name: string) => string;
  /** "(continued)" */
  continued: string;
}

// ---------------------------------------------------------------------------------------------
// The structure tree (contracts/pdf-document.md section 4; research R5)

/** The structure types the document uses; `Document` is the root `render.ts` makes */
export type StructType =
  | 'Document'
  | 'Sect'
  | 'Div'
  | 'H1'
  | 'H2'
  | 'H3'
  | 'H4'
  | 'H5'
  | 'H6'
  | 'P'
  | 'L'
  | 'LI'
  | 'LBody'
  | 'Table'
  | 'TR'
  | 'TH'
  | 'TD'
  | 'Span';

/**
 * One structure element. Texts whose paths name the same `key` go into the same element, across
 * runs and blocks (a heading's identifier and name; a URL's lines; the gaps' `L`; a variant's
 * `Sect`), which `render.ts` creates on first use under the element before it in the path
 */
export interface StructNode {
  type: StructType;
  /** Unique in the document */
  key: string;
  /** A table's row header (`TH`) */
  scope?: 'Row';
}

/** PDFKit's artifact types: `Layout` in the body, `Pagination` for the band, the bottom and the watermark */
export type ArtifactType = 'Layout' | 'Pagination';

/** What a text is to assistive technologies */
export type TextRole =
  /** Tagged: the elements from its part's `Sect` down to the one that holds the text */
  | { kind: 'tag'; path: StructNode[] }
  /** Decoration they skip: a step number, an AND/OR chip's word, the "!" before "Not complete:" */
  | { kind: 'artifact'; type: ArtifactType };

// ---------------------------------------------------------------------------------------------
// What a block draws (contracts/pdf-document.md section 2): one member per block kind, holding
// texts, flags and identity, never positions. `layoutOf(content, measure)` in `blocks.ts` is the
// one function that turns them into geometry (research R11)

export interface ContentBase {
  /**
   * Unique in the document; the keys of the structure elements the block's layout creates (its
   * headings, paragraphs, list items, table rows) start with it
   */
  key: string;
  /**
   * The structure elements the block's texts go into, from its part's `Sect` down: the gaps'
   * `L`, a variant's `Sect`, a group's `Div`, a rule's `Div` (shared by its continuation blocks)
   */
  within: StructNode[];
}

/** A label and the text after it in one paragraph: "Message for citizens: …", "Not complete: …" */
export interface LabelledText {
  label: string;
  text: string;
}

/** A mark's badge: "Changed here", "Added here", "Removed here" (`BRANCH_MARK_COPY`) */
export interface MarkBadge {
  mark: Mark;
  label: string;
}

/** A rule's or group's heading level by depth: `H4` at the top level, `H5` in a group, `H6` in a sub-group */
export type ItemHeadingLevel = 4 | 5 | 6;

/** Page 1: the eyebrow, the name (`H1`, in full) and the description */
export interface TitleContent extends ContentBase {
  kind: 'title';
  /** "Connection details" or "Connection details · Draft for review", drawn in capitals */
  eyebrow: string;
  name: string;
  description: string | null;
  /** The draft's colours */
  draft: boolean;
}

/** Page 1: the status pill and its note */
export interface StatusContent extends ContentBase {
  kind: 'status';
  status: PdfStatus;
  /** "Active", "Deactivated", "Scheduled", "Draft" (`STATUS_PILL_COPY`) */
  label: string;
  /** "as of <generated>", "as of <generated> · starts on <date>", or "Not live yet" */
  note: string;
}

/** A row's value face: the ID in mono, the version in mono and larger, the rest in the text face */
export type DetailsValueKind = 'id' | 'version' | 'text';

export interface DetailsRow {
  /** The row's header (`TH`, scope Row): "Connection ID", "Version", … */
  label: string;
  value: string;
  valueKind: DetailsValueKind;
}

/** Page 1: the details box, a `Table` with one row per line */
export interface DetailsContent extends ContentBase {
  kind: 'details';
  rows: DetailsRow[];
  draft: boolean;
}

/** Page 1: the note on checking the copy (FR-009) */
export interface NoteContent extends ContentBase {
  kind: 'note';
  text: string;
}

/** A draft's "To finish before publishing (n)" (`H2`) and its sentence: the box's top */
export interface GapsHeadingContent extends ContentBase {
  kind: 'gapsHeading';
  title: string;
  lead: string;
}

/** One gap, an `LI` of the gaps' `L` (in `within`): a slice of the box */
export interface GapContent extends ContentBase {
  kind: 'gap';
  text: string;
  /** The box's last entry, which closes it */
  last: boolean;
}

/** A section's heading (`H2`, "1  Links for your service") and its lead */
export interface SectionHeadingContent extends ContentBase {
  kind: 'sectionHeading';
  number: 1 | 2 | 3;
  title: string;
  /** Null for a draft's links section */
  lead: string | null;
  /** Under the lead: a deactivated or scheduled connection's "unavailable" sentence (FR-012) */
  notice: string | null;
}

/** ① "Request link" or ② "Result links" (`H3`) with the paragraphs explaining it */
export interface LinkHeadingContent extends ContentBase {
  kind: 'linkHeading';
  step: 1 | 2;
  title: string;
  /** The details page's explanation; for the result links then the {reference} sentence */
  paragraphs: string[];
}

/** A URL with its label ("Variant · Taxi"), or the request link's URL alone; one block */
export interface LinkContent extends ContentBase {
  kind: 'link';
  label: string | null;
  /** In full; `layoutOf()` cuts it into lines with `urlLines()` */
  url: string;
}

/** A draft's dashed box instead of links (FR-013) */
export interface LinksToCreateContent extends ContentBase {
  kind: 'linksToCreate';
  /** "Created when the connection is published and active." */
  title: string;
  /** "There will be one request link for all variants, and a result link for each variant: …" */
  text: string;
}

/** A document (`H3`) with its count and its data items in two columns, left column first */
export interface DocumentContent extends ContentBase {
  kind: 'document';
  name: string;
  /** "12 data items" */
  count: string;
  dataItems: string[];
  /** "No data chosen yet" when `dataItems` is empty; else null */
  placeholder: string | null;
}

/** A variant's header (`H3` "Variant Taxi"), its origin badge, description and AND/OR in words */
export interface VariantHeaderContent extends ContentBase {
  kind: 'variantHeader';
  /** "Variant Taxi" (`PDF_TEXTS.variant`) */
  title: string;
  /** The variant's name, the title's end, drawn in the name's face after the word */
  name: string;
  origin: PdfVariant['origin'];
  /** "Main variant", "Based on Standard", "Own rules" */
  originLabel: string;
  description: string | null;
  /** "All rules must be met (AND)" */
  combines: string;
  /** The "Changed here" badge when the AND/OR was switched; else null */
  changed: MarkBadge | null;
}

/** Where a rule or a group sits: its nesting and how it looks */
export interface ItemContentBase extends ContentBase {
  /** "rule-7", "group-2" */
  id: string;
  /** 0 at the top level, 1 in a group, 2 in a sub-group: the indent and the group bars */
  depth: number;
  /** Shown in a based variant only */
  badge: MarkBadge | null;
  /** Muted and struck through (FR-017) */
  faded: boolean;
}

/** A rule's card, or its head when it is taller than a page (FR-027) */
export interface RuleContent extends ItemContentBase {
  kind: 'rule';
  /** The heading holds the identifier and the name together */
  name: string;
  level: ItemHeadingLevel;
  /**
   * The statement; for a split rule only the values that fit, with `tail` null when values follow
   * in a continuation. Null when the target can't be resolved
   */
  statement: PdfStatement | null;
  /** Null when the message is empty or follows in a continuation */
  message: LabelledText | null;
  /** A draft's "Not complete: …"; null when complete or when it follows in a continuation */
  missing: LabelledText | null;
  /** A `ruleContinuation` block follows */
  continues: boolean;
}

/** The rest of a rule taller than a page: the remaining values, then the message (FR-027) */
export interface RuleContinuationContent extends ItemContentBase {
  kind: 'ruleContinuation';
  /** The values this block holds, in order; [] when only the message is left */
  values: string[];
  /** The statement's tail after the last value; null when values follow */
  tail: string | null;
  message: LabelledText | null;
  missing: LabelledText | null;
  /** Another continuation follows */
  continues: boolean;
}

/** A group's header: its heading with identifier and name, its badge, "Group · <AND/OR in words>" */
export interface GroupHeaderContent extends ItemContentBase {
  kind: 'groupHeader';
  name: string;
  level: ItemHeadingLevel;
  /** "Group · All rules must be met (AND)" */
  combines: string;
}

/**
 * A group's closing block, after its last member: the group's own message, if any. Its `badge` is
 * the header's, which it doesn't draw: the mark tints the block as it tints the header
 */
export interface GroupEndContent extends ItemContentBase {
  kind: 'groupEnd';
  message: LabelledText | null;
}

/** The AND/OR chip between two items (an artifact: the level's line says it in words) */
export interface ConnectorContent extends ContentBase {
  kind: 'connector';
  /** "AND", "OR" (`CONNECTOR_COPY.labels`) */
  label: string;
  depth: number;
  /** The item after it is faded */
  faded: boolean;
}

/** "No documents yet", "No rules. Anyone who shares the requested documents can apply." */
export interface PlaceholderContent extends ContentBase {
  kind: 'placeholder';
  text: string;
  depth: number;
}

export type BlockContent =
  | TitleContent
  | StatusContent
  | DetailsContent
  | NoteContent
  | GapsHeadingContent
  | GapContent
  | SectionHeadingContent
  | LinkHeadingContent
  | LinkContent
  | LinksToCreateContent
  | DocumentContent
  | VariantHeaderContent
  | RuleContent
  | RuleContinuationContent
  | GroupHeaderContent
  | GroupEndContent
  | ConnectorContent
  | PlaceholderContent;

export type BlockKind = BlockContent['kind'];

// ---------------------------------------------------------------------------------------------
// A block's geometry: what `layoutOf()` returns, for `blocksOf()` (the height) and `render.ts`
// (the drawing) alike. Coordinates in points: x from the body's left edge, y from the block's top

/** A stretch of a text in one style; a text's later spans continue its first (PDFKit's `continued`) */
export interface TextSpan {
  text: string;
  style: TextStyle;
}

/** A text run, placed */
export interface PlacedText {
  kind: 'text';
  x: number;
  y: number;
  /** The box it wraps, aligns or is cut in */
  width: number;
  /** As `layoutOf()` measured it */
  height: number;
  /** At least one */
  spans: TextSpan[];
  align: 'left' | 'center' | 'right';
  /** Wrapped at `width`; one line (`lineBreak: false`); or one line cut with "…" */
  lines: 'wrap' | 'one' | 'cut';
  role: TextRole;
}

export interface StrokeStyle {
  colour: HexColour;
  width: number;
  /** A dashed line's dash and space; null for a solid one */
  dash: { length: number; space: number } | null;
}

export interface ShapeBase {
  /** Every shape is decoration */
  artifact: ArtifactType;
}

/** A frame, fill, bar, pill or chip; `radius` 0 for square corners */
export interface PlacedRect extends ShapeBase {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill: HexColour | null;
  stroke: StrokeStyle | null;
  /**
   * A group's bar, or a gaps slice's bar and strip: when the block isn't the first on its page,
   * it is drawn reaching up by the block's `gapBefore`, and `JOIN_OVERLAP` further where the block
   * above continues it (`reachOf()` in `blocks.ts`), so that it joins the one above without a seam
   */
  joinsAbove: boolean;
}

/** A dot, a bullet, a step number's circle */
export interface PlacedCircle extends ShapeBase {
  kind: 'circle';
  cx: number;
  cy: number;
  radius: number;
  fill: HexColour | null;
  stroke: StrokeStyle | null;
}

/** A rule (the section heading's line); a strike-through is PDFKit's, not a part (design-notes 8.2 D3) */
export interface PlacedLine extends ShapeBase {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: StrokeStyle;
}

export type PlacedShape = PlacedRect | PlacedCircle | PlacedLine;

export type LayoutPart = PlacedText | PlacedShape;

/** What `layoutOf(content, measure)` returns: measuring and drawing share this one geometry */
export interface BlockLayout {
  /** The block's height, `Block.height` */
  height: number;
  /** In drawing order; the tagged texts' order is the reading order */
  parts: LayoutPart[];
}

// ---------------------------------------------------------------------------------------------
// The worker's messages (data-model section 5)

export type PdfRequest = { type: 'render'; runId: number; model: ConnectionPdfModel };

export type PdfAnswer =
  /** Transferred, not copied */
  | { type: 'rendered'; runId: number; bytes: ArrayBuffer }
  /** No reason: nothing is logged */
  | { type: 'failed'; runId: number };

// ---------------------------------------------------------------------------------------------
// The download's state, `useConnectionPdf`'s reducer (data-model section 6)

/**
 * What the button's polite live region says (design-notes section 3), as a key that the page words
 * in the website's language: `'creating'` "Creating the PDF…" while a run is busy, `'saved'` "PDF
 * saved." once its file was saved. Null says nothing: before the first run, after a "gone", and on
 * a failure, which the alert's own `role="alert"` announces
 */
export type PdfAnnouncement = 'creating' | 'saved';

export type PdfDownloadState =
  /** Nothing running: "Download PDF"; `'saved'` after a saved file */
  | { status: 'idle'; announcement: 'saved' | null }
  /** The fresh GET runs (FR-005), then the option sets and the catalog: busy */
  | { status: 'fetching'; runId: number; announcement: 'creating' }
  /** The worker makes the file: busy */
  | { status: 'rendering'; runId: number; announcement: 'creating' }
  /** A notice with its error id and "Try again" */
  | { status: 'failed'; notice: ErrorNotice; announcement: null };

/**
 * The reducer's actions. A `start` while fetching or rendering does nothing (FR-003); an action
 * whose `runId` isn't the current run's is ignored (a late answer after a newer start)
 */
export type PdfDownloadAction =
  /** idle or failed → fetching */
  | { type: 'start'; runId: number }
  /** fetching → rendering: the model is posted to the worker */
  | { type: 'fetched'; runId: number }
  /** fetching → idle; the page shows "not found" */
  | { type: 'gone'; runId: number }
  /** fetching → idle, nothing said: a 401 signs out, the sign-in replaces the page */
  | { type: 'signedOut'; runId: number }
  /** rendering → idle; the file is saved */
  | { type: 'rendered'; runId: number }
  /** fetching or rendering → failed */
  | { type: 'failed'; runId: number; notice: ErrorNotice };

// ---------------------------------------------------------------------------------------------
// PDFKit 0.20.2, as `render.ts` uses it (design-notes 8.2 D1): pdfkit ships no types and
// @types/pdfkit lacks 0.20's structure and outline calls, so these declare only the calls and
// properties `render.ts` makes, typed as PDFKit 0.20.2 takes them. A call `render.ts` needs that
// is missing here is added here, never cast at the call

/** The document properties: no custom keys (contracts/pdf-document.md section 4) */
export interface PdfKitInfo {
  Title: string;
  Subject: string;
  Keywords: string;
  Author: string;
  Creator: string;
  /** PDFKit's own, 'PDFKit' unless set */
  Producer?: string;
  /** Now unless set */
  CreationDate?: Date;
  ModDate?: Date;
}

export interface PdfKitOptions {
  size?: 'A4' | [number, number];
  margins?: { top: number; bottom: number; left: number; right: number };
  /** False: `render.ts` adds every page after paginating */
  autoFirstPage?: boolean;
  pdfVersion?: '1.3' | '1.4' | '1.5' | '1.6' | '1.7' | '1.7ext3';
  subset?: 'PDF/UA';
  tagged?: boolean;
  displayTitle?: boolean;
  /** "en-GB" or "de-DE" */
  lang?: string;
  /** Null: no Helvetica (the browser build has none and would throw) */
  font?: string | null;
  /** False in the smoke test, so that the raw bytes can be read */
  compress?: boolean;
  bufferPages?: boolean;
  info?: PdfKitInfo;
}

/** The options of `text()`, `heightOfString()` and `widthOfString()` that the drawing uses */
export interface PdfKitTextOptions {
  width?: number;
  height?: number;
  lineGap?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  lineBreak?: boolean;
  /** True for "…" */
  ellipsis?: boolean | string;
  continued?: boolean;
  strike?: boolean;
  characterSpacing?: number;
}

export interface PdfKitStructOptions {
  title?: string;
  lang?: string;
  alt?: string;
  actual?: string;
  expanded?: string;
  /** A `TH`'s scope */
  scope?: 'Row' | 'Column' | 'Both';
}

/** Marked content PDFKit made for a structure element (`markStructureContent()`) */
export interface PdfKitStructureContent {
  readonly refs: readonly { mcid: number }[];
}

/** A child of a structure element: an element, marked content, or a closure drawn into it now */
export type PdfKitStructChild = PdfKitStructureElement | PdfKitStructureContent | (() => void);

export interface PdfKitStructureElement {
  /** Adds a child; a closure is drawn at once when the element is attached to the tree */
  add(child: PdfKitStructChild): this;
  /** Ends the element and its children */
  end(): void;
}

/**
 * Where an outline entry points. PDFKit 0.20.2 writes `[page, /XYZ, pageWidth − left, pageHeight −
 * top, zoom]`: `top` is the distance from the page's top, and `left` the page's width for the
 * left edge (0 would give the right edge); `fit` writes `[page, /Fit]` instead
 */
export interface PdfKitOutlineOptions {
  /** Shows the entry's children open */
  expanded?: boolean;
  /** 0-based; the current page unless given */
  pageNumber?: number;
  top?: number;
  left?: number;
  /** 0 keeps the reader's zoom */
  zoom?: number;
  fit?: boolean;
}

/** An outline entry (FR-038) */
export interface PdfKitOutline {
  /** A child entry pointing to the current page, or to the 0-based `pageNumber` */
  addItem(title: string, options?: PdfKitOutlineOptions): PdfKitOutline;
}

/** A font PDFKit has opened: only what `withoutCidSet()` wraps (research R5) */
export interface PdfKitEmbeddedFont {
  finalize: () => void;
}

export interface PdfKitDocument {
  /** The outline's root */
  readonly outline: PdfKitOutline;
  info: PdfKitInfo;
  /** Where the next text starts when `text()` is given no position (a span after a `continued` one) */
  x: number;
  y: number;

  /**
   * Private: the opened fonts by name. Only `withoutCidSet()` touches it, finalizing each font
   * with `subset` set to 0 so that no `/CIDSet` is written (research R5)
   */
  _fontFamilies: Record<string, PdfKitEmbeddedFont>;
  /** PDF/UA's part, 1; read and restored by `withoutCidSet()` only */
  subset: number;

  registerFont(name: string, src: PdfFontBytes, family?: string): this;
  font(name: string, size?: number): this;
  fontSize(size: number): this;
  currentLineHeight(includeGap?: boolean): number;
  widthOfString(text: string, options?: PdfKitTextOptions): number;
  heightOfString(text: string, options?: PdfKitTextOptions): number;
  text(text: string, x?: number, y?: number, options?: PdfKitTextOptions): this;
  text(text: string, options?: PdfKitTextOptions): this;

  fillColor(colour: string, opacity?: number): this;
  strokeColor(colour: string, opacity?: number): this;
  opacity(opacity: number): this;
  fillOpacity(opacity: number): this;
  strokeOpacity(opacity: number): this;
  lineWidth(width: number): this;
  dash(length: number, options?: { space?: number; phase?: number }): this;
  undash(): this;

  save(): this;
  restore(): this;
  rotate(angle: number, options?: { origin?: [number, number] }): this;

  rect(x: number, y: number, width: number, height: number): this;
  roundedRect(x: number, y: number, width: number, height: number, radius: number): this;
  circle(x: number, y: number, radius: number): this;
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  fill(colour?: string): this;
  stroke(colour?: string): this;
  fillAndStroke(fillColour?: string, strokeColour?: string): this;

  addPage(options?: { size?: 'A4' | [number, number]; margins?: PdfKitOptions['margins'] }): this;

  /** An artifact's marked content; closed with `endMarkedContent()` */
  /**
   * Opens marked content: `render.ts` opens only artifacts; `markStructureContent()` calls it with
   * the structure type and its `mcid`
   */
  markContent(tag: 'Artifact' | StructType, options?: { type?: ArtifactType; mcid?: number }): this;
  markStructureContent(tag: StructType, options?: { lang?: string }): PdfKitStructureContent;
  endMarkedContent(): this;
  struct(
    type: StructType,
    options?: PdfKitStructOptions,
    children?: PdfKitStructChild | PdfKitStructChild[]
  ): PdfKitStructureElement;
  /** Adds a root element to the structure tree */
  addStructure(element: PdfKitStructureElement): this;

  on(event: 'data', listener: (chunk: Uint8Array) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  end(): void;
}

/** PDFKit's default export, the browser build in the worker and the Node build in the smoke test */
export type PdfKitConstructor = new (options?: PdfKitOptions) => PdfKitDocument;

/** What `renderConnectionPdf(model, options)` receives (contracts/pdf-worker.md sections 3, 4) */
export interface PdfRenderOptions {
  PDFDocument: PdfKitConstructor;
  fonts: PdfFonts;
  /** PDFKit's measuring through the same document unless given */
  measure?: Measure;
}

// ---------------------------------------------------------------------------------------------
// What `recordingDocument()` in `render.ts` records of a rendered document, for the smoke test and
// the sweeps (research R14): embedded text is written as glyph ids, so the recording is how the
// tests read what each page says without a PDF parser. Coordinates are the page's, in points,
// from its top-left corner

/** The marked content a text or shape is drawn in: the innermost one open at the time */
export type RecordedRole =
  /** Structure content: its element's type and its marked-content id on the page */
  | { kind: 'tag'; type: StructType; mcid: number }
  | { kind: 'artifact'; type: ArtifactType | null }
  /** Outside any tag or artifact: a defect (FR-036, FR-037) */
  | null;

export interface RecordedText {
  /** 1-based */
  page: number;
  /** As passed to `text()`: one span, or one line of a URL */
  text: string;
  /** The position `text()` was given, or where a span after a `continued` one starts */
  x: number;
  y: number;
  /** The box passed to `text()`; null for one line drawn without one */
  width: number | null;
  /** The text's own width in its font and size (`widthOfString`) */
  advance: number;
  /** The registered name, a `PdfFont` */
  font: string;
  size: number;
  colour: string;
  /** The fill opacity, 1 unless changed (the watermark's 6 %) */
  opacity: number;
  /** Struck through by PDFKit (`strike`): a faded item's words (design-notes 8.2 D3) */
  strike: boolean;
  role: RecordedRole;
}

/** A painted shape, by its bounding box (a rounded corner's curve isn't followed) */
export interface RecordedShape {
  page: number;
  kind: 'rect' | 'circle' | 'path';
  x: number;
  y: number;
  width: number;
  height: number;
  /** Null when not filled */
  fill: string | null;
  /** Null when not stroked */
  stroke: string | null;
  opacity: number;
  role: RecordedRole;
}

/** A structure element as `render.ts` built it, its children in order */
export interface RecordedElement {
  type: StructType;
  scope: PdfKitStructOptions['scope'] | null;
  children: RecordedChild[];
}

/** An element, or marked content, which the `RecordedRole` of its texts and shapes names */
export type RecordedChild = RecordedElement | { page: number; mcid: number };

export interface RecordedOutlineItem {
  title: string;
  /** 1-based: where the entry points */
  page: number;
  /** Its distance from the page's top, when given */
  top: number | null;
  children: RecordedOutlineItem[];
}

export interface RecordedPage {
  texts: RecordedText[];
  shapes: RecordedShape[];
}

export interface PdfRecording {
  /** What the document was created with: its properties (`info`), `lang`, `subset`, … */
  options: PdfKitOptions | null;
  pages: RecordedPage[];
  /** The roots added to the structure tree: `Document` */
  structure: RecordedElement[];
  outline: RecordedOutlineItem[];
}
