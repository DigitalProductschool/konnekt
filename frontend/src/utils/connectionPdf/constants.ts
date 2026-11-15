// The connection PDF's constants (contracts/pdf-document.md sections 1 and 5; design-notes 4;
// research R8, R13): the page's geometry with the sizes, gaps and paddings of the agreed
// prototype (`prototype/make.mjs`, the band at the top), KERN's colours as hex (the worker can't
// read CSS), a text style per role, the watchdog and the PDF's own texts. Pure: no browser API,
// nothing logged. Texts the details page already has are not here: they are reused from
// `CONNECTION_DETAIL_COPY`, `STATUS_PILL_COPY`, `CONNECTOR_COPY`, `RULE_ROW_COPY` and
// `BRANCH_MARK_COPY` (design-notes 8.1), so that the screen and the file never word one thing
// differently
import { MESSAGE_MAX_LENGTH } from '@connection-portal/rules/constants';
import { defineTexts } from '@connection-portal/rules/language';

import type { HexColour, TextStyle } from './types';

// ---------------------------------------------------------------------------------------------
// Geometry (contracts/pdf-document.md section 1). Points; x from the body's left edge unless a
// comment says otherwise, y from the top of the block or the shape

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = { left: 56.69, right: 56.69, top: 84, bottom: 52 } as const;
const BODY_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right;

