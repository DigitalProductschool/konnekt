import AccessLevelOption from './AccessLevelOption';
import { ACCESS_LEVELS } from './constants';
import type { AccessLevelChoiceProps } from './types';

/**
 * The access levels as KERN's radio group in the kit's fieldset (kit P14 input-radios, P15
 * fieldset; design-notes §2, option a; W16: shared by the consent page, the account page's
 * dialogs and the approval page). The legend is the kit's label/default (16/24, 600, baseline
 * 6/2) with 8px under it, the radios 16px apart. Native radios: Tab reaches the group, the arrow
 * keys choose, and KERN draws the focus ring.
 */
export default function AccessLevelChoice({
  levels,
  value,
  onChange,
  name,
  legend,
  disabled = false,
}: AccessLevelChoiceProps) {
  const options = levels && levels.length > 0 ? levels : ACCESS_LEVELS;
  return (
    <fieldset className="flex flex-col gap-16">
      <legend className="text-kern-static-medium text-kern-layout-text-default mb-8 pt-6 pb-2 leading-(--kern-typography-line-height-medium-static) font-semibold">
        {legend}
      </legend>
      {options.map((level) => (
        <AccessLevelOption
          key={level.level}
          level={level}
          name={name}
          checked={level.level === value}
          disabled={disabled}
          onSelect={() => onChange(level.level)}
        />
      ))}
    </fieldset>
  );
}
