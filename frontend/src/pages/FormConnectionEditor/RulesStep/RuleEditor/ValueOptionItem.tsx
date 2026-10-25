import checkIcon from '../../../../assets/icons/check-white-small.svg';
import type { ValueOptionItemProps } from './types';

/**
 * A value of the values menu with its checkbox (Figma "Data/Check item", 20px box), or a licence
 * class with its code and description (Figma "Rules/Menu item · class", F32). The focus ring is
 * around the box only, for keyboard focus.
 */
export default function ValueOptionItem({
  id,
  choice,
  classes,
  checked,
  onToggle,
  onKeyDown,
}: ValueOptionItemProps) {
  return (
    <li>
      <label
        className={`text-kern-static-small text-kern-layout-text-default flex cursor-pointer items-center gap-8 leading-(--kern-typography-line-height-medium-static) ${
          classes ? 'rounded-kern-small hover:bg-kern-layout-background-hued min-h-40 p-8' : 'py-4'
        }`}
      >
        <span className="relative flex size-20 shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            onKeyDown={onKeyDown}
            className="peer rounded-kern-small border-kern-layout-border bg-kern-layout-background-default checked:border-kern-action-default checked:bg-kern-action-default focus-visible:outline-kern-layout-text-default size-20 cursor-pointer appearance-none border focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          <img
            src={checkIcon}
            alt=""
            className="pointer-events-none absolute inset-0 hidden size-20 peer-checked:block"
          />
        </span>
        {classes ? (
          <>
            <span className="min-w-32 shrink-0 font-semibold">{choice.label}</span>
            <span className="min-w-0 flex-1">{choice.description}</span>
          </>
        ) : (
          <span>{choice.label}</span>
        )}
      </label>
    </li>
  );
}
