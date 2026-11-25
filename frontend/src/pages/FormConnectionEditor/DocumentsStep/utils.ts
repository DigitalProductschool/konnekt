import type { DocumentType } from '@konnekt/api-types/document-types';
import type { RequestedDocument } from '@konnekt/api-types/form-connections';
import type { Language } from '@konnekt/rules/language';

import type { MenuAction } from '../../../components/ActionMenu/types';
import { matchesSearch } from '../../../components/ValuesPicker/utils';
import type { RulesBranch } from '../RulesStep/types';
import type { PendingRemoval, RemovedDataRule } from '../types';
import { offeredFieldsOf, removedDataRulesOf } from '../utils';
import {
  DOCUMENT_GLYPHS,
  DOCUMENTS_COPY,
  GENERIC_DOCUMENT_GLYPHS,
  MOVE_ICONS,
  REMOVAL_DIALOG_COPY,
  REMOVE_ICON,
  SEARCH_CARD_HEIGHTS,
} from './constants';
import type {
  DataCount,
  DocumentGlyphs,
  DocumentMenuCopy,
  DocumentsPager,
  DragListBox,
  DragPoint,
  DragPointerType,
  DragRowBox,
  DropLine,
  GroupCheckState,
  GroupedFields,
  ListedDocument,
  RemovalDialogCopy,
  RemovalDialogKind,
  RemovalQuestion,
  RowDragEvent,
  RowDragState,
  SearchGroups,
} from './types';

/**
 * The documents the list shows, in the editor's order (the team's, FR-045): those the catalog
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
 * The index a document takes in the list once added, or put back by "Undo" (FR-045): an added
 * document goes to the end, a restored one back to the index it had (`index`), clamped to the
 * list. Its present index when it is listed already.
 */
