import { CLASS_OPTION_STATES } from './constants';
import type { ValueOptionItemProps } from './types';

/**
 * An option of the values menu: a value with its checkbox (Figma "Data/Check item" 6027:17252,
 * U48 6191:42209: a 20px box, 8px to the 14/24 label, 28px rows), or a licence class with its
 * code and description ("Rules/Menu item · class" 6358:43249, U32 6362:61767: 8px padding,
 * radius 4, the code in label/small, the description in body/small, W19). The box is KERN's
 * checkbox with the Checkbox component's override in index.css (design-notes §2 `Checkbox`):
 * hover (also over the label) a 2px blue border, checked hover a 3px tint ring, keyboard focus a
 * 3px ring around the box only, never after a click. A class row also takes the kit's hover and
 * pressed layers (P33 2:1985). A disabled option is faded to the kit's 40% (KERN fades the box, the row its texts) and
 * can't be toggled.
 */
export default function ValueOptionItem({
  id,
  choice,
  classes,
  checked,
  onToggle,
  onKeyDown,
}: ValueOptionItemProps) {
  const disabled = choice.disabled ?? false;
  // KERN fades a disabled box itself (kern.css, 40%); the texts fade beside it
  const fade = disabled ? 'opacity-(--kern-color-action-state-opacity-disabled)' : '';
  const row = classes
    ? `rounded-kern-small min-h-40 p-8 ${disabled ? '' : CLASS_OPTION_STATES}`
    : '';
  return (
    <li>
      <label
        className={`text-kern-static-small text-kern-layout-text-default flex items-center gap-8 leading-(--kern-typography-line-height-medium-static) ${disabled ? '' : 'cursor-pointer'} ${row}`}
      >
        <span className="flex shrink-0 py-4">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onToggle}
            onKeyDown={onKeyDown}
            className="kern-form-check__checkbox motion mt-0! transition-colors duration-(--duration-colour)"
          />
        </span>
        {classes ? (
          <>
            <span className={`min-w-32 shrink-0 font-semibold whitespace-nowrap ${fade}`}>
              {choice.label}
            </span>
            <span className={`min-w-0 flex-1 ${fade}`}>{choice.description}</span>
          </>
        ) : (
          <span className={fade}>{choice.label}</span>
        )}
      </label>
    </li>
  );
}
