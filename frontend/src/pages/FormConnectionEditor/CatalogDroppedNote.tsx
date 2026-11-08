import { useId } from 'react';

import CatalogDroppedItem from './CatalogDroppedItem';
import { DRAFT_COPY } from './constants';
import type { CatalogDroppedNoteProps } from './types';

/**
 * The note on data the catalog no longer offers (S8; W6; 005-S8; FR-003 edge case), at the top of
 * the documents step, above the panels: KERN's warning alert with a body (the §3 "Alert, page
 * level" pattern, T017; F22: the body keeps its list and "Remove it"), "The wallet no longer
 * offers some data of this draft", that lists each dropped document or field, and "Remove it",
 * which stops requesting all of it at once (rules that check it are named first, in spec 002's
 * removal dialog). "Save and exit" and publishing are refused with the server's message while it
 * remains. Not drawn: the words are 005-S8's.
 *
 * Built from KERN's alert classes, as `KernAlert` renders them (the header's icon at the overlay's
 * 32px), rather than `KernAlert` itself, which puts its content in a `<p>` that can't hold the
 * list. It isn't a live region: it shows when the step opens, and when the flow moved to this
 * step for it, the page focuses it through `ref` (`tabIndex={-1}`).
 */
export default function CatalogDroppedNote({ items, onRemove, ref }: CatalogDroppedNoteProps) {
  const titleId = useId();
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="kern-alert kern-alert--warning w-full"
    >
      <div className="kern-alert__header">
        <span aria-hidden="true" className="kern-icon kern-icon--warning" />
        <span id={titleId} className="kern-title">
          {DRAFT_COPY.catalogDroppedTitle}
        </span>
      </div>
      <div className="kern-alert__body flex flex-col items-start gap-24">
        <ul className="kern-list kern-list--bullet">
          {items.map((item) => (
            <CatalogDroppedItem key={`${item.documentType}/${item.field ?? ''}`} item={item} />
          ))}
        </ul>
        <button
          type="button"
          onClick={onRemove}
          className="kern-btn kern-btn--secondary kern-btn--small"
        >
          <span className="kern-label">{DRAFT_COPY.removeIt}</span>
        </button>
      </div>
    </section>
  );
}
