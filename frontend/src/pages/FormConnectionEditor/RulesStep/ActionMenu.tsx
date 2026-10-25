import { Fragment, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { MENU_NAVIGATION_KEYS, nextMenuIndex } from '../../../utils/menuNavigation';
import RuleMenuItem from './RuleMenuItem';
import type { ActionMenuProps } from './types';

/**
 * A ⋯ button ("Rules/More button") and its menu, built like the rule menu (U14 6113:28988). It
 * follows the WAI-ARIA menu button pattern. Choosing an action gives the focus back to the ⋯
 * first, so that a dialog the action opens returns it there.
 */
export default function ActionMenu({ label, actions }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
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
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    triggerRef.current?.focus();
    action();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (MENU_NAVIGATION_KEYS.has(event.key)) {
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      items[nextMenuIndex(event.key, current, items.length)]?.focus();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={handleTriggerKeyDown}
        className="rounded-kern-small hover:bg-kern-neutral-050 focus-visible:outline-kern-action-focus-default flex size-32 cursor-pointer items-center justify-center focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        <span
          aria-hidden="true"
          className="kern-icon kern-icon--more-vert kern-icon--small bg-kern-layout-text-default!"
        />
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={handleMenuKeyDown}
          className="rounded-kern-default bg-kern-layout-background-default shadow-menu absolute top-full right-0 z-20 mt-4 flex w-220 flex-col gap-2 border border-(--kern-color-decorative-border-default) p-8"
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
