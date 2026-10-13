import { Link } from 'react-router';

import { APP_NAME } from '../../constants';
import type { TopBarProps } from './types';

const LOGO_CLASSES = 'gap-kern-space-small flex shrink-0 items-center';
const SMALL_TEXT =
  'text-kern-static-small leading-(--kern-typography-line-height-medium-static) min-w-0 truncate';

/**
 * Figma "App/Top bar": the product logo, and on signed-in screens the user. With a title
 * and the column width it is "App/Header", which the wizard and the details screen use; the
 * details add the status badge after the title and the form ID before the user. Below `sm`
 * the badge and the meta are hidden, so that the name keeps some room.
 */
export default function TopBar({
  title,
  titleAsHeading = false,
  badge,
  meta,
  width = 'full',
  logoTo,
  children,
}: TopBarProps) {
  const TitleTag = titleAsHeading ? 'h1' : 'span';
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
            <TitleTag className={`${SMALL_TEXT} text-kern-layout-text-default font-semibold`}>
              {title}
            </TitleTag>
          </>
        )}
        {badge && <div className="hidden shrink-0 sm:flex">{badge}</div>}
        <div className="flex-1" />
        {meta && (
          <p className={`${SMALL_TEXT} text-kern-layout-text-muted hidden sm:block`}>{meta}</p>
        )}
        {children}
      </div>
    </header>
  );
}
