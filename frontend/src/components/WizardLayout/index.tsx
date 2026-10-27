import { ROUTES } from '../../constants';
import TopBar from '../TopBar';
import UserMenu from '../UserMenu';
import type { WizardLayoutProps } from './types';

// A scrollbar narrows the scrolling area, which would move the centred column off the
// footer's by half its width. Where the column is centred, the area keeps the same gutter on
// its left too. Narrower windows left-align it, where this isn't needed.
const CENTRED_GUTTERS = 'min-[1197px]:[scrollbar-gutter:stable_both-edges]';

/**
 * The frame of the wizard: Figma "App/Header", the 1120 px content column and the
 * "App/Footer" action bar. The frame fills the window, which never scrolls: the header and
 * the bar stay put, and the step scrolls between them (decision 2026-10-12). From 1024 px
 * wide and 640 px tall (`split:`, index.css) the head stays put too, and only the body
 * scrolls; its scrollbar is outside the column, at the area's right edge. A step sizes
 * things to the visible height with `cqh` units: the scrolling area is their container.
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
    <div className="bg-kern-neutral-025 flex h-dvh flex-col">
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
          className={`relative flex min-h-0 flex-1 flex-col overflow-y-auto lg:[container-type:size] ${CENTRED_GUTTERS} split:overflow-hidden split:[scrollbar-gutter:auto]`}
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
        <div className="border-kern-neutral-100 bg-kern-layout-background-default flex h-80 shrink-0 border-t px-16">
          <div className="mx-auto flex w-full max-w-1120 items-center gap-16">{footer}</div>
        </div>
        {overlay}
      </main>
    </div>
  );
}