export const PDF_LAYOUT = {
  /** A4 portrait (FR-043) */
  page: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
  /** Left and right 20 mm; the top leaves room for the band, the bottom for the page's place */
  margin: MARGIN,
  /** The area `paginate()` fills: 481.9 × 705.89 */
  body: {
    x: MARGIN.left,
    y: MARGIN.top,
    width: BODY_WIDTH,
    height: PAGE_HEIGHT - MARGIN.top - MARGIN.bottom,
  },
  /**
   * A text's line gap is its size times this (the prototype's `size * 0.22`, about 1.4 line
   * height with Fira Sans), the same for `Measure` and for the drawing
   */
  lineGapFactor: 0.22,

  /** Every page's identity band (artifacts, `Pagination`); x from the body's left edge */
  band: {
    y: 24,
    height: 38,
    radius: 6,
    /** The coloured bar at its left */
    barWidth: 4,
    /** The name and the ID start here */
    paddingLeft: 14,
    /** The version and the generated date end this far from the right */
    paddingRight: 12,
    /** The name's line and the version's */
    firstLineY: 7,
    /** The ID's line and the generated date's */
    secondLineY: 22.5,
    /** The name's box, cut with "…", a share of the body's width */
    nameWidthShare: 0.52,
    nameHeight: 12,
    /** The ID's box, a share of the body's width */
    idWidthShare: 0.6,
    /** The right-aligned column starts at this share of the body's width */
    rightColumnShare: 0.45,
    /** A draft's "Draft · Not live" pill, left of the version */
    draftPill: { y: 6, height: 13, radius: 6.5, paddingX: 6, textY: 2.8, gapToVersion: 8 },
  },

  /** Every page's bottom (artifacts, `Pagination`) */
  bottom: {
    /** The rule's y on the page: 841.89 − 52 + 18 */
    ruleY: PAGE_HEIGHT - MARGIN.bottom + 18,
    ruleWidth: 0.6,
    /** The texts' top, below the rule */
    textGap: 8,
    textHeight: 11,
    /** The page's place, left, cut with "…" */
    labelWidthShare: 0.7,
    /** "Page n of N", right-aligned in the box that starts at this share */
    pageColumnShare: 0.6,
  },

  /** A draft's "DRAFT" over every page (artifact, `Pagination`) */
  watermark: { angle: -38, offsetY: -95 },

  /** Page 1: the eyebrow, the name and the description */
  title: { eyebrowAdvance: 18, nameGap: 4, descriptionGap: 10 },

  /** Page 1: the status pill and its note beside it */
  status: {
    height: 18,
    radius: 9,
    /** The pill's width is its word's plus this */
    extraWidth: 26,
    dotX: 10,
    dotRadius: 3,
    /** A scheduled connection's hollow dot */
    dotRingWidth: 1.5,
    textX: 18,
    textY: 4,
    /** From the pill to the note */
    noteGap: 8,
    /** Below the pill, to the details box */
    gapAfter: 12,
  },

  /** Page 1: the details box, one row per line */
  details: {
    radius: 6,
    paddingTop: 8,
    /** Top and bottom together */
    paddingY: 12,
    rowHeight: 19,
    keyX: 12,
    keyWidth: 110,
    /** The key's drop, to share the baseline of a larger value (the version) */
    keyOffsetY: 1,
    keyOffsetYLarge: 2,
    valueX: 124,
    /** The value's box is the body's width less this */
    valueInset: 136,
    /** Below the box, to the note */
    gapAfter: 8,
  },

  /** Page 1: the note on checking the copy, indented as the box's rows */
  note: { indent: 12 },

  /** A section's heading: the accent rule, the number and title, the lead */
  section: {
    gapBefore: 24,
    ruleWidth: 1.2,
    titleY: 7,
    /** The title's line, then the lead below it */
    titleAdvance: 24,
    leadGap: 6,
    paddingBottom: 4,
    /** Between the number and the title */
    numberSeparator: '  ',
  },

  /** A draft's "To finish before publishing (n)": the warning box, one gap per block */
  gaps: {
    gapBefore: 16,
    radius: 6,
    barWidth: 4,
    paddingX: 16,
    paddingTop: 12,
    /** From the box's top to the lead */
    leadY: 32,
    /** After the lead, to the first gap */
    leadGap: 8,
    bulletX: 22,
    bulletY: 6.5,
    bulletRadius: 1.8,
    /** A gap's text starts here, and its box is the body's width less `itemInset` */
    itemX: 32,
    itemInset: 48,
    itemGap: 4,
    paddingBottom: 10,
  },

  /** ① "Request link", ② "Result links" and their URLs */
  links: {
    headingGapBefore: 14,
    stepRadius: 9,
    stepTextY: 3.5,
    /** The title, the explanation, the label and the URL's box start here */
    indent: 26,
    titleY: 1.5,
    /** The step circle's height, then the explanation */
    headingAdvance: 18,
    infoGap: 4,
    /** The explanation's box is the body's width less this */
    infoInset: 30,
    firstUrlGapBefore: 8,
    urlGapBefore: 10,
    /** A result link's label, "Variant · Taxi", then its URL's box */
    labelAdvance: 16,
    urlRadius: 4,
    urlPaddingX: 8,
    urlPaddingY: 6,
  },

  /** A draft's dashed box instead of links (FR-013) */
  linksToCreate: {
    gapBefore: 12,
    radius: 6,
    strokeWidth: 1,
    dash: { length: 4, space: 3 },
    paddingX: 16,
    paddingTop: 14,
    /** The title's line, then the text */
    titleAdvance: 16,
    textGap: 4,
    paddingBottom: 14,
  },

  /** A document's frame with its data items in two columns */
  document: {
    firstGapBefore: 14,
    gapBefore: 12,
    radius: 6,
    strokeWidth: 0.8,
    paddingX: 12,
    nameY: 10,
    /** Between the name and its count */
    countSeparator: '   ',
    /** From the frame's top to the data items */
    itemsY: 34,
    paddingTop: 12,
    nameAdvance: 18,
    paddingBottom: 10,
    columnGap: 12,
    bulletX: 3,
    bulletY: 6.5,
    bulletRadius: 1.6,
    /** A data item's text starts this far into its column, its box this much narrower */
    itemX: 12,
    itemInset: 14,
    itemGap: 3,
  },

  /** A variant's header */
  variant: {
    firstGapBefore: 18,
    gapBefore: 30,
    /** Between "Variant" and the name */
    wordSeparator: '  ',
    titleAdvance: 20,
    originBadgeY: 3,
    /** Between the title and the origin badge */
    originGap: 8,
    descriptionGap: 4,
    combinesGap: 6,
    combinesHeight: 14,
  },

  /** "No rules. Anyone who shares …", "No documents yet" */
  placeholder: { gapBefore: 8, height: 14 },

  /** An origin or mark badge: a stroked pill with its word */
  badge: { height: 13, radius: 6.5, paddingX: 5, textY: 2.6, strokeWidth: 0.8, gapBefore: 8 },

  /** Rules and groups: each level indents, a group's members hang on its bar */
  items: {
    indent: 18,
    gapBefore: 4,
    barX: 6,
    barWidth: 2.5,
  },

  /** The AND/OR chip between two items (an artifact) */
  connector: {
    height: 14,
    x: 14,
    chipY: 0.5,
    chipHeight: 13,
    radius: 6.5,
    paddingX: 6,
    textY: 3.4,
  },

  /** A rule's card */
  rule: {
    padding: 10,
    radius: 5,
    strokeWidth: 0.8,
    /** An incomplete rule's dashed frame */
    incompleteStrokeWidth: 1.2,
    incompleteDash: { length: 4, space: 3 },
    /** The identifier's box is its width plus this; its drop beside the name */
    idExtraWidth: 10,
    idOffsetY: 2,
    nameGap: 5,
    messageGap: 5,
    noteGap: 6,
    /** The "!" circle before "Not complete:" and the note's indent after it */
    noteIconRadius: 5,
    noteIconY: 5.5,
    noteIconTextY: 2.2,
    noteIndent: 14,
    /**
     * A value's chip in the statement: its frame (an artifact) around its word. Chips follow the
     * statement's words on their line when the words fit on one, else on the lines below, and
     * wrap from chip to chip (a chip wider than the line wraps inside)
     */
    chip: { paddingX: 5, paddingY: 1.5, radius: 4, strokeWidth: 0.6, gapX: 4, gapY: 3 },
  },

  /** A group's header and its closing block */
  group: {
    radius: 5,
    paddingX: 10,
    nameY: 9,
    idY: 11,
    nameGap: 3,
    combinesHeight: 12,
    paddingBottom: 8,
    /** The closing block: its padding around the message, or its height without one */
    endPadding: 8,
    endHeight: 6,
  },
} as const;

