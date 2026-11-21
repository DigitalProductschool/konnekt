import { type MouseEvent, useEffect, useState } from 'react';
import { Link } from 'react-router';

import logo from '../../assets/illustrations/logo.svg';
import { APP_NAME, ROUTES } from '../../constants';
import { useCopy } from '../../hooks/useLanguage';
import LanguageSwitch from '../LanguageSwitch';
import { FOCUS_RING_CLASSES, PILL_CLASSES, SMALL_TEXT_CLASSES, TOP_BAR_COPY } from './constants';
import type { TopBarProps } from './types';
import { headerBackgroundClasses } from './utils';

/**
 * Figma "Shell/Header" (U11 6699:44242, U17 7173:52658, U10 6401:27994; build notes U03
 * #29–#40): pills 48px high, 16px from the top and the sides, that stay at the top while the
 * page scrolls. Left the Konnekt pill, light blue on the signed-in screens, white on the loader
 * after sign-in (#33), none on the sign-in screens' blue surface ("New visuals" 7741:61944, bug
 * new-visuals B1), whose hero logo names the product; right the account pill (UserMenu), none when
 * signed out. Inside a connection a
 * second pill, "Your connections / <name> · <status>", grows out of the Konnekt pill (#34, #40),
 * the name cut with "…" (#38). The header area, 64px, turns white (on the blue surface: blue) at
 * once when the page scrolls under it and fades back at the top (#39, `headerBackgroundClasses`).
 * The product name and "Your
 * connections" go home, or in a flow call `onLeave` (FR-026).
 * The language switch (spec 009, R2) sits in the right group before the account pill. Below
 * `md`, which the design has no frame for, the second pill and the description take rows of
 * their own (W2). In a window under 320 CSS px or 480px tall (such as
 * 1280 × 1024 at 400 % zoom) it scrolls away with the page instead of covering half of it
 * (WCAG 1.4.10, T096), as the wizard's footer does
 */
export default function TopBar({
  title,
  titleAsHeading = false,
  badge,
  meta,
  logoTo,
  signedOut = false,
  brandSurface = false,
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
      className={`motion top-0 z-30 flex flex-wrap items-center gap-y-8 px-16 pt-16 md:flex-nowrap [@media(width>=20rem)_and_(height>=30rem)]:sticky ${title ? 'gap-x-8' : 'gap-x-16'} ${headerBackgroundClasses(scrolled, brandSurface)}`}
    >
      {!brandSurface &&
        (logoTo ? (
          <Link to={logoTo} onClick={handleLeave} className={`${logoPill} ${FOCUS_RING_CLASSES}`}>
            {logoContent}
          </Link>
        ) : (
          <div className={logoPill}>{logoContent}</div>
        ))}
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
      {/* The switch and the account pill. Below 350px (334px in a connection) they don't fit
          beside the Konnekt pill and take a row of their own, kept at the right end (D4) */}
      <div className="order-3 ml-auto flex shrink-0 items-center gap-4 md:order-5">
        <LanguageSwitch />
        {children}
      </div>
    </header>
  );
}

/**
 * The "Where you are" pill: a header pill (PILL_CLASSES) that grows taller, 8px above and below
 * its rows, where its parts wrap; on one row it stays 48px high
 */
const CONNECTION_PILL_CLASSES = 'rounded-kern-circle shadow-card flex min-h-48 items-center py-8';

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
  const copy = useCopy(TOP_BAR_COPY);
  return (
    <nav
      aria-label={copy.breadcrumb}
      className={`${CONNECTION_PILL_CLASSES} bg-kern-layout-background-hued motion animate-pill-grow narrow:rounded-kern-large order-4 max-w-full min-w-0 basis-full px-16 md:order-2 md:basis-auto`}
    >
      {/* Its parts wrap where they don't fit on one line: the status pill under the name, the
          name under "Your connections /" where even 96px of it don't fit beside it (spec 010,
          T084 (4)), and under 320 CSS px every part (T096). Below md the status pill may also
          shrink to its longest word, so that "Scheduled · <date>" wraps inside it instead of
          running off the window (T014); a one-word status never shrinks */}
      <div className="motion animate-pill-text flex min-w-0 flex-wrap items-center gap-8">
        <Link
          to={ROUTES.overview}
          onClick={onLeave}
          className={`${SMALL_TEXT_CLASSES} text-kern-action-default rounded-kern-small narrow:whitespace-normal font-semibold hover:underline ${FOCUS_RING_CLASSES}`}
        >
          {copy.yourConnections}
        </Link>
        <span aria-hidden="true" className={`${SMALL_TEXT_CLASSES} text-kern-layout-text-muted`}>
          /
        </span>
        {/* The name keeps min(its own width, 96px) on its row: that is its basis, which the line
            break counts, and it grows back to its full width (no further) where there is room */}
        <NameTag
          className={`${SMALL_TEXT_CLASSES} text-kern-layout-text-default max-w-max min-w-0 grow basis-96 truncate font-semibold`}
        >
          {title}
        </NameTag>
        {badge && <span className="flex shrink-0 max-md:shrink">{badge}</span>}
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
