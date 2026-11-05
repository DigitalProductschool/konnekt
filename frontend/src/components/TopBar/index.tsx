import { Link } from 'react-router';

import { APP_NAME } from '../../constants';
import type { TopBarProps } from './types';

const LOGO_CLASSES = 'gap-kern-space-small order-1 flex shrink-0 items-center';
// The title: truncated from `lg` only; below, it has a row of its own and wraps
const SMALL_TEXT =
  'text-kern-static-small leading-(--kern-typography-line-height-medium-static) min-w-0 wrap-break-word lg:truncate';
// The meta: one line at every width. Below `lg`, at most the second row's width. On `lg`,
// `flex-1` (basis 0) takes only the space the others leave, so it never shortens the title,
// and keeps 96 px so that the "…" stays visible
const META_TEXT =
  'text-kern-static-small leading-(--kern-typography-line-height-medium-static) max-w-full min-w-0 truncate lg:min-w-96 lg:flex-1 lg:text-right';

/**
 * Figma "App/Top bar": the product logo, and on signed-in screens the user. With a title it
 * is "App/Header", which the wizard and the details screen use; the details add the status
 * badge after the title and the description before the user. The logo leads at the left edge on
 * every screen (Figma 2026-10-13). Below `lg`, which the design has no frame for, the title,
 * the badge and the meta move to a second row and wrap; the title itself wraps too, so that it
 * is not cut off at 320 px or at 200% zoom (WCAG 1.4.10, decision 2026-10-19). The meta is the
 * connection's description: one line at every width, cut with "…". It has no `title`
 * attribute, since the element holds the whole text for assistive technology (spec 006, R6).
 */
export default function TopBar({
  title,
  titleAsHeading = false,
  badge,
  meta,
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
      className={`border-kern-neutral-100 bg-kern-layout-background-default flex border-b px-16 sm:px-32 lg:h-64 lg:pb-0 ${title ? 'pb-12' : 'h-64'}`}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-16 gap-y-4 lg:flex-nowrap">
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
            <span
              aria-hidden="true"
              className="bg-kern-neutral-100 hidden h-24 w-1 shrink-0 lg:order-2 lg:block"
            />
            {/* Below lg, a line break: what follows starts the second row */}
            <span aria-hidden="true" className="order-4 basis-full lg:hidden" />
            <TitleTag
              className={`${SMALL_TEXT} text-kern-layout-text-default order-5 font-semibold lg:order-3`}
            >
              {title}
            </TitleTag>
          </>
        )}
        {badge && <div className="order-6 flex shrink-0 lg:order-4">{badge}</div>}
        {/* The first row's height below lg; on lg, the meta takes its place when there is one */}
        <div className={`order-2 h-64 flex-1 lg:order-5 lg:h-auto ${meta ? 'lg:hidden' : ''}`} />
        {meta && (
          <p className={`${META_TEXT} text-kern-layout-text-muted order-7 lg:order-6`}>{meta}</p>
        )}
        <div className="order-3 flex shrink-0 lg:order-7">{children}</div>
      </div>
    </header>
  );
}
