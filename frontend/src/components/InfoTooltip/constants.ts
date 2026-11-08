import type { MenuDirection, PopupPlacement } from '../../utils/popupPlacement';
import type { InfoTone, TooltipState, TooltipTrigger } from './types';

/** KERN's info icon, the ⓘ (icon-info-small / -default in Figma) */
export const INFO_ICON = 'kern-icon--info';

/**
 * The ⓘ's colour by its background (build note 35, U07 7370:55189): `color/layout/text/muted`,
 * `color/feedback/info` on blue backgrounds (the AA value of design-notes §1.5), and
 * `color/action/default-contextual` for the "What is a variant" ⓘ. KERN's icon is a mask over
 * its background colour, which KERN sets, hence the `!`
 */
export const INFO_TONES: Record<InfoTone, string> = {
  muted: 'bg-kern-layout-text-muted!',
  info: 'bg-kern-feedback-info!',
  action: 'bg-kern-action-default!',
};

export const CLOSED: TooltipState = {
  hovered: false,
  focused: false,
  tapped: false,
  placement: { side: 'start', direction: 'down' },
};

/** The bubble's width in Figma ("Rules/Tooltip" 6139:3739: U37 6151:33820, U81 6809:46590) */
export const TOOLTIP_WIDTH = 280;

/**
 * The bubble's height that decides whether it opens below or above its trigger: three lines of
 * 24px and the 8px padding above and below, as U37 6151:33820 draws it (88). Its real height is
 * known only once it shows; one or two lines fit wherever three do
 */
export const TOOLTIP_HEIGHT = 88;

/**
 * How far the bubble reaches past its trigger's edge: 8px past the ⓘ (U81: the bubble at 435,
 * its ⓘ at 443), none past a button
 */
export const TOOLTIP_OVERHANG: Record<TooltipTrigger, number> = { icon: 8, button: 0 };

/** The bubble's width, never wider than the window less its gutters */
const WIDTH = 'w-280 max-w-[calc(100vw-32px)]';

/**
 * Where the bubble sits for each placement (utils/popupPlacement.ts), by trigger, 8px from it
 * (U81 6809:46590: 8px under its ⓘ). The gap is padding, so the mouse crosses it without leaving
 * the trigger's wrapper. Beside its trigger, the wrapper is its containing block; across the
 * page (`full`), the nearest positioned box is, and the bubble starts where the flow puts it:
 * after the trigger, below it, or, opening up, before it, at its top, and moves up by its own
 * height
 */
export const TOOLTIP_PLACEMENTS: Record<
  TooltipTrigger,
  Record<PopupPlacement, Record<MenuDirection, string>>
> = {
  icon: {
    start: { down: `top-full -left-8 pt-8 ${WIDTH}`, up: `bottom-full -left-8 pb-8 ${WIDTH}` },
    end: { down: `top-full -right-8 pt-8 ${WIDTH}`, up: `bottom-full -right-8 pb-8 ${WIDTH}` },
    full: { down: 'inset-x-16 pt-8', up: 'inset-x-16 pb-8 -translate-y-full' },
  },
  button: {
    start: { down: `top-full left-0 pt-8 ${WIDTH}`, up: `bottom-full left-0 pb-8 ${WIDTH}` },
    end: { down: `top-full right-0 pt-8 ${WIDTH}`, up: `bottom-full right-0 pb-8 ${WIDTH}` },
    full: { down: 'inset-x-16 pt-8', up: 'inset-x-16 pb-8 -translate-y-full' },
  },
};

/**
 * The bubble ("Rules/Tooltip" 6139:3739): `layout-background-inverse` #0b1220 (no KERN 2.8 name;
 * `layout-text-default` holds the same value), radius 8, padding 8 16, its parts 8px apart,
 * `body/small/regular` 14/24 in `layout-text-inverse` white; no border, shadow or arrow
 */
export const TOOLTIP_BOX =
  'rounded-kern-default bg-kern-layout-text-default text-kern-static-small text-kern-layout-text-inverse flex w-full flex-col gap-8 px-16 py-8 text-left font-normal leading-(--kern-typography-line-height-medium-static) break-words whitespace-normal';

/**
 * KERN's hover and pressed layers of a button also show on `[aria-disabled=true]` (its
 * `:not(:disabled):hover` rules), which the kit's disabled state doesn't (P33): while disabled,
 * the button keeps its resting fill, the action blue of a primary button, none on the others
 */
export const DISABLED_STILL = {
  primary: 'hover:bg-kern-action-default! active:bg-kern-action-default!',
  other: 'hover:bg-transparent! active:bg-transparent!',
};
