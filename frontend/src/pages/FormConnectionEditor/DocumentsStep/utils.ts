import type { DocumentType } from '@connection-portal/api-types/document-types';
import type { RequestedDocument } from '@connection-portal/api-types/form-connections';
import type { Language } from '@connection-portal/rules/language';

import { matchesSearch } from '../../../components/ValuesPicker/utils';
import type { RulesBranch } from '../RulesStep/types';
import type { PendingRemoval, RemovedDataRule } from '../types';
import { offeredFieldsOf, removedDataRulesOf } from '../utils';
import {
  DOCUMENT_GLYPHS,
  DOCUMENTS_COPY,
  GENERIC_DOCUMENT_GLYPHS,
  REMOVAL_DIALOG_COPY,
  SEARCH_CARD_HEIGHTS,
} from './constants';
import type {
  DataCount,
  DocumentGlyphs,
  DocumentsPager,
  ListedDocument,
  RemovalDialogCopy,
  RemovalDialogKind,
  RemovalQuestion,
  SearchGroups,
} from './types';

/**
 * The documents the list shows, in the editor's order (catalog order, F23): those the catalog
 * offers, each with its entry. A document the catalog no longer offers has no item; the note of
 * dropped data lists it (W6, 005-S8).
 */
export function listedDocumentsOf(
  documents: readonly RequestedDocument[],
  documentTypes: readonly DocumentType[]
): ListedDocument[] {
  return documents.flatMap((document) => {
    const documentType = documentTypes.find((type) => type.key === document.document_type);
    return documentType ? [{ document, documentType }] : [];
  });
}

/** The listed documents' ids, in list order: the `listIds` of the view's actions. */
export function listIdsOf(listed: readonly ListedDocument[]): string[] {
  return listed.map(({ document }) => document.document_type);
}

/**
 * The index of the document shown, kept inside a list of `count` documents: the documents can
 * change outside the view (the note's "Remove it", a reload), so the last one shows when the
 * selection lies past the end. 0 for an empty list.
 */
export function shownIndexOf(selectedIndex: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  return Math.min(Math.max(selectedIndex, 0), count - 1);
}

/** The listed document shown on the right; null while the list is empty. */
export function shownDocumentOf(
  listed: readonly ListedDocument[],
  selectedIndex: number
): ListedDocument | null {
  return listed[shownIndexOf(selectedIndex, listed.length)] ?? null;
}

/** The pager "Document n of m" (U21 #17, U22 #20) and where its arrows lead. */
export function pagerOf(selectedIndex: number, count: number, language: Language): DocumentsPager {
  const index = shownIndexOf(selectedIndex, count);
  return {
    index,
    text: count > 0 ? DOCUMENTS_COPY[language].pager(index + 1, count) : '',
    previousIndex: index > 0 ? index - 1 : null,
    nextIndex: index < count - 1 ? index + 1 : null,
  };
}

/**
 * The selection once `removedIds` have left the list `listIds` (U24 A12): the shown document
 * keeps showing when it stays; when it goes, the next document takes its place, or the previous
 * one when it was the last. 0 once the list is empty.
 */
export function indexAfterRemoval(
  listIds: readonly string[],
  selectedIndex: number,
  removedIds: readonly string[]
): number {
  const remaining = listIds.filter((id) => !removedIds.includes(id));
  if (remaining.length === 0) {
    return 0;
  }
  const shown = shownIndexOf(selectedIndex, listIds.length);
  const kept = remaining.indexOf(listIds[shown]);
  if (kept !== -1) {
    return kept;
  }
  const before = listIds.slice(0, shown).filter((id) => !removedIds.includes(id)).length;
  return Math.min(before, remaining.length - 1);
}

/**
 * The index a document takes in the list once added, or put back by "Undo": the editor keeps the
 * documents in catalog order (F23), so it goes after those before it in the catalog. Its present
 * index when it is listed already.
 */
export function indexAfterAdding(
  listIds: readonly string[],
  documentId: string,
  catalogOrder: readonly string[]
): number {
  const present = listIds.indexOf(documentId);
  if (present !== -1) {
    return present;
  }
  const position = catalogOrder.indexOf(documentId);
  return listIds.filter((id) => catalogOrder.indexOf(id) < position).length;
}

/**
 * The search card's groups (FR-031, FR-052e; U20 A2–A4, U21 A6): the catalog's documents whose
 * name holds the query, ignoring letter case and the spaces around it as the app's other searches
 * do (`matchesSearch`), split into "Available" and "Added", each in catalog order. An empty query
 * lists every document. Nothing is asked of the backend.
 */
