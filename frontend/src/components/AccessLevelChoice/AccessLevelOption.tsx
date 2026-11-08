import { useId } from 'react';

import type { AccessLevelOptionProps } from './types';

/**
 * One access level: KERN's radio with the level's name as its label, and what it allows under
 * it, indented to the label (48px) and linked to the radio
 */
export default function AccessLevelOption({
  level,
  name,
  checked,
  onSelect,
}: AccessLevelOptionProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div className="flex flex-col gap-8">
      <div className="kern-form-check">
        <input
          id={id}
          type="radio"
          name={name}
          value={level.level}
          checked={checked}
          onChange={onSelect}
          aria-describedby={descriptionId}
          className="kern-form-check__radio"
        />
        <label htmlFor={id} className="kern-label">
          {level.name}
        </label>
      </div>
      <p
        id={descriptionId}
        className="text-kern-static-small text-kern-layout-text-muted pl-48 leading-(--kern-typography-line-height-medium-static)"
      >
        {level.allows}
      </p>
    </div>
  );
}
