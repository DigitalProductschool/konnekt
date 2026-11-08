import { useId } from 'react';

import type { AccessLevelOptionProps } from './types';

/**
 * One access level: KERN's radio (kit P33 base-radio) with the level's name as its label, and
 * what it allows under it (W16, not drawn), indented to the label (48px) and linked to the
 * radio. Two values differ from kern.css and are set here: the label's top padding is the
 * kit's baseline 6px (kern.css: 4px), and the selected dot is ink (#0b1220, the kit's
 * layout-text-default), where kern.css paints it in the input border colour (#22293a).
 */
export default function AccessLevelOption({
  level,
  name,
  checked,
  disabled,
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
          disabled={disabled}
          onChange={onSelect}
          aria-describedby={descriptionId}
          className="kern-form-check__radio checked:before:bg-kern-layout-text-default!"
        />
        <label htmlFor={id} className="kern-label pt-6!">
          {level.name}
        </label>
      </div>
      <p
        id={descriptionId}
        className={`text-kern-static-small text-kern-layout-text-muted pl-48 leading-(--kern-typography-line-height-medium-static) ${disabled ? 'opacity-40' : ''}`}
      >
        {level.allows}
      </p>
    </div>
  );
}
