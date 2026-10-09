import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import expandMoreIcon from '../../assets/icons/expand-more.svg';
import logoutIcon from '../../assets/icons/logout.svg';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { LOG_OUT_LABEL, MENU_NAVIGATION_KEYS, SIGNED_IN_AS } from './constants';
import { initialsOf } from './utils';

/**
 * Figma "App/User menu": the avatar opens a panel with the signed-in user and the
 * "Log out" action. It follows the WAI-ARIA menu button pattern. After logging out,
 * the route guard shows the sign-in screen.
 */
export default function UserMenu() {
  const { user, signOut } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);
  const triggerId = useId();
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    itemRef.current?.focus();
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  if (user === null) {
    return null;
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (MENU_NAVIGATION_KEYS.has(event.key)) {
      event.preventDefault();
      itemRef.current?.focus();
    }
  }

  async function handleSignOut() {
    setOpen(false);
    await signOut();
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
        className={`focus-visible:outline-kern-action-focus-default flex cursor-pointer items-center gap-4 rounded-[20px] py-2 pr-6 pl-2 focus-visible:outline-4 focus-visible:outline-offset-2 ${open ? 'border-kern-action-default bg-kern-darkblue-050 border' : ''}`}
      >
        <span
          aria-hidden="true"
          className="rounded-kern-circle bg-kern-neutral-050 text-kern-static-small text-kern-layout-text-default flex size-32 items-center justify-center leading-(--kern-typography-line-height-medium-static) font-semibold"
        >
          {initialsOf(user.username)}
        </span>
        <img src={expandMoreIcon} alt="" className="size-20" />
        <span className="kern-sr-only">
          {SIGNED_IN_AS} {user.username}
        </span>
      </button>
      {open && (
        <div className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default shadow-menu absolute top-full right-0 z-10 mt-8 flex w-280 flex-col overflow-clip border">
          <p className="border-kern-neutral-100 text-kern-static-small text-kern-layout-text-default border-b px-16 py-14 leading-(--kern-typography-line-height-medium-static) font-semibold">
            {user.username}
          </p>
          <div
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            onKeyDown={handleMenuKeyDown}
            className="py-4"
          >
            <button
              ref={itemRef}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={handleSignOut}
              className="text-kern-static-small text-kern-layout-text-default hover:bg-kern-neutral-050 focus-visible:bg-kern-neutral-050 focus-visible:outline-kern-action-focus-default flex h-48 w-full cursor-pointer items-center gap-12 px-16 leading-(--kern-typography-line-height-medium-static) font-semibold focus-visible:outline-4 focus-visible:-outline-offset-4"
            >
              <img src={logoutIcon} alt="" className="size-20" />
              {LOG_OUT_LABEL}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
