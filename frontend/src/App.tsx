import { useLayoutEffect, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';

import AppLayout from './components/AppLayout';
import RequireSignedOut from './components/RequireSignedOut';
import RequireSignIn from './components/RequireSignIn';
import { ROUTES } from './constants';
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

function SignedOutScreens() {
  return (
    <RequireSignedOut>
      <Outlet />
    </RequireSignedOut>
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

function App() {
  useScrollToTopOnPageChange();
  return (
    <Routes>
      <Route element={<SignedOutScreens />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
      </Route>
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
  );
}

export default App;