// ---------------------------------------------------------------------------------------------
// Colours (design-notes 4): KERN Revamp's values from `frontend/src/index.css`, the draft colours
// of `ConnectionStatusBadge` and the mark colours of `BranchMark`. Upper-case hex

export const PDF_COLOURS = {
  /** layout-text-default */
  text: '#0B1220',
  /** layout-text-muted; also removed ("faded") text, struck through */
  muted: '#4A5468',
  /** action-default: section numbers and rules, AND/OR words, step numbers */
  accent: '#1D56F0',
  /** --color-action-tint: the AND/OR chip */
  accentTint: '#EEF3FE',
  /** layout-background-hued: the top band, the details box */
  bandBackground: '#F2F5FB',
  white: '#FFFFFF',
  /** feedback-success: the Active and Scheduled pills' word and dot */
  success: '#1D7A2E',
  /** feedback-success-background */
  successBackground: '#EAF7E6',
  /** ConnectionStatusBadge's deactivated pill (layout-text-muted on its own grey) */
  deactivated: '#4A5468',
  deactivatedBackground: '#EFF1F4',
  deactivatedDot: '#8C94A1',
  /** ConnectionStatusBadge's draft label: draft accents, a draft's band version, the band's pill */
  draft: '#05669E',
  /** ConnectionStatusBadge's draft dot: the dashed box, a draft's band bar (no text) */
  draftDot: '#0284C7',
  /** feedback-info-background: a draft's band, details box and pill */
  draftBackground: '#E0F2FE',
  /** --color-variant-changed and --color-variant-new (BranchMark): "Changed here", "Added here" */
  mark: '#8A22B5',
  /** --color-variant-changed-background, --color-variant-new-background */
  markBackground: '#F8F1FC',
  /** feedback-default: "Removed here" */
  removed: '#4A5468',
  /** feedback-default-background: removed cards, faded chips, group headers, URL boxes */
  neutralBackground: '#EEF1F6',
  /** feedback-warning: the gaps' title, "Not complete:", the gaps' bar and bullets */
  warning: '#9A4A00',
  /** feedback-warning-background */
  warningBackground: '#FFF4E0',
  /** --color-card-divider: frames, group bars, the bottom rule */
  line: '#D0D5DD',
  /** decorative-border-default */
  decorativeBorder: '#E1E6F0',
  /** The draft's watermark: the draft dot's blue (exempt from FR-039) */
  watermark: '#0284C7',
  /** The watermark's opacity, 6 % */
  watermarkOpacity: 0.06,
} as const satisfies Record<string, HexColour | number>;

