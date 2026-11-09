import { Link } from 'react-router';

import { ROUTES } from '../../constants';
import { LOCAL_DRAFT_PARAM } from '../../utils/localDrafts/constants';
import { displayNameOf } from '../../utils/localDrafts/content';
import { ITEM_DIVIDER, LOCAL_DRAFTS_COPY, SMALL_TEXT } from './constants';
import type { LocalDraftItemProps } from './types';
import { metaLineOf } from './utils';

/**
 * One local draft of the banner (S5; U16 `7362:54625`): its name ("Untitled connection" without
 * one), "Edited · …" or "New, never saved · …", "Discard" (tertiary), which the offer confirms
 * first, and "Resume editing" (secondary) to the flow (FR-029e). Both buttons name the
 * connection for screen readers. As the only draft (FR-029d) the heading names it: the item
 * shows only its buttons, and its name and line stay for screen readers.
 */
export default function LocalDraftItem({
  record,
  only,
  resumeRef,
  onDiscard,
}: LocalDraftItemProps) {
  const name = displayNameOf(record.content);
  const search = new URLSearchParams({ [LOCAL_DRAFT_PARAM]: record.flowKey });
  // As the only draft, the name and line are for screen readers alone
  const nameClass = only
    ? 'sr-only'
    : `w-280 max-w-full font-semibold wrap-break-word ${SMALL_TEXT} text-kern-layout-text-default`;
  const lineClass = only
    ? 'sr-only'
    : `min-w-0 flex-1 basis-160 ${SMALL_TEXT} text-kern-layout-text-muted`;
  return (
    <li
      className={
        only ? 'flex gap-16' : `flex flex-wrap items-center gap-x-16 border-t py-8 ${ITEM_DIVIDER}`
      }
    >
      <p className={nameClass}>{name}</p>
      <p className={lineClass}>{metaLineOf(record)}</p>
      {/* The two buttons wrap together on narrow screens */}
      <div className="flex shrink-0 flex-wrap gap-16">
        <button
          type="button"
          onClick={() => onDiscard(record)}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span className="kern-label">
            {LOCAL_DRAFTS_COPY.discard}
            {/* Not kern-sr-only: inside a kern-btn it makes the button icon-sized */}
            <span className="sr-only"> {LOCAL_DRAFTS_COPY.discardHidden(name)}</span>
          </span>
        </button>
        <Link
          ref={resumeRef}
          to={`${ROUTES.newFormConnection}?${search.toString()}`}
          className="kern-btn kern-btn--secondary kern-btn--small"
        >
          <span aria-hidden="true" className="kern-icon kern-icon--edit" />
          <span className="kern-label">
            {LOCAL_DRAFTS_COPY.resume}
            <span className="sr-only"> {name}</span>
          </span>
        </Link>
      </div>
    </li>
  );
}
