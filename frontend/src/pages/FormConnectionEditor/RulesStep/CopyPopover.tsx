import {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { type MenuDirection, placementFrom } from '../../../utils/popupPlacement';
import { COPY_POPOVER_PLACEMENTS, COPY_POPOVER_WIDTH, RULES_COPY } from './constants';
import CopyTargetItem from './CopyTargetItem';
import type { CopyPopoverProps } from './types';
import { copyTargetsOf } from './utils';

/** The controls the Tab key moves between inside the popover */
const TABBABLE = 'input:not(:disabled), button';

/**
 * "Copy to variant" (U41 6344:53981; FR-040, Q28c): a popover from the rule's ⋯, not a modal
 * dialog, titled "Copy Rule 06 to", that lists the other variants in tab order (002-S4.12) as
 * the design's check items. Standard's carries the help text "Variants linked to Standard get it
 * too." while a variant linked to it is listed; while Standard is chosen, those variants show as
 * included, ticked and not choosable, described by that text (W17, FR-040, 002-S4.13). The focus
 * moves to the first variant and stays inside: Tab and Shift+Tab go round its controls (FR-040).
 * Escape, Cancel and a click elsewhere close it and give the focus back to the ⋯; "Copy" copies to
 * what is chosen, and is `aria-disabled` while nothing is. The caller decides the side as it
 * opens; the direction is measured here before it paints, from its own height (T020's
 * placement, as the ⋯ menus): below the ⋯ where it fits above the footer, otherwise above it.
 * It takes no max-height step: where it fits on neither side (320 × 640) its list would shrink
 * to a sliver, so it keeps its height and the page scrolls to it, Tab bringing each control into
 * view clear of the sticky header and footer. A press inside it that
 * isn't on a control moves the focus to the popover itself (bug copy-popover-label-click), so
 * that a click on a variant's name ticks it instead of closing the popover. Cancel calls
 * `onClose` without the click event, as Escape does (bug copy-popover-cancel-crash).
 */
export default function CopyPopover({
  state,
  branchKey,
  ruleName,
  placement,
  onCopy,
  onClose,
  onDismiss,
}: CopyPopoverProps) {
  const [chosen, setChosen] = useState<string[]>([]);
  // Whether it opens below or above the ⋯, measured once it has rendered
  const [direction, setDirection] = useState<MenuDirection>('down');
  const popoverRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const hintId = `${id}-hint`;
  const main = state.branches[0];
  const targets = copyTargetsOf(state, branchKey, chosen);
  const nothingChosen = chosen.length === 0;

  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  // Measured before the browser paints, from the ⋯'s wrapper and the popover's own height
  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (!popover) {
      return;
    }
    const { direction: measured } = placementFrom(
      popover.parentElement,
      COPY_POPOVER_WIDTH,
      'end',
      0,
      popover.offsetHeight
    );
    // The placement is a measurement of the page, which only exists after the render
    setDirection(measured);
  }, []);

  // Once, on opening: the focus moves in, and a click outside the rule's ⋯ and the popover
  // closes it
  useEffect(() => {
    popoverRef.current?.querySelector<HTMLElement>(TABBABLE)?.focus();
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!popoverRef.current?.parentElement?.contains(event.target as Node)) {
        closeRef.current();
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  /** Escape closes it; Tab and Shift+Tab go round its controls, from the last to the first */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(TABBABLE)];
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === event.currentTarget)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  // The focus leaving the ⋯ and the popover another way than Tab (a screen reader's cursor, a
  // script) closes it, and the focus stays where it went. A press inside it that isn't on a
  // control moves the focus to the popover itself (tabIndex -1): otherwise it would go to the
  // rule row (tabIndex -1 in RuleRow) and close the popover before the label's click ticks the box
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next && !event.currentTarget.parentElement?.contains(next)) {
      onDismiss();
    }
  }

  function toggle(key: string) {
    setChosen((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
    );
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`rounded-kern-default bg-kern-layout-background-default shadow-menu absolute z-40 flex flex-col gap-8 border border-(--kern-color-decorative-border-default) p-16 outline-none ${COPY_POPOVER_PLACEMENTS[placement][direction]}`}
    >
      <p
        id={`${id}-title`}
        className="text-kern-static-small text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold"
      >
        {RULES_COPY.copyTitle(ruleName)}
      </p>
      {targets.map((target) => (
        <div key={target.branch.key} className="flex flex-col gap-8">
          <CopyTargetItem
            id={`${id}-${target.branch.key}`}
            label={target.branch.name}
            checked={chosen.includes(target.branch.key)}
            included={target.included}
            describedBy={target.hint || target.included ? hintId : undefined}
            onToggle={() => toggle(target.branch.key)}
          />
          {target.hint && (
            <p
              id={hintId}
              className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)"
            >
              {RULES_COPY.copyHint(main.name)}
            </p>
          )}
        </div>
      ))}
      <div className="flex justify-end gap-8">
        <button
          type="button"
          onClick={() => onClose()}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span className="kern-label">{RULES_COPY.cancel}</span>
        </button>
        <button
          type="button"
          aria-disabled={nothingChosen}
          onClick={nothingChosen ? undefined : () => onCopy(chosen)}
          className="kern-btn kern-btn--secondary"
        >
          <span className="kern-label">{RULES_COPY.copy}</span>
        </button>
      </div>
    </div>
  );
}
