// The connection PDF's blocks (contracts/pdf-document.md sections 2 and 3; data-model section 4;
// research R11): what the document says, in reading order, cut into the units the paginator
// places, and each block kind's geometry. `layoutOf()` is the one function that computes where a
// block's texts and shapes go: `blocksOf()` calls it for each block's height and `render.ts`
// calls it again to draw, so that measured equals drawn. Pure: no browser API, nothing stored,
// sent or logged (FR-041, FR-042)
import type { Combinator, Mark } from '@connection-portal/api-types/form-connections';
import type { Language } from '@connection-portal/rules/language';

import { BRANCH_MARK_COPY } from '../../components/BranchMark/constants';
import { STATUS_PILL_COPY } from '../../components/ConnectionStatusBadge/constants';
import { CONNECTOR_COPY } from '../../components/Connector/constants';
import { RULE_ROW_COPY } from '../../components/RuleRow/constants';
import { CONNECTION_DETAIL_COPY } from '../../pages/FormConnectionDetail/constants';
import { PDF_COLOURS, PDF_LAYOUT, PDF_STYLES, PDF_TEXTS } from './constants';
import type {
  Block,
  BlockContent,
  BlockLayout,
  ConnectionPdfModel,
  ConnectorContent,
  DetailsContent,
  DetailsRow,
  DetailsValueKind,
  DocumentContent,
  GapContent,
  GapsHeadingContent,
  GroupEndContent,
  GroupHeaderContent,
  HexColour,
  ItemHeadingLevel,
  LabelledText,
  LayoutPart,
  LinkContent,
  LinkHeadingContent,
  LinksToCreateContent,
  MarkBadge,
  Measure,
  NoteContent,
  PagePlace,
  PdfBookmark,
  PdfGroup,
  PdfItem,
  PdfRule,
  PdfStatus,
  PdfVariant,
  PlacedRect,
  PlacedShape,
  PlacedText,
  PlaceholderContent,
  RuleContent,
  RuleContinuationContent,
  SectionHeadingContent,
  StatusContent,
  StrokeStyle,
  StructNode,
  StructType,
  TextRole,
  TextSpan,
  TextStyle,
  TitleContent,
  VariantHeaderContent,
} from './types';
import { urlLines } from './wrapUrl';

const L = PDF_LAYOUT;
const S = PDF_STYLES;
const C = PDF_COLOURS;
const BODY_WIDTH = L.body.width;

/**
 * How far a fill reaching up overlaps the block above that continues it, in points (T037a): more
 * than a pixel at 100 % zoom (1.33 px), and inside the empty space at the bottom of what it can
 * reach (a gap's 4 pt, the gaps' heading's 8 pt, a bar)
 */
export const JOIN_OVERLAP = 1;

/** The unit the result links form (FR-026) */
export const RESULT_LINKS_UNIT = 'result-links';

// ---------------------------------------------------------------------------------------------
// The structure: a `Sect` per part (contracts/pdf-document.md section 4)

/** Page 1's part: the title, the status, the details table and the note */
const PAGE_ONE_SECT: StructNode = { type: 'Sect', key: 'page-1' };

/** A section's part, "section-1" to "section-3" */
function sectionSect(number: 1 | 2 | 3): StructNode {
  return { type: 'Sect', key: `section-${number}` };
}

function structNode(type: StructType, key: string): StructNode {
  return { type, key };
}

/** Tagged, in the elements of `within` and then `nodes` */
function tagged(within: StructNode[], ...nodes: StructNode[]): TextRole {
  return { kind: 'tag', path: [...within, ...nodes] };
}

/** Decoration in the body: a step number, a chip's word */
const LAYOUT_ARTIFACT: TextRole = { kind: 'artifact', type: 'Layout' };

// ---------------------------------------------------------------------------------------------
// Measuring and placing text

/** Any one line: a line's height depends on the font's metrics and size only */
const LINE_PROBE = 'X';

/** The height of one line of `style`, its line gap included, as `Measure.height` gives it */
function lineHeightOf(style: TextStyle, measure: Measure): number {
  return measure.height(LINE_PROBE, style, BODY_WIDTH);
}

/** How much taller than one line `text` wraps at `width`: what pushes the block's later parts down */
function extraLinesOf(text: string, style: TextStyle, width: number, measure: Measure): number {
  return Math.max(0, measure.height(text, style, width) - lineHeightOf(style, measure));
}

interface TextBox {
  x: number;
  y: number;
  width: number;
}

/** A text in one style, wrapped at its box's width, with the height `Measure` gives it */
function wrappedText(
  text: string,
  style: TextStyle,
  box: TextBox,
  role: TextRole,
  measure: Measure
): PlacedText {
  return {
    kind: 'text',
    ...box,
    height: measure.height(text, style, box.width),
    spans: [{ text, style }],
    align: 'left',
    lines: 'wrap',
    role,
  };
}

/** A text on one line (`lineBreak: false`), never wrapped */
function oneLineText(
  spans: TextSpan[],
  box: TextBox,
  role: TextRole,
  measure: Measure,
  align: PlacedText['align'] = 'left'
): PlacedText {
  return {
    kind: 'text',
    ...box,
    height: lineHeightOf(spans[0].style, measure),
    spans,
    align,
    lines: 'one',
    role,
  };
}

/** The lowest bottom of the parts placed so far: a block's content height */
function bottomOf(parts: LayoutPart[]): number {
  return parts.reduce((bottom, part) => {
    switch (part.kind) {
      case 'text':
      case 'rect':
        return Math.max(bottom, part.y + part.height);
      case 'circle':
        return Math.max(bottom, part.cy + part.radius);
      case 'line':
        return Math.max(bottom, part.y1, part.y2);
    }
  }, 0);
}

// ---------------------------------------------------------------------------------------------
// Page 1

/** The eyebrow in capitals, the name (`H1`, in full, wrapping) and the description */
function titleLayout(content: TitleContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const eyebrowStyle = content.draft ? S.eyebrowDraft : S.eyebrow;
  const parts: LayoutPart[] = [
    // Capitals without letter spacing, so that extracted text reads as words (spike)
    oneLineText(
      [{ text: content.eyebrow.toUpperCase(), style: eyebrowStyle }],
      { x: 0, y: 0, width: BODY_WIDTH },
      tagged(within, structNode('P', `${key}/eyebrow`)),
      measure
    ),
  ];
  const name = wrappedText(
    content.name,
    S.name,
    { x: 0, y: L.title.eyebrowAdvance, width: BODY_WIDTH },
    tagged(within, structNode('H1', `${key}/name`)),
    measure
  );
  parts.push(name);
  let height = name.y + name.height;
  if (content.description !== null) {
    const description = wrappedText(
      content.description,
      S.description,
      { x: 0, y: height + L.title.nameGap, width: BODY_WIDTH },
      tagged(within, structNode('P', `${key}/description`)),
      measure
    );
    parts.push(description);
    height = description.y + description.height;
  }
  return { height, parts };
}

interface StatusLook {
  style: TextStyle;
  fill: HexColour;
  dot: HexColour;
  /** A scheduled connection's dot is a ring (ConnectionStatusBadge) */
  hollow: boolean;
}

/** The pill's colours as `ConnectionStatusBadge` draws them (design-notes 4) */
const STATUS_LOOKS: Record<PdfStatus, StatusLook> = {
  active: { style: S.pillActive, fill: C.successBackground, dot: C.success, hollow: false },
  scheduled: { style: S.pillScheduled, fill: C.successBackground, dot: C.success, hollow: true },
  deactivated: {
    style: S.pillDeactivated,
    fill: C.deactivatedBackground,
    dot: C.deactivatedDot,
    hollow: false,
  },
  draft: { style: S.pillDraft, fill: C.draftBackground, dot: C.draftDot, hollow: false },
};

/** The pill (its shape and dot artifacts, its word text) and the note beside it */
function statusLayout(content: StatusContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const look = STATUS_LOOKS[content.status];
  const pill = L.status;
  const pillWidth = measure.width(content.label, look.style) + pill.extraWidth;
  const noteX = pillWidth + pill.noteGap;
  const parts: LayoutPart[] = [
    {
      kind: 'rect',
      artifact: 'Layout',
      x: 0,
      y: 0,
      width: pillWidth,
      height: pill.height,
      radius: pill.radius,
      fill: look.fill,
      stroke: null,
      joinsAbove: false,
    },
    {
      kind: 'circle',
      artifact: 'Layout',
      cx: pill.dotX,
      cy: pill.height / 2,
      radius: pill.dotRadius,
      fill: look.hollow ? null : look.dot,
      stroke: look.hollow ? { colour: look.dot, width: pill.dotRingWidth, dash: null } : null,
    },
    oneLineText(
      [{ text: content.label, style: look.style }],
      { x: pill.textX, y: pill.textY, width: pillWidth - pill.textX },
      tagged(within, structNode('P', `${key}/label`)),
      measure
    ),
    wrappedText(
      content.note,
      S.statusNote,
      { x: noteX, y: pill.textY, width: BODY_WIDTH - noteX },
      tagged(within, structNode('P', `${key}/note`)),
      measure
    ),
  ];
  return { height: Math.max(pill.height, bottomOf(parts)), parts };
}

const DETAILS_VALUE_STYLES: Record<DetailsValueKind, TextStyle> = {
  id: S.detailsId,
  version: S.detailsVersion,
  text: S.detailsText,
};

/**
 * The details box, a `Table` with a `TR` per row, the key a `TH` (scope Row). A row is the
 * prototype's 19 pt, taller only by the lines a wrapping key or value adds
 */
