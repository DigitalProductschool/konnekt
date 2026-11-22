import type { LoginLocationState } from '@connection-portal/api-types/routing';
import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { type FormEvent, useReducer } from 'react';
import { Link, useLocation } from 'react-router';

import lockIcon from '../../assets/icons/lock.svg';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import TextField from '../../components/TextField';
import { ROUTES } from '../../constants';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useCopy, useLanguage } from '../../hooks/useLanguage';
import { useSignInTrigger } from '../../hooks/useSignInMotion';
import { INITIAL_LOGIN_FORM, LOGIN_COPY } from './constants';
import PasswordField from './PasswordField';
import type { SignInAlertProps } from './types';
import { loginFormReducer, signInFailureOf } from './utils';

const ALERT_ID = 'login-error';

/**
 * Figma "Login card" (U10 6401:27999): white, radius 12, the card shadow, padding 40, its parts
 * 24 apart: "Log in", the fields, "Forgot password?", "Log in" and "Your login is encrypted"
 * (cosmetic 25). A failed sign-in puts the design's alert above the fields (U10 6401:28435) and
 * marks **both** fields invalid without saying which was wrong (F16, Clarification Q10); any other
 * failure shows the alert with the server's message and its error ID (FR-008). After a
 * successful sign-in the page moves on by itself, because the signed-in state changes: the
 * submit arms the motion to the destination and a failure disarms it (bug login-welcome-motion),
 * so the card stays "Logging in…" while it leaves.
 */
export default function LoginCard() {
  const { signIn } = useCurrentUser();
  const { arm, disarm } = useSignInTrigger();
  const { language } = useLanguage();
  const copy = useCopy(LOGIN_COPY);
  const location = useLocation();
  const [state, dispatch] = useReducer(loginFormReducer, INITIAL_LOGIN_FORM);
  const wrongCredentials = state.failure?.kind === 'credentials';
  // Passes on the route to return to after signing in, without the logged-out toast's flag
  const forgotPasswordState: LoginLocationState = {
    from: (location.state as LoginLocationState | null)?.from,
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.submitting) {
      return;
    }
    dispatch({ type: 'submit' });
    arm(location);
    try {
      await signIn({ username: state.username, password: state.password });
    } catch (error) {
      disarm();
      dispatch({ type: 'fail', failure: signInFailureOf(error, language) });
    }
  }

  return (
    <section
      aria-labelledby="login-title"
      className="rounded-kern-large bg-kern-layout-background-default shadow-card flex w-full flex-col gap-24 p-40"
    >
      <h2
        id="login-title"
        className="text-kern-adaptive-large text-kern-layout-text-default font-semibold"
      >
        {copy.cardTitle}
      </h2>

      {/* The kit's input labels keep their baseline padding here (U10: 6 above, 2 below) */}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-24 [&_label]:pt-6 [&_label]:pb-2"
      >
        {state.failure && (
          <SignInAlert key={state.failedAttempts} id={ALERT_ID} failure={state.failure} />
        )}
        <TextField
          id="login-username"
          label={copy.username}
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={state.username}
          onChange={(event) => dispatch({ type: 'changeUsername', value: event.target.value })}
          invalid={wrongCredentials}
          aria-describedby={wrongCredentials ? ALERT_ID : undefined}
        />
        <div className="flex flex-col">
          <PasswordField
            id="login-password"
            label={copy.password}
            value={state.password}
            visible={state.showPassword}
            invalid={wrongCredentials}
            describedBy={wrongCredentials ? ALERT_ID : undefined}
            onChange={(event) => dispatch({ type: 'changePassword', value: event.target.value })}
            onToggleVisible={() => dispatch({ type: 'toggleShowPassword' })}
          />
          {/* Kit P21 "link-default" with the forward arrow, 8 under the field */}
          <div className="flex pt-8">
            <Link
              to={ROUTES.forgotPassword}
              state={forgotPasswordState}
              className="kern-link kern-link--no-visited-state"
            >
              <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
              {copy.forgotPassword}
            </Link>
          </div>
        </div>
        {/* Busy while the request runs: still focusable, a second submit is ignored (W2) */}
        <button
          type="submit"
          aria-disabled={state.submitting || undefined}
          className="kern-btn kern-btn--primary kern-btn--block"
        >
          <span className="kern-label">{state.submitting ? copy.submitting : copy.submit}</span>
        </button>
      </form>

      <p className="text-kern-static-small text-kern-layout-text-muted flex items-center justify-center gap-8 leading-(--kern-typography-line-height-medium-static)">
        <img src={lockIcon} alt="" className="size-16 shrink-0" />
        {copy.secureNote}
      </p>
    </section>
  );
}

/**
 * The failed sign-in's danger alert. A wrong username or password is the design's title-only
 * alert, its first sentence bold and the second regular in the same line box (U10 6401:28435),
 * which `KernAlert` can't take, so it is KERN's markup; any other failure is `KernAlert` with the
 * server's message and the error ID in its body (§3 "Alert, page level", F22). The first is the
 * server's 401 message, so it stays in the attempt's language after a switch; the second's title
 * is the website's own and follows the language, its body is the server's (spec 009).
 */
function SignInAlert({ id, failure }: SignInAlertProps) {
  const copy = useCopy(LOGIN_COPY);
  if (failure.kind === 'failed') {
    return (
      <KernAlert id={id} variant="danger" title={copy.signInFailedTitle} className="w-full">
        <ErrorNoticeText notice={failure.notice} />
      </KernAlert>
    );
  }
  return (
    <div id={id} role="alert" className="kern-alert kern-alert--danger w-full">
      <div className="kern-alert__header">
        <span aria-hidden="true" className="kern-icon kern-icon--danger kern-icon--small" />
        <span className="kern-title">
          {LOGIN_COPY[failure.language].invalidCredentialsTitle}{' '}
          <span className="text-kern-static-medium font-normal">
            {LOGIN_COPY[failure.language].invalidCredentialsText}
          </span>
        </span>
      </div>
    </div>
  );
}
