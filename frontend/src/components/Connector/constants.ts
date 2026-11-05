import type { Combinator } from '@connection-portal/api-types/form-connections';

import type { PopupPlacement } from '../../utils/popupPlacement';

// Figma "Rules/Connector": the pill's label
export const CONNECTOR_LABELS: Record<Combinator, string> = { and: 'AND', or: 'OR' };

// Figma "Rules/Connector menu" (U14 6094:7052), in the order it lists the operators
export const CONNECTOR_OPTIONS: { operator: Combinator; description: string }[] = [
  { operator: 'and', description: 'All rules must be true' },
  { operator: 'or', description: 'At least one rule must be true' },
];

// The menu's width, and where it opens from its pill: to the right as Figma draws it, to the left
// where that doesn't fit, or across the rules card
export const CONNECTOR_MENU_WIDTH = 300;
export const CONNECTOR_MENU_PLACEMENTS: Record<PopupPlacement, string> = {
  start: 'absolute top-full left-0 w-300',
  end: 'absolute top-full right-0 w-300',
  full: 'absolute inset-x-16',
};

export const CONNECTOR_COPY = {
  // Read after the pill's label, so that the button's name says which level it switches
  switchLevel: (level: string) => `, switch ${level} to AND or OR`,
  // The menu's footer
  appliesTo: (level: string) => `Applies to every rule in ${level}`,
};
