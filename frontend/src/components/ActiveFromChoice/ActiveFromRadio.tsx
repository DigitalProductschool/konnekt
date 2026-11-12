import { useId } from 'react';

import { ACTIVE_FROM_RADIO_CLASSES } from './constants';
import type { ActiveFromRadioProps } from './types';

/** One choice of "Active from" (the design's "Data/Radio item" 6387:26931): radio and label */
export default function ActiveFromRadio({
  name,
  value,
  label,
  checked,
  disabled,
  onSelect,
}: ActiveFromRadioProps) {
  const id = useId();
  return (
    <div className={ACTIVE_FROM_RADIO_CLASSES.row}>
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className={ACTIVE_FROM_RADIO_CLASSES.radio}
      />
      <label htmlFor={id} className={ACTIVE_FROM_RADIO_CLASSES.label}>
        {label}
      </label>
    </div>
  );
}
