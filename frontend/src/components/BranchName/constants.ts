import { defineTexts } from '@connection-portal/rules/language';

import type { BranchIconKind } from './types';

export const BRANCH_NAME_COPY = defineTexts(
  {
    // The (i)'s accessible name
    about: (name: string) => `About ${name}`,
    // The grey (i)'s tooltip on a variant without a description and without findings (FR-041b)
    noFindings: 'No findings.',
  },
  {
    about: (name: string) => `Informationen zu ${name}`,
    noFindings: 'Keine Befunde.',
  }
);

/**
 * The 20px icon after a variant's name by severity (build note 26, U06 6760:48852): KERN's
 * warning triangle in `feedback-warning` #9a4a00 for a contradiction (U46 6758:43060, U71
 * 7058:61618), its info icon in the info blue (the AA value of design-notes §1.5) for duplicates
 * or an always-met item only, its error diamond (`icon-emergency_home-small`) in
 * `feedback-danger` for a problem (U50 7375:101551). KERN's icon is a mask over its background
 * colour, which KERN sets, hence the `!`
 */
export const FINDINGS_ICONS: Record<BranchIconKind, string> = {
  warning: 'kern-icon--warning bg-kern-feedback-warning!',
  info: 'kern-icon--info bg-kern-feedback-info!',
  error: 'kern-icon--danger bg-kern-feedback-danger!',
};

/**
 * The same glyphs in the tooltip's findings segment, white on the dark bubble ("Rules/Tooltip"
 * U46 6758:43524, U50 7375:101551: `layout-text-inverse`)
 */
export const SEGMENT_ICONS: Record<BranchIconKind, string> = {
  warning: 'kern-icon--warning bg-kern-layout-text-inverse!',
  info: 'kern-icon--info bg-kern-layout-text-inverse!',
  error: 'kern-icon--danger bg-kern-layout-text-inverse!',
};

/**
 * The tab button ("Rules/Variant tab · fixes" 6529:39174, its "Label row" name): 16/24, a long
 * name wraps. Keyboard focus shows KERN's 4px `action-focus-default` ring, 2px out: kern.css,
 * unlayered, does the reverse for `[tabindex]` (a ring on any `:focus`, `outline: 0` on
 * `:focus:focus-visible`), and the open tab has `tabIndex` 0, hence the `!` on both sides. Its
 * colour changes in 150ms (design-notes §4)
 */
export const TAB_BUTTON =
  'motion text-kern-static-medium rounded-kern-small focus-visible:outline-kern-action-focus-default! cursor-pointer text-left leading-(--kern-typography-line-height-medium-static) wrap-anywhere transition-colors duration-(--duration-colour) focus-visible:outline-4! focus-visible:outline-offset-2! [&:focus:not(:focus-visible)]:outline-none!';

/**
 * The name by state: selected `label/default` 600 in `layout-text-default` #0b1220, otherwise
 * `body/default` 400 in `layout-text-muted` #4a5468 (U38 6134:9153). The kit draws no hover or
 * pressed tab (P29 is "In Bearbeitung"), so hover and press darken the name to the selected
 * colour, keeping the weight, as navigation stays black, white and grey (the component's note)
 */
export const TAB_TEXT = {
  selected: 'text-kern-layout-text-default font-semibold',
  unselected:
    'text-kern-layout-text-muted hover:text-kern-layout-text-default active:text-kern-layout-text-default font-normal',
};

/** The 2px indicator under the label row, black on the open tab ("Indicator" I6134:9160;6529:39180) */
export const TAB_INDICATOR = {
  selected: 'bg-kern-layout-text-default',
  unselected: 'bg-transparent',
};
