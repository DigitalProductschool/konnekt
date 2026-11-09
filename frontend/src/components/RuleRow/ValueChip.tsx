import { SMALL_TEXT } from './constants';
import type { ValueChipProps } from './types';

/**
 * Figma "Rules/Value chip" (6082:3447): one chosen value, such as "21 years old" or "B", in
 * `label/small` on white with a 1px `decorative-border`, radius 4, padding 2 8.
 */
export default function ValueChip({ value }: ValueChipProps) {
  return (
    <span
      className={`${SMALL_TEXT} rounded-kern-small bg-kern-layout-background-default text-kern-layout-text-default border border-(--kern-color-decorative-border-default) px-8 py-2 font-semibold`}
    >
      {value}
    </span>
  );
}
