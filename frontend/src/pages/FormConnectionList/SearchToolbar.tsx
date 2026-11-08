import { useId } from 'react';

import { SEARCH_COPY } from './constants';
import type { SearchToolbarProps } from './types';

/**
 * The overview's toolbar (Figma U11 6699:44247, build note U04 #16 "Count on the left, search
 * (360 px) on the right; × in the field clears it"): the count, "3 connections", or while
 * searching "1 of 3 connections" (FR-051 (27), (28)), and the search field ("Data/Search field",
 * KERN's input with the search icon) with a visible label (FR-051 (27), 001-S7.4; the frames draw
 * the placeholder only) and, once something is typed, the × that empties it and keeps the focus
 * in the field (6692:42636). The count is a polite status, so a screen reader hears how many rows
 * a search leaves. The search filters in the page (`filterConnections`); nothing is sent. Below
 * 640px the label goes above the field, which then takes the column's width (undrawn).
 */
export default function SearchToolbar({
  query,
  onQueryChange,
  shown,
  total,
  inputRef,
  countId,
  listId,
}: SearchToolbarProps) {
  const fieldId = useId();
  const searching = query.trim() !== '';
  const clear = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-24 gap-y-8">
      <p
        id={countId}
        role="status"
        className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold"
      >
        {searching ? SEARCH_COPY.countOf(shown, total) : SEARCH_COPY.count(total)}
      </p>
      <div
        role="search"
        className="flex w-full flex-col gap-8 sm:w-auto sm:flex-row sm:items-center sm:gap-16"
      >
        <label htmlFor={fieldId} className="kern-label shrink-0 py-0!">
          {SEARCH_COPY.label}
        </label>
        <div className="relative w-full sm:w-360">
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            value={query}
            placeholder={SEARCH_COPY.placeholder}
            aria-controls={listId}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => onQueryChange(event.target.value)}
            className="kern-form-input__input placeholder:text-kern-layout-text-muted pr-48! pl-44!"
          />
          <span
            aria-hidden="true"
            className="kern-icon kern-icon--search kern-icon--small bg-kern-action-default! pointer-events-none absolute top-14 left-16"
          />
          {query !== '' && (
            // "button-tertiary-small · Clear search": 40px seen in a 48px slot at the field's end
            // (kern.css positions its buttons itself and gives the small one 4px above and below)
            <span className="absolute top-0 right-4 flex">
              <button
                type="button"
                onClick={clear}
                className="kern-btn kern-btn--tertiary kern-btn--small w-40! px-0!"
              >
                <span aria-hidden="true" className="kern-icon kern-icon--close kern-icon--small" />
                <span className="sr-only">{SEARCH_COPY.clear}</span>
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
