import { ACTION_MENU_STATES } from './constants';
import type { RuleMenuItemProps } from './types';

/**
 * One action of a ⋯ menu (U55 6530:40192): a 20px icon and a label/small text in a 40px row;
 * "Restore rule" has no icon. A label that wraps, such as "Reset to" a long variant name, starts
 * every line at the text column, with the icon beside its first line: (24px line − 20px) / 2.
 * Hover and pressed are the kit's "states" layers; keyboard focus fills the row as the kit's
 * select-option does (P33 2:2406: the focus colour, the text and icon inverse); a disabled
 * action is faded to the kit's 40% and stays focusable (aria-disabled).
 */
export default function RuleMenuItem({
  label,
  icon,
  danger = false,
  disabled = false,
  onSelect,
}: RuleMenuItemProps) {
  const colour = danger ? 'text-kern-feedback-danger' : 'text-kern-layout-text-default';
  const states = disabled ? 'cursor-default' : `cursor-pointer ${ACTION_MENU_STATES}`;
  const fade = disabled ? 'opacity-(--kern-color-action-state-opacity-disabled)' : '';
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onSelect}
      className={`group ${colour} ${states} text-kern-static-small rounded-kern-small focus-visible:bg-kern-action-focus-default focus-visible:text-kern-layout-text-inverse flex w-full shrink-0 items-start gap-8 p-8 text-left leading-(--kern-typography-line-height-medium-static) font-semibold focus-visible:outline-none`}
    >
      {icon &&
        ('kern' in icon ? (
          <span
            aria-hidden="true"
            className={`kern-icon kern-icon--small group-focus-visible:bg-kern-layout-text-inverse! mt-2 shrink-0 ${fade} ${icon.kern} ${danger ? 'bg-kern-feedback-danger!' : 'bg-kern-layout-text-default!'}`}
          />
        ) : (
          <img
            src={icon.src}
            alt=""
            className={`mt-2 size-20 shrink-0 group-focus-visible:brightness-0 group-focus-visible:invert ${fade}`}
          />
        ))}
      <span className={`wrap-anywhere ${fade}`}>{label}</span>
    </button>
  );
}
