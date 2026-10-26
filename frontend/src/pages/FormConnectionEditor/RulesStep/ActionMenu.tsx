import { Fragment, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { MENU_NAVIGATION_KEYS, nextMenuIndex } from '../../../utils/menuNavigation';
import {
  placementFrom,
  type PopupPlacement,
  popupWrapperClass,
} from '../../../utils/popupPlacement';
import { ACTION_MENU_PLACEMENTS, ACTION_MENU_WIDTH } from './constants';
import RuleMenuItem from './RuleMenuItem';
import type { ActionMenuProps } from './types';

/**
 * A ⋯ button ("Rules/More button") and its menu, built like the rule menu (U14 6113:28988). It
 * follows the WAI-ARIA menu button pattern. Choosing an action gives the focus back to the ⋯
 * first, so that a dialog the action opens returns it there. The menu opens to the left of its
 * ⋯ where it fits, as Figma draws it, otherwise to the right or across the window (WCAG 1.4.10).
 */
export default function ActionMenu({ label, actions }: ActionMenuProps) {
  // Where the open menu is placed; null while it is closed
  const [placement, setPlacement] = useState<PopupPlacement | null>(null);
  const open = placement !== null;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    menuRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setPlacement(null);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  function openMenu() {
    setPlacement(placementFrom(containerRef.current, ACTION_MENU_WIDTH, 'end'));
  }

  function choose(action: () => void) {
    setPlacement(null);
    triggerRef.current?.focus();
    action();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setPlacement(null);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setPlacement(null);
    } else if (MENU_NAVIGATION_KEYS.has(event.key)) {
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      items[nextMenuIndex(event.key, current, items.length)]?.focus();
    }
  }

  return (
    <div ref={containerRef} className={popupWrapperClass(placement)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setPlacement(null) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className="rounded-kern-small hover:bg-kern-neutral-050 focus-visible:outline-kern-action-focus-default flex size-32 cursor-pointer items-center justify-center focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        <span
          aria-hidden="true"
          className="kern-icon kern-icon--more-vert kern-icon--small bg-kern-layout-text-default!"
        />
        <span className="sr-only">{label}</span>
      </button>
      {placement && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={handleMenuKeyDown}
          className={`rounded-kern-default bg-kern-layout-background-default shadow-menu z-20 mt-4 flex flex-col gap-2 border border-(--kern-color-decorative-border-default) p-8 ${ACTION_MENU_PLACEMENTS[placement]}`}
        >
          {actions.map((action) => (
            <Fragment key={action.label}>
              {action.separated && (
                <div
                  role="separator"
                  className="h-px bg-(--kern-color-decorative-border-default)"
                />
              )}
              <RuleMenuItem
                label={action.label}
                icon={action.icon}
                danger={action.danger}
                onSelect={() => choose(action.onSelect)}
              />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
