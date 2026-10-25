import type { ValueInputProps } from './types';

/**
 * Figma "Rules/Number field" (6194:42241): a value of a condition in the check row, red with a
 * problem (U25). Text grows with what is typed, from the frames' width on.
 */
export default function ValueInput({
  id,
  label,
  value,
  type = 'text',
  inputMode,
  invalid,
  describedBy,
  widthClass,
  onChange,
  onBlur,
}: ValueInputProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      inputMode={inputMode}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      className={`rounded-kern-default bg-kern-layout-background-default text-kern-static-medium text-kern-layout-text-default focus-visible:outline-kern-action-focus-default h-40 shrink-0 border px-16 leading-(--kern-typography-line-height-medium-static) focus-visible:outline-4 focus-visible:outline-offset-2 ${invalid ? 'border-kern-feedback-danger' : 'border-(--kern-color-decorative-border-default)'} ${widthClass}`}
    />
  );
}
