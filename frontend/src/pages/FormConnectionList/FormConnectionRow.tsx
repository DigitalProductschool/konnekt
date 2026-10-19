import { generatePath, Link } from 'react-router';

import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import { ROUTES } from '../../constants';
import { LIST_COPY } from './constants';
import type { FormConnectionRowProps } from './types';
import { formatEditedDate } from './utils';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * Figma "UseCase/Row": name and form ID, whether the connection is live or deactivated, and
 * its last change, with "Edit" and "View" to the details.
 */
export default function FormConnectionRow({ formConnection }: FormConnectionRowProps) {
  const {
    id,
    name,
    servicebw_form: servicebwForm,
    is_active: isActive,
    updated_at: updatedAt,
  } = formConnection;
  return (
    <li className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex flex-wrap items-center gap-x-16 gap-y-8 border py-12 pr-12 pl-16">
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-260 sm:shrink-0">
        <p className="text-kern-static-medium text-kern-layout-text-default truncate font-semibold">
          {name}
        </p>
        <p className={`${SMALL_TEXT} text-kern-layout-text-muted truncate`}>
          {LIST_COPY.formId(servicebwForm)}
        </p>
      </div>
      <div className="flex sm:w-130 sm:shrink-0">
        <ConnectionStatusBadge isActive={isActive} />
      </div>
      <p className={`${SMALL_TEXT} text-kern-layout-text-muted whitespace-nowrap`}>
        {LIST_COPY.edited(formatEditedDate(updatedAt))}
      </p>
      <div className="flex-1" />
      {/* The actions wrap together on narrow screens */}
      <div className="flex gap-16">
        <Link
          to={generatePath(ROUTES.editFormConnection, { id })}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span className="kern-label underline">
            {LIST_COPY.edit}
            <span className="sr-only"> {name}</span>
          </span>
        </Link>
        <Link
          to={generatePath(ROUTES.formConnection, { id })}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span className="kern-label underline">
            {LIST_COPY.view}
            {/* "View" alone doesn't say which connection. Not kern-sr-only: inside a
                kern-btn it makes the button icon-sized */}
            <span className="sr-only"> {name}</span>
          </span>
        </Link>
      </div>
    </li>
  );
}
