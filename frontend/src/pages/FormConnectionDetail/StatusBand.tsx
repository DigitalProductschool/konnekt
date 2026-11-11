import { useId } from 'react';

import { DATE_PILL_CLASSES, STATUS_BAND_TONES } from './constants';
import type { DatePillProps, StatusBandProps, StatusBandToneLook } from './types';

/** The 32px status icon's glyph: an exported white image, or KERN's glyph in white */
function StatusGlyph({ look }: { look: StatusBandToneLook }) {
  if ('src' in look.icon) {
    return <img src={look.icon.src} alt="" className={look.iconSize} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`kern-icon ${look.icon.kern} kern-icon--small bg-kern-action-on-default! ${look.iconSize}`}
    />
  );
}

/**
 * The date pill (C1; U80 7355:61155, U94 7355:60689, U89 7355:61543, U93 7362:54709): the
 * calendar, the line and, on a published connection, the ⋯ menu inside it (FR-015, FR-016). It
 * hugs its line and wraps it when the band is narrower, the ⋯ staying on the first row; under
 * 320 CSS px the line takes a row of its own under the calendar and the ⋯ (W16). The pill is no
 * positioned box, so that a menu too wide beside its ⋯ spans the band (`placementFrom()`'s 'full').
 */
function DatePill({ line, actions }: DatePillProps) {
  const classes = actions ? DATE_PILL_CLASSES.withActions : DATE_PILL_CLASSES.plain;
  return (
    <div
      className={`bg-kern-layout-background-default rounded-kern-default flex max-w-full items-start gap-8 ${classes.pill}`}
    >
      <span
        aria-hidden="true"
        className={`kern-icon kern-icon--calendar-today kern-icon--small bg-kern-layout-text-default! shrink-0 ${classes.icon}`}
      />
      <p
        className={`text-kern-static-small text-kern-layout-text-muted min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static) font-semibold break-words ${classes.line}`}
      >
        {line}
      </p>
      {actions && <div className="narrow:ml-auto shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * Figma "Status band" (U80 7355:61767, U94 7355:60677, U89 7355:61530, U93 7362:54697; build
 * notes U07 #6, #23, L4): the 32px status icon in its own column, then the status sentence, the
 * page's one h1 (FR-046, FR-049), with its sub-line 4px under it, 32px from the band's edges, and
 * the picture at the bottom right, in colour or grey by `tone`. 20px under the text the date pill
 * (C1, FR-015): its line, and a published connection's ⋯ menu inside it (FR-016, superseding spec
 * 008's #52, which held the ⋯ in a chip at the band's right end); while deactivated "Activate
 * again" (`pillAction`) stands next to it, 16px apart (U89 7355:61542), and goes under it where
 * the row is too narrow. A draft's pill has no ⋯, and its "Delete draft" (`mainAction`, F56)
 * stands at the band's right end. The picture is clipped to the band in a layer of its own, so
 * that nothing clips the ⋯ menu (V6). Below 768px, where the text needs the room, the decorative
 * picture goes and a main action takes a row of its own under the text, 20px under it, under the
 * icon too below 640px.
 */
export default function StatusBand({
  tone,
  title,
  text,
  headingRef,
  dateLine,
  actions,
  pillAction,
  mainAction,
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
        <StatusGlyph look={look} />
      </span>
      {/* Static below 768px, where no picture lies under it: a ⋯ menu too wide beside its ⋯
          then spans the band, not this column */}
      <div className="narrow:basis-full flex min-w-0 flex-1 flex-col gap-20 md:relative">
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
        <div className="flex flex-wrap items-center gap-16">
          <DatePill line={dateLine} actions={actions} />
          {pillAction}
        </div>
      </div>
      {mainAction && (
        // From 768px in the band's top right corner, over the picture, so that the text keeps its
        // drawn width, centred on the title's line; below, it wraps under the text. Under 320 CSS
        // px the text and the action take rows of their own
        <div className="narrow:static narrow:basis-full narrow:flex-wrap relative flex shrink-0 items-center gap-16 max-md:mt-4 max-md:basis-full max-md:flex-wrap sm:max-md:pl-48 md:absolute md:top-24 md:right-32">
          {mainAction}
        </div>
      )}
    </section>
  );
}
