import { Link } from 'react-router';

import { ROUTES } from '../../constants';
import { LOCAL_DRAFT_PARAM } from '../../utils/localDrafts/constants';
import { displayNameOf } from '../../utils/localDrafts/content';
import { LOCAL_DRAFTS_COPY } from './constants';
import type { LocalDraftItemProps } from './types';
import { metaLineOf } from './utils';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * One local draft of the offer (S4, W5): its name ("Untitled connection" without one), what it
 * belongs to and when it last changed, "Resume" to the flow (FR-017) and "Discard", which the
 * offer confirms first. Both actions name the connection for screen readers.
 */
export default function LocalDraftItem({ record, resumeRef, onDiscard }: LocalDraftItemProps) {
  const name = displayNameOf(record.content);
  const search = new URLSearchParams({ [LOCAL_DRAFT_PARAM]: record.flowKey });
  return (
    <li className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex flex-wrap items-center gap-x-16 gap-y-8 border py-12 pr-12 pl-16">
      <div className="flex min-w-0 flex-1 basis-240 flex-col gap-2">
        <p className="text-kern-static-medium text-kern-layout-text-default truncate font-semibold">
          {name}
        </p>
        <p className={`${SMALL_TEXT} text-kern-layout-text-muted`}>{metaLineOf(record)}</p>
      </div>
      {/* The actions wrap together on narrow screens */}
      <div className="flex gap-16">
        <Link
          ref={resumeRef}
          to={`${ROUTES.newFormConnection}?${search.toString()}`}
          className="kern-btn kern-btn--secondary kern-btn--small"
        >
          <span className="kern-label">
            {LOCAL_DRAFTS_COPY.resume}
            {/* Not kern-sr-only: inside a kern-btn it makes the button icon-sized */}
            <span className="sr-only"> {name}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => onDiscard(record)}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span className="kern-label">
            {LOCAL_DRAFTS_COPY.discard}
            <span className="sr-only"> {name}</span>
          </span>
        </button>
      </div>
    </li>
  );
}