function detailsLayout(content: DetailsContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const details = L.details;
  const table = structNode('Table', `${key}/table`);
  const valueWidth = BODY_WIDTH - details.valueInset;
  const texts: LayoutPart[] = [];
  let rowY = details.paddingTop;
  content.rows.forEach((row: DetailsRow, index) => {
    const valueStyle = DETAILS_VALUE_STYLES[row.valueKind];
    const rowNode = structNode('TR', `${key}/row-${index}`);
    const keyY =
      rowY + (row.valueKind === 'version' ? details.keyOffsetYLarge : details.keyOffsetY);
    texts.push(
      wrappedText(
        row.label,
        S.detailsKey,
        { x: details.keyX, y: keyY, width: details.keyWidth },
        tagged(within, table, rowNode, {
          type: 'TH',
          key: `${key}/row-${index}/key`,
          scope: 'Row',
        }),
        measure
      ),
      wrappedText(
        row.value,
        valueStyle,
        { x: details.valueX, y: rowY, width: valueWidth },
        tagged(within, table, rowNode, structNode('TD', `${key}/row-${index}/value`)),
        measure
      )
    );
    rowY +=
      details.rowHeight +
      Math.max(
        extraLinesOf(row.label, S.detailsKey, details.keyWidth, measure),
        extraLinesOf(row.value, valueStyle, valueWidth, measure)
      );
  });
  const height = rowY - details.paddingTop + details.paddingY;
  const box: LayoutPart = {
    kind: 'rect',
    artifact: 'Layout',
    x: 0,
    y: 0,
    width: BODY_WIDTH,
    height,
    radius: details.radius,
    fill: content.draft ? C.draftBackground : C.bandBackground,
    stroke: null,
    joinsAbove: false,
  };
  return { height, parts: [box, ...texts] };
}

/** The note on checking the copy (FR-009), indented as the box's rows */
function noteLayout(content: NoteContent, measure: Measure): BlockLayout {
  const { indent } = L.note;
  const text = wrappedText(
    content.text,
    S.note,
    { x: indent, y: 0, width: BODY_WIDTH - 2 * indent },
    tagged(content.within, structNode('P', `${content.key}/text`)),
    measure
  );
  return { height: text.height, parts: [text] };
}

// ---------------------------------------------------------------------------------------------
// A draft's gaps: "To finish before publishing (n)", a warning box cut into slices, one per block

/**
 * One slice of the gaps' box (artifacts): its fill, rounded at the box's top (the heading's
 * slice) or bottom (the last gap's) and square where it joins the next slice, and the bar at its
 * left. Gaps follow one another without a gap, so the slices on a page form one box. A gap's
 * slice joins the one above it (`joinsAbove`, see `reachOf()`): its bar and a strip of its fill
 * right of the bar reach `JOIN_OVERLAP` up into the slice above when it is on the same page, so
 * that no viewer anti-aliases the shared edge into a light seam (T037a). The strip leaves the bar's
 * columns alone, so the bar's own top edge lies over the bar above. A gap that begins a page reaches
 * nowhere: the strip then lies inside its own fill
 */
function gapsSliceOf(height: number, roundTop: boolean, roundBottom: boolean): PlacedShape[] {
  const gaps = L.gaps;
  const fill = C.warningBackground;
  const square = Math.min(gaps.radius, height);
  const shapes: PlacedShape[] = [];
  if (roundTop || roundBottom) {
    shapes.push({ ...fillRect(0, 0, BODY_WIDTH, height, fill), radius: gaps.radius });
    if (!roundTop) shapes.push(fillRect(0, 0, BODY_WIDTH, square, fill));
    if (!roundBottom) shapes.push(fillRect(0, height - square, BODY_WIDTH, square, fill));
  } else {
    shapes.push(fillRect(0, 0, BODY_WIDTH, height, fill));
  }
  const joins = !roundTop;
  if (joins) {
    const strip = fillRect(gaps.barWidth, 0, BODY_WIDTH - gaps.barWidth, JOIN_OVERLAP, fill);
    shapes.push({ ...strip, joinsAbove: true });
  }
  shapes.push({ ...fillRect(0, 0, gaps.barWidth, height, C.warning), joinsAbove: joins });
  return shapes;
}

/**
 * The box's top: "To finish before publishing (n)" (`H2`) and its sentence (`P`), down to where
 * the first gap starts; chained to it
 */
function gapsHeadingLayout(content: GapsHeadingContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const gaps = L.gaps;
  const width = BODY_WIDTH - 2 * gaps.paddingX;
  const title = wrappedText(
    content.title,
    S.gapsTitle,
    { x: gaps.paddingX, y: gaps.paddingTop, width },
    tagged(within, structNode('H2', `${key}/title`)),
    measure
  );
  const lead = wrappedText(
    content.lead,
    S.gapsLead,
    {
      x: gaps.paddingX,
      y: gaps.leadY + extraLinesOf(content.title, S.gapsTitle, width, measure),
      width,
    },
    tagged(within, structNode('P', `${key}/lead`)),
    measure
  );
  const height = lead.y + lead.height + gaps.leadGap;
  return { height, parts: [...gapsSliceOf(height, true, false), title, lead] };
}

/**
 * One gap: its slice of the box, its bullet (an artifact) and its text, an `LI` with its `LBody`
 * in the gaps' `L` (`within`); the last one closes the box
 */
