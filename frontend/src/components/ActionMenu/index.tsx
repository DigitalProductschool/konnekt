import { Fragment, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { MENU_NAVIGATION_KEYS, nextMenuIndex } from '../../utils/menuNavigation';
import {
  MENU_MAX_HEIGHT_CLASSES,
  type MenuPlacement,
  placementFrom,
  popupWrapperClass,
} from '../../utils/popupPlacement';
import {
  ACTION_MENU_DIVIDER_HEIGHT,
  ACTION_MENU_FRAME_HEIGHT,
  ACTION_MENU_MAX_WIDTH,
  ACTION_MENU_PLACEMENTS,
  ACTION_MENU_ROW_GAP,
  ACTION_MENU_ROW_HEIGHT,
  ACTION_MENU_STATES,
} from './constants';
import RuleMenuItem from './RuleMenuItem';
import type { ActionMenuProps, MenuAction } from './types';

/** The menu's height with every entry on one line, before it opens */
function menuHeightOf(actions: MenuAction[]): number {
  const dividers = actions.filter((action) => action.separated).length;
  const children = actions.length + dividers;
  return (
    ACTION_MENU_FRAME_HEIGHT +
    actions.length * ACTION_MENU_ROW_HEIGHT +
    dividers * ACTION_MENU_DIVIDER_HEIGHT +
    Math.max(children - 1, 0) * ACTION_MENU_ROW_GAP
  );
}

/**
 * A ⋯ button ("Rules/More button") and its menu ("Rules/Rule menu", U55 6530:40192; the menus'
 * anatomy, design-notes §3 "Menu"), shared by the rules step's menus and the account page's
 * rows. It follows the WAI-ARIA menu button pattern. Choosing an action gives the focus back to
 * the ⋯ first, so that a dialog the action opens returns it there. The menu is positioned from
 * its ⋯'s wrapper with class sets (research R10): to the left of its ⋯ where it fits, as Figma
 * draws it, otherwise to the right or across the box around it (WCAG 1.4.10); below the ⋯
 * where it fits above the footer, otherwise above it; its list scrolls inside the max-height
 * step that fits. It stays above the sticky header (z-40 over its z-30), and nothing around it
 * may clip it (V6).
 */
export default function ActionMenu({ label, actions }: ActionMenuProps) {
  // Where the open menu is placed; null while it is closed
  const [placement, setPlacement] = useState<MenuPlacement | null>(null);
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
    setPlacement(
      placementFrom(containerRef.current, ACTION_MENU_MAX_WIDTH, 'end', 0, menuHeightOf(actions))
    );
  }

  function choose(action: MenuAction) {
    if (action.disabled) {
      return;
    }
    setPlacement(null);
    triggerRef.current?.focus();
    action.onSelect();
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
    <div ref={containerRef} className={popupWrapperClass(placement?.side ?? null)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setPlacement(null) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={`rounded-kern-small focus-visible:outline-kern-action-focus-default flex size-32 cursor-pointer items-center justify-center focus-visible:outline-4 focus-visible:outline-offset-2 ${ACTION_MENU_STATES}`}
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
          className={`rounded-kern-default bg-kern-layout-background-default shadow-menu absolute z-40 flex flex-col border border-(--kern-color-decorative-border-default) p-8 ${MENU_MAX_HEIGHT_CLASSES[placement.maxHeight]} ${ACTION_MENU_PLACEMENTS[placement.side][placement.direction]}`}
        >
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            {/* Keyed by position, not by label: a label follows the language, and an entry
                keeps its element, and the focus, when the language changes (spec 009, FR-016) */}
            {actions.map((action, index) => (
              <Fragment key={index}>
                {action.separated && (
                  <div
                    role="separator"
                    className="h-px shrink-0 bg-(--kern-color-decorative-border-default)"
                  />
                )}
                <RuleMenuItem
                  label={action.label}
                  icon={action.icon}
                  danger={action.danger}
                  disabled={action.disabled}
                  onSelect={() => choose(action)}
                />
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
