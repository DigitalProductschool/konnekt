import { Link } from 'react-router';

import { APP_NAME } from '../../constants';
import type { TopBarProps } from './types';

const LOGO_CLASSES = 'gap-kern-space-small flex shrink-0 items-center';

/**
 * Figma "App/Top bar": the product logo, and on signed-in screens the user. With a title
 * and the column width it is "App/Header", which the wizard uses.
 */
export default function TopBar({ title, width = 'full', logoTo, children }: TopBarProps) {
  const logo = (
    <>
      <span aria-hidden="true" className="rounded-kern-small bg-kern-layout-text-default size-16" />
      <span className="text-kern-static-small text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold">
        {APP_NAME}
      </span>
    </>
  );

  return (
    <header
      className={`border-kern-neutral-100 bg-kern-layout-background-default flex h-64 border-b px-16 ${width === 'full' ? 'sm:px-32' : ''}`}
    >
      <div
        className={`flex w-full min-w-0 items-center gap-16 ${width === 'column' ? 'mx-auto max-w-1120' : ''}`}
      >
        {logoTo ? (
          <Link
            to={logoTo}
            className={`${LOGO_CLASSES} rounded-kern-small focus-visible:outline-kern-action-focus-default focus-visible:outline-4 focus-visible:outline-offset-2`}
          >
            {logo}
          </Link>
        ) : (
          <div className={LOGO_CLASSES}>{logo}</div>
        )}
        {title && (
          <>
            <span aria-hidden="true" className="bg-kern-neutral-100 h-24 w-1 shrink-0" />
            <span className="text-kern-static-small text-kern-layout-text-default min-w-0 truncate leading-(--kern-typography-line-height-medium-static) font-semibold">
              {title}
            </span>
          </>
        )}
        <div className="flex-1" />
        {children}
      </div>
    </header>
  );
}
