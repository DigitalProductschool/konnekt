import { useLayoutEffect, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';

import AppLayout from './components/AppLayout';
import RequireSignedOut from './components/RequireSignedOut';
import RequireSignIn from './components/RequireSignIn';
import SignInMotionProvider from './components/SignInMotion';
import SignInExitLayer from './components/SignInMotion/ExitLayer';
import { ROUTES } from './constants';
import { useSignInHeldLocation } from './hooks/useSignInMotion';
import AccountPage from './pages/Account';
import ApprovalPage from './pages/Approval';
import AuthorizePage from './pages/Authorize';
import FirstConnectionPage from './pages/FirstConnection';
import ForgotPasswordPage from './pages/ForgotPassword';
import FormConnectionDetailPage from './pages/FormConnectionDetail';
import FormConnectionEditPage from './pages/FormConnectionEdit';
import FormConnectionEditorPage from './pages/FormConnectionEditor';
import FormConnectionListPage from './pages/FormConnectionList';
import LoginPage from './pages/Login';

/**
 * The signed-out screens, in the frame that keeps the sign-in page over its destination while it
 * leaves (bug login-welcome-motion)
 */
function SignedOutScreens() {
  return (
    <SignInExitLayer>
      <RequireSignedOut>
        <Outlet />
      </RequireSignedOut>
    </SignInExitLayer>
  );
}

function SignedInScreens() {
  return (
    <RequireSignIn>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </RequireSignIn>
  );
}

/**
 * Signed-in screens with a layout of their own: the wizards and the details (WizardLayout), and
 * the homepage, whose loading page has no AppLayout (U10 6401:28567)
 */
function SignedInWizards() {
  return (
    <RequireSignIn>
      <Outlet />
    </RequireSignIn>
  );
}

/**
 * A page change scrolls to the top (FR-052c, U06 #94; design-notes §3 "Page change"): when the
 * route's path changes, before the browser paints the new page, which the layouts fade in. A
 * change of the query alone (the editor's flow key, a link's parameters) or of the editor's step
 * keeps the path and the window's offset.
 */
function useScrollToTopOnPageChange() {
  const { pathname } = useLocation();
  const shownPath = useRef(pathname);
  useLayoutEffect(() => {
    if (shownPath.current !== pathname) {
      shownPath.current = pathname;
      // At once: kern.css makes the root scroll smoothly, and nothing slides (U06 #94)
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname]);
}

/**
 * Two route trees (bug login-welcome-motion, P8). The first holds the signed-in screens and
 * renders nothing for the signed-out ones. The second holds the signed-out screens, at a location
 * that can be held: after a successful sign-in the app navigates as before, while the sign-in
 * page stays mounted at its own location over the destination until the motion ends. It always
 * gets a location, so that holding one never remounts the page, and is keyed by the count of
 * ended exits, so that a page that left is never shown again
 */
function AppRoutes() {
  useScrollToTopOnPageChange();
  const location = useLocation();
  const { held, generation } = useSignInHeldLocation();
  return (
    <>
      <Routes>
        <Route path={ROUTES.login} element={null} />
        <Route path={ROUTES.forgotPassword} element={null} />
        <Route element={<SignedInScreens />}>
          <Route path={ROUTES.authorize} element={<AuthorizePage />} />
          <Route path={ROUTES.account} element={<AccountPage />} />
          <Route path={ROUTES.approval} element={<ApprovalPage />} />
        </Route>
        <Route element={<SignedInWizards />}>
          <Route path={ROUTES.overview} element={<FormConnectionListPage />} />
          <Route path={ROUTES.firstConnection} element={<FirstConnectionPage />} />
          <Route path={ROUTES.newFormConnection} element={<FormConnectionEditorPage />} />
          <Route path={ROUTES.formConnection} element={<FormConnectionDetailPage />} />
          <Route path={ROUTES.editFormConnection} element={<FormConnectionEditPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.overview} replace />} />
      </Routes>
      <Routes key={generation} location={held ?? location}>
        <Route element={<SignedOutScreens />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        </Route>
        <Route path="*" element={null} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <SignInMotionProvider>
      <AppRoutes />
    </SignInMotionProvider>
  );
}

export default App;
