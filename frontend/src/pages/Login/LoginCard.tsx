import { KernButton, KernInput } from '@kern-ux-annex/kern-react-kit';
import { type FormEvent, useReducer } from 'react';
import { Link, useLocation } from 'react-router';

import lockIcon from '../../assets/icons/lock.svg';
import FormErrorMessage from '../../components/FormErrorMessage';
import { ROUTES } from '../../constants';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { INITIAL_LOGIN_FORM, LOGIN_COPY } from './constants';
import PasswordField from './PasswordField';
import { loginFormReducer, signInErrorMessage } from './utils';

/**
 * Figma "Auth/Login card". After a successful sign-in the page moves on by itself,
 * because the signed-in state changes.
 */
export default function LoginCard() {
  const { signIn } = useCurrentUser();
  const location = useLocation();
  const [state, dispatch] = useReducer(loginFormReducer, INITIAL_LOGIN_FORM);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.submitting) {
      return;
    }
    dispatch({ type: 'submit' });
    try {
      await signIn({ username: state.username, password: state.password });
    } catch (error) {
      dispatch({ type: 'fail', message: signInErrorMessage(error) });
    }
  }

  return (
    <section
      aria-labelledby="login-title"
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex w-full flex-col gap-20 border p-32"
    >
      <h2
        id="login-title"
        className="text-kern-adaptive-medium text-kern-layout-text-default font-semibold"
      >
        {LOGIN_COPY.cardTitle}
      </h2>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-20">
        {state.error && (
          <FormErrorMessage key={state.failedAttempts} role="alert" message={state.error} />
        )}
        <KernInput
          id="login-username"
          label={LOGIN_COPY.username}
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={state.username}
          onChange={(event) => dispatch({ type: 'changeUsername', value: event.target.value })}
        />
        <PasswordField
          id="login-password"
          label={LOGIN_COPY.password}
          value={state.password}
          visible={state.showPassword}
          onChange={(event) => dispatch({ type: 'changePassword', value: event.target.value })}
          onToggleVisible={() => dispatch({ type: 'toggleShowPassword' })}
        />
        <div className="flex justify-end">
          {/* Passes on the route to return to after signing in */}
          <Link
            to={ROUTES.forgotPassword}
            state={location.state}
            className="kern-link kern-link--small"
          >
            {LOGIN_COPY.forgotPassword}
          </Link>
        </div>
        <KernButton type="submit" variant="primary" block label={LOGIN_COPY.submit} />
      </form>

      <p className="text-kern-static-small text-kern-layout-text-muted flex items-center justify-center gap-8 leading-(--kern-typography-line-height-medium-static)">
        <img src={lockIcon} alt="" className="size-18" />
        {LOGIN_COPY.secureNote}
      </p>
    </section>
  );
}
