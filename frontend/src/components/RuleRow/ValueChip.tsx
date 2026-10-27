import type { ValueChipProps } from './types';

/** Figma "Rules/Value chip": one chosen value, such as "21 years old" or "B". */
export default function ValueChip({ value }: ValueChipProps) {
  return (
    <span className="rounded-kern-small bg-kern-layout-background-default text-kern-static-small text-kern-layout-text-default border border-(--kern-color-decorative-border-default) px-8 py-2 leading-(--kern-typography-line-height-medium-static) font-semibold">
      {value}
    </span>
  );
}
