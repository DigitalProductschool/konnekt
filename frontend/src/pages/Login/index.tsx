import type { LoginLocationState } from '@connection-portal/api-types/routing';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import AuthLayout from '../../components/AuthLayout';
import Toast from '../../components/Toast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCopy } from '../../hooks/useLanguage';
import { useSignInExit } from '../../hooks/useSignInMotion';
import { LOGIN_COPY } from './constants';
import LoginCard from './LoginCard';

/**
 * The sign-in screen S1 (Figma U10 "1 · Log in" 6401:27994) in the signed-out frame L1. After
 * "Log out" users land here with `loggedOut` in the router state (UserMenu) and see the toast
 * "You’re logged out." (FR-051 (30), U10 7128:74220): neutral, no action, 24 above the window's
 * edge (no footer), gone after 6 s. The flag is read once and then dropped from the history
 * entry, which keeps the route to return to, so that a reload or "Back to log in" doesn't show
 * the toast again. While the page leaves after a successful sign-in (bug login-welcome-motion),
 * the toast is gone, and the tab already has the destination's title.
 */
export default function LoginPage() {
  const copy = useCopy(LOGIN_COPY);
  const leaving = useSignInExit() !== null;
  useDocumentTitle(leaving ? null : copy.pageTitle);
  const location = useLocation();
  const navigate = useNavigate();
  const loggedOut = (location.state as LoginLocationState | null)?.loggedOut === true;
  // The shown toast's id; its one message is the website's own and follows the language
  const [toastId, setToastId] = useState<number | null>(null);
  // The history entry whose flag has been shown. "Log out" sets the flag on the screen the
  // sign-in guard has already shown, so the page is mounted by then and reacts to the change
  const [shownKey, setShownKey] = useState<string | null>(null);
  if (loggedOut && shownKey !== location.key) {
    setShownKey(location.key);
    setToastId((shown) => (shown ?? 0) + 1);
  }
  const dismissToast = useCallback(() => setToastId(null), []);

  useEffect(() => {
    if (loggedOut) {
      const kept: LoginLocationState = { from: (location.state as LoginLocationState).from };
      navigate(location.pathname, { replace: true, state: kept });
    }
  }, [loggedOut, location.state, location.pathname, navigate]);

  return (
    <>
      <AuthLayout>
        <LoginCard />
      </AuthLayout>
      {/* Outside the layout: its container query would make the fixed toast relative to it */}
      <Toast
        toast={toastId === null || leaving ? null : { id: toastId, message: copy.loggedOut }}
        onDismiss={dismissToast}
        noFooter
      />
    </>
  );
}
