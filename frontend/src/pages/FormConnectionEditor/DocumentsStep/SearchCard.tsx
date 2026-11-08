import type { DocumentType } from '@connection-portal/api-types/document-types';
import { type FocusEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import MenuSearchField from '../../../components/MenuSearchField';
import {
  MENU_MAX_HEIGHT_CLASSES,
  type MenuPlacement,
  placementFrom,
  popupWrapperClass,
} from '../../../utils/popupPlacement';
import {
  DOCUMENTS_STEP_COPY,
  DOCUMENTS_STEP_IDS,
  SEARCH_CARD_FULL_WRAPPERS,
  SEARCH_CARD_PLACEMENTS,
  SEARCH_CARD_WIDTH,
} from './constants';
import SearchResultItem from './SearchResultItem';
import type { SearchCardProps } from './types';
import { searchCardHeight, searchGroupsOf } from './utils';

const BUTTON =
  'rounded-kern-default text-kern-static-small focus-visible:outline-kern-action-focus-default motion flex h-36 cursor-pointer items-center gap-4 px-16 py-8 leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap transition-colors duration-(--duration-colour) focus-visible:outline-4 focus-visible:outline-offset-2';
// "Add document" (U04 #37): filled while no document is added, the dashed "Rules/Add button"
// once one is; pressed while its card is open (U20 7290:60519, U21 7290:61927), which hover
// shows too. The two pressed fills are the frames' hexes: KERN 2.8 has no token for either
const FILLED = 'bg-kern-action-default text-kern-action-on-default hover:bg-[#1643c1]';
const FILLED_OPEN = 'bg-[#1643c1] text-kern-action-on-default';
const OUTLINE =
  'border border-dashed border-kern-action-default bg-kern-layout-background-default text-kern-action-default hover:bg-[#eef3fe]';
const OUTLINE_OPEN = 'border border-kern-action-default bg-[#eef3fe] text-kern-action-default';
const GROUP_LABEL =
  'text-kern-static-small text-kern-layout-text-muted pt-8 pb-4 pl-8 leading-(--kern-typography-line-height-medium-static) font-semibold';

/**
 * "Add document" and its card (U20 7290:60525, 7290:60990; U21 7290:61989; FR-031, FR-052e):
 * the button opens the card under it, with the search field "Find a document" focused and the
 * catalog's documents in two groups, "Available (n)" to add and "Added (n)" greyed, each in
 * catalog order and filtered as the team member types, or "No documents match “…”." Picking a
 * document adds it and closes the card (U21 A5); no "Coming soon" (F3). From the field, ↓ moves
 * into the documents and Enter adds the first available one; ↑ / ↓ move between them, ↑ from the
 * first back to the field; Escape closes the card with the focus on the button; leaving it with
 * Tab or a click outside closes it. Its side and direction come from `placementFrom()` (R10); its
 * results scroll inside the card where it is taller than the space.
 */
export default function SearchCard({
  documentTypes,
  documents,
  query,
  filled,
  describedBy,
  onSearch,
  onClearSearch,
  onAdd,
}: SearchCardProps) {
  // Where the open card is placed; null while it is closed
  const [placement, setPlacement] = useState<MenuPlacement | null>(null);
  const open = placement !== null;
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const groups = searchGroupsOf(documentTypes, documents, query);
  const pickable = groups.available;

  useEffect(() => {
    if (!open) {
      return;
    }
    document.getElementById(DOCUMENTS_STEP_IDS.searchField)?.focus({ preventScroll: true });
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        close(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
    // Only when the card opens or closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openCard() {
    const all = searchGroupsOf(documentTypes, documents, '');
    setPlacement(
      placementFrom(containerRef.current, SEARCH_CARD_WIDTH, 'start', 0, searchCardHeight(all))
    );
  }

  function close(returnFocus: boolean) {
    setPlacement(null);
    onClearSearch();
    if (returnFocus) {
      document.getElementById(DOCUMENTS_STEP_IDS.addDocument)?.focus();
    }
  }

  function pick(documentType: DocumentType) {
    close(true);
    onAdd(documentType);
  }

  function rowButtons(): HTMLButtonElement[] {
    return [...(resultsRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
  }

  function handleFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      rowButtons()[0]?.focus();
    } else if (event.key === 'Enter' && pickable.length > 0) {
      event.preventDefault();
      pick(pickable[0]);
    }
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const rows = rowButtons();
    const index = rows.indexOf(event.currentTarget);
    const next = rows[index + (event.key === 'ArrowDown' ? 1 : -1)];
    if (next) {
      next.focus();
    } else if (event.key === 'ArrowUp') {
      document.getElementById(DOCUMENTS_STEP_IDS.searchField)?.focus();
    }
  }

  // Escape anywhere in the card
  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  }

  // Tab or Shift+Tab out of the button and its card. A press on a row's text blurs to nowhere
  // (relatedTarget null) and must not close it; a pointer outside closes it through the listener
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (open && next && !containerRef.current?.contains(next)) {
      close(false);
    }
  }

  const look = filled ? (open ? FILLED_OPEN : FILLED) : open ? OUTLINE_OPEN : OUTLINE;
  const iconColour = filled ? 'bg-kern-action-on-default!' : 'bg-kern-action-default!';

  return (
    <div
      ref={containerRef}
      className={
        placement?.side === 'full'
          ? SEARCH_CARD_FULL_WRAPPERS[placement.direction]
          : popupWrapperClass(placement?.side ?? null)
      }
      onBlur={handleBlur}
    >
      <button
        id={DOCUMENTS_STEP_IDS.addDocument}
        type="button"
        aria-expanded={open}
        aria-controls={open ? DOCUMENTS_STEP_IDS.searchCard : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close(false) : openCard())}
        className={`${BUTTON} ${look}`}
      >
        <span
          aria-hidden="true"
          className={`kern-icon kern-icon--add kern-icon--small ${iconColour}`}
        />
        {DOCUMENTS_STEP_COPY.addDocument}
      </button>
      {placement && (
        <div
          id={DOCUMENTS_STEP_IDS.searchCard}
          onKeyDown={handleCardKeyDown}
          className={`rounded-kern-default bg-kern-layout-background-default shadow-menu absolute z-40 flex flex-col gap-8 border border-(--kern-color-decorative-border-default) p-12 ${MENU_MAX_HEIGHT_CLASSES[placement.maxHeight]} ${SEARCH_CARD_PLACEMENTS[placement.side][placement.direction]}`}
        >
          <MenuSearchField
            id={DOCUMENTS_STEP_IDS.searchField}
            variant="panel"
            placeholder={DOCUMENTS_STEP_COPY.findDocument}
            value={query}
            controls={`${DOCUMENTS_STEP_IDS.searchCard}-results`}
            onChange={onSearch}
            onKeyDown={handleFieldKeyDown}
          />
          <div
            ref={resultsRef}
            id={`${DOCUMENTS_STEP_IDS.searchCard}-results`}
            className="flex min-h-0 flex-col overflow-y-auto"
          >
            {groups.available.length > 0 && (
              <div role="group" aria-labelledby={DOCUMENTS_STEP_IDS.availableGroup}>
                <p id={DOCUMENTS_STEP_IDS.availableGroup} className={GROUP_LABEL}>
                  {DOCUMENTS_STEP_COPY.availableGroup(groups.available.length)}
                </p>
                <ul>
                  {groups.available.map((documentType) => (
                    <SearchResultItem
                      key={documentType.key}
                      documentType={documentType}
                      added={false}
                      onPick={() => pick(documentType)}
                      onKeyDown={handleRowKeyDown}
                    />
                  ))}
                </ul>
              </div>
            )}
            {groups.added.length > 0 && (
              <div role="group" aria-labelledby={DOCUMENTS_STEP_IDS.addedGroup}>
                <p id={DOCUMENTS_STEP_IDS.addedGroup} className={GROUP_LABEL}>
                  {DOCUMENTS_STEP_COPY.addedGroup(groups.added.length)}
                </p>
                <ul>
                  {groups.added.map((documentType) => (
                    <SearchResultItem key={documentType.key} documentType={documentType} added />
                  ))}
                </ul>
              </div>
            )}
            {/* Announced as the typing finds nothing */}
            <p
              role="status"
              className={
                groups.noMatches
                  ? 'text-kern-static-small text-kern-layout-text-default py-12 pl-8 leading-(--kern-typography-line-height-medium-static)'
                  : 'sr-only'
              }
            >
              {groups.noMatches ? DOCUMENTS_STEP_COPY.noMatches(query.trim()) : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
