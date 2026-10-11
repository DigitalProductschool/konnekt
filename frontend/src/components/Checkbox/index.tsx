import { useEffect, useRef } from 'react';

import type { CheckboxProps } from './types';

/**
 * A KERN checkbox (`kern-form-check`). Unlike KernCheckbox it can be indeterminate, which
 * only a script can set, and it takes a description.
 */
export default function Checkbox({
  id,
  label,
  checked,
  indeterminate = false,
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
        className="kern-form-check__checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={describedBy}
      />
      {/* The design's label baseline padding (6/2); kern.css puts the text 2px higher */}
      <label htmlFor={id} className="kern-label pt-6!">
        {label}
      </label>
    </div>
  );
}
