import { defineTexts } from '@connection-portal/rules/language';

import documentActionGlyph from '../../../assets/icons/document-action.svg';
import documentDangerGlyph from '../../../assets/icons/document-danger.svg';
import documentInkGlyph from '../../../assets/icons/document-ink.svg';
import documentMutedGlyph from '../../../assets/icons/document-muted.svg';
import drivingLicenceActionGlyph from '../../../assets/icons/driving-licence-action.svg';
import drivingLicenceDangerGlyph from '../../../assets/icons/driving-licence-danger.svg';
import drivingLicenceInkGlyph from '../../../assets/icons/driving-licence-ink-24.svg';
import drivingLicenceMutedGlyph from '../../../assets/icons/driving-licence-muted.svg';
import personalIdActionGlyph from '../../../assets/icons/personal-id-action.svg';
import personalIdDangerGlyph from '../../../assets/icons/personal-id-danger.svg';
import personalIdInkGlyph from '../../../assets/icons/personal-id-ink.svg';
import personalIdMutedGlyph from '../../../assets/icons/personal-id-muted.svg';
import type { DocumentGlyphs, DocumentsViewState } from './types';

// "1 rule checks" / "2 rules check", in the removal question (REMOVAL_DIALOG_COPY)
const rulesCheck = (count: number) => `${count} ${count === 1 ? 'rule checks' : 'rules check'}`;
// "1 Regel prüft" / "2 Regeln prüfen"
const rulesCheckDe = (count: number) => `${count} ${count === 1 ? 'Regel prüft' : 'Regeln prüfen'}`;

/**
 * The documents step's copy (FR-031, FR-051 (37), FR-052e, F67, F72, Clarification #55), from U20
 * to U25, in both languages (spec 009, R1; glossary G§2 "document", "field", "data item"). The
 * singular and plural forms are chosen in `utils.ts` (`needsDataText()`, `noDataTitle()`,
 * `removeDocumentsLabel()`); the plurals the frames don't draw follow #55's "Remove <n>
 * documents". The documents' and data items' names come from the catalog, in the language of the
 * moment (`useDocumentTypes`, G§4)
 */
export const DOCUMENTS_COPY = defineTexts(
  {
    // The pager under the shown document (U21 #17, U22 #20)
    pager: (position: number, count: number) => `Document ${position} of ${count}`,
    // The list's title (U20 #8, U22 #9)
    addedDocuments: (count: number) => `Added documents (${count})`,
    // The search card's groups (U20 #17, U21 #23–#24; FR-052e)
    availableGroup: (count: number) => `Available (${count})`,
    addedGroup: (count: number) => `Added (${count})`,
    // The search card without a result (U20 #20)
    noMatches: (query: string) => `No documents match “${query}”.`,
    // The shown document's count (FR-051 (37); U21 #12, U22 #14)
    dataChosen: (chosen: number, total: number) => `${chosen} of ${total} data items chosen`,
    noDataChosen: 'No data items chosen yet',
    // Over the list once "Set rules →" found documents without data (U25 #22)
    needsDataOne: '1 document needs data',
    needsDataMany: (count: number) => `${count} documents need data`,
    // In a flagged document's header, in place of its count (U25 #24, 7298:62838)
    needsDataLine: 'Choose at least one data item, or remove this document.',
    // The dialog on "Set rules →" (U25 7299:52174; #55): its title and its text naming the
    // documents ("Driving licence", "Personal ID and Driving licence"); the plural isn't drawn
    noDataTitleOne: 'No data selected in 1 document',
    noDataTitleMany: (count: number) => `No data selected in ${count} documents`,
    noDataTextOne: (document: string) =>
      `${document} has no data chosen yet. Choose data for it or remove it.`,
    noDataTextMany: (documents: string) =>
      `${documents} have no data chosen yet. Choose data for them or remove them.`,
    chooseData: 'Choose data',
    removeDocumentsOne: 'Remove 1 document',
    removeDocumentsMany: (count: number) => `Remove ${count} documents`,
    // "Set rules →" while no document is added (U20 #14; FR-031)
    addDocumentFirst: 'Add a document first',
    // The removal question (U23 #22, U24 #24; F72)
    keepDocument: 'Keep document',
    removeDocument: 'Remove document',
    // The list card (U20 7290:60377, U21 7290:61198) and its search card (U20 7290:60525)
    addDocument: 'Add document',
    findDocument: 'Find a document',
    addedTag: 'Added',
    // The trash's accessible name (U21 #11)
    removeDocumentLabel: (document: string) => `Remove ${document}`,
    // The empty panel (U20 7290:60384)
    emptyTitle: 'No documents yet',
    emptyText: 'Documents you add show up here, with the data you can choose.',
    // The shown document's select-all (U21 7290:61211; 002-S1.2)
    allDataItems: 'All data items',
    // The pager's arrows (U21 7290:61258, 7290:61260), named for screen readers
    previousDocument: 'Previous document',
    nextDocument: 'Next document',
  },
  {
    pager: (position, count) => `Dokument ${position} von ${count}`,
    addedDocuments: (count) => `Hinzugefügte Dokumente (${count})`,
    availableGroup: (count) => `Verfügbar (${count})`,
    addedGroup: (count) => `Hinzugefügt (${count})`,
    noMatches: (query) => `Keine Dokumente passen zu „${query}“.`,
    dataChosen: (chosen, total) => `${chosen} von ${total} Feldern ausgewählt`,
    noDataChosen: 'Noch keine Felder ausgewählt',
    needsDataOne: '1 Dokument braucht Daten',
    needsDataMany: (count) => `${count} Dokumente brauchen Daten`,
    needsDataLine: 'Wählen Sie mindestens ein Feld aus oder entfernen Sie dieses Dokument.',
    noDataTitleOne: 'Keine Daten in 1 Dokument ausgewählt',
    noDataTitleMany: (count) => `Keine Daten in ${count} Dokumenten ausgewählt`,
    noDataTextOne: (document) =>
      `Für ${document} sind noch keine Daten ausgewählt. Wählen Sie Daten aus oder entfernen Sie das Dokument.`,
    noDataTextMany: (documents) =>
      `Für ${documents} sind noch keine Daten ausgewählt. Wählen Sie Daten aus oder entfernen Sie die Dokumente.`,
    chooseData: 'Daten auswählen',
    removeDocumentsOne: '1 Dokument entfernen',
    removeDocumentsMany: (count) => `${count} Dokumente entfernen`,
    addDocumentFirst: 'Fügen Sie zuerst ein Dokument hinzu',
    keepDocument: 'Dokument behalten',
    removeDocument: 'Dokument entfernen',
    addDocument: 'Dokument hinzufügen',
    findDocument: 'Dokument suchen',
    addedTag: 'Hinzugefügt',
    removeDocumentLabel: (document) => `${document} entfernen`,
    emptyTitle: 'Noch keine Dokumente',
    emptyText: 'Hinzugefügte Dokumente erscheinen hier, mit den Daten, die Sie auswählen können.',
    allDataItems: 'Alle Felder',
    previousDocument: 'Vorheriges Dokument',
    nextDocument: 'Nächstes Dokument',
  }
);

