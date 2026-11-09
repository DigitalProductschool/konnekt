import Checkbox from '../../../components/Checkbox';
import type { CopyTargetItemProps } from './types';

/**
 * A variant to copy a rule to (U41 6344:53983, 6344:53985; Figma "Data/Check item" 6027:17252):
 * KERN's checkbox with the `Checkbox` override in index.css (design-notes §2 `Checkbox`, T016),
 * a 20px box 8px from the 14/24 name in a 32px row; hover a 2px blue border, checked hover a 3px
 * tint ring, keyboard focus a 3px ring around the box only. A variant linked to Standard shows
 * as included while Standard is chosen: ticked, not choosable, at KERN's 40% (W17, FR-040,
 * 002-S4.13), described by the popover's help text.
 */
export default function CopyTargetItem({
  id,
  label,
  checked,
  included,
  describedBy,
  onToggle,
}: CopyTargetItemProps) {
  return (
    <Checkbox
      id={id}
      label={label}
      checked={checked || included}
      disabled={included}
      onChange={onToggle}
      describedBy={describedBy}
    />
  );
}
