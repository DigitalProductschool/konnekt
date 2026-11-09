import { useEffect, useRef } from 'react';

import type { CheckboxProps } from './types';

/**
 * The design's "Data/Check item" (Figma V5 6027:17252, build note 2) on KERN's checkbox
 * markup: a 20px box, 8px to a 14px label, the white tick and the mixed dash. The box, the
 * tick, the dash and the row are the scoped override in index.css (design-notes §2, option b),
 * because KERN draws a 32px box with its own ::before tick. Unlike KernCheckbox it can be
 * indeterminate, which only a script can set, and it takes a description.
 */
export default function Checkbox({
  id,
  label,
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
  describedBy,
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className="kern-form-check">
      <input
        ref={inputRef}
        id={id}
        type="checkbox"
        className="kern-form-check__checkbox motion transition-colors duration-(--duration-colour)"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={describedBy}
      />
      <label htmlFor={id} className="kern-label">
        {label}
      </label>
    </div>
  );
}
