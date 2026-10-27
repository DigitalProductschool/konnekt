import type { MenuSearchFieldProps } from './types';

/** Figma "Rules/Search field": filters a long menu, and stays put while the list scrolls. */
export default function MenuSearchField({
  id,
  placeholder,
  value,
  controls,
  onChange,
  onKeyDown,
}: MenuSearchFieldProps) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      aria-controls={controls}
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      className="rounded-kern-default bg-kern-layout-background-default text-kern-static-medium text-kern-layout-text-default placeholder:text-kern-layout-text-muted focus-visible:outline-kern-action-focus-default h-40 w-full shrink-0 border border-(--kern-color-decorative-border-default) px-16 leading-(--kern-typography-line-height-medium-static) focus-visible:outline-4 focus-visible:-outline-offset-4"
    />
  );
}
