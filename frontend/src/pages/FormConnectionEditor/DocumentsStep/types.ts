import type { DocumentType } from '@connection-portal/api-types/document-types';
import type { RequestedDocument } from '@connection-portal/api-types/form-connections';
import type { Dispatch, KeyboardEvent, Ref } from 'react';

import type { DroppedData, RemovedDataRule } from '../types';

/**
 * The documents step's view (FR-031, research R8, data-model "The documents step"). The editor's
 * reducer keeps owning the documents (catalog order, F23) and their fields; this state only says
 * what the step shows of them. Nothing in it is stored, sent or logged.
 *
 * A document's id is its document type's key (`RequestedDocument.document_type`). Indexes count
 * the documents the list shows (`listedDocumentsOf()`): those the catalog offers, in the editor's
 * order.
 */
export interface DocumentsViewState {
  /**
   * The document shown on the right and in the pager "Document n of m", as an index into the
   * list; `shownIndexOf()` keeps it inside the list when the documents changed outside this state
   */
  selectedIndex: number;
  /** The search card's text, as typed: "Available (n)" / "Added (n)" and the no-results text */
  query: string;
  /** The document whose removal the undo toast can still take back; null once it has gone */
  pendingRemoval: PendingDocumentRemoval | null;
  /** The documents flagged as having no data chosen, and the dialog about them (F67, #55) */
  needsData: NeedsData;
  /** The question before a document is removed (F72); null while none is asked */
  confirmRemoval: RemovalQuestion | null;
}

/**
 * A removed document that the undo toast ("<Document> removed." / "Undo") can bring back. The
 * editor's state holds the document and its fields (`removed`) and the toast; this records which
 * one it is, so that "Undo" shows it again. It ends with the toast: "Undo", Escape, its 6 seconds
 * (FR-082), a newer change or a change of step
 */
export interface PendingDocumentRemoval {
  documentId: string;
}

/**
 * The question before a document leaves the list (F72, FR-031): "Keep document" / "Remove
 * document" when no rule checks the document, 002-S1.1's dialog naming the rules when one does
 * (`removalDialogOf()`)
 */
export interface RemovalQuestion {
  documentId: string;
  /** The rules that check its data, in branch and tree order (`rulesCheckingDocument()`) */
  rules: RemovedDataRule[];
}

/**
 * The documents without chosen data, flagged on "Set rules →" (F67, Clarification #55): the
 * inline "1 document needs data" and the red list items while they still have none
 * (`documentsNeedingData()`), and the dialog "No data selected in n document(s)"
 */
export interface NeedsData {
  /** The flagged documents, in list order; empty while none is flagged */
  documentIds: readonly string[];
  /** The dialog "No data selected in n document(s)" is open */
  asking: boolean;
}

/**
 * What changes the view. `listIds` is always the list as the page shows it when the team member
 * acts, before the change the action reports: `listedDocumentsOf()`'s ids, in its order
 */
export type DocumentsViewAction =
  /** A list item, or the pager's previous or next document */
  | { type: 'select'; index: number }
  /** Typing in the search card */
  | { type: 'search'; query: string }
  /** The search field's ×, or the card closing after a document was picked */
  | { type: 'clearSearch' }
  /** The toast's "Undo": the editor has put the document back, and it shows again */
  | { type: 'undoRemoval'; listIds: readonly string[]; catalogOrder: readonly string[] }
  /**
   * The undo toast has gone without "Undo" (Escape, a newer change, a change of step); with
   * `documentId`, only when the pending removal is that document's
   */
  | { type: 'expireRemoval'; documentId?: string }
  /** A list item's trash: asks before removing (F72) */
  | { type: 'askRemoval'; documentId: string; rules: RemovedDataRule[] }
  /** "Keep document", the ×, Escape or the scrim: the question closes, nothing is removed */
  | { type: 'keepDocument' }
  /**
   * "Remove document", once the page has removed the asked document through the editor: the
   * question closes and the removal waits for its undo
   */
  | { type: 'confirmRemovalDone'; listIds: readonly string[] }
  /**
   * "Set rules →": the documents without chosen data (`needsDataOf()`) are flagged and the dialog
   * opens; an empty list takes the flags away, and the page goes on
   */
  | { type: 'flagNeedsData'; documentIds: readonly string[] }
  /**
   * The dialog's "Choose data" (and its ×, Escape, scrim): it closes, the flags stay, and a
   * flagged document shows
   */
  | { type: 'chooseData'; listIds: readonly string[] }
  /**
   * The dialog's "Remove 1 document" / "Remove <n> documents", once the page has removed the
   * flagged documents through the editor: the flags and the dialog go
   */
  | { type: 'removeNeedsDataDone'; listIds: readonly string[] };

/** A document the list shows: the editor's document with its catalog entry */
export interface ListedDocument {
  document: RequestedDocument;
  documentType: DocumentType;
}

/**
 * The search card's two groups (FR-031, FR-052e): each in catalog order and filtered by the
 * query; `noMatches` while a query matches neither group ("No documents match “…”.")
 */
export interface SearchGroups {
  available: DocumentType[];
  added: DocumentType[];
  noMatches: boolean;
}