// ---------------------------------------------------------------------------------------------
// Text styles, one per role (the prototype's sizes and faces; colours of design-notes 4)

const C = PDF_COLOURS;

export const PDF_STYLES = {
  // Page 1
  /** "Connection details", drawn in capitals without letter spacing */
  eyebrow: { font: 'medium', size: 8, colour: C.accent },
  eyebrowDraft: { font: 'medium', size: 8, colour: C.draft },
  /** The `H1` */
  name: { font: 'semiBold', size: 20, colour: C.text },
  description: { font: 'regular', size: 10.5, colour: C.muted },
  pillActive: { font: 'semiBold', size: 9, colour: C.success },
  pillScheduled: { font: 'semiBold', size: 9, colour: C.success },
  pillDeactivated: { font: 'semiBold', size: 9, colour: C.deactivated },
  pillDraft: { font: 'semiBold', size: 9, colour: C.draft },
  /** "as of …", "Not live yet" */
  statusNote: { font: 'regular', size: 9, colour: C.muted },
  detailsKey: { font: 'medium', size: 9, colour: C.muted },
  detailsId: { font: 'mono', size: 9, colour: C.text },
  detailsVersion: { font: 'monoMedium', size: 11, colour: C.text },
  detailsText: { font: 'regular', size: 9.5, colour: C.text },
  note: { font: 'regular', size: 8.5, colour: C.muted },

  // A draft's gaps
  gapsTitle: { font: 'semiBold', size: 11.5, colour: C.warning },
  gapsLead: { font: 'regular', size: 9.5, colour: C.text },
  gap: { font: 'regular', size: 10, colour: C.text },

  // Sections
  sectionNumber: { font: 'semiBold', size: 14, colour: C.accent },
  sectionTitle: { font: 'semiBold', size: 14, colour: C.text },
  sectionLead: { font: 'regular', size: 10, colour: C.muted },
  /** A deactivated or scheduled connection's "unavailable" sentence under the lead */
  sectionNotice: { font: 'regular', size: 10, colour: C.text },

  // 1 Links
  /** The step's number, white in its accent circle (an artifact) */
  stepNumber: { font: 'semiBold', size: 9, colour: C.white },
  linkTitle: { font: 'semiBold', size: 11.5, colour: C.text },
  linkInfo: { font: 'regular', size: 9, colour: C.muted },
  linkLabel: { font: 'medium', size: 9.5, colour: C.text },
  url: { font: 'mono', size: 8.5, colour: C.text },
  linksToCreateTitle: { font: 'semiBold', size: 10.5, colour: C.draft },
  linksToCreateText: { font: 'regular', size: 10, colour: C.muted },

  // 2 Documents
  documentName: { font: 'semiBold', size: 11.5, colour: C.text },
  documentCount: { font: 'regular', size: 9, colour: C.muted },
  dataItem: { font: 'regular', size: 10, colour: C.text },
  placeholder: { font: 'regular', size: 10, colour: C.muted },

  // 3 Rules
  /** "Variant" before the name */
  variantWord: { font: 'regular', size: 13, colour: C.muted },
  variantName: { font: 'semiBold', size: 13, colour: C.text },
  variantDescription: { font: 'regular', size: 9.5, colour: C.muted },
  /** "All rules must be met (AND)" under a variant */
  combines: { font: 'medium', size: 9, colour: C.accent },
  /** The origin badge of the main variant */
  originMain: { font: 'medium', size: 7.5, colour: C.accent },
  /** "Based on Standard", "Own rules" */
  originOther: { font: 'medium', size: 7.5, colour: C.muted },
  /** "Changed here", "Added here" */
  markChanged: { font: 'medium', size: 7.5, colour: C.mark },
  markAdded: { font: 'medium', size: 7.5, colour: C.mark },
  markRemoved: { font: 'medium', size: 7.5, colour: C.removed },
  /** The AND/OR chip's word (an artifact) */
  connector: { font: 'semiBold', size: 7.5, colour: C.accent },
  connectorFaded: { font: 'semiBold', size: 7.5, colour: C.muted },
  /** A rule's or group's identifier, "rule-7" */
  itemId: { font: 'mono', size: 8, colour: C.muted },
  itemName: { font: 'semiBold', size: 10.5, colour: C.text },
  itemNameFaded: { font: 'semiBold', size: 10.5, colour: C.muted, strike: true },
  statement: { font: 'regular', size: 10, colour: C.text },
  statementFaded: { font: 'regular', size: 10, colour: C.muted, strike: true },
  /** A value's chip, on white in its frame */
  statementValue: { font: 'semiBold', size: 9, colour: C.text },
  statementValueFaded: { font: 'semiBold', size: 9, colour: C.muted, strike: true },
  messageLabel: { font: 'medium', size: 9, colour: C.muted },
  message: { font: 'regular', size: 9, colour: C.muted },
  messageFaded: { font: 'regular', size: 9, colour: C.muted, strike: true },
  /** "Not complete: …" */
  notComplete: { font: 'medium', size: 9, colour: C.warning },
  /** The "!" in its warning circle (an artifact) */
  notCompleteIcon: { font: 'semiBold', size: 7.5, colour: C.white },
  /** "Group · All rules must be met (AND)" */
  groupCombines: { font: 'medium', size: 8.5, colour: C.accent },
  /** A removed or dissolved group's line: muted and struck through, as its name (FR-017) */
  groupCombinesFaded: { font: 'medium', size: 8.5, colour: C.muted, strike: true },

  // Every page
  bandName: { font: 'semiBold', size: 9, colour: C.text },
  bandId: { font: 'mono', size: 7, colour: C.muted },
  bandVersion: { font: 'monoMedium', size: 9, colour: C.text },
  bandVersionDraft: { font: 'monoMedium', size: 9, colour: C.draft },
  bandGenerated: { font: 'regular', size: 7.5, colour: C.muted },
  /** "Draft · Not live", white on the draft blue, drawn in capitals */
  bandDraftPill: { font: 'semiBold', size: 7.5, colour: C.white },
  bottomLabel: { font: 'regular', size: 8, colour: C.muted },
  bottomPage: { font: 'medium', size: 8, colour: C.text },
  watermark: { font: 'semiBold', size: 150, colour: C.watermark },
} as const satisfies Record<string, TextStyle>;

