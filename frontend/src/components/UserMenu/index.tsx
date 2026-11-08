import type { LoginLocationState } from '@connection-portal/api-types/routing';
import { type KeyboardEvent, useEffect, useId, useReducer, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { ROUTES } from '../../constants';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useLocalDraftStore } from '../../hooks/useLocalDraftStore';
import { flushPendingLocalDrafts } from '../../utils/localDrafts/store';
import { MENU_NAVIGATION_KEYS, nextMenuIndex } from '../../utils/menuNavigation';
import {
  MENU_MAX_HEIGHT_CLASSES,
  type MenuPlacement,
  placementFrom,
  popupWrapperClass,
} from '../../utils/popupPlacement';
import { ACTION_MENU_STATES } from '../ActionMenu/constants';
import {
  ACCOUNT_MENU_HEIGHT,
  ACCOUNT_MENU_PLACEMENTS,
  ACCOUNT_MENU_WIDTH,
  ACCOUNT_PILL_CLASSES,
  INITIAL_USER_MENU_STATE,
  LOG_OUT_LABEL,
  MENU_ITEM_CLASSES,
  SIGN_IN_SCREEN_POLL_MS,
  SIGN_IN_SCREEN_WAIT_MS,
  SIGNED_IN_AS,
  YOUR_ACCOUNT_LABEL,
} from './constants';
import SignOutDialog from './SignOutDialog';
import type { UserMenuProps } from './types';
import { signOutNamesOf, userMenuReducer } from './utils';

const DIVIDER_CLASSES = 'h-px shrink-0 bg-(--kern-color-decorative-border-default)';

/**
 * The account pill and "Shell/Account menu" (Figma U11 6699:44242, U13 6699:44358; FR-030,
 * F17): the icon-only pill opens a menu with the signed-in user's name in bold, "Your account",
 * which leads to the user page (spec 007, S2), and "Log out"; no email. The menu is placed as
 * the ⋯ menus are (design-notes §3 "Menu", `placementFrom()`), 8px below the pill with its right
 * edge on the pill's. It follows the WAI-ARIA menu button pattern: the first item takes the focus
 * when it opens, the arrow keys, Home and End move between the items, and Escape and a click
 * outside close it.
 *
 * If the account has local drafts on this device, "Log out" first warns that it discards them
 * (S7, W8; FR-019). Only a confirmed "Log out" removes them: `signOut()` itself, which also runs
 * when the session expires, never does. After logging out, the sign-in screen gets the router
 * state `loggedOut` for its toast "You're logged out." (FR-051 (30)). In a flow, `onLogOut` lets
 * the editor ask first (FR-026, T048).
 */
