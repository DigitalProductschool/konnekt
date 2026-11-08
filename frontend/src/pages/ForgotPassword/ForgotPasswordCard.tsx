import type { LoginLocationState } from '@connection-portal/api-types/routing';
import { Link, useLocation } from 'react-router';

import { ROUTES } from '../../constants';
import { FORGOT_PASSWORD_COPY } from './constants';

/**
 * Figma "Login card" of "4 · Forgot password: ask your admin" (U10 6401:28462): the sign-in
 * card's frame (white, radius 12, the card shadow, padding 40, 24 apart), the heading and the
 * text 8 apart, then "Back to log in", KERN's small tertiary button with the back arrow (its
 * 4px margins make the 48px row), 240px high in all. Passwords are reset by the operators, so
 * there is no form.
 */
export default function ForgotPasswordCard() {
  const location = useLocation();
  // Keeps the route that asked for the sign-in (001-S2), without the logged-out toast's flag
  const loginState: LoginLocationState = {
    from: (location.state as LoginLocationState | null)?.from,
  };

  return (
    <section
      aria-labelledby="forgot-password-title"
      className="rounded-kern-large bg-kern-layout-background-default shadow-card flex w-full flex-col items-start gap-24 p-40"
    >
      <div className="flex flex-col gap-8">
        <h2
          id="forgot-password-title"
          className="text-kern-adaptive-large text-kern-layout-text-default font-semibold"
        >
          {FORGOT_PASSWORD_COPY.title}
        </h2>
        <p className="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {FORGOT_PASSWORD_COPY.text}
        </p>
      </div>
      <Link
        to={ROUTES.login}
        state={loginState}
        className="kern-btn kern-btn--tertiary kern-btn--small"
      >
        <span aria-hidden="true" className="kern-icon kern-icon--arrow-back" />
        <span className="kern-label">{FORGOT_PASSWORD_COPY.backToLogin}</span>
      </Link>
    </section>
  );
}
