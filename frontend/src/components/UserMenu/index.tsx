import { type KeyboardEvent, useEffect, useId, useReducer, useRef } from 'react';
import { Link } from 'react-router';

import expandMoreIcon from '../../assets/icons/expand-more.svg';
import logoutIcon from '../../assets/icons/logout.svg';
import { ROUTES } from '../../constants';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useLocalDraftStore } from '../../hooks/useLocalDraftStore';
import { flushPendingLocalDrafts } from '../../utils/localDrafts/store';
import { MENU_NAVIGATION_KEYS, nextMenuIndex } from '../../utils/menuNavigation';
import {
  INITIAL_USER_MENU_STATE,
  LOG_OUT_LABEL,
  MENU_ITEM_CLASSES,
  SIGNED_IN_AS,
  YOUR_ACCOUNT_LABEL,
} from './constants';
import SignOutDialog from './SignOutDialog';
import { initialsOf, signOutNamesOf, userMenuReducer } from './utils';

/**
 * Figma "App/User menu": the avatar opens a panel with the signed-in user, "Your account", which
 * leads to the user page (spec 007, S2), and the "Log out" action. It follows the WAI-ARIA menu
 * button pattern: the first item takes the focus when it opens, and the arrow keys, Home and End
 * move between the items. After logging out, the route guard shows the sign-in screen.
 *
 * If the account has local drafts on this device, "Log out" first warns that it discards them
 * (S7, W8; FR-019). Only a confirmed "Log out" removes them: `signOut()` itself, which also runs
 * when the session expires, never does.
 */
export default function UserMenu() {
  const { user, signOut } = useCurrentUser();
  const { store, username } = useLocalDraftStore();
  const [state, dispatch] = useReducer(userMenuReducer, INITIAL_USER_MENU_STATE);
  const { open, signOutNames, signingOut } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const menuId = useId();
  // Set by "Cancel": the focus goes back to the menu button once the dialog has closed
  const returnFocus = useRef(false);

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

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      dispatch({ type: 'opened' });
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
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

  async function handleSignOut() {
    // The work of the last second counts too (R11)
    flushPendingLocalDrafts();
    const records = username === null ? [] : store.list(username);
    if (records.length === 0) {
      dispatch({ type: 'closed' });
      await signOut();
      return;
    }
    dispatch({ type: 'signOutAsked', names: signOutNamesOf(records) });
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
        onClick={() => dispatch({ type: 'toggled' })}
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
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            onKeyDown={handleMenuKeyDown}
            className="py-4"
          >
            <Link
              to={ROUTES.account}
              role="menuitem"
              tabIndex={-1}
              onClick={() => dispatch({ type: 'closed' })}
              className={MENU_ITEM_CLASSES}
            >
              <span
                aria-hidden="true"
                className="kern-icon kern-icon--account-circle kern-icon--small bg-kern-layout-text-default!"
              />
              {YOUR_ACCOUNT_LABEL}
            </Link>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={handleSignOut}
              className={MENU_ITEM_CLASSES}
            >
              <img src={logoutIcon} alt="" className="size-20" />
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
