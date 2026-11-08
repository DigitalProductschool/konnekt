import type { MenuSearchFieldProps } from './types';

/**
 * A search field that filters a list (design-notes §2, option c: KERN 2.8.2 ships no search
 * CSS). `menu` is Figma "Rules/Search field": it stays put while the menu's list scrolls; hover
 * darkens its frame to the input line's colour and keyboard focus draws the kit's 4 px ring
 * outside it (P33 base-search), inside the menu's 8 px padding. `panel` is "Data/Search field":
 * KERN's input (its hover, focus and disabled states) with the 20 px search icon in the action
 * colour, 8 px before the text.
 */
export default function MenuSearchField({
  id,
  placeholder,
  value,
  controls,
  onChange,
  onKeyDown,
  label,
  variant = 'menu',
}: MenuSearchFieldProps) {
  const input = (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={label ?? placeholder}
      aria-controls={controls}
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      className={
        variant === 'menu'
          ? 'rounded-kern-default bg-kern-layout-background-default text-kern-static-medium text-kern-layout-text-default placeholder:text-kern-layout-text-muted hover:border-kern-form-input-border focus-visible:outline-kern-action-focus-default motion h-40 w-full shrink-0 border border-(--kern-color-decorative-border-default) px-16 transition-colors duration-(--duration-colour) focus-visible:outline-4 focus-visible:outline-offset-0'
          : 'kern-form-input__input placeholder:text-kern-layout-text-muted pl-44!'
      }
    />
  );
  if (variant === 'menu') {
    return input;
  }
  return (
    <div className="relative w-full shrink-0">
      {input}
      <span
        aria-hidden="true"
        className="kern-icon kern-icon--search kern-icon--small bg-kern-action-default! pointer-events-none absolute top-14 left-16"
      />
    </div>
  );
}