export default function UserMenu({ onLogOut }: UserMenuProps) {
  const { user, signOut } = useCurrentUser();
  const { store, username } = useLocalDraftStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, dispatch] = useReducer(userMenuReducer, INITIAL_USER_MENU_STATE);
  const { open, signOutNames, signingOut } = state;
  // Measured when the menu opens (research R10); read only while it is open
  const [placement, setPlacement] = useState<MenuPlacement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const menuId = useId();
  // Set by "Cancel": the focus goes back to the menu button once the dialog has closed
  const returnFocus = useRef(false);
  const shown = open && placement !== null ? placement : null;

  useEffect(() => {
    if (!open) {
      return;
    }
    menuRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        dispatch({ type: 'closed' });
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  // Runs after ConfirmDialog's effect has closed the native dialog, so the focus stays here
  useEffect(() => {
    if (signOutNames === null && returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [signOutNames]);

  if (user === null) {
    return null;
  }

  function measure() {
    setPlacement(
      placementFrom(containerRef.current, ACCOUNT_MENU_WIDTH, 'end', 0, ACCOUNT_MENU_HEIGHT)
    );
  }

  function handleTriggerClick() {
    if (!open) {
      measure();
    }
    dispatch({ type: 'toggled' });
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      measure();
      dispatch({ type: 'opened' });
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dispatch({ type: 'closed' });
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      dispatch({ type: 'closed' });
    } else if (MENU_NAVIGATION_KEYS.has(event.key)) {
      event.preventDefault();
      const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
      const current = items.indexOf(document.activeElement as HTMLElement);
      items[nextMenuIndex(event.key, current, items.length)]?.focus();
    }
  }

  // Signs out; once the sign-in guard has shown the sign-in screen, its state gets the toast's
  // flag, with `from` as the guard sets it (the guard's own redirect would replace it otherwise)
  async function finishSignOut() {
    const { pathname, search, hash } = location;
    await signOut();
    await signInScreenShown();
    const loggedOut: LoginLocationState = { from: { pathname, search, hash }, loggedOut: true };
    navigate(ROUTES.login, { replace: true, state: loggedOut });
  }

  async function logOut() {
    // The work of the last second counts too (R11)
    flushPendingLocalDrafts();
    const records = username === null ? [] : store.list(username);
    if (records.length === 0) {
      dispatch({ type: 'closed' });
      await finishSignOut();
      return;
    }
    dispatch({ type: 'signOutAsked', names: signOutNamesOf(records) });
  }

  function handleLogOut() {
    if (onLogOut) {
      dispatch({ type: 'closed' });
      onLogOut(() => void logOut(), triggerRef.current);
      return;
    }
    void logOut();
  }

  function handleSignOutCancel() {
    returnFocus.current = true;
    dispatch({ type: 'signOutCancelled' });
  }

  async function handleSignOutConfirm() {
    dispatch({ type: 'signOutConfirmed' });
    if (username !== null) {
      store.removeAll(username);
      // Refuses the account's writes, so an editor's flush on unmount brings nothing back
      store.close(username);
    }
    await finishSignOut();
  }

  return (
    <div ref={containerRef} className={popupWrapperClass(shown?.side ?? null)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={ACCOUNT_PILL_CLASSES}
      >
        <span aria-hidden="true" className="icon-person" />
        <span aria-hidden="true" className="icon-expand-more-small" />
        <span className="sr-only">
          {SIGNED_IN_AS} {user.username}
        </span>
      </button>
      {shown && (
        <div
          className={`rounded-kern-default bg-kern-layout-background-default shadow-menu absolute z-40 flex flex-col gap-4 border border-(--kern-color-decorative-border-default) p-8 ${MENU_MAX_HEIGHT_CLASSES[shown.maxHeight]} ${ACCOUNT_MENU_PLACEMENTS[shown.side][shown.direction]}`}
        >
          <p className="text-kern-static-medium text-kern-layout-text-default shrink-0 p-8 leading-(--kern-typography-line-height-medium-static) font-semibold wrap-anywhere">
            {user.username}
          </p>
          <div aria-hidden="true" className={DIVIDER_CLASSES} />
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            onKeyDown={handleMenuKeyDown}
            className="flex min-h-0 flex-col gap-4 overflow-y-auto"
          >
            <Link
              to={ROUTES.account}
              role="menuitem"
              tabIndex={-1}
              onClick={() => dispatch({ type: 'closed' })}
              className={`${MENU_ITEM_CLASSES} ${ACTION_MENU_STATES}`}
            >
              {YOUR_ACCOUNT_LABEL}
            </Link>
            <div role="separator" className={DIVIDER_CLASSES} />
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={handleLogOut}
              className={`${MENU_ITEM_CLASSES} ${ACTION_MENU_STATES}`}
            >
              {LOG_OUT_LABEL}
            </button>
          </div>
        </div>
      )}
      <SignOutDialog
        names={signOutNames}
        busy={signingOut}
        onCancel={handleSignOutCancel}
        onConfirm={handleSignOutConfirm}
      />
    </div>
  );
}

/**
 * Resolves once the window shows the sign-in screen, after the sign-in guard's redirect, or after
 * `SIGN_IN_SCREEN_WAIT_MS` at the latest
 */
function signInScreenShown(): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    function check() {
      if (
        window.location.pathname === ROUTES.login ||
        Date.now() - start >= SIGN_IN_SCREEN_WAIT_MS
      ) {
        resolve();
      } else {
        window.setTimeout(check, SIGN_IN_SCREEN_POLL_MS);
      }
    }
    check();
  });
}
