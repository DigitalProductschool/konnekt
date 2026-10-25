import { RULE_EDITOR_COPY } from './constants';
import SymbolChip from './SymbolChip';
import type { MenuChoiceItemProps } from './types';

/**
 * Figma "Rules/Menu item": a choice of a rule editor menu, with an optional glyph and symbol
 * chip. Images are listed as "Can't be checked" and can't be chosen (FR-002).
 */
export default function MenuChoiceItem({
  id,
  choice,
  selected,
  onChoose,
  onKeyDown,
}: MenuChoiceItemProps) {
  const { label, icon, symbol, unavailable } = choice;
  return (
    <li
      id={id}
      role="option"
      tabIndex={-1}
      aria-selected={selected}
      aria-disabled={unavailable || undefined}
      onClick={unavailable ? undefined : onChoose}
      onKeyDown={onKeyDown}
      className={`rounded-kern-small text-kern-static-small focus-visible:outline-kern-action-focus-default flex min-h-40 w-full items-center gap-8 p-8 leading-(--kern-typography-line-height-medium-static) focus-visible:outline-4 focus-visible:-outline-offset-4 ${
        unavailable
          ? 'text-kern-layout-text-muted'
          : 'text-kern-layout-text-default hover:bg-kern-layout-background-hued aria-selected:bg-kern-layout-background-hued cursor-pointer'
      }`}
    >
      {icon && <img src={icon} alt="" className="size-16 shrink-0" />}
      <span className="min-w-0 flex-1">{label}</span>
      {symbol && <SymbolChip symbol={symbol} />}
      {unavailable && (
        // Figma "Data/Status tag" (6323:15519)
        <span className="rounded-kern-small text-kern-static-small text-kern-layout-text-muted shrink-0 border border-(--kern-color-decorative-border-default) px-8 leading-(--kern-typography-line-height-medium-static)">
          {RULE_EDITOR_COPY.cantBeChecked}
        </span>
      )}
    </li>
  );
}