/** The name of a role in `PDF_STYLES` */
export type PdfStyleName = keyof typeof PDF_STYLES;

// ---------------------------------------------------------------------------------------------

/**
 * How long one run may take before it counts as failed (research R13): twice SC-001's bound and
 * 35 times the spike's slowest run
 */
export const PDF_WATCHDOG_MS = 120_000;

// ---------------------------------------------------------------------------------------------
// The PDF's own texts (contracts/pdf-document.md section 5, German as decision D2 settled it)

/** "Standard, Taxi and Hire car": the names joined with commas and the last with `and` */
function listOf(names: string[], and: string): string {
  return names.length > 1
    ? `${names.slice(0, -1).join(', ')} ${and} ${names.at(-1)}`
    : names.join('');
}

export const PDF_TEXTS = defineTexts(
  {
    eyebrow: 'Connection details',
    eyebrowDraft: 'Connection details · Draft for review',
    asOf: (date: string) => `as of ${date}`,
    startsOn: (date: string) => `starts on ${date}`,
    notLiveYet: 'Not live yet',
    connectionId: 'Connection ID',
    version: 'Version',
    lastSaved: 'Last saved',
    lastSavedValue: (date: string, saveNumber: number) => `${date} (draft save ${saveNumber})`,
    generated: 'Generated',
    generatedValue: (date: string) => `${date} (Germany)`,
    /** The details table's last row; its value is `CONNECTION_DETAIL_COPY.summaryCounts` */
    contents: 'Contents',
    checkNote:
      'Every page of this document names the connection and this version. The connection’s details page shows its current version: if they differ, this copy is out of date.',
    checkNoteDraft:
      'This draft is for review: it isn’t live, and its links are created only when it’s published. Its details page shows its current version: if they differ, this copy is out of date. Published unchanged, the connection keeps this version, so you can check that what goes live is what was reviewed.',
    gapsTitle: (count: number) => `To finish before publishing (${count})`,
    gapsLead:
      'These parts aren’t finished yet. The draft can be reviewed as it is, but it can only be published once they are.',
    resultLinks: 'Result links',
    referenceNote:
      'Your service replaces {reference} with the reference the request link returned.',
    variantLink: (name: string) => `Variant · ${name}`,
    deactivatedLinks:
      'The connection is deactivated: its links answer “unavailable” until it is activated again.',
    scheduledLinks: (date: string) =>
      `The connection is scheduled: its links can already be added to your service and answer “unavailable” until it starts on ${date}.`,
    linksToCreate: (names: string[]) =>
      names.length > 1
        ? `There will be one request link for all variants, and a result link for each variant: ${listOf(names, 'and')}.`
        : `There will be one request link and one result link for the variant ${listOf(names, 'and')}.`,
    section2: 'Documents and data items',
    section2Lead:
      'The wallet asks the citizen for these documents and shares only these data items with your service.',
    section3: 'Rules per variant',
    section3Lead:
      'A citizen’s data meets a variant when its rules are met. Each variant has its own result link. In a variant based on Standard, marks show where it differs from Standard.',
    variant: (name: string) => `Variant ${name}`,
    originMain: 'Main variant',
    originBased: 'Based on Standard',
    originEmpty: 'Own rules',
    group: (combines: string) => `Group · ${combines}`,
    notComplete: 'Not complete:',
    writeMessage: 'Write the message for citizens.',
    // A draft's gaps and a rule's "Not complete:" that no table of the create flow holds as an
    // instruction of its own (gaps.ts): the server's `clean_documents()` word for word, the
    // server's "choose the data to check." and the rules step's banner as instructions
    addDocument: 'Add at least one document.',
    chooseData: 'Choose the data to check.',
    addDataAgain: 'Add the data again in Documents, or edit or delete the rule.',
    shortenMessage: `Shorten the message for citizens to at most ${MESSAGE_MAX_LENGTH} characters.`,
    draftNotLive: 'Draft · Not live',
    idLine: (id: string) => `Connection ID ${id}`,
    versionLine: (version: string) => `Version ${version}`,
    generatedLine: (date: string) => `Generated ${date}`,
    page: (page: number, total: number) => `Page ${page} of ${total}`,
    continued: '(continued)',
    watermark: 'DRAFT',
    title: (name: string) => `${name} – Connection details`,
    titleDraft: (name: string) => `Draft – ${name} – Connection details`,
  },
  {
    eyebrow: 'Details der Anbindung',
    eyebrowDraft: 'Details der Anbindung · Entwurf zur Prüfung',
    asOf: (date) => `Stand: ${date}`,
    startsOn: (date) => `Start am ${date}`,
    notLiveYet: 'Noch nicht aktiv',
    connectionId: 'Anbindungs-ID',
    version: 'Version',
    lastSaved: 'Zuletzt gespeichert',
    lastSavedValue: (date, saveNumber) => `${date} (${saveNumber}. Speicherung)`,
    generated: 'Erstellt',
    generatedValue: (date) => `${date} (deutsche Zeit)`,
    contents: 'Inhalt',
    checkNote:
      'Jede Seite dieses Dokuments nennt die Anbindung und diese Version. Die Detailseite der Anbindung zeigt ihre aktuelle Version. Weichen beide voneinander ab, ist dieses Exemplar veraltet.',
    checkNoteDraft:
      'Dieser Entwurf dient zur Prüfung. Er ist nicht aktiv, und seine Links entstehen erst beim Veröffentlichen. Seine Detailseite zeigt seine aktuelle Version. Weichen beide voneinander ab, ist dieses Exemplar veraltet. Wird die Anbindung unverändert veröffentlicht, behält sie diese Version. So können Sie prüfen, ob veröffentlicht wird, was geprüft wurde.',
    gapsTitle: (count) => `Vor dem Veröffentlichen zu erledigen (${count})`,
    gapsLead:
      'Diese Teile sind noch nicht fertig. Sie können den Entwurf so prüfen, veröffentlichen lässt er sich aber erst, wenn sie fertig sind.',
    resultLinks: 'Ergebnislinks',
    referenceNote:
      'Ihr Dienst ersetzt {reference} durch die Referenz, die der Anfragelink zurückgegeben hat.',
    variantLink: (name) => `Variante · ${name}`,
    deactivatedLinks:
      'Die Anbindung ist deaktiviert: Ihre Links antworten mit „unavailable“, bis sie wieder aktiviert wird.',
    scheduledLinks: (date) =>
      `Die Anbindung ist geplant: Ihre Links können bereits in Ihren Dienst eingefügt werden und antworten mit „unavailable“, bis sie am ${date} startet.`,
    linksToCreate: (names) =>
      names.length > 1
        ? `Es wird einen Anfragelink für alle Varianten geben und einen Ergebnislink für jede Variante: ${listOf(names, 'und')}.`
        : `Es wird einen Anfragelink und einen Ergebnislink für die Variante ${listOf(names, 'und')} geben.`,
    section2: 'Dokumente und Felder',
    section2Lead:
      'Die Wallet fragt die Bürgerin oder den Bürger nach diesen Dokumenten und teilt nur diese Felder mit Ihrem Dienst.',
    section3: 'Regeln je Variante',
    section3Lead:
      'Die Daten einer Person erfüllen eine Variante, wenn deren Regeln erfüllt sind. Jede Variante hat ihren eigenen Ergebnislink. In einer Variante auf Basis von Standard zeigen Markierungen, wo sie von Standard abweicht.',
    variant: (name) => `Variante ${name}`,
    originMain: 'Hauptvariante',
    originBased: 'Basiert auf Standard',
    originEmpty: 'Eigene Regeln',
    group: (combines) => `Gruppe · ${combines}`,
    notComplete: 'Nicht vollständig:',
    writeMessage: 'Schreiben Sie die Nachricht für Bürgerinnen und Bürger.',
    addDocument: 'Fügen Sie mindestens ein Dokument hinzu.',
    chooseData: 'Wählen Sie die zu prüfenden Daten.',
    addDataAgain:
      'Fügen Sie die Daten im Schritt „Dokumente“ wieder hinzu oder bearbeiten oder löschen Sie die Regel.',
    shortenMessage: `Kürzen Sie die Nachricht für Bürgerinnen und Bürger auf höchstens ${MESSAGE_MAX_LENGTH} Zeichen.`,
    draftNotLive: 'Entwurf · Nicht aktiv',
    idLine: (id) => `Anbindungs-ID ${id}`,
    versionLine: (version) => `Version ${version}`,
    generatedLine: (date) => `Erstellt ${date}`,
    page: (page, total) => `Seite ${page} von ${total}`,
    continued: '(Fortsetzung)',
    watermark: 'ENTWURF',
    title: (name) => `${name} – Details der Anbindung`,
    titleDraft: (name) => `Entwurf – ${name} – Details der Anbindung`,
  }
);
