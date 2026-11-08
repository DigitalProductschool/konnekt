import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import { ROUTES } from '../../constants';
import TopBar from '../TopBar';
import UserMenu from '../UserMenu';
import {
  COLUMN_CLASSES,
  FOOTER_CLASSES,
  STEP_HEADER_CLASSES,
  STICKY_BOTTOM_PROPERTY,
  STICKY_TOP_PROPERTY,
} from './constants';
import type { WizardLayoutProps } from './types';

/**
 * The path of the page a wizard layout shows, while one is shown. Each page renders its own
 * layout, and a page swaps it on the same path: the loaded page after its loading state, the
 * editor after the restore screen. That is no page change, so the new layout doesn't fade in
 * again (FR-052c, design-notes §4: the fade is keyed by the route)
 */
let shownPath: string | null = null;

/**
 * Whether the main region fades in (design-notes §4, "Page fade-in"): when the layout arrives with
 * a new path, and whenever the path changes under it (`key`). A change of step keeps the path, so
 * it neither fades nor scrolls (the step's h1 takes the focus, T033).
 */
function usePageFade(pathname: string): boolean {
  const [arrival] = useState(() => ({ path: pathname, fades: pathname !== shownPath }));
  useEffect(() => {
    shownPath = pathname;
    return () => {
      shownPath = null;
    };
  }, [pathname]);
  return pathname !== arrival.path || arrival.fades;
}

function isSticky(element: HTMLElement | null): element is HTMLElement {
  return element !== null && getComputedStyle(element).position === 'sticky';
}

/**
 * Keeps `--wizard-sticky-top` and `--wizard-sticky-bottom` on the root element up to date (see
 * constants.ts): measured, because the step header's height follows its text (a long title or
 * description wraps, and so does the header at narrow widths or with larger text), and the
 * footer's follows its rows. A custom property only carries the measurement: the styles that
 * use it are classes. It changes when one of the parts changes size, and when the window does,
 * which can make the step header or the footer sticky or not. They go when the wizard does.
 */
function useStickyEdges(
  rootRef: RefObject<HTMLDivElement | null>,
  headRef: RefObject<HTMLDivElement | null>,
  footerRef: RefObject<HTMLDivElement | null>,
  parts: string
) {
  useLayoutEffect(() => {
    const header = rootRef.current?.querySelector('header') ?? null;
    const { style } = document.documentElement;
    function update() {
      const head = headRef.current;
      const footer = footerRef.current;
      const top = isSticky(head)
        ? head.getBoundingClientRect().bottom
        : (header?.getBoundingClientRect().bottom ?? 0);
      const bottom = isSticky(footer) ? footer.getBoundingClientRect().height : 0;
      style.setProperty(STICKY_TOP_PROPERTY, `${Math.ceil(Math.max(top, 0))}px`);
      style.setProperty(STICKY_BOTTOM_PROPERTY, `${Math.ceil(bottom)}px`);
    }
    update();
    const observer = new ResizeObserver(update);
    for (const part of [header, headRef.current, footerRef.current]) {
      if (part) {
        observer.observe(part);
      }
    }
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      style.removeProperty(STICKY_TOP_PROPERTY);
      style.removeProperty(STICKY_BOTTOM_PROPERTY);
    };
  }, [rootRef, headRef, footerRef, parts]);
}

/**
 * The wizard's page, L3 of the design (research R4; U19 6699:45321; build notes U01 #14–#22,
 * U03 #42–#44): the header pills (TopBar), the step header, the step's content in the 1120px
 * column and the 72px footer, on white. **The page scrolls** (U01 #15): the header pills stay at
 * the top, the step header right under them where the window has room for it (from 768px wide
 * and 640px tall, `wizard-pinned:`), and the footer at the bottom where the window is 480px tall
 * or more. How much of the window they cover is published as `--wizard-sticky-top` and
 * `--wizard-sticky-bottom` (constants.ts), which keeps what scrolls into view clear of them and
 * lets a step make its exceptions: the documents step's list, the rules step's pinned selection
 * bar, the test step's scrolling panel (U01 #16–#19, F43). The footer wraps its actions into
 * rows where they don't fit in one (320px, 200 % zoom; spec 005 FR-028, 005-ACC.4), and actions
 * that carry `ml-auto` stay on the right in a row of their own. The details use the `details`
 * variant (L4): no step header and the 832px column. Without a title (loading, errors), the
 * header shows only the pills. A page change fades the main region in over 150ms (FR-052c,
 * `usePageFade`); App.tsx scrolls to the top.
 */
export default function WizardLayout({
  title,
  titleAsHeading,
  badge,
  meta,
  head,
  footer,
  overlay,
  variant = 'steps',
  onLeave,
  onLogOut,
  children,
}: WizardLayoutProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const fades = usePageFade(pathname);
  const stepHeader = variant === 'steps' && Boolean(head);
  const hasFooter = footer !== null && footer !== undefined;
  // Which parts there are: the observer watches the ones there are, the new ones after the main
  // region starts again on a new path
  useStickyEdges(rootRef, headRef, footerRef, `${stepHeader} ${hasFooter} ${pathname}`);

  return (
    <div ref={rootRef} className="bg-kern-layout-background-default flex min-h-dvh flex-col">
      <TopBar
        title={title}
        titleAsHeading={titleAsHeading}
        badge={badge}
        meta={meta}
        logoTo={ROUTES.overview}
        onLeave={onLeave}
      >
        <UserMenu onLogOut={onLogOut} />
      </TopBar>
      {/* Its opacity animation makes a stacking context while it runs: the pills (z-30) are
          outside it, the menus (z-40) inside, so nothing changes order */}
      <main
        key={pathname}
        className={`flex flex-1 flex-col ${fades ? 'motion animate-page-in' : ''}`}
      >
        {stepHeader && (
          <div ref={headRef} className={STEP_HEADER_CLASSES}>
            {/* 32px under the header pills, 24px above the content (U19 6699:45325) */}
            <div className="mx-auto flex w-full max-w-1120 flex-col gap-16 pt-32 pb-24">{head}</div>
          </div>
        )}
        {/* Positioned, so that a popup that spans the page (`full`) spans this box */}
        <div className={`relative flex flex-1 flex-col px-16 pb-40 ${stepHeader ? '' : 'pt-32'}`}>
          <div className={`mx-auto flex w-full flex-1 flex-col gap-32 ${COLUMN_CLASSES[variant]}`}>
            {children}
          </div>
        </div>
        {hasFooter && (
          <div ref={footerRef} className={FOOTER_CLASSES}>
            <div className="mx-auto flex w-full max-w-1120 flex-wrap items-center gap-8">
              {footer}
            </div>
          </div>
        )}
      </main>
      {overlay}
    </div>
  );
}