function gapLayout(content: GapContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const gaps = L.gaps;
  const text = wrappedText(
    content.text,
    S.gap,
    { x: gaps.itemX, y: 0, width: BODY_WIDTH - gaps.itemInset },
    tagged(within, structNode('LI', `${key}/item`), structNode('LBody', `${key}/body`)),
    measure
  );
  const height = text.height + gaps.itemGap + (content.last ? gaps.paddingBottom : 0);
  return {
    height,
    parts: [
      ...gapsSliceOf(height, false, content.last),
      {
        kind: 'circle',
        artifact: 'Layout',
        cx: gaps.bulletX,
        cy: gaps.bulletY,
        radius: gaps.bulletRadius,
        fill: C.warning,
        stroke: null,
      },
      text,
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// Sections

/**
 * The space a text's first part ends with, so that the tagged text reads with one space where the
 * drawing leaves a wider gap: the part after it is placed by the gap's width, not by the space
 */
const SPACE = ' ';

/**
 * The accent rule, "1  Links for your service" (`H2`), the lead and the notice under it. The
 * number is drawn with one space after it and the title where the number and `numberSeparator`
 * end, wrapping in its own column: the gap is drawn, the tagged text reads "1 Links for your
 * service" (contracts/pdf-document.md section 4)
 */
function sectionHeadingLayout(content: SectionHeadingContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const section = L.section;
  const heading = structNode('H2', `${key}/title`);
  const titleX = measure.width(`${content.number}${section.numberSeparator}`, S.sectionNumber);
  const titleWidth = BODY_WIDTH - titleX;
  const parts: LayoutPart[] = [
    {
      kind: 'line',
      artifact: 'Layout',
      x1: 0,
      y1: 0,
      x2: BODY_WIDTH,
      y2: 0,
      stroke: { colour: C.accent, width: section.ruleWidth, dash: null },
    },
    oneLineText(
      [{ text: `${content.number}${SPACE}`, style: S.sectionNumber }],
      { x: 0, y: section.titleY, width: titleX },
      tagged(within, heading),
      measure
    ),
    wrappedText(
      content.title,
      S.sectionTitle,
      { x: titleX, y: section.titleY, width: titleWidth },
      tagged(within, heading),
      measure
    ),
  ];
  let y = section.titleAdvance + extraLinesOf(content.title, S.sectionTitle, titleWidth, measure);
  const paragraphs: [string | null, TextStyle, string][] = [
    [content.lead, S.sectionLead, 'lead'],
    [content.notice, S.sectionNotice, 'notice'],
  ];
  for (const [text, style, name] of paragraphs) {
    if (text === null) continue;
    const paragraph = wrappedText(
      text,
      style,
      { x: 0, y: y + section.leadGap, width: BODY_WIDTH },
      tagged(within, structNode('P', `${key}/${name}`)),
      measure
    );
    parts.push(paragraph);
    y = paragraph.y + paragraph.height;
  }
  return { height: y + section.paddingBottom, parts };
}

/** ① or ② in its accent circle (artifacts), the title (`H3`) and the explanation */
function linkHeadingLayout(content: LinkHeadingContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const links = L.links;
  const titleWidth = BODY_WIDTH - links.indent;
  const parts: LayoutPart[] = [
    {
      kind: 'circle',
      artifact: 'Layout',
      cx: links.stepRadius,
      cy: links.stepRadius,
      radius: links.stepRadius,
      fill: C.accent,
      stroke: null,
    },
    oneLineText(
      [{ text: String(content.step), style: S.stepNumber }],
      { x: 0, y: links.stepTextY, width: 2 * links.stepRadius },
      LAYOUT_ARTIFACT,
      measure,
      'center'
    ),
    wrappedText(
      content.title,
      S.linkTitle,
      { x: links.indent, y: links.titleY, width: titleWidth },
      tagged(within, structNode('H3', `${key}/title`)),
      measure
    ),
  ];
  let height = links.headingAdvance + extraLinesOf(content.title, S.linkTitle, titleWidth, measure);
  if (content.paragraphs.length > 0) {
    // One paragraph, as the details page's explanation and the {reference} sentence read together
    const info = wrappedText(
      content.paragraphs.join(' '),
      S.linkInfo,
      { x: links.indent, y: height + links.infoGap, width: BODY_WIDTH - links.infoInset },
      tagged(within, structNode('P', `${key}/info`)),
      measure
    );
    parts.push(info);
    height = info.y + info.height;
  }
  return { height, parts };
}

/**
 * A URL with its label above it, one block: the label, the URL's box (an artifact) and the URL in
 * mono, one line per `urlLines()` line, broken only after a "/" (FR-011), all lines one `P`
 */
function linkLayout(content: LinkContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const links = L.links;
  const width = BODY_WIDTH - links.indent;
  const parts: LayoutPart[] = [];
  let y = 0;
  if (content.label !== null) {
    parts.push(
      wrappedText(
        content.label,
        S.linkLabel,
        { x: links.indent, y: 0, width },
        tagged(within, structNode('P', `${key}/label`)),
        measure
      )
    );
    y = links.labelAdvance + extraLinesOf(content.label, S.linkLabel, width, measure);
  }
  const urlWidth = width - 2 * links.urlPaddingX;
  const lines = urlLines(content.url, urlWidth, (text) => measure.width(text, S.url));
  const lineHeight = lineHeightOf(S.url, measure);
  const boxHeight = lines.length * lineHeight + 2 * links.urlPaddingY;
  parts.push({
    kind: 'rect',
    artifact: 'Layout',
    x: links.indent,
    y,
    width,
    height: boxHeight,
    radius: links.urlRadius,
    fill: C.neutralBackground,
    stroke: null,
    joinsAbove: false,
  });
  const url = structNode('P', `${key}/url`);
  lines.forEach((line, index) => {
    parts.push(
      oneLineText(
        [{ text: line, style: S.url }],
        {
          x: links.indent + links.urlPaddingX,
          y: y + links.urlPaddingY + index * lineHeight,
          width: urlWidth,
        },
        tagged(within, url),
        measure
      )
    );
  });
  return { height: y + boxHeight, parts };
}

/**
 * A draft's dashed box in place of the links (FR-013): "Created when the connection is published
 * and active." and the links publishing will create, each a `P`; the dashed frame is an artifact.
 * No URL
 */
function linksToCreateLayout(content: LinksToCreateContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const box = L.linksToCreate;
  const width = BODY_WIDTH - 2 * box.paddingX;
  const title = wrappedText(
    content.title,
    S.linksToCreateTitle,
    { x: box.paddingX, y: box.paddingTop, width },
    tagged(within, structNode('P', `${key}/title`)),
    measure
  );
  const text = wrappedText(
    content.text,
    S.linksToCreateText,
    {
      x: box.paddingX,
      y:
        box.paddingTop +
        box.titleAdvance +
        extraLinesOf(content.title, S.linksToCreateTitle, width, measure) +
        box.textGap,
      width,
    },
    tagged(within, structNode('P', `${key}/text`)),
    measure
  );
  const height = text.y + text.height + box.paddingBottom;
  const frame: PlacedRect = {
    kind: 'rect',
    artifact: 'Layout',
    x: 0,
    y: 0,
    width: BODY_WIDTH,
    height,
    radius: box.radius,
    fill: null,
    stroke: { colour: C.draftDot, width: box.strokeWidth, dash: box.dash },
    joinsAbove: false,
  };
  return { height, parts: [frame, title, text] };
}

/**
 * A document's frame (an artifact), its name with "<n> data items" (`H3`) and its data items as
 * an `L` in two columns, the left column first in reading order; or the placeholder. The count
 * follows the name on its line when both fit, else it takes the line below
 */
function documentLayout(content: DocumentContent, measure: Measure): BlockLayout {
  const { key, within } = content;
  const document = L.document;
  const innerWidth = BODY_WIDTH - 2 * document.paddingX;
  const heading = structNode('H3', `${key}/name`);
  const count = `${document.countSeparator}${content.count}`;
  const nameLine = lineHeightOf(S.documentName, measure);
  const fitsOneLine =
    measure.width(content.name, S.documentName) + measure.width(count, S.documentCount) <=
    innerWidth;
  const parts: LayoutPart[] = [];
  const texts: LayoutPart[] = [];
  let headHeight = nameLine;
  // The name ends with one space, so that the heading reads "Personal ID 7 data items"
  const nameText = `${content.name}${SPACE}`;
  if (fitsOneLine) {
    // Measured to fit: both drawn on one line, so that they can't wrap where the measure didn't;
    // the count where the name and `countSeparator` end
    const countX =
      document.paddingX +
      measure.width(content.name, S.documentName) +
      measure.width(document.countSeparator, S.documentCount);
    texts.push(
      oneLineText(
        [{ text: nameText, style: S.documentName }],
        { x: document.paddingX, y: document.nameY, width: countX - document.paddingX },
        tagged(within, heading),
        measure
      ),
      oneLineText(
        [{ text: content.count, style: S.documentCount }],
        {
          x: countX,
          y: document.nameY,
          width: measure.width(content.count, S.documentCount),
        },
        tagged(within, heading),
        measure
      )
    );
  } else {
    const name = wrappedText(
      nameText,
      S.documentName,
      { x: document.paddingX, y: document.nameY, width: innerWidth },
      tagged(within, heading),
      measure
    );
    const countText = wrappedText(
      content.count,
      S.documentCount,
      { x: document.paddingX, y: name.y + name.height, width: innerWidth },
      tagged(within, heading),
      measure
    );
    texts.push(name, countText);
    headHeight = name.height + countText.height;
  }
  const itemsY = document.itemsY + headHeight - nameLine;
  let itemsHeight: number;
  if (content.placeholder !== null) {
    const placeholder = wrappedText(
      content.placeholder,
      S.placeholder,
      { x: document.paddingX, y: itemsY, width: innerWidth },
      tagged(within, structNode('P', `${key}/placeholder`)),
      measure
    );
    texts.push(placeholder);
    itemsHeight = placeholder.height + document.itemGap;
  } else {
    itemsHeight = dataItemsOf(content, itemsY, texts, parts, measure);
  }
  const height =
    document.paddingTop +
    document.nameAdvance +
    (headHeight - nameLine) +
    itemsHeight +
    document.paddingBottom;
  const frame: LayoutPart = {
    kind: 'rect',
    artifact: 'Layout',
    x: 0,
    y: 0,
    width: BODY_WIDTH,
    height,
    radius: document.radius,
    fill: null,
    stroke: { colour: C.line, width: document.strokeWidth, dash: null },
    joinsAbove: false,
  };
  return { height, parts: [frame, ...parts, ...texts] };
}

/**
 * A document's data items in two columns, the first half (rounded up) on the left: each an `LI`
 * with its bullet (an artifact) and its text in an `LBody`. Adds the bullets to `shapes` and the
 * texts to `texts`, the left column's first, and returns the taller column's height
 */
function dataItemsOf(
  content: DocumentContent,
  top: number,
  texts: LayoutPart[],
  shapes: LayoutPart[],
  measure: Measure
): number {
  const { key, within, dataItems } = content;
  const document = L.document;
  const columnWidth = (BODY_WIDTH - 2 * document.paddingX - document.columnGap) / 2;
  const textWidth = columnWidth - document.itemInset;
  const list = structNode('L', `${key}/items`);
  const half = Math.ceil(dataItems.length / 2);
  const columns = [dataItems.slice(0, half), dataItems.slice(half)];
  let tallest = 0;
  columns.forEach((column, columnIndex) => {
    const x = document.paddingX + columnIndex * (columnWidth + document.columnGap);
    let y = top;
    column.forEach((item, row) => {
      const index = columnIndex * half + row;
      shapes.push({
        kind: 'circle',
        artifact: 'Layout',
        cx: x + document.bulletX,
        cy: y + document.bulletY,
        radius: document.bulletRadius,
        fill: C.accent,
        stroke: null,
      });
      const text = wrappedText(
        item,
        S.dataItem,
        { x: x + document.itemX, y, width: textWidth },
        tagged(
          within,
          list,
          structNode('LI', `${key}/item-${index}`),
          structNode('LBody', `${key}/item-${index}/body`)
        ),
        measure
      );
      texts.push(text);
      y += text.height + document.itemGap;
    });
    tallest = Math.max(tallest, y - top);
  });
  return tallest;
}

/** "No documents yet", "No rules. Anyone who shares …": a muted `P` at its depth's indent */
function placeholderLayout(content: PlaceholderContent, measure: Measure): BlockLayout {
  const x = content.depth * L.items.indent;
  const text = wrappedText(
    content.text,
    S.placeholder,
    { x, y: 0, width: BODY_WIDTH - x },
    tagged(content.within, structNode('P', `${content.key}/text`)),
    measure
  );
  return { height: text.height, parts: [text] };
}

// ---------------------------------------------------------------------------------------------
// 3 Rules per variant: a variant's header, rules, groups and the AND/OR between them

/** The key of the element a section 3 block's texts go into: the variant's Sect, the item's Div */
function ownerKeyOf(content: BlockContent): string {
  return content.within[content.within.length - 1].key;
}

/** A line's height less its line gap: what the glyphs take, to centre them in a chip or pill */
function glyphHeightOf(style: TextStyle, measure: Measure): number {
  return lineHeightOf(style, measure) - style.size * L.lineGapFactor;
}

/** A rule's or group's heading level by its depth: `H4` at the top level, down to `H6` */
function headingLevelOf(depth: number): ItemHeadingLevel {
  return Math.min(6, 4 + depth) as ItemHeadingLevel;
}

/** The bar of each group around a block at `depth`, the full block high, joining the bar above */
function barsOf(depth: number, height: number): PlacedRect[] {
  const items = L.items;
  return Array.from({ length: depth }, (_, level) => ({
    kind: 'rect',
    artifact: 'Layout',
    x: level * items.indent + items.barX,
    y: 0,
    width: items.barWidth,
    height,
    radius: 0,
    fill: C.line,
    stroke: null,
    joinsAbove: true,
  }));
}

/**
 * How far `rect` is drawn reaching up above its block's top (research R11: the geometry stays
 * here, `render.ts` only applies it). Nothing for a rect that doesn't join above, or for a block
 * that begins its page (`above` null). Otherwise the block's gap, and `JOIN_OVERLAP` more where
 * the block above continues the rect: a square rect of the same fill that spans its columns down
 * to that block's bottom (a group's bar above a bar, a gaps slice above a slice). Two fills that
 * only abut leave a light hairline in viewers that anti-alias each edge (T037a); where nothing of
 * the same fill continues it (a member's bar under its group's tinted header) it stops at the
 * edge, as drawn before
 */
export function reachOf(rect: PlacedRect, gapBefore: number, above: BlockLayout | null): number {
  if (!rect.joinsAbove || above === null) return 0;
  const continues = above.parts.some(
    (part) =>
      part.kind === 'rect' &&
      part.fill === rect.fill &&
      part.radius === 0 &&
      part.x <= rect.x &&
      part.x + part.width >= rect.x + rect.width &&
      Math.abs(part.y + part.height - above.height) < 1e-6
  );
  return gapBefore + (continues ? JOIN_OVERLAP : 0);
}

/** A square-cornered fill, to square off one side of a rounded one */
function fillRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: HexColour
): PlacedRect {
  return {
    kind: 'rect',
    artifact: 'Layout',
    x,
    y,
    width,
    height,
    radius: 0,
    fill,
    stroke: null,
    joinsAbove: false,
  };
}

interface PlacedBadge {
  shape: PlacedRect;
  text: PlacedText;
  width: number;
}

/**
 * A badge, its pill stroked in its word's colour (an artifact) and its word (text, never struck
 * through), at (x, y): an origin, a mark, "Changed here"
 */
function badgeAt(
  label: string,
  style: TextStyle,
  fill: HexColour | null,
  x: number,
  y: number,
  role: TextRole,
  measure: Measure
): PlacedBadge {
  const badge = L.badge;
  const textWidth = measure.width(label, style);
  const width = textWidth + 2 * badge.paddingX;
  return {
    shape: {
      kind: 'rect',
      artifact: 'Layout',
      x,
      y,
      width,
      height: badge.height,
      radius: badge.radius,
      fill,
      stroke: { colour: style.colour, width: badge.strokeWidth, dash: null },
      joinsAbove: false,
    },
    text: oneLineText(
      [{ text: label, style }],
      { x: x + badge.paddingX, y: y + badge.textY, width: textWidth },
      role,
      measure
    ),
    width,
  };
}

/** A badge's width, its word and its padding */
function badgeWidthOf(label: string, style: TextStyle, measure: Measure): number {
  return measure.width(label, style) + 2 * L.badge.paddingX;
}

const MARK_STYLES: Record<Mark, TextStyle> = {
  changed: S.markChanged,
  added: S.markAdded,
  removed: S.markRemoved,
};

interface ItemLook {
  /** A rule's card */
  card: HexColour;
  cardStroke: HexColour;
  /** A group's header and closing block */
  group: HexColour;
  /** The mark badge's pill */
  badge: HexColour;
}

/**
 * How a marked item looks (design-notes 4; BranchMark): a changed or added one tinted in the mark
 * colour, a removed one in the neutral grey; a faded member of a removed group keeps its own
 * mark's look, its words muted and struck through
 */
function itemLookOf(mark: Mark | null): ItemLook {
  switch (mark) {
    case 'changed':
    case 'added':
      return {
        card: C.markBackground,
        cardStroke: C.mark,
        group: C.markBackground,
        badge: C.white,
      };
    case 'removed':
      return {
        card: C.neutralBackground,
        cardStroke: C.line,
        group: C.neutralBackground,
        badge: C.neutralBackground,
      };
    case null:
      return { card: C.white, cardStroke: C.line, group: C.neutralBackground, badge: C.white };
  }
}

/** Where an item's heading row goes, in the block's coordinates */
interface HeadingBox {
  /** The identifier's and the heading's left */
  left: number;
  /** The name's top; the badge's too */
  top: number;
  /** The identifier's top, a little lower to share the name's baseline */
  idTop: number;
  /** From `left` to the badge's right edge */
  width: number;
}

interface Placed {
  shapes: PlacedShape[];
  texts: PlacedText[];
  bottom: number;
}

/**
 * A rule's or group's heading row: the identifier (mono) and the name, both in one heading
 * (design-notes 5.6), and the mark badge at the right, its word a `Span` of the item's `Div`. An
 * item without a name reads as its identifier alone, as the Summary shows it (FR-019)
 */
function itemHeadingOf(
  content: RuleContent | GroupHeaderContent,
  box: HeadingBox,
  measure: Measure
): Placed {
  const owner = ownerKeyOf(content);
  const { within } = content;
  const heading = tagged(within, structNode(`H${content.level}`, `${owner}/heading`));
  const idWidth = measure.width(content.id, S.itemId);
  const idBox = idWidth + L.rule.idExtraWidth;
  const markWidth = content.badge
    ? badgeWidthOf(content.badge.label, MARK_STYLES[content.badge.mark], measure) +
      L.badge.gapBefore
    : 0;
  const nameStyle = content.faded ? S.itemNameFaded : S.itemName;
  const texts: PlacedText[] = [
    // One space after the identifier when a name follows, so that the heading reads "rule-7
    // Minimum age"; the name is placed by the identifier's box, not by the space
    oneLineText(
      [{ text: content.name === '' ? content.id : `${content.id}${SPACE}`, style: S.itemId }],
      { x: box.left, y: box.idTop, width: idWidth },
      heading,
      measure
    ),
  ];
  let bottom = box.top + lineHeightOf(nameStyle, measure);
  if (content.name !== '') {
    const name = wrappedText(
      content.name,
      nameStyle,
      { x: box.left + idBox, y: box.top, width: box.width - idBox - markWidth },
      heading,
      measure
    );
    texts.push(name);
    bottom = name.y + name.height;
  }
  const shapes: PlacedShape[] = [];
  if (content.badge) {
    const style = MARK_STYLES[content.badge.mark];
    const badge = badgeAt(
      content.badge.label,
      style,
      itemLookOf(content.badge.mark).badge,
      box.left + box.width - badgeWidthOf(content.badge.label, style, measure),
      box.top,
      tagged(within, structNode('Span', `${owner}/mark`)),
      measure
    );
    shapes.push(badge.shape);
    texts.push(badge.text);
    bottom = Math.max(bottom, box.top + L.badge.height);
  }
  return { shapes, texts, bottom };
}

/** A piece of a statement's flow: its words (the subject and check, the tail) or a value's chip */
type FlowItem = { kind: 'words' | 'value'; text: string };

/**
 * A statement laid out as the Summary shows it: its words, then a chip per value (a frame, an
 * artifact, around the value's word), then the tail, left to right in lines of `box.width`. Each
 * piece goes on the current line when it fits there, else on the next; a piece wider than a line
 * takes lines of its own, wrapped. Words on a line with chips are centred on the chips. All the
 * texts go into the statement's `P`, in order; a faded rule's are muted and struck through, each
 * one-line text's box exactly its words' width, so that a strike line can be drawn from x to
 * x + width
 */
function statementFlowOf(
  items: FlowItem[],
  box: TextBox,
  faded: boolean,
  role: TextRole,
  measure: Measure
): Placed {
  const chip = L.rule.chip;
  const wordsStyle = faded ? S.statementFaded : S.statement;
  const valueStyle = faded ? S.statementValueFaded : S.statementValue;
  const chipHeight = glyphHeightOf(valueStyle, measure) + 2 * chip.paddingY;
  const withChips = items.some((item) => item.kind === 'value');
  const wordsOffset = withChips ? (chipHeight - glyphHeightOf(wordsStyle, measure)) / 2 : 0;
  const right = box.x + box.width;
  const shapes: PlacedShape[] = [];
  const texts: PlacedText[] = [];
  const chipFrame = (x: number, y: number, width: number, height: number): PlacedRect => ({
    kind: 'rect',
    artifact: 'Layout',
    x,
    y,
    width,
    height,
    radius: chip.radius,
    fill: C.white,
    stroke: { colour: C.decorativeBorder, width: chip.strokeWidth, dash: null },
    joinsAbove: false,
  });
  let lineTop = box.y;
  let lineBottom = box.y;
  let x = box.x;
  let used = false;
  const nextLine = () => {
    if (used) {
      lineTop = lineBottom + chip.gapY;
      x = box.x;
      used = false;
    }
  };
  for (const item of items) {
    const value = item.kind === 'value';
    const style = value ? valueStyle : wordsStyle;
    const padding = value ? chip.paddingX : 0;
    const textWidth = measure.width(item.text, style);
    const width = textWidth + 2 * padding;
    if (used && x + chip.gapX + width > right) nextLine();
    if (width <= box.width) {
      const left = used ? x + chip.gapX : box.x;
      if (value) {
        shapes.push(chipFrame(left, lineTop, width, chipHeight));
        texts.push(
          oneLineText(
            [{ text: item.text, style }],
            { x: left + padding, y: lineTop + chip.paddingY, width: textWidth },
            role,
            measure
          )
        );
        lineBottom = Math.max(lineBottom, lineTop + chipHeight);
      } else {
        const words = oneLineText(
          [{ text: item.text, style }],
          { x: left, y: lineTop + wordsOffset, width: textWidth },
          role,
          measure
        );
        texts.push(words);
        lineBottom = Math.max(lineBottom, words.y + words.height);
      }
      x = left + width;
      used = true;
      continue;
    }
    // Wider than a line: lines of its own, wrapped; what follows starts on the next line
    nextLine();
    const text = wrappedText(
      item.text,
      style,
      {
        x: box.x + padding,
        y: lineTop + (value ? chip.paddingY : 0),
        width: box.width - 2 * padding,
      },
      role,
      measure
    );
    if (value) {
      const height = text.height - style.size * L.lineGapFactor + 2 * chip.paddingY;
      shapes.push(chipFrame(box.x, lineTop, box.width, height));
      lineBottom = Math.max(lineTop + height, text.y + text.height);
    } else {
      lineBottom = text.y + text.height;
    }
    texts.push(text);
    x = right;
    used = true;
  }
  return { shapes, texts, bottom: lineBottom };
}

/**
 * "Message for citizens: <message>", one `P`, wrapped. Measured in the label's face, the wider of
 * the two, so that the drawn lines never outnumber the measured ones; a faded item's message is
 * muted and struck through, its label not
 */
function labelledTextAt(
  labelled: LabelledText,
  faded: boolean,
  box: TextBox,
  role: TextRole,
  measure: Measure
): PlacedText {
  const label = `${labelled.label} `;
  return {
    kind: 'text',
    ...box,
    height: measure.height(`${label}${labelled.text}`, S.messageLabel, box.width),
    spans: [
      { text: label, style: S.messageLabel },
      { text: labelled.text, style: faded ? S.messageFaded : S.message },
    ],
    align: 'left',
    lines: 'wrap',
    role,
  };
}

/**
 * A draft's "Not complete: <what is missing>" (FR-018) at `box`: the "!" in its warning circle
 * (artifacts) and the line after it, one `P` in the warning colour, wrapped beside the circle
 */
function missingNoteOf(
  missing: LabelledText,
  box: TextBox,
  role: TextRole,
  measure: Measure
): Placed {
  const rule = L.rule;
  const radius = rule.noteIconRadius;
  const icon: PlacedShape = {
    kind: 'circle',
    artifact: 'Layout',
    cx: box.x + radius,
    cy: box.y + rule.noteIconY,
    radius,
    fill: C.warning,
    stroke: null,
  };
  const mark = oneLineText(
    [{ text: '!', style: S.notCompleteIcon }],
    { x: box.x, y: box.y + rule.noteIconTextY, width: 2 * radius },
    LAYOUT_ARTIFACT,
    measure,
    'center'
  );
  const text = wrappedText(
    `${missing.label} ${missing.text}`,
    S.notComplete,
    { x: box.x + rule.noteIndent, y: box.y, width: box.width - rule.noteIndent },
    role,
    measure
  );
  return {
    shapes: [icon],
    texts: [mark, text],
    bottom: Math.max(text.y + text.height, mark.y + mark.height, icon.cy + radius),
  };
}

/**
 * A rule's card, or a piece of one cut at value boundaries (FR-027): the frame (tinted by its
 * mark) and the bars of the groups around it (artifacts); for the head, the heading row; the
 * statement's flow with its values as chips, as far as it goes (an incomplete condition shows
 * its subject alone, or its words without values, as the Summary does); "Message for citizens:
 * <message>"; a draft's "Not complete: <what is missing>" after all that, the frame then dashed
 * (FR-018). A continuation has no heading: its texts go on into the same `Div` and statement `P`
 * as the head's
 */
function ruleLayout(content: RuleContent | RuleContinuationContent, measure: Measure): BlockLayout {
  const rule = L.rule;
  const owner = ownerKeyOf(content);
  const { within } = content;
  const x = content.depth * L.items.indent;
  const width = BODY_WIDTH - x;
  const inner = width - 2 * rule.padding;
  const left = x + rule.padding;
  const shapes: PlacedShape[] = [];
  const texts: PlacedText[] = [];
  let y: number = rule.padding;
  let flow: FlowItem[];
  if (content.kind === 'rule') {
    const heading = itemHeadingOf(
      content,
      { left, top: rule.padding, idTop: rule.padding + rule.idOffsetY, width: inner },
      measure
    );
    shapes.push(...heading.shapes);
    texts.push(...heading.texts);
    y = heading.bottom;
    const { statement } = content;
    flow = statement
      ? [
          {
            kind: 'words',
            text: statement.words ? `${statement.subject} ${statement.words}` : statement.subject,
          },
          ...statement.values.map((text): FlowItem => ({ kind: 'value', text })),
          ...(statement.tail ? [{ kind: 'words', text: statement.tail } as const] : []),
        ]
      : [];
  } else {
    flow = [
      ...content.values.map((text): FlowItem => ({ kind: 'value', text })),
      ...(content.tail ? [{ kind: 'words', text: content.tail } as const] : []),
    ];
  }
  if (flow.length > 0) {
    const statement = statementFlowOf(
      flow,
      { x: left, y: y > rule.padding ? y + rule.nameGap : y, width: inner },
      content.faded,
      tagged(within, structNode('P', `${owner}/statement`)),
      measure
    );
    shapes.push(...statement.shapes);
    texts.push(...statement.texts);
    y = statement.bottom;
  }
  if (content.message) {
    const message = labelledTextAt(
      content.message,
      content.faded,
      { x: left, y: y > rule.padding ? y + rule.messageGap : y, width: inner },
      tagged(within, structNode('P', `${owner}/message`)),
      measure
    );
    texts.push(message);
    y = message.y + message.height;
  }
  if (content.missing) {
    const note = missingNoteOf(
      content.missing,
      { x: left, y: y > rule.padding ? y + rule.noteGap : y, width: inner },
      tagged(within, structNode('P', `${owner}/missing`)),
      measure
    );
    shapes.push(...note.shapes);
    texts.push(...note.texts);
    y = note.bottom;
  }
  const height = y + rule.padding;
  const look = itemLookOf(content.badge?.mark ?? null);
  // An incomplete rule's frame is dashed in the warning colour, in the piece that says so
  const stroke: StrokeStyle = content.missing
    ? { colour: C.warning, width: rule.incompleteStrokeWidth, dash: rule.incompleteDash }
    : { colour: look.cardStroke, width: rule.strokeWidth, dash: null };
  const frame: PlacedRect = {
    kind: 'rect',
    artifact: 'Layout',
    x,
    y: 0,
    width,
    height,
    radius: rule.radius,
    fill: look.card,
    stroke,
    joinsAbove: false,
  };
  return { height, parts: [...barsOf(content.depth, height), frame, ...shapes, ...texts] };
}

/**
 * A group's header, tinted by its mark, square at its bottom where its members hang: the heading
 * row (identifier and name in one heading, the badge) and "Group · <AND/OR in words>"
 */
function groupHeaderLayout(content: GroupHeaderContent, measure: Measure): BlockLayout {
  const group = L.group;
  const x = content.depth * L.items.indent;
  const width = BODY_WIDTH - x;
  const inner = width - 2 * group.paddingX;
  const left = x + group.paddingX;
  const heading = itemHeadingOf(
    content,
    { left, top: group.nameY, idTop: group.idY, width: inner },
    measure
  );
  const combinesY = heading.bottom + group.nameGap;
  // A removed or dissolved group's line is muted and struck through, as its name (FR-017)
  const combinesStyle = content.faded ? S.groupCombinesFaded : S.groupCombines;
  const combines = wrappedText(
    content.combines,
    combinesStyle,
    { x: left, y: combinesY, width: inner },
    tagged(content.within, structNode('P', `${ownerKeyOf(content)}/combines`)),
    measure
  );
  const height =
    combinesY +
    group.combinesHeight +
    extraLinesOf(content.combines, combinesStyle, inner, measure) +
    group.paddingBottom;
  const fill = itemLookOf(content.badge?.mark ?? null).group;
  const frame: PlacedRect = { ...fillRect(x, 0, width, height, fill), radius: group.radius };
  return {
    height,
    parts: [
      ...barsOf(content.depth, height),
      frame,
      fillRect(x, height - group.radius, width, group.radius, fill),
      ...heading.shapes,
      ...heading.texts,
      combines,
    ],
  };
}

/**
 * A group's closing block after its last member, square at its top: the group's own message, or
 * a thin end. Its own bar reaches only into the gap above, to the last member's
 */
function groupEndLayout(content: GroupEndContent, measure: Measure): BlockLayout {
  const group = L.group;
  const x = content.depth * L.items.indent;
  const width = BODY_WIDTH - x;
  const texts: PlacedText[] = [];
  let height: number = group.endHeight;
  if (content.message) {
    const message = labelledTextAt(
      content.message,
      content.faded,
      { x: x + group.paddingX, y: group.endPadding, width: width - 2 * group.paddingX },
      tagged(content.within, structNode('P', `${ownerKeyOf(content)}/message`)),
      measure
    );
    texts.push(message);
    height = message.y + message.height + group.endPadding;
  }
  const fill = itemLookOf(content.badge?.mark ?? null).group;
  // Its own bar, 0 high: drawn only reaching up into the gap above (`joinsAbove`)
  const ownBar = barsOf(content.depth + 1, 0)[content.depth];
  return {
    height,
    parts: [
      ...barsOf(content.depth, height),
      ownBar,
      { ...fillRect(x, 0, width, height, fill), radius: group.radius },
      fillRect(x, 0, width, Math.min(group.radius, height), fill),
      ...texts,
    ],
  };
}

/**
 * The AND/OR chip between two items, an artifact as its word is (the variant's or group's line
 * says it in words, research R5), muted when the item after it is faded; the bars of the groups
 * around it
 */
function connectorLayout(content: ConnectorContent, measure: Measure): BlockLayout {
  const connector = L.connector;
  const style = content.faded ? S.connectorFaded : S.connector;
  const x = content.depth * L.items.indent + connector.x;
  const width = measure.width(content.label, style) + 2 * connector.paddingX;
  // The word's box is its glyphs: the line gap below them is empty, so that the block is the
  // chip's line, 14 pt as in the prototype, not 14.05 (T026)
  const label: PlacedText = {
    ...oneLineText(
      [{ text: content.label, style }],
      { x, y: connector.textY, width },
      LAYOUT_ARTIFACT,
      measure,
      'center'
    ),
    height: glyphHeightOf(style, measure),
  };
  const height = Math.max(connector.height, label.y + label.height);
  return {
    height,
    parts: [
      ...barsOf(content.depth, height),
      {
        ...fillRect(
          x,
          connector.chipY,
          width,
          connector.chipHeight,
          content.faded ? C.neutralBackground : C.accentTint
        ),
        radius: connector.radius,
      },
      label,
    ],
  };
}

/**
 * A variant's header: "Variant <name>" (`H3`, the word muted, the name in the heading's face), its
 * origin badge at the right, its description and its top-level AND/OR in words, with "Changed
 * here" beside it when a based variant switched it (FR-015), all in the variant's `Sect`
 */
function variantHeaderLayout(content: VariantHeaderContent, measure: Measure): BlockLayout {
  const variant = L.variant;
  const owner = ownerKeyOf(content);
  const { within } = content;
  const originStyle = content.origin === 'main' ? S.originMain : S.originOther;
  const originWidth = badgeWidthOf(content.originLabel, originStyle, measure);
  const titleWidth = BODY_WIDTH - originWidth - variant.originGap;
  const heading = structNode('H3', `${owner}/title`);
  // "Variant" with one space after it, muted, and the name where the word and `wordSeparator`
  // end, wrapping in its own column: the gap is drawn, the tagged text reads "Variant Taxi"
  const word = content.title.endsWith(content.name)
    ? content.title.slice(0, content.title.length - content.name.length).trimEnd()
    : '';
  const nameX = word === '' ? 0 : measure.width(`${word}${variant.wordSeparator}`, S.variantWord);
  const name = wrappedText(
    word === '' ? content.title : content.name,
    S.variantName,
    { x: nameX, y: 0, width: titleWidth - nameX },
    tagged(within, heading),
    measure
  );
  const titleTexts: PlacedText[] =
    word === ''
      ? [name]
      : [
          oneLineText(
            [{ text: `${word}${SPACE}`, style: S.variantWord }],
            { x: 0, y: 0, width: nameX },
            tagged(within, heading),
            measure
          ),
          name,
        ];
  const origin = badgeAt(
    content.originLabel,
    originStyle,
    null,
    BODY_WIDTH - originWidth,
    variant.originBadgeY,
    tagged(within, structNode('P', `${owner}/origin`)),
    measure
  );
  const shapes: PlacedShape[] = [origin.shape];
  const texts: PlacedText[] = [...titleTexts, origin.text];
  let y =
    variant.titleAdvance + extraLinesOf(name.spans[0].text, S.variantName, name.width, measure);
  if (content.description !== null) {
    const description = wrappedText(
      content.description,
      S.variantDescription,
      { x: 0, y: y + variant.descriptionGap, width: BODY_WIDTH },
      tagged(within, structNode('P', `${owner}/description`)),
      measure
    );
    texts.push(description);
    y = description.y + description.height;
  }
  const combinesY = y + variant.combinesGap;
  const combinesRole = tagged(within, structNode('P', `${owner}/combines`));
  const combines = wrappedText(
    content.combines,
    S.combines,
    { x: 0, y: combinesY, width: BODY_WIDTH },
    combinesRole,
    measure
  );
  texts.push(combines);
  let height =
    combinesY +
    variant.combinesHeight +
    extraLinesOf(content.combines, S.combines, BODY_WIDTH, measure);
  if (content.changed) {
    // "Changed here" in the same paragraph, beside the words when they leave room, else below
    const style = MARK_STYLES[content.changed.mark];
    const badgeWidth = badgeWidthOf(content.changed.label, style, measure);
    const after = measure.width(content.combines, S.combines) + L.badge.gapBefore;
    const beside =
      combines.height <= lineHeightOf(S.combines, measure) && after + badgeWidth <= BODY_WIDTH;
    const badgeY = beside ? combinesY + (variant.combinesHeight - L.badge.height) / 2 : height;
    const badge = badgeAt(
      content.changed.label,
      style,
      itemLookOf(content.changed.mark).badge,
      beside ? after : 0,
      badgeY,
      combinesRole,
      measure
    );
    shapes.push(badge.shape);
    texts.push(badge.text);
    height = Math.max(height, badgeY + L.badge.height);
  }
  return { height, parts: [...shapes, ...texts] };
}

/**
 * A block's geometry (research R11): its texts, placed, with their tag or artifact role, and its
 * shapes (all artifacts), in drawing order, the tagged texts in reading order; x from the body's
 * left edge, y from the block's top. The one place that computes geometry: `blocksOf()` takes the
 * height from it and `render.ts` draws from it
 */
export function layoutOf(content: BlockContent, measure: Measure): BlockLayout {
  switch (content.kind) {
    case 'title':
      return titleLayout(content, measure);
    case 'status':
      return statusLayout(content, measure);
    case 'details':
      return detailsLayout(content, measure);
    case 'note':
      return noteLayout(content, measure);
    case 'sectionHeading':
      return sectionHeadingLayout(content, measure);
    case 'linkHeading':
      return linkHeadingLayout(content, measure);
    case 'link':
      return linkLayout(content, measure);
    case 'document':
      return documentLayout(content, measure);
    case 'placeholder':
      return placeholderLayout(content, measure);
    case 'gapsHeading':
      return gapsHeadingLayout(content, measure);
    case 'gap':
      return gapLayout(content, measure);
    case 'linksToCreate':
      return linksToCreateLayout(content, measure);
    case 'variantHeader':
      return variantHeaderLayout(content, measure);
    case 'rule':
    case 'ruleContinuation':
      return ruleLayout(content, measure);
    case 'groupHeader':
      return groupHeaderLayout(content, measure);
    case 'groupEnd':
      return groupEndLayout(content, measure);
    case 'connector':
      return connectorLayout(content, measure);
  }
}

// ---------------------------------------------------------------------------------------------
// The blocks, in reading order

/** What a block is besides its content; the height comes from `layoutOf()` */
interface BlockOptions {
  place: PagePlace;
  gapBefore?: number;
  keepWithNext?: boolean;
  startsUnits?: string[];
  unitOf?: string[];
  bookmark?: PdfBookmark | null;
}

function blockOf(content: BlockContent, measure: Measure, options: BlockOptions): Block {
  return {
    height: layoutOf(content, measure).height,
    gapBefore: 0,
    keepWithNext: false,
    startsUnits: [],
    unitOf: [],
    bookmark: null,
    ...options,
    content,
  };
}

/** Page 1's blocks and the gaps are outside the sections: no place label */
const PAGE_ONE_PLACE: PagePlace = { section: null, variant: null, opens: null };

/** Inside a section, outside its variants; `opens` on the section's heading only */
function sectionPlace(number: 1 | 2 | 3, opens = false): PagePlace {
  return { section: number, variant: null, opens: opens ? 'section' : null };
}

/** The pill's word: a published one's `state` reads `live` for "Active" */
const STATUS_PILL_KEYS = {
  active: 'live',
  scheduled: 'scheduled',
  deactivated: 'deactivated',
  draft: 'draft',
} as const satisfies Record<PdfStatus, keyof (typeof STATUS_PILL_COPY)['en']>;

/** "as of <generated>", a scheduled one's "… · starts on <date>", a draft's "Not live yet" */
function statusNoteOf(model: ConnectionPdfModel): string {
  const texts = PDF_TEXTS[model.language];
  if (model.status === 'draft') return texts.notLiveYet;
  const asOf = texts.asOf(model.generatedAt);
  return model.status === 'scheduled' && model.startDate !== null
    ? `${asOf} · ${texts.startsOn(model.startDate)}`
    : asOf;
}

/** The details table: ID, version, a draft's last save, generated, contents (FR-008) */
function detailsRowsOf(model: ConnectionPdfModel): DetailsRow[] {
  const texts = PDF_TEXTS[model.language];
  const copy = CONNECTION_DETAIL_COPY[model.language];
  const { documents, dataItems, variants, rules } = model.counts;
  const rows: DetailsRow[] = [
    { label: texts.connectionId, value: model.id, valueKind: 'id' },
    { label: texts.version, value: model.version, valueKind: 'version' },
  ];
  if (model.lastSaved !== null) {
    rows.push({
      label: texts.lastSaved,
      value: texts.lastSavedValue(model.lastSaved.at, model.lastSaved.saveNumber),
      valueKind: 'text',
    });
  }
  rows.push(
    { label: texts.generated, value: texts.generatedValue(model.generatedAt), valueKind: 'text' },
    {
      label: texts.contents,
      value: copy.summaryCounts(documents, dataItems, copy.rulesCounts(variants, rules)),
      valueKind: 'text',
    }
  );
  return rows;
}

/** Page 1: the title (eyebrow, name, description), the status, the details and the note */
function pageOneBlocksOf(model: ConnectionPdfModel, measure: Measure): Block[] {
  const texts = PDF_TEXTS[model.language];
  const draft = model.kind === 'draft';
  const within = [PAGE_ONE_SECT];
  const place = PAGE_ONE_PLACE;
  return [
    blockOf(
      {
        kind: 'title',
        key: 'title',
        within,
        eyebrow: draft ? texts.eyebrowDraft : texts.eyebrow,
        name: model.name,
        description: model.description,
        draft,
      },
      measure,
      { place, keepWithNext: true }
    ),
    blockOf(
      {
        kind: 'status',
        key: 'status',
        within,
        status: model.status,
        label: STATUS_PILL_COPY[model.language][STATUS_PILL_KEYS[model.status]],
        note: statusNoteOf(model),
      },
      measure,
      { place, gapBefore: L.title.descriptionGap }
    ),
    blockOf(
      { kind: 'details', key: 'details', within, rows: detailsRowsOf(model), draft },
      measure,
      { place, gapBefore: L.status.gapAfter }
    ),
    blockOf(
      { kind: 'note', key: 'note', within, text: draft ? texts.checkNoteDraft : texts.checkNote },
      measure,
      { place, gapBefore: L.details.gapAfter }
    ),
  ];
}

/** The gaps' part */
const GAPS_SECT: StructNode = { type: 'Sect', key: 'gaps' };

/**
 * A draft's "To finish before publishing (n)" (FR-010; research R11): the box's heading and
 * sentence chained to the first gap, then one block per gap, an `LI` of the gaps' `L`, so that
 * hundreds of gaps continue on later pages. Outside the sections: no place label (FR-021 names
 * only the sections) and no outline entry (FR-038). None without gaps
 */
function gapsBlocksOf(model: ConnectionPdfModel, measure: Measure): Block[] {
  const { gaps } = model;
  if (gaps.length === 0) return [];
  const texts = PDF_TEXTS[model.language];
  const list = structNode('L', 'gaps/list');
  const place = PAGE_ONE_PLACE;
  return [
    blockOf(
      {
        kind: 'gapsHeading',
        key: 'gaps/heading',
        within: [GAPS_SECT],
        title: texts.gapsTitle(gaps.length),
        lead: texts.gapsLead,
      },
      measure,
      { place, gapBefore: L.gaps.gapBefore, keepWithNext: true }
    ),
    ...gaps.map((gap, index) =>
      blockOf(
        {
          kind: 'gap',
          key: `gaps/gap-${index}`,
          within: [GAPS_SECT, list],
          text: gap.text,
          last: index === gaps.length - 1,
        },
        measure,
        { place }
      )
    ),
  ];
}

/**
 * A section's heading block, "1  Links for your service" with its lead and notice: chained to
 * what follows it, opening the section's place and its outline entry (FR-038)
 */
function sectionHeadingBlockOf(
  number: 1 | 2 | 3,
  title: string,
  lead: string | null,
  notice: string | null,
  measure: Measure
): Block {
  return blockOf(
    {
      kind: 'sectionHeading',
      key: `section-${number}/heading`,
      within: [sectionSect(number)],
      number,
      title,
      lead,
      notice,
    },
    measure,
    {
      place: sectionPlace(number, true),
      gapBefore: L.section.gapBefore,
      keepWithNext: true,
      bookmark: { title: `${number} ${title}`, level: 1 },
    }
  );
}

/** A deactivated or scheduled connection's "unavailable" sentence (FR-012); else null */
function linksNoticeOf(model: ConnectionPdfModel): string | null {
  const texts = PDF_TEXTS[model.language];
  if (model.status === 'deactivated') return texts.deactivatedLinks;
  if (model.status === 'scheduled' && model.startDate !== null) {
    return texts.scheduledLinks(model.startDate);
  }
  return null;
}

/**
 * Section 1, "Links for your service": the heading with its lead and notice; ① "Request link"
 * with its explanation, chained to its URL; ② "Result links" with its explanation and the
 * {reference} sentence, chained to the first result link; then per variant "Variant · <name>"
 * and its URL, each one block, the result links one unit (FR-026)
 */
function linksSectionBlocksOf(model: ConnectionPdfModel, measure: Measure): Block[] {
  const texts = PDF_TEXTS[model.language];
  const copy = CONNECTION_DETAIL_COPY[model.language];
  const { links } = model;
  const within = [sectionSect(1)];
  const place = sectionPlace(1);
  const heading = sectionHeadingBlockOf(
    1,
    copy.linksTitle,
    links ? copy.linksLead : null,
    linksNoticeOf(model),
    measure
  );
  if (links === null) {
    // A draft has no URL anywhere (FR-013): the dashed box names the links publishing creates
    if (model.linksToCreate === null) return [heading];
    return [
      heading,
      blockOf(
        {
          kind: 'linksToCreate',
          key: 'section-1/links-to-create',
          within,
          title: copy.draftLinksText,
          text: texts.linksToCreate(model.linksToCreate),
        },
        measure,
        { place, gapBefore: L.linksToCreate.gapBefore }
      ),
    ];
  }
  const blocks = [
    heading,
    blockOf(
      {
        kind: 'linkHeading',
        key: 'section-1/request',
        within,
        step: 1,
        title: copy.requestLink,
        paragraphs: [copy.requestLinkInfo],
      },
      measure,
      { place, gapBefore: L.links.headingGapBefore, keepWithNext: true }
    ),
    blockOf(
      { kind: 'link', key: 'section-1/request-url', within, label: null, url: links.request },
      measure,
      { place, gapBefore: L.links.firstUrlGapBefore }
    ),
    blockOf(
      {
        kind: 'linkHeading',
        key: 'section-1/results',
        within,
        step: 2,
        title: texts.resultLinks,
        paragraphs: [copy.resultLinkInfo, texts.referenceNote],
      },
      measure,
      { place, gapBefore: L.links.headingGapBefore, keepWithNext: true }
    ),
  ];
  links.results.forEach((result, index) => {
    blocks.push(
      blockOf(
        {
          kind: 'link',
          key: `section-1/result-${index}`,
          within,
          label: texts.variantLink(result.variant),
          url: result.url,
        },
        measure,
        {
          place,
          gapBefore: index === 0 ? L.links.firstUrlGapBefore : L.links.urlGapBefore,
          startsUnits: index === 0 ? [RESULT_LINKS_UNIT] : [],
          unitOf: [RESULT_LINKS_UNIT],
        }
      )
    );
  });
  return blocks;
}

/**
 * Section 2, "Documents and data items": the heading with its lead, then one block per document
 * in the Summary's order (its name, "<n> data items", its data items), or "No documents yet";
 * a document without data items shows "No data chosen yet"
 */
function documentsSectionBlocksOf(model: ConnectionPdfModel, measure: Measure): Block[] {
  const texts = PDF_TEXTS[model.language];
  const copy = CONNECTION_DETAIL_COPY[model.language];
  const within = [sectionSect(2)];
  const place = sectionPlace(2);
  const heading = sectionHeadingBlockOf(2, texts.section2, texts.section2Lead, null, measure);
  if (model.documents.length === 0) {
    return [
      heading,
      blockOf(
        {
          kind: 'placeholder',
          key: 'section-2/no-documents',
          within,
          text: copy.noDocumentsYet,
          depth: 0,
        },
        measure,
        { place, gapBefore: L.placeholder.gapBefore }
      ),
    ];
  }
  return [
    heading,
    ...model.documents.map((document, index) =>
      blockOf(
        {
          kind: 'document',
          key: `section-2/document-${index}`,
          within,
          name: document.name,
          count: copy.items(document.dataItems.length),
          dataItems: document.dataItems,
          placeholder: document.dataItems.length === 0 ? copy.noDataYet : null,
        },
        measure,
        {
          place,
          gapBefore: index === 0 ? L.document.firstGapBefore : L.document.gapBefore,
        }
      )
    ),
  ];
}

/** A variant's `Sect` inside section 3's; its key is also the variant's unit */
function variantSect(index: number): StructNode {
  return { type: 'Sect', key: `section-3/variant-${index}` };
}

/** "All rules must be met (AND)": the connector's description and its chip's word */
function combinesOf(operator: Combinator, language: Language): string {
  const copy = CONNECTOR_COPY[language];
  return `${copy.descriptions[operator]} (${copy.labels[operator]})`;
}

/** A mark's badge in words (FR-017): "Changed here", "Added here", "Removed here" */
function markBadgeOf(mark: Mark | null, language: Language): MarkBadge | null {
  return mark === null ? null : { mark, label: BRANCH_MARK_COPY[language][mark] };
}

/** "Message for citizens: <message>"; null without a message */
function messageOf(message: string | null, language: Language): LabelledText | null {
  return message ? { label: RULE_ROW_COPY[language].messageLabel, text: message } : null;
}

const ORIGIN_KEYS = {
  main: 'originMain',
  based: 'originBased',
  empty: 'originEmpty',
} as const satisfies Record<PdfVariant['origin'], keyof (typeof PDF_TEXTS)['en']>;

/** Where a level of items sits: in a variant, or in a group of it */
interface ItemScope {
  language: Language;
  /** The elements its items' `Div`s go into: the variant's `Sect`, then the groups' `Div`s */
  within: StructNode[];
  /** The key its items' keys start with: the variant's `Sect`'s, or the group's `Div`'s */
  parentKey: string;
  /** 0 at the variant's level */
  depth: number;
  /** The variant's unit and its groups' */
  units: string[];
  place: PagePlace;
}

/**
 * How far down a fresh page the next block would start, if it had to go there with the chain
 * that leads into it: the chained blocks at the end of `blocks` (their first gap dropped) and the
 * next block's gap; 0 when nothing is chained to it
 */
function leadInOf(blocks: readonly Block[], gapBefore: number): number {
  let first = blocks.length;
  while (first > 0 && blocks[first - 1].keepWithNext) first -= 1;
  if (first === blocks.length) return 0;
  return blocks
    .slice(first)
    .reduce(
      (sum, block, index) => sum + (index > 0 ? block.gapBefore : 0) + block.height,
      gapBefore
    );
}

/** The pieces of a rule: the head is the rule's content, the rest are continuations */
type RulePiece = RuleContent | RuleContinuationContent;

/**
 * A rule cut at value boundaries (FR-027; research R11): a head with the heading, the statement's
 * words and the values that fit in `headRoom`, then continuations of the remaining values, each
 * at most a page, and the message and a draft's "Not complete" last, after the tail. The last piece leaves `trailing` free for
 * the blocks chained after it (a group's closing block). Each piece holds at least one value
 * after the head, so that the cut always ends; one value taller than a page would be too tall
 */
function rulePiecesOf(
  whole: RuleContent,
  headRoom: number,
  trailing: number,
  continuationOf: (index: number, values: string[], tail: string | null) => RuleContinuationContent,
  measure: Measure
): RulePiece[] {
  const { statement, message, missing } = whole;
  const values = statement?.values ?? [];
  const count = values.length;
  const pieceOf = (
    index: number,
    from: number,
    to: number,
    withMessage: boolean,
    continues: boolean
  ): RulePiece => {
    // The tail follows the last value, in the piece that holds it
    const tail = to === count && (from < to || index === 0) ? (statement?.tail ?? null) : null;
    const piece =
      index === 0
        ? { ...whole, statement: statement && { ...statement, values: values.slice(0, to), tail } }
        : continuationOf(index, values.slice(from, to), tail);
    // The message and a draft's "Not complete" go into the last piece, together
    return {
      ...piece,
      message: withMessage ? message : null,
      missing: withMessage ? missing : null,
      continues,
    };
  };
  const heightOf = (piece: RulePiece) => layoutOf(piece, measure).height;
  const pieces: RulePiece[] = [];
  let from = 0;
  for (let index = 0; ; index += 1) {
    const room = index === 0 ? headRoom : L.body.height;
    const rest = pieceOf(index, from, count, true, false);
    if (heightOf(rest) + trailing <= room || (from === count && index > 0)) {
      pieces.push(rest);
      return pieces;
    }
    // The most values that fit, the message left for a later piece
    let to = from;
    let top = count;
    while (to < top) {
      const middle = Math.ceil((to + top) / 2);
      if (heightOf(pieceOf(index, from, middle, false, true)) <= room) to = middle;
      else top = middle - 1;
    }
    if (to === count && message === null && missing === null) {
      // Nothing left to move to a later piece
      pieces.push(rest);
      return pieces;
    }
    if (to === from && index > 0) to += 1;
    pieces.push(pieceOf(index, from, to, false, true));
    from = to;
  }
}

/**
 * A rule's blocks: its card, or, when the card and the chains around it don't fit on one page,
 * its head and continuations (FR-027). The card is taller than what a page leaves after the chain
 * leading into it (group headers, the AND/OR, a variant's header) and before the chain after it
 * (`after`, a group's closing blocks): cutting it there keeps those chains whole (FR-023)
 */
function ruleBlocksOf(
  rule: PdfRule,
  index: number,
  after: number | null,
  scope: ItemScope,
  blocks: Block[],
  measure: Measure
): void {
  const key = `${scope.parentKey}/${index}-${rule.id}`;
  const base = {
    within: [...scope.within, structNode('Div', key)],
    id: rule.id,
    depth: scope.depth,
    badge: markBadgeOf(rule.mark, scope.language),
    faded: rule.faded,
  };
  const whole: RuleContent = {
    kind: 'rule',
    key: `${key}/rule`,
    ...base,
    name: rule.name,
    level: headingLevelOf(scope.depth),
    statement: rule.statement,
    message: messageOf(rule.message, scope.language),
    missing:
      rule.missing === null
        ? null
        : { label: PDF_TEXTS[scope.language].notComplete, text: rule.missing },
    continues: false,
  };
  const gapBefore = L.items.gapBefore;
  const leadIn = leadInOf(blocks, gapBefore);
  const trailing = after ?? 0;
  const pieces =
    leadIn + layoutOf(whole, measure).height + trailing <= L.body.height
      ? [whole]
      : rulePiecesOf(
          whole,
          L.body.height - leadIn,
          trailing,
          (piece, values, tail) => ({
            kind: 'ruleContinuation',
            key: `${key}/continued-${piece}`,
            ...base,
            values,
            tail,
            message: null,
            missing: null,
            continues: false,
          }),
          measure
        );
  pieces.forEach((piece, number) => {
    blocks.push(
      blockOf(piece, measure, {
        place: scope.place,
        gapBefore: number === 0 ? gapBefore : 0,
        // The pieces of a cut rule hang together, breaking only where a page runs out; the last
        // member of a group stays with the group's closing block (FR-023)
        keepWithNext: piece.continues || after !== null,
        unitOf: scope.units,
      })
    );
  });
}

/**
 * A group's blocks, a unit: its header chained to its first member, its members one level deeper
 * with the AND/OR between them, its closing block with its own message chained from its last
 * member (FR-023, FR-025)
 */
function groupBlocksOf(
  group: PdfGroup,
  index: number,
  after: number | null,
  scope: ItemScope,
  blocks: Block[],
  measure: Measure
): void {
  const { language } = scope;
  const key = `${scope.parentKey}/${index}-${group.id}`;
  const within = [...scope.within, structNode('Div', key)];
  const units = [...scope.units, key];
  const base = {
    within,
    id: group.id,
    depth: scope.depth,
    badge: markBadgeOf(group.mark, language),
    faded: group.faded,
  };
  const options = { place: scope.place, gapBefore: L.items.gapBefore, unitOf: units };
  blocks.push(
    blockOf(
      {
        kind: 'groupHeader',
        key: `${key}/header`,
        ...base,
        name: group.name,
        level: headingLevelOf(scope.depth),
        combines: PDF_TEXTS[language].group(combinesOf(group.operator, language)),
      },
      measure,
      { ...options, keepWithNext: true, startsUnits: [key] }
    )
  );
  const end = blockOf(
    { kind: 'groupEnd', key: `${key}/end`, ...base, message: messageOf(group.message, language) },
    measure,
    { ...options, keepWithNext: after !== null }
  );
  itemBlocksOf(
    group.items,
    group.operator,
    end.gapBefore + end.height + (after ?? 0),
    { ...scope, within, parentKey: key, depth: scope.depth + 1, units },
    blocks,
    measure
  );
  blocks.push(end);
}

/**
 * A level's items in the Summary's order, the AND/OR chip before each but the first, chained to
 * it (FR-023). `after` is the height of the blocks chained after the level's last item (its
 * group's closing block and the ones chained after that); null at the variant's level
 */
function itemBlocksOf(
  items: PdfItem[],
  operator: Combinator,
  after: number | null,
  scope: ItemScope,
  blocks: Block[],
  measure: Measure
): void {
  items.forEach((item, index) => {
    if (index > 0) {
      blocks.push(
        blockOf(
          {
            kind: 'connector',
            key: `${scope.parentKey}/connector-${index}`,
            within: scope.within,
            label: CONNECTOR_COPY[scope.language].labels[operator],
            depth: scope.depth,
            faded: item.faded,
          },
          measure,
          {
            place: scope.place,
            gapBefore: L.items.gapBefore,
            keepWithNext: true,
            unitOf: scope.units,
          }
        )
      );
    }
    const itemAfter = index === items.length - 1 ? after : null;
    if (item.type === 'rule') ruleBlocksOf(item, index, itemAfter, scope, blocks, measure);
    else groupBlocksOf(item, index, itemAfter, scope, blocks, measure);
  });
}

/**
 * A variant's blocks, a unit in its own `Sect` (FR-015, FR-025): its header chained to its first
 * item, opening the variant's place and its outline entry at level 2 (FR-038), then its items,
 * or "No rules. Anyone who shares the requested documents can apply." (FR-019)
 */
function variantBlocksOf(
  variant: PdfVariant,
  index: number,
  language: Language,
  blocks: Block[],
  measure: Measure
): void {
  const texts = PDF_TEXTS[language];
  const sect = variantSect(index);
  const within = [sectionSect(3), sect];
  const unit = sect.key;
  const place: PagePlace = { section: 3, variant: variant.name, opens: null };
  const title = texts.variant(variant.name);
  blocks.push(
    blockOf(
      {
        kind: 'variantHeader',
        key: `${sect.key}/header`,
        within,
        title,
        name: variant.name,
        origin: variant.origin,
        originLabel: texts[ORIGIN_KEYS[variant.origin]],
        description: variant.description,
        combines: combinesOf(variant.operator, language),
        changed: variant.operatorChanged ? markBadgeOf('changed', language) : null,
      },
      measure,
      {
        place: { ...place, opens: 'variant' },
        gapBefore: index === 0 ? L.variant.firstGapBefore : L.variant.gapBefore,
        keepWithNext: true,
        startsUnits: [unit],
        unitOf: [unit],
        bookmark: { title, level: 2 },
      }
    )
  );
  if (variant.items.length === 0) {
    blocks.push(
      blockOf(
        {
          kind: 'placeholder',
          key: `${sect.key}/no-rules`,
          within,
          text: CONNECTION_DETAIL_COPY[language].noRules,
          depth: 0,
        },
        measure,
        { place, gapBefore: L.placeholder.gapBefore, unitOf: [unit] }
      )
    );
    return;
  }
  itemBlocksOf(
    variant.items,
    variant.operator,
    null,
    { language, within, parentKey: sect.key, depth: 0, units: [unit], place },
    blocks,
    measure
  );
}

/**
 * Section 3, "Rules per variant": its heading and lead, then a unit per variant in the details'
 * order, each in its own `Sect` (contracts/pdf-document.md sections 2 to 4)
 */
function rulesSectionBlocksOf(model: ConnectionPdfModel, measure: Measure): Block[] {
  const texts = PDF_TEXTS[model.language];
  const heading = sectionHeadingBlockOf(3, texts.section3, texts.section3Lead, null, measure);
  // A connection always has its main variant; without one, nothing follows to chain to
  const blocks: Block[] = [{ ...heading, keepWithNext: model.variants.length > 0 }];
  model.variants.forEach((variant, index) => {
    variantBlocksOf(variant, index, model.language, blocks, measure);
  });
  return blocks;
}

/**
 * The document's blocks in reading order (contracts/pdf-document.md sections 2 and 3): page 1,
 * then sections 1 to 3, each block with its height from `layoutOf()`, its gap, its chain
 * (`keepWithNext` on every heading), its units, its place for the bottom of its page and the
 * outline entry it opens. `paginate()` places them; `render.ts` draws each through `layoutOf()`
 */
export function blocksOf(model: ConnectionPdfModel, measure: Measure): Block[] {
  return [
    ...pageOneBlocksOf(model, measure),
    ...gapsBlocksOf(model, measure),
    ...linksSectionBlocksOf(model, measure),
    ...documentsSectionBlocksOf(model, measure),
    ...rulesSectionBlocksOf(model, measure),
  ];
}