export function searchGroupsOf(
  documentTypes: readonly DocumentType[],
  documents: readonly RequestedDocument[],
  query: string
): SearchGroups {
  const added = new Set(documents.map((document) => document.document_type));
  const matching = documentTypes.filter((type) => matchesSearch(type.label, query));
  return {
    available: matching.filter((type) => !added.has(type.key)),
    added: matching.filter((type) => added.has(type.key)),
    noMatches: query.trim() !== '' && matching.length === 0,
  };
}

/**
 * A document's count (FR-051 (37)): its chosen data items that the catalog offers, of all those
 * it offers. A chosen item the catalog dropped isn't counted; the note lists it (005-S8).
 */
export function dataCountOf(document: RequestedDocument, documentType: DocumentType): DataCount {
  return {
    chosen: offeredFieldsOf(document.fields, documentType).length,
    total: documentType.fields.length,
  };
}

/** "6 of 25 data items chosen", or "No data items chosen yet" (U21 #12, U22 #14). */
export function dataCountText({ chosen, total }: DataCount, language: Language): string {
  const copy = DOCUMENTS_COPY[language];
  return chosen === 0 ? copy.noDataChosen : copy.dataChosen(chosen, total);
}

/**
 * The listed documents with no data chosen, in list order (F67, FR-031): what "Set rules →"
 * flags. As the count shows it, only the data the catalog offers counts as chosen.
 */
export function needsDataOf(
  documents: readonly RequestedDocument[],
  documentTypes: readonly DocumentType[]
): string[] {
  return listIdsOf(
    listedDocumentsOf(documents, documentTypes).filter(
      ({ document, documentType }) => dataCountOf(document, documentType).chosen === 0
    )
  );
}

/**
 * The flagged documents that still have no data chosen, in list order (U25 A14): the red list
 * items, the red line in the shown document's header, and the count of "1 document needs data".
 * A flagged document whose data is chosen meanwhile, or that has gone, is left out.
 */
export function documentsNeedingData(
  flagged: readonly string[],
  documents: readonly RequestedDocument[],
  documentTypes: readonly DocumentType[]
): string[] {
  return needsDataOf(documents, documentTypes).filter((id) => flagged.includes(id));
}

/**
 * The rules, in every branch, that check a document's data (F72, 002-S1.1), as the editor's
 * removal dialog names them ("Rule 02 in Standard"): what decides which question its trash asks.
 */
export function rulesCheckingDocument(
  branches: RulesBranch[],
  documents: RequestedDocument[],
  documentType: DocumentType
): RemovedDataRule[] {
  return removedDataRulesOf(
    { type: 'document', documentType: documentType.key, label: documentType.label },
    branches,
    documents
  );
}

/**
 * Which dialog the removal question opens (F72): "Keep document" / "Remove document" when no rule
 * checks the document, 002-S1.1's dialog naming the rules when one does; null while none is asked.
 */
export function removalDialogOf(question: RemovalQuestion | null): RemovalDialogKind | null {
  if (question === null) {
    return null;
  }
  return question.rules.length > 0 ? 'rules' : 'confirm';
}

/**
 * "A", "A and B", "A, B and C" ("A, B und C"): the frames' lists inside a sentence (U24 #22,
 * U26 #24).
 */
export function listText(items: readonly string[], language: Language): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  const copy = REMOVAL_DIALOG_COPY[language];
  return `${items.slice(0, -1).join(copy.comma)}${copy.and}${items[items.length - 1]}`;
}

/**
 * The rules a removal question names, in one sentence grouped by variant in their order (U24 #22
 * "Rule 02 and Rule 03 in Standard", U26 #24 "Rule 01 in Standard and Rule 05 in Ambulance").
 */
export function ruleListText(rules: readonly RemovedDataRule[], language: Language): string {
  const branches = new Map<string, string[]>();
  for (const { ruleName, branchName } of rules) {
    branches.set(branchName, [...(branches.get(branchName) ?? []), ruleName]);
  }
  const { rulesIn } = REMOVAL_DIALOG_COPY[language];
  return listText(
    [...branches].map(([branch, names]) => rulesIn(listText(names, language), branch)),
    language
  );
}

/**
 * A data item's name inside a sentence: in English its first letter lower case ("date of birth"),
 * unless the name starts with an abbreviation ("UN distinguishing sign"); in German as it is,
 * since German nouns keep their capital („Geburtsdatum“, G§1).
 */
export function inSentence(label: string, language: Language): string {
  if (language === 'de') {
    return label;
  }
  const [first = '', second = ''] = label;
  return second !== '' && second === second.toUpperCase() && second !== second.toLowerCase()
    ? label
    : `${first.toLowerCase()}${label.slice(1)}`;
}

