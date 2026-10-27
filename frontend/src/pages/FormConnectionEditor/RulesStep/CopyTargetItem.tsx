import checkIcon from '../../../assets/icons/check-white-small.svg';
import { INACTIVE_OPACITY } from '../../../components/BranchMark/constants';
import type { CopyTargetItemProps } from './types';

/**
 * A variant to copy a rule to (U20 6344:53983; Figma "Data/Check item", 20px box). A variant
 * based on Standard shows as included, and can't be chosen, while Standard is (FR-022). The
 * focus ring is around the box only, for keyboard focus.
 */
export default function CopyTargetItem({
  id,
  label,
  checked,
  included,
  onToggle,
}: CopyTargetItemProps) {
  return (
    <label
      className={`text-kern-static-small text-kern-layout-text-default flex items-center gap-8 py-4 leading-(--kern-typography-line-height-medium-static) ${
        included ? INACTIVE_OPACITY : 'cursor-pointer'
      }`}
    >
      <span className="relative flex size-20 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked || included}
          disabled={included}
          onChange={onToggle}
          className="peer rounded-kern-small border-kern-layout-border bg-kern-layout-background-default checked:border-kern-action-default checked:bg-kern-action-default focus-visible:outline-kern-layout-text-default size-20 cursor-pointer appearance-none border focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default"
        />
        <img
          src={checkIcon}
          alt=""
          className="pointer-events-none absolute inset-0 hidden size-20 peer-checked:block"
        />
      </span>
      <span>{label}</span>
    </label>
  );
}
