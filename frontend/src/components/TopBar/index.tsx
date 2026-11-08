import { type MouseEvent, useEffect, useState } from 'react';
import { Link } from 'react-router';

import logo from '../../assets/illustrations/logo.svg';
import { APP_NAME, ROUTES } from '../../constants';
import {
  BREADCRUMB_LABEL,
  FOCUS_RING_CLASSES,
  PILL_CLASSES,
  SMALL_TEXT_CLASSES,
  YOUR_CONNECTIONS_LABEL,
} from './constants';
import type { TopBarProps } from './types';

/**
 * Figma "Shell/Header" (U11 6699:44242, U17 7173:52658, U10 6401:27994; build notes U03
 * #29–#40): pills 48px high, 16px from the top and the sides, that stay at the top while the
 * page scrolls. Left the Konnekt pill, light blue on the signed-in screens, white on the sign-in
 * screens (#33); right the account pill (UserMenu), none when signed out. Inside a connection a
 * second pill, "Your connections / <name> · <status>", grows out of the Konnekt pill (#34, #40),
 * the name cut with "…" (#38). The header area, 64px, turns white once the page scrolls under it
 * (#39). The product name and "Your connections" go home, or in a flow call `onLeave` (FR-026).
 * No DE/EN switch (F6). Below `md`, which the design has no frame for, the second pill and the
 * description take rows of their own (W2).
 */
export default function TopBar({
  title,
  titleAsHeading = false,
  badge,
  meta,
  logoTo,
  signedOut = false,
  onLeave,
  children,
}: TopBarProps) {
  const scrolled = useScrolled();
  const handleLeave = onLeave ? leaveClick(onLeave) : undefined;
  const logoPill = `${PILL_CLASSES} ${signedOut ? 'bg-kern-layout-background-default' : 'bg-kern-layout-background-hued'} order-1 shrink-0 gap-8 pr-24 pl-16`;
  const logoContent = (
    <>
      <img src={logo} alt="" className="size-24 shrink-0" />
      <span className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap">
        {APP_NAME}
      </span>
    </>
  );

  return (
    <header
      className={`motion sticky top-0 z-30 flex flex-wrap items-center gap-y-8 px-16 pt-16 transition-colors duration-(--duration-colour) md:flex-nowrap ${title ? 'gap-x-8' : 'gap-x-16'} ${scrolled ? 'bg-kern-layout-background-default' : ''}`}
    >
      {logoTo ? (
        <Link to={logoTo} onClick={handleLeave} className={`${logoPill} ${FOCUS_RING_CLASSES}`}>
          {logoContent}
        </Link>
      ) : (
        <div className={logoPill}>{logoContent}</div>
      )}
      {title && (
        <ConnectionPill
          title={title}
          titleAsHeading={titleAsHeading}
          badge={badge}
          onLeave={handleLeave}
        />
      )}
      {/* The stretching gap between the pills; on md, the description takes its place */}
      <div className={`order-2 h-8 min-w-px flex-1 md:order-4 ${meta ? 'md:hidden' : ''}`} />
      {meta && (
        <p
          className={`${SMALL_TEXT_CLASSES} text-kern-layout-text-muted order-5 max-w-full min-w-0 basis-full truncate md:order-3 md:min-w-96 md:flex-1 md:basis-0`}
        >
          {meta}
        </p>
      )}
      {children && <div className="order-3 flex shrink-0 md:order-5">{children}</div>}
    </header>
  );
}

interface ConnectionPillProps {
  title: string;
  titleAsHeading: boolean;
  badge: TopBarProps['badge'];
  onLeave?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * "Pill · Where you are" (U17 I7173:52658;6698:43401): the link home, a muted "/", the name
 * (label/small, cut with "…") and, 8px after it, the status pill. It is revealed from its left
 * edge in 240ms and its text fades in during the last 120ms (U03 #40); under reduced motion it
 * just appears (.motion)
 */
function ConnectionPill({ title, titleAsHeading, badge, onLeave }: ConnectionPillProps) {
  const NameTag = titleAsHeading ? 'h1' : 'span';
  return (
    <nav
      aria-label={BREADCRUMB_LABEL}
      className={`${PILL_CLASSES} bg-kern-layout-background-hued motion animate-pill-grow order-4 max-w-full min-w-0 basis-full px-16 md:order-2 md:basis-auto`}
    >
      <div className="motion animate-pill-text flex min-w-0 items-center gap-8">
        <Link
          to={ROUTES.overview}
          onClick={onLeave}
          className={`${SMALL_TEXT_CLASSES} text-kern-action-default rounded-kern-small font-semibold hover:underline ${FOCUS_RING_CLASSES}`}
        >
          {YOUR_CONNECTIONS_LABEL}
        </Link>
        <span aria-hidden="true" className={`${SMALL_TEXT_CLASSES} text-kern-layout-text-muted`}>
          /
        </span>
        <NameTag
          className={`${SMALL_TEXT_CLASSES} text-kern-layout-text-default min-w-0 truncate font-semibold`}
        >
          {title}
        </NameTag>
        {badge && <span className="flex shrink-0">{badge}</span>}
      </div>
    </nav>
  );
}

/**
 * A click on the product name or "Your connections" in a flow: the editor asks before leaving
 * (FR-026). A click that opens a new tab or window still follows the link
 */
function leaveClick(onLeave: () => void) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onLeave();
  };
}

/** Whether the page has scrolled, so that content passes under the header (U03 #39) */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(() => window.scrollY > 0);
  useEffect(() => {
    function update() {
      setScrolled(window.scrollY > 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return scrolled;
}