/**
 * The question before data stops being requested (F72, 002-S1.1; FR-029): removing a document,
 * asked always ("Citizens won’t be asked for this document any more.", U23 A10), with the rules
 * that check its data when there are any (U24 A11); deselecting a data item, "All data items" or
 * the note's "Remove it" when rules check it (U26). The rules follow in one sentence, then that
 * they need editing "before you publish" ("before you save" when editing, 002-S1.7). Empty while
 * nothing is asked.
 */
export function removalDialogCopyOf(
  removal: PendingRemoval | null,
  rules: readonly RemovedDataRule[],
  editing: boolean,
  language: Language
): RemovalDialogCopy {
  if (removal === null) {
    return { title: '', text: '', cancelLabel: '', confirmLabel: '' };
  }
  const copy = REMOVAL_DIALOG_COPY[language];
  const documents = DOCUMENTS_COPY[language];
  const count = rules.length;
  const named = (intro: string) =>
    count > 0 ? [intro, `${ruleListText(rules, language)}.`, copy.after(count, editing)] : [];
  const stop = { cancelLabel: copy.cancel, confirmLabel: copy.stopRequesting };
  switch (removal.type) {
    case 'document':
      return {
        title: copy.documentTitle(removal.label),
        text: [copy.documentLead, ...named(copy.documentRules(count))].join(' '),
        cancelLabel: documents.keepDocument,
        confirmLabel: documents.removeDocument,
      };
    case 'field':
      return {
        title: copy.fieldTitle(removal.label),
        text: [
          copy.fieldLead(inSentence(removal.label, language)),
          ...named(copy.fieldRules(count)),
        ].join(' '),
        ...stop,
      };
    case 'allFields':
      return {
        title: copy.allFieldsTitle(removal.label),
        text: named(copy.dataRules(count)).join(' '),
        ...stop,
      };
    case 'dropped':
      return {
        title: copy.fieldTitle(removal.label),
        text: named(copy.dataRules(count)).join(' '),
        ...stop,
      };
  }
}

/** "1 document needs data" / "<n> documents need data" (U25 #22). */
export function needsDataText(count: number, language: Language): string {
  const copy = DOCUMENTS_COPY[language];
  return count === 1 ? copy.needsDataOne : copy.needsDataMany(count);
}

/** The dialog's title: "No data selected in 1 document" / "… in <n> documents" (#55). */
export function noDataTitle(count: number, language: Language): string {
  const copy = DOCUMENTS_COPY[language];
  return count === 1 ? copy.noDataTitleOne : copy.noDataTitleMany(count);
}

/**
 * The dialog's text, naming the documents without data (#55, U25 7299:52174): "Driving licence
 * has no data chosen yet. Choose data for it or remove it."; for several, "Personal ID and
 * Driving licence have no data chosen yet. Choose data for them or remove them." (not drawn).
 */
export function noDataText(documents: readonly string[], language: Language): string {
  const copy = DOCUMENTS_COPY[language];
  return documents.length === 1
    ? copy.noDataTextOne(documents[0])
    : copy.noDataTextMany(listText(documents, language));
}

/** The dialog's danger button: "Remove 1 document" / "Remove <n> documents" (#55, F67). */
export function removeDocumentsLabel(count: number, language: Language): string {
  const copy = DOCUMENTS_COPY[language];
  return count === 1 ? copy.removeDocumentsOne : copy.removeDocumentsMany(count);
}

/** A document type's glyph in a tone (Figma "Icon/Glyph"); the generic document's without one. */
export function documentGlyphOf(documentType: string, tone: keyof DocumentGlyphs): string {
  return (DOCUMENT_GLYPHS[documentType] ?? GENERIC_DOCUMENT_GLYPHS)[tone];
}

/**
 * The search card's height with every row shown (U20 7290:60525, 7290:60990): the field, then
 * each group that has rows with its label, or the no-results line. What `placementFrom()` needs
 * to open it down or up; the card's rows scroll inside its max-height step where it is taller.
 */
export function searchCardHeight({ available, added, noMatches }: SearchGroups): number {
  const { frame, field, gap, groupLabel, row } = SEARCH_CARD_HEIGHTS;
  const group = (count: number) => (count > 0 ? groupLabel + count * row : 0);
  const results = noMatches
    ? SEARCH_CARD_HEIGHTS.noMatches
    : group(available.length) + group(added.length);
  return frame + field + (results > 0 ? gap + results : 0);
}