/** The pager under the shown document: "Document n of m" and where its arrows lead */
export interface DocumentsPager {
  /** The shown document's index, inside the list */
  index: number;
  /** "Document 2 of 2"; empty without a document, when no pager shows */
  text: string;
  /** The previous document's index; null on the first, which disables the arrow */
  previousIndex: number | null;
  /** The next document's index; null on the last */
  nextIndex: number | null;
}

/** A document's chosen data items and how many the catalog offers (FR-051 (37)) */
export interface DataCount {
  chosen: number;
  total: number;
}

/**
 * The removal question's dialog (F72): `confirm` is "Remove <Document>?" with "Keep document" /
 * "Remove document"; `rules` is 002-S1.1's dialog naming the rules that check the document
 */
export type RemovalDialogKind = 'confirm' | 'rules';

/**
 * The words of the question before data that rules check, or a document, stops being requested
 * (`removalDialogCopyOf()`; U23, U24, U26): one paragraph naming the rules, and the two buttons
 */
export interface RemovalDialogCopy {
  title: string;
  text: string;
  cancelLabel: string;
  confirmLabel: string;
}

/** A document type's glyph in the step's three tones (Figma "Icon/Glyph") */
export interface DocumentGlyphs {
  /** The shown list item: `color/action/default` */
  action: string;
  /** The other list items, the detail's header and the search card's available rows */
  ink: string;
  /** The search card's added rows: `color/layout/text-muted` */
  muted: string;
  /** A list item that needs data (U25 7298:62832): `color/feedback/danger` */
  danger: string;
}

export interface DocumentsStepProps {
  catalogStatus: 'loading' | 'loaded' | 'failed';
  documentTypes: DocumentType[];
  /** The editor's documents, in catalog order (F23) */
  documents: RequestedDocument[];
  /**
   * The data the catalog dropped (S8, W6): the note above the panels shows while there is any.
   * Empty in the published edit flow, which stays as it is (FR-026)
   */
  dropped: DroppedData[];
  /** The note, which takes the focus when the flow moved to this step for it (S8) */
  droppedNoteRef: Ref<HTMLElement>;
  /** The note's "Remove it" */
  onRemoveDropped: () => void;
  onRetryCatalog: () => void;
  /** The view (`documentsViewReducer`), held by the editor */
  view: DocumentsViewState;
  dispatchView: Dispatch<DocumentsViewAction>;
  /** A pick in the search card: the editor adds the document, then shows it */
  onAdd: (documentType: DocumentType) => void;
  /** A list item's trash */
  onRemove: (documentType: DocumentType) => void;
  onSetField: (documentType: string, field: string, selected: boolean) => void;
  onSetAllFields: (documentType: string, fields: string[]) => void;
}

export interface DocumentsListProps {
  documentTypes: DocumentType[];
  documents: RequestedDocument[];
  listed: ListedDocument[];
  /** The index of the document shown on the right */
  shownIndex: number;
  /** The search card's text (the view's `query`) */
  query: string;
  /**
   * The flagged documents that still have no data (`documentsNeedingData()`): "1 document needs
   * data" over the list and their items in the error look (U25 A14)
   */
  needingData: readonly string[];
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  onAdd: (documentType: DocumentType) => void;
  onSelect: (index: number) => void;
  onRemove: (documentType: DocumentType) => void;
}

export interface DocumentListItemProps {
  documentType: DocumentType;
  /** It is the document shown on the right */
  selected: boolean;
  /**
   * It was flagged on "Set rules →" and still has no data (U25 7298:62832): the light-red tile,
   * the danger glyph, the red semibold name and the error icon in the trash's place
   */
  needsData: boolean;
  /** The id of "1 document needs data", which describes a flagged item */
  describedBy?: string;
  onSelect: () => void;
  onRemove: () => void;
}

export interface SearchCardProps {
  documentTypes: DocumentType[];
  documents: RequestedDocument[];
  query: string;
  /** "Add document" is filled while no document is added, outlined once one is (U04 #37) */
  filled: boolean;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  onAdd: (documentType: DocumentType) => void;
}

export interface SearchResultItemProps {
  documentType: DocumentType;
  /** Added already: greyed with the "Added" tag, not offered again (U21 #24) */
  added: boolean;
  /** An available row's pick */
  onPick?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

export interface DocumentDetailProps {
  shown: ListedDocument;
  /** "Document n of m" and where its arrows lead */
  pager: DocumentsPager;
  /**
   * It was flagged on "Set rules →" and still has no data: the header's red line "Choose at least
   * one data item, or remove this document." in place of its count (U25 #24)
   */
  needsData: boolean;
  onSelect: (index: number) => void;
  onSetField: (field: string, selected: boolean) => void;
  onSetAllFields: (fields: string[]) => void;
}

export interface FieldRowProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface PagerButtonProps {
  /** "Previous document" / "Next document", for screen readers */
  label: string;
  /** The KERN icon class of its chevron */
  icon: string;
  /** The index it shows; null at the end of the list, where it can't be used */
  target: number | null;
  onSelect: (index: number) => void;
}
