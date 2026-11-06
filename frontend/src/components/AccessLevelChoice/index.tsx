import AccessLevelOption from './AccessLevelOption';
import { ACCESS_LEVELS } from './constants';
import type { AccessLevelChoiceProps } from './types';

/**
 * The access levels as a KERN radio group (contracts/ui-screens.md S1, shared by the consent
 * page, the user page's dialogs and the approval page). Native radios: Tab reaches the group,
 * the arrow keys choose, and KERN draws the focus ring.
 */
export default function AccessLevelChoice({
  levels,
  value,
  onChange,
  name,
  legend,
}: AccessLevelChoiceProps) {
  const options = levels && levels.length > 0 ? levels : ACCESS_LEVELS;
  return (
    <fieldset className="flex flex-col gap-16">
      <legend className="text-kern-static-medium text-kern-layout-text-default mb-8 leading-(--kern-typography-line-height-medium-static) font-semibold">
        {legend}
      </legend>
      {options.map((level) => (
        <AccessLevelOption
          key={level.level}
          level={level}
          name={name}
          checked={level.level === value}
          onSelect={() => onChange(level.level)}
        />
      ))}
    </fieldset>
  );
}
