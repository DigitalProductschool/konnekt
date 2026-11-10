import expandIcon from '../../../../assets/icons/picker-expand.svg';
import expandOpenIcon from '../../../../assets/icons/picker-expand-open.svg';
import SymbolChip from './SymbolChip';
import type { PickerProps } from './types';

/**
 * Figma "Rules/Picker" (6083:3529; U30 6348:40747, 6350:41179): a compact, content-wide trigger
 * of a rule editor menu, white with a 1px border, 40 high, 16px before and 8px after its
 * content; what to choose and the choice both in the ink colour, as drawn. It is disabled until
 * the choice before it is made (FR-039, W19), drawn on U49 6196:10247: the hued fill with muted
 * text and the default border, at full opacity; blue while its menu is open, and red when its value has a problem or is missing after "Save
 * rule" (the inline flag, FR-039). The open state's 2px border is a 1px border with a 1px inner
 * ring, so that the content stays where it is, as Figma draws strokes inside. Below 768px (200%
 * zoom, small screens) a long choice wraps instead of running out of the editor (WCAG 1.4.10).
 */
export default function Picker({
  id,
  name,
  label,
  disabled = false,
  open,
  invalid = false,
  icon,
  symbol,
  menuId,
  describedBy,
  onToggle,
}: PickerProps) {
  const border = open
    ? 'border-kern-action-default ring-1 ring-inset ring-kern-action-default'
    : invalid
      ? 'border-kern-feedback-danger'
      : 'border-(--kern-color-decorative-border-default)';
  const text = open
    ? 'text-kern-action-default'
    : disabled
      ? 'text-kern-layout-text-muted'
      : 'text-kern-layout-text-default';
  // Under 320 CSS px the label takes a line of its own under the icons (T096). A one-word label
  // longer than the picker (German "Personalausweis" in a group's editor at 320px) breaks inside
  // the word instead of running under the chevron (spec 009 R9 step 2, as `SearchResultItem`;
  // T048's re-check)
  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      onClick={onToggle}
      className={`rounded-kern-default focus-visible:outline-kern-action-focus-default bg-kern-layout-background-default disabled:bg-kern-layout-background-hued narrow:flex-wrap flex h-40 shrink-0 cursor-pointer items-center gap-8 border pr-8 pl-16 focus-visible:outline-4 focus-visible:outline-offset-2 disabled:cursor-default max-md:h-auto max-md:min-h-40 max-md:max-w-full max-md:py-7 max-md:text-left ${border}`}
    >
      {icon && <img src={icon} alt="" className="size-16 shrink-0" />}
      {symbol && <SymbolChip symbol={symbol} />}
      <span
        className={`text-kern-static-medium narrow:order-last narrow:basis-full min-w-0 leading-(--kern-typography-line-height-medium-static) break-words hyphens-auto whitespace-nowrap max-md:whitespace-normal ${text}`}
      >
        <span className="sr-only">{name}: </span>
        {label}
      </span>
      <img
        src={open ? expandOpenIcon : expandIcon}
        alt=""
        className={`size-20 shrink-0 ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );
}
