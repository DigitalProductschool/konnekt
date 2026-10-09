import { Navigate, Outlet, Route, Routes } from 'react-router';

import AppLayout from './components/AppLayout';
import RequireSignIn from './components/RequireSignIn';
import { ROUTES } from './constants';
import LoginPage from './pages/Login';
import PlaceholderPage from './pages/Placeholder';

function SignedInScreens() {
  return (
    <RequireSignIn>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </RequireSignIn>
  );
}

function App() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route element={<SignedInScreens />}>
        <Route path={ROUTES.overview} element={<PlaceholderPage title="Use cases" />} />
        <Route
          path={ROUTES.newFormConnection}
          element={<PlaceholderPage title="Create use case" />}
        />
        <Route path={ROUTES.formConnection} element={<PlaceholderPage title="Use case" />} />
        <Route
          path={ROUTES.editFormConnection}
          element={<PlaceholderPage title="Edit use case" />}
        />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.overview} replace />} />
    </Routes>
  );
}

export default App;
