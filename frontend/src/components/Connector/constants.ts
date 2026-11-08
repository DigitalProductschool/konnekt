import type { Combinator } from '@connection-portal/api-types/form-connections';

import type { MenuDirection, PopupPlacement } from '../../utils/popupPlacement';

// Figma "Rules/Connector": the pill's label
export const CONNECTOR_LABELS: Record<Combinator, string> = { and: 'AND', or: 'OR' };

// Figma "Rules/Connector menu" (U34 6094:7052), in the order it lists the operators
export const CONNECTOR_OPTIONS: { operator: Combinator; description: string }[] = [
  { operator: 'and', description: 'All rules must be met' },
  { operator: 'or', description: 'At least one rule must be met' },
];

/** The menu's width, Figma's 300px (U34 6094:7052) */
export const CONNECTOR_MENU_WIDTH = 300;

/**
 * The menu's height before it opens, as Figma draws it (U34 6094:7052, 189px): the 1px border
 * and 8px padding at the top and the bottom, two 64px options, the divider and the 36px footer,
 * 2px apart
 */
export const CONNECTOR_MENU_HEIGHT = 189;

/**
 * Where the menu opens from its pill (utils/popupPlacement.ts), 8px from it (design-notes §3
 * "Menu"): below or above it, its left edge on the pill's as Figma draws it, else its right edge,
 * or across the nearest positioned box (the rules card) when neither fits. Across the box, the
 * menu starts where the flow puts it, under its pill, and opening up it moves up by its own
 * height, the pill's (28px, 30px with the OR pill's border) and the two gaps
 */
export const CONNECTOR_MENU_PLACEMENTS: Record<
  PopupPlacement,
  Record<MenuDirection, Record<Combinator, string>>
> = {
  start: {
    down: { and: 'top-full left-0 mt-8 w-300', or: 'top-full left-0 mt-8 w-300' },
    up: { and: 'bottom-full left-0 mb-8 w-300', or: 'bottom-full left-0 mb-8 w-300' },
  },
  end: {
    down: { and: 'top-full right-0 mt-8 w-300', or: 'top-full right-0 mt-8 w-300' },
    up: { and: 'bottom-full right-0 mb-8 w-300', or: 'bottom-full right-0 mb-8 w-300' },
  },
  full: {
    down: { and: 'inset-x-16 mt-8', or: 'inset-x-16 mt-8' },
    up: {
      and: 'inset-x-16 mt-8 -translate-y-[calc(100%+44px)]',
      or: 'inset-x-16 mt-8 -translate-y-[calc(100%+46px)]',
    },
  },
};

// Figma "Rules/Connector" (U34 6094:6511, 6094:6400): label/small in a circle-radius pill; AND
// filled in the action colour, OR outlined in it on white
const PILL =
  'rounded-full text-kern-static-small leading-(--kern-typography-line-height-medium-static) font-semibold';
export const CONNECTOR_PILLS: Record<Combinator, string> = {
  and: `${PILL} bg-kern-action-default text-kern-action-on-default`,
  or: `${PILL} bg-kern-layout-background-default text-kern-action-default border border-kern-action-default`,
};

/**
 * The pill's hover and pressed layers, as the kit's buttons draw them (P09 button-primary-small
 * 1914:12574 / 1914:12581, button-secondary-small 1914:12697): on AND, a white
 * (`action-state-indicator-tint`) layer at 8% / 16%; on OR, an action-colour layer at 8% / 16%
 * over the pill and its border. The layer sits under the label (the pill is `isolate`), and its
 * colour fades in 150ms (design-notes §4; `.motion` covers `::before`)
 */
const LAYER =
  'motion relative isolate before:absolute before:-z-10 before:rounded-full before:transition-colors before:duration-(--duration-colour)';
export const CONNECTOR_PILL_STATES: Record<Combinator, string> = {
  and: `${LAYER} before:inset-0 hover:before:bg-kern-action-state-indicator-tint/8 active:before:bg-kern-action-state-indicator-tint/16`,
  or: `${LAYER} before:-inset-1 hover:before:bg-kern-action-state-indicator-default/8 active:before:bg-kern-action-state-indicator-default/16`,
};

/**
 * A connector next to a removed item, or beside the only active item of its level, fades as
 * Figma draws it (U47 6185:8569: the whole connector at `action-state-opacity-disabled`, 40%;
 * FR-051 (39)). It goes on the pill, the line and the mark one by one, not on the row: opacity
 * makes a stacking context, which would fade the open menu too and let the next row cover it
 */
export const CONNECTOR_FADED = 'opacity-(--kern-color-action-state-opacity-disabled)';

/**
 * An option's hover and pressed layers (the kit's "states", P33 2:1985: the action colour at 8%
 * and 16%, over the chosen option's tint too) and its keyboard focus, filled as the kit's
 * select-option (P33 2:2406: the focus colour, its texts and tick inverse)
 */
export const CONNECTOR_OPTION_STATES =
  'motion relative isolate before:absolute before:inset-0 before:-z-10 before:rounded-kern-small before:transition-colors before:duration-(--duration-colour) hover:before:bg-kern-action-state-indicator-default/8 active:before:bg-kern-action-state-indicator-default/16 focus-visible:bg-kern-action-focus-default focus-visible:outline-none';

export const CONNECTOR_COPY = {
  // Read after the pill's label, so that the button's name says which level it switches
  switchLevel: (level: string) => `, switch ${level} to AND or OR`,
  // The menu's footer
  appliesTo: (level: string) => `Applies to every rule in ${level}`,
};
