import { Navigate, Outlet, Route, Routes } from 'react-router';

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

/** Signed-in screens with a layout of their own: the wizards and the details (WizardLayout) */
function SignedInWizards() {
  return (
    <RequireSignIn>
      <Outlet />
    </RequireSignIn>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<SignedOutScreens />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<SignedInScreens />}>
        <Route path={ROUTES.overview} element={<FormConnectionListPage />} />
        <Route path={ROUTES.authorize} element={<AuthorizePage />} />
        <Route path={ROUTES.account} element={<AccountPage />} />
        <Route path={ROUTES.approval} element={<ApprovalPage />} />
      </Route>
      <Route element={<SignedInWizards />}>
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
