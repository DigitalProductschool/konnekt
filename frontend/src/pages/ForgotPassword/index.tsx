import AuthLayout from '../../components/AuthLayout';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCopy } from '../../hooks/useLanguage';
import { FORGOT_PASSWORD_COPY } from './constants';
import ForgotPasswordCard from './ForgotPasswordCard';

/**
 * The forgot-password screen S2 (Figma U10 "4 · Forgot password: ask your admin" 6401:28457) in
 * the signed-out frame L1, whose tagline is the page's h1. Passwords are reset by the operators
 * with the account CLI, so the screen only says whom to ask.
 */
export default function ForgotPasswordPage() {
  useDocumentTitle(useCopy(FORGOT_PASSWORD_COPY).pageTitle);

  return (
    <AuthLayout>
      <ForgotPasswordCard />
    </AuthLayout>
  );
}
