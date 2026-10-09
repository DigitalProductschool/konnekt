import { Link, useLocation } from 'react-router';

import lockBlueIcon from '../../assets/icons/lock-blue.svg';
import { ROUTES } from '../../constants';
import { FORGOT_PASSWORD_COPY } from './constants';

/**
 * Figma "Forgot password card": as tall as the intro's illustration, with its three parts
 * spread over that height.
 */
export default function ForgotPasswordCard() {
  const location = useLocation();

  return (
    <section
      aria-labelledby="forgot-password-title"
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex min-h-300 w-full flex-col justify-between gap-20 border p-32"
    >
      <span className="rounded-kern-large bg-kern-darkblue-050 flex size-48 items-center justify-center">
        <img src={lockBlueIcon} alt="" className="size-24" />
      </span>
      <div className="flex flex-col gap-6">
        <h2
          id="forgot-password-title"
          className="text-kern-adaptive-large text-kern-layout-text-default font-semibold"
        >
          {FORGOT_PASSWORD_COPY.title}
        </h2>
        <p className="text-kern-static-medium text-kern-layout-text-muted">
          {FORGOT_PASSWORD_COPY.text}
        </p>
      </div>
      {/* A link in KERN's primary button style; it passes on the route to return to */}
      <Link
        to={ROUTES.login}
        state={location.state}
        className="kern-btn kern-btn--primary kern-btn--block"
      >
        <span className="kern-label">{FORGOT_PASSWORD_COPY.backToLogin}</span>
      </Link>
    </section>
  );
}
