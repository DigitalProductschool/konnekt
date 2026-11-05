import { ROUTES } from '../../constants';
import TopBar from '../TopBar';
import UserMenu from '../UserMenu';
import type { WizardLayoutProps } from './types';

// A scrollbar narrows the scrolling area, which would move the centred column off the
// footer's by half its width. Where the column is centred, the area keeps the same gutter on
// its left too. Narrower windows left-align it, where this isn't needed.
const CENTRED_GUTTERS = 'min-[1197px]:[scrollbar-gutter:stable_both-edges]';

// Windows under 480px tall (200% zoom of a 720px window, or 400% of a 1024px one at 320px wide)
// leave the step little or no room between the header and the bar, whose actions wrap into
// up to four rows at 320px. There the frame scrolls with the window as a page does, and the
// scrolling area is no size container, so that its `cqh` units fall back to the window's
// (WCAG 1.4.10, spec 005 FR-028).
const SHORT_FRAME = '[@media(height<30rem)]:h-auto [@media(height<30rem)]:min-h-dvh';
const SHORT_AREA =
  '[@media(height<30rem)]:overflow-visible [@media(height<30rem)]:[container-type:normal]';

/**
 * The frame of the wizard: Figma "App/Header", the 1120 px content column and the
 * "App/Footer" action bar. The frame fills the window, which never scrolls: the header and
 * the bar stay put, and the step scrolls between them (decision 2026-10-12). From 1024 px
 * wide and 640 px tall (`split:`, index.css) the head stays put too, and only the body
 * scrolls; its scrollbar is outside the column, at the area's right edge. A step sizes
 * things to the visible height with `cqh` units: the scrolling area is their container.
 * The bar wraps its actions into rows where they don't fit in one (spec 005, FR-028). In
 * windows under 480px tall the whole frame scrolls with the window instead (`SHORT_FRAME`).
 * The details screen uses the same frame, with the header's badge and meta; its loading and
 * error states leave out the title and the head.
 */
export default function WizardLayout({
  title,
  titleAsHeading,
  badge,
  meta,
  head,
  footer,
  overlay,
  children,
}: WizardLayoutProps) {
  return (
    <div className={`bg-kern-neutral-025 flex h-dvh flex-col ${SHORT_FRAME}`}>
      <TopBar
        title={title}
        titleAsHeading={titleAsHeading}
        badge={badge}
        meta={meta}
        logoTo={ROUTES.overview}
      >
        <UserMenu />
      </TopBar>
      <main className="flex min-h-0 flex-1 flex-col">
        <div
          className={`relative flex min-h-0 flex-1 flex-col overflow-y-auto lg:[container-type:size] ${CENTRED_GUTTERS} split:overflow-hidden split:[scrollbar-gutter:auto] ${SHORT_AREA}`}
        >
          {head && (
            <div className="px-16 pt-40 pb-32">
              <div className="mx-auto flex w-full max-w-1120 flex-col gap-32">{head}</div>
            </div>
          )}
          <div
            className={`flex flex-1 flex-col px-16 pb-40 ${head ? '' : 'pt-40'} ${CENTRED_GUTTERS} split:min-h-0 split:overflow-y-auto split:[container-type:size]`}
          >
            <div className="mx-auto flex w-full max-w-1120 flex-1 flex-col gap-32">{children}</div>
          </div>
        </div>
        {/* 80px tall while the actions fit in one row. Where they don't (320px, or 200% zoom),
            they wrap into more rows rather than scroll, and the bar grows; the scrolling area
            above shrinks, so the bar never covers the step. The actions after the footer's
            spacer carry `ml-auto`, so that they stay on the right in a row of their own. */}
        <div className="border-kern-neutral-100 bg-kern-layout-background-default flex min-h-80 shrink-0 border-t px-16 py-8">
          <div className="mx-auto flex w-full max-w-1120 flex-wrap items-center gap-x-16 gap-y-8">
            {footer}
          </div>
        </div>
        {overlay}
      </main>
    </div>
  );
}
