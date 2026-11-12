import { useId, useState } from 'react';

import expandLessIcon from '../../assets/icons/expand-less-action-small.svg';
import expandMoreIcon from '../../assets/icons/expand-more-action-small.svg';
import type { DetailAccordionProps } from './types';

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
 * controls leave the tab order and the accessibility tree. Used by the Links (T078), the Summary
 * (T079) and, since spec 010, the Activity card (FR-022); the page keeps one open at a time
 * (`toggleAccordion()`).
 */
export default function DetailAccordion({
  title,
  counts,
  viewLabel,
  hideLabel,
  open,
  onToggle,
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

  return (
    <section
      aria-labelledby={titleId}
      className={`rounded-kern-large bg-kern-layout-background-default motion border transition-colors duration-(--duration-colour) ${open ? 'border-kern-action-default' : 'border-(--kern-color-decorative-border-default)'}`}
    >
      <div className="flex flex-wrap items-center gap-8 p-24">
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
      </div>
      <div
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && open) {
            setSettled(true);
          }
        }}
        className={`motion grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows] duration-(--duration-height) ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div id={bodyId} inert={!open} className={`min-h-0 ${clipped ? 'overflow-hidden' : ''}`}>
          {children}
        </div>
      </div>
    </section>
  );
}
