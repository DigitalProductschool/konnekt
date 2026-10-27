import type { SymbolChipProps } from './types';

/**
 * Figma "Rules/Symbol": the ≥, <, = chip before a check's words. It is decoration only, which
 * assistive technologies don't announce (FR-005).
 */
export default function SymbolChip({ symbol }: SymbolChipProps) {
  return (
    <span
      aria-hidden="true"
      className="rounded-kern-circle bg-kern-layout-background-default text-kern-static-small text-kern-layout-text-default flex min-w-24 shrink-0 items-center justify-center border border-(--kern-color-decorative-border-default) px-8 leading-(--kern-typography-line-height-medium-static) font-semibold"
    >
      {symbol}
    </span>
  );
}
