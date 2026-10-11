import { useId, useState } from 'react';

import expandLessIcon from '../../assets/icons/expand-less.svg';
import expandMoreIcon from '../../assets/icons/expand-more.svg';
import { EDITOR_COPY, UPCOMING_DOCUMENTS } from './constants';
import UpcomingDocumentItem from './UpcomingDocumentItem';

const MUTED_TEXT =
  'text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)';

/**
 * Figma "Nav/Coming soon": documents that can't be added yet, closed by default so that it
 * never pushes the list down.
 */
export default function UpcomingDocuments() {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={`${MUTED_TEXT} rounded-kern-small focus-visible:outline-kern-action-focus-default flex w-full cursor-pointer items-center gap-8 px-10 py-8 text-left font-semibold focus-visible:outline-4 focus-visible:-outline-offset-4`}
      >
        <span className="flex-1">{EDITOR_COPY.upcoming(UPCOMING_DOCUMENTS.length)}</span>
        <img src={open ? expandLessIcon : expandMoreIcon} alt="" className="size-20" />
      </button>
      <div id={listId} hidden={!open} className="flex flex-col gap-4">
        <p className={`${MUTED_TEXT} px-10 pb-4`}>{EDITOR_COPY.upcomingNote}</p>
        <ul className="flex flex-col gap-4">
          {UPCOMING_DOCUMENTS.map((name) => (
            <UpcomingDocumentItem key={name} name={name} />
          ))}
        </ul>
      </div>
    </div>
  );
}