/**
 * The question before data stops being requested (F72, 002-S1.1; FR-029): the document's
 * "Remove Driving licence?" (U23 7298:62322 without rules, U24 7298:62500 naming them) and a data
 * item's "Stop requesting Date of birth?" (U26 6324:40396). The frames name the rules in one
 * sentence, grouped by variant ("Rule 02 and Rule 03 in Standard", `ruleListText()`); in the edit
 * flow they need changing "before you save" (002-S1.7). "All data items" and the note's "Remove
 * it" aren't drawn: they keep the baseline's title and "this data", without a first sentence.
 * The German names a data item in quotes („Geburtsdatum“), so that no article has to agree with
 * it (G§1 "Quotes"), and keeps its capital (`inSentence()`)
 */
export const REMOVAL_DIALOG_COPY = defineTexts(
  {
    documentTitle: (document: string) => `Remove ${document}?`,
    documentLead: 'Citizens won’t be asked for this document any more.',
    documentRules: (count: number) => `${rulesCheck(count)} its data:`,
    fieldTitle: (field: string) => `Stop requesting ${field}?`,
    // The data item's name inside the sentence, its first letter lower case ("date of birth")
    fieldLead: (field: string) => `Citizens won’t share their ${field} any more.`,
    fieldRules: (count: number) => `${rulesCheck(count)} it:`,
    allFieldsTitle: (document: string) => `Stop requesting all data from ${document}?`,
    dataRules: (count: number) => `${rulesCheck(count)} this data:`,
    after: (count: number, editing: boolean) =>
      `Edit or delete ${count === 1 ? 'it' : 'them'} before you ${editing ? 'save' : 'publish'}.`,
    // "Rule 02 and Rule 03 in Standard"
    rulesIn: (rules: string, branch: string) => `${rules} in ${branch}`,
    and: ' and ',
    comma: ', ',
    // A data item's buttons (U26); a document's are DOCUMENTS_COPY's keepDocument and
    // removeDocument
    cancel: 'Cancel',
    stopRequesting: 'Stop requesting',
  },
  {
    documentTitle: (document) => `${document} entfernen?`,
    documentLead: 'Bürgerinnen und Bürger werden nicht mehr nach diesem Dokument gefragt.',
    documentRules: (count) => `${rulesCheckDe(count)} seine Daten:`,
    fieldTitle: (field) => `„${field}“ nicht mehr anfordern?`,
    fieldLead: (field) => `Bürgerinnen und Bürger werden nicht mehr nach „${field}“ gefragt.`,
    fieldRules: (count) => `${rulesCheckDe(count)} dieses Feld:`,
    allFieldsTitle: (document) => `Alle Daten aus „${document}“ nicht mehr anfordern?`,
    dataRules: (count) => `${rulesCheckDe(count)} diese Daten:`,
    after: (count, editing) =>
      `Bearbeiten oder löschen Sie ${count === 1 ? 'die Regel' : 'die Regeln'} vor dem ${editing ? 'Speichern' : 'Veröffentlichen'}.`,
    rulesIn: (rules, branch) => `${rules} in ${branch}`,
    and: ' und ',
    comma: ', ',
    cancel: 'Abbrechen',
    stopRequesting: 'Nicht mehr anfordern',
  }
);

