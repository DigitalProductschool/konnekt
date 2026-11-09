import { useId } from 'react';

import { START_WITH_OPTION_CLASSES } from './constants';
import type { StartWithOptionProps } from './types';

/**
 * One choice of "Start with" in the Add variant dialog (U37 6044:16353, 6044:16358; the design's
 * "Data/Radio item"): a 20px radio with its label, and the help under it, indented to the label
 * (28px) and linked to the radio.
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
    <div className="flex flex-col">
      <div className={START_WITH_OPTION_CLASSES.row}>
        <input
          id={id}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onSelect}
          aria-describedby={helpId}
          className={START_WITH_OPTION_CLASSES.radio}
        />
        <label htmlFor={id} className={START_WITH_OPTION_CLASSES.label}>
          {label}
        </label>
      </div>
      <p id={helpId} className={START_WITH_OPTION_CLASSES.help}>
        {help}
      </p>
    </div>
  );
}
