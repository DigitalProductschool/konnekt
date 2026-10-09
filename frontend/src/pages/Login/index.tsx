import AuthLayout from '../../components/AuthLayout';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { LOGIN_COPY } from './constants';
import LoginCard from './LoginCard';

/** The sign-in screen (Figma "01 Log in"). After logging out, users land here as well. */
export default function LoginPage() {
  useDocumentTitle(LOGIN_COPY.pageTitle);

  return (
    <AuthLayout>
      <LoginCard />
    </AuthLayout>
  );
}
