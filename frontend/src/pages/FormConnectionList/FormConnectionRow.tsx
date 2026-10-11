import { generatePath, Link } from 'react-router';

import { ROUTES } from '../../constants';
import { LIST_COPY } from './constants';
import type { FormConnectionRowProps } from './types';
import { formatEditedDate } from './utils';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * Figma "UseCase/Row": name, form ID and last change, with "View" to the details. The
 * active/deactivated badge and "Edit" come with User Story 4.
 */
export default function FormConnectionRow({ formConnection }: FormConnectionRowProps) {
  const { id, name, servicebw_form: servicebwForm, updated_at: updatedAt } = formConnection;
  return (
    <li className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex flex-wrap items-center gap-x-16 border py-12 pr-12 pl-16">
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-260 sm:shrink-0">
        <p className="text-kern-static-medium text-kern-layout-text-default truncate font-semibold">
          {name}
        </p>
        <p className={`${SMALL_TEXT} text-kern-layout-text-muted truncate`}>
          {LIST_COPY.formId(servicebwForm)}
        </p>
      </div>
      <p className={`${SMALL_TEXT} text-kern-layout-text-muted whitespace-nowrap`}>
        {LIST_COPY.edited(formatEditedDate(updatedAt))}
      </p>
      <div className="flex-1" />
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
    </li>
  );
}
