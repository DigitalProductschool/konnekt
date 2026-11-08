import type { KeyboardEvent } from 'react';

/**
 * - `menu`: Figma "Rules/Search field" (V5 6093:3725), at the top of a long menu: white, a light
 *   1 px frame, radius 8, 40 px tall
 * - `panel`: Figma "Data/Search field" (V5 6241:12480), at the top of a panel such as the
 *   documents search card (U21): KERN's input, 48 px, with the search icon inside
 */
export type MenuSearchFieldVariant = 'menu' | 'panel';

export interface MenuSearchFieldProps {
  id: string;
  /** The placeholder, also the field's accessible name unless `label` is given */
  placeholder: string;
  value: string;
  /** The id of the list the field filters */
  controls?: string;
  onChange: (text: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** The accessible name, where it should differ from the placeholder */
  label?: string;
  variant?: MenuSearchFieldVariant;
}
