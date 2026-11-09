import { useId } from 'react';

import { STATUS_BAND_TONES } from './constants';
import type { StatusBandProps } from './types';

/**
 * Figma "Status band" (U80 7355:61767, U89 7355:61530, U93 7362:54697; build notes U07 #6, #23,
 * L4): the 32px status icon in its own column, then the status sentence, the page's one h1
 * (FR-046, FR-049), with its sub-line 4px under it, 32px from the band's edges, and the picture
 * at the bottom right, in colour or grey by `tone`. A published connection's date pill is not
 * built (F52): what it held, the ⋯ menu (`actions`), sits at the band's right end in the pill's
 * white chip, and while deactivated "Activate again" (`mainAction`) stands before it on the band,
 * 16px apart, as U89 draws the button beside the pill (F66, #52). A draft's band has no ⋯: its
 * date pill "Edited <date>" is `meta`, 20px under the text, and "Delete draft" its `mainAction`
 * (F56). The picture is clipped to the band in a layer of its own, so that nothing clips
 * the ⋯ menu (V6). Below 768px, where the text needs the room, the decorative picture goes, the
 * chip sits beside the text and a main action takes a row of its own under the text, 20px under
 * it (U89's status row), under the icon too below 640px, so that the button and the ⋯ share it.
 */
export default function StatusBand({
  tone,
  title,
  text,
  headingRef,
  actions,
  mainAction,
  meta,
}: StatusBandProps) {
  const look = STATUS_BAND_TONES[tone];
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={`${look.band} rounded-kern-large relative flex flex-wrap items-start gap-16 p-16 sm:p-32 md:pr-215`}
    >
      <div
        aria-hidden="true"
        className="rounded-kern-large pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
      >
        <img
          src={look.picture}
          alt=""
          className="absolute right-0 bottom-0 h-129 w-217 max-w-none"
        />
      </div>
      <span
        className={`${look.iconCircle} rounded-kern-circle relative flex size-32 shrink-0 items-center justify-center`}
      >
        <img src={look.icon} alt="" className={look.iconSize} />
      </span>
      <div className="relative flex min-w-0 flex-1 flex-col gap-20">
        <div className="flex flex-col gap-4">
          <h1
            id={titleId}
            ref={headingRef}
            tabIndex={-1}
            className="kern-heading-large py-0! break-words outline-none"
          >
            {title}
          </h1>
          <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
            {text}
          </p>
        </div>
        {meta}
      </div>
      {(actions || mainAction) && (
        // From 768px in the band's top right corner, over the picture, so that the text keeps its
        // drawn width, centred on the title's line; below, a main action wraps under the text
        <div
          className={`relative flex shrink-0 items-center gap-16 md:absolute md:top-24 md:right-32 ${mainAction ? 'max-md:mt-4 max-md:basis-full max-md:flex-wrap sm:max-md:pl-48' : 'sm:-mt-8 md:mt-0'}`}
        >
          {mainAction}
          {actions && (
            // The date pill's white chip without the date (U80 7355:61777: radius 8, padding 8)
            <div className="bg-kern-layout-background-default rounded-kern-default flex items-center p-8">
              {actions}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