/**
 * At 800px tall and more, side by side (`lg:`, 992px), the list card, the shown document and the
 * empty panel fill the window under the pinned step header down to the footer, so that the page
 * doesn't scroll and only their lists do (build note U01 #16, T033's slot): the window less the
 * sticky parts and the content's 40px bottom padding. Lower, they keep U21's 560px and the page
 * scrolls. "1 document needs data" sits inside the list card (U25 7298:62830); the note on
 * dropped data (W6) above the panels pushes them down by its height, so the page scrolls by that
 * much while it shows: it asks to be read and acted on first, and goes with its "Remove it"
 */
export const PANEL_HEIGHT_CLASSES =
  'lg:h-560 lg:[@media(height>=50rem)]:h-[calc(100dvh-var(--wizard-sticky-top)-var(--wizard-sticky-bottom)-40px)]';

/** The ids the step's parts carry, for labels and for moving the focus */
export const DOCUMENTS_STEP_IDS = {
  listTitle: 'added-documents-title',
  addDocument: 'add-document',
  searchCard: 'add-document-card',
  searchField: 'add-document-search',
  availableGroup: 'add-document-available',
  addedGroup: 'add-document-added',
  // A list item's button that shows the document
  listItem: (documentType: string) => `document-item-${documentType}`,
  detail: 'document-detail',
  // "1 document needs data" over the list, which describes the flagged items (U25 #22)
  needsData: 'documents-need-data',
};

/**
 * Figma "Icon/Glyph" per document type, in the tones the step uses (U21 7290:61204, 7290:61207,
 * 7290:62279; U25 7298:62832): `action` on the shown list item, `ink` on the other items, the
 * detail's header and the search card's available rows, `muted` on the search card's added rows,
 * `danger` on a list item that needs data
 */
export const DOCUMENT_GLYPHS: Record<string, DocumentGlyphs> = {
  pid: {
    action: personalIdActionGlyph,
    ink: personalIdInkGlyph,
    muted: personalIdMutedGlyph,
    danger: personalIdDangerGlyph,
  },
  mdl: {
    action: drivingLicenceActionGlyph,
    ink: drivingLicenceInkGlyph,
    muted: drivingLicenceMutedGlyph,
    danger: drivingLicenceDangerGlyph,
  },
};

/** The glyph of a document type that has none of its own */
export const GENERIC_DOCUMENT_GLYPHS: DocumentGlyphs = {
  action: documentActionGlyph,
  ink: documentInkGlyph,
  muted: documentMutedGlyph,
  danger: documentDangerGlyph,
};

/** The search card's width (U20 7290:60525) and its parts' heights, to place it (R10) */
export const SEARCH_CARD_WIDTH = 360;
export const SEARCH_CARD_HEIGHTS = {
  // The 12px padding and the 1px border, above and below
  frame: 26,
  field: 48,
  gap: 8,
  groupLabel: 36,
  row: 40,
  noMatches: 48,
};

/**
 * Where the search card opens from "Add document", 8px from it (U20: the button's bottom 305,
 * the card's top 313): below or above, its left edge on the button's as Figma draws it, else its
 * right edge. Where neither fits (320 px, 200 % zoom) it spans the step, the positioned box:
 * opening down it starts where the flow puts it, under the button; opening up its wrapper is a
 * flex column (SEARCH_CARD_FULL_WRAPPERS), so that it starts at the button's top and moves up by
 * its own height and the gap, as the values picker's menu does
 */
export const SEARCH_CARD_PLACEMENTS = {
  start: { down: 'top-full left-0 mt-8 w-360', up: 'bottom-full left-0 mb-8 w-360' },
  end: { down: 'top-full right-0 mt-8 w-360', up: 'bottom-full right-0 mb-8 w-360' },
  full: { down: 'inset-x-0 mt-8', up: 'inset-x-0 -translate-y-[calc(100%+8px)]' },
} as const;

/** The wrapper of a card across the step, by direction (see SEARCH_CARD_PLACEMENTS) */
export const SEARCH_CARD_FULL_WRAPPERS = {
  down: 'static',
  up: 'static flex flex-col items-start',
} as const;

/** The view's first state: the first document shown, no search, nothing pending or asked */
export const INITIAL_DOCUMENTS_VIEW_STATE: DocumentsViewState = {
  selectedIndex: 0,
  query: '',
  pendingRemoval: null,
  needsData: { documentIds: [], asking: false },
  confirmRemoval: null,
};
