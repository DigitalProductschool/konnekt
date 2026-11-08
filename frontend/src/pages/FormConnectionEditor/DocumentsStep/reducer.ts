import type { DocumentsViewAction, DocumentsViewState } from './types';
import { indexAfterAdding, indexAfterRemoval, shownIndexOf } from './utils';

/**
 * A document has left the list with its undo toast (FR-031): the removal waits for "Undo", the
 * selection moves to a neighbour when the document was shown (U24 A12), its needs-data flag goes,
 * and a question about it is answered. A newer removal replaces an older one, as its toast
 * replaces the older toast.
 */
function removed(
  state: DocumentsViewState,
  documentId: string,
  listIds: readonly string[]
): DocumentsViewState {
  const flagged = state.needsData.documentIds;
  return {
    ...state,
    selectedIndex: indexAfterRemoval(listIds, state.selectedIndex, [documentId]),
    pendingRemoval: { documentId },
    needsData: flagged.includes(documentId)
      ? { ...state.needsData, documentIds: flagged.filter((id) => id !== documentId) }
      : state.needsData,
    confirmRemoval: state.confirmRemoval?.documentId === documentId ? null : state.confirmRemoval,
  };
}

/**
 * The documents step's view (research R8, data-model "The documents step"): the shown document,
 * the search, the removal waiting for "Undo", the removal question (F72) and the needs-data flags
 * and dialog (F67). The documents and their fields stay the editor's (`editorReducer`): an action
 * that reports a change to them follows the editor's own action, and carries the list as it was
 * shown (`listIds`).
 */
export function documentsViewReducer(
  state: DocumentsViewState,
  action: DocumentsViewAction
): DocumentsViewState {
  switch (action.type) {
    case 'select': {
      const selectedIndex = Math.max(action.index, 0);
      return selectedIndex === state.selectedIndex ? state : { ...state, selectedIndex };
    }
    case 'search':
      return action.query === state.query ? state : { ...state, query: action.query };
    case 'clearSearch':
      return state.query === '' ? state : { ...state, query: '' };
    case 'removeInline':
      return removed(state, action.documentId, action.listIds);
    case 'undoRemoval': {
      const { pendingRemoval } = state;
      if (pendingRemoval === null) {
        return state;
      }
      // The document shows again where the catalog puts it, with the focus going to it
      return {
        ...state,
        selectedIndex: indexAfterAdding(
          action.listIds,
          pendingRemoval.documentId,
          action.catalogOrder
        ),
        pendingRemoval: null,
      };
    }
    case 'expireRemoval':
      if (
        state.pendingRemoval === null ||
        (action.documentId !== undefined && action.documentId !== state.pendingRemoval.documentId)
      ) {
        return state;
      }
      return { ...state, pendingRemoval: null };
    case 'askRemoval':
      // An earlier removal keeps its toast and "Undo" while the question is open
      return {
        ...state,
        confirmRemoval: { documentId: action.documentId, rules: action.rules },
      };
    case 'keepDocument':
      return state.confirmRemoval === null ? state : { ...state, confirmRemoval: null };
    case 'confirmRemovalDone':
      return state.confirmRemoval === null
        ? state
        : removed(state, state.confirmRemoval.documentId, action.listIds);
    case 'flagNeedsData': {
      // Each "Set rules →" flags anew: a document whose data was chosen meanwhile isn't kept
      const documentIds = [...new Set(action.documentIds)];
      return { ...state, needsData: { documentIds, asking: documentIds.length > 0 } };
    }
    case 'chooseData': {
      const flagged = state.needsData.documentIds;
      const shown = action.listIds[shownIndexOf(state.selectedIndex, action.listIds.length)];
      const first = action.listIds.findIndex((id) => flagged.includes(id));
      // The shown document stays when it is flagged; otherwise the first flagged one shows
      const selectedIndex =
        (shown !== undefined && flagged.includes(shown)) || first === -1
          ? state.selectedIndex
          : first;
      return { ...state, selectedIndex, needsData: { documentIds: flagged, asking: false } };
    }
    case 'removeNeedsDataDone':
      return {
        ...state,
        selectedIndex: indexAfterRemoval(
          action.listIds,
          state.selectedIndex,
          state.needsData.documentIds
        ),
        needsData: { documentIds: [], asking: false },
      };
  }
}
