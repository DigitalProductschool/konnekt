import { useId, useState } from 'react';

import expandLessIcon from '../../assets/icons/expand-less-action-small.svg';
import expandMoreIcon from '../../assets/icons/expand-more-action-small.svg';
import type { DetailAccordionProps } from './types';
import { accordionBodyClassesOf } from './utils';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * One of the details' accordions (FR-046; kit P06, drawn as U91 7246:51436 "Links for your
 * service card (open)"): a card with the heading, the counts under it 4px apart and the
 * tertiary "View …" / "Hide …" toggle, 24px from the card's edges; open, the border turns
 * action blue. Its body's height animates over 200ms (design-notes §4: `grid-template-rows`
 * 0fr → 1fr, `.motion`). The body is clipped only while it is closed or moving, so that open, a
 * tooltip or the full URL's bubble can reach past the card (V6); closed, it is inert, so its
 * controls leave the tab order and the accessibility tree. While it clips it is also positioned,
 * so that the clip holds the visually hidden texts inside it, which would otherwise lengthen the
 * page below the sticky footer (`accordionBodyClassesOf()`). Used by the Links (T078), the Summary
 * (T079) and, since spec 010, the Activity card (FR-022); the page keeps one open at a time
 * (`toggleAccordion()`).
 *
 * The header row is the heading block and the toggle, which wraps under it when it doesn't fit.
 * `strip` sits under that row, inside the header, so that it shows open and closed (the
 * Summary's version and "Download PDF", spec 011 as clarified on 2026-11-18; V5 7603:61502,
 * 7603:61521, replacing the controls between the heading and the toggle, §7.1). With it, the
 * header has 24px at the sides and 16 above and below, the strip 12 under the row (16 + 52 + 12
 * + 44 + 16: the closed card 142px high), and the open body starts 8 lower, so that its first
 * line stays 24 from the strip, as without one; without it, the header keeps 24 around.
 * `notice` (the PDF's failure) is under the header, full width, open or closed.
 */
export default function DetailAccordion({
  title,
  counts,
  viewLabel,
  hideLabel,
  open,
  onToggle,
  strip,
  notice,
  children,
}: DetailAccordionProps) {
  const titleId = useId();
  const bodyId = useId();
  // Whether the body has finished opening: until then it is clipped
  const [settled, setSettled] = useState(open);
  if (settled && !open) {
    setSettled(false);
  } else if (!settled && open && prefersReducedMotion()) {
    // No transition runs, so no transitionend comes
    setSettled(true);
  }
  const clipped = !(open && settled);
  const toggle = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={bodyId}
      onClick={onToggle}
      className="kern-btn kern-btn--tertiary kern-btn--small max-w-full shrink-0"
    >
      {/* No underline, as the kit draws it: KERN drops it only beside a `kern-icon` */}
      <span className="kern-label no-underline!">{open ? hideLabel : viewLabel}</span>
      <img src={open ? expandLessIcon : expandMoreIcon} alt="" className="size-20" />
    </button>
  );

  return (
    <section
      aria-labelledby={titleId}
      className={`rounded-kern-large bg-kern-layout-background-default motion border transition-colors duration-(--duration-colour) ${open ? 'border-kern-action-default' : 'border-(--kern-color-decorative-border-default)'}`}
    >
      <div className={strip ? 'flex flex-col gap-12 px-24 py-16' : 'p-24'}>
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex min-w-0 flex-auto flex-col gap-4">
            <h2
              id={titleId}
              className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words"
            >
              {title}
            </h2>
            <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
              {counts}
            </p>
          </div>
          {toggle}
        </div>
        {strip}
      </div>
      {notice && <div className="px-24 pb-24">{notice}</div>}
      <div
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && open) {
            setSettled(true);
          }
        }}
        className={`motion grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows] duration-(--duration-height) ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        {/* Positioned while it clips, or its sr-only texts escape the clip */}
        <div id={bodyId} inert={!open} className={accordionBodyClassesOf(clipped)}>
          {/* Inside the clipped box: padding on it would hold the closed row open by 8px */}
          {strip ? <div className="pt-8">{children}</div> : children}
        </div>
      </div>
    </section>
  );
}
