import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { RULES_COPY } from './constants';
import CopyTargetItem from './CopyTargetItem';
import type { CopyPopoverProps } from './types';
import { copyTargetsOf } from './utils';

/**
 * "Copy to variant" (U20 6344:53981; decision 2026-10-25, design-notes §4): a popover under the
 * rule's ⋯ that lists the other variants. Choosing Standard covers the variants based on it,
 * which then show as included (FR-022). The focus moves to the first variant; Escape, Cancel and
 * a click elsewhere close it, and "Copy" copies to what is chosen.
 */
export default function CopyPopover({
  state,
  branchKey,
  ruleName,
  onCopy,
  onClose,
}: CopyPopoverProps) {
  const [chosen, setChosen] = useState<string[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const main = state.branches[0];
  const targets = copyTargetsOf(state, branchKey, chosen);
  const nothingChosen = chosen.length === 0;

  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  // Once, on opening: the focus moves in, and a click outside the rule's ⋯ and the popover
  // closes it
  useEffect(() => {
    popoverRef.current?.querySelector<HTMLElement>('input')?.focus();
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!popoverRef.current?.parentElement?.contains(event.target as Node)) {
        closeRef.current();
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
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
      onKeyDown={handleKeyDown}
      className="rounded-kern-default bg-kern-layout-background-default shadow-menu absolute top-full right-0 z-20 mt-4 flex w-300 max-w-[calc(100vw-32px)] flex-col gap-8 border border-(--kern-color-decorative-border-default) p-16"
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
            onToggle={() => toggle(target.branch.key)}
          />
          {target.hint && (
            <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
              {RULES_COPY.copyHint(main.name)}
            </p>
          )}
        </div>
      ))}
      <div className="flex justify-end gap-8">
        <button
          type="button"
          onClick={onClose}
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