export function indexAfterAdding(
  listIds: readonly string[],
  documentId: string,
  index: number = listIds.length
): number {
  const present = listIds.indexOf(documentId);
  if (present !== -1) {
    return present;
  }
  return Math.min(Math.max(index, 0), listIds.length);
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
 * A document's data items under its group headings (S8 "Data groups"; FR-077, R8): the groups in
 * the order of the catalog's `field_groups`, each with its data items in the catalog's order, a
 * group without any left out. Null for a document without groups (10 data items or fewer), which
 * keeps the flat list, and for one with a data item outside its groups, so that no item is hidden.
 * The groups come from the catalog's document type, never from a connection's documents, whose
 * fields carry no group.
 */
export function groupedFieldsOf(documentType: DocumentType): GroupedFields[] | null {
  const groups = documentType.field_groups ?? [];
  const keys = new Set(groups.map((group) => group.key));
  if (groups.length === 0 || documentType.fields.some((field) => !keys.has(field.group ?? ''))) {
    return null;
  }
  return groups
    .map(({ key, label }) => ({
      key,
      label,
      fields: documentType.fields.filter((field) => field.group === key),
    }))
    .filter((group) => group.fields.length > 0);
}

/**
 * A group heading's checkbox (FR-079): `all` while each of its data items is chosen, `some`
 * (mixed) while only some are, `none` while none is.
 */
export function groupCheckStateOf(
  group: GroupedFields,
  chosenFields: readonly string[]
): GroupCheckState {
  const chosen = group.fields.filter((field) => chosenFields.includes(field.key)).length;
  if (chosen === 0) {
    return 'none';
  }
  return chosen === group.fields.length ? 'all' : 'some';
}

/**
 * The chosen data items after a group heading's checkbox is used (FR-079), as "All data items"
 * does for the document: a ticked group is cleared, its items leaving the others in their order;
 * a clear or mixed one gets all its items, those missing added at the end in the catalog's order.
 */
export function fieldsAfterGroupToggle(
  group: GroupedFields,
  chosenFields: readonly string[]
): string[] {
  const keys = group.fields.map((field) => field.key);
  if (groupCheckStateOf(group, chosenFields) === 'all') {
    return chosenFields.filter((field) => !keys.includes(field));
  }
  return [...chosenFields, ...keys.filter((key) => !chosenFields.includes(key))];
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
 * removal dialog names them ("Rule 02 in Standard"): what decides which question its "Remove
 * document" asks.
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
 * the note's "Remove it" when rules check it (U26), and a data group's checkbox (FR-079, with
 * "All data items"' words under its own title). The rules follow in one sentence, then that
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
    case 'group':
      return {
        title: copy.groupTitle(removal.label, removal.documentLabel),
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

/**
 * Where a row's ⋯ menu moves its document (S8 "Without dragging", FR-047; W13): "Move up" to
 * the row above, except on the first row, and "Move down" to the row below, except on the last;
 * null for an entry the row doesn't offer (both with one document).
 */
export function moveTargetsOf(
  index: number,
  count: number
): { up: number | null; down: number | null } {
  return {
    up: index > 0 && index < count ? index - 1 : null,
    down: index >= 0 && index < count - 1 ? index + 1 : null,
  };
}

/**
 * A row's ⋯ menu (W13; bug v5-ui-fixes B4, 2026-11-18): "Move up" and "Move down" where the row
 * offers them (`moveTargetsOf()`), then, after the divider, the red "Remove document", which
 * asks first (F72). Every row has it, a single document's too, where it holds only the removal,
 * without the divider, which only separates it from the moves above it.
 */
export function documentMenuOf(
  index: number,
  count: number,
  copy: DocumentMenuCopy,
  handlers: { onMove: (toIndex: number) => void; onRemove: () => void }
): MenuAction[] {
  const { up, down } = moveTargetsOf(index, count);
  const actions: MenuAction[] = [];
  if (up !== null) {
    actions.push({ label: copy.moveUp, icon: MOVE_ICONS.up, onSelect: () => handlers.onMove(up) });
  }
  if (down !== null) {
    actions.push({
      label: copy.moveDown,
      icon: MOVE_ICONS.down,
      onSelect: () => handlers.onMove(down),
    });
  }
  actions.push({
    label: copy.removeDocument,
    icon: REMOVE_ICON,
    danger: true,
    separated: actions.length > 0,
    onSelect: handlers.onRemove,
  });
  return actions;
}

/**
 * The polite announcement after a document moved to `toIndex` of the list, by the ⋯ menu or by
 * a drag (FR-047, copy.md §5): "“Driving licence” moved to position 1 of 2.". Null for a move
 * the editor refuses (a document the list doesn't show, an index outside the list, the place it
 * has), which changes nothing and so says nothing.
 */
export function moveAnnouncementOf(
  listed: readonly ListedDocument[],
  documentId: string,
  toIndex: number,
  language: Language
): string | null {
  const from = listed.findIndex(({ document }) => document.document_type === documentId);
  const outside = !Number.isInteger(toIndex) || toIndex < 0 || toIndex >= listed.length;
  if (from === -1 || outside || toIndex === from) {
    return null;
  }
  return DOCUMENTS_COPY[language].movedTo(
    listed[from].documentType.label,
    toIndex + 1,
    listed.length
  );
}

/** How far a mouse or pen moves before its press drags, and a touch before it scrolls (R6) */
export const ROW_DRAG_THRESHOLD_PX = 4;

/** How long a touch is held, without moving, before it drags (R6) */
export const ROW_DRAG_HOLD_MS = 400;

/** The drag's state with no row pressed: `rowDragReducer()`'s initial state */
export const ROW_DRAG_IDLE: RowDragState = { phase: 'idle', move: null };

/** The drag's pointer from `PointerEvent.pointerType`: a pointer it doesn't know drags as a mouse */
export function dragPointerTypeOf(pointerType: string): DragPointerType {
  return pointerType === 'touch' || pointerType === 'pen' ? pointerType : 'mouse';
}

/** The pointer has moved more than `ROW_DRAG_THRESHOLD_PX` from where it went down */
function movedPast(origin: DragPoint, position: DragPoint): boolean {
  return Math.hypot(position.x - origin.x, position.y - origin.y) > ROW_DRAG_THRESHOLD_PX;
}

/** The point lies in the list's box, its edges included */
function inside(list: DragListBox, { x, y }: DragPoint): boolean {
  return x >= list.left && x <= list.right && y >= list.top && y <= list.bottom;
}

/**
 * The index the document at `from` takes when released at the height `y` (S8 "Dragging"): the
 * gap below every row whose middle lies above `y`, so that the document passes a neighbour once
 * the pointer crosses the neighbour's middle. Above the first row it is 0, below the last it is
 * the last index; `from` while the pointer stays between its neighbours' middles.
 */
export function dropTargetOf(rows: readonly DragRowBox[], from: number, y: number): number {
  const gap = rows.filter(({ top, bottom }) => (top + bottom) / 2 < y).length;
  return gap > from ? gap - 1 : gap;
}

/**
 * The drop line while dragging (S8 "Dragging"): the gap where the document lands, above the row
 * it takes the place of when it moves up, below it when it moves down, above its own row while it
 * stays (a release there answers no move). Its `y` is the gap's middle, the first row's top or
 * the last row's bottom. Null unless a row is dragged.
 */
export function dropLineOf(state: RowDragState): DropLine | null {
  if (state.phase !== 'dragging') {
    return null;
  }
  const { rows, index, target } = state;
  const gap = target > index ? target + 1 : target;
  const above = rows[gap - 1];
  const below = rows[gap];
  const y = above && below ? (above.bottom + below.top) / 2 : (below?.top ?? above?.bottom ?? 0);
  return { gap, y };
}

/**
 * How far the faded copy of the dragged row is from the row's place: the pointer's way from
 * where it went down, which the hook sets as `--drag-x` / `--drag-y`. Null unless a row is
 * dragged.
 */
export function dragOffsetOf(state: RowDragState): DragPoint | null {
  if (state.phase !== 'dragging') {
    return null;
  }
  return { x: state.position.x - state.origin.x, y: state.position.y - state.origin.y };
}

/**
 * A touch is pressed and waits for its hold: the hook runs its `ROW_DRAG_HOLD_MS` timer while
 * this holds, and clears it once it doesn't.
 */
export function waitsForHold(state: RowDragState): boolean {
  return state.phase === 'pressed' && state.pointer.type === 'touch';
}

/**
 * A touch drags: the hook's non-passive `touchmove` listener prevents the page's scrolling only
 * while this holds.
 */
export function touchDragArmed(state: RowDragState): boolean {
  return state.phase === 'dragging' && state.pointer.type === 'touch';
}

/** The pressed row starts to drag at `position`, its target from the pointer's height */
function startDragging(
  state: Extract<RowDragState, { phase: 'pressed' }>,
  position: DragPoint
): RowDragState {
  return {
    ...state,
    phase: 'dragging',
    position,
    target: dropTargetOf(state.rows, state.index, position.y),
  };
}

/**
 * The drag's state machine (S8 "Dragging", FR-046, R6): pure, with no DOM and no timer; the hook
 * (`useRowDrag`) feeds it the pointer's events, the measured boxes and the hold timer's ticks.
 *
 * - A press on a row is `pressed`. A mouse or pen drags once it moves more than 4 px; a touch
 *   drags after 400 ms (a `tick`, or a move, at or after the hold's end) without moving more than
 *   4 px, and a touch that moves earlier returns to `idle`, so that the list scrolls.
 * - While dragging, the target index follows the pointer's height against the rows' boxes.
 * - A release inside the list answers the move (`move` of the `idle` state), unless the document
 *   lands on its own place. A release outside the list, a cancel, Escape and a second pointer end
 *   the drag with no move. A release before the drag starts is a click: no move.
 * - Events of another pointer, and ticks while nothing waits, change nothing (the same state).
 */
export function rowDragReducer(state: RowDragState, event: RowDragEvent): RowDragState {
  if (state.phase === 'idle') {
    if (event.type !== 'down' || event.index < 0 || event.index >= event.rows.length) {
      return state;
    }
    return {
      phase: 'pressed',
      pointer: { id: event.pointerId, type: event.pointerType },
      index: event.index,
      origin: event.position,
      pressedAt: event.time,
      rows: event.rows,
      list: event.list,
    };
  }
  switch (event.type) {
    case 'down':
      // A second pointer: the drag ends and the order stays
      return ROW_DRAG_IDLE;
    case 'escape':
      return ROW_DRAG_IDLE;
    case 'cancel':
      return event.pointerId === undefined || event.pointerId === state.pointer.id
        ? ROW_DRAG_IDLE
        : state;
    case 'tick':
      return state.phase === 'pressed' &&
        state.pointer.type === 'touch' &&
        event.time - state.pressedAt >= ROW_DRAG_HOLD_MS
        ? startDragging(state, state.origin)
        : state;
    case 'up': {
      if (event.pointerId !== state.pointer.id) {
        return state;
      }
      if (state.phase === 'pressed' || !inside(state.list, event.position)) {
        return ROW_DRAG_IDLE;
      }
      const to = dropTargetOf(state.rows, state.index, event.position.y);
      return to === state.index
        ? ROW_DRAG_IDLE
        : { phase: 'idle', move: { from: state.index, to } };
    }
    case 'move': {
      if (event.pointerId !== state.pointer.id) {
        return state;
      }
      const measured = {
        rows: event.rows ?? state.rows,
        list: event.list ?? state.list,
      };
      if (state.phase === 'dragging') {
        return {
          ...state,
          ...measured,
          position: event.position,
          target: dropTargetOf(measured.rows, state.index, event.position.y),
        };
      }
      const held = event.time - state.pressedAt >= ROW_DRAG_HOLD_MS;
      if (state.pointer.type === 'touch' && !held) {
        // A touch that moves before its hold scrolls the list
        return movedPast(state.origin, event.position) ? ROW_DRAG_IDLE : state;
      }
      if (state.pointer.type !== 'touch' && !movedPast(state.origin, event.position)) {
        return state;
      }
      return startDragging({ ...state, ...measured }, event.position);
    }
  }
}
