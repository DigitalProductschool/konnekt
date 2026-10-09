import AuthLayout from '../../components/AuthLayout';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FORGOT_PASSWORD_COPY } from './constants';
import ForgotPasswordCard from './ForgotPasswordCard';

/**
 * Figma "01b Forgot password". Passwords are reset by the operators with the account
 * CLI, so the screen only says whom to ask.
 */
export default function ForgotPasswordPage() {
  useDocumentTitle(FORGOT_PASSWORD_COPY.pageTitle);

  return (
    <AuthLayout cardAlign="end">
      <ForgotPasswordCard />
    </AuthLayout>
  );
}
