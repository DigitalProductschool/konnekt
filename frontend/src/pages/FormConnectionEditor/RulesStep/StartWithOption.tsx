import { useId } from 'react';

import type { StartWithOptionProps } from './types';

/**
 * One choice of "Start with" in the Add variant dialog (U17 6139:32693): KERN's radio with its
 * label, and the help under it, indented to the label (48px) and linked to the radio.
 */
export default function StartWithOption({
  name,
  value,
  label,
  help,
  checked,
  onSelect,
}: StartWithOptionProps) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div className="flex flex-col gap-8">
      <div className="kern-form-check">
        <input
          id={id}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onSelect}
          aria-describedby={helpId}
          className="kern-form-check__radio"
        />
        <label htmlFor={id} className="kern-label">
          {label}
        </label>
      </div>
      <p
        id={helpId}
        className="text-kern-static-small text-kern-layout-text-muted pl-48 leading-(--kern-typography-line-height-medium-static)"
      >
        {help}
      </p>
    </div>
  );
}
