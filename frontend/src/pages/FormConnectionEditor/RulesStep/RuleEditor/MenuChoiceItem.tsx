import { CHOICE_STATES, RULE_EDITOR_COPY } from './constants';
import SymbolChip from './SymbolChip';
import type { MenuChoiceItemProps } from './types';

/**
 * Figma "Rules/Menu item" (6083:3542, base pattern KERN "select-option"): a choice of a rule
 * editor menu, 8px padding, radius 4, an optional 16px glyph before and symbol chip after the
 * body/small label. Hover and pressed are the kit's "states" layers; keyboard focus fills the row
 * as the kit's select-option does (P33 2:2406: the focus colour, the text inverse; T021's menu
 * entries); the chosen one has the hued background. Images are listed muted with the tag "Not
 * for rules" (U31 6350:41622, "Data/Status tag") and can't be chosen (FR-002).
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
      className={`group rounded-kern-small text-kern-static-small focus-visible:bg-kern-action-focus-default focus-visible:text-kern-layout-text-inverse flex min-h-40 w-full items-center gap-8 p-8 leading-(--kern-typography-line-height-medium-static) focus-visible:outline-none ${
        unavailable
          ? 'text-kern-layout-text-muted'
          : `text-kern-layout-text-default aria-selected:bg-kern-layout-background-hued cursor-pointer ${CHOICE_STATES}`
      }`}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          className="size-16 shrink-0 group-focus-visible:brightness-0 group-focus-visible:invert"
        />
      )}
      <span className="min-w-0 flex-1">{label}</span>
      {symbol && <SymbolChip symbol={symbol} />}
      {unavailable && (
        // Figma "Data/Status tag" (6241:12485, U31 6350:41624)
        <span className="rounded-kern-small text-kern-static-small text-kern-layout-text-muted shrink-0 border border-(--kern-color-decorative-border-default) px-8 leading-(--kern-typography-line-height-medium-static)">
          {RULE_EDITOR_COPY.notForRules}
        </span>
      )}
    </li>
  );
}
